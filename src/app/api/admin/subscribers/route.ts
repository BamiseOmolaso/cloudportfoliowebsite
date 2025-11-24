import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { secureAdminRoute, handleError } from '@/lib/api-security';

export const dynamic = 'force-dynamic';

export const GET = secureAdminRoute(async (request: NextRequest) => {
  try {
    const subscribers = await db.newsletterSubscriber.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        name: true,
        isSubscribed: true,
        unsubscribeReason: true,
        unsubscribeFeedback: true,
        createdAt: true,
        location: true,
      },
    });

    const transformed = subscribers.map(sub => ({
      id: sub.id,
      email: sub.email,
      name: sub.name,
      is_subscribed: sub.isSubscribed,
      unsubscribe_reason: sub.unsubscribeReason,
      unsubscribe_feedback: sub.unsubscribeFeedback,
      created_at: sub.createdAt.toISOString(),
      location: sub.location,
    }));

    return NextResponse.json(transformed);
  } catch (error) {
    return handleError(error, 'Failed to fetch subscribers');
  }
});
