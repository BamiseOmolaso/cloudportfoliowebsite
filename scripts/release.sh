#!/usr/bin/env bash
# Opens the release pull request: points the cluster manifests on `main` at the newest
# images that the staging build published (tag for people, digest for the cluster).
#
#   scripts/release.sh            # use the newest successful staging build
#   scripts/release.sh <run-id>   # use a specific build run
#
# It only OPENS the pull request. You (or CI) review it and merge it; merging is what
# deploys, because ArgoCD follows `main`. Needs: gh (logged in), git, perl.
# If cosign is installed it also checks the images' signatures first.
set -euo pipefail

REPO="BamiseOmolaso/cloudportfoliowebsite"
APP_FILE="infra/k8s/apps/portfolio/30-deployment.yaml"
MIGRATE_FILE="infra/k8s/apps/portfolio/20-migrate-job.yaml"

cd "$(git rev-parse --show-toplevel)"
if [ -n "$(git status --porcelain)" ]; then
  echo "Your working tree has uncommitted changes. Commit or discard them first." >&2
  exit 1
fi
START_REF="$(git rev-parse --abbrev-ref HEAD)"

git fetch -q origin main

RUN_ID="${1:-$(gh run list --repo "$REPO" --workflow "Build and publish images" --branch staging \
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
git switch -q -c "$BRANCH" origin/main
# "@" must be escaped, or perl would read "@sha256" as an array.
perl -pi -e "s#image: ghcr\.io/[^/]+/cloudportfoliowebsite:\S+#image: ${APP_REF//@/\\@}#" "$APP_FILE"
perl -pi -e "s#image: ghcr\.io/[^/]+/cloudportfoliowebsite-migrator:\S+#image: ${MIG_REF//@/\\@}#" "$MIGRATE_FILE"

if git diff --quiet; then
  echo "main already runs ${TAG}. Nothing to release."
  git switch -q "$START_REF"; git branch -q -D "$BRANCH"
  exit 0
fi

git commit -qam "release: ${TAG}, pinned by digest"
git push -q -u origin "$BRANCH"
gh pr create --repo "$REPO" --base main --head "$BRANCH" \
  --title "Release ${TAG}" \
  --body "Points the app and the migration job at ${TAG}, pinned by digest (the tag is only a label).

Built by staging run ${RUN_ID}. Rollback: revert this pull request (see docs/infra/runbooks/03-release-and-rollback.md)."
git switch -q "$START_REF"
