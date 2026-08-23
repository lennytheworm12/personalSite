import type { HomeGraph } from "./graph-schema";
import type { GraphLayouts, LayoutViewport, Point } from "./layouts";
import { GraphValidationError } from "./graph-schema";

/**
 * Authored project-focus layouts (Goal 3, M7). One preset per
 * (viewport, featured project). No force simulation — every coordinate is
 * hand-authored and validated.
 *
 * Composition rules:
 * - selected project dominant near center;
 * - its story prominent beside it;
 * - its technologies and concepts surrounding;
 * - person remains a contextual Home reference (edge of composition);
 * - the unrelated project reduces to periphery.
 */

export interface FocusLayoutPreset {
  viewport: LayoutViewport;
  slug: string;
  nodes: Record<string, Point>;
}

export type FocusLayouts = Record<
  LayoutViewport,
  Record<string, FocusLayoutPreset | undefined>
>;

export const FOCUS_LAYOUTS: FocusLayouts = {
  wide: {
    "spotify-sorter": {
      viewport: "wide",
      slug: "spotify-sorter",
      nodes: {
        // Dominant project + story.
        "project:spotify-sorter": { x: 50, y: 44 },
        "story:spotify-sorter:motivation": { x: 24, y: 22 },
        // Its technologies surrounding.
        "tech:typescript": { x: 74, y: 30 },
        "tech:react": { x: 78, y: 58 },
        "tech:web-audio-api": { x: 50, y: 76 },
        // Its concepts.
        "concept:music-organization": { x: 22, y: 62 },
        "concept:playlist-curation": { x: 34, y: 82 },
        // Person contextual; unrelated project peripheral.
        "person:bi": { x: 12, y: 46 },
        "project:game-teacher": { x: 88, y: 86 },
        "story:game-teacher:motivation": { x: 94, y: 96 },
        "concept:game-design": { x: 92, y: 12 },
        "concept:teaching": { x: 97, y: 6 },
      },
    },
    "game-teacher": {
      viewport: "wide",
      slug: "game-teacher",
      nodes: {
        "project:game-teacher": { x: 52, y: 48 },
        "story:game-teacher:motivation": { x: 80, y: 26 },
        "tech:typescript": { x: 28, y: 32 },
        "tech:react": { x: 24, y: 62 },
        "concept:game-design": { x: 56, y: 78 },
        "concept:teaching": { x: 76, y: 66 },
        "person:bi": { x: 90, y: 48 },
        "project:spotify-sorter": { x: 10, y: 14 },
        "story:spotify-sorter:motivation": { x: 4, y: 4 },
        "tech:web-audio-api": { x: 8, y: 90 },
        "concept:music-organization": { x: 40, y: 8 },
        "concept:playlist-curation": { x: 20, y: 88 },
      },
    },
  },
  laptop: {
    "spotify-sorter": {
      viewport: "laptop",
      slug: "spotify-sorter",
      nodes: {
        "project:spotify-sorter": { x: 50, y: 42 },
        "story:spotify-sorter:motivation": { x: 26, y: 18 },
        "tech:typescript": { x: 74, y: 28 },
        "tech:react": { x: 76, y: 58 },
        "tech:web-audio-api": { x: 50, y: 74 },
        "concept:music-organization": { x: 24, y: 60 },
        "concept:playlist-curation": { x: 36, y: 80 },
        "person:bi": { x: 13, y: 44 },
        "project:game-teacher": { x: 87, y: 84 },
        "story:game-teacher:motivation": { x: 93, y: 94 },
        "concept:game-design": { x: 91, y: 12 },
        "concept:teaching": { x: 96, y: 5 },
      },
    },
    "game-teacher": {
      viewport: "laptop",
      slug: "game-teacher",
      nodes: {
        "project:game-teacher": { x: 52, y: 46 },
        "story:game-teacher:motivation": { x: 79, y: 24 },
        "tech:typescript": { x: 29, y: 30 },
        "tech:react": { x: 25, y: 60 },
        "concept:game-design": { x: 55, y: 76 },
        "concept:teaching": { x: 75, y: 64 },
        "person:bi": { x: 89, y: 46 },
        "project:spotify-sorter": { x: 11, y: 13 },
        "story:spotify-sorter:motivation": { x: 5, y: 4 },
        "tech:web-audio-api": { x: 9, y: 89 },
        "concept:music-organization": { x: 41, y: 7 },
        "concept:playlist-curation": { x: 21, y: 87 },
      },
    },
  },
};

