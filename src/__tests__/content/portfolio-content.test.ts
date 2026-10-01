/**
 * Guards the content rules for the redesigned home page
 * (see docs/redesign/PLAN.md). If one of these fails, the page copy
 * would publish something we decided never to publish.
 */
import * as content from "@/content/portfolio";

// Everything the page can show, as one lowercase string.
const everything = JSON.stringify(content).toLowerCase();

// Every string in the content tree, to inspect links and values.
function strings(value: unknown, out: string[] = []): string[] {
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value)) value.forEach((v) => strings(v, out));
  else if (value && typeof value === "object")
    Object.values(value).forEach((v) => strings(v, out));
  return out;
}

describe("portfolio content rules", () => {
  it("never mentions the wedding site", () => {
    expect(everything).not.toMatch(/wedding|adebola/);
  });

  it("keeps projects generic (no project or host names)", () => {
    expect(everything).not.toMatch(
      /upperspring|upper spring|ewedding|n8n\.|hetzner\.|\.internal/,
    );
  });

  it("contains no server addresses, key paths or secret-looking values", () => {
    expect(everything).not.toMatch(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/);
    expect(everything).not.toMatch(/\/opt\/|~\/\.ssh|\.pem\b|ghp_|sk-[a-z0-9]/);
    expect(everything).not.toMatch(/\b[0-9a-f]{32,}\b/);
  });

  it("uses one idle-cost figure: Under $5", () => {
    expect(content.cost.paused).toBe("Under $5");
    expect(everything).not.toMatch(/\$1(\.50)?\b(?!\d)|~\$1\b/);
    expect(content.stats.some((s) => s.value === "Under $5")).toBe(true);
  });

  it("only links to https URLs, or mailto", () => {
    const urls = strings(content).filter((s) => /^[a-z]+:\/\//i.test(s));
    expect(urls.length).toBeGreaterThan(0);
    urls.forEach((u) => expect(u).toMatch(/^https:\/\//));
  });

  it("has a well-formed contact email", () => {
    expect(content.profile.email).toMatch(/^[^@\s]+@[^@\s]+\.[^@\s]+$/);
  });

  it("has the five story steps and a pipeline whose failing stage is a test", () => {
    expect(content.story).toHaveLength(5);
    expect(content.pipeline.stages.length).toBeGreaterThanOrEqual(5);
    const failing = content.pipeline.stages[content.pipeline.failAt];
    expect(failing.title).toMatch(/test/i);
    // A stage that only reports can't be the one that stops the pipeline.
    expect(failing.reportOnly).toBeFalsy();
  });

  it("gives the iam visual its policy rows", () => {
    const iam = content.patterns.find((p) => p.visual === "iam");
    expect(iam?.rows?.length).toBeGreaterThan(0);
    expect(iam?.rows?.some((r) => !r.ok)).toBe(true);
  });

  it("gives every pattern a known visual", () => {
    const known = [
      "three-tier",
      "iam",
      "oidc",
      "environments",
      "secrets",
      "defence",
    ];
    content.patterns.forEach((p) => expect(known).toContain(p.visual));
  });
});
