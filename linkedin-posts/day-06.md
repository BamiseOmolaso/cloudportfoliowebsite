Day 6 of building a production-grade website like a cloud engineer would: infrastructure as code

The first version of any cloud project I ever built lived in the AWS console. Click "create VPC," click "create subnet," click "create security group," type a name, click save. Forty-five minutes later: an environment that nobody — not even me — could ever rebuild exactly.

The second version lives entirely in Terraform. Want a new environment? Copy the folder. Want to know why a security group has that specific rule? `git blame` says I added it three months ago and the PR description explains why.

Recipe vs meal analogy: the AWS console gives you a meal. It is ready, it is hot, you can eat it now. But after dinner, it is gone — and you cannot reproduce it without remembering every step you took. Terraform gives you the recipe. Same outcome, but you can hand it to anyone, run it ten times, get the same meal every time.

How my Terraform is structured:
- terraform/modules/ — reusable building blocks (vpc, rds, ecs, alb, security, secrets, ecr, github-oidc)
- terraform/envs/dev/, envs/staging/, envs/prod/ — composition layers that pick which modules to use and supply environment-specific values (CIDR ranges, instance sizes, certificate ARNs)
- State lives in S3 with DynamoDB locking, never on my laptop — so the source of truth is shared and concurrent applies cannot corrupt it

The discipline that comes with it:
- Every infrastructure change is a pull request
- CI runs `terraform plan` and posts the redacted diff as a PR comment
- A human reviews the diff before merge
- After merge, CI applies it automatically, with a manual approval gate on production

What I gained:
- I can recreate this entire stack in another AWS account in about 15 minutes (give or take an RDS provisioning wait)
- Every infrastructure decision has a paper trail — the PR that introduced it
- No more "I made a quick change in the console at 2am and forgot to document it"
- I can stand up a temporary environment, test something, tear it down, all in a single PR cycle

The trade-off: the first time you write a module, it is slow. Slower than clicking buttons. Every time after that, faster, safer, reviewable. The break-even is around the second time you have to do the same thing.

What I learned: the value of Terraform isn't the syntax — it is that infrastructure becomes a version-controlled, peer-reviewed artifact. Every "why is this resource set up like this?" question has a git blame answer.

The series continues with Day 7 — the CI/CD pipelines that test, scan, build, and deploy all of this automatically on every push.

How much of your current infrastructure could you rebuild from scratch in another account today, without remembering anything?
