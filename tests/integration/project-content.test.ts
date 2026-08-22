import { describe, expect, it } from "vitest";
import { EXPECTED_PROJECT_SLUGS, projects } from "@/content/projects";

describe("shipped project collection", () => {
  it("contains exactly the promised project routes", () => {
    expect(projects.map((p) => p.slug).sort()).toEqual(
      [...EXPECTED_PROJECT_SLUGS].sort(),
    );
  });

  it("uses stable identifiers for both projects", () => {
    expect(projects.map((p) => p.identifier).sort()).toEqual([
      "game_teacher",
      "spotify_sorter",
    ]);
  });

  it("ships only honest placeholders while content is unresolved", () => {
    for (const project of projects) {
      expect(project.status).toBe("placeholder");
      expect(project.unresolved.length).toBeGreaterThan(0);
      // Placeholder records must not invent structured facts.
      expect(project.contributions).toEqual([]);
      expect(project.technologies).toEqual([]);
      expect(project.metrics).toEqual([]);
      expect(project.links).toEqual([]);
    }
  });

  it("declares the personal facts that are still unknown", () => {
    const all = new Set(projects.flatMap((p) => p.unresolved));
    for (const expected of ["contributions", "technologies", "metrics", "links"]) {
      expect(all.has(expected)).toBe(true);
    }
  });
});
