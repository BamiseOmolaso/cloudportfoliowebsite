# AWS OIDC Setup Guide

This guide shows you how to set up OIDC (OpenID Connect) authentication for GitHub Actions instead of using access keys.

> **Note on trust-policy subject claims:** the policies below restrict `token.actions.githubusercontent.com:sub` to the three protected branches (`main`, `staging`, `develop`), `pull_request`, and the three deployment environments (`production`, `staging`, `development`). Avoid the wildcard form `repo:<owner>/<repo>:*` — it allows OIDC token issuance for arbitrary feature branches, manual `workflow_dispatch` runs from any branch, and any workflow run. The environment entries are required because any GitHub job with an `environment:` declaration emits a sub of the form `repo:<repo>:environment:<name>` instead of the branch ref — without them, manual-approval deploys fail at `AssumeRoleWithWebIdentity`. PR runs from forks cannot match the `pull_request` entry because the OIDC token's sub claim for fork PRs uses the fork's repo path, not the base repo's.
>
> **Note on IAM policy scope:** the Terraform role's policy still uses broad action wildcards (`"ec2:*"`, `"iam:*"`, `"kms:*"`) on `Resource: "*"` — provisioning role, hardest to scope without breaking future apply runs; tracked as a follow-up. The Deploy role's policy below is partly scoped: IAM is restricted to read + tag + `PassRole`, EC2 to describe-only, and S3/DynamoDB statements are pinned to the Terraform state bucket and lock table by ARN. The source of truth for both is [`terraform/modules/github-oidc/main.tf`](terraform/modules/github-oidc/main.tf) — the JSON blocks in this guide are summaries.

## 🎯 Why OIDC?

- ✅ **More Secure**: No long-lived access keys
- ✅ **Temporary Credentials**: Short-lived tokens
- ✅ **Better Audit Trail**: Can see which workflow ran what
- ✅ **AWS Best Practice**: Recommended by AWS

## 📋 Prerequisites

- AWS Account with admin access (one-time setup)
- GitHub repository
- AWS CLI installed locally

## 🚀 Setup Steps

### Step 1: Create OIDC Identity Provider in AWS

```bash
# Get your GitHub organization/repository info
GITHUB_ORG="BamiseOmolaso"
GITHUB_REPO="cloudportfoliowebsite"

# Create OIDC provider
aws iam create-open-id-connect-provider \
  --url https://token.actions.githubusercontent.com \
  --client-id-list sts.amazonaws.com \
  --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1 \
  --region us-east-1
```

### Step 2: Create IAM Role for Terraform

```bash
# Create trust policy for Terraform role
cat > terraform-trust-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::123456789012:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": [
            "repo:BamiseOmolaso/cloudportfoliowebsite:ref:refs/heads/main",
            "repo:BamiseOmolaso/cloudportfoliowebsite:ref:refs/heads/staging",
            "repo:BamiseOmolaso/cloudportfoliowebsite:ref:refs/heads/develop",
            "repo:BamiseOmolaso/cloudportfoliowebsite:pull_request",
            "repo:BamiseOmolaso/cloudportfoliowebsite:environment:production",
            "repo:BamiseOmolaso/cloudportfoliowebsite:environment:staging",
            "repo:BamiseOmolaso/cloudportfoliowebsite:environment:development"
          ]
        }
      }
    }
  ]
}
EOF

# Replace YOUR_ACCOUNT_ID and YOUR_ORG with your values
# Then create the role
aws iam create-role \
  --role-name GitHubActionsTerraformRole \
  --assume-role-policy-document file://terraform-trust-policy.json \
  --description "Role for GitHub Actions to run Terraform"
```

### Step 3: Attach Policies to Terraform Role

```bash
# Attach necessary policies
aws iam attach-role-policy \
  --role-name GitHubActionsTerraformRole \
  --policy-arn arn:aws:iam::aws:policy/ReadOnlyAccess

# Create custom policy for Terraform operations
cat > terraform-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:*",
        "dynamodb:*",
        "ec2:*",
        "rds:*",
        "ecs:*",
        "ecr:*",
        "elasticloadbalancing:*",
        "secretsmanager:*",
        "logs:*",
        "iam:*"
      ],
      "Resource": "*"
    }
  ]
}
EOF

aws iam put-role-policy \
  --role-name GitHubActionsTerraformRole \
  --policy-name TerraformFullAccess \
  --policy-document file://terraform-policy.json
```

### Step 4: Create IAM Role for App Deployment

