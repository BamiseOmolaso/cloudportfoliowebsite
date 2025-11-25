import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { NextRequest } from 'next/server';

// Mock dependencies BEFORE importing the route
const mockUpsert = jest.fn();
const mockCreate = jest.fn();
const mockFindFirst = jest.fn();
const mockFailedAttemptCreate = jest.fn();
const mockFindMany = jest.fn();

jest.mock('@/lib/db', () => ({
  db: {
    newsletterSubscriber: {
      upsert: (...args: unknown[]) => mockUpsert(...args),
    },
    newsletterAuditLog: {
      create: (...args: unknown[]) => mockCreate(...args),
    },
    blacklistedIp: {
      findFirst: (...args: unknown[]) => mockFindFirst(...args),
    },
    failedAttempt: {
      create: (...args: unknown[]) => mockFailedAttemptCreate(...args),
      findMany: (...args: unknown[]) => mockFindMany(...args),
    },
  },
}));

// Create mock functions that will be used
const mockIsIPBlacklisted = jest.fn();
const mockTrackFailedAttempt = jest.fn();
const mockIsCaptchaRequired = jest.fn();
const mockVerifyCaptcha = jest.fn();

jest.mock('@/lib/security', () => ({
  isIPBlacklisted: (...args: unknown[]) => mockIsIPBlacklisted(...args),
  trackFailedAttempt: (...args: unknown[]) => mockTrackFailedAttempt(...args),
  isCaptchaRequired: (...args: unknown[]) => mockIsCaptchaRequired(...args),
  verifyCaptcha: (...args: unknown[]) => mockVerifyCaptcha(...args),
}));

const mockSendWelcomeEmail = jest.fn();
const mockSendAdminNotification = jest.fn();

jest.mock('@/lib/resend', () => ({
  sendWelcomeEmail: (...args: unknown[]) => mockSendWelcomeEmail(...args),
  sendAdminNotification: (...args: unknown[]) => mockSendAdminNotification(...args),
}));

const mockWithRateLimit = jest.fn((limiter: unknown, identifier: string, handler: (req: Request) => Promise<Response>) => {
  return handler;
});

jest.mock('@/lib/rate-limit', () => ({
  withRateLimit: mockWithRateLimit,
  apiLimiter: {},
}));

// Import after mocks
import { POST } from '@/app/api/newsletter/subscribe/route';

beforeEach(() => {
  jest.clearAllMocks();
  
  // Default mocks for Prisma
  mockFindFirst.mockResolvedValue(null);
  mockFindMany.mockResolvedValue([]);
  
  // Default mocks for security functions (these will use the mocked db)
  mockIsIPBlacklisted.mockResolvedValue(false);
  mockIsCaptchaRequired.mockResolvedValue(false);
  mockSendWelcomeEmail.mockResolvedValue(undefined);
  mockSendAdminNotification.mockResolvedValue(undefined);
});

