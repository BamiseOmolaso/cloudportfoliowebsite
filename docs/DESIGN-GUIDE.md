# Design and build guide

**Read this before you change anything on this site.** It is the single source of truth for
how the site looks, how it is written, how it is built and how changes are made. It exists
so that any person, or any AI model, can pick the project up and keep it consistent. If a
rule here conflicts with your habits, follow this guide. If the guide is wrong, fix the guide
in the same change.

> The owner's standing preference: **what exists looks right, so extend it, do not redesign
> it.** New work must look like it was always part of the site.

---

## 0. The rules that matter most

1. **Do not change the look of existing pages** unless asked. Add to the system; do not
   replace it.
2. **Every clickable action is a button in a rectangle.** The primary one is the solid
   violet box (`btn primary`). A bare text link with an arrow ("Read more →") is never an
   action. Section 5 has the exact classes.
3. **Use the tokens, never raw colours.** Public pages use CSS variables (`var(--accent)`),
   admin pages use the themed Tailwind palette (`purple-600`, `gray-900`). No new hex codes.
4. **Say each idea once, in plain words.** No filler, no buzzwords (section 7).
5. **Content lives in one place** (section 8). Do not paste the same text into two files.
6. **Everything must work with a keyboard and a screen reader**, in dark and light, on a
   phone and a desktop (section 10).
7. **Nothing secret, personal or internal goes in the repository.** It is public (section 11).
8. **A change is not done until it is tested, looked at in a browser, documented, and the
   checks pass** (section 13).
9. **Ask before opening a pull request or merging.** Commit freely on a feature branch;
   never push to `main` (section 14).
10. **Explain terms.** Define abbreviations the first time they appear, in chat and in docs,
    and add them to the doc's glossary.

---

## 1. What this site is

A portfolio for a doctor turned cloud and DevSecOps engineer. Its job is to persuade a
hiring manager or client, in this order: **Attention** (hero and tools), **Interest**
(numbers, projects, how it is built), **Desire** (why a doctor, the teaching channel),
**Action** (one clear way to get in touch). The site is itself a demonstration of the work:
it runs on a server built with Terraform and Ansible, k3s Kubernetes and GitOps (see
`docs/infra/00-architecture-overview.md`).

Feel: **calm, confident, technical, quietly warm.** Dark first, one violet accent, generous
space, large display headings, small monospace labels. Not corporate, not playful, not a
template.

---

## 2. Stack and map of the code

Next.js 14 (App Router), TypeScript, Tailwind, Prisma + PostgreSQL, Jest. Images are stored
in Cloudflare R2, email is sent with Resend, deploys are GitOps through ArgoCD.

| Where | What lives there |
|---|---|
| `src/app/` | Routes. `page.tsx` per route; `api/` for endpoints |
| `src/app/portfolio.css` | **All CSS for the public redesign**, scoped under `.pf` |
| `src/app/globals.css`, `tailwind.config.js` | Tailwind base and the themed palette used by older pages and the admin |
| `src/app/fonts.ts` | The three fonts (loaded at build time, served from this site) |
| `src/components/portfolio/` | Public sections and parts (Hero, Work, Patterns, BrandIcon, FlowStrip, ...) |
| `src/components/admin/` | Admin building blocks (`ui.tsx`, `forms.tsx`, `RichEditor.tsx`, ...) |
| `src/components/layout/SiteChrome.tsx` | Decides which header/footer wraps which route |
| `src/content/portfolio.ts` | **The default text of the whole site** (see section 8) |
| `src/content/editable.ts` | Which of that text the admin may edit |
| `src/content/sections.ts` | Which sections each page has, and how they are shown/hidden/ordered |
| `src/content/architecture.ts`, `project-views.ts` | The architecture diagrams and their tabs |
| `src/content/brand-icons.ts` | Vendored tool logos (generated, do not hand-edit) |
| `src/lib/` | Server helpers (db, storage, email, analytics, security, rate limiting) |
| `prisma/` | Schema, migrations, seed SQL |
| `docs/infra/` | Numbered, teaching-style docs. `09-site-structure-and-content.md` covers the site |
| `docs/redesign/shot.mjs` | Screenshot tool for checking your work in a real browser |

