# AWS Secrets Manager Setup Guide

This guide shows you how to set up all required secrets in AWS Secrets Manager for your application.

## 🔐 Secrets Overview

Your application needs secrets in two places:

1. **Database Credentials** - Already created by Terraform (`omolasowebportfolio/db/credentials`)
2. **Application Secrets** - You need to create this (`portfolio/prod/app-secrets`)

## 📋 Required Secrets

Based on your application code, you need these secrets:

### Application Secrets (portfolio/prod/app-secrets)

- `RESEND_API_KEY` - Your Resend API key
- `RECAPTCHA_SECRET_KEY` - Google reCAPTCHA secret key
- `JWT_SECRET` - JWT signing secret (min 32 characters)
- `ADMIN_EMAIL` - Admin user email
- `ADMIN_PASSWORD` - Admin user password (min 8 characters)
- `RESEND_FROM_EMAIL` - Email address to send from
- `CONTACT_EMAIL` - Contact email address
- `RESEND_DOMAIN` - Your Resend domain
- `REDIS_URL` - Redis Cloud connection URL (optional, production only)
- `REDIS_HOST` - Redis Cloud host (optional, if not using URL)
- `REDIS_PORT` - Redis Cloud port (optional, if not using URL)
- `REDIS_PASSWORD` - Redis Cloud password (optional, if not using URL)

## 🚀 Setup Steps

### Step 1: Deploy Infrastructure First

Make sure Terraform has created the secret:

```bash
cd terraform/envs/prod
terraform apply
```

