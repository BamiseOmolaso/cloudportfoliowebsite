import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import * as security from '@/lib/security';
import * as resend from '@/lib/resend';

// Mock dependencies BEFORE importing the route
jest.mock('@/lib/db');
jest.mock('@/lib/security');
jest.mock('@/lib/resend');
jest.mock('@/lib/rate-limit', () => ({
  withRateLimit: (limiter: unknown, identifier: string, handler: (req: Request) => Promise<Response>) => handler,
  apiLimiter: {},
}));

// Import route after mocks are set up
import { POST } from '@/app/api/newsletter/subscribe/route';

const mockUpsert = jest.fn();
const mockCreate = jest.fn();
const mockIsIPBlacklisted = jest.fn();
const mockTrackFailedAttempt = jest.fn();
const mockIsCaptchaRequired = jest.fn();
const mockVerifyCaptcha = jest.fn();
const mockSendWelcomeEmail = jest.fn();
const mockSendAdminNotification = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  
  // Mock Prisma
  (db.newsletterSubscriber.upsert as jest.Mock) = mockUpsert;
  (db.newsletterAuditLog.create as jest.Mock) = mockCreate;
  
  // Mock security functions
  (security.isIPBlacklisted as jest.Mock) = mockIsIPBlacklisted;
  (security.trackFailedAttempt as jest.Mock) = mockTrackFailedAttempt;
  (security.isCaptchaRequired as jest.Mock) = mockIsCaptchaRequired;
  (security.verifyCaptcha as jest.Mock) = mockVerifyCaptcha;
  
  // Mock resend functions
  (resend.sendWelcomeEmail as jest.Mock) = mockSendWelcomeEmail;
  (resend.sendAdminNotification as jest.Mock) = mockSendAdminNotification;
  
  // Default mocks
  mockIsIPBlacklisted.mockResolvedValue(false);
  mockIsCaptchaRequired.mockResolvedValue(false);
  mockSendWelcomeEmail.mockResolvedValue(undefined);
  mockSendAdminNotification.mockResolvedValue(undefined);
});

describe('POST /api/newsletter/subscribe', () => {
  it('should return 400 if email is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/newsletter/subscribe', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test User',
      }),
      headers: {
        'x-forwarded-for': '192.168.1.1',
        'user-agent': 'Mozilla/5.0',
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('valid email');
    expect(mockTrackFailedAttempt).toHaveBeenCalled();
  });

  it('should return 400 if email format is invalid', async () => {
    const request = new NextRequest('http://localhost:3000/api/newsletter/subscribe', {
      method: 'POST',
      body: JSON.stringify({
        email: 'invalid-email',
        name: 'Test User',
      }),
      headers: {
        'x-forwarded-for': '192.168.1.1',
        'user-agent': 'Mozilla/5.0',
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('valid email');
  });

  it('should return 429 if IP is blacklisted', async () => {
    mockIsIPBlacklisted.mockResolvedValue(true);

    const request = new NextRequest('http://localhost:3000/api/newsletter/subscribe', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
        name: 'Test User',
      }),
      headers: {
        'x-forwarded-for': '192.168.1.1',
      },
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

    const request = new NextRequest('http://localhost:3000/api/newsletter/subscribe', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
        name: 'Test User',
        location: 'US',
      }),
      headers: {
        'x-forwarded-for': '192.168.1.1',
        'user-agent': 'Mozilla/5.0',
      },
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

    const request = new NextRequest('http://localhost:3000/api/newsletter/subscribe', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
        name: 'Test User',
      }),
      headers: {
        'x-forwarded-for': '192.168.1.1',
        'user-agent': 'Mozilla/5.0',
      },
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

    const request = new NextRequest('http://localhost:3000/api/newsletter/subscribe', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
        name: 'Test User',
        captchaToken: 'valid-token',
      }),
      headers: {
        'x-forwarded-for': '192.168.1.1',
        'user-agent': 'Mozilla/5.0',
      },
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

    const request = new NextRequest('http://localhost:3000/api/newsletter/subscribe', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
        name: 'Test User',
        captchaToken: 'invalid-token',
      }),
      headers: {
        'x-forwarded-for': '192.168.1.1',
        'user-agent': 'Mozilla/5.0',
      },
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

    const request = new NextRequest('http://localhost:3000/api/newsletter/subscribe', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
        name: 'Updated Name',
      }),
      headers: {
        'x-forwarded-for': '192.168.1.1',
        'user-agent': 'Mozilla/5.0',
      },
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

    const request = new NextRequest('http://localhost:3000/api/newsletter/subscribe', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
        name: 'Test User',
      }),
      headers: {
        'x-forwarded-for': '192.168.1.1',
        'user-agent': 'Mozilla/5.0',
      },
    });

    // Should still succeed even if email fails
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });
});

