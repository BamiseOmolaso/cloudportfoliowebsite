// Import after mocks are set up in jest.setup.js
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { RateLimiter, withRateLimit } from '@/lib/rate-limit';
import { NextRequest } from 'next/server';
import { Redis } from '@upstash/redis';

// Get the mocked Redis instance methods
const getRedisMocks = () => {
  const redisInstance = new Redis({
    url: 'https://test-redis.upstash.io',
    token: 'test-token',
  });
  return {
    mockLrange: redisInstance.lrange as jest.Mock,
    mockLtrim: redisInstance.ltrim as jest.Mock,
    mockRpush: redisInstance.rpush as jest.Mock,
    mockExpire: redisInstance.expire as jest.Mock,
    mockKeys: redisInstance.keys as jest.Mock,
    mockDel: redisInstance.del as jest.Mock,
  };
};

describe('RateLimiter', () => {
  let limiter: RateLimiter;
  let mocks: ReturnType<typeof getRedisMocks>;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.UPSTASH_REDIS_REST_URL = 'https://test-redis.upstash.io';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token';

    // Get fresh mocks
    mocks = getRedisMocks();

    limiter = new RateLimiter({
      maxRequests: 5,
      windowMs: 60000, // 1 minute
      prefix: 'test:',
    });
  });

  describe('check', () => {
    it('should allow request when under limit', async () => {
      const now = Date.now();
      const dateSpy = jest.spyOn(Date, 'now').mockReturnValue(now);

      mocks.mockLrange.mockResolvedValue([]);

      const result = await limiter.check('test-identifier');

      expect(result.success).toBe(true);
      expect(result.remaining).toBe(4); // 5 - 1
      expect(mocks.mockRpush).toHaveBeenCalledWith('test:test-identifier', now.toString());
      expect(mocks.mockExpire).toHaveBeenCalled();

      dateSpy.mockRestore();
    });

    it('should reject request when over limit', async () => {
      const now = Date.now();
      const windowStart = now - 60000;
      const timestamps = [
        windowStart + 10000,
        windowStart + 20000,
        windowStart + 30000,
        windowStart + 40000,
        windowStart + 50000,
      ];

      const dateSpy = jest.spyOn(Date, 'now').mockReturnValue(now);
      mocks.mockLrange.mockResolvedValue(timestamps.map(String));

      const result = await limiter.check('test-identifier');

      expect(result.success).toBe(false);
      expect(result.remaining).toBe(0);
      expect(mocks.mockRpush).not.toHaveBeenCalled();

      dateSpy.mockRestore();
    });

    it('should remove old timestamps outside window', async () => {
      const now = Date.now();
      const oldTimestamp = now - 120000; // 2 minutes ago (outside window)
      const recentTimestamp = now - 30000; // 30 seconds ago (inside window)

      const dateSpy = jest.spyOn(Date, 'now').mockReturnValue(now);
      mocks.mockLrange.mockResolvedValue([String(oldTimestamp), String(recentTimestamp)]);

      await limiter.check('test-identifier');

      expect(mocks.mockLtrim).toHaveBeenCalledWith('test:test-identifier', 1, -1);

      dateSpy.mockRestore();
    });

    it('should bypass rate limit when Redis is not initialized', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      // Mock Redis constructor to throw
      (Redis as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Redis connection failed');
      });

      const limiterWithoutRedis = new RateLimiter({
        maxRequests: 5,
        windowMs: 60000,
      });

      const result = await limiterWithoutRedis.check('test-identifier');

      expect(result.success).toBe(true);
      expect(result.remaining).toBe(5);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Redis client not initialized')
      );

      consoleErrorSpy.mockRestore();
      consoleWarnSpy.mockRestore();
    });

    it('should handle Redis errors gracefully', async () => {
      mocks.mockLrange.mockRejectedValue(new Error('Redis error'));

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = await limiter.check('test-identifier');

      expect(result.success).toBe(true); // Should allow on error
      expect(result.remaining).toBe(5);
      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Rate limiting bypassed')
      );

      consoleErrorSpy.mockRestore();
      consoleWarnSpy.mockRestore();
    });
  });

  describe('cleanup', () => {
    it('should delete all keys with prefix', async () => {
      mocks.mockKeys.mockResolvedValue(['test:key1', 'test:key2', 'test:key3']);

      await limiter.cleanup();

      expect(mocks.mockKeys).toHaveBeenCalledWith('test:*');
      expect(mocks.mockDel).toHaveBeenCalledWith('test:key1', 'test:key2', 'test:key3');
    });

    it('should handle empty keys array', async () => {
      mocks.mockKeys.mockResolvedValue([]);

      await limiter.cleanup();

      expect(mocks.mockKeys).toHaveBeenCalledWith('test:*');
      expect(mocks.mockDel).not.toHaveBeenCalled();
    });

    it('should handle Redis errors during cleanup', async () => {
      mocks.mockKeys.mockRejectedValue(new Error('Redis error'));

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      await limiter.cleanup();

      expect(consoleErrorSpy).toHaveBeenCalled();
      // Check that error was logged (format may vary)
      const errorCalls = consoleErrorSpy.mock.calls;
      const hasError = errorCalls.some(call => 
        call[0]?.toString().includes('Redis cleanup error') || 
        call[0]?.toString().includes('Redis error')
      );
      expect(hasError).toBe(true);

      consoleErrorSpy.mockRestore();
    });
  });
});

