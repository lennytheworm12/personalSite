import type { HomepageView } from "./homepage-state";

/**
 * Mobile experience preferences and boot rules (Goal 4, M14–M16).
 *
 * Storage keys are versioned so future schema changes cannot misread old
 * values. Only EXPLICIT user choices are persisted — never breakpoint
 * transitions, automatic intro completion, deep-link interpretation, or
 * reduced-motion fallbacks.
 */

export const VIEW_PREFERENCE_KEY = "portfolio:view:v1";
export const INTRO_COMPLETION_KEY = "portfolio:intro:v1";

export const MOBILE_MAX_WIDTH = 767;

export function isMobileViewport(widthPx: number): boolean {
  return widthPx <= MOBILE_MAX_WIDTH;
}

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function isValidView(value: unknown): value is HomepageView {
  return value === "graph" || value === "index";
}

/** Read the stored explicit view preference; invalid/corrupt values are ignored. */
export function readStoredView(): HomepageView | null {
  try {
    const raw = window.localStorage.getItem(VIEW_PREFERENCE_KEY);
    return isValidView(raw) ? raw : null;
  } catch {
    return null;
  }
}

export function storeView(view: HomepageView): void {
  try {
    window.localStorage.setItem(VIEW_PREFERENCE_KEY, view);
  } catch {
    // Private-browsing/quota failures must never break the site.
  }
}

export function isIntroComplete(): boolean {
  try {
    return window.localStorage.getItem(INTRO_COMPLETION_KEY) === "done";
  } catch {
    return true; // If storage is unreadable, err toward skipping the intro.
  }
}

export function markIntroComplete(): void {
  try {
    window.localStorage.setItem(INTRO_COMPLETION_KEY, "done");
  } catch {
    // Ignore.
  }
}

export interface BootDecisionInput {
  /** Explicit ?view= value from the URL (null when absent). */
  explicitUrlView: string | null;
  /** Whether the URL carries explicit intent at all (view/focus/q). */
  hasExplicitUrlIntent: boolean;
  widthPx: number;
  reducedMotion: boolean;
  introComplete: boolean;
  storedPreference: HomepageView | null;
}

export interface BootDecision {
  view: HomepageView;
  /** True only for the clean-first-mobile-visit case. */
  introEligible: boolean;
}

/**
 * Boot precedence (highest first):
 *   explicit URL > stored explicit preference > intro eligibility >
 *   device default (desktop -> graph, mobile -> index).
 * Reduced motion disables intro eligibility entirely.
 */
export function decideBoot(input: BootDecisionInput): BootDecision {
  const mobile = isMobileViewport(input.widthPx);

  // 2. Explicit URL intent always wins and never triggers the intro.
  if (input.explicitUrlView !== null && isValidView(input.explicitUrlView)) {
    return { view: input.explicitUrlView, introEligible: false };
  }
  if (input.hasExplicitUrlIntent) {
    const fallbackView: HomepageView = mobile ? "index" : "graph";
    return { view: fallbackView, introEligible: false };
  }

  // System safety: reduced motion skips the intro.
  if (mobile) {
    // 4. Stored explicit preference.
    if (input.storedPreference) {
      return { view: input.storedPreference, introEligible: false };
    }
    // 5. Intro eligibility (clean root, first visit, motion allowed).
    if (!input.reducedMotion && !input.introComplete) {
      return { view: "index", introEligible: true };
    }
    // 6. Device default.
    return { view: "index", introEligible: false };
  }

  if (input.storedPreference) {
    return { view: input.storedPreference, introEligible: false };
  }
  return { view: "graph", introEligible: false };
}
