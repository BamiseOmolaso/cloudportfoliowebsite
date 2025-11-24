import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { value, url } = await request.json();

    if (typeof value !== 'number' || !url) {
      return NextResponse.json(
        { error: 'Invalid request: value must be a number and url is required' },
        { status: 400 }
      );
    }

    // Store LCP metric in database using Prisma
    await db.lcpMetric.create({
      data: {
        url: url,
        value: value,
        timestamp: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error('Error processing LCP metric:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
