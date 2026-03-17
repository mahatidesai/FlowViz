import dagre from "@dagrejs/dagre";

const NODE_WIDTH = 160;
const NODE_HEIGHT = 48;
const DECISION_SIZE = 130; // decision nodes are square (rotated to diamond)

const RANK_SEP = 80;   // vertical gap between ranks
const NODE_SEP = 60;   // horizontal gap between nodes in same rank

/**
 * Run Dagre layout on nodes + edges and return positioned copies.
 *
 * @param {import("@xyflow/react").Node[]} nodes
 * @param {import("@xyflow/react").Edge[]} edges
 * @param {"TB"|"LR"|"BT"|"RL"} direction
 */
export function getLayoutedElements(nodes, edges, direction = "TB") {
  const isHorizontal = direction === "LR" || direction === "RL";

  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: direction,
    ranksep: RANK_SEP,
    nodesep: NODE_SEP,
    edgesep: 20,
    marginx: 40,
    marginy: 40,
  });

  nodes.forEach((node) => {
    const isDecision = node.type === "decision";
    g.setNode(node.id, {
      width: isDecision ? DECISION_SIZE : NODE_WIDTH,
      height: isDecision ? DECISION_SIZE : NODE_HEIGHT,
    });
  });

  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target);
  });

  dagre.layout(g);

  const layoutedNodes = nodes.map((node) => {
    const { x, y, width, height } = g.node(node.id);
    return {
      ...node,
      // React Flow positions from top-left corner
      position: {
        x: x - width / 2,
        y: y - height / 2,
      },
      // Required for dagre to respect handle positions
      targetPosition: isHorizontal ? "left" : "top",
      sourcePosition: isHorizontal ? "right" : "bottom",
    };
  });

  return { nodes: layoutedNodes, edges };
}
