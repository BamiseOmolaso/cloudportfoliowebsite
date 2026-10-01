# Portfolio redesign — plan and checklist

Goal: replace the home page (`/`) with the 3D "exploded stack" design
(`reference/portfolio-design-v2.html`), updated with the work done since,
without touching the rest of the site (blog, projects, contact, admin).

Branch: `feat/portfolio-redesign` (a git worktree off `develop`).
Reference design: [reference/portfolio-design-v2.html](./reference/portfolio-design-v2.html) — open it in a browser to compare.

## How we stay safe

- **One step = one commit = one tag** (`redesign-step-N`). Each step ends
  with a check (build, lint, a page loads) before the commit.
- **The old home page stays untouched** until the last step. The new one is
  built at `/preview`; going live is a one-line swap.
- **Undo a step:** `git revert <commit>` (keeps history) or, in the
  worktree, `git reset --hard redesign-step-<N-1>` (throws the step away).
- **Throw everything away:** `git worktree remove --force
  ../.worktrees/portfolio-redesign && git branch -D feat/portfolio-redesign`.
  `develop` and your uncommitted work in the main folder are never touched.

## Content rules (decided with the owner)

- **No wedding site, anywhere.**
- **Generic names:** "a hotel booking app", "self-hosted automation on a
  VPS". No project names, server IPs, key paths, hostnames, or secret values.
- **Idle cost: "under $5 / month"** — one number everywhere.
- **Only claim what's verified.** Don't say "all databases are backed up"
  etc. Describe incidents as lessons, never unfinished security gaps.
- Include the **Terraform challenge** (Week 1 flat config → Week 2 modules
  + remote state → Week 3 secure two-tier) as a timeline.
- More content is coming — keep it in **one data file**
  (`src/content/portfolio.ts`) so adding a project is a small edit.

## Accuracy findings (checked against the repo's Terraform and docs)

The original design made claims the code doesn't back up. The diagram and
story copy now say only what is true:

