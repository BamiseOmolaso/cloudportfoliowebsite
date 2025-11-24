# Unresolved Issues Report

**Date:** November 24, 2025  
**Purpose:** List of all issues that need to be resolved before final production deployment

---

## Summary

- **Total Issues:** 35+
- **Critical:** 0
- **High Priority:** 21 (test failures)
- **Medium Priority:** 12 (console.log statements)
- **Low Priority:** 2+ (ESLint warnings, TypeScript issues)

---

## 1. Test Failures (21 tests)

### Status: ⚠️ HIGH PRIORITY
**Impact:** 21 out of 124 tests are failing (17% failure rate)  
**Pass Rate:** 83% (103/124 passing)

### Failed Test Files (Actual Status)

#### 1.1 Unit Tests

**File:** `src/__tests__/lib/security.test.ts`
- **Status:** FAILING
- **Issue:** Prisma mocking complexity
- **Root Cause:** Database operations not properly mocked
- **Details:**
  - `db.blacklistedIp` operations need better mocking
  - `db.failedAttempt` operations need mocking
  - Complex Prisma query mocking required

**File:** `src/__tests__/lib/rate-limit.test.ts`
- **Status:** FAILING
- **Issue:** Redis mocking issues
- **Root Cause:** Upstash Redis client not properly mocked
- **Details:**
  - Redis connection mocking
  - Rate limiter logic testing
  - Need better Redis mock setup

#### 1.2 API Integration Tests

**File:** `src/__tests__/api/contact.test.ts`
- **Status:** FAILING (not shown in recent run, but likely still failing)
- **Issue:** Tests failing due to rate limiting and mocking complexity
- **Root Cause:** Rate limiter (Redis) mocking not properly configured
- **Details:** 
  - Rate limiter requires Redis connection
  - Mock setup for `withRateLimit` wrapper is complex
  - Need to mock Upstash Redis client properly

**File:** `src/__tests__/api/newsletter-subscribe.test.ts`
- **Status:** FAILING (not shown in recent run, but likely still failing)
- **Issue:** Tests failing due to rate limiting and CAPTCHA verification
- **Root Cause:** Similar to contact tests - Redis mocking issues
- **Details:**
  - `isCaptchaRequired` function requires database access
  - Rate limiting middleware not properly mocked
  - Need to mock Prisma database calls and Redis

**File:** `src/__tests__/api/auth-login.test.ts`
- **Status:** FAILING (not shown in recent run, but likely still failing)
- **Issue:** Tests failing due to rate limiting and JWT mocking
- **Root Cause:** Rate limiter and JWT secret validation
- **Details:**
  - Admin limiter requires Redis
  - JWT secret validation in environment
  - Need proper mock setup for authentication flow

#### 1.3 Component Tests

**File:** `src/__tests__/components/ContactForm.test.tsx`
- **Status:** FAILING
- **Issue:** Multiple tests failing - redirect timing and error handling
- **Root Cause:** Fake timers and router.push() timing
- **Details:**
  - `jest.advanceTimersByTime(2000)` not triggering redirect
  - `mockPush` not being called as expected
  - Error message matching issues
  - Need to adjust timing or use real timers

**File:** `src/__tests__/components/Newsletter.test.tsx`
- **Status:** FAILING
- **Issue:** Multiple tests failing
- **Root Causes:**
  - CAPTCHA mocking issues
  - Redirect timing issues (similar to ContactForm)
  - Error message matching issues
  - Network error handling
- **Details:**
  - ReCAPTCHA component mocking needs refinement
  - Error message text doesn't match expected patterns
  - Status state transitions not properly tested

**File:** `src/__tests__/components/BlogPostPage.test.tsx`
- **Status:** FAILING
- **Issue:** Server component testing complexity
- **Root Cause:** Server components are harder to test with current setup
- **Details:**
  - `getBlogPost` function requires database mocking
  - Server component rendering in test environment
  - `notFound()` function mocking needs improvement

### Recommended Fixes

1. **Improve Redis Mocking:**
   ```typescript
   // Need better mock for Upstash Redis
   jest.mock('@upstash/redis', () => ({
     Redis: jest.fn(() => ({
       get: jest.fn(),
       set: jest.fn(),
       // ... other methods
     })),
   }));
   ```

