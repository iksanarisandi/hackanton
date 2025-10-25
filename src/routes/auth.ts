import { Hono } from 'hono';
import { Env, User } from '../types';
import { hashPassword, verifyPassword, generateJWT } from '../utils/auth';
import { rateLimitMiddleware } from '../utils/rateLimiter';

const auth = new Hono<{ Bindings: Env }>();

// Apply rate limiting to auth endpoints
auth.use('/register', rateLimitMiddleware('AUTH', (c) => {
  const ip = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || 'unknown';
  return `auth:register:${ip}`;
}));

auth.use('/login', rateLimitMiddleware('AUTH', (c) => {
  const ip = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || 'unknown';
  return `auth:login:${ip}`;
}));

auth.post('/register', async (c) => {
  try {
    const { email, password } = await c.req.json();

    if (!email || !password) {
      return c.json({ error: 'Email and password are required' }, 400);
    }

    // Input length validation
    if (email.length > 255) {
      return c.json({ error: 'Email too long' }, 400);
    }

    if (password.length < 8) {
      return c.json({ error: 'Password must be at least 8 characters' }, 400);
    }

    if (password.length > 128) {
      return c.json({ error: 'Password too long' }, 400);
    }

    // Password complexity check
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);

    if (!hasUpperCase || !hasLowerCase || !hasNumber) {
      return c.json({ 
        error: 'Password must contain uppercase, lowercase, and numbers' 
      }, 400);
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return c.json({ error: 'Invalid email format' }, 400);
    }

    const existingUser = await c.env.DB.prepare(
      'SELECT id FROM users WHERE email = ?'
    ).bind(email).first();

    if (existingUser) {
      return c.json({ error: 'Email already registered' }, 409);
    }

    const hashedPassword = await hashPassword(password);
    
    const result = await c.env.DB.prepare(
      'INSERT INTO users (email, password) VALUES (?, ?)'
    ).bind(email, hashedPassword).run();

    const userId = result.meta.last_row_id;
    const token = await generateJWT({ userId, email }, c.env.JWT_SECRET);

    return c.json({
      message: 'Registration successful',
      token,
      user: { id: userId, email }
    }, 201);
  } catch (error) {
    console.error('Registration error:', error);
    return c.json({ error: 'Registration failed' }, 500);
  }
});

auth.post('/login', async (c) => {
  try {
    const { email, password } = await c.req.json();

    if (!email || !password) {
      return c.json({ error: 'Email and password are required' }, 400);
    }

    // Check if account is locked due to failed attempts
    const { checkFailedAttempts, recordFailedAttempt, clearFailedAttempts } = await import('../utils/rateLimiter');
    
    const lockStatus = await checkFailedAttempts(c, email);
    if (lockStatus.locked) {
      return c.json({
        error: 'Account temporarily locked due to too many failed attempts',
        retryAfter: lockStatus.remainingTime,
      }, 429);
    }

    const user = await c.env.DB.prepare(
      'SELECT id, email, password FROM users WHERE email = ?'
    ).bind(email).first<User>();

    if (!user) {
      await recordFailedAttempt(c, email);
      return c.json({ error: 'Invalid email or password' }, 401);
    }

    const validPassword = await verifyPassword(password, user.password);

    if (!validPassword) {
      await recordFailedAttempt(c, email);
      return c.json({ error: 'Invalid email or password' }, 401);
    }

    // Clear failed attempts on successful login
    await clearFailedAttempts(c, email);

    const token = await generateJWT({ userId: user.id, email: user.email }, c.env.JWT_SECRET);

    return c.json({
      message: 'Login successful',
      token,
      user: { id: user.id, email: user.email }
    });
  } catch (error) {
    console.error('Login error:', error);
    return c.json({ error: 'Login failed' }, 500);
  }
});

auth.get('/me', async (c) => {
  const userId = c.get('userId');
  
  try {
    const user = await c.env.DB.prepare(
      'SELECT id, email, created_at FROM users WHERE id = ?'
    ).bind(userId).first();

    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    return c.json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    return c.json({ error: 'Failed to get user' }, 500);
  }
});

export default auth;
