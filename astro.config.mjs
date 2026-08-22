// @ts-check
import { defineConfig } from "astro/config";
import react from "@astrojs/react";

/**
 * Static-only output: every route is prebuilt HTML with zero server runtime.
 * DEPLOY_BASE_PATH (e.g. "/personalSite" on GitHub Pages) prefixes asset and
 * page URLs at build time; unset means root-relative for local dev/tests.
 */
const rawBase = process.env.DEPLOY_BASE_PATH?.trim();
const base =
  !rawBase || rawBase === "/" ? undefined : `/${rawBase.replace(/^\/+|\/+$/g, "")}`;
const site =
  process.env.SITE_PUBLIC_URL?.trim() ||
  "https://lennytheworm12.github.io/personalSite/";

export default defineConfig({
  output: "static",
  site,
  base,
  integrations: [react()],
  build: {
    inlineStylesheets: "auto",
  },
});
