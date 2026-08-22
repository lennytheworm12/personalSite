# Decisions and Blockers Log

## Decisions

### D1 — Operative specification source (2026-08-22)

The Obsidian notes named in the goal brief were absent (empty vault). The
Goal 1 brief text is treated as the operative acceptance criteria. Recorded
as blocker B1 so the discrepancy is surfaced rather than silently absorbed.

### D2 — Package manager: pnpm (2026-08-22)

Available locally (10.26.2), fast, strict lockfile (`pnpm-lock.yaml`)
committed for reproducible clean installs in CI.

### D3 — Zero client-side JavaScript policy (2026-08-22)

React integration is installed per requirements but used only for
server-rendered components with no islands/hydration. All interactivity-free
pages ship as pure HTML/CSS. Verified by asserting `<script>` presence/
absence and no-JS usability in Playwright.

### D4 — Validation library: Zod (2026-08-22)

Single schema drives both Index and generated case-study routes; explicit
rejection paths give natural negative/malformed-data tests.

### D5 — Hosting: GitHub Pages now, custom domain later (2026-08-22)
User chose GitHub Pages as the MVP host; a custom domain on Cloudflare
Pages is planned post-MVP. Base path (`DEPLOY_BASE_PATH`) and public URL
(`SITE_PUBLIC_URL`) are build-time environment variables consumed by
`astro.config.mjs` and `src/lib/base-path.ts`, so the same source builds
for a subpath (`/personalSite/`) or a root domain without code changes.

## Blockers

### B1 — Canonical design notes missing

The three referenced Obsidian notes do not exist in the vault. Needed from
user: restore/sync the vault or confirm the Goal 1 brief alone is
authoritative. Does not block implementation of the stated requirements.

### B2 — No Git remote configured yet (expected)

A remote must be supplied by the user (e.g. `gh repo create …`) before push
and CI can run. All local equivalents of CI jobs are reproduced locally.

### B3 — Deployment credentials unavailable (expected)

Cloudflare Pages deployment requires user account/API token. Local work
includes hosting configuration + docs so deployment is a single manual step.

### B4 — Personal content unresolved by design

All personal facts, metrics, links, handles, résumé URL etc. are marked
unresolved placeholders. User decisions required before public launch.
