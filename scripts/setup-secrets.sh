#!/bin/bash

# Script to set up AWS Secrets Manager secrets for the application
# Usage: ./scripts/setup-secrets.sh [environment]
# Example: ./scripts/setup-secrets.sh prod

set -e

ENVIRONMENT=${1:-prod}
AWS_REGION=${AWS_REGION:-us-east-1}
SECRET_NAME="portfolio/${ENVIRONMENT}/app-secrets"

echo "🔐 Setting up Secrets Manager for environment: $ENVIRONMENT"
echo "Secret name: $SECRET_NAME"
echo ""

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI is not installed"
    exit 1
fi

# Check if secret exists
echo "📋 Checking if secret exists..."
if aws secretsmanager describe-secret --secret-id "$SECRET_NAME" --region "$AWS_REGION" >/dev/null 2>&1; then
    echo "✅ Secret exists"
else
    echo "⚠️  Secret doesn't exist. Make sure Terraform has created it first."
    echo "   Run: cd terraform/envs/$ENVIRONMENT && terraform apply"
    exit 1
fi

# Prompt for secret values
echo ""
echo "Please provide the following secret values:"
echo ""

read -p "RESEND_API_KEY: " RESEND_API_KEY
read -p "RECAPTCHA_SECRET_KEY: " RECAPTCHA_SECRET_KEY
read -sp "JWT_SECRET (min 32 chars): " JWT_SECRET
echo ""
read -p "ADMIN_EMAIL: " ADMIN_EMAIL
read -sp "ADMIN_PASSWORD (min 8 chars): " ADMIN_PASSWORD
echo ""
read -p "RESEND_FROM_EMAIL: " RESEND_FROM_EMAIL
read -p "CONTACT_EMAIL: " CONTACT_EMAIL
read -p "RESEND_DOMAIN: " RESEND_DOMAIN
# Redis Cloud - Only needed for production (optional)
echo ""
echo "📝 Redis Cloud Configuration (Optional - only used in production)"
echo "   Leave empty if not using Redis Cloud"
read -p "REDIS_URL (redis://default:password@host:port): " REDIS_URL
read -p "REDIS_HOST (if not using URL): " REDIS_HOST
read -p "REDIS_PORT (if not using URL): " REDIS_PORT
read -sp "REDIS_PASSWORD (if not using URL): " REDIS_PASSWORD
echo ""
echo ""

# Validate inputs
if [ -z "$RESEND_API_KEY" ] || [ -z "$RECAPTCHA_SECRET_KEY" ] || [ -z "$JWT_SECRET" ]; then
    echo "❌ Required secrets cannot be empty"
    exit 1
fi

if [ ${#JWT_SECRET} -lt 32 ]; then
    echo "❌ JWT_SECRET must be at least 32 characters"
    exit 1
fi

if [ ${#ADMIN_PASSWORD} -lt 8 ]; then
    echo "❌ ADMIN_PASSWORD must be at least 8 characters"
    exit 1
fi

# Create JSON
SECRET_JSON=$(cat <<EOF
{
  "RESEND_API_KEY": "$RESEND_API_KEY",
  "RECAPTCHA_SECRET_KEY": "$RECAPTCHA_SECRET_KEY",
  "JWT_SECRET": "$JWT_SECRET",
  "ADMIN_EMAIL": "$ADMIN_EMAIL",
  "ADMIN_PASSWORD": "$ADMIN_PASSWORD",
  "RESEND_FROM_EMAIL": "$RESEND_FROM_EMAIL",
  "CONTACT_EMAIL": "$CONTACT_EMAIL",
  "RESEND_DOMAIN": "$RESEND_DOMAIN",
  "REDIS_URL": "${REDIS_URL:-}",
  "REDIS_HOST": "${REDIS_HOST:-}",
  "REDIS_PORT": "${REDIS_PORT:-}",
  "REDIS_PASSWORD": "${REDIS_PASSWORD:-}"
}
EOF
)

# Save to temporary file
TEMP_FILE=$(mktemp)
echo "$SECRET_JSON" > "$TEMP_FILE"

# Upload to Secrets Manager
echo ""
echo "📤 Uploading secrets to AWS Secrets Manager..."
if aws secretsmanager put-secret-value \
    --secret-id "$SECRET_NAME" \
    --secret-string file://"$TEMP_FILE" \
    --region "$AWS_REGION" >/dev/null 2>&1; then
    echo "✅ Secrets uploaded successfully!"
else
    echo "❌ Failed to upload secrets"
    rm -f "$TEMP_FILE"
    exit 1
fi

# Clean up
rm -f "$TEMP_FILE"

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Verify secrets: aws secretsmanager get-secret-value --secret-id $SECRET_NAME --region $AWS_REGION"
echo "2. Deploy/restart ECS service to pick up new secrets"
echo "3. Check application logs to verify secrets are loaded correctly"

