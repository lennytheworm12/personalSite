import { describe, expect, it } from "vitest";
import {
  edgeId,
  validateHomeGraph,
  type GraphEdge,
  type GraphNode,
  type HomeGraph,
} from "@/graph/graph-schema";

const person: GraphNode = {
  id: "person:test",
  kind: "person",
  label: "Test Person",
  detail: "Author of the test graph.",
  priority: 1,
  href: "/about/",
};

const project = (overrides?: Partial<GraphNode>): GraphNode => ({
  id: "project:test-project",
  kind: "project",
  label: "Test Project",
  projectSlug: "test-project",
  detail: "A test project.",
  priority: 1,
  href: "/projects/test-project/",
  ...overrides,
});

const story: GraphNode = {
  id: "story:test-project:motivation",
  kind: "story",
  label: "Why Test Project?",
  projectSlug: "test-project",
  detail: "Because tests matter.",
  priority: 2,
};

const tech: GraphNode = {
  id: "tech:typescript",
  kind: "technology",
  label: "TypeScript",
  detail: "Core language.",
  priority: 3,
};

const ownershipEdge: GraphEdge = {
  id: edgeId("ownership", "person:test", "project:test-project"),
  kind: "ownership",
  source: "person:test",
  target: "project:test-project",
};

const motivationEdge: GraphEdge = {
  id: edgeId("motivation", "project:test-project", "story:test-project:motivation"),
  kind: "motivation",
  source: "project:test-project",
  target: "story:test-project:motivation",
};

const technologyEdge: GraphEdge = {
  id: edgeId("technology", "project:test-project", "tech:typescript"),
  kind: "technology",
  source: "project:test-project",
  target: "tech:typescript",
};

const validGraph: HomeGraph = {
  nodes: [person, project(), story, tech],
  edges: [ownershipEdge, motivationEdge, technologyEdge],
};

const context = {
  featuredSlugs: ["test-project"],
  caseStudyHrefBySlug: { "test-project": "/projects/test-project/" },
};

describe("validateHomeGraph — positive", () => {
  it("accepts a structurally valid graph", () => {
    expect(() => validateHomeGraph(validGraph, context)).not.toThrow();
  });

  it("derives deterministic semantic edge IDs", () => {
    expect(edgeId("technology", "project:a", "tech:b")).toBe(
      "technology:project:a:tech:b",
    );
  });
});

