variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "vpc_cidr" {
  description = "VPC CIDR block"
  type        = string
  default     = "10.0.0.0/16" # Full /16 for prod
}

variable "availability_zones" {
  description = "Availability zones"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b"]
}

variable "db_name" {
  description = "Database name"
  type        = string
  default     = "portfolio"
}

variable "db_username" {
  description = "Database master username (read from Secrets Manager if not provided)"
  type        = string
  default     = "app_admin"
  sensitive   = true
}

variable "db_password" {
  description = "Database master password (deprecated - password is read from Secrets Manager: omolasowebportfolio/db/credentials)"
  type        = string
  default     = ""
  sensitive   = true
}

variable "ecs_desired_count" {
  description = "Desired number of ECS tasks"
  type        = number
  default     = 2
}

variable "rds_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t4g.micro"
}

variable "rds_allocated_storage" {
  description = "RDS allocated storage in GB"
  type        = number
  default     = 20
}

variable "db_credentials_secret_name" {
  description = "AWS Secrets Manager name for the prod database credentials. The existing live secret name is preserved here so this change does not orphan the running database."
  type        = string
  default     = "omolasowebportfolio/db/credentials"
}

variable "admin_cidr_blocks" {
  description = "List of CIDR blocks allowed to reach RDS on 5432 for direct laptop / admin access. Leave [] (default) to require ECS Exec or a bastion. Set to [\"<your-home-ip>/32\"] in terraform.tfvars when you need direct psql access — pairs with publicly_accessible=true on the RDS instance, a deliberate cost trade-off that avoids NAT/VPN/bastion charges."
  type        = list(string)
  default     = []
}

variable "acm_certificate_arn" {
  description = "ARN of the ACM certificate attached to the ALB's HTTPS:443 listener. Defaulted here (rather than in gitignored terraform.tfvars) so CI runs don't see drift and destroy the HTTPS listener every deploy. The ARN identifies a public certificate — not sensitive."
  type        = string
  default     = "arn:aws:acm:us-east-1:827327671360:certificate/652dba64-81dc-4141-84dd-cb7f3186fde2"
}

variable "site_url" {
  description = "Publicly-reachable URL of the prod site, injected into the ECS task as NEXT_PUBLIC_SITE_URL. Used by outbound emails to build absolute unsubscribe / preferences links. Defaults to the production custom domain."
  type        = string
  default     = "https://portfolio.oluwabamiseomolaso.com.ng"
}

variable "image_tag" {
  description = "Docker image tag to deploy"
  type        = string
  default     = "latest"
}

variable "paused_mode" {
  description = "When true, pauses expensive resources (ALB, scales ECS to 0). RDS must be stopped separately via AWS CLI."
  type        = bool
  default     = false
}

variable "enable_alb_deletion_protection" {
  description = "Enable deletion protection on ALB. When paused_mode=true, this is automatically disabled to allow ALB destruction."
  type        = bool
  default     = true # Enabled by default for production
}

