import { GraphValidationError } from "./graph-schema";
import type { GraphLayouts, Point } from "./layouts";

export interface LayoutValidationOptions {
  /** Minimum distance (logical units) between any two priority-1 nodes. */
  priority1MinSpacing?: number;
  /** Center-safe region for the person node: inclusive [min,max] per axis. */
  centerRegion?: { minX: number; maxX: number; minY: number; maxY: number };
}

const DEFAULTS = {
  priority1MinSpacing: 18,
  centerRegion: { minX: 40, maxX: 60, minY: 35, maxY: 65 },
};

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * Validate authored layouts against the graph:
 * - every node placed in every preset; no unknown keys;
 * - coordinates numeric and within [0,100];
 * - person inside the central safe region;
 * - priority-1 nodes respect minimum spacing;
 * - featured projects never share (near-)identical positions.
 */
export function validateLayouts(
  graph: {
    nodes: Array<{ id: string; kind: string; priority: number }>;
  },
  layouts: GraphLayouts,
  options: LayoutValidationOptions = {},
): void {
  const minSpacing = options.priority1MinSpacing ?? DEFAULTS.priority1MinSpacing;
  const center = options.centerRegion ?? DEFAULTS.centerRegion;
  const problems: string[] = [];

  const viewports = Object.keys(layouts) as Array<keyof GraphLayouts>;
  for (const viewport of viewports) {
    const layout = layouts[viewport];
    if (layout.viewport !== viewport) {
      problems.push(
        `layout "${viewport}" declares mismatched viewport "${layout.viewport}"`,
      );
    }

    for (const key of Object.keys(layout.nodes)) {
      if (!graph.nodes.some((node) => node.id === key)) {
        problems.push(`unknown layout coordinate ID in ${viewport}: ${key}`);
      }
    }

    for (const node of graph.nodes) {
      const point: Point | undefined = layout.nodes[node.id];
      if (!point) {
        problems.push(`missing ${viewport} coordinates for node: ${node.id}`);
        continue;
      }
      const coords: Array<[string, number]> = [
        ["x", point.x],
        ["y", point.y],
      ];
      for (const [axis, value] of coords) {
        if (typeof value !== "number" || Number.isNaN(value)) {
          problems.push(
            `invalid ${axis} coordinate for ${node.id} in ${viewport}: not a number`,
          );
        } else if (value < 0 || value > 100) {
          problems.push(
            `out-of-bounds ${axis} coordinate for ${node.id} in ${viewport}: ${value}`,
          );
        }
      }
    }

    // Person node must sit inside the defined central region.
    const person = graph.nodes.find((node) => node.kind === "person");
    if (person) {
      const p = layout.nodes[person.id];
      if (
        !p ||
        p.x < center.minX ||
        p.x > center.maxX ||
        p.y < center.minY ||
        p.y > center.maxY
      ) {
        problems.push(`person node outside central region in ${viewport}`);
      }
    }

    // Priority-1 minimum spacing.
    const primaryNodes = graph.nodes.filter((node) => node.priority === 1);
    for (let i = 0; i < primaryNodes.length; i++) {
      for (let j = i + 1; j < primaryNodes.length; j++) {
        const a = layout.nodes[primaryNodes[i].id];
        const b = layout.nodes[primaryNodes[j].id];
        if (!a || !b) continue;
        const d = distance(a, b);
        if (d < minSpacing) {
          problems.push(
            `priority-1 spacing violation in ${viewport}: ${primaryNodes[i].id} ↔ ${primaryNodes[j].id} = ${d.toFixed(1)} < ${minSpacing}`,
          );
        }
      }
    }
  }

  // Featured projects must not occupy identical/near-identical positions.
  const projectIds = graph.nodes.filter((n) => n.kind === "project").map((n) => n.id);
  for (const viewport of viewports) {
    const layout = layouts[viewport];
    for (let i = 0; i < projectIds.length; i++) {
      for (let j = i + 1; j < projectIds.length; j++) {
        const idA = projectIds[i];
        const idB = projectIds[j];
        if (!idA || !idB) continue;
        const a: Point | undefined = layout.nodes[idA];
        const b: Point | undefined = layout.nodes[idB];
        if (a && b && distance(a, b) < 10) {
          problems.push(
            `projects too close together in ${viewport}: ${idA} ↔ ${idB}`
          );
        }
      }
    }
  }

  if (problems.length > 0) {
    throw new GraphValidationError("invalid graph layouts", problems);
  }
}
