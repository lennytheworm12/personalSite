import type { HomeGraph, LayoutViewport } from "./graph-schema";

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
  },
};

export const HOME_LAYOUTS: Record<LayoutViewport, HomeLayoutPreset> = {
  wide: WIDE_LAYOUT,
  laptop: LAPTOP_LAYOUT,
};

/** Preset used for server-rendered markup before hydration measures width. */
export const SSR_DEFAULT_VIEWPORT: LayoutViewport = "wide";

export type GraphLayouts = typeof HOME_LAYOUTS;

/** Select a preset for a pixel width (hydration-time only). */
export function selectViewport(widthPx: number): LayoutViewport {
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
