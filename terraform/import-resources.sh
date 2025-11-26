#!/bin/bash

# Terraform Resource Import Script
# This script helps import existing AWS resources into Terraform state

set -e

ENV=${1:-prod}
AWS_REGION=${AWS_REGION:-us-east-1}

echo "🔍 Terraform Resource Import Script"
echo "===================================="
echo "Environment: $ENV"
echo "AWS Region: $AWS_REGION"
echo ""

# Change to the environment directory
cd "terraform/envs/$ENV" || {
  echo "❌ Error: terraform/envs/$ENV directory not found"
  exit 1
}

# Initialize Terraform
echo "📦 Initializing Terraform..."
terraform init

echo ""
echo "🔍 Discovering existing AWS resources..."
echo ""

# Function to get resource ID by tag
get_resource_by_tag() {
  local resource_type=$1
  local tag_key=$2
  local tag_value=$3
  local query=$4
  
  aws ec2 describe-tags \
    --filters "Name=resource-type,Values=$resource_type" "Name=key,Values=$tag_key" "Name=value,Values=$tag_value" \
    --region "$AWS_REGION" \
    --query "$query" \
    --output text 2>/dev/null | head -1
}

# Function to get resource by name pattern
get_resource_by_name() {
  local service=$1
  local name_pattern=$2
  local query=$3
  
  case $service in
    ec2)
      aws ec2 describe-$resource_type \
        --filters "Name=tag:Name,Values=$name_pattern" \
        --region "$AWS_REGION" \
        --query "$query" \
        --output text 2>/dev/null | head -1
      ;;
    ecs)
      aws ecs list-clusters --region "$AWS_REGION" --query "$query" --output text 2>/dev/null | \
        grep -i "$name_pattern" | head -1 | cut -d'/' -f2
      ;;
    rds)
      aws rds describe-db-instances --region "$AWS_REGION" \
        --query "$query" --output text 2>/dev/null | \
        grep -i "$name_pattern" | head -1
      ;;
    elbv2)
      aws elbv2 describe-load-balancers --region "$AWS_REGION" \
        --query "$query" --output text 2>/dev/null | \
        grep -i "$name_pattern" | head -1
      ;;
    ecr)
      aws ecr describe-repositories --region "$AWS_REGION" \
        --query "$query" --output text 2>/dev/null | \
        grep -i "$name_pattern" | head -1
      ;;
  esac
}

# Discover resources
echo "📋 Discovering resources..."
echo ""

# VPC
VPC_ID=$(aws ec2 describe-vpcs \
  --filters "Name=tag:Name,Values=$ENV-portfolio-vpc" "Name=tag:Environment,Values=$ENV" \
  --query 'Vpcs[0].VpcId' \
  --region "$AWS_REGION" \
  --output text 2>/dev/null || \
  aws ec2 describe-vpcs \
    --filters "Name=tag:Name,Values=*portfolio*" \
    --query 'Vpcs[0].VpcId' \
    --region "$AWS_REGION" \
    --output text 2>/dev/null || echo "")

# Internet Gateway
IGW_ID=$(aws ec2 describe-internet-gateways \
  --filters "Name=attachment.vpc-id,Values=$VPC_ID" \
  --query 'InternetGateways[0].InternetGatewayId' \
  --region "$AWS_REGION" \
  --output text 2>/dev/null || echo "")

# Subnets
SUBNET_IDS=($(aws ec2 describe-subnets \
  --filters "Name=vpc-id,Values=$VPC_ID" "Name=tag:Name,Values=*public*" \
  --query 'Subnets[*].SubnetId' \
  --region "$AWS_REGION" \
  --output text 2>/dev/null || echo ""))

# Route Table
RT_ID=$(aws ec2 describe-route-tables \
  --filters "Name=vpc-id,Values=$VPC_ID" "Name=tag:Name,Values=*public*" \
  --query 'RouteTables[0].RouteTableId' \
  --region "$AWS_REGION" \
  --output text 2>/dev/null || echo "")

