variable "cluster_name" {
  description = "ECS cluster name"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "subnet_ids" {
  description = "Subnet IDs for ECS tasks"
  type        = list(string)
}

variable "security_group_id" {
  description = "Security group ID for ECS tasks"
  type        = string
}

variable "target_group_arn" {
  description = "ALB target group ARN"
  type        = string
}

variable "alb_listener_arn" {
  description = "ALB listener ARN"
  type        = string
}

variable "ecr_repository_url" {
  description = "ECR repository URL"
  type        = string
}

variable "image_tag" {
  description = "Docker image tag to deploy"
  type        = string
  default     = "latest"
}

variable "db_secret_arn" {
  description = "Database credentials secret ARN"
  type        = string
}

variable "app_secrets_arn" {
  description = "Application secrets ARN"
  type        = string
}

variable "desired_count" {
  description = "Desired number of tasks"
  type        = number
  default     = 2
}

variable "public_subnet_ids" {
  description = "Public subnet IDs for ECS tasks (used when paused for direct access)"
  type        = list(string)
  default     = []
}

variable "paused_mode" {
  description = "When true, scale to 0 and skip ALB attachment"
  type        = bool
  default     = false
}

variable "site_url" {
  description = "Publicly-reachable base URL for the application. Injected into the ECS task as NEXT_PUBLIC_SITE_URL so outbound emails (welcome, unsubscribe, preferences) build absolute links to the real site instead of http://localhost:3000. Leave empty to omit the env var — the app will then throw at email-send time in production, which is the intended behaviour."
  type        = string
  default     = ""
}