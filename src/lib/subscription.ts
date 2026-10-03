import { createHash, randomBytes } from "node:crypto";

/**
 * Double opt-in for the newsletter. Signing up does not subscribe anyone: it emails the
 * address a link, and only clicking that link subscribes them. This stops a stranger from
 * adding (or re-adding) someone else's address.
 */

/** How long a confirmation link works. */
export const CONFIRM_TTL_MS = 48 * 60 * 60 * 1000;
/** A second sign-up for the same address within this time does not send another email. */
export const CONFIRM_COOLDOWN_MS = 5 * 60 * 1000;

/** Only a hash of the token is stored, so a copy of the database cannot confirm anyone. */
export const hashToken = (token: string): string =>
  createHash("sha256").update(token).digest("hex");

export function newConfirmation(now = new Date()): {
  token: string;
  hash: string;
  expiresAt: Date;
} {
  const token = randomBytes(32).toString("hex");
  return {
    token,
    hash: hashToken(token),
    expiresAt: new Date(now.getTime() + CONFIRM_TTL_MS),
  };
}

export type SubscriberState = "subscribed" | "pending" | "unsubscribed";

/** Where a subscriber stands: on the list, waiting to confirm, or not on the list. */
export function stateOf(row: {
  isSubscribed: boolean;
  confirmationTokenHash: string | null;
}): SubscriberState {
  if (row.isSubscribed) return "subscribed";
  return row.confirmationTokenHash ? "pending" : "unsubscribed";
}
