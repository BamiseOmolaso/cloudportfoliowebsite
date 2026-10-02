output "hostnames" {
  description = "Fully qualified names of the records managed here."
  value       = { for k, r in cloudflare_dns_record.this : k => r.name }
}
