/**
 * Guards the "work" content: projects, the Terraform timeline, the VPS tabs
 * and the lessons. Links must be real public repositories (a private repo
 * would be a dead end), private work must say so, and the tabs must match
 * the diagram they drive.
 */
import { vpsStack } from "@/content/architecture";
import {
  incidents,
  projects,
  terraformJourney,
  vps,
} from "@/content/portfolio";

const PUBLIC_REPO = /^https:\/\/github\.com\/BamiseOmolaso\/[A-Za-z0-9._-]+$/;

// Repositories that exist but are private: never link to them.
const PRIVATE_REPOS = ["upperspringhotel", "n8n-vps"];

describe("projects", () => {
  it("has a status from the allowed list", () => {
    projects.forEach((p) =>
      expect(["Live", "Built", "In progress", "Learning lab"]).toContain(
        p.status,
      ),
    );
  });

  it("links only to public GitHub repositories", () => {
    projects
      .flatMap((p) => p.links)
      .forEach((l) => {
        expect(l.href).toMatch(PUBLIC_REPO);
        PRIVATE_REPOS.forEach((name) => expect(l.href).not.toContain(name));
      });
  });

  it("says so when there is nothing to link to", () => {
    projects
      .filter((p) => p.links.length === 0)
      .forEach((p) => expect(p.note).toBeTruthy());
  });

  it("names no private repository or client", () => {
    const text = JSON.stringify(projects).toLowerCase();
    PRIVATE_REPOS.forEach((name) => expect(text).not.toContain(name));
    expect(text).not.toMatch(/wedding|upper spring|mivar|dataexpress/);
  });
});

describe("terraform journey", () => {
  it("has four steps, each linking to a public repository", () => {
    expect(terraformJourney.steps).toHaveLength(4);
    terraformJourney.steps.forEach((s) => expect(s.href).toMatch(PUBLIC_REPO));
  });
});

describe("vps tabs", () => {
  it("match the diagram's steps one-to-one", () => {
    expect(vps.tabs).toHaveLength(vpsStack.steps.length);
  });

  it("each explain themselves with a title, body and points", () => {
    vps.tabs.forEach((t) => {
      expect(t.title).toBeTruthy();
      expect(t.body).toBeTruthy();
      expect(t.points.length).toBeGreaterThan(0);
    });
  });
});

describe("incidents", () => {
  it("each say what happened, what changed and the lesson", () => {
    expect(incidents.items.length).toBeGreaterThanOrEqual(4);
    incidents.items.forEach((i) => {
      expect(i.happened).toBeTruthy();
      expect(i.changed).toBeTruthy();
      expect(i.lesson).toBeTruthy();
    });
  });

  it("are written as fixed lessons, with no addresses, hosts or secrets", () => {
    const text = JSON.stringify(incidents).toLowerCase();
    expect(text).not.toMatch(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/);
    expect(text).not.toMatch(/wedding|upperspring|hetzner|\.com\b|\/opt\//);
    expect(text).not.toMatch(/\b[0-9a-f]{32,}\b/);
  });
});
