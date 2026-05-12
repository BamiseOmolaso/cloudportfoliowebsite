variable "vpc_id" {
  description = "VPC ID"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "admin_cidr_blocks" {
  description = "List of CIDR blocks allowed to reach RDS on 5432 for admin / laptop access. Defaults to [] (closed). Set to e.g. [\"203.0.113.10/32\"] in tfvars when you need direct DB access — same cost as opening to 0.0.0.0/0 but limits the attack surface to your own IP."
  type        = list(string)
  default     = []
}

