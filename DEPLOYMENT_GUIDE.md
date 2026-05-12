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

### Step 3b (Optional): Enable HTTPS on the ALB

By default the ALB serves HTTP on port 80. To switch to HTTPS:

1. Request an ACM certificate with `aws acm request-certificate --domain-name <yourdomain> --validation-method DNS --region us-east-1`.
2. Add the DNS validation CNAME record at your DNS provider (or Route 53).
3. Once the cert reaches `Status: ISSUED`, set `acm_certificate_arn = "arn:aws:acm:..."` in `terraform/envs/<env>/terraform.tfvars` and re-apply.
4. The HTTP:80 listener automatically becomes a 301 redirect to HTTPS:443.

Full instructions in [`terraform/README.md`](terraform/README.md#enabling-https). Leaving `acm_certificate_arn` empty keeps the legacy HTTP-only behaviour.

### Step 3c (Optional): Allow your laptop to reach RDS directly

RDS sits in a public subnet with `publicly_accessible = true` to avoid NAT/bastion/VPN charges, but the security group ingress on 5432 is closed by default. To open it to your IP:

```hcl
# terraform/envs/<env>/terraform.tfvars
admin_cidr_blocks = ["203.0.113.42/32"]  # replace with your home IP
```

Re-run `terraform apply`. Same recurring cost as the previous "open to the world" rule (i.e. $0), but only your IP can reach the database.

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

Environment is **required** — the scripts no longer default to `prod` to prevent accidental destruction of production resources.

```bash
# Pause production (saves ~$200/month) — will prompt for "pause-prod" confirmation
./scripts/pause.sh prod us-east-1

# Pause staging
./scripts/pause.sh staging us-east-1

# Pause development
./scripts/pause.sh dev us-east-1

# Non-interactive prod pause (e.g. from a scheduled CI job)
./scripts/pause.sh prod us-east-1 --yes
```

**What happens:**
- ALB, Target Group, Listener are destroyed
- ECS tasks scaled to 0
- RDS database stopped
- Auto-scaling disabled

**Safety guard:** Pausing `prod` requires typing `pause-prod` at an interactive prompt (or passing `--yes`). Other environments pause without a prompt.

**Cost when paused:** ~$1-2/month (just storage/secrets)

### Resume Infrastructure

Environment is **required** here too — no implicit default.

> ⚠️ **Before resuming after a long pause:** verify the Redis Cloud free-tier instance still exists. Redis Cloud reclaims inactive DBs and the dead hostname will make `/api/auth/login` and other rate-limited endpoints hang until the ALB returns 504 (with HTML, which then breaks any client-side `response.json()`). Run the pre-resume DNS check in [`REDIS_SETUP.md`](REDIS_SETUP.md#️-pause--resume-gotcha-free-tier-instances-get-reclaimed) and re-provision if needed before bringing infrastructure back up.

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
