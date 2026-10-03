/**
 * The admin panel can only edit text listed in src/content/editable.ts. These tests keep
 * that list honest: every path points at real text, edits replace text and nothing
 * else, and links and layout settings are never offered for editing.
 */
import {
  EDITABLE_PAGES,
  pageById,
  pagePaths,
  withOverrides,
} from "@/content/editable";
import { contact, patterns, terraformJourney } from "@/content/portfolio";

const allFields = EDITABLE_PAGES.flatMap((p) =>
  p.groups.flatMap((g) => g.fields),
);

describe("editable pages", () => {
  it("covers Home, About, Learning and Contact", () => {
    expect(EDITABLE_PAGES.map((p) => p.id)).toEqual([
      "home",
      "about",
      "learning",
      "contact",
    ]);
    expect(pageById("home")?.title).toBe("Home");
    expect(pageById("nope")).toBeUndefined();
  });

  it("lists every path once, with a label and some text", () => {
    const paths = allFields.map((f) => f.path);
    expect(new Set(paths).size).toBe(paths.length);
    for (const f of allFields) {
      expect(f.label.length).toBeGreaterThan(0);
      expect(f.default.length).toBeGreaterThan(0);
    }
  });

  it("never offers links, addresses or drawing data for editing", () => {
    for (const f of allFields) {
      expect(f.path).not.toMatch(/(^|\.)(href|formHref|visual|ok|links)(\.|$)/);
      expect(f.path).not.toMatch(/^patterns\.\d+\.rows/);
      expect(f.default).not.toMatch(/^https?:\/\//);
    }
  });

  it("labels list items by what they are", () => {
    const labels = allFields.map((f) => f.label);
    expect(labels).toContain("Step 1 · Title");
    expect(labels.some((l) => l.startsWith("Job 1"))).toBe(true);
    expect(labels.some((l) => l.startsWith("Pattern 1"))).toBe(true);
  });

  it("uses a larger box for long text", () => {
    const title = allFields.find((f) => f.path === "terraformJourney.title");
    expect(title?.kind).toBe("text");
    const body = allFields.find(
      (f) => f.path === "terraformJourney.steps.0.body",
    );
    expect(body?.kind).toBe("textarea");
  });

  it("gives pagePaths for exactly the fields of a page", () => {
    const home = pageById("home")!;
    expect(pagePaths(home).size).toBe(
      home.groups.reduce((n, g) => n + g.fields.length, 0),
    );
  });
});

describe("withOverrides", () => {
  it("replaces edited text, including inside lists", () => {
    const out = withOverrides("terraformJourney", terraformJourney, {
      "terraformJourney.title": "New title",
      "terraformJourney.steps.1.body": "New body",
    });
    expect(out.title).toBe("New title");
    expect(out.steps[1].body).toBe("New body");
    expect(out.steps[0].body).toBe(terraformJourney.steps[0].body);
  });

  it("does not change the defaults", () => {
    withOverrides("contact", contact, { "contact.title": "Changed" });
    expect(contact.title).not.toBe("Changed");
  });

  it("ignores paths that are for another part, missing, or not text", () => {
    const out = withOverrides("contact", contact, {
      "work.title": "Other root",
      "contact.nothing.here": "x",
      "contact.links": "not a list",
      "contact.links.0.href": "https://example.com",
    });
    expect(out).toEqual(contact);
  });

  it("keeps the patterns' drawing data when their words change", () => {
    const out = withOverrides("patterns", patterns, {
      "patterns.1.title": "Renamed",
    });
    expect(out[1].title).toBe("Renamed");
    expect(out[1].rows).toEqual(patterns[1].rows);
  });
});
