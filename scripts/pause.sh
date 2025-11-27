#!/bin/bash
set -e

# Pause Infrastructure Script
# Usage: ./scripts/pause.sh [environment] [region]
# Example: ./scripts/pause.sh prod us-east-1

ENV=${1:-prod}
REGION=${2:-us-east-1}

echo "🛑 Pausing infrastructure for environment: $ENV"
echo ""

# Validate environment
if [[ ! "$ENV" =~ ^(dev|staging|prod)$ ]]; then
  echo "❌ Error: Environment must be dev, staging, or prod"
  exit 1
fi

# Stop RDS first (manual - can't be done via Terraform)
echo "📊 Checking RDS status..."
DB_INSTANCE="${ENV}-portfolio-db"

DB_STATUS=$(aws rds describe-db-instances \
  --db-instance-identifier "$DB_INSTANCE" \
  --region "$REGION" \
  --query 'DBInstances[0].DBInstanceStatus' \
  --output text 2>/dev/null || echo "not-found")

if [ "$DB_STATUS" = "available" ]; then
  echo "🛑 Stopping RDS database: $DB_INSTANCE..."
  aws rds stop-db-instance \
    --db-instance-identifier "$DB_INSTANCE" \
    --region "$REGION"
  echo "✅ RDS stop initiated (takes ~5 minutes)"
elif [ "$DB_STATUS" = "stopped" ]; then
  echo "✅ RDS already stopped"
elif [ "$DB_STATUS" = "stopping" ]; then
  echo "⏳ RDS is already stopping..."
else
  echo "⚠️  RDS instance not found or in unexpected state: $DB_STATUS"
fi

echo ""
echo "🔧 Applying Terraform with paused_mode=true..."

# For production, we need to disable ALB deletion protection first
# before destroying the ALB. This requires two applies:
# 1. First: Disable deletion protection (if ALB exists with protection enabled)
# 2. Second: Destroy ALB by setting paused_mode=true

cd "terraform/envs/$ENV"

if [ "$ENV" = "prod" ]; then
  echo "⚠️  Production detected - checking ALB deletion protection..."
  
  # Check if ALB exists and has deletion protection enabled
  ALB_NAME="${ENV}-portfolio-alb"
  ALB_EXISTS=$(aws elbv2 describe-load-balancers \
    --names "$ALB_NAME" \
    --region "$REGION" \
    --query 'LoadBalancers[0].LoadBalancerArn' \
    --output text 2>/dev/null || echo "")
  
  if [ -n "$ALB_EXISTS" ] && [ "$ALB_EXISTS" != "None" ]; then
    DELETION_PROTECTION=$(aws elbv2 describe-load-balancer-attributes \
      --load-balancer-arn "$ALB_EXISTS" \
      --region "$REGION" \
      --query 'Attributes[?Key==`deletion_protection.enabled`].Value' \
      --output text 2>/dev/null || echo "false")
    
    if [ "$DELETION_PROTECTION" = "true" ]; then
      echo "🔓 ALB has deletion protection enabled. Disabling it first..."
      # First apply: Disable deletion protection but keep ALB (paused_mode=false, enable_alb_deletion_protection=false)
      terraform apply -var="paused_mode=false" -var="enable_alb_deletion_protection=false" -auto-approve
      echo "⏳ Waiting 10 seconds for AWS to propagate changes..."
      sleep 10
    fi
  fi
fi

# Apply Terraform with paused mode (this will destroy ALB if deletion protection is disabled)
terraform apply -var="paused_mode=true" -auto-approve

echo ""
echo "✅ Infrastructure paused successfully!"
echo ""
echo "💰 Current costs: ~\$1-2/month"
echo "   - Secrets Manager: ~\$0.40/month"
echo "   - ECR: ~\$0.10/month"
echo "   - S3 State: ~\$0.01/month"
echo "   - CloudWatch Logs: ~\$0.50/month"
echo ""
echo "📋 What's still running:"
echo "   - VPC, Subnets (FREE)"
echo "   - Security Groups (FREE)"
echo "   - ECS Cluster (empty, FREE)"
echo "   - ECR with Docker images"
echo "   - Secrets in Secrets Manager"
echo ""
echo "🚀 To resume: ./scripts/resume.sh $ENV $REGION"