---

## 3. Three surfaces, three rules

The site has three visual surfaces. Use the right system for each and never mix them.

| Surface | Routes | Styling | Wrapper |
|---|---|---|---|
| **Redesigned public pages** | `/`, `/about`, `/learning` | Plain CSS in `portfolio.css`, every rule under `.pf` | `PortfolioShell` (its own header and footer) |
| **Older public pages** | `/blog`, `/projects`, `/contact`, `/newsletter`, detail pages | Tailwind classes using the themed palette | `SiteChrome` adds the redesigned header (`variant="bar"`) and footer |
| **Admin panel** | `/admin/*` | Tailwind + the primitives in `src/components/admin/` | Its own sidebar layout (`AdminLayoutClient`) |

Rules:

- A new **public page in the redesign style** uses `PortfolioShell` and `.pf` classes. Add its
  route to `BARE_ROUTES` in `SiteChrome.tsx`, or the site will wrap it twice.
- Content from the redesign shown inside an older page (a diagram, the writing cards) is
  wrapped in `<div className="pf pf-embed ...fontVars" data-theme="dark">`.
- Do **not** add Tailwind colour classes inside `.pf` sections, and do not add `.pf` styles
  to admin screens.
- Every new `.pf` rule starts with `.pf `. Unscoped CSS is only allowed for shared bits that
  must work on older pages too (`.brand-icon`, `.flow`).

---

## 4. Design tokens

### Colour (public, in `portfolio.css`)

| Token | Dark | Light | Use |
|---|---|---|---|
| `--bg` | `#07070f` | `#f5f4fa` | Page background |
| `--surface` | `#11111e` | `#ffffff` | Cards, inputs |
| `--surface-2` | `#181829` | `#eceaf6` | Raised surfaces |
| `--ink` | `#ecebf7` | `#17152b` | Main text |
| `--ink-2` | `#9d9cb8` | `#5a5875` | Secondary text, labels |
| `--line` | `#25253d` | `#d5d2e6` | Borders and dividers |
| `--accent` | `#9b7bff` | `#5b3dd6` | The violet: buttons, links, focus |
| `--accent-2` | `#4fd1c5` | `#0a766d` | The teal: positive details |
| `--accent-ink` | `#0c0c16` | `#ffffff` | Text on an accent background |
| `--warn`, `--bad` | amber, red | darker | Warnings, errors |

The admin and older pages get the same values from the redefined Tailwind `gray`, `purple`
and `indigo` scales in `tailwind.config.js` (`gray-950` is the background, `gray-900` cards,
`gray-800` borders, `purple-600` the primary button). Changing a value means changing it in
**both** `portfolio.css` and `tailwind.config.js`.

Status colours in the admin: emerald = published/good, amber = in progress/needs work,
red = error/bounced/destructive, purple = edited/selected, grey = draft.

### Type

| Role | Font | Where |
|---|---|---|
| Display | Bricolage Grotesque (`--font-display`) | `h1`, `h2`, `h3`, big numbers |
| Body | Hanken Grotesk (`--font-body`) | Everything else |
| Mono | JetBrains Mono (`--font-mono`) | Small uppercase labels, chips, code, dates |

Headings use tight tracking (`letter-spacing: -0.025em`), `text-wrap: balance`, and
`clamp()` sizes so they scale smoothly. Section headings are `clamp(1.9rem, 4.6vw, 3rem)`,
weight 800. Never add another font.

### Shape and space

- Radius: `--radius: 8px` for buttons and inputs, `12px` for cards. Buttons are **rectangles**
  (small radius), not pills. Only chips and status badges are fully rounded.
- Content width: `.wrap` is `max-width: 70rem`, centred. Admin content is `max-w-6xl`.
- Section spacing: `section.block` uses `padding-block: clamp(2.6rem, 6vw, 3.6rem)`. Do not
  add large margins between sections; the padding is the rhythm.
- Light and dark: the page sets `data-theme` on `.pf`. Anything you add must read in both.

---

## 5. Components and the exact classes

### Buttons (the most important rule)

**Public (`.pf`):**

