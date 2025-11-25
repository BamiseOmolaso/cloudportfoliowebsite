#!/bin/bash

# Bootstrap script to create S3 bucket and DynamoDB table for Terraform state
# Run this once before using Terraform

set -e

AWS_REGION=${AWS_REGION:-us-east-1}
BUCKET_NAME="portfolio-tfstate-main"
DYNAMODB_TABLE="portfolio-tf-locks"

echo "🚀 Bootstrapping Terraform backend..."
echo "Region: $AWS_REGION"
echo ""

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI is not installed. Please install it first."
    exit 1
fi

# Create S3 bucket for Terraform state
echo "📦 Creating S3 bucket: $BUCKET_NAME"
if aws s3api head-bucket --bucket "$BUCKET_NAME" --region "$AWS_REGION" 2>/dev/null; then
    echo "✅ S3 bucket already exists"
else
    if [ "$AWS_REGION" = "us-east-1" ]; then
        aws s3api create-bucket \
            --bucket "$BUCKET_NAME" \
            --region "$AWS_REGION"
    else
        aws s3api create-bucket \
            --bucket "$BUCKET_NAME" \
            --region "$AWS_REGION" \
            --create-bucket-configuration LocationConstraint="$AWS_REGION"
    fi
    echo "✅ S3 bucket created"
fi

# Enable versioning
echo "🔄 Enabling versioning on S3 bucket..."
aws s3api put-bucket-versioning \
    --bucket "$BUCKET_NAME" \
    --versioning-configuration Status=Enabled \
    --region "$AWS_REGION"
echo "✅ Versioning enabled"

# Enable encryption
echo "🔐 Enabling encryption on S3 bucket..."
aws s3api put-bucket-encryption \
    --bucket "$BUCKET_NAME" \
    --server-side-encryption-configuration '{
        "Rules": [{
            "ApplyServerSideEncryptionByDefault": {
                "SSEAlgorithm": "AES256"
            }
        }]
    }' \
    --region "$AWS_REGION"
echo "✅ Encryption enabled"

# Block public access
echo "🔒 Blocking public access..."
aws s3api put-public-access-block \
    --bucket "$BUCKET_NAME" \
    --public-access-block-configuration \
        "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true" \
    --region "$AWS_REGION"
echo "✅ Public access blocked"

# Create DynamoDB table for state locking
echo "🔒 Creating DynamoDB table: $DYNAMODB_TABLE"
if aws dynamodb describe-table --table-name "$DYNAMODB_TABLE" --region "$AWS_REGION" 2>/dev/null; then
    echo "✅ DynamoDB table already exists"
else
    aws dynamodb create-table \
        --table-name "$DYNAMODB_TABLE" \
        --attribute-definitions AttributeName=LockID,AttributeType=S \
        --key-schema AttributeName=LockID,KeyType=HASH \
        --billing-mode PAY_PER_REQUEST \
        --region "$AWS_REGION" \
        --tags Key=Name,Value=TerraformStateLock Key=ManagedBy,Value=Manual
    echo "⏳ Waiting for table to be active..."
    aws dynamodb wait table-exists --table-name "$DYNAMODB_TABLE" --region "$AWS_REGION"
    echo "✅ DynamoDB table created"
fi

echo ""
echo "✅ Bootstrap complete!"
echo ""
echo "Next steps:"
echo "1. Configure your environment-specific terraform.tfvars files"
echo "2. Run 'terraform init' in terraform/envs/dev (or staging/prod)"
echo "3. Run 'terraform plan' to see what will be created"
echo "4. Run 'terraform apply' to deploy"