describe('POST /api/newsletter/subscribe', () => {
  it('should return 400 if email is missing', async () => {
    const request = new Request('http://localhost:3000/api/newsletter/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': '192.168.1.1',
        'user-agent': 'Mozilla/5.0',
      },
      body: JSON.stringify({
        name: 'Test User',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('valid email');
    expect(mockTrackFailedAttempt).toHaveBeenCalled();
  });

  it('should return 400 if email format is invalid', async () => {
    const request = new Request('http://localhost:3000/api/newsletter/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': '192.168.1.1',
        'user-agent': 'Mozilla/5.0',
      },
      body: JSON.stringify({
        email: 'invalid-email',
        name: 'Test User',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('valid email');
  });

  it('should return 429 if IP is blacklisted', async () => {
    mockIsIPBlacklisted.mockResolvedValue(true);

    const request = new Request('http://localhost:3000/api/newsletter/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': '192.168.1.1',
      },
      body: JSON.stringify({
        email: 'test@example.com',
        name: 'Test User',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(429);
    expect(data.error).toContain('Too many attempts');
  });

  it('should successfully subscribe new user', async () => {
    const mockSubscriber = {
      id: 'sub-123',
      email: 'test@example.com',
      name: 'Test User',
    };

    mockUpsert.mockResolvedValue(mockSubscriber);
    mockCreate.mockResolvedValue({ id: 'log-123' });

    const request = new Request('http://localhost:3000/api/newsletter/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': '192.168.1.1',
        'user-agent': 'Mozilla/5.0',
      },
      body: JSON.stringify({
        email: 'test@example.com',
        name: 'Test User',
        location: 'US',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockUpsert).toHaveBeenCalled();
    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        subscriberId: 'sub-123',
        action: 'subscribed',
      }),
    });
    expect(mockSendWelcomeEmail).toHaveBeenCalled();
    expect(mockSendAdminNotification).toHaveBeenCalled();
  });

  it('should require CAPTCHA if too many attempts', async () => {
    mockIsCaptchaRequired.mockResolvedValue(true);

    const request = new Request('http://localhost:3000/api/newsletter/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': '192.168.1.1',
        'user-agent': 'Mozilla/5.0',
      },
      body: JSON.stringify({
        email: 'test@example.com',
        name: 'Test User',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Captcha verification required');
    expect(data.requiresCaptcha).toBe(true);
  });

  it('should verify CAPTCHA token when provided', async () => {
    mockIsCaptchaRequired.mockResolvedValue(true);
    mockVerifyCaptcha.mockResolvedValue(true);
    mockUpsert.mockResolvedValue({
      id: 'sub-123',
      email: 'test@example.com',
      name: 'Test User',
    });
    mockCreate.mockResolvedValue({ id: 'log-123' });

    const request = new Request('http://localhost:3000/api/newsletter/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': '192.168.1.1',
        'user-agent': 'Mozilla/5.0',
      },
      body: JSON.stringify({
        email: 'test@example.com',
        name: 'Test User',
        captchaToken: 'valid-token',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockVerifyCaptcha).toHaveBeenCalledWith('valid-token', '192.168.1.1');
  });

  it('should return 400 if CAPTCHA verification fails', async () => {
    mockIsCaptchaRequired.mockResolvedValue(true);
    mockVerifyCaptcha.mockResolvedValue(false);

    const request = new Request('http://localhost:3000/api/newsletter/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': '192.168.1.1',
        'user-agent': 'Mozilla/5.0',
      },
      body: JSON.stringify({
        email: 'test@example.com',
        name: 'Test User',
        captchaToken: 'invalid-token',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Captcha verification failed');
    expect(mockTrackFailedAttempt).toHaveBeenCalled();
  });

  it('should update existing subscriber instead of creating new one', async () => {
    const existingSubscriber = {
      id: 'sub-123',
      email: 'test@example.com',
      name: 'Updated Name',
    };

    mockUpsert.mockResolvedValue(existingSubscriber);
    mockCreate.mockResolvedValue({ id: 'log-123' });

    const request = new Request('http://localhost:3000/api/newsletter/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': '192.168.1.1',
        'user-agent': 'Mozilla/5.0',
      },
      body: JSON.stringify({
        email: 'test@example.com',
        name: 'Updated Name',
      }),
    });

    await POST(request);

    expect(mockUpsert).toHaveBeenCalledWith({
      where: { email: 'test@example.com' },
      update: expect.objectContaining({
        isSubscribed: true,
      }),
      create: expect.any(Object),
    });
  });

  it('should handle email sending errors gracefully', async () => {
    mockUpsert.mockResolvedValue({
      id: 'sub-123',
      email: 'test@example.com',
      name: 'Test User',
    });
    mockCreate.mockResolvedValue({ id: 'log-123' });
    mockSendWelcomeEmail.mockRejectedValue(new Error('Email error'));

    const request = new Request('http://localhost:3000/api/newsletter/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': '192.168.1.1',
        'user-agent': 'Mozilla/5.0',
      },
      body: JSON.stringify({
        email: 'test@example.com',
        name: 'Test User',
      }),
    });

    // Should still succeed even if email fails
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });
});
