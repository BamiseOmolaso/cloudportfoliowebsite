# GitHub Actions Workflows

This directory contains CI/CD workflows for the portfolio website.

## 📁 Workflow Files

| File | Purpose | Triggers |
|------|---------|----------|
| `ci.yml` | Continuous Integration | Every push/PR |
| `terraform.yml` | Infrastructure deployment | Terraform changes, manual |
| `deploy-app.yml` | Application deployment | Code changes (non-Terraform) |

## 🔄 Workflow Flow

```
┌─────────────────────────────────────────┐
│  Developer pushes code                   │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  CI Pipeline (ci.yml)                    │
│  ✅ Lint, Test, Build, Security Scan      │
└──────────────┬──────────────────────────┘
               │
        ┌──────┴──────┐
        │             │
        ▼             ▼
┌─────────────┐  ┌─────────────┐
│ Terraform   │  │ App Code    │
│ Changes?    │  │ Changes?    │
└──────┬──────┘  └──────┬──────┘
       │                │
       ▼                ▼
┌─────────────┐  ┌─────────────┐
│terraform.yml│  │deploy-app.yml│
│ Deploy Infra│  │ Deploy App  │
└─────────────┘  └─────────────┘
```

## 🔐 Authentication

### Option 1: OIDC (Recommended)

Uses temporary credentials via OIDC. See `OIDC_SETUP.md` for setup.

**Secrets needed:**
- `AWS_TERRAFORM_ROLE_ARN`
- `AWS_DEPLOY_ROLE_ARN`

### Option 2: Access Keys (Simpler)

Uses long-lived access keys (less secure but simpler).

**Secrets needed:**
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`

## 🌍 Environments

| Branch | Environment | Auto Deploy | Approval Required |
|--------|------------|-------------|-------------------|
| `develop` | dev | ✅ Yes | ❌ No |
| `staging` | staging | ✅ Yes | ⚠️ Manual (GitHub Environment) |
| `main` | prod | ✅ Yes | ⚠️ Manual (GitHub Environment) |

## 📝 Setup Instructions

1. **Set up AWS Authentication:**
   - Follow `OIDC_SETUP.md` for OIDC (recommended)
   - OR add access keys to GitHub Secrets

2. **Create GitHub Environments:**
   - Go to Settings → Environments
   - Create: `development`, `staging`, `production`
   - Add required reviewers for staging/prod (optional)

3. **Test the Pipeline:**
   - Push to `develop` to test dev deployment
   - Create PR to test CI pipeline
   - Merge to `main` to test prod (with approval)

## 🔧 Customization

### Change AWS Region

Update `AWS_REGION` in workflow files:
```yaml
env:
  AWS_REGION: us-east-1  # Change this
```

### Change S3 Bucket

Update backend configuration in `terraform/envs/*/backend.tf`:
```hcl
bucket = "your-bucket-name"
```

### Add New Environment

1. Create `terraform/envs/new-env/` directory
2. Copy from existing env (dev/staging/prod)
3. Update backend.tf and variables
4. Add to workflow triggers

## 🐛 Troubleshooting

### Workflow doesn't trigger

- Check branch names match
- Verify file paths in `paths` filters
- Check workflow file syntax

### "Access Denied" errors

- Verify IAM role/access key has correct permissions
- Check OIDC trust policy (if using OIDC)
- Verify GitHub Secrets are set correctly

### Terraform state locked

- Check if another workflow is running
- Manually unlock: `terraform force-unlock <LOCK_ID>`
- Check DynamoDB table for locks

### ECS deployment fails

- Check ECR repository exists
- Verify image was pushed successfully
- Check ECS service logs in CloudWatch
- Verify security groups allow traffic

## 📚 Related Documentation

- `../DEVOPS_BEST_PRACTICES.md` - DevOps concepts
- `../CI_CD_QUICK_START.md` - Quick reference
- `../terraform/MIGRATION_GUIDE.md` - Terraform migration
- `../OIDC_SETUP.md` - OIDC authentication setup

