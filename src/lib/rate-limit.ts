import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getRedisClient } from './redis-client';

interface RateLimiterConfig {
  maxRequests: number;
  windowMs: number;
  prefix?: string;
}

interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetTime: number;
}

// In-memory fallback rate limiter
interface RateLimitStore {
  count: number;
  resetTime: number;
}

class InMemoryRateLimiter {
  private store: Map<string, RateLimitStore> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000); // Cleanup every 5 minutes
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, value] of this.store.entries()) {
      if (now > value.resetTime) {
        this.store.delete(key);
      }
    }
  }

  async check(identifier: string, limit: number, windowMs: number): Promise<RateLimitResult> {
    const now = Date.now();
    const key = identifier;

    let entry = this.store.get(key);

    if (!entry || now > entry.resetTime) {
      entry = { count: 0, resetTime: now + windowMs };
      this.store.set(key, entry);
    }

    entry.count++;
    const remaining = Math.max(0, limit - entry.count);
    const success = entry.count <= limit;

    return { success, remaining, resetTime: entry.resetTime };
  }

  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.store.clear();
  }
}

// Singleton instance
let inMemoryLimiter: InMemoryRateLimiter | null = null;

function getInMemoryLimiter(): InMemoryRateLimiter {
  if (!inMemoryLimiter) {
    inMemoryLimiter = new InMemoryRateLimiter();
  }
  return inMemoryLimiter;
}

// Redis-based rate limiting using sorted sets for sliding window
async function redisRateLimit(
  redis: any,
  identifier: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  const key = `ratelimit:${identifier}`;
  const now = Date.now();
  const windowStart = now - windowMs;

  try {
    // Ensure client is connected
    if (!redis.isOpen) {
      await redis.connect();
    }

    // Use Redis pipeline for atomic operations
    const multi = redis.multi();

    // Remove old entries outside the window
    multi.zRemRangeByScore(key, 0, windowStart);

    // Count requests in current window
    multi.zCard(key);

    // Add current request with timestamp as score
    multi.zAdd(key, { score: now, value: `${now}-${Math.random()}` });

    // Set expiry to clean up old keys
    multi.expire(key, Math.ceil(windowMs / 1000));

    const results = await multi.exec();

    // results[1] is the count before adding current request
    const count = (results[1]?.[1] as number) || 0;
    const currentCount = count + 1;

    const remaining = Math.max(0, limit - currentCount);
    const success = currentCount <= limit;
    const resetTime = now + windowMs;

    return { success, remaining, resetTime };
  } catch (error) {
    console.error('Redis rate limit error:', error);
    // Fallback to in-memory on Redis error
    return getInMemoryLimiter().check(identifier, limit, windowMs);
  }
}

export class RateLimiter {
  public config: RateLimiterConfig;

  constructor(config: RateLimiterConfig) {
    this.config = {
      prefix: 'rate-limit:',
      ...config,
    };
  }

  private getKey(identifier: string): string {
    return `${this.config.prefix}${identifier}`;
  }

  async check(identifier: string): Promise<RateLimitResult> {
    const key = this.getKey(identifier);
    const redis = getRedisClient();

    // Use Redis if available, otherwise fall back to in-memory
    if (redis) {
      try {
        return await redisRateLimit(redis, key, this.config.maxRequests, this.config.windowMs);
      } catch (error) {
        console.error('Redis rate limit failed, falling back to in-memory:', error);
        return getInMemoryLimiter().check(key, this.config.maxRequests, this.config.windowMs);
      }
    } else {
      return getInMemoryLimiter().check(key, this.config.maxRequests, this.config.windowMs);
    }
  }

  async cleanup(): Promise<void> {
    const redis = getRedisClient();
    if (redis) {
      try {
        if (!redis.isOpen) {
          await redis.connect();
        }
        const keys = await redis.keys(`${this.config.prefix}*`);
        if (keys.length > 0) {
          await redis.del(keys);
        }
      } catch (error) {
        console.error('Redis cleanup error:', error);
      }
    }
    // In-memory cleanup is handled automatically
  }
}

// Create rate limiter instances for different endpoints
export const contactFormLimiter = new RateLimiter({
  maxRequests: 5,
  windowMs: 60 * 60 * 1000, // 1 hour
  prefix: 'contact-form:',
});

export const authLimiter = new RateLimiter({
  maxRequests: 10,
  windowMs: 15 * 60 * 1000, // 15 minutes
  prefix: 'auth:',
});

export const apiLimiter = new RateLimiter({
  maxRequests: 100,
  windowMs: 60 * 60 * 1000, // 1 hour
  prefix: 'api:',
});

export const adminLimiter = new RateLimiter({
  maxRequests: 50,
  windowMs: 60 * 60 * 1000, // 1 hour
  prefix: 'admin:',
});

export function withRateLimit(
  limiter: RateLimiter,
  identifier: string,
  handler: (req: NextRequest) => Promise<NextResponse>
) {
  return async (req: NextRequest) => {
    const result = await limiter.check(identifier);

    if (!result.success) {
      return new NextResponse(
        JSON.stringify({
          error: 'Too many requests',
          retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': Math.ceil((result.resetTime - Date.now()) / 1000).toString(),
            'X-RateLimit-Limit': limiter.config.maxRequests.toString(),
            'X-RateLimit-Remaining': result.remaining.toString(),
            'X-RateLimit-Reset': result.resetTime.toString(),
          },
        }
      );
    }

    const response = await handler(req);

    // Add rate limit headers to the response
    response.headers.set('X-RateLimit-Limit', limiter.config.maxRequests.toString());
    response.headers.set('X-RateLimit-Remaining', result.remaining.toString());
    response.headers.set('X-RateLimit-Reset', result.resetTime.toString());

    return response;
  };
}

// Cleanup function to be called periodically
export async function cleanupRateLimits() {
  await Promise.all([
    contactFormLimiter.cleanup(),
    authLimiter.cleanup(),
    apiLimiter.cleanup(),
  ]);
}
