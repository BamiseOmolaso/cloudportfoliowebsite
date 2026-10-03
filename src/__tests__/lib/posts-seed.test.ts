/**
 * prisma/seed-posts.sql is generated from the "found and fixed" write-ups in the content
 * file. This fails if someone edits them and forgets to regenerate:
 *   npx tsx scripts/generate-posts-seed.ts
 */
import { readFileSync } from "fs";
import { join } from "path";
import { incidents } from "@/content/portfolio";
import { buildPostsSql, postSlug } from "../../../scripts/generate-posts-seed";

describe("posts seed", () => {
  it("is up to date with the content file", () => {
    const committed = readFileSync(
      join(process.cwd(), "prisma", "seed-posts.sql"),
      "utf8",
    );
    expect(committed).toBe(buildPostsSql());
  });

  it("makes one post per write-up with a unique, URL-safe address", () => {
    const slugs = incidents.items.map((i) => postSlug(i.title));
    expect(new Set(slugs).size).toBe(incidents.items.length);
    for (const s of slugs) expect(s).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it("never overwrites a post edited in the admin panel", () => {
    expect(buildPostsSql()).toContain('ON CONFLICT ("slug") DO NOTHING');
  });

  it("escapes quotes in text so the SQL stays valid", () => {
    expect(buildPostsSql()).toContain("wasn''t checking");
  });

  it("writes the three headed sections of each post as plain HTML", () => {
    const sql = buildPostsSql();
    expect(sql).toContain("<h2>What happened</h2>");
    expect(sql).toContain("<h2>What I changed</h2>");
    expect(sql).toContain("<h2>The lesson</h2>");
    expect(sql).not.toContain("<script");
  });
});
