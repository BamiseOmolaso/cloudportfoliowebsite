Day 9 of building a production-grade website like a cloud engineer would: three bugs that taught me production

Local works. CI passes. You ship. The site comes up. Then over the next few days, you find three things that absolutely should have worked but did not, because production has assumptions your laptop does not.

Bug 1 — The container health check that killed every task

The ECS task definition had a container-level healthCheck doing `curl -f http://localhost:3000/api/health`. ECS would start the container, wait 30 seconds, run the check. If it failed, kill the container, start another one.

The problem: the Alpine Linux base image my Dockerfile used does not ship curl. So every check failed. Every container died. ECS kept replacing them. The service cycled tasks forever.

The fix was not to install curl. It was to delete the container-level check entirely and rely on the ALB target group's health check, which runs from outside the container and does not care what is installed inside. The container's job is to listen on port 3000 and answer /api/health. Anything beyond that is the orchestrator's responsibility.

Bug 2 — The verify-deployment step that always failed

Every deploy was succeeding — the new image was running, the site was healthy — but the post-deploy "Verify Deployment" step in my CI was always marking the deploy as failed. So my GitHub Actions dashboard was a sea of red checkmarks for a green site.

The verify step did `curl http://<alb-dns>/api/health` and expected a 200. After I added HTTPS, the HTTP listener now redirects (301) to the HTTPS one. Curl without `-L` does not follow redirects. The check saw a 301 every retry, ran 30 retries, gave up, marked the deploy failed.

The fix: add `-L` to follow the redirect, and `-k` because the ACM cert is bound to the custom domain, not the raw ALB DNS the verify step was hitting.

Bug 3 — The workflow_run that fanned out

Every push to main was queuing two prod approval gates: one for the Deploy Application workflow, one for the Terraform Infrastructure workflow. Even when the merge was app-only with no infrastructure change, the Terraform workflow still triggered and sat at the approval gate as a no-op.

Why? GitHub Actions' `workflow_run` trigger does not accept path filters the way `push` and `pull_request` do. The downstream workflow cannot know what the upstream changed.

The fix: a `detect-changes` job at the top of each workflow that diffs HEAD~1..HEAD and short-circuits the rest of the workflow when no relevant files changed. App-only merges → only Deploy runs. Terraform-only → only Terraform runs. Workflow YAML or docs-only changes → both short-circuit.

What I learned: production is where assumptions go to die. Every one of these was a "but it worked yesterday" moment, or a "but that should not be a problem" assumption. The fix is never to be smarter the first time — it is to design pipelines that surface assumption breaks loudly, so the next time it happens, the failure points exactly at the cause.

The series continues with Day 10 — the bash script that takes the entire stack from $200/month to about $1.50/month when I am not using it, and what it costs me to do that.

What is a production bug you have shipped that you would never have caught locally?
