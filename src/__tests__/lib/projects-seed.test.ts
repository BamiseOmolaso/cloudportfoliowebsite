/**
 * prisma/seed-projects.sql is generated from the curated projects in the content
 * file, so the home page and /projects tell one story. This fails if someone edits
 * the projects and forgets to regenerate:  npx tsx scripts/generate-projects-seed.ts
 */
import { readFileSync } from "fs";
import { join } from "path";
import { projects } from "@/content/portfolio";
import { buildSeedSql, slugify } from "../../../scripts/generate-projects-seed";

describe("projects seed", () => {
  it("is up to date with the content file", () => {
    const committed = readFileSync(
      join(process.cwd(), "prisma", "seed-projects.sql"),
      "utf8",
    );
    expect(committed).toBe(buildSeedSql());
  });

  it("gives every project a unique, URL-safe slug", () => {
    const slugs = projects.map((p) => slugify(p.title));
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const s of slugs) expect(s).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it("never overwrites a project edited in the admin panel", () => {
    expect(buildSeedSql()).toContain('ON CONFLICT ("slug") DO NOTHING');
  });

  it("features at most two projects on the home page", () => {
    const featured = projects.filter((p) => p.featured);
    expect(featured.length).toBeGreaterThan(0);
    expect(featured.length).toBeLessThanOrEqual(2);
  });
});
