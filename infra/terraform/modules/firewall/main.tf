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