This creates the secret `portfolio/prod/app-secrets` (but it's empty).

### Step 2: Prepare Your Secret Values

Create a JSON file with all your secrets:

```bash
# Create a temporary file (don't commit this!)
cat > /tmp/app-secrets.json << 'EOF'
{
  "RESEND_API_KEY": "re_your_actual_resend_api_key",
  "RECAPTCHA_SECRET_KEY": "your_recaptcha_secret_key",
  "JWT_SECRET": "your-jwt-secret-min-32-characters-long-for-production",
  "ADMIN_EMAIL": "admin@yourdomain.com",
  "ADMIN_PASSWORD": "your-secure-admin-password-min-8-chars",
  "RESEND_FROM_EMAIL": "noreply@yourdomain.com",
  "CONTACT_EMAIL": "contact@yourdomain.com",
  "RESEND_DOMAIN": "yourdomain.com",
  "REDIS_URL": "redis://default:password@your-redis-host:port"
}
EOF
```

**Replace all values with your actual secrets!**

### Step 3: Add Secrets to AWS Secrets Manager

#### Option A: Using AWS CLI (Recommended)

```bash
# For Production
aws secretsmanager put-secret-value \
  --secret-id "portfolio/prod/app-secrets" \
  --secret-string file:///tmp/app-secrets.json \
  --region us-east-1

# For Development (if you've deployed dev)
aws secretsmanager put-secret-value \
  --secret-id "portfolio/dev/app-secrets" \
  --secret-string file:///tmp/app-secrets.json \
  --region us-east-1

# For Staging (if you've deployed staging)
aws secretsmanager put-secret-value \
  --secret-id "portfolio/staging/app-secrets" \
  --secret-string file:///tmp/app-secrets.json \
  --region us-east-1
```

#### Option B: Using AWS Console

1. Go to AWS Console → Secrets Manager
2. Find `portfolio/prod/app-secrets`
3. Click "Retrieve secret value"
4. Click "Edit"
5. Paste your JSON:
   ```json
   {
     "RESEND_API_KEY": "re_your_key",
     "RECAPTCHA_SECRET_KEY": "your_secret",
     ...
   }
   ```
6. Click "Save"

### Step 4: Verify Secrets

```bash
# Check that secret exists
aws secretsmanager describe-secret \
  --secret-id "portfolio/prod/app-secrets" \
  --region us-east-1

# View secret (without values, for security)
aws secretsmanager get-secret-value \
  --secret-id "portfolio/prod/app-secrets" \
  --region us-east-1 \
  --query 'SecretString' \
  --output text | jq 'keys'  # Lists all keys
```

## 🔄 Updating Secrets

To update a secret value:

```bash
# Edit your JSON file
nano /tmp/app-secrets.json

# Update the secret
aws secretsmanager put-secret-value \
  --secret-id "portfolio/prod/app-secrets" \
  --secret-string file:///tmp/app-secrets.json \
  --region us-east-1
```

**Note:** After updating secrets, you may need to restart your ECS service for changes to take effect.

## 🔍 Current ECS Configuration

Currently, your ECS task definition only pulls these from Secrets Manager:

- `DATABASE_URL` - From `omolasowebportfolio/db/credentials`
- `RESEND_API_KEY` - From `portfolio/prod/app-secrets:RESEND_API_KEY::`
- `RECAPTCHA_SECRET_KEY` - From `portfolio/prod/app-secrets:RECAPTCHA_SECRET_KEY::`

### Adding More Secrets to ECS

If you need other secrets (like `JWT_SECRET`, `ADMIN_EMAIL`, etc.) in ECS, you need to update the ECS task definition. 

**Option 1: Add to ECS Task Definition**

Update `terraform/modules/ecs/main.tf` to include more secrets:

```hcl
secrets = [
  {
    name      = "DATABASE_URL"
    valueFrom = var.db_secret_arn
  },
  {
    name      = "RESEND_API_KEY"
    valueFrom = "${var.app_secrets_arn}:RESEND_API_KEY::"
  },
  {
    name      = "RECAPTCHA_SECRET_KEY"
    valueFrom = "${var.app_secrets_arn}:RECAPTCHA_SECRET_KEY::"
  },
  # Add more as needed:
  {
    name      = "JWT_SECRET"
    valueFrom = "${var.app_secrets_arn}:JWT_SECRET::"
  },
  {
    name      = "ADMIN_EMAIL"
    valueFrom = "${var.app_secrets_arn}:ADMIN_EMAIL::"
  },
  # ... etc
]
```

**Option 2: Use Environment Variables (Less Secure)**

For non-sensitive values, you can add them as regular environment variables in the ECS task definition.

## 📝 Quick Setup Script

Here's a script to help you set up secrets:

```bash
#!/bin/bash

# Set your values here
RESEND_API_KEY="re_your_key"
RECAPTCHA_SECRET_KEY="your_secret"
JWT_SECRET="your-jwt-secret-min-32-chars"
ADMIN_EMAIL="admin@yourdomain.com"
ADMIN_PASSWORD="your-password"
RESEND_FROM_EMAIL="noreply@yourdomain.com"
CONTACT_EMAIL="contact@yourdomain.com"
RESEND_DOMAIN="yourdomain.com"
REDIS_URL="redis://default:password@your-redis-host:port"

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
  "REDIS_URL": "${REDIS_URL:-}"
}
EOF
)

# Save to file
echo "$SECRET_JSON" > /tmp/app-secrets.json

# Upload to Secrets Manager
aws secretsmanager put-secret-value \
  --secret-id "portfolio/prod/app-secrets" \
  --secret-string file:///tmp/app-secrets.json \
  --region us-east-1

echo "✅ Secrets uploaded successfully!"
echo "⚠️  Remember to delete /tmp/app-secrets.json for security"
```

## 🔒 Security Best Practices

1. **Never commit secrets** - Keep them in Secrets Manager only
2. **Use IAM policies** - Limit who can read/write secrets
3. **Rotate secrets regularly** - Especially passwords and API keys
4. **Use separate secrets per environment** - Don't share prod secrets with dev
5. **Enable secret versioning** - Keep history of changes

## 🐛 Troubleshooting

### "Secret not found" error

- Verify Terraform created the secret: `terraform output`
- Check secret name matches exactly
- Verify you're in the correct AWS region

### ECS can't read secrets

- Check IAM role has `secretsmanager:GetSecretValue` permission
- Verify secret ARN is correct in task definition
- Check CloudWatch logs for ECS tasks

### Secrets not updating in ECS

- Secrets are loaded when task starts
- Restart ECS service: `aws ecs update-service --force-new-deployment`
- Or update task definition and redeploy

## 📚 Related Documentation

- [AWS Secrets Manager Documentation](https://docs.aws.amazon.com/secretsmanager/)
- [ECS Secrets Integration](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/specifying-sensitive-data-secrets.html)
- `terraform/envs/prod/main.tf` - See how secrets are configured

---

**Next Steps:**
1. Deploy infrastructure with Terraform (creates empty secret)
2. Add your secret values using AWS CLI or Console
3. Verify ECS can access secrets
4. Deploy your application

