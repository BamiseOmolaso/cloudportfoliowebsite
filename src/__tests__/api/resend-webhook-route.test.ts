/** @jest-environment node */
import { createHmac } from "node:crypto";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const applyEvent = jest.fn<(...a: unknown[]) => Promise<string>>();
jest.mock("@/lib/db", () => ({ db: {} }));
jest.mock("@/lib/resend-webhook", () => {
  const actual = jest.requireActual("@/lib/resend-webhook") as object;
  return { ...actual, applyEvent: (...a: unknown[]) => applyEvent(...a) };
});

let POST: (typeof import("@/app/api/webhooks/resend/route"))["POST"];
beforeAll(async () => {
  ({ POST } = await import("@/app/api/webhooks/resend/route"));
});

const KEY = Buffer.from("route-secret");
const SECRET = `whsec_${KEY.toString("base64")}`;
const body = JSON.stringify({
  type: "email.delivered",
  data: { email_id: "re_1" },
});
const call = (over: { sign?: boolean; ts?: number; text?: string } = {}) => {
  const ts = over.ts ?? Math.floor(Date.now() / 1000);
  const text = over.text ?? body;
  const sig = `v1,${createHmac("sha256", KEY).update(`m1.${ts}.${body}`).digest("base64")}`;
  return POST(
    new Request("http://x/api/webhooks/resend", {
      method: "POST",
      body: text,
      headers: {
        "svix-id": "m1",
        "svix-timestamp": String(ts),
        "svix-signature": over.sign === false ? "v1,bad" : sig,
      },
    }) as never,
  );
};

beforeEach(() => {
  jest.clearAllMocks();
  process.env.RESEND_WEBHOOK_SECRET = SECRET;
  applyEvent.mockResolvedValue("delivered");
});

describe("POST /api/webhooks/resend", () => {
  it("records a correctly signed event", async () => {
    const res = await call();
    expect(res.status).toBe(200);
    expect(applyEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: "email.delivered" }),
    );
  });

  it("rejects a bad signature without reading the event", async () => {
    expect((await call({ sign: false })).status).toBe(401);
    expect(applyEvent).not.toHaveBeenCalled();
  });

  it("rejects a body that was changed after signing", async () => {
    expect((await call({ text: body.replace("re_1", "re_2") })).status).toBe(
      401,
    );
  });

  it("is switched off until a secret is set", async () => {
    delete process.env.RESEND_WEBHOOK_SECRET;
    expect((await call()).status).toBe(503);
    expect(applyEvent).not.toHaveBeenCalled();
  });

  it("asks Resend to retry when recording fails", async () => {
    applyEvent.mockRejectedValue(new Error("db down"));
    expect((await call()).status).toBe(500);
  });
});