2. **Fix Timing Issues:**
   - Use `waitFor` with proper timeouts
   - Consider using real timers for redirect tests
   - Adjust test expectations for async operations

3. **Improve Error Message Matching:**
   - Use more flexible regex patterns
   - Check for partial matches instead of exact matches
   - Handle different error message formats

4. **Better Prisma Mocking:**
   - Create a more comprehensive Prisma mock
   - Mock all database operations consistently
   - Handle edge cases in database responses

---

## 2. Console.log/Error Statements (20+ instances)

### Status: ⚠️ MEDIUM PRIORITY
**Impact:** Console.logs/errors in production code should be removed or replaced with proper logging

### Files with console.log/error (Actual Count: 20+)

1. **`src/components/CookieConsent.tsx`** (3 instances)
   - `console.error('Error parsing cookie preferences:', e);`
   - `console.log('Analytics cookies initialized');`
   - `console.log('Marketing cookies initialized');`
   - **Action:** Replace with proper logging service

2. **`src/components/ErrorBoundary.tsx`** (1 instance)
   - `console.error('ErrorBoundary caught an error:', error, errorInfo);`
   - **Action:** Replace with error tracking service (e.g., Sentry)

3. **`src/app/components/PerformanceMonitor.tsx`** (2 instances)
   - `console.error('Error tracking LCP:', errorMessage);`
   - `console.error('Error tracking performance:', errorMessage);`
   - **Action:** Replace with proper logging

4. **`src/app/components/Editor.tsx`** (2 instances)
   - `console.error('Error adding image:', err);`
   - `console.error('Error adding link:', err);`
   - **Action:** Replace with proper error handling

5. **`src/app/unsubscribe/page.tsx`** (2 instances)
   - `console.error('Error fetching subscriber data:', error);`
   - `console.error('Error processing unsubscribe:', error);`
   - **Action:** Replace with proper logging

6. **`src/app/admin/newsletters/[action]/[id]/page.tsx`** (2 instances)
   - `console.error('Error fetching newsletter:', err);`
   - `console.error('Error saving newsletter:', err);`
   - **Action:** Replace with proper logging

7. **`src/app/admin/newsletters/edit/[id]/page.tsx`** (2 instances)
   - `console.error(error);` (2x)
   - **Action:** Replace with proper error logging

8. **`src/app/admin/newsletters/create/page.tsx`** (1 instance)
   - `console.error('Error creating newsletter:', error);`
   - **Action:** Replace with proper logging

9. **`src/app/admin/newsletters/page.tsx`** (1 instance)
   - `console.error('Error fetching newsletters:', error);`
   - **Action:** Replace with proper logging

10. **`src/app/admin/newsletters/new/page.tsx`** (1 instance)
    - `console.error(error);`
    - **Action:** Replace with proper error logging

11. **`src/app/admin/performance/website/page.tsx`** (1 instance)
    - `console.error(error);`
    - **Action:** Replace with proper logging

12. **`src/app/admin/performance/page.tsx`** (1 instance)
    - `console.error(error);`
    - **Action:** Replace with proper logging

**Note:** Additional console.log/error statements may exist in API routes that were not caught in the initial scan.

### Recommended Fixes

1. **Create a Logging Utility:**
   ```typescript
   // src/lib/logger.ts
   export const logger = {
     info: (message: string, ...args: unknown[]) => {
       if (process.env.NODE_ENV === 'development') {
         console.log(message, ...args);
       }
       // In production, send to logging service
     },
     error: (message: string, error?: Error) => {
       if (process.env.NODE_ENV === 'development') {
         console.error(message, error);
       }
       // In production, send to error tracking service
     },
   };
   ```

2. **Replace all console.log with logger:**
   ```typescript
   // Before
   console.log('Error:', error);
   
   // After
   logger.error('Error processing request', error);
   ```

3. **Remove client-side console.logs:**
   - Remove from `CookieConsent.tsx`
   - Use proper error handling instead

---

## 3. ESLint Warnings/Errors

### Status: ⚠️ LOW PRIORITY
**Impact:** Code quality warnings that should be addressed

