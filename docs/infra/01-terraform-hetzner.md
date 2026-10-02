# 01 · Terraform on Hetzner Cloud

This is the first doc in the infrastructure series. By the end you will have
one server on Hetzner, a firewall in front of it, a data disk for Postgres,
and a pipeline that changes all of it from a pull request.

**What you will learn:** what Terraform is and why it is used, how modules
keep infrastructure tidy, what remote state is and why it matters, and how a
CI pipeline applies changes safely.

Nothing here creates anything until you run `terraform apply` yourself.

---

## 1. The idea in plain words

Clicking around the Hetzner console works, but nobody (including future you)
can remember what was clicked. **Terraform** lets you describe the servers you
want in text files. You run `terraform plan` to see what it *would* do, and
`terraform apply` to do it. The files live in git, so every infrastructure
change is reviewed and recorded like code.

Terraform is **declarative**: you describe the end result ("one server of this
type, with this firewall"), not the steps. Terraform compares that with what
exists and works out the difference.

## 2. What we are building

```
Internet ──► Cloud firewall ──► Server (Ubuntu 24.04)
 (80, 443 open to all;            ├─ root disk
  22 and 6443 only from you)      └─ data volume (for Postgres)
                                  Private network 10.0.0.0/16
```

| Piece | Why it exists |
|---|---|
| Server | Runs k3s (Kubernetes), the app, Postgres and monitoring |
| Firewall | Drops everything not explicitly allowed, *before* it reaches the server |
| Private network | Free; lets us add nodes later without exposing traffic publicly |
| Data volume | Keeps database data on its own disk so the server can be replaced without losing it |

## 3. How the code is organised (modules)

```
infra/terraform/
├─ modules/            reusable building blocks
│  ├─ network/
│  ├─ firewall/
│  └─ server/
└─ envs/
   └─ prod/            the one real environment: calls the modules
```

A **module** is a folder of Terraform with *inputs* (`variables.tf`), *outputs*
(`outputs.tf`) and resources (`main.tf`). An **environment** wires modules
together with real values. This is the same pattern as the old AWS setup
(`terraform/modules` and `terraform/envs`).

Why bother? Each module does one job and can be read in a minute. If you later
want a staging copy, you add `envs/staging` that calls the same modules with
different inputs instead of copying code.

Each module has a `versions.tf` that states which provider it needs. Without it
Terraform guesses the provider's publisher and can guess wrong.

We only have one environment (`prod`). The old setup had three because AWS was
costly to run; here one small server is the whole budget.

## 4. Remote state: the part people skip

Terraform keeps a record of what it created, called **state**. If you lose it,
Terraform forgets your server exists and may try to create another one. If two
people (or two CI runs) change state at the same time, it can be corrupted.

So we store state remotely and **lock** it while a run is in progress.

Hetzner has no built-in state storage, so we use **Cloudflare R2**: it speaks
the same protocol as AWS S3 (so Terraform's `s3` backend works), and the free
tier is enough for a state file of a few kilobytes.

State can contain sensitive values. Keep the bucket private and never commit
state files.

### Which login names does each backend use?

Each backend reads its own variable names. The `AWS_` names in section 6.0 belong
**only** to the `s3` backend, which we use for Cloudflare R2 because R2 copies
Amazon's storage protocol. The Hetzner provider uses its own name,
`HCLOUD_TOKEN`.

| Backend | Where state lives | Login it reads |
|---|---|---|
| `s3` (what we use) | Amazon S3, Cloudflare R2, or any S3-compatible storage | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` |
| `azurerm` | Azure storage | `ARM_CLIENT_ID`, `ARM_CLIENT_SECRET`, and others |
| `gcs` | Google Cloud storage | `GOOGLE_CREDENTIALS` |
| Terraform Cloud / HCP Terraform | HashiCorp's hosted service | `TF_TOKEN_app_terraform_io` |
| `http` / GitLab | A web address you control | a username and password you set |
| `local` | A file on your laptop | none |

If you ever change backend, edit the `backend` block in `backend.tf` and use
that backend's names. Check its documentation for the current list.

## 5. Safety features built in

- **Admin-only SSH and Kubernetes API.** The firewall module refuses to accept
  `0.0.0.0/0` for these: the validation fails the plan.
- **Delete and rebuild protection** on the server and volume, so a stray
  `destroy` cannot remove them. Turn it off on purpose (`protect = false`) when
  you really want to tear down.
- **`prevent_destroy` on the data volume**, a second layer for the most
  valuable thing we own.
- **`ignore_changes` on the image**, so a newer Ubuntu release does not
  silently rebuild the machine.
- **The API token is never in code.** It comes from the `HCLOUD_TOKEN`
  environment variable.
- **Provider lock file committed**, so everyone and CI use exactly the same
  provider build.

## 6. One-time setup (you do these)

### 6.0 Give your terminal the secrets (do this every time you open a new terminal)

Terraform needs three secrets. You never write them in a file or in the code.
Instead you hand them to your terminal, and Terraform reads them from there.

The commands below are for **bash**, which is what the Mac terminal shows
(the prompt looks like `MacBook-Pro:folder user$`). Run them one at a time. After
each one, the terminal waits for you: **paste the secret (nothing shows on
screen, that is normal) and press Enter.**

```bash
read -rsp "Paste Hetzner token: " HCLOUD_TOKEN; echo; export HCLOUD_TOKEN
read -rsp "Paste R2 access key ID: " AWS_ACCESS_KEY_ID; echo; export AWS_ACCESS_KEY_ID
read -rsp "Paste R2 secret access key: " AWS_SECRET_ACCESS_KEY; echo; export AWS_SECRET_ACCESS_KEY
```

**What does that line mean?** Take the first one and read it in pieces. The
`;` just separates commands that run one after another.

| Piece | What it does |
|---|---|
| `read` | Waits for you to type or paste something, then stores it |
| `-r` | Take what I type literally (don't treat a backslash as special) |
| `-s` | Silent: don't show what I type, so the secret isn't on screen |
| `-p "Paste Hetzner token: "` | Show this message first, so you know it is waiting |
| `HCLOUD_TOKEN` | The name of the box the secret is stored in |
| `echo` | Prints a blank line (the silent mode doesn't add one) |
| `export HCLOUD_TOKEN` | Makes that box visible to programs started from this terminal, like Terraform. Without `export`, only the terminal itself would know about it |

The other two lines do exactly the same, just with different names and
messages.

Check one is set without showing it:

```bash
[ -n "$HCLOUD_TOKEN" ] && echo set
```

You should see `set`. If you see nothing, it is not set.

**Important: "set" is not the same as "exported".** The `echo` and `[ -n ... ]`
checks only prove the variable exists *in your terminal*. Terraform is a separate
program, and it only sees variables that were **exported**. If you ran the `read`
part but not `export`, your checks look fine but Terraform finds nothing. The
proof that Terraform can see a variable is:

```bash
env | grep -c '^AWS_ACCESS_KEY_ID='
```

`1` means exported, `0` means it is not. If it is `0`, run
`export AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY HCLOUD_TOKEN`.

The check line works like this:

| Piece | What it does |
|---|---|
| `$HCLOUD_TOKEN` | Means "the value stored in that box" |
| `-n` | Is true when the thing after it is **not empty** |
| `[ ... ]` | A yes/no test |
| `&&` | Only run the next command if the test says yes |
| `echo set` | Print the word `set` |

So it reads: "if the box is not empty, print `set`". It never prints the
secret itself.

Things to know:

- **They only live in that one terminal window.** Open a new window or tab and
  you must paste them again. Closing the window forgets them. That is a
  feature: nothing sits on disk.
- **Keep the name `HCLOUD_TOKEN` exactly.** The code never contains the token;
  the Hetzner provider looks for a variable with that exact name. You only
  supply the value.
- **Check the key lengths.** The R2 key ID is 32 characters and the secret is
  64. Check with `echo ${#AWS_ACCESS_KEY_ID} ${#AWS_SECRET_ACCESS_KEY}`: you
  should see `32 64`. A 20-character key is a real Amazon key, which means an old
  value is loaded or the wrong one was pasted. The error looks like
  `Credential access key has length 20, should be 32`.
- **Why do the R2 keys have "AWS" in their names?** Terraform stores its state
  using a method originally built for Amazon's storage (S3), and it looks for
  login details under those names. Cloudflare R2 copies that method, so we
  paste the *Cloudflare* keys under the AWS-looking names. No Amazon account is
  involved. If you ever have real AWS keys loaded in the same window, they
  would clash, so use a fresh window.
- **If a secret ever leaks** (pasted in chat, committed to git), delete it in
  the Hetzner or Cloudflare dashboard and create a new one.
- **Later, to avoid retyping:** store them in the macOS Keychain and load them
  with a small helper in `~/.bash_profile`. We will add this once the basics
  work.

### 6.1 Cloudflare R2 bucket for state
1. Cloudflare dashboard → **R2 Object Storage** → enable it (it asks for a
   payment method but the free allowance covers this).
2. **Create bucket** named `portfolio-tfstate`. Keep it private.
3. **Manage R2 API tokens** → create a token with **Object Read & Write**,
   limited to that one bucket. Copy the **Access Key ID** and **Secret Access
   Key** somewhere safe (a password manager). The secret is shown once.
4. Note your **Account ID** (R2 overview page).

### 6.2 Pick a server type
Hetzner renames and retires server types, so don't copy one from a blog. Ask
the API what exists now:

```bash
curl -s -H "Authorization: Bearer $HCLOUD_TOKEN" \
  "https://api.hetzner.cloud/v1/server_types?per_page=50" \
  | python3 -c "import sys,json; [print(t['name'], t['cores'],'vCPU', t['memory'],'GB', t['disk'],'GB disk', t['architecture'], 'deprecated' if t.get('deprecation') else '') for t in json.load(sys.stdin)['server_types']]"
```

You need roughly **2 vCPU and 4 GB RAM at minimum**: Kubernetes, Postgres and
Prometheus/Grafana together will not fit comfortably in 2 GB. Check the price
for your chosen type and location in the Hetzner console before applying, and
compare it with your budget. `x86` types are the safe choice for container
images; Arm types are cheaper but every image must support Arm.

### 6.3 Your public IP
```bash
curl -4 ifconfig.me
```
Use it as `x.x.x.x/32` in `admin_cidrs`. If your IP changes (home internet
often does), SSH will stop working until you update it and re-apply. We will
look at a more flexible approach in a later doc.

### 6.4 Local config files
```bash
cd infra/terraform/envs/prod
cp terraform.tfvars.example terraform.tfvars   # fill in your values
cp backend.hcl.example backend.hcl             # fill in the R2 endpoint
```
Both files are git-ignored. `ssh_public_key` is the **contents** of
`~/.ssh/hetzner_portfolio.pub`.

## 7. Run it locally first

Always do the first run by hand so you see every step.

```bash
# First do 6.0 in this same terminal window (the three secrets).

cd infra/terraform/envs/prod
terraform init -backend-config=backend.hcl
terraform plan
```

**Read the plan.** Expected: 7 resources to add (network, subnet,
firewall, SSH key, server, volume, volume attachment) and nothing to change or
destroy. If you see destroys, stop.

```bash
terraform apply
```

Type `yes` when prompted. Afterwards:

```bash
terraform output server_ipv4
ssh -i ~/.ssh/hetzner_portfolio root@$(terraform output -raw server_ipv4)
```

### How to know it worked
- `terraform output` prints an IPv4 address.
- SSH logs you in as root.
- In the Hetzner console you see the server, the firewall attached to it, and
  the volume attached.

## 8. The CI/CD pipeline

`.github/workflows/infra.yml` follows the same shape as the AWS pipeline.

| When | What runs |
|---|---|
| Pull request touching `infra/terraform/**` | format check, validate, then a **plan** shown in the run summary |
| Merge to `main` | plan again, then **apply** after a human approves |

The saved plan file is what gets applied, so what you reviewed is exactly what
runs. A `concurrency` rule makes sure two runs never touch the state at once.

**Difference from AWS:** on AWS the pipeline proved who it was with short-lived
OIDC tokens and had no stored keys. Hetzner has no equivalent, so CI holds a
Hetzner API token as a GitHub secret. Mitigations: the token only covers this
Hetzner project, apply needs approval, and fork pull requests get no secrets.

### GitHub setup (you do these)
Repository → Settings:

| Where | Name | Value |
|---|---|---|
| Secrets | `HCLOUD_TOKEN` | Hetzner API token (read & write) |
| Secrets | `R2_ACCESS_KEY_ID` | from 6.1 |
| Secrets | `R2_SECRET_ACCESS_KEY` | from 6.1 |
| Secrets | `R2_ENDPOINT` | `https://<ACCOUNT_ID>.r2.cloudflarestorage.com` |
| Secrets | `CLOUDFLARE_API_TOKEN` | the `terraform-dns` token from doc 04 (DNS edit, one zone only) |
| Secrets | `TF_VAR_SSH_PUBLIC_KEY` | contents of the `.pub` file |
| Secrets | `TF_VAR_ADMIN_CIDRS` | `["x.x.x.x/32"]` (with the brackets and quotes) |
| Variables | `SERVER_TYPE` | the type you picked |
| Variables | `HCLOUD_LOCATION` | e.g. `fsn1` |
| Variables | `CLOUDFLARE_ZONE_ID` | the domain's zone ID (not secret); see doc 04 |
| Environments | `hetzner-production` | add yourself under **Required reviewers** |

## 9. When things go wrong

| Symptom | Likely cause |
|---|---|
| `Error: Failed to get existing workspaces` / 403 on init | Wrong R2 keys, or the token isn't scoped to the bucket |
| `NoSuchBucket` | Bucket name in `backend.tf` differs from what you created |
| `invalid token` from Hetzner | `HCLOUD_TOKEN` unset in this shell, or the token is read-only |
| `server type … not found` / deprecated | Re-run the API call in 6.2 and pick a current type |
| `admin_cidrs must be a non-empty list…` | You used `0.0.0.0/0` or left it empty |
| SSH times out | Your IP changed; update `admin_cidrs` and apply |
| `Error acquiring the state lock` | Another run is in progress, or one was killed; wait, then investigate before forcing |

**State locking on R2:** `use_lockfile` relies on S3 conditional writes. On our
first `plan` and `apply` Terraform printed "Releasing state lock", so locking
works with R2. (To see it yourself, run a `plan` and look for a `.tflock` file
next to the state file in the bucket while it runs.)

### Problems we actually hit (and what each one really meant)

These happened during the first `terraform init`, in this order. They look
unrelated but had one root cause.

**1. `Credential access key has length 20, should be 32`**
- *What it says:* the key Terraform sent to R2 is the wrong length. R2 key IDs
  are 32 characters; an Amazon key is 20.
- *What it really meant:* Terraform did not see our R2 keys at all, so it fell
  back to an old Amazon login saved on this Mac in `~/.aws/credentials` (left over
  from the old AWS stack) and sent that to R2.
- *Fix:* make sure the keys are **exported** (see the box in 6.0).

**2. `No valid credential sources found ... no EC2 IMDS role found`**
- *What it says:* Terraform looked everywhere for a login and found none.
- *What it really meant:* we had told Terraform to ignore the old Amazon file
  (`AWS_SHARED_CREDENTIALS_FILE=/dev/null AWS_CONFIG_FILE=/dev/null`), so with the
  keys not exported there was nothing left. This confirmed problem 1.
- *Fix:* the same: export the keys.

**3. `lookup s3.auto.amazonaws.com: no such host`**
- *What it says:* Terraform tried to reach a made-up Amazon address.
- *What it really meant:* we ran `terraform init` **without**
  `-backend-config=backend.hcl`, so it never learned the Cloudflare R2 address and
  guessed an Amazon one from the region name `auto`.
- *Fix:* always include `-backend-config=backend.hcl` when running `init`.

**4. Two false leads worth knowing about**
- `echo ${#AWS_ACCESS_KEY_ID}` printing `32 64` does **not** prove the variable is
  exported (see 6.0).
- A half-typed line such as `ACCESS_KEY_ID; echo; ...` just gives
  `command not found`. Harmless; paste the whole line.

**What finally worked:**
```bash
export AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY HCLOUD_TOKEN
AWS_SHARED_CREDENTIALS_FILE=/dev/null AWS_CONFIG_FILE=/dev/null \
  terraform init -reconfigure -backend-config=backend.hcl
```
The two `=/dev/null` settings tell Terraform to ignore any old Amazon login on
your machine. Once the keys are exported, Terraform should prefer them anyway, so
these settings are a safety net rather than a requirement; we did not test
without them after fixing the export. Keep them if you still have an old
`~/.aws/credentials` and want to be sure it can never be used by mistake.

**A general habit:** when an error looks confusing, ask "what does Terraform
actually see?" before changing anything. `env | grep -c '^NAME='` answers that
for any variable.

## 10. Cost notes

- Private networks, firewalls and R2's free tier cost nothing.
- You pay for the server, the volume (per GB per month) and possibly the public
  IPv4 address. Check current prices in the console before applying.
- Servers are billed while they exist, **including when powered off**. The only
  way to stop paying is to delete them, which is why backups of the data
  volume matter (a later doc).

## 11. What comes next

`02` Ansible: harden the server (users, SSH, automatic updates), mount the
data volume, and install k3s.

## 12. Lost your SSH key or passphrase: replacing the server

**What happened to us:** we forgot the passphrase of the new key right after the
first apply. A passphrase cannot be recovered by anyone, so the key was
useless.

**Why we can't just swap the key in Terraform:** Hetzner installs your public key
on the server only when it is *created*. The server module deliberately has
`ignore_changes = [ssh_keys]`, so editing the key later does nothing to a
running server. (That protection exists so a small edit can never wipe a
machine.) The clean fix is to replace the server. Do this only while the server
holds nothing you can't recreate. The data volume is not deleted by this.

**Steps**

1. Set aside the old key and make a new one. Put the passphrase in your password
   manager *immediately*:
   ```bash
   mv ~/.ssh/hetzner_portfolio ~/.ssh/hetzner_portfolio.lost
   mv ~/.ssh/hetzner_portfolio.pub ~/.ssh/hetzner_portfolio.lost.pub
   ssh-keygen -t ed25519 -f ~/.ssh/hetzner_portfolio -C "hetzner-portfolio"
   ```
2. Put the new public key (the contents of `hetzner_portfolio.pub`) into
   `ssh_public_key` in `terraform.tfvars`.
3. The server has delete and rebuild protection, so Terraform cannot replace it.
   Turn protection off, as its own step:
   ```bash
   terraform apply -var protect=false
   ```
   Read the plan: it should show only protection flags changing on the server
   and volume, plus the SSH key being replaced.
4. Replace the server, and turn protection back on in the same step:
   ```bash
   terraform apply -replace=module.server.hcloud_server.this
   ```
   Read the plan: the old server is destroyed and a new one created. The data
   volume is only detached and re-attached, never destroyed.
5. The new server has a new identity (host key). Even though it kept the **same
   IP** in our run, SSH printed `WARNING: REMOTE HOST IDENTIFICATION HAS CHANGED!`
   because the Mac had saved the old server's identity in `~/.ssh/known_hosts`
   when we first tried to connect. This is expected after a rebuild, not an attack:
   we replaced the machine ourselves. Remove the stale entry and reconnect:
   ```bash
   ssh-keygen -R <ip>
   ```
   Then SSH asks you to trust the new host: type `yes`.
   **If you see this warning and you have NOT just rebuilt the server, do not
   clear it. That is exactly the situation the warning exists to catch.**
6. Check you can log in: `ssh -i ~/.ssh/hetzner_portfolio root@<new-ip>`.

**What the two plans should look like (from our real run)**

Step 3 (`-var protect=false`), summary `1 to add, 2 to change, 1 to destroy`:
- the server and the volume are *updated in place* (delete and rebuild
  protection go from `true` to `false`). Neither is destroyed.
- the SSH key is *replaced*: the old key record is destroyed and one with the new
  key is created. This is only a record in Hetzner; it does not touch the server.

Step 4 (`-replace=...`), summary `2 to add, 1 to change, 2 to destroy`:
- the server is replaced (`-/+`), with `ssh_keys` changing to the new key's ID
  and protection going back to `true`.
- the volume attachment is replaced, because it points at the server.
- the volume is only *updated in place* (protection back to `true`). It is not
  destroyed. If a plan ever shows the volume being destroyed, **stop**.
- the server's IPv4 and IPv6 addresses change (`(known after apply)`).

**A harmless oddity:** the plan shows the server's `network { ... }` and
`public_net { ... }` blocks removed and added back with the same values. That is
how the Hetzner provider lists those blocks and is not a real change. It does not
create or delete anything.

**Why replace instead of fixing the old server?** The alternative is to reset the
root password in the Hetzner web console and add the new key by hand. That works
but changes the server in a way Terraform does not know about, so the code would
no longer describe reality. Replacing keeps the code as the single source of
truth, and it costs nothing while the server is empty.

**Prevent it next time:** store the passphrase in a password manager the moment
you create it, and test the login once before building anything on the server.
