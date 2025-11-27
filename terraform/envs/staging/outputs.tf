output "alb_dns_name" {
  description = "DNS name of the Application Load Balancer (empty when paused)"
  value       = var.paused_mode ? "N/A - Infrastructure is paused" : aws_lb.main[0].dns_name
}

output "alb_zone_id" {
  description = "Zone ID of the ALB for Route53 (empty when paused)"
  value       = var.paused_mode ? "N/A - Infrastructure is paused" : aws_lb.main[0].zone_id
}

output "ecr_repository_url" {
  description = "ECR repository URL"
  value       = aws_ecr_repository.app.repository_url
}

output "rds_endpoint" {
  description = "RDS endpoint"
  value       = module.rds.db_endpoint
}

output "rds_address" {
  description = "RDS address"
  value       = module.rds.db_address
}

output "db_secret_arn" {
  description = "Database credentials secret ARN"
  value       = module.rds.db_secret_arn
}

output "ecs_cluster_name" {
  description = "ECS cluster name"
  value       = module.ecs.cluster_name
}

output "ecs_service_name" {
  description = "ECS service name"
  value       = module.ecs.service_name
}

output "ecs_task_definition_family" {
  description = "ECS task definition family"
  value       = module.ecs.task_definition_family
}

output "cloudwatch_log_group" {
  description = "CloudWatch log group name"
  value       = module.ecs.log_group_name
}

output "vpc_id" {
  description = "VPC ID"
  value       = module.networking.vpc_id
}

output "target_group_arn" {
  description = "Target group ARN (empty when paused)"
  value       = var.paused_mode ? "N/A - Infrastructure is paused" : aws_lb_target_group.app[0].arn
}

output "application_url" {
  description = "Application URL (empty when paused)"
  value       = var.paused_mode ? "N/A - Infrastructure is paused. Run 'terraform apply -var=\"paused_mode=false\"' to resume" : "http://${aws_lb.main[0].dns_name}"
}

output "infrastructure_status" {
  description = "Current infrastructure status"
  value       = var.paused_mode ? "PAUSED - All expensive resources paused. Cost: ~$1-2/month" : "ACTIVE - All resources running"
}

