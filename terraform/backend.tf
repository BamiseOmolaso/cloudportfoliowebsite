terraform {
  backend "s3" {
    bucket         = "omolaso-terraform-state"
    key            = "portfolio/terraform.tfstate"
    region         = "us-east-1"
    use_lockfile   = true
    encrypt        = true
  }
}