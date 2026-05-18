Day 8 of building a production-grade website like a cloud engineer would: the 12-commit autoprefixer saga

Twelve commits. That is how long it took me to fix a CSS issue that worked perfectly on my laptop. Every fix unblocked one error and revealed the next. By commit five I was angry. By commit ten I was actually learning something.

The setup: Next.js + Tailwind CSS + PostCSS. Local dev: `npm run dev` works flawlessly. Local prod build: `npm run build` works flawlessly. CI Docker build: explodes with cryptic PostCSS errors about missing autoprefixer.

The first fix: install autoprefixer. Done in five minutes. Next CI run: same error.

Why? Because autoprefixer was already in my package.json — just in devDependencies. My Dockerfile ran `npm ci --omit=dev` to keep the image small. So inside the container, autoprefixer did not exist. My laptop had it because of months of accumulated installations. The container, doing a clean install, only had what was in `dependencies`.

I moved autoprefixer to dependencies. Next error: tailwindcss not found. Same story. Moved it.

Next error: postcss not found, with a different message. Moved it.

Next error: a peerDependency conflict. The pinned versions of autoprefixer and tailwindcss I had no longer agreed with PostCSS 8.

Next error: a Dockerfile cache layer was holding onto the old node_modules from before my dependency moves. I had to reorder my COPY and RUN lines so that the COPY of package.json invalidated the cache for `npm ci`.

Each commit chipped one layer off, exposed the next.

The kitchen analogy that finally made it click: my laptop is a kitchen I have been working in for years. There is a jar of paprika in the spice rack, a peeler in the drawer, the right pan on the stove. When I "cook" (run my app), everything is within reach.

The Docker build is a brand new kitchen that delivers itself in a shipping container. If a recipe (the package.json) does not list paprika, the kitchen ships without it. The recipe has to be exhaustive — not "I will grab it from the shelf if I need it." Exhaustive in writing. Every dependency. Every devDependency that is actually needed at build time. Every peer dependency, pinned.

What I learned:
- The Dockerfile is the only source of truth for what gets installed. Your laptop is lying to you.
- "Works on my machine" is not laziness, it is environment drift made invisible by years of small installs.
- Pinning matters. `^1.0.0` lets minor versions drift; `1.0.0` does not.
- Layer cache invalidation is a real skill — the order of your COPY and RUN lines is the difference between a 30-second rebuild and a 5-minute one.

The series continues with Day 9 — three real production bugs that shipped to the live site and what each one taught me about how production differs from local.

What is the dumbest bug that took you the longest to fix?