/**
 * Validate focus layouts against the graph:
 * - one preset per (viewport, featured slug);
 * - every graph node placed exactly once per preset (no unknown IDs);
 * - selected project central; related story/tech/concepts within bounds;
 * - coordinates numeric and in [0,100];
 * - minimum separation between the focused project and any other node.
 */
export function validateFocusLayouts(
  graph: HomeGraph,
  layouts: FocusLayouts,
  options: { featuredSlugs?: readonly string[]; minSeparation?: number } = {},
): void {
  const problems: string[] = [];
  const viewports = Object.keys(layouts) as Array<keyof FocusLayouts>;
  const featuredSlugs = options.featuredSlugs ?? [];
  const minSeparation = options.minSeparation ?? 12;

  const nodeById = new Map(graph.nodes.map((node) => [node.id, node] as const));
  const relatedIdsBySlug = new Map<string, Set<string>>();
  for (const edge of graph.edges) {
    for (const [from, to] of [
      [edge.source, edge.target],
      [edge.target, edge.source],
    ] as const) {
      const fromNode = nodeById.get(from);
      if (!fromNode || fromNode.kind !== "project") continue;
      const targetId = to;
      if (!relatedIdsBySlug.has(fromNode.projectSlug ?? "")) {
        relatedIdsBySlug.set(fromNode.projectSlug ?? "", new Set());
      }
      relatedIdsBySlug.get(fromNode.projectSlug ?? "")?.add(targetId);
    }
  }

  for (const viewport of viewports) {
    for (const slug of featuredSlugs) {
      const preset = layouts[viewport][slug];
      if (!preset) {
        problems.push(`missing ${viewport} focus layout for ${slug}`);
        continue;
      }
      if (preset.slug !== slug || preset.viewport !== viewport) {
        problems.push(`focus layout metadata mismatch for ${viewport}/${slug}`);
      }

      for (const key of Object.keys(preset.nodes)) {
        if (!nodeById.has(key)) {
          problems.push(
            `unknown coordinate ID in focus layout ${viewport}/${slug}: ${key}`,
          );
        }
      }

      const projectId = `project:${slug}`;
      const focused = preset.nodes[projectId];
      if (!focused) {
        problems.push(`focused project not placed: ${projectId} (${viewport})`);
        continue;
      }
      if (
        typeof focused.x !== "number" ||
        typeof focused.y !== "number" ||
        Number.isNaN(focused.x) ||
        Number.isNaN(focused.y)
      ) {
        problems.push(
          `invalid focused-project coordinates for ${projectId} (${viewport})`,
        );
      } else if (focused.x < 35 || focused.x > 65 || focused.y < 30 || focused.y > 70) {
        problems.push(
          `focused project not sufficiently central in ${viewport}/${slug}`,
        );
      }

      for (const node of graph.nodes) {
        const point = preset.nodes[node.id];
        if (!point) {
          problems.push(
            `missing focus coordinate for ${node.id} in ${viewport}/${slug}`,
          );
          continue;
        }
        for (const value of [point.x, point.y]) {
          if (
            typeof value !== "number" ||
            Number.isNaN(value) ||
            value < 0 ||
            value > 100
          ) {
            problems.push(
              `out-of-bounds coordinate for ${node.id} in focus layout ${viewport}/${slug}`,
            );
          }
        }
      }

      // Required related nodes must be reasonably close to the focus.
      const related = relatedIdsBySlug.get(slug) ?? new Set<string>();
      const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
      for (const relatedId of related) {
        const point = preset.nodes[relatedId];
        if (!point) continue;
        const d = distance(focused, point);
        if (d > 45) {
          problems.push(
            `related node too far from focus in ${viewport}/${slug}: ${relatedId} at ${d.toFixed(1)}`,
          );
        }
      }

      // Focused project must keep practical separation from everything else.
      for (const node of graph.nodes) {
        if (node.id === projectId) continue;
        const point = preset.nodes[node.id];
        if (!point) continue;
        const d = distance(focused, point);
        if (d < minSeparation) {
          problems.push(
            `separation violation in focus layout ${viewport}/${slug}: ${node.id} at ${d.toFixed(1)} < ${minSeparation}`,
          );
        }
      }
    }
  }

  if (problems.length > 0) {
    throw new GraphValidationError("invalid project-focus layouts", problems);
  }
}

/** Resolve the preset for a scene/viewport with a safe Home fallback. */
export function resolveFocusLayout(
  layouts: FocusLayouts,
  viewport: LayoutViewport,
  slug: string,
): FocusLayoutPreset | null {
  return layouts[viewport]?.[slug] ?? null;
}

export type { GraphLayouts };
