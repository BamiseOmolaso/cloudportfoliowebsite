#!/usr/bin/env bash
# Creates the Kubernetes Secret `portfolio-media`: the settings the website needs to
# store uploaded images in Cloudflare R2 (see docs/infra/10-images-and-media.md).
#
# Separate from `portfolio-secrets` on purpose: the site starts without it (uploads are
# simply switched off), and you can add or rotate it without touching the other secrets.
#
# Run from the repo root:   bash infra/scripts/create-media-secret.sh
# Then restart the app:     kubectl -n portfolio rollout restart deployment/portfolio
set -euo pipefail

ctx="$(kubectl config current-context)"
if [[ "$ctx" != "hetzner-portfolio" ]]; then
  echo "Wrong cluster: '$ctx'. Run: export KUBECONFIG=~/.kube/hetzner-portfolio.yaml" >&2
  exit 1
fi

ask() { # ask VARNAME "prompt" [secret]
  local v
  if [[ "${3:-}" == "secret" ]]; then read -rs -p "$2: " v; echo; else read -r -p "$2: " v; fi
  [[ -n "$v" ]] || { echo "$1 cannot be empty" >&2; exit 1; }
  printf -v "$1" '%s' "$v"
}
ask account_id "Cloudflare account ID"
ask bucket     "Media bucket name (for example portfolio-media)"
ask public_url "Public address of the bucket (for example https://media.oluwabamiseomolaso.com.ng)"
ask access_key "R2 access key ID" secret
ask secret_key "R2 secret access key" secret

tmp="$(mktemp)"; trap 'rm -f "$tmp"' EXIT; chmod 600 "$tmp"
{
  printf 'R2_ACCOUNT_ID=%s\n'          "$account_id"
  printf 'R2_MEDIA_BUCKET=%s\n'        "$bucket"
  printf 'R2_MEDIA_PUBLIC_URL=%s\n'    "$public_url"
  printf 'R2_ACCESS_KEY_ID=%s\n'       "$access_key"
  printf 'R2_SECRET_ACCESS_KEY=%s\n'   "$secret_key"
} > "$tmp"

kubectl -n portfolio create secret generic portfolio-media \
  --from-env-file="$tmp" --dry-run=client -o yaml | kubectl apply -f - >/dev/null

echo "Done. Keys stored in portfolio-media (values not shown):"
kubectl -n portfolio get secret portfolio-media -o json | python3 -c \
  'import json,sys;print(" ", ", ".join(sorted(json.load(sys.stdin)["data"])))'
