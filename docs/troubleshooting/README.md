# Troubleshooting

Start here when something is broken or a check is red.

| File | Use it when |
|---|---|
| [01-how-to-find-the-problem.md](01-how-to-find-the-problem.md) | You want the **method**: how to go from "it's broken" to the exact cause. Read this once. |
| [02-ci-failures.md](02-ci-failures.md) | A pull request check or a workflow run is red. |
| [03-site-or-cluster-problems.md](03-site-or-cluster-problems.md) | The live site, a deployment or the cluster misbehaves. |
| [04-case-files.md](04-case-files.md) | Real problems from this project, what the evidence showed and the fix. Read these to learn the pattern. |

Older, task-specific runbooks live in [docs/infra/runbooks/](../infra/runbooks/): my IP
changed, release and rollback, and an earlier troubleshooting log.

New words are explained where they first appear. A **log** is the text a program writes about
what it is doing. A **check** is an automated test GitHub runs on a pull request. A
**pipeline** is the chain of steps that turns a code change into a running website.
