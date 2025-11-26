# GitHub Actions Workflow Architecture

## 🔄 How Workflows Communicate

**Important**: Workflows don't directly talk to each other. Instead, they coordinate through:

### 1. **File Path Filters** (Primary Communication Method)
Workflows use `paths` and `paths-ignore` to decide which workflow should run:

```yaml
# terraform.yml - Only runs when Terraform files change
on:
  push:
    paths:
      - 'terraform/**'

# deploy-app.yml - Only runs when app code changes (NOT terraform)
on:
  push:
    paths-ignore:
      - 'terraform/**'
```

**This prevents conflicts** - only one deployment workflow runs at a time.

### 2. **Shared State** (Indirect Communication)
Workflows share resources in AWS:
- **Terraform State**: Stored in S3 (`omolaso-terraform-state`)
- **Docker Images**: Stored in ECR (shared across environments)
- **Secrets**: Stored in AWS Secrets Manager

### 3. **Branch-Based Triggers** (Coordination)
Different branches trigger different environments:
- `develop` → dev environment
- `staging` → staging environment  
- `main` → prod environment

## 📊 Current Workflow Flow

```
┌─────────────────────────────────────────┐
│  Developer pushes code                   │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  CI Pipeline (ci.yml)                    │
│  ✅ Runs on EVERY push/PR                 │
│  - Lint, Test, Build, Security Scan      │
│  - Validates Terraform syntax            │
│  - Builds Docker image                   │
└──────────────┬──────────────────────────┘
               │
        ┌──────┴──────┐
        │             │
        ▼             ▼
┌─────────────┐  ┌─────────────┐
│ Terraform   │  │ App Code   │
│ Files?      │  │ Files?     │
│ (terraform/│  │ (src/, etc)│
└──────┬──────┘  └──────┬──────┘
       │                │
       ▼                ▼
┌─────────────┐  ┌─────────────┐
│terraform.yml│  │deploy-app.yml│
│ Deploy Infra│  │ Deploy App  │
│ (RDS, ECS,  │  │ (ECS Update)│
│  ALB, etc) │  │              │
└─────────────┘  └─────────────┘
```

## ⚠️ Current Problem

After removing the `paths` filter from `terraform.yml`, we have:

**Problem**: Both workflows can run simultaneously!
- `terraform.yml` runs on **every push** (no paths filter)
- `deploy-app.yml` runs on **every push** (except terraform files)
- This causes **race conditions** and **conflicts**

**Example conflict**:
1. You push app code (no terraform changes)
2. `terraform.yml` runs (unnecessarily) → tries to update infrastructure
3. `deploy-app.yml` runs → tries to deploy app
4. Both modify ECS service → **CONFLICT!**

## ✅ Recommended Solution

### Option 1: Use Paths Filters (BEST PRACTICE)

**Restore paths filter to terraform.yml**:

```yaml
# terraform.yml
on:
  push:
    branches: [develop, staging, main]
    paths:
      - 'terraform/**'
      - '.github/workflows/terraform.yml'
```

**Why this is better**:
- ✅ Only runs when needed (saves CI minutes)
- ✅ Prevents conflicts with deploy-app.yml
- ✅ Clear separation of concerns
- ✅ Follows DevOps best practices

**When to use manual trigger**:
- If you need to run Terraform without changing files
- Use `workflow_dispatch` (manual trigger in GitHub UI)

### Option 2: Use workflow_run (ADVANCED)

Make terraform.yml wait for ci.yml to complete:

```yaml
# terraform.yml
on:
  workflow_run:
    workflows: ["CI Pipeline"]
    types: [completed]
    branches: [develop, staging, main]
```

**Pros**: Ensures CI passes before infrastructure changes
**Cons**: More complex, harder to debug

## 🎯 Recommended Configuration

### For terraform.yml:
```yaml
on:
  push:
    branches: [develop, staging, main]
    paths:
      - 'terraform/**'
      - '.github/workflows/terraform.yml'
  workflow_dispatch:  # Manual trigger always available
```

### For deploy-app.yml:
```yaml
on:
  push:
    branches: [develop, staging, main]
    paths-ignore:
      - 'terraform/**'  # Don't run when terraform changes
      - '**.md'
```

### For ci.yml:
```yaml
on:
  push:
    branches: [main, develop, 'feature/**']
  pull_request:
    branches: [main, develop]
# No paths filter - runs on everything for testing
```

## 🔍 How to Debug Workflow Triggers

1. **Check which files changed**:
   ```bash
   git diff --name-only HEAD~1
   ```

2. **Check workflow trigger conditions**:
   - Go to Actions tab
   - Click on a workflow run
   - Check "Workflow file" to see trigger conditions

3. **Test manually**:
   - Use `workflow_dispatch` to trigger manually
   - This bypasses all path filters

## 📝 Summary

**Best Practice**: Use paths filters to make workflows mutually exclusive:
- `terraform.yml` → Only when `terraform/**` changes
- `deploy-app.yml` → Only when app code changes (not terraform)
- `ci.yml` → Always runs (for testing)

**Manual Trigger**: Always available via `workflow_dispatch` if you need to run without file changes.

