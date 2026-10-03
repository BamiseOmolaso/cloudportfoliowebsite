/**
 * The architecture diagram, as data. `ArchitectureDiagram` renders it; the
 * scroll story only picks a step. Another stack (e.g. the VPS) is another
 * object of the same shape.
 *
 * Every box here is checked against the real Terraform (terraform/ in the
 * repo): two availability zones with a public subnet each, an internet
 * gateway, an Application Load Balancer, ECS Fargate tasks (auto scaling 1-4),
 * RDS PostgreSQL, ECR, Secrets Manager injected into the container, ACM, the
 * GitHub OIDC role. DNS is a CNAME at a DNS provider and Redis is Redis Cloud
 * (outside AWS). There are no private subnets and no NAT gateway.
 *
 * Coordinates are in a 440 x 668 space, drawn top to bottom.
 */

export type IconName =
  | "browser"
  | "globe"
  | "gateway"
  | "balancer"
  | "certificate"
  | "container"
  | "registry"
  | "database"
  | "key"
  | "bolt"
  | "branch"
  | "shield";

/** Colour family, after AWS's own icon categories. */
export type Tone =
  | "network"
  | "compute"
  | "database"
  | "security"
  | "storage"
  | "neutral"
  | "dark";

export interface DiagramNode {
  id: string;
  label: string;
  sub?: string;
  x: number;
  y: number;
  icon: IconName;
  tone: Tone;
  /** Outside AWS: drawn with a dashed outline. */
  external?: boolean;
  /** Costs money while running, so it turns amber when the environment is paused. */
  compute?: boolean;
  /** Shown under the node while paused, e.g. "scaled to 0". */
  pausedText?: string;
}

export type GroupKind = "cloud" | "vpc" | "subnet" | "service" | "sg";

export interface DiagramGroup {
  id: string;
  kind: GroupKind;
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  sub?: string;
  /** Only drawn on these steps (omit = always). */
  showIn?: number[];
  /** Not drawn on these steps. */
  hideIn?: number[];
  /** Put the label somewhere specific instead of the top-left corner. */
  labelAt?: { x: number; y: number; anchor?: "start" | "middle" | "end" };
}

export interface DiagramEdge {
  id: string;
  /** SVG path; the arrowhead is at its end. */
  d: string;
  dashed?: boolean;
  /** Fades out while paused (traffic can't flow to a stopped service). */
  compute?: boolean;
}

export interface DiagramLabel {
  text: string;
  x: number;
  y: number;
  /** Only drawn on these steps. */
  showIn: number[];
}

/** A numbered badge on the diagram: the tour's stops, lit when that step is active. */
export interface DiagramMarker {
  step: number;
  x: number;
  y: number;
}

export interface DiagramStep {
  /** The part of the diagram to zoom to: [x, y, width, height]. */
  region: [number, number, number, number];
  /** Ids (nodes, groups, edges) kept bright; the rest dim. Omit to show everything. */
  focus?: string[];
}

export interface Diagram {
  width: number;
  height: number;
  /** Text alternative for the whole diagram. */
  summary: string;
  nodes: DiagramNode[];
  groups: DiagramGroup[];
  edges: DiagramEdge[];
  labels: DiagramLabel[];
  markers: DiagramMarker[];
  /** Paths the animated request packets follow. */
  routes: string[];
  steps: DiagramStep[];
}

