# AWS OIDC Setup Guide

This guide shows you how to set up OIDC (OpenID Connect) authentication for GitHub Actions instead of using access keys.

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
        "Federated": "arn:aws:iam::827327671360:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:BamiseOmolaso/cloudportfoliowebsite:*"
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
        "Federated": "arn:aws:iam::827327671360:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:BamiseOmolaso/cloudportfoliowebsite:*"
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

# Attach ECS and ECR policies
aws iam attach-role-policy \
  --role-name GitHubActionsDeployRole \
  --policy-arn arn:aws:iam::aws:policy/AmazonECS_FullAccess

aws iam attach-role-policy \
  --role-name GitHubActionsDeployRole \
  --policy-arn arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryFullAccess
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