| Design said | Reality | Now |
|---|---|---|
| Route 53 resolves the domain | DNS is a CNAME at a DNS provider; no Route 53 in Terraform | "DNS record · CNAME" |
| (implied) private network tier | **Public subnets only**, two AZs, internet gateway, no NAT, no private subnets; tasks have public IPs | Drawn that way |
| Redis in the stack | **Redis Cloud**, outside AWS | Dashed, outside the AWS box |
| "IAM roles name specific resources instead of wildcards" | The **task** role is scoped to its two secrets, but the **GitHub OIDC role** has `Resource = "*"` in 5 places and broad grants (`iam:*`, `ec2:*`, …) | Claim removed. Story now covers the security-group chain and OIDC trust (limited to this repo's branches) |
| "A compromised pipeline can only touch what it was allowed to" | Not true given the broad role | Reworded |

| Pipeline "gated by security scans" | Lint, type-check and tests **gate** the build. The scans (npm audit, secret check, Snyk, Trivy) have `continue-on-error: true`: they **report** to GitHub's Security tab but don't block | Scans shown as "reported" in the demo; footnote says so |
| "Staging and production wait for approval" | GitHub environments: development none, staging a **wait timer**, production **required reviewers** | "dev automatic · staging timer · prod approval" |

Follow-up (separate from the redesign): tighten the OIDC role policies in
`terraform/modules/github-oidc/main.tf`, then the page can honestly claim
least privilege. Also decide whether the security scans should block
(remove `continue-on-error`) and then say "gated by scans".

## Steps

- [x] **1. Setup** — worktree, plan, reference design saved.
- [x] **2. Dependencies** — `three` 0.186 (+ types) via npm; the three fonts via
  `next/font` (served from this site; 0 requests to Google). Keep the strict CSP: nothing loads from a CDN.
- [x] **3. Page shell** — `/preview` route; `SiteChrome` gate so this page
  hides the old top bar / footer / `pt-16`; design tokens + CSS scoped
  under `.pf` (no leakage into other pages); theme toggle (follows the
  system, remembers a choice). Bricolage uses the optical-size axis so the
  headline matches the reference.
- [x] **4. Content file** — `src/content/portfolio.ts` holds all copy
  (typed). `src/__tests__/content/portfolio-content.test.ts` enforces the
  content rules (no wedding site, no addresses/paths/secrets, one idle-cost
  figure, https links only); mutation-checked.
- [x] **5. Scroll story with an architecture diagram** — first built as a
  3D scene (tag `redesign-step-5` keeps it), then replaced at the owner's
  request by a flat AWS-style diagram: `src/content/architecture.ts` (data)
  + `ArchitectureDiagram` (SVG renderer, a "camera" that zooms to each
  step's region, request packets along real paths, paused state) +
  `StackStory` (scroll runway, cards, rail, pause/resume). Renders on the
  server too; no WebGL, no `three`. Tests guard the data and the content
  rules (17 passing). Checked in light/dark, desktop and phone.
  **Made the scrolling obvious** (owner feedback: visitors may not know
  to scroll): a "Follow one request through the stack ↓" button in the
  hero (every screen size), numbered badges 1-5 on the diagram, Back /
  Next buttons on every card, a clickable progress rail + dots on phones,
  a thin progress bar, and a bobbing "Scroll" cue. All of them just scroll
  the page, so scroll position stays the single source of truth. Tested by
  clicking through the whole tour (hero button, every Next, Back, rail).
  **Background:** the blueprint grid is gone. Layered gradient blend (violet
  and indigo behind the diagram, a hint of teal low-left), a darker shade
  behind the text, fine film grain (data-URI SVG; allowed by the CSP) and a
  bottom fade so the hero meets the page colour without a seam. **Dark is
  now the default** (matches the blog/projects pages); the toggle switches
  to light and remembers the choice. To screenshot light mode:
  `--init="localStorage.setItem('pf-theme','light')"`.
- [x] **6. Sections** — results (count-up), interactive pipeline,
  pattern cards with animated diagrams, record, "why a doctor", writing,
  contact (copy email) + footer. Pipeline stages and pattern copy were
  checked against `.github/workflows` and the GitHub environments. Phone:
  no sideways overflow. Tested: "Break a test" stops at the tests and skips
  the rest; copy-email falls back to select-text when the clipboard is
  blocked.
- [ ] **7. New content** — second stack (VPS), Terraform timeline, backups,
  hardening, incident method; apply the content rules above.
- [ ] **8. Live data** — keep the latest posts/projects from the database
  (`/api/blog`, `/api/projects`) in "Building in public"; graceful empty state.
- [ ] **9. Quality pass** — mobile widths, keyboard/focus, reduced motion,
  contrast in both themes, `npm run build`, lint, existing tests.
- [ ] **10. Go live** — swap `/` to the new page, remove `/preview`, open a PR.
  *(Only after the owner has reviewed it locally.)*

## Running it locally

```sh
cd ~/coding_projects/.worktrees/portfolio-redesign
npm run dev -- -p 3200        # then open http://localhost:3200/preview
```

No `.env` is needed: with no database the blog/projects calls return
empty lists and the page still renders.

## Looking at it without a browser window

`docs/redesign/shot.mjs` drives headless Chrome (macOS path) and saves a
screenshot — light or dark, any width, any scroll position, WebGL included:

```sh
node docs/redesign/shot.mjs http://localhost:3200/preview out.png            # light, 1280x800
node docs/redesign/shot.mjs http://localhost:3200/preview out.png --dark --w=390 --h=844   # dark, phone
node docs/redesign/shot.mjs http://localhost:3200/preview out.png --scroll=1400 --settle=5000   # scrolled (wait for the camera)
node docs/redesign/shot.mjs <url> out.png --after="document.title"    # run JS after scrolling; prints the result
node docs/redesign/shot.mjs <url> out.png --init="HTMLCanvasElement.prototype.getContext=()=>null"   # simulate no WebGL
```

It also prints any browser console errors. Scroll positions for the story
at 1280x800 (runway = 6 x 92svh): hero 0 · edge 904 · app 1507 · data 2109 ·
security 2712 · cost 3314.

```sh
```
