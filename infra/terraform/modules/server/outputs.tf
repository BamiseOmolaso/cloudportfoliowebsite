output "ipv4" {
  description = "Public IPv4 address (what the Cloudflare A record will point at)."
  value       = hcloud_server.this.ipv4_address
}

output "ipv6" {
  description = "Public IPv6 address."
  value       = hcloud_server.this.ipv6_address
}

output "server_id" {
  description = "ID of the server."
  value       = hcloud_server.this.id
}

output "volume_linux_device" {
  description = "Device path of the data volume as the OS sees it (Ansible mounts this)."
  value       = hcloud_volume.data.linux_device
}
