import { describe, expect, it } from "vitest";
import { HOME_LAYOUTS, selectViewport } from "@/graph/layouts";
import { validateLayouts } from "@/graph/layout-validation";
import { homeGraph } from "@/graph/graph-data";

describe("authored layouts", () => {
  it("places every graph node in both wide and laptop layouts", () => {
    expect(() => validateLayouts(homeGraph, HOME_LAYOUTS)).not.toThrow();
    for (const preset of Object.values(HOME_LAYOUTS)) {
      for (const node of homeGraph.nodes) {
        expect(
          preset.nodes[node.id],
          `${node.id} missing from ${preset.viewport}`,
        ).toBeDefined();
      }
    }
  });

  it("rejects unknown layout coordinate IDs", () => {
    const bad = {
      wide: {
        viewport: "wide" as const,
        nodes: { ...HOME_LAYOUTS.wide.nodes, "project:ghost": { x: 5, y: 5 } },
      },
      laptop: HOME_LAYOUTS.laptop,
    };
    // Cast: simulating an authored typo reaching the validator.
    expect(() => validateLayouts(homeGraph, bad as typeof HOME_LAYOUTS)).toThrow(
      /unknown layout coordinate ID in wide: project:ghost/,
    );
  });

  it("rejects a missing coordinate", () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { "person:bi": _dropped, ...wideWithoutPerson } = HOME_LAYOUTS.wide.nodes;
    const bad = {
      wide: { ...HOME_LAYOUTS.wide, nodes: wideWithoutPerson },
      laptop: HOME_LAYOUTS.laptop,
    };
    expect(() => validateLayouts(homeGraph, bad)).toThrow(
      /missing wide coordinates for node: person:bi/,
    );
  });

  it("rejects out-of-bounds coordinates", () => {
    const bad = {
      wide: {
        ...HOME_LAYOUTS.wide,
        nodes: { ...HOME_LAYOUTS.wide.nodes, "person:bi": { x: 140, y: 48 } },
      },
      laptop: HOME_LAYOUTS.laptop,
    };
    expect(() => validateLayouts(homeGraph, bad)).toThrow(
      /out-of-bounds x coordinate for person:bi/,
    );
  });

  it("keeps the person node inside the center-safe region", () => {
    for (const preset of Object.values(HOME_LAYOUTS)) {
      const p = preset.nodes["person:bi"];
      expect(p.x).toBeGreaterThanOrEqual(40);
      expect(p.x).toBeLessThanOrEqual(60);
      expect(p.y).toBeGreaterThanOrEqual(35);
      expect(p.y).toBeLessThanOrEqual(65);
    }
  });

  it("enforces priority-1 minimum spacing (validated via the shipped graph)", () => {
    // Shipped graph passes; verify the rule fires when violated.
    const squeezed = {
      wide: {
        ...HOME_LAYOUTS.wide,
        nodes: { ...HOME_LAYOUTS.wide.nodes, "person:bi": { x: 27.1, y: 26 } },
      },
      laptop: HOME_LAYOUTS.laptop,
    };
    expect(() => validateLayouts(homeGraph, squeezed)).toThrow(
      /priority-1 spacing violation/,
    );
  });

  it("selects the laptop preset below 1100px and wide above", () => {
    expect(selectViewport(1440)).toBe("wide");
    expect(selectViewport(1100)).toBe("wide");
    expect(selectViewport(1099)).toBe("laptop");
    expect(selectViewport(800)).toBe("laptop");
  });
});
