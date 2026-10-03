output "firewall_id" {
  description = "ID of the firewall."
  value       = hcloud_firewall.this.id
}