describe('withRateLimit', () => {
  let mockLimiter: {
    check: jest.Mock;
    config: { maxRequests: number; windowMs: number; prefix: string };
  };
  let mockHandler: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockLimiter = {
      check: jest.fn(),
      config: {
        maxRequests: 5,
        windowMs: 60000,
        prefix: 'test:',
      },
    };

    mockHandler = jest.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
  });

  it('should call handler when rate limit allows', async () => {
    mockLimiter.check.mockResolvedValue({
      success: true,
      remaining: 4,
      resetTime: Date.now() + 60000,
    });

    const request = new Request('http://localhost:3000/api/test', {
      method: 'GET',
    }) as unknown as NextRequest;
    const wrappedHandler = withRateLimit(mockLimiter as any, 'test-id', mockHandler);

    const response = await wrappedHandler(request);

    expect(mockLimiter.check).toHaveBeenCalledWith('test-id');
    expect(mockHandler).toHaveBeenCalledWith(request);
    expect(response.status).toBe(200);
  });

  it('should return 429 when rate limit exceeded', async () => {
    mockLimiter.check.mockResolvedValue({
      success: false,
      remaining: 0,
      resetTime: Date.now() + 30000,
    });

    const request = new Request('http://localhost:3000/api/test', {
      method: 'GET',
    }) as unknown as NextRequest;
    const wrappedHandler = withRateLimit(mockLimiter as any, 'test-id', mockHandler);

    const response = await wrappedHandler(request);

    expect(mockLimiter.check).toHaveBeenCalledWith('test-id');
    expect(mockHandler).not.toHaveBeenCalled();
    expect(response.status).toBe(429);

    const body = await response.json();
    expect(body.error).toBe('Too many requests');
    expect(body.retryAfter).toBeGreaterThan(0);
  });

  it('should add rate limit headers to response', async () => {
    const resetTime = Date.now() + 60000;
    mockLimiter.check.mockResolvedValue({
      success: true,
      remaining: 3,
      resetTime,
    });

    const request = new Request('http://localhost:3000/api/test', {
      method: 'GET',
    }) as unknown as NextRequest;
    const wrappedHandler = withRateLimit(mockLimiter as any, 'test-id', mockHandler);

    const response = await wrappedHandler(request);

    expect(response.headers.get('X-RateLimit-Limit')).toBe('5');
    expect(response.headers.get('X-RateLimit-Remaining')).toBe('3');
    expect(response.headers.get('X-RateLimit-Reset')).toBe(resetTime.toString());
  });
});
