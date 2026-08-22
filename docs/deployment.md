# Deployment

The site is a fully static Astro build (`output: 'static'`): `pnpm build`
emits a portable `dist/` folder with plain HTML/CSS. There is no database,
authentication, runtime server, paid API, CMS, or host-specific runtime
dependency anywhere in Goal 1.

## Current host: GitHub Pages

The site deploys automatically on every push to `main` via
`.github/workflows/deploy.yml` (build → upload `dist/` → `deploy-pages`).
Because the repository site is served under a subpath, the workflow sets:

- `DEPLOY_BASE_PATH=/personalSite`
- `SITE_PUBLIC_URL=https://lennytheworm12.github.io/personalSite/`

All internal links go through the `withBase()` helper
(`src/lib/base-path.ts`, unit-tested), so they resolve correctly at either
a subpath or a root domain. Live URL:
<https://lennytheworm12.github.io/personalSite/>. Unknown URLs serve
`404.html` automatically. Direct refreshes of `/personalSite/projects/*`
URLs work because each route has a prebuilt `index.html`.

## Future host: Cloudflare Pages (no Pages Functions)

When a custom domain is purchased, move to Cloudflare Pages (or keep GitHub
Pages and point the domain at it). For Cloudflare:

1. Workers & Pages → Create → Pages → Connect to Git.
2. Build command: `pnpm build`; output directory: `dist`.
3. Leave `DEPLOY_BASE_PATH` unset so the site builds at root; set
   `SITE_PUBLIC_URL=https://<your-domain>/`.
4. Do **not** enable Pages Functions or Worker bindings — none are used.
5. Direct refresh of `/projects/*` URLs works out of the box; unknown URLs
   serve `dist/404.html`.

Alternative zero-config option: `npx wrangler pages deploy dist` after a
local verified build.

## Other static hosts

Any host that serves static files with directory indexes and SPA-free 404
handling works unchanged: Netlify (`publish: dist`), S3 + CloudFront,
nginx. No adapter is required.
