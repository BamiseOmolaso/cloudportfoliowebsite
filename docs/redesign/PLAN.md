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

## Steps

- [x] **1. Setup** — worktree, plan, reference design saved.
- [x] **2. Dependencies** — `three` 0.186 (+ types) via npm; the three fonts via
  `next/font` (served from this site; 0 requests to Google). Keep the strict CSP: nothing loads from a CDN.
- [x] **3. Page shell** — `/preview` route; `SiteChrome` gate so this page
  hides the old top bar / footer / `pt-16`; design tokens + CSS scoped
  under `.pf` (no leakage into other pages); theme toggle (follows the
  system, remembers a choice). Bricolage uses the optical-size axis so the
  headline matches the reference.
- [ ] **4. Content file** — `src/content/portfolio.ts` with all copy,
  stats, patterns, record, timeline.
- [ ] **5. 3D scene** — `StackScene` client component (dynamic import,
  `ssr: false`), three from npm; reduced-motion and no-WebGL fallbacks.
- [ ] **6. Story + sections** — scroll cards, results, interactive
  pipeline, pattern cards, record, "why a doctor", contact.
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
node docs/redesign/shot.mjs http://localhost:3200/preview out.png --scroll=1400            # scrolled
```
