output "alb_dns_name" {
  description = "DNS name of the Application Load Balancer"
  value       = aws_lb.main.dns_name
}

output "alb_zone_id" {
  description = "Zone ID of the ALB for Route53"
  value       = aws_lb.main.zone_id
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
  description = "Target group ARN"
  value       = aws_lb_target_group.app.arn
}

output "application_url" {
  description = "Application URL"
  value       = "http://${aws_lb.main.dns_name}"
}

# Output instructions for next steps
output "next_steps" {
  description = "Next steps to complete deployment"
  value = <<-EOT
    
    ✅ Infrastructure deployed successfully!
    
    Next steps:
    
    1. Add application secrets:
       aws secretsmanager put-secret-value \
         --secret-id omolaso-portfolio/env/production \
         --secret-string '{"RESEND_API_KEY":"your_key","RECAPTCHA_SECRET_KEY":"your_key"}'
    
    2. Build and push Docker image:
       aws ecr get-login-password --region ${var.aws_region} | docker login --username AWS --password-stdin ${aws_ecr_repository.app.repository_url}
       docker build -t ${aws_ecr_repository.app.repository_url}:latest .
       docker push ${aws_ecr_repository.app.repository_url}:latest
    
    3. Force ECS service update:
       aws ecs update-service --cluster ${module.ecs.cluster_name} --service ${module.ecs.service_name} --force-new-deployment
    
    4. Check your application:
       http://${aws_lb.main.dns_name}
    
    5. View logs:
       aws logs tail ${module.ecs.log_group_name} --follow
  EOT
}