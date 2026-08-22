import { describe, expect, it } from "vitest";
import { homeGraph } from "@/graph/graph-data";
import { FEATURED_PROJECT_SLUGS } from "@/content/projects";

describe("shipped home graph integration", () => {
  it("contains person, project, story, and technology nodes", () => {
    const kinds = new Set(homeGraph.nodes.map((n) => n.kind));
    expect(kinds).toEqual(new Set(["person", "project", "story", "technology"]));
  });

  it("represents every featured project as a project node", () => {
    for (const slug of FEATURED_PROJECT_SLUGS) {
      expect(homeGraph.nodes.some((n) => n.id === `project:${slug}`)).toBe(true);
    }
  });

  it("maps every graph project to a generated case-study route", () => {
    const projectNodes = homeGraph.nodes.filter((n) => n.kind === "project");
    for (const node of projectNodes) {
      expect(node.href).toBe(`/projects/${node.projectSlug}/`);
    }
  });

  it("derives technology nodes from structured project technologies", () => {
    // TypeScript appears in both projects -> exactly one shared node.
    const typescript = homeGraph.nodes.filter((n) => n.id === "tech:typescript");
    expect(typescript).toHaveLength(1);
    const techEdgeTargets = homeGraph.edges
      .filter((e) => e.kind === "technology")
      .map((e) => e.target);
    expect(techEdgeTargets.filter((t) => t === "tech:typescript")).toHaveLength(2);
  });

  it("carries no full case-study bodies in the payload", () => {
    for (const node of homeGraph.nodes) {
      expect(node.detail.length).toBeLessThan(600);
      // Summaries are long prose; they must not be embedded wholesale.
      expect(node.detail.startsWith("This is an honest placeholder case study")).toBe(
        false,
      );
    }
  });

  it("requires no LeetCode data anywhere in the graph", () => {
    const serialized = JSON.stringify(homeGraph).toLowerCase();
    expect(serialized).not.toContain("leetcode");
  });
});
