// Tell Next.js this route is dynamic and should not be pre-rendered
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resend } from "@/lib/resend";
import { convert } from "html-to-text";
import { sanitizeHtmlServer } from "@/lib/sanitize-server";
import { withRateLimit, apiLimiter } from "@/lib/rate-limit";
import { randomBytes } from "crypto";

// Secure HTML sanitization and text conversion utility
const sanitizeAndConvertToText = (dirtyHtml: string): string => {
  // Step 1: Sanitize HTML (server-safe)
  const cleanHtml = sanitizeHtmlServer(dirtyHtml);

  // Step 2: Convert to plain text
  const plainText = convert(cleanHtml, {
    wordwrap: 130,
    selectors: [
      { selector: "a", options: { hideLinkHrefIfSameAsText: true } },
      { selector: "img", format: "skip" },
    ],
  });

  // Step 3: Verify no HTML tags remain
  if (/<[a-z][\s\S]*>/i.test(plainText)) {
    throw new Error("Security: HTML tags detected in plaintext output");
  }

  return plainText;
};

export const POST = withRateLimit(
  apiLimiter,
  "newsletter-send",
  async (request: Request) => {
    try {
      const { newsletterId } = await request.json();

      if (!newsletterId) {
        return NextResponse.json(
          { error: "Newsletter ID is required" },
          { status: 400 },
        );
      }

      // Get newsletter content
      const newsletter = await db.newsletter.findUnique({
        where: { id: newsletterId },
      });

      if (!newsletter) {
        return NextResponse.json(
          { error: "Newsletter not found" },
          { status: 404 },
        );
      }

      // Get subscribers
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

      // Sanitize HTML content (server-safe)
      const sanitizedHtml = sanitizeHtmlServer(newsletter.content);

      // Create plain text version using the secure utility
      const plainText = sanitizeAndConvertToText(sanitizedHtml);

      // Send emails to subscribers
      const emailPromises = subscribers.map(
        async (subscriber: (typeof subscribers)[0]) => {
          let unsubscribeToken = subscriber.unsubscribeToken;

          // Generate unsubscribe token if not exists or expired
          if (
            !unsubscribeToken ||
            (subscriber.unsubscribeTokenExpiresAt &&
              subscriber.unsubscribeTokenExpiresAt < new Date())
          ) {
            unsubscribeToken = randomBytes(32).toString("hex");
            const tokenExpiresAt = new Date();
            tokenExpiresAt.setDate(tokenExpiresAt.getDate() + 30); // Token expires in 30 days

            await db.newsletterSubscriber.update({
              where: { id: subscriber.id },
              data: {
                unsubscribeToken,
                unsubscribeTokenExpiresAt: tokenExpiresAt,
              },
            });
          }

          const baseUrl =
            process.env.NEXT_PUBLIC_BASE_URL ||
            process.env.NEXT_PUBLIC_SITE_URL ||
            "http://localhost:3000";
          const unsubscribeLink = `${baseUrl}/unsubscribe?token=${unsubscribeToken}`;
          const personalizedContent = sanitizedHtml.replace(
            /{name}/g,
            subscriber.name || "there",
          );

          // Add unsubscribe link to the email content
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

            // Create send record
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

            // Create failed send record
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

      // Update newsletter status
      await db.newsletter.update({
        where: { id: newsletterId },
        data: {
          status: "sent",
          sentAt: new Date(),
        },
      });

      return NextResponse.json({ message: "Newsletter sent successfully" });
    } catch (error) {
      console.error("Error sending newsletter:", error);
      return NextResponse.json(
        { error: "Failed to send newsletter" },
        { status: 500 },
      );
    }
  },
);
