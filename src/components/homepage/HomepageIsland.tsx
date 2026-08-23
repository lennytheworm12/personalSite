import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import type { HomeGraph } from "@/graph/graph-schema";
import type { FocusLayouts } from "@/graph/focus-layouts";
import type { GraphLayouts, Point } from "@/graph/layouts";
import {
  createInitialHomepageState,
  reduceHomepageState,
  type DurableHomepageState,
} from "@/state/homepage-state";
import {
  canonicalizeHomepageState,
  parseHomepageUrl,
  serializeHomepageState,
} from "@/state/homepage-url";
import {
  homepageBackStrategy,
  pushHomepageUrl,
  replaceHomepageUrl,
} from "@/state/homepage-history";
import { adjacency } from "@/graph/graph-builder";
import GraphCanvas from "@/components/graph/GraphCanvas";
import GraphDetails from "@/components/graph/GraphDetails";
import SearchPanel from "@/components/search/SearchPanel";
import { getSearchIndex } from "@/search/search-index";
import { rankSearchResults } from "@/search/ranking";
import type { SearchEntry } from "@/search/search-types";

export interface ProjectSummary {
  slug: string;
  title: string;
  tagline: string;
  status: string;
  /** Short provisional contribution line for the Index entry. */
  contribution?: string | undefined;
  /** Primary stack labels for the Index entry. */
  stack?: readonly string[] | undefined;
}

export interface HomepageContact {
  id: string;
  label: string;
  note: string;
  href?: string;
}

export interface HomepageIslandProps {
  graph: HomeGraph;
  layouts: GraphLayouts;
  focusLayouts: FocusLayouts;
  projects: readonly ProjectSummary[];
  contacts: readonly HomepageContact[];
  caseStudyHrefBySlug: Readonly<Record<string, string>>;
}

/** Hover-grace period before a node stops being the active hover (M10). */
const HOVER_GRACE_MS = 150;

/**
 * One durable homepage state owner (Goal 3 M2/M9). Renders both views
 * server-side; after hydration the inactive view is hidden per state.
 * Ephemeral interaction state stays in local component state.
 */
