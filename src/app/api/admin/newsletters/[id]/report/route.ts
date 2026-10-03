import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { secureAdminRoute, handleError } from "@/lib/api-security";
import { stateOf, summarize } from "@/lib/newsletter-stats";

export const dynamic = "force-dynamic";

/** Who got this newsletter and what happened to each email. */
async function getHandler(id: string) {
  try {
    const newsletter = await db.newsletter.findUnique({
      where: { id },
      select: { id: true, subject: true, status: true, sentAt: true },
    });
    if (!newsletter)
      return NextResponse.json(
        { error: "Newsletter not found" },
        { status: 404 },
      );

    const sends = await db.newsletterSend.findMany({
      where: { newsletterId: id },
      orderBy: { sentAt: "desc" },
      include: { subscriber: { select: { email: true, name: true } } },
    });

    return NextResponse.json({
      id: newsletter.id,
      subject: newsletter.subject,
      status: newsletter.status,
      sent_at: newsletter.sentAt?.toISOString() ?? null,
      stats: summarize(sends),
      recipients: sends.map((s) => ({
        id: s.id,
        email: s.subscriber.email,
        name: s.subscriber.name,
        state: stateOf(s),
        reason: s.status === "failed" ? s.errorMessage : s.bounceReason,
        complained: Boolean(s.complainedAt),
        sent_at: s.sentAt.toISOString(),
        delivered_at: s.deliveredAt?.toISOString() ?? null,
        opened_at: s.openedAt?.toISOString() ?? null,
      })),
    });
  } catch (error) {
    return handleError(error, "Failed to load the report");
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return secureAdminRoute(() => getHandler(id))(request);
}
