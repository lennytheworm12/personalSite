import { describe, expect, it } from "vitest";
import {
  decideBoot,
  isMobileViewport,
  type BootDecisionInput,
} from "@/state/mobile-preferences";

const base: BootDecisionInput = {
  explicitUrlView: null,
  hasExplicitUrlIntent: false,
  widthPx: 1280,
  reducedMotion: false,
  introComplete: true,
  storedPreference: null,
};

describe("isMobileViewport", () => {
  it("classifies phones and desktops", () => {
    expect(isMobileViewport(375)).toBe(true);
    expect(isMobileViewport(767)).toBe(true);
    expect(isMobileViewport(768)).toBe(false);
    expect(isMobileViewport(1440)).toBe(false);
  });
});

describe("decideBoot — precedence", () => {
  it("desktop default is graph", () => {
    expect(decideBoot(base)).toEqual({ view: "graph", introEligible: false });
  });

  it("mobile device default (intro already done) is index", () => {
    expect(decideBoot({ ...base, widthPx: 375 })).toEqual({
      view: "index",
      introEligible: false,
    });
  });

  it("explicit URL view wins over everything, including on mobile", () => {
    const desktop = decideBoot({
      ...base,
      explicitUrlView: "index",
      storedPreference: "graph",
    });
    expect(desktop).toEqual({ view: "index", introEligible: false });
    const mobile = decideBoot({
      ...base,
      widthPx: 375,
      introComplete: false,
      explicitUrlView: "graph",
    });
    expect(mobile).toEqual({ view: "graph", introEligible: false });
  });

  it("invalid URL view falls back to intent handling (no crash)", () => {
    const result = decideBoot({
      ...base,
      explicitUrlView: "gallery",
      hasExplicitUrlIntent: true,
    });
    expect(result.view).toBe("graph");
    expect(result.introEligible).toBe(false);
  });

  it("any explicit URL intent (focus/q) bypasses the mobile intro", () => {
    const result = decideBoot({
      ...base,
      widthPx: 375,
      hasExplicitUrlIntent: true,
      introComplete: false,
    });
    expect(result.introEligible).toBe(false);
  });

  it("stored preference beats device default and intro", () => {
    const mobile = decideBoot({
      ...base,
      widthPx: 375,
      introComplete: false,
      storedPreference: "graph",
    });
    expect(mobile).toEqual({ view: "graph", introEligible: false });
    const desktop = decideBoot({ ...base, storedPreference: "index" });
    expect(desktop).toEqual({ view: "index", introEligible: false });
  });

  it("first clean mobile visit is intro-eligible with Index underneath", () => {
    expect(decideBoot({ ...base, widthPx: 360, introComplete: false })).toEqual({
      view: "index",
      introEligible: true,
    });
  });

  it("reduced motion disables intro eligibility on first mobile visit", () => {
    expect(
      decideBoot({ ...base, widthPx: 375, reducedMotion: true, introComplete: false }),
    ).toEqual({ view: "index", introEligible: false });
  });

  it("returning mobile visit does not replay the intro", () => {
    expect(decideBoot({ ...base, widthPx: 375, introComplete: true })).toEqual({
      view: "index",
      introEligible: false,
    });
  });
});
