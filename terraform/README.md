# Terraform Infrastructure

This directory contains Terraform configurations for deploying the portfolio website infrastructure to AWS.

## 📁 Structure

```
terraform/
├── envs/                    # Environment-specific configurations
│   ├── dev/                # Development environment
│   ├── staging/            # Staging environment
│   └── prod/               # Production environment
├── modules/                # Reusable Terraform modules
│   ├── networking/         # VPC, subnets, routing
│   ├── security/          # Security groups
│   ├── rds/               # RDS PostgreSQL database
│   └── ecs/                # ECS Fargate cluster and service
├── bootstrap.sh            # One-time S3/DynamoDB setup
└── migrate-state.sh        # State migration helper
```

## 🚀 Quick Start

### 1. One-Time Setup

```bash
# Create DynamoDB table for state locking
aws dynamodb create-table \
  --table-name portfolio-tf-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1
```

### 2. Migrate Existing State (If You Have Infrastructure)

```bash
cd terraform
./migrate-state.sh
```

### 3. Configure Environment

```bash
cd terraform/envs/prod  # or dev/staging
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your values
```

### 4. Deploy

```bash
terraform init
terraform plan
terraform apply
```

## 🌍 Environments

### Development (`envs/dev/`)
- **Purpose**: Testing and development
- **Resources**: Smaller instances, single task
- **Auto-deploy**: Yes (on push to `develop`)

### Staging (`envs/staging/`)
- **Purpose**: Pre-production testing
- **Resources**: Similar to prod, smaller scale
- **Auto-deploy**: Yes (on push to `staging`, with approval)

### Production (`envs/prod/`)
- **Purpose**: Live production environment
- **Resources**: Full scale, backups enabled
- **Auto-deploy**: Yes (on push to `main`, with approval)

## 📝 Configuration

Each environment has:
- `backend.tf` - State backend configuration
- `main.tf` - Infrastructure definition
- `variables.tf` - Variable definitions
- `outputs.tf` - Output values
- `terraform.tfvars.example` - Example configuration

**Important:** Copy `terraform.tfvars.example` to `terraform.tfvars` and fill in your values. **Never commit `terraform.tfvars` to git!**

### Per-environment Secrets Manager prerequisites

Each environment reads its database password and application secrets from **per-environment** Secrets Manager entries (the rds module no longer hardcodes a prod ARN — see `db_credentials_secret_name` in `terraform/modules/rds/variables.tf`). Create these out-of-band before `terraform apply` for any new environment:

| Environment | DB credentials secret name              | App secrets secret name        |
|-------------|------------------------------------------|--------------------------------|
| dev         | `portfolio/dev/db-credentials`           | `portfolio/dev/app-secrets`    |
| staging     | `portfolio/staging/db-credentials`       | `portfolio/staging/app-secrets`|
| prod        | `omolasowebportfolio/db/credentials`     | `portfolio/prod/app-secrets`   |

The DB credentials secret must contain `{ "username": "...", "password": "..." }`. See `SECRETS_MANAGER_SETUP.md` for the app-secrets schema and creation steps.

## 🔧 Modules

### Networking Module
- VPC with public subnets
- Internet Gateway
- Route tables

### Security Module
- Security groups for ALB, ECS, RDS
- Ingress/egress rules

### RDS Module
- PostgreSQL database
- Secrets Manager integration
- Backup configuration

### ECS Module
- ECS Fargate cluster
- Task definitions
- Service configuration
- Auto-scaling

## 🔐 State Management

- **Backend**: S3 bucket (`omolaso-terraform-state`)
- **State Files**: Separate per environment
  - `envs/dev/terraform.tfstate`
  - `envs/staging/terraform.tfstate`
  - `envs/prod/terraform.tfstate`
- **Locking**: S3 native locking (`use_lockfile = true` in each `backend.tf`). Requires Terraform ≥ 1.10. The `portfolio-tf-locks` DynamoDB table referenced in older docs is a leftover from before S3 native locking — safe to leave in place but no longer consulted by these backends.
- **Orphan state from the old layout**: The previous single-config setup wrote state to `s3://omolaso-terraform-state/portfolio/terraform.tfstate`. That root-level Terraform config has been removed. If you previously applied it, the state object may still exist in S3 — verify nothing depends on it, then delete it manually.

