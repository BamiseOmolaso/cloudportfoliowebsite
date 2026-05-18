I'm a medical doctor,

Six month ago I built a cloud portfolio site. Started the easy way, one weekend, used Vercel and Supabase, site is live. I broke it down and started over.

This time, from a solutions architect perspective, same idea, different stack:  AWS, Terraform, Version control, every layer linked to something I would actually use on the job even though it may seem like an overkill for a simple portfolio site, the result? A production-grade cloud portfolio that runs Next.js + PostgreSQL + Redis on AWS ECS Fargate behind an ALB. I learned so much than any tutorial could have taught me.

I used Cursor as my AI pair and got most of the way there, then exams got in the way and project paused, using the pause script I had written, resources scaled to 0, and cost down from $50-100 AWS bills per month to less than $5 a month. A week ago, with claude code, fixed the bugs i shipped, hardened the security and properly ship this time.

It is now live at https://lnkd.in/eHCFvr6Q, fully Terraform-managed across dev, staging and production with GitHUB OIDC into AWS, CI/CD pipelines gated by tests and security scans.

The interesting part is everything i broke and fixed along the way and what those bugs taught me about how production systems actually work.

The architecture in one diagram, in plain english: most web apps, typically comes down to three layers:

Frontend : What the user sees in the browser. Mine was server-rendered Next.js 14 for speed and SEO.
App Layer: Where the logic runs; who is logged in, what they can do, what to send back. The same Next.js process, exposing API routes, containerized with Docker)
Database: Where state lives between requests (PostgreSQL for blog posts and subscribers, Redis for rate-limit counters)

Underneath those three layers sits the layer that makes everything else manageable: version control and around that foundation, the things that turn a side project into a production system:
- CI/CD on every push: tests, type checks, security scans, before deployment
- IaC - Infrastructure as code using Terraform across dev/staging/prod
- GitHub OIDC into AWS with secrets in a secret manager and never in the repo
- pause/resume bash script to scale down resources and save on cost

Over the next few days, I will walk through every meaningful tool choice, what i picked, rejected, and the effect of each decision.

Simple outline:
Day 2 - Why i ripped out Supabase for Postgres on RDS
Day 3 - Why I picked the harder cloud option (Vercel → ECS Fargate)
Day 4 - GitHub OIDC over long-lived AWS keys (the access layer)
Day 5 - Where the actual secrets live (AWS Secrets Manager)
Day 6 - Infrastructure as Code with Terraform
Day 7 - CI/CD: gated deploys, branch flow, the trust boundary
Day 8 - The 12-commit autoprefixer saga, why "works on my machine" really happens
Day 9 - Three production bugs that taught me how production differs from local
Day 10 - The $1.50/month side project: pause/resume cost engineering

The repo is self-explanatory:
https://lnkd.in/eNq9PthH

Follow along for a real production stack explained from the ground up.

What's a tool decision in your own stack you'd make differently if you were starting today?
