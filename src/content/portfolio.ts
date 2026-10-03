/**
 * All copy for the redesigned home page lives here. Components only render
 * this data, so adding a project, a pattern or a certification is an edit to
 * this file and nothing else.
 *
 * Content rules (enforced by src/__tests__/content/portfolio-content.test.ts):
 *  - no wedding site; hotel / VPS / automation projects stay generic
 *  - no server addresses, hostnames, file paths or secret values
 *  - one idle-cost figure: "Under $5"
 *  - only claim what is true and verified
 */

export interface Link {
  label: string;
  href: string;
}

export interface StoryStep {
  /** Mono label above the title, e.g. "Step 1 of 5 · Edge". */
  label: string;
  /** Short name shown on the progress rail. */
  rail: string;
  title: string;
  body: string;
  why?: string;
}

export interface Stat {
  /** What is shown. For counted stats this is the final text. */
  value: string;
  /** If set, the number counts up from 0 to this when scrolled into view. */
  to?: number;
  pre?: string;
  suf?: string;
  label: string;
}

export interface PipelineStage {
  title: string;
  /** Runs and reports, but doesn't block the deploy (shown as "reported", not "passed"). */
  reportOnly?: boolean;
}

export type PatternVisual =
  | "three-tier"
  | "iam"
  | "oidc"
  | "environments"
  | "secrets"
  | "defence";

export interface Pattern {
  visual: PatternVisual;
  title: string;
  body: string;
  /** "Used in: …" line. */
  usedIn: string;
  /** For the "iam" visual: the policy lines to draw. */
  rows?: { text: string; ok: boolean }[];
}

export type ProjectStatus = "Live" | "Built" | "In progress" | "Learning lab";

/** The URL-safe name of a project, used by /projects/<slug> and the database seed. */
export const projectSlug = (title: string) =>
  title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export interface Project {
  title: string;
  /** Shown on the home page (two at most); the rest live on /projects. */
  featured?: boolean;
  status: ProjectStatus;
  body: string;
  stack: string[];
  /** Public links only. Private repositories get `note` instead. */
  links: Link[];
  note?: string;
  /** A page on this site that tells the whole story. */
  /** A shorter line for the home page card; the full `body` is on the project's own page. */
  blurb?: string;
}

export interface TerraformStep {
  when: string;
  title: string;
  body: string;
  concept: string;
  href: string;
}

export interface VpsTab {
  name: string;
  title: string;
  body: string;
  points: string[];
}

export interface Incident {
  title: string;
  happened: string;
  changed: string;
  lesson: string;
}

/** "working" = used in a real project (see the repos); "learning" = hands-on practice so far. */
export type SkillLevel = "working" | "learning";

export interface Skill {
  name: string;
  level: SkillLevel;
}

export interface SkillRow {
  label: string;
  items: Skill[];
}

export interface Video {
  title: string;
  /** YouTube video id (11 characters). */
  id: string;
}

export interface Testimonial {
  quote: string;
  name: string;
  role: string;
  project?: string;
  /** Stand-in text. Never shown in a production build. */
  placeholder?: boolean;
}

export interface Experience {
  when: string;
  title: string;
  org: string;
  description: string;
}

export interface Certification {
  name: string;
  year: string;
}

export interface ClinicalMapping {
  from: string;
  to: string;
}

export interface WritingCard {
  kind: string;
  title: string;
  body: string;
  cta: string;
  href: string;
}

export const profile = {
  name: "Bamise Omolaso",
  fullName: "Dr. Oluwabamise David Omolaso",
  mark: "OO",
  role: "Cloud and DevSecOps engineer · former medical doctor",
  email: "davidbams3@gmail.com",
  location: "Alberta, Canada · Ile-Ife, Nigeria",
  cv: "https://oluwabamiseomolaso.com.ng/cv/Oluwabamise%20Omolaso_CV_2025.pdf",
  links: {
    linkedin: "https://www.linkedin.com/in/dr-bamise-omolaso/",
    github: "https://github.com/BamiseOmolaso",
    x: "https://x.com/devsecops_dr",
    youtube: "https://www.youtube.com/@bamiseteachescloud/videos",
  },
} as const;