### Common Issues

1. **Unused Variables/Imports**
   - Some files may have unused imports
   - **Action:** Run `npm run lint -- --fix` to auto-fix

2. **TypeScript ESLint Warnings**
   - Some `any` types may still exist
   - **Action:** Replace with proper types

3. **React Hooks Warnings**
   - Dependency array issues
   - **Action:** Review and fix dependency arrays

### To Check

Run:
```bash
npm run lint
```

Review output and fix warnings.

---

## 4. TypeScript Type Check Issues

### Status: ⚠️ LOW PRIORITY
**Impact:** Some type errors may exist

### To Check

Run:
```bash
npm run type-check
```

### Common Issues

1. **Type Assertions**
   - Some `as` assertions may be unsafe
   - **Action:** Use proper type guards

2. **Optional Chaining**
   - Some properties may need optional chaining
   - **Action:** Add `?` where needed

3. **Null Checks**
   - Some values may be null/undefined
   - **Action:** Add proper null checks

---

## 5. Test Coverage Gaps

### Status: ⚠️ MEDIUM PRIORITY
**Current Coverage:** ~83% pass rate, but coverage may be lower

### Areas Needing More Tests

1. **Error Handling Paths**
   - Test error scenarios more thoroughly
   - Test network failures
   - Test database errors

2. **Edge Cases**
   - Test boundary conditions
   - Test invalid inputs
   - Test empty states

3. **Integration Tests**
   - More comprehensive API integration tests
   - Test full user flows
   - Test error recovery

### Recommended Actions

1. Run coverage report:
   ```bash
   npm run test:coverage
   ```

2. Identify files with low coverage

3. Add tests for uncovered code paths

---

## 6. Performance Optimizations

### Status: ℹ️ OPTIONAL
**Impact:** Performance improvements that could be made

### Potential Issues

1. **Bundle Size**
   - Current: 220K (good, but could be optimized)
   - **Action:** Analyze bundle and remove unused code

2. **Image Optimization**
   - Ensure all images use Next.js Image component
   - **Action:** Audit image usage

3. **Database Queries**
   - Check for N+1 query problems
   - **Action:** Review Prisma queries

4. **Caching**
   - Review caching strategies
   - **Action:** Optimize cache headers

---

## 7. Security Considerations

### Status: ✅ MOSTLY RESOLVED
**Impact:** Minor improvements possible

### Remaining Items

1. **Error Messages**
   - Ensure no sensitive data in error messages
   - **Action:** Review all error responses

2. **Rate Limiting**
   - Verify all endpoints have appropriate limits
   - **Action:** Review rate limit configuration

3. **Input Validation**
   - Ensure all inputs are validated
   - **Action:** Audit all API routes

---

## Priority Action Items

### High Priority (Fix Before Production)

1. ✅ **Fix Test Failures** (21 tests)
   - Improve Redis mocking
   - Fix timing issues in component tests
   - Better error message matching

2. ✅ **Remove Console.logs** (12 instances)
   - Create logging utility
   - Replace all console.log statements
   - Remove client-side console.logs

### Medium Priority (Fix Soon)

3. ⚠️ **Improve Test Coverage**
   - Add tests for error paths
   - Test edge cases
   - Improve integration test coverage

4. ⚠️ **Address ESLint Warnings**
   - Fix unused imports
   - Resolve TypeScript warnings
   - Clean up code

### Low Priority (Nice to Have)

5. ℹ️ **TypeScript Improvements**
   - Fix type assertions
   - Improve type safety
   - Add more type guards

6. ℹ️ **Performance Optimizations**
   - Bundle size optimization
   - Query optimization
   - Caching improvements

---

## Detailed Test Failure Analysis

### Contact Form API Tests

**File:** `src/__tests__/api/contact.test.ts`

**Issues:**
- Rate limiter not properly mocked
- Redis connection required but not available in tests
- `withRateLimit` wrapper needs better mocking

**Fix Required:**
```typescript
// Need to mock rate limiter properly
jest.mock('@/lib/rate-limit', () => ({
  withRateLimit: jest.fn((limiter, key, handler) => handler),
  contactFormLimiter: {
    limit: jest.fn().mockResolvedValue({ success: true }),
  },
}));
```

