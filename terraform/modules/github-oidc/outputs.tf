output "terraform_role_arn" {
  description = "ARN of the IAM role for Terraform operations"
  value       = aws_iam_role.terraform_role.arn
}

output "deploy_role_arn" {
  description = "ARN of the IAM role for application deployment"
  value       = aws_iam_role.deploy_role.arn
}

output "oidc_provider_arn" {
  description = "ARN of the OIDC provider"
  value       = local.oidc_provider_arn
}

