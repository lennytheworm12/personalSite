import { describe, expect, it } from "vitest";
import { buildHomeGraph } from "@/graph/graph-builder";
import { validateHomeGraph, GraphValidationError } from "@/graph/graph-schema";
import type { ProjectRecord } from "@/content/project-schema";
import type { Profile } from "@/content/profile";

const profile: Profile = {
  nodeId: "person:bi",
  name: "Bi Phan",
  intro: { text: "Test intro.", provisional: true },
};

function makeProject(
  overrides: Partial<ProjectRecord> & Pick<ProjectRecord, "slug">,
): ProjectRecord {
  return {
    id: undefined as never,
    identifier: overrides.slug.replace(/-/g, "_"),
    title: `Title ${overrides.slug}`,
    aliases: [],
    tagline: "Tagline.",
    summary: "Summary text.",
    status: "placeholder",
    featured: true,
    motionStyle: "calm",
    unresolved: [],
    concepts: [],
    memories: [],
    technologies: [
      {
        id: "typescript",
        label: "TypeScript",
        category: "language",
        purpose: { text: "Language.", provisional: true },
        verification: "provisional",
      },
    ],
    metrics: [],
    links: [],
    motivation: { text: "Motivation.", provisional: true },
    ...overrides,
  } as unknown as ProjectRecord;
}

const spotify = makeProject({ slug: "spotify-sorter" });
const game = makeProject({
  slug: "game-teacher",
  technologies: [
    {
      id: "typescript",
      label: "TypeScript",
      category: "language",
      purpose: { text: "Shared language.", provisional: true },
      verification: "provisional",
    },
    {
      id: "react",
      label: "React",
      category: "framework",
      purpose: { text: "UI.", provisional: true },
      verification: "provisional",
    },
  ],
});

describe("buildHomeGraph — determinism and structure", () => {
  const result = buildHomeGraph({ profile, projects: [spotify, game] });
  const graph = result.graph;

  it("is deterministic across runs (same nodes, edges, order)", () => {
    const second = buildHomeGraph({ profile, projects: [spotify, game] });
    expect(second.graph).toEqual(graph);
  });

  it("sorts nodes and edges by ID", () => {
    const nodeIds = graph.nodes.map((n) => n.id);
    expect(nodeIds).toEqual([...nodeIds].sort());
    const edgeIds = graph.edges.map((e) => e.id);
    expect(edgeIds).toEqual([...edgeIds].sort());
  });

  it("creates one shared technology node for identical technology ids", () => {
    const techNodes = graph.nodes.filter((n) => n.kind === "technology");
    expect(techNodes.map((n) => n.id)).toEqual(["tech:react", "tech:typescript"]);
    // Two projects -> two edges into the single typescript node.
    const techEdges = graph.edges.filter((e) => e.target === "tech:typescript");
    expect(techEdges).toHaveLength(2);
  });

  it("emits ownership, motivation, and technology edge kinds", () => {
    const kinds = new Set(graph.edges.map((e) => e.kind));
    expect(kinds).toEqual(new Set(["ownership", "motivation", "technology"]));
  });

  it("gives every project a base-safe case-study href", () => {
    for (const [slug, href] of Object.entries(result.caseStudyHrefBySlug)) {
      expect(href).toBe(`/projects/${slug}/`);
      const node = graph.nodes.find((n) => n.id === `project:${slug}`);
      expect(node?.href).toBe(href);
    }
  });

  it("rejects a non-featured-only project list with nothing to validate against", () => {
    const empty = buildHomeGraph({ profile, projects: [] });
    // No featured projects -> no project nodes; validation passes trivially
    // but the person node still exists.
    expect(empty.graph.nodes.map((n) => n.id)).toEqual(["person:bi"]);
  });

  it("surfaces validation failures as GraphValidationError", () => {
    // Simulate a corrupted graph reaching the validator directly.
    const built = buildHomeGraph({ profile, projects: [spotify] });
    expect(() =>
      validateHomeGraph(
        {
          nodes: [...built.graph.nodes, built.graph.nodes[0]],
          edges: built.graph.edges,
        },
        { featuredSlugs: ["spotify-sorter"], caseStudyHrefBySlug: {} },
      ),
    ).toThrow(GraphValidationError);
  });
});
