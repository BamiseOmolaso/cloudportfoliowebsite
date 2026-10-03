# The public half of your SSH key. Hetzner installs it for root on first boot.
resource "hcloud_ssh_key" "this" {
  name       = "${var.name}-key"
  public_key = var.ssh_public_key
  labels     = var.labels
}

# The node itself. It will run k3s (Kubernetes), the app, Postgres and the
# monitoring stack.
resource "hcloud_server" "this" {
  name        = "${var.name}-node"
  server_type = var.server_type
  image       = var.image
  location    = var.location
  ssh_keys    = [hcloud_ssh_key.this.id]

  # The firewall module selects servers by this label, so it attaches itself.
  labels = merge(var.labels, { role = var.role })

  public_net {
    ipv4_enabled = true
    ipv6_enabled = true
  }

  network {
    network_id = var.network_id
  }

  # Deletion/rebuild protection: a stray `terraform destroy` or an image
  # change cannot wipe the server without first turning these off.
  delete_protection  = var.protect
  rebuild_protection = var.protect

  lifecycle {
    # Changing the image later (a newer Ubuntu) must not silently rebuild the
    # machine and lose everything on its root disk.
    #
    # `network`: the Hetzner provider reports the private-network details
    # (address, MAC) back in a shape that never matches our short config, so
    # every plan showed a pointless "update in place" that could detach and
    # re-attach the network. The server joins the network when it is created;
    # we ignore the attachment block afterwards to keep plans clean.
    ignore_changes = [image, ssh_keys, network]
  }
}

# Separate disk for Postgres data. Keeping data off the root disk means we can
# rebuild or replace the server and re-attach the same data.
resource "hcloud_volume" "data" {
  name              = "${var.name}-data"
  size              = var.volume_size_gb
  location          = var.location
  format            = "ext4"
  delete_protection = var.protect
  labels            = var.labels

  lifecycle {
    prevent_destroy = true
  }
}

resource "hcloud_volume_attachment" "data" {
  volume_id = hcloud_volume.data.id
  server_id = hcloud_server.this.id
  # Ansible mounts it explicitly, so the mount point is visible in git.
  automount = false
}