export const awsStack: Diagram = {
  width: 440,
  height: 668,
  summary:
    "Architecture diagram. A visitor's browser looks up the domain through a DNS record, then reaches an Application Load Balancer through the internet gateway of a VPC in AWS us-east-1. The load balancer spreads traffic across ECS Fargate tasks in two availability zones, which read and write an RDS PostgreSQL database, pull images from ECR, get their secrets from Secrets Manager and use Redis Cloud for rate limiting. GitHub Actions deploys through an OIDC-assumed IAM role.",

  nodes: [
    {
      id: "visitor",
      label: "Visitor",
      x: 125,
      y: 40,
      icon: "browser",
      tone: "neutral",
    },
    {
      id: "dns",
      label: "DNS record",
      sub: "CNAME",
      x: 300,
      y: 40,
      icon: "globe",
      tone: "neutral",
    },
    {
      id: "igw",
      label: "Internet gateway",
      x: 125,
      y: 134,
      icon: "gateway",
      tone: "network",
    },
    {
      id: "alb",
      label: "Load balancer",
      sub: "HTTPS · health checks",
      x: 125,
      y: 218,
      icon: "balancer",
      tone: "network",
      compute: true,
      pausedText: "removed",
    },
    {
      id: "acm",
      label: "ACM",
      sub: "TLS certificate",
      x: 292,
      y: 218,
      icon: "certificate",
      tone: "security",
    },
    {
      id: "taskA",
      label: "Fargate task",
      sub: "us-east-1a",
      x: 74,
      y: 372,
      icon: "container",
      tone: "compute",
      compute: true,
      pausedText: "scaled to 0",
    },
    {
      id: "taskB",
      label: "Fargate task",
      sub: "us-east-1b",
      x: 176,
      y: 372,
      icon: "container",
      tone: "compute",
      compute: true,
      pausedText: "scaled to 0",
    },
    {
      id: "secrets",
      label: "Secrets Manager",
      sub: "injected at start",
      x: 292,
      y: 300,
      icon: "key",
      tone: "security",
    },
    {
      id: "ecr",
      label: "ECR",
      sub: "container images",
      x: 292,
      y: 420,
      icon: "registry",
      tone: "compute",
    },
    {
      id: "rds",
      label: "RDS PostgreSQL",
      sub: "encrypted · backups",
      x: 74,
      y: 540,
      icon: "database",
      tone: "database",
      compute: true,
      pausedText: "stopped",
    },
    {
      id: "redis",
      label: "Redis Cloud",
      sub: "rate limiting",
      x: 395,
      y: 372,
      icon: "bolt",
      tone: "neutral",
      external: true,
    },
    {
      id: "iam",
      label: "IAM role",
      sub: "assumed via OIDC",
      x: 292,
      y: 560,
      icon: "shield",
      tone: "security",
    },
    {
      id: "github",
      label: "GitHub Actions",
      sub: "CI/CD",
      x: 395,
      y: 560,
      icon: "branch",
      tone: "dark",
      external: true,
    },
  ],

  groups: [
    {
      id: "cloud",
      kind: "cloud",
      x: 8,
      y: 96,
      w: 352,
      h: 540,
      label: "AWS Cloud",
      sub: "us-east-1",
    },
    { id: "vpc", kind: "vpc", x: 18, y: 134, w: 214, h: 486, label: "VPC" },
    {
      id: "subnetA",
      kind: "subnet",
      x: 26,
      y: 292,
      w: 96,
      h: 314,
      label: "Public subnet",
      sub: "us-east-1a",
    },
    {
      id: "subnetB",
      kind: "subnet",
      x: 128,
      y: 292,
      w: 96,
      h: 314,
      label: "Public subnet",
      sub: "us-east-1b",
    },
    // The service label sits between the two arrows, clear of the tiles.
    {
      id: "service",
      kind: "service",
      x: 32,
      y: 328,
      w: 186,
      h: 112,
      label: "ECS service",
      hideIn: [4],
      labelAt: { x: 125, y: 341, anchor: "middle" },
    },
    {
      id: "sgAlb",
      kind: "sg",
      x: 75,
      y: 184,
      w: 100,
      h: 102,
      label: "ALB SG",
      showIn: [4],
      labelAt: { x: 182, y: 200, anchor: "start" },
    },
    {
      id: "sgApp",
      kind: "sg",
      x: 28,
      y: 310,
      w: 198,
      h: 140,
      label: "App SG",
      showIn: [4],
      labelAt: { x: 125, y: 325, anchor: "middle" },
    },
    {
      id: "sgDb",
      kind: "sg",
      x: 24,
      y: 506,
      w: 100,
      h: 104,
      label: "DB SG",
      showIn: [4],
      labelAt: { x: 134, y: 524, anchor: "start" },
    },
  ],

  edges: [
    { id: "visitor-alb", d: "M125,66 V192", compute: true },
    { id: "visitor-dns", d: "M151,40 H274", dashed: true },
    { id: "acm-alb", d: "M266,218 H151", dashed: true },
    { id: "alb-a", d: "M125,244 V282 H74 V346", compute: true },
    { id: "alb-b", d: "M125,244 V282 H176 V346", compute: true },
    { id: "a-rds", d: "M74,398 V514", compute: true },
    { id: "b-rds", d: "M176,398 V540 H100", compute: true },
    { id: "secrets-task", d: "M266,300 H240 V358 H202", dashed: true },
    { id: "task-redis", d: "M202,372 H371", compute: true },
    { id: "ecr-task", d: "M266,420 H240 V386 H202", dashed: true },
    { id: "gh-iam", d: "M371,560 H318" },
    { id: "iam-ecr", d: "M300,534 V510 H348 V420 H318", dashed: true },
  ],

  labels: [
    { text: "443", x: 150, y: 100, showIn: [4] },
    { text: "3000", x: 92, y: 298, showIn: [4] },
    { text: "3000", x: 154, y: 298, showIn: [4] },
    { text: "5432", x: 90, y: 470, showIn: [4] },
  ],

  markers: [
    { step: 1, x: 166, y: 18 },
    { step: 2, x: 30, y: 326 },
    { step: 3, x: 34, y: 510 },
    { step: 4, x: 18, y: 134 },
    { step: 5, x: 8, y: 96 },
  ],

  routes: ["M125,40 V282 H74 V540", "M125,40 V282 H176 V540 H100"],

  steps: [
    // 0 · hero: everything, calm
    { region: [0, 0, 440, 668] },
    // 1 · edge
    {
      region: [60, 10, 300, 285],
      focus: [
        "visitor",
        "dns",
        "igw",
        "alb",
        "acm",
        "visitor-alb",
        "visitor-dns",
        "acm-alb",
      ],
    },
    // 2 · application
    {
      region: [20, 184, 340, 330],
      focus: [
        "alb",
        "taskA",
        "taskB",
        "ecr",
        "subnetA",
        "subnetB",
        "service",
        "alb-a",
        "alb-b",
        "ecr-task",
      ],
    },
    // 3 · data
    {
      region: [20, 270, 410, 340],
      focus: [
        "taskA",
        "taskB",
        "rds",
        "secrets",
        "redis",
        "service",
        "a-rds",
        "b-rds",
        "secrets-task",
        "task-redis",
      ],
    },
    // 4 · security
    {
      region: [8, 100, 430, 530],
      focus: [
        "visitor",
        "igw",
        "alb",
        "taskA",
        "taskB",
        "rds",
        "iam",
        "github",
        "vpc",
        "sgAlb",
        "sgApp",
        "sgDb",
        "visitor-alb",
        "alb-a",
        "alb-b",
        "a-rds",
        "b-rds",
        "gh-iam",
      ],
    },
    // 5 · cost: everything, compute shown paused
    { region: [0, 96, 440, 560] },
  ],
};

