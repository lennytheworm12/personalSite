import { describe, expect, it } from "vitest";
import {
  createInitialHomepageState,
  reduceHomepageState,
  type DurableHomepageState,
} from "@/state/homepage-state";

const initial = createInitialHomepageState();

describe("homepage state reducer", () => {
  it("starts at Home graph with search closed", () => {
    expect(initial).toEqual({
      view: "graph",
      scene: { kind: "home" },
      search: { open: false, query: "", activeResultIndex: null },
    });
  });

  it("Home -> Search opens without changing scene", () => {
    const next = reduceHomepageState(initial, { type: "searchOpen" });
    expect(next.search.open).toBe(true);
    expect(next.scene).toEqual({ kind: "home" });
  });

  it("Search update stores trimmed-length-capped query and resets cursor", () => {
    let state = reduceHomepageState(initial, { type: "searchOpen" });
    state = reduceHomepageState(state, { type: "searchQuery", query: "  react  " });
    // Query is stored as typed (trimmed by caller semantics); cap enforced.
    expect(state.search.query).toBe("  react  ");
    expect(state.search.activeResultIndex).toBeNull();
    const long = "a".repeat(150);
    state = reduceHomepageState(state, { type: "searchQuery", query: long });
    expect(state.search.query.length).toBe(100);
  });

  it("Search close preserves the query but closes the panel", () => {
    let state = reduceHomepageState(initial, { type: "searchOpen" });
    state = reduceHomepageState(state, { type: "searchQuery", query: "react" });
    state = reduceHomepageState(state, { type: "searchClose" });
    expect(state.search.open).toBe(false);
    expect(state.search.query).toBe("react");
  });

  it("Home -> Project Focus sets scene and keeps query context", () => {
    let state = reduceHomepageState(initial, { type: "searchOpen" });
    state = reduceHomepageState(state, { type: "searchQuery", query: "react" });
    state = reduceHomepageState(state, {
      type: "focusProject",
      slug: "spotify-sorter",
    });
    expect(state.scene).toEqual({ kind: "project", slug: "spotify-sorter" });
    expect(state.search.query).toBe("react");
    expect(state.search.activeResultIndex).toBeNull();
  });

  it("Project Focus -> Home clears scene and search", () => {
    let state = reduceHomepageState(initial, {
      type: "focusProject",
      slug: "game-teacher",
    });
    state = reduceHomepageState(state, { type: "goHome" });
    expect(state.scene).toEqual({ kind: "home" });
    expect(state.search.open).toBe(false);
    expect(state.search.query).toBe("");
  });

  it("Graph -> Index -> Graph switches view without touching scene", () => {
    let state = reduceHomepageState(initial, {
      type: "focusProject",
      slug: "game-teacher",
    });
    state = reduceHomepageState(state, { type: "setView", view: "index" });
    expect(state.view).toBe("index");
    expect(state.scene).toEqual({ kind: "project", slug: "game-teacher" });
    state = reduceHomepageState(state, { type: "setView", view: "graph" });
    expect(state.view).toBe("graph");
  });

  it("view switch closes an open search panel", () => {
    let state = reduceHomepageState(initial, { type: "searchOpen" });
    state = reduceHomepageState(state, { type: "setView", view: "index" });
    expect(state.search.open).toBe(false);
  });

  it("rejects invalid project focus actions (empty/oversized slugs)", () => {
    expect(reduceHomepageState(initial, { type: "focusProject", slug: "" })).toEqual(
      initial,
    );
    expect(
      reduceHomepageState(initial, { type: "focusProject", slug: "a".repeat(65) }),
    ).toEqual(initial);
  });

  it("rejects unknown views by returning unchanged state", () => {
    const bad = reduceHomepageState(initial, {
      // Deliberately invalid runtime value.
      type: "setView",
      view: "gallery" as never,
    });
    expect(bad).toEqual(initial);
  });

  it("hydrate replaces durable state wholesale (popstate path)", () => {
    const target: DurableHomepageState = {
      view: "index",
      scene: { kind: "project", slug: "spotify-sorter" },
      search: { open: false, query: "", activeResultIndex: null },
    };
    expect(reduceHomepageState(initial, { type: "hydrate", state: target })).toEqual(
      target,
    );
  });

  it("search while focused project keeps scene; clear keeps focus too", () => {
    let state = reduceHomepageState(initial, {
      type: "focusProject",
      slug: "spotify-sorter",
    });
    state = reduceHomepageState(state, { type: "searchOpen" });
    expect(state.scene.kind).toBe("project");
    state = reduceHomepageState(state, { type: "searchClose" });
    state = reduceHomepageState(state, { type: "goHome" });
    expect(state.scene).toEqual({ kind: "home" });
  });
});
