import { maskIcons, pathIcons } from "@/content/brand-icons";

/**
 * Maps a tool's name as written on the site ("Argo CD", "Next.js", "ECS Fargate")
 * to a logo key. Names with no recognisable logo return undefined and are shown
 * as text only.
 */
const ALIASES: Record<string, string> = {
  terraform: "terraform",
  ansible: "ansible",
  kubernetes: "kubernetes",
  k3s: "k3s",
  "argo cd": "argocd",
  argocd: "argocd",
  postgresql: "postgresql",
  postgres: "postgresql",
  cloudflare: "cloudflare",
  docker: "docker",
  "docker compose": "docker",
  "github actions": "githubactions",
  "github oidc": "github",
  github: "github",
  "next.js": "nextjs",
  redis: "redis",
  hetzner: "hetzner",
  prisma: "prisma",
  typescript: "typescript",
  python: "python",
  go: "go",
  helm: "helm",
  prometheus: "prometheus",
  grafana: "grafana",
  nginx: "nginx",
  "let's encrypt": "letsencrypt",
  certbot: "letsencrypt",
  n8n: "n8n",
  resend: "resend",
  traefik: "traefik",
  drizzle: "drizzle",
  rclone: "rclone",
  aws: "aws",
  "aws lambda": "aws",
  "api gateway": "aws",
  "ecs fargate": "aws",
  "openai api": "openai",
};

export const brandKey = (label: string): string | undefined =>
  ALIASES[label.trim().toLowerCase()];

/**
 * A tool's logo, drawn in the surrounding text colour so it works on both the
 * dark and light themes. Decorative: the name is always shown next to it.
 */
export default function BrandIcon({
  name,
  size = 18,
}: {
  /** A key from brand-icons.ts, or a label that brandKey() understands. */
  name: string;
  size?: number;
}) {
  const key = pathIcons[name] || maskIcons[name] ? name : brandKey(name);
  if (!key) return null;

  const p = pathIcons[key];
  if (p) {
    return (
      <svg
        className="brand-icon"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
        focusable="false"
      >
        <path d={p.path} />
      </svg>
    );
  }

  const m = maskIcons[key];
  if (!m) return null;
  // Full-colour source art, drawn as a one-colour silhouette using the SVG as a mask.
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${m.viewBox}">${m.body}</svg>`;
  const url = `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
  return (
    <span
      className="brand-icon brand-mask"
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        WebkitMaskImage: url,
        maskImage: url,
      }}
    />
  );
}

/** A tool name with its logo (when it has one), as a small chip. */
export function ToolChip({ label }: { label: string }) {
  return (
    <span className="chip tool">
      <BrandIcon name={label} size={14} />
      {label}
    </span>
  );
}
