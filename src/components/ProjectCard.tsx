import type { ProjectRecord } from "@/content/project-schema";
import { withBase } from "@/lib/base-path";

interface Props {
  project: Pick<ProjectRecord, "title" | "tagline" | "status" | "summary" | "slug">;
}

/**
 * Server-rendered only (no `client:` directive anywhere): this exercises the
 * React integration without shipping any client-side JavaScript.
 */
export function ProjectCard({ project }: Props) {
  return (
    <li className="project-card">
      <h3>
        <a href={withBase(`/projects/${project.slug}/`)}>{project.title}</a>
      </h3>
      <p>
        {project.tagline}{" "}
        {project.status === "placeholder" ? (
          <span className="badge">Placeholder case study</span>
        ) : null}
      </p>
    </li>
  );
}
