import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { sendAdminNotification, sendWelcomeEmail } from "@/lib/resend";
import { apiLimiter, withRateLimit } from "@/lib/rate-limit";
import { hashToken } from "@/lib/subscription";
import { getClientIp } from "@/lib/client-ip";

export const dynamic = "force-dynamic";

/**
 * The last step of double opt-in: the person pressed "Confirm my subscription" on the page
 * the emailed link opens. A POST (not a plain link) so that mail scanners which open every
 * link in a message cannot subscribe anyone by accident.
 */
export const POST = withRateLimit(
  apiLimiter,
  "newsletter-confirm",
  async (request) => {
    let token: unknown;
    try {
      ({ token } = await request.json());
    } catch {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    if (typeof token !== "string" || token.length < 20 || token.length > 200) {
      return NextResponse.json(
        { error: "This confirmation link is not valid." },
        { status: 400 },
      );
    }

    const subscriber = await db.newsletterSubscriber.findFirst({
      where: { confirmationTokenHash: hashToken(token) },
      select: {
        id: true,
        email: true,
        name: true,
        confirmedAt: true,
        confirmationExpiresAt: true,
      },
    });
    if (!subscriber) {
      // Wrong, already used, or never existed: the same answer for all three.
      return NextResponse.json(
        { error: "This confirmation link is not valid or was already used." },
        { status: 404 },
      );
    }
    if (
      !subscriber.confirmationExpiresAt ||
      subscriber.confirmationExpiresAt < new Date()
    ) {
      return NextResponse.json(
        {
          error:
            "This confirmation link has expired. Please sign up again to get a new one.",
          expired: true,
        },
        { status: 410 },
      );
    }

    // Now they are on the list. Fresh unsubscribe and preferences links go in the welcome email;
    // the unsubscribe link never expires.
    const unsubscribeToken = randomBytes(32).toString("hex");
    const preferencesToken = randomBytes(32).toString("hex");
    const preferencesExpiresAt = new Date(
      Date.now() + 30 * 24 * 60 * 60 * 1000,
    );
    const now = new Date();

    await db.newsletterSubscriber.update({
      where: { id: subscriber.id },
      data: {
        isSubscribed: true,
        confirmedAt: now,
        subscribedAt: now,
        unsubscribedAt: null,
        // Counts how many times they have joined: the first confirmation is the first time.
        ...(subscriber.confirmedAt
          ? { subscriptionCount: { increment: 1 } }
          : {}),
        confirmationTokenHash: null,
        confirmationExpiresAt: null,
        unsubscribeToken,
        unsubscribeTokenExpiresAt: null,
        preferencesToken,
        preferencesTokenExpiresAt: preferencesExpiresAt,
        updatedAt: now,
      },
    });

    await db.newsletterAuditLog.create({
      data: {
        subscriberId: subscriber.id,
        action: "subscribed",
        details: { email: subscriber.email, confirmed: true },
        ipAddress: getClientIp(request.headers),
        userAgent: request.headers.get("user-agent") || null,
      },
    });

    // The welcome email and the note to the owner are nice to have: they never undo the confirmation.
    try {
      await sendWelcomeEmail(
        subscriber.email,
        subscriber.name || "",
        unsubscribeToken,
        preferencesToken,
      );
      await sendAdminNotification(
        subscriber.email,
        subscriber.name || undefined,
      );
    } catch (emailError) {
      console.error("Error sending emails after confirmation:", emailError);
    }

    return NextResponse.json({ success: true });
  },
);
