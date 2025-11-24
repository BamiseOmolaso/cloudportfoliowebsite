import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { NextRequest } from 'next/server';

// Mock dependencies BEFORE importing the route
jest.mock('@/lib/db', () => ({
  db: {
    contactMessage: {
      create: jest.fn(),
    },
  },
}));

jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: {
      send: jest.fn(),
    },
  })),
}));

// Mock rate-limit to prevent Redis initialization
jest.mock('@/lib/rate-limit', () => {
  const originalModule = jest.requireActual('@/lib/rate-limit');
  return {
    ...originalModule,
    withRateLimit: (limiter: unknown, identifier: string, handler: (req: Request) => Promise<Response>) => {
      return handler;
    },
    contactFormLimiter: {
      check: jest.fn().mockResolvedValue({ success: true, remaining: 5, resetTime: Date.now() + 3600000 }),
    },
  };
});

// Import after mocks
import { POST } from '@/app/api/contact/route';
import { db } from '@/lib/db';
import { Resend } from 'resend';

const mockCreate = jest.fn();
const mockSend = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  
  // Mock Prisma
  (db.contactMessage.create as jest.Mock) = mockCreate;
  
  // Mock Resend
  (Resend as jest.Mock).mockImplementation(() => ({
    emails: {
      send: mockSend,
    },
  }));
  
  // Set environment variables
  process.env.RESEND_API_KEY = 'test-resend-key';
  process.env.CONTACT_EMAIL = 'admin@example.com';
  process.env.RESEND_FROM_EMAIL = 'noreply@example.com';
  
  // Reset mocks
  mockCreate.mockClear();
  mockSend.mockClear();
});

describe('POST /api/contact', () => {
  it('should return 400 if name is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/contact', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
        message: 'Test message',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Name, email, and message are required');
  });

  it('should return 400 if email is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/contact', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test User',
        message: 'Test message',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Name, email, and message are required');
  });

  it('should return 400 if message is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/contact', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test User',
        email: 'test@example.com',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Name, email, and message are required');
  });

  it('should return 400 if email format is invalid', async () => {
    const request = new NextRequest('http://localhost:3000/api/contact', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test User',
        email: 'invalid-email',
        message: 'Test message',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid email format');
  });

  it('should successfully create contact message with valid data', async () => {
    mockCreate.mockResolvedValue({
      id: '123',
      name: 'Test User',
      email: 'test@example.com',
      subject: 'Test Subject',
      message: 'Test message',
    });

    mockSend.mockResolvedValue({ id: 'email-id' });

    const request = new NextRequest('http://localhost:3000/api/contact', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test User',
        email: 'test@example.com',
        subject: 'Test Subject',
        message: 'Test message',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toBe('Message sent successfully');
    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        name: 'Test User',
        email: 'test@example.com',
        subject: 'Test Subject',
        message: 'Test message',
        read: false,
        replied: false,
      },
    });
  });

  it('should sanitize inputs before saving', async () => {
    mockCreate.mockResolvedValue({ id: '123' });
    mockSend.mockResolvedValue({ id: 'email-id' });

    const request = new NextRequest('http://localhost:3000/api/contact', {
      method: 'POST',
      body: JSON.stringify({
        name: '  Test User  ',
        email: '  TEST@EXAMPLE.COM  ',
        message: '  Test message  ',
      }),
    });

    await POST(request);

    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: 'Test User',
        email: 'test@example.com',
        message: 'Test message',
      }),
    });
  });

  it('should handle database errors gracefully', async () => {
    mockCreate.mockRejectedValue(new Error('Database error'));

    const request = new NextRequest('http://localhost:3000/api/contact', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test User',
        email: 'test@example.com',
        message: 'Test message',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to save message');
  });

  it('should send emails even if one fails', async () => {
    mockCreate.mockResolvedValue({ id: '123' });
    // First email succeeds, second fails
    mockSend
      .mockResolvedValueOnce({ id: 'email-1' })
      .mockRejectedValueOnce(new Error('Email error'));

    const request = new NextRequest('http://localhost:3000/api/contact', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test User',
        email: 'test@example.com',
        message: 'Test message',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    // Should still succeed even if one email fails
    expect(response.status).toBe(200);
    expect(data.message).toBe('Message sent successfully');
    expect(mockSend).toHaveBeenCalledTimes(2);
  });

  it('should handle missing CONTACT_EMAIL environment variable', async () => {
    delete process.env.CONTACT_EMAIL;
    mockCreate.mockResolvedValue({ id: '123' });
    mockSend.mockRejectedValue(new Error('CONTACT_EMAIL not set'));

    const request = new NextRequest('http://localhost:3000/api/contact', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test User',
        email: 'test@example.com',
        message: 'Test message',
      }),
    });

    // Should still succeed - email errors are logged but don't fail the request
    const response = await POST(request);
    expect(response.status).toBe(200);
  });
});