describe("validateHomeGraph — rejection cases", () => {
  it("rejects duplicate node IDs", () => {
    const clone = { ...tech, label: "Duplicate" };
    expect(() =>
      validateHomeGraph(
        { ...validGraph, nodes: [...validGraph.nodes, clone] },
        context,
      ),
    ).toThrow(/duplicate node ID: tech:typescript/);
  });

  it("rejects duplicate edge IDs", () => {
    expect(() =>
      validateHomeGraph(
        { ...validGraph, edges: [...validGraph.edges, technologyEdge] },
        context,
      ),
    ).toThrow(/duplicate edge ID/);
  });

  it("rejects unknown node kinds via schema", async () => {
    const { homeGraphSchema } = await import("@/graph/graph-schema");
    const result = homeGraphSchema.safeParse({
      nodes: [{ ...person, id: "person:x", kind: "leetcode" }],
      edges: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects an edge whose source is missing", () => {
    expect(() =>
      validateHomeGraph(
        {
          ...validGraph,
          edges: [
            ...validGraph.edges,
            {
              ...technologyEdge,
              id: "technology:project:ghost:tech:typescript",
              source: "project:ghost",
            },
          ],
        },
        context,
      ),
    ).toThrow(/missing source node project:ghost/);
  });

  it("rejects an edge whose target is missing", () => {
    expect(() =>
      validateHomeGraph(
        {
          ...validGraph,
          edges: [
            ...validGraph.edges,
            {
              id: edgeId("technology", "project:test-project", "tech:ghost"),
              kind: "technology",
              source: "project:test-project",
              target: "tech:ghost",
            },
          ],
        },
        context,
      ),
    ).toThrow(/missing target node tech:ghost/);
  });

  it("rejects a self-edge", () => {
    expect(() =>
      validateHomeGraph(
        {
          ...validGraph,
          edges: [
            ...validGraph.edges,
            {
              id: edgeId("motivation", "project:test-project", "project:test-project"),
              kind: "motivation",
              source: "project:test-project",
              target: "project:test-project",
            },
          ],
        },
        context,
      ),
    ).toThrow(/self-edge/);
  });

  it("rejects a story node with no owning project relationship", () => {
    const orphanStory = { ...story, id: "story:orphan:motivation" };
    expect(() =>
      validateHomeGraph(
        { ...validGraph, nodes: [...validGraph.nodes, orphanStory] },
        context,
      ),
    ).toThrow(
      /story node with no owning project relationship: story:orphan:motivation/,
    );
  });

  it("rejects a technology node with an empty label", () => {
    const emptyTech = { ...tech, id: "tech:empty", label: "" };
    // Schema-level guard.
    void emptyTech;
    expect(() =>
      validateHomeGraph(
        {
          nodes: [
            ...validGraph.nodes,
            // Cast: simulating a bypassed schema to test the validator defense.
            JSON.parse(
              JSON.stringify({ ...tech, id: "tech:empty", label: "" }),
            ) as GraphNode,
          ],
          edges: [
            ...validGraph.edges,
            {
              id: edgeId("technology", "project:test-project", "tech:empty"),
              kind: "technology",
              source: "project:test-project",
              target: "tech:empty",
            },
          ],
        },
        context,
      ),
    ).toThrow(/technology node with empty label: tech:empty/);
  });

  it("rejects a featured project missing from the graph", () => {
    expect(() =>
      validateHomeGraph(validGraph, {
        ...context,
        featuredSlugs: ["test-project", "other-project"],
      }),
    ).toThrow(/featured project missing from graph: project:other-project/);
  });

  it("rejects a project node referencing a missing case-study href match", () => {
    expect(() =>
      validateHomeGraph(validGraph, {
        ...context,
        caseStudyHrefBySlug: { "test-project": "/elsewhere/test-project/" },
      }),
    ).toThrow(/case-study href mismatch for project:test-project/);
  });

  it("rejects a project with no person ownership edge", () => {
    const secondProject = project({
      id: "project:second",
      projectSlug: "second",
      href: "/projects/second/",
    });
    expect(() =>
      validateHomeGraph(
        {
          nodes: [...validGraph.nodes, secondProject],
          edges: [...validGraph.edges],
        },
        {
          featuredSlugs: ["test-project", "second"],
          caseStudyHrefBySlug: {
            "test-project": "/projects/test-project/",
            second: "/projects/second/",
          },
        },
      ),
    ).toThrow(/project with no person ownership edge: project:second/);
  });
});

describe("concept nodes and edges", () => {
  const conceptA: GraphNode = {
    id: "concept:music",
    kind: "concept",
    label: "Music organization",
    detail: "Explored through Test Project.",
    priority: 3,
  };
  const conceptEdge: GraphEdge = {
    id: edgeId("concept", "project:test-project", "concept:music"),
    kind: "concept",
    source: "project:test-project",
    target: "concept:music",
  };
  const conceptGraph: HomeGraph = {
    nodes: [person, project(), story, tech, conceptA],
    edges: [ownershipEdge, motivationEdge, technologyEdge, conceptEdge],
  };

  it("accepts a valid concept graph", () => {
    expect(() => validateHomeGraph(conceptGraph, context)).not.toThrow();
  });

  it("rejects an orphaned concept node", () => {
    const orphan = { ...conceptA, id: "concept:orphan" };
    expect(() =>
      validateHomeGraph(
        { ...conceptGraph, nodes: [...conceptGraph.nodes, orphan] },
        context,
      ),
    ).toThrow(/orphaned concept node: concept:orphan/);
  });

  it("rejects a malformed concept edge (person -> concept)", () => {
    expect(() =>
      validateHomeGraph(
        {
          ...conceptGraph,
          edges: [
            ...conceptGraph.edges,
            {
              id: edgeId("concept", "person:test", "concept:music"),
              kind: "concept",
              source: "person:test",
              target: "concept:music",
            },
          ],
        },
        context,
      ),
    ).toThrow(/malformed concept edge/);
  });
});
