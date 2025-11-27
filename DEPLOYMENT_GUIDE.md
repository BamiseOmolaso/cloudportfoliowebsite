# 🚀 Deployment Guide

## ✅ Current Status

- ✅ Multi-environment Terraform structure (dev/staging/prod)
- ✅ Secrets configured in AWS Secrets Manager
- ✅ ECS task definitions with all required secrets
- ✅ CI/CD pipelines fully operational
- ✅ Redis Cloud integration (production only)
- ✅ Pause/resume infrastructure functionality
- ✅ GitHub Actions OIDC authentication
- ✅ Production deployment live and stable

## 🚀 Quick Start

### Deploy via CI/CD (Recommended)

1. **Push to branch:**
   - `develop` → Auto-deploys to dev
   - `staging` → Requires approval, deploys to staging
   - `main` → Requires approval, deploys to production

2. **Workflows run automatically:**
   - CI Pipeline validates code
   - Terraform Plan shows infrastructure changes
   - Manual approval for staging/production
   - Application builds and deploys

### Manual Deployment

See `terraform/README.md` for detailed Terraform deployment instructions.

## 📋 Detailed Steps

### Step 1: Verify GitHub Setup ⚠️ REQUIRED

**GitHub Environments:**
- Go to: GitHub → Settings → Environments
- Create if missing:
  - `development` (no protection)
  - `staging` (optional reviewers)
  - `production` (required reviewers)

**GitHub Secrets:**
- Go to: GitHub → Settings → Secrets and variables → Actions
- Required:
  - `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY` (OR)
  - `AWS_TERRAFORM_ROLE_ARN` + `AWS_DEPLOY_ROLE_ARN` (OIDC)

### Step 2: Deploy Infrastructure Changes

**Commit and push Terraform changes:**
```bash
git add terraform/modules/ecs/main.tf
git commit -m "feat: Add all required secrets to ECS task definition"
git push origin main
```

**What happens:**
- `terraform.yml` workflow triggers automatically
- Runs `terraform plan`
- Requires manual approval (production environment)
- After approval: Runs `terraform apply`
- Updates ECS task definition

### Step 3: Deploy Application

**After infrastructure is updated:**
```bash
git add .
git commit -m "chore: Update for Redis Cloud and new secrets"
git push origin main
```

**What happens:**
- `deploy-app.yml` workflow triggers automatically
- Builds Docker image
- Pushes to ECR
- Requires manual approval (production environment)
- After approval: Updates ECS service
- Waits for deployment to stabilize

### Step 4: Verify Deployment

```bash
# Get ALB DNS
cd terraform/envs/prod
terraform output alb_dns_name

# Check health
curl http://<alb-dns>/api/health
curl http://<alb-dns>/api/health/redis

# Check ECS service
aws ecs describe-services \
  --cluster prod-portfolio-cluster \
  --services prod-portfolio-service \
  --region us-east-1

# Check logs
aws logs tail /ecs/prod-portfolio --follow
```

## 🔄 CI/CD Workflow Overview

### CI Pipeline (`ci.yml`)
- **Triggers**: All pushes and pull requests
- **Runs**: Tests, linting, type checking, security scans
- **Purpose**: Validate code quality before deployment

### Terraform Workflow (`terraform.yml`)
- **Triggers**: Changes to `terraform/**` or manual dispatch
- **On `develop`**: Plan → Auto-apply to dev
- **On `staging`/`main`**: Plan → Manual approval → Apply
- **Updates**: Infrastructure (VPC, RDS, ECS, ALB)

### App Deployment Workflow (`deploy-app.yml`)
- **Triggers**: Code changes (non-Terraform) or manual dispatch
- **On `develop`**: Build → Push to ECR → Auto-deploy to dev
- **On `staging`/`main`**: Build → Push to ECR → Manual approval → Deploy
- **Updates**: Application container image

## 💰 Cost Management: Pause/Resume

To save costs when not actively using the application:

### Pause Infrastructure

```bash
# Pause production (saves ~$200/month)
./scripts/pause.sh prod us-east-1

# Pause staging
./scripts/pause.sh staging us-east-1

# Pause development
./scripts/pause.sh dev us-east-1
```

**What happens:**
- ALB, Target Group, Listener are destroyed
- ECS tasks scaled to 0
- RDS database stopped
- Auto-scaling disabled

**Cost when paused:** ~$1-2/month (just storage/secrets)

### Resume Infrastructure

```bash
# Resume production
./scripts/resume.sh prod us-east-1

# Resume staging
./scripts/resume.sh staging us-east-1

# Resume development
./scripts/resume.sh dev us-east-1
```

**What happens:**
1. RDS database starts (~5 minutes)
2. ALB and related resources recreated
3. ECS tasks scale back up
4. Full functionality restored

**Cost when running:** ~$200-250/month

**Note:** The resume script waits for RDS to be available before starting ECS tasks to prevent connection failures.

## 📚 Related Documentation

- `CI_CD_GUIDE.md` - Complete CI/CD and DevOps guide
- `SECRETS_MANAGER_SETUP.md` - Secrets setup
- `REDIS_SETUP.md` - Redis Cloud setup
- `OIDC_SETUP.md` - OIDC authentication
- `terraform/README.md` - Terraform documentation
- `DOCUMENTATION_INDEX.md` - All documentation index

---

**Ready to deploy?** Start with Step 1 (verify GitHub setup)!
