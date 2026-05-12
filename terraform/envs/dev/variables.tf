variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "vpc_cidr" {
  description = "VPC CIDR block. Must be at least /16 because the networking module derives subnets via cidrsubnet(vpc_cidr, 8, idx) which requires 8 host bits to spare."
  type        = string
  default     = "10.1.0.0/16" # Distinct from prod (10.0.0.0/16) and staging (10.2.0.0/16)
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
  description = "Database master username"
  type        = string
  default     = "portfolio_user"
  sensitive   = true
}

variable "db_password" {
  description = "Database master password (deprecated - password is read from Secrets Manager if available)"
  type        = string
  default     = ""
  sensitive   = true
}

variable "ecs_desired_count" {
  description = "Desired number of ECS tasks"
  type        = number
  default     = 1 # Lower for dev
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
  description = "AWS Secrets Manager name for the dev database credentials. Operator must create this secret out-of-band before apply (the rds module reads the password from it)."
  type        = string
  default     = "portfolio/dev/db-credentials"
}

variable "admin_cidr_blocks" {
  description = "List of CIDR blocks allowed to reach RDS on 5432 for direct laptop / admin access. Leave [] (default) to require ECS Exec or a bastion. Set to [\"<your-home-ip>/32\"] in terraform.tfvars when you need direct psql access — pairs with publicly_accessible=true on the RDS instance, a deliberate cost trade-off that avoids NAT/VPN/bastion charges."
  type        = list(string)
  default     = []
}

variable "acm_certificate_arn" {
  description = "Optional ARN of an ACM certificate to attach to a HTTPS:443 listener on the ALB. When set, an HTTPS listener is created and the HTTP:80 listener becomes a permanent redirect to HTTPS. When empty (default), the ALB continues to serve plain HTTP on port 80. Request the certificate out-of-band (`aws acm request-certificate --domain-name <yourdomain> --validation-method DNS`), validate it, then drop the ARN here once status = ISSUED."
  type        = string
  default     = ""
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

