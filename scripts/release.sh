#!/usr/bin/env bash
# Two-step release, one direction only: feature -> staging -> main.
#
#   scripts/release.sh prepare [run-id]   # step 1: PR INTO staging that points the manifests at
#                                         #   the newest published images (tag + digest)
#   scripts/release.sh promote            # step 2 (after step 1 is merged): PR staging -> main
#
# Merging the promote PR is what deploys, because ArgoCD follows `main`. This script only
# OPENS pull requests. Needs: gh (logged in), git, perl. If cosign is installed, `prepare`
# also checks the images' signatures first.
set -euo pipefail

REPO="BamiseOmolaso/cloudportfoliowebsite"
APP_FILE="infra/k8s/apps/portfolio/30-deployment.yaml"
MIGRATE_FILE="infra/k8s/apps/portfolio/20-migrate-job.yaml"

cd "$(git rev-parse --show-toplevel)"
cmd="${1:-prepare}"

case "$cmd" in
prepare)
  if [ -n "$(git status --porcelain)" ]; then
    echo "Your working tree has uncommitted changes. Commit or discard them first." >&2
    exit 1
  fi
  START_REF="$(git rev-parse --abbrev-ref HEAD)"
  git fetch -q origin main staging

  RUN_ID="${2:-$(gh run list --repo "$REPO" --workflow "Build and publish images" --branch staging \
    --status success --limit 1 --json databaseId -q '.[0].databaseId')}"
  [ -n "$RUN_ID" ] || { echo "No successful staging build found." >&2; exit 1; }

  TMP="$(mktemp -d)"
  trap 'rm -rf "$TMP"' EXIT
  gh run download "$RUN_ID" --repo "$REPO" --pattern 'image-*' --dir "$TMP"
  APP_REF="$(cat "$TMP/image-app/image.txt")"
  MIG_REF="$(cat "$TMP/image-migrator/image.txt")"
  TAG="${APP_REF#*:}"; TAG="${TAG%%@*}"      # sha-1234567

  echo "Build run : $RUN_ID"
  echo "App       : $APP_REF"
  echo "Migrator  : $MIG_REF"

  if command -v cosign >/dev/null 2>&1; then
    for ref in "$APP_REF" "$MIG_REF"; do
      cosign verify "${ref%%:*}@${ref#*@}" \
        --certificate-identity-regexp "^https://github.com/${REPO}/" \
        --certificate-oidc-issuer https://token.actions.githubusercontent.com >/dev/null
      echo "Signature OK: ${ref%%@*}"
    done
  else
    echo "(cosign not installed: skipping the signature check)"
  fi

  BRANCH="release/${TAG}"
  git switch -q -c "$BRANCH" origin/staging
  # If main has commits staging lacks (an older release), bring them in first so the two
  # branches agree. The image lines are rewritten below, so "ours" is safe for them.
  if ! git merge-base --is-ancestor origin/main HEAD; then
    git merge -q --no-edit -X ours origin/main || { echo "Merge of main failed; resolve by hand." >&2; exit 1; }
  fi
  # "@" must be escaped, or perl would read "@sha256" as an array.
  perl -pi -e "s#image: ghcr\.io/[^/]+/cloudportfoliowebsite:\S+#image: ${APP_REF//@/\\@}#" "$APP_FILE"
  perl -pi -e "s#image: ghcr\.io/[^/]+/cloudportfoliowebsite-migrator:\S+#image: ${MIG_REF//@/\\@}#" "$MIGRATE_FILE"

  if git diff --quiet && [ "$(git rev-parse HEAD)" = "$(git rev-parse origin/staging)" ]; then
    echo "staging already points at ${TAG}. Nothing to do; run: scripts/release.sh promote"
    git switch -q "$START_REF"; git branch -q -D "$BRANCH"
    exit 0
  fi

  git commit -qam "release: point the manifests at ${TAG}, pinned by digest" || true
  git push -q -u origin "$BRANCH"
  gh pr create --repo "$REPO" --base staging --head "$BRANCH" \
    --title "Release ${TAG}: point the manifests at the new image" \
    --body "Points the app and the migration job at ${TAG}, pinned by digest (the tag is only a label). Built by staging run ${RUN_ID}.

Merge this, then run \`scripts/release.sh promote\` to open the staging to main pull request (docs/infra/runbooks/03-release-and-rollback.md)."
  git switch -q "$START_REF"
  ;;

promote)
  git fetch -q origin main staging
  if git diff --quiet origin/main origin/staging; then
    echo "main and staging are identical. Nothing to promote."
    exit 0
  fi
  git merge-base --is-ancestor origin/main origin/staging || {
    echo "main has commits staging lacks. Run: scripts/release.sh prepare (it syncs them) first." >&2
    exit 1
  }
  echo "Files this will change on main:"
  git diff --stat origin/main origin/staging | tail -15
  gh pr create --repo "$REPO" --base main --head staging \
    --title "Promote staging to main" \
    --body "Brings main up to date with staging. **Merge with a merge commit, never squash.** Merging deploys: ArgoCD follows main. Rollback: revert this pull request (docs/infra/runbooks/03-release-and-rollback.md)."
  ;;

*)
  echo "Usage: scripts/release.sh prepare [run-id] | promote" >&2
  exit 2
  ;;
esac
