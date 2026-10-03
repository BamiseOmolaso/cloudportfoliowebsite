import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { secureAdminRoute, handleError } from "@/lib/api-security";

export const dynamic = "force-dynamic";

/**
 * People who can be chosen as recipients: everyone currently subscribed, and whether
 * they already received this issue (they cannot be sent it twice).
 */
async function getHandler(id: string) {
  try {
    const [subscribers, sends] = await Promise.all([
      db.newsletterSubscriber.findMany({
        where: { isSubscribed: true, isDeleted: false },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          email: true,
          name: true,
          location: true,
          createdAt: true,
        },
      }),
      db.newsletterSend.findMany({
        where: { newsletterId: id, status: "sent" },
        select: { subscriberId: true },
      }),
    ]);
    const received = new Set(sends.map((s) => s.subscriberId));
    return NextResponse.json(
      subscribers.map((s) => ({
        id: s.id,
        email: s.email,
        name: s.name,
        location: s.location,
        created_at: s.createdAt.toISOString(),
        already_sent: received.has(s.id),
      })),
    );
  } catch (error) {
    return handleError(error, "Failed to load recipients");
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return secureAdminRoute(() => getHandler(id))(request);
}
