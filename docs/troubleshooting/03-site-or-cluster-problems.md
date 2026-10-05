# The live site, a release or the cluster misbehaves

`kubectl` commands need the WireGuard tunnel and the Hetzner context
(see [docs/infra/11-wireguard.md](../infra/11-wireguard.md)). Your laptop may also have an
unrelated local context (`kind-...`); `kubectl config current-context` shows which one you are
talking to.

## Start from the visitor's side and walk inwards

```bash
curl -sI https://oluwabamiseomolaso.com.ng | head -5                 # does it answer? what code?
curl -s  https://oluwabamiseomolaso.com.ng/api/health                # the app's own health check
```

A web address that answers with `200` and the health JSON is up. Then go inwards one link at a
time and stop at the first one that is wrong.

| Link | Command | What "good" looks like |
|---|---|---|
| DNS and Cloudflare | `dig +short oluwabamiseomolaso.com.ng` | Cloudflare addresses |
| The deployment | `kubectl -n portfolio get deploy,pods` | pods `Running` and `1/1` ready |
| What is running | `kubectl -n portfolio get pods -o jsonpath='{..image}'` | the digest you released |
| Why a pod is unhappy | `kubectl -n portfolio describe pod <name>` | read the **Events** at the bottom |
| The app's own words | `kubectl -n portfolio logs deploy/portfolio --tail=100` | no repeating errors |
| The database | `kubectl -n postgres get pods` | `Running` |
| ArgoCD | `kubectl -n argocd get applications` | `Synced` and `Healthy` |
| The migration | `kubectl -n portfolio get jobs`; `kubectl -n portfolio logs job/<name>` | completed |

## Common symptoms

| Symptom | Usual cause | Next step |
|---|---|---|
| Pod `ImagePullBackOff` | The image name or digest is wrong, or the registry cannot be reached or the secret is missing | `describe pod`, read the Events; confirm the digest exists with `docker buildx imagetools inspect <ref>` |
| Pod `CrashLoopBackOff` | The app starts and dies (missing environment value, database unreachable) | `logs --previous` shows why it died |
| Pod `Running` but not `Ready` | The readiness probe fails; Kubernetes is holding traffic back on purpose | `describe pod`, then the logs; check `/api/health` |
| Release merged but nothing changed | ArgoCD has not synced, or is `OutOfSync` or erroring | `kubectl -n argocd get applications`; open the app's events |
| `kubectl` times out but the site works | Your IP is not allowed, or the tunnel is down | [runbook 01](../infra/runbooks/01-my-ip-changed.md) |
| Site slow or erroring only after a release | The new version misbehaves | Roll back: [runbook 03](../infra/runbooks/03-release-and-rollback.md) |
| Admin login or Cloudflare Access fails | Access policy or cookie issue | Check Access logs in Cloudflare; keep `/api/webhooks` outside Access |

## Rule of thumb

If visitors are affected and the cause is not obvious in five minutes, **roll back first**
(revert the promote pull request), then investigate calmly. A working old version beats a
broken new one.
