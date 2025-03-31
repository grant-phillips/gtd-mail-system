/**
 * Core user data models for GTD Mail System
 */

import { D1Database } from '@cloudflare/workers-types';
import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { 
  User, 
  UserPreferences, 
  EmailAccount, 
  SubscriptionTier, 
  NotificationPreference,
  UserUpdateData,
  PreferencesUpdateData
} from '../../types/user';

export class UserManager {
  private readonly db: D1Database;
  private readonly jwtSecret: Uint8Array;
  private readonly tokenExpiration: string = '24h';

  constructor(db: D1Database, jwtSecret: string) {
    this.db = db;
    this.jwtSecret = new TextEncoder().encode(jwtSecret);
  }

  /**
   * Register a new user
   */
  async register(userData: {
    email: string;
    password: string;
    name: string;
    timezone: string;
  }): Promise<User> {
    // Validate input
    if (!this.isValidEmail(userData.email)) {
      throw new Error('Invalid email format');
    }
    if (!this.isValidPassword(userData.password)) {
      throw new Error('Password must be at least 8 characters long');
    }

    // Check if user already exists
    const existingUser = await this.db
      .prepare('SELECT id FROM users WHERE email = ?')
      .bind(userData.email)
      .first();
    
    if (existingUser) {
      throw new Error('User already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(userData.password, 10);
    
    // Generate verification token
    const verificationToken = uuidv4();

    // Create user
    const userId = uuidv4();
    const now = new Date().toISOString();
    
    await this.db.prepare(`
      INSERT INTO users (
        id, email, name, password_hash, timezone, subscription_tier,
        verification_token, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      userId,
      userData.email,
      userData.name,
      passwordHash,
      userData.timezone,
      SubscriptionTier.FREE,
      verificationToken,
      now,
      now
    ).run();

    // Create default preferences
    await this.db.prepare(`
      INSERT INTO user_preferences (
        user_id, notification_email_preference, notification_push_preference
      ) VALUES (?, ?, ?)
    `).bind(
      userId,
      NotificationPreference.IMMEDIATE,
      NotificationPreference.IMMEDIATE
    ).run();

    // Return user without sensitive data
    return this.getUserById(userId);
  }

  /**
   * Authenticate user and return JWT token
   */
  async login(email: string, password: string): Promise<{ token: string; user: User }> {
    const user = await this.db
      .prepare('SELECT * FROM users WHERE email = ?')
      .bind(email)
      .first();

    if (!user || !user.is_active) {
      throw new Error('Invalid credentials');
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    // Update last login
    await this.db
      .prepare('UPDATE users SET last_login_at = ? WHERE id = ?')
      .bind(new Date().toISOString(), user.id)
      .run();

    // Generate JWT token
    const token = await new SignJWT({ userId: user.id })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime(this.tokenExpiration)
      .sign(this.jwtSecret);

    return {
      token,
      user: await this.getUserById(user.id)
    };
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<User> {
    const user = await this.db
      .prepare(`
        SELECT u.*, up.* 
        FROM users u
        LEFT JOIN user_preferences up ON u.id = up.user_id
        WHERE u.id = ?
      `)
      .bind(userId)
      .first();

    if (!user) {
      throw new Error('User not found');
    }

    return this.mapUserFromDb(user);
  }

  /**
   * Update user profile
   */
  async updateProfile(userId: string, updateData: UserUpdateData): Promise<User> {
    const allowedFields = ['name', 'timezone', 'subscriptionTier'];
    const updates: string[] = [];
    const values: any[] = [];

    Object.entries(updateData).forEach(([key, value]) => {
      if (allowedFields.includes(key)) {
        updates.push(`${key} = ?`);
        values.push(value);
      }
    });

    if (updates.length === 0) {
      return this.getUserById(userId);
    }

    values.push(new Date().toISOString(), userId);
    
    await this.db
      .prepare(`
        UPDATE users 
        SET ${updates.join(', ')}, updated_at = ?
        WHERE id = ?
      `)
      .bind(...values)
      .run();

    return this.getUserById(userId);
  }

  /**
   * Update user preferences
   */
  async updatePreferences(
    userId: string, 
    preferences: PreferencesUpdateData
  ): Promise<UserPreferences> {
    const updates: string[] = [];
    const values: any[] = [];

    Object.entries(preferences).forEach(([key, value]) => {
      if (typeof value === 'object') {
        Object.entries(value).forEach(([subKey, subValue]) => {
          updates.push(`${key}_${subKey} = ?`);
          values.push(subValue);
        });
      } else {
        updates.push(`${key} = ?`);
        values.push(value);
      }
    });

    if (updates.length === 0) {
      return (await this.getUserById(userId)).preferences;
    }

    values.push(new Date().toISOString(), userId);
    
    await this.db
      .prepare(`
        UPDATE user_preferences 
        SET ${updates.join(', ')}, updated_at = ?
        WHERE user_id = ?
      `)
      .bind(...values)
      .run();

    return (await this.getUserById(userId)).preferences;
  }

  /**
   * Verify JWT token
   */
  async verifyToken(token: string): Promise<string> {
    try {
      const { payload } = await jwtVerify(token, this.jwtSecret);
      return payload.userId as string;
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.db
      .prepare('SELECT id FROM users WHERE email = ?')
      .bind(email)
      .first();

    if (!user) {
      // Don't reveal if email exists
      return;
    }

    const resetToken = uuidv4();
    const expires = new Date();
    expires.setHours(expires.getHours() + 24);

    await this.db
      .prepare(`
        UPDATE users 
        SET reset_password_token = ?, reset_password_expires = ?
        WHERE id = ?
      `)
      .bind(resetToken, expires.toISOString(), user.id)
      .run();

    // TODO: Send reset email
  }

  /**
   * Reset password
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    if (!this.isValidPassword(newPassword)) {
      throw new Error('Invalid password format');
    }

    const user = await this.db
      .prepare(`
        SELECT id FROM users 
        WHERE reset_password_token = ? 
        AND reset_password_expires > ?
      `)
      .bind(token, new Date().toISOString())
      .first();

    if (!user) {
      throw new Error('Invalid or expired reset token');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await this.db
      .prepare(`
        UPDATE users 
        SET password_hash = ?, 
            reset_password_token = NULL, 
            reset_password_expires = NULL
        WHERE id = ?
      `)
      .bind(passwordHash, user.id)
      .run();
  }

  // Private helper methods
  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  private isValidPassword(password: string): boolean {
    return password.length >= 8;
  }

  private mapUserFromDb(dbUser: any): User {
    return {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name,
      timezone: dbUser.timezone,
      subscriptionTier: dbUser.subscription_tier as SubscriptionTier,
      isActive: dbUser.is_active,
      createdAt: new Date(dbUser.created_at),
      updatedAt: new Date(dbUser.updated_at),
      preferences: {
        emailCategorization: {
          enabled: dbUser.email_categorization_enabled,
          categories: [], // TODO: Load from separate table
          customRules: [] // TODO: Load from separate table
        },
        notifications: {
          email: dbUser.notification_email_preference as NotificationPreference,
          push: dbUser.notification_push_preference as NotificationPreference,
          taskReminders: dbUser.task_reminders_enabled,
          digestTime: dbUser.digest_time
        },
        features: {
          aiClassification: dbUser.ai_classification_enabled,
          taskCreation: dbUser.task_creation_enabled,
          responseAssistant: dbUser.response_assistant_enabled,
          learningEnabled: dbUser.learning_enabled
        }
      },
      emailAccounts: [] // TODO: Load from separate table
    };
  }
} 