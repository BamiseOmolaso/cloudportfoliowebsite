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

This project uses GitHub Actions for continuous integration and deployment:

- **Automated Testing**: Runs on every push and pull request
- **Multi-Node Testing**: Tests on Node.js 18.x and 20.x
- **Code Quality**: ESLint and TypeScript type checking
- **Security**: Automated security audits
- **Build Verification**: Production build validation
- **Coverage Reports**: Test coverage tracking

See `.github/workflows/test.yml` for the complete CI/CD configuration.

## Getting Started

### Prerequisites

- Node.js 18.x or later
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

The application is configured for AWS deployment using:
- **RDS PostgreSQL**: Database
- **ECS**: Container orchestration
- **ALB**: Load balancing
- **Terraform**: Infrastructure as Code

Deployment steps:

1. Set up AWS credentials
2. Configure Terraform variables
3. Run Terraform to provision infrastructure:
   ```bash
   cd terraform
   terraform init
   terraform plan
   terraform apply
   ```
4. Set environment variables in AWS Secrets Manager
5. Deploy application to ECS

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
