# Setting Up GitHub Actions Workflow for Existing Terraform State

## 🎯 Your Situation

You've already created AWS resources using Terraform locally. Now you want to use the GitHub Actions workflow going forward.

**Good news:** If your Terraform state is already in S3, the workflow should work! We just need to verify the state location matches.

---

## ✅ Step 1: Verify Your Current State Location

Check where your Terraform state is currently stored:

```bash
cd terraform/envs/prod
cat backend.tf
```

**Expected backend configuration:**
```hcl
terraform {
  backend "s3" {
    bucket         = "omolaso-terraform-state"
    key            = "envs/prod/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "portfolio-tf-locks"
    encrypt        = true
  }
}
```

---

## 🔍 Step 2: Check If State Exists in S3

Verify your state file exists in the expected location:

```bash
# Check if state file exists
aws s3 ls s3://omolaso-terraform-state/envs/prod/terraform.tfstate

# If it's in a different location, find it
aws s3 ls s3://omolaso-terraform-state/ --recursive | grep terraform.tfstate
```

---

## 📋 Step 3: Verify State Location Matches Workflow

The GitHub Actions workflow expects state at:
- **S3 Bucket:** `omolaso-terraform-state`
- **State Key:** `envs/prod/terraform.tfstate` (for prod)
- **DynamoDB Table:** `portfolio-tf-locks` (for locking)

### If State is in Different Location

If your state is in a different location (e.g., `terraform/terraform.tfstate`), you have two options:

#### Option A: Migrate State (Recommended)

Move your state to the new location:

```bash
cd terraform/envs/prod

# Initialize with new backend
terraform init -migrate-state

# When prompted, type "yes" to migrate
```

This will:
- ✅ Copy state from old location to new location
- ✅ Update backend configuration
- ✅ Keep your resources intact

#### Option B: Update Backend Configuration

If you prefer to keep state in the old location, update `backend.tf`:

```hcl
terraform {
  backend "s3" {
    bucket         = "omolaso-terraform-state"
    key            = "terraform/terraform.tfstate"  # Your old location
    region         = "us-east-1"
    dynamodb_table = "portfolio-tf-locks"
    encrypt        = true
  }
}
```

**Then update the workflow** to use the same backend config (not recommended - better to use standard structure).

---

## ✅ Step 4: Verify State is Accessible

Test that Terraform can read your state:

```bash
cd terraform/envs/prod

# Initialize (if not already done)
terraform init

# List resources in state
terraform state list

# Should show all your resources like:
# module.networking.aws_vpc.main
# module.rds.aws_db_instance.main
# module.ecs.aws_ecs_cluster.main
# etc.
```

---

## 🚀 Step 5: Test the Workflow

### First, Push Your Code

```bash
git add .
git commit -m "Add Terraform workflow configuration"
git push origin main
```

### Trigger the Workflow

1. **Automatic:** Push changes to `terraform/**` files
2. **Manual:** Go to GitHub Actions → Terraform Infrastructure → Run workflow

### What Happens

1. **Plan Phase:**
   - Workflow runs `terraform plan`
   - Shows what would change
   - Uploads plan as artifact

2. **Apply Phase (for prod):**
   - Requires manual approval
   - Downloads plan
   - Runs `terraform apply`
   - Updates infrastructure

---

## 🔐 Step 6: Ensure Workflow Has AWS Access

The workflow needs AWS credentials to access:
- ✅ S3 bucket (read/write state)
- ✅ DynamoDB table (state locking)
- ✅ AWS resources (to manage them)

### Check OIDC Setup

If using OIDC (recommended), verify the role exists:

```bash
aws iam get-role --role-name github-actions-terraform-role
```

### Check Access Keys

