/**
 * What happened to the emails of one newsletter, counted from its send records.
 *
 *  - accepted:   Resend took the email.
 *  - failed:     Resend refused it straight away (for example a malformed address).
 *  - bounced:    it was sent but could not be delivered (the address is wrong or gone).
 *  - delivered:  it reached the inbox.
 *  - opened:     the picture Resend adds was loaded, so it counts as read.
 *  - notOpened:  delivered but not opened (yet).
 *  - waiting:    accepted, with no word yet.
 * "Opened" is an estimate: mail apps that block pictures hide real reads, and some (Apple
 * Mail) load them automatically, which counts as a read when nobody looked.
 */
export interface SendRecord {
  status: string;
  deliveredAt: Date | null;
  openedAt: Date | null;
  bouncedAt: Date | null;
  complainedAt: Date | null;
}

export interface NewsletterStats {
  total: number;
  accepted: number;
  failed: number;
  delivered: number;
  opened: number;
  notOpened: number;
  bounced: number;
  complained: number;
  waiting: number;
}

export type DeliveryState =
  | "failed"
  | "bounced"
  | "opened"
  | "delivered"
  | "waiting";

/** The one word that best describes where an email got to. */
export function stateOf(r: SendRecord): DeliveryState {
  if (r.status === "failed") return "failed";
  if (r.bouncedAt) return "bounced";
  if (r.openedAt) return "opened";
  if (r.deliveredAt) return "delivered";
  return "waiting";
}

export function summarize(records: SendRecord[]): NewsletterStats {
  const stats: NewsletterStats = {
    total: records.length,
    accepted: 0,
    failed: 0,
    delivered: 0,
    opened: 0,
    notOpened: 0,
    bounced: 0,
    complained: 0,
    waiting: 0,
  };
  for (const r of records) {
    const state = stateOf(r);
    if (r.status === "sent") stats.accepted++;
    if (state === "failed") stats.failed++;
    if (state === "bounced") stats.bounced++;
    if (state === "waiting") stats.waiting++;
    if (state === "opened" || state === "delivered") stats.delivered++;
    if (state === "opened") stats.opened++;
    if (state === "delivered") stats.notOpened++;
    if (r.complainedAt) stats.complained++;
  }
  return stats;
}
