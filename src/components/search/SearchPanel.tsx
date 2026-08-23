import { useEffect, useRef } from "react";
import type { SearchEntry } from "@/search/search-types";
import type { ScoredSearchResult } from "@/search/ranking";

interface SearchPanelProps {
  open: boolean;
  query: string;
  results: ScoredSearchResult[];
  activeResultIndex: number | null;
  onQueryChange: (query: string) => void;
  onActiveIndexChange: (index: number | null) => void;
  onActivateResult: (entry: SearchEntry) => void;
  onClose: () => void;
}

/**
 * Accessible search panel (Goal 3, M6). The result list uses ordinary
 * buttons (not an ARIA combobox) so screen-reader and keyboard behavior is
 * simple and robust; the input owns ArrowUp/ArrowDown/Enter/Escape shortcuts.
 * Result counts are announced politely; focus is never trapped.
 */
export default function SearchPanel({
  open,
  query,
  results,
  activeResultIndex,
  onQueryChange,
  onActiveIndexChange,
  onActivateResult,
  onClose,
}: SearchPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const announceId = "search-results-announce";

  // Move focus into the search input when the panel opens.
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  if (!open) return null;

  const moveActive = (delta: number) => {
    if (results.length === 0) return;
    const current = activeResultIndex ?? -1;
    const next = Math.max(0, Math.min(current + delta, results.length - 1));
    onActiveIndexChange(next);
  };

  return (
    <div
      className="search-panel"
      role="search"
      aria-label="Search projects and technologies"
    >
      <input
        ref={inputRef}
        id="homepage-search-input"
        className="search-input"
        type="search"
        placeholder="Search projects, technologies, concepts…"
        aria-label="Search projects, technologies, and concepts"
        aria-controls={announceId}
        value={query}
        onChange={(event) => {
          onQueryChange(event.target.value);
          onActiveIndexChange(null);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            // preventDefault stops Firefox's native "clear search field"
            // behavior, which would otherwise fire a trailing onChange that
            // resurrects the panel from stale durable state.
            event.preventDefault();
            event.stopPropagation();
            onClose();
          } else if (event.key === "ArrowDown") {
            event.preventDefault();
            moveActive(1);
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            moveActive(-1);
          } else if (event.key === "Enter") {
            event.preventDefault();
            const picked =
              activeResultIndex !== null
                ? results[activeResultIndex]
                : (results[0] ?? null);
            if (picked) onActivateResult(picked.entry);
          }
        }}
      />
      <p id={announceId} className="visually-hidden" aria-live="polite">
        {query.trim()
          ? `${results.length} search ${results.length === 1 ? "result" : "results"}`
          : "Type to search"}
      </p>
      {query.trim() ? (
        <ul className="search-results">
          {results.map((result, index) => (
            <li key={result.entry.id}>
              <button
                type="button"
                className={`search-result${index === activeResultIndex ? " search-result-active" : ""}`}
                data-search-id={result.entry.id}
                onClick={() => onActivateResult(result.entry)}
              >
                <span className="badge">{result.entry.kind}</span>
                <span className="search-result-label">{result.entry.label}</span>
                <span className="search-result-preview">{result.entry.preview}</span>
              </button>
            </li>
          ))}
          {results.length === 0 ? (
            <li className="search-no-results">No matching results.</li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}
