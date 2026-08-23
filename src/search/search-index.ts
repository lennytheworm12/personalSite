import { profile } from "@/content/profile";
import { getFeaturedProjects } from "@/content/projects";
import { normalizeText, type SearchEntry } from "./search-types";

/**
 * Local search index (Goal 3, M4), derived at build time from the same
 * validated content that powers the graph and case studies. No remote
 * service, no duplicate hand-maintained database.
 *
 * Scope: titles, aliases, summaries, contribution, technology labels and
 * purposes, concepts, story labels/details, profile/About terms.
 * Excluded: memories, LeetCode, anything remote.
 */

/** Build the search index from validated featured content. */
export function buildSearchIndex(): SearchEntry[] {
  const entries: SearchEntry[] = [];

  entries.push({
    id: "search:profile:bi",
    kind: "profile",
    label: profile.name,
    normalizedTerms: [normalizeText("about interests bio engineer")],
    projectSlugs: [],
    nodeId: profile.nodeId,
    href: "/about/",
    preview: profile.intro.text,
    priority: 2,
  });

  for (const project of getFeaturedProjects()) {
    const href = `/projects/${project.slug}/`;

    entries.push({
      id: `search:project:${project.slug}`,
      kind: "project",
      label: project.title,
      normalizedTerms: [
        ...project.aliases.map(normalizeText),
        ...(project.contribution ? [normalizeText(project.contribution.text)] : []),
      ],
      projectSlugs: [project.slug],
      nodeId: `project:${project.slug}`,
      href,
      preview: project.summary,
      priority: 1,
    });

    if (project.motivation) {
      entries.push({
        id: `search:story:${project.slug}:motivation`,
        kind: "story",
        label: `Why ${project.title}?`,
        normalizedTerms: [normalizeText(project.motivation.text)],
        projectSlugs: [project.slug],
        nodeId: `story:${project.slug}:motivation`,
        href,
        preview: project.motivation.text,
        priority: 3,
      });
    }

    for (const technology of project.technologies) {
      entries.push({
        id: `search:tech:${technology.id}`,
        kind: "technology",
        label: technology.label,
        normalizedTerms: [normalizeText(technology.purpose.text)],
        projectSlugs: [project.slug],
        nodeId: `tech:${technology.id}`,
        href,
        preview: technology.purpose.text,
        priority: 2,
      });
    }

    for (const concept of project.concepts) {
      const slugified = concept
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      if (!slugified) continue;
      entries.push({
        id: `search:concept:${slugified}`,
        kind: "concept",
        label: concept,
        normalizedTerms: [],
        projectSlugs: [project.slug],
        nodeId: `concept:${slugified}`,
        href,
        preview: `${concept} — explored through ${project.title}.`,
        priority: 2,
      });
    }
  }

  return entries;
}

let cachedIndex: SearchEntry[] | null = null;

/** Lazily built singleton so first Search open pays a tiny one-time cost. */
export function getSearchIndex(): SearchEntry[] {
  cachedIndex ??= buildSearchIndex();
  return cachedIndex;
}
