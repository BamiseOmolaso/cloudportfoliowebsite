#!/usr/bin/env bash
# Creates the Kubernetes Secret `portfolio-secrets` that the website reads.
#
# Why a script and not a YAML file in git: the values are secrets, and this repository
# is public. You type each value at a hidden prompt (nothing appears on screen, and it
# is not saved in your shell history). Nothing is written anywhere except the cluster.
#
# Run from the repo root:   bash infra/scripts/create-portfolio-secrets.sh
# Safe to run again: it updates the Secret. Then restart the app to pick up changes:
#   kubectl -n portfolio rollout restart deployment/portfolio
set -euo pipefail

# 1. Safety check: refuse to run against the wrong cluster.
ctx="$(kubectl config current-context)"
if [[ "$ctx" != "hetzner-portfolio" ]]; then
  echo "Wrong cluster: '$ctx'. Run: export KUBECONFIG=~/.kube/hetzner-portfolio.yaml" >&2
  exit 1
fi

# 2. The namespace must exist before a Secret can go into it. This is the same file
#    ArgoCD manages, so ArgoCD simply adopts it later.
kubectl apply -f infra/k8s/apps/portfolio/00-namespace.yaml >/dev/null

# 3. The database password already exists in the cluster (made in doc 06), so we read
#    it from there instead of asking you again. Special characters are URL-encoded so
#    they cannot break the connection address.
app_pw="$(kubectl -n postgres get secret postgres-credentials \
  -o jsonpath='{.data.app-password}' | base64 -d)"
enc_pw="$(python3 -c 'import sys,urllib.parse as u;print(u.quote(sys.argv[1],safe=""))' "$app_pw")"
database_url="postgresql://portfolio_app:${enc_pw}@postgres.postgres.svc.cluster.local:5432/portfolio"

# 4. Session-signing key: random, 64 characters, you never need to know it.
jwt_secret="$(openssl rand -base64 48 | tr -d '\n')"

# 5. Ask for the rest. `read -rs`: -r keeps backslashes literal, -s hides what you type.
ask() { # ask VARNAME "prompt"
  local v; read -rs -p "$2: " v; echo
  [[ -n "$v" ]] || { echo "$1 cannot be empty" >&2; exit 1; }
  printf -v "$1" '%s' "$v"
}
ask admin_email        "Admin login email"
ask admin_password     "Admin login password (choose a long one)"
ask resend_api_key     "Resend API key"
ask resend_from_email  "Resend FROM address (a verified sender)"
ask contact_email      "Contact form recipient email"
ask redis_url          "Redis Cloud URL (redis://... or rediss://...)"
ask recaptcha_secret   "reCAPTCHA SECRET key"

# 6. Put everything in a private temp file (readable only by you), load it into the
#    cluster, and delete the file even if something fails.
tmp="$(mktemp)"; trap 'rm -f "$tmp"' EXIT; chmod 600 "$tmp"
{
  printf 'DATABASE_URL=%s\n'         "$database_url"
  printf 'JWT_SECRET=%s\n'           "$jwt_secret"
  printf 'ADMIN_EMAIL=%s\n'          "$admin_email"
  printf 'ADMIN_PASSWORD=%s\n'       "$admin_password"
  printf 'RESEND_API_KEY=%s\n'       "$resend_api_key"
  printf 'RESEND_FROM_EMAIL=%s\n'    "$resend_from_email"
  printf 'CONTACT_EMAIL=%s\n'        "$contact_email"
  printf 'REDIS_URL=%s\n'            "$redis_url"
  printf 'RECAPTCHA_SECRET_KEY=%s\n' "$recaptcha_secret"
} > "$tmp"

kubectl -n portfolio create secret generic portfolio-secrets \
  --from-env-file="$tmp" --dry-run=client -o yaml | kubectl apply -f - >/dev/null

echo "Done. Keys stored in portfolio-secrets (values not shown):"
kubectl -n portfolio get secret portfolio-secrets -o json | python3 -c \
  'import json,sys;print(" ", ", ".join(sorted(json.load(sys.stdin)["data"])))'
