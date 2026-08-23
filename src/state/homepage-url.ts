import {
  createInitialHomepageState,
  MAX_QUERY_LENGTH,
  type DurableHomepageState,
  type GraphScene,
  type HomepageView,
} from "./homepage-state";

/**
 * URL model for the homepage (Goal 3, M3).
 *
 * Supported public states:
 *   /                          Home scene, default view
 *   ?view=graph | ?view=index  Explicit view
 *   ?focus=<slug>              Project-focus scene
 *   ?q=<query>                 Search query visible
 *
 * Unknown parameters never crash the app; invalid values fall back to safe
 * defaults. Serialization is deterministic and works under any base path
 * because it only produces the query string.
 */

export interface UrlParseOptions {
  /** Slugs that may legally appear in ?focus=. */
  knownSlugs?: readonly string[];
}

function parseView(value: string | null): HomepageView {
  return value === "index" || value === "graph" ? value : "graph";
}

function parseFocus(value: string | null, knownSlugs?: readonly string[]): GraphScene {
  if (!value) return { kind: "home" };
  const slug = value.trim();
  if (!slug || slug.length > 64) return { kind: "home" };
  if (knownSlugs && !knownSlugs.includes(slug)) return { kind: "home" };
  return { kind: "project", slug };
}

function parseQuery(value: string | null): string {
  if (!value) return "";
  const trimmed = value.trim().slice(0, MAX_QUERY_LENGTH);
  return trimmed;
}

/** Parse a homepage URL search string into durable state. */
export function parseHomepageUrl(
  search: string,
  options: UrlParseOptions = {},
): DurableHomepageState {
  const base = createInitialHomepageState();
  let params: URLSearchParams;
  try {
    params = new URLSearchParams(search);
  } catch {
    return base;
  }
  const view = parseView(params.get("view"));
  const scene = parseFocus(params.get("focus"), options.knownSlugs);
  const query = parseQuery(params.get("q"));
  const hasQuery = query.length > 0;
  return {
    view,
    scene,
    search: {
      open: hasQuery,
      query,
      activeResultIndex: null,
    },
  };
}

/** Serialize durable state into a canonical query string ("" or "?…"). */
export function serializeHomepageState(state: DurableHomepageState): string {
  const params = new URLSearchParams();
  if (state.view !== "graph") params.set("view", state.view);
  if (state.scene.kind === "project") params.set("focus", state.scene.slug);
  const query = state.search.query.trim().slice(0, MAX_QUERY_LENGTH);
  if (query) params.set("q", query);
  const serialized = params.toString();
  return serialized ? `?${serialized}` : "";
}

/**
 * Canonicalize a desired state against known slugs: unknown focus falls back
 * to Home so a stale/typo'd deep link can never produce an impossible scene.
 */
export function canonicalizeHomepageState(
  state: DurableHomepageState,
  knownSlugs: readonly string[],
): DurableHomepageState {
  if (state.scene.kind === "project" && !knownSlugs.includes(state.scene.slug)) {
    return { ...state, scene: { kind: "home" } };
  }
  return state;
}
