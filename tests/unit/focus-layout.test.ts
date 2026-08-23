import { describe, expect, it } from "vitest";
import { FOCUS_LAYOUTS, resolveFocusLayout, validateFocusLayouts } from "@/graph/focus-layouts";
import { homeGraph } from "@/graph/graph-data";
import { FEATURED_PROJECT_SLUGS } from "@/content/projects";

describe("project-focus layouts", () => {
  it("validates against the shipped graph for both projects and viewports", () => {
    expect(() =>
      validateFocusLayouts(homeGraph, FOCUS_LAYOUTS, { featuredSlugs: FEATURED_PROJECT_SLUGS })
    ).not.toThrow();
  });

  it("rejects an unknown coordinate ID", () => {
    const broken = structuredClone(FOCUS_LAYOUTS);
    broken.wide["spotify-sorter"]!.nodes["project:ghost"] = { x: 5, y: 5 };
    expect(() => validateFocusLayouts(homeGraph, broken, { featuredSlugs: FEATURED_PROJECT_SLUGS }))
      .toThrow(/unknown coordinate ID in focus layout wide\/spotify-sorter: project:ghost/);
  });

  it("rejects a missing focus preset", () => {
    const broken: typeof FOCUS_LAYOUTS = {
      wide: { ...FOCUS_LAYOUTS.wide, "game-teacher": undefined },
      laptop: FOCUS_LAYOUTS.laptop,
    };
    expect(() => validateFocusLayouts(homeGraph, broken, { featuredSlugs: FEATURED_PROJECT_SLUGS }))
      .toThrow(/missing wide focus layout for game-teacher/);
  });

  it("rejects an off-center focused project", () => {
    const broken = structuredClone(FOCUS_LAYOUTS);
    broken.laptop["spotify-sorter"]!.nodes["project:spotify-sorter"] = { x: 8, y: 90 };
    expect(() => validateFocusLayouts(homeGraph, broken, { featuredSlugs: FEATURED_PROJECT_SLUGS }))
      .toThrow(/focused project not sufficiently central in laptop\/spotify-sorter/);
  });

  it("rejects out-of-bounds coordinates", () => {
    const broken = structuredClone(FOCUS_LAYOUTS);
    broken.wide["game-teacher"]!.nodes["tech:typescript"] = { x: -4, y: 32 };
    expect(() => validateFocusLayouts(homeGraph, broken, { featuredSlugs: FEATURED_PROJECT_SLUGS }))
      .toThrow(/out-of-bounds coordinate for tech:typescript in focus layout wide\/game-teacher/);
  });

  it("enforces minimum separation around the focused project", () => {
    const broken = structuredClone(FOCUS_LAYOUTS);
    broken.wide["spotify-sorter"]!.nodes["person:bi"] = { x: 53, y: 45 };
    expect(() => validateFocusLayouts(homeGraph, broken, { featuredSlugs: FEATURED_PROJECT_SLUGS }))
      .toThrow(/separation violation in focus layout wide\/spotify-sorter: person:bi/);
  });

  it("keeps related story and technology nodes near the focus", () => {
    const broken = structuredClone(FOCUS_LAYOUTS);
    broken.laptop["game-teacher"]!.nodes["story:game-teacher:motivation"] = { x: 2, y: 98 };
    expect(() => validateFocusLayouts(homeGraph, broken, { featuredSlugs: FEATURED_PROJECT_SLUGS }))
      .toThrow(/related node too far from focus in laptop\/game-teacher: story:game-teacher:motivation/);
  });

  it("resolves presets with a null fallback for unfocused slugs", () => {
    expect(resolveFocusLayout(FOCUS_LAYOUTS, "wide", "spotify-sorter")).toBeTruthy();
    expect(resolveFocusLayout(FOCUS_LAYOUTS, "wide", "ghost-project")).toBeNull();
  });
});