## 🚨 Important Commands

```bash
# Initialize Terraform
terraform init

# Plan changes
terraform plan

# Apply changes
terraform apply

# Destroy infrastructure (use with caution!)
terraform destroy

# View state
terraform state list
terraform state show <resource>

# Force unlock (if state is locked)
terraform force-unlock <LOCK_ID>
```

## 💰 Cost Management: Pause/Resume Infrastructure

To save costs when not actively using the application, you can pause and resume infrastructure:

### Pause Infrastructure

```bash
# Pause production (stops expensive resources)
./scripts/pause.sh prod us-east-1

# Pause staging
./scripts/pause.sh staging us-east-1

# Pause development
./scripts/pause.sh dev us-east-1
```

**What gets paused:**
- ✅ ALB, Target Group, Listener (destroyed)
- ✅ ECS tasks (scaled to 0)
- ✅ RDS database (stopped via AWS CLI)
- ✅ Auto-scaling (disabled)

**What stays running (FREE):**
- VPC, Subnets, Security Groups
- ECS Cluster (empty)
- ECR with Docker images
- Secrets in Secrets Manager
- S3 Terraform state

**Cost when paused:** ~$1-2/month

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
2. ALB, Target Group, Listener are recreated
3. ECS tasks scale back up
4. Auto-scaling re-enabled

**Cost when running:** ~$200-250/month

### Paused Mode Variable

The `paused_mode` variable controls resource creation:

```hcl
# In terraform/envs/prod/main.tf or via CLI
variable "paused_mode" {
  description = "When true, pauses expensive resources"
  type        = bool
  default     = false
}

# Apply with paused mode
terraform apply -var="paused_mode=true"
```

**Note:** For production, the pause script automatically handles ALB deletion protection before pausing.

## 🛡️ Security baseline (and known gaps)

The Terraform code has had a hardening pass. **What's tightened in code:**

- ECS security-group inbound 3000/tcp from `0.0.0.0/0` removed (ALB-only ingress).
- RDS security-group inbound 5432/tcp from `0.0.0.0/0` replaced with a `var.admin_cidr_blocks` ingress (default `[]`, closed). Set to your home IP `/32` in `terraform.tfvars` when you need direct laptop access — same cost as the old open rule but limits the attack surface.
- Optional **HTTPS listener** via `var.acm_certificate_arn`. When empty (default), the ALB serves HTTP on :80 as before. When set, an HTTPS listener is added on :443 (TLS 1.3 policy) and the HTTP listener becomes a 301 redirect. See "Enabling HTTPS" below for the cert request flow.
- ECS task execution IAM role's `secretsmanager:GetSecretValue` scoped to the two task-specific secret ARNs instead of `Resource = "*"`.
- GitHub OIDC trust subject claim narrowed from `repo:<repo>:*` to specific branches + `pull_request`.
- RDS credentials secret name is per-environment (no cross-env contamination).
- RDS `skip_final_snapshot` per-env (prod retains snapshot on destroy).
- dev/staging VPC CIDR fixed (was `/24` + `cidrsubnet(8)` → invalid `/32`).

### Deliberate cost / convenience trade-offs (not bugs)

These are kept open on purpose to avoid recurring AWS charges or operator overhead. Don't change them without explicit intent.

| Setting | Why kept | If you wanted to close it |
|---|---|---|
| `aws_db_instance.main.publicly_accessible = true` | Lets you connect to RDS from a laptop without paying for a NAT gateway (~$32/mo), bastion EC2, or AWS Client VPN (~$72/mo). | Set `publicly_accessible = false` and put RDS in private subnets — then you'd need NAT or a bastion. The `admin_cidr_blocks` variable already scopes who can reach 5432 when it's open. |
| ECS `assign_public_ip = true` + public subnets only | Same reason — avoids a NAT gateway. Egress from tasks (image pulls, Resend API, etc.) goes via the public IP. | Move to private subnets and provision a NAT gateway. The `networking` module would need a private-subnet branch. |
| Single-AZ on dev/staging RDS | Multi-AZ doubles RDS cost. | Toggle `multi_az = true` in the rds module per-env. |
| ALB HTTP-only by default | ACM is free, but the cert request flow needs a real domain and DNS validation. | Set `acm_certificate_arn` (see below). |

