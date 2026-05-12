export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resend } from "@/lib/resend";
import { convert } from "html-to-text";
import { sanitizeHtmlServer } from "@/lib/sanitize-server";
import { secureAdminRoute, handleError } from "@/lib/api-security";
import { newsletterSendSchema } from "@/lib/validation-schemas";
import { getSiteUrl } from "@/lib/site-url";
import { z } from "zod";
import { randomBytes } from "crypto";

const sanitizeAndConvertToText = (dirtyHtml: string): string => {
  const cleanHtml = sanitizeHtmlServer(dirtyHtml);

  const plainText = convert(cleanHtml, {
    wordwrap: 130,
    selectors: [
      { selector: "a", options: { hideLinkHrefIfSameAsText: true } },
      { selector: "img", format: "skip" },
    ],
  });

  if (/<[a-z][\s\S]*>/i.test(plainText)) {
    throw new Error("Security: HTML tags detected in plaintext output");
  }

  return plainText;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export const POST = secureAdminRoute(async (request: NextRequest, user) => {
  try {
    const body = await request.json();
    const { newsletterId } = newsletterSendSchema.parse(body);

    const newsletter = await db.newsletter.findUnique({
      where: { id: newsletterId },
    });

    if (!newsletter) {
      return NextResponse.json(
        { error: "Newsletter not found" },
        { status: 404 },
      );
    }

    const subscribers = await db.newsletterSubscriber.findMany({
      where: {
        isSubscribed: true,
        isDeleted: false,
      },
      select: {
        id: true,
        email: true,
        name: true,
        unsubscribeToken: true,
        unsubscribeTokenExpiresAt: true,
      },
    });

    const sanitizedHtml = sanitizeHtmlServer(newsletter.content);
    const plainText = sanitizeAndConvertToText(sanitizedHtml);

    console.log("AUDIT:", {
      userId: user.id,
      userEmail: user.email,
      action: "newsletter_send_started",
      resourceType: "Newsletter",
      resourceId: newsletter.id,
      details: {
        recipientCount: subscribers.length,
        subject: newsletter.subject,
      },
      ipAddress:
        request.headers.get("x-forwarded-for") ||
        request.headers.get("x-real-ip") ||
        null,
      userAgent: request.headers.get("user-agent") || null,
      timestamp: new Date().toISOString(),
    });

    const emailPromises = subscribers.map(
      async (subscriber: (typeof subscribers)[0]) => {
        let unsubscribeToken = subscriber.unsubscribeToken;

        if (
          !unsubscribeToken ||
          (subscriber.unsubscribeTokenExpiresAt &&
            subscriber.unsubscribeTokenExpiresAt < new Date())
        ) {
          unsubscribeToken = randomBytes(32).toString("hex");
          const tokenExpiresAt = new Date();
          tokenExpiresAt.setDate(tokenExpiresAt.getDate() + 30);

          await db.newsletterSubscriber.update({
            where: { id: subscriber.id },
            data: {
              unsubscribeToken,
              unsubscribeTokenExpiresAt: tokenExpiresAt,
            },
          });
        }

        const unsubscribeLink = `${getSiteUrl()}/unsubscribe?token=${unsubscribeToken}`;
        const safeName = escapeHtml(subscriber.name || "there");
        const personalizedContent = sanitizedHtml.replace(/{name}/g, safeName);

        const emailContent = `
        ${personalizedContent}
        <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666;">
          <p>You received this email because you subscribed to our newsletter.</p>
          <p>If you no longer wish to receive these emails, you can <a href="${unsubscribeLink}" style="color: #6c63ff;">unsubscribe here</a>.</p>
          <p style="font-size: 11px; color: #999;">This unsubscribe link will expire in 30 days for security reasons.</p>
        </div>
      `;

        try {
          const emailResult = await resend().emails.send({
            from: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
            to: subscriber.email,
            subject: newsletter.subject,
            html: emailContent,
            text:
              plainText +
              `\n\nTo unsubscribe, visit: ${unsubscribeLink}\n\nNote: This link will expire in 30 days.`,
            headers: {
              "List-Unsubscribe": `<${unsubscribeLink}>`,
              "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
            },
          });

          await db.newsletterSend.create({
            data: {
              newsletterId: newsletter.id,
              subscriberId: subscriber.id,
              status: "sent",
              sentAt: new Date(),
            },
          });

          return emailResult;
        } catch (error) {
          console.error(`Error sending email to ${subscriber.email}:`, error);

          await db.newsletterSend.create({
            data: {
              newsletterId: newsletter.id,
              subscriberId: subscriber.id,
              status: "failed",
              errorMessage:
                error instanceof Error ? error.message : "Unknown error",
              sentAt: new Date(),
            },
          });

          throw error;
        }
      },
    );

    await Promise.allSettled(emailPromises);

    await db.newsletter.update({
      where: { id: newsletterId },
      data: {
        status: "sent",
        sentAt: new Date(),
      },
    });

    return NextResponse.json({ message: "Newsletter sent successfully" });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 },
      );
    }
    return handleError(error, "Failed to send newsletter");
  }
});
