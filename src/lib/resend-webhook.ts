import { createHmac, timingSafeEqual } from "node:crypto";
import { db } from "@/lib/db";

/**
 * Resend tells us what happened to each email (delivered, opened, bounced, reported as
 * spam) by calling a web address with a signed message. Resend signs with the Svix
 * scheme: HMAC-SHA256 over "<id>.<timestamp>.<body>" using the webhook secret.
 */

const TOLERANCE_SECONDS = 5 * 60;

export function verifySignature(
  secret: string,
  headers: {
    id: string | null;
    timestamp: string | null;
    signature: string | null;
  },
  body: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): boolean {
  const { id, timestamp, signature } = headers;
  if (!id || !timestamp || !signature) return false;
  const ts = Number(timestamp);
  // Refuse old messages, so a captured one cannot be replayed later.
  if (!Number.isFinite(ts) || Math.abs(nowSeconds - ts) > TOLERANCE_SECONDS)
    return false;

  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const expected = createHmac("sha256", key)
    .update(`${id}.${timestamp}.${body}`)
    .digest();
  // The header can hold several "v1,<base64>" signatures separated by spaces.
  return signature.split(" ").some((part) => {
    const [version, value] = part.split(",");
    if (version !== "v1" || !value) return false;
    const given = Buffer.from(value, "base64");
    return given.length === expected.length && timingSafeEqual(given, expected);
  });
}

export interface ResendEvent {
  type: string;
  created_at?: string;
  data?: {
    email_id?: string;
    bounce?: { type?: string; subType?: string; message?: string };
  };
}

/**
 * Record one event against the newsletter email it is about. Events for other emails
 * (the contact form, welcome emails) are ignored. A repeated event never overwrites an
 * earlier time. Returns what was done, for the logs.
 */
export async function applyEvent(event: ResendEvent): Promise<string> {
  const emailId = event.data?.email_id;
  if (!emailId) return "ignored: no email id";

  const send = await db.newsletterSend.findFirst({
    where: { resendId: emailId },
    select: {
      id: true,
      subscriberId: true,
      deliveredAt: true,
      openedAt: true,
      bouncedAt: true,
      complainedAt: true,
    },
  });
  if (!send) return "ignored: not a newsletter email";

  const at = event.created_at ? new Date(event.created_at) : new Date();
  const when = Number.isNaN(at.getTime()) ? new Date() : at;

  switch (event.type) {
    case "email.delivered":
      if (!send.deliveredAt)
        await db.newsletterSend.update({
          where: { id: send.id },
          data: { deliveredAt: when },
        });
      return "delivered";
    case "email.opened":
      if (!send.openedAt)
        await db.newsletterSend.update({
          where: { id: send.id },
          data: { openedAt: when },
        });
      return "opened";
    case "email.bounced": {
      const bounce = event.data?.bounce;
      const reason =
        [bounce?.type, bounce?.subType, bounce?.message]
          .filter(Boolean)
          .join(": ") || "Bounced";
      if (!send.bouncedAt) {
        await db.newsletterSend.update({
          where: { id: send.id },
          data: { bouncedAt: when, bounceReason: reason },
        });
      }
      // A permanent bounce means the address does not exist: stop writing to it.
      if (bounce?.type === "Permanent") {
        await db.newsletterSubscriber.update({
          where: { id: send.subscriberId },
          data: {
            isSubscribed: false,
            unsubscribedAt: new Date(),
            unsubscribeReason: "bounced",
          },
        });
      }
      return "bounced";
    }
    case "email.complained":
      if (!send.complainedAt)
        await db.newsletterSend.update({
          where: { id: send.id },
          data: { complainedAt: when },
        });
      // Someone marked it as spam: never email them again.
      await db.newsletterSubscriber.update({
        where: { id: send.subscriberId },
        data: {
          isSubscribed: false,
          unsubscribedAt: new Date(),
          unsubscribeReason: "complained",
        },
      });
      return "complained";
    default:
      return `ignored: ${event.type}`;
  }
}
