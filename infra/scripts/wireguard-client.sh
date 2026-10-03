#!/usr/bin/env bash
# Sets up YOUR laptop as a WireGuard client (docs/infra/11-wireguard.md).
#
# Run it twice:
#   1) bash infra/scripts/wireguard-client.sh
#      Makes your key pair on this laptop and prints the PUBLIC key. The private key stays
#      here, in a folder only you can read, and is never sent anywhere or committed.
#      Put the public key in the Ansible peers list, then run playbooks/04-wireguard.yml.
#
#   2) SERVER_PUBLIC_KEY=<from the playbook output> SERVER_ENDPOINT=<server public IP> \
#        bash infra/scripts/wireguard-client.sh
#      Writes the tunnel config. Import it into the WireGuard app, or:
#        sudo wg-quick up ~/.config/wireguard-hetzner/hetzner.conf
#
# Safe to run again: it never replaces an existing key (a new key would need the server
# updated too).
set -euo pipefail

DIR="${HOME}/.config/wireguard-hetzner"
CLIENT_ADDRESS="${CLIENT_ADDRESS:-10.8.0.2/32}"   # this laptop's address inside the tunnel
SERVER_TUNNEL_IP="${SERVER_TUNNEL_IP:-10.8.0.1}"  # the server's address inside the tunnel
PORT="${WG_PORT:-51820}"
# Set WG_MTU=1280 if you connect through another VPN (see docs/infra/11-wireguard.md).
WG_MTU="${WG_MTU:-}"

if ! command -v wg >/dev/null 2>&1; then
  echo "WireGuard tools are not installed. Run:  brew install wireguard-tools" >&2
  exit 1
fi

mkdir -p "$DIR"
chmod 700 "$DIR"

# 1. The key pair, made once. umask 077 makes the files readable by you alone.
if [[ ! -f "$DIR/private.key" ]]; then
  (umask 077; wg genkey > "$DIR/private.key")
  wg pubkey < "$DIR/private.key" > "$DIR/public.key"
  echo "Created a new key pair in $DIR"
fi

echo
echo "Your PUBLIC key (safe to share; this is what goes in the Ansible peers list):"
cat "$DIR/public.key"

# 2. The config, only when we know the server's key and address.
if [[ -z "${SERVER_PUBLIC_KEY:-}" || -z "${SERVER_ENDPOINT:-}" ]]; then
  echo
  echo "Next: add that key to wireguard_peers, run playbooks/04-wireguard.yml, then run this"
  echo "script again with SERVER_PUBLIC_KEY and SERVER_ENDPOINT set (see the top of this file)."
  exit 0
fi

CONF="$DIR/hetzner.conf"
(umask 077; cat > "$CONF" <<CONF_EOF
[Interface]
PrivateKey = $(cat "$DIR/private.key")
Address = ${CLIENT_ADDRESS}
${WG_MTU:+MTU = ${WG_MTU}}

[Peer]
PublicKey = ${SERVER_PUBLIC_KEY}
Endpoint = ${SERVER_ENDPOINT}:${PORT}
# Only the server's tunnel address goes through the tunnel. Everything else (your normal
# browsing) uses your normal connection, so this never slows or reroutes your internet.
AllowedIPs = ${SERVER_TUNNEL_IP}/32
# Keeps the connection alive through home routers and phone networks.
PersistentKeepalive = 25
CONF_EOF
)
echo
echo "Wrote $CONF (readable by you only)."
echo "Bring the tunnel up:   sudo wg-quick up $CONF"
echo "Then test:             ping -c 2 ${SERVER_TUNNEL_IP}"
