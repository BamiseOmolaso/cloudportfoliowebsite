# To-do list

What is left to do, in rough priority order. Tick items as they finish and keep this file
honest: it is the shared memory of the project.

**Legend:** `[ ]` to do · `[~]` in progress · `[x]` done

---

## Pick up here (state on 4 October 2026)

Written so that a person or another AI agent can continue without the earlier conversation.
Read [CLAUDE.md](../../CLAUDE.md) and [DESIGN-GUIDE.md](../DESIGN-GUIDE.md) first.

### Where things stand

- **The live site** (https://oluwabamiseomolaso.com.ng) runs on Hetzner k3s. ArgoCD follows
  the `main` branch. All three ArgoCD apps (`root`, `postgres`, `portfolio`) were Synced and Healthy.
- **Latest release:** image `sha-de21114` (Next.js 15.5.27), release PR #94. Before that
  `sha-117e7d6` (#92). Check what is actually running with
  `kubectl -n portfolio get deploy portfolio -o jsonpath='{.spec.template.spec.containers[0].image}'`.
- **Branches:** `staging` (renamed from `develop` on 3 October) collects work; `main` is what
  deploys. Feature branch to `staging` by pull request; a release PR to `main` changes the
  image tag in `infra/k8s/apps/portfolio/30-deployment.yaml` and `20-migrate-job.yaml`.
  **Releasing is a manual step** (nothing opens the release PR automatically). Promotions to
  `main` use **merge commits, never squash**.
- **Workflows** (`.github/workflows/README.md` explains each): `ci.yml` (checks, path-aware),
  `build-image.yml` (builds both images; on a push to `staging` it publishes and scans them
  with Trivy, reporting only), `infra.yml` (Terraform plan on pull requests, apply only on a
  push to `main` after approval), `secret-scan.yml`. The AWS-era deploy workflows are archived
  in `.github/workflows-archive/`.
- **Rollback** = revert the release PR on `main`. Database migrations only go forward, so the
  old app must tolerate the newer schema. Nothing reverts automatically and a rollback has
  never been rehearsed.
- **Access to the cluster:** WireGuard tunnel (doc 11). Use the Hetzner kubectl context; the
  local `kind-...` context is a different, unrelated cluster.

### Security scan state

- Trivy (Security tab, Code scanning, **filter by branch `staging`**; categories `trivy-app` and
  `trivy-migrator`). After the Next.js 15 upgrade the app image had 50 open items
  (0 critical, 4 high, all openssl in the base operating system) and the migrator 53
  (7 high, base image).
- **Stale alerts:** about 120 alerts on `main` come from a deleted CI job
  (`ci.yml:docker-build`). They never close on their own. The owner has not yet decided
  between dismissing them ("won't fix", with a comment) and deleting those old scan results.
  Ask before doing either (bulk change to security records).

### To do next, in order

1. **Verify the Next.js 15 release by hand on the live site** (not testable locally: image
   upload to R2, the contact form with reCAPTCHA, real newsletter email, the Cloudflare Access
   login). Confirm the cluster shows `sha-de21114` and the migrate job completed.
2. **Decide the stale code-scanning alerts** (above).
3. **Add CodeQL** (GitHub's code scanner for the project's own code; free on public repos; one
   workflow file; appears in the same Security tab). Proposed, not built. Self-hosted SonarQube
   was rejected: too heavy for the single server.
4. **Turn the vulnerability scan into a gate** on pull requests (fail on critical or high
   findings that have a fix), after the base-image findings are cleared. Today it is report-only.
5. **Update the Node base image** regularly (clears the openssl items); consider Dependabot.
6. **Automate the release pull request** after a successful image publish, and write a
   **rollback runbook** (`docs/infra/runbooks/`) including the migration caveat; rehearse one.
7. Narrow `admin_cidrs` to a single break-glass address once WireGuard is trusted (see the
   WireGuard item below).
8. Keep **Cloudflare Access off `/api/webhooks`** (Resend's delivery reports must get through).
9. **Cloudflare Web Analytics** still logs a console error in the browser; the owner chose to
   leave it for now (analytics must stay on). The CSP allows it, so the cause is elsewhere.
10. **Content only the owner can supply:** the Hetzner cost figure, the GCP logo, subscriber
    first names, and their own blog posts.
11. Pre-existing quirk: an unknown blog or project address returns HTTP 200 instead of 404
    (a "soft 404"; bad for search engines). Not caused by the upgrade.

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

### How the owner likes to work

- Ask before opening or merging pull requests; bundle related changes; commit work freely.
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
