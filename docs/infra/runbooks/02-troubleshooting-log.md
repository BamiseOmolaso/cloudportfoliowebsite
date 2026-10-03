# Runbook: troubleshooting log (what went wrong, why, and the fix)

A **runbook** is a checklist for a known problem. This one collects every real problem we hit
while building and releasing the site, in plain words, so the next person (or the next you)
can find the symptom, see the cause, and apply the fix without re-discovering it.

How to use it: find your **symptom** in the table of contents below, read the **cause**, run
the **fix**. Each entry says how to **check** that the fix worked.

> **Rule of thumb that solved most of these:** when something *times out*, a firewall or a
> wrong address is dropping you. When something says *permission denied*, you reached the
> machine and the key or password is wrong. When something says *not found* or *no such
> resource*, you are in the wrong folder or used the wrong name.

---

## Contents

| # | Symptom | Section |
|---|---|---|
| 1 | `kubectl` or `ssh` says `i/o timeout` | [A1](#a1-kubectl-or-ssh-times-out) |
| 2 | Terraform says "No changes" but you expected one | [A2](#a2-terraform-says-no-changes-when-you-expected-a-change) |
| 3 | `Permission denied (publickey)` from Ansible or ssh | [A3](#a3-permission-denied-publickey) |
| 4 | Ansible says it cannot read the inventory | [A4](#a4-ansible-cannot-read-the-inventory) |
| 5 | Ansible dry run (`--check`) fails on a step that works for real | [A5](#a5-an-ansible-dry-run-fails-where-the-real-run-would-not) |
| 6 | A script says `syntax error near unexpected token` | [A6](#a6-a-script-fails-on-the-mac-with-syntax-error-near-unexpected-token) |
| 7 | `kubectl` talks to the wrong cluster | [A7](#a7-kubectl-talks-to-the-wrong-cluster) |
| 8 | `kubectl rollout restart` says "required resource not specified" | [A8](#a8-kubectl-rollout-restart-needs-a-name) |
| 9 | A script says a file "does not exist" | [A9](#a9-run-a-script-from-the-repository-root) |
| 10 | The image build fails fetching fonts | [B1](#b1-the-image-build-fails-fetching-google-fonts) |
| 11 | The new site is not live after a release | [B2](#b2-the-release-merged-but-the-live-site-is-still-old) |
| 12 | The CAPTCHA shows "Invalid key type" | [C1](#c1-the-captcha-box-says-invalid-key-type) |
| 13 | The CAPTCHA box never appears | [C2](#c2-the-captcha-box-never-appears) |
| 14 | Console says a script "violates the Content Security Policy" | [C3](#c3-the-browser-console-says-a-script-violates-the-content-security-policy) |
| 15 | The local site is not on the port you expect | [D1](#d1-the-local-site-is-not-where-you-expect) |
| 16 | CI wants to change the firewall back | [E1](#e1-ci-wants-to-put-the-old-firewall-list-back) |
| 17 | Other problems from earlier in the project | [F](#f-earlier-problems-short-list) |

---

## A. Reaching the server

### A1. `kubectl` or `ssh` times out

**Symptom:** `dial tcp <ip>:6443: i/o timeout`, `ssh` hangs, or Ansible says `UNREACHABLE`, while
the website still works.

**Cause:** the Hetzner firewall only lets SSH (22) and the Kubernetes API (6443) in from the
addresses in `admin_cidrs`. Your public address changed. The usual reason: a **different
network**, a **phone hotspot**, or a **VPN** (the server then sees the VPN's address, not
yours). A timeout means the connection was dropped silently.

**Check it is this:** the website loads (`curl -I https://oluwabamiseomolaso.com.ng`), but
`nc -vz <server ip> 6443` hangs.

**Fix:** use the WireGuard tunnel (`docs/infra/11-wireguard.md`): `sudo wg-quick up
~/.config/wireguard-hetzner/hetzner.conf`, then `ssh bamise@10.8.0.1` and `kubectl` at
`https://10.8.0.1:6443`. If the tunnel is not set up or is down, use the old method in
`runbooks/01-my-ip-changed.md` (add your address to `admin_cidrs`, `terraform apply`).

**Worth knowing:** another VPN changes what the server sees. With WireGuard the address no
longer matters, so you can be on any network or VPN as long as UDP 51820 gets out.

### A2. Terraform says "No changes" when you expected a change

**Symptom:** you added something (a firewall rule, an address) and `terraform plan` or `apply`
says `No changes. Your infrastructure matches the configuration.`

**Possible causes, in order of likelihood:**
1. **It was already applied.** An earlier `apply` on the same branch already made the change.
   This is what happened with the WireGuard rule.
2. You are in the **wrong folder or on the wrong branch**, so Terraform cannot see your code.

**Check:**
```bash
pwd; git branch --show-current
grep -n wireguard infra/terraform/modules/firewall/main.tf     # your change must be in the file
terraform state show module.firewall.hcloud_firewall.this | grep -n -B3 -A3 51820
```
If the state shows the rule, it is already applied. If the file lacks your change, you are on
the wrong branch (`git switch <your branch>`).

**Habit that prevents trouble:** always run `terraform plan` and read it before `apply`.

### A3. `Permission denied (publickey)`

**Symptom:** `ssh` or Ansible reaches the server (so the firewall is fine) but is refused.

**Cause:** the SSH key has a **passphrase** and is not loaded in the agent. Ansible cannot type a
passphrase, so it offers no key and the server turns it away. (Plain `ssh` in a terminal
asks you for the passphrase, which is why it can work while Ansible does not.)

**Fix:**
```bash
ssh-add --apple-use-keychain ~/.ssh/hetzner_portfolio     # enter the passphrase once
ssh -o IdentitiesOnly=yes -i ~/.ssh/hetzner_portfolio bamise@<server> 'echo it works'
```
**Check:** `ssh-add -l` lists the key. Then run Ansible again.

**If it still fails:** the server may trust a different key. Try any other keys you have
(`~/.ssh/*.pub`), and read `ssh -v ...` (it shows which keys were offered). Never paste a
private key into chat or a ticket.

### A4. Ansible cannot read the inventory

**Symptom:** `YAML parsing failed: Mapping values are not allowed in this context`.

**Cause:** an indentation mistake in `infra/ansible/inventory/hosts.yml`. Here a list
(`wireguard_peers`) was indented outside its host and was missing the `-` that begins each
list item.

**Fix:** a list item looks like this, indented under the host:
```yaml
          wireguard_peers:
            - name: macbook
              public_key: "<44 characters ending in =>"
              address: 10.8.0.2/32
```
**Check:** `ansible-inventory -i inventory/hosts.yml --host portfolio-prod-node` prints the
variables as JSON instead of an error.

### A5. An Ansible dry run fails where the real run would not

**Symptom:** `--check` (a dry run) stops with `File not found: /etc/wireguard/server.key` or
`Could not find the requested service wg-quick@wg0`.

**Cause:** a dry run changes nothing, so a later step cannot see what an earlier step "would
have" created (the key file; the service a package would have installed).

**Fix:** these steps now tolerate a missing result **in dry runs only** (`ignore_errors: "{{
ansible_check_mode }}"`). In a real run they still fail loudly, which is what you want.
When writing a role, any step that reads something an earlier step creates needs this.

**Check:** the dry run ends with `failed=0`.

### A6. A script fails on the Mac with `syntax error near unexpected token`

**Symptom:** `syntax error near unexpected token '('` from a `.sh` script, though it passes
`bash -n` elsewhere.

**Cause:** macOS ships a very old bash (3.2) and a few constructs, notably a here-document inside a
subshell `( ... )`, are fragile in it. The default shell for your Terminal is zsh; scripts
started with `bash script.sh` use the old bash.

**Fix:** write scripts in plain POSIX style (`[ ]` tests, no subshell around a here-document,
no bash-4-only features), as `infra/scripts/wireguard-client.sh` now does. You do **not**
need to "update bash". If a tool genuinely needs bash 4+, `brew install bash` installs one
next to the system one (`/opt/homebrew/bin/bash`).

**Check:** `/bin/bash -n script.sh` and `/bin/sh -n script.sh` both pass.

### A7. `kubectl` talks to the wrong cluster

**Symptom:** `Wrong cluster: 'kind-upperspring-learn'` from our scripts, or `kubectl` shows
unexpected pods.

**Cause:** `kubectl` uses whichever context is current. Your laptop also has other projects'
clusters.

**Fix:**
```bash
export KUBECONFIG=~/.kube/hetzner-portfolio.yaml     # or run the `hetzner` helper
kubectl config current-context                         # must print hetzner-portfolio
```

### A8. `kubectl rollout restart` needs a name

**Symptom:** `error: required resource not specified`.

**Cause:** the command was typed without what to restart.

**Fix:** `kubectl -n portfolio rollout restart deployment/portfolio`. Check with
`kubectl -n portfolio get pods` (new pods with a small AGE).

### A9. Run a script from the repository root

**Symptom:** `error: the path "infra/k8s/apps/portfolio/00-namespace.yaml" does not exist`.

**Cause:** our scripts use paths relative to the **top folder of the repository** (the one that
contains `infra/`). Running them from inside `infra/scripts` breaks those paths.

**Fix:** `cd` to the repository root and run `bash infra/scripts/<script>.sh`.

---

## B. Building and releasing

### B1. The image build fails fetching Google Fonts

**Symptom:** the `Image (app)` job fails with ``next/font error: Failed to fetch `JetBrains Mono` from Google Fonts``. The same build had passed on the pull request minutes earlier.

**Cause:** the build downloads the fonts from Google, and that download failed (a temporary
network problem). It is not a code problem.

**Fix:** re-run only the failed job (`gh run rerun <run id> --failed`, or the button in GitHub).
If it keeps failing, the longer-term fix is to store the font files in the repository so the
build needs no network.

### B2. The release merged but the live site is still old

**Symptom:** the release pull request is merged, but new pages give 404.

**Cause:** ArgoCD has not applied it yet. It checks every few minutes, runs the database
migration first, then rolls out the new pods. The pods you see may simply be from before.

**Check, in order:**
```bash
kubectl -n argocd get app portfolio -o jsonpath='{.status.sync.status} {.status.health.status} {.status.operationState.phase}{"\n"}'
kubectl -n portfolio get deploy portfolio -o jsonpath='{.spec.template.spec.containers[0].image}{"\n"}'
kubectl -n portfolio get jobs
```
You want `Synced Healthy Succeeded`, the new `sha-...` tag, and the migrate Job `Complete`. If
it is only slow, nudge it: `kubectl -n argocd annotate app portfolio argocd.argoproj.io/refresh=hard --overwrite`.
If a hook Job is stuck, see F (the finalizer).

### B3. The one-off data job used the wrong image tag

**Cause to avoid:** `infra/k8s/ops/seed-content.yaml` must use the **same tag as the running
release** (an old tag does not contain the newer SQL). Pass the tag explicitly:
`sed "s/sha-REPLACE_ME/sha-<release>/" infra/k8s/ops/seed-content.yaml | kubectl apply -f -`.

---

## C. The website in the browser

### C1. The CAPTCHA box says "Invalid key type"

**Symptom:** the box shows a red "ERROR for site owner: Invalid key type", and the contact
form's Send button never turns on (so nobody can send a message).

**Cause:** the reCAPTCHA key is the wrong **type**. The site's box is "reCAPTCHA v2, I'm not a
robot checkbox"; a v3, invisible or Enterprise key will not work with it.

**Fix:**
1. In the Google reCAPTCHA admin, create a key: **Challenge (v2) -> "I'm not a robot" Checkbox**,
   with the domain `oluwabamiseomolaso.com.ng`.
2. Set the **site key** as the repository variable `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` (it is
   built into the page, so **a new image build is required**).
3. Put the **secret key** into the cluster secret (typed at a hidden prompt, never in chat):
   `kubectl -n portfolio patch secret portfolio-secrets --type merge -p '{"stringData":{"RECAPTCHA_SECRET_KEY":"..."}}'`.
4. Build, release, and restart the pods so they read the new secret.

**Check:** the live `/contact` shows an "I'm not a robot" box with no red error, and a test
message goes through.

**Lesson:** after any change that depends on an outside service's key, **look at the live page**,
do not assume. The local test with Google's published test keys passed, which proved the code
but not the real key.

### C2. The CAPTCHA box never appears

**Symptom:** a blank gap where the box should be; the console says Google's script
"violates the following Content Security Policy directive".

**Cause:** the site's Content-Security-Policy (the list of places a page may load from) did not
include Google's reCAPTCHA script and frame.

**Fix:** `src/middleware.ts` now allows `https://www.google.com/recaptcha/`,
`https://www.gstatic.com/recaptcha/` (scripts) and the same plus
`https://recaptcha.google.com/recaptcha/` (frames), and nothing wider. A test
(`src/__tests__/lib/csp.test.ts`) keeps it that way.

### C3. The browser console says a script "violates the Content Security Policy"

**Symptom:** `Loading the script '...' violates the following Content Security Policy directive`.

**Cause:** the page tried to load something from an address the policy does not list. It can be
something *you* did not add: **Cloudflare Web Analytics** (switched on in the Cloudflare dashboard)
adds its own script (`static.cloudflareinsights.com`) to every page.

**Fix, choose one:**
- Allow the known source in `src/middleware.ts` (done for Cloudflare Web Analytics:
  `static.cloudflareinsights.com` to load, `cloudflareinsights.com` to report), with a test; or
- switch the feature off at its source.
Never loosen the policy to `https:` or `*`; add the one address that is needed.

**Check:** reload the page with the console open; the message is gone.

---

## D. Working locally

### D1. The local site is not where you expect

**Symptom:** `localhost:3000` shows a different project.

**Cause:** another project's dev server owns port 3000. This site's dev server is run on **3001**.

**Fix:** open `http://localhost:3001`. Do not stop the other project's server.

Related: the local database is the Docker container `pf-localdb` (port 5433). If Docker is not
running, nothing that reads the database will work; start Docker, then `docker start pf-localdb`.

---

## E. Pipeline surprises

### E1. CI wants to put the old firewall list back

**Symptom:** a pull request's Terraform **Plan** shows the firewall changing in place, replacing
the SSH and API address lists with different (older) addresses.

**Cause:** the pipeline reads `admin_cidrs` from the GitHub secret `TF_VAR_ADMIN_CIDRS`, while your
real firewall was changed from your laptop (`terraform.tfvars`). The two drifted apart.

**What it means:** the **Apply** job runs only on a push to `main`, after approval in the
`hetzner-production` environment. So merging to `develop` is safe; **do not approve an Apply**
until the secret matches what you want live.

**Fix:** update the GitHub secret `TF_VAR_ADMIN_CIDRS` to the list you want (with WireGuard in
use, one break-glass address is enough), then check that the next Plan shows no firewall change.

---

## F. Earlier problems (short list)

| Problem | Cause | Fix |
|---|---|---|
| Prisma `P3005` ("database schema is not empty") | A leftover test table existed before the first migration | Drop the leftover table (with the owner's approval), then run the migration |
| ArgoCD stuck on a hook Job after the Job was deleted by hand | The Job had a finalizer holding it; the Application kept a half-finished operation | Patch the Job's finalizers to null and clear the Application's `operation`, then sync again |
| Rate limiting never blocked anyone | The code read the Redis reply in the wrong shape, and the tests mocked the same wrong shape | Fixed the code and the mocks; verified real `429`s |
| Every page's canonical URL said "home page" | A canonical link was set once in the root layout and inherited everywhere | Set a canonical per page; never in the root layout |
| Pages showed broken-image boxes for projects with no cover | The image tag was always rendered | Render the image only when one exists |
| `www` redirect test returned 200 instead of 301 | The test sent `Host: www...:8443` (with a port); the redirect pattern expects none | Test with `curl --connect-to` so the host has no port |
| Lint hook rejected empty mock functions; coverage gate failed | Rules in the repo | Use `jest.fn()`; add real tests instead of lowering the threshold |
| `prettier --write <folder>` rewrote unrelated files | Prettier reformats everything it touches | Format only the files you changed |
| `sed -i` behaved differently on macOS | BSD `sed` differs from GNU | Use `python3` for multi-line edits, or `sed -i.bak ...` |

---

## Glossary

- **Timeout:** the other side never answered (usually a firewall dropping the connection).
- **Context (kubectl):** which cluster and user `kubectl` is currently using.
- **SSH agent:** a helper that holds your unlocked SSH key in memory so tools can use it.
- **Dry run (`--check`):** run a playbook without changing anything, to preview.
- **Inventory:** Ansible's list of servers and their settings.
- **CSP (Content-Security-Policy):** the browser rule list for where a page may load scripts, frames and data from.
- **Site key / secret key (reCAPTCHA):** the public half goes in the page; the private half stays on the server.
- **ArgoCD sync:** ArgoCD making the cluster match what is in git.
- **Finalizer:** a marker that stops Kubernetes deleting an object until something cleans up.
- **Drift:** the real system and the recorded configuration no longer match.
