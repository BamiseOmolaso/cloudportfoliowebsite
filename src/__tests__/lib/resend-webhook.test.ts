/** @jest-environment node */
import { createHmac } from "node:crypto";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const find = jest.fn<(...a: unknown[]) => Promise<unknown>>();
const update = jest.fn<(...a: unknown[]) => Promise<unknown>>();
const subUpdate = jest.fn<(...a: unknown[]) => Promise<unknown>>();

jest.mock("@/lib/db", () => ({
  db: {
    newsletterSend: { findFirst: find, update },
    newsletterSubscriber: { update: subUpdate },
  },
}));

type Mod = typeof import("@/lib/resend-webhook");
let verifySignature: Mod["verifySignature"];
let applyEvent: Mod["applyEvent"];
beforeAll(async () => {
  ({ verifySignature, applyEvent } = await import("@/lib/resend-webhook"));
});
beforeEach(() => {
  jest.clearAllMocks();
  update.mockResolvedValue({});
  subUpdate.mockResolvedValue({});
});

const KEY = Buffer.from("super-secret-key-bytes");
const SECRET = `whsec_${KEY.toString("base64")}`;
const NOW = 1_800_000_000;
const sign = (id: string, ts: number, body: string) =>
  `v1,${createHmac("sha256", KEY).update(`${id}.${ts}.${body}`).digest("base64")}`;

describe("verifySignature", () => {
  const body = '{"type":"email.delivered"}';
  const headers = (over = {}) => ({
    id: "msg_1",
    timestamp: String(NOW),
    signature: sign("msg_1", NOW, body),
    ...over,
  });

  it("accepts a correctly signed, recent message", () => {
    expect(verifySignature(SECRET, headers(), body, NOW)).toBe(true);
  });

  it("accepts when one of several signatures matches", () => {
    const sig = `v1,AAAA ${sign("msg_1", NOW, body)}`;
    expect(
      verifySignature(SECRET, headers({ signature: sig }), body, NOW),
    ).toBe(true);
  });

  it("rejects a changed body, a wrong secret, or a missing header", () => {
    expect(verifySignature(SECRET, headers(), body + " ", NOW)).toBe(false);
    expect(
      verifySignature(
        `whsec_${Buffer.from("other").toString("base64")}`,
        headers(),
        body,
        NOW,
      ),
    ).toBe(false);
    expect(
      verifySignature(SECRET, headers({ signature: null }), body, NOW),
    ).toBe(false);
    expect(verifySignature(SECRET, headers({ id: null }), body, NOW)).toBe(
      false,
    );
  });

  it("rejects an old message, so a captured one cannot be replayed", () => {
    expect(verifySignature(SECRET, headers(), body, NOW + 10 * 60)).toBe(false);
    expect(
      verifySignature(SECRET, headers({ timestamp: "abc" }), body, NOW),
    ).toBe(false);
  });

  it("rejects a signature of the wrong version or length", () => {
    expect(
      verifySignature(SECRET, headers({ signature: "v2,abc" }), body, NOW),
    ).toBe(false);
    expect(
      verifySignature(SECRET, headers({ signature: "v1,abc" }), body, NOW),
    ).toBe(false);
  });
});

describe("applyEvent", () => {
  const send = {
    id: "row1",
    subscriberId: "sub1",
    deliveredAt: null,
    openedAt: null,
    bouncedAt: null,
    complainedAt: null,
  };
  const ev = (type: string, extra = {}) => ({
    type,
    created_at: "2026-10-03T12:00:00.000Z",
    data: { email_id: "re_123", ...extra },
  });

  it("ignores emails that are not newsletters", async () => {
    find.mockResolvedValue(null);
    expect(await applyEvent(ev("email.delivered"))).toMatch(/not a newsletter/);
    expect(update).not.toHaveBeenCalled();
    expect(await applyEvent({ type: "email.delivered" })).toMatch(
      /no email id/,
    );
  });

  it("records delivered and opened times, once", async () => {
    find.mockResolvedValue(send);
    await applyEvent(ev("email.delivered"));
    expect(update).toHaveBeenCalledWith({
      where: { id: "row1" },
      data: { deliveredAt: new Date("2026-10-03T12:00:00Z") },
    });
    await applyEvent(ev("email.opened"));
    expect(update).toHaveBeenLastCalledWith({
      where: { id: "row1" },
      data: { openedAt: new Date("2026-10-03T12:00:00Z") },
    });

    update.mockClear();
    find.mockResolvedValue({
      ...send,
      deliveredAt: new Date(),
      openedAt: new Date(),
    });
    await applyEvent(ev("email.delivered"));
    await applyEvent(ev("email.opened"));
    expect(update).not.toHaveBeenCalled();
  });

  it("records a permanent bounce and stops emailing that address", async () => {
    find.mockResolvedValue(send);
    await applyEvent(
      ev("email.bounced", {
        bounce: {
          type: "Permanent",
          subType: "General",
          message: "No such user",
        },
      }),
    );
    expect(update).toHaveBeenCalledWith({
      where: { id: "row1" },
      data: {
        bouncedAt: expect.any(Date),
        bounceReason: "Permanent: General: No such user",
      },
    });
    expect(subUpdate).toHaveBeenCalledWith({
      where: { id: "sub1" },
      data: { isSubscribed: false, unsubscribeReason: "bounced" },
    });
  });

  it("keeps the address subscribed after a temporary bounce", async () => {
    find.mockResolvedValue(send);
    await applyEvent(
      ev("email.bounced", {
        bounce: { type: "Transient", message: "Mailbox full" },
      }),
    );
    expect(update).toHaveBeenCalled();
    expect(subUpdate).not.toHaveBeenCalled();
  });

  it("unsubscribes someone who reports it as spam", async () => {
    find.mockResolvedValue(send);
    await applyEvent(ev("email.complained"));
    expect(subUpdate).toHaveBeenCalledWith({
      where: { id: "sub1" },
      data: { isSubscribed: false, unsubscribeReason: "complained" },
    });
  });

  it("ignores event types it does not track", async () => {
    find.mockResolvedValue(send);
    expect(await applyEvent(ev("email.clicked"))).toMatch(/ignored/);
    expect(update).not.toHaveBeenCalled();
  });
});
