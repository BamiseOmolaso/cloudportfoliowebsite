import { createClient, RedisClientType } from 'redis';

// Redis Cloud connection
let redis: RedisClientType | null = null;

export function getRedisClient(): RedisClientType | null {
  // Only use Redis in production to avoid unnecessary fees in local development
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (!isProduction) {
    return null; // Always use in-memory for local development
  }

  // If already connected, return existing client
  if (redis) {
    return redis;
  }

  // Check if Redis is configured
  const redisUrl = process.env.REDIS_URL;
  const redisHost = process.env.REDIS_HOST;
  const redisPort = process.env.REDIS_PORT;
  const redisPassword = process.env.REDIS_PASSWORD;

  if (!redisUrl && (!redisHost || !redisPort)) {
    console.log('📝 Redis not configured, using in-memory rate limiting');
    return null;
  }

  try {
    // Parse Redis URL (format: redis://default:password@host:port or rediss:// for TLS)
    if (redisUrl && (redisUrl.startsWith('redis://') || redisUrl.startsWith('rediss://'))) {
      redis = createClient({
        url: redisUrl,
      }) as RedisClientType;
    } else if (redisHost && redisPort) {
      // Use individual connection params (Redis Cloud format)
      const port = parseInt(redisPort);
      const useTls = port === 6380 || port === 18793; // Common TLS ports
      
      if (useTls) {
        redis = createClient({
          username: 'default',
          password: redisPassword,
          socket: {
            host: redisHost,
            port: port,
            tls: true,
          },
        }) as RedisClientType;
      } else {
        redis = createClient({
          username: 'default',
          password: redisPassword,
          socket: {
            host: redisHost,
            port: port,
          },
        }) as RedisClientType;
      }
    } else {
      console.log('📝 Redis configuration incomplete, using in-memory rate limiting');
      return null;
    }

    redis.on('error', (err) => {
      console.error('Redis connection error:', err);
    });

    redis.on('connect', () => {
      console.log('✅ Connected to Redis Cloud');
    });

    redis.on('ready', () => {
      console.log('✅ Redis client ready');
    });

    // Connect immediately
    redis.connect().catch((err) => {
      console.error('Failed to connect to Redis:', err);
      redis = null;
    });

    return redis;
  } catch (error) {
    console.error('Failed to initialize Redis client:', error);
    return null;
  }
}

// Graceful shutdown
export async function disconnectRedis() {
  if (redis) {
    await redis.quit();
    redis = null;
  }
}

// Health check
export async function checkRedisHealth(): Promise<boolean> {
  const client = getRedisClient();
  if (!client) return false;

  try {
    // Check if client is connected
    if (!client.isOpen) {
      await client.connect();
    }
    const result = await client.ping();
    return result === 'PONG';
  } catch (error) {
    console.error('Redis health check failed:', error);
    return false;
  }
}

