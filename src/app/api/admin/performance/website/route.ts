import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { secureAdminRoute, handleError } from '@/lib/api-security';

export const dynamic = 'force-dynamic';

export const GET = secureAdminRoute(async (request: NextRequest) => {
  try {
    const metrics = await db.performanceMetric.findMany({
      orderBy: { timestamp: 'desc' },
      take: 1000, // Limit to recent metrics
      select: {
        id: true,
        url: true,
        metrics: true,
        timestamp: true,
      },
    });

    const transformed = metrics.map(metric => ({
      id: metric.id,
      url: metric.url,
      metrics: metric.metrics,
      timestamp: metric.timestamp.toISOString(),
    }));

    return NextResponse.json(transformed);
  } catch (error) {
    return handleError(error, 'Failed to fetch performance metrics');
  }
});
