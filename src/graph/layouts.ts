import type { HomeGraph, LayoutViewport } from "./graph-schema";

export type { LayoutViewport };

/**
 * Authored graph layouts (Phase 2). Coordinates are hand-curated in a
 * normalized 0–100 logical space (x grows right, y grows down). No force
 * simulation, physics, randomness, or runtime relaxation — positions are
 * static by design so composition is reviewable and deterministic.
 *
 * Composition principles (M3):
 * - person near the visual center;
 * - projects as strong satellites (priority 1, never tiny);
 * - story nodes hug their project;
 * - shared technologies sit where both projects can reach them readably;
 * - primary nodes keep clear of container edges/controls.
 */

export interface Point {
  x: number;
  y: number;
}

export type HomeLayoutPreset = {
  viewport: LayoutViewport;
  nodes: Record<string, Point>;
};

/*
 * Wide layout — person center; projects upper-left and lower-right;
 * stories flanking outward; technologies bridging underneath/between.
 *
 *            story:game-teacher
 *                    |
 *   story:spotify  project:spotify-sorter      tech:web-audio-api
 *                    \        \
 *                  (person)---- tech:typescript ---- tech:react
 *                    /        /
 *   ...
 */
export const WIDE_LAYOUT: HomeLayoutPreset = {
  viewport: "wide",
  nodes: {
    "person:bi": { x: 50, y: 48 },
    "project:spotify-sorter": { x: 27, y: 26 },
    "project:game-teacher": { x: 73, y: 70 },
    "story:spotify-sorter:motivation": { x: 13, y: 14 },
    "story:game-teacher:motivation": { x: 87, y: 86 },
    "tech:typescript": { x: 50, y: 78 },
    "tech:react": { x: 24, y: 82 },
    "tech:web-audio-api": { x: 12, y: 42 },
    "concept:music-organization": { x: 20, y: 52 },
    "concept:playlist-curation": { x: 36, y: 62 },
    "concept:game-design": { x: 64, y: 56 },
    "concept:teaching": { x: 80, y: 48 },
  },
};

export const LAPTOP_LAYOUT: HomeLayoutPreset = {
  viewport: "laptop",
  nodes: {
    "person:bi": { x: 50, y: 46 },
    "project:spotify-sorter": { x: 28, y: 22 },
    "project:game-teacher": { x: 72, y: 72 },
    "story:spotify-sorter:motivation": { x: 15, y: 10 },
    "story:game-teacher:motivation": { x: 85, y: 88 },
    "tech:typescript": { x: 52, y: 76 },
    "tech:react": { x: 28, y: 80 },
    "tech:web-audio-api": { x: 14, y: 38 },
    "concept:music-organization": { x: 22, y: 50 },
    "concept:playlist-curation": { x: 38, y: 60 },
    "concept:game-design": { x: 62, y: 54 },
    "concept:teaching": { x: 78, y: 46 },
  },
};

/**
 * Mobile home layouts (Goal 4, M13): distinct compositions with reduced
 * supporting density — person and projects are required; stories/concepts
 * may be omitted visually (their information stays reachable via Search,
 * Index, and case studies). Never a scaled-down desktop preset.
 */
export const PHONE_LAYOUT: HomeLayoutPreset = {
  viewport: "phone",
  nodes: {
    "person:bi": { x: 50, y: 18 },
    "project:spotify-sorter": { x: 30, y: 48 },
    "project:game-teacher": { x: 72, y: 74 },
    "tech:typescript": { x: 66, y: 34 },
    "tech:react": { x: 26, y: 80 },
    "tech:web-audio-api": { x: 76, y: 94 },
  },
};

export const PHONE_TALL_LAYOUT: HomeLayoutPreset = {
  viewport: "phone-tall",
  nodes: {
    "person:bi": { x: 50, y: 12 },
    "project:spotify-sorter": { x: 28, y: 40 },
    "project:game-teacher": { x: 70, y: 68 },
    "tech:typescript": { x: 70, y: 28 },
    "tech:react": { x: 24, y: 74 },
    "tech:web-audio-api": { x: 78, y: 92 },
  },
};

export const PHONE_LANDSCAPE_LAYOUT: HomeLayoutPreset = {
  viewport: "phone-landscape",
  nodes: {
    "person:bi": { x: 22, y: 50 },
    "project:spotify-sorter": { x: 52, y: 26 },
    "project:game-teacher": { x: 80, y: 72 },
    "tech:typescript": { x: 56, y: 72 },
    "tech:react": { x: 40, y: 84 },
    "tech:web-audio-api": { x: 46, y: 10 },
  },
};

export const MOBILE_HOME_LAYOUTS: Record<string, HomeLayoutPreset> = {
  phone: PHONE_LAYOUT,
  "phone-tall": PHONE_TALL_LAYOUT,
  "phone-landscape": PHONE_LANDSCAPE_LAYOUT,
};

export const HOME_LAYOUTS: Record<LayoutViewport, HomeLayoutPreset> = {
  wide: WIDE_LAYOUT,
  laptop: LAPTOP_LAYOUT,
  phone: PHONE_LAYOUT,
  "phone-tall": PHONE_TALL_LAYOUT,
  "phone-landscape": PHONE_LANDSCAPE_LAYOUT,
};

/** Preset used for server-rendered markup before hydration measures width. */
export const SSR_DEFAULT_VIEWPORT: LayoutViewport = "wide";

export type GraphLayouts = typeof HOME_LAYOUTS;

/** Select a preset from window dimensions (hydration-time only). */
export function selectViewport(
  widthPx: number,
  heightPx: number = widthPx,
): LayoutViewport {
  if (widthPx <= 767) {
    // Portrait phones vs landscape phones by aspect ratio.
    return heightPx > widthPx
      ? heightPx / widthPx > 1.85
        ? "phone-tall"
        : "phone"
      : "phone-landscape";
  }
  return widthPx >= 1100 ? "wide" : "laptop";
}

/** Edge endpoints resolved from a layout, for the SVG layer. */
export function resolveEdgePoints(
  graph: HomeGraph,
  layout: HomeLayoutPreset,
): Array<{ id: string; from: Point; to: Point }> {
  return graph.edges.flatMap((edge) => {
    const from = layout.nodes[edge.source];
    const to = layout.nodes[edge.target];
    if (!from || !to) return [];
    return [{ id: edge.id, from, to }];
  });
}
