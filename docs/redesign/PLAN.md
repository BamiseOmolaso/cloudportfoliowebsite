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
- [x] **7. New content + selected work** — "Selected work" (six projects
  with status pills; only public repos are linked, private work says so),
  the Terraform week-by-week timeline (challenge weeks 1-3, then this
  site), the single-VPS stack drawn with the same diagram engine (tabs:
  request path / backups / hardening), and "Found and fixed" (six
  lessons). Facts checked against each repo's README and GitHub
  visibility. 35 content tests, including guards that no private repo is
  linked and that the tabs match the diagram.
  **Left out on purpose** (owner to decide): MivarMart (lives under another
  GitHub account), the inherited PHP/WordPress app, the Python/Go exercise
  folders, the wedding site.
- [x] **8. Live data + what the redesign had dropped** — an audit of the
  old site and CV found omissions, now restored: a full **YouTube section**
  (real thumbnails, Subscribe), the **newsletter** sign-up (+ site links in a
  footer, since the header hides them on phones), **About** in the header,
  **latest posts** and **more projects** from the database (they appear on
  their own; nothing shows without a database), and the **stack** as three
  sideways-scrolling rows in learning order (solid = used in projects,
  dashed = learning). **Testimonials** are placeholders that never render
  in production until a real one is added.
  Findings: the old page's three hard-coded video titles did not match the
  videos (checked against YouTube's oEmbed data) — now the real titles.
  Skill levels were set from evidence in the repos; Ansible, GitLab, GitOps,
  Kubernetes, Azure and GCP are marked "learning" until a project uses them.
  Bug caught by the overflow check: the scroller widened the page on phones.
- [x] **9. Quality pass** — all checked, not assumed:
  - **Phone/tablet menu** (hamburger up to ~900px): Escape, outside tap and
    choosing a link close it; focus returns to the button; sections land
    below the fixed header (scroll-margin).
  - **Keyboard:** skip link; logical Tab order; with real key presses the
    whole story works without a mouse and focus follows the active card
    (it used to be lost when a card disappeared).
  - **Contrast:** every text/background pair in both themes is >= 4.5:1
    (light-theme teal and amber darkened; inactive rail labels raised).
  - **Reduced motion:** 0 animated elements, no packets, the scroller is a
    static wrapping list; with it off, 56 elements animate.
  - **Sizes:** 390 / 768 / 1000 / 1280 / 1920 — no horizontal overflow.
  - **Production build:** passes; `/preview` is 13.4 kB (115 kB first load)
    vs 138 kB for the old `/`; every section is server-rendered; the
    testimonial placeholders, wedding site, server address, hotel name and
    old email are absent from the served HTML; security headers intact; no
    console/CSP errors in a real browser.
  - **Whole test suite:** 17 suites / 205 tests pass.
  Bugs found and fixed on the way: the hamburger was visible on desktop (CSS
  specificity), the scroller widened the page on phones, focus was lost when
  a story card disappeared, the brand wrapped on tablets.
- [x] **10. Go live** — new page is `/`; `/preview` removed; real metadata + Open Graph in the root layout. PR opened only with the owner's go.
  *(Only after the owner has reviewed it locally.)*

## Running it locally

```sh
cd ~/coding_projects/.worktrees/portfolio-redesign
npm run dev -- -p 3200        # then open http://localhost:3200/
```

No `.env` is needed: with no database the blog/projects calls return
empty lists and the page still renders.

## Looking at it without a browser window

`docs/redesign/shot.mjs` drives headless Chrome (macOS path) and saves a
screenshot — light or dark, any width, any scroll position, WebGL included:

```sh
node docs/redesign/shot.mjs http://localhost:3200/ out.png            # light, 1280x800
node docs/redesign/shot.mjs http://localhost:3200/ out.png --dark --w=390 --h=844   # dark, phone
node docs/redesign/shot.mjs http://localhost:3200/ out.png --scroll=1400 --settle=5000   # scrolled (wait for the camera)
node docs/redesign/shot.mjs <url> out.png --after="document.title"    # run JS after scrolling; prints the result
node docs/redesign/shot.mjs <url> out.png --init="HTMLCanvasElement.prototype.getContext=()=>null"   # simulate no WebGL
```

It also prints any browser console errors. Scroll positions for the story
at 1280x800 (runway = 6 x 92svh): hero 0 · edge 904 · app 1507 · data 2109 ·
security 2712 · cost 3314.

```sh
```
