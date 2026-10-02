# 02 · Ansible: set up and lock down the server

In doc 01 Terraform created an empty server. Now we make it safe and ready.
By the end you will have a named admin user instead of root, password logins
turned off, automatic security updates, brute-force protection, and the data
disk mounted. Doc 03 installs Kubernetes on top.

**What you will learn:** what Ansible is, how it differs from Terraform, what
"idempotent" means, how to dry-run a change before making it, and how to lock
down SSH without locking yourself out.

---

## 1. Terraform vs Ansible, in one picture

| | Terraform | Ansible |
|---|---|---|
| Job | Creates the **things** (server, firewall, disk) | Configures what is **inside** the server (users, settings, software) |
| Talks to | Hetzner's API | The server itself, over SSH |
| Remembers | A state file | Nothing: it checks the server each time |

Terraform builds the house; Ansible furnishes it. Neither replaces the other.

## 2. The vocabulary

- **Inventory:** the list of servers Ansible may touch (ours has one).
- **Module:** one small job, e.g. "make sure this user exists" (`ansible.builtin.user`).
- **Task:** one use of a module.
- **Role:** a folder of related tasks (`base`, `data_volume`, `ssh_hardening`).
- **Playbook:** a file that says "run these roles on these servers".
- **Idempotent:** running it twice gives the same result as running it once. A
  task says "this user must exist", not "create a user", so a second run changes
  nothing. That makes playbooks safe to re-run.

## 3. What is in the folder

```
infra/ansible/
├─ ansible.cfg
├─ requirements.yml            extra module collection we need
├─ inventory/
│  ├─ hosts.example.yml        copy to hosts.yml (git-ignored) with your server
│  └─ group_vars/all.yml       settings: admin user name, mount path, ...
├─ playbooks/
│  ├─ 01-bootstrap.yml         run as root: user, updates, fail2ban, disk
│  └─ 02-lock-ssh.yml          run as the admin user: turn off passwords/root
└─ roles/
   ├─ base/                    user, sudo, updates, fail2ban
   ├─ data_volume/             mounts the Postgres disk
   └─ ssh_hardening/           the SSH lockdown
```

## 4. Why two playbooks? (the lockout trap)

The classic way to ruin a new server is to disable root login before the new
admin account works. You are then locked out with no way in.

So the work is split on purpose:

1. **`01-bootstrap`** connects as `root` and creates your admin user. It does not
   change SSH settings, so root keeps working.
2. You **test** the admin login yourself, in a second terminal.
3. **`02-lock-ssh`** connects **as the admin user**, so it *cannot run* unless the
   admin login already works. Only then does it turn off root and passwords.

The SSH change itself is also guarded: the new settings are written, checked
with `sshd -t`, and only then reloaded. If the check fails, the file is removed
and nothing is reloaded. Existing connections also stay open during a reload.

## 5. What each part does and why

**`base` role**
- Installs pending security updates and a few packages.
- Creates the admin user (default `bamise`, change it in `group_vars/all.yml`) with
  **no password**, and installs your public key. You log in with the key only.
- Gives that user passwordless `sudo`. With no password, sudo cannot ask for one.
  The trade-off: whoever has your key is effectively root, which is why the key
  has a passphrase. The sudoers file is checked with `visudo` before it is saved,
  because a broken sudoers file would lock you out of sudo.
- Turns on **automatic security updates** (`unattended-upgrades`).
- Configures **fail2ban**: an address that fails SSH login 5 times in 10 minutes is
  banned for an hour. (Hetzner's firewall already limits SSH to your IP, so this
  is a second layer.)

**`data_volume` role**
- Mounts the 10 GB disk at `/srv/data`. Terraform already formatted it as ext4.
- Uses the options `nofail` (a missing disk at boot must not stop the server from
  starting) and `discard` (lets the disk reclaim deleted space).

**`ssh_hardening` role** writes `/etc/ssh/sshd_config.d/00-hardening.conf`:

| Setting | Meaning |
|---|---|
| `PasswordAuthentication no` | Passwords are never accepted, only keys |
| `KbdInteractiveAuthentication no` | Closes the other password-style login route |
| `PermitRootLogin no` | Nobody can log in directly as root |
| `MaxAuthTries 3` | Three attempts per connection |
| `X11Forwarding no` | Turns off an unneeded feature |

