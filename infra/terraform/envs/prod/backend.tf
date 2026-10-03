# Remote state lives in a Cloudflare R2 bucket (S3-compatible, free tier).
# Only the non-secret parts are here; the account-specific endpoint and the
# access keys are supplied at `terraform init` time (see backend.hcl.example).
#
# The skip_* flags turn off AWS-only checks that R2 doesn't implement.
terraform {
  backend "s3" {
    bucket = "portfolio-tfstate"
    key    = "hetzner/prod/terraform.tfstate"
    region = "auto"

    use_lockfile = true

    skip_credentials_validation = true
    skip_region_validation      = true
    skip_requesting_account_id  = true
    skip_metadata_api_check     = true
    skip_s3_checksum            = true
    use_path_style              = true
  }
}
