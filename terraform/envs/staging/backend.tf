terraform {
  backend "s3" {
    # Use your existing bucket or create new one with bootstrap.sh
    bucket = "omolaso-terraform-state" # Your existing bucket
    # bucket         = "portfolio-tfstate-main"  # Or use new bucket
    key          = "envs/staging/terraform.tfstate"
    region       = "us-east-1"
    use_lockfile = true
    encrypt      = true
  }
}