export const hero = {
  headlineStart: "Cloud systems that are ",
  headlineEmphasis: "secure,",
  headlineEnd: " repeatable and cheap to run.",
  intro:
    "This is the AWS infrastructure I built for this portfolio, drawn the way I'd document it. It is paused: the site now runs on a Hetzner server (see the VPS section below). Scroll to follow one request through it.",
  primaryCta: "Work with me",
  secondaryCta: "View CV",
} as const;

/** The home page's calm hero: who, what, and one way into the detail. */
export const homeHero = {
  intro:
    "I'm a doctor turned cloud engineer. I build infrastructure as code, run it in production, and write down what breaks.",
  primaryCta: "See my work",
  secondaryCta: "View CV",
} as const;

/** The logo strip under the hero. */
export const tools = {
  label: "Built with",
  items: [
    "Terraform",
    "Ansible",
    "Kubernetes",
    "Argo CD",
    "PostgreSQL",
    "Cloudflare",
    "GitHub Actions",
    "AWS",
    "Docker",
    "Next.js",
  ],
} as const;

/** A short pointer from the home page to the full /about page. */
export const aboutTeaser = {
  title: "Why a doctor?",
  body: "Triage, handover and differential diagnosis are habits I carried straight into operations: fix what matters first, leave a record the next person can use, and rule causes out in order.",
  cta: "More about me",
  href: "/about",
} as const;

/** "See all" links from the home page into each full page. */
export const seeAll = {
  projects: { label: "See all projects", href: "/projects" },
  platform: {
    label: "Read how I built it",
    href: "/projects/production-platform-on-hetzner",
  },
} as const;

/** The home page's showcase of the platform this site runs on. */
export const platformFeature = {
  title: "This site runs on a platform I built.",
  intro:
    "A hardened server, Kubernetes, deploys from Git and a database restore I have tested. Pick a tab to follow a request, a change or a backup.",
} as const;

/** The five scroll steps that follow the hero (edge → app → data → security → cost). */
export const story: StoryStep[] = [
  {
    label: "Step 1 of 5 · Edge",
    rail: "Edge",
    title: "Every visit starts at the front door.",
    body: "A DNS record points the domain at the load balancer. ACM supplies the TLS certificate, and the Application Load Balancer ends HTTPS, redirects plain HTTP, and spreads traffic across healthy containers.",
    why: "Visitors never reach a container directly, and an unhealthy one is taken out of rotation automatically.",
  },
  {
    label: "Step 2 of 5 · Application",
    rail: "App",
    title: "Stateless containers do the work.",
    body: "A Next.js image is built in CI, stored in ECR and run on ECS Fargate across two availability zones. There are no servers to patch, and auto scaling adds tasks, up to four, when CPU or memory runs hot.",
    why: "Nothing important lives in the container, so deploys roll forward and a bad release rolls back to the previous revision.",
  },
  {
    label: "Step 3 of 5 · Data",
    rail: "Data",
    title: "State lives in exactly one place.",
    body: "PostgreSQL on RDS holds the content, reached through Prisma, with encrypted storage and seven days of backups. Redis Cloud handles rate limiting. Credentials are injected from Secrets Manager when the container starts.",
    why: "Only this tier keeps state, so everything above it can be thrown away and rebuilt.",
  },
  {
    label: "Step 4 of 5 · Security",
    rail: "Security",
    title: "Access is narrow and short-lived.",
    body: "Three security groups form a chain: the internet can reach only the load balancer, the load balancer is the only way in to the app, and the database firewall allows the app and nothing else by default. GitHub Actions deploys through OIDC, so there are no long-lived AWS keys to leak.",
    why: "Each hop is allowed only from the one before it, and the pipeline proves who it is with a short-lived token tied to this repository.",
  },
  {
    label: "Step 5 of 5 · Cost",
    rail: "Cost",
    title: "Idle should be nearly free.",
    body: "A pause and resume mechanism stops the parts that cost money. Terraform keeps the definition of everything else, so the full stack returns with one command.",
  },
];

