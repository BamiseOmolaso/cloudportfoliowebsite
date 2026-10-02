# 03 · Kubernetes with k3s

In doc 02 the server was locked down. Now we install Kubernetes on it and prove
it works by serving a test page.

**What you will learn:** what Kubernetes is in plain words, why we use k3s, what
the main building blocks are, how your laptop talks to the cluster, and how to
check that a cluster is healthy.

---

## 1. Kubernetes in plain words

You package your app as a **container** (a sealed box holding the app and
everything it needs). Kubernetes is a manager for containers: you tell it "I want
this container running, reachable on this address", and it starts it, restarts it
if it crashes, and lets you update it without downtime.

You describe what you want in YAML files. Kubernetes keeps the real world matching
those files. This is the same idea as Terraform: you declare the end result.

## 2. Why k3s?

Full Kubernetes is built for large fleets and needs a lot of memory. **k3s** is a
fully certified, much smaller Kubernetes made for single servers and small
setups. It runs comfortably on our 4 GB server and comes with the extras we need
already bundled:

| Bundled piece | What it does for us |
|---|---|
| **Traefik** | The "front door": takes web traffic on ports 80 and 443 and routes it to the right app |
| **ServiceLB** | Lets Traefik use the server's own ports 80 and 443 (a cloud load balancer would cost money) |
| **CoreDNS** | Lets apps find each other by name |
| **Local path storage** | Lets apps keep data on the server's disk |

**An honest limit:** one server means no high availability. If it goes down, the
site is down until it is back. For a personal portfolio that is a fair trade; the
rebuild-from-code design is what makes recovery quick.

## 3. The building blocks (a short glossary)

- **Node:** a machine in the cluster. We have one.
- **Pod:** one or more containers running together. The smallest unit.
- **Deployment:** "keep N copies of this pod running". It replaces crashed pods.
- **Service:** a stable internal address for a set of pods (pods come and go; the
  Service stays).
- **Ingress:** the rule "web requests for this address go to that Service". Traefik
  reads Ingress rules.
- **Namespace:** a folder that groups related things (and lets us set rules per
  group).

## 4. What the playbook does

`playbooks/03-k3s.yml` runs the `k3s` role, which:

1. Writes `/etc/rancher/k3s/config.yaml` **before** installing, so k3s starts with
   our settings the first time:
   - `tls-san`: puts the server's public IP into the API's TLS certificate. Without
     it, `kubectl` from your laptop would refuse to connect.
   - `secrets-encryption: true`: Kubernetes Secrets (passwords, tokens) are
     encrypted in the cluster's database, not just base64-encoded.
   - `write-kubeconfig-mode: "0600"`: only root can read the admin file on the
     server.
2. Downloads the installer from the **tag that matches our pinned version**, so the
   script's content is fixed, not "whatever is newest". The installer verifies
   the k3s binary's checksum itself.
3. Installs k3s once (skipped if it is already installed).
4. Waits until the node reports `Ready`.
5. Copies the cluster's admin kubeconfig to your laptop at
   `~/.kube/hetzner-portfolio.yaml`, rewriting `127.0.0.1` to the server address
   and the generic name `default` to `hetzner-portfolio`, so it never gets mixed up
   with another cluster. Task output is hidden (`no_log`) because it carries a
   credential.

### The version pin

`k3s_version` in `inventory/group_vars/all.yml` is `v1.35.9+k3s1`. Why that one?
`kubectl` supports a server at most **one minor version** apart from itself. Your
`kubectl` is 1.34, the newest "stable" k3s is 1.36 (two versions ahead), so we pin
1.35. When you upgrade `kubectl` (`brew upgrade kubectl`), you can move up.
Check yours with `kubectl version --client`.

Because the install step has `creates:`, **changing the version later does not
upgrade a running cluster.** Upgrading is a deliberate separate job; we will cover
it when there is something worth protecting.

## 5. Run it (you do these)

From the `infra/ansible` folder, with your SSH key loaded (`ssh-add`, as in doc 02):

```bash
ansible-playbook playbooks/03-k3s.yml -u bamise
```

It takes a few minutes. The recap should show `failed=0`.

### Point kubectl at the cluster

Your `~/.kube/config` may already hold other clusters (a local Docker or minikube
cluster, for example). So we do **not** merge. We pick the file per terminal:

```bash
export KUBECONFIG=~/.kube/hetzner-portfolio.yaml
kubectl config current-context     # hetzner-portfolio
```

(`export` lasts for that terminal window only, like the secrets in doc 01.)

### Check the cluster is healthy

```bash
kubectl get nodes                 # one node, STATUS Ready
kubectl get pods -A               # everything Running or Completed
```

