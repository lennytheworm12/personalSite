# Progress Log

## 2026-08-22 — Goal 1 kickoff

- Inspected environment: Node v24.12.0, npm 11.6.2, pnpm 10.26.2,
  git 2.34.1, Playwright CLI 1.62.1 available.
- Working directory was empty; initialized Git repo on `main`.
- Obsidian vault empty — canonical notes missing (see decisions B1).
- Created `.gitignore`, README, implementation plan, this log,
  decisions/blockers log.

## 2026-08-22 — M2–M8 implemented

- Scaffolded Astro 7 (`output: 'static'`) with React integration used for
  server-rendered components only; zero client-side JavaScript shipped.
- Content model: Zod schema (`src/content/project-schema.ts`) with kebab-case
  slug / snake_case identifier rules, https-only URL validation, strict-field
  rejection, placeholder↔unresolved cross-field consistency, duplicate slug &
  identifier rejection, and route cross-reference coverage checks.
- Honest placeholders for Spotify Sorter & Game Teacher; all personal facts
  marked unresolved.
- Pages: `/`, `/about/`, `/projects/{slug}/` (getStaticPaths from validated
  model), branded `/404`. Skip link, semantic landmarks, visible focus,
  ≥44px targets, dark-mode support.
- Quality pipeline: Prettier, ESLint (astro + jsx-a11y + type-checked TS),
  `astro check` + `tsc --noEmit` (strictest), Vitest (29 tests), Playwright
  (160 assertions across 5 viewport projects incl. axe scans per route),
  `verify-content` and `verify-build` gates, GitHub Actions CI.

### Issues hit and fixed

- Zod 4 `z.url()` returns a string — https check now parses via `new URL`.
- TypeScript 7 (native) unsupported by typescript-eslint → pinned TS 6.0.3;
  removed deprecated `baseUrl` option accordingly.
- WebKit browser cannot run here (missing system libs needing sudo) →
  phone project emulated with Chromium; noted as environment limitation.
- Test fixes: WHATWG URL accepts `https:/…` single-slash forms (removed that
  malformed case); strict-mode locator collisions fixed via scoped locators;
  dist must be rebuilt before e2e (preview serves stale output otherwise).

## 2026-08-22 — Full verification (clean install)

- `rm -rf node_modules dist .astro && pnpm install --frozen-lockfile` ✓
- `pnpm verify` (format:check → lint → astro check+tsc → verify:content →
  vitest 29/29 → build → verify:build → playwright 160/160) ✓
- Budgets: dist total ≈ 210 KiB, largest page ≈ 5 KiB (budgets 512 KiB /
  64 KiB). Secret scan over all emitted files: clean.

## 2026-08-22 — Pushed to GitHub; CI green; GitHub Pages wired up

- Integrated remote's initial commit (MIT LICENSE + README stub) via
  rebase — LICENSE preserved; README conflict resolved in favor of ours.
- Fixed a real CI catch: two docs files committed post-format failed
  `format:check`; fixed and CI fully green.
- Added `src/lib/base-path.ts` (`joinBase`/`withBase`, unit-tested with
  boundary cases) + build-time env config (`DEPLOY_BASE_PATH`,
  `SITE_PUBLIC_URL`) so the same source deploys under GitHub Pages'
  `/personalSite/` subpath or a future root custom domain.
- All internal links routed through `withBase()`; verified a
  base-prefixed production build locally (links correct, budgets pass).
- New `.github/workflows/deploy.yml`: build with Pages env → verify-build →
  upload → deploy-pages. Pages enabled via API (`build_type=workflow`).
- Full local suite re-run green: format ✓ lint ✓ types ✓ content ✓
  unit/integration 35/35 ✓ build ✓ build-gate ✓ e2e 160/160 ✓.
