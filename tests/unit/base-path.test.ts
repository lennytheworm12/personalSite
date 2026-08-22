import { describe, expect, it } from "vitest";
import { joinBase } from "@/lib/base-path";

describe("joinBase — root deployment (custom domain / local dev)", () => {
  it("keeps absolute paths unchanged when base is empty", () => {
    expect(joinBase("", "/about/")).toBe("/about/");
  });

  it("normalizes paths missing the leading slash", () => {
    expect(joinBase("", "about")).toBe("/about");
  });
});

describe("joinBase — subpath deployment (GitHub Pages)", () => {
  it("prefixes nested paths with the base", () => {
    expect(joinBase("/personalSite", "/projects/game-teacher/")).toBe(
      "/personalSite/projects/game-teacher/",
    );
  });

  it("maps the site root to <base>/ with a trailing slash", () => {
    expect(joinBase("/personalSite", "/")).toBe("/personalSite/");
  });

  it("tolerates trailing slashes on the configured base", () => {
    expect(joinBase("/personalSite/", "/about/")).toBe("/personalSite/about/");
  });

  it("rejects a base that reduces to an empty segment", () => {
    // "/" is normalized to "" upstream; anything else empty-ish is a config error.
    expect(joinBase("/", "/x/")).toBe("/x/");
  });
});
