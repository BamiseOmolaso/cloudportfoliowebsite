#!/usr/bin/env bash
# Creates the Kubernetes Secret `portfolio-webhooks`: the signing secret Resend uses on
# its delivery reports (delivered / opened / bounced) so the site can trust them.
# See docs/infra/09-site-structure-and-content.md, "Tracking what happened to each email".
#
# Optional, like the media secret: the site runs without it (and just cannot record
# delivery results; the webhook answers 503 until it exists).
#
# Run from the repo root:   bash infra/scripts/create-webhook-secret.sh
# Then restart the app:     kubectl -n portfolio rollout restart deployment/portfolio
set -euo pipefail

ctx="$(kubectl config current-context)"
if [[ "$ctx" != "hetzner-portfolio" ]]; then
  echo "Wrong cluster: '$ctx'. Run: export KUBECONFIG=~/.kube/hetzner-portfolio.yaml" >&2
  exit 1
fi

read -rs -p "Resend webhook signing secret (starts with whsec_): " secret; echo
[[ "$secret" == whsec_* ]] || { echo "That does not look like a Resend signing secret (it starts with whsec_)." >&2; exit 1; }

tmp="$(mktemp)"; trap 'rm -f "$tmp"' EXIT; chmod 600 "$tmp"
printf 'RESEND_WEBHOOK_SECRET=%s\n' "$secret" > "$tmp"

kubectl -n portfolio create secret generic portfolio-webhooks \
  --from-env-file="$tmp" --dry-run=client -o yaml | kubectl apply -f - >/dev/null
echo "Done. Stored RESEND_WEBHOOK_SECRET in portfolio-webhooks (value not shown)."
