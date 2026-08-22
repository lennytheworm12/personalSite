import { describe, expect, it } from "vitest";
import {
  EXPECTED_PROJECT_SLUGS,
  FEATURED_PROJECT_SLUGS,
  projects,
} from "@/content/projects";
import { SECTION_NAMES } from "@/content/project-schema";

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
      // Placeholder records must not invent structured facts (R4).
      expect(project.metrics).toEqual([]);
      expect(project.links).toEqual([]);
      // memories: [] is valid and expected until the memories phase (R5).
      expect(project.memories).toEqual([]);
    }
  });

  it("features exactly the homepage-graph projects", () => {
    expect(
      projects
        .filter((p) => p.featured)
        .map((p) => p.slug)
        .sort(),
    ).toEqual([...FEATURED_PROJECT_SLUGS].sort());
  });

  it("marks every narrative section provisional or unresolved — never silently final", () => {
    for (const project of projects) {
      for (const section of SECTION_NAMES) {
        const value = project[section];
        if (value === undefined) {
          expect(
            project.unresolved,
            `${project.slug}.${section} absent but not declared unresolved`,
          ).toContain(section);
        } else if (!value.provisional) {
          throw new Error(`${project.slug}.${section} is final text; expected draft`);
        }
      }
    }
  });

  it("derives technologies from structured entries with stable ids", () => {
    for (const project of projects) {
      for (const technology of project.technologies) {
        expect(technology.verification).not.toBe("verified");
        expect(technology.purpose.provisional).toBe(true);
      }
    }
    // Shared technology behavior is covered by graph-builder tests.
    const allLabels = projects.flatMap((p) => p.technologies.map((t) => t.label));
    expect(allLabels).toContain("TypeScript");
  });

  it("requires no LeetCode data anywhere in the model", () => {
    const serialized = JSON.stringify(projects).toLowerCase();
    expect(serialized).not.toContain("leetcode");
  });
});
