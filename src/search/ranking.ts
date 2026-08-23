import { normalizeText, tokenize, type SearchEntry } from "./search-types";

/**
 * Deterministic direct-match ranking (Goal 3, M5). No fuzzy library.
 *
 * Score bands (higher wins):
 *   100 exact label match
 *    80 label starts with query
 *    70 full query appears as a whole token in the label
 *    60 alias/normalized-terms exact match
 *    50 label contains the query as substring
 *    40 any normalized term token-matches the query
 *    30 preview text (summary/purpose/motivation) matches
 *    20 related project labels match
 *
 * Tie-breaks: score desc -> priority asc -> normalized label asc -> id asc.
 */

export interface ScoredSearchResult {
  entry: SearchEntry;
  score: number;
}

export function rankSearchResults(
  index: readonly SearchEntry[],
  rawQuery: string,
): ScoredSearchResult[] {
  const query = normalizeText(rawQuery);
  if (!query) return [];
  const queryTokens = tokenize(query);

  const scored: ScoredSearchResult[] = [];

  for (const entry of index) {
    const label = normalizeText(entry.label);
    let score = 0;

    if (label === query) score = Math.max(score, 100);
    if (!score && label.startsWith(query)) score = Math.max(score, 80);
    if (!score && tokenize(label).includes(query)) score = Math.max(score, 70);

    for (const term of entry.normalizedTerms) {
      if (!term) continue;
      if (term === query) score = Math.max(score, 60);
      else if (term.startsWith(query)) score = Math.max(score, 58);
    }

    if (!score && label.includes(query)) score = Math.max(score, 50);

    if (!score) {
      const labelTokens = new Set(tokenize(label));
      for (const term of entry.normalizedTerms) {
        if (tokenize(term).some((token) => queryTokens.includes(token))) {
          score = Math.max(score, 40);
          break;
        }
      }
      // Whole-query token containment in label tokens.
      if (
        !score &&
        queryTokens.every((token) => labelTokens.has(token)) &&
        queryTokens.length > 0
      ) {
        score = Math.max(score, 68);
      }
    }

    if (!score) {
      const preview = normalizeText(entry.preview);
      if (preview.includes(query)) score = Math.max(score, 30);
      else if (tokenize(preview).some((token) => queryTokens.includes(token))) {
        score = Math.max(score, 28);
      }
    }

    if (!score) {
      // Related-project match: query matches a project title that this entry
      // relates to (e.g. searching "Spotify" surfaces its technologies).
      const relatedHit = entry.projectSlugs.some((slug) => {
        return queryTokens.every((token) =>
          normalizeText(`${entry.kind} ${slug}`).includes(token),
        );
      });
      if (relatedHit) score = Math.max(score, 20);
    }

    if (score > 0) scored.push({ entry, score });
  }

  return scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (a.entry.priority !== b.entry.priority)
      return a.entry.priority - b.entry.priority;
    const labelCompare = normalizeText(a.entry.label).localeCompare(
      normalizeText(b.entry.label),
    );
    if (labelCompare !== 0) return labelCompare;
    return a.entry.id.localeCompare(b.entry.id);
  });
}