| Need | Markup | Look |
|---|---|---|
| Main action | `<a className="btn primary">` or `<Link className="btn primary">` | Solid violet rectangle |
| Secondary action | `className="btn"` | Outlined rectangle; border turns violet on hover |
| Action inside a card that is itself a link | `<span className="btn primary">` | A button drawn inside the card (never a nested link) |

Rules:

- **Every "Read more", "See all", "View", "Repository", "Next step" is a `btn primary`.** Text
  arrows (`→`) belong *inside* the button label, not instead of the button.
- One primary button per intent per section. A second action is a plain `btn`.
- Buttons in a row of cards align to the bottom of their card (cards use
  `grid-template-rows: auto auto 1fr auto`).
- Never underline a button; `.btn:hover` already removes it.

**Older pages and admin (Tailwind):** use the `button()` helper from
`src/components/admin/ui.tsx`.

| Kind | Look | Use |
|---|---|---|
| `button('primary')` | Solid violet rectangle | The main action on the screen |
| `button('secondary')` | Violet-tinted rectangle with a violet ring | Edit, View, Refresh |
| `button('ghost')` | Violet text, tint on hover | Back links, low-emphasis |
| `button('danger')` | Red text with a red ring | Delete and other destructive actions |

For the few older public pages that cannot import it, the equivalent classes are
`inline-flex items-center justify-center gap-2 rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-500`.

### Public building blocks

| Class / component | Use |
|---|---|
| `.wrap` | Centres content at 70rem |
| `section.block` + `.sec-head` | A section and its heading group (`h2`, optional `p` at most two lines) |
| `.label` | The small uppercase mono "eyebrow". **Use sparingly**: not on every section |
| `.rise` | Scroll reveal; adds a fade-up. Add to a section's head and main blocks |
| `.proj`, `.post`, `.pat`, `.wcard` | Cards (12px radius, `--surface`, `--line` border, border turns violet on hover) |
| `.chips` + `ToolChip` | Technology tags with their logo |
| `BrandIcon` | A tool's logo in the surrounding text colour (section 6) |
| `FlowStrip` | A one-line flow ("Visitor → Cloudflare → Traefik → ...") with logos |
| `Diagram` / `ArchitectureDiagram` / `StackTabs` | Architecture drawings with step-by-step tabs |
| `.marquee` | The moving logo row; pauses on hover; still and wrapped with reduced motion |

### Admin building blocks (`src/components/admin/`)

| Piece | Use |
|---|---|
| `PageHeader` | Every admin screen starts with it: title, one-line subtitle, actions on the right |
| `Card`, `EmptyState`, `ErrorBanner`, `StatusBadge` | The standard containers and states |
| `Field`, `Panel`, `TagInput`, `ImageField` (`forms.tsx`) | Form parts. Always a visible label, hint or error under the control |
| `RichEditor` | The writing box (toolbar, paste/drag images, word count) |
| `ContentList` | The list for blog posts and projects: tabs with counts, search, per-row actions |
| `EntryForm`, `NewsletterForm` | The create/edit forms. Main column + 20rem side column + sticky save bar |

A new admin screen: `PageHeader`, then `Card`s; loading = grey pulsing block with
`aria-busy`; empty = `EmptyState` that says what to do next; error = `ErrorBanner` with a
retry. Destructive actions ask `confirm()` and say what will happen. Lists are tabs + search
+ rows, never a wide table that overflows (tables need `overflow-x-auto`).

---

## 6. Logos, icons and diagrams

- **Logos are vendored, not hot-linked.** They live in `src/content/brand-icons.ts` (from
  Simple Icons, CC0, plus a few from gilbarbara/logos). To add one: copy its SVG path into
  `brand-icons.ts` and add the alias in `BrandIcon.tsx`. A tool with no logo is shown as text.
  A test fails if a name maps to a logo that does not exist.
- Logos are drawn in `currentColor`, so they work in both themes. Do not colour them with
  brand colours.
- Admin and UI icons come from **lucide-react**. Stroke icons, `h-4 w-4` or `h-5 w-5`,
  always `aria-hidden="true"` when a text label is next to them, or an `aria-label` when alone.