For a fresh k3s you should see pods for `coredns`, `local-path-provisioner`,
`metrics-server` and `traefik` (plus a few `svclb-traefik` and `helm-install-*`
pods that show `Completed`). It can take a minute or two for all of them to settle.

**Always check which cluster you are talking to before you `apply` or `delete`.**
Open a new terminal window and `KUBECONFIG` is gone; `kubectl` then silently uses
your default config, which may point at a different cluster. In our run it pointed
at a local cluster that was not running, so the command failed with
`dial tcp 127.0.0.1:...: connection refused`. That was lucky: if that cluster had
been running, the command would have changed the wrong one. The habit:

```bash
export KUBECONFIG=~/.kube/hetzner-portfolio.yaml
kubectl config current-context     # must print: hetzner-portfolio
```

> **Keep the kubeconfig file private.** It contains an admin credential: anyone
> holding it controls the cluster. It lives outside the repo on purpose. Our
> firewall also only lets your IP reach the API port (6443), which is a second
> layer, but do not rely on that alone.

## 6. Test page: prove the whole path works

`infra/k8s/hello/hello.yaml` creates a namespace, a tiny test web server, a
Service and an Ingress. Run it from the repo root:

```bash
kubectl apply -f infra/k8s/hello/hello.yaml
kubectl -n hello get pods          # wait until 1/1 Running
curl http://<server-ip>/           # replace with your server IP
```

Run `apply` from the **repo root** (the folder that contains `infra/`). The path is
relative, so from any other folder you get `the path "infra/k8s/hello/hello.yaml"
does not exist`.

You should get a short text reply that includes `Hostname:` and your request
details. That one answer proves: internet → firewall → Traefik → Ingress → Service
→ pod.

**What we saw:** the reply included `Hostname: hello-...`, `X-Forwarded-Server:
traefik-...` and `X-Real-Ip: 10.42.0.1`. The Hostname is the pod, and the
Traefik header shows the request went through the front door. `10.42.x.x` is the
cluster's internal network.

**Notice `X-Real-Ip` is not your own IP.** Traffic enters through the built-in
load balancer (ServiceLB), which hides the visitor's real address. This matters
for the app: its rate limiting counts requests per client IP. Behind Cloudflare
the real address arrives in a header (`CF-Connecting-IP`), and Traefik must be told
to trust it. We handle that when the app is deployed (doc 04/05).

**The `helm-install-*` pods show `Completed` with a few restarts.** That is
normal: they are one-time jobs that install Traefik, and they retry while the
cluster settles.

A few things in the file are worth reading, because the app will follow the same
habits:

- **`pod-security.kubernetes.io/enforce: restricted`** on the namespace: Kubernetes
  rejects any pod that runs as root, can escalate privileges, or has more powers
  than it needs.
- **`runAsNonRoot`, `readOnlyRootFilesystem`, `capabilities: drop: ALL`:** the
  container is locked down so a bug in it cannot do much.
- **`args: ["--port=8080"]`:** a non-root process cannot listen on port 80, so the
  app listens on 8080 and the Service maps 80 to it.
- **`resources` requests and limits:** how much CPU and memory the pod asks for
  and may use. Without limits one runaway pod can starve the whole 4 GB server.
- **A pinned image tag (`v1.10.3`)**, never `latest`.

### Clean up

```bash
kubectl delete -f infra/k8s/hello/hello.yaml
```

(The test page answers on every address and path, so remove it before real apps
arrive.)

## 7. When things go wrong

| Symptom | Likely cause |
|---|---|
| `Permission denied (publickey)` | Key not in the agent: `ssh-add --apple-use-keychain ~/.ssh/hetzner_portfolio` |
| `kubectl` hangs or times out | Your public IP changed, so the firewall blocks port 6443. Update `admin_cidrs` and apply Terraform (doc 01) |
| `x509: certificate is valid for ..., not <ip>` | The IP is missing from `tls-san`, or the server's address changed |
| Node `NotReady` | Check on the server: `sudo systemctl status k3s` and `sudo journalctl -u k3s -n 50` |
| Pods `Pending` forever | Out of memory or disk: `kubectl describe pod ...` shows the reason |
| `curl` to the IP times out | Check `kubectl -n kube-system get pods` for `svclb-traefik` and `traefik` |
| Pod rejected: `violates PodSecurity "restricted"` | The namespace rule is working; the pod needs the security settings shown above |
| Version warning from kubectl | Client and server are more than one minor version apart (section 4) |

## 8. Cost

Nothing extra: k3s is free and runs on the server we already pay for. Watch memory:
`kubectl top nodes` shows usage (metrics-server is bundled).

## 9. What comes next

`04` Cloudflare and TLS: point your domain at the server and get HTTPS working.
Then Postgres (using the data disk) and the app itself.
