# API Security Audit Report
**Date:** November 24, 2025  
**Task:** 3.1 - API Security Audit  
**Scope:** All API routes in `src/app/api/`

---

## Executive Summary

**Critical Issues Found:** 1  
**High Issues Found:** 5  
**Medium Issues Found:** 8  
**Low Issues Found:** 3  

**Overall Security Status:** ⚠️ **NEEDS IMMEDIATE ATTENTION**

---

## Critical Security Vulnerabilities

### 🔴 CRITICAL: Admin Routes Completely Unprotected

**Affected Routes:**
- `/api/admin/blog` (GET, POST)
- `/api/admin/blog/[id]` (GET, PUT, DELETE, PATCH)
- `/api/admin/projects/[id]` (GET, PUT, DELETE, PATCH)
- `/api/admin/newsletters` (GET, POST)
- `/api/admin/newsletters/[id]` (GET, PUT)
- `/api/admin/subscribers` (GET)
- `/api/admin/performance/website` (GET)

**Issue:** All admin routes have **ZERO authentication checks**. Anyone who knows the URL can:
- View all blog posts, projects, newsletters, subscribers
- Create, edit, delete blog posts and projects
- Access subscriber email addresses
- View performance metrics
- Send newsletters

**Risk Level:** 🔴 **CRITICAL**

**Impact:**
- Complete data breach potential
- Unauthorized content modification
- Privacy violation (subscriber emails exposed)
- Potential for data deletion

**Remediation:**
1. Create authentication middleware function
2. Verify JWT token from `auth-token` cookie
3. Check user role is 'admin'
4. Apply to all `/api/admin/*` routes
5. Return 401 if authentication fails

**Example Fix:**
```typescript
// src/lib/auth-middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import * as jwt from 'jsonwebtoken';
import { db } from './db';

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET || process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET must be set');
  }
  return secret;
}

export async function requireAuth(request: NextRequest): Promise<{ authenticated: boolean; user?: any; error?: string }> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return { authenticated: false, error: 'No authentication token' };
    }

    const decoded = jwt.verify(token, getJwtSecret()) as any;
    const profile = await db.profile.findFirst({
      where: { email: decoded.email },
    });

    if (!profile || profile.role !== 'admin') {
      return { authenticated: false, error: 'Unauthorized' };
    }

    return { authenticated: true, user: profile };
  } catch (error) {
    return { authenticated: false, error: 'Invalid token' };
  }
}
```

---

## High Severity Issues

### 🟠 HIGH: Missing Input Validation with Zod

**Affected Routes:**
- `/api/admin/blog` (POST) - No schema validation
- `/api/admin/blog/[id]` (PUT, PATCH) - No schema validation
- `/api/admin/projects/[id]` (PUT, PATCH) - No schema validation
- `/api/admin/newsletters` (POST) - Basic validation only
- `/api/newsletters/send` (POST) - No validation for newsletterId

**Issue:** Routes accept arbitrary JSON without proper schema validation. This allows:
- Invalid data types
- Missing required fields
- Injection of unexpected fields
- Type confusion attacks

**Risk Level:** 🟠 **HIGH**

**Remediation:**
- Install/use Zod for all input validation
- Create schemas for each route's expected input
- Validate before processing
- Return 400 with clear error messages

**Example:**
```typescript
import { z } from 'zod';

const blogPostSchema = z.object({
  title: z.string().min(1).max(200),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  content: z.string().min(1),
  excerpt: z.string().max(500).optional(),
  status: z.enum(['draft', 'published', 'scheduled']),
  // ... etc
});
```

---

### 🟠 HIGH: No Rate Limiting on Admin Routes

**Affected Routes:** All `/api/admin/*` routes

**Issue:** Admin routes have no rate limiting, allowing:
- Brute force attacks
- DoS attacks
- Automated scraping
- Unrestricted API abuse

**Risk Level:** 🟠 **HIGH**

**Remediation:**
- Apply rate limiting to all admin routes
- Use existing `withRateLimit` wrapper
- Set stricter limits for admin routes (e.g., 50 requests/hour)

---

### 🟠 HIGH: Error Messages Leak Information

**Affected Routes:**
- `/api/admin/blog/[id]` - Returns detailed Prisma error codes
- `/api/admin/projects/[id]` - Returns P2025, P2002 error codes
- Multiple routes return full error messages

**Issue:** Error messages expose:
- Database structure (Prisma error codes)
- Internal implementation details
- Stack traces in some cases

**Risk Level:** 🟠 **HIGH**

**Remediation:**
- Return generic error messages to clients
- Log detailed errors server-side only
- Map Prisma errors to user-friendly messages
- Never expose stack traces

**Example:**
```typescript
catch (error: any) {
  console.error('Detailed error:', error); // Server-side only
  if (error.code === 'P2025') {
    return NextResponse.json({ error: 'Resource not found' }, { status: 404 });
  }
  return NextResponse.json({ error: 'An error occurred' }, { status: 500 });
}
```

