# Private network for the cluster.
#
# Hetzner private networks are free. Giving the server a private address now
# means that when we add a second node later, node-to-node traffic (Kubernetes,
# Postgres replication) stays off the public internet.
resource "hcloud_network" "this" {
  name     = "${var.name}-net"
  ip_range = var.ip_range
  labels   = var.labels
}

# A subnet carves a slice out of the network. `network_zone` must match the
# location of the servers that will attach to it (eu-central covers the
# Falkenstein, Nuremberg and Helsinki locations).
resource "hcloud_network_subnet" "this" {
  network_id   = hcloud_network.this.id
  type         = "cloud"
  network_zone = var.network_zone
  ip_range     = var.subnet_range
}
