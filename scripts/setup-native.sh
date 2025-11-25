#!/bin/bash

echo "🖥️  Setting up native PostgreSQL development environment..."

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL is not installed."
    echo ""
    echo "Install PostgreSQL:"
    echo "  Mac:     brew install postgresql@15"
    echo "  Linux:   sudo apt install postgresql postgresql-contrib"
    echo "  Windows: Download from https://www.postgresql.org/download/windows/"
    exit 1
fi

# Check if PostgreSQL is running
if ! pg_isready > /dev/null 2>&1; then
    echo "❌ PostgreSQL is not running."
    echo ""
    echo "Start PostgreSQL:"
    echo "  Mac:     brew services start postgresql@15"
    echo "  Linux:   sudo systemctl start postgresql"
    echo "  Windows: Start via Services or pgAdmin"
    exit 1
fi

# Create database if it doesn't exist
echo "📦 Creating database 'portfolio_local'..."
createdb portfolio_local 2>/dev/null || echo "Database already exists"

# Update .env.local to use native PostgreSQL
echo "📝 Updating .env.local to use native PostgreSQL..."
if [ -f .env.local ]; then
    # Backup existing .env.local
    cp .env.local .env.local.backup
    # Update DATABASE_URL
    sed -i.bak 's|portfolio?schema|portfolio_local?schema|g' .env.local
    rm .env.local.bak
    echo "✅ Updated DATABASE_URL to use 'portfolio_local'"
else
    echo "⚠️  .env.local not found. Please create it first."
    exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📥 Installing dependencies..."
    npm install
fi

# Generate Prisma Client
echo "🔧 Generating Prisma Client..."
export $(cat .env.local | grep -v '^#' | xargs)
npx prisma generate

# Run migrations (use .env.local explicitly)
echo "🗄️  Running database migrations..."
export $(cat .env.local | grep -v '^#' | xargs)
npx prisma migrate dev --name init

# Seed database (use .env.local explicitly)
echo "🌱 Seeding database..."
export $(cat .env.local | grep -v '^#' | xargs)
npx prisma db seed || echo "⚠️  Seed completed with warnings (data may already exist)"

echo ""
echo "✅ Native PostgreSQL development environment is ready!"
echo ""
echo "📝 Next steps:"
echo "   1. Run 'npm run dev' to start the development server"
echo "   2. Visit http://localhost:3000"
echo "   3. Run 'npm run db:studio' to view database in browser"
echo ""
echo "💡 Your .env.local is now using 'portfolio_local' database"
echo "   Original backed up to .env.local.backup"