If using access keys, ensure they're set in GitHub Secrets:
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_TERRAFORM_ROLE_ARN` (if using OIDC)

---

## 📝 Step 7: Workflow Going Forward

### Making Infrastructure Changes

1. **Edit Terraform files** locally:
   ```bash
   # Edit terraform/envs/prod/main.tf or modules
   nano terraform/envs/prod/main.tf
   ```

2. **Test locally** (optional but recommended):
   ```bash
   cd terraform/envs/prod
   terraform plan
   ```

3. **Commit and push:**
   ```bash
   git add terraform/
   git commit -m "Update RDS instance size"
   git push origin main
   ```

4. **Workflow runs automatically:**
   - Creates plan
   - Shows changes
   - Waits for approval (staging/prod)
   - Applies changes

### Making Application Changes

For application code changes (not infrastructure):
- Push to branch → `deploy-app.yml` runs
- Builds Docker image
- Deploys to ECS
- Uses Terraform outputs to find ECS service

---

## ⚠️ Important: State Locking

The workflow uses DynamoDB for state locking. Ensure the table exists:

```bash
# Check if table exists
aws dynamodb describe-table --table-name portfolio-tf-locks

# If it doesn't exist, create it:
aws dynamodb create-table \
  --table-name portfolio-tf-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1
```

---

## 🔄 Workflow vs Local Terraform

### When to Use Workflow

✅ **Use GitHub Actions workflow for:**
- All production changes
- Changes that need review/approval
- Team collaboration
- Audit trail
- Automated deployments

### When to Use Local Terraform

✅ **Use local Terraform for:**
- Testing changes before pushing
- Development environment
- Quick fixes (then push to workflow)
- Learning/experimentation

**Best practice:** Test locally, then push to workflow for actual changes.

---

## 🧪 Testing the Workflow

### Test with a Safe Change

Make a small, safe change to test the workflow:

```bash
# Edit a tag or description (safe change)
cd terraform/envs/prod
# Edit main.tf to change a tag value

# Commit and push
git add terraform/envs/prod/main.tf
git commit -m "Test workflow: update tag"
git push origin main
```

### Monitor the Workflow

1. Go to **GitHub** → **Actions**
2. Click on **Terraform Infrastructure** workflow
3. Watch it run:
   - ✅ Plan phase completes
   - ✅ Plan shows your change
   - ⏸️ Waits for approval (prod)
   - ✅ Apply phase runs after approval

---

## 🐛 Troubleshooting

### "State file not found"

**Problem:** Workflow can't find state file

**Solution:**
```bash
# Verify state location
aws s3 ls s3://omolaso-terraform-state/envs/prod/

# If missing, migrate state
cd terraform/envs/prod
terraform init -migrate-state
```

### "State locked"

**Problem:** Another Terraform process is using the state

**Solution:**
```bash
# Check for locks
aws dynamodb scan --table-name portfolio-tf-locks

# If stale lock exists, force unlock (be careful!)
cd terraform/envs/prod
terraform force-unlock <LOCK_ID>
```

### "Access denied" to S3

**Problem:** Workflow doesn't have S3 permissions

**Solution:**
- Check IAM role permissions
- Verify OIDC is configured correctly
- Check S3 bucket policy

### Plan shows unexpected changes

**Problem:** Plan wants to recreate resources

**Causes:**
- State out of sync with actual resources
- Configuration mismatch

**Solution:**
```bash
# Refresh state
terraform refresh

# Review plan again
terraform plan
```

---

## ✅ Checklist

Before using the workflow, verify:

- [ ] State file exists in S3 at expected location
- [ ] Backend configuration matches workflow expectations
- [ ] DynamoDB lock table exists
- [ ] AWS credentials configured (OIDC or access keys)
- [ ] Can run `terraform plan` locally successfully
- [ ] State contains all your resources (`terraform state list`)

---

## 📚 Next Steps

Once everything is verified:

1. ✅ Make a test change
2. ✅ Push to trigger workflow
3. ✅ Review the plan in GitHub Actions
4. ✅ Approve and apply (for staging/prod)
5. ✅ Verify changes applied correctly

**You're ready to use the workflow!** 🎉

---

## Summary

Since you already have:
- ✅ Resources created via Terraform
- ✅ State file (probably in S3)

You just need to:
1. ✅ Verify state location matches workflow expectations
2. ✅ Ensure backend configuration is correct
3. ✅ Test the workflow with a small change
4. ✅ Start using workflow for all future changes

The workflow will use your existing state and manage your existing resources - no import needed!

