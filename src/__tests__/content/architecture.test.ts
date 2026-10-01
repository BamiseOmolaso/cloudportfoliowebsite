/**
 * Guards the architecture diagram data (src/content/architecture.ts):
 * it must be internally consistent, stay inside its canvas, and obey the
 * same content rules as the rest of the page (docs/redesign/PLAN.md).
 */
import { awsStack as d } from "@/content/architecture";

function strings(value: unknown, out: string[] = []): string[] {
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value)) value.forEach((v) => strings(v, out));
  else if (value && typeof value === "object")
    Object.values(value).forEach((v) => strings(v, out));
  return out;
}

describe("awsStack diagram", () => {
  const ids = [
    ...d.nodes.map((n) => n.id),
    ...d.groups.map((g) => g.id),
    ...d.edges.map((e) => e.id),
  ];

  it("has unique ids across nodes, groups and edges", () => {
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has a focus list on every step that only names things that exist", () => {
    d.steps.forEach((step) =>
      (step.focus ?? []).forEach((id) => expect(ids).toContain(id)),
    );
  });

  it("has a step for the hero plus each story step", () => {
    expect(d.steps).toHaveLength(6);
    // The hero and the cost step show everything.
    expect(d.steps[0].focus).toBeUndefined();
    expect(d.steps[5].focus).toBeUndefined();
  });

  it("keeps every node and zoom region inside the canvas", () => {
    d.nodes.forEach((n) => {
      expect(n.x - 26).toBeGreaterThanOrEqual(0);
      expect(n.x + 26).toBeLessThanOrEqual(d.width);
      expect(n.y - 26).toBeGreaterThanOrEqual(0);
      expect(n.y + 26).toBeLessThanOrEqual(d.height);
    });
    d.steps.forEach(({ region: [x, y, w, h] }) => {
      expect(w).toBeGreaterThan(0);
      expect(h).toBeGreaterThan(0);
      expect(x).toBeGreaterThanOrEqual(0);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(x + w).toBeLessThanOrEqual(d.width);
      expect(y + h).toBeLessThanOrEqual(d.height);
    });
  });

  it("only marks compute services that the pause script actually stops", () => {
    // ALB (removed), Fargate tasks (scaled to 0), RDS (stopped) — nothing else.
    const compute = d.nodes
      .filter((n) => n.compute)
      .map((n) => n.id)
      .sort();
    expect(compute).toEqual(["alb", "rds", "taskA", "taskB"]);
    d.nodes
      .filter((n) => n.compute)
      .forEach((n) => expect(n.pausedText).toBeTruthy());
  });

  it("draws the outside-AWS services outside the AWS Cloud box", () => {
    const cloud = d.groups.find((g) => g.kind === "cloud");
    if (!cloud) throw new Error("diagram has no AWS Cloud group");
    const inside = (x: number) => x > cloud.x && x < cloud.x + cloud.w;
    d.nodes
      .filter((n) => n.external)
      .forEach((n) => expect(inside(n.x)).toBe(false));
    d.nodes
      .filter((n) => !n.external && !["visitor", "dns"].includes(n.id))
      .forEach((n) => expect(inside(n.x)).toBe(true));
  });

  it("every packet route and edge is a non-empty SVG path", () => {
    [...d.routes, ...d.edges.map((e) => e.d)].forEach((p) =>
      expect(p).toMatch(/^M[\d.,\sVHL-]+$/),
    );
  });

  it("follows the content rules: generic, no addresses, paths or secrets", () => {
    const text = strings(d).join(" ").toLowerCase();
    expect(text).not.toMatch(
      /wedding|adebola|upperspring|upper spring|hetzner/,
    );
    expect(text).not.toMatch(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/);
    expect(text).not.toMatch(/\/opt\/|~\/\.ssh|\.pem\b|arn:aws|\b\d{12}\b/);
    expect(text).not.toMatch(/\b[0-9a-f]{32,}\b/);
  });

  it("does not claim things the infrastructure does not do", () => {
    const text = strings(d).join(" ").toLowerCase();
    // DNS is a CNAME at a DNS provider, there are no private subnets or NAT,
    // and Redis is Redis Cloud rather than an AWS service.
    expect(text).not.toMatch(
      /route ?53|private subnet|nat gateway|elasticache/,
    );
  });
});
