# GitHub Actions workflows

What runs, when, and why. (The site runs on Hetzner and is deployed by ArgoCD from git: see
`docs/infra/05-argocd-gitops.md`. The older AWS workflows are kept but run only by hand.)

## At a glance

| Workflow | Runs when | What it does |
|---|---|---|
| **`ci.yml`** (CI Pipeline) | Every pull request to `main` or `develop`; pushes to `main`, `develop` and `feature/**` (not docs-only pushes) | Decides what changed, then lints, type-checks, tests and security-scans the website **only if website files changed**; validates the old AWS Terraform **only if `terraform/` changed**. **CI Summary** is the one check to require: it fails if any job failed, and accepts skipped ones |
| **`build-image.yml`** (Build and publish images) | Pull requests that touch website files; pushes to `develop` that touch website files; by hand ("Run workflow") | Builds the two container images (app and migrator). On a pull request it only builds (proves the Dockerfile works). On a push to `develop` it **publishes both to GitHub's registry tagged with the commit** (`sha-<7 letters>`) and **scans the published image with Trivy** (findings under Security, reported but not blocking) |
| **`infra.yml`** (Hetzner Infrastructure) | Pull requests touching `infra/terraform/**`; pushes to `main` touching it; by hand | Formats and validates the Hetzner Terraform, shows a **plan** on pull requests, and on `main` offers an **apply that waits for approval** in the `hetzner-production` environment |
| **`secret-scan.yml`** | Every pull request; pushes to `main`, `develop`, `staging` | Scans the whole history for committed secrets (gitleaks) |
| `terraform.yml` (old AWS) | Pull-request plans for `terraform/**`; by hand | The AWS Terraform plan and apply. **No longer runs automatically on `main`** |
| `deploy-app.yml` (old AWS) | By hand only | Builds and deploys to AWS ECS. **No longer runs automatically on `main`** |

## How the pieces fit

```mermaid
flowchart LR
  PR["Pull request"] --> CH{"What changed?"}
  CH -->|"website files"| CI["ci.yml: lint, types, tests, scan"]
  CH -->|"website files"| IM["build-image.yml: build only"]
  CH -->|"Terraform files"| INF["infra.yml: validate + plan"]
  CH -->|"anything"| SS["secret-scan.yml"]
  MERGE["Merge to develop"] -->|"website files"| PUB["build-image.yml: build, publish to GHCR, scan"]
  REL["Release PR to main<br/>changes the image tag"] --> ARGO["ArgoCD deploys"]
  PUB -.->|"the tag comes from here"| REL
```

## Rules these files follow

- **A skipped job counts as passed; a missing check does not.** Pull requests always start `ci.yml`,
  and each job decides for itself whether to run. A path filter on the whole workflow would leave
  required checks "pending" forever.
- **One image build.** The website image is built (and scanned) only in `build-image.yml`; `ci.yml`
  has no build or Docker job.
- **Docs-only and infrastructure-only changes run almost nothing:** change detection, the secret
  scan and the summary. They build no image.
- **A merge to `main` is the deployment** (via a release pull request that changes the image tag).
  Nothing in these workflows deploys by itself.
- **Pinned actions.** Third-party actions are pinned to a commit so a changed tag cannot change what runs.

## Common questions

| Question | Answer |
|---|---|
| A pull request shows many "skipping" jobs | Expected: nothing those jobs cover changed |
| `Image (app)` failed fetching fonts | A temporary network problem on Google's side; re-run the failed job (`docs/infra/runbooks/02-troubleshooting-log.md`, B1) |
| Which commit has an image? | The newest one on `develop` that changed website files. A release uses that tag |
| An infrastructure "Apply" is waiting | Don't approve until the GitHub secret `TF_VAR_ADMIN_CIDRS` matches the real firewall (troubleshooting log, E1) |
| Where do Trivy findings appear? | GitHub: **Security** tab, **Code scanning**, category `trivy-app` or `trivy-migrator` |