---

### 🟠 HIGH: Missing CSRF Protection

**Affected Routes:** All mutation routes (POST, PUT, DELETE, PATCH)

**Issue:** No CSRF token validation, allowing:
- Cross-site request forgery attacks
- Unauthorized actions from malicious sites
- Session hijacking exploitation

**Risk Level:** 🟠 **HIGH**

**Remediation:**
- Implement CSRF token validation
- Use Next.js built-in CSRF protection
- Verify Origin/Referer headers
- Use SameSite cookie attributes (already done for auth)

---

### 🟠 HIGH: No Authorization Checks (Beyond Authentication)

**Issue:** Even if authentication is added, there's no:
- Role-based access control
- Resource ownership verification
- Permission checks for specific actions

**Risk Level:** 🟠 **HIGH**

**Remediation:**
- Verify user has 'admin' role (after auth is fixed)
- Check resource ownership if multi-user system
- Implement action-based permissions

---

## Medium Severity Issues

### 🟡 MEDIUM: Inconsistent Input Sanitization

**Affected Routes:**
- `/api/admin/blog` - No HTML sanitization on content
- `/api/admin/projects` - No sanitization
- `/api/admin/newsletters` - No sanitization

**Issue:** Admin routes don't sanitize HTML content, allowing:
- XSS in stored content
- Malicious script injection
- HTML injection attacks

**Risk Level:** 🟡 **MEDIUM**

**Remediation:**
- Sanitize all HTML content before storage
- Use `sanitizeHtmlServer` for server-side content
- Validate and sanitize on both input and output

---

### 🟡 MEDIUM: Missing Request Size Limits

**Issue:** No limits on request body size, allowing:
- DoS via large payloads
- Memory exhaustion
- Slow request processing

**Risk Level:** 🟡 **MEDIUM**

**Remediation:**
- Set max body size limits
- Use Next.js body size limits
- Reject oversized requests early

---

### 🟡 MEDIUM: No Request Method Validation

**Affected Routes:** Most routes don't explicitly validate allowed methods

**Issue:** Routes may accept unintended HTTP methods

**Risk Level:** 🟡 **MEDIUM**

**Remediation:**
- Explicitly define allowed methods
- Return 405 for unsupported methods
- Use Next.js route handlers properly

---

### 🟡 MEDIUM: Missing Content-Type Validation

**Issue:** Routes accept JSON without verifying Content-Type header

**Risk Level:** 🟡 **MEDIUM**

**Remediation:**
- Verify `Content-Type: application/json`
- Reject requests with wrong content type
- Return 415 for unsupported types

---

### 🟡 MEDIUM: Insecure Direct Object References

**Affected Routes:**
- `/api/admin/blog/[id]`
- `/api/admin/projects/[id]`
- `/api/admin/newsletters/[id]`

**Issue:** IDs are exposed in URLs without additional verification

**Risk Level:** 🟡 **MEDIUM** (becomes HIGH if multi-user)

**Remediation:**
- Verify resource ownership
- Use UUIDs instead of sequential IDs
- Add resource-level access checks

---

### 🟡 MEDIUM: Missing Response Headers

**Issue:** Routes don't set security headers:
- No `X-Content-Type-Options: nosniff`
- No `X-Frame-Options: DENY`
- No `X-XSS-Protection: 1; mode=block`
- No `Content-Security-Policy`

**Risk Level:** 🟡 **MEDIUM**

**Remediation:**
- Add security headers to all responses
- Use Next.js middleware for global headers
- Configure CSP appropriately

---

### 🟡 MEDIUM: No Request Logging/Audit Trail

**Issue:** Admin actions aren't logged for audit purposes

**Risk Level:** 🟡 **MEDIUM**

**Remediation:**
- Log all admin actions
- Include user, action, resource, timestamp
- Store in audit log table

---

### 🟡 MEDIUM: Missing CORS Configuration

**Issue:** No explicit CORS headers, relying on defaults

**Risk Level:** 🟡 **MEDIUM**

**Remediation:**
- Explicitly set CORS headers
- Restrict to known origins
- Use Next.js CORS configuration

---

## Low Severity Issues

### 🟢 LOW: Console.error in Production

**Issue:** 39 instances of `console.error` across API routes

**Risk Level:** 🟢 **LOW**

**Remediation:**
- Use proper logging library (e.g., Winston, Pino)
- Remove console statements in production
- Implement structured logging

---

### 🟢 LOW: Missing Request Timeout

**Issue:** No explicit timeout for long-running operations

**Risk Level:** 🟢 **LOW**

**Remediation:**
- Set request timeouts
- Use AbortController for cancellable operations

---

### 🟢 LOW: Inconsistent Error Response Format

**Issue:** Error responses have inconsistent structure

**Risk Level:** 🟢 **LOW**

**Remediation:**
- Standardize error response format
- Use consistent status codes
- Include error codes for client handling

