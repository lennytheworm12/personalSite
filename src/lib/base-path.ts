/**
 * Deployment base-path handling.
 *
 * GitHub Pages serves this repo under `/personalSite/`; a future custom
 * domain (Cloudflare Pages or otherwise) will serve it at `/`. The base is
 * baked in at build time from the environment so the same code works in
 * both places:
 *
 *   DEPLOY_BASE_PATH=/personalSite   → links become /personalSite/...
 *   unset or "/"                     → links stay at root (local dev/tests)
 */

/** Join a configured base and an absolute site path (pure, for testing). */
export function joinBase(base: string, path: string): string {
  const trimmedBase = base.replace(/\/+$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  if (!trimmedBase) {
    return normalizedPath;
  }
  // Root becomes "<base>/" so the deployed home page keeps its trailing slash.
  return normalizedPath === "/" ? `${trimmedBase}/` : `${trimmedBase}${normalizedPath}`;
}

function readBase(): string {
  const raw = process.env.DEPLOY_BASE_PATH?.trim();
  if (!raw || raw === "/") {
    return "";
  }
  const stripped = raw.replace(/^\/+|\/+$/g, "");
  if (!stripped) {
    throw new Error("DEPLOY_BASE_PATH must not reduce to an empty segment");
  }
  return `/${stripped}`;
}

export const BASE_PATH: string = readBase();

/** Prefix an absolute site path with the deployment base. */
export const withBase = (path: string): string => joinBase(BASE_PATH, path);
