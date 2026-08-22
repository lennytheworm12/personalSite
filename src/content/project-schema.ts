import { z } from "zod";

/**
 * Graph-ready project content model (Phase 2).
 *
 * One shared source of truth consumed by the Index, the generated case-study
 * routes, and the home graph builder. Unknown facts are never invented: any
 * field whose value is not known yet must be listed in `unresolved`, and any
 * draft text that has not passed a content audit carries `provisional: true`.
 */

export const PROJECT_STATUS_VALUES = ["placeholder", "published"] as const;

export const MOTION_STYLE_VALUES = ["calm", "steady", "energetic"] as const;

export const TECH_CATEGORY_VALUES = [
  "language",
  "framework",
  "library",
  "tool",
  "platform",
  "concept-area",
] as const;

export const VERIFICATION_STATES = ["verified", "unverified", "provisional"] as const;

/** Kebab-case route-safe slug, e.g. "spotify-sorter". */
export const slugSchema = z
  .string()
  .trim()
  .min(1, "slug must not be empty")
  .max(64, "slug must be at most 64 characters")
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "slug must be kebab-case (lowercase letters, digits, single hyphens)",
  );

/** Stable machine identifier, e.g. "spotify_sorter_v1". */
export const identifierSchema = z
  .string()
  .trim()
  .min(1, "identifier must not be empty")
  .max(64, "identifier must be at most 64 characters")
  .regex(
    /^[a-z0-9]+(?:_[a-z0-9]+)*$/,
    "identifier must be snake_case (lowercase letters, digits, single underscores)",
  );

/** Stable technology id, e.g. "typescript". Used as `tech:<id>` graph node IDs. */
export const techIdSchema = z
  .string()
  .trim()
  .min(1, "technology id must not be empty")
  .max(48, "technology id must be at most 48 characters")
  .regex(
    /^[a-z0-9]+(?:[-.][a-z0-9]+)*$/,
    "technology id must be lowercase kebab/dotted (e.g. web-audio-api)",
  );

export const nonEmptyText = (field: string, max = 400) =>
  z
    .string()
    .trim()
    .min(1, `${field} must not be empty`)
    .max(max, `${field} must be at most ${max} characters`);

/**
 * A piece of prose plus an explicit provenance flag. `provisional: true`
 * marks clearly-labeled draft copy awaiting the content-audit pass (R3);
 * it must never be presented as final.
 */
export const proseSectionSchema = (field: string, max = 1200) =>
  z.object({
    text: nonEmptyText(field, max),
    provisional: z.boolean(),
  });

export type ProseSection = z.output<ReturnType<typeof proseSectionSchema>>;

/** Rejects malformed URLs such as "not-a-url" or "http://". */
export const httpUrlSchema = z
  .url({
    error: (issue) =>
      `${typeof issue.input === "string" ? issue.input : "value"} is not a valid URL`,
  })
  .refine(
    (url) => {
      try {
        return new URL(url).protocol === "https:";
      } catch {
        return false;
      }
    },
    { error: "external links must use https" },
  );

export const projectLinkRoleSchema = z.enum([
  "repository",
  "live-demo",
  "article",
  "video",
  "other",
]);

export const projectLinkSchema = z.object({
  label: nonEmptyText("link label", 80),
  url: httpUrlSchema,
  role: projectLinkRoleSchema,
  unresolved: z.boolean().optional(),
});

export const structuredTechnologySchema = z
  .object({
    /** Stable id shared across projects so shared technologies deduplicate. */
    id: techIdSchema,
    label: nonEmptyText("technology label", 60),
    category: z.enum(TECH_CATEGORY_VALUES),
    /** What this technology does in *this* project; often provisional. */
    purpose: proseSectionSchema("technology purpose", 400),
    /** "verified" only when the fact has been confirmed by the author. */
    verification: z.enum(VERIFICATION_STATES),
  })
  .strict();

export const projectMetricSchema = z.object({
  label: nonEmptyText("metric label", 80),
  value: z.number().finite().min(0),
  unit: z.string().max(24).optional(),
  unresolved: z.literal(true).optional(),
});

/**
 * Narrative case-study sections. Optional: an absent section must be declared
 * in `unresolved`, and a present section must not be.
 */
export const SECTION_NAMES = [
  "motivation",
  "contribution",
  "evidence",
  "challenges",
  "outcomes",
  "nextSteps",
] as const;

export type SectionName = (typeof SECTION_NAMES)[number];

