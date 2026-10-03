/** @jest-environment node */
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { hashToken } from "@/lib/subscription";

const findFirst = jest.fn<(...a: unknown[]) => Promise<unknown>>();
const update = jest.fn<(...a: unknown[]) => Promise<unknown>>();
const audit = jest.fn<(...a: unknown[]) => Promise<unknown>>();
const sendWelcome = jest.fn<(...a: unknown[]) => Promise<unknown>>();
const notify = jest.fn<(...a: unknown[]) => Promise<unknown>>();

jest.mock("@/lib/db", () => ({
  db: {
    newsletterSubscriber: { findFirst, update },
    newsletterAuditLog: { create: audit },
  },
}));
jest.mock("@/lib/resend", () => ({
  sendWelcomeEmail: (...a: unknown[]) => sendWelcome(...a),
  sendAdminNotification: (...a: unknown[]) => notify(...a),
}));
jest.mock("@/lib/rate-limit", () => ({
  apiLimiter: {},
  withRateLimit: (_l: unknown, _k: string, handler: unknown) => handler,
}));

let POST: (typeof import("@/app/api/newsletter/confirm/route"))["POST"];
beforeAll(async () => {
  ({ POST } = await import("@/app/api/newsletter/confirm/route"));
});
beforeEach(() => {
  jest.clearAllMocks();
  update.mockResolvedValue({});
  audit.mockResolvedValue({});
  sendWelcome.mockResolvedValue({});
  notify.mockResolvedValue({});
});

const TOKEN = "t".repeat(64);
const call = (body: unknown) =>
  (POST as unknown as (r: Request) => Promise<Response>)(
    new Request("http://x/api/newsletter/confirm", {
      method: "POST",
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );
const pending = (over = {}) => ({
  id: "s1",
  email: "ada@example.com",
  name: "Ada",
  confirmedAt: null,
  confirmationExpiresAt: new Date(Date.now() + 60_000),
  ...over,
});

describe("POST /api/newsletter/confirm", () => {
  it("subscribes the person, clears the link and sends the welcome email", async () => {
    findFirst.mockResolvedValue(pending());
    const res = await call({ token: TOKEN });
    expect(res.status).toBe(200);
    // It looks the person up by the hash of the link, never by the link itself.
    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { confirmationTokenHash: hashToken(TOKEN) },
      }),
    );
    const data = (update.mock.calls[0][0] as { data: Record<string, unknown> })
      .data;
    expect(data).toMatchObject({
      isSubscribed: true,
      unsubscribedAt: null,
      confirmationTokenHash: null,
      confirmationExpiresAt: null,
      unsubscribeTokenExpiresAt: null,
    });
    expect(data.confirmedAt).toBeInstanceOf(Date);
    expect(data.unsubscribeToken).toMatch(/^[0-9a-f]{64}$/);
    // The first confirmation is the first time they join, so the count does not go up.
    expect(data).not.toHaveProperty("subscriptionCount");
    expect(audit).toHaveBeenCalledWith({
      data: expect.objectContaining({
        subscriberId: "s1",
        action: "subscribed",
      }),
    });
    expect(sendWelcome).toHaveBeenCalledWith(
      "ada@example.com",
      "Ada",
      expect.any(String),
      expect.any(String),
    );
    expect(notify).toHaveBeenCalled();
  });

  it("counts a second joining for someone who confirmed before", async () => {
    findFirst.mockResolvedValue(
      pending({ confirmedAt: new Date("2026-01-01") }),
    );
    await call({ token: TOKEN });
    expect(
      (update.mock.calls[0][0] as { data: Record<string, unknown> }).data
        .subscriptionCount,
    ).toEqual({
      increment: 1,
    });
  });

  it("answers the same for a wrong or already-used link", async () => {
    findFirst.mockResolvedValue(null);
    const res = await call({ token: TOKEN });
    expect(res.status).toBe(404);
    expect(update).not.toHaveBeenCalled();
    expect(sendWelcome).not.toHaveBeenCalled();
  });

  it("refuses an expired link and subscribes no one", async () => {
    findFirst.mockResolvedValue(
      pending({ confirmationExpiresAt: new Date(Date.now() - 1000) }),
    );
    const res = await call({ token: TOKEN });
    expect(res.status).toBe(410);
    expect((await res.json()).expired).toBe(true);
    expect(update).not.toHaveBeenCalled();
  });

  it("rejects a missing, short, oversized or malformed token before touching the database", async () => {
    for (const body of [
      {},
      { token: "short" },
      { token: "x".repeat(500) },
      { token: 42 },
      "not json",
    ]) {
      expect((await call(body)).status).toBe(400);
    }
    expect(findFirst).not.toHaveBeenCalled();
  });

  it("stays confirmed even if the welcome email cannot be sent", async () => {
    findFirst.mockResolvedValue(pending());
    sendWelcome.mockRejectedValue(new Error("mail down"));
    const res = await call({ token: TOKEN });
    expect(res.status).toBe(200);
    expect(update).toHaveBeenCalledTimes(1);
  });
});
