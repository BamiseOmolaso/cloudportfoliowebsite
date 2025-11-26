# Local Development Setup

This project supports both Docker and native PostgreSQL for local development.

## Prerequisites

- Node.js 20+ installed
- Choose ONE of:
  - **Docker Desktop** (recommended for beginners)
  - **PostgreSQL 15+** installed locally

## Option 1: Setup with Docker (Recommended)

1. **Start Docker Desktop**

2. **Run setup script:**

```bash
   npm run setup:docker
```

3. **Start development:**

```bash
   npm run dev
```

4. **View database:**

```bash
   npm run db:studio
```

### Docker Commands

- `npm run docker:up` - Start containers
- `npm run docker:down` - Stop containers
- `npm run docker:logs` - View logs
- `npm run docker:clean` - Remove containers and volumes
- `npm run db:reset` - Reset database

## Option 2: Setup with Native PostgreSQL

1. **Install PostgreSQL** (if not already installed):

   - **Mac:** `brew install postgresql@15 && brew services start postgresql@15`
   - **Linux:** `sudo apt install postgresql && sudo systemctl start postgresql`
   - **Windows:** Download from postgresql.org

2. **Run setup script:**

```bash
   npm run setup:native
```

3. **Start development:**

```bash
   npm run dev
```

### Native PostgreSQL Commands

- `npm run db:reset` - Reset database
- `npm run db:studio` - View database in browser
- `psql portfolio_local` - Access database CLI

## Switching Between Docker and Native

**To Docker:**

```bash
# In .env.local, change:
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/portfolio?schema=public"

npm run setup:docker
```

**To Native:**

```bash
# In .env.local, change:
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/portfolio_local?schema=public"

npm run setup:native
```

## Common Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run db:studio` | Open Prisma Studio (database GUI) |
| `npm run db:reset` | Reset database |
| `npm run db:migrate` | Create new migration |
| `npm run db:seed` | Seed database with data |

## Troubleshooting

**"Port 5432 already in use"**

- If using Docker: Your native PostgreSQL is running. Stop it or use native setup.
- If using Native: Docker PostgreSQL is running. Run `npm run docker:down`

**"Database does not exist"**

- Docker: Run `npm run setup:docker`
- Native: Run `npm run setup:native`

**"Cannot connect to database"**

- Docker: Ensure Docker Desktop is running
- Native: Ensure PostgreSQL service is running

**Need fresh start?**

```bash
# For Docker
npm run docker:clean
npm run setup:docker

# For Native
npm run db:reset
```

## Environment Variables

See `.env.local` for all configuration options.

**Important:** Never commit `.env.local` to Git!

