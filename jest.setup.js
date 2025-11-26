// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

// Mock Next.js Request/Response for server-side tests
// Note: We use the actual Request class if available (Node 18+), otherwise create a mock
if (typeof global.Request === 'undefined' || !global.Request.prototype.json) {
  const OriginalRequest = global.Request || class {};
  global.Request = class Request extends OriginalRequest {
    constructor(url, init) {
      if (typeof url === 'string') {
        super(url, init);
      } else {
        super(init);
      }
      this.url = typeof url === 'string' ? url : url?.url || '';
      this.method = init?.method || 'GET';
      this.headers = new Headers(init?.headers);
      this._body = init?.body;
    }
    async json() {
      if (!this._body) {
        return {};
      }
      if (typeof this._body === 'string') {
        try {
          return JSON.parse(this._body);
        } catch (e) {
          throw new Error('Invalid JSON');
        }
      }
      return this._body;
    }
    async text() {
      if (!this._body) {
        return '';
      }
      return typeof this._body === 'string' ? this._body : JSON.stringify(this._body);
    }
  };
}

if (typeof global.Response === 'undefined') {
  global.Response = class Response {
    constructor(body, init) {
      this.body = body;
      this.status = init?.status || 200;
      this.headers = new Headers(init?.headers);
    }
    json() {
      return Promise.resolve(JSON.parse(this.body));
    }
    static json(data, init) {
      return new Response(JSON.stringify(data), {
        ...init,
        headers: {
          'Content-Type': 'application/json',
          ...init?.headers,
        },
      });
    }
  };
}

// Mock NextResponse
jest.mock('next/server', () => {
  const actual = jest.requireActual('next/server');
  return {
    ...actual,
    NextResponse: class NextResponse extends Response {
      constructor(body, init) {
        super(body, init);
      }
      static json(data, init) {
        return new NextResponse(JSON.stringify(data), {
          ...init,
          headers: {
            'Content-Type': 'application/json',
            ...init?.headers,
          },
        });
      }
    },
    NextRequest: class NextRequest extends Request {
      constructor(input, init) {
        super(input, init);
      }
    },
  };
});

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      pathname: '/',
      query: {},
      asPath: '/',
    }
  },
  usePathname() {
    return '/'
  },
  useSearchParams() {
    return new URLSearchParams()
  },
}))

// Mock environment variables
process.env.NEXT_PUBLIC_SITE_URL = 'http://localhost:3000'
process.env.NEXT_PUBLIC_BASE_URL = 'http://localhost:3000'
process.env.NEXT_PUBLIC_GA_ID = 'G-TEST123'
process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY = 'test-site-key'
// Redis is mocked in rate-limit.test.ts via redis-client mock
process.env.RECAPTCHA_SECRET_KEY = 'test-secret-key'
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test?schema=public'
process.env.JWT_SECRET = 'test-jwt-secret-key-min-32-characters-long-for-testing'
process.env.ADMIN_EMAIL = 'admin@test.com'
process.env.ADMIN_PASSWORD = 'test-password'
process.env.RESEND_API_KEY = 're_test_key'
process.env.RESEND_FROM_EMAIL = 'noreply@test.com'
process.env.CONTACT_EMAIL = 'contact@test.com'
process.env.RESEND_DOMAIN = 'test.com'
process.env.NODE_ENV = 'test'

// Suppress console errors in tests (optional - remove if you want to see all errors)
const originalError = console.error
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOM.render') ||
       args[0].includes('Warning: validateDOMNesting'))
    ) {
      return
    }
    originalError.call(console, ...args)
  }
})

afterAll(() => {
  console.error = originalError
})

