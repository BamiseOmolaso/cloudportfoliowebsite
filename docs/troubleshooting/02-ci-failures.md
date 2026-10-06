# A check or workflow is red

All commands need the GitHub CLI (`gh`) logged in. Replace the numbers with yours.

## Step 1: which check, which step

```bash
gh pr checks 104
gh pr view 104 --json statusCheckRollup -q '.statusCheckRollup[]|"\(.name): \(.conclusion)"'
gh run list --branch <branch> -L 5          # recent runs and their ids
gh run view <run-id> --log-failed           # text of only the failed steps
```

`pass` and `skipping` are fine. A `skipping` job is not a problem: change detection skips jobs
a pull request does not need (for example the website tests on a docs-only change).

## Step 2: match the symptom

| What you see | Most likely cause | What to do |
|---|---|---|
| **Lint & Type Check** red, message mentions a type or a file path | A real code or test mistake. Types are checked more strictly in CI than when you only run the tests. | `npx tsc --noEmit` locally; fix the line it names. |
| **Test Suite** red, `FAIL` and a test name | A real failing test. | `npx jest <path>` locally; read the diff it prints. |
| **Test Suite** red but `Tests: ... passed` appears | A step **after** the tests failed (for example the coverage upload). | Open the failed step; if it is a network error, re-run: `gh run rerun <run-id> --failed`. |
| Step fails with `EPROTO`, `handshake`, `ETIMEDOUT`, `503`, `rate limit` | A flaky or unreachable outside service, not your code. | Re-run once. If it repeats, make that step non-blocking (`continue-on-error: true`) when it is not essential. |
| **Image (app/migrator)** red during build | The Dockerfile build failed; read which `RUN` step. Often a `npm` or build error that also fails locally. | `docker build --target runner .` locally. |
| **Image** red at "Block critical vulnerabilities" | The scan found a CRITICAL weakness that has a fix. | Open the log table; update that package or the base image. |
| **Security Scan** red | `npm audit` found a vulnerable package. | Read the package name in the log; update it. |
| **Format and validate** or infra **Plan** red | Often a bad input such as `TF_VAR_ADMIN_CIDRS`, which must look like `["1.2.3.4/32"]`. | Read the plan error; see [04-case-files.md](04-case-files.md). |
| **gitleaks** or **GitGuardian** red | A secret-looking string was committed. | Remove it, **change the real secret**, and never push it again. |
| Check stays `pending` for ages | A runner queue, or a required check that never started because path filters skipped it. | Wait a few minutes; check the Actions tab. |

## Step 3: reproduce locally before you change CI

```bash
npm ci
npx tsc --noEmit        # types: what "Lint & Type Check" does
npm run lint
npm test                # what "Test Suite" does
docker build --target runner -t t .
```

If it fails on your machine, you can fix it at your desk and be sure. If it passes locally
but fails in CI, compare environments: Node version (CI uses 20), environment variables
and files that exist locally but are not committed.

## Step 4: after the fix

Push, then watch the same check go green. Do not merge on "it should be fine".
