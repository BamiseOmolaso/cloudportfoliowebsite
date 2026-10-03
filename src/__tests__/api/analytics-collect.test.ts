/** @jest-environment node */
import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const create = jest.fn<(...a: unknown[]) => Promise<unknown>>();
jest.mock("@/lib/db", () => ({ db: { pageView: { create } } }));
// The limiter itself is tested in rate-limit tests; here the handler runs as is.
jest.mock("@/lib/rate-limit", () => ({
  apiLimiter: {},
  withRateLimit: (_l: unknown, _k: string, handler: unknown) => handler,
}));

let POST: (typeof import("@/app/api/analytics/collect/route"))["POST"];
beforeAll(async () => {
  ({ POST } = await import("@/app/api/analytics/collect/route"));
});
beforeEach(() => {
  jest.clearAllMocks();
  create.mockResolvedValue({});
});

const CHROME =
  "Mozilla/5.0 (Macintosh) AppleWebKit/537.36 Chrome/120 Safari/537.36";

function call(body: unknown, headers: Record<string, string> = {}) {
  const { NextRequest } = jest.requireActual(
    "next/server",
  ) as typeof import("next/server");
  return POST(
    new NextRequest("http://site.example/api/analytics/collect", {
      method: "POST",
      body: typeof body === "string" ? body : JSON.stringify(body),
      headers: {
        "user-agent": CHROME,
        host: "site.example",
        "cf-connecting-ip": "203.0.113.9",
        ...headers,
      },
    }),
  );
}

describe("POST /api/analytics/collect", () => {
  it("records a view with no address in it", async () => {
    const res = await call(
      {
        path: "/blog/?utm=1",
        referrer: "https://www.linkedin.com/x",
        load: 1800,
        lcp: 1200.4,
        ttfb: 90,
      },
      { "cf-ipcountry": "NG" },
    );
    expect(res.status).toBe(204);
    const row = (create.mock.calls[0][0] as { data: Record<string, unknown> })
      .data;
    expect(row).toMatchObject({
      path: "/blog",
      referrer: "linkedin.com",
      country: "NG",
      device: "desktop",
      loadMs: 1800,
      lcpMs: 1200,
      ttfbMs: 90,
    });
    expect(JSON.stringify(row)).not.toContain("203.0.113.9");
    expect(row.visitor).toMatch(/^[0-9a-f]{32}$/);
  });

  it("does not count crawlers", async () => {
    await call({ path: "/" }, { "user-agent": "Googlebot/2.1" });
    expect(create).not.toHaveBeenCalled();
  });

  it("does not count the signed-in admin", async () => {
    await call({ path: "/" }, { cookie: "auth-token=abc" });
    expect(create).not.toHaveBeenCalled();
  });

  it("does not count the admin panel, the API or other sites' paths", async () => {
    for (const path of [
      "/admin/blog",
      "/api/x",
      "https://evil.example/",
      "//x",
    ]) {
      await call({ path });
    }
    expect(create).not.toHaveBeenCalled();
  });

  it("answers 204 and records nothing for a malformed body", async () => {
    expect((await call("not json")).status).toBe(204);
    expect((await call({ nope: 1 })).status).toBe(204);
    expect(create).not.toHaveBeenCalled();
  });

  it("never breaks the page if the database is down", async () => {
    create.mockRejectedValue(new Error("down"));
    const res = await call({ path: "/" });
    expect(res.status).toBe(204);
  });

  it("drops nonsense timings but keeps the view", async () => {
    await call({ path: "/", load: -5, lcp: 9_999_999 });
    expect(
      (create.mock.calls[0][0] as { data: Record<string, unknown> }).data,
    ).toMatchObject({
      loadMs: null,
      lcpMs: null,
    });
  });
});
