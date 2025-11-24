import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import * as jwt from 'jsonwebtoken';
import { db } from './db';

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET || process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET or AUTH_SECRET environment variable must be set and be at least 32 characters long');
  }
  return secret;
}

export interface AuthResult {
  authenticated: boolean;
  user?: {
    id: string;
    email: string;
    role: string;
  };
  error?: string;
}

/**
 * Verify JWT token and check if user is authenticated as admin
 * @param request Next.js request object
 * @returns AuthResult with authentication status and user info
 */
export async function requireAuth(request: NextRequest): Promise<AuthResult> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return { authenticated: false, error: 'No authentication token provided' };
    }

    // Verify JWT token
    let decoded: any;
    try {
      decoded = jwt.verify(token, getJwtSecret());
    } catch (jwtError) {
      return { authenticated: false, error: 'Invalid or expired token' };
    }

    // Check user in database
    const profile = await db.profile.findFirst({
      where: { email: decoded.email },
      select: {
        id: true,
        email: true,
        role: true,
      },
    });

    if (!profile) {
      return { authenticated: false, error: 'User not found' };
    }

    // Verify admin role
    if (profile.role !== 'admin') {
      return { authenticated: false, error: 'Insufficient permissions' };
    }

    return {
      authenticated: true,
      user: {
        id: profile.id,
        email: profile.email,
        role: profile.role,
      },
    };
  } catch (error) {
    console.error('Authentication error:', error);
    return { authenticated: false, error: 'Authentication failed' };
  }
}

/**
 * Wrapper for admin API routes that require authentication
 * @param handler The route handler function
 * @returns Wrapped handler with authentication check
 */
export function withAuth(
  handler: (request: NextRequest, user: { id: string; email: string; role: string }) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const authResult = await requireAuth(request);

    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json(
        { error: authResult.error || 'Authentication required' },
        { status: 401 }
      );
    }

    return handler(request, authResult.user);
  };
}

