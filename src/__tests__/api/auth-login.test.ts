import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { cookies } from 'next/headers';

// Mock dependencies BEFORE importing the route
jest.mock('@/lib/db');
jest.mock('next/headers');
jest.mock('@/lib/rate-limit', () => ({
  withRateLimit: (limiter: unknown, identifier: string, handler: (req: Request) => Promise<Response>) => handler,
  authLimiter: {},
}));

// Import route after mocks are set up
import { POST } from '@/app/api/auth/login/route';

const mockFindFirst = jest.fn();
const mockCreate = jest.fn();
const mockUpdate = jest.fn();
const mockSet = jest.fn();
const mockCookies = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  
  // Mock Prisma
  (db.profile.findFirst as jest.Mock) = mockFindFirst;
  (db.profile.create as jest.Mock) = mockCreate;
  (db.profile.update as jest.Mock) = mockUpdate;
  
  // Mock cookies
  (cookies as jest.Mock) = mockCookies;
  mockCookies.mockReturnValue({
    set: mockSet,
  });
  
  // Set environment variables
  process.env.JWT_SECRET = 'test-jwt-secret-key-minimum-32-characters-long';
  process.env.ADMIN_EMAIL = 'admin@example.com';
  process.env.ADMIN_PASSWORD = 'admin123';
});

describe('POST /api/auth/login', () => {
  it('should return 400 if email is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        password: 'admin123',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Email and password are required');
  });

  it('should return 400 if password is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'admin@example.com',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Email and password are required');
  });

  it('should return 500 if admin credentials are not configured', async () => {
    delete process.env.ADMIN_EMAIL;
    delete process.env.ADMIN_PASSWORD;

    const request = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'admin@example.com',
        password: 'admin123',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toContain('Admin authentication not configured');
  });

  it('should return 401 for invalid credentials', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'wrong@example.com',
        password: 'wrongpassword',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Invalid email or password');
  });

  it('should successfully login with valid credentials and create profile', async () => {
    mockFindFirst.mockResolvedValue(null);
    mockCreate.mockResolvedValue({
      id: 'profile-123',
      email: 'admin@example.com',
      role: 'admin',
    });

    const request = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'admin@example.com',
        password: 'admin123',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.user.email).toBe('admin@example.com');
    expect(data.user.role).toBe('admin');
    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        email: 'admin@example.com',
        role: 'admin',
      },
    });
    expect(mockSet).toHaveBeenCalledWith(
      'auth-token',
      expect.any(String),
      expect.objectContaining({
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
      })
    );
  });

  it('should successfully login with existing profile', async () => {
    mockFindFirst.mockResolvedValue({
      id: 'profile-123',
      email: 'admin@example.com',
      role: 'admin',
    });

    const request = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'admin@example.com',
        password: 'admin123',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('should update profile role to admin if not already admin', async () => {
    mockFindFirst.mockResolvedValue({
      id: 'profile-123',
      email: 'admin@example.com',
      role: 'user',
    });
    mockUpdate.mockResolvedValue({
      id: 'profile-123',
      email: 'admin@example.com',
      role: 'admin',
    });

    const request = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'admin@example.com',
        password: 'admin123',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.user.role).toBe('admin');
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'profile-123' },
      data: { role: 'admin' },
    });
  });

  it('should return 500 if JWT_SECRET is not set', async () => {
    delete process.env.JWT_SECRET;
    delete process.env.AUTH_SECRET;

    const request = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'admin@example.com',
        password: 'admin123',
      }),
    });

    await expect(POST(request)).rejects.toThrow('JWT_SECRET');
  });
});

