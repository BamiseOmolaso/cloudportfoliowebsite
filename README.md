# Dr. Oluwabamise David Omolaso's Portfolio Website

[![CI/CD Tests](https://github.com/BamiseOmolaso/cloudportfoliowebsite/actions/workflows/test.yml/badge.svg)](https://github.com/BamiseOmolaso/cloudportfoliowebsite/actions/workflows/test.yml)

A modern, responsive portfolio website showcasing Dr. Oluwabamise David Omolaso's expertise in healthcare data science, AI applications, and cloud technologies.

## Features

- Modern dark theme with purple accent colors
- Responsive design for all devices
- Smooth animations and transitions
- Blog section for sharing insights
- Portfolio showcase with tag filtering
- Contact form with email notifications and spam protection
- Newsletter subscription with admin notifications and preferences management
- About section with experience timeline
- Downloadable resume
- Performance monitoring dashboard
- Admin dashboard for managing newsletters, blog posts, and projects
- Cookie consent management
- reCAPTCHA integration for form protection
- Rate limiting and security measures
- JWT-based admin authentication

## Technologies Used

- **Framework**: Next.js 14.2.26 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **Database**: PostgreSQL on AWS RDS
- **ORM**: Prisma
- **Email**: Resend
- **Rate Limiting**: Redis Cloud (production) / In-memory (local/dev)
- **Rich Text Editor**: TipTap
- **HTML Sanitization**: DOMPurify
- **Validation**: Zod
- **Security**: Google reCAPTCHA, JWT
- **Infrastructure**: AWS (RDS, ECS, ALB) with Terraform

## CI/CD

This project uses GitHub Actions for continuous integration and deployment with a multi-environment setup:

### Workflows

- **`ci.yml`** - Continuous Integration
  - Runs tests, linting, and type checking
  - Triggers on all branches
  - Validates code quality before deployment

- **`terraform.yml`** - Infrastructure Management
  - Plans and applies Terraform changes
  - Supports dev/staging/prod environments
  - Requires approval for staging/production
  - Auto-deploys to dev on push to `develop`

- **`deploy-app.yml`** - Application Deployment
  - Builds Docker images and pushes to ECR
  - Updates ECS services with new images
  - Supports dev/staging/prod environments
  - Requires approval for staging/production

### Features

- **Automated Testing**: Runs on every push and pull request
- **Multi-Node Testing**: Tests on Node.js 20.x
- **Code Quality**: ESLint and TypeScript type checking
- **Security**: Automated security audits with Trivy
- **Build Verification**: Production build validation
- **Coverage Reports**: Test coverage tracking
- **Multi-Environment**: Separate dev, staging, and production deployments

See `.github/workflows/` for complete workflow configurations.

## Getting Started

### Prerequisites

- Node.js 20.x or later
- npm or yarn
- PostgreSQL database (AWS RDS or local)
- Resend account for email
- Google reCAPTCHA keys
- Redis Cloud account (for rate limiting in production, optional)

### Installation

1. Clone the repository:

```bash
git clone https://github.com/BamiseOmolaso/cloudportfoliowebsite.git
cd portfolio-website
```

2. Install dependencies:

```bash
npm install
# or
yarn install
```

3. Set up the database:

```bash
# Generate Prisma Client
npx prisma generate

# Run migrations (if needed)
npx prisma migrate dev

# Seed the database (optional)
npx prisma db seed
```

4. Create a `.env` file in the root directory and add your environment variables:

```env
# Database (RDS PostgreSQL)
DATABASE_URL="postgresql://user:password@host:5432/dbname?schema=public&sslmode=require"

# Admin Authentication
ADMIN_EMAIL="admin@yourdomain.com"
ADMIN_PASSWORD="your-secure-admin-password"
JWT_SECRET="your-jwt-secret-key-change-in-production-min-32-chars"

# Email Service (Resend)
RESEND_API_KEY="re_your_api_key"
RESEND_FROM_EMAIL="noreply@yourdomain.com"
CONTACT_EMAIL="your-contact-email@example.com"

# Rate Limiting (Redis Cloud - Production Only)
# Redis is only used in production (NODE_ENV=production)
# Local development uses in-memory rate limiting (no Redis needed)
# REDIS_URL="redis://default:password@host:port"  # Only for production

# reCAPTCHA (Google)
NEXT_PUBLIC_RECAPTCHA_SITE_KEY="your_recaptcha_site_key"
RECAPTCHA_SECRET_KEY="your_recaptcha_secret_key"

# Google Analytics
NEXT_PUBLIC_GA_ID="G-XXXXXXXXXX"

# Site URLs
NEXT_PUBLIC_SITE_URL="https://yourdomain.com"

# Node Environment
NODE_ENV="development"
```

5. Run the development server:

```bash
npm run dev
# or
yarn dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser to see the result.

## Project Structure

```
src/
├── app/                    # Next.js app directory
│   ├── about/             # About page
│   ├── admin/             # Admin dashboard
│   │   ├── blog/          # Blog management
│   │   ├── newsletters/   # Newsletter management
│   │   ├── projects/      # Project management
│   │   ├── performance/   # Performance metrics
│   │   └── subscribers/   # Subscriber management
│   ├── api/               # API routes
│   │   ├── admin/         # Admin API routes
│   │   ├── auth/          # Authentication API
│   │   ├── blog/          # Blog API
│   │   ├── contact/       # Contact form API
│   │   ├── newsletter/    # Newsletter subscription API
│   │   ├── performance/   # Performance monitoring API
│   │   └── projects/      # Projects API
│   ├── blog/              # Blog section
│   ├── contact/           # Contact page
│   ├── newsletter/         # Newsletter pages
│   │   ├── preferences/   # Subscriber preferences
│   │   └── unsubscribe/   # Unsubscribe page
│   ├── projects/          # Projects section
│   ├── privacy-policy/    # Privacy policy page
│   ├── login/             # Admin login page
│   ├── globals.css         # Global styles
│   ├── layout.tsx          # Root layout
│   └── page.tsx            # Home page
├── components/            # React components
│   ├── layout/            # Layout components
│   │   ├── Navbar.tsx     # Navigation bar
│   │   └── Footer.tsx     # Footer component
│   ├── ContactForm.tsx    # Contact form component
│   ├── Newsletter.tsx     # Newsletter subscription component
│   ├── CookieConsent.tsx  # Cookie consent component
│   ├── Editor.tsx         # Rich text editor
│   └── PerformanceMonitor.tsx # Performance monitoring
├── lib/                   # Utility functions
│   ├── db.ts              # Prisma database client
│   ├── resend.ts          # Email sending utilities
│   ├── security.ts        # Security utilities
│   ├── rate-limit.ts      # Rate limiting utilities
│   ├── sanitize.ts        # Input sanitization utilities
│   └── cache.ts           # Caching utilities
├── config/                # Configuration files
│   └── env.ts             # Environment variable validation
├── types/                 # TypeScript type definitions
│   ├── newsletter.d.ts    # Newsletter types
│   ├── html-to-text.d.ts  # HTML to text types
│   ├── jsdom.d.ts         # JSDOM types
│   └── global.d.ts        # Global type definitions
└── public/                # Static assets
prisma/
├── schema.prisma          # Prisma schema
└── migrations/            # Database migrations
terraform/                 # Infrastructure as Code
├── main.tf                # Main Terraform configuration
└── modules/               # Terraform modules
    ├── rds/               # RDS configuration
    ├── ecs/               # ECS configuration
    └── alb/               # ALB configuration
```

## Database Schema

The application uses Prisma ORM with PostgreSQL. Key models include:

- **BlogPost**: Blog posts with content, tags, and metadata
- **Project**: Portfolio projects with technologies and links
- **Newsletter**: Newsletter campaigns
- **NewsletterSubscriber**: Subscriber management
- **NewsletterSend**: Send tracking
- **PerformanceMetric**: Website performance metrics
- **LcpMetric**: Largest Contentful Paint metrics
- **Profile**: User profiles (admin)
- **BlacklistedIp**: IP blacklisting
- **FailedAttempt**: Failed login attempt tracking

## Recent Updates

### Migration to Prisma + RDS (Latest)
- **Complete migration from Supabase to Prisma + AWS RDS**
- Removed all Supabase dependencies
- Implemented JWT-based admin authentication
- All database operations now use Prisma ORM
- Production-ready on AWS infrastructure

### Security Enhancements
- JWT-based admin authentication
- reCAPTCHA protection for forms
- Rate limiting for API routes
- Enhanced input sanitization
- IP blacklisting for suspicious activity
- Cookie consent management

### Newsletter System
- Subscriber preferences management
- Unsubscribe functionality with feedback
- Enhanced email templates
- Performance metrics tracking
- Improved admin dashboard

### Performance Improvements
- Optimized database queries with Prisma
- Caching strategies
- Error boundaries
- Enhanced loading states
- Performance monitoring

### Code Quality
- Fixed all ESLint errors
- Improved TypeScript typing
- Removed unused code and dependencies
- Better code organization

## Admin Access

Access the admin dashboard at `/admin` after logging in at `/login`.

Default credentials are configured via environment variables:
- `ADMIN_EMAIL`: Your admin email
- `ADMIN_PASSWORD`: Your admin password

## Customization

1. Update content in respective page components
2. Modify color scheme in `globals.css`
3. Add images to the `public` directory
4. Update social media links in Footer component
5. Add resume PDF to `public` directory
6. Configure email templates in `lib/resend.ts`
7. Update reCAPTCHA keys in `.env`
8. Configure rate limiting in `lib/rate-limit.ts`
9. Update database schema in `prisma/schema.prisma`

## Deployment

### AWS Deployment (Current Setup)

The application is configured for AWS deployment using **Terraform** with a **multi-environment structure**:

#### Infrastructure Components
- **RDS PostgreSQL**: Database (separate per environment)
- **ECS Fargate**: Container orchestration
- **ALB**: Application Load Balancer
- **ECR**: Docker image registry
- **Secrets Manager**: Environment variables and credentials
- **CloudWatch**: Logging and monitoring

#### Environments

- **Development** (`terraform/envs/dev/`)
  - Auto-deploys on push to `develop` branch
  - Smaller instance sizes for cost savings
  - Single ECS task, minimal resources

- **Staging** (`terraform/envs/staging/`)
  - Deploys on push to `staging` branch (with approval)
  - Similar to production, smaller scale
  - Used for pre-production testing

- **Production** (`terraform/envs/prod/`)
  - Deploys on push to `main` branch (with approval)
  - Full scale with backups and monitoring
  - ALB deletion protection enabled

#### Deployment via CI/CD

The recommended way to deploy is through GitHub Actions workflows:

1. **Push to branch** (`develop`, `staging`, or `main`)
2. **CI Pipeline** runs tests and validation
3. **Terraform Plan** shows infrastructure changes
4. **Manual Approval** required for staging/production
5. **Terraform Apply** updates infrastructure
6. **Deploy App** workflow builds and deploys Docker image
7. **ECS Service** updates with new image

#### Manual Deployment

For manual deployment:

```bash
# Navigate to environment directory
cd terraform/envs/prod  # or dev/staging

# Initialize Terraform
terraform init

# Review changes
terraform plan

# Apply changes
terraform apply
```

See `DEPLOYMENT_GUIDE.md` and `terraform/README.md` for detailed instructions.

### Infrastructure Cost Management

To save costs when not actively using the application, use the pause/resume scripts:

```bash
# Pause infrastructure (stops expensive resources)
./scripts/pause.sh prod us-east-1

# Resume infrastructure (restarts all resources)
./scripts/resume.sh prod us-east-1
```

**When Paused:**
- ALB, Target Group, Listener are destroyed
- ECS tasks scaled to 0
- RDS database stopped
- Cost: ~$1-2/month (just storage/secrets)

**When Running:**
- All resources active and accessible
- Cost: ~$200-250/month (full infrastructure)

See `scripts/pause.sh` and `scripts/resume.sh` for details.

### Other Deployment Options

- **Vercel**: Recommended for Next.js (requires database connection)
- **Netlify**: With external database
- **AWS Amplify**: With RDS integration
- **Docker**: Containerized deployment

## Development Scripts

```bash
# Development
npm run dev          # Start development server

# Production
npm run build        # Build for production
npm start            # Start production server
npm run predeploy    # Run all pre-deployment checks

# Code Quality
npm run lint         # Run ESLint
npm run format       # Format code with Prettier
npm run type-check   # Run TypeScript type checking

# Testing
npm test             # Run tests
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Run tests with coverage report

# Database
npx prisma generate  # Generate Prisma Client
npx prisma migrate   # Run migrations
npx prisma studio    # Open Prisma Studio

# Infrastructure Management
./scripts/pause.sh [env] [region]   # Pause infrastructure (save costs)
./scripts/resume.sh [env] [region]  # Resume infrastructure
```

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

Quick start:
1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Make your changes and add tests
4. Run `npm run predeploy` to ensure all checks pass
5. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
6. Push to the branch (`git push origin feature/AmazingFeature`)
7. Open a Pull Request

For detailed guidelines, testing requirements, and code style, see [CONTRIBUTING.md](./CONTRIBUTING.md).

## Documentation

- [Testing Guide](./TESTING.md) - How to write and run tests
- [Contributing Guide](./CONTRIBUTING.md) - How to contribute to this project
- [Security Policy](./SECURITY.md) - Security practices and vulnerability reporting

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contact

Dr. Oluwabamise David Omolaso - [davidbams3@gmail.com](mailto:davidbams3@gmail.com)

Project Link: [https://github.com/BamiseOmolaso/cloudportfoliowebsite.git](https://github.com/BamiseOmolaso/cloudportfoliowebsite.git)
