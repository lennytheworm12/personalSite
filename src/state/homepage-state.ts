/**
 * Durable homepage state machine (Goal 3, M2).
 *
 * One owner for all durable homepage UI state. Ephemeral interaction state
 * (hovered/focused/pinned nodes) deliberately lives OUTSIDE this machine and
 * must never be encoded in the URL or history.
 *
 * All transitions are pure: (state, action) -> state.
 */

export type HomepageView = "graph" | "index";

export type GraphScene =
  | { kind: "home" }
  | { kind: "project"; slug: string };

export interface SearchState {
  open: boolean;
  query: string;
  activeResultIndex: number | null;
}

export interface DurableHomepageState {
  view: HomepageView;
  scene: GraphScene;
  search: SearchState;
}

export const HOMEPAGE_VIEWS: readonly HomepageView[] = ["graph", "index"];

/** Queries are capped to keep URLs sane; longer input is truncated. */
export const MAX_QUERY_LENGTH = 100;

export type HomepageAction =
  | { type: "setView"; view: HomepageView }
  | { type: "focusProject"; slug: string }
  | { type: "goHome" }
  | { type: "searchOpen" }
  | { type: "searchClose" }
  | { type: "searchQuery"; query: string }
  | { type: "searchActiveResult"; index: number | null }
  | { type: "hydrate"; state: DurableHomepageState };

export function createInitialHomepageState(): DurableHomepageState {
  return {
    view: "graph",
    scene: { kind: "home" },
    search: { open: false, query: "", activeResultIndex: null },
  };
}

function resetSearch(): SearchState {
  return { open: false, query: "", activeResultIndex: null };
}

const KNOWN_VIEWS = new Set<string>(HOMEPAGE_VIEWS);

/**
 * Reduce a durable-state transition. Unknown slugs are rejected by returning
 * the unchanged state — callers decide whether that is a user-facing error.
 */
export function reduceHomepageState(
  state: DurableHomepageState,
  action: HomepageAction
): DurableHomepageState {
  switch (action.type) {
    case "setView": {
      if (!KNOWN_VIEWS.has(action.view)) return state;
      // View switching preserves scene but closes transient search context.
      return { ...state, view: action.view, search: resetSearch() };
    }
    case "focusProject": {
      const slug = action.slug.trim();
      if (!slug || slug.length > 64) return state;
      // Focusing a project keeps the query (search may continue in focus),
      // but resets result cursor.
      return {
        ...state,
        scene: { kind: "project", slug },
        search: { ...state.search, activeResultIndex: null },
      };
    }
    case "goHome":
      return { ...state, scene: { kind: "home" }, search: resetSearch() };
    case "searchOpen":
      return { ...state, search: { ...state.search, open: true } };
    case "searchClose":
      return { ...state, search: { ...state.search, open: false, activeResultIndex: null } };
    case "searchQuery": {
      const query = action.query.slice(0, MAX_QUERY_LENGTH);
      return { ...state, search: { ...state.search, query, activeResultIndex: null } };
    }
    case "searchActiveResult":
      return { ...state, search: { ...state.search, activeResultIndex: action.index } };
    case "hydrate":
      return action.state;
    default:
      return state;
  }
}
