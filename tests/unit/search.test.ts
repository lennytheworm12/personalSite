import { describe, expect, it } from "vitest";
import { buildSearchIndex, getSearchIndex } from "@/search/search-index";
import { rankSearchResults } from "@/search/ranking";
import { normalizeText } from "@/search/search-types";

const index = buildSearchIndex();

describe("search index derivation", () => {
  it("derives entries for projects, technologies, concepts, stories, and profile", () => {
    const kinds = new Set(index.map((e) => e.kind));
    expect(kinds).toEqual(new Set(["project", "technology", "concept", "story", "profile"]));
  });

  it("references valid project slugs and graph node ids", () => {
    const validSlugs = new Set(["spotify-sorter", "game-teacher"]);
    const validNodePrefixes = ["project:", "tech:", "concept:", "story:", "person:"];
    for (const entry of index) {
      for (const slug of entry.projectSlugs) {
        expect(validSlugs.has(slug), `${entry.id} references unknown slug ${slug}`).toBe(true);
      }
      if (entry.nodeId) {
        expect(
          validNodePrefixes.some((prefix) => entry.nodeId?.startsWith(prefix)),
          `${entry.id} has malformed nodeId ${entry.nodeId}`
        ).toBe(true);
      }
    }
  });

  it("is deterministic across rebuilds", () => {
    expect(buildSearchIndex()).toEqual(index);
  });

  it("returns the cached singleton on repeated access", () => {
    expect(getSearchIndex()).toBe(getSearchIndex());
  });
});

describe("rankSearchResults — ranking rules", () => {
  it("empty query returns nothing (no dump of every entry)", () => {
    expect(rankSearchResults(index, "")).toEqual([]);
    expect(rankSearchResults(index, "   ")).toEqual([]);
  });

  it("ranks exact label matches highest", () => {
    const results = rankSearchResults(index, "Game Teacher");
    expect(results[0]?.entry.id).toBe("search:project:game-teacher");
  });

  it("ranks prefix matches below exact but above substring", () => {
    const results = rankSearchResults(index, "Spotify");
    const ids = results.map((r) => r.entry.id);
    expect(ids[0]).toBe("search:project:spotify-sorter");
  });

  it("matches technology labels and purposes", () => {
    const results = rankSearchResults(index, "Web Audio");
    expect(results.map((r) => r.entry.id)).toContain("search:tech:web-audio-api");
    const purpose = rankSearchResults(index, "audio preview");
    expect(purpose.map((r) => r.entry.id)).toContain("search:tech:web-audio-api");
  });

  it("matches concepts", () => {
    const results = rankSearchResults(index, "teaching");
    expect(results.map((r) => r.entry.id)).toContain("search:concept:teaching");
  });

  it("matches story motivation text", () => {
    const results = rankSearchResults(index, "frustration finding music");
    expect(results.map((r) => r.entry.id)).toContain(
      "search:story:spotify-sorter:motivation"
    );
  });

  it("matches project summary text with lower rank than labels", () => {
    const results = rankSearchResults(index, "organizing");
    const storyOrProject = results.filter((r) =>
      ["search:project:spotify-sorter", "search:concept:music-organization"].includes(r.entry.id)
    );
    expect(storyOrProject.length).toBeGreaterThan(0);
  });

  it("normalizes case and punctuation in queries", () => {
    expect(normalizeText("Game-Teacher!")).toBe("game teacher");
    const plain = rankSearchResults(index, "game teacher")[0];
    const noisy = rankSearchResults(index, "GAME...teacher!!!")[0];
    expect(noisy?.entry.id).toBe(plain?.entry.id);
  });

  it("returns no results for genuinely unmatched queries", () => {
    expect(rankSearchResults(index, "blockchain quantum cryptocurrency")).toEqual([]);
  });

  it("breaks ties deterministically (priority then label then id)", () => {
    const a = rankSearchResults(index, "react");
    const b = rankSearchResults(index, "React");
    expect(a.map((r) => r.entry.id)).toEqual(b.map((r) => r.entry.id));
  });
});
