terraform {
  backend "s3" {
    # Use your existing bucket or create new one with bootstrap.sh
    # Option 1: Use existing bucket (recommended if you already have infrastructure)
    bucket         = "omolaso-terraform-state"  # Your existing bucket
    
    # Option 2: Use new bucket (uncomment and run bootstrap.sh first)
    # bucket         = "portfolio-tfstate-main"
    
    key            = "envs/prod/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "portfolio-tf-locks"
    encrypt        = true
  }
}

