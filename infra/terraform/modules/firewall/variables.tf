variable "name" {
  description = "Prefix for resource names."
  type        = string
}

variable "admin_cidrs" {
  description = "CIDRs allowed to reach SSH and the Kubernetes API, e.g. [\"203.0.113.7/32\"]."
  type        = list(string)

  validation {
    condition     = length(var.admin_cidrs) > 0 && !contains(var.admin_cidrs, "0.0.0.0/0") && !contains(var.admin_cidrs, "::/0")
    error_message = "admin_cidrs must be a non-empty list and must not open SSH to the whole internet."
  }
}

variable "web_source_ips" {
  description = "Addresses allowed to reach ports 80 and 443. Defaults to everyone; production passes Cloudflare's ranges."
  type        = list(string)
  default     = ["0.0.0.0/0", "::/0"]

  validation {
    condition     = length(var.web_source_ips) > 0
    error_message = "web_source_ips must not be empty (an empty list would make Terraform fail or, worse, be read as 'nobody')."
  }
}

variable "apply_to_label" {
  description = "Label selector; servers with this label get the firewall."
  type        = string
}

variable "labels" {
  description = "Labels applied to the firewall."
  type        = map(string)
  default     = {}
}
