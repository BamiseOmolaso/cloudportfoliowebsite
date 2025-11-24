import { NextRequest, NextResponse } from 'next/server';
import { withRateLimit, adminLimiter } from './rate-limit';
import { withAuth } from './auth-middleware';
import { sanitizeHtmlServer } from './sanitize-server';

/**
 * Security headers for API responses
 */
export function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  return response;
}

/**
 * Check CSRF protection by verifying Origin/Referer headers
 */
export function verifyCSRF(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  const host = request.headers.get('host');
  
  // Allow same-origin requests
  if (!origin && !referer) {
    // Same-origin requests may not have these headers
    return true;
  }

  // Check if origin matches host
  if (origin) {
    try {
      const originUrl = new URL(origin);
      if (originUrl.host === host) {
        return true;
      }
    } catch {
      return false;
    }
  }

  // Check referer
  if (referer) {
    try {
      const refererUrl = new URL(referer);
      if (refererUrl.host === host) {
        return true;
      }
    } catch {
      return false;
    }
  }

  return false;
}

/**
 * Sanitize HTML content for storage
 */
export function sanitizeContent(content: string | null | undefined): string {
  if (!content || typeof content !== 'string') {
    return '';
  }
  return sanitizeHtmlServer(content);
}

/**
 * Generic error handler that doesn't leak information
 */
export function handleError(error: unknown, defaultMessage: string = 'An error occurred'): NextResponse {
  // Log detailed error server-side only
  console.error('API Error:', error);

  // Return generic error to client
  return NextResponse.json(
    { error: defaultMessage },
    { status: 500 }
  );
}

/**
 * Map Prisma errors to user-friendly messages
 */
export function mapPrismaError(error: unknown): { message: string; status: number } {
  // Log the actual error server-side
  console.error('Prisma Error:', error);

  // Type guard for Prisma error
  const prismaError = error as { code?: string; meta?: { target?: string[]; cause?: string } };
  
  // Return user-friendly messages
  switch (prismaError?.code) {
    case 'P2002':
      return { message: 'A record with this value already exists', status: 409 };
    case 'P2025':
      return { message: 'Record not found', status: 404 };
    case 'P2003':
      return { message: 'Invalid reference', status: 400 };
    case 'P2014':
      return { message: 'Invalid relationship', status: 400 };
    default:
      return { message: 'An error occurred', status: 500 };
  }
}

/**
 * Wrapper for admin routes with auth, rate limiting, and security headers
 */
export function secureAdminRoute(
  handler: (request: NextRequest, user: { id: string; email: string; role: string }, context?: unknown) => Promise<NextResponse>
) {
  return withRateLimit(
    adminLimiter,
    'admin-route',
    withAuth(async (request: NextRequest, user: { id: string; email: string; role: string }, context?: unknown) => {
      // Check CSRF for mutation methods
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
        if (!verifyCSRF(request)) {
          return NextResponse.json(
            { error: 'Invalid request origin' },
            { status: 403 }
          );
        }
      }

      const response = await handler(request, user, context);
      return addSecurityHeaders(response);
    })
  );
}

