import { getClientIp } from "@/lib/client-ip";

const h = (init: Record<string, string>) => new Headers(init);

describe("getClientIp", () => {
  it("trusts CF-Connecting-IP over everything else", () => {
    expect(
      getClientIp(
        h({
          "cf-connecting-ip": "203.0.113.7",
          "x-forwarded-for": "198.51.100.9, 203.0.113.7",
          "x-real-ip": "10.42.0.1",
        }),
      ),
    ).toBe("203.0.113.7");
  });

  it("ignores a forged first X-Forwarded-For entry when Cloudflare's header is present", () => {
    // Cloudflare appends the real address; the visitor controls the front.
    expect(
      getClientIp(
        h({
          "cf-connecting-ip": "203.0.113.7",
          "x-forwarded-for": "1.2.3.4, 203.0.113.7",
        }),
      ),
    ).toBe("203.0.113.7");
  });

  it("falls back to X-Real-IP, then the first X-Forwarded-For entry (no Cloudflare, e.g. local dev)", () => {
    expect(getClientIp(h({ "x-real-ip": "192.0.2.5" }))).toBe("192.0.2.5");
    expect(getClientIp(h({ "x-forwarded-for": "192.0.2.6, 10.0.0.1" }))).toBe(
      "192.0.2.6",
    );
  });

  it("returns null when no header is present, and ignores blank values", () => {
    expect(getClientIp(h({}))).toBeNull();
    expect(getClientIp(h({ "cf-connecting-ip": "  " }))).toBeNull();
  });
});
