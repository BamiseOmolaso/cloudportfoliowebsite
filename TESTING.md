# Testing Guide

This document describes the testing setup and how to write tests for this Next.js application.

---

## Testing Framework

We use:
- **Jest** - Test runner and assertion library
- **React Testing Library** - React component testing utilities
- **@testing-library/jest-dom** - Custom Jest matchers for DOM testing
- **@testing-library/user-event** - User interaction simulation

---

## Running Tests

### Run all tests
```bash
npm test
```

### Run tests in watch mode (for development)
```bash
npm run test:watch
```

### Run tests with coverage report
```bash
npm run test:coverage
```

### Run a specific test file
```bash
npm test -- src/__tests__/example.test.ts
```

### Run tests matching a pattern
```bash
npm test -- --testNamePattern="should handle"
```

---

## Test File Structure

### Naming Convention
- Test files should be named: `*.test.ts` or `*.test.tsx`
- Or placed in `__tests__` directories: `__tests__/*.ts` or `__tests__/*.tsx`
- Example: `src/lib/sanitize.test.ts` or `src/__tests__/sanitize.test.ts`

### Directory Structure
```
src/
├── __tests__/              # Test files
│   ├── lib/                # Tests for lib utilities
│   ├── components/         # Tests for components
│   └── app/                # Tests for app routes
├── lib/
│   └── sanitize.ts
└── components/
    └── ContactForm.tsx
```

---

## Writing Tests

### Basic Test Example

```typescript
import { describe, it, expect } from '@jest/globals';

describe('MyFunction', () => {
  it('should return expected value', () => {
    const result = myFunction('input');
    expect(result).toBe('expected');
  });
});
```

### React Component Test Example

```typescript
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import ContactForm from '@/components/ContactForm';

describe('ContactForm', () => {
  it('should render form fields', () => {
    render(<ContactForm />);
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  });

  it('should submit form with valid data', async () => {
    const user = userEvent.setup();
    render(<ContactForm />);
    
    await user.type(screen.getByLabelText(/name/i), 'John Doe');
    await user.type(screen.getByLabelText(/email/i), 'john@example.com');
    await user.click(screen.getByRole('button', { name: /submit/i }));
    
    // Assert expected behavior
  });
});
```

### API Route Test Example

```typescript
import { POST } from '@/app/api/contact/route';
import { NextRequest } from 'next/server';

describe('POST /api/contact', () => {
  it('should return 200 for valid request', async () => {
    const request = new NextRequest('http://localhost:3000/api/contact', {
      method: 'POST',
      body: JSON.stringify({
        name: 'John Doe',
        email: 'john@example.com',
        message: 'Test message',
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
  });
});
```

---

## Testing Utilities

### Custom Render Function

Use `src/test-utils/test-utils.tsx` for custom render function with providers:

```typescript
import { render, screen } from '@/test-utils/test-utils';
import MyComponent from '@/components/MyComponent';

it('renders with providers', () => {
  render(<MyComponent />);
  // Test your component
});
```

---

## Mocking

### Mock Next.js Router

The router is already mocked in `jest.setup.js`. If you need custom mocks:

```typescript
import { useRouter } from 'next/navigation';

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
  })),
}));
```

### Mock Prisma Client

```typescript
import { PrismaClient } from '@prisma/client';

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => ({
    blogPost: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  })),
}));
```

### Mock External APIs

```typescript
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ data: 'mock data' }),
  })
) as jest.Mock;
```

---

## Coverage Requirements

Target coverage thresholds (configured in `jest.config.js`):
- **Branches:** 70%
- **Functions:** 70%
- **Lines:** 70%
- **Statements:** 70%

View coverage report:
```bash
npm run test:coverage
```

Coverage reports are generated in `coverage/` directory.

---

## Best Practices

### 1. Test Behavior, Not Implementation
✅ **Good:**
```typescript
it('should display error message when email is invalid', () => {
  render(<ContactForm />);
  // Test what user sees
});
```

❌ **Bad:**
```typescript
it('should call validateEmail function', () => {
  // Testing implementation details
});
```

### 2. Use Accessible Queries
Prefer queries that reflect how users interact:
1. `getByRole` - Most accessible
2. `getByLabelText` - For form inputs
3. `getByText` - For visible text
4. `getByTestId` - Last resort

### 3. Test User Interactions
Use `@testing-library/user-event` for realistic interactions:

```typescript
import { userEvent } from '@testing-library/user-event';

const user = userEvent.setup();
await user.click(button);
await user.type(input, 'text');
```

### 4. Clean Up After Tests
Jest automatically cleans up, but if you need manual cleanup:

```typescript
afterEach(() => {
  jest.clearAllMocks();
});
```

### 5. Use Descriptive Test Names
✅ **Good:**
```typescript
it('should return 400 when email is missing', () => {});
```

❌ **Bad:**
```typescript
it('test email', () => {});
```

---

## Testing Different Types of Code

### Utility Functions
Test pure functions with various inputs:

```typescript
import { sanitizeEmail } from '@/lib/sanitize-text';

describe('sanitizeEmail', () => {
  it('should trim whitespace', () => {
    expect(sanitizeEmail('  test@example.com  ')).toBe('test@example.com');
  });

  it('should convert to lowercase', () => {
    expect(sanitizeEmail('TEST@EXAMPLE.COM')).toBe('test@example.com');
  });
});
```

### API Routes
Test request/response handling:

```typescript
import { POST } from '@/app/api/contact/route';
import { NextRequest } from 'next/server';

describe('POST /api/contact', () => {
  it('should validate input', async () => {
    const request = new NextRequest('http://localhost:3000/api/contact', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });
});
```

### React Components
Test rendering and user interactions:

```typescript
import { render, screen } from '@testing-library/react';
import ContactForm from '@/components/ContactForm';

describe('ContactForm', () => {
  it('should render all form fields', () => {
    render(<ContactForm />);
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/message/i)).toBeInTheDocument();
  });
});
```

---

## Common Issues and Solutions

### Issue: "Cannot find module" errors
**Solution:** Check `jest.config.js` moduleNameMapper for path aliases.

### Issue: "window is not defined"
**Solution:** Ensure `jest-environment-jsdom` is set in `jest.config.js`.

### Issue: "SyntaxError: Unexpected token"
**Solution:** Ensure TypeScript files are properly configured in Jest.

### Issue: Tests timing out
**Solution:** Increase timeout or check for async operations not being awaited.

---

## Continuous Integration

Tests run automatically in CI/CD pipeline. Ensure all tests pass before merging PRs.

---

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/react)
- [Testing Library Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

---

**Last Updated:** November 24, 2025

