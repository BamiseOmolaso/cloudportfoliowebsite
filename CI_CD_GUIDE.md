# CI/CD & DevOps Guide

This guide covers CI/CD pipelines, DevOps best practices, and how to use them for learning.

## 🎯 CI/CD Overview

### What is CI/CD?

- **CI (Continuous Integration)**: Automatically test and build code when changes are pushed
- **CD (Continuous Deployment)**: Automatically deploy code to environments after successful CI

### Our Pipeline Structure

```
┌─────────────────────────────────────────────────────────┐
│                    CI Pipeline (ci.yml)                  │
├─────────────────────────────────────────────────────────┤
│ 1. Lint & Type Check                                    │
│ 2. Security Scanning                                    │
│ 3. Unit & Integration Tests                             │
│ 4. Build Application                                    │
│ 5. Build Docker Image                                   │
│ 6. Scan Docker Image                                    │
│ 7. Validate Terraform                                   │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│         CD Pipeline (terraform.yml / deploy-app.yml)     │
├─────────────────────────────────────────────────────────┤
│ 1. Pre-deployment Checks                                │
│ 2. Build & Push Docker Image                            │
│ 3. Terraform Plan                                       │
│ 4. Manual Approval (Production)                         │
│ 5. Terraform Apply                                      │
│ 6. Deploy to ECS                                        │
│ 7. Run Database Migrations                              │
│ 8. Verify Deployment                                    │
│ 9. Rollback (if needed)                                 │
└─────────────────────────────────────────────────────────┘
```

## 📁 Workflow Files

| File | Purpose | Triggers |
|------|---------|----------|
| `ci.yml` | Continuous Integration | Every push/PR |
| `terraform.yml` | Infrastructure deployment | Terraform changes, manual |
| `deploy-app.yml` | Application deployment | Code changes (non-Terraform) |

## 🔧 Setup Required

### 1. GitHub Secrets

Add these secrets in GitHub Settings → Secrets and variables → Actions:

**Option A: OIDC (Recommended)** — short-lived credentials, no long-lived keys to leak.
```
AWS_TERRAFORM_ROLE_ARN     # IAM role for Terraform
AWS_DEPLOY_ROLE_ARN        # IAM role for deployments
```
See `OIDC_SETUP.md` for the IAM provider/role setup.

**Option B: Access Keys (legacy fallback)** — used only if the role ARN secret above is missing or malformed. Plan to retire these once OIDC is verified across all environments.
```
AWS_ACCESS_KEY_ID          # Long-lived AWS access key
AWS_SECRET_ACCESS_KEY      # Long-lived AWS secret key
```

**Optional:**
```
SNYK_TOKEN                 # For Snyk security scanning
CODECOV_TOKEN              # For code coverage
```

### 2. GitHub Environments

Create environments in GitHub Settings → Environments:

**Development:**
- Name: `development`
- No protection rules needed

**Staging:**
- Name: `staging`
- Optional: Add reviewers

**Production:**
- Name: `production`
- Recommended: Add required reviewers
- Add deployment branches: `main` only

## 🔄 Workflow Behavior

### CI Pipeline (`ci.yml`)
- **Triggers:** Every push/PR
- **Runs:** Lint, test, build, security scan
- **No deployment**
- **Duration:** ~5-10 minutes

### Terraform Workflow (`terraform.yml`)
- **Triggers:** 
  - Changes to `terraform/**` files
  - After CI passes (via `workflow_run`)
  - Manual dispatch
- **Runs:** Plan and apply infrastructure changes
- **Auto-apply:** Dev only
- **Manual approval:** Staging/Prod (via GitHub Environments)
- **Duration:** ~3-5 minutes (plan) + ~5-10 minutes (apply)

### App Deployment (`deploy-app.yml`)
- **Triggers:** 
  - Code changes (non-Terraform files)
  - After CI passes (via `workflow_run`)
  - Manual dispatch
- **Runs:** Build Docker image, push to ECR, deploy to ECS
- **Auto-deploy:** Dev
- **Manual approval:** Staging/Prod
- **Duration:** ~5-10 minutes (build) + ~3-5 minutes (deploy)

## 🔄 Workflow Execution Order

### How Workflows Coordinate

Workflows coordinate through:

1. **File Path Filters** (Primary Method)
   - `terraform.yml` runs only when `terraform/**` files change
   - `deploy-app.yml` runs only when app code changes (excludes `terraform/**`)
   - `ci.yml` runs on all changes
   - This prevents conflicts - only relevant workflows run

2. **Shared State** (Indirect Communication)
   - Terraform State: S3 (`omolaso-terraform-state`)
   - Docker Images: ECR (shared across environments)
   - Secrets: AWS Secrets Manager

