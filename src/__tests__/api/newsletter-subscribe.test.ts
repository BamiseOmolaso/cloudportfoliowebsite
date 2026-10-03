import { describe, it, expect, beforeEach, beforeAll, jest } from '@jest/globals';

type AsyncMock<Args extends any[] = any[], Return = unknown> = jest.MockedFunction<
  (...args: Args) => Promise<Return>
>;

// ---- Database mocks ----
const mockUpsert: AsyncMock<[unknown], unknown> = jest.fn();
const mockFindUnique: AsyncMock<[unknown], unknown> = jest.fn();
const mockCreate: AsyncMock<[unknown], unknown> = jest.fn();

jest.mock('@/lib/db', () => ({
  db: {
    newsletterSubscriber: {
      upsert: mockUpsert,
      findFirst: mockFindUnique,
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
const mockSendConfirmationEmail: AsyncMock = jest.fn();

jest.mock('@/lib/resend', () => ({
  sendWelcomeEmail: mockSendWelcomeEmail,
  sendAdminNotification: mockSendAdminNotification,
  sendConfirmationEmail: mockSendConfirmationEmail,
}));

// ---- Rate limit mock ----
const mockWithRateLimit = jest.fn(
  (
    _limiter: unknown,
    _identifier: string,
    handler: (req: Request) => Promise<Response>,
  ) => handler,
);

const mockEmailLimit: AsyncMock = jest.fn();

jest.mock('@/lib/rate-limit', () => ({
  withRateLimit: mockWithRateLimit,
  subscribeLimiter: {},
  perEmailLimiter: { check: mockEmailLimit },
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

  // Default: the address has not been tried too often, and is not on the list yet
  mockEmailLimit.mockResolvedValue({ success: true, remaining: 2, resetTime: Date.now() + 3600000 });
  mockFindUnique.mockResolvedValue(null);
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
    expect(data).toEqual({ success: true, pendingConfirmation: true });
    expect(mockUpsert).toHaveBeenCalled();
    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        subscriberId: 'sub-123',
        action: 'confirmation_requested',
      }),
    });
    // Signing up only asks for confirmation: no welcome email, and the owner is not told yet.
    expect(mockSendConfirmationEmail).toHaveBeenCalledWith('test@example.com', 'Test User', expect.stringMatching(/^[0-9a-f]{64}$/));
    expect(mockSendWelcomeEmail).not.toHaveBeenCalled();
    expect(mockSendAdminNotification).not.toHaveBeenCalled();
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
        confirmationTokenHash: expect.stringMatching(/^[0-9a-f]{64}$/),
      }),
      create: expect.any(Object),
    });
  });

  it('does not subscribe anyone until they confirm, and keeps only a hash of the link', async () => {
    mockUpsert.mockResolvedValueOnce({ id: 'sub-1', email: 'test@example.com', name: 'Ada' });
    mockCreate.mockResolvedValueOnce({ id: 'log-1' });
    await POST(
      new Request('http://localhost:3000/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '192.168.1.1', 'user-agent': 'Mozilla/5.0' },
        body: JSON.stringify({ email: 'test@example.com', name: 'Ada' }),
      }),
    );
    const call = mockUpsert.mock.calls.at(-1)?.[0] as {
      create: Record<string, unknown>;
      update: Record<string, unknown>;
    };
    expect(call.create.isSubscribed).toBe(false);
    // An existing row (for example someone who had unsubscribed) is not switched back on either.
    expect(call.update).not.toHaveProperty('isSubscribed');
    expect(call.update.confirmationExpiresAt).toBeInstanceOf(Date);
    const token = mockSendConfirmationEmail.mock.calls.at(-1)?.[2] as string;
    expect(JSON.stringify(call)).not.toContain(token);
  });

  it('does not erase a name we already have when the form leaves it blank', async () => {
    mockUpsert.mockResolvedValueOnce({ id: 'sub-1', email: 'test@example.com', name: 'Ada' });
    mockCreate.mockResolvedValueOnce({ id: 'log-1' });
    await POST(
      new Request('http://localhost:3000/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '192.168.1.1', 'user-agent': 'Mozilla/5.0' },
        body: JSON.stringify({ email: 'test@example.com' }),
      }),
    );
    const call = mockUpsert.mock.calls.at(-1)?.[0] as { update: Record<string, unknown> };
    expect(call.update).not.toHaveProperty('name');
  });

  const signup = (email = 'test@example.com') =>
    new Request('http://localhost:3000/api/newsletter/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': '192.168.1.1',
        'user-agent': 'Mozilla/5.0',
      },
      body: JSON.stringify({ email, name: 'Test User' }),
    });

  it('does nothing when the email is already subscribed (no emails, no new tokens)', async () => {
    mockFindUnique.mockResolvedValueOnce({ email: 'test@example.com', isSubscribed: true, isDeleted: false });

    const response = await POST(signup());
    const data = await response.json();

    // The visitor is told plainly that they are already subscribed.
    expect(response.status).toBe(200);
    expect(data).toEqual({ success: true, alreadySubscribed: true });
    expect(mockUpsert).not.toHaveBeenCalled();
    expect(mockCreate).not.toHaveBeenCalled();
    expect(mockSendWelcomeEmail).not.toHaveBeenCalled();
    expect(mockSendAdminNotification).not.toHaveBeenCalled();
  });

  it('stops an address that has been tried too many times, from any number of visitors', async () => {
    mockEmailLimit.mockResolvedValueOnce({ success: false, remaining: 0, resetTime: Date.now() + 1000 });
    const response = await POST(signup());
    expect(response.status).toBe(429);
    expect(mockFindUnique).not.toHaveBeenCalled();
    expect(mockUpsert).not.toHaveBeenCalled();
    expect(mockSendWelcomeEmail).not.toHaveBeenCalled();
  });

  it('treats capital letters as the same address', async () => {
    mockUpsert.mockResolvedValueOnce({ id: 'sub-1', email: 'test@example.com', name: 'T' });
    await POST(signup('Test@Example.COM'));
    expect(mockEmailLimit).toHaveBeenCalledWith('newsletter:test@example.com');
    const lookup = mockFindUnique.mock.calls[0][0] as { where: { email: { equals: string; mode: string } } };
    expect(lookup.where.email).toEqual({ equals: 'test@example.com', mode: 'insensitive' });
  });

  it('updates the row stored with capital letters instead of making a duplicate', async () => {
    mockFindUnique.mockResolvedValueOnce({ email: 'Test@Example.com', isSubscribed: false, isDeleted: false });
    mockUpsert.mockResolvedValueOnce({ id: 'sub-1', email: 'Test@Example.com', name: 'T' });
    await POST(signup('test@example.com'));
    expect((mockUpsert.mock.calls[0][0] as { where: unknown }).where).toEqual({ email: 'Test@Example.com' });
  });

  it.each([
    ['unsubscribed earlier', { email: 'test@example.com', isSubscribed: false, isDeleted: false, confirmationTokenHash: null, confirmationSentAt: null }],
    ['deleted earlier', { email: 'test@example.com', isSubscribed: true, isDeleted: true, confirmationTokenHash: null, confirmationSentAt: null }],
  ])('asks someone who %s to confirm again, instead of re-subscribing them', async (_label, row) => {
    mockFindUnique.mockResolvedValueOnce(row);

    const response = await POST(signup());

    expect(response.status).toBe(200);
    expect(mockUpsert).toHaveBeenCalled();
    expect(mockSendConfirmationEmail).toHaveBeenCalled();
    expect(mockSendWelcomeEmail).not.toHaveBeenCalled();
  });

  it('does not send another confirmation email within a few minutes of the last one', async () => {
    mockFindUnique.mockResolvedValueOnce({
      email: 'test@example.com',
      isSubscribed: false,
      isDeleted: false,
      confirmationTokenHash: 'a'.repeat(64),
      confirmationSentAt: new Date(Date.now() - 60 * 1000),
    });
    const data = await (await POST(signup())).json();
    expect(data).toEqual({ success: true, pendingConfirmation: true, alreadySent: true });
    expect(mockSendConfirmationEmail).not.toHaveBeenCalled();
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it('sends a fresh confirmation email when the last one is old', async () => {
    mockFindUnique.mockResolvedValueOnce({
      email: 'test@example.com',
      isSubscribed: false,
      isDeleted: false,
      confirmationTokenHash: 'a'.repeat(64),
      confirmationSentAt: new Date(Date.now() - 60 * 60 * 1000),
    });
    expect((await POST(signup())).status).toBe(200);
    expect(mockSendConfirmationEmail).toHaveBeenCalledTimes(1);
  });

  it('says so when the confirmation email cannot be sent', async () => {
    const mockSubscriber = {
      id: 'sub-123',
      email: 'test@example.com',
      name: 'Test User',
    };

    mockUpsert.mockResolvedValueOnce(mockSubscriber);
    mockCreate.mockResolvedValueOnce({ id: 'log-123' });
    mockSendConfirmationEmail.mockRejectedValueOnce(new Error('Email error'));

    const response = await POST(signup());
    const data = await response.json();

    // The email is the only way to finish signing up, so a failure is not hidden.
    expect(response.status).toBe(502);
    expect(data.error).toContain('confirmation email');
  });
});