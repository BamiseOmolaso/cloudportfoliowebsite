#!/bin/bash

echo "🗑️  Resetting database..."

# Check which database we're using
if grep -q "portfolio_local" .env.local 2>/dev/null; then
    echo "Using native PostgreSQL..."
    dropdb portfolio_local 2>/dev/null || true
    createdb portfolio_local
else
    echo "Using Docker PostgreSQL..."
    docker-compose down -v
    docker-compose up -d
    
    echo "⏳ Waiting for PostgreSQL..."
    until docker exec portfolio_db pg_isready -U postgres > /dev/null 2>&1; do
        printf "."
        sleep 1
    done
    echo ""
fi

# Regenerate and migrate (use .env.local explicitly)
echo "🔧 Generating Prisma Client..."
if [ -f .env.local ]; then
    export $(cat .env.local | grep -v '^#' | xargs)
fi
npx prisma generate

echo "🗄️  Running migrations..."
if [ -f .env.local ]; then
    export $(cat .env.local | grep -v '^#' | xargs)
fi
npx prisma migrate dev --name init

echo "🌱 Seeding database..."
if [ -f .env.local ]; then
    export $(cat .env.local | grep -v '^#' | xargs)
fi
npx prisma db seed || true

echo "✅ Database reset complete!"

