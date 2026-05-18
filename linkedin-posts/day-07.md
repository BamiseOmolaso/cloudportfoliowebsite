Day 7 of building a production-grade website like a cloud engineer would: the CI/CD pipeline

Before CI/CD, my deploy process was: open terminal, git push, ssh to server, run npm install, restart the process, hope. The whole thing took five minutes if it worked, two hours if it didn't, and there was no record of who deployed what when.

Now: open a PR, watch the checks, merge, watch the deploy, refresh the site. The pipeline does in about 8 minutes what used to take me half a day, and the audit trail is the GitHub Actions history.

The branch model: feature → develop → staging → main. Only main deploys to AWS. develop and staging are review checkpoints — instead of running three actual AWS environments (which would triple my bill), the branches themselves become the review stages. Each PR is a real human gate. The actual rollout happens once code reaches main.

What runs on every push (CI Pipeline):
- Lint + TypeScript type check
- Jest unit + integration tests
- Docker image build
- Security scans: npm audit, Trivy on the image, TruffleHog for committed secrets, Snyk
- Terraform validate

If any of these fail, the PR cannot merge.

What runs after CI passes on main (in parallel):
- Deploy Application: build Docker → push to ECR → register a new ECS task definition → update the service → verify /api/health
- Terraform Infrastructure: terraform plan → manual approval gate → terraform apply

Both gated on the production GitHub Environment for human approval. Both restricted with a check that the upstream CI run came from this repo (not a fork) so a malicious PR cannot trigger a deploy with my secrets.

A small optimization I made recently: each workflow starts with a `detect-changes` job that diffs the triggering commit. App-only merges → only the Deploy Application workflow fires the prod-approval gate. Terraform-only changes → only the Terraform Infrastructure workflow fires. Script-only or docs-only merges → both short-circuit and nothing approval-gates at all. Before this, every push to main queued two approval gates; one of them was usually a no-op.

What I learned: CI/CD isn't just automation, it is the contract that says "if these checks pass, this is safe to ship." The first time a security scan catches a real vulnerability in a dependency, or a type check catches a refactor mistake before it reaches prod, you stop thinking of CI as overhead and start thinking of it as the only honest reviewer you have.

The series continues with Day 8 — the 12-commit bug that taught me what "works on my machine" actually means.

What is the most expensive bug you've shipped that a one-line check would have caught?
