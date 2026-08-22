import { withBase } from "@/lib/base-path";
import type { ProjectRecord } from "@/content/project-schema";
import type { Profile } from "@/content/profile";
import {
  edgeId,
  validateHomeGraph,
  type GraphEdge,
  type GraphNode,
  type HomeGraph,
} from "./graph-schema";

export interface GraphBuilderInput {
  profile: Profile;
  projects: readonly ProjectRecord[];
}

export interface HomeGraphResult {
  graph: HomeGraph;
  /** Base-safe case-study href per slug, used for validation and details. */
  caseStudyHrefBySlug: Record<string, string>;
}

/**
 * Deterministically derive the home graph from the shared project content.
 *
 * - person -> project edges are `ownership`
 * - project -> story edges are `motivation` (one motivation story per project)
 * - project -> technology edges are `technology`; identical technology ids
 *   across projects collapse into ONE shared tech node
 *
 * Node and edge arrays are sorted by ID so output is fully deterministic.
 */
export function buildHomeGraph(input: GraphBuilderInput): HomeGraphResult {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const caseStudyHrefBySlug: Record<string, string> = {};

  nodes.push({
    id: input.profile.nodeId,
    kind: "person",
    label: input.profile.name,
    detail: input.profile.intro.text,
    priority: 1,
    href: withBase("/about/"),
  });

  const featuredProjects = input.projects.filter((project) => project.featured);
  const technologyNodesById = new Map<string, GraphNode>();

  for (const project of featuredProjects) {
    const projectId = `project:${project.slug}`;
    const href = withBase(`/projects/${project.slug}/`);
    caseStudyHrefBySlug[project.slug] = href;

    nodes.push({
      id: projectId,
      kind: "project",
      label: project.title,
      projectSlug: project.slug,
      detail: project.contribution?.text ?? project.summary,
      priority: 1,
      href,
    });

    // person -> project ownership
    edges.push({
      id: edgeId("ownership", input.profile.nodeId, projectId),
      kind: "ownership",
      source: input.profile.nodeId,
      target: projectId,
    });

    // project -> story (motivation)
    const storyId = `story:${project.slug}:motivation`;
    nodes.push({
      id: storyId,
      kind: "story",
      label: `Why ${project.title}?`,
      projectSlug: project.slug,
      detail:
        project.motivation?.text ??
        `The motivation behind ${project.title} has not been documented yet.`,
      priority: 2,
    });
    edges.push({
      id: edgeId("motivation", projectId, storyId),
      kind: "motivation",
      source: projectId,
      target: storyId,
    });

    // project -> technology (shared ids collapse into one node)
    for (const technology of project.technologies) {
      const techId = `tech:${technology.id}`;
      let techNode = technologyNodesById.get(techId);
      if (!techNode) {
        techNode = {
          id: techId,
          kind: "technology",
          label: technology.label,
          detail: technology.purpose.text,
          priority: 3,
        };
        technologyNodesById.set(techId, techNode);
        nodes.push(techNode);
      }
      edges.push({
        id: edgeId("technology", projectId, techId),
        kind: "technology",
        source: projectId,
        target: techId,
      });
    }
  }

  const graph: HomeGraph = {
    nodes: [...nodes].sort((a, b) => a.id.localeCompare(b.id)),
    edges: [...edges].sort((a, b) => a.id.localeCompare(b.id)),
  };

  validateHomeGraph(graph, {
    featuredSlugs: featuredProjects.map((p) => p.slug),
    caseStudyHrefBySlug,
  });

  return { graph, caseStudyHrefBySlug };
}

/** Related-node lookup used by interaction highlighting. */
export function adjacency(graph: HomeGraph): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  for (const node of graph.nodes) map.set(node.id, new Set());
  for (const edge of graph.edges) {
    map.get(edge.source)?.add(edge.target);
    map.get(edge.target)?.add(edge.source);
  }
  return map;
}