3. **Branch-Based Triggers**
   - `develop` → dev environment
   - `staging` → staging environment
   - `main` → production environment

### Execution Flow

```
Developer pushes code
        │
        ▼
┌───────────────────────┐
│  CI Pipeline (ci.yml) │
│  - Validates code      │
│  - Runs on ALL pushes  │
└───────────┬───────────┘
            │
    ┌───────┴───────┐
    │               │
    ▼               ▼
┌──────────┐  ┌──────────┐
│Terraform │  │App Code  │
│Files?    │  │Files?    │
└────┬─────┘  └────┬─────┘
     │             │
     ▼             ▼
┌──────────┐  ┌──────────┐
│terraform │  │deploy-app│
│.yml      │  │.yml      │
└──────────┘  └──────────┘
```

### Example Scenarios

**Scenario 1: App Code Only**
- `ci.yml` runs → validates
- `terraform.yml` skipped (no Terraform changes)
- `deploy-app.yml` runs → builds and deploys
- **Total time:** ~15-20 minutes

**Scenario 2: Terraform Only**
- `ci.yml` runs → validates Terraform syntax
- `terraform.yml` runs → plans and applies
- `deploy-app.yml` skipped (no app code changes)
- **Total time:** ~15-25 minutes (with approval)

**Scenario 3: Both App Code and Terraform**
- `ci.yml` runs → validates everything
- `terraform.yml` runs → updates infrastructure
- `deploy-app.yml` runs → deploys new app version
- **Total time:** ~25-35 minutes (with approval)

## ✅ Best Practices Implemented

### 1. Separation of Concerns
- Separate CI and CD workflows
- Environment-specific deployments
- Infrastructure and application separation

### 2. Automated Testing
- Lint checks (code quality)
- Type checking (TypeScript)
- Unit tests (Jest)
- Integration tests
- Security scans

### 3. Security Scanning
- npm audit (dependency vulnerabilities)
- Trivy (Docker image scanning) — SARIF results uploaded to GitHub Security via `github/codeql-action/upload-sarif`
- TruffleHog (secret detection)
- Snyk (additional security scanning)
- **Third-party actions pinned to commit SHAs** (`trufflesecurity/trufflehog`, `snyk/actions/node`, `aquasecurity/trivy-action`, `github/codeql-action`) so a compromised upstream tag cannot inject malicious code into the pipeline. Bump the pins intentionally via a PR rather than tracking `@main` / `@master`.

### 4. Infrastructure as Code (IaC)
- Terraform for all infrastructure
- Version controlled
- Plan before apply
- State management in S3

### 5. Immutable Infrastructure
- Docker images (build once, deploy everywhere)
- No manual changes
- Versioned artifacts

### 6. Blue-Green Deployments
- Zero-downtime
- Health checks
- Automatic rollback

### 7. Approval Gates
- Manual approval for production
- Environment protection
- Terraform plan review — PR comments redact AWS account IDs in ARN-shaped strings and link back to the full plan in the workflow run

### 7a. Workflow Trust Boundary
- `terraform.yml` and `deploy-app.yml` are triggered via `workflow_run` after CI passes. Both gate on `github.event.workflow_run.head_repository.full_name == github.repository` so a fork-push that happens to match a watched branch cannot trigger a downstream apply/deploy in the base repo with our secrets.
- `actions/checkout` is configured with `persist-credentials: false` across all workflows since none of them push back to the repository.

### 8. Database Migration Automation
- Automated Prisma migrations
- Version controlled
- Rollback support

### 9. Monitoring & Observability
- CloudWatch Logs
- Health checks
- Smoke tests
- Deployment summaries

## 🎓 Learning Path

### Beginner
1. Understand what CI/CD is
2. Learn GitHub Actions basics
3. Understand Docker basics
4. Learn Terraform basics

### Intermediate
1. Set up your own CI/CD pipeline
2. Create reusable Terraform modules
3. Implement security scanning
4. Set up monitoring and alerts

### Advanced
1. Implement blue-green deployments
2. Set up canary deployments
3. Implement infrastructure testing
4. Set up disaster recovery

## 📚 Related Documentation

- `DEPLOYMENT_GUIDE.md` - Deployment steps
- `OIDC_SETUP.md` - OIDC authentication setup
- `SECRETS_MANAGER_SETUP.md` - Secrets management
- `REDIS_SETUP.md` - Redis Cloud setup
- `terraform/README.md` - Terraform documentation

---

**Ready to deploy?** See `DEPLOYMENT_GUIDE.md` for step-by-step instructions!

