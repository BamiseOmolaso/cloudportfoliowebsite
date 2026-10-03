# Archived workflows

These two ran the earlier AWS version of the site. GitHub only runs files in
`.github/workflows/`, so they do nothing here. They are kept for reference.
To bring AWS back, move them into `.github/workflows/` and restore their `workflow_run` trigger.

- `deploy-app.yml`: built the image and deployed it to AWS ECS.
- `terraform.yml`: planned and applied the AWS Terraform in `terraform/`.
