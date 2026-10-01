/**
 * Guards the architecture diagrams (src/content/architecture.ts): each must
 * be internally consistent, stay inside its canvas, and obey the same
 * content rules as the rest of the page (docs/redesign/PLAN.md). The AWS
 * diagram is also checked against what the infrastructure really does.
 */
import { awsStack, vpsStack, type Diagram } from "@/content/architecture";

function strings(value: unknown, out: string[] = []): string[] {
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value)) value.forEach((v) => strings(v, out));
  else if (value && typeof value === "object")
    Object.values(value).forEach((v) => strings(v, out));
  return out;
}

describe.each<[string, Diagram]>([
  ["awsStack", awsStack],
  ["vpsStack", vpsStack],
])("%s diagram", (_name, d) => {
  const ids = [
    ...d.nodes.map((n) => n.id),
    ...d.groups.map((g) => g.id),
    ...d.edges.map((e) => e.id),
  ];

  it("has unique ids across nodes, groups and edges", () => {
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has focus lists that only name things that exist", () => {
    d.steps.forEach((step) =>
      (step.focus ?? []).forEach((id) => expect(ids).toContain(id)),
    );
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

  it("has well-formed paths for every edge and packet route", () => {
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
});

describe("awsStack matches the real infrastructure", () => {
  const d = awsStack;

  it("has a step for the hero plus each story step; hero and cost show everything", () => {
    expect(d.steps).toHaveLength(6);
    expect(d.steps[0].focus).toBeUndefined();
    expect(d.steps[5].focus).toBeUndefined();
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

  it("draws outside-AWS services outside the AWS Cloud box", () => {
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

  it("does not claim things the infrastructure does not do", () => {
    const text = strings(d).join(" ").toLowerCase();
    // DNS is a CNAME at a DNS provider, there are no private subnets or NAT,
    // and Redis is Redis Cloud rather than an AWS service.
    expect(text).not.toMatch(
      /route ?53|private subnet|nat gateway|elasticache/,
    );
  });
});

describe("vpsStack", () => {
  const d = vpsStack;

  it("has one step per tab: request path, backups, hardening", () => {
    expect(d.steps).toHaveLength(3);
  });

  it("keeps the app containers off the public internet", () => {
    // The diagram must show them inside the Compose group, and the Compose
    // group inside the server.
    const compose = d.groups.find((g) => g.id === "compose");
    const server = d.groups.find((g) => g.id === "server");
    if (!compose || !server) throw new Error("missing compose or server group");
    for (const id of ["app", "automation", "postgres"]) {
      const n = d.nodes.find((x) => x.id === id);
      if (!n) throw new Error(`missing node ${id}`);
      expect(n.x).toBeGreaterThan(compose.x);
      expect(n.x).toBeLessThan(compose.x + compose.w);
    }
    expect(compose.x).toBeGreaterThanOrEqual(server.x);
  });

  it("draws object storage outside the server", () => {
    const server = d.groups.find((g) => g.id === "server");
    const bucket = d.nodes.find((n) => n.id === "bucket");
    if (!server || !bucket) throw new Error("missing server or bucket");
    expect(bucket.external).toBe(true);
    expect(bucket.x).toBeGreaterThan(server.x + server.w);
  });
});
