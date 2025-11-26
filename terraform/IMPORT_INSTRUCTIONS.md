# Import Existing AWS Resources into Terraform

## 🎯 Quick Start

If you've already created AWS resources via CLI/Console, you need to import them into Terraform state.

### Step 1: Prerequisites

```bash
# Ensure AWS CLI is configured
aws sts get-caller-identity

# Set your region (if not already set)
export AWS_REGION=us-east-1
```

### Step 2: Run the Import Script

```bash
cd terraform
./import-resources.sh prod
```

The script will:
1. ✅ Discover your existing AWS resources
2. ✅ Show you what it found
3. ✅ Ask for confirmation
4. ✅ Import resources into Terraform state

### Step 3: Verify Import

```bash
cd terraform/envs/prod
terraform plan
```

**Expected result:** Should show minimal or no changes. If it shows resources to be **destroyed**, **STOP** and review.

---

## 📋 What Gets Imported

The script imports these resources:

### Networking
- ✅ VPC
- ✅ Internet Gateway
- ✅ Public Subnets
- ✅ Route Table
- ✅ Route Table Associations

### Security
- ✅ ALB Security Group
- ✅ ECS Security Group
- ✅ RDS Security Group

### Compute
- ✅ ECS Cluster
- ✅ CloudWatch Log Group

### Database
- ✅ RDS Instance
- ✅ DB Subnet Group

### Load Balancing
- ✅ Application Load Balancer
- ✅ Target Group
- ✅ ALB Listener

### Container Registry
- ✅ ECR Repository

---

## 🔧 Manual Import (If Script Fails)

If the script can't find a resource automatically, you can import it manually:

### Find Resource IDs

```bash
# VPC
aws ec2 describe-vpcs --filters "Name=tag:Name,Values=*portfolio*" --query 'Vpcs[*].[VpcId,Tags[?Key==`Name`].Value|[0]]' --output table

# RDS
aws rds describe-db-instances --query 'DBInstances[*].[DBInstanceIdentifier,Endpoint.Address]' --output table

# ECS Cluster
aws ecs list-clusters --output table

# ALB
aws elbv2 describe-load-balancers --query 'LoadBalancers[*].[LoadBalancerName,LoadBalancerArn]' --output table
```

### Import Command Format

```bash
cd terraform/envs/prod
terraform import <terraform_resource_path> <aws_resource_id>
```

### Examples

```bash
# Import VPC
terraform import module.networking.aws_vpc.main vpc-xxxxxxxxx

# Import RDS
terraform import module.rds.aws_db_instance.main your-db-instance-name

# Import ECS Cluster
terraform import module.ecs.aws_ecs_cluster.main your-cluster-name

# Import ALB (use ARN)
terraform import aws_lb.main arn:aws:elasticloadbalancing:us-east-1:ACCOUNT:loadbalancer/app/name/id

# Import Target Group (use ARN)
terraform import aws_lb_target_group.app arn:aws:elasticloadbalancing:us-east-1:ACCOUNT:targetgroup/name/id

# Import Subnet
terraform import 'module.networking.aws_subnet.public[0]' subnet-xxxxxxxxx

# Import Security Group
terraform import module.security.aws_security_group.alb sg-xxxxxxxxx
```

---

## ⚠️ Resources That May Need Manual Import

These resources are harder to auto-discover and may need manual import:

### IAM Roles
```bash
# Find IAM roles
aws iam list-roles --query 'Roles[?contains(RoleName, `ecs`) || contains(RoleName, `portfolio`)].RoleName' --output table

# Import ECS Task Execution Role
terraform import module.ecs.aws_iam_role.ecs_task_execution_role <role-name>

# Import ECS Task Role
terraform import module.ecs.aws_iam_role.ecs_task_role <role-name>
```

### ECS Service
```bash
# Find ECS service
aws ecs list-services --cluster <cluster-name> --output table

# Import ECS Service (format: cluster_name/service_name)
terraform import module.ecs.aws_ecs_service.main <cluster-name>/<service-name>
```

### ECS Task Definition
```bash
# Find task definition
aws ecs list-task-definitions --family-prefix <env>-portfolio-task --output table

# Import Task Definition (use family name)
terraform import module.ecs.aws_ecs_task_definition.app <family-name>
```

### ECR Lifecycle Policy
```bash
# Import ECR Lifecycle Policy (use repository name)
terraform import aws_ecr_lifecycle_policy.app <repository-name>
```

---

## 🔍 Troubleshooting

### "Resource not found" during import

**Problem:** Script can't find your resources

**Solutions:**
1. Check resource tags match expected patterns
2. Verify you're in the correct AWS region
3. Ensure AWS credentials have read permissions
4. Try manual import with exact resource IDs

### "Resource already managed" error

**Problem:** Resource already in Terraform state

**Solution:** This is fine! The resource is already imported. Continue with other resources.

### Plan shows resources to be destroyed

**Problem:** After import, `terraform plan` wants to destroy resources

**Causes:**
- Resource configuration doesn't match actual resource
- Missing required attributes in Terraform config
- Resource was modified outside Terraform

**Solution:**
1. **STOP** - Don't apply!
2. Compare Terraform config with actual resource
3. Update Terraform config to match reality
4. Run `terraform refresh` to sync state
5. Review plan again

### Can't find resource by tag

**Problem:** Script uses tags to find resources, but yours have different tags

**Solution:**
1. Check your resource tags:
   ```bash
   aws ec2 describe-tags --filters "Name=resource-id,Values=<resource-id>"
   ```
2. Update the script's tag filters
3. Or use manual import with exact resource IDs

---

## ✅ Verification Checklist

After import, verify everything:

```bash
cd terraform/envs/prod

# 1. List all resources in state
terraform state list

# 2. Check plan (should show minimal changes)
terraform plan

# 3. Verify outputs work
terraform output

# 4. Check specific resource
terraform state show module.networking.aws_vpc.main
```

**Expected results:**
- ✅ `terraform state list` shows all your resources
- ✅ `terraform plan` shows no changes (or minimal, safe changes)
- ✅ `terraform output` shows correct values

---

## 🚨 Important Notes

1. **Backup first:** The script doesn't modify AWS resources, but always good to have backups
2. **One at a time:** Import resources one environment at a time (prod first)
3. **Test with plan:** Always run `terraform plan` after import to verify
4. **Don't apply yet:** Wait until plan shows no unwanted changes

---

## 📚 Next Steps

After successful import:

1. ✅ Commit Terraform state to S3 (already done via backend)
2. ✅ Use Terraform workflow for all future changes
3. ✅ Stop using CLI for infrastructure changes
4. ✅ Review `TERRAFORM_STATE_GUIDE.md` for best practices

---

## Need Help?

If you encounter issues:

1. Check the troubleshooting section above
2. Review Terraform documentation: https://www.terraform.io/docs/cli/commands/import.html
3. Check AWS resource tags and IDs manually
4. Review the import script output for clues

