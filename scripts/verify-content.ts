import { projects } from "../src/content/projects";

/**
 * CI gate: importing the collection validates the whole content model
 * (schema, duplicates, malformed URLs, cross-references). A throw exits
 * non-zero and fails the pipeline.
 */
console.info(`validated ${projects.length} project records:`);
for (const project of projects) {
  console.info(
    `  /projects/${project.slug}/ [${project.status}] unresolved: ${project.unresolved.length}`,
  );
}
