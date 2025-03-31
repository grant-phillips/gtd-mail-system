/**
 * Core user data models for InboxGenius AI
 */

// Enums
export enum SubscriptionTier {
  FREE = 'FREE',
  PRO = 'PRO',
  ENTERPRISE = 'ENTERPRISE'
}

export enum NotificationPreference {
  IMMEDIATE = 'IMMEDIATE',
  DAILY_DIGEST = 'DAILY_DIGEST',
  WEEKLY_DIGEST = 'WEEKLY_DIGEST',
  NONE = 'NONE'
}

export enum EmailCategory {
  ACTIONABLE = 'ACTIONABLE',
  TO_READ = 'TO_READ',
  REFERENCE = 'REFERENCE',
  ARCHIVED = 'ARCHIVED'
}

// Base interfaces
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface User extends BaseEntity {
  email: string;
  name: string;
  timezone: string;
  subscriptionTier: SubscriptionTier;
  preferences: UserPreferences;
  emailAccounts: EmailAccount[];
  isActive: boolean;
}

export interface UserPreferences {
  emailCategorization: {
    enabled: boolean;
    categories: EmailCategory[];
    customRules: CategorizationRule[];
  };
  notifications: {
    email: NotificationPreference;
    push: NotificationPreference;
    taskReminders: boolean;
    digestTime?: string; // HH:mm format
  };
  features: {
    aiClassification: boolean;
    taskCreation: boolean;
    responseAssistant: boolean;
    learningEnabled: boolean;
  };
}

export interface EmailAccount extends BaseEntity {
  userId: string;
  provider: EmailProvider;
  email: string;
  isPrimary: boolean;
  isConnected: boolean;
  lastSyncAt?: Date;
  settings: EmailAccountSettings;
}

export interface EmailAccountSettings {
  syncFrequency: number; // minutes
  foldersToSync: string[];
  excludePatterns: string[];
}

export interface CategorizationRule {
  id: string;
  name: string;
  category: EmailCategory;
  conditions: CategorizationCondition[];
  priority: number;
  isActive: boolean;
}

export interface CategorizationCondition {
  field: 'subject' | 'sender' | 'recipient' | 'content' | 'date';
  operator: 'contains' | 'equals' | 'startsWith' | 'endsWith' | 'before' | 'after';
  value: string | Date;
}

// Type aliases
export type EmailProvider = 'gmail' | 'outlook' | 'yahoo' | 'other';

// Utility types
export type UserUpdateData = Partial<Omit<User, 'id' | 'createdAt' | 'updatedAt'>>;
export type PreferencesUpdateData = Partial<UserPreferences>;
export type EmailAccountUpdateData = Partial<Omit<EmailAccount, 'id' | 'createdAt' | 'updatedAt'>>;

// Readonly types for immutable data
export type ReadonlyUser = Readonly<User>;
export type ReadonlyPreferences = Readonly<UserPreferences>;

// Pick types for specific use cases
export type UserBasicInfo = Pick<User, 'id' | 'email' | 'name' | 'subscriptionTier'>;
export type NotificationSettings = Pick<UserPreferences['notifications'], 'email' | 'push'>;

// Record types for collections
export type UserEmailAccounts = Record<string, EmailAccount>;
export type UserCategorizationRules = Record<string, CategorizationRule[]>; 