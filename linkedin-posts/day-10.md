Day 10 of building a production-grade website like a cloud engineer would: the $1.50/month side project

A real production-grade architecture — ALB + ECS Fargate + RDS + Secrets Manager + VPC + CloudWatch — runs about $200-250 a month if you leave it on all the time. For a personal portfolio site that gets a few hundred visits a week, that is absurd.

So I built a pause script.

When I am not actively touching the site, I run:

./scripts/pause.sh prod us-east-1

Two minutes later, the stack costs me about $1.50 a month. Two minutes after that, ./scripts/resume.sh prod us-east-1 brings it back.

What gets destroyed when paused:
- ALB (~$18/mo) — destroyed
- ALB listeners (HTTP and HTTPS) — destroyed
- Target group — destroyed
- ECS autoscaling targets and policies — destroyed
- ECS service desired count → 0 (no Fargate tasks run, no Fargate billing)
- RDS instance → stopped (no compute charge; only the storage charge stays)

What gets preserved:
- VPC, subnets, security groups (all free)
- RDS data (storage is the only cost while stopped, about $2/mo for 20GB)
- ECR images (the code, ready to redeploy)
- Secrets Manager entries
- Terraform state in S3
- The ECS cluster itself (empty cluster is free)

Resume is the reverse, but the order matters: RDS first (so ECS tasks can connect to a working database when they boot), then `terraform apply -var=paused_mode=false` to recreate the ALB and re-scale ECS.

The one manual step that survives every cycle: DNS. Pausing destroys the ALB. Resuming creates a brand new one with a different DNS name. The CNAME at my DNS provider has to be re-pointed. My resume script prints the new ALB DNS and runs a `dig` comparison against the current CNAME so the operator sees at a glance whether the update is still pending.

Trade-offs I knowingly accept:
- Single-AZ RDS deployment (saves ~50% on the database, costs me potential downtime if AWS has an AZ failure)
- Publicly accessible RDS (with a tight security group), so I do not need NAT gateways or a bastion
- HTTP → HTTPS on a single ALB instead of CloudFront
- ECS tasks get public IPs (saves a NAT gateway, costs me one route hop)

Each of those is a deliberate dial: cheap to expensive on the same architecture. A real product would dial them all the way up. A learning portfolio dials them down.

What I learned: "production-grade" does not mean "production-budget." You can run the same architecture pattern at $5 a month or $5000 a month depending on the redundancy and availability dials. The architecture is the same; the dials are the cost. Knowing which dials to turn for which use case is the actual engineering.

That wraps the series. Day 1 was the why. Days 2-7 were the building blocks. Days 8-10 were what shipping it taught me. The whole thing lives at https://lnkd.in/eNq9PthH if you want to read the code or copy the patterns.

How much does your side project cost per month when nobody is using it?
