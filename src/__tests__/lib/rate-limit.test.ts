import { describe, it, expect, beforeEach, jest, afterEach } from '@jest/globals';
import { RateLimiter, withRateLimit } from '@/lib/rate-limit';
import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

// Mock Redis
jest.mock('@upstash/redis', () => ({
  Redis: jest.fn().mockImplementation(() => ({
    lrange: jest.fn(),
    ltrim: jest.fn(),
    rpush: jest.fn(),
    expire: jest.fn(),
    keys: jest.fn(),
    del: jest.fn(),
  })),
}));

describe('RateLimiter', () => {
  let limiter: RateLimiter;
  let mockRedis: jest.Mocked<Redis>;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.UPSTASH_REDIS_REST_URL = 'https://test-redis.upstash.io';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token';

    mockRedis = {
      lrange: jest.fn(),
      ltrim: jest.fn(),
      rpush: jest.fn(),
      expire: jest.fn(),
      keys: jest.fn(),
      del: jest.fn(),
    } as unknown as jest.Mocked<Redis>;

    (Redis as jest.Mock).mockImplementation(() => mockRedis);

    limiter = new RateLimiter({
      maxRequests: 5,
      windowMs: 60000, // 1 minute
      prefix: 'test:',
    });
  });

  describe('check', () => {
    it('should allow request when under limit', async () => {
      const now = Date.now();
      jest.spyOn(Date, 'now').mockReturnValue(now);

      mockRedis.lrange.mockResolvedValue([]);

      const result = await limiter.check('test-identifier');

      expect(result.success).toBe(true);
      expect(result.remaining).toBe(4); // 5 - 1
      expect(mockRedis.rpush).toHaveBeenCalledWith('test:test-identifier', now.toString());
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

      jest.spyOn(Date, 'now').mockReturnValue(now);
      mockRedis.lrange.mockResolvedValue(timestamps.map(String));

      const result = await limiter.check('test-identifier');

      expect(result.success).toBe(false);
      expect(result.remaining).toBe(0);
      expect(mockRedis.rpush).not.toHaveBeenCalled();
    });

    it('should remove old timestamps outside window', async () => {
      const now = Date.now();
      const oldTimestamp = now - 120000; // 2 minutes ago (outside window)
      const recentTimestamp = now - 30000; // 30 seconds ago (inside window)

      jest.spyOn(Date, 'now').mockReturnValue(now);
      mockRedis.lrange.mockResolvedValue([String(oldTimestamp), String(recentTimestamp)]);

      await limiter.check('test-identifier');

      expect(mockRedis.ltrim).toHaveBeenCalledWith('test:test-identifier', 1, -1);
    });

    it('should bypass rate limit when Redis is not initialized', async () => {
      // Create limiter with Redis initialization failure
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      (Redis as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Redis connection failed');
      });

      // Suppress console.error from constructor
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

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

      consoleWarnSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });

    it('should handle Redis errors gracefully', async () => {
      mockRedis.lrange.mockRejectedValue(new Error('Redis error'));

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
      mockRedis.keys.mockResolvedValue(['test:key1', 'test:key2', 'test:key3']);

      await limiter.cleanup();

      expect(mockRedis.keys).toHaveBeenCalledWith('test:*');
      expect(mockRedis.del).toHaveBeenCalledWith('test:key1', 'test:key2', 'test:key3');
    });

    it('should handle empty keys array', async () => {
      mockRedis.keys.mockResolvedValue([]);

      await limiter.cleanup();

      expect(mockRedis.keys).toHaveBeenCalledWith('test:*');
      expect(mockRedis.del).not.toHaveBeenCalled();
    });

    it('should handle Redis errors during cleanup', async () => {
      mockRedis.keys.mockRejectedValue(new Error('Redis error'));

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      await limiter.cleanup();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Redis cleanup error')
      );

      consoleErrorSpy.mockRestore();
    });
  });
});

describe('withRateLimit', () => {
  let mockLimiter: jest.Mocked<RateLimiter>;
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
    } as unknown as jest.Mocked<RateLimiter>;

    mockHandler = jest.fn().mockResolvedValue(
      new NextResponse(JSON.stringify({ success: true }))
    );
  });

  it('should call handler when rate limit allows', async () => {
    mockLimiter.check.mockResolvedValue({
      success: true,
      remaining: 4,
      resetTime: Date.now() + 60000,
    });

    const request = new NextRequest('http://localhost:3000/api/test');
    const wrappedHandler = withRateLimit(mockLimiter, 'test-id', mockHandler);

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

    const request = new NextRequest('http://localhost:3000/api/test');
    const wrappedHandler = withRateLimit(mockLimiter, 'test-id', mockHandler);

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

    const request = new NextRequest('http://localhost:3000/api/test');
    const wrappedHandler = withRateLimit(mockLimiter, 'test-id', mockHandler);

    const response = await wrappedHandler(request);

    expect(response.headers.get('X-RateLimit-Limit')).toBe('5');
    expect(response.headers.get('X-RateLimit-Remaining')).toBe('3');
    expect(response.headers.get('X-RateLimit-Reset')).toBe(resetTime.toString());
  });
});

