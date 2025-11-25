# Redis Cloud Setup Guide

## Overview

This application uses **Redis Cloud** for rate limiting in **production only**. For local development (Docker or native), the app automatically uses **in-memory rate limiting** to avoid unnecessary fees.

## When Redis is Used

- ✅ **Production** (`NODE_ENV=production`) - Uses Redis Cloud
- ❌ **Local Development** (`NODE_ENV=development`) - Uses in-memory rate limiting (no Redis needed)

## Why This Design?

- **Cost Savings**: No Redis charges during local development
- **Simplicity**: No need to set up Redis locally
- **Performance**: In-memory is faster for local development
- **Production Ready**: Redis Cloud provides distributed rate limiting in production

## Setting Up Redis Cloud for Production

### Step 1: Get Redis Cloud Account

1. Sign up at [Redis Cloud](https://redis.com/try-free/)
2. Create a free database (30MB free tier)
3. Note your connection details

### Step 2: Get Connection Details

You'll receive connection details in one of these formats:

**Option A: Redis URL (Recommended)**
```
redis://default:YOUR_PASSWORD@redis-12345.c1.us-east-1.redislabs.com:12345
```

**Option B: Individual Parameters**
- Host: `redis-12345.c1.us-east-1.redislabs.com`
- Port: `12345`
- Password: `YOUR_PASSWORD`

### Step 3: Add to AWS Secrets Manager

Add Redis configuration to your production secrets:

```bash
# Using the setup script
./scripts/setup-secrets.sh prod

# Or manually via AWS CLI
aws secretsmanager put-secret-value \
  --secret-id "portfolio/prod/app-secrets" \
  --secret-string '{
    "REDIS_URL": "redis://default:password@host:port",
    ...
  }' \
  --region us-east-1
```

### Step 4: Update ECS Task Definition

Make sure your ECS task definition includes Redis environment variables:

```hcl
# In terraform/modules/ecs/main.tf
environment = [
  {
    name  = "NODE_ENV"
    value = "production"
  },
  {
    name  = "REDIS_URL"
    valueFrom = "${var.app_secrets_arn}:REDIS_URL::"
  }
]
```

## Local Development

### Docker Setup

When running `npm run setup:docker`:

- ✅ PostgreSQL starts automatically
- ❌ Redis is **not** started (commented out in docker-compose.yml)
- ✅ App uses in-memory rate limiting

### Native Setup

When running `npm run setup:native`:

- ✅ Uses your local PostgreSQL
- ❌ Redis not needed
- ✅ App uses in-memory rate limiting

### Environment Variables

Your `.env.local` should **not** include Redis variables:

```env
# .env.local (local development)
NODE_ENV="development"
# No REDIS_URL needed - app uses in-memory rate limiting
```

## Testing Redis Connection

### Production Health Check

Once deployed, check Redis health:

```bash
curl https://your-domain.com/api/health/redis
```

Response:
```json
{
  "redis": "connected",
  "timestamp": "2025-01-01T00:00:00.000Z"
}
```

### Local Development

Redis health check will return:
```json
{
  "redis": "disconnected",
  "timestamp": "2025-01-01T00:00:00.000Z"
}
```

This is **expected** - Redis is not used in development.

## Rate Limiting Behavior

### Production (with Redis Cloud)
- ✅ Distributed rate limiting across all ECS tasks
- ✅ Persistent across container restarts
- ✅ Accurate rate limits in multi-instance deployments

### Local Development (in-memory)
- ✅ Fast and simple
- ✅ No external dependencies
- ⚠️ Rate limits reset on server restart
- ⚠️ Not shared across multiple dev servers (if running multiple)

## Troubleshooting

### "Redis not configured" in Production

1. Check `NODE_ENV=production` is set in ECS task definition
2. Verify Redis secrets are in AWS Secrets Manager
3. Check ECS task logs for connection errors
4. Verify Redis Cloud database is active

### Redis Connection Errors in Production

1. Check Redis Cloud dashboard - is database active?
2. Verify credentials in Secrets Manager
3. Check security groups allow outbound connections
4. Test connection from your local machine:
   ```bash
   redis-cli -h your-redis-host -p your-port -a your-password ping
   ```

### Want to Test Redis Locally?

If you really need to test Redis locally (not recommended):

1. Uncomment Redis service in `docker-compose.yml`
2. Set `REDIS_URL="redis://localhost:6379"` in `.env.local`
3. Set `NODE_ENV="production"` (temporarily)
4. **Remember to revert** before committing!

## Cost Considerations

- **Free Tier**: 30MB Redis Cloud (sufficient for rate limiting)
- **Local Development**: $0 (uses in-memory)
- **Production**: Free tier or paid plan based on usage

## Migration from Upstash

If you were using Upstash before:

1. ✅ Code already migrated to Redis Cloud
2. ✅ Remove `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` from secrets
3. ✅ Add `REDIS_URL` or `REDIS_HOST`/`REDIS_PORT`/`REDIS_PASSWORD` to secrets
4. ✅ Update ECS task definition to use new environment variables

---

**Remember**: Redis is **only** used in production. Local development uses in-memory rate limiting automatically! 🎉