/** Words for the tour controls: they make it obvious there is something to follow. */
export const tour = {
  start: "Follow one request through the stack",
  cue: "Scroll",
  back: "Back",
  next: "Next",
  keepGoing: "Keep going",
} as const;

/** The cost readout on the last step. */
export const cost = {
  running: "~$250",
  runningNote: " / month running",
  paused: "Under $5",
  pausedNote: " / month paused",
  pauseLabel: "Pause environment",
  resumeLabel: "Resume environment",
} as const;

export const results = {
  label: "Results",
  title: "The numbers behind the work.",
};

export const stats: Stat[] = [
  {
    value: "~15%",
    to: 15,
    pre: "~",
    suf: "%",
    label: "better customer retention from predictive models at AMDARI",
  },
  {
    value: "~20%",
    to: 20,
    pre: "~",
    suf: "%",
    label: "revenue lift from targeted marketing built on segmentation",
  },
  {
    value: "Under $5",
    label:
      "monthly idle cost of the AWS version of this site (paused), down from about $250",
  },
  {
    value: "3",
    to: 3,
    label: "environments (dev, staging, prod) from one Terraform codebase",
  },
  {
    value: "4",
    to: 4,
    label: "certifications, including AWS Solutions Architect Associate",
  },
];

export const pipeline = {
  label: "Delivery",
  title: "From commit to production, with a gate that works.",
  intro:
    "Run the pipeline. Then break a test and see what happens: nothing ships, and production keeps serving the last good version.",
  stages: [
    { title: "Push to branch" },
    { title: "Lint and type-check" },
    { title: "Run tests" },
    { title: "Build the image" },
    { title: "Security scans", reportOnly: true },
    { title: "Assume AWS role via OIDC" },
    { title: "Rolling deploy to ECS" },
  ] as PipelineStage[],
  /** The stage (0-based) that fails when "Break a test" is ticked. */
  failAt: 2,
  notes: {
    idle: "New tasks pass their health checks before the old ones stop, so visitors never see a gap.",
    running: "Each stage must pass before the next one starts.",
    failed:
      "The image is never built and AWS is never touched, so production keeps serving the last good version.",
  },
  /** Said plainly under the demo: scans report, tests and type checks gate. */
  footnote:
    "Lint, type-checks and tests gate the build. Security scans (dependency audit, secret check, Snyk, Trivy on the image) run on every change and report to GitHub's Security tab.",
};

export const patternsSection = {
  label: "Patterns I use",
  title: "Infrastructure patterns, drawn the way I think about them.",
  intro: "Each one is something running in this site's stack.",
};

export const patterns: Pattern[] = [
  {
    visual: "three-tier",
    title: "Three-tier separation",
    body: "The load balancer, the containers and the database are separate layers with one job each, and each accepts traffic only from the layer in front of it. Only the database holds state.",
    usedIn: "this site, end to end",
  },
  {
    visual: "iam",
    title: "Scoped secrets access",
    body: "The container's role can read exactly the secrets it needs to start, and nothing else in Secrets Manager. Anything not listed is denied by default.",
    usedIn: "ECS task execution role",
    rows: [
      { text: "GetSecretValue · app secrets", ok: true },
      { text: "GetSecretValue · database URL", ok: true },
      { text: "every other secret", ok: false },
    ],
  },
  {
    visual: "oidc",
    title: "OIDC federation",
    body: "The pipeline proves who it is with a signed token and receives short-lived credentials. Trust is limited to this repository's branches, and there is no access key to rotate or leak.",
    usedIn: "GitHub Actions to AWS",
  },
  {
    visual: "environments",
    title: "One codebase, three environments",
    body: "Dev, staging and production are built from the same Terraform modules, so they differ only by variables. Dev deploys on its own, staging waits on a timer, and production needs a reviewer's approval.",
    usedIn: "Terraform and deploy workflows",
  },
  {
    visual: "secrets",
    title: "Secrets at runtime",
    body: "Database URLs and API keys are injected from Secrets Manager when a container starts. They never appear in the repository or the image.",
    usedIn: "ECS task definition",
  },
  {
    visual: "defence",
    title: "Defence at the door",
    body: "Abusive traffic is stopped by rate limits and reCAPTCHA. What gets through is validated and sanitised before any handler sees it.",
    usedIn: "contact and newsletter APIs",
  },
];

