import { checkRedisHealth } from '@/lib/redis-client';

export async function GET() {
  const isHealthy = await checkRedisHealth();

  return Response.json(
    {
      redis: isHealthy ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString(),
    },
    { status: isHealthy ? 200 : 503 }
  );
}

