import { Hono } from 'hono';
import { Env, User } from '../types';
import { hashPassword, verifyPassword, generateJWT } from '../utils/auth';

const auth = new Hono<{ Bindings: Env }>();

auth.post('/register', async (c) => {
  try {
    const { email, password } = await c.req.json();

    if (!email || !password) {
      return c.json({ error: 'Email and password are required' }, 400);
    }

    if (password.length < 6) {
      return c.json({ error: 'Password must be at least 6 characters' }, 400);
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

    const user = await c.env.DB.prepare(
      'SELECT id, email, password FROM users WHERE email = ?'
    ).bind(email).first<User>();

    if (!user) {
      return c.json({ error: 'Invalid email or password' }, 401);
    }

    const validPassword = await verifyPassword(password, user.password);

    if (!validPassword) {
      return c.json({ error: 'Invalid email or password' }, 401);
    }

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