export const record = {
  label: "Record",
  title: "Where I've worked and what I hold.",
  experienceHeading: "Experience",
  certificationsHeading: "Certifications",
};

export const experience: Experience[] = [
  {
    when: "Jan 2025 to now",
    title: "Data Science Consultant",
    org: "AMDARI · Alberta, Canada",
    description:
      "Predictive models and segmentation pipelines that improved retention by about 15% and lifted revenue about 20%. Dashboards turn cohort and conversion data into decisions.",
  },
  {
    when: "Dec 2024 to now",
    title: "Cloud Community Lead",
    org: "NextWork",
    description:
      "AWS demos, mentoring and workshops on ECS, networking and IAM, including the failure modes the official docs skip. Maintains project guides for the community.",
  },
  {
    when: "2014 to 2021",
    title: "Doctor of Medicine (MBChB)",
    org: "Obafemi Awolowo University, Ile-Ife",
    description:
      "Clinical training that shaped how I treat state, evidence and reproducibility.",
  },
];

export const certifications: Certification[] = [
  { name: "AWS Certified Solutions Architect, Associate", year: "2025" },
  { name: "ALX Cloud Computing Professional", year: "2025" },
  { name: "AWS Certified Cloud Practitioner", year: "2024" },
  { name: "Google Data Analytics Professional", year: "2023" },
];

export const clinical = {
  label: "Why a doctor",
  title: "Clinical habits that carry straight into operations.",
  rows: [
    {
      from: "Triage",
      to: "Alert severity, escalation paths and knowing what to fix first.",
    },
    {
      from: "The patient chart",
      to: "Terraform state and runbooks: the written record of what the system is and what was done to it.",
    },
    {
      from: "Handover",
      to: "Pull requests and change logs that let the next person pick up without guessing.",
    },
    {
      from: "Differential diagnosis",
      to: "Root-cause analysis: rule things out in order instead of restarting the service and hoping.",
    },
  ] as ClinicalMapping[],
};

export const writing = {
  label: "Building in public",
  title: "I write up the build, including the bugs.",
  cards: [
    {
      kind: "LinkedIn · 10-day series",
      title: "Building a production-grade site like a cloud engineer",
      body: "One layer a day: database, hosting, access, secrets, infrastructure as code, CI/CD, and the 12-commit autoprefixer saga.",
      cta: "Read the series →",
      href: profile.links.linkedin,
    },
    {
      kind: "GitHub · Architecture guide",
      title: "The full design of this stack",
      body: "Every tier, every trade-off, and the Terraform behind it, written down in the repository.",
      cta: "Read the guide →",
      href: "https://github.com/BamiseOmolaso/cloudportfoliowebsite/blob/main/ARCHITECTURE_GUIDE.md",
    },
  ] as WritingCard[],
};

