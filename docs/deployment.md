# Deployment

The site is a fully static Astro build (`output: 'static'`): `pnpm build`
emits a portable `dist/` folder with plain HTML/CSS. There is no database,
authentication, runtime server, paid API, CMS, or host-specific runtime
dependency anywhere in Goal 1.

## Recommended host: Cloudflare Pages (no Pages Functions)

1. Push the verified commit to GitHub.
2. In Cloudflare → Workers & Pages → Create → Pages → Connect to Git,
   select this repository.
3. Build settings:
   - Framework preset: **Astro**
   - Build command: `pnpm build`
   - Build output directory: `dist`
   - Do **not** enable Pages Functions or any Worker bindings — none are used.
4. Deploy. Cloudflare Pages serves directory-index HTML automatically, so:
   - `/` → `index.html`
   - `/about/` → `about/index.html`
   - `/projects/spotify-sorter/` and `/projects/game-teacher/` serve their
     prebuilt `index.html` — **direct refresh of these URLs works**.
   - Unknown URLs serve `dist/404.html` with a 404 status automatically.

Alternative zero-config option: `npx wrangler pages deploy dist` after a
local verified build.

## Other static hosts

Any host that serves static files with directory indexes and SPA-free 404
handling works unchanged: Netlify (`publish: dist`), GitHub Pages, S3 +
CloudFront, nginx. No adapter is required.
