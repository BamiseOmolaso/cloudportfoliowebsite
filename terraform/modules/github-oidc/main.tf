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

# Policy for Deploy Role - ECR, ECS, Terraform state, and resource read permissions
resource "aws_iam_role_policy" "deploy_policy" {
  name = "deploy-access"
  role = aws_iam_role.deploy_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          # ECR permissions
          "ecr:GetAuthorizationToken",
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
          "ecr:PutImage",
          "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:CompleteLayerUpload",
          "ecr:DescribeRepositories",
          "ecr:DescribeImages",
          "ecr:ListTagsForResource",
          # ECS permissions
          "ecs:UpdateService",
          "ecs:DescribeServices",
          "ecs:DescribeClusters",
          "ecs:ListServices",
          "ecs:DescribeTaskDefinition",
          "ecs:RegisterTaskDefinition",
          "ecs:ListTasks",
          "ecs:DescribeTasks",
          "ecs:RunTask",
          "ecs:StopTask",
          # Secrets Manager (for reading secrets)
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret",
          "secretsmanager:GetResourcePolicy",
          # CloudWatch logs
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:DescribeLogGroups",
          "logs:DescribeLogStreams",
          "logs:ListTagsForResource",
          # IAM (for Terraform state refresh)
          "iam:GetRole",
          "iam:ListRolePolicies",
          "iam:ListAttachedRolePolicies",
          "iam:GetRolePolicy",
          "iam:ListOpenIDConnectProviders",
          "iam:GetOpenIDConnectProvider",
          # EC2 (for Terraform state refresh - VPC, subnets, security groups, networking)
          "ec2:DescribeVpcs",
          "ec2:DescribeSubnets",
          "ec2:DescribeSecurityGroups",
          "ec2:DescribeVpcAttribute",
          "ec2:DescribeInternetGateways",
          "ec2:DescribeRouteTables",
          # Elastic Load Balancing (ALB, Target Groups, Listeners)
          "elasticloadbalancing:DescribeLoadBalancers",
          "elasticloadbalancing:DescribeTargetGroups",
          "elasticloadbalancing:DescribeLoadBalancerAttributes",
          "elasticloadbalancing:DescribeTargetGroupAttributes",
          "elasticloadbalancing:DescribeListeners",
          "elasticloadbalancing:DescribeRules",
          "elasticloadbalancing:DescribeTags",
          # RDS (for Terraform state refresh)
          "rds:DescribeDBInstances",
          "rds:DescribeDBSubnetGroups",
          "rds:ListTagsForResource",
          # Application Auto Scaling (for ECS service scaling)
          "application-autoscaling:DescribeScalableTargets",
          "application-autoscaling:DescribeScalingPolicies"
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
