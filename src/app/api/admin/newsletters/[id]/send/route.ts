export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { secureAdminRoute, handleError } from "@/lib/api-security";
import { isSending, runSend, sendTest } from "@/lib/newsletter-send";
import { getClientIp } from "@/lib/client-ip";

const bodySchema = z.union([
  z.object({ test: z.literal(true) }),
  z.object({ subscriberIds: z.array(z.string().min(1)).min(1).max(5000) }),
]);

async function postHandler(
  request: NextRequest,
  user: { id: string; email: string; role: string },
  id: string,
) {
  try {
    const body = bodySchema.parse(await request.json());
    const newsletter = await db.newsletter.findUnique({ where: { id } });
    if (!newsletter)
      return NextResponse.json(
        { error: "Newsletter not found" },
        { status: 404 },
      );
    if (!newsletter.subject.trim() || !newsletter.content.trim()) {
      return NextResponse.json(
        { error: "Add a subject and a message first." },
        { status: 400 },
      );
    }

    if ("test" in body) {
      try {
        await sendTest(newsletter, user.email);
      } catch (e) {
        // The reason (for example "API key is invalid") helps more than a generic message.
        const reason = e instanceof Error ? e.message : "unknown error";
        return NextResponse.json(
          { error: `The test could not be sent: ${reason}` },
          { status: 502 },
        );
      }
      return NextResponse.json({ ok: true, to: user.email });
    }

    if (newsletter.status === "sending" || isSending(id)) {
      return NextResponse.json(
        { error: "This newsletter is already being sent." },
        { status: 409 },
      );
    }

    // Only people who are still subscribed and have not had this issue yet.
    const wanted = Array.from(new Set(body.subscriberIds));
    const [active, already] = await Promise.all([
      db.newsletterSubscriber.findMany({
        where: { id: { in: wanted }, isSubscribed: true, isDeleted: false },
        select: {
          id: true,
          email: true,
          name: true,
          unsubscribeToken: true,
          unsubscribeTokenExpiresAt: true,
        },
      }),
      db.newsletterSend.findMany({
        where: {
          newsletterId: id,
          status: "sent",
          subscriberId: { in: wanted },
        },
        select: { subscriberId: true },
      }),
    ]);
    const received = new Set(already.map((a) => a.subscriberId));
    const recipients = active.filter((s) => !received.has(s.id));
    if (recipients.length === 0) {
      return NextResponse.json(
        {
          error:
            "No one to send to: they have all received it or have unsubscribed.",
        },
        { status: 400 },
      );
    }

    console.log("AUDIT:", {
      userId: user.id,
      userEmail: user.email,
      action: "newsletter_send_started",
      resourceType: "Newsletter",
      resourceId: id,
      details: {
        recipientCount: recipients.length,
        subject: newsletter.subject,
      },
      ipAddress: getClientIp(request.headers),
      userAgent: request.headers.get("user-agent") || null,
      timestamp: new Date().toISOString(),
    });

    // Mark it as sending before replying, so the screen sees it straight away.
    await db.newsletter.update({ where: { id }, data: { status: "sending" } });
    // Carry on in the background; progress is read from /api/admin/newsletters/[id].
    void runSend(id, recipients).catch((e) =>
      console.error("Newsletter send failed:", e),
    );

    return NextResponse.json(
      { queued: recipients.length, skipped: wanted.length - recipients.length },
      { status: 202 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Choose who to send it to." },
        { status: 400 },
      );
    }
    return handleError(error, "Failed to send the newsletter");
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return secureAdminRoute((req, user) => postHandler(req, user, id))(request);
}
