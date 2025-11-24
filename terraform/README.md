# Portfolio Infrastructure - Terraform

## Structure

```
terraform/
├── main.tf              # Main configuration
├── variables.tf         # Input variables
├── outputs.tf          # Output values
├── backend.tf          # S3 backend config
├── modules/
│   ├── networking/     # VPC, subnets, IGW
│   ├── security/       # Security groups
│   ├── rds/           # PostgreSQL database
│   └── ecs/           # ECS cluster and service
```