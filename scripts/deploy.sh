#!/bin/bash

# Deployment Script for AWS ECS
# This script builds and deploys the application to AWS ECS

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  AWS ECS Deployment Script${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}❌ AWS CLI is not installed${NC}"
    exit 1
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed${NC}"
    exit 1
fi

# Check if Terraform is installed
if ! command -v terraform &> /dev/null; then
    echo -e "${RED}❌ Terraform is not installed${NC}"
    exit 1
fi

# Get AWS region (default to us-east-1)
AWS_REGION=${AWS_REGION:-us-east-1}

# Get Terraform outputs
echo -e "${BLUE}📋 Getting Terraform outputs...${NC}"
cd terraform

if [ ! -f terraform.tfstate ]; then
    echo -e "${RED}❌ Terraform state not found. Run 'terraform apply' first.${NC}"
    exit 1
fi

ECR_URL=$(terraform output -raw ecr_repository_url 2>/dev/null || echo "")
CLUSTER_NAME=$(terraform output -raw ecs_cluster_name 2>/dev/null || echo "")
SERVICE_NAME=$(terraform output -raw ecs_service_name 2>/dev/null || echo "")

if [ -z "$ECR_URL" ] || [ -z "$CLUSTER_NAME" ] || [ -z "$SERVICE_NAME" ]; then
    echo -e "${RED}❌ Could not get Terraform outputs. Make sure infrastructure is deployed.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ ECR URL: $ECR_URL${NC}"
echo -e "${GREEN}✅ Cluster: $CLUSTER_NAME${NC}"
echo -e "${GREEN}✅ Service: $SERVICE_NAME${NC}"
echo ""

cd ..

# Step 1: Run pre-deployment checks
echo -e "${BLUE}🔍 Running pre-deployment checks...${NC}"
if ! npm run predeploy; then
    echo -e "${YELLOW}⚠️  Pre-deployment checks failed, but continuing...${NC}"
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi
echo ""

# Step 2: Login to ECR
echo -e "${BLUE}🔐 Logging in to ECR...${NC}"
aws ecr get-login-password --region $AWS_REGION | \
    docker login --username AWS --password-stdin $ECR_URL
echo -e "${GREEN}✅ Logged in to ECR${NC}"
echo ""

# Step 3: Build Docker image
echo -e "${BLUE}🏗️  Building Docker image...${NC}"
docker build -t $ECR_URL:latest .
echo -e "${GREEN}✅ Docker image built${NC}"
echo ""

# Step 4: Push to ECR
echo -e "${BLUE}📤 Pushing image to ECR...${NC}"
docker push $ECR_URL:latest
echo -e "${GREEN}✅ Image pushed to ECR${NC}"
echo ""

# Step 5: Force ECS service update
echo -e "${BLUE}🔄 Updating ECS service...${NC}"
aws ecs update-service \
    --cluster $CLUSTER_NAME \
    --service $SERVICE_NAME \
    --force-new-deployment \
    --region $AWS_REGION > /dev/null

echo -e "${GREEN}✅ ECS service update initiated${NC}"
echo ""

# Step 6: Wait for deployment
echo -e "${BLUE}⏳ Waiting for deployment to stabilize...${NC}"
echo "This may take a few minutes..."
aws ecs wait services-stable \
    --cluster $CLUSTER_NAME \
    --services $SERVICE_NAME \
    --region $AWS_REGION

echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""

# Step 7: Get application URL
ALB_DNS=$(cd terraform && terraform output -raw alb_dns_name 2>/dev/null || echo "")
if [ -n "$ALB_DNS" ]; then
    echo -e "${GREEN}🌐 Application URL: http://$ALB_DNS${NC}"
    echo ""
    echo -e "${BLUE}📊 View logs:${NC}"
    echo "   aws logs tail /ecs/prod-portfolio --follow --region $AWS_REGION"
    echo ""
    echo -e "${BLUE}🔍 Check service status:${NC}"
    echo "   aws ecs describe-services --cluster $CLUSTER_NAME --services $SERVICE_NAME --region $AWS_REGION"
fi

echo ""
echo -e "${GREEN}✅ Deployment script completed successfully!${NC}"

