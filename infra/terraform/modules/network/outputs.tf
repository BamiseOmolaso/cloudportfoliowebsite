output "network_id" {
  description = "ID of the private network."
  value       = hcloud_network.this.id
}

output "subnet_id" {
  description = "ID of the subnet. Callers can depend_on the module so the subnet exists before servers attach."
  value       = hcloud_network_subnet.this.id
}
