# To-do list

What is left to do, in rough priority order. Tick items as they finish and keep this file
honest: it is the shared memory of the project.

**Legend:** `[ ]` to do · `[~]` in progress · `[x]` done

---

## Pick up here (state on 6 October 2026)

Written so that a person or another AI agent can continue without the earlier conversation.
Read [CLAUDE.md](../../CLAUDE.md) and [DESIGN-GUIDE.md](../DESIGN-GUIDE.md) first. If something
is broken or a check is red, follow [docs/troubleshooting/](../troubleshooting/README.md).

### Where things stand

- **The live site** (https://oluwabamiseomolaso.com.ng) runs on Hetzner k3s. ArgoCD follows
  the `main` branch. The owner confirmed on 6 October that the cluster runs the latest release
  and that `root`, `postgres` and `portfolio` are Synced and Healthy.
- **Latest release (live):** `sha-6729f9f`, promotion PR #122: self-hosted fonts, minor and
  patch dependency updates, CI and docs changes. Before it: `sha-c6c190a` (#106), `sha-8f7b6c4`
  (#102, the OO favicon), `sha-2868248` (#98, first digest-pinned release). Check what runs with
  `kubectl -n portfolio get pods -o jsonpath='{..image}'`.
- **On `staging` but NOT released yet:** PR #129 (removed the unused `nodemailer` package and
  applied non-breaking security updates: ws, prosemirror-view, linkify-it, markdown-it and
  others; 425 of 425 tests and the production build passed). It needs the release steps below.
- **Branches and releases:** work moves one way: feature branch, `staging`, `main`. A release is
  `scripts/release.sh prepare` (opens a PR into `staging` that writes the new image's
  `tag@digest` into `infra/k8s/apps/portfolio/30-deployment.yaml` and `20-migrate-job.yaml`,
  after checking the cosign signatures; merge it), then `scripts/release.sh promote` (opens
  `staging` to `main`; **merging that is the deployment**; use a merge commit, never squash).
  Only the owner merges to `main` (an automatic safety check blocks the AI from production
  merges). Full details and rollback: [runbook 03](runbooks/03-release-and-rollback.md).
- **Images:** built by `build-image.yml` on a push to `staging`, signed with cosign (keyless),
  with an SBOM and build record, referenced by digest. **Nothing in the cluster enforces the
  signature.** Kyverno (a cluster rule that refuses unsigned images) was designed but the AI was
  blocked from writing cluster-wide admission rules; it needs the owner's explicit permission
  rule or a decision to skip it. The designed files: an AppProject `platform`, a Kyverno Helm
  Application (chart 3.9.1, only the admission controller), and a ClusterPolicy in Audit mode.
- **Workflows** (`.github/workflows/README.md`): `ci.yml`, `build-image.yml` (on pull requests
  it builds and **fails on a fixable CRITICAL vulnerability**; on a push to `staging` it
  publishes, signs and scans with Trivy, reporting only), `codeql.yml` (own code, report-only),
  `infra.yml` (Terraform plan on PRs, skipped for Dependabot because it has no secrets; apply
  only on a push to `main` after approval), `secret-scan.yml`.
- **Fonts** are files in `src/app/fonts/` (no Google download; the build used to fail
  sometimes because of that). **Dependabot** (`.github/dependabot.yml`) sends weekly PRs into
  `staging` and ignores major bumps for npm and Docker.
- **Local server:** `.env.local` (gitignored) in a worktree holds a throwaway admin login for
  the local database container `pf-localdb` (port 5433). It is not used on the live site.
- **Access to the cluster:** WireGuard tunnel (doc 11). Use the Hetzner kubectl context; the
  local `kind-...` context is a different, unrelated cluster.

### Open pull requests (Dependabot, 6 October)

#123 docker/metadata-action 5 to 6, #124 Trivy action pin, #125 20 minor and patch npm updates
(grouped), #126 upload-artifact 4 to 7, #127 codecov-action 4 to 7, #128 setup-node 4 to 7.
Check each is green; #123, #124 and #126 touch the release pipeline, so confirm after merging
that a `staging` build still publishes, signs, and uploads `image-app` / `image-migrator`
artifacts that `scripts/release.sh prepare` can download. For a grouped npm PR that fails the
type-check, reproduce it locally (`npm ci`, `npx tsc --noEmit`) and fix the cause (an earlier
jest bump needed an explicit mock type).

### Security state

- **GitHub dependency alerts:** about 55 open on 6 October, from about 22 packages (counted per
  advisory). #129 clears the unused `nodemailer` (about 16) and most transitive ones. Left:
  `postcss` 8.4.31 bundled inside Next, `js-cookie` 2.2.1 via `react-cookie-consent`, `braces`
  (no fix), and dev-only chains. **Do not run `npm audit fix --force`** (it proposes downgrades
  such as `prisma@6.12`). GitHub rescans after release; recount then.
- **Trivy (image) findings:** about 4 HIGH in the app image and 7 in the migrator, all
  operating-system packages in the base image (openssl). Raise the PR gate to CRITICAL,HIGH once
  Dependabot or a base-image bump clears them. Findings show under Security, Code scanning,
  filter by branch `staging` (categories `trivy-app`, `trivy-migrator`, `codeql-javascript`).
- **CodeQL:** 6 open findings on `staging`, judged false positives or non-production
  (the empty-editor tag strip in `EntryForm.tsx` and `NewsletterForm.tsx`, a test file, and two
  files under `docs/redesign/`). The AI was blocked from dismissing them; the owner can
  dismiss them in the Security tab (reasons: false positive, used in tests, won't fix).

### To do next, in order

1. **Release #129**: wait for the `staging` build, `scripts/release.sh prepare`, merge, then
   `scripts/release.sh promote`; the owner merges; check the pods and the site.
2. **Triage the six Dependabot PRs above** (merge the green, low-risk ones).
3. **Rehearse a rollback once**, after the release: revert the promote PR, time it, check the
   site, re-release; record it in the table in runbook 03.
4. **Owner-only settings:** add `Image (app)` and `Image (migrator)` to the required checks in
   branch protection (makes the scan gate binding); dismiss the CodeQL findings.
5. **Verify by hand on the live site** (cannot be tested locally): image upload to R2, the
   contact form with reCAPTCHA, a real newsletter email, the Cloudflare Access login, the
   blog editor (the editor libraries moved), headings and code text after the font change.
6. **Pin `ubuntu-latest` to `ubuntu-24.04`** in the workflows before GitHub moves the label to
   Ubuntu 26 on 19 October 2026.
7. Optional: Kyverno (see above), Sealed Secrets or SOPS, monitoring and alerts, monthly
   backup-restore rehearsals.
8. Narrow `admin_cidrs` to a single break-glass address once WireGuard is trusted (see the
   WireGuard item below). Be careful: a mistake can lock the owner out of the server.
9. Keep **Cloudflare Access off `/api/webhooks`** (Resend's delivery reports must get through).
10. **Cloudflare Web Analytics** still logs a console error in the browser; the owner chose to
    leave it (analytics must stay on). The CSP allows it, so the cause is elsewhere.
11. **Content only the owner can supply:** the Hetzner cost figure, the GCP logo, subscriber
    first names, and their own blog posts.
12. Pre-existing quirk: an unknown blog or project address returns HTTP 200 instead of 404
    (a "soft 404"; bad for search engines).

### Things that went wrong before (so they are not repeated)

- **`TF_VAR_ADMIN_CIDRS`** (GitHub secret) must be a JSON list such as `["203.0.113.7/32"]` and
  must match the real firewall, or the infra Plan check fails. Set it with
  `gh secret set TF_VAR_ADMIN_CIDRS` and paste at the prompt (shell quoting strips the quotes).
  Never approve the infra Apply job unless the plan shows no unexpected firewall change.
- Run the **type-check again after every edit**: the production build and CI check route
  signatures that local tests do not.
- **Format only the files you touched** (Prettier reformatted unrelated files before).
- Never use a command that deletes a path held in a variable; the safety check blocks it.
- Branch and repository changes that are hard to undo (deleting branches, bulk-dismissing
  alerts, rewriting settings) need the owner's explicit yes first.
- **An automatic safety check** blocks the AI from merging to `main`, dismissing security alerts
  and writing cluster-wide rules. Do not look for a way around it; tell the owner what is
  needed and let them do it or add a permission rule.
- A red check with "The job was not acquired by Runner" is a GitHub outage
  (https://www.githubstatus.com), not your change: re-run later. A Dependabot PR that was
  opened before a fix on `staging` can be refreshed with `gh pr update-branch <number>`.
- Read the real error first ([troubleshooting guide](../troubleshooting/README.md)); several
  "failures" here were an outside service or a stale branch, not the code.

### How the owner likes to work

- Ask before opening or merging pull requests; bundle related changes; commit work freely.
- **Never add `Co-Authored-By` or "Generated with" lines** to commits or pull request text.
- Explain every term and abbreviation in plain language, in chat and in the docs.
- Secrets are typed at hidden prompts and never pasted into chat or committed.
- Keep the existing look of the site and admin (see the design guide); Cloudflare Analytics stays on.


## Infrastructure: next up

- [x] **Postgres verified** (doc 06): backup to R2, restore test, crash survival and the
  network policy all confirmed. Still to rehearse: a restore into the live database, and
  a restore after a full server rebuild.
- [x] **Application deployment** (doc 07): verified on the test hostname.
- [x] **Real visitor IP** (doc 07, section 7): verified. Web ports are Cloudflare-only and
  the app records the real address.
- [x] **Test end to end on the test site** (doc 07): contact and newsletter emails arrive,
  rate limiting blocks (after a bug fix), repeat signups no longer re-send. Still worth a
  look by hand: a repeat signup with the same email sends nothing.
- [ ] **Monitoring** (doc 08): Prometheus and Grafana. Watch node memory (about 57% used
  before monitoring); a larger server type may be needed.
- [ ] **Cut over the real domain** (doc 08): in progress. Done: reCAPTCHA domains. Next: give
  mail its own name (`mailhost`), then ingress and certificate, image with the real URL,
  Terraform import and switch, Cloudflare Access for `/admin`.
- [ ] **Incoming mail decision**: keep the old cPanel hosting only for mail, or switch to
  Cloudflare Email Routing and cancel the hosting (doc 08, section 10).

## Access and security

- [~] **WireGuard private tunnel** (replaces IP allow-listing; see
  `docs/infra/11-wireguard.md`). **Rolled out and working; remaining: narrow `admin_cidrs` to one break-glass address after a few weeks of use.** Plan (done unless noted):
  1. Ansible role installs WireGuard on the server and creates its keys.
  2. Open **UDP 51820** to the world in the Hetzner firewall (WireGuard ignores anything
     that is not from a known key, so it is safe to expose).
  3. Add `wg0` on your laptop; point `kubectl` and SSH at the tunnel address; add the
     tunnel address to the k3s certificate names (`tls-san`).
  4. **Test the tunnel thoroughly first**, then close ports 22 and 6443 to the public
     internet in the firewall. Doing it in this order is what prevents a lockout.
  5. Document it as a numbered doc with diagrams, and keep the runbook as the fallback.
- [ ] **Secrets in git, safely**: Sealed Secrets or SOPS, so database passwords and keys
  can be managed by ArgoCD without ever being stored in plain text.
- [ ] **Adopt cert-manager and the ClusterIssuers under ArgoCD**, deciding how to handle the
  Let's Encrypt contact email in a public repo.
- [ ] **Validate Kubernetes YAML in CI** (kubeconform), so a bad manifest fails the pull
  request instead of ArgoCD.
- [x] **Move ArgoCD to follow `main`** (done 3 October 2026): the AWS auto-deploy and Terraform
  workflows were switched to manual-only first, then `develop` was promoted to `main` with
  `targetRevision: main` in one pull request (docs 05, section 4).
- [ ] **Tighten the Postgres container** (read-only root filesystem with small writable
  folders), and consider point-in-time recovery if the data ever matters more.
- [ ] **Restrict the web ports to Cloudflare's address ranges** in the Hetzner firewall
  once the real domain is proxied.
- [ ] **ArgoCD UI exposure**: keep it port-forward-only, or put it behind Cloudflare Access.
- [ ] **Regular restore tests**: put a reminder in the calendar; run
  `infra/k8s/ops/restore-test.yaml` monthly.

## Housekeeping

- [ ] The old AWS-era branches (`fix/...`, `hardening/...`) are still in the repository;
  tidy them up.
- [ ] Remove the manual copy of the test page (`infra/k8s/hello/`) from the repo once the
  docs no longer need it as a worked example.
- [ ] `terraform.tfvars` formatting (`terraform fmt`) in the local, ignored file.

## Portfolio site (the redesign, separate from the infrastructure)

- [ ] Open and merge the redesign PR (`feat/portfolio-redesign`) when ready, then tag
  `v2.0.0` and delete the local `redesign-step-*` tags.
- [ ] Real testimonials; confirm skill levels; decide whether to feature MivarMart.
- [ ] Decide the wording on the portfolio card ("Live" or not) now that hosting is moving.
- [ ] Update the hero copy once the Hetzner infrastructure story is fully verified.
- [ ] Upload the new legal-page email to the server.
- [ ] Tighten the old AWS OIDC role policies (or retire them), and decide whether the
  security scans should block the pipeline.

## Done so far

- [x] Terraform: server, firewall, network, data volume, DNS record, remote state in R2 (doc 01)
- [x] Ansible: admin user, SSH hardening, updates, fail2ban, disk mount, k3s (docs 02, 03)
- [x] Domain and HTTPS with Cloudflare and Let's Encrypt, tested on a test hostname (doc 04)
- [x] ArgoCD and GitOps, with a tested change, revert and self-heal (doc 05)
- [x] CI pipeline for infrastructure changes, with a first full run
- [x] PostgreSQL deployed through ArgoCD with nightly R2 backups and a passing restore test (doc 06)