---

## Security Checklist by Route

### Public Routes (Should have rate limiting)

| Route | Auth | Rate Limit | Input Validation | Sanitization | Status |
|-------|------|------------|------------------|--------------|--------|
| `/api/contact` | ❌ | ✅ | ✅ | ✅ | ✅ Good |
| `/api/newsletter/subscribe` | ❌ | ✅ | ✅ | ✅ | ✅ Good |
| `/api/newsletter/unsubscribe` | ❌ | ❌ | ⚠️ Partial | ❌ | ⚠️ Needs work |
| `/api/newsletter/preferences` | ❌ | ❌ | ⚠️ Partial | ❌ | ⚠️ Needs work |
| `/api/blog` | ❌ | ❌ | ❌ | ❌ | ⚠️ Read-only, OK |
| `/api/blog/[slug]` | ❌ | ❌ | ❌ | ❌ | ⚠️ Read-only, OK |
| `/api/projects` | ❌ | ❌ | ❌ | ❌ | ⚠️ Read-only, OK |
| `/api/projects/[slug]` | ❌ | ❌ | ❌ | ❌ | ⚠️ Read-only, OK |
| `/api/performance` | ❌ | ❌ | ⚠️ Partial | ❌ | ⚠️ Needs validation |
| `/api/performance/lcp` | ❌ | ❌ | ⚠️ Partial | ❌ | ⚠️ Needs validation |
| `/api/newsletters/send` | ❌ | ✅ | ⚠️ Partial | ✅ | ⚠️ Needs validation |

### Admin Routes (Should have authentication)

| Route | Auth | Rate Limit | Input Validation | Sanitization | Status |
|-------|------|------------|------------------|--------------|--------|
| `/api/admin/blog` | 🔴 **NONE** | ❌ | ⚠️ Basic | ❌ | 🔴 **CRITICAL** |
| `/api/admin/blog/[id]` | 🔴 **NONE** | ❌ | ⚠️ Basic | ❌ | 🔴 **CRITICAL** |
| `/api/admin/projects/[id]` | 🔴 **NONE** | ❌ | ⚠️ Basic | ❌ | 🔴 **CRITICAL** |
| `/api/admin/newsletters` | 🔴 **NONE** | ❌ | ⚠️ Basic | ❌ | 🔴 **CRITICAL** |
| `/api/admin/newsletters/[id]` | 🔴 **NONE** | ❌ | ⚠️ Basic | ❌ | 🔴 **CRITICAL** |
| `/api/admin/subscribers` | 🔴 **NONE** | ❌ | ❌ | ❌ | 🔴 **CRITICAL** |
| `/api/admin/performance/website` | 🔴 **NONE** | ❌ | ❌ | ❌ | 🔴 **CRITICAL** |
| `/api/subscribers/export` | 🔴 **NONE** | ❌ | ❌ | ❌ | 🔴 **CRITICAL** |

### Auth Routes

| Route | Auth | Rate Limit | Input Validation | Status |
|-------|------|------------|------------------|--------|
| `/api/auth/login` | N/A | ❌ | ⚠️ Basic | ⚠️ Needs rate limiting |

---

## Recommendations Priority

### Immediate (Before Production)

1. **🔴 CRITICAL: Add authentication to all admin routes**
   - Create auth middleware
   - Apply to all `/api/admin/*` routes
   - Test thoroughly

2. **🟠 HIGH: Add input validation with Zod**
   - Create schemas for all routes
   - Validate all inputs
   - Return clear error messages

3. **🟠 HIGH: Add rate limiting to admin routes**
   - Apply stricter limits
   - Monitor for abuse

4. **🟠 HIGH: Fix error message leakage**
   - Generic messages to clients
   - Detailed logging server-side only

### Short Term (Within 1-2 Weeks)

5. **🟠 HIGH: Implement CSRF protection**
6. **🟡 MEDIUM: Add HTML sanitization to admin routes**
7. **🟡 MEDIUM: Add security headers**
8. **🟡 MEDIUM: Implement audit logging**

### Long Term (Within 1 Month)

9. **🟡 MEDIUM: Request size limits**
10. **🟡 MEDIUM: CORS configuration**
11. **🟢 LOW: Replace console.error with proper logging**
12. **🟢 LOW: Standardize error responses**

---

## Positive Findings

✅ **Good Practices Found:**
- Contact form has rate limiting and sanitization
- Newsletter subscribe has rate limiting, IP blacklisting, and CAPTCHA
- Some routes use Prisma (prevents SQL injection)
- JWT tokens use HTTP-only cookies
- Some input sanitization exists

---

## Next Steps

1. Review this report
2. Prioritize critical fixes
3. Implement authentication middleware
4. Add input validation
5. Fix error handling
6. Re-audit after fixes

---

**Report Generated:** November 24, 2025  
**Auditor:** Automated Security Scan  
**Next Review:** After critical fixes implemented

