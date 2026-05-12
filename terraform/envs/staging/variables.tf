variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "vpc_cidr" {
  description = "VPC CIDR block. Must be at least /16 because the networking module derives subnets via cidrsubnet(vpc_cidr, 8, idx) which requires 8 host bits to spare."
  type        = string
  default     = "10.2.0.0/16" # Distinct from prod (10.0.0.0/16) and dev (10.1.0.0/16)
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
  description = "AWS Secrets Manager name for the staging database credentials. Operator must create this secret out-of-band before apply (the rds module reads the password from it)."
  type        = string
  default     = "portfolio/staging/db-credentials"
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

