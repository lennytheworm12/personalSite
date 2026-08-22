export const SITE = {
  name: "Bi Phan — Portfolio",
  /** Unresolved personal fact: production URL decided at deploy time. */
  url: "https://example.com",
  description:
    "Portfolio of Bi Phan: software projects including Spotify Sorter and Game Teacher.",
} as const;

export interface PageMetadata {
  title: string;
  description: string;
  canonicalPath: string;
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
  const normalizedPath = input.path.startsWith("/") ? input.path : `/${input.path}`;
  return {
    title: input.title ? `${input.title} — ${SITE.name}` : SITE.name,
    description: input.description ?? SITE.description,
    canonicalPath: normalizedPath.replace(/\/+$/, "") || "/",
  };
}
