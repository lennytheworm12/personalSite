import type { GraphNode } from "@/graph/graph-schema";
import type { Point } from "@/graph/layouts";

interface GraphNodeProps {
  node: GraphNode;
  point: Point;
  dimmed: boolean;
  pressed: boolean;
  onHover: (nodeId: string | null) => void;
  onFocusChange: (nodeId: string | null) => void;
  onActivate: (nodeId: string) => void;
}

/**
 * A single interactive graph node. Real <button> semantics: Enter/Space
 * activate (toggle the pinned detail), focus is visible, and the accessible
 * name is the node label plus its kind.
 */
export default function GraphNode({
  node,
  point,
  dimmed,
  pressed,
  onHover,
  onFocusChange,
  onActivate,
}: GraphNodeProps) {
  return (
    <li className="graph-node-slot" style={{ left: `${point.x}%`, top: `${point.y}%` }}>
      <button
        type="button"
        className={`graph-node graph-node-${node.kind}${dimmed ? " graph-node-dimmed" : ""}`}
        data-node-id={node.id}
        aria-pressed={pressed}
        onMouseEnter={() => onHover(node.id)}
        onMouseLeave={() => onHover(null)}
        onFocus={() => onFocusChange(node.id)}
        onBlur={() => onFocusChange(null)}
        onClick={() => onActivate(node.id)}
      >
        <span className="graph-node-label">{node.label}</span>
      </button>
    </li>
  );
}
