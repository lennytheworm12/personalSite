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

## 2026-08-22 — Phase 2 implemented (M0–M11)

- M0: closeout decisions recorded (R1–R6); blockers reconciled. Canonical
  notes still absent from the vault; goal brief treated as authoritative.
- M1: content model migrated to graph-ready contract (structured
  technologies with ids/verification, provisional narrative sections,
  aliases/featured/motionStyle/concepts/memories). Case studies render
  ten durable sections.
- M2: `src/graph/` domain model + deterministic builder + validation.
  Shipped graph: 8 nodes (1 person, 2 project, 2 story, 3 technology),
  9 edges (2 ownership, 2 motivation, 5 technology). Shared TypeScript/
  React collapse into single tech nodes.
- M3: authored wide/laptop layouts; validator enforces coverage, bounds,
  center region, priority-1 spacing ≥18 units, distinct projects.
- M4–M7: GraphIsland (client:load) hydrates SSR'd meaningful markup;
  DOM buttons + SVG edges; hover/focus/pin state machine; stable aria-live
  detail region with base-safe links; Index preserved below graph;
  island hidden <48em where Index is primary.
- Interaction finding D7: pointer travel from node to detail region
  detaches links if hover clears on leave → stable-last-hover semantics,
  cleared by Escape. Pinning exists precisely for stable traversal.
- M9: verify-build now enforces script containment (homepage only),
  measures JS budgets: homepage JS = 57.9 KiB gzip / 184.8 KiB raw,
  2 chunks (React client + GraphIsland), homepage HTML ≈18 KiB,
  dist ≈227 KiB. Well under the 200 KiB hard ceiling.
- M10/M11: 76 unit/integration tests + 196 browser assertions green from
  a clean install; base-path production build verified separately.

## 2026-08-22 — Goals 3–4 run: Goal 3 core implemented (M1–M10)

- Canonical notes recovered at /mnt/c/Users/bphan/obsidian-vault; all read;
  no contradictions with shipped architecture (R7 updated).
- M1: concept node kind + concept edge kind; 4 derived concepts
  (music-organization, playlist-curation, game-design, teaching);
  graph now 12 nodes / 13 edges.
- M2: src/state/homepage-state.ts — pure reducer owning view/scene/search.
- M3: src/state/homepage-url.ts + homepage-history.ts — parse/serialize/
  canonicalize; pushState for navigation, replaceState for typing;
  history.state source marker for deep-link Back safety; popstate hydrate.
- M4/M5: build-derived search index (14 entries) + deterministic ranking
  bands with priority/label/id tie-breaks.
- M6-M10: HomepageIsland replaces GraphIsland as single durable-state
  owner: Graph/Index view switch, SearchPanel (keyboard results, polite
  announcements), project-focus scenes from authored layouts with
  Back/Home/View Case Study controls, hover-grace timer (150ms) replacing
  indefinite sticky hover, Escape priority search > pin > focus.
- No-JS: both views SSR fully visible pre-hydration (mounted-gated hiding).
- Mobile boot default: Index when viewport <768px without explicit ?view=.
- Contract changes recorded: project-node click now enters focus (was
  pin); two Phase-2 tests updated to equal-or-stronger equivalents.

## 2026-08-23 — GOAL 3 COMPLETE (checkpoint)

- Clean-install verification: format/lint/types/content/graph/unit(129)/
  integration/build/verify-build/e2e(224 incl. axe on search+focus+index)
  all green.
- Budgets: homepage JS 81.0 KiB gzip / 268.3 KiB raw (2 chunks), homepage
  HTML 28.9 KiB, dist 322.9 KiB — under preferred 100 KiB target and far
  below the 200 KiB hard ceiling.
- Base-path (/personalSite/) production build verified separately.
- Non-home routes remain script-free (containment gate).
