import { z } from "zod";

/**
 * Phase 2 home-graph domain model.
 *
 * Node kinds are limited to person/project/story/technology. Memory,
 * concept, utility, and LeetCode nodes are later-phase concerns and are
 * deliberately absent here (see docs/decisions-log.md R2).
 */

export const NODE_KIND_VALUES = ["person", "project", "story", "technology"] as const;
export const EDGE_KIND_VALUES = ["ownership", "motivation", "technology"] as const;
export const LAYOUT_VIEWPORTS = ["wide", "laptop"] as const;

export type NodeKind = (typeof NODE_KIND_VALUES)[number];
export type EdgeKind = (typeof EDGE_KIND_VALUES)[number];
export type LayoutViewport = (typeof LAYOUT_VIEWPORTS)[number];

/** Lower priority number = more visually prominent. */
export const nodePrioritySchema = z.number().int().min(1).max(3);

const semanticIdSchema = z
  .string()
  .trim()
  .min(1, "id must not be empty")
  .max(120, "id must be at most 120 characters")
  .regex(
    /^[a-z0-9]+(?::[a-z0-9-]+)+$/,
    "id must be a colon-delimited semantic id such as 'person:bi' or 'story:spotify-sorter:motivation'",
  );

export const graphNodeSchema = z
  .object({
    id: semanticIdSchema,
    kind: z.enum(NODE_KIND_VALUES),
    label: z.string().trim().min(1, "node label must not be empty").max(80),
    /** Owning project slug; required for project/story nodes. */
    projectSlug: z.string().optional(),
    /** Short textual detail for the detail region (not full case-study bodies). */
    detail: z.string().trim().min(1, "node detail must not be empty").max(600),
    priority: nodePrioritySchema,
    /** Base-path-safe href produced before hydration (e.g. via withBase). */
    href: z.string().optional(),
  })
  .strict();

export const graphEdgeSchema = z
  .object({
    id: semanticIdSchema,
    kind: z.enum(EDGE_KIND_VALUES),
    source: semanticIdSchema,
    target: semanticIdSchema,
  })
  .strict();

export const homeGraphSchema = z.object({
  nodes: z.array(graphNodeSchema),
  edges: z.array(graphEdgeSchema),
});

export type GraphNode = z.infer<typeof graphNodeSchema>;
export type GraphEdge = z.infer<typeof graphEdgeSchema>;
export type HomeGraph = z.infer<typeof homeGraphSchema>;

export class GraphValidationError extends Error {
  readonly details: string[];

  constructor(message: string, details: string[] = []) {
    super([message, ...details.map((d) => `  - ${d}`)].join("\n"));
    this.name = "GraphValidationError";
    this.details = details;
  }
}

/** A person node's expected id, exported so tests/builders share one constant. */
export const PERSON_NODE_ID_PREFIX = "person:";

/** Semantic edge id: `<kind>:<source>:<target>`. */
export function edgeId(kind: EdgeKind, source: string, target: string): string {
  return `${kind}:${source}:${target}`;
}

export interface GraphValidationContext {
  /** Featured project slugs that must all appear as project nodes. */
  featuredSlugs: readonly string[];
  /**
   * Map of generated case-study route hrefs by slug (already base-safe),
   * e.g. { "spotify-sorter": "/personalSite/projects/spotify-sorter/" }.
   */
  caseStudyHrefBySlug: Readonly<Record<string, string>>;
}

/**
 * Structural + referential validation of a derived graph. Throws
 * GraphValidationError listing every offending ID.
 */
export function validateHomeGraph(
  graph: HomeGraph,
  context: GraphValidationContext,
): void {
  const problems: string[] = [];
  const nodesById = new Map<string, GraphNode>();
  const edgesById = new Map<string, GraphEdge>();

  for (const node of graph.nodes) {
    if (nodesById.has(node.id)) {
      problems.push(`duplicate node ID: ${node.id}`);
      continue;
    }
    nodesById.set(node.id, node);
    if (node.kind === "technology" && node.label.trim() === "") {
      problems.push(`technology node with empty label: ${node.id}`);
    }
    if (node.kind === "project" && !node.href) {
      problems.push(`project node without case-study href: ${node.id}`);
    }
  }

  for (const edge of graph.edges) {
    if (edgesById.has(edge.id)) {
      problems.push(`duplicate edge ID: ${edge.id}`);
      continue;
    }
    edgesById.set(edge.id, edge);
    if (!nodesById.has(edge.source)) {
      problems.push(`edge ${edge.id}: missing source node ${edge.source}`);
    }
    if (!nodesById.has(edge.target)) {
      problems.push(`edge ${edge.id}: missing target node ${edge.target}`);
    }
    if (edge.source === edge.target) {
      problems.push(`self-edge: ${edge.id}`);
    }
  }

  // Story nodes must have an owning project via a motivation edge.
  for (const node of nodesById.values()) {
    if (node.kind !== "story") continue;
    const owned = [...edgesById.values()].some(
      (edge) =>
        edge.kind === "motivation" &&
        (edge.source === node.id || edge.target === node.id) &&
        nodesById.get(edge.source)?.kind === "project",
    );
    if (!owned) {
      problems.push(`story node with no owning project relationship: ${node.id}`);
    }
  }

  // Every featured project must be represented and linked consistently.
  for (const slug of context.featuredSlugs) {
    const projectId = `project:${slug}`;
    const projectNode = nodesById.get(projectId);
    if (!projectNode) {
      problems.push(`featured project missing from graph: ${projectId}`);
      continue;
    }
    const expectedHref = context.caseStudyHrefBySlug[slug];
    if (expectedHref && projectNode.href !== expectedHref) {
      problems.push(
        `case-study href mismatch for ${projectId}: got "${projectNode.href}", expected "${expectedHref}"`,
      );
    }
    const owned = [...edgesById.values()].some(
      (edge) =>
        edge.kind === "ownership" &&
        edge.target === projectId &&
        nodesById.get(edge.source)?.kind === "person",
    );
    if (!owned) {
      problems.push(`project with no person ownership edge: ${projectId}`);
    }
  }

  if (problems.length > 0) {
    throw new GraphValidationError("invalid home graph", problems);
  }
}
