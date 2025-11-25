#!/bin/bash

# Script to help migrate Terraform state from old structure to new structure
# This preserves your existing infrastructure

set -e

OLD_BUCKET="omolaso-terraform-state"
OLD_KEY="portfolio/terraform.tfstate"
NEW_BUCKET="omolaso-terraform-state"  # Using same bucket, just different key
AWS_REGION="us-east-1"

echo "🔄 Terraform State Migration Script"
echo "=================================="
echo ""
echo "This script will help you migrate from:"
echo "  Old: s3://$OLD_BUCKET/$OLD_KEY"
echo "  New: s3://$NEW_BUCKET/envs/prod/terraform.tfstate"
echo ""
echo "Note: Using same bucket, just different key path for better organization"
echo ""

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI is not installed"
    exit 1
fi

# Check if old state exists
echo "📋 Checking for existing state..."
if aws s3 ls "s3://$OLD_BUCKET/$OLD_KEY" 2>/dev/null; then
    echo "✅ Found existing state file"
    
    # Backup old state
    echo "💾 Creating backup..."
    BACKUP_FILE="terraform-state-backup-$(date +%Y%m%d-%H%M%S).tfstate"
    aws s3 cp "s3://$OLD_BUCKET/$OLD_KEY" "$BACKUP_FILE"
    echo "✅ Backup saved to: $BACKUP_FILE"
    
    # Check if bucket exists (using same bucket, just different key)
    echo "📦 Checking bucket..."
    if aws s3api head-bucket --bucket "$NEW_BUCKET" 2>/dev/null; then
        echo "✅ Bucket exists"
    else
        echo "❌ Bucket doesn't exist. This shouldn't happen if you have existing state."
        exit 1
    fi
    
    # Check if DynamoDB table exists
    echo "🔒 Checking DynamoDB table..."
    if aws dynamodb describe-table --table-name "portfolio-tf-locks" --region "$AWS_REGION" >/dev/null 2>&1; then
        echo "✅ DynamoDB table exists"
    else
        echo "⚠️  DynamoDB table doesn't exist. Creating it..."
        if aws dynamodb create-table \
            --table-name portfolio-tf-locks \
            --attribute-definitions AttributeName=LockID,AttributeType=S \
            --key-schema AttributeName=LockID,KeyType=HASH \
            --billing-mode PAY_PER_REQUEST \
            --region "$AWS_REGION" 2>/dev/null; then
            echo "⏳ Waiting for table to be active..."
            aws dynamodb wait table-exists --table-name portfolio-tf-locks --region "$AWS_REGION"
            echo "✅ DynamoDB table created"
        else
            # Table might have been created between check and create
            if aws dynamodb describe-table --table-name "portfolio-tf-locks" --region "$AWS_REGION" >/dev/null 2>&1; then
                echo "✅ DynamoDB table exists (was created by another process)"
            else
                echo "❌ Failed to create DynamoDB table. Please create it manually."
                exit 1
            fi
        fi
    fi
    
    # Copy state to new location
    echo "📤 Copying state to new location..."
    aws s3 cp "s3://$OLD_BUCKET/$OLD_KEY" \
        "s3://$NEW_BUCKET/envs/prod/terraform.tfstate" \
        --region "$AWS_REGION"
    echo "✅ State copied to new location"
    
    echo ""
    echo "✅ Migration complete!"
    echo ""
    echo "Next steps:"
    echo "1. cd terraform/envs/prod"
    echo "2. terraform init"
    echo "3. terraform plan (should show no changes)"
    echo "4. Verify resources: terraform state list"
    echo ""
    echo "⚠️  Keep the backup file ($BACKUP_FILE) until you verify everything works!"
    
else
    echo "⚠️  No existing state found at s3://$OLD_BUCKET/$OLD_KEY"
    echo ""
    echo "This could mean:"
    echo "  - You haven't deployed yet (safe to proceed)"
    echo "  - State is in a different location"
    echo ""
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