The file is named `00-` on purpose. SSH uses the **first** value it finds for a
setting, and files in that folder are read in alphabetical order. The cloud image
ships its own file that allowed password login (we saw `passwordauthentication yes`
on the new server), so ours must sort first to win.

## 6. Before you start (you do these)

1. **Install Ansible** (and keep it out of the repo):
   ```bash
   brew install ansible
   ```
2. **Let your Mac remember the key passphrase.** Ansible connects many times and
   cannot type a passphrase for you, so load the key into the SSH agent once:
   ```bash
   ssh-add --apple-use-keychain ~/.ssh/hetzner_portfolio
   ```
   Enter the passphrase once; macOS stores it in the Keychain.
3. **Install the extra collection:**
   ```bash
   cd infra/ansible
   ansible-galaxy collection install -r requirements.yml
   ```
4. **Create your inventory:**
   ```bash
   cp inventory/hosts.example.yml inventory/hosts.yml
   ```
   Edit it: put the server IP in `ansible_host`, and the disk path in
   `data_volume_device`. Get both from Terraform (run it from
   `infra/terraform/envs/prod` with your secrets set, as in doc 01):
   ```bash
   terraform output -raw server_ipv4
   terraform output -raw data_volume_device
   ```
5. **Check Ansible can reach the server:**
   ```bash
   ansible all -m ping -u root
   ```
   You should see `pong`.

## 7. Run it

### Step A: bootstrap (as root)

First a **dry run**. `--check` shows what *would* change without changing it, and
`--diff` shows the exact lines:

```bash
ansible-playbook playbooks/01-bootstrap.yml -u root --check --diff
```

**A dry-run trap we hit:** on a brand-new server the package list is empty, and in
`--check` mode Ansible does not really refresh it. So the dry run failed with
`No package matching 'fail2ban' is available`. That is a limit of dry runs, not
a mistake in the playbook: in a real run the refresh happens first. To let the
dry run get further, refresh the list once for real (harmless, changes no
settings), then dry-run again:

```bash
ansible all -u root -m apt -a "update_cache=yes"
```

Dry runs also cannot predict tasks that depend on a package they did not really
install, such as starting its service. A few such errors are normal. Then the
real run:

```bash
ansible-playbook playbooks/01-bootstrap.yml -u root
```

At the end it prints a recap. `failed=0` is what you want.

### Step B: test the admin login (do not skip)

Open a **second** terminal and log in as the new user:

```bash
ssh -i ~/.ssh/hetzner_portfolio bamise@<server-ip>
sudo whoami          # should print: root
df -h /srv/data      # should show the 10 GB disk
```

Keep this second terminal open until step C is finished and verified.

### Step C: lock SSH (as the admin user)

```bash
ansible-playbook playbooks/02-lock-ssh.yml -u bamise
```

### Step D: prove it worked

- `ssh -i ~/.ssh/hetzner_portfolio root@<server-ip>` must now be **refused**.
- `ssh -i ~/.ssh/hetzner_portfolio bamise@<server-ip>` must still work.
- On the server: `sudo sshd -T | grep -Ei "passwordauthentication|permitrootlogin"`
  should print `passwordauthentication no` and `permitrootlogin no`.
- `systemctl is-active fail2ban` prints `active`.

### Run it again

Run step A or C a second time. The recap should show `changed=0`: that is
idempotence, and it proves nothing drifted.

## 8. When things go wrong

| Symptom | Likely cause |
|---|---|
| `'admin_user' is undefined` | `group_vars` must sit next to the **inventory** (`inventory/group_vars/`) or next to the playbook. Ours had been put at the top level, where Ansible never looks. Fixed by moving it |
| `Permission denied (publickey)` on ping | Key not loaded in the agent: run the `ssh-add` line in section 6 |
| Hangs asking for a passphrase | Same: Ansible cannot type it; use the agent |
| `Host key verification failed` | The server was rebuilt; see doc 01, section 12 |
| `Failed to find required executable` / module missing | Run `ansible-galaxy collection install -r requirements.yml` |
| `02-lock-ssh` fails with "no authorized_keys" | Run step A first |
| Step C fails at `sshd -t` | The new settings were removed automatically; nothing changed. Read the message and tell us |
| Locked out anyway | Use the Hetzner console's rescue mode or web console to log in and undo `/etc/ssh/sshd_config.d/00-hardening.conf` |

## 9. Cost

Nothing. Ansible is free and runs from your laptop.

## 10. What comes next

`03` k3s: install Kubernetes on the server, and put Cloudflare and TLS in front.
