#!/usr/bin/env bash
# Run terraform with the right secrets. Use it instead of plain `terraform`:
#   ../../tf.sh init -backend-config=backend.hcl
#   ../../tf.sh plan
#
# Why this exists: Terraform's state backend only understands variable names
# starting with AWS_ (it was built for Amazon's storage method). Cloudflare R2
# copies that method, so we read the clearly-named R2_ variables you set and
# hand them to Terraform under the names it expects, for this one command only.
set -euo pipefail

: "${HCLOUD_TOKEN:?HCLOUD_TOKEN is not set (see docs/infra/01-terraform-hetzner.md, section 6.0)}"
: "${R2_ACCESS_KEY_ID:?R2_ACCESS_KEY_ID is not set}"
: "${R2_SECRET_ACCESS_KEY:?R2_SECRET_ACCESS_KEY is not set}"

# R2 access key IDs are 32 characters and secrets are 64. A different length
# means the wrong value was pasted (an Amazon key is 20 characters).
if [ "${#R2_ACCESS_KEY_ID}" -ne 32 ] || [ "${#R2_SECRET_ACCESS_KEY}" -ne 64 ]; then
  echo "R2 keys look wrong: expected lengths 32 and 64, got ${#R2_ACCESS_KEY_ID} and ${#R2_SECRET_ACCESS_KEY}." >&2
  exit 1
fi

# Forget any real Amazon login that might be loaded in this terminal.
unset AWS_SESSION_TOKEN AWS_PROFILE AWS_DEFAULT_PROFILE

export AWS_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID"
export AWS_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY"

exec terraform "$@"