- Diagrams use the site's own SVG engine in `src/content/architecture.ts` (nodes, groups,
  steps, focus regions). To add one: draw a `Diagram`, write its tabs in `project-views.ts`,
  add its slug. **A diagram may only claim what is true and verified.** The tests check that
  nothing is drawn outside the canvas and that no unverified claim (encryption, autoscaling,
  managed database) appears.
- Tabs that explain a diagram are numbered ("1. A visitor arrives") and tell the reader to go
  step by step, with a "Next step" button.

---

## 7. Writing rules

Voice: first person, plain, specific, a little dry. A doctor's habits: triage, handover,
rule things out.

- **Hero:** headline fits on **two lines**; the text under it is **20 words or fewer**; one
  main button. Proof (the tools row) sits *under* the hero, never inside it.
- **One idea, once.** If a fact is on the home page, link to the detail; do not repeat it.
  Featured items show **three**, then a "See all" button.
- **Plain words.** Prefer "use" to "leverage". **Banned** (a test fails on them): seamless,
  elevate, unleash, next-gen, game-changer, delve, tapestry, leverage, cutting-edge,
  world-class, passionate.
- **Numbers must be true and sourced.** Never invent a figure. If unverified, say so or leave
  it out.
- **Section headings are statements or plain names**, not slogans. "Projects, and the thinking
  behind them." not "Things I've built and run."
- **Names that a stranger understands.** "1. A visitor arrives", not "A request".
- **Button labels say what happens**: "Read how I built it", "See all projects", "Send to 3".
- Define any abbreviation the first time it appears on a page or doc.
- No stock phrases, no emoji in copy, no exclamation marks.

---

## 8. Where content lives (do not duplicate it)

| Kind | Where | Changed by |
|---|---|---|
| Default wording, curated projects, patterns, the Terraform journey, tools list | `src/content/portfolio.ts` | A pull request |
| The same wording **as edited in the admin** | `site_content` table (one row per field) | Admin → Pages, live at once |
| Which sections a page has, their order and visibility | `site_content` row `layout.<page>`, defaults in `src/content/sections.ts` | Admin → Pages |
| Blog posts, projects (all of them) | PostgreSQL | Admin → Blog / Projects |
| Uploaded images | R2 bucket + `media_assets` table | Admin → Media, or the editor |
| Subscribers, newsletters, messages, page views | PostgreSQL | Admin / visitors |

How the layers combine: the page asks `getOverrides()` for the saved edits and passes
`withOverrides("homeHero", homeHero, o)` to each component, which falls back to the code text.
**Components take their content as an optional prop defaulting to the code constant.**

### Adding or changing things

| Task | Do this |
|---|---|
| Change wording | Edit `portfolio.ts`. If it should be editable in the admin it is picked up automatically (strings anywhere under the roots listed in `editable.ts`; links, `href`, `visual`, `rows` are skipped on purpose) |
| Add a new editable root | Add a `group(...)` in `editable.ts` **and** pass `withOverrides` in the page |
| Add a section to a page | Add it to `SECTIONS` in `sections.ts` and to the page's `parts` map. Hero-like openers get `pinned: true` |
| Add a project | Add it to `projects` in `portfolio.ts`, then `npx tsx scripts/generate-projects-seed.ts` (a test fails if the SQL is stale). Give it a `flow` and, if it deserves one, a diagram |
| Add a "lessons learnt" write-up | Add an item to `incidents`, then `npx tsx scripts/generate-posts-seed.ts` |
| Add a pattern | Add to `patterns` (and a `visual` if it has a drawing); the home page shows the first two |
| Add a public page | New route, `PortfolioShell`, add to `BARE_ROUTES`, add to the menu in `PortfolioShell.tsx`, add a canonical URL in `metadata` |

---

## 9. Pages and navigation

Menu: **Home, Projects, Blog, Learning, About, Contact.** (Contact scrolls to the contact
section on Home, or goes to `/contact` when that section is hidden.) The platform this site
runs on is a **project**, not a menu item; its page is
`/projects/production-platform-on-hetzner`. `/architecture` redirects there.

Every page sets its own canonical URL. **Never** set a canonical in the root layout (it is
inherited by every page and tells search engines every page is a copy of the home page).