```bash
# Create trust policy for Deploy role
cat > deploy-trust-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::123456789012:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": [
            "repo:BamiseOmolaso/cloudportfoliowebsite:ref:refs/heads/main",
            "repo:BamiseOmolaso/cloudportfoliowebsite:ref:refs/heads/staging",
            "repo:BamiseOmolaso/cloudportfoliowebsite:ref:refs/heads/develop",
            "repo:BamiseOmolaso/cloudportfoliowebsite:pull_request",
            "repo:BamiseOmolaso/cloudportfoliowebsite:environment:production",
            "repo:BamiseOmolaso/cloudportfoliowebsite:environment:staging",
            "repo:BamiseOmolaso/cloudportfoliowebsite:environment:development"
          ]
        }
      }
    }
  ]
}
EOF

# Create the role
aws iam create-role \
  --role-name GitHubActionsDeployRole \
  --assume-role-policy-document file://deploy-trust-policy.json \
  --description "Role for GitHub Actions to deploy applications"

# Attach the scoped inline policy (see terraform/modules/github-oidc/main.tf
# for the full version-controlled definition). Summary:
#   - ecr / ecs / elasticloadbalancing / rds / application-autoscaling /
#     secretsmanager / logs / cloudwatch : "*:*" on Resource "*"
#     (still broad; tracked as follow-up)
#   - iam   : read + tag operations + PassRole only — NOT full IAM
#   - ec2   : Describe / Get / List only — no mutation
#   - s3    : GetObject / ListBucket / PutObject scoped to the
#             omolaso-terraform-state bucket, plus DeleteObject limited
#             to *.tflock keys
#   - dynamodb : GetItem / PutItem / DeleteItem / Query / DescribeTable
#                scoped to table/portfolio-tf-locks
#   - sts:GetCallerIdentity for credential verification
cat > deploy-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ecr:*", "ecs:*", "elasticloadbalancing:*", "rds:*",
        "application-autoscaling:*", "secretsmanager:*",
        "logs:*", "cloudwatch:*"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "iam:GetRole", "iam:ListRolePolicies", "iam:ListAttachedRolePolicies",
        "iam:GetRolePolicy", "iam:ListOpenIDConnectProviders",
        "iam:GetOpenIDConnectProvider", "iam:GetPolicy", "iam:GetPolicyVersion",
        "iam:ListPolicyVersions", "iam:ListRoles", "iam:ListPolicies",
        "iam:TagRole", "iam:UntagRole", "iam:PassRole"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": ["ec2:Describe*", "ec2:Get*", "ec2:List*"],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:ListBucket"],
      "Resource": [
        "arn:aws:s3:::omolaso-terraform-state",
        "arn:aws:s3:::omolaso-terraform-state/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": ["s3:PutObject"],
      "Resource": ["arn:aws:s3:::omolaso-terraform-state/envs/*/terraform.tfstate"]
    },
    {
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:DeleteObject"],
      "Resource": ["arn:aws:s3:::omolaso-terraform-state/*.tflock"]
    },
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:DeleteItem",
        "dynamodb:Query", "dynamodb:DescribeTable"
      ],
      "Resource": ["arn:aws:dynamodb:us-east-1:*:table/portfolio-tf-locks"]
    },
    {
      "Effect": "Allow",
      "Action": ["sts:GetCallerIdentity"],
      "Resource": "*"
    }
  ]
}
EOF

aws iam put-role-policy \
  --role-name GitHubActionsDeployRole \
  --policy-name deploy-access \
  --policy-document file://deploy-policy.json
```

### Step 5: Get Role ARNs

```bash
# Get Terraform role ARN
aws iam get-role --role-name GitHubActionsTerraformRole \
  --query 'Role.Arn' --output text

# Get Deploy role ARN
aws iam get-role --role-name GitHubActionsDeployRole \
  --query 'Role.Arn' --output text
```

### Step 6: Add Secrets to GitHub

1. Go to your GitHub repository
2. Settings → Secrets and variables → Actions
3. Add these secrets:

```
AWS_TERRAFORM_ROLE_ARN = arn:aws:iam::YOUR_ACCOUNT_ID:role/GitHubActionsTerraformRole
AWS_DEPLOY_ROLE_ARN = arn:aws:iam::YOUR_ACCOUNT_ID:role/GitHubActionsDeployRole
```

**Note:** You can keep `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` as fallback, but OIDC is preferred.

## 🔄 Alternative: Use Access Keys (Simpler, Less Secure)

If you want to use access keys instead (simpler but less secure):

1. Create IAM user in AWS Console
2. Attach necessary policies
3. Create access key
4. Add to GitHub Secrets:
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`

Then update workflows to use:
```yaml
- name: Configure AWS credentials
  uses: aws-actions/configure-aws-credentials@v4
  with:
    aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
    aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
    aws-region: us-east-1
```

## ✅ Verification

Test the setup:

1. Push a commit to `develop` branch
2. Check GitHub Actions tab
3. Verify workflows run successfully
4. Check CloudTrail in AWS to see the role assumption

## 🐛 Troubleshooting

### "Access Denied" errors

- Check IAM role policies
- Verify OIDC provider is set up correctly
- Check GitHub repository name matches in trust policy

### "Role not found"

- Verify role ARN is correct in GitHub Secrets
- Check role exists in AWS Console

### Workflow doesn't trigger

- Check workflow file syntax
- Verify branch names match
- Check workflow permissions

## 📚 Resources

- [AWS OIDC Documentation](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers_create_oidc.html)
- [GitHub Actions OIDC](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services)

---

**Recommendation:** Start with access keys for simplicity, then migrate to OIDC when you're comfortable with the setup.

