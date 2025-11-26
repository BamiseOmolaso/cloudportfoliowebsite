# GitHub Actions Workflows

This repository uses three GitHub Actions workflows to automate CI/CD, infrastructure management, and application deployment.

## 📋 Table of Contents

- [Overview](#overview)
- [Workflow Files](#workflow-files)
- [How They Work Together](#how-they-work-together)
- [Workflow Details](#workflow-details)
- [Deployment Environments](#deployment-environments)
- [Manual Triggers](#manual-triggers)
- [Troubleshooting](#troubleshooting)

---

## Overview

Our CI/CD pipeline is split into three separate workflows for better separation of concerns:

1. **`ci.yml`** - Continuous Integration (code validation)
2. **`terraform.yml`** - Infrastructure deployment (AWS resources)
3. **`deploy-app.yml`** - Application deployment (Docker containers)

This separation allows:
- Independent deployment of infrastructure and application
- Different approval processes for different types of changes
- Clear visibility into what's being deployed and when

---

## Workflow Files

### 1. `ci.yml` - Continuous Integration

**Purpose:** Validates code quality, security, and buildability on every push/PR.

**When it runs:**
- ✅ Push to `main`, `develop`, or `feature/**` branches
- ✅ Pull requests to `main` or `develop`

**What it does:**
- Runs ESLint and TypeScript type checking
- Scans for security vulnerabilities (npm audit, Trivy, TruffleHog, Snyk)
- Runs Jest tests with coverage reporting
- Builds the Next.js application
- Builds Docker image (validation only, doesn't push)
- Validates Terraform syntax

**Key point:** This workflow **does NOT deploy anything**. It only validates code quality.

**Jobs:**
- `lint-and-typecheck` - Code quality checks
- `security-scan` - Security vulnerability scanning
- `test` - Unit and integration tests
- `build` - Next.js production build
- `docker-build` - Docker image build validation
- `terraform-validate` - Terraform syntax validation
- `ci-summary` - Summary report of all checks

---

### 2. `terraform.yml` - Infrastructure Deployment

**Purpose:** Manages AWS infrastructure (VPC, RDS, ECS, ALB, Security Groups, etc.) using Terraform.

**When it runs:**
- ✅ Push to `develop`, `staging`, or `main` with changes in `terraform/**`
- ✅ Manual trigger via `workflow_dispatch`

**What it does:**
1. **Plan Phase** (`terraform-plan`):
   - Runs `terraform plan` for the selected environment
   - Creates a plan file showing what infrastructure will change
   - Uploads the plan as an artifact for review

2. **Apply Phase** (environment-specific):
   - **Dev** (`terraform-apply-dev`): Auto-approves and applies changes
   - **Staging** (`terraform-apply-staging`): Requires manual approval
   - **Prod** (`terraform-apply-prod`): Requires manual approval

**Key point:** This workflow manages **infrastructure**, not application code.

**Approval Process:**
- **Dev:** Automatic (no approval needed)
- **Staging:** Manual approval required in GitHub UI
- **Prod:** Manual approval required in GitHub UI

**Infrastructure Managed:**
- VPC, Subnets, Internet Gateway
- RDS PostgreSQL database
- ECS Fargate cluster and services
- Application Load Balancer (ALB)
- Security Groups
- Secrets Manager
- CloudWatch Logs
- IAM roles and policies

---

### 3. `deploy-app.yml` - Application Deployment

**Purpose:** Builds and deploys the Docker container image to ECS.

**When it runs:**
- ✅ Push to `develop`, `staging`, or `main` (ignores Terraform changes)
- ✅ Manual trigger via `workflow_dispatch`

**What it does:**
1. **Build Phase** (`build-and-push`):
   - Determines target environment based on branch
   - Authenticates with AWS (OIDC or access keys)
   - Logs into Amazon ECR
   - Builds Docker image from `Dockerfile`
   - Pushes image to ECR with multiple tags:
     - `{commit-sha}-{env}` (e.g., `52c6906-prod`)
     - `{env}-latest` (e.g., `prod-latest`)
     - `{env}-{commit-sha}` (e.g., `prod-52c6906`)
   - Scans image for vulnerabilities with Trivy

2. **Deploy Phase** (environment-specific):
   - **Dev** (`deploy-ecs-dev`): Auto-deploys to ECS
   - **Staging** (`deploy-ecs-staging`): Requires manual approval
   - **Prod** (`deploy-ecs-prod`): Requires manual approval

**Key point:** This workflow deploys **application code**, not infrastructure.

**Deployment Process:**
1. Uses Terraform to read ECS cluster and service names
2. Updates ECS service with new Docker image tag
3. Waits for ECS service to stabilize (new tasks healthy)
4. Verifies deployment (prod only - checks ALB health)

**Approval Process:**
- **Dev:** Automatic (no approval needed)
- **Staging:** Manual approval required in GitHub UI
- **Prod:** Manual approval required in GitHub UI

---

## How They Work Together

```
┌─────────────────────────────────────────────────────────┐
│  Developer pushes code to branch                        │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼
        ┌───────────────────────────────┐
        │   ci.yml (ALWAYS RUNS)        │
        │   - Lint, test, build, scan   │
        │   - Validates code quality    │
        │   - Does NOT deploy           │
        └───────────────────────────────┘
                        │
        ┌───────────────┴───────────────┐
        │                               │
        ▼                               ▼
┌──────────────────┐          ┌──────────────────┐
│ terraform.yml    │          │ deploy-app.yml   │
│                  │          │                  │
│ Triggers:        │          │ Triggers:        │
│ - terraform/     │          │ - App code       │
│   changes        │          │ - Non-terraform  │
│                  │          │   changes        │
│                  │          │                  │
│ Process:         │          │ Process:         │
│ 1. Plan changes  │          │ 1. Build Docker  │
│ 2. Apply infra   │          │ 2. Push to ECR   │
│    (with approval│          │ 3. Update ECS    │
│     for staging/ │          │    (with approval│
│     prod)        │          │     for staging/ │
└──────────────────┘          │     prod)        │
                              └──────────────────┘
```

### Example Scenarios

#### Scenario 1: Push Application Code
```bash
git push origin develop
```
**Result:**
- ✅ `ci.yml` runs → validates code
- ✅ `deploy-app.yml` runs → builds Docker image → auto-deploys to dev

#### Scenario 2: Change Infrastructure
```bash
# Edit terraform/envs/prod/main.tf
git push origin main
```
**Result:**
- ✅ `ci.yml` runs → validates Terraform syntax
- ✅ `terraform.yml` runs → creates plan → waits for approval → applies changes

#### Scenario 3: Change Both
```bash
# Edit both app code and Terraform
git push origin main
```
**Result:**
- ✅ `ci.yml` runs → validates everything
- ✅ `terraform.yml` runs → updates infrastructure (with approval)
- ✅ `deploy-app.yml` runs → deploys new app version (with approval)

---

## Deployment Environments

### Development (`develop` branch → `dev` environment)
- **Infrastructure:** Auto-applied (no approval)
- **Application:** Auto-deployed (no approval)
- **Purpose:** Fast iteration and testing

### Staging (`staging` branch → `staging` environment)
- **Infrastructure:** Manual approval required
- **Application:** Manual approval required
- **Purpose:** Pre-production testing

### Production (`main` branch → `prod` environment)
- **Infrastructure:** Manual approval required
- **Application:** Manual approval required
- **Purpose:** Live production environment

---

## Manual Triggers

All workflows support manual triggering via GitHub Actions UI:

### `terraform.yml`
1. Go to **Actions** → **Terraform Infrastructure**
2. Click **Run workflow**
3. Select environment: `dev`, `staging`, or `prod`
4. Click **Run workflow**

### `deploy-app.yml`
1. Go to **Actions** → **Deploy Application**
2. Click **Run workflow**
3. Select environment: `dev`, `staging`, or `prod`
4. (Optional) Specify image tag
5. Click **Run workflow**

---

## Workflow Details

### Branch Mapping

| Branch | Environment | Auto-Approval |
|--------|-------------|--------------|
| `develop` | `dev` | ✅ Yes |
| `staging` | `staging` | ❌ No (requires approval) |
| `main` | `prod` | ❌ No (requires approval) |

### Path Filters

**`terraform.yml`** only runs when:
- Files in `terraform/**` change
- `.github/workflows/terraform.yml` changes

**`deploy-app.yml`** runs when:
- Any code changes (except Terraform files)
- Ignores: `terraform/**`, `**.md`, `.github/workflows/terraform.yml`

**`ci.yml`** runs on:
- All pushes and pull requests (no path filters)

### Required Secrets

#### For OIDC (Recommended)
- `AWS_TERRAFORM_ROLE_ARN` - IAM role for Terraform operations
- `AWS_DEPLOY_ROLE_ARN` - IAM role for application deployment

#### For Access Keys (Fallback)
- `AWS_ACCESS_KEY_ID` - AWS access key
- `AWS_SECRET_ACCESS_KEY` - AWS secret key

**Note:** OIDC is preferred for security. Access keys are only used if OIDC roles are not configured.

---

## Troubleshooting

### Workflow Not Triggering

**Problem:** Workflow doesn't run after push

**Solutions:**
- Check branch name matches trigger conditions
- For `terraform.yml`: Ensure files in `terraform/**` changed
- For `deploy-app.yml`: Ensure non-Terraform files changed
- Check GitHub Actions permissions in repository settings

### Terraform Command Not Found

**Problem:** `terraform: command not found` error

**Solution:** Ensure `Setup Terraform` step is present in the job. This was fixed in the deployment jobs - all jobs now include:
```yaml
- name: Setup Terraform
  uses: hashicorp/setup-terraform@v3
  with:
    terraform_version: 1.13.3
```

### Build Failures

**Problem:** Docker build fails during `deploy-app.yml`

**Common causes:**
- Missing environment variables (should be provided at runtime via ECS)
- TypeScript errors (should be caught by `ci.yml`)
- Missing dependencies (check `package.json`)

**Solution:** Check `ci.yml` output first - it should catch most build issues before deployment.

### Approval Not Showing

**Problem:** Can't find approval button for staging/prod

**Solutions:**
- Check GitHub Actions → Workflow run → Review deployments
- Ensure you have write access to the repository
- Check environment protection rules in repository settings

### ECS Deployment Fails

**Problem:** `deploy-app.yml` fails at ECS update step

**Common causes:**
- ECS service doesn't exist (run `terraform.yml` first)
- Insufficient IAM permissions
- Docker image not found in ECR
- Health check failures

**Solution:** Check AWS CloudWatch logs and ECS service events for detailed error messages.

---

## Best Practices

1. **Always run `ci.yml` first** - It validates code before deployment
2. **Deploy infrastructure before application** - Run `terraform.yml` before `deploy-app.yml` if infrastructure changed
3. **Use feature branches** - Test changes in `develop` before merging to `staging` or `main`
4. **Review Terraform plans** - Always review the plan before approving infrastructure changes
5. **Monitor deployments** - Check ECS service logs and CloudWatch after deployment

---

## Related Documentation

- [Terraform Documentation](../terraform/README.md)
- [Deployment Guide](../../DEPLOYMENT_GUIDE.md)
- [CI/CD Guide](../../CI_CD_GUIDE.md)

---

## Questions?

If you have questions about the workflows:
1. Check the workflow logs in GitHub Actions
2. Review the workflow YAML files for detailed configuration
3. Check AWS CloudWatch logs for runtime errors
4. Review the troubleshooting section above
