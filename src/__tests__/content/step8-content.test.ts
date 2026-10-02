/**
 * Guards the step-8 content: the scrolling stack, the YouTube section, the
 * testimonials (placeholders must never reach production), the newsletter
 * and the footer links.
 */
import {
  footerLinks,
  skillRows,
  testimonials,
  visibleTestimonials,
  youtube,
} from "@/content/portfolio";

describe("skills", () => {
  const all = skillRows.flatMap((r) => r.items);

  it("has three rows, each with a label", () => {
    expect(skillRows).toHaveLength(3);
    skillRows.forEach((r) => expect(r.label).toBeTruthy());
  });

  it("lists every skill once and gives each a known level", () => {
    const names = all.map((s) => s.name);
    expect(new Set(names).size).toBe(names.length);
    all.forEach((s) => expect(["working", "learning"]).toContain(s.level));
  });

  it("covers the learning path, from Linux to the cloud platforms", () => {
    const names = all.map((s) => s.name);
    for (const must of [
      "Linux",
      "Python",
      "Go",
      "Terraform",
      "Ansible",
      "Git",
      "GitHub",
      "GitLab",
      "GitOps",
      "Kubernetes",
      "AWS",
      "Azure",
      "GCP",
      "Docker",
    ]) {
      expect(names).toContain(must);
    }
    // Reading order: Linux comes before the cloud platforms.
    expect(names.indexOf("Linux")).toBeLessThan(names.indexOf("AWS"));
  });
});

describe("youtube", () => {
  it("links the channel and has well-formed video ids", () => {
    expect(youtube.channel).toMatch(/^https:\/\/www\.youtube\.com\/@/);
    expect(youtube.videos.length).toBeGreaterThanOrEqual(3);
    youtube.videos.forEach((v) => {
      expect(v.id).toMatch(/^[\w-]{11}$/);
      expect(v.title.length).toBeGreaterThan(5);
    });
  });
});

describe("testimonials", () => {
  it("hides placeholder quotes in production", () => {
    expect(visibleTestimonials(true).every((t) => !t.placeholder)).toBe(true);
  });

  it("shows placeholders in development so the layout can be reviewed", () => {
    expect(visibleTestimonials(false)).toHaveLength(testimonials.length);
  });

  it("marks anything that reads like placeholder text as a placeholder", () => {
    testimonials
      .filter((t) =>
        /placeholder|client name|role, company/i.test(
          `${t.quote} ${t.name} ${t.role}`,
        ),
      )
      .forEach((t) => expect(t.placeholder).toBe(true));
  });
});

describe("footer links", () => {
  it("point at pages that exist on this site, never off-site", () => {
    const known = [
      "/blog",
      "/projects",
      "/about",
      "/newsletter",
      "/privacy-policy",
    ];
    footerLinks.forEach((l) => expect(known).toContain(l.href));
  });
});
