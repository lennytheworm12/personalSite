import { Fragment } from "react";
import type { HomeGraph } from "@/graph/graph-schema";
import type { GraphLayouts, LayoutViewport } from "@/graph/layouts";
import GraphEdges from "./GraphEdges";
import GraphNode from "./GraphNode";

interface GraphCanvasProps {
  graph: HomeGraph;
  layouts: GraphLayouts;
  viewport: LayoutViewport;
  activeNodeId: string | null;
  pinnedNodeId: string | null;
  relatedIdsByNode: Map<string, Set<string>>;
  onNodeHover: (nodeId: string | null) => void;
  onNodeFocus: (nodeId: string | null) => void;
  onNodeActivate: (nodeId: string) => void;
}

/**
 * Static graph surface: SVG edge layer behind a DOM node layer. Nodes are
 * real <button> elements positioned by authored layout coordinates; edges are
 * non-interactive SVG lines. No canvas, WebGL, or simulation.
 */
export default function GraphCanvas({
  graph,
  layouts,
  viewport,
  activeNodeId,
  pinnedNodeId,
  relatedIdsByNode,
  onNodeHover,
  onNodeFocus,
  onNodeActivate,
}: GraphCanvasProps) {
  const layout = layouts[viewport];
  const related =
    activeNodeId !== null
      ? (relatedIdsByNode.get(activeNodeId) ?? new Set<string>())
      : null;

  return (
    <div className="graph-canvas" data-viewport={viewport}>
      <GraphEdges
        graph={graph}
        layout={layout}
        activeNodeId={activeNodeId}
        relatedIdsByNode={relatedIdsByNode}
      />
      <ul className="graph-nodes" aria-label="Graph nodes">
        {graph.nodes.map((node) => {
          const point = layout.nodes[node.id];
          if (!point) return null;
          const isActive = node.id === activeNodeId;
          const isRelated = related?.has(node.id) ?? false;
          const dimmed = activeNodeId !== null && !isActive && !isRelated;
          return (
            <Fragment key={node.id}>
              <GraphNode
                node={node}
                point={point}
                dimmed={dimmed}
                pressed={pinnedNodeId === node.id}
                onHover={onNodeHover}
                onFocusChange={onNodeFocus}
                onActivate={onNodeActivate}
              />
            </Fragment>
          );
        })}
      </ul>
    </div>
  );
}
