import {
  CONFIRM_COOLDOWN_MS,
  CONFIRM_TTL_MS,
  hashToken,
  newConfirmation,
  stateOf,
} from "@/lib/subscription";

describe("newConfirmation", () => {
  it("makes an unguessable token and stores only its hash", () => {
    const a = newConfirmation();
    expect(a.token).toMatch(/^[0-9a-f]{64}$/);
    expect(a.hash).toBe(hashToken(a.token));
    expect(a.hash).not.toContain(a.token);
    expect(newConfirmation().token).not.toBe(a.token);
  });

  it("expires after 48 hours", () => {
    const now = new Date("2026-10-03T12:00:00Z");
    expect(newConfirmation(now).expiresAt.getTime() - now.getTime()).toBe(
      CONFIRM_TTL_MS,
    );
    expect(CONFIRM_TTL_MS).toBe(48 * 60 * 60 * 1000);
  });

  it("waits a few minutes before sending a second email", () => {
    expect(CONFIRM_COOLDOWN_MS).toBe(5 * 60 * 1000);
  });
});

describe("hashToken", () => {
  it("is stable, and different for different tokens", () => {
    expect(hashToken("abc")).toBe(hashToken("abc"));
    expect(hashToken("abc")).not.toBe(hashToken("abd"));
    expect(hashToken("abc")).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("stateOf", () => {
  it("tells subscribed, pending and unsubscribed apart", () => {
    expect(stateOf({ isSubscribed: true, confirmationTokenHash: null })).toBe(
      "subscribed",
    );
    expect(stateOf({ isSubscribed: false, confirmationTokenHash: "h" })).toBe(
      "pending",
    );
    expect(stateOf({ isSubscribed: false, confirmationTokenHash: null })).toBe(
      "unsubscribed",
    );
  });

  it("counts someone as subscribed even if an old link is still stored", () => {
    expect(stateOf({ isSubscribed: true, confirmationTokenHash: "h" })).toBe(
      "subscribed",
    );
  });
});
