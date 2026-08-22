import type { GraphNode, HomeGraph } from "@/graph/graph-schema";
import { Fragment } from "react";

interface GraphDetailsProps {
  graph: HomeGraph;
  activeNode: GraphNode | null;
  pinned: boolean;
  relatedIdsByNode: Map<string, Set<string>>;
}

function relatedProjectsOf(
  node: GraphNode,
  graph: HomeGraph,
  relatedIdsByNode: Map<string, Set<string>>,
): Array<{ id: string; label: string; href: string | undefined }> {
  if (node.kind !== "technology") return [];
  const related = relatedIdsByNode.get(node.id) ?? new Set<string>();
  return graph.nodes.flatMap((candidate) =>
    candidate.kind === "project" && related.has(candidate.id)
      ? [{ id: candidate.id, label: candidate.label, href: candidate.href }]
      : [],
  );
}

/**
 * Stable textual detail region for the graph. Screen-reader and keyboard
 * users get the same information pointer users see — no spatial inference
 * required. Uses aria-live so updates are announced politely.
 */
export default function GraphDetails({
  graph,
  activeNode,
  pinned,
  relatedIdsByNode,
}: GraphDetailsProps) {
  const headingId = "graph-details-heading";
  return (
    <aside className="graph-details" aria-labelledby={headingId} aria-live="polite">
      <h3 id={headingId} className="graph-details-title">
        {activeNode ? `Details: ${activeNode.label}` : "About this graph"}
      </h3>
      {activeNode === null ? (
        <p>
          A map of Bi Phan's projects and the technologies behind them. Hover a circle
          or move keyboard focus to a node to read about it here; press Enter to pin it,
          Escape to unpin.
        </p>
      ) : (
        <div className="graph-details-body">
          <p className="graph-details-kind">
            <span className="badge">{activeNode.kind}</span>
            {pinned ? <span className="badge badge-provisional">Pinned</span> : null}
          </p>
          <p>{activeNode.detail}</p>
          {activeNode.kind === "person" && activeNode.href ? (
            <p>
              <a href={activeNode.href}>Read more on the About page</a>
            </p>
          ) : null}
          {activeNode.kind === "project" && activeNode.href ? (
            <p>
              <a href={activeNode.href}>Open the case study</a>
            </p>
          ) : null}
          {activeNode.kind === "story" && activeNode.projectSlug
            ? (() => {
                const ownerProject = graph.nodes.find(
                  (candidate) => candidate.id === `project:${activeNode.projectSlug}`,
                );
                return (
                  <p>
                    Part of{" "}
                    {ownerProject?.href ? (
                      <a href={ownerProject.href}>{ownerProject.label}</a>
                    ) : (
                      (ownerProject?.label ?? activeNode.projectSlug)
                    )}
                    's case study.
                  </p>
                );
              })()
            : null}
          {relatedProjectsOf(activeNode, graph, relatedIdsByNode).length > 0 ? (
            <p>
              Used by{" "}
              {relatedProjectsOf(activeNode, graph, relatedIdsByNode).map(
                (project, index) => (
                  <Fragment key={project.id}>
                    {index > 0 ? ", " : ""}
                    {project.href ? (
                      <a href={project.href}>{project.label}</a>
                    ) : (
                      project.label
                    )}
                  </Fragment>
                ),
              )}
              .
            </p>
          ) : null}
        </div>
      )}
    </aside>
  );
}
