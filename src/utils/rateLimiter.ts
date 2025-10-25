import { Context } from 'hono';
import { Env } from '../types';

// Rate limit configurations
export const RATE_LIMITS = {
  AUTH: { max: 5, window: 900 }, // 5 attempts per 15 minutes
  UPLOAD: { max: 10, window: 3600 }, // 10 uploads per hour
  API: { max: 100, window: 60 }, // 100 requests per minute
  CREATE_IDEA: { max: 20, window: 86400 }, // 20 ideas per day
  ADD_URL: { max: 30, window: 3600 }, // 30 URLs per hour
};

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

export async function checkRateLimit(
  c: Context<{ Bindings: Env }>,
  key: string,
  max: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - windowSeconds * 1000);
  const expiresAt = new Date(now.getTime() + windowSeconds * 1000);

  try {
    // Clean expired entries
    await c.env.DB.prepare(
      'DELETE FROM rate_limits WHERE expires_at < datetime("now")'
    ).run();

    // Get current count for this key within the window
    const existing = await c.env.DB.prepare(
      'SELECT id, count, window_start, expires_at FROM rate_limits WHERE key = ? AND expires_at > datetime("now")'
    ).bind(key).first<{ id: number; count: number; window_start: string; expires_at: string }>();

    if (existing) {
      const currentCount = existing.count;

      if (currentCount >= max) {
        // Rate limit exceeded
        return {
          allowed: false,
          remaining: 0,
          resetAt: new Date(existing.expires_at),
        };
      }

      // Increment count
      await c.env.DB.prepare(
        'UPDATE rate_limits SET count = count + 1 WHERE id = ?'
      ).bind(existing.id).run();

      return {
        allowed: true,
        remaining: max - (currentCount + 1),
        resetAt: new Date(existing.expires_at),
      };
    } else {
      // Create new rate limit entry
      await c.env.DB.prepare(
        'INSERT INTO rate_limits (key, count, window_start, expires_at) VALUES (?, 1, ?, ?)'
      ).bind(key, windowStart.toISOString(), expiresAt.toISOString()).run();

      return {
        allowed: true,
        remaining: max - 1,
        resetAt: expiresAt,
      };
    }
  } catch (error) {
    console.error('Rate limit check error:', error);
    // On error, allow the request but log it
    return {
      allowed: true,
      remaining: max,
      resetAt: expiresAt,
    };
  }
}

// Rate limit middleware factory
export function rateLimitMiddleware(type: keyof typeof RATE_LIMITS, getKey: (c: Context<{ Bindings: Env }>) => string) {
  return async (c: Context<{ Bindings: Env }>, next: () => Promise<void>) => {
    const config = RATE_LIMITS[type];
    const key = getKey(c);

    const result = await checkRateLimit(c, key, config.max, config.window);

    // Set rate limit headers
    c.header('X-RateLimit-Limit', config.max.toString());
    c.header('X-RateLimit-Remaining', result.remaining.toString());
    c.header('X-RateLimit-Reset', result.resetAt.toISOString());

    if (!result.allowed) {
      return c.json({
        error: 'Rate limit exceeded',
        message: `Too many requests. Please try again after ${result.resetAt.toISOString()}`,
        retryAfter: result.resetAt.toISOString(),
      }, 429);
    }

    await next();
  };
}

// Check failed login attempts
export async function checkFailedAttempts(
  c: Context<{ Bindings: Env }>,
  identifier: string
): Promise<{ locked: boolean; remainingTime?: number }> {
  try {
    const attempt = await c.env.DB.prepare(
      'SELECT attempt_count, locked_until FROM failed_attempts WHERE identifier = ?'
    ).bind(identifier).first<{ attempt_count: number; locked_until: string | null }>();

    if (!attempt) {
      return { locked: false };
    }

    // Check if account is locked
    if (attempt.locked_until) {
      const lockedUntil = new Date(attempt.locked_until);
      const now = new Date();

      if (now < lockedUntil) {
        const remainingMs = lockedUntil.getTime() - now.getTime();
        return {
          locked: true,
          remainingTime: Math.ceil(remainingMs / 1000),
        };
      } else {
        // Lock expired, reset attempts
        await c.env.DB.prepare(
          'DELETE FROM failed_attempts WHERE identifier = ?'
        ).bind(identifier).run();
        return { locked: false };
      }
    }

    return { locked: false };
  } catch (error) {
    console.error('Check failed attempts error:', error);
    return { locked: false };
  }
}

// Record failed login attempt
export async function recordFailedAttempt(
  c: Context<{ Bindings: Env }>,
  identifier: string
): Promise<void> {
  const MAX_ATTEMPTS = 5;
  const LOCK_DURATION = 900; // 15 minutes in seconds

  try {
    const existing = await c.env.DB.prepare(
      'SELECT id, attempt_count FROM failed_attempts WHERE identifier = ?'
    ).bind(identifier).first<{ id: number; attempt_count: number }>();

    if (existing) {
      const newCount = existing.attempt_count + 1;

      if (newCount >= MAX_ATTEMPTS) {
        // Lock the account
        const lockedUntil = new Date(Date.now() + LOCK_DURATION * 1000);
        await c.env.DB.prepare(
          'UPDATE failed_attempts SET attempt_count = ?, locked_until = ? WHERE id = ?'
        ).bind(newCount, lockedUntil.toISOString(), existing.id).run();
      } else {
        await c.env.DB.prepare(
          'UPDATE failed_attempts SET attempt_count = ? WHERE id = ?'
        ).bind(newCount, existing.id).run();
      }
    } else {
      await c.env.DB.prepare(
        'INSERT INTO failed_attempts (identifier, attempt_count) VALUES (?, 1)'
      ).bind(identifier).run();
    }
  } catch (error) {
    console.error('Record failed attempt error:', error);
  }
}

// Clear failed attempts on successful login
export async function clearFailedAttempts(
  c: Context<{ Bindings: Env }>,
  identifier: string
): Promise<void> {
  try {
    await c.env.DB.prepare(
      'DELETE FROM failed_attempts WHERE identifier = ?'
    ).bind(identifier).run();
  } catch (error) {
    console.error('Clear failed attempts error:', error);
  }
}
