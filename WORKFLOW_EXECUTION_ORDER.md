# Workflow Execution Order

## 🎯 Execution Flow

Your workflows now run in a specific order to ensure code quality and proper deployment:

```
┌─────────────────────────────────────────────────────────┐
│  Developer pushes code to branch                        │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼
        ┌───────────────────────────────┐
        │   1. CI Pipeline (ci.yml)     │
        │   - Lint, test, build, scan   │
        │   - Validates code quality     │
        │   - Runs on ALL pushes        │
        └───────────────────────────────┘
                        │
                        ▼
        ┌───────────────────────────────┐
        │  2. Terraform (terraform.yml)  │
        │   - Only if terraform/**       │
        │     files changed              │
        │   - Waits for CI to pass       │
        │   - Plans infrastructure       │
        │   - Applies (with approval)   │
        └───────────────────────────────┘
                        │
                        ▼
        ┌───────────────────────────────┐
        │  3. Deploy App (deploy-app.yml)│
        │   - Only if app code changed   │
        │   - Waits for CI to pass       │
        │   - Waits for Terraform (if    │
        │     infrastructure changed)     │
        │   - Builds Docker image        │
        │   - Deploys to ECS             │
        └───────────────────────────────┘
```

---

## 📋 Detailed Execution Order

### Step 1: CI Pipeline (`ci.yml`)

**Triggers:**
- ✅ Push to `main`, `develop`, or `feature/**`
- ✅ Pull requests

**What it does:**
- Runs ESLint and TypeScript checks
- Runs security scans
- Runs tests with coverage
- Builds the application
- Validates Terraform syntax

**Duration:** ~5-10 minutes

**Result:**
- ✅ Pass → Next workflow can run
- ❌ Fail → Blocks subsequent workflows

---

### Step 2: Terraform Infrastructure (`terraform.yml`)

**Triggers:**
- ✅ After CI passes (via `workflow_run`)
- ✅ Direct push to `terraform/**` files
- ✅ Manual trigger

**Conditions:**
- Only runs if CI passed (when triggered by `workflow_run`)
- Only runs if Terraform files changed (when triggered by push)

**What it does:**
1. **Plan Phase:**
   - Runs `terraform plan`
   - Shows infrastructure changes
   - Uploads plan as artifact

2. **Apply Phase:**
   - **Dev:** Auto-applies
   - **Staging/Prod:** Requires manual approval

**Duration:** ~3-5 minutes (plan) + ~5-10 minutes (apply)

**Result:**
- ✅ Pass → Infrastructure updated
- ❌ Fail → Blocks deployment (if infrastructure changed)

---

### Step 3: Deploy Application (`deploy-app.yml`)

