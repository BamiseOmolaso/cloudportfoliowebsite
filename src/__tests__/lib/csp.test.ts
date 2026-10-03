/** @jest-environment node */
import { middleware } from "@/middleware";

// The test setup replaces next/server; this gives the middleware a response whose headers it can set.
jest.mock("next/server", () => ({
  NextResponse: { next: () => ({ headers: new Headers() }) },
}));

const csp = () =>
  middleware({} as never).headers.get("Content-Security-Policy") ?? "";

const directive = (name: string) =>
  csp()
    .split(";")
    .map((d) => d.trim())
    .find((d) => d.startsWith(`${name} `)) ?? "";

describe("Content-Security-Policy", () => {
  it("lets the reCAPTCHA script and frame load, from Google's recaptcha paths only", () => {
    expect(directive("script-src")).toContain(
      "https://www.google.com/recaptcha/",
    );
    expect(directive("script-src")).toContain(
      "https://www.gstatic.com/recaptcha/",
    );
    expect(directive("frame-src")).toContain(
      "https://www.google.com/recaptcha/",
    );
  });

  it("does not open scripts or frames to the whole of Google or the whole web", () => {
    for (const name of ["script-src", "frame-src"]) {
      const d = directive(name);
      expect(d).not.toMatch(/\shttps:(\s|$)/);
      expect(d).not.toMatch(/\*/);
      expect(d).not.toMatch(/https:\/\/www\.google\.com(\s|$)/);
    }
  });

  it("still keeps everything else on this site", () => {
    expect(csp()).toContain("default-src 'self'");
    expect(directive("connect-src")).toBe("connect-src 'self'");
    expect(directive("font-src")).toBe("font-src 'self' data:");
  });
});
