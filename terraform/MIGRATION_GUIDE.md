# Terraform Migration Guide

## 🎯 Overview

This guide helps you migrate from the **old structure** (single `terraform/` directory) to the **new structure** (`terraform/envs/{dev,staging,prod}`).

**GOOD NEWS:** You don't need to destroy anything! We'll migrate your existing state.

## 📋 Current State

Your current setup:
- State file: `s3://omolaso-terraform-state/portfolio/terraform.tfstate`
- Environment: `prod` (based on your terraform.tfvars)
- Resources already deployed

## 🚀 Migration Steps

### Step 1: Backup Current State (IMPORTANT!)

```bash
cd terraform

# Download current state as backup
aws s3 cp s3://omolaso-terraform-state/portfolio/terraform.tfstate \
  terraform.tfstate.backup

# Also backup locally if you have it
cp terraform.tfstate terraform.tfstate.backup 2>/dev/null || true
```

### Step 2: Create DynamoDB Table (One-Time)

```bash
aws dynamodb create-table \
  --table-name portfolio-tf-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1
```

### Step 3: Run Migration Script

```bash
cd terraform
./migrate-state.sh
```

This will:
- ✅ Backup your current state
- ✅ Copy to new location: `s3://omolaso-terraform-state/envs/prod/terraform.tfstate`
- ✅ Create DynamoDB table if needed

### Step 4: Initialize New Structure

```bash
cd terraform/envs/prod
terraform init
```

When prompted about migrating state, type **yes**.

### Step 5: Verify Migration

```bash
# Should show all your existing resources
terraform state list

# Should show no changes (or minimal)
terraform plan
```

### Step 6: Create terraform.tfvars

```bash
# Copy the example file
cp terraform.tfvars.example terraform.tfvars

# Get your current values from the old terraform.tfvars
cd ../../  # Back to old terraform/
cat terraform.tfvars

# Edit the new terraform.tfvars with your values
cd envs/prod
nano terraform.tfvars  # or use your preferred editor
```

## ✅ What Gets Migrated

- ✅ All your AWS resources (RDS, ECS, ALB, etc.)
- ✅ Terraform state (metadata about resources)
- ✅ Resource relationships

## ❌ What Doesn't Change

- ❌ Your actual AWS resources (they keep running)
- ❌ Your application (still accessible)
- ❌ Your database (data is safe)

## 🚨 Important Notes

1. **Backup first**: The migration script creates backups automatically
2. **Test with plan**: Always run `terraform plan` before `terraform apply`
3. **One at a time**: Migrate prod first, then create dev/staging fresh

## 🐛 If Something Goes Wrong

Your AWS resources are safe! State is just metadata. If migration fails:

1. Your infrastructure keeps running
2. Restore from backup
3. Try again

### Resources show as "will be destroyed"
- **STOP** - Don't apply!
- Check that state migration completed
- Verify you're in the correct directory (`terraform/envs/prod`)
- Restore from backup if needed

### "State locked" error
- Check if another Terraform process is running
- Check DynamoDB table for locks
- Force unlock if needed: `terraform force-unlock <LOCK_ID>`

### Can't find resources
- Verify state file exists: `aws s3 ls s3://omolaso-terraform-state/envs/prod/`
- Check you're using correct backend: `cat backend.tf`
- Re-initialize: `terraform init`

## 📚 Helpful Commands

```bash
# View state
terraform state list
terraform state show <resource_name>

# View outputs
terraform output

# Refresh state (if resources changed outside Terraform)
terraform refresh

# View plan details
terraform plan -detailed-exitcode
```

---

**Bottom line:** You can migrate safely without destroying anything. The migration just moves where Terraform stores its state file.
