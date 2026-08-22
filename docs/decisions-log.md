# Decisions and Blockers Log

## Phase 1 closeout / Phase 2 kickoff resolutions (2026-08-22)

### R1 — Canonical Obsidian notes: still unavailable (B1 updated)

The Phase 2 goal brief asserts the canonical notes ("Concept and Plan",
"Technical Design", "OpenCode Phase 1 Design", "OpenCode Phase 2 Design")
are available as product source of truth. **Repository/vault evidence shows
they are not present** — the vault contains only the progress log written
during Goal 1. This discrepancy is recorded rather than silently resolved:
the Phase 2 goal brief itself (which embeds a detailed M0–M12 specification
with acceptance criteria and an out-of-scope stop list) is treated as the
operative Phase 2 design. Historical entries below are preserved unchanged;
nothing is rewritten to pretend the notes were ever available.

### R2 — LeetCode deferred (accepted)

No LeetCode fetching, snapshots, validation, graph node, or progress UI in
Phase 2 or later until explicitly revived. No LeetCode data appears in any
schema.

### R3 — Provisional project content allowed (accepted)

Case-study fields (motivation, contribution, technology purpose, concepts,
evidence, challenges, outcomes, next steps) may carry clearly labeled
draft/provisional text until a dedicated content-audit pass. The schema
models this with an explicit `provisional` flag so provisional text is
never mistaken for verified fact.

### R4 — Do not fabricate evidence (standing rule)

Metrics, testimonials, URLs, credentials, outcomes, user counts, and
performance figures are never invented. Quantitative evidence stays empty
and listed as unresolved until real data exists.

### R5 — Empty project memories are valid (accepted)

`memories: []` must validate. No fake images, stories, or placeholder
people are created to satisfy the schema.

### R6 — GitHub Pages is the active development deployment target (accepted)

Verified main revisions deploy to GitHub Pages under `/personalSite/`.
Support for `DEPLOY_BASE_PATH`, `SITE_PUBLIC_URL`, and future root/custom
domain deployment without architectural rewrite is preserved (see D5).

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

### B1 — Canonical design notes missing (RESOLVED as R1)

~~The three referenced Obsidian notes do not exist in the vault.~~
Resolution: still absent at Phase 2 kickoff; the Phase 2 goal brief is
treated as authoritative per R1. If the notes are recovered later,
reconcile against the shipped implementation before Phase 3 design.

### B2 — No Git remote configured yet (RESOLVED)

~~A remote must be supplied by the user before push and CI can run.~~
Resolved during Goal 1 closeout: remote `lennytheworm12/personalSite`,
CI green, GitHub Pages deployment live.

### B3 — Deployment credentials unavailable (RESOLVED)

~~Cloudflare Pages deployment requires user account/API token.~~ Resolved:
GitHub Pages is the active development target (R6).

### B4 — Personal content unresolved by design (OPEN, narrowed by R3/R4)

All personal facts and quantitative evidence remain unresolved placeholders.
Provisional _qualitative_ draft text is now allowed per R3; fabrication of
evidence remains forbidden per R4. User decisions required before launch.

### D7 — Stable-last-hover interaction (2026-08-22)

Clearing hover on mouseleave made detail-region links detach while the
pointer traveled toward them (caught by Firefox timing in e2e). Hover now
persists until another node is hovered/focused or Escape is pressed; pinning
(Enter/Space/click) remains the explicit way to freeze details. Phase 3 may
refine this with hover-intent delays.
