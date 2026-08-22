import { z } from "zod";

/**
 * Single validated content model shared by the Index and the generated
 * case-study routes. Unknown facts are never invented: any field whose value
 * is not known yet must be listed in `unresolved`.
 */

export const PROJECT_STATUS_VALUES = ["placeholder", "published"] as const;

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

export const nonEmptyText = (field: string, max = 400) =>
  z
    .string()
    .trim()
    .min(1, `${field} must not be empty`)
    .max(max, `${field} must be at most ${max} characters`);

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
  /** True when the URL itself is still unknown and shown as a placeholder. */
  unresolved: z.boolean().optional(),
});

export const projectMetricSchema = z.object({
  label: nonEmptyText("metric label", 80),
  /** Omit entirely when the number is unknown; do not guess. */
  value: z.number().finite().min(0),
  unit: z.string().max(24).optional(),
  unresolved: z.literal(true).optional(),
});

export const projectRecordSchema = z
  .object({
    slug: slugSchema,
    identifier: identifierSchema,
    title: nonEmptyText("title", 120),
    tagline: nonEmptyText("tagline", 200),
    summary: nonEmptyText("summary", 2000),
    status: z.enum(PROJECT_STATUS_VALUES),
    /**
     * Every fact that is genuinely unknown must be named here, e.g.
     * "repository-url", "metrics", "screenshots". Never invent values.
     */
    unresolved: z.array(nonEmptyText("unresolved item", 120)).default([]),
    contributions: z.array(nonEmptyText("contribution", 400)).default([]),
    technologies: z.array(nonEmptyText("technology", 60)).default([]),
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
    // Empty structured fields must be declared as unresolved facts.
    const requiredDeclarations: Array<[string, boolean]> = [
      ["contributions", record.contributions.length === 0],
      ["technologies", record.technologies.length === 0],
      ["metrics", record.metrics.length === 0],
      ["links", record.links.length === 0],
    ];
    for (const [name, isEmpty] of requiredDeclarations) {
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
