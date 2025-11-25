import { describe, it, expect, beforeEach, beforeAll, jest } from '@jest/globals';

type AsyncMock<Args extends any[] = any[], Return = unknown> = jest.MockedFunction<
  (...args: Args) => Promise<Return>
>;

// ---- Database mocks ----
const mockUpsert: AsyncMock<[unknown], unknown> = jest.fn();
const mockCreate: AsyncMock<[unknown], unknown> = jest.fn();

jest.mock('@/lib/db', () => ({
  db: {
    newsletterSubscriber: {
      upsert: mockUpsert,
    },
    newsletterAuditLog: {
      create: mockCreate,
    },
  },
}));

// ---- Security mocks ----
const mockIsIPBlacklisted: AsyncMock<[string]> = jest.fn();
const mockTrackFailedAttempt: AsyncMock = jest.fn();
const mockIsCaptchaRequired: AsyncMock = jest.fn();
const mockVerifyCaptcha: AsyncMock = jest.fn();

jest.mock('@/lib/security', () => ({
  isIPBlacklisted: mockIsIPBlacklisted,
  trackFailedAttempt: mockTrackFailedAttempt,
  isCaptchaRequired: mockIsCaptchaRequired,
  verifyCaptcha: mockVerifyCaptcha,
}));

// ---- Email mocks ----
const mockSendWelcomeEmail: AsyncMock = jest.fn();
const mockSendAdminNotification: AsyncMock = jest.fn();

jest.mock('@/lib/resend', () => ({
  sendWelcomeEmail: mockSendWelcomeEmail,
  sendAdminNotification: mockSendAdminNotification,
}));

// ---- Rate limit mock ----
const mockWithRateLimit = jest.fn(
  (
    _limiter: unknown,
    _identifier: string,
    handler: (req: Request) => Promise<Response>,
  ) => handler,
);

jest.mock('@/lib/rate-limit', () => ({
  withRateLimit: mockWithRateLimit,
  apiLimiter: {},
}));

// ---- Import handler AFTER mocks ----
type PostHandler = (req: Request) => Promise<Response>;
let POST: PostHandler;

beforeAll(async () => {
  const routeModule = await import('@/app/api/newsletter/subscribe/route');
  POST = routeModule.POST as unknown as PostHandler;
});

beforeEach(() => {
  jest.clearAllMocks();

  // Default DB behaviour
  mockUpsert.mockResolvedValue({
    id: 'sub-default',
    email: 'default@example.com',
    name: 'Default User',
  });
  mockCreate.mockResolvedValue({ id: 'log-default' });

  // Default security behaviour
  mockIsIPBlacklisted.mockResolvedValue(false);
  mockIsCaptchaRequired.mockResolvedValue(false);
  mockVerifyCaptcha.mockResolvedValue(true);
  mockTrackFailedAttempt.mockResolvedValue(undefined);

  // Default email behaviour
  mockSendWelcomeEmail.mockResolvedValue(undefined);
  mockSendAdminNotification.mockResolvedValue(undefined);

  mockWithRateLimit.mockImplementation(
    (
      _limiter: unknown,
      _identifier: string,
      handler: (req: Request) => Promise<Response>,
    ) => handler,
  );
});

// ---- TESTS ----

describe('POST /api/newsletter/subscribe', () => {
  it('should return 400 if email is missing', async () => {
    const request = new Request(
      'http://localhost:3000/api/newsletter/subscribe',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '192.168.1.1',
          'user-agent': 'Mozilla/5.0',
        },
        body: JSON.stringify({
          name: 'Test User',
        }),
      },
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('valid email');
    expect(mockTrackFailedAttempt).toHaveBeenCalled();
  });

  it('should return 400 if email format is invalid', async () => {
    const request = new Request(
      'http://localhost:3000/api/newsletter/subscribe',
      {
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
      },
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('valid email');
    expect(mockTrackFailedAttempt).toHaveBeenCalled();
  });

  it('should return 429 if IP is blacklisted', async () => {
    mockIsIPBlacklisted.mockResolvedValueOnce(true);

    const request = new Request(
      'http://localhost:3000/api/newsletter/subscribe',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '192.168.1.1',
        },
        body: JSON.stringify({
          email: 'test@example.com',
          name: 'Test User',
        }),
      },
    );

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

    mockUpsert.mockResolvedValueOnce(mockSubscriber);
    mockCreate.mockResolvedValueOnce({ id: 'log-123' });

    const request = new Request(
      'http://localhost:3000/api/newsletter/subscribe',
      {
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
      },
    );

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
    mockIsCaptchaRequired.mockResolvedValueOnce(true);

    const request = new Request(
      'http://localhost:3000/api/newsletter/subscribe',
      {
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
      },
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Captcha verification required');
    expect(data.requiresCaptcha).toBe(true);
  });

  it('should verify CAPTCHA token when provided', async () => {
    mockIsCaptchaRequired.mockResolvedValueOnce(true);
    mockVerifyCaptcha.mockResolvedValueOnce(true);

    const mockSubscriber = {
      id: 'sub-123',
      email: 'test@example.com',
      name: 'Test User',
    };

    mockUpsert.mockResolvedValueOnce(mockSubscriber);
    mockCreate.mockResolvedValueOnce({ id: 'log-123' });

    const request = new Request(
      'http://localhost:3000/api/newsletter/subscribe',
      {
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
      },
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockVerifyCaptcha).toHaveBeenCalledWith(
      'valid-token',
      '192.168.1.1',
    );
  });

  it('should return 400 if CAPTCHA verification fails', async () => {
    mockIsCaptchaRequired.mockResolvedValueOnce(true);
    mockVerifyCaptcha.mockResolvedValueOnce(false);

    const request = new Request(
      'http://localhost:3000/api/newsletter/subscribe',
      {
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
      },
    );

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

    mockUpsert.mockResolvedValueOnce(existingSubscriber);
    mockCreate.mockResolvedValueOnce({ id: 'log-123' });

    const request = new Request(
      'http://localhost:3000/api/newsletter/subscribe',
      {
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
      },
    );

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
    const mockSubscriber = {
      id: 'sub-123',
      email: 'test@example.com',
      name: 'Test User',
    };

    mockUpsert.mockResolvedValueOnce(mockSubscriber);
    mockCreate.mockResolvedValueOnce({ id: 'log-123' });
    mockSendWelcomeEmail.mockRejectedValueOnce(new Error('Email error'));

    const request = new Request(
      'http://localhost:3000/api/newsletter/subscribe',
      {
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
      },
    );

    const response = await POST(request);
    const data = await response.json();

    // Should still succeed even if email fails
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });
});