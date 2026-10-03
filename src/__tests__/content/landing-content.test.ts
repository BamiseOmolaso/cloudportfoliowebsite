/**
 * Rules for the landing page and the projects it features, taken from the design and
 * copywriting skills in use: a short hero, real logos, one idea said once, plain words.
 */
import { brandKey } from "@/components/portfolio/BrandIcon";
import { maskIcons, pathIcons } from "@/content/brand-icons";
import {
  contact,
  homeHero,
  newsletter,
  projectSlug,
  projects,
  tools,
  work,
} from "@/content/portfolio";
import { projectViews } from "@/content/project-views";

const words = (s: string) => s.trim().split(/\s+/).length;

describe("landing page copy", () => {
  it("keeps the hero intro to 20 words or fewer", () => {
    expect(words(homeHero.intro)).toBeLessThanOrEqual(20);
  });

  it("avoids the buzzwords that make copy read as generated", () => {
    const text = [
      homeHero.intro,
      work.title,
      work.intro,
      contact.title,
      contact.body,
      newsletter.title,
      newsletter.body,
      ...projects.flatMap((p) => [p.body, p.blurb ?? ""]),
    ]
      .join(" ")
      .toLowerCase();
    expect(text).not.toMatch(
      /\b(seamless(ly)?|elevate|unleash|next-gen|game-changer|delve|tapestry|leverage|cutting-edge|world-class|passionate)\b/,
    );
  });

  it("keeps each featured card's summary short", () => {
    for (const p of projects.filter((p) => p.featured)) {
      expect(p.blurb).toBeTruthy();
      expect(words(p.blurb as string)).toBeLessThanOrEqual(30);
    }
  });
});

describe("logos", () => {
  it("has a logo for every tool in the strip under the hero", () => {
    for (const t of tools.items) {
      const key = brandKey(t);
      expect(key).toBeTruthy();
      expect(pathIcons[key as string] ?? maskIcons[key as string]).toBeTruthy();
    }
  });

  it("only maps names to logos that exist", () => {
    for (const p of projects) {
      for (const t of p.stack) {
        const key = brandKey(t);
        if (key) expect(pathIcons[key] ?? maskIcons[key]).toBeTruthy();
      }
    }
  });
});

describe("project architecture views", () => {
  const slugs = projects.map((p) => projectSlug(p.title));

  it("only exist for projects that are listed", () => {
    for (const slug of Object.keys(projectViews)) expect(slugs).toContain(slug);
  });

  it("give every view a tab for each step of its diagram", () => {
    for (const view of Object.values(projectViews)) {
      expect(view.tabs.length).toBeGreaterThanOrEqual(
        view.diagram.steps.length,
      );
    }
  });

  it("covers the featured platform project", () => {
    expect(Object.keys(projectViews)).toContain(
      "production-platform-on-hetzner",
    );
  });
});
