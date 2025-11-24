import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import {
  isIPBlacklisted,
  blacklistIP,
  trackFailedAttempt,
  isCaptchaRequired,
  verifyCaptcha,
  cleanupOldRecords,
} from '@/lib/security';

// Mock the database
const mockFindFirst = jest.fn();
const mockUpsert = jest.fn();
const mockDeleteMany = jest.fn();
const mockCreate = jest.fn();
const mockFindMany = jest.fn();

jest.mock('@/lib/db', () => ({
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
}));

// Mock fetch for CAPTCHA verification
global.fetch = jest.fn() as jest.Mock;

describe('isIPBlacklisted', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return true if IP is blacklisted with no expiration', async () => {
    mockFindFirst.mockResolvedValue({
      ipAddress: '192.168.1.1',
      expiresAt: null,
    });

    const result = await isIPBlacklisted('192.168.1.1');
    expect(result).toBe(true);
    expect(mockFindFirst).toHaveBeenCalled();
  });

  it('should return true if IP is blacklisted with future expiration', async () => {
    const futureDate = new Date();
    futureDate.setHours(futureDate.getHours() + 1);

    mockFindFirst.mockResolvedValue({
      ipAddress: '192.168.1.1',
      expiresAt: futureDate,
    });

    const result = await isIPBlacklisted('192.168.1.1');
    expect(result).toBe(true);
  });

  it('should return false if IP is not blacklisted', async () => {
    mockFindFirst.mockResolvedValue(null);

    const result = await isIPBlacklisted('192.168.1.1');
    expect(result).toBe(false);
  });
});

describe('blacklistIP', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should blacklist IP with default expiration (24 hours)', async () => {
    mockUpsert.mockResolvedValue({});

    await blacklistIP('192.168.1.1', 'Test reason');

    expect(mockUpsert).toHaveBeenCalled();
    const callArgs = mockUpsert.mock.calls[0][0];
    expect(callArgs.where.ipAddress).toBe('192.168.1.1');
    expect(callArgs.create.reason).toBe('Test reason');
    expect(callArgs.create.expiresAt).toBeInstanceOf(Date);
  });

  it('should blacklist IP with custom expiration', async () => {
    const customExpiry = new Date('2025-12-31');
    mockUpsert.mockResolvedValue({});

    await blacklistIP('192.168.1.1', 'Test reason', customExpiry);

    expect(mockUpsert).toHaveBeenCalled();
    const callArgs = mockUpsert.mock.calls[0][0];
    expect(callArgs.create.expiresAt).toEqual(customExpiry);
  });
});

describe('trackFailedAttempt', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should track failed attempt with default action type', async () => {
    mockCreate.mockResolvedValue({});

    await trackFailedAttempt('192.168.1.1', 'test@example.com', 'Mozilla/5.0');

    expect(mockCreate).toHaveBeenCalled();
    const callArgs = mockCreate.mock.calls[0][0];
    expect(callArgs.data.ipAddress).toBe('192.168.1.1');
    expect(callArgs.data.email).toBe('test@example.com');
    expect(callArgs.data.actionType).toBe('newsletter_subscribe');
  });

  it('should track failed attempt with custom action type', async () => {
    mockCreate.mockResolvedValue({});

    await trackFailedAttempt('192.168.1.1', 'test@example.com', 'Mozilla/5.0', 'login_attempt');

    expect(mockCreate).toHaveBeenCalled();
    const callArgs = mockCreate.mock.calls[0][0];
    expect(callArgs.data.actionType).toBe('login_attempt');
  });
});

describe('isCaptchaRequired', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should return false if less than 3 attempts', async () => {
    mockFindMany.mockResolvedValue([
      { timestamp: new Date() },
      { timestamp: new Date() },
    ]);

    const result = await isCaptchaRequired('192.168.1.1');
    expect(result).toBe(false);
  });

  it('should return true if 3 or more attempts in last hour', async () => {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 30 * 60 * 1000); // 30 minutes ago

    mockFindMany.mockResolvedValue([
      { timestamp: now },
      { timestamp: oneHourAgo },
      { timestamp: oneHourAgo },
    ]);

    const result = await isCaptchaRequired('192.168.1.1');
    expect(result).toBe(true);
  });

  it('should return false if attempts are older than 1 hour', async () => {
    const now = new Date();
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

    mockFindMany.mockResolvedValue([
      { timestamp: twoHoursAgo },
      { timestamp: twoHoursAgo },
      { timestamp: twoHoursAgo },
    ]);

    const result = await isCaptchaRequired('192.168.1.1');
    expect(result).toBe(false);
  });

  it('should check both IP and email when email provided', async () => {
    mockFindMany.mockResolvedValue([]);

    await isCaptchaRequired('192.168.1.1', 'test@example.com');

    expect(mockFindMany).toHaveBeenCalled();
  });
});

describe('verifyCaptcha', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.RECAPTCHA_SECRET_KEY = 'test-secret-key';
  });

  it('should return true for valid CAPTCHA token', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      json: async () => ({ success: true }),
    });

    const result = await verifyCaptcha('valid-token');
    expect(result).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith(
      'https://www.google.com/recaptcha/api/siteverify',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('secret=test-secret-key'),
        body: expect.stringContaining('response=valid-token'),
      })
    );
  });

  it('should return false for invalid CAPTCHA token', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      json: async () => ({ success: false }),
    });

    const result = await verifyCaptcha('invalid-token');
    expect(result).toBe(false);
  });

  it('should include IP address when provided', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      json: async () => ({ success: true }),
    });

    await verifyCaptcha('token', '192.168.1.1');
    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: expect.stringContaining('remoteip=192.168.1.1'),
      })
    );
  });

  it('should return false on fetch error', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

    const result = await verifyCaptcha('token');
    expect(result).toBe(false);
  });
});

describe('cleanupOldRecords', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDeleteMany.mockResolvedValue({ count: 0 });
  });

  it('should delete expired blacklisted IPs and failed attempts', async () => {
    await expect(cleanupOldRecords()).resolves.not.toThrow();
    // Function should complete without errors
    expect(mockDeleteMany).toHaveBeenCalled();
  });
});