### Newsletter Subscribe Tests

**File:** `src/__tests__/api/newsletter-subscribe.test.ts`

**Issues:**
- Similar rate limiting issues
- CAPTCHA verification mocking
- Database operations need better mocking

**Fix Required:**
- Mock `isCaptchaRequired` function
- Mock Prisma database operations
- Mock Redis for rate limiting

### Auth Login Tests

**File:** `src/__tests__/api/auth-login.test.ts`

**Issues:**
- Admin limiter requires Redis
- JWT secret validation
- Environment variable mocking

**Fix Required:**
- Mock environment variables
- Mock JWT functions
- Mock rate limiter

### Component Tests

**File:** `src/__tests__/components/ContactForm.test.tsx`

**Issue:** Redirect timing
- `jest.advanceTimersByTime(2000)` not working as expected
- Router.push() not being called

**Fix Required:**
```typescript
// Use waitFor with longer timeout
await waitFor(() => {
  expect(mockPush).toHaveBeenCalledWith('/');
}, { timeout: 3000 });
```

**File:** `src/__tests__/components/Newsletter.test.tsx`

**Issues:**
- Multiple test failures
- CAPTCHA mocking
- Error message matching
- Status transitions

**Fix Required:**
- Improve ReCAPTCHA mock
- Use more flexible error message matching
- Better state transition testing

---

## Console.log/Error Locations

To find all console.log/error statements:

```bash
grep -r "console\.log\|console\.error" src --include="*.ts" --include="*.tsx" | grep -v test | grep -v __tests__ | grep -v node_modules
```

**Files to fix (20+ instances):**
1. `src/components/CookieConsent.tsx` (3 instances)
2. `src/components/ErrorBoundary.tsx` (1 instance)
3. `src/app/components/PerformanceMonitor.tsx` (2 instances)
4. `src/app/components/Editor.tsx` (2 instances)
5. `src/app/unsubscribe/page.tsx` (2 instances)
6. `src/app/admin/newsletters/[action]/[id]/page.tsx` (2 instances)
7. `src/app/admin/newsletters/edit/[id]/page.tsx` (2 instances)
8. `src/app/admin/newsletters/create/page.tsx` (1 instance)
9. `src/app/admin/newsletters/page.tsx` (1 instance)
10. `src/app/admin/newsletters/new/page.tsx` (1 instance)
11. `src/app/admin/performance/website/page.tsx` (1 instance)
12. `src/app/admin/performance/page.tsx` (1 instance)
13. Additional files in API routes (check with grep command above)

---

## Recommended Next Steps

1. **Create a logging utility** (`src/lib/logger.ts`)
2. **Replace all console.log statements** with logger
3. **Improve test mocking** for Redis and Prisma
4. **Fix timing issues** in component tests
5. **Run full test suite** and fix remaining failures
6. **Run ESLint** and fix all warnings
7. **Run type-check** and fix type errors
8. **Review and optimize** bundle size

---

## Testing Commands

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- src/__tests__/api/contact.test.ts

# Run linting
npm run lint

# Run type checking
npm run type-check

# Run pre-deployment checks
npm run predeploy
```

---

## Files to Review

### Test Files Needing Fixes
- `src/__tests__/api/contact.test.ts`
- `src/__tests__/api/newsletter-subscribe.test.ts`
- `src/__tests__/api/auth-login.test.ts`
- `src/__tests__/components/ContactForm.test.tsx`
- `src/__tests__/components/Newsletter.test.tsx`
- `src/__tests__/components/BlogPostPage.test.tsx`

### Source Files with Console.logs
- `src/app/api/admin/newsletters/[id]/route.ts`
- `src/app/api/admin/projects/[id]/route.ts`
- `src/app/api/admin/blog/[id]/route.ts`
- `src/app/api/admin/blog/route.ts`
- `src/app/api/admin/newsletters/route.ts`
- `src/app/api/subscribers/export/route.ts`
- `src/components/CookieConsent.tsx`

---

**Report Generated:** November 24, 2025  
**Next Review:** After fixes are applied