export default function HomepageIsland({
  graph,
  layouts,
  focusLayouts,
  projects,
  contacts,
  caseStudyHrefBySlug,
}: HomepageIslandProps) {
  const knownSlugs = useMemo(() => projects.map((p) => p.slug), [projects]);

  const [durable, dispatch] = useReducer(
    reduceHomepageState,
    undefined,
    (): DurableHomepageState => {
      if (typeof window === "undefined") return createInitialHomepageState();
      const explicitView = new URLSearchParams(window.location.search).get("view");
      const parsed = parseHomepageUrl(window.location.search, { knownSlugs });
      const state = canonicalizeHomepageState(parsed, knownSlugs);
      // Device default: phones get the stable Index unless the URL is explicit.
      if (!explicitView && window.innerWidth < 768) {
        return { ...state, view: "index" };
      }
      return state;
    },
  );

  // Ephemeral interaction state — deliberately outside URL/history.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);
  const [pinnedNodeId, setPinnedNodeId] = useState<string | null>(null);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bannerRef = useRef<HTMLParagraphElement | null>(null);

  // Boot: canonicalize the URL once and mark direct deep links.
  useEffect(() => {
    replaceHomepageUrl(serializeHomepageState(durable), "deep-link");
  }, []);

  // Browser Back/Forward re-derives state from the URL; never writes history.
  useEffect(() => {
    const onPopstate = () => {
      const next = canonicalizeHomepageState(
        parseHomepageUrl(window.location.search, { knownSlugs }),
        knownSlugs,
      );
      dispatch({ type: "hydrate", state: next });
    };
    window.addEventListener("popstate", onPopstate);
    return () => window.removeEventListener("popstate", onPopstate);
  }, [knownSlugs]);

  /** Apply a durable transition and sync the URL with the right method. */
  const applyTransition = useCallback(
    (next: DurableHomepageState, method: "push" | "replace") => {
      dispatch({ type: "hydrate", state: next });
      const query = serializeHomepageState(next);
      if (method === "push") pushHomepageUrl(query);
      else replaceHomepageUrl(query);
    },
    [],
  );

  const focusedSlug = durable.scene.kind === "project" ? durable.scene.slug : null;

  // Scene layout: authored home preset or authored focus preset.
  const viewport =
    typeof window === "undefined" || window.innerWidth >= 1100 ? "wide" : "laptop";
  const layoutNodes: Record<string, Point> =
    (focusedSlug ? focusLayouts[viewport]?.[focusedSlug]?.nodes : undefined) ??
    layouts[viewport].nodes;

  // ---- Interaction resolution ----
  const relatedIdsByNode = useMemo(() => adjacency(graph), [graph]);
  const activeNodeId = focusedNodeId ?? pinnedNodeId ?? hoveredNodeId;

  // ---- Search ----
  const searchResults = useMemo(
    () =>
      durable.search.open && durable.search.query.trim()
        ? rankSearchResults(getSearchIndex(), durable.search.query)
        : [],
    [durable.search.open, durable.search.query],
  );
  const searchMatchIds = useMemo(() => {
    if (!searchResults.length) return null;
    return new Set(
      searchResults
        .map((r) => r.entry.nodeId)
        .filter((id): id is string => Boolean(id)),
    );
  }, [searchResults]);
  const searchRelatedIds = useMemo(() => {
    if (!searchMatchIds) return new Set<string>();
    const related = new Set<string>();
    for (const id of searchMatchIds) {
      for (const neighbor of relatedIdsByNode.get(id) ?? []) related.add(neighbor);
    }
    return related;
  }, [searchMatchIds, relatedIdsByNode]);

  const highlightIds: Set<string> | null =
    searchMatchIds ?? (activeNodeId ? new Set([activeNodeId]) : null);
  const relatedForHighlight = useMemo(() => {
    if (searchMatchIds) return searchRelatedIds;
    return activeNodeId
      ? (relatedIdsByNode.get(activeNodeId) ?? new Set<string>())
      : new Set<string>();
  }, [searchMatchIds, searchRelatedIds, activeNodeId, relatedIdsByNode]);

  const activeDetailNode = useMemo(
    () =>
      activeNodeId
        ? (graph.nodes.find((node) => node.id === activeNodeId) ?? null)
        : null,
    [activeNodeId, graph.nodes],
  );

  // ---- Action wrappers ----
  const handleSetView = useCallback(
    (view: "graph" | "index") => {
      if (view === durable.view) return;
      applyTransition(reduceHomepageState(durable, { type: "setView", view }), "push");
    },
    [applyTransition, durable],
  );

  const handleGoHome = useCallback(() => {
    if (homepageBackStrategy() === "history") {
      window.history.back();
      return;
    }
    applyTransition(reduceHomepageState(durable, { type: "goHome" }), "replace");
  }, [applyTransition, durable]);

  const handleSearchQuery = useCallback(
    (query: string) =>
      applyTransition(
        reduceHomepageState(durable, { type: "searchQuery", query }),
        "replace",
      ),
    [applyTransition, durable],
  );

  const handleSearchClose = useCallback(() => {
    applyTransition(reduceHomepageState(durable, { type: "searchClose" }), "replace");
  }, [applyTransition, durable]);

  const handleActivateResult = useCallback(
    (entry: SearchEntry) => {
      if (entry.kind === "project" && entry.projectSlugs[0]) {
        const slug = entry.projectSlugs[0];
        let next = reduceHomepageState(durable, { type: "focusProject", slug });
        next = reduceHomepageState(next, { type: "searchClose" });
        applyTransition(next, "push");
        // Move keyboard focus to the focus banner's Back control landmark.
        requestAnimationFrame(() => {
          bannerRef.current?.querySelector("button")?.focus();
        });
        return;
      }
      // Technology/concept/story/profile results pin their graph context.
      if (entry.nodeId) {
        setPinnedNodeId(entry.nodeId);
        setHoveredNodeId(null);
        if (durable.view !== "graph") {
          applyTransition(
            reduceHomepageState(durable, { type: "setView", view: "graph" }),
            "replace",
          );
        }
      }
    },
    [applyTransition, durable],
  );

  // Escape priority: search > pinned > focused scene.
  const handleEscape = useCallback(() => {
    if (durable.search.open) {
      handleSearchClose();
      return;
    }
    if (pinnedNodeId) {
      setPinnedNodeId(null);
      return;
    }
    if (focusedSlug || durable.view !== "graph") handleGoHome();
  }, [
    durable.search.open,
    durable.view,
    focusedSlug,
    handleGoHome,
    handleSearchClose,
    pinnedNodeId,
  ]);

  // Escape works from any focused descendant via bubbling (M6 priority).
  const islandRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") handleEscape();
    };
    const el = islandRef.current;
    el?.addEventListener("keydown", onKeyDown);
    return () => el?.removeEventListener("keydown", onKeyDown);
  }, [handleEscape]);

  // ---- Hover grace (M10): leaving a node starts a short timer; entering the
  // details region or another node cancels it. Keyboard focus supersedes. ----
  const handleNodeHover = useCallback((nodeId: string | null) => {
    if (nodeId !== null) {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
      setHoveredNodeId(nodeId);
      return;
    }
    hoverTimerRef.current = setTimeout(() => setHoveredNodeId(null), HOVER_GRACE_MS);
  }, []);

  const cancelHoverExpiry = useCallback(() => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
  }, []);

  useEffect(
    () => () => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    },
    [],
  );

  const focusedProjectTitle = focusedSlug
    ? (projects.find((p) => p.slug === focusedSlug)?.title ?? focusedSlug)
    : null;

  return (
    <div
      ref={islandRef}
      className="homepage-island"
      role="group"
      aria-label="Interactive project explorer"
      data-hydrated={mounted ? "true" : "false"}
    >
      <div className="homepage-controls">
        <div className="view-switch" role="group" aria-label="Homepage view">
          <button
            type="button"
            className={`control-button${durable.view === "graph" ? " control-button-active" : ""}`}
            aria-pressed={durable.view === "graph"}
            onClick={() => handleSetView("graph")}
          >
            Graph
          </button>
          <button
            type="button"
            className={`control-button${durable.view === "index" ? " control-button-active" : ""}`}
            aria-pressed={durable.view === "index"}
            onClick={() => handleSetView("index")}
          >
            Index
          </button>
        </div>
        <button
          type="button"
          className="control-button"
          onClick={() => {
            applyTransition(
              reduceHomepageState(durable, { type: "searchOpen" }),
              "replace",
            );
          }}
        >
          Search
        </button>
      </div>

      {focusedSlug ? (
        <p className="focus-banner" ref={bannerRef}>
          Focused on <strong>{focusedProjectTitle}</strong>
          <button type="button" className="control-button" onClick={handleGoHome}>
            Back to Home
          </button>
          <a
            className="control-button control-link"
            href={caseStudyHrefBySlug[focusedSlug]}
          >
            View Case Study
          </a>
        </p>
      ) : null}

      {/* Graph view. Hidden on narrow screens via CSS (Index is primary there). */}
      <section
        className={`homepage-view-graph${mounted && durable.view !== "graph" ? " view-hidden" : ""}`}
        aria-labelledby="graph-heading"
        aria-hidden={mounted && durable.view !== "graph"}
      >
        <h2 id="graph-heading" className="visually-hidden">
          Project graph
        </h2>
        <GraphCanvas
          graph={graph}
          layoutNodes={layoutNodes}
          highlightIds={highlightIds}
          relatedIds={relatedForHighlight}
          pinnedNodeId={pinnedNodeId}
          onNodeHover={handleNodeHover}
          onNodeFocusChange={(nodeId) => {
            cancelHoverExpiry();
            setFocusedNodeId(nodeId);
          }}
          onNodeActivate={(nodeId) => {
            // Explicit activation of a project enters its curated focus
            // scene (Concept note: clicking a project recenters); other
            // node kinds toggle their pinned detail.
            const slug = nodeId.startsWith("project:")
              ? nodeId.slice("project:".length)
              : null;
            if (slug && caseStudyHrefBySlug[slug]) {
              setPinnedNodeId(null);
              setHoveredNodeId(null);
              applyTransition(
                reduceHomepageState(durable, { type: "focusProject", slug }),
                "push",
              );
              return;
            }
            setPinnedNodeId((prev) => (prev === nodeId ? null : nodeId));
          }}
        />
        <div onMouseEnter={cancelHoverExpiry}>
          <GraphDetails
            graph={graph}
            activeNode={activeDetailNode}
            pinned={pinnedNodeId !== null}
            relatedIdsByNode={relatedIdsByNode}
          />
        </div>
        <SearchPanel
          open={durable.search.open}
          query={durable.search.query}
          results={searchResults}
          activeResultIndex={durable.search.activeResultIndex}
          onQueryChange={handleSearchQuery}
          onActiveIndexChange={(index) =>
            dispatch({ type: "searchActiveResult", index })
          }
          onActivateResult={handleActivateResult}
          onClose={handleSearchClose}
        />
      </section>

      {/* Index view — the complete semantic fallback content. */}
      <section
        className={`homepage-view-index${mounted && durable.view !== "index" ? " view-hidden" : ""}`}
        id="project-index"
        aria-labelledby="project-index-heading"
        aria-hidden={mounted && durable.view !== "index"}
      >
        <h2 id="project-index-heading">Project index</h2>
        <ul className="project-list">
          {projects.map((project) => (
            <li key={project.slug} className="project-card">
              <h3>
                <a
                  href={
                    caseStudyHrefBySlug[project.slug] ?? `/projects/${project.slug}/`
                  }
                >
                  {project.title}
                </a>
              </h3>
              <p>
                {project.tagline}{" "}
                {project.status === "placeholder" ? (
                  <span className="badge">Placeholder case study</span>
                ) : null}
              </p>
              {project.contribution ? (
                <p className="index-contribution">{project.contribution}</p>
              ) : null}
              {project.stack && project.stack.length > 0 ? (
                <p className="index-stack">
                  {project.stack.map((label) => (
                    <span key={label} className="badge">
                      {label}
                    </span>
                  ))}
                </p>
              ) : null}
            </li>
          ))}
        </ul>

        <h2>Find me</h2>
        <ul className="contact-list">
          {contacts.map((contact) => (
            <li key={contact.id} id={contact.id}>
              <strong>{contact.label}:</strong>{" "}
              {contact.href ? (
                <a href={contact.href}>{contact.note}</a>
              ) : (
                <span className="placeholder-note">{contact.note}</span>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
