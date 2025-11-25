// Mock the database module - mocks must be defined inside the factory
const mockFindFirst = jest.fn();
const mockUpsert = jest.fn();
const mockDeleteMany = jest.fn();
const mockCreate = jest.fn();
const mockFindMany = jest.fn();

jest.mock('@/lib/db', () => {
  const mockFindFirst = jest.fn();
  const mockUpsert = jest.fn();
  const mockDeleteMany = jest.fn();
  const mockCreate = jest.fn();
  const mockFindMany = jest.fn();

  return {
    __esModule: true,
    db: {
      blacklistedIp: {
        findFirst: mockFindFirst,
        upsert: mockUpsert,
        deleteMany: mockDeleteMany,
      },
      failedAttempt: {
        create: mockCreate,
        findMany: mockFindMany,
        deleteMany: mockDeleteMany,
      },
    },
    default: {
      blacklistedIp: {
        findFirst: mockFindFirst,
        upsert: mockUpsert,
        deleteMany: mockDeleteMany,
      },
      failedAttempt: {
        create: mockCreate,
        findMany: mockFindMany,
        deleteMany: mockDeleteMany,
      },
    },
    // Export mocks for use in tests
    __mocks: {
      mockFindFirst,
      mockUpsert,
      mockDeleteMany,
      mockCreate,
      mockFindMany,
    },
  };
});

// Mock fetch for CAPTCHA verification
global.fetch = jest.fn() as jest.Mock;

// Import after mocks
import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  isIPBlacklisted,
  blacklistIP,
  trackFailedAttempt,
  isCaptchaRequired,
  verifyCaptcha,
  cleanupOldRecords,
} from '@/lib/security';
import { db } from '@/lib/db';

// Get the mocked functions from the db module
// Since we can't directly access the mocks, we'll use jest.spyOn
const getMocks = () => {
  return {
    mockFindFirst: jest.spyOn(db.blacklistedIp, 'findFirst') as jest.MockedFunction<typeof db.blacklistedIp.findFirst>,
    mockUpsert: jest.spyOn(db.blacklistedIp, 'upsert') as jest.MockedFunction<typeof db.blacklistedIp.upsert>,
    mockDeleteMany: jest.spyOn(db.blacklistedIp, 'deleteMany') as jest.MockedFunction<typeof db.blacklistedIp.deleteMany>,
    mockCreate: jest.spyOn(db.failedAttempt, 'create') as jest.MockedFunction<typeof db.failedAttempt.create>,
    mockFindMany: jest.spyOn(db.failedAttempt, 'findMany') as jest.MockedFunction<typeof db.failedAttempt.findMany>,
  };
};

describe('isIPBlacklisted', () => {
  let mocks: ReturnType<typeof getMocks>;

  beforeEach(() => {
    mocks = getMocks();
    jest.clearAllMocks();
  });

  afterEach(() => {
    mocks.mockFindFirst.mockRestore();
    mocks.mockUpsert.mockRestore();
    mocks.mockDeleteMany.mockRestore();
    mocks.mockCreate.mockRestore();
    mocks.mockFindMany.mockRestore();
  });

  it('should return true if IP is blacklisted with no expiration', async () => {
    mocks.mockFindFirst.mockResolvedValue({
      ipAddress: '192.168.1.1',
      expiresAt: null,
    } as any);

    const result = await isIPBlacklisted('192.168.1.1');
    expect(result).toBe(true);
    expect(mocks.mockFindFirst).toHaveBeenCalled();
  });

  it('should return true if IP is blacklisted with future expiration', async () => {
    const futureDate = new Date();
    futureDate.setHours(futureDate.getHours() + 1);

    mocks.mockFindFirst.mockResolvedValue({
      ipAddress: '192.168.1.1',
      expiresAt: futureDate,
    } as any);

    const result = await isIPBlacklisted('192.168.1.1');
    expect(result).toBe(true);
  });

  it('should return false if IP is not blacklisted', async () => {
    mocks.mockFindFirst.mockResolvedValue(null);

    const result = await isIPBlacklisted('192.168.1.1');
    expect(result).toBe(false);
  });
});

describe('blacklistIP', () => {
  let mocks: ReturnType<typeof getMocks>;

  beforeEach(() => {
    mocks = getMocks();
    jest.clearAllMocks();
  });

  afterEach(() => {
    mocks.mockFindFirst.mockRestore();
    mocks.mockUpsert.mockRestore();
    mocks.mockDeleteMany.mockRestore();
    mocks.mockCreate.mockRestore();
    mocks.mockFindMany.mockRestore();
  });

  it('should blacklist IP with default expiration (24 hours)', async () => {
    mocks.mockUpsert.mockResolvedValue({} as any);

    await blacklistIP('192.168.1.1', 'Test reason');

    expect(mocks.mockUpsert).toHaveBeenCalled();
    const callArgs = mocks.mockUpsert.mock.calls[0]?.[0];
    expect(callArgs?.where?.ipAddress).toBe('192.168.1.1');
    expect(callArgs?.create?.reason).toBe('Test reason');
    expect(callArgs?.create?.expiresAt).toBeInstanceOf(Date);
  });

  it('should blacklist IP with custom expiration', async () => {
    const customExpiry = new Date('2025-12-31');
    mocks.mockUpsert.mockResolvedValue({} as any);

    await blacklistIP('192.168.1.1', 'Test reason', customExpiry);

    expect(mocks.mockUpsert).toHaveBeenCalled();
    const callArgs = mocks.mockUpsert.mock.calls[0]?.[0];
    expect(callArgs?.create?.expiresAt).toEqual(customExpiry);
  });
});

