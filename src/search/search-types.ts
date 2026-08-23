/**
 * Local search normalization helpers (Goal 3, M4).
 * No fuzzy library: deterministic direct matching only.
 */

/** Lowercase, strip punctuation, collapse whitespace. */
export function normalizeText(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function tokenize(input: string): string[] {
  const normalized = normalizeText(input);
  return normalized ? normalized.split(" ") : [];
}

export type SearchEntryKind =
  "project" | "technology" | "concept" | "story" | "profile";

export interface SearchEntry {
  id: string;
  kind: SearchEntryKind;
  label: string;
  /** Normalized searchable terms (aliases, tech/concept/story terms). */
  normalizedTerms: string[];
  /** Project context for the entry (which projects it relates to). */
  projectSlugs: string[];
  nodeId?: string;
  href?: string;
  preview: string;
  /** Lower number = more important in tie-breaks. */
  priority: number;
}
