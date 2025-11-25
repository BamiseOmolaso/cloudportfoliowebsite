#!/bin/bash

echo "🐳 Setting up Docker development environment..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop and try again."
    exit 1
fi

# Start Docker services
echo "📦 Starting PostgreSQL and Redis with Docker..."
docker-compose up -d

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
until docker exec portfolio_db pg_isready -U postgres > /dev/null 2>&1; do
    printf "."
    sleep 1
done

echo ""
echo "✅ PostgreSQL is ready!"

# Check if .env.local exists, create it if not
if [ ! -f .env.local ]; then
    echo "⚠️  .env.local not found. Creating from template..."
    cat > .env.local << 'EOF'
# Local Database - Docker PostgreSQL
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/portfolio?schema=public"

# Admin Authentication
ADMIN_EMAIL="admin@local.dev"
ADMIN_PASSWORD="admin123"
JWT_SECRET="local-jwt-secret-key-min-32-characters-long-for-development"

# Email Service (Resend test mode)
RESEND_API_KEY="re_test_key"
RESEND_FROM_EMAIL="noreply@local.dev"
CONTACT_EMAIL="contact@local.dev"
RESEND_DOMAIN="local.dev"

# Redis
UPSTASH_REDIS_REST_URL="http://localhost:6379"
UPSTASH_REDIS_REST_TOKEN=""

# reCAPTCHA Test Keys
NEXT_PUBLIC_RECAPTCHA_SITE_KEY="6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI"
RECAPTCHA_SECRET_KEY="6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe"

# Site URLs
NEXT_PUBLIC_SITE_URL="http://localhost:3000"

# Environment
NODE_ENV="development"
EOF
fi

echo "📝 Using .env.local for database connection..."

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📥 Installing dependencies..."
    npm install
fi

# Load environment variables from .env.local
# Filter out comments and empty lines, then export
export $(cat .env.local | grep -v '^#' | grep -v '^$' | xargs)

# Set explicit DATABASE_URL to ensure it's used
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/portfolio?schema=public"

# Generate Prisma Client
echo "🔧 Generating Prisma Client..."
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/portfolio?schema=public" npx prisma generate

# Run migrations with explicit DATABASE_URL
echo "🗄️  Running database migrations..."
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/portfolio?schema=public" npx prisma migrate dev --name init --skip-seed

# Seed database with explicit DATABASE_URL
echo "🌱 Seeding database..."
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/portfolio?schema=public" npx prisma db seed || echo "⚠️  Seed completed with warnings (data may already exist)"

echo ""
echo "✅ Docker development environment is ready!"
echo ""
echo "📝 Next steps:"
echo "   1. Run 'npm run dev' to start the development server"
echo "   2. Visit http://localhost:3000"
echo "   3. Run 'npm run db:studio' to view database in browser"
echo ""
echo "🛠️  Useful commands:"
echo "   - 'docker-compose logs -f' to view logs"
echo "   - 'docker-compose down' to stop containers"
echo "   - 'npm run db:reset' to reset database"

