# 🚀 Deployment Guide

## ✅ Current Status

- ✅ Secrets added to AWS Secrets Manager (production)
- ✅ ECS task definition updated with all required secrets
- ✅ Terraform infrastructure configured
- ✅ CI/CD pipelines ready
- ✅ Redis Cloud migration complete (production only)

## 📋 Next Steps (In Order)

### Current Todo List

1. **Verify GitHub Setup** ⚠️ REQUIRED
   - [ ] Check GitHub Environments exist (development, staging, production)
   - [ ] Check GitHub Secrets configured (AWS credentials)

2. **Deploy Infrastructure Changes**
   - [ ] Commit Terraform changes (`terraform/modules/ecs/main.tf`)
   - [ ] Push to `main` branch
   - [ ] Approve `terraform.yml` workflow in GitHub Actions
   - [ ] Verify ECS task definition updated

3. **Deploy Application**
   - [ ] Commit application changes
   - [ ] Push to `main` branch
   - [ ] Approve `deploy-app.yml` workflow in GitHub Actions
   - [ ] Verify deployment health

4. **Verify Deployment**
   - [ ] Check ECS service status
   - [ ] Check health endpoints (`/api/health`, `/api/health/redis`)
   - [ ] Check CloudWatch logs
   - [ ] Verify application is accessible

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

### Terraform Workflow (`terraform.yml`)
- **Triggers**: Changes to `terraform/**` or manual
- **On `main`**: Plan → Manual approval → Apply
- **Updates**: Infrastructure (VPC, RDS, ECS task definition)

### App Deployment Workflow (`deploy-app.yml`)
- **Triggers**: Code changes (non-Terraform) or manual
- **On `main`**: Build → Push to ECR → Manual approval → Deploy to ECS
- **Updates**: Application container

## 📚 Related Documentation

- `CI_CD_GUIDE.md` - Complete CI/CD and DevOps guide
- `SECRETS_MANAGER_SETUP.md` - Secrets setup
- `REDIS_SETUP.md` - Redis Cloud setup
- `OIDC_SETUP.md` - OIDC authentication
- `terraform/README.md` - Terraform documentation
- `DOCUMENTATION_INDEX.md` - All documentation index

---

**Ready to deploy?** Start with Step 1 (verify GitHub setup)!
