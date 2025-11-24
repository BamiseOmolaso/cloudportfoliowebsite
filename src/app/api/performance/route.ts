import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const metrics = await request.json();
    const referer = request.headers.get('referer') || request.headers.get('referrer') || 'unknown';

    // Store metrics in database using Prisma
    await db.performanceMetric.create({
      data: {
        url: referer,
        metrics: metrics,
        timestamp: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error('Error processing performance metrics:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
