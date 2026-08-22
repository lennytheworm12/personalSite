import { describe, expect, it } from "vitest";
import {
  ContentValidationError,
  parseProjectRecord,
  validateProjectCollection,
  type RawProjectRecord,
} from "@/content/project-schema";

const validRecord: RawProjectRecord = {
  slug: "test-project",
  identifier: "test_project",
  title: "Test Project",
  tagline: "A test tagline.",
  summary: "A summary long enough to be meaningful.",
  status: "published",
  contributions: ["Built the thing."],
  technologies: ["TypeScript"],
  metrics: [{ label: "Users", value: 10 }],
  links: [{ label: "Repository", url: "https://example.com/repo", role: "repository" }],
};

describe("parseProjectRecord — positive", () => {
  it("accepts a fully populated record", () => {
    const parsed = parseProjectRecord(validRecord);
    expect(parsed.slug).toBe("test-project");
    expect(parsed.metrics[0]?.value).toBe(10);
  });

  it("defaults optional collections to empty arrays when omitted", () => {
    const parsed = parseProjectRecord({
      ...validRecord,
      status: "placeholder",
      unresolved: ["contributions", "technologies", "metrics", "links"],
      contributions: undefined,
      technologies: undefined,
      metrics: undefined,
      links: undefined,
    });
    expect(parsed.contributions).toEqual([]);
    expect(parsed.technologies).toEqual([]);
    expect(parsed.metrics).toEqual([]);
    expect(parsed.links).toEqual([]);
  });
});

describe("parseProjectRecord — negative", () => {
  it("rejects an empty title", () => {
    expect(() => parseProjectRecord({ ...validRecord, title: "   " })).toThrow(
      ContentValidationError,
    );
  });

  it("rejects a slug that is not kebab-case", () => {
    expect(() => parseProjectRecord({ ...validRecord, slug: "Not_Kebab!" })).toThrow(
      /slug must be kebab-case/,
    );
  });

  it("rejects an identifier that is not snake_case", () => {
    expect(() =>
      parseProjectRecord({ ...validRecord, identifier: "bad-identifier" }),
    ).toThrow(/identifier must be snake_case/);
  });

  it("rejects unknown extra fields (strict schema)", () => {
    expect(() => parseProjectRecord({ ...validRecord, inventedField: true })).toThrow(
      ContentValidationError,
    );
  });

  it("rejects a placeholder record that claims nothing is unresolved", () => {
    expect(() =>
      parseProjectRecord({
        ...validRecord,
        status: "placeholder",
        unresolved: [],
      }),
    ).toThrow(/must list at least one unresolved item/);
  });

  it("rejects an empty field that is not declared unresolved", () => {
    expect(() => parseProjectRecord({ ...validRecord, technologies: [] })).toThrow(
      /empty "technologies" must be listed as unresolved/,
    );
  });

  it("rejects a populated field that is also declared unresolved", () => {
    expect(() =>
      parseProjectRecord({ ...validRecord, unresolved: ["technologies"] }),
    ).toThrow(/"technologies" has data but is also listed as unresolved/);
  });
});

describe("parseProjectRecord — boundary", () => {
  it("accepts a slug of exactly 64 characters", () => {
    const slug = "a".repeat(64);
    expect(parseProjectRecord({ ...validRecord, slug }).slug).toBe(slug);
  });

  it("rejects a slug longer than 64 characters", () => {
    expect(() => parseProjectRecord({ ...validRecord, slug: "a".repeat(65) })).toThrow(
      /at most 64/,
    );
  });

  it("accepts a metric value of exactly zero", () => {
    const parsed = parseProjectRecord({
      ...validRecord,
      metrics: [{ label: "Bugs", value: 0 }],
    });
    expect(parsed.metrics[0]?.value).toBe(0);
  });

  it("rejects negative metric values", () => {
    expect(() =>
      parseProjectRecord({ ...validRecord, metrics: [{ label: "Users", value: -1 }] }),
    ).toThrow(ContentValidationError);
  });

  it("rejects non-finite metric values", () => {
    expect(() =>
      parseProjectRecord({
        ...validRecord,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        metrics: [{ label: "Users", value: Number.POSITIVE_INFINITY } as any],
      }),
    ).toThrow(ContentValidationError);
  });
});

describe("parseProjectRecord — malformed URLs", () => {
  it.each(["not-a-url", "http://", "https://", "ftp://example.com/file"])(
    "rejects malformed or non-https URL %s",
    (url) => {
      expect(() =>
        parseProjectRecord({
          ...validRecord,
          links: [{ label: "Demo", url, role: "live-demo" }],
        }),
      ).toThrow(ContentValidationError);
    },
  );

  it("rejects plain-http external links", () => {
    expect(() =>
      parseProjectRecord({
        ...validRecord,
        links: [
          { label: "Demo", url: "http://insecure.example.com", role: "live-demo" },
        ],
      }),
    ).toThrow(/must use https/);
  });
});

describe("validateProjectCollection — duplicates and cross-references", () => {
  it("rejects duplicate slugs", () => {
    const clone = { ...validRecord };
    expect(() => validateProjectCollection([clone, structuredClone(clone)])).toThrow(
      /duplicate slug: test-project/,
    );
  });

  it("rejects records sharing a slug only after trimming differs", () => {
    expect(() =>
      validateProjectCollection([validRecord, { ...validRecord, title: "Other" }]),
    ).toThrow(/duplicate slug/);
  });

  it("rejects duplicate identifiers even when slugs differ", () => {
    expect(() =>
      validateProjectCollection([
        validRecord,
        { ...validRecord, slug: "other-project" },
      ]),
    ).toThrow(/duplicate identifier: test_project/);
  });

  it("rejects a collection missing a promised route", () => {
    expect(() =>
      validateProjectCollection([validRecord], {
        expectedSlugs: ["test-project", "other"],
      }),
    ).toThrow(/missing project for route: \/projects\/other\//);
  });

  it("rejects a record with no corresponding generated route", () => {
    expect(() =>
      validateProjectCollection([validRecord], { expectedSlugs: [] }),
    ).toThrow(/project without generated route: test-project/);
  });

  it("reports every invalid record path, not just the first", () => {
    try {
      parseProjectRecord({ ...validRecord, slug: "", title: "" });
      expect.unreachable("expected throw");
    } catch (error) {
      expect(error).toBeInstanceOf(ContentValidationError);
      const details = (error as ContentValidationError).details.join("\n");
      expect(details).toContain("slug");
      expect(details).toContain("title");
    }
  });
});
