terraform {
  required_version = ">= 1.6.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "Portfolio"
      Environment = "dev"
      ManagedBy   = "Terraform"
    }
  }
}

locals {
  environment = "dev"
}

# VPC with PUBLIC subnets only (cost savings)
module "networking" {
  source = "../../modules/networking"

  vpc_cidr           = var.vpc_cidr
  availability_zones = var.availability_zones
  environment        = local.environment
}

# Security Groups
module "security" {
  source = "../../modules/security"

  vpc_id            = module.networking.vpc_id
  environment       = local.environment
  admin_cidr_blocks = var.admin_cidr_blocks
}

# RDS PostgreSQL
module "rds" {
  source = "../../modules/rds"

  vpc_id                     = module.networking.vpc_id
  subnet_ids                 = module.networking.public_subnet_ids
  security_group_id          = module.security.rds_security_group_id
  environment                = local.environment
  db_name                    = var.db_name
  db_username                = var.db_username
  db_password                = var.db_password
  instance_class             = var.rds_instance_class
  allocated_storage          = var.rds_allocated_storage
  db_credentials_secret_name = var.db_credentials_secret_name
  skip_final_snapshot        = true # dev is ephemeral
}

# Application Load Balancer - Only create if not paused
resource "aws_lb" "main" {
  count              = var.paused_mode ? 0 : 1
  name               = "${local.environment}-portfolio-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [module.security.alb_security_group_id]
  subnets            = module.networking.public_subnet_ids

  enable_deletion_protection = false
  enable_http2               = true

  tags = {
    Environment = local.environment
  }
}

# Target Group - Only create if not paused
resource "aws_lb_target_group" "app" {
  count       = var.paused_mode ? 0 : 1
  name        = "${local.environment}-portfolio-tg"
  port        = 3000
  protocol    = "HTTP"
  vpc_id      = module.networking.vpc_id
  target_type = "ip"

  health_check {
    enabled             = true
    healthy_threshold   = 2
    interval            = 30
    matcher             = "200"
    path                = "/api/health"
    port                = "traffic-port"
    protocol            = "HTTP"
    timeout             = 5
    unhealthy_threshold = 3
  }

  deregistration_delay = 30

  tags = {
    Environment = local.environment
  }
}

# ALB Listener HTTP - Only create if not paused.
# When acm_certificate_arn is set, HTTP becomes a permanent redirect to HTTPS.
resource "aws_lb_listener" "http" {
  count             = var.paused_mode ? 0 : 1
  load_balancer_arn = aws_lb.main[0].arn
  port              = "80"
  protocol          = "HTTP"

  dynamic "default_action" {
    for_each = var.acm_certificate_arn != "" ? [1] : []
    content {
      type = "redirect"
      redirect {
        port        = "443"
        protocol    = "HTTPS"
        status_code = "HTTP_301"
      }
    }
  }

  dynamic "default_action" {
    for_each = var.acm_certificate_arn == "" ? [1] : []
    content {
      type             = "forward"
      target_group_arn = aws_lb_target_group.app[0].arn
    }
  }
}

# ALB Listener HTTPS - only created when acm_certificate_arn is supplied
resource "aws_lb_listener" "https" {
  count             = var.paused_mode || var.acm_certificate_arn == "" ? 0 : 1
  load_balancer_arn = aws_lb.main[0].arn
  port              = "443"
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = var.acm_certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app[0].arn
  }
}

# ECR Repository (shared across environments, but we'll create it per env for isolation)
resource "aws_ecr_repository" "app" {
  name                 = "portfolio-${local.environment}"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = {
    Environment = local.environment
  }
}

# ECR Lifecycle Policy (keep last 5 images)
resource "aws_ecr_lifecycle_policy" "app" {
  repository = aws_ecr_repository.app.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep last 5 images"
        selection = {
          tagStatus   = "any"
          countType   = "imageCountMoreThan"
          countNumber = 5
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}

# Store application secrets in Secrets Manager
resource "aws_secretsmanager_secret" "app_secrets" {
  name        = "portfolio/${local.environment}/app-secrets"
  description = "Application environment variables for ${local.environment}"

  tags = {
    Environment = local.environment
  }
}

# ECS Cluster and Service
module "ecs" {
  source = "../../modules/ecs"

  cluster_name       = "${local.environment}-portfolio-cluster"
  environment        = local.environment
  subnet_ids         = module.networking.public_subnet_ids
  public_subnet_ids  = module.networking.public_subnet_ids
  security_group_id  = module.security.ecs_security_group_id
  target_group_arn   = var.paused_mode ? "" : aws_lb_target_group.app[0].arn
  alb_listener_arn   = var.paused_mode ? "" : aws_lb_listener.http[0].arn
  ecr_repository_url = aws_ecr_repository.app.repository_url
  image_tag          = var.image_tag
  db_secret_arn      = module.rds.db_secret_arn
  app_secrets_arn    = aws_secretsmanager_secret.app_secrets.arn
  desired_count      = var.ecs_desired_count
  paused_mode        = var.paused_mode
  site_url           = var.site_url
}