### Real backlog (not cost-driven)

- `terraform_role` / `deploy_role` IAM policies use wildcards (`ec2:*`, `iam:*`, `s3:*`, etc.). Scoping is high-blast-radius and warrants its own change.
- No CloudWatch alarms yet (needs SNS + email subscribers — minimal cost, ~$0.10/alarm/month).
- ECR `image_tag_mutability = "MUTABLE"` (set to `IMMUTABLE` only after dropping `:latest` pushes from `deploy-app.yml`).

### Enabling HTTPS

1. Request a certificate (replace with your domain — the project's primary domain is `oluwabamiseomolaso.com.ng`):

   ```bash
   aws acm request-certificate \
     --domain-name "yourdomain.com" \
     --subject-alternative-names "www.yourdomain.com" \
     --validation-method DNS \
     --region us-east-1
   ```

2. Note the returned `CertificateArn`, then describe it to get the DNS validation record:

   ```bash
   aws acm describe-certificate \
     --certificate-arn arn:aws:acm:us-east-1:<account>:certificate/<uuid> \
     --region us-east-1 \
     --query 'Certificate.DomainValidationOptions'
   ```

3. Add the returned `Name` / `Value` CNAME record at your DNS provider (or in Route 53 if you host the zone). ACM auto-issues once the record propagates (a few minutes).
4. Wait until `Status: ISSUED`, then drop the ARN into the env's `terraform.tfvars`:

   ```hcl
   acm_certificate_arn = "arn:aws:acm:us-east-1:<account>:certificate/<uuid>"
   ```

5. `terraform apply` — the HTTPS listener and HTTP→HTTPS redirect get created.
6. Point your domain's A/ALIAS record at the ALB's `dns_name` (output by `terraform output alb_dns_name`).

## 🔄 Migration from Old Structure

The migration from the single-config layout (`terraform/main.tf`) to the per-env layout (`terraform/envs/<env>/`) has been completed and the old root-level config has been removed. The steps below are historical and only apply if you are bootstrapping the per-env state from a fresh fork.

If you're migrating from the old single-environment structure:

1. **Backup current state**:
   ```bash
   aws s3 cp s3://omolaso-terraform-state/portfolio/terraform.tfstate \
     terraform.tfstate.backup
   ```

2. **Run migration script**:
   ```bash
   cd terraform
   ./migrate-state.sh
   ```

3. **Initialize new structure**:
   ```bash
   cd terraform/envs/prod
   terraform init -migrate-state
   ```

4. **Verify migration**:
   ```bash
   terraform state list  # Should show all resources
   terraform plan        # Should show no changes
   ```

See `MIGRATION_GUIDE.md` for detailed migration steps.

## 🐛 Troubleshooting

### State locked
```bash
# Check for locks in DynamoDB
aws dynamodb scan --table-name portfolio-tf-locks

# Force unlock (use carefully!)
terraform force-unlock <LOCK_ID>
```

### State not found
```bash
# Verify state file exists in S3
aws s3 ls s3://omolaso-terraform-state/envs/prod/

# Re-initialize
terraform init
```

### Resources not found
```bash
# List all resources in state
terraform state list

# Import existing resource
terraform import <resource_type>.<name> <resource_id>
```

## 📚 Related Documentation

- `../DEPLOYMENT_GUIDE.md` - Deployment guide
- `../CI_CD_GUIDE.md` - CI/CD pipeline guide
- `MIGRATION_GUIDE.md` - Detailed migration steps
- `../OIDC_SETUP.md` - OIDC authentication setup

---

**Need help?** Check the troubleshooting section or related documentation.
