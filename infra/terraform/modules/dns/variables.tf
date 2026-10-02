variable "zone_id" {
  description = "Cloudflare zone ID of the domain (dashboard: domain overview, right-hand column)."
  type        = string
}

variable "records" {
  description = <<-EOT
    DNS records to manage, keyed by a short label. `name` is the host
    ("test", or "@" for the bare domain). `proxied = true` sends visitors through
    Cloudflare (hides the server IP, adds TLS, caching, DDoS protection).
  EOT
  type = map(object({
    name    = string
    type    = string
    content = string
    proxied = optional(bool, true)
    comment = optional(string, "Managed by Terraform")
  }))
  default = {}
}
