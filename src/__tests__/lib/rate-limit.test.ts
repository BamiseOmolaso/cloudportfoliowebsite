// Import after mocks are set up in jest.setup.js
import { describe, it, expect, beforeEach, beforeAll, jest } from '@jest/globals';
import { NextRequest, NextResponse } from 'next/server';

type AsyncMock<Args extends any[] = any[], Return = unknown> = jest.MockedFunction<
  (...args: Args) => Promise<Return>
>;

type RedisMockInstance = {
  lrange: AsyncMock;
  ltrim: AsyncMock;
  rpush: AsyncMock;
  expire: AsyncMock;
  keys: AsyncMock;
  del: AsyncMock;
};

type RateLimitCheckResult = {
  success: boolean;
  remaining: number;
  resetTime: number;
};

const redisInstances: RedisMockInstance[] = [];

const createRedisMock = (): RedisMockInstance => ({
  lrange: jest.fn(),
  ltrim: jest.fn(),
  rpush: jest.fn(),
  expire: jest.fn(),
  keys: jest.fn(),
  del: jest.fn(),
});

jest.mock('@upstash/redis', () => ({
  Redis: jest.fn(() => {
    const instance = createRedisMock();
    redisInstances.push(instance);
    return instance;
  }),
}));

type RateLimitModule = typeof import('@/lib/rate-limit');
let RateLimiter: RateLimitModule['RateLimiter'];
let withRateLimit: RateLimitModule['withRateLimit'];
let RedisConstructor: jest.Mock;

beforeAll(async () => {
  ({ RateLimiter, withRateLimit } = await import('@/lib/rate-limit'));
  const redisModule = jest.requireMock('@upstash/redis') as { Redis: jest.Mock };
  RedisConstructor = redisModule.Redis;
});

const getLatestRedisMock = (): RedisMockInstance => {
  const instance = redisInstances.at(-1);
  if (!instance) {
    throw new Error('Redis mock not initialized');
  }
  return instance;
};

describe('RateLimiter', () => {
  let limiter: InstanceType<typeof RateLimiter>;
  let redisMock: RedisMockInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    redisInstances.length = 0;
    process.env.UPSTASH_REDIS_REST_URL = 'https://test-redis.upstash.io';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token';

    limiter = new RateLimiter({
      maxRequests: 5,
      windowMs: 60000, // 1 minute
      prefix: 'test:',
    });
    redisMock = getLatestRedisMock();
  });

  describe('check', () => {
    it('should allow request when under limit', async () => {
      const now = Date.now();
      const dateSpy = jest.spyOn(Date, 'now').mockReturnValue(now);

      redisMock.lrange.mockResolvedValue([]);

      const result = await limiter.check('test-identifier');

      expect(result.success).toBe(true);
      expect(result.remaining).toBe(4); // 5 - 1
      expect(redisMock.rpush).toHaveBeenCalledWith('test:test-identifier', now.toString());
      expect(redisMock.expire).toHaveBeenCalled();

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
      redisMock.lrange.mockResolvedValue(timestamps.map(String));

      const result = await limiter.check('test-identifier');

      expect(result.success).toBe(false);
      expect(result.remaining).toBe(0);
      expect(redisMock.rpush).not.toHaveBeenCalled();

      dateSpy.mockRestore();
    });

    it('should remove old timestamps outside window', async () => {
      const now = Date.now();
      const oldTimestamp = now - 120000; // 2 minutes ago (outside window)
      const recentTimestamp = now - 30000; // 30 seconds ago (inside window)

      const dateSpy = jest.spyOn(Date, 'now').mockReturnValue(now);
      redisMock.lrange.mockResolvedValue([String(oldTimestamp), String(recentTimestamp)]);

      await limiter.check('test-identifier');

      expect(redisMock.ltrim).toHaveBeenCalledWith('test:test-identifier', 1, -1);

      dateSpy.mockRestore();
    });

    it('should bypass rate limit when Redis is not initialized', async () => {
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      // Mock Redis constructor to throw
      RedisConstructor.mockImplementationOnce(() => {
        throw new Error('Redis connection failed');
      });

      const limiterWithoutRedis = new RateLimiter({
        maxRequests: 5,
        windowMs: 60000,
      });

      const result = await limiterWithoutRedis.check('test-identifier');

      expect(result.success).toBe(true);
      expect(result.remaining).toBe(5);
      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('Redis client not initialized'));

      consoleErrorSpy.mockRestore();
      consoleWarnSpy.mockRestore();
    });

    it('should handle Redis errors gracefully', async () => {
      redisMock.lrange.mockRejectedValue(new Error('Redis error'));

      // eslint-disable-next-line @typescript-eslint/no-empty-function
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

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
      redisMock.keys.mockResolvedValue(['test:key1', 'test:key2', 'test:key3']);

      await limiter.cleanup();

      expect(redisMock.keys).toHaveBeenCalledWith('test:*');
      expect(redisMock.del).toHaveBeenCalledWith('test:key1', 'test:key2', 'test:key3');
    });

    it('should handle empty keys array', async () => {
      redisMock.keys.mockResolvedValue([]);

      await limiter.cleanup();

      expect(redisMock.keys).toHaveBeenCalledWith('test:*');
      expect(redisMock.del).not.toHaveBeenCalled();
    });

    it('should handle Redis errors during cleanup', async () => {
      redisMock.keys.mockRejectedValue(new Error('Redis error'));

      // eslint-disable-next-line @typescript-eslint/no-empty-function
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

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
    check: AsyncMock<[string], RateLimitCheckResult>;
    config: { maxRequests: number; windowMs: number; prefix: string };
  };
  let mockHandler: AsyncMock<[NextRequest], NextResponse>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockLimiter = {
      check: jest.fn() as AsyncMock<[string], RateLimitCheckResult>,
      config: {
        maxRequests: 5,
        windowMs: 60000,
        prefix: 'test:',
      },
    };

    mockHandler = jest.fn() as AsyncMock<[NextRequest], NextResponse>;
    mockHandler.mockResolvedValue(
      NextResponse.json({ success: true }, { status: 200 })
    );
  });

  it('should call handler when rate limit allows', async () => {
    mockLimiter.check.mockResolvedValue({
      success: true,
      remaining: 4,
      resetTime: Date.now() + 60000,
    });

    const request = new NextRequest('http://localhost:3000/api/test', {
      method: 'GET',
    });
    const wrappedHandler = withRateLimit(mockLimiter as unknown as InstanceType<typeof RateLimiter>, 'test-id', mockHandler);

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

    const request = new NextRequest('http://localhost:3000/api/test', {
      method: 'GET',
    });
    const wrappedHandler = withRateLimit(mockLimiter as unknown as InstanceType<typeof RateLimiter>, 'test-id', mockHandler);

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

    const request = new NextRequest('http://localhost:3000/api/test', {
      method: 'GET',
    });
    const wrappedHandler = withRateLimit(mockLimiter as unknown as InstanceType<typeof RateLimiter>, 'test-id', mockHandler);

    const response = await wrappedHandler(request);

    expect(response.headers.get('X-RateLimit-Limit')).toBe('5');
    expect(response.headers.get('X-RateLimit-Remaining')).toBe('3');
    expect(response.headers.get('X-RateLimit-Reset')).toBe(resetTime.toString());
  });
});
