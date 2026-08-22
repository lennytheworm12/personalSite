import { BASE_PATH, joinBase, withBase } from "./base-path";

/**
 * Public site identity. The production URL is a build-time setting so the
 * canonical/OG metadata stays correct on any host.
 */
export const SITE = {
  name: "Bi Phan — Portfolio",
  url:
    process.env.SITE_PUBLIC_URL?.trim() ||
    "https://lennytheworm12.github.io/personalSite/",
  description:
    "Portfolio of Bi Phan: software projects including Spotify Sorter and Game Teacher.",
} as const;

export interface PageMetadata {
  title: string;
  description: string;
  canonicalUrl: string;
}

/**
 * Build consistent, per-page metadata. Titles follow the "Page — Site" pattern
 * and descriptions fall back to the site description when a page has none.
 */
export function buildMetadata(input: {
  title?: string;
  description?: string;
  path: string;
}): PageMetadata {
  return {
    title: input.title ? `${input.title} — ${SITE.name}` : SITE.name,
    description: input.description ?? SITE.description,
    canonicalUrl: new URL(joinBase(BASE_PATH, input.path), SITE.url).toString(),
  };
}

export { withBase };
