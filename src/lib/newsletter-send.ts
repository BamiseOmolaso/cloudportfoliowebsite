import { randomBytes } from "node:crypto";
import { convert } from "html-to-text";
import { db } from "@/lib/db";
import { resend } from "@/lib/resend";
import { sanitizeHtmlServer } from "@/lib/sanitize-server";
import { getSiteUrl } from "@/lib/site-url";

/**
 * Sending a newsletter.
 *
 * One email per person, so each has their own unsubscribe link. Emails go out one at a
 * time with a short pause, because Resend allows only a couple of requests a second.
 * That takes a while for a long list, so the admin request returns at once and the
 * sending carries on in the server process; the admin screen watches the progress.
 *
 * Every attempt is recorded in `newsletter_sends` (one row per newsletter and person,
 * enforced by the database), which is what stops anyone getting the same issue twice.
 */

/** Resend's limit is 2 requests a second; stay safely under it. */
export const SEND_DELAY_MS = 600;

/** The first word of a name, so "Ada Obi" is greeted as "Ada". */
export const firstNameOf = (name: string | null | undefined): string =>
  (name ?? "").trim().split(/\s+/)[0] || "there";

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

/** Pictures uploaded while developing have relative addresses; an email needs full ones. */
export const absolutizeImages = (html: string, base: string) =>
  html.replace(
    /(<img\b[^>]*\bsrc=")(\/[^"]*)"/gi,
    (_m, head: string, src: string) => `${head}${base}${src}"`,
  );

export interface Recipient {
  id: string;
  email: string;
  name: string | null;
  unsubscribeToken: string | null;
}

/** The HTML and plain-text body for one recipient. */
export function buildEmail(
  content: string,
  recipient: { name: string | null },
  unsubscribeLink: string,
  base: string,
) {
  const body = absolutizeImages(sanitizeHtmlServer(content), base).replace(
    /{name}/g,
    escapeHtml(firstNameOf(recipient.name)),
  );
  const html = `${body}
<div style="margin-top:24px;padding-top:16px;border-top:1px solid #eee;font-size:12px;color:#666;">
  <p>You are receiving this because you subscribed to the newsletter at ${escapeHtml(base)}.</p>
  <p><a href="${unsubscribeLink}" style="color:#6c63ff;">Unsubscribe</a> at any time.</p>
</div>`;
  const text =
    convert(body, {
      wordwrap: 100,
      selectors: [
        { selector: "a", options: { hideLinkHrefIfSameAsText: true } },
        { selector: "img", format: "skip" },
      ],
    }) + `\n\n--\nUnsubscribe: ${unsubscribeLink}`;
  return { html, text };
}

/** A subscriber's unsubscribe token, created if they do not have one. Links never expire. */
async function tokenFor(recipient: Recipient): Promise<string> {
  if (recipient.unsubscribeToken) return recipient.unsubscribeToken;
  const token = randomBytes(32).toString("hex");
  await db.newsletterSubscriber.update({
    where: { id: recipient.id },
    data: { unsubscribeToken: token, unsubscribeTokenExpiresAt: null },
  });
  return token;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Sender = (message: {
  from: string;
  to: string;
  subject: string;
  html: string;
  text: string;
  headers?: Record<string, string>;
}) => Promise<{ id?: string | null; error: { message: string } | null }>;

const defaultSender: Sender = async (message) => {
  const { data, error } = await resend().emails.send(message);
  return { id: data?.id ?? null, error };
};

const from = () => process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

/** Newsletters being sent by this process right now. */
const inFlight = new Set<string>();

/** Send a one-off copy to the admin to check how it looks. Nothing is recorded. */
export async function sendTest(
  newsletter: { subject: string; content: string },
  to: string,
  send: Sender = defaultSender,
): Promise<void> {
  const base = getSiteUrl();
  const { html, text } = buildEmail(
    newsletter.content,
    { name: "there" },
    `${base}/unsubscribe`,
    base,
  );
  const { error } = await send({
    from: from(),
    to,
    subject: `[Test] ${newsletter.subject}`,
    html,
    text,
  });
  if (error) throw new Error(error.message);
}

export interface SendOptions {
  send?: Sender;
  delayMs?: number;
}

/**
 * Send to the given people, skipping anyone who already received this issue or is no
 * longer subscribed. Resolves when finished; the caller does not have to wait for it.
 */
export async function runSend(
  newsletterId: string,
  recipients: Recipient[],
  { send = defaultSender, delayMs = SEND_DELAY_MS }: SendOptions = {},
): Promise<{ sent: number; failed: number }> {
  const newsletter = await db.newsletter.findUnique({
    where: { id: newsletterId },
  });
  if (!newsletter) throw new Error("Newsletter not found");

  inFlight.add(newsletterId);
  await db.newsletter.update({
    where: { id: newsletterId },
    data: { status: "sending" },
  });

  const base = getSiteUrl();
  let sent = 0;
  let failed = 0;

  try {
    for (let i = 0; i < recipients.length; i++) {
      const recipient = recipients[i];
      let status: "sent" | "failed" = "sent";
      let errorMessage: string | null = null;
      let resendId: string | null = null;
      try {
        const link = `${base}/unsubscribe?token=${await tokenFor(recipient)}`;
        const { html, text } = buildEmail(
          newsletter.content,
          recipient,
          link,
          base,
        );
        const { id, error } = await send({
          from: from(),
          to: recipient.email,
          subject: newsletter.subject,
          html,
          text,
          headers: {
            "List-Unsubscribe": `<${link}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          },
        });
        if (error) throw new Error(error.message);
        resendId = id ?? null;
      } catch (e) {
        status = "failed";
        errorMessage = e instanceof Error ? e.message : "Unknown error";
        console.error(
          `Newsletter ${newsletterId}: could not send to ${recipient.email}:`,
          errorMessage,
        );
      }

      await db.newsletterSend.upsert({
        where: {
          newsletterId_subscriberId: {
            newsletterId,
            subscriberId: recipient.id,
          },
        },
        // A retry starts the delivery record afresh.
        update: {
          status,
          errorMessage,
          resendId,
          sentAt: new Date(),
          deliveredAt: null,
          openedAt: null,
          bouncedAt: null,
          bounceReason: null,
          complainedAt: null,
        },
        create: {
          newsletterId,
          subscriberId: recipient.id,
          status,
          errorMessage,
          resendId,
          sentAt: new Date(),
        },
      });
      if (status === "sent") sent++;
      else failed++;
      if (i < recipients.length - 1) await sleep(delayMs);
    }
  } finally {
    inFlight.delete(newsletterId);
    // "sent" once anyone has received it; otherwise back to a draft so it can be retried.
    const delivered = await db.newsletterSend.count({
      where: { newsletterId, status: "sent" },
    });
    await db.newsletter.update({
      where: { id: newsletterId },
      data:
        delivered > 0
          ? { status: "sent", sentAt: new Date() }
          : { status: "draft" },
    });
  }
  return { sent, failed };
}

export const isSending = (newsletterId: string) => inFlight.has(newsletterId);
