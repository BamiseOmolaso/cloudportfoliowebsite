/**
 * The architecture view each project can show: a diagram plus tabs that explain
 * the parts of it. A project has one if its slug is listed in `projectViews`.
 * Projects without a diagram are simply shown without one (more can be added by
 * drawing another `Diagram` in architecture.ts and listing it here).
 */
import { awsStack, hetznerStack, vpsStack, type Diagram } from "./architecture";
import { hero, story, vps } from "./portfolio";

export interface StackTab {
  name: string;
  title: string;
  body: string;
  points: string[];
}

export interface StackView {
  heading: string;
  intro: string;
  diagram: Diagram;
  /** Draw the compute services as stopped (the AWS version is paused). */
  paused?: boolean;
  tabs: StackTab[];
}

export const hetznerView: StackView = {
  heading: "What it runs on today",
  intro:
    "This site runs on a single server that I build and operate with code. The AWS version is paused; this is the live one.",
  diagram: hetznerStack,
  tabs: [
    {
      name: "1. A visitor arrives",
      title: "Nothing reaches the server except through Cloudflare.",
      body: "Visitors reach Cloudflare, which forwards to the server. The cloud firewall accepts web traffic from Cloudflare's published addresses only, so the server cannot be reached directly. Traefik, the entry point of the Kubernetes cluster, ends HTTPS with a certificate that renews itself.",
      points: [
        "The firewall is code: SSH and the Kubernetes API accept only my own addresses, and the web ports accept only Cloudflare's.",
        "Because only Cloudflare can connect, the visitor's real address can be trusted, so rate limiting works per visitor.",
        "The admin pages sit behind a second login, Cloudflare Access, before the app's own.",
      ],
    },
    {
      name: "2. I ship a change",
      title: "Git is the only way a change reaches production.",
      body: "Every change is a pull request. When it merges, GitHub Actions builds the app image; a second pull request names that image; ArgoCD sees it and rolls it out with no downtime. Terraform builds the server, firewall and DNS, and Ansible hardens the server.",
      points: [
        "ArgoCD pulls from git, so nothing outside the cluster holds a key to it.",
        "A migration job updates the database before the new version starts.",
        "A rollback is reverting a pull request.",
      ],
    },
    {
      name: "3. The data stays safe",
      title: "A backup isn't real until it has been restored.",
      body: "PostgreSQL runs on its own data volume. Every night at 02:17 UTC a job dumps it to object storage, and a lifecycle rule deletes dumps after 30 days. I restored a dump into a scratch database and checked its contents.",
      points: [
        "A network policy lets only the app and the backup job connect to the database.",
        "I deleted the database pod on purpose, and the data was intact when it came back.",
        "Passwords and keys live in Kubernetes Secrets created by hand, never in git.",
      ],
    },
  ],
};

export const awsView: StackView = {
  heading: "The AWS design",
  intro:
    "The infrastructure this portfolio was built to run on. It is paused: the services that cost money while idle are shown stopped.",
  diagram: awsStack,
  paused: true,
  tabs: [
    {
      name: "Overview",
      title:
        "Containers behind a load balancer, with the data in a managed database.",
      body: hero.intro,
      points: [],
    },
    ...story.map((s) => ({
      name: s.rail,
      title: s.title,
      body: s.body,
      points: s.why ? [s.why] : [],
    })),
  ],
};

export const vpsView: StackView = {
  heading: "A single server",
  intro: vps.intro,
  diagram: vpsStack,
  tabs: vps.tabs,
};

/** Project slug (see projectSlug in portfolio.ts) to its architecture view. */
export const projectViews: Record<string, StackView> = {
  "production-platform-on-hetzner": hetznerView,
  "cloud-portfolio-on-aws": awsView,
  "self-hosted-automation-on-a-vps": vpsView,
};
