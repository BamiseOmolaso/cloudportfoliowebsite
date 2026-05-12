import { createClient, RedisClientType } from "redis";

// Redis Cloud connection
let redis: RedisClientType | null = null;

// Socket options shared by both URL-based and host/port-based clients.
//
// - connectTimeout: fail the initial TCP+TLS handshake in 5s. Without this,
//   a dead Redis hostname (e.g. a free-tier instance that got reclaimed
//   during a long pause) would hang every rate-limited request until the
//   ALB returned 504 with an HTML body — which then breaks any client-side
//   response.json() parser. Five seconds gives the rate limiter enough time
//   to register a Redis failure and fall back to in-memory.
// - reconnectStrategy: () => false disables node-redis's automatic
//   reconnect loop. We don't want endless retries when Redis is gone; we
//   want fast, deterministic fallback to the in-memory limiter.
const REDIS_SOCKET_OPTS = {
  connectTimeout: 5000,
  reconnectStrategy: () => false as const,
};

export function getRedisClient(): RedisClientType | null {
  // Only use Redis in production to avoid unnecessary fees in local development
  const isProduction = process.env.NODE_ENV === "production";

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
    console.log("📝 Redis not configured, using in-memory rate limiting");
    return null;
  }

  try {
    // Parse Redis URL (format: redis://default:password@host:port or rediss:// for TLS)
    if (
      redisUrl &&
      (redisUrl.startsWith("redis://") || redisUrl.startsWith("rediss://"))
    ) {
      redis = createClient({
        url: redisUrl,
        socket: REDIS_SOCKET_OPTS,
      }) as RedisClientType;
    } else if (redisHost && redisPort) {
      // Use individual connection params (Redis Cloud format)
      const port = parseInt(redisPort);
      const useTls = port === 6380 || port === 18793; // Common TLS ports

      if (useTls) {
        redis = createClient({
          username: "default",
          password: redisPassword,
          socket: {
            host: redisHost,
            port: port,
            tls: true,
            ...REDIS_SOCKET_OPTS,
          },
        }) as RedisClientType;
      } else {
        redis = createClient({
          username: "default",
          password: redisPassword,
          socket: {
            host: redisHost,
            port: port,
            ...REDIS_SOCKET_OPTS,
          },
        }) as RedisClientType;
      }
    } else {
      console.log(
        "📝 Redis configuration incomplete, using in-memory rate limiting",
      );
      return null;
    }

    redis.on("error", (err) => {
      console.error("Redis connection error:", err);
    });

    redis.on("connect", () => {
      console.log("✅ Connected to Redis Cloud");
    });

    redis.on("ready", () => {
      console.log("✅ Redis client ready");
    });

    // Connect immediately
    redis.connect().catch((err) => {
      console.error("Failed to connect to Redis:", err);
      redis = null;
    });

    return redis;
  } catch (error) {
    console.error("Failed to initialize Redis client:", error);
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
    return result === "PONG";
  } catch (error) {
    console.error("Redis health check failed:", error);
    return false;
  }
}
