import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { HTTPException } from 'hono/http-exception';
import { UserManager } from './services/UserManager';
import { z } from 'zod';

// Request validation schemas
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2),
  timezone: z.string(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const updateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  timezone: z.string().optional(),
  subscriptionTier: z.enum(['FREE', 'PRO', 'ENTERPRISE']).optional(),
});

// Environment type
interface Env {
  DB: D1Database;
  AUTH_KV: KVNamespace;
  JWT_SECRET: string;
  ALLOWED_ORIGINS: string;
}

// Create Hono app
const app = new Hono<{ Bindings: Env }>();

// CORS middleware
app.use('/*', cors({
  origin: (origin, c) => {
    const allowedOrigins = c.env.ALLOWED_ORIGINS.split(',');
    if (!origin || allowedOrigins.includes(origin)) {
      return c.next();
    }
    return c.json({ error: 'Not allowed' }, 403);
  },
  credentials: true,
}));

// Authentication middleware
async function authMiddleware(c: any, next: any) {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new HTTPException(401, { message: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  const userManager = new UserManager(c.env.DB, c.env.JWT_SECRET);
  
  try {
    const userId = await userManager.verifyToken(token);
    c.set('userId', userId);
    await next();
  } catch (error) {
    throw new HTTPException(401, { message: 'Invalid token' });
  }
}

// Routes
app.post('/api/auth/register', async (c) => {
  try {
    const body = await c.req.json();
    const validatedData = registerSchema.parse(body);

    const userManager = new UserManager(c.env.DB, c.env.JWT_SECRET);
    const user = await userManager.register(validatedData);

    return c.json({ 
      message: 'User registered successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        timezone: user.timezone
      }
    }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Validation error', details: error.errors }, 400);
    }
    if (error instanceof Error && error.message === 'User already exists') {
      return c.json({ error: 'User already exists' }, 409);
    }
    return c.json({ error: 'Internal server error' }, 500);
  }
});

app.post('/api/auth/login', async (c) => {
  try {
    const body = await c.req.json();
    const validatedData = loginSchema.parse(body);

    const userManager = new UserManager(c.env.DB, c.env.JWT_SECRET);
    const { token, user } = await userManager.login(
      validatedData.email,
      validatedData.password
    );

    return c.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        timezone: user.timezone
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Validation error', details: error.errors }, 400);
    }
    if (error instanceof Error && error.message === 'Invalid credentials') {
      return c.json({ error: 'Invalid credentials' }, 401);
    }
    return c.json({ error: 'Internal server error' }, 500);
  }
});

app.get('/api/user/profile', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');
    const userManager = new UserManager(c.env.DB, c.env.JWT_SECRET);
    const user = await userManager.getUserById(userId);

    return c.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        timezone: user.timezone,
        subscriptionTier: user.subscriptionTier,
        preferences: user.preferences
      }
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'User not found') {
      return c.json({ error: 'User not found' }, 404);
    }
    return c.json({ error: 'Internal server error' }, 500);
  }
});

app.patch('/api/user/profile', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');
    const body = await c.req.json();
    const validatedData = updateProfileSchema.parse(body);

    const userManager = new UserManager(c.env.DB, c.env.JWT_SECRET);
    const user = await userManager.updateProfile(userId, validatedData);

    return c.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        timezone: user.timezone,
        subscriptionTier: user.subscriptionTier
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Validation error', details: error.errors }, 400);
    }
    if (error instanceof Error && error.message === 'User not found') {
      return c.json({ error: 'User not found' }, 404);
    }
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Error handling
app.onError((err, c) => {
  console.error(`${err}`);
  return c.json({ error: 'Internal server error' }, 500);
});

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not found' }, 404);
});

export default app; 