/**
 * The single-VPS stack, drawn with the same engine. Generic on purpose: no
 * host names, addresses, paths or project names. Its three steps are the
 * tabs in the "same ideas on one server" section: request path, backups,
 * hardening.
 */
export const vpsStack: Diagram = {
  width: 440,
  height: 720,
  summary:
    "Diagram of a single server. A visitor reaches Cloudflare, then Nginx on the server, which ends HTTPS and forwards to an app container and an automation container that listen on localhost only. Both use PostgreSQL on a named volume. Each night the database is dumped to disk, encrypted, and uploaded to object storage. GitHub Actions deploys by pulling an image tagged with the commit; SSH accepts keys only.",

  nodes: [
    {
      id: "visitor",
      label: "Visitor",
      x: 125,
      y: 40,
      icon: "browser",
      tone: "neutral",
    },
    {
      id: "cloudflare",
      label: "Cloudflare",
      sub: "DNS and proxy",
      x: 125,
      y: 140,
      icon: "globe",
      tone: "neutral",
      external: true,
    },
    {
      id: "nginx",
      label: "Nginx",
      sub: "HTTPS · reverse proxy",
      x: 125,
      y: 260,
      icon: "gateway",
      tone: "network",
    },
    {
      id: "app",
      label: "App",
      sub: "localhost only",
      x: 70,
      y: 390,
      icon: "container",
      tone: "compute",
    },
    {
      id: "automation",
      label: "Automation",
      sub: "localhost only",
      x: 180,
      y: 390,
      icon: "container",
      tone: "compute",
    },
    {
      id: "postgres",
      label: "PostgreSQL",
      sub: "named volume",
      x: 70,
      y: 520,
      icon: "database",
      tone: "database",
    },
    {
      id: "dumps",
      label: "Nightly dumps",
      sub: "kept 14 days",
      x: 70,
      y: 640,
      icon: "registry",
      tone: "storage",
    },
    {
      id: "bucket",
      label: "Object storage",
      sub: "encrypted · 14 days",
      x: 330,
      y: 640,
      icon: "registry",
      tone: "storage",
      external: true,
    },
    {
      id: "github",
      label: "GitHub Actions",
      sub: "deploys by commit",
      x: 330,
      y: 140,
      icon: "branch",
      tone: "dark",
      external: true,
    },
    {
      id: "ssh",
      label: "SSH",
      sub: "keys only",
      x: 330,
      y: 520,
      icon: "key",
      tone: "security",
    },
  ],

  groups: [
    {
      id: "server",
      kind: "vpc",
      x: 12,
      y: 206,
      w: 240,
      h: 500,
      label: "VPS",
      labelAt: { x: 24, y: 224, anchor: "start" },
    },
    {
      id: "compose",
      kind: "service",
      x: 24,
      y: 334,
      w: 216,
      h: 262,
      label: "Docker Compose · no public ports",
      labelAt: { x: 132, y: 349, anchor: "middle" },
    },
  ],

  edges: [
    { id: "visitor-cf", d: "M125,66 V114" },
    { id: "cf-nginx", d: "M125,166 V234" },
    { id: "nginx-app", d: "M125,286 V318 H70 V364" },
    { id: "nginx-auto", d: "M125,286 V318 H180 V364" },
    { id: "app-pg", d: "M70,416 V494" },
    { id: "pg-dumps", d: "M70,546 V614" },
    { id: "dumps-bucket", d: "M96,640 H304", dashed: true },
    { id: "gh-deploy", d: "M330,166 V440 H240", dashed: true },
    { id: "ssh-in", d: "M304,520 H240", dashed: true },
  ],

  labels: [
    { text: "80 / 443 only", x: 190, y: 236, showIn: [2] },
    { text: "encrypted before upload", x: 200, y: 628, showIn: [1] },
  ],

  markers: [],

  routes: ["M125,40 V318 H70 V494", "M125,40 V318 H180 V364"],

  steps: [
    // 0 · request path
    {
      region: [0, 10, 440, 560],
      focus: [
        "visitor",
        "cloudflare",
        "nginx",
        "app",
        "automation",
        "postgres",
        "server",
        "compose",
        "visitor-cf",
        "cf-nginx",
        "nginx-app",
        "nginx-auto",
        "app-pg",
      ],
    },
    // 1 · backups
    {
      region: [10, 470, 420, 240],
      focus: [
        "postgres",
        "dumps",
        "bucket",
        "pg-dumps",
        "dumps-bucket",
        "server",
      ],
    },
    // 2 · hardening
    {
      region: [0, 100, 440, 500],
      focus: [
        "nginx",
        "app",
        "automation",
        "ssh",
        "github",
        "server",
        "compose",
        "gh-deploy",
        "ssh-in",
        "nginx-app",
        "nginx-auto",
      ],
    },
  ],
};

