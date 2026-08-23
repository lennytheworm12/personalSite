import { describe, expect, it } from "vitest";
import {
  canonicalizeHomepageState,
  parseHomepageUrl,
  serializeHomepageState,
} from "@/state/homepage-url";
import { createInitialHomepageState } from "@/state/homepage-state";

const KNOWN = ["spotify-sorter", "game-teacher"];

describe("parseHomepageUrl", () => {
  it("parses the root URL to default state", () => {
    expect(parseHomepageUrl("", { knownSlugs: KNOWN })).toEqual(
      createInitialHomepageState(),
    );
  });

  it("parses ?view=graph and ?view=index", () => {
    expect(parseHomepageUrl("?view=graph").view).toBe("graph");
    expect(parseHomepageUrl("?view=index").view).toBe("index");
  });

  it("falls back safely on unknown view", () => {
    expect(parseHomepageUrl("?view=gallery").view).toBe("graph");
  });

  it("parses valid focus slugs into project scenes", () => {
    const state = parseHomepageUrl("?focus=spotify-sorter", { knownSlugs: KNOWN });
    expect(state.scene).toEqual({ kind: "project", slug: "spotify-sorter" });
  });

  it("falls back to Home for unknown focus slugs when slugs are known", () => {
    expect(parseHomepageUrl("?focus=ghost", { knownSlugs: KNOWN }).scene).toEqual({
      kind: "home",
    });
    // Without knownSlugs the slug is accepted structurally (canonicalization
    // may still reject it later).
    expect(parseHomepageUrl("?focus=ghost").scene).toEqual({
      kind: "project",
      slug: "ghost",
    });
  });

  it("treats blank and whitespace queries as no query", () => {
    for (const search of ["?q=", "?q=   ", "?"]) {
      const state = parseHomepageUrl(search);
      expect(state.search.query).toBe("");
      expect(state.search.open).toBe(false);
    }
  });

  it("trims surrounding whitespace from queries", () => {
    expect(parseHomepageUrl("?q=%20%20react%20%20").search.query).toBe("react");
  });

  it("caps query length at 100 characters", () => {
    const long = "a".repeat(150);
    expect(parseHomepageUrl(`?q=${long}`).search.query.length).toBe(100);
  });

  it("parses focus+query and view+query combinations", () => {
    const focusQuery = parseHomepageUrl("?focus=game-teacher&q=react", {
      knownSlugs: KNOWN,
    });
    expect(focusQuery.scene.kind).toBe("project");
    expect(focusQuery.search.query).toBe("react");
    const viewQuery = parseHomepageUrl("?view=index&q=typescript");
    expect(viewQuery.view).toBe("index");
    expect(viewQuery.search.open).toBe(true);
  });

  it("ignores unknown parameters without crashing", () => {
    const state = parseHomepageUrl("?utm_source=x&weird=%zz&view=index");
    expect(state.view).toBe("index");
  });
});

describe("serializeHomepageState / canonicalization", () => {
  it("serializes the default state to an empty string", () => {
    expect(serializeHomepageState(createInitialHomepageState())).toBe("");
  });

  it("is deterministic and canonical (omits defaults)", () => {
    const state = parseHomepageUrl("?view=graph&focus=game-teacher&q=react", {
      knownSlugs: KNOWN,
    });
    expect(serializeHomepageState(state)).toBe("?focus=game-teacher&q=react");
    // Round-trip stability.
    const reparsed = parseHomepageUrl(serializeHomepageState(state), {
      knownSlugs: KNOWN,
    });
    expect(serializeHomepageState(reparsed)).toBe(serializeHomepageState(state));
  });

  it("serializes view=index explicitly", () => {
    let state = createInitialHomepageState();
    state = { ...state, view: "index" };
    expect(serializeHomepageState(state)).toBe("?view=index");
  });

  it("canonicalization demotes unknown focused slugs to Home", () => {
    const state = parseHomepageUrl("?focus=ghost");
    const canonical = canonicalizeHomepageState(state, KNOWN);
    expect(canonical.scene).toEqual({ kind: "home" });
  });

  it("canonicalization keeps known focused slugs", () => {
    const state = parseHomepageUrl("?focus=spotify-sorter");
    const canonical = canonicalizeHomepageState(state, KNOWN);
    expect(canonical.scene).toEqual({ kind: "project", slug: "spotify-sorter" });
  });
});