# Security Groups
ALB_SG_ID=$(aws ec2 describe-security-groups \
  --filters "Name=vpc-id,Values=$VPC_ID" "Name=group-name,Values=$ENV-alb-sg" \
  --query 'SecurityGroups[0].GroupId' \
  --region "$AWS_REGION" \
  --output text 2>/dev/null || echo "")

ECS_SG_ID=$(aws ec2 describe-security-groups \
  --filters "Name=vpc-id,Values=$VPC_ID" "Name=group-name,Values=$ENV-ecs-sg" \
  --query 'SecurityGroups[0].GroupId' \
  --region "$AWS_REGION" \
  --output text 2>/dev/null || echo "")

RDS_SG_ID=$(aws ec2 describe-security-groups \
  --filters "Name=vpc-id,Values=$VPC_ID" "Name=group-name,Values=$ENV-rds-sg" \
  --query 'SecurityGroups[0].GroupId' \
  --region "$AWS_REGION" \
  --output text 2>/dev/null || echo "")

# RDS
RDS_ID=$(aws rds describe-db-instances \
  --query "DBInstances[?contains(DBInstanceIdentifier, '$ENV') || contains(DBInstanceIdentifier, 'portfolio')].[DBInstanceIdentifier]" \
  --region "$AWS_REGION" \
  --output text 2>/dev/null | head -1 || echo "")

# ECS Cluster
CLUSTER_NAME=$(aws ecs list-clusters \
  --query "clusterArns[?contains(@, '$ENV') || contains(@, 'portfolio')]" \
  --region "$AWS_REGION" \
  --output text 2>/dev/null | cut -d'/' -f2 | head -1 || echo "")

# ALB
ALB_ARN=$(aws elbv2 describe-load-balancers \
  --query "LoadBalancers[?contains(LoadBalancerName, '$ENV') || contains(LoadBalancerName, 'portfolio')].[LoadBalancerArn]" \
  --region "$AWS_REGION" \
  --output text 2>/dev/null | head -1 || echo "")

# Target Group
TG_ARN=$(aws elbv2 describe-target-groups \
  --query "TargetGroups[?contains(TargetGroupName, '$ENV') || contains(TargetGroupName, 'portfolio')].[TargetGroupArn]" \
  --region "$AWS_REGION" \
  --output text 2>/dev/null | head -1 || echo "")

# ECR Repository
ECR_REPO=$(aws ecr describe-repositories \
  --query "repositories[?contains(repositoryName, '$ENV') || contains(repositoryName, 'portfolio')].[repositoryName]" \
  --region "$AWS_REGION" \
  --output text 2>/dev/null | head -1 || echo "")

# Display discovered resources
echo "📋 Discovered Resources:"
echo "========================"
echo "VPC ID: ${VPC_ID:-NOT FOUND}"
echo "Internet Gateway ID: ${IGW_ID:-NOT FOUND}"
echo "Subnets: ${#SUBNET_IDS[@]} found"
for i in "${!SUBNET_IDS[@]}"; do
  echo "  Subnet $((i+1)): ${SUBNET_IDS[$i]}"
done
echo "Route Table ID: ${RT_ID:-NOT FOUND}"
echo "ALB Security Group: ${ALB_SG_ID:-NOT FOUND}"
echo "ECS Security Group: ${ECS_SG_ID:-NOT FOUND}"
echo "RDS Security Group: ${RDS_SG_ID:-NOT FOUND}"
echo "RDS Instance: ${RDS_ID:-NOT FOUND}"
echo "ECS Cluster: ${CLUSTER_NAME:-NOT FOUND}"
echo "ALB ARN: ${ALB_ARN:-NOT FOUND}"
echo "Target Group ARN: ${TG_ARN:-NOT FOUND}"
echo "ECR Repository: ${ECR_REPO:-NOT FOUND}"
echo ""

# Confirm before proceeding
read -p "Continue with import? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "❌ Import cancelled"
  exit 1
fi

echo ""
echo "📥 Starting import process..."
echo ""

