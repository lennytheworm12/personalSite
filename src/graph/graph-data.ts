import { profile } from "@/content/profile";
import { getFeaturedProjects, projects } from "@/content/projects";
import { buildHomeGraph } from "./graph-builder";

/**
 * The shipped home graph, derived once at build time from the same validated
 * project records used by the Index and case-study routes.
 *
 * This module is imported by the homepage only; the graph payload passed to
 * the client island contains graph nodes/edges and layouts — never full
 * case-study bodies or unrelated site content.
 */
export const homeGraphResult = buildHomeGraph({
  profile,
  projects: getFeaturedProjects(),
});
export const homeGraph = homeGraphResult.graph;
export const allProjects = projects;
