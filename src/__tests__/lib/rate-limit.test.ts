// Import after mocks are set up in jest.setup.js
import { describe, it, expect, beforeEach, beforeAll, jest } from '@jest/globals';
import { NextRequest, NextResponse } from 'next/server';

type AsyncMock<Args extends any[] = any[], Return = unknown> = jest.MockedFunction<
  (...args: Args) => Promise<Return>
>;

type RedisMockInstance = {
  isOpen: boolean;
  connect: jest.Mock;
  ping: jest.Mock;
  multi: jest.Mock;
  zRemRangeByScore: jest.Mock;
  zCard: jest.Mock;
  zAdd: jest.Mock;
  expire: jest.Mock;
  keys: jest.Mock;
  del: jest.Mock;
  quit: jest.Mock;
};

type RateLimitCheckResult = {
  success: boolean;
  remaining: number;
  resetTime: number;
};

let redisMockInstance: RedisMockInstance | null = null;

const createRedisMock = (): RedisMockInstance => {
  const mockMulti = {
    zRemRangeByScore: jest.fn().mockReturnThis(),
    zCard: jest.fn().mockReturnThis(),
    zAdd: jest.fn().mockReturnThis(),
    expire: jest.fn().mockReturnThis(),
    exec: jest.fn(),
  };

  const connectMock = jest.fn() as any;
  connectMock.mockResolvedValue(undefined);
  
  const pingMock = jest.fn() as any;
  pingMock.mockResolvedValue('PONG');
  
  const quitMock = jest.fn() as any;
  quitMock.mockResolvedValue(undefined);

  return {
    isOpen: true,
    connect: connectMock,
    ping: pingMock,
    multi: jest.fn().mockReturnValue(mockMulti),
    zRemRangeByScore: jest.fn(),
    zCard: jest.fn(),
    zAdd: jest.fn(),
    expire: jest.fn(),
    keys: jest.fn(),
    del: jest.fn(),
    quit: quitMock,
  };
};

// Mock redis-client module
jest.mock('@/lib/redis-client', () => {
  redisMockInstance = createRedisMock();
  return {
    getRedisClient: jest.fn(() => {
      // In tests, we can control whether Redis is available
      return process.env.MOCK_REDIS_AVAILABLE === 'true' ? redisMockInstance : null;
    }) as jest.Mock,
    checkRedisHealth: (() => {
      const mock = jest.fn() as any;
      mock.mockResolvedValue(true);
      return mock;
    })(),
    disconnectRedis: (() => {
      const mock = jest.fn() as any;
      mock.mockResolvedValue(undefined);
      return mock;
    })(),
  };
});

type RateLimitModule = typeof import('@/lib/rate-limit');
let RateLimiter: RateLimitModule['RateLimiter'];
let withRateLimit: RateLimitModule['withRateLimit'];

beforeAll(async () => {
  ({ RateLimiter, withRateLimit } = await import('@/lib/rate-limit'));
});

const getRedisMock = (): RedisMockInstance => {
  if (!redisMockInstance) {
    redisMockInstance = createRedisMock();
  }
  return redisMockInstance;
};

describe('RateLimiter', () => {
  let limiter: InstanceType<typeof RateLimiter>;
  let redisMock: RedisMockInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    redisMock = getRedisMock();
    
    // Default to in-memory (no Redis) for most tests
    process.env.MOCK_REDIS_AVAILABLE = 'false';
    Object.defineProperty(process, 'env', {
      value: { ...process.env, NODE_ENV: 'development' },
      writable: true,
      configurable: true
    });

    limiter = new RateLimiter({
      maxRequests: 5,
      windowMs: 60000, // 1 minute
      prefix: 'test:',
    });
  });

  describe('check - in-memory mode', () => {
    it('should allow request when under limit', async () => {
      const result = await limiter.check('test-identifier');

      expect(result.success).toBe(true);
      expect(result.remaining).toBe(4); // 5 - 1
      expect(result.resetTime).toBeGreaterThan(Date.now());
    });

    it('should reject request when over limit', async () => {
      // Make 5 requests to hit the limit
      for (let i = 0; i < 5; i++) {
        await limiter.check('test-identifier');
      }

      // 6th request should be rejected
      const result = await limiter.check('test-identifier');

      expect(result.success).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should reset after window expires', async () => {
      // Make 5 requests
      for (let i = 0; i < 5; i++) {
        await limiter.check('test-identifier');
      }

      // Fast-forward time
      jest.useFakeTimers();
      jest.advanceTimersByTime(61000); // Past the window

      const result = await limiter.check('test-identifier');
      expect(result.success).toBe(true);
      expect(result.remaining).toBe(4);

      jest.useRealTimers();
    });
  });

  describe('check - Redis mode', () => {
    beforeEach(() => {
      process.env.MOCK_REDIS_AVAILABLE = 'true';
      Object.defineProperty(process, 'env', {
        value: { ...process.env, NODE_ENV: 'production' },
        writable: true,
        configurable: true
      });
      redisMock = getRedisMock();
    });

    it('should use Redis when available', async () => {
      const mockMulti: any = redisMock.multi();
      mockMulti.exec.mockResolvedValue([
        [null, 0], // zRemRangeByScore result
        [null, 0], // zCard result (count before adding)
        [null, 1], // zAdd result
        [null, 1], // expire result
      ]);

      const result = await limiter.check('test-identifier');

      expect(result.success).toBe(true);
      expect(result.remaining).toBe(4); // 5 - 1
      expect(redisMock.multi).toHaveBeenCalled();
      expect(mockMulti.exec).toHaveBeenCalled();
    });

    it('should reject when over limit in Redis', async () => {
      const mockMulti: any = redisMock.multi();
      // Simulate 5 requests already in window
      mockMulti.exec.mockResolvedValue([
        [null, 0],
        [null, 5], // Already at limit
        [null, 1],
        [null, 1],
      ]);

      const result = await limiter.check('test-identifier');

      expect(result.success).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should fallback to in-memory on Redis error', async () => {
      const mockMulti: any = redisMock.multi();
      mockMulti.exec.mockRejectedValue(new Error('Redis error'));

      // eslint-disable-next-line @typescript-eslint/no-empty-function
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const result = await limiter.check('test-identifier');

      // Should fallback to in-memory and allow request
      expect(result.success).toBe(true);
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('cleanup', () => {
    it('should handle cleanup in in-memory mode', async () => {
      // In-memory cleanup is handled automatically, just verify no errors
      await expect(limiter.cleanup()).resolves.not.toThrow();
    });

    it('should cleanup Redis keys when Redis is available', async () => {
      process.env.MOCK_REDIS_AVAILABLE = 'true';
      Object.defineProperty(process, 'env', {
        value: { ...process.env, NODE_ENV: 'production' },
        writable: true,
        configurable: true
      });
      ((redisMock.keys as jest.Mock) as any).mockResolvedValue(['test:key1', 'test:key2']);
      ((redisMock.del as jest.Mock) as any).mockResolvedValue(2);

      await limiter.cleanup();

      expect(redisMock.keys).toHaveBeenCalledWith('test:*');
      expect(redisMock.del).toHaveBeenCalledWith(['test:key1', 'test:key2']);
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
