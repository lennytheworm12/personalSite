import type { GraphNode, HomeGraph } from "@/graph/graph-schema";
import type { GraphLayouts, LayoutViewport } from "@/graph/layouts";
import { useEffect, useMemo, useState } from "react";
import GraphCanvas from "./GraphCanvas";
import GraphDetails from "./GraphDetails";
import { selectViewport } from "@/graph/layouts";

export interface GraphIslandProps {
  graph: HomeGraph;
  layouts: GraphLayouts;
  /** Preset used for server-rendered markup before hydration measures width. */
  ssrViewport?: LayoutViewport;
}

/**
 * Minimal Phase 2 interaction state. Later-phase state machines (search,
 * project focus, history) are deliberately absent.
 */
interface GraphInteractionState {
  hoveredNodeId: string | null;
  focusedNodeId: string | null;
  pinnedNodeId: string | null;
}

/**
 * Information priority (highest first): keyboard focus > pinned > hover > idle.
 */
function resolveActiveNodeId(state: GraphInteractionState): string | null {
  return state.focusedNodeId ?? state.pinnedNodeId ?? state.hoveredNodeId ?? null;
}

export default function GraphIsland({
  graph,
  layouts,
  ssrViewport = "wide",
}: GraphIslandProps) {
  const [viewport, setViewport] = useState<LayoutViewport>(ssrViewport);
  const [interaction, setInteraction] = useState<GraphInteractionState>({
    hoveredNodeId: null,
    focusedNodeId: null,
    pinnedNodeId: null,
  });

  // Hydration-time viewport switching; keeps SSR markup deterministic.
  useEffect(() => {
    const update = () => setViewport(selectViewport(window.innerWidth));
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const activeNodeId = resolveActiveNodeId(interaction);

  const nodesById = useMemo(() => {
    const map = new Map<string, GraphNode>();
    for (const node of graph.nodes) map.set(node.id, node);
    return map;
  }, [graph]);

  const relatedIdsByNode = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const node of graph.nodes) map.set(node.id, new Set());
    for (const edge of graph.edges) {
      map.get(edge.source)?.add(edge.target);
      map.get(edge.target)?.add(edge.source);
    }
    return map;
  }, [graph]);

  const activeNode = activeNodeId ? (nodesById.get(activeNodeId) ?? null) : null;

  const pinNode = (nodeId: string) => {
    setInteraction((prev) => ({
      ...prev,
      pinnedNodeId: prev.pinnedNodeId === nodeId ? null : nodeId,
    }));
  };

  return (
    <div
      className="graph-island"
      data-viewport={viewport}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          setInteraction((prev) => ({ ...prev, pinnedNodeId: null }));
        }
      }}
    >
      <GraphCanvas
        graph={graph}
        layouts={layouts}
        viewport={viewport}
        activeNodeId={activeNodeId}
        pinnedNodeId={interaction.pinnedNodeId}
        relatedIdsByNode={relatedIdsByNode}
        onNodeHover={(nodeId) =>
          setInteraction((prev) => ({ ...prev, hoveredNodeId: nodeId }))
        }
        onNodeFocus={(nodeId) =>
          setInteraction((prev) => ({ ...prev, focusedNodeId: nodeId }))
        }
        onNodeActivate={pinNode}
      />
      <GraphDetails
        graph={graph}
        activeNode={activeNode}
        pinned={interaction.pinnedNodeId !== null}
        relatedIdsByNode={relatedIdsByNode}
      />
    </div>
  );
}