export const contact = {
  label: "Contact",
  title: "Need someone who builds it right and can explain why?",
  body: "Open to cloud engineering and DevSecOps roles, and to client work on security-conscious systems or healthcare data science. Tell me what you're building.",
  copyLabel: "Copy email",
  copiedLabel: "Copied",
  // The full contact form lives on its own page.
  formLabel: "Send a message",
  formHref: "/contact",
  links: [
    { label: "LinkedIn", href: profile.links.linkedin },
    { label: "GitHub", href: profile.links.github },
    { label: "X", href: profile.links.x },
    { label: "YouTube", href: profile.links.youtube },
  ] as Link[],
};

/* ------------------------------------------------------------------ */
/* Step 7: selected work, the Terraform journey, the VPS stack, lessons */
/* ------------------------------------------------------------------ */

const repo = (name: string) => `https://github.com/BamiseOmolaso/${name}`;

export const work = {
  label: "Selected work",
  title: "Things I've built and run.",
  intro:
    "Real systems, with the architecture and the trade-offs written down. Where a repository is private, I say so.",
};

export const projects: Project[] = [
  {
    title: "Production platform on Hetzner",
    status: "Live",
    blurb:
      "A hardened server, Kubernetes, GitOps deploys and a database restore I have tested, all built from code and documented.",
    body: "The platform this site runs on, built and documented layer by layer: a hardened server created with Terraform and Ansible, Kubernetes (k3s) with deploys through ArgoCD, a self-hosted PostgreSQL with nightly backups and a restore I have tested, and web traffic accepted from Cloudflare only. Ten guides explain every layer, including what broke.",
    stack: [
      "Terraform",
      "Ansible",
      "k3s",
      "Argo CD",
      "PostgreSQL",
      "Cloudflare",
      "GitHub Actions",
      "Next.js",
    ],
    links: [{ label: "Repository", href: repo("cloudportfoliowebsite") }],
  },
  {
    title: "Cloud portfolio on AWS",
    featured: true,
    blurb:
      "Containers on ECS Fargate behind a load balancer, PostgreSQL on RDS, and GitHub OIDC instead of access keys.",
    status: "Built",
    body: "The infrastructure this page was built to run on: containers on ECS Fargate behind a load balancer, PostgreSQL on RDS, three environments from shared Terraform modules, GitHub OIDC instead of access keys, and a pause script that takes the idle bill from about $250 to under $5 a month.",
    stack: [
      "AWS",
      "ECS Fargate",
      "Terraform",
      "GitHub Actions",
      "Next.js",
      "PostgreSQL",
    ],
    links: [{ label: "Repository", href: repo("cloudportfoliowebsite") }],
  },
  {
    title: "Hotel booking platform",
    featured: true,
    blurb:
      "A production booking app for a small hotel: timed holds, an admin panel and nightly backups, on one VPS with Docker Compose.",
    status: "Live",
    body: "A production booking app for a small hotel: multi-room bookings with timed holds, an admin panel, email notifications and bot protection. It runs on a single VPS with Docker Compose, deploys as an image tagged with the commit (so rollback is one command), and is backed up nightly.",
    stack: ["Next.js", "PostgreSQL", "Drizzle", "Docker", "Nginx"],
    links: [],
    note: "Private repository",
  },
  {
    title: "Self-hosted automation on a VPS",
    featured: true,
    blurb:
      "n8n behind Nginx and HTTPS, rebuildable from the docs, with encrypted off-server backups and a restore I have tested.",
    status: "Live",
    body: "A workflow-automation tool behind Nginx and HTTPS, with every step documented so it can be rebuilt from scratch: encrypted off-server backups with a tested restore, key-only SSH, and secrets kept out of git.",
    stack: [
      "n8n",
      "Docker Compose",
      "Nginx",
      "Certbot",
      "Cloudflare",
      "rclone",
    ],
    links: [],
    note: "Private repository",
  },
  {
    title: "DeployMentor",
    status: "Built",
    body: "A serverless agent that reads a failed GitHub Actions run and explains the likely root cause and a fix. Lambda behind API Gateway, infrastructure in Terraform, CI/CD through OIDC, with a dev, staging and production promotion path.",
    stack: ["AWS Lambda", "API Gateway", "Python", "Terraform", "GitHub OIDC"],
    links: [{ label: "Repository", href: repo("deploymentor") }],
  },
  {
    title: "infergate",
    status: "In progress",
    body: "An AI inference gateway in Go that speaks the OpenAI API and will sit in front of several model providers. Milestone 1 of 7 is done: a streaming reverse proxy that keeps tokens flowing as they arrive. Caching, rate limiting, routing and a Prometheus and Grafana observability stack are next.",
    stack: ["Go", "SSE streaming", "OpenAI API", "Prometheus"],
    links: [],
    note: "Not published yet",
  },
  {
    title: "Kubernetes and GitOps labs",
    status: "Learning lab",
    body: "A real application, not a toy guestbook, moved from Docker Compose onto a local kind cluster stage by stage, plus GitOps practice with Argo CD using Kustomize and Helm.",
    stack: ["Kubernetes", "kind", "Argo CD", "Helm", "Kustomize"],
    links: [{ label: "Argo CD practice repo", href: repo("argo-examples") }],
  },
];

