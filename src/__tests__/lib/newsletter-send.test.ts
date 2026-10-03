/** @jest-environment node */
import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const nlFind = jest.fn<(...a: unknown[]) => Promise<unknown>>();
const nlUpdate = jest.fn<(...a: unknown[]) => Promise<unknown>>();
const sendUpsert = jest.fn<(...a: unknown[]) => Promise<unknown>>();
const sendCount = jest.fn<(...a: unknown[]) => Promise<number>>();
const subUpdate = jest.fn<(...a: unknown[]) => Promise<unknown>>();

jest.mock("@/lib/db", () => ({
  db: {
    newsletter: { findUnique: nlFind, update: nlUpdate },
    newsletterSend: { upsert: sendUpsert, count: sendCount },
    newsletterSubscriber: { update: subUpdate },
  },
}));
// The real sanitiser needs a browser-like DOM, which is tested on its own (sanitize-server.test.ts).
const sanitize = jest.fn((html: string) =>
  html.replace(/<script[\s\S]*?<\/script>/g, ""),
);
jest.mock("@/lib/sanitize-server", () => ({
  sanitizeHtmlServer: (html: string) => sanitize(html),
}));
jest.mock("@/lib/resend", () => ({
  resend: () => ({ emails: { send: jest.fn() } }),
}));

type Mod = typeof import("@/lib/newsletter-send");
let absolutizeImages: Mod["absolutizeImages"];
let buildEmail: Mod["buildEmail"];
let isSending: Mod["isSending"];
let runSend: Mod["runSend"];
let sendTest: Mod["sendTest"];

beforeAll(async () => {
  ({ absolutizeImages, buildEmail, isSending, runSend, sendTest } =
    await import("@/lib/newsletter-send"));
});

const BASE = "https://site.example";
const newsletter = {
  id: "n1",
  subject: "October",
  content:
    '<p>Hi {name}</p><img src="/uploads/a.png"><script>alert(1)</script>',
};
const person = (
  id: string,
  name: string | null = "Ada",
  token: string | null = "tok",
) => ({
  id,
  email: `${id}@example.com`,
  name,
  unsubscribeToken: token,
});

beforeEach(() => {
  jest.clearAllMocks();
  process.env.NEXT_PUBLIC_SITE_URL = BASE;
  nlFind.mockResolvedValue(newsletter);
  nlUpdate.mockResolvedValue({});
  sendUpsert.mockResolvedValue({});
  subUpdate.mockResolvedValue({});
  sendCount.mockResolvedValue(1);
});

describe("buildEmail", () => {
  it("greets by name, escapes it, adds an unsubscribe link and sanitises the message", () => {
    const { html, text } = buildEmail(
      newsletter.content,
      { name: '<b>"Ada"</b>' },
      `${BASE}/unsubscribe?token=t`,
      BASE,
    );
    expect(html).toContain("Hi &lt;b&gt;&quot;Ada&quot;&lt;/b&gt;");
    expect(html).toContain(`${BASE}/unsubscribe?token=t`);
    expect(sanitize).toHaveBeenCalledWith(newsletter.content);
    expect(html).not.toContain("<script");
    expect(text).toContain(
      "Unsubscribe: https://site.example/unsubscribe?token=t",
    );
  });

  it("falls back to 'there' when there is no name", () => {
    expect(
      buildEmail("<p>Hi {name}</p>", { name: null }, "u", BASE).html,
    ).toContain("Hi there");
  });

  it("makes picture addresses absolute, leaving full ones alone", () => {
    expect(absolutizeImages('<img src="/uploads/a.png">', BASE)).toBe(
      '<img src="https://site.example/uploads/a.png">',
    );
    expect(absolutizeImages('<img src="https://m.example/a.png">', BASE)).toBe(
      '<img src="https://m.example/a.png">',
    );
  });
});

describe("runSend", () => {
  it("emails each person, records each send, and marks the newsletter sent", async () => {
    const send = jest.fn<any>().mockResolvedValue({ error: null });
    const result = await runSend("n1", [person("a"), person("b")], {
      send,
      delayMs: 0,
    });
    expect(result).toEqual({ sent: 2, failed: 0 });
    expect(send).toHaveBeenCalledTimes(2);
    expect(send.mock.calls[0][0]).toMatchObject({
      to: "a@example.com",
      subject: "October",
      headers: { "List-Unsubscribe": `<${BASE}/unsubscribe?token=tok>` },
    });
    expect(sendUpsert).toHaveBeenCalledTimes(2);
    expect(nlUpdate).toHaveBeenNthCalledWith(1, {
      where: { id: "n1" },
      data: { status: "sending" },
    });
    expect(nlUpdate).toHaveBeenLastCalledWith({
      where: { id: "n1" },
      data: expect.objectContaining({ status: "sent" }),
    });
  });

  it("counts a Resend error as a failure and keeps going", async () => {
    const send = jest
      .fn<any>()
      .mockResolvedValueOnce({ error: { message: "rate limited" } })
      .mockResolvedValueOnce({ error: null });
    const result = await runSend("n1", [person("a"), person("b")], {
      send,
      delayMs: 0,
    });
    expect(result).toEqual({ sent: 1, failed: 1 });
    expect(sendUpsert.mock.calls[0][0]).toMatchObject({
      create: { status: "failed", errorMessage: "rate limited" },
    });
  });

  it("counts a thrown error as a failure too", async () => {
    const send = jest.fn<any>().mockRejectedValue(new Error("network"));
    expect(await runSend("n1", [person("a")], { send, delayMs: 0 })).toEqual({
      sent: 0,
      failed: 1,
    });
  });

  it("goes back to a draft when nobody received it, so it can be retried", async () => {
    sendCount.mockResolvedValue(0);
    const send = jest.fn<any>().mockResolvedValue({ error: { message: "no" } });
    await runSend("n1", [person("a")], { send, delayMs: 0 });
    expect(nlUpdate).toHaveBeenLastCalledWith({
      where: { id: "n1" },
      data: { status: "draft" },
    });
  });

  it("creates a never-expiring unsubscribe link for someone without one", async () => {
    const send = jest.fn<any>().mockResolvedValue({ error: null });
    await runSend("n1", [person("a", "Ada", null)], { send, delayMs: 0 });
    expect(subUpdate).toHaveBeenCalledWith({
      where: { id: "a" },
      data: {
        unsubscribeToken: expect.stringMatching(/^[0-9a-f]{64}$/),
        unsubscribeTokenExpiresAt: null,
      },
    });
  });

  it("is not marked as sending once it has finished", async () => {
    const send = jest.fn<any>().mockResolvedValue({ error: null });
    await runSend("n1", [person("a")], { send, delayMs: 0 });
    expect(isSending("n1")).toBe(false);
  });

  it("refuses a newsletter that does not exist", async () => {
    nlFind.mockResolvedValue(null);
    await expect(runSend("nope", [], { delayMs: 0 })).rejects.toThrow(
      /not found/,
    );
  });
});

describe("sendTest", () => {
  it("sends one copy marked as a test and records nothing", async () => {
    const send = jest.fn<any>().mockResolvedValue({ error: null });
    await sendTest(newsletter, "me@example.com", send);
    expect(send.mock.calls[0][0]).toMatchObject({
      to: "me@example.com",
      subject: "[Test] October",
    });
    expect(sendUpsert).not.toHaveBeenCalled();
  });

  it("reports a send error", async () => {
    const send = jest
      .fn<any>()
      .mockResolvedValue({ error: { message: "bad key" } });
    await expect(sendTest(newsletter, "me@example.com", send)).rejects.toThrow(
      "bad key",
    );
  });
});
