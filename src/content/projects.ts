import {
  validateProjectCollection,
  type ProjectRecord,
  type RawProjectRecord,
} from "./project-schema";

/**
 * The single source of truth for project content, shared by the Index and the
 * generated case-study routes. Every unknown fact is declared in `unresolved`
 * rather than invented.
 *
 * TODO(user): replace placeholder copy and fill unresolved facts (see
 * docs/decisions-log.md B4) before public launch.
 */
const rawProjectRecords = [
  {
    slug: "spotify-sorter",
    identifier: "spotify_sorter",
    title: "Spotify Sorter",
    tagline:
      "Placeholder case study — honest summary pending; this project exists and will be documented here.",
    summary:
      "This is an honest placeholder case study for Spotify Sorter. The detailed description of what the project does has not been written yet, so nothing is claimed here beyond its existence. Facts about goals, contributions, outcomes, and technologies will be added only once they are confirmed.",
    status: "placeholder",
    unresolved: [
      "contributions",
      "technologies",
      "metrics",
      "links",
      "screenshots-or-visuals",
      "project-timeline",
      "role-on-team",
      "problem-statement-copy",
    ],
    contributions: [],
    technologies: [],
    metrics: [],
    links: [],
  },
  {
    slug: "game-teacher",
    identifier: "game_teacher",
    title: "Game Teacher",
    tagline:
      "Placeholder case study — honest summary pending; this project exists and will be documented here.",
    summary:
      "This is an honest placeholder case study for Game Teacher. The detailed description of what the project does has not been written yet, so nothing is claimed here beyond its existence. Facts about goals, contributions, outcomes, and technologies will be added only once they are confirmed.",
    status: "placeholder",
    unresolved: [
      "contributions",
      "technologies",
      "metrics",
      "links",
      "screenshots-or-visuals",
      "project-timeline",
      "role-on-team",
      "problem-statement-copy",
    ],
    contributions: [],
    technologies: [],
    metrics: [],
    links: [],
  },
] satisfies RawProjectRecord[];

/** Routes the site promises to generate from this collection. */
export const EXPECTED_PROJECT_SLUGS = ["spotify-sorter", "game-teacher"] as const;

/**
 * Validated at module load so every consumer (Index, routes, verification
 * scripts, tests) sees exactly the same checked model.
 */
export const projects: ProjectRecord[] = validateProjectCollection(rawProjectRecords, {
  expectedSlugs: EXPECTED_PROJECT_SLUGS,
});

export function getProjectBySlug(slug: string): ProjectRecord | undefined {
  return projects.find((project) => project.slug === slug);
}
