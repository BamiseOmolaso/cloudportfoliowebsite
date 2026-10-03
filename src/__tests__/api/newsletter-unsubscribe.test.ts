/** @jest-environment node */
import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const findFirst = jest.fn<(...a: unknown[]) => Promise<unknown>>();
const update = jest.fn<(...a: unknown[]) => Promise<unknown>>();
const audit = jest.fn<(...a: unknown[]) => Promise<unknown>>();
jest.mock("@/lib/db", () => ({
  db: {
    newsletterSubscriber: { findFirst, update },
    newsletterAuditLog: { create: audit },
  },
}));

let POST: (typeof import("@/app/api/newsletter/unsubscribe/route"))["POST"];
beforeAll(async () => {
  ({ POST } = await import("@/app/api/newsletter/unsubscribe/route"));
});
beforeEach(() => {
  jest.clearAllMocks();
  update.mockResolvedValue({});
  audit.mockResolvedValue({});
});

const call = (body: unknown) =>
  POST(new Request("http://x", { method: "POST", body: JSON.stringify(body) }));

describe("POST /api/newsletter/unsubscribe", () => {
  it("unsubscribes and records when it happened and why", async () => {
    findFirst.mockResolvedValue({ id: "s1" });
    const res = await call({
      token: "t",
      reason: "too_many_emails",
      feedback: "weekly is a lot",
    });
    expect(res.status).toBe(200);
    const data = (update.mock.calls[0][0] as { data: Record<string, unknown> })
      .data;
    expect(data).toMatchObject({
      isSubscribed: false,
      unsubscribeReason: "too_many_emails",
      unsubscribeFeedback: "weekly is a lot",
    });
    expect(data.unsubscribedAt).toBeInstanceOf(Date);
  });

  it("rejects a missing or unknown token", async () => {
    expect((await call({})).status).toBe(400);
    findFirst.mockResolvedValue(null);
    expect((await call({ token: "nope" })).status).toBe(404);
    expect(update).not.toHaveBeenCalled();
  });
});
