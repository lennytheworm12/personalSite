import type { HomeGraph } from "@/graph/graph-schema";
import type { HomeLayoutPreset } from "@/graph/layouts";

interface GraphEdgesProps {
  graph: HomeGraph;
  layout: HomeLayoutPreset;
  activeNodeId: string | null;
  relatedIdsByNode: Map<string, Set<string>>;
}

/**
 * SVG edge layer. Sits behind the DOM nodes, ignores pointer events, and
 * carries no accessible text (screen-reader users get meaning from nodes and
 * the detail region instead). Active edges are thicker and solid; inactive
 * edges thinner and dashed — distinguishable without relying on color.
 */
export default function GraphEdges({
  graph,
  layout,
  activeNodeId,
  relatedIdsByNode,
}: GraphEdgesProps) {
  const related =
    activeNodeId !== null
      ? (relatedIdsByNode.get(activeNodeId) ?? new Set<string>())
      : null;

  return (
    <svg
      className="graph-edges"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      {graph.edges.map((edge) => {
        const from = layout.nodes[edge.source];
        const to = layout.nodes[edge.target];
        if (!from || !to) return null;
        const isActive =
          activeNodeId !== null &&
          (edge.source === activeNodeId || edge.target === activeNodeId);
        const isSecondary =
          !isActive &&
          activeNodeId !== null &&
          (related?.has(edge.source) ?? false) &&
          (related?.has(edge.target) ?? false);
        const className = [
          "graph-edge",
          isActive ? "graph-edge-active" : "",
          isSecondary ? "graph-edge-secondary" : "",
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
