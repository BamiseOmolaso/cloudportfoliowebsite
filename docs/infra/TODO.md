# To-do list

What is left to do, in rough priority order. Tick items as they finish and keep this file
honest: it is the shared memory of the project.

**Legend:** `[ ]` to do · `[~]` in progress · `[x]` done

---

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
