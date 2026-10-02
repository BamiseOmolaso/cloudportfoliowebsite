variable "ssh_public_key" {
  description = "Contents of ~/.ssh/hetzner_portfolio.pub."
  type        = string
}

variable "admin_cidrs" {
  description = "Your public IP(s) as CIDRs, e.g. [\"203.0.113.7/32\"]. Allowed to SSH and reach the Kubernetes API."
  type        = list(string)
}

variable "server_type" {
  description = "Hetzner server type. List current options with the API call in docs/infra/01-terraform-hetzner.md."
  type        = string
}

variable "location" {
  description = "Hetzner location (fsn1, nbg1, hel1 are in the EU)."
  type        = string
  default     = "fsn1"
}

variable "volume_size_gb" {
  description = "Size of the Postgres data volume."
  type        = number
  default     = 10
}

variable "protect" {
  description = "Delete and rebuild protection on the server and data volume. Leave true; turn off only briefly to replace the server (see docs/infra/01-terraform-hetzner.md, section 12)."
  type        = bool
  default     = true
}

variable "cloudflare_zone_id" {
  description = "Cloudflare zone ID for the domain (not a secret). Found on the domain's overview page."
  type        = string
}
