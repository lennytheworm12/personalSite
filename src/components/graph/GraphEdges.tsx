import type { HomeGraph } from "@/graph/graph-schema";
import type { Point } from "@/graph/layouts";

interface GraphEdgesProps {
  graph: HomeGraph;
  layoutNodes: Record<string, Point>;
  highlightIds: Set<string> | null;
  relatedIds: Set<string>;
}

/**
 * SVG edge layer. Sits behind the DOM nodes, ignores pointer events, and
 * carries no accessible text (screen-reader users get meaning from nodes and
 * the detail region instead). Edges touching highlighted nodes are thicker
 * and solid; inactive edges thinner and dashed — distinguishable without
 * relying on color alone.
 */
export default function GraphEdges({
  graph,
  layoutNodes,
  highlightIds,
  relatedIds,
}: GraphEdgesProps) {
  return (
    <svg
      className="graph-edges"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      {graph.edges.map((edge) => {
        const from = layoutNodes[edge.source];
        const to = layoutNodes[edge.target];
        if (!from || !to) return null;
        const touchesHighlight =
          highlightIds !== null &&
          (highlightIds.has(edge.source) || highlightIds.has(edge.target));
        const bothRelated =
          highlightIds !== null &&
          relatedIds.has(edge.source) &&
          relatedIds.has(edge.target);
        const className = [
          "graph-edge",
          touchesHighlight ? "graph-edge-active" : "",
          !touchesHighlight && bothRelated ? "graph-edge-secondary" : "",
        ]
          .filter(Boolean)
          .join(" ");
        return (
          <line
            key={edge.id}
            className={className}
            data-edge-kind={edge.kind}
            x1={from.x}
            y1={from.y}
            x2={to.x}
            y2={to.y}
          />
        );
      })}
    </svg>
  );
}
