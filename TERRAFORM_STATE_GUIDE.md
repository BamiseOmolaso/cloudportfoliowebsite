# Terraform State Management Guide

## 🚨 Critical Question: CLI vs Terraform Workflow

**You've provisioned resources via AWS CLI. Here's what you need to know:**

---

## The Problem

If you created AWS resources using the AWS CLI (or AWS Console), **Terraform doesn't know about them**. Terraform maintains a "state file" that tracks which resources it manages.

**Current situation:**
- ✅ Your AWS resources exist (created via CLI)
- ❌ Terraform state file doesn't know about them
- ❌ Terraform workflow will try to CREATE them again (causing conflicts)

---

## Solution Options

### Option 1: Import Existing Resources (Recommended)

**Import your existing resources into Terraform state** so Terraform can manage them going forward.

#### Step 1: Identify Your Resources

List what you have in AWS:

```bash
# List ECS clusters
aws ecs list-clusters --region us-east-1

# List RDS instances
aws rds describe-db-instances --region us-east-1

# List VPCs
aws ec2 describe-vpcs --region us-east-1

# List Load Balancers
aws elbv2 describe-load-balancers --region us-east-1
```

#### Step 2: Import Resources into Terraform

For each resource, you need to import it. Here's how:

```bash
cd terraform/envs/prod

# Initialize Terraform first
terraform init

# Import VPC (example)
terraform import module.networking.aws_vpc.main vpc-xxxxxxxxx

# Import RDS instance (example)
terraform import module.rds.aws_db_instance.main your-db-instance-name

# Import ECS cluster (example)
terraform import module.ecs.aws_ecs_cluster.main your-cluster-name

# Import ALB (example)
terraform import module.ecs.aws_lb.main arn:aws:elasticloadbalancing:us-east-1:ACCOUNT:loadbalancer/app/name/id
```

**⚠️ This is tedious!** You need to import each resource individually.

#### Step 3: Verify Import

```bash
# List all resources in state
terraform state list

# Check if plan shows no changes
terraform plan
```

If `terraform plan` shows "No changes", you're good! Terraform now knows about your resources.

---

### Option 2: Use Terraform Import Script (Easier)

Create a script to automatically import resources:

```bash
#!/bin/bash
# terraform/import-existing.sh

cd terraform/envs/prod
terraform init

# Get your actual resource IDs from AWS
VPC_ID=$(aws ec2 describe-vpcs --filters "Name=tag:Name,Values=portfolio-prod" --query 'Vpcs[0].VpcId' --output text)
RDS_ID=$(aws rds describe-db-instances --query 'DBInstances[0].DBInstanceIdentifier' --output text)
CLUSTER_NAME=$(aws ecs list-clusters --query 'clusterArns[0]' --output text | cut -d'/' -f2)

echo "Importing VPC: $VPC_ID"
terraform import module.networking.aws_vpc.main $VPC_ID

echo "Importing RDS: $RDS_ID"
terraform import module.rds.aws_db_instance.main $RDS_ID

echo "Importing ECS Cluster: $CLUSTER_NAME"
terraform import module.ecs.aws_ecs_cluster.main $CLUSTER_NAME

# Add more imports as needed...
```

---

### Option 3: Start Fresh with Terraform (Nuclear Option)

**⚠️ WARNING: This will destroy and recreate resources!**

If you don't mind recreating everything:

1. Delete existing resources via CLI/Console
2. Let Terraform create them fresh
3. This ensures clean state from the start

**Only do this if:**
- You don't have production data
- You can afford downtime
- You want a clean slate

---

## Which Should You Use?

### Use Terraform Workflow For:
- ✅ **All future changes** (once resources are imported)
- ✅ Infrastructure updates (RDS size, ECS task count, etc.)
- ✅ Security group changes
- ✅ Adding new resources
- ✅ Environment-specific changes

### Use CLI For:
- ❌ **Nothing** (once Terraform is managing resources)
- ⚠️ **Emergency fixes only** (then import the change)

**Why?** If you change resources via CLI while Terraform manages them:
- Terraform will detect "drift" (differences)
- Next `terraform apply` will try to revert your CLI changes
- This causes conflicts and potential downtime

---

## Getting Outputs from Workflow

### Method 1: View in GitHub Actions UI

1. Go to **Actions** → **Terraform Infrastructure**
2. Click on a workflow run
3. Expand the job (e.g., `terraform-apply-prod`)
4. Look for "Get Terraform Outputs" step
5. Outputs are printed in the logs

### Method 2: Use Terraform Output Command

Add this to your workflow or run locally:

```bash
cd terraform/envs/prod
terraform output
```

This shows all outputs like:
- `alb_dns_name`
- `ecr_repository_url`
- `rds_endpoint`
- `ecs_cluster_name`

### Method 3: Query from AWS Directly

```bash
# Get ALB DNS
aws elbv2 describe-load-balancers --query 'LoadBalancers[0].DNSName' --output text

# Get RDS endpoint
aws rds describe-db-instances --query 'DBInstances[0].Endpoint.Address' --output text

# Get ECS cluster
aws ecs list-clusters --query 'clusterArns[0]' --output text
```

