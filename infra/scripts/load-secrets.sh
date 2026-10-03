# Loads the secrets for working on this infrastructure into the CURRENT terminal.
# This file is SOURCED (run through the `hetzner` helper), not executed, and it
# contains no secrets: it only asks the macOS Keychain for them.
#
# One-time setup, typing each secret at the hidden prompt (see docs/infra/01):
#   security add-generic-password -U -a "$USER" -s portfolio-hcloud-token -w
#   security add-generic-password -U -a "$USER" -s portfolio-r2-key-id -w
#   security add-generic-password -U -a "$USER" -s portfolio-r2-secret -w
#   security add-generic-password -U -a "$USER" -s portfolio-cf-terraform-token -w

_portfolio_get() {
  security find-generic-password -a "$USER" -s "$1" -w 2>/dev/null
}

_portfolio_load() {
  local name="$1" item="$2" value
  value="$(_portfolio_get "$item")"
  if [ -z "$value" ]; then
    echo "  MISSING in Keychain: $item  (for $name)" >&2
    return 1
  fi
  export "$name=$value"
}

_portfolio_missing=0
_portfolio_load HCLOUD_TOKEN portfolio-hcloud-token || _portfolio_missing=1
_portfolio_load AWS_ACCESS_KEY_ID portfolio-r2-key-id || _portfolio_missing=1
_portfolio_load AWS_SECRET_ACCESS_KEY portfolio-r2-secret || _portfolio_missing=1
_portfolio_load CLOUDFLARE_API_TOKEN portfolio-cf-terraform-token || _portfolio_missing=1

# Terraform's state storage reads the AWS_ names (R2 copies Amazon's protocol).
# Ignore any real Amazon login stored on this Mac so it can never be used by mistake.
export AWS_SHARED_CREDENTIALS_FILE=/dev/null
export AWS_CONFIG_FILE=/dev/null

# Always talk to THIS cluster, never whatever the default config points at.
export KUBECONFIG="$HOME/.kube/hetzner-portfolio.yaml"

# R2 key IDs are 32 characters and secrets are 64. Anything else is the wrong value.
if [ -n "$AWS_ACCESS_KEY_ID" ] && [ "${#AWS_ACCESS_KEY_ID}" -ne 32 ]; then
  echo "  WARNING: R2 key ID has length ${#AWS_ACCESS_KEY_ID}, expected 32" >&2
  _portfolio_missing=1
fi
if [ -n "$AWS_SECRET_ACCESS_KEY" ] && [ "${#AWS_SECRET_ACCESS_KEY}" -ne 64 ]; then
  echo "  WARNING: R2 secret has length ${#AWS_SECRET_ACCESS_KEY}, expected 64" >&2
  _portfolio_missing=1
fi

if [ "$_portfolio_missing" -eq 0 ]; then
  echo "Hetzner environment loaded: HCLOUD_TOKEN, R2 keys, CLOUDFLARE_API_TOKEN, KUBECONFIG set."
else
  echo "Some secrets are missing or wrong (see above). Store them with the commands at the top of infra/scripts/load-secrets.sh." >&2
fi

unset -f _portfolio_get _portfolio_load
unset _portfolio_missing