Public pages that read saved text or layout are `export const dynamic = "force-dynamic"`.

---

## 10. Accessibility and responsiveness (required)

- **Keyboard:** everything reachable and operable. Visible focus (`:focus-visible` is styled
  with the accent; never remove outlines). Dialogs close on Esc and on a click outside, and
  move focus inside when they open.
- **Labels:** every input has a `<label>` (use `sr-only` if the design hides it). Icon-only
  buttons have `aria-label`. Switches use `role="switch"` and `aria-checked`. Tabs use
  `role="tablist"` / `tab` / `tabpanel` with `aria-selected`.
- **Live regions:** save results and counts use `role="status"` / `aria-live="polite"`;
  errors `role="alert"`.
- **Contrast:** text on the accent uses `--accent-ink`. Do not put `--ink-2` text on
  `--surface-2` at small sizes.
- **Motion:** animations are decoration. Respect `prefers-reduced-motion` (already global in
  `portfolio.css`); new keyframes must be covered by it. The logo row becomes a still,
  wrapped list.
- **Images:** content images need `alt`; decorative ones `alt=""`. Logos are `aria-hidden`
  next to their name.
- **Phones:** design at 375px first. No horizontal page scroll (tables scroll inside their own
  box). Tap targets at least about 40px. Grids use `repeat(auto-fit, minmax(min(100%, Xrem), 1fr))`.
- **No layout shift:** reserve space for images and embeds.

---

## 11. Security and privacy rules

The repository is **public**. Never commit: secrets, keys, tokens, passwords, IP addresses,
host names of servers, personal data, or the owner's home address. Examples in docs use
placeholders (`<record-id>`, `example.com`).

- All user HTML is sanitised on the server (`sanitizeHtmlServer`, DOMPurify) before it is
  stored, and again when shown. Page text from the admin is shown as **text**, never as HTML.
- Admin API routes are wrapped in `secureAdminRoute` (session, rate limit, request-origin
  check on writes) and validate input with `zod`. Database errors go through
  `mapPrismaError`; unknown errors through `handleError` (no internals leaked).
- Public endpoints that must stay public (`/api/analytics/collect`, `/api/webhooks/resend`)
  say why, validate everything, and fail closed. The webhook is gated by its **signature**.
- **Every public form has layers**: a per-visitor rate limit, a per-address limit (`perEmailLimiter`),
  duplicate detection that answers plainly instead of repeating work, a honeypot field, and
  no email sent to a stranger more than once a day. See doc 09, "Repeat submissions and abuse".
- Uploads: the file's real bytes decide its type; **SVG is refused**; 5 MB cap; unguessable
  names; server-side only.
- **Analytics is cookie-free and stores no IP address.** Do not add cookies or third-party
  scripts without updating the privacy policy and the cookie banner.
- The Content-Security-Policy allows only this site, `data:` and `https:` images, and Google's
  reCAPTCHA script and frame (from its `recaptcha` paths only), plus Cloudflare Web Analytics
  (`static.cloudflareinsights.com` to load, `cloudflareinsights.com` to report). Do not
  add other external fonts, scripts or embeds without a deliberate CSP change (and a test).
- Cloudflare is the only thing allowed to reach the web ports; the real visitor address
  comes from `CF-Connecting-IP` (see `src/lib/client-ip.ts`).

---

## 12. Data, migrations and seeds

- Schema changes are **a new migration folder** in `prisma/migrations/` named
  `YYYYMMDDHHMMSS_what_it_does`, with plain SQL. **Never edit a migration that has been
  applied.** Existing rows must be backfilled in the same migration.
- Add the model to `schema.prisma` first, `npx prisma generate`, then the migration SQL. Run
  `npx prisma migrate deploy` locally to prove it applies.
- Seeds only **insert missing rows** (`ON CONFLICT ... DO NOTHING`); they never overwrite
  something edited in the admin. Seed SQL is generated from the content file and a test
  fails if it drifts.
- Local sample data: `scripts/dev-seed-subscribers.sql` (local only, `@example.com`).
- The cluster runs migrations automatically on release (a hook Job); one-off data jobs are
  in `infra/k8s/ops/`.