---

## Workflow Dependencies: CI → Deploy

**Great question!** You're right - we should make `deploy-app.yml` depend on `ci.yml` to avoid duplication.

### Current Problem:
- Both workflows run independently
- Both might fail for the same reason
- Wastes CI minutes
- Confusing error messages

### Solution: Add Workflow Dependency

We can use GitHub Actions' `workflow_run` trigger to make `deploy-app.yml` wait for `ci.yml`:

```yaml
# In deploy-app.yml
on:
  workflow_run:
    workflows: ["CI Pipeline"]  # Wait for ci.yml
    types:
      - completed
    branches:
      - develop
      - staging
      - main
  # Keep existing triggers too
  push:
    branches:
      - develop
      - staging
      - main
    paths-ignore:
      - 'terraform/**'
```

**However**, there's a trade-off:
- ✅ No duplication
- ✅ Only deploys if CI passes
- ❌ Slightly slower (waits for CI first)
- ❌ Can't deploy immediately if CI is still running

### Alternative: Check CI Status in Deploy Workflow

Instead of `workflow_run`, we can check if CI passed:

```yaml
# In deploy-app.yml jobs
deploy-ecs-prod:
  # ... existing config ...
  if: |
    github.ref_name == 'main' &&
    needs.build-and-push.result == 'success'
    # Add: Check if ci.yml passed (via API or status check)
```

**Best approach:** Keep them separate but add a status check. This gives you:
- Fast feedback (both run in parallel)
- Deploy only if CI passes (safety check)
- Flexibility to deploy even if CI is slow

---

## Recommended Workflow

### For Existing Resources (Your Situation):

1. **Import existing resources** into Terraform state (Option 1 or 2 above)
2. **Verify** with `terraform plan` (should show no changes)
3. **Commit** the state file to S3 (via `terraform init`)
4. **Use Terraform workflow** for all future changes
5. **Stop using CLI** for infrastructure changes

### Going Forward:

1. **Make changes** in Terraform files (`terraform/envs/prod/main.tf`, etc.)
2. **Push to branch** → `terraform.yml` runs
3. **Review plan** in GitHub Actions
4. **Approve** (for staging/prod)
5. **Terraform applies** changes
6. **Resources update** automatically

---

## Quick Start: Import Your Resources

Here's a quick script to help you import:

```bash
#!/bin/bash
# terraform/import-existing.sh

set -e

ENV=${1:-prod}
cd "terraform/envs/$ENV"

echo "🔍 Discovering existing AWS resources..."

# Initialize Terraform
terraform init

# Get resource IDs (adjust these queries to match your actual resources)
VPC_ID=$(aws ec2 describe-vpcs \
  --filters "Name=tag:Environment,Values=$ENV" "Name=tag:ManagedBy,Values=Terraform" \
  --query 'Vpcs[0].VpcId' --output text 2>/dev/null || echo "")

RDS_ID=$(aws rds describe-db-instances \
  --query "DBInstances[?contains(DBInstanceIdentifier, 'portfolio') || contains(DBInstanceIdentifier, '$ENV')].[DBInstanceIdentifier]" \
  --output text | head -1)

CLUSTER_NAME=$(aws ecs list-clusters \
  --query "clusterArns[?contains(@, '$ENV') || contains(@, 'portfolio')]" \
  --output text | cut -d'/' -f2 | head -1)

echo ""
echo "Found resources:"
echo "  VPC: $VPC_ID"
echo "  RDS: $RDS_ID"
echo "  ECS Cluster: $CLUSTER_NAME"
echo ""

read -p "Import these resources? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  exit 1
fi

# Import resources (adjust module paths to match your structure)
if [ -n "$VPC_ID" ]; then
  echo "📥 Importing VPC..."
  terraform import module.networking.aws_vpc.main "$VPC_ID" || echo "⚠️  VPC import failed (may already exist)"
fi

if [ -n "$RDS_ID" ]; then
  echo "📥 Importing RDS..."
  terraform import module.rds.aws_db_instance.main "$RDS_ID" || echo "⚠️  RDS import failed (may already exist)"
fi

if [ -n "$CLUSTER_NAME" ]; then
  echo "📥 Importing ECS Cluster..."
  terraform import module.ecs.aws_ecs_cluster.main "$CLUSTER_NAME" || echo "⚠️  ECS import failed (may already exist)"
fi

echo ""
echo "✅ Import complete!"
echo ""
echo "Next steps:"
echo "1. Run: terraform plan"
echo "2. Review the plan (should show minimal/no changes)"
echo "3. If plan looks good, you're done!"
echo "4. If plan shows resources to be destroyed, STOP and review"
```

---

## Summary

1. **Import your existing resources** into Terraform state
2. **Use Terraform workflow** for all future infrastructure changes
3. **Stop using CLI** for infrastructure (use it only for emergency fixes, then import)
4. **Get outputs** from workflow logs or `terraform output` command
5. **Consider** making `deploy-app.yml` depend on `ci.yml` (but keep flexibility)

**Bottom line:** Once resources are in Terraform state, use the Terraform workflow for everything. CLI changes will cause drift and conflicts.

