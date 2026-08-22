import {
  validateProjectCollection,
  type ProjectRecord,
  type RawProjectRecord,
} from "./project-schema";

/**
 * The single source of truth for project content, shared by the Index, the
 * generated case-study routes, and the home graph builder.
 *
 * Content rules (see docs/decisions-log.md R2–R5):
 * - draft copy carries `provisional: true` until the content-audit pass;
 * - unknown facts are listed in `unresolved`, never invented;
 * - quantitative evidence stays empty until real data exists;
 * - `memories: []` is valid; memories arrive in a later phase;
 * - LeetCode data is not modeled at all (deferred).
 */
const rawProjectRecords = [
  {
    slug: "spotify-sorter",
    identifier: "spotify_sorter",
    title: "Spotify Sorter",
    aliases: [],
    tagline:
      "A tool for organizing and exploring a Spotify library — provisional description pending confirmation.",
    summary:
      "Spotify Sorter is a personal project for organizing and exploring a Spotify music library. This case study is still being written: the sections below are explicitly provisional drafts and will be replaced with confirmed facts during a content-audit pass. Nothing here is claimed as final.",
    status: "placeholder",
    featured: true,
    motionStyle: "calm",
    unresolved: [
      "evidence",
      "challenges",
      "outcomes",
      "nextSteps",
      "metrics",
      "links",
      "screenshots-or-visuals",
      "project-timeline",
      "role-on-team",
    ],
    concepts: ["music organization", "playlist curation"],
    memories: [],
    motivation: {
      text: "DRAFT: The initial motivation was frustration with finding and grouping music inside a large library. Exact details of when and why the project started have not been confirmed yet.",
      provisional: true,
    },
    contribution: {
      text: "DRAFT: Bi Phan designed and built the project individually. The precise split of design, engineering, and research work has not been documented yet.",
      provisional: true,
    },
    technologies: [
      {
        id: "typescript",
        label: "TypeScript",
        category: "language",
        purpose: {
          text: "DRAFT: primary language for application logic.",
          provisional: true,
        },
        verification: "provisional",
      },
      {
        id: "react",
        label: "React",
        category: "framework",
        purpose: {
          text: "DRAFT: interface components and state.",
          provisional: true,
        },
        verification: "provisional",
      },
      {
        id: "web-audio-api",
        label: "Web Audio API",
        category: "platform",
        purpose: {
          text: "DRAFT: audio preview or analysis features.",
          provisional: true,
        },
        verification: "unverified",
      },
    ],
    metrics: [],
    links: [],
  },
  {
    slug: "game-teacher",
    identifier: "game_teacher",
    title: "Game Teacher",
    aliases: [],
    tagline:
      "A project about teaching game development concepts — provisional description pending confirmation.",
    summary:
      "Game Teacher is a personal project focused on teaching game development concepts. This case study is still being written: the sections below are explicitly provisional drafts and will be replaced with confirmed facts during a content-audit pass. Nothing here is claimed as final.",
    status: "placeholder",
    featured: true,
    motionStyle: "calm",
    unresolved: [
      "evidence",
      "challenges",
      "outcomes",
      "nextSteps",
      "metrics",
      "links",
      "screenshots-or-visuals",
      "project-timeline",
      "role-on-team",
    ],
    concepts: ["game design", "teaching"],
    memories: [],
    motivation: {
      text: "DRAFT: The project grew out of wanting to make learning game development more approachable. Exact origin details have not been confirmed yet.",
      provisional: true,
    },
    contribution: {
      text: "DRAFT: Bi Phan built the project individually. The precise scope of teaching material versus tooling has not been documented yet.",
      provisional: true,
    },
    technologies: [
      {
        id: "typescript",
        label: "TypeScript",
        category: "language",
        purpose: {
          text: "DRAFT: shared language across tooling and lessons.",
          provisional: true,
        },
        verification: "provisional",
      },
      {
        id: "react",
        label: "React",
        category: "framework",
        purpose: {
          text: "DRAFT: lesson interface and exercises.",
          provisional: true,
        },
        verification: "provisional",
      },
    ],
    metrics: [],
    links: [],
  },
] satisfies RawProjectRecord[];

/** Routes the site promises to generate from this collection. */
export const EXPECTED_PROJECT_SLUGS = ["spotify-sorter", "game-teacher"] as const;

/** Projects promoted to the homepage graph. */
export const FEATURED_PROJECT_SLUGS = ["spotify-sorter", "game-teacher"] as const;

/**
 * Validated at module load so every consumer (Index, routes, graph builder,
 * verification scripts, tests) sees exactly the same checked model.
 */
export const projects: ProjectRecord[] = validateProjectCollection(rawProjectRecords, {
  expectedSlugs: EXPECTED_PROJECT_SLUGS,
});

export function getProjectBySlug(slug: string): ProjectRecord | undefined {
  return projects.find((project) => project.slug === slug);
}

export function getFeaturedProjects(): ProjectRecord[] {
  return projects.filter((project) => project.featured);
}
