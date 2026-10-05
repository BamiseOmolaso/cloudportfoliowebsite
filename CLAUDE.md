# Instructions for AI models working on this repository

Before you change any page, component, style, text, admin screen or database model, read
**[docs/DESIGN-GUIDE.md](docs/DESIGN-GUIDE.md)**. It is the single source of truth for the
site's design rules, where content lives, how to add things, the quality checks to run and the
git process.

**Continuing earlier work?** Read the "Pick up here" section at the top of
**[docs/infra/TODO.md](docs/infra/TODO.md)**: current state, what to do next and the traps to avoid.

**Something broken or a check red?** Follow **[docs/troubleshooting/](docs/troubleshooting/README.md)**:
read the real error first, find which step failed, change one thing at a time.

The five rules to never forget:

1. Do not redesign what exists. Extend it so it looks like it was always there.
2. Every action is a rectangular button; the main one is the solid violet `btn primary`.
   A bare "Read more ->" text link is not an action.
3. Use the design tokens (CSS variables on public pages, the themed Tailwind palette in the
   admin). No new colours or fonts.
4. The repository is public: no secrets, IP addresses, host names or personal data.
5. Test it, look at it in a browser, update the docs, and ask the owner before opening or
   merging a pull request.
