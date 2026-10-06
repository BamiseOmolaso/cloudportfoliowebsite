# Case files

Real problems from this project. Each shows the **evidence**, the **cause** and the **fix**,
so the pattern is easy to recognise next time. Add new ones at the top.

---

## Image build failed in `next/font` (October 2026)

- **Looked like:** `Image (app)` red, sometimes on a green change; a re-run often passed.
- **Evidence:** `An error occurred in next/font. TypeError: Cannot read properties of null`
  during `npm run build`. It clustered when many builds started at once.
- **Cause:** the build downloaded the Google fonts from Google, and sometimes got an
  unexpected reply (probably throttling of a burst of requests from GitHub's servers).
- **Fix:** keep the font files in the repository (`src/app/fonts/`) and load them with
  `next/font/local`. The build now needs no network and the site looks the same.
- **Lesson:** a build that depends on an outside service will fail whenever that service does.
  Prefer to vendor what the build needs.

## Coverage upload crashed the Test Suite (October 2026)

- **Looked like:** `Test Suite` red on a documentation pull request.
- **Evidence:** the failed log showed `Tests: 425 passed`, then the step "Upload coverage to
  Codecov" failed with `write EPROTO ... SSL alert handshake failure`. Re-running gave the same.
- **Cause:** a network (TLS) error inside an outside service's action. It crashed before the
  setting `fail_ci_if_error: false` could apply. Nothing to do with the code.
- **Fix:** `continue-on-error: true` on that one step, since coverage is nice to have.
- **Lesson:** when the tests pass and a later step fails, it is the environment, not the change.

## Type-check failed after a test change (October 2026)

- **Looked like:** `Lint & Type Check` red after the Next.js 15 upgrade, although tests passed locally.
- **Evidence:** the error named the blog route test and said `params` had the wrong type.
- **Cause:** Next 15 makes route `params` a Promise. The route was updated, but the tests still
  passed plain objects, which the tests tolerated and the type-checker did not.
- **Fix:** pass `Promise.resolve({...})` in the tests.
- **Lesson:** run `npx tsc --noEmit` after every edit, not only the tests.

## Next 15 production build failed (October 2026)

- **Evidence:** `next build` printed an invalid route type error and an unrecognised
  `swcMinify` option.
- **Cause:** Next validates route signatures only during `next build`, and `swcMinify` was
  removed in Next 15.
- **Fix:** type `params` as a `Promise`; delete `swcMinify`.
- **Lesson:** a successful dev server or test run does not prove the production build works.

## Infra plan failed on a secret (October 2026)

- **Evidence:** the Terraform plan step errored on `admin_cidrs`; first the value was empty,
  then it was not a list.
- **Cause:** the GitHub secret `TF_VAR_ADMIN_CIDRS` must be a JSON list like
  `["203.0.113.7/32"]`, and shell quoting had stripped the quotes.
- **Fix:** set it with `gh secret set TF_VAR_ADMIN_CIDRS` and paste at the prompt.
- **Lesson:** when a value is wrong, look at its exact format, not only that it exists.

## The tab icon was not my logo (October 2026)

- **Evidence:** `public/favicon.svg` already showed the logo, but the browser showed another icon.
- **Cause:** `src/app/favicon.ico` (the framework default) took precedence over the SVG.
- **Fix:** regenerate the `.ico` from the SVG and add the missing app icons.
- **Lesson:** when a change has no effect, ask "is something else overriding it?".

## "AVIF returned 400" was a bad test (October 2026)

- **Evidence:** a request for an AVIF image returned 400.
- **Cause:** the test used a made-up image path; the 400 came from the path, not the format.
- **Fix:** repeat the test with a real image URL, which showed the format behaved correctly.
- **Lesson:** make sure the test itself is valid before believing its result.
