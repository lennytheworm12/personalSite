# Personal Portfolio Website — Goal 1 Implementation Plan

> Source of truth note: the referenced Obsidian notes ("Personal Portfolio
> Website — Concept and Plan", "Personal Portfolio Website — Technical
> Design", "OpenCode Phase 1 Design") were **not present** in the vault when
> work began (the vault was empty). This plan is derived from the Goal 1
> brief itself. If the canonical notes are recovered, reconcile differences
> here before continuing to later phases.

## Scope

Goal 1 only: static Astro foundation, validated content model, generated
project routes, accessible Index + About, shared navigation, and a
deployment-ready quality pipeline. Explicitly out of scope: interactive
graph, graph layouts, search, project-focus states, mobile graph
introduction/orb, memories, particles, motion personalities, automated
LeetCode updates.

## Milestones

### M1 — Repository foundation

- Git repo on `main`, `.gitignore`, README, this plan, progress log,
  decisions/blockers log.
- Acceptance: `git status` clean after initial commit; no secrets or
  dependency output tracked.

### M2 — Portable Astro application scaffold

- Astro 5 static output (`output: 'static'`, `trailingSlash` default),
  strictest TypeScript (`astro/tsconfigs/strictest`), React integration
  installed (server-rendered only — zero client-side JS).
- Acceptance: `pnpm build` produces portable `dist/`; type check passes.

### M3 — Validated project-content model

- One Zod schema shared by Index and case-study routes; validation module
  that rejects duplicate slugs/identifiers, malformed URLs, invalid data;
  cross-reference validation (index references resolve).
- Unknown copy/contributions/technologies/metrics/assets/handles/URLs are
  marked **unresolved**, never invented.
- Acceptance tests: positive, negative, boundary, duplicate slug,
  duplicate identifier, malformed URL, cross-reference failure.

### M4 — Honest placeholder records

- `spotify-sorter` and `game-teacher` placeholder records with explicit
  unresolved lists.
- Acceptance: both render via generated routes; every unknown field is
  listed as unresolved in the record.

### M5 — Shared layout, navigation, metadata utilities

- Semantic layout, header nav, skip link, visible focus states, ~44×44 px
  targets where practical, metadata/title utilities, branded static 404.
- Acceptance: keyboard-only navigation works; focus visible; axe scans pass
  on all routes.

### M6 — Routes and pages

- `/` (Index with both projects + stable placeholders for About, GitHub,
  LinkedIn, résumé, contact, LeetCode), `/about`,
  `/projects/spotify-sorter`, `/projects/game-teacher`, `/404`.
- Acceptance: all five exist in `dist/` as static HTML; usable with
  JavaScript disabled.

### M7 — Quality pipeline

- Prettier (format check), ESLint (lint incl. astro + jsxa11y), strict
  typecheck, Vitest unit/integration tests, Playwright browser smoke +
  axe accessibility on every route, route/budget verification script,
  production build. All enforced in CI (GitHub Actions) with a clean
  install from the committed lockfile.
- Acceptance: full local suite green; CI config mirrors it exactly.

### M8 — Deployment readiness

- Cloudflare Pages documentation (static upload, no Pages Functions), plus
  generic static-hosting notes. Direct-route refresh and 404 behavior
  verified against built output.
- Acceptance: docs present; refresh of `/projects/*` URLs documented as
  supported by SPA-style fallback/static routing on the host.

### M9 — Final verification & delivery

- Clean install → format → lint → types → unit/integration → build →
  route/budget checks → browser/a11y/no-JS/responsive checks → secret scan
  → git review → commit(s) → push attempt (report blocker if credentials
  unavailable).

## Verification matrix (Goal 1 acceptance)

| Check                                         | Command / method                                      |
| --------------------------------------------- | ----------------------------------------------------- |
| Clean install                                 | `pnpm install --frozen-lockfile`                      |
| Format                                        | `pnpm format:check`                                   |
| Lint                                          | `pnpm lint`                                           |
| Types                                         | `pnpm astro check && pnpm tsc --noEmit`               |
| Schema/cross-ref/duplicate/malformed          | Vitest suites under `tests/unit`, `tests/integration` |
| Unit + integration tests                      | `pnpm test`                                           |
| Browser smoke + axe per route                 | `pnpm test:e2e`                                       |
| Production build                              | `pnpm build`                                          |
| Generated routes + budgets + secrets          | `pnpm verify:build`                                   |
| No-JS usability                               | Playwright context with JavaScript disabled           |
| Keyboard/focus/zoom/reduced-motion/responsive | Playwright scenarios + manual checklist               |
