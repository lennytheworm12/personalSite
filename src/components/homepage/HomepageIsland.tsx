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
import { selectViewport } from "@/graph/layouts";
import {
  decideBoot,
  isIntroComplete,
  isMobileViewport,
  markIntroComplete,
  prefersReducedMotion,
  readStoredView,
  storeView,
} from "@/state/mobile-preferences";
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

/** Total first-visit mobile intro duration (Goal 4 M16 target ~2.5-3s). */
const INTRO_DURATION_MS = 2800;

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
      const params = new URLSearchParams(window.location.search);
      const decision = decideBoot({
        explicitUrlView: params.get("view"),
        hasExplicitUrlIntent:
          params.has("view") || params.has("focus") || params.has("q"),
        widthPx: window.innerWidth,
        reducedMotion: prefersReducedMotion(),
        introComplete: isIntroComplete(),
        storedPreference: readStoredView(),
      });
      const parsed = parseHomepageUrl(window.location.search, { knownSlugs });
      const state = canonicalizeHomepageState(parsed, knownSlugs);
      return { ...state, view: decision.view };
    },
  );

  /**
   * First-visit mobile intro (Goal 4 M16). Purely client-side presentation
   * state: it never enters URL/history and only starts when decideBoot says
   * it is eligible.
   */
  const [introActive, setIntroActive] = useState(false);
  const introTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Device + viewport tracking (reactive to resizes). */
  const [dims, setDims] = useState<{ w: number; h: number }>(() => ({
    w: typeof window === "undefined" ? 1280 : window.innerWidth,
    h: typeof window === "undefined" ? 800 : window.innerHeight,
  }));
  useEffect(() => {
    const onResize = () => setDims({ w: window.innerWidth, h: window.innerHeight });
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  const isMobile = isMobileViewport(dims.w);

  // Ephemeral interaction state — deliberately outside URL/history.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);
  const [pinnedNodeId, setPinnedNodeId] = useState<string | null>(null);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bannerRef = useRef<HTMLParagraphElement | null>(null);

  // Boot: compute the boot decision from the ORIGINAL URL first, then
  // canonicalize the address bar. Computing afterwards would see our own
  // ?view= write and wrongly suppress the mobile intro.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const decision = decideBoot({
      explicitUrlView: params.get("view"),
      hasExplicitUrlIntent:
        params.has("view") || params.has("focus") || params.has("q"),
      widthPx: window.innerWidth,
      reducedMotion: prefersReducedMotion(),
      introComplete: isIntroComplete(),
      storedPreference: readStoredView(),
    });
    replaceHomepageUrl(serializeHomepageState(durable), "deep-link");
    if (decision.introEligible) setIntroActive(true);
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

  // Scene layout: authored home preset or authored focus preset. Focus
  // layouts exist only for wide/laptop; mobile uses preview cards.
  const viewport = selectViewport(dims.w, dims.h);
  const focusPresets =
    viewport === "wide" || viewport === "laptop" ? focusLayouts[viewport] : undefined;
  const layoutNodes: Record<string, Point> =
    (focusedSlug ? focusPresets?.[focusedSlug]?.nodes : undefined) ??
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
      // Explicit user choice -> persist (M15). Breakpoint-induced or intro
      // transitions never call this.
      storeView(view);
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

  // ---- First-visit intro lifecycle (Goal 4 M16) ----
  const endIntro = useCallback((complete: boolean) => {
    if (introTimerRef.current) clearTimeout(introTimerRef.current);
    if (complete) markIntroComplete();
    setIntroActive(false);
  }, []);

  const skipIntro = useCallback(() => {
    endIntro(true);
    // Completing an automatic sequence: replace, not push.
    applyTransition(
      reduceHomepageState(durable, { type: "setView", view: "index" }),
      "replace",
    );
  }, [applyTransition, durable, endIntro]);

  useEffect(() => {
    if (!introActive) return;
    // Finite sequence (~2.8s); no animation loop anywhere.
    introTimerRef.current = setTimeout(() => endIntro(true), INTRO_DURATION_MS);
    const cancel = () => endIntro(true);
    const onVisibility = () => {
      if (document.visibilityState === "hidden") cancel();
    };
    window.addEventListener("touchstart", cancel, { passive: true });
    window.addEventListener("scroll", cancel, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      if (introTimerRef.current) clearTimeout(introTimerRef.current);
      window.removeEventListener("touchstart", cancel);
      window.removeEventListener("scroll", cancel);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [endIntro, introActive]);

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

      {introActive && isMobile ? (
        <div className="intro-overlay" data-intro-phase="me">
          <p className="visually-hidden" aria-live="polite">
            Introduction to the project graph. Skip anytime.
          </p>
          <button
            type="button"
            className="control-button intro-skip"
            onClick={skipIntro}
          >
            Skip to projects
          </button>
        </div>
      ) : null}

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
        className={`homepage-view-graph homepage-graph${introActive ? " intro-active" : ""}${mounted && !introActive && durable.view !== "graph" ? " view-hidden" : ""}`}
        aria-labelledby="graph-heading"
        aria-hidden={mounted && !introActive && durable.view !== "graph"}
      >
        <h2 id="graph-heading" className="visually-hidden">
          Project graph
        </h2>
        {isMobile ? (
          <p className="mobile-graph-note">
            The Index is the stable way to browse everything — this graph is an optional
            visual view.
          </p>
        ) : null}
        {isMobile && focusedSlug ? null : (
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
        )}
        {isMobile && focusedSlug ? null : (
          <div onMouseEnter={cancelHoverExpiry}>
            <GraphDetails
              graph={graph}
              activeNode={activeDetailNode}
              pinned={pinnedNodeId !== null}
              relatedIdsByNode={relatedIdsByNode}
            />
          </div>
        )}
      </section>

      {/* Mobile project preview (Goal 4): ?focus= resolves to this stable
          card on phones regardless of Graph/Index view. */}
      {isMobile && focusedSlug ? (
        <MobileProjectPreview
          project={
            projects.find((candidate) => candidate.slug === focusedSlug) ?? {
              slug: focusedSlug,
              title: focusedSlug,
              tagline: "",
              status: "published",
            }
          }
          caseStudyHref={caseStudyHrefBySlug[focusedSlug]}
          onBackToHome={handleGoHome}
          onOpenIndex={() => handleSetView("index")}
          onBack={
            homepageBackStrategy() === "history"
              ? () => window.history.back()
              : handleGoHome
          }
        />
      ) : null}

      {/* Search serves both views with the same engine and URL semantics. */}
      <SearchPanel
        open={durable.search.open}
        query={durable.search.query}
        results={searchResults}
        activeResultIndex={durable.search.activeResultIndex}
        onQueryChange={handleSearchQuery}
        onActiveIndexChange={(index) => dispatch({ type: "searchActiveResult", index })}
        onActivateResult={handleActivateResult}
        onClose={handleSearchClose}
      />

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

function MobileProjectPreview(props: {
  project: ProjectSummary;
  caseStudyHref?: string | undefined;
  onBackToHome: () => void;
  onOpenIndex: () => void;
  onBack: () => void;
}) {
  const { project, caseStudyHref, onBackToHome, onOpenIndex, onBack } = props;
  return (
    <section
      className="mobile-project-preview"
      aria-labelledby="mobile-preview-heading"
    >
      <h3 id="mobile-preview-heading">{project.title}</h3>
      <p>{project.tagline}</p>
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
      <div className="mobile-preview-actions">
        {caseStudyHref ? (
          <a className="control-button control-link" href={caseStudyHref}>
            View Case Study
          </a>
        ) : null}
        <button type="button" className="control-button" onClick={onOpenIndex}>
          Index
        </button>
        <button type="button" className="control-button" onClick={onBackToHome}>
          Home
        </button>
        <button type="button" className="control-button" onClick={onBack}>
          Back
        </button>
      </div>
    </section>
  );
}
