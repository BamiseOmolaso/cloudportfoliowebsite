/** @jest-environment node */
import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const nlFind = jest.fn<(...a: unknown[]) => Promise<unknown>>();
const nlUpdate = jest.fn<(...a: unknown[]) => Promise<unknown>>();
const subFind = jest.fn<(...a: unknown[]) => Promise<unknown>>();
const sendFind = jest.fn<(...a: unknown[]) => Promise<unknown>>();
const runSend = jest.fn<(...a: unknown[]) => Promise<unknown>>();
const sendTest = jest.fn<(...a: unknown[]) => Promise<unknown>>();
let sending = false;

jest.mock("@/lib/db", () => ({
  db: {
    newsletter: { findUnique: nlFind, update: nlUpdate },
    newsletterSubscriber: { findMany: subFind },
    newsletterSend: { findMany: sendFind },
  },
}));
jest.mock("@/lib/newsletter-send", () => ({
  runSend: (...a: unknown[]) => runSend(...a),
  sendTest: (...a: unknown[]) => sendTest(...a),
  isSending: () => sending,
}));
jest.mock("@/lib/api-security", () => ({
  secureAdminRoute: (handler: (...a: unknown[]) => unknown) => (req: unknown) =>
    handler(req, { id: "1", email: "me@example.com", role: "admin" }),
  handleError: (_e: unknown, message: string) =>
    new Response(JSON.stringify({ error: message }), { status: 500 }),
}));

let POST: (typeof import("@/app/api/admin/newsletters/[id]/send/route"))["POST"];
let RECIPIENTS: (typeof import("@/app/api/admin/newsletters/[id]/recipients/route"))["GET"];
beforeAll(async () => {
  ({ POST } = await import("@/app/api/admin/newsletters/[id]/send/route"));
  ({ GET: RECIPIENTS } = await import(
    "@/app/api/admin/newsletters/[id]/recipients/route"
  ));
});
beforeEach(() => {
  jest.clearAllMocks();
  sending = false;
  nlFind.mockResolvedValue({
    id: "n1",
    subject: "S",
    content: "<p>x</p>",
    status: "draft",
  });
  nlUpdate.mockResolvedValue({});
  runSend.mockResolvedValue({ sent: 1, failed: 0 });
  sendTest.mockResolvedValue(undefined);
  sendFind.mockResolvedValue([]);
});

const post = (body: unknown) =>
  POST(
    new Request("http://x", {
      method: "POST",
      body: JSON.stringify(body),
    }) as never,
    {
      params: Promise.resolve({ id: "n1" }),
    },
  );

describe("POST /api/admin/newsletters/[id]/send", () => {
  it("sends a test copy to the signed-in admin only", async () => {
    const res = await post({ test: true });
    expect(res.status).toBe(200);
    expect((await res.json()).to).toBe("me@example.com");
    expect(sendTest).toHaveBeenCalledWith(expect.anything(), "me@example.com");
    expect(runSend).not.toHaveBeenCalled();
  });

  it("tells you why a test could not be sent", async () => {
    sendTest.mockRejectedValue(new Error("API key is invalid"));
    const res = await post({ test: true });
    expect(res.status).toBe(502);
    expect((await res.json()).error).toContain("API key is invalid");
  });

  it("starts sending to the chosen people and answers straight away", async () => {
    subFind.mockResolvedValue([
      { id: "a", email: "a@x.com", name: null, unsubscribeToken: null },
      { id: "b", email: "b@x.com", name: null, unsubscribeToken: null },
    ]);
    const res = await post({ subscriberIds: ["a", "b"] });
    expect(res.status).toBe(202);
    expect(await res.json()).toEqual({ queued: 2, skipped: 0 });
    expect(nlUpdate).toHaveBeenCalledWith({
      where: { id: "n1" },
      data: { status: "sending" },
    });
    expect(runSend).toHaveBeenCalledWith(
      "n1",
      expect.arrayContaining([expect.objectContaining({ id: "a" })]),
    );
  });

  it("only looks up people who are still subscribed", async () => {
    subFind.mockResolvedValue([]);
    await post({ subscriberIds: ["a"] });
    expect(subFind).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { in: ["a"] }, isSubscribed: true, isDeleted: false },
      }),
    );
  });

  it("skips anyone who already received this issue", async () => {
    subFind.mockResolvedValue([
      { id: "a", email: "a@x.com", name: null, unsubscribeToken: null },
      { id: "b", email: "b@x.com", name: null, unsubscribeToken: null },
    ]);
    sendFind.mockResolvedValue([{ subscriberId: "a" }]);
    const res = await post({ subscriberIds: ["a", "b"] });
    expect(await res.json()).toEqual({ queued: 1, skipped: 1 });
    const recipients = runSend.mock.calls[0][1] as { id: string }[];
    expect(recipients.map((r) => r.id)).toEqual(["b"]);
  });

  it("refuses when there is no one left to send to", async () => {
    subFind.mockResolvedValue([]);
    expect((await post({ subscriberIds: ["a"] })).status).toBe(400);
    expect(runSend).not.toHaveBeenCalled();
  });

  it("refuses to start a second send while one is running", async () => {
    nlFind.mockResolvedValue({
      id: "n1",
      subject: "S",
      content: "<p>x</p>",
      status: "sending",
    });
    expect((await post({ subscriberIds: ["a"] })).status).toBe(409);
    sending = true;
    nlFind.mockResolvedValue({
      id: "n1",
      subject: "S",
      content: "<p>x</p>",
      status: "draft",
    });
    expect((await post({ subscriberIds: ["a"] })).status).toBe(409);
  });

  it("needs a subject and a message", async () => {
    nlFind.mockResolvedValue({
      id: "n1",
      subject: " ",
      content: "",
      status: "draft",
    });
    expect((await post({ subscriberIds: ["a"] })).status).toBe(400);
  });

  it("rejects a request that names no one", async () => {
    expect((await post({ subscriberIds: [] })).status).toBe(400);
    expect((await post({})).status).toBe(400);
  });

  it("answers 404 for a newsletter that does not exist", async () => {
    nlFind.mockResolvedValue(null);
    expect((await post({ test: true })).status).toBe(404);
  });
});

describe("GET /api/admin/newsletters/[id]/recipients", () => {
  it("lists subscribers and marks the ones who already received it", async () => {
    subFind.mockResolvedValue([
      {
        id: "a",
        email: "a@x.com",
        name: "Ada",
        location: null,
        createdAt: new Date("2026-10-01"),
      },
      {
        id: "b",
        email: "b@x.com",
        name: null,
        location: "Lagos",
        createdAt: new Date("2026-10-02"),
      },
    ]);
    sendFind.mockResolvedValue([{ subscriberId: "a" }]);
    const body = await (
      await RECIPIENTS(new Request("http://x") as never, {
        params: Promise.resolve({ id: "n1" }),
      })
    ).json();
    expect(body.map((p: { already_sent: boolean }) => p.already_sent)).toEqual([
      true,
      false,
    ]);
  });
});
