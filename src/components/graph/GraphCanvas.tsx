import type { HomeGraph } from "@/graph/graph-schema";
import type { Point } from "@/graph/layouts";
import GraphEdges from "./GraphEdges";
import GraphNode from "./GraphNode";

interface GraphCanvasProps {
  graph: HomeGraph;
  /** Resolved coordinates for the current scene (home or project focus). */
  layoutNodes: Record<string, Point>;
  /**
   * Nodes currently emphasized (active interaction node, or search matches).
   * Null = idle (no emphasis/dimming at all).
   */
  highlightIds: Set<string> | null;
  /** Neighbors of highlighted nodes; rendered secondary rather than dimmed. */
  relatedIds: Set<string>;
  pinnedNodeId: string | null;
  onNodeHover: (nodeId: string | null) => void;
  onNodeFocusChange: (nodeId: string | null) => void;
  onNodeActivate: (nodeId: string) => void;
}

/**
 * Static graph surface: SVG edge layer behind a DOM node layer. Nodes are
 * real <button> elements positioned by authored layout coordinates; edges are
 * non-interactive SVG lines. No canvas, WebGL, or simulation.
 */
export default function GraphCanvas({
  graph,
  layoutNodes,
  highlightIds,
  relatedIds,
  pinnedNodeId,
  onNodeHover,
  onNodeFocusChange,
  onNodeActivate,
}: GraphCanvasProps) {
  return (
    <div className="graph-canvas">
      <GraphEdges
        graph={graph}
        layoutNodes={layoutNodes}
        highlightIds={highlightIds}
        relatedIds={relatedIds}
      />
      <ul className="graph-nodes" aria-label="Graph nodes">
        {graph.nodes.map((node) => {
          const point = layoutNodes[node.id];
          if (!point) return null;
          const highlighted = highlightIds?.has(node.id) ?? false;
          const dimmed =
            highlightIds !== null && !highlighted && !relatedIds.has(node.id);
          return (
            <GraphNode
              key={node.id}
              node={node}
              point={point}
              dimmed={dimmed}
              pressed={pinnedNodeId === node.id}
              onHover={onNodeHover}
              onFocusChange={onNodeFocusChange}
              onActivate={onNodeActivate}
            />
          );
        })}
      </ul>
    </div>
  );
}