---

## 13. Quality gates (run before you say "done")

```bash
npx tsc --noEmit            # types
npx eslint src --quiet      # lint, must be 0 errors
npx jest --coverage         # all tests; the coverage gate must pass
npx next build              # when routes, config or the schema changed
```

Also:

- **Add tests with the change.** Pure logic gets unit tests; API routes get tests with the
  database mocked (`/** @jest-environment node */`, import the route in `beforeAll`); content
  rules are tested in `src/__tests__/content/`. Never lower the coverage thresholds to pass.
- **Look at it in a real browser**, dark and light, desktop and phone width:
  `node docs/redesign/shot.mjs http://localhost:3001/<path> out.png --dark [--cookie=auth-token=...] [--to="#id"]`.
  Read the screenshot. Test with real data (see the dev seeds), not only empty states.
- **Prettier:** format only the files you touched (`npx prettier --write <files>`). Running it
  on a whole folder rewrites unrelated files and buries the real change.
- Do not leave debug output, commented-out code, or unused components behind. If you remove a
  feature, remove its routes, tests and docs.
- Local dev: the site runs on **port 3001** (3000 belongs to another project). The local
  database is the `pf-localdb` Docker container on port 5433.

---

## 14. Documentation and process

- **Docs are teaching documents**, in `docs/infra/`, numbered (`NN-title.md`). Each opens with
  what it is for and a **Status** line, explains *why* before *how*, shows commands with each
  part explained, includes a Mermaid diagram where a picture helps, records **verified
  results** (what was actually seen working, with dates), and ends with a **Glossary**.
- Update `docs/infra/09-site-structure-and-content.md` when the site's structure, content
  model, admin or analytics change. Update this guide when a design rule changes.
- Define terms for a beginner. Prefer tables to long paragraphs.
- **Git:** work on a feature branch (`feat/...`, `fix/...`, `docs/...`), never on `main`.
  Commit messages are short and say what and why; end them with the attribution line the
  tooling asks for. **Ask before opening a pull request or merging**, and bundle related
  changes into one PR. Flow: feature branch -> `staging` -> release PR that updates the image
  tag -> ArgoCD deploys (docs 05 and 07).
- Do not take shortcuts that skip hooks or checks. If a check fails, fix the cause.
- Never delete or overwrite something you have not looked at. Look first.
- Report honestly: say what was tested and what was not, and what the owner must do (for
  example create a bucket or a secret).

---

## 15. Checklist for any change

Before you finish, answer yes to all:

- [ ] Does it look like it was always part of the site (tokens, fonts, buttons in boxes)?
- [ ] Are all actions real buttons in the right style, with no bare arrow links?
- [ ] Works in dark and light, at phone width, with the keyboard?
- [ ] Is the wording plain, short, true, and said only once?
- [ ] Is content in the one right place (code default, admin edit, or database)?
- [ ] Is user input validated and sanitised, and nothing sensitive committed?
- [ ] Tests added, `tsc`, `eslint`, `jest --coverage` (and `next build` if needed) pass?
- [ ] Looked at it in a browser with realistic data?
- [ ] Docs and this guide updated, terms defined?
- [ ] Told the owner what changed, what was not tested, and what they must do next?

---

## 16. Glossary

- **`.pf`:** the class on the redesigned public pages; every rule in `portfolio.css` is scoped
  under it so it cannot leak into other pages.
- **Token:** a named value (a colour, a font) used everywhere instead of a raw value.
- **Eyebrow / label:** the small uppercase line above a heading.
- **CTA (call to action):** the button you want the visitor to press.
- **LCP (largest contentful paint):** how long the page's main content takes to appear.
- **CSP (content security policy):** the browser rule list that says which sources a page may load.
- **GitOps:** the live system is changed only by changing git; a controller (ArgoCD) applies it.
- **Migration:** a versioned change to the database structure.
- **Seed:** loading starting data into a database; **idempotent** means safe to run twice.
- **Sanitise:** remove anything dangerous (scripts) from user-supplied HTML.
- **Canonical URL:** the one address search engines should treat as a page's real address.
