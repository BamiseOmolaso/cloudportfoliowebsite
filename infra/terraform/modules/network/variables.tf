variable "name" {
  description = "Prefix for resource names, e.g. portfolio-prod."
  type        = string
}

variable "ip_range" {
  description = "CIDR of the whole private network."
  type        = string
  default     = "10.0.0.0/16"
}

variable "subnet_range" {
  description = "CIDR of the subnet servers attach to. Must sit inside ip_range."
  type        = string
  default     = "10.0.1.0/24"
}

variable "network_zone" {
  description = "Hetzner network zone; must match the server location."
  type        = string
  default     = "eu-central"
}

variable "labels" {
  description = "Labels applied to every resource in this module."
  type        = map(string)
  default     = {}
}
