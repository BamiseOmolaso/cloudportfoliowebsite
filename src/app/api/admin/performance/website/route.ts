import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
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
    console.error('Error fetching performance metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch performance metrics' },
      { status: 500 }
    );
  }
}
