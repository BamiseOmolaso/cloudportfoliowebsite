#!/bin/bash
set -e

# Resume Infrastructure Script
# Usage: ./scripts/resume.sh [environment] [region]
# Example: ./scripts/resume.sh prod us-east-1

ENV=${1:-prod}
REGION=${2:-us-east-1}

echo "🚀 Resuming infrastructure for environment: $ENV"
echo ""

# Validate environment
if [[ ! "$ENV" =~ ^(dev|staging|prod)$ ]]; then
  echo "❌ Error: Environment must be dev, staging, or prod"
  exit 1
fi

# Apply Terraform without paused mode
echo "🔧 Applying Terraform with paused_mode=false..."
cd "terraform/envs/$ENV"

terraform apply -var="paused_mode=false" -auto-approve

echo ""
echo "📊 Starting RDS database..."
DB_INSTANCE="${ENV}-portfolio-db"

DB_STATUS=$(aws rds describe-db-instances \
  --db-instance-identifier "$DB_INSTANCE" \
  --region "$REGION" \
  --query 'DBInstances[0].DBInstanceStatus' \
  --output text 2>/dev/null || echo "not-found")

if [ "$DB_STATUS" = "stopped" ]; then
  echo "🚀 Starting RDS database: $DB_INSTANCE..."
  aws rds start-db-instance \
    --db-instance-identifier "$DB_INSTANCE" \
    --region "$REGION"
  echo "✅ RDS start initiated (takes ~5 minutes)"
elif [ "$DB_STATUS" = "available" ]; then
  echo "✅ RDS already running"
elif [ "$DB_STATUS" = "starting" ]; then
  echo "⏳ RDS is already starting..."
else
  echo "⚠️  RDS instance not found or in unexpected state: $DB_STATUS"
fi

echo ""
echo "⏳ Waiting for services to stabilize..."
sleep 30

# Get ALB DNS
ALB_DNS=$(terraform output -raw alb_dns_name 2>/dev/null || echo "N/A")

echo ""
echo "✅ Infrastructure resumed successfully!"
echo ""

if [ "$ALB_DNS" != "N/A" ] && [ "$ALB_DNS" != "N/A - Infrastructure is paused" ]; then
  echo "🌐 Application URL: http://$ALB_DNS"
  echo ""
fi

echo "📊 Checking service status..."
CLUSTER_NAME="${ENV}-portfolio-cluster"
SERVICE_NAME="${ENV}-portfolio-service"

aws ecs describe-services \
  --cluster "$CLUSTER_NAME" \
  --services "$SERVICE_NAME" \
  --region "$REGION" \
  --query 'services[0].{Status:status,Running:runningCount,Desired:desiredCount}' \
  --output table 2>/dev/null || echo "⚠️  Could not retrieve ECS service status"

echo ""
echo "💰 Costs resumed: ~\$200-250/month when running 24/7"
echo "💡 Tip: Run ./scripts/pause.sh $ENV $REGION when done to save money"

