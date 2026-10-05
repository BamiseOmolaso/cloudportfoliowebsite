# Runbook: release a new version, and roll it back

**Use this when** a change is merged to `staging` and you want it live, or when a release
went wrong and you want the previous version back.

A **runbook** is a short checklist for a known job. Follow it top to bottom.

New words: a **digest** is a fingerprint of an image's contents (`sha256:...`). A tag
(`sha-8f7b6c4`) is only a label that someone could move; a digest cannot be moved, so the
cluster is told to run the digest. **ArgoCD** is the tool inside the cluster that makes it
match whatever is on the `main` branch.

---

## 1. How a release works

Work only ever moves one way: **feature, then `staging`, then `main`**. A release is two
small pull requests, because the digest only exists once the image has been built.

```mermaid
flowchart LR
  F["Feature pull request"] --> ST["staging"]
  ST -->|"website files changed"| B["build-image.yml<br/>build, sign, scan, publish"]
  B --> A["image-app / image-migrator<br/>saved as small files"]
  A -->|"scripts/release.sh prepare"| P1["PR into staging<br/>manifests point at the new digest"]
  P1 --> ST2["staging"]
  ST2 -->|"scripts/release.sh promote"| P2["PR staging to main"]
  P2 -->|"you merge"| M["main"]
  M --> ARGO["ArgoCD syncs<br/>1. migrate job<br/>2. rolling update"]
```

Merging the **promote** pull request (staging to main) is the deployment. Nothing else deploys.
Because everything flows forward, `staging` and `main` never disagree about the image.

## 2. Release

1. Make sure the change is merged to `staging` and its **Build and publish images** run is
   green (Actions tab). A change that touches no website file builds nothing, so there is
   nothing to release.
2. **Step 1, point the manifests at the new image.** On a clean working tree:

   ```bash
   scripts/release.sh prepare
   ```

   It takes the newest successful staging build, checks the signatures if `cosign` is
   installed, writes `tag@digest` into both manifests (`30-deployment.yaml` and
   `20-migrate-job.yaml`) and opens a pull request **into `staging`**. (To use an older
   build, pass its run number: `scripts/release.sh prepare 37239706932`. If `main` ever has
   commits `staging` lacks, this step brings them in first.) Merge it. It touches only
   infrastructure files, so it does not trigger another image build.
3. **Step 2, promote.**

   ```bash
   scripts/release.sh promote
   ```

   Opens the pull request **staging to main** and lists the files it changes. Review that
   list, wait for checks, and **merge with a merge commit, never squash**.
4. Watch it roll out (needs the WireGuard tunnel, doc 11, and the Hetzner kubectl context):

   ```bash
   kubectl -n portfolio get pods -w
   kubectl -n portfolio get pods -o jsonpath='{..image}'     # shows the digest now running
   curl -s https://oluwabamiseomolaso.com.ng/api/health
   ```

   The migration job runs first. Then pods are replaced one at a time and a new pod only
   receives visitors when its readiness probe passes, so a broken image never takes the site
   down: the old pods keep serving.

## 3. Roll back

Revert the **promote** pull request (staging to main) on GitHub ("Revert" button), merge the revert pull request.
ArgoCD returns the cluster to the previous digest within a few minutes. (ArgoCD's own
"Rollback" button does nothing here because automatic sync is on and would undo it.)

**The database caveat.** Migrations only go forward. If the bad release included a database
migration, the old app now runs against the newer schema. That works when the migration only
*added* things (a new column or table). It can break when the migration removed or renamed
something. So: **write migrations in two steps** (add first; remove in a later release once
nothing uses it). If a release did remove something, restore from the backup (doc 06)
instead of relying on a revert.

**Not rehearsed yet.** Do one rehearsal when nothing important is happening: release, then
revert, and time it. Write the result below.

| Date | What was rehearsed | Time to recover | Notes |
|---|---|---|---|
| | | | |

## 4. Everything on `staging` goes live together

A promotion carries **all** of `staging`, not only the image: documentation, workflows and
infrastructure files too. That is the point of `staging`: only merge things there that are
ready. If something on `staging` is not ready, finish or revert it before promoting.
