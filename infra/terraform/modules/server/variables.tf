variable "name" {
  description = "Prefix for resource names."
  type        = string
}

variable "ssh_public_key" {
  description = "Contents of the .pub file for the key used to administer the server."
  type        = string
}

variable "server_type" {
  description = "Hetzner server type, e.g. from the /v1/server_types API. See docs/infra/01-terraform-hetzner.md."
  type        = string
}

variable "image" {
  description = "OS image."
  type        = string
  default     = "ubuntu-24.04"
}

variable "location" {
  description = "Hetzner location, e.g. fsn1, nbg1 or hel1."
  type        = string
}

variable "role" {
  description = "Value of the `role` label; the firewall selects on it."
  type        = string
  default     = "k8s-node"
}

variable "network_id" {
  description = "Private network to attach to."
  type        = string
}

variable "volume_size_gb" {
  description = "Size of the data volume in GB (10 is the minimum)."
  type        = number
  default     = 10

  validation {
    condition     = var.volume_size_gb >= 10
    error_message = "Hetzner volumes are at least 10 GB."
  }
}

variable "protect" {
  description = "Turn on delete and rebuild protection."
  type        = bool
  default     = true
}

variable "labels" {
  description = "Labels applied to resources."
  type        = map(string)
  default     = {}
}
