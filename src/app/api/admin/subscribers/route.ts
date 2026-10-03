import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { stateOf } from "@/lib/subscription";
import { secureAdminRoute, handleError } from "@/lib/api-security";

export const dynamic = "force-dynamic";

export const GET = secureAdminRoute(async (request: NextRequest) => {
  try {
    const subscribers = await db.newsletterSubscriber.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        name: true,
        isSubscribed: true,
        unsubscribeReason: true,
        unsubscribeFeedback: true,
        createdAt: true,
        subscribedAt: true,
        unsubscribedAt: true,
        confirmedAt: true,
        subscriptionCount: true,
        confirmationTokenHash: true,
        confirmationSentAt: true,
        location: true,
      },
    });

    const transformed = subscribers.map((sub: (typeof subscribers)[0]) => ({
      id: sub.id,
      email: sub.email,
      name: sub.name,
      is_subscribed: sub.isSubscribed,
      // subscribed, pending (waiting for them to confirm by email) or unsubscribed
      status: stateOf(sub),
      confirmed_at: sub.confirmedAt?.toISOString() ?? null,
      subscription_count: sub.subscriptionCount,
      confirmation_sent_at: sub.confirmationSentAt?.toISOString() ?? null,
      unsubscribe_reason: sub.unsubscribeReason,
      unsubscribe_feedback: sub.unsubscribeFeedback,
      created_at: sub.createdAt.toISOString(),
      subscribed_at: sub.subscribedAt.toISOString(),
      unsubscribed_at: sub.unsubscribedAt?.toISOString() ?? null,
      location: sub.location,
    }));

    return NextResponse.json(transformed);
  } catch (error) {
    return handleError(error, "Failed to fetch subscribers");
  }
});
