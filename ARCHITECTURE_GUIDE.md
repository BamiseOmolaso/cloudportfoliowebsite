# Complete Architecture Guide

## Table of Contents
1. [System Architecture Overview](#system-architecture-overview)
2. [Request Flow & Lifecycle](#request-flow--lifecycle)
3. [Authentication & Authorization](#authentication--authorization)
4. [Database Layer](#database-layer)
5. [API Layer Architecture](#api-layer-architecture)
6. [Security Architecture](#security-architecture)
7. [Caching & Performance](#caching--performance)
8. [Infrastructure Architecture](#infrastructure-architecture)
9. [CI/CD Pipeline](#cicd-pipeline)
10. [Frontend Architecture](#frontend-architecture)
11. [Error Handling & Resilience](#error-handling--resilience)
12. [Data Flow Examples](#data-flow-examples)

---

## System Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Internet / Users                          │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              Application Load Balancer (ALB)                │
│         - SSL Termination                                   │
│         - Health Checks                                      │
│         - Request Routing                                    │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              ECS Fargate Cluster                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Next.js Application Container                       │  │
│  │  - Server-Side Rendering (SSR)                        │  │
│  │  - API Routes                                         │  │
│  │  - Static Generation (ISR)                            │  │
│  └──────────────────────────────────────────────────────┘  │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
        ▼              ▼              ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│   RDS        │ │   Redis      │ │   Secrets     │
│ PostgreSQL   │ │   Cloud      │ │   Manager     │
│              │ │              │ │               │
│ - Prisma ORM │ │ - Rate Limit │ │ - Env Vars    │
│ - Migrations │ │ - Caching    │ │ - Credentials│
└──────────────┘ └──────────────┘ └──────────────┘
        │
        ▼
┌──────────────┐
│   Resend     │
│   Email API  │
└──────────────┘
```

### Technology Stack

**Frontend:**
- Next.js 14 (App Router) - React framework with SSR/SSG
- TypeScript - Type safety
- Tailwind CSS - Utility-first styling
- Framer Motion - Animations
- TipTap - Rich text editor

**Backend:**
- Next.js API Routes - Serverless functions
- Prisma ORM - Database abstraction
- PostgreSQL (AWS RDS) - Relational database
- Redis Cloud - Rate limiting & caching

**Infrastructure:**
- AWS ECS Fargate - Container orchestration
- AWS RDS - Managed PostgreSQL
- AWS ALB - Load balancing
- AWS ECR - Docker registry
- AWS Secrets Manager - Secure configuration
- Terraform - Infrastructure as Code

**Security:**
- JWT - Authentication tokens
- reCAPTCHA - Bot protection
- Rate Limiting - DDoS protection
- Input Sanitization - XSS prevention

---

## Request Flow & Lifecycle

### 1. User Request Journey

```
User Browser
    │
    ├─► DNS Resolution
    │       │
    │       ▼
    │   ALB (Application Load Balancer)
    │       │
    │       ├─► Health Check (/api/health)
    │       │       │
    │       │       ▼
    │       │   ECS Task (Next.js App)
    │       │       │
    │       │       ├─► Middleware (src/middleware.ts)
    │       │       │   - Security headers
    │       │       │   - CSP, HSTS, etc.
    │       │       │
    │       │       ├─► Route Handler
    │       │       │   - Page component (SSR)
    │       │       │   - API route
    │       │       │
    │       │       ├─► Rate Limiting Check
    │       │       │   - Redis (production)
    │       │       │   - In-memory (dev)
    │       │       │
    │       │       ├─► Authentication (if /admin)
    │       │       │   - JWT verification
    │       │       │   - Database check
    │       │       │
    │       │       ├─► Database Query (Prisma)
    │       │       │   - Connection pooling
    │       │       │   - Query optimization
    │       │       │
    │       │       ├─► Response Generation
    │       │       │   - HTML (SSR)
    │       │       │   - JSON (API)
    │       │       │
    │       │       └─► Response Headers
    │       │           - Security headers
    │       │           - Cache headers
    │       │
    │       └─► Response to User
```

### 2. API Request Flow

```typescript
// Example: Newsletter Subscription Flow

1. Client Request
   POST /api/newsletter/subscribe
   Body: { email, name, captchaToken }

2. Middleware Layer (src/middleware.ts)
   - Adds security headers
   - CSP, HSTS, X-Frame-Options

3. Rate Limiting (src/lib/rate-limit.ts)
   - Check Redis/in-memory store
   - Track requests per IP
   - Return 429 if exceeded

4. Security Checks (src/lib/security.ts)
   - IP blacklist check
   - CAPTCHA verification (if needed)
   - Track failed attempts

5. Input Validation
   - Sanitize inputs (src/lib/sanitize-text.ts)
   - Validate email format
   - Check required fields

6. Database Operation (Prisma)
   - Upsert subscriber
   - Create audit log
   - Generate tokens

7. Email Service (src/lib/resend.ts)
   - Send welcome email
   - Send admin notification

8. Response
   - JSON success/error
   - Security headers
   - Rate limit headers
```

---

## Authentication & Authorization

### Authentication Flow

```
┌─────────────┐
│   User      │
│   Login     │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────┐
│  POST /api/auth/login               │
│  Body: { email, password }          │
└──────┬──────────────────────────────┘
       │
       ├─► Rate Limiting Check
       │   (10 requests / 15 min)
       │
       ├─► Credential Validation
       │   - Compare with ADMIN_EMAIL
       │   - Compare with ADMIN_PASSWORD
       │
       ├─► Database Check/Create
       │   - Find or create Profile
       │   - Ensure role = 'admin'
       │
       ├─► JWT Token Generation
       │   - Payload: { email, role, id }
       │   - Expires: 7 days
       │   - Signed with JWT_SECRET
       │
       └─► Set HTTP-Only Cookie
           - Name: 'auth-token'
           - HttpOnly: true
           - Secure: true (production)
           - SameSite: 'lax'
           - MaxAge: 7 days
```

### Authorization Middleware

```typescript
// src/lib/auth-middleware.ts

1. requireAuth(request)
   ├─► Extract JWT from cookie
   ├─► Verify JWT signature
   ├─► Check expiration
   ├─► Query database for user
   ├─► Verify admin role
   └─► Return AuthResult

2. withAuth(handler)
   ├─► Wraps route handler
   ├─► Calls requireAuth()
   ├─► Returns 401 if not authenticated
   └─► Passes user to handler
```

### Protected Routes

- `/admin/*` - All admin routes require authentication
- Uses `withAuth()` wrapper
- Checks JWT on every request
- Validates admin role in database

---

## Database Layer

### Prisma Architecture

```
┌─────────────────────────────────────────┐
│         Prisma Client                    │
│  (Singleton Pattern)                    │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│      Connection Pooling                  │
│  - Reuses connections                   │
│  - Prevents connection exhaustion        │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│      PostgreSQL (AWS RDS)                │
│                                          │
│  Tables:                                 │
│  ├─► blog_posts                         │
│  ├─► projects                           │
│  ├─► newsletter_subscribers             │
│  ├─► newsletters                        │
│  ├─► newsletter_sends                   │
│  ├─► contact_messages                   │
│  ├─► performance_metrics                │
│  ├─► profiles                           │
│  ├─► blacklisted_ips                    │
│  └─► failed_attempts                    │
└──────────────────────────────────────────┘
```

### Database Connection Pattern

```typescript
// src/lib/db.ts

// Singleton Pattern
const globalForPrisma = global as unknown as {
  prisma: PrismaClient | undefined
}

// Reuse connection in development
// New connection per request in production
const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' 
    ? ['query', 'error', 'warn'] 
    : ['error']
})

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
```

### Database Models & Relationships

```prisma
// Key Relationships:

NewsletterSubscriber
  ├─► NewsletterSend[] (one-to-many)
  ├─► SubscriberTag[] (many-to-many via NewsletterTag)
  └─► NewsletterAuditLog[] (one-to-many)

Newsletter
  └─► NewsletterSend[] (one-to-many)

BlogPost
  └─► No relations (standalone)

Project
  └─► No relations (standalone)
```

### Query Optimization

- Indexes on frequently queried fields
- Select only needed fields
- Use `findMany` with `where` for filtering
- Batch operations with `Promise.all()`
- Connection pooling via Prisma

---

## API Layer Architecture

### API Route Structure

```
src/app/api/
├── admin/              # Protected admin routes
│   ├── blog/
│   ├── newsletters/
│   ├── projects/
│   ├── subscribers/
│   └── performance/
├── auth/               # Authentication
│   └── login/
├── blog/               # Public blog API
├── contact/            # Contact form
├── newsletter/         # Newsletter operations
├── projects/           # Public projects API
├── performance/        # Performance metrics
└── health/             # Health checks
```

### API Route Pattern

```typescript
// Standard API Route Structure

export const POST = withRateLimit(
  limiter,
  identifier,
  async (request: NextRequest) => {
    // 1. Extract and validate input
    const body = await request.json();
    
    // 2. Security checks
    if (await isIPBlacklisted(ip)) {
      return 429;
    }
    
    // 3. Input sanitization
    const sanitized = sanitizeText(body.input);
    
    // 4. Business logic
    const result = await db.model.create({ data });
    
    // 5. Side effects (emails, etc.)
    await sendEmail(result);
    
    // 6. Return response with headers
    return addSecurityHeaders(
      NextResponse.json({ success: true })
    );
  }
);
```

### Rate Limiting Strategy

```typescript
// Different limiters for different endpoints

contactFormLimiter: 5 requests / hour
authLimiter: 10 requests / 15 minutes
apiLimiter: 100 requests / hour
adminLimiter: 50 requests / hour
```

---

## Security Architecture

### Multi-Layer Security

```
Layer 1: Network Security
├─► ALB Security Groups
├─► ECS Security Groups
└─► RDS Security Groups

Layer 2: Application Security
├─► Middleware Security Headers
│   - CSP (Content Security Policy)
│   - HSTS (HTTP Strict Transport Security)
│   - X-Frame-Options
│   - X-Content-Type-Options
│
├─► Rate Limiting
│   - Per IP address
│   - Per endpoint
│   - Redis-based (production)
│
├─► Input Sanitization
│   - Text sanitization
│   - HTML sanitization (DOMPurify)
│   - SQL injection prevention (Prisma)
│
├─► Authentication
│   - JWT tokens
│   - HTTP-only cookies
│   - Secure flag (production)
│
└─► Bot Protection
    - reCAPTCHA
    - IP blacklisting
    - Failed attempt tracking
```

### Security Headers (Middleware)

```typescript
// src/middleware.ts

X-DNS-Prefetch-Control: on
Strict-Transport-Security: max-age=63072000
X-Frame-Options: SAMEORIGIN
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
Content-Security-Policy: default-src 'self'; ...
```

### IP Blacklisting System

```typescript
// src/lib/security.ts

1. Track Failed Attempts
   - Store in database
   - Track by IP and email
   - Action types: login, newsletter_subscribe, etc.

2. Automatic Blacklisting
   - 3+ failed attempts in 1 hour
   - Requires CAPTCHA
   - Can be manually blacklisted

3. Blacklist Check
   - Check on every request
   - Expires after 24 hours (default)
   - Can be permanent
```

---

## Caching & Performance

### Caching Strategy

There is no application-level cache layer at the moment. Caching is handled at two tiers:

1. **HTTP response cache headers** — public read endpoints (`/api/blog`, `/api/blog/[slug]`) set `Cache-Control: public, s-maxage=..., stale-while-revalidate=...` so the CDN / browser caches responses.
2. **Redis** — used today only for sliding-window rate limiting (see Redis Usage below). Application data caching via Redis is a planned future enhancement.

```
┌───────────────┐    Cache-Control     ┌───────────────┐
│   Client /    │  ◄─── s-maxage ───── │  Next.js      │
│   CDN edge    │                      │  API route    │
└───────────────┘                      └───────┬───────┘
                                               │ Prisma
                                               ▼
                                       ┌───────────────┐
                                       │  PostgreSQL   │
                                       └───────────────┘
```

### Performance Monitoring

```typescript
// src/lib/performance.ts

1. Client-Side Metrics
   - DNS lookup time
   - TCP connection time
   - Server response time
   - DOM processing time
   - Page load time
   - LCP (Largest Contentful Paint)

2. Server-Side Storage
   - Store in performance_metrics table
   - Store LCP in lcp_metrics table
   - Track by URL

3. Admin Dashboard
   - View performance trends
   - Identify slow pages
   - Optimize based on data
```

### Redis Usage

```typescript
// Production: Redis Cloud
// Development: In-memory fallback

Rate Limiting:
- Uses Redis sorted sets
- Sliding window algorithm
- Automatic cleanup

Caching (Future):
- Can cache database queries
- Can cache API responses
- TTL-based expiration
```

---

## Infrastructure Architecture

### AWS Infrastructure

```
┌─────────────────────────────────────────────┐
│           Internet Gateway                   │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│      Application Load Balancer (ALB)        │
│  - SSL/TLS termination                      │
│  - Health checks (/api/health)              │
│  - Request routing                          │
│  - HTTP → HTTPS redirect                   │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│         Target Group                        │
│  - Routes to ECS tasks                      │
│  - Health check: HTTP 200                   │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│         ECS Fargate Cluster                 │
│  ┌──────────────────────────────────────┐   │
│  │  ECS Service                         │   │
│  │  ┌────────────────────────────────┐ │   │
│  │  │  Task Definition                │ │   │
│  │  │  - CPU: 512 (0.5 vCPU)         │ │   │
│  │  │  - Memory: 1024 MB (1 GB)        │ │   │
│  │  │  - Image: ECR repository         │ │   │
│  │  │  - Port: 3000                   │ │   │
│  │  └────────────────────────────────┘ │   │
│  │  ┌────────────────────────────────┐ │   │
│  │  │  Container: Next.js App        │ │   │
│  │  │  - Environment variables       │ │   │
│  │  │  - Secrets from Secrets Manager│ │   │
│  │  │  - Logs to CloudWatch         │ │   │
│  │  └────────────────────────────────┘ │   │
│  └──────────────────────────────────────┘   │
│                                              │
│  Auto Scaling:                               │
│  - Min: 1 task                              │
│  - Max: 4 tasks                             │
│  - CPU: 70% threshold                       │
│  - Memory: 80% threshold                     │
└──────────────────┬──────────────────────────┘
                   │
        ┌──────────┼──────────┐
        │          │          │
        ▼          ▼          ▼
┌──────────┐ ┌──────────┐ ┌──────────┐
│   RDS    │ │  Secrets │ │  CloudWatch│
│PostgreSQL│ │ Manager  │ │   Logs    │
│          │ │          │ │           │
│- Multi-AZ│ │- Env vars│ │- App logs │
│- Backups │ │- Secrets │ │- Metrics  │
└──────────┘ └──────────┘ └──────────┘
```

### Terraform Structure

```
terraform/
├── main.tf                    # Root configuration
├── variables.tf               # Input variables
├── outputs.tf                # Output values
│
├── modules/
│   ├── networking/           # VPC, subnets, internet gateway
│   ├── security/             # Security groups
│   ├── rds/                  # RDS PostgreSQL
│   ├── ecs/                  # ECS cluster, service, task
│   └── github-oidc/          # GitHub OIDC for CI/CD
│
└── envs/
    ├── dev/                  # Development environment
    ├── staging/              # Staging environment
    └── prod/                 # Production environment
```

### Environment Configuration

```hcl
# Each environment has:
- Separate RDS instance
- Separate ECS cluster
- Separate ALB
- Separate Secrets Manager secrets
- Environment-specific variables
```

### Docker Container

```dockerfile
# Multi-stage build

Stage 1: Dependencies
- Install npm packages
- Generate Prisma Client

Stage 2: Builder
- Copy source code
- Build Next.js application
- Generate Prisma Client

Stage 3: Runner
- Minimal Alpine image
- Copy built files
- Copy Prisma files
- Run as non-root user
- Expose port 3000
```

---

## CI/CD Pipeline

### Pipeline Flow

```
┌─────────────────────────────────────────┐
│   Developer pushes to branch           │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│   CI Pipeline (ci.yml)                 │
│   ├─► Checkout code                    │
│   ├─► Setup Node.js                    │
│   ├─► Install dependencies             │
│   ├─► Run tests                        │
│   ├─► Run linter                       │
│   ├─► Type check                       │
│   └─► Build verification               │
└──────────────┬──────────────────────────┘
               │
               ├─► Success
               │       │
               │       ▼
               │   ┌───────────────────────┐
               │   │ Terraform Pipeline    │
               │   │ (terraform.yml)       │
               │   │                       │
               │   │ - Plan infrastructure │
               │   │ - Manual approval     │
               │   │   (staging/prod)      │
               │   │ - Apply changes       │
               │   └───────────┬───────────┘
               │               │
               │               ▼
               │   ┌───────────────────────┐
               │   │ Deploy App Pipeline   │
               │   │ (deploy-app.yml)      │
               │   │                       │
               │   │ - Build Docker image  │
               │   │ - Push to ECR         │
               │   │ - Update ECS service │
               │   │ - Health check        │
               │   └───────────────────────┘
               │
               └─► Failure → Stop pipeline
```

### GitHub Actions Workflows

**1. CI Pipeline (`ci.yml`)**
- Runs on every push/PR
- Tests, linting, type checking
- Build verification
- Security scanning (Trivy)

**2. Terraform Pipeline (`terraform.yml`)**
- Runs on push to develop/staging/main
- Plans infrastructure changes
- Requires approval for staging/prod
- Auto-applies to dev

**3. Deploy App Pipeline (`deploy-app.yml`)**
- Runs after CI passes
- Builds Docker image
- Pushes to ECR
- Updates ECS service
- Health check verification

### OIDC Authentication

```yaml
# GitHub OIDC for AWS authentication
# No long-lived credentials needed

permissions:
  id-token: write
  contents: read

steps:
  - name: Configure AWS credentials
    uses: aws-actions/configure-aws-credentials@v4
    with:
      role-to-assume: ${{ secrets.AWS_DEPLOY_ROLE_ARN }}
      aws-region: us-east-1
```

---

## Frontend Architecture

### Next.js App Router Structure

```
src/app/
├── layout.tsx              # Root layout
│   ├── Navbar
│   ├── Footer
│   ├── ErrorBoundary
│   └── CookieConsent
│
├── page.tsx                # Homepage
│   ├── Hero section
│   ├── YouTube videos
│   ├── Blog posts preview
│   └── Projects preview
│
├── about/page.tsx          # About page
├── blog/
│   ├── page.tsx            # Blog listing
│   └── [slug]/page.tsx    # Blog post detail
│
├── projects/
│   ├── page.tsx           # Projects listing
│   └── [slug]/page.tsx    # Project detail
│
├── contact/page.tsx        # Contact form
├── newsletter/
│   ├── page.tsx           # Newsletter signup
│   └── preferences/page.tsx
│
├── admin/                  # Admin dashboard
│   ├── layout.tsx         # Admin layout
│   ├── page.tsx           # Dashboard
│   ├── blog/              # Blog management
│   ├── newsletters/       # Newsletter management
│   ├── projects/          # Project management
│   └── subscribers/       # Subscriber management
│
└── api/                    # API routes
    ├── admin/
    ├── auth/
    ├── blog/
    ├── contact/
    └── newsletter/
```

### Component Architecture

```
src/components/
├── layout/
│   ├── Navbar.tsx         # Navigation bar
│   └── Footer.tsx          # Footer component
│
├── admin/
│   └── AnimatedCard.tsx   # Admin dashboard cards
│
├── ContactForm.tsx        # Contact form component
├── Newsletter.tsx          # Newsletter subscription
├── CookieConsent.tsx      # Cookie consent banner
├── ErrorBoundary.tsx      # Error boundary
├── Loading.tsx           # Loading spinner
└── PerformanceMonitor.tsx  # Performance tracking
```

### State Management

- **Server Components**: Default (no client-side state)
- **Client Components**: React hooks (`useState`, `useEffect`)
- **No global state library**: Uses React Context if needed
- **Data Fetching**: Server-side via API routes

### Styling Architecture

- **Tailwind CSS**: Utility-first CSS
- **Dark theme**: Gray-950 background, purple accents
- **Responsive**: Mobile-first approach
- **Animations**: Framer Motion

---

## Error Handling & Resilience

### Error Handling Layers

```
1. React Error Boundaries
   └─► src/components/ErrorBoundary.tsx
       - Catches React component errors
       - Shows user-friendly error page
       - Allows page reload

2. API Error Handling
   └─► src/lib/api-security.ts
       - handleError() function
       - Generic error messages
       - No sensitive info leakage
       - Prisma error mapping

3. Database Error Handling
   └─► Prisma error handling
       - Connection errors
       - Query errors
       - Validation errors
       - Graceful fallbacks

4. Infrastructure Resilience
   ├─► Health checks
   ├─► Auto-scaling
   ├─► Load balancing
   └─► Database backups
```

### Error Flow Example

```typescript
// API Route Error Handling

try {
  // Business logic
  const result = await db.model.create({ data });
  return NextResponse.json({ success: true });
} catch (error) {
  // Log detailed error (server-side only)
  console.error('Detailed error:', error);
  
  // Map Prisma errors to user-friendly messages
  if (error.code === 'P2002') {
    return NextResponse.json(
      { error: 'Record already exists' },
      { status: 409 }
    );
  }
  
  // Generic error response
  return handleError(error, 'Failed to process request');
}
```

### Resilience Features

- **Database Connection Pooling**: Prevents connection exhaustion
- **Redis Fallback**: In-memory rate limiting if Redis fails
- **Graceful Degradation**: App works without optional services
- **Health Checks**: ALB monitors container health
- **Auto-scaling**: Handles traffic spikes
- **Error Boundaries**: Prevents full app crashes

---

## Data Flow Examples

### Example 1: Newsletter Subscription

```
1. User fills form
   └─► Client: Newsletter.tsx component

2. Form submission
   └─► POST /api/newsletter/subscribe
       Body: { email, name, captchaToken }

3. Rate limiting check
   └─► Redis/in-memory: Check IP limit
       └─► 100 requests/hour limit

4. Security checks
   ├─► IP blacklist check
   ├─► CAPTCHA verification (if needed)
   └─► Input sanitization

5. Database operation
   └─► Prisma: Upsert NewsletterSubscriber
       ├─► Generate unsubscribe token
       ├─► Generate preferences token
       └─► Create audit log

6. Email sending
   ├─► Resend: Welcome email to subscriber
   └─► Resend: Notification to admin

7. Response
   └─► JSON: { success: true }
```

### Example 2: Admin Blog Post Creation

```
1. Admin logs in
   └─► POST /api/auth/login
       └─► JWT token in cookie

2. Admin navigates to /admin/blog
   └─► Admin layout checks auth
       └─► requireAuth() middleware

3. Admin creates blog post
   └─► POST /api/admin/blog
       ├─► withAuth() wrapper
       ├─► Rate limiting
       ├─► CSRF check
       └─► Input sanitization

4. Rich text editor
   └─► TipTap Editor component
       └─► HTML content

5. Database operation
   └─► Prisma: Create BlogPost
       ├─► Generate slug
       ├─► Sanitize HTML
       └─► Store in database

6. Response
   └─► JSON: { id, slug, ... }
```

### Example 3: Blog Post Display

```
1. User visits /blog/[slug]
   └─► Next.js dynamic route

2. Server-side rendering
   └─► Fetch blog post from database
       └─► Prisma: findUnique({ where: { slug } })

3. Content sanitization
   └─► DOMPurify: Sanitize HTML
       └─► Prevent XSS

4. SEO metadata
   └─► Generate meta tags
       ├─► Title
       ├─► Description
       └─► Open Graph tags

5. Render page
   └─► HTML with blog content
       └─► Client-side hydration
```

---

## Key Architectural Patterns

### 1. Singleton Pattern
- **Prisma Client**: Reuse connection in development
- **Redis Client**: Single connection instance
- **In-Memory Rate Limiter**: Singleton fallback when Redis is unavailable

### 2. Middleware Pattern
- **withAuth()**: Authentication wrapper
- **withRateLimit()**: Rate limiting wrapper
- **secureAdminRoute()**: Combined security wrapper

### 3. Strategy Pattern
- **Rate Limiting**: Redis (production) vs In-memory (dev)
- **Database**: Prisma (real) vs Mock (tests)

### 4. Factory Pattern
- **Error Handling**: Map errors to user-friendly messages
- **Email Templates**: Generate based on context

### 5. Repository Pattern (via Prisma)
- **Database Access**: Abstracted through Prisma
- **Type Safety**: TypeScript + Prisma types

---

## Performance Optimizations

### 1. Next.js Optimizations
- **Standalone Output**: Smaller Docker image
- **Image Optimization**: Next.js Image component
- **Code Splitting**: Automatic route-based splitting
- **Static Generation**: Pre-render pages when possible

### 2. Database Optimizations
- **Indexes**: On frequently queried fields
- **Select Specific Fields**: Don't fetch unnecessary data
- **Connection Pooling**: Reuse connections
- **Query Optimization**: Use Prisma's query optimization

### 3. Caching
- **In-Memory Cache**: Fast access to frequently used data
- **HTTP Cache Headers**: Browser caching
- **Redis**: Future caching layer

### 4. Infrastructure
- **Auto-scaling**: Handle traffic spikes
- **Load Balancing**: Distribute requests
- **CDN**: Static assets (future)

---

## Security Best Practices

1. **Never expose sensitive data in errors**
2. **Always sanitize user input**
3. **Use parameterized queries (Prisma)**
4. **Rate limit all public endpoints**
5. **Validate JWT tokens on every request**
6. **Use HTTP-only cookies for tokens**
7. **Implement CSRF protection**
8. **Monitor failed attempts**
9. **Blacklist suspicious IPs**
10. **Keep dependencies updated**

---

## Monitoring & Observability

### Current Monitoring
- **CloudWatch Logs**: Application logs
- **CloudWatch Metrics**: ECS metrics
- **Performance Metrics**: Custom tracking
- **Health Checks**: ALB health checks

### Future Enhancements
- **Application Performance Monitoring (APM)**
- **Error Tracking (Sentry)**
- **Analytics Dashboard**
- **Uptime Monitoring**

---

This architecture guide provides a comprehensive overview of how every component works together. Each section can be expanded with more detail as needed.