# Import function
import_resource() {
  local terraform_path=$1
  local aws_resource_id=$2
  local resource_name=$3
  
  if [ -z "$aws_resource_id" ] || [ "$aws_resource_id" == "NOT FOUND" ]; then
    echo "⏭️  Skipping $resource_name (not found)"
    return 0
  fi
  
  echo "📥 Importing $resource_name..."
  if terraform import "$terraform_path" "$aws_resource_id" 2>/dev/null; then
    echo "✅ Successfully imported $resource_name"
  else
    echo "⚠️  Failed to import $resource_name (may already exist or ID incorrect)"
  fi
}

# Import VPC
import_resource "module.networking.aws_vpc.main" "$VPC_ID" "VPC"

# Import Internet Gateway
import_resource "module.networking.aws_internet_gateway.main" "$IGW_ID" "Internet Gateway"

# Import Subnets
for i in "${!SUBNET_IDS[@]}"; do
  import_resource "module.networking.aws_subnet.public[$i]" "${SUBNET_IDS[$i]}" "Subnet $((i+1))"
done

# Import Route Table
import_resource "module.networking.aws_route_table.public" "$RT_ID" "Route Table"

# Import Route Table Associations
for i in "${!SUBNET_IDS[@]}"; do
  # Route table association ID is subnet_id/route_table_id
  import_resource "module.networking.aws_route_table_association.public[$i]" "${SUBNET_IDS[$i]}/${RT_ID}" "Route Table Association $((i+1))"
done

# Import Security Groups
import_resource "module.security.aws_security_group.alb" "$ALB_SG_ID" "ALB Security Group"
import_resource "module.security.aws_security_group.ecs" "$ECS_SG_ID" "ECS Security Group"
import_resource "module.security.aws_security_group.rds" "$RDS_SG_ID" "RDS Security Group"

# Import RDS DB Subnet Group (name-based)
if [ -n "$RDS_ID" ]; then
  DB_SUBNET_GROUP=$(aws rds describe-db-instances \
    --db-instance-identifier "$RDS_ID" \
    --query 'DBInstances[0].DBSubnetGroup.DBSubnetGroupName' \
    --region "$AWS_REGION" \
    --output text 2>/dev/null || echo "")
  
  if [ -n "$DB_SUBNET_GROUP" ]; then
    import_resource "module.rds.aws_db_subnet_group.main" "$DB_SUBNET_GROUP" "DB Subnet Group"
  fi
fi

# Import RDS Instance
import_resource "module.rds.aws_db_instance.main" "$RDS_ID" "RDS Instance"

# Import ECS Cluster
import_resource "module.ecs.aws_ecs_cluster.main" "$CLUSTER_NAME" "ECS Cluster"

# Import ALB
if [ -n "$ALB_ARN" ]; then
  ALB_ID=$(echo "$ALB_ARN" | cut -d'/' -f2- | cut -d'/' -f2)
  import_resource "aws_lb.main" "$ALB_ARN" "Application Load Balancer"
fi

# Import Target Group
import_resource "aws_lb_target_group.app" "$TG_ARN" "Target Group"

# Import ALB Listener (ARN-based)
if [ -n "$ALB_ARN" ]; then
  LISTENER_ARN=$(aws elbv2 describe-listeners \
    --load-balancer-arn "$ALB_ARN" \
    --query 'Listeners[0].ListenerArn' \
    --region "$AWS_REGION" \
    --output text 2>/dev/null || echo "")
  
  if [ -n "$LISTENER_ARN" ]; then
    import_resource "aws_lb_listener.http" "$LISTENER_ARN" "ALB Listener"
  fi
fi

# Import ECR Repository
import_resource "aws_ecr_repository.app" "$ECR_REPO" "ECR Repository"

# Import CloudWatch Log Group
LOG_GROUP="/ecs/$ENV-portfolio"
import_resource "module.ecs.aws_cloudwatch_log_group.app" "$LOG_GROUP" "CloudWatch Log Group"

echo ""
echo "✅ Import process complete!"
echo ""
echo "📋 Next steps:"
echo "1. Run: terraform plan"
echo "2. Review the plan carefully"
echo "3. If plan shows resources to be destroyed, STOP and review"
echo "4. If plan shows minimal/no changes, you're good!"
echo ""
echo "⚠️  Note: Some resources (IAM roles, ECS service, task definitions) may need manual import"
echo "    Check terraform plan output for any remaining resources"