describe('trackFailedAttempt', () => {
  let mocks: ReturnType<typeof getMocks>;

  beforeEach(() => {
    mocks = getMocks();
    jest.clearAllMocks();
  });

  afterEach(() => {
    mocks.mockFindFirst.mockRestore();
    mocks.mockUpsert.mockRestore();
    mocks.mockDeleteMany.mockRestore();
    mocks.mockCreate.mockRestore();
    mocks.mockFindMany.mockRestore();
  });

  it('should track failed attempt with default action type', async () => {
    mocks.mockCreate.mockResolvedValue({} as any);

    await trackFailedAttempt('192.168.1.1', 'test@example.com', 'Mozilla/5.0');

    expect(mocks.mockCreate).toHaveBeenCalled();
    const callArgs = mocks.mockCreate.mock.calls[0]?.[0];
    expect(callArgs?.data?.ipAddress).toBe('192.168.1.1');
    expect(callArgs?.data?.email).toBe('test@example.com');
    expect(callArgs?.data?.actionType).toBe('newsletter_subscribe');
  });

  it('should track failed attempt with custom action type', async () => {
    mocks.mockCreate.mockResolvedValue({} as any);

    await trackFailedAttempt('192.168.1.1', 'test@example.com', 'Mozilla/5.0', 'login_attempt');

    expect(mocks.mockCreate).toHaveBeenCalled();
    const callArgs = mocks.mockCreate.mock.calls[0]?.[0];
    expect(callArgs?.data?.actionType).toBe('login_attempt');
  });
});

describe('isCaptchaRequired', () => {
  let mocks: ReturnType<typeof getMocks>;

  beforeEach(() => {
    mocks = getMocks();
    jest.clearAllMocks();
  });

  afterEach(() => {
    mocks.mockFindFirst.mockRestore();
    mocks.mockUpsert.mockRestore();
    mocks.mockDeleteMany.mockRestore();
    mocks.mockCreate.mockRestore();
    mocks.mockFindMany.mockRestore();
  });

  it('should return false if less than 3 attempts', async () => {
    mocks.mockFindMany.mockResolvedValue([
      { timestamp: new Date() },
      { timestamp: new Date() },
    ] as any);

    const result = await isCaptchaRequired('192.168.1.1');
    expect(result).toBe(false);
  });

  it('should return true if 3 or more attempts in last hour', async () => {
    const now = new Date();
    const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);

    mocks.mockFindMany.mockResolvedValue([
      { timestamp: now },
      { timestamp: thirtyMinutesAgo },
      { timestamp: thirtyMinutesAgo },
    ] as any);

    const result = await isCaptchaRequired('192.168.1.1');
    expect(result).toBe(true);
  });

  it('should return false if attempts are older than 1 hour', async () => {
    const now = new Date();
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

    mocks.mockFindMany.mockResolvedValue([
      { timestamp: twoHoursAgo },
      { timestamp: twoHoursAgo },
      { timestamp: twoHoursAgo },
    ] as any);

    const result = await isCaptchaRequired('192.168.1.1');
    expect(result).toBe(false);
  });

  it('should check both IP and email when email provided', async () => {
    mocks.mockFindMany.mockResolvedValue([]);

    await isCaptchaRequired('192.168.1.1', 'test@example.com');

    expect(mocks.mockFindMany).toHaveBeenCalled();
    const callArgs = mocks.mockFindMany.mock.calls[0]?.[0];
    expect(callArgs?.where).toBeDefined();
  });
});

describe('verifyCaptcha', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.RECAPTCHA_SECRET_KEY = 'test-secret-key';
  });

  it('should return true for valid CAPTCHA token', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });

    const result = await verifyCaptcha('valid-token');
    expect(result).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith(
      'https://www.google.com/recaptcha/api/siteverify',
      expect.objectContaining({
        method: 'POST',
      })
    );
  });

  it('should return false for invalid CAPTCHA token', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ success: false }),
    });

    const result = await verifyCaptcha('invalid-token');
    expect(result).toBe(false);
  });

  it('should include IP address when provided', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });

    await verifyCaptcha('token', '192.168.1.1');
    expect(global.fetch).toHaveBeenCalled();
    const callArgs = (global.fetch as jest.Mock).mock.calls[0];
    expect(callArgs?.[1]?.body).toContain('remoteip=192.168.1.1');
  });

  it('should return false on fetch error', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

    const result = await verifyCaptcha('token');
    expect(result).toBe(false);
  });
});

describe('cleanupOldRecords', () => {
  let mocks: ReturnType<typeof getMocks>;

  beforeEach(() => {
    mocks = getMocks();
    jest.clearAllMocks();
    mocks.mockDeleteMany.mockResolvedValue({ count: 0 });
  });

  afterEach(() => {
    mocks.mockFindFirst.mockRestore();
    mocks.mockUpsert.mockRestore();
    mocks.mockDeleteMany.mockRestore();
    mocks.mockCreate.mockRestore();
    mocks.mockFindMany.mockRestore();
  });

  it('should delete expired blacklisted IPs and failed attempts', async () => {
    await expect(cleanupOldRecords()).resolves.not.toThrow();
    // Function should complete without errors
    expect(mocks.mockDeleteMany).toHaveBeenCalled();
  });
});
