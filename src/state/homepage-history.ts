/**
 * History integration for the homepage (Goal 3, M3).
 *
 * pushState: deliberate navigation (project focus, explicit view switch,
 * result selection changing scene).
 * replaceState: query typing, canonicalization, initialization metadata —
 * never one entry per keystroke.
 *
 * history.state metadata distinguishes in-app navigation ("app") from
 * deep-link loads ("deep-link") so the visible Back control can fall back
 * safely to Home instead of leaving the site.
 */

export const HISTORY_STATE_KEY = "portfolio-homepage";
export const HISTORY_APP_SOURCE = "app" as const;
export const HISTORY_DEEP_LINK_SOURCE = "deep-link" as const;

export interface HomepageHistoryEntry {
  [HISTORY_STATE_KEY]?: {
    source: typeof HISTORY_APP_SOURCE | typeof HISTORY_DEEP_LINK_SOURCE;
  };
}

/** True when the current history entry was created by in-app navigation. */
export function wasNavigatedInApp(): boolean {
  if (typeof window === "undefined") return false;
  const state = window.history.state as Partial<
    Record<string, { source?: string }>
  > | null;
  return state?.[HISTORY_STATE_KEY]?.source === HISTORY_APP_SOURCE;
}

function urlWithQuery(query: string): string {
  const { pathname } = window.location;
  // Works under any base path because pathname already includes it.
  return `${pathname}${query}${window.location.hash}`;
}

/** Deliberate navigation: new history entry. */
export function pushHomepageUrl(query: string): void {
  window.history.pushState(
    { [HISTORY_STATE_KEY]: { source: HISTORY_APP_SOURCE } },
    "",
    urlWithQuery(query),
  );
}

/** Metadata/canonicalization/typing: no new history entry. */
export function replaceHomepageUrl(
  query: string,
  source:
    typeof HISTORY_APP_SOURCE | typeof HISTORY_DEEP_LINK_SOURCE = HISTORY_APP_SOURCE,
): void {
  window.history.replaceState(
    { [HISTORY_STATE_KEY]: { source } },
    "",
    urlWithQuery(query),
  );
}

/**
 * Visible Back control behavior:
 * - entered via in-app navigation -> browser back semantics;
 * - direct deep-link load        -> safe Home fallback (replace, not push).
 * Returns "history" when the caller should let the browser go back.
 */
export function homepageBackStrategy(): "history" | "home-fallback" {
  return wasNavigatedInApp() ? "history" : "home-fallback";
}
