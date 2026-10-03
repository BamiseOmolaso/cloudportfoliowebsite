import {
  countryOf,
  deviceOf,
  isBot,
  isCountedPath,
  normalizePath,
  referrerHost,
  timing,
  visitorHash,
} from "@/lib/analytics";

const CHROME =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36";
const IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile/15E148 Safari/604.1";

describe("isBot", () => {
  it("flags crawlers, previews, tools and a missing user agent", () => {
    for (const ua of [
      "Googlebot/2.1",
      "Mozilla/5.0 (compatible; bingbot/2.0)",
      "facebookexternalhit/1.1",
      "curl/8.0",
      "Mozilla/5.0 HeadlessChrome/120",
      "UptimeRobot/2.0",
      "",
      null,
      undefined,
    ]) {
      expect(isBot(ua)).toBe(true);
    }
  });

  it("lets real browsers through", () => {
    expect(isBot(CHROME)).toBe(false);
    expect(isBot(IPHONE)).toBe(false);
  });
});

describe("deviceOf", () => {
  it("tells phones, tablets and computers apart", () => {
    expect(deviceOf(IPHONE)).toBe("mobile");
    expect(deviceOf("Mozilla/5.0 (iPad; CPU OS 17_0)")).toBe("tablet");
    expect(
      deviceOf("Mozilla/5.0 (Linux; Android 14; Pixel 8) Mobile Safari"),
    ).toBe("mobile");
    expect(deviceOf(CHROME)).toBe("desktop");
  });
});

describe("normalizePath", () => {
  it("drops the query, fragment and trailing slash", () => {
    expect(normalizePath("/blog/?utm=x#top")).toBe("/blog");
    expect(normalizePath("/")).toBe("/");
    expect(normalizePath("/projects/a/")).toBe("/projects/a");
  });

  it("refuses anything that is not a path on this site", () => {
    expect(normalizePath("https://evil.example/")).toBeNull();
    expect(normalizePath("//evil.example")).toBeNull();
    expect(normalizePath("blog")).toBeNull();
    expect(normalizePath("/" + "a".repeat(250))).toBeNull();
  });
});

describe("isCountedPath", () => {
  it("counts public pages only", () => {
    expect(isCountedPath("/")).toBe(true);
    expect(isCountedPath("/blog/some-post")).toBe(true);
    expect(isCountedPath("/administrator")).toBe(true);
    for (const p of [
      "/admin",
      "/admin/blog",
      "/api/x",
      "/login",
      "/_next/static",
    ]) {
      expect(isCountedPath(p)).toBe(false);
    }
  });
});

describe("referrerHost", () => {
  it("keeps only the site name, and nothing for our own pages", () => {
    expect(
      referrerHost("https://www.linkedin.com/feed/?x=1", "site.example"),
    ).toBe("linkedin.com");
    expect(
      referrerHost("https://site.example/blog", "site.example"),
    ).toBeNull();
    expect(
      referrerHost("https://www.site.example/", "site.example:3001"),
    ).toBeNull();
    expect(referrerHost("not a url", "site.example")).toBeNull();
    expect(referrerHost("", "site.example")).toBeNull();
    expect(referrerHost(undefined, "site.example")).toBeNull();
  });
});

describe("countryOf", () => {
  it("accepts a two-letter code and ignores unknown markers", () => {
    expect(countryOf("ng")).toBe("NG");
    expect(countryOf("XX")).toBeNull();
    expect(countryOf("T1")).toBeNull();
    expect(countryOf("Nigeria")).toBeNull();
    expect(countryOf(null)).toBeNull();
  });
});

describe("timing", () => {
  it("keeps sensible numbers and drops nonsense", () => {
    expect(timing(1234.6)).toBe(1235);
    expect(timing(0)).toBe(0);
    for (const bad of [-1, NaN, Infinity, 999_999, "12", null, undefined]) {
      expect(timing(bad)).toBeNull();
    }
  });
});

describe("visitorHash", () => {
  it("is stable for one browser on one day", () => {
    const a = visitorHash("1.2.3.4", CHROME, "secret", "2026-10-03");
    expect(visitorHash("1.2.3.4", CHROME, "secret", "2026-10-03")).toBe(a);
    expect(a).toMatch(/^[0-9a-f]{32}$/);
  });

  it("changes with the day, the browser, the address and the secret", () => {
    const a = visitorHash("1.2.3.4", CHROME, "secret", "2026-10-03");
    expect(visitorHash("1.2.3.4", CHROME, "secret", "2026-10-04")).not.toBe(a);
    expect(visitorHash("1.2.3.4", IPHONE, "secret", "2026-10-03")).not.toBe(a);
    expect(visitorHash("1.2.3.5", CHROME, "secret", "2026-10-03")).not.toBe(a);
    expect(visitorHash("1.2.3.4", CHROME, "other", "2026-10-03")).not.toBe(a);
  });

  it("does not contain the address", () => {
    expect(
      visitorHash("203.0.113.9", CHROME, "secret", "2026-10-03"),
    ).not.toContain("203");
  });
});
