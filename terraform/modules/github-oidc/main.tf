# GitHub OIDC Provider for GitHub Actions (already exists, just reference it)
data "aws_iam_openid_connect_provider" "github" {
  url = "https://token.actions.githubusercontent.com"
}

locals {
  oidc_provider_arn = data.aws_iam_openid_connect_provider.github.arn
}

# IAM Role for Terraform Operations (GitHub Actions)
resource "aws_iam_role" "terraform_role" {
  name = "github-actions-terraform-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = local.oidc_provider_arn
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
          }
          StringLike = {
            "token.actions.githubusercontent.com:sub" = "repo:${var.github_repo}:*"
          }
        }
      }
    ]
  })

  tags = {
    Name        = "github-actions-terraform-role"
    Environment = "shared"
    ManagedBy   = "Terraform"
  }
}

# Policy for Terraform Role - Full Terraform permissions
resource "aws_iam_role_policy" "terraform_policy" {
  name = "terraform-full-access"
  role = aws_iam_role.terraform_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ec2:*",
          "ecs:*",
          "ecr:*",
          "elasticloadbalancing:*",
          "rds:*",
          "secretsmanager:*",
          "iam:*",
          "logs:*",
          "cloudwatch:*",
          "s3:*",
          "dynamodb:*",
          "route53:*",
          "acm:*",
          "apigateway:*",
          "lambda:*",
          "events:*",
          "ssm:*",
          "kms:*",
          "application-autoscaling:*"
        ]
        Resource = "*"
      }
    ]
  })
}

# IAM Role for Application Deployment (GitHub Actions)
resource "aws_iam_role" "deploy_role" {
  name = "github-actions-deploy-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = local.oidc_provider_arn
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
          }
          StringLike = {
            "token.actions.githubusercontent.com:sub" = "repo:${var.github_repo}:*"
          }
        }
      }
    ]
  })

  tags = {
    Name        = "github-actions-deploy-role"
    Environment = "shared"
    ManagedBy   = "Terraform"
  }
}

# Policy for Deploy Role - Full access to services we use, scoped to our resources
resource "aws_iam_role_policy" "deploy_policy" {
  name = "deploy-access"
  role = aws_iam_role.deploy_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          # ECR - Full access (for image push/pull)
          "ecr:*",
          # ECS - Full access (for task definitions, services, clusters)
          "ecs:*",
          # Elastic Load Balancing - Full access (for ALB, target groups, listeners)
          "elasticloadbalancing:*",
          # RDS - Full access (for database management)
          "rds:*",
          # Application Auto Scaling - Full access (for ECS scaling)
          "application-autoscaling:*",
          # Secrets Manager - Full access (for secrets)
          "secretsmanager:*",
          # CloudWatch Logs - Full access (for logging)
          "logs:*",
          # CloudWatch - Full access (for metrics and alarms)
          "cloudwatch:*"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          # IAM - Read and tag operations only (for roles, policies, OIDC)
          "iam:GetRole",
          "iam:ListRolePolicies",
          "iam:ListAttachedRolePolicies",
          "iam:GetRolePolicy",
          "iam:ListOpenIDConnectProviders",
          "iam:GetOpenIDConnectProvider",
          "iam:GetPolicy",
          "iam:GetPolicyVersion",
          "iam:ListPolicyVersions",
          "iam:ListRoles",
          "iam:ListPolicies",
          "iam:TagRole",
          "iam:UntagRole",
          "iam:PassRole"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          # EC2 - Describe operations only (for VPC, subnets, security groups)
          "ec2:Describe*",
          "ec2:Get*",
          "ec2:List*"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          # Terraform state bucket - read state and outputs
          "s3:GetObject",
          "s3:ListBucket"
        ]
        Resource = [
          "arn:aws:s3:::omolaso-terraform-state",
          "arn:aws:s3:::omolaso-terraform-state/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          # Terraform state file - write state after apply
          "s3:PutObject"
        ]
        Resource = [
          "arn:aws:s3:::omolaso-terraform-state/envs/*/terraform.tfstate"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          # Terraform state locking - need to create/delete lock files
          "s3:PutObject",
          "s3:DeleteObject"
        ]
        Resource = [
          "arn:aws:s3:::omolaso-terraform-state/*.tflock"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          # DynamoDB state locking
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:DescribeTable"
        ]
        Resource = [
          "arn:aws:dynamodb:us-east-1:*:table/portfolio-tf-locks"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "sts:GetCallerIdentity"
        ]
        Resource = "*"
      }
    ]
  })
}