export const terraformJourney = {
  label: "Terraform, week by week",
  title: "From one EC2 instance to a production stack.",
  intro:
    "I learned Terraform through the HUG Lagos/Ibadan challenge, then kept building on it. Each step added one idea.",
  steps: [
    {
      when: "Challenge · Week 1",
      title: "One flat configuration",
      body: "A VPC, a public subnet, a security group and an EC2 instance serving a page through Nginx, all written by hand in a few files.",
      concept: "Resources and dependencies",
      href: repo("HUG-Terraform-Challenge-"),
    },
    {
      when: "Challenge · Week 2",
      title: "Modules and remote state",
      body: "The same build split into four reusable modules, with state kept in S3 instead of on a laptop.",
      concept: "Modules · remote state",
      href: repo("hug-terraform-challenge-week-2"),
    },
    {
      when: "Challenge · Week 3",
      title: "A two-tier network",
      body: "A public web tier and a database in private subnets across two availability zones, with a NAT gateway, and a database firewall that accepts traffic only from the web tier.",
      concept: "Network isolation",
      href: repo("hug-terraform-challenge-week-3"),
    },
    {
      when: "Then, in production",
      title: "This site",
      body: "Shared modules for three environments, GitHub OIDC instead of keys, and pause and resume. It also made a deliberate cost trade-off: public subnets with tight security groups rather than a NAT gateway.",
      concept: "Trade-offs",
      href: repo("cloudportfoliowebsite"),
    },
  ] as TerraformStep[],
};

export const vps = {
  label: "The same ideas, on one server",
  title: "Fewer managed services means more of the engineering is mine.",
  intro:
    "Alongside AWS I run production apps on a single VPS. There is no cloud provider handling backups, TLS or patching for me, so I built and documented each of those myself.",
  tabs: [
    {
      name: "Request path",
      title: "Only Nginx faces the internet.",
      body: "Visitors reach Cloudflare, then Nginx on the server, which ends HTTPS with a certificate that renews itself and forwards to containers.",
      points: [
        "Containers listen on localhost only, so there is no way around the proxy.",
        "A database sits on a named volume that survives container rebuilds.",
        "Each app is its own Compose project in its own folder, so one can change without touching another.",
      ],
    },
    {
      name: "Backups",
      title: "A backup is only real once it's been restored.",
      body: "Each night the database is dumped to disk and kept for 14 days. A second job encrypts those files on the server and uploads them to object storage, which deletes them after 14 days.",
      points: [
        "Files are encrypted before they leave the server, so the storage provider only ever sees scrambled data.",
        "The upload credentials can reach one bucket and nothing else.",
        "I downloaded and decrypted a backup and checked it was byte-for-byte identical to the original.",
      ],
    },
    {
      name: "Hardening",
      title: "Shrink what can be attacked, then check it.",
      body: "SSH accepts keys only. In one week the logs showed tens of thousands of password guesses and no real password logins, so turning passwords off cost nothing.",
      points: [
        "Deploys pull an image tagged with the exact commit, so the server holds no source code and rollback is one command.",
        "Secrets live in files only the deploy user can read, never in git.",
        "Before and after every change, I check the real behaviour instead of assuming it.",
      ],
    },
  ] as VpsTab[],
};