export const projectRecordSchema = z
  .object({
    slug: slugSchema,
    identifier: identifierSchema,
    title: nonEmptyText("title", 120),
    /** Alternate human names, e.g. search/label variants. */
    aliases: z.array(nonEmptyText("alias", 80)).default([]),
    tagline: nonEmptyText("tagline", 200),
    summary: nonEmptyText("summary", 2000),
    status: z.enum(PROJECT_STATUS_VALUES),
    /** Featured projects appear on the homepage graph. */
    featured: z.boolean(),
    motionStyle: z.enum(MOTION_STYLE_VALUES).default("calm"),
    /**
     * Every fact that is genuinely unknown must be named here. Never invent
     * values; see decisions-log.md R4.
     */
    unresolved: z.array(nonEmptyText("unresolved item", 120)).default([]),
    concepts: z.array(nonEmptyText("concept", 80)).default([]),
    /**
     * Project memories (images/stories) arrive in a later phase. An empty
     * array is explicitly valid (R5); entries are unvalidated pass-through.
     */
    memories: z.array(z.unknown()).default([]),
    motivation: proseSectionSchema("motivation").optional(),
    contribution: proseSectionSchema("contribution").optional(),
    evidence: proseSectionSchema("evidence").optional(),
    challenges: proseSectionSchema("challenges").optional(),
    outcomes: proseSectionSchema("outcomes").optional(),
    nextSteps: proseSectionSchema("next steps").optional(),
    technologies: z.array(structuredTechnologySchema).default([]),
    metrics: z.array(projectMetricSchema).default([]),
    links: z.array(projectLinkSchema).default([]),
  })
  .strict()
  .superRefine((record, ctx) => {
    // Placeholder records must declare what is unknown instead of faking it.
    if (record.status === "placeholder" && record.unresolved.length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["unresolved"],
        message: "placeholder records must list at least one unresolved item",
      });
    }

    const declarations: Array<[string, boolean]> = [
      ["concepts", record.concepts.length === 0],
      ["technologies", record.technologies.length === 0],
      ["metrics", record.metrics.length === 0],
      ["links", record.links.length === 0],
      ...SECTION_NAMES.map(
        (name) => [name, record[name] === undefined] as [string, boolean],
      ),
    ];

    for (const [name, isEmpty] of declarations) {
      if (isEmpty && !record.unresolved.includes(name)) {
        ctx.addIssue({
          code: "custom",
          path: ["unresolved"],
          message: `empty "${name}" must be listed as unresolved`,
        });
      }
      if (!isEmpty && record.unresolved.includes(name)) {
        ctx.addIssue({
          code: "custom",
          path: ["unresolved"],
          message: `"${name}" has data but is also listed as unresolved`,
        });
      }
    }
  });

export type MotionStyle = z.infer<typeof projectRecordSchema>["motionStyle"];
export type TechCategory = (typeof TECH_CATEGORY_VALUES)[number];
export type VerificationState = (typeof VERIFICATION_STATES)[number];
export type StructuredTechnology = z.infer<typeof structuredTechnologySchema>;
export type ProjectLinkRole = z.infer<typeof projectLinkRoleSchema>;
export type ProjectLink = z.infer<typeof projectLinkSchema>;
export type ProjectMetric = z.infer<typeof projectMetricSchema>;
export type RawProjectRecord = z.input<typeof projectRecordSchema>;
export type ProjectRecord = z.output<typeof projectRecordSchema>;

export class ContentValidationError extends Error {
  readonly details: string[];

  constructor(message: string, details: string[] = []) {
    super([message, ...details.map((d) => `  - ${d}`)].join("\n"));
    this.name = "ContentValidationError";
    this.details = details;
  }
}

function formatZodIssues(error: z.ZodError): string[] {
  return error.issues.map(
    (issue) => `${issue.path.join(".") || "<root>"}: ${issue.message}`,
  );
}

/** Parse a single record; throws ContentValidationError with readable paths. */
export function parseProjectRecord(input: unknown): ProjectRecord {
  const result = projectRecordSchema.safeParse(input);
  if (!result.success) {
    throw new ContentValidationError(
      "invalid project record",
      formatZodIssues(result.error),
    );
  }
  return result.data;
}

export interface CollectionOptions {
  /**
   * Slugs the site promises to publish (Index references). The collection
   * must cover exactly these slugs — no missing routes, no stray records.
   */
  expectedSlugs?: readonly string[];
}

/**
 * Validate an entire collection: per-record schema checks, duplicate slug and
 * duplicate identifier rejection, and cross-reference coverage against the
 * routes the site generates.
 */
export function validateProjectCollection(
  input: readonly unknown[],
  options: CollectionOptions = {},
): ProjectRecord[] {
  const records = input.map(parseProjectRecord);

  const seenSlugs = new Map<string, number>();
  const seenIdentifiers = new Map<string, number>();
  for (const record of records) {
    seenSlugs.set(record.slug, (seenSlugs.get(record.slug) ?? 0) + 1);
    seenIdentifiers.set(
      record.identifier,
      (seenIdentifiers.get(record.identifier) ?? 0) + 1,
    );
  }

  const duplicates = [
    ...[...seenSlugs.entries()]
      .filter(([, n]) => n > 1)
      .map(([slug]) => `duplicate slug: ${slug}`),
    ...[...seenIdentifiers.entries()]
      .filter(([, n]) => n > 1)
      .map(([id]) => `duplicate identifier: ${id}`),
  ];
  if (duplicates.length > 0) {
    throw new ContentValidationError(
      "duplicate keys in project collection",
      duplicates,
    );
  }

  if (options.expectedSlugs) {
    const expected = new Set(options.expectedSlugs);
    const actual = new Set(records.map((r) => r.slug));
    const problems = [
      ...[...expected]
        .filter((s) => !actual.has(s))
        .map((s) => `missing project for route: /projects/${s}/`),
      ...[...actual]
        .filter((s) => !expected.has(s))
        .map((s) => `project without generated route: ${s}`),
    ];
    if (problems.length > 0) {
      throw new ContentValidationError(
        "project/route cross-reference mismatch",
        problems,
      );
    }
  }

  return records;
}
