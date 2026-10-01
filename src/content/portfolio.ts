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
  cv: "https://portfolio.oluwabamiseomolaso.com.ng/cv/Oluwabamise%20Omolaso_CV_2025.pdf",
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
    "Dr. Bamise Omolaso. This is the real infrastructure behind this site, drawn the way I'd document it. Scroll to follow one request through it.",
  primaryCta: "Work with me",
  secondaryCta: "View CV",
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
    label: "monthly idle cost of this site, down from about $250",
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

export const skills: string[] = [
  "Python",
  "TypeScript",
  "SQL",
  "Bash",
  "Terraform",
  "Docker",
  "GitHub Actions",
  "Next.js",
  "Prisma",
  "PostgreSQL",
  "Redis",
  "Power BI",
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
      kind: "YouTube · Bamise Teaches Cloud",
      title: "AWS tutorials for people who ship",
      body: "S3 and CloudFront deployments, custom domains and distribution setup, walked through end to end.",
      cta: "Watch the channel →",
      href: profile.links.youtube,
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
  body: "Open to cloud engineering and DevSecOps roles, and to client work on security-conscious systems or healthcare data science.",
  copyLabel: "Copy email",
  copiedLabel: "Copied",
  links: [
    { label: "LinkedIn", href: profile.links.linkedin },
    { label: "GitHub", href: profile.links.github },
    { label: "X", href: profile.links.x },
    { label: "YouTube", href: profile.links.youtube },
  ] as Link[],
};
