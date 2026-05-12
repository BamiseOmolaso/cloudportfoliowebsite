variable "vpc_id" {
  description = "VPC ID"
  type        = string
}

variable "subnet_ids" {
  description = "Subnet IDs for RDS"
  type        = list(string)
}

variable "security_group_id" {
  description = "Security group ID for RDS"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "db_name" {
  description = "Database name"
  type        = string
}

variable "db_username" {
  description = "Database username"
  type        = string
}

variable "db_password" {
  description = "Database password (deprecated - password is read from Secrets Manager)"
  type        = string
  default     = ""
  sensitive   = true
}

variable "instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t4g.micro"
}

variable "allocated_storage" {
  description = "RDS allocated storage in GB"
  type        = number
  default     = 20
}

variable "db_credentials_secret_name" {
  description = "Name of the AWS Secrets Manager secret holding the existing database credentials JSON ({username, password, ...}). The module reads the password from this secret and updates the secret's value with connection details after the RDS instance is created. Each environment must point at its own secret — sharing one across envs cross-contaminates credentials."
  type        = string
}

variable "skip_final_snapshot" {
  description = "Whether to skip a final snapshot when the RDS instance is destroyed. Defaults to true for ephemeral environments; production should set this to false so a snapshot is captured."
  type        = bool
  default     = true
}