/**
 * The platform this site runs on today. Every box is checked against the real
 * infrastructure code (infra/ in the repository): a Hetzner Cloud firewall that
 * accepts web traffic from Cloudflare's published ranges only; one server
 * hardened with Ansible; k3s with its bundled Traefik for ingress; the app and a
 * self-hosted PostgreSQL (a StatefulSet on its own data volume); ArgoCD syncing
 * from git; a nightly dump to object storage kept 30 days; Terraform building
 * the server, firewall and DNS.
 *
 * Coordinates are in a 440 x 700 space, drawn top to bottom.
 */
export const hetznerStack: Diagram = {
  width: 440,
  height: 700,
  summary:
    "Diagram of the platform this site runs on. A visitor reaches Cloudflare, which proxies the request to a cloud firewall that accepts web traffic from Cloudflare's addresses only. On the server, k3s runs Traefik as the entry point, the Next.js app, and a self-hosted PostgreSQL. ArgoCD watches the GitHub repository and applies changes to the cluster. A nightly job dumps the database to object storage, kept for 30 days. Terraform builds the server, firewall and DNS records; Ansible hardens the server.",

  nodes: [
    {
      id: "visitor",
      label: "Visitor",
      x: 162,
      y: 40,
      icon: "browser",
      tone: "neutral",
    },
    {
      id: "cloudflare",
      label: "Cloudflare",
      sub: "DNS · proxy · TLS",
      x: 162,
      y: 130,
      icon: "globe",
      tone: "neutral",
      external: true,
    },
    {
      id: "firewall",
      label: "Cloud firewall",
      sub: "Cloudflare addresses only",
      x: 162,
      y: 225,
      icon: "shield",
      tone: "security",
    },
    {
      id: "traefik",
      label: "Traefik",
      sub: "ingress · HTTPS",
      x: 162,
      y: 395,
      icon: "gateway",
      tone: "network",
    },
    {
      id: "app",
      label: "Next.js app",
      sub: "non-root · read-only",
      x: 110,
      y: 510,
      icon: "container",
      tone: "compute",
    },
    {
      id: "argocd",
      label: "ArgoCD",
      sub: "syncs from git",
      x: 214,
      y: 510,
      icon: "branch",
      tone: "neutral",
    },
    {
      id: "postgres",
      label: "PostgreSQL",
      sub: "own data volume",
      x: 110,
      y: 625,
      icon: "database",
      tone: "database",
    },
    {
      id: "backup",
      label: "Backup job",
      sub: "nightly dump",
      x: 214,
      y: 625,
      icon: "container",
      tone: "compute",
    },
    {
      id: "terraform",
      label: "Terraform",
      sub: "server · firewall · DNS",
      x: 380,
      y: 330,
      icon: "bolt",
      tone: "dark",
      external: true,
    },
    {
      id: "github",
      label: "GitHub",
      sub: "repo · Actions",
      x: 380,
      y: 510,
      icon: "branch",
      tone: "dark",
      external: true,
    },
    {
      id: "bucket",
      label: "Object storage",
      sub: "kept 30 days",
      x: 380,
      y: 625,
      icon: "registry",
      tone: "storage",
      external: true,
    },
  ],

  groups: [
    {
      id: "server",
      kind: "vpc",
      x: 12,
      y: 280,
      w: 300,
      h: 410,
      label: "Server · hardened with Ansible",
      labelAt: { x: 24, y: 298, anchor: "start" },
    },
    {
      id: "k3s",
      kind: "service",
      x: 24,
      y: 340,
      w: 276,
      h: 340,
      label: "k3s · Kubernetes",
      labelAt: { x: 162, y: 355, anchor: "middle" },
    },
  ],

  edges: [
    { id: "visitor-cf", d: "M162,66 V104" },
    { id: "cf-fw", d: "M162,156 V199" },
    { id: "fw-traefik", d: "M162,251 V369" },
    { id: "traefik-app", d: "M162,421 V446 H110 V484" },
    { id: "app-pg", d: "M110,536 V599" },
    { id: "pg-backup", d: "M136,625 H188" },
    { id: "backup-bucket", d: "M240,625 H354", dashed: true },
    { id: "gh-argocd", d: "M354,510 H240", dashed: true },
    { id: "argocd-app", d: "M188,510 H136", dashed: true },
    { id: "tf-server", d: "M354,330 H312", dashed: true },
  ],

  labels: [{ text: "pull, not push", x: 297, y: 498, showIn: [1] }],

  markers: [],

  routes: ["M162,40 V446 H110 V599"],

  steps: [
    // 0 · a request
    {
      region: [0, 10, 440, 640],
      focus: [
        "visitor",
        "cloudflare",
        "firewall",
        "traefik",
        "app",
        "postgres",
        "server",
        "k3s",
        "visitor-cf",
        "cf-fw",
        "fw-traefik",
        "traefik-app",
        "app-pg",
      ],
    },
    // 1 · a change reaches production
    {
      region: [0, 280, 440, 280],
      focus: [
        "github",
        "argocd",
        "app",
        "terraform",
        "server",
        "k3s",
        "gh-argocd",
        "argocd-app",
        "tf-server",
      ],
    },
    // 2 · data and backups
    {
      region: [0, 470, 440, 220],
      focus: [
        "postgres",
        "backup",
        "bucket",
        "app",
        "server",
        "k3s",
        "app-pg",
        "pg-backup",
        "backup-bucket",
      ],
    },
  ],
};