export const incidents = {
  label: "Found and fixed",
  title: "What went wrong, and what it taught me.",
  intro:
    "Production teaches things tutorials don't. These are real, they're all fixed, and each one changed how I work.",
  items: [
    {
      title: "A CAPTCHA that wasn't checking",
      happened:
        "The widget showed on the forms and the secret was in the server's settings, but the container never received it, so the check quietly accepted everything.",
      changed:
        "I compared every environment variable the code reads with what the container is given, passed the missing one through, and added two one-line checks to the runbook.",
      lesson: "A control that looks switched on is not proof that it is.",
    },
    {
      title: "A deploy that failed safely",
      happened:
        "The registry login stored on the server had expired. The deploy stopped at the very first step, before anything changed, so the site never went down.",
      changed:
        "I replaced the stored token with a short-lived login created for each deploy, and recorded the new version only after every step succeeded.",
      lesson:
        "Order steps so failure happens before change, and avoid credentials that expire unattended.",
    },
    {
      title: "66,559 password guesses in a week",
      happened:
        "The SSH logs showed constant automated guessing and not a single real password login.",
      changed:
        "I turned password logins off, tested a fresh key login from a second window before closing the first, and documented how to get back in.",
      lesson:
        "Read the logs before you change anything, and always keep a way back.",
    },
    {
      title: "A database open to the whole Wi-Fi",
      happened:
        "A Docker port mapping without an address listens on every network interface. From the laptop's network address I could log in to a development database.",
      changed:
        "I bound it to localhost, proved the network address was now refused, and wrote the check up as a lesson in the repo.",
      lesson: "Prove the risk, then prove the fix.",
    },
    {
      title: "Restarting one container restarted its database",
      happened:
        "Compose recreated a dependency because its image tag had moved on. The data was safe on its volume, but the downtime was longer than planned.",
      changed:
        "Every deploy step now uses --no-deps, and I verify the volume and the data afterwards.",
      lesson: "Know exactly what a command touches before you run it.",
    },
    {
      title: '"The site is down", but only for me',
      happened:
        "A new subdomain didn't load on my laptop. My phone's hotspot had cached a \"doesn't exist\" answer from before I created the record.",
      changed:
        "I wrote a layer-by-layer checklist (container, proxy, CDN, public DNS, my DNS), and a one-line command that skips DNS to isolate it.",
      lesson: "Change nothing until you know which layer is broken.",
    },
  ] as Incident[],
};

/* ------------------------------------------------------------------ */
/* Step 8: skills, YouTube, live posts, testimonials, newsletter        */
/* ------------------------------------------------------------------ */

export const skillsSection = {
  label: "The stack",
  title: "From the command line up to the cloud.",
  intro:
    "In the order I learned them: Linux first, then code, then everything that ships it.",
  legend: {
    working: "Used in my projects",
    learning: "Learning, hands-on so far",
  },
};

/**
 * Three rows that scroll sideways, read left to right and top to bottom as a
 * learning path. Levels are set from evidence in the repositories; change one
 * line here if a skill has moved from "learning" to "working".
 */
