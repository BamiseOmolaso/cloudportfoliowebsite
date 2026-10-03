# Cloud firewall, applied to servers by label.
#
# This runs in Hetzner's network, before traffic reaches the server, so it
# still protects the box if a service on it is misconfigured. Anything not
# allowed below is dropped (inbound is default-deny once a firewall is
# attached; outbound is unrestricted).
resource "hcloud_firewall" "this" {
  name   = "${var.name}-fw"
  labels = var.labels

  # SSH: only from your own address(es).
  rule {
    description = "SSH from admin addresses"
    direction   = "in"
    protocol    = "tcp"
    port        = "22"
    source_ips  = var.admin_cidrs
  }

  # Kubernetes API: also admin-only, so kubectl works from your laptop and
  # nobody else can even reach the API server.
  rule {
    description = "Kubernetes API from admin addresses"
    direction   = "in"
    protocol    = "tcp"
    port        = "6443"
    source_ips  = var.admin_cidrs
  }

  # WireGuard (the private tunnel, docs/infra/11-wireguard.md). Open to the world on purpose:
  # WireGuard never answers a packet that is not signed with a key it knows, so to anyone
  # else this port looks closed. Once the tunnel works, SSH and the API are reached through
  # it and the two admin rules above can be narrowed or closed.
  dynamic "rule" {
    for_each = var.wireguard_port == null ? [] : [var.wireguard_port]
    content {
      description = "WireGuard tunnel"
      direction   = "in"
      protocol    = "udp"
      port        = tostring(rule.value)
      source_ips  = ["0.0.0.0/0", "::/0"]
    }
  }

  # Web traffic. The caller decides who may connect: in production only
  # Cloudflare's published ranges, so every visitor must come through
  # Cloudflare and nobody can reach the server directly (which also makes the
  # CF-Connecting-IP header trustworthy: only Cloudflare can send it).
  rule {
    description = "HTTP"
    direction   = "in"
    protocol    = "tcp"
    port        = "80"
    source_ips  = var.web_source_ips
  }

  rule {
    description = "HTTPS"
    direction   = "in"
    protocol    = "tcp"
    port        = "443"
    source_ips  = var.web_source_ips
  }

  # Ping, so basic reachability checks work.
  rule {
    description = "ICMP"
    direction   = "in"
    protocol    = "icmp"
    source_ips  = ["0.0.0.0/0", "::/0"]
  }

  # Attach to every server carrying this label, including ones created later.
  apply_to {
    label_selector = var.apply_to_label
  }
}