**Triggers:**
- ✅ After Terraform completes (if infrastructure changed)
- ✅ After CI passes (if only app code changed)
- ✅ Direct push to app code (ignores terraform/**)

**Conditions:**
- Only runs if previous workflow(s) passed
- Only runs if app code changed (not Terraform files)

**What it does:**
1. **Build Phase:**
   - Builds Docker image
   - Pushes to ECR
   - Scans for vulnerabilities

2. **Deploy Phase:**
   - Gets ECS cluster/service from Terraform outputs
   - Updates ECS service with new image
   - Waits for service to stabilize

**Duration:** ~5-10 minutes (build) + ~3-5 minutes (deploy)

**Result:**
- ✅ Pass → Application deployed
- ❌ Fail → Application not updated

---

## 🔄 Example Scenarios

### Scenario 1: Push App Code Only

```bash
# Edit src/app/page.tsx
git push origin main
```

**Execution:**
1. ✅ `ci.yml` runs → Validates code
2. ⏭️ `terraform.yml` skipped (no Terraform changes)
3. ✅ `deploy-app.yml` runs → Builds and deploys

**Total time:** ~15-20 minutes

---

### Scenario 2: Push Terraform Changes Only

```bash
# Edit terraform/envs/prod/main.tf
git push origin main
```

**Execution:**
1. ✅ `ci.yml` runs → Validates Terraform syntax
2. ✅ `terraform.yml` runs → Plans and applies infrastructure
3. ⏭️ `deploy-app.yml` skipped (no app code changes)

**Total time:** ~15-25 minutes (including approval wait)

---

### Scenario 3: Push Both App Code and Terraform

```bash
# Edit both app code and Terraform
git push origin main
```

**Execution:**
1. ✅ `ci.yml` runs → Validates everything
2. ✅ `terraform.yml` runs → Updates infrastructure
3. ✅ `deploy-app.yml` runs → Deploys new app version

**Total time:** ~25-35 minutes (including approval wait)

**Note:** Deploy waits for Terraform to complete before running.

---

## ⚙️ Workflow Dependencies

### Current Configuration

**`ci.yml`:**
- ✅ Runs independently (no dependencies)
- ✅ Runs on all pushes/PRs

**`terraform.yml`:**
- ✅ Depends on: `ci.yml` (via `workflow_run`)
- ✅ Only runs if CI passed
- ✅ Only runs if Terraform files changed

**`deploy-app.yml`:**
- ✅ Depends on: `terraform.yml` (if infrastructure changed)
- ✅ Depends on: `ci.yml` (if only app code changed)
- ✅ Only runs if previous workflow(s) passed
- ✅ Only runs if app code changed

---

## 🚦 Workflow Status Checks

Each workflow checks the status of previous workflows:

### Terraform Workflow
```yaml
if: |
  github.event_name == 'workflow_dispatch' ||
  github.event_name == 'push' ||
  (github.event_name == 'workflow_run' && github.event.workflow_run.conclusion == 'success')
```

**Meaning:** Only runs if CI passed (when triggered by `workflow_run`).

### Deploy Workflow
```yaml
if: |
  github.event_name == 'workflow_dispatch' ||
  github.event_name == 'push' ||
  (github.event_name == 'workflow_run' && github.event.workflow_run.conclusion == 'success')
```

**Meaning:** Only runs if CI/Terraform passed (when triggered by `workflow_run`).

---

## ⏱️ Timing

### Typical Execution Times

| Workflow | Duration | When It Runs |
|----------|----------|--------------|
| CI | 5-10 min | Always (on push/PR) |
| Terraform Plan | 3-5 min | If Terraform files changed |
| Terraform Apply | 5-10 min | After plan (with approval) |
| Deploy Build | 5-10 min | If app code changed |
| Deploy Update | 3-5 min | After build |

### Total Time by Scenario

- **App code only:** ~15-20 minutes
- **Terraform only:** ~15-25 minutes (with approval)
- **Both:** ~25-35 minutes (with approval)

---

## 🎯 Best Practices

1. **Test locally first:**
   ```bash
   # Before pushing
   npm run lint
   npm test
   cd terraform/envs/prod && terraform plan
   ```

2. **Review CI results:**
   - Check CI passes before expecting Terraform/Deploy to run
   - Fix CI issues first

3. **Review Terraform plan:**
   - Always review the plan before approving
   - Verify no unexpected changes

4. **Monitor deployments:**
   - Check ECS service logs after deployment
   - Verify application is healthy

---

## 🐛 Troubleshooting

### Workflow Not Running

**Problem:** Workflow doesn't trigger

**Check:**
- ✅ Branch name matches trigger conditions
- ✅ Files changed match path filters
- ✅ Previous workflow passed (if using `workflow_run`)

### Workflow Skipped

**Problem:** Workflow shows as "skipped"

**Causes:**
- Previous workflow failed
- No matching file changes
- Condition not met

**Solution:**
- Check previous workflow status
- Verify file paths match filters
- Review workflow conditions

### Workflow Fails

**Problem:** Workflow fails with error

**Solution:**
- Check workflow logs
- Review error messages
- Fix issues and re-run

---

## 📊 Workflow Status in GitHub

You can see the execution order in GitHub Actions:

1. Go to **Actions** tab
2. See workflows listed in execution order:
   - CI Pipeline (running)
   - Terraform Infrastructure (waiting for CI)
   - Deploy Application (waiting for CI/Terraform)

3. Click on a workflow to see:
   - Status (running, passed, failed)
   - Dependencies (what it's waiting for)
   - Execution time

---

## Summary

**Execution Order:**
1. ✅ **CI** runs first (validates code)
2. ✅ **Terraform** runs second (if infrastructure changed, after CI)
3. ✅ **Deploy** runs last (if app code changed, after CI/Terraform)

**Key Points:**
- CI always runs first
- Terraform waits for CI
- Deploy waits for CI (and Terraform if infrastructure changed)
- Each workflow only runs if relevant files changed
- Failed workflows block subsequent workflows

This ensures code quality and proper deployment order! 🎉