export const skillRows: SkillRow[] = [
  {
    label: "01 · Foundations",
    items: [
      { name: "Linux", level: "working" },
      { name: "Bash", level: "working" },
      { name: "Python", level: "working" },
      { name: "Go", level: "working" },
      { name: "TypeScript", level: "working" },
      { name: "SQL", level: "working" },
      { name: "HCL", level: "working" },
      { name: "Git", level: "working" },
    ],
  },
  {
    label: "02 · Build and ship",
    items: [
      { name: "GitHub", level: "working" },
      { name: "GitHub Actions", level: "working" },
      { name: "GitLab", level: "learning" },
      { name: "GitOps", level: "learning" },
      { name: "Terraform", level: "working" },
      { name: "Ansible", level: "learning" },
      { name: "Docker", level: "working" },
      { name: "Docker Compose", level: "working" },
      { name: "Nginx", level: "working" },
      { name: "Trivy", level: "working" },
    ],
  },
  {
    label: "03 · Run it in the cloud",
    items: [
      { name: "Kubernetes", level: "learning" },
      { name: "Helm", level: "learning" },
      { name: "Argo CD", level: "learning" },
      { name: "AWS", level: "working" },
      { name: "Azure", level: "learning" },
      { name: "GCP", level: "learning" },
      { name: "ECS Fargate", level: "working" },
      { name: "Lambda", level: "working" },
      { name: "PostgreSQL", level: "working" },
      { name: "Redis", level: "working" },
      { name: "Power BI", level: "working" },
      { name: "scikit-learn", level: "working" },
    ],
  },
];

export const youtube = {
  label: "YouTube",
  title: "Bamise Teaches Cloud",
  body: "Step-by-step AWS tutorials for people who ship: hosting a WordPress site on an EC2 server, a static website on S3, and recordings from the NextWork Lagos community.",
  channel: profile.links.youtube,
  subscribe: "Subscribe to the channel",
  all: "All videos →",
  videos: [
    {
      title: "How to host a WordPress site on an Amazon EC2 server",
      id: "E23fKTyiSgM",
    },
    { title: "How to host a static website on Amazon S3", id: "yBJlQmUttwQ" },
    {
      title: "NextWork Lagos community meetup, December 2024",
      id: "6y595Svv5l4",
    },
  ] as Video[],
};

export const livePosts = {
  label: "From the blog",
  title: "Latest from the blog.",
  all: "All posts →",
};

export const liveProjects = {
  title: "More from the project log",
  all: "All projects →",
};

export const testimonialsSection = {
  label: "Kind words",
  title: "What people I've worked with say.",
};

export const testimonials: Testimonial[] = [
  {
    placeholder: true,
    quote:
      "Placeholder: replace this with a real quote from a past client or colleague. Two or three sentences about the result they got work best.",
    name: "Client name",
    role: "Role, Company",
    project: "Project or engagement",
  },
  {
    placeholder: true,
    quote:
      "Placeholder: a second quote, ideally about a different strength, such as communication, reliability or how clearly things were explained.",
    name: "Client name",
    role: "Role, Company",
    project: "Project or engagement",
  },
  {
    placeholder: true,
    quote:
      "Placeholder: a third quote. Real names and companies only, and ask permission before publishing.",
    name: "Client name",
    role: "Role, Company",
    project: "Project or engagement",
  },
];

/**
 * What the page may show. Placeholder quotes never reach production: until at
 * least one real testimonial exists, the whole section stays hidden there.
 */
export function visibleTestimonials(production: boolean): Testimonial[] {
  return testimonials.filter((t) => !t.placeholder || !production);
}

export const newsletter = {
  title: "Get the next write-up.",
  body: "One email when I publish something new on cloud, DevSecOps or what broke in production. Leave any time.",
  placeholder: "you@example.com",
  button: "Subscribe",
  success: "Thank you for subscribing!",
  captcha: "One more step: please subscribe on the newsletter page.",
  captchaLink: "Open the newsletter page →",
};

export const footerLinks: Link[] = [
  { label: "Blog", href: "/blog" },
  { label: "Projects", href: "/projects" },
  { label: "About", href: "/about" },
  { label: "Newsletter", href: "/newsletter" },
  { label: "Privacy policy", href: "/privacy-policy" },
];
