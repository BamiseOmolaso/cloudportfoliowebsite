output "server_ipv4" {
  description = "Public IPv4. Point the Cloudflare A record here."
  value       = module.server.ipv4
}

output "server_ipv6" {
  description = "Public IPv6."
  value       = module.server.ipv6
}

output "data_volume_device" {
  description = "Device path of the data volume, used by Ansible."
  value       = module.server.volume_linux_device
}
