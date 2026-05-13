#!/bin/bash
set -euo pipefail

# Resume Infrastructure Script
# Usage: ./scripts/resume.sh <dev|staging|prod> [region]
# Example: ./scripts/resume.sh prod us-east-1

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "${SCRIPT_DIR}/.." && pwd)"

# Require the environment to be passed explicitly so we never default to prod.
if [ "${1:-}" = "" ]; then
  echo "❌ Error: environment is required."
  echo "Usage: $0 <dev|staging|prod> [region]"
  exit 1
fi

ENV="$1"
REGION="${2:-us-east-1}"

echo "🚀 Resuming infrastructure for environment: $ENV"
echo ""

# Validate environment
if [[ ! "$ENV" =~ ^(dev|staging|prod)$ ]]; then
  echo "❌ Error: Environment must be dev, staging, or prod"
  exit 1
fi

# Start RDS database FIRST (before ECS tasks)
# ECS tasks need DATABASE_URL to connect, so RDS must be available first
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
  echo "⏳ Waiting for RDS to become available (this takes ~5 minutes)..."
  
  # Poll until RDS is available
  MAX_WAIT=600  # 10 minutes max
  ELAPSED=0
  while [ $ELAPSED -lt $MAX_WAIT ]; do
    DB_STATUS=$(aws rds describe-db-instances \
      --db-instance-identifier "$DB_INSTANCE" \
      --region "$REGION" \
      --query 'DBInstances[0].DBInstanceStatus' \
      --output text 2>/dev/null || echo "unknown")
    
    if [ "$DB_STATUS" = "available" ]; then
      echo "✅ RDS is now available!"
      break
    elif [ "$DB_STATUS" = "stopped" ] || [ "$DB_STATUS" = "stopping" ]; then
      echo "⚠️  RDS is in unexpected state: $DB_STATUS"
      break
    else
      echo "   Status: $DB_STATUS (waiting... ${ELAPSED}s / ${MAX_WAIT}s)"
      sleep 15
      ELAPSED=$((ELAPSED + 15))
    fi
  done
  
  if [ "$DB_STATUS" != "available" ]; then
    echo "⚠️  Warning: RDS did not become available within ${MAX_WAIT} seconds"
    echo "   Current status: $DB_STATUS"
    echo "   Continuing anyway, but ECS tasks may fail to connect..."
  fi
elif [ "$DB_STATUS" = "available" ]; then
  echo "✅ RDS already running"
elif [ "$DB_STATUS" = "starting" ]; then
  echo "⏳ RDS is already starting, waiting for it to become available..."
  
  # Poll until RDS is available
  MAX_WAIT=600  # 10 minutes max
  ELAPSED=0
  while [ $ELAPSED -lt $MAX_WAIT ]; do
    DB_STATUS=$(aws rds describe-db-instances \
      --db-instance-identifier "$DB_INSTANCE" \
      --region "$REGION" \
      --query 'DBInstances[0].DBInstanceStatus' \
      --output text 2>/dev/null || echo "unknown")
    
    if [ "$DB_STATUS" = "available" ]; then
      echo "✅ RDS is now available!"
      break
    else
      echo "   Status: $DB_STATUS (waiting... ${ELAPSED}s / ${MAX_WAIT}s)"
      sleep 15
      ELAPSED=$((ELAPSED + 15))
    fi
  done
else
  echo "⚠️  RDS instance not found or in unexpected state: $DB_STATUS"
  echo "   Continuing anyway, but ECS tasks may fail to connect..."
fi

echo ""
echo "🔧 Applying Terraform with paused_mode=false..."
echo "   (ECS tasks will start now that RDS is available)"
cd "${REPO_ROOT}/terraform/envs/${ENV}"

# For production, re-enable ALB deletion protection when resuming
if [ "$ENV" = "prod" ]; then
  terraform apply -var="paused_mode=false" -var="enable_alb_deletion_protection=true" -auto-approve
else
  terraform apply -var="paused_mode=false" -auto-approve
fi

echo ""
echo "⏳ Waiting for ECS services to stabilize..."
sleep 30

# Get ALB DNS
ALB_DNS=$(terraform output -raw alb_dns_name 2>/dev/null || echo "N/A")

echo ""
echo "✅ Infrastructure resumed successfully!"
echo ""

if [ "$ALB_DNS" != "N/A" ] && [ "$ALB_DNS" != "N/A - Infrastructure is paused" ]; then
  echo "🌐 New ALB DNS: $ALB_DNS"
  echo "   Direct URL:  http://$ALB_DNS"
  echo ""

  # DNS reminder for prod. Pausing destroys the ALB and resuming creates a
  # brand-new one with a different DNS name, so the CNAME at the DNS
  # provider has to be re-pointed by hand every resume. Try to compare the
  # custom-domain CNAME against the new ALB DNS so the user can see at a
  # glance whether the update is still pending.
  if [ "$ENV" = "prod" ]; then
    PROD_DOMAIN="portfolio.oluwabamiseomolaso.com.ng"
    echo "🔗 DNS — manual step required:"
    echo "   Update the CNAME for $PROD_DOMAIN at your DNS provider"
    echo "   to point at: $ALB_DNS"
    echo ""
    if command -v dig >/dev/null 2>&1; then
      CURRENT_CNAME=$(dig +short CNAME "$PROD_DOMAIN" 2>/dev/null | sed 's/\.$//' | head -n1)
      if [ -z "$CURRENT_CNAME" ]; then
        echo "   ℹ️  Could not resolve current CNAME for $PROD_DOMAIN."
        echo "      DNS may not be configured yet, or your resolver is offline."
      elif [ "$CURRENT_CNAME" = "$ALB_DNS" ]; then
        echo "   ✅ CNAME already points to the new ALB. Nothing to do."
      else
        echo "   ⚠️  CNAME currently points to: $CURRENT_CNAME"
        echo "      That ALB no longer exists — the site will be unreachable on"
        echo "      $PROD_DOMAIN until you update the record. (DNS caches up to TTL.)"
      fi
      echo ""
    fi
  fi
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

