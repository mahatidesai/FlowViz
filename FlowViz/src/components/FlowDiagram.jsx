import { useState, useCallback, useEffect, useRef, useContext } from "react";
import { getLayoutedElements } from "../utils/layout";
import {
  ReactFlow,
  Background,
  Controls,
  applyNodeChanges,
  applyEdgeChanges,
  MiniMap,
  MarkerType,
  addEdge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import ColorPicker from "react-pick-color";
import {
  FaDownload,
  FaMap,
  FaPlay,
  FaArrowsLeftRight,
  FaArrowsUpDown,
  FaPlus,
  FaDiamond,
} from "react-icons/fa6";
import { toPng } from "html-to-image";
import DecisionNode from "./DecisionNode";
import { JsonDataContext } from "../context/flowJsonContext";

const nodeTypes = { decision: DecisionNode };

const DEFAULT_NODE_COLOR = "#0f172a";
const DEFAULT_TEXT_COLOR = "#e2e8f0";
const DEFAULT_EDGE_COLOR = "#3b82f6";

// ---------------------------------------------------------------------------
// Style helpers
// ---------------------------------------------------------------------------

function styledNode(node, nodeColor, textColor) {
  if (node.type === "decision") return node;

  const isInput = node.type === "input";

  return {
    ...node,
    style: {
      ...node.style,
      backgroundColor: isInput ? "transparent" : nodeColor,
      color: textColor,
      borderRadius: isInput ? "999px" : "10px",
      border: isInput
        ? "2px solid #3b82f6"
        : "1px solid rgba(255,255,255,0.1)",
      padding: "8px 16px",
      fontSize: "13px",
      fontWeight: isInput ? 700 : 500,
      boxShadow: isInput
        ? "0 0 20px rgba(59,130,246,0.25)"
        : "0 2px 8px rgba(0,0,0,0.4)",
      minWidth: "120px",
      textAlign: "center",
    },
  };
}

function styledEdge(edge, edgeColor, animated) {
  const isYes = edge.label === "Yes";
  const isNo  = edge.label === "No";
  const color = isYes ? "#22c55e" : isNo ? "#ef4444" : edgeColor;

  return {
    ...edge,
    animated,
    type: "smoothstep",
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color,
      width: 16,
      height: 16,
    },
    style: {
      stroke: color,
      strokeWidth: isYes || isNo ? 2.5 : 2,
    },
    labelStyle: {
      fill: color,
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: "0.05em",
    },
    labelBgStyle: { fill: "rgba(2,4,18,0.85)", borderRadius: 4 },
    labelBgPadding: [6, 4],
  };
}

// ---------------------------------------------------------------------------
// Toolbar button
// ---------------------------------------------------------------------------

const ToggleButton = ({ active, onClick, children, icon: Icon }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all cursor-pointer border ${
      active
        ? "bg-blue-500/20 text-blue-300 border-blue-500/30"
        : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border-transparent"
    }`}
  >
    {Icon && <Icon size={13} />}
    {children}
  </button>
);

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const FlowDiagram = ({ initialNodes = [], initialEdges = [] }) => {
  const { setInitialNodes, setInitialEdges } = useContext(JsonDataContext);
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);

  const [nodeColor, setNodeColor] = useState(DEFAULT_NODE_COLOR);
  const [textColor, setTextColor] = useState(DEFAULT_TEXT_COLOR);
  const [edgeColor, setEdgeColor] = useState(DEFAULT_EDGE_COLOR);

  const [animateEdges, setAnimateEdges] = useState(false);
  const [activeModal, setActiveModal] = useState(null);
  const [showMiniMap, setShowMiniMap] = useState(false);

  const [editingNode, setEditingNode] = useState(null);
  const [editingText, setEditingText] = useState("");

  const [reactFlowInstance, setReactFlowInstance] = useState(null);
  const [selection, setSelection] = useState({ nodes: [], edges: [] });

  const flowWrapperRef = useRef(null);
  const skipNextContextSyncRef = useRef(false);
  const idCounterRef = useRef(1);

  // Sync incoming props
  useEffect(() => {
    if (!initialNodes.length) return;
    const cleanedNodes = initialNodes.filter((n) => !(n.source && n.target));
    setNodes(cleanedNodes.map((n) => styledNode(n, nodeColor, textColor)));
    setEdges(initialEdges.map((e) => styledEdge(e, edgeColor, animateEdges)));
    skipNextContextSyncRef.current = true;
  }, [initialNodes, initialEdges]);

  // Keep JsonDataContext in sync with *latest* diagram state (for context-aware chat).
  useEffect(() => {
    if (skipNextContextSyncRef.current) {
      skipNextContextSyncRef.current = false;
      return;
    }
    if (!nodes.length && !edges.length) return;
    setInitialNodes(nodes);
    setInitialEdges(edges);
  }, [nodes, edges, setInitialNodes, setInitialEdges]);

  useEffect(() => {
    setNodes((nds) => nds.map((n) => styledNode(n, nodeColor, textColor)));
  }, [nodeColor, textColor]);

  useEffect(() => {
    setEdges((eds) => eds.map((e) => styledEdge(e, edgeColor, animateEdges)));
  }, [edgeColor, animateEdges]);

  const onNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );

  const onEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  const onConnect = useCallback(
    (connection) => {
      setEdges((eds) =>
        addEdge(
          styledEdge(
            {
              ...connection,
              id: `e-${connection.source}-${connection.target}-${Date.now()}`,
            },
            edgeColor,
            animateEdges
          ),
          eds
        )
      );
    },
    [edgeColor, animateEdges]
  );

  const onLayout = useCallback(
    (direction) => {
      const { nodes: ln, edges: le } = getLayoutedElements(nodes, edges, direction);
      setNodes([...ln]);
      setEdges([...le]);
    },
    [nodes, edges]
  );

  const handleDownload = async () => {
    if (!flowWrapperRef.current) return;
    try {
      const dataUrl = await toPng(flowWrapperRef.current, {
        backgroundColor: "#020412",
        quality: 1,
        pixelRatio: 2,
      });
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = "flow-diagram.png";
      link.click();
    } catch (err) {
      console.error("Export error:", err);
    }
  };

  const onNodeDoubleClick = useCallback((_e, node) => {
    setEditingNode(node.id);
    setEditingText(node?.data?.label ?? "");
  }, []);

  const nextId = useCallback(() => {
    const id = `n${Date.now()}_${idCounterRef.current++}`;
    return id;
  }, []);

  const getCenterPosition = useCallback(() => {
    if (!flowWrapperRef.current || !reactFlowInstance) return { x: 0, y: 0 };
    const rect = flowWrapperRef.current.getBoundingClientRect();
    const center = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    return reactFlowInstance.screenToFlowPosition(center);
  }, [reactFlowInstance]);

  const addNodeAtPosition = useCallback(
    ({ type = "default", label = "New step", position }) => {
      const id = nextId();
      const newNode = styledNode(
        {
          id,
          type,
          position,
          data: { label },
        },
        nodeColor,
        textColor
      );

      setNodes((nds) => nds.concat(newNode));
      setEditingNode(id);
      setEditingText(label);
    },
    [nextId, nodeColor, textColor]
  );

  const handleAddProcess = useCallback(() => {
    addNodeAtPosition({ type: "default", label: "New step", position: getCenterPosition() });
  }, [addNodeAtPosition, getCenterPosition]);

  const handleAddDecision = useCallback(() => {
    addNodeAtPosition({ type: "decision", label: "Decision?", position: getCenterPosition() });
  }, [addNodeAtPosition, getCenterPosition]);

  const onPaneDoubleClick = useCallback(
    (event) => {
      if (!reactFlowInstance) return;
      const pos = reactFlowInstance.screenToFlowPosition({ x: event.clientX, y: event.clientY });
      addNodeAtPosition({ type: "default", label: "New step", position: pos });
    },
    [reactFlowInstance, addNodeAtPosition]
  );

  const deleteSelection = useCallback(() => {
    const selectedNodeIds = new Set((selection?.nodes || []).map((n) => n.id));
    const selectedEdgeIds = new Set((selection?.edges || []).map((e) => e.id));

    if (selectedNodeIds.size === 0 && selectedEdgeIds.size === 0) return;

    setNodes((nds) => nds.filter((n) => !selectedNodeIds.has(n.id)));
    setEdges((eds) =>
      eds.filter((e) => {
        if (selectedEdgeIds.has(e.id)) return false;
        if (selectedNodeIds.has(e.source) || selectedNodeIds.has(e.target)) return false;
        return true;
      })
    );

    setSelection({ nodes: [], edges: [] });
  }, [selection]);

  const onCanvasKeyDown = useCallback(
    (e) => {
      if (editingNode) return;
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        deleteSelection();
      }
    },
    [deleteSelection, editingNode]
  );

  const saveNodeText = useCallback(() => {
    if (!editingNode) return;
    setNodes((nds) =>
      nds.map((n) =>
        n.id === editingNode ? { ...n, data: { ...n.data, label: editingText } } : n
      )
    );
    setEditingNode(null);
    setEditingText("");
  }, [editingNode, editingText]);

  const nodesWithEditableText = nodes.map((node) => {
    if (node.id !== editingNode) return node;
    return {
      ...node,
      data: {
        ...node.data,
        label: (
          <input
            autoFocus
            value={editingText}
            onChange={(e) => setEditingText(e.target.value)}
            onBlur={saveNodeText}
            onKeyDown={(e) => {
              if (e.key === "Enter") saveNodeText();
              if (e.key === "Escape") { setEditingNode(null); setEditingText(""); }
            }}
            style={{
              background: "transparent",
              border: "none",
              outline: "none",
              color: textColor,
              width: "100%",
              textAlign: "center",
              fontSize: "inherit",
              fontWeight: "inherit",
            }}
          />
        ),
      },
    };
  });

  const colorPickers = [
    { label: "Node", color: nodeColor, type: "node", setter: setNodeColor },
    { label: "Text", color: textColor, type: "text", setter: setTextColor },
    { label: "Edge", color: edgeColor, type: "edge", setter: setEdgeColor },
  ];

  return (
    <div className="w-full h-full flex flex-col" onClick={() => setActiveModal(null)}>

      {/* TOOLBAR */}
      <div
        className="w-full border-b border-white/5 bg-[#020412]/90 backdrop-blur-md px-4 py-2.5 flex gap-3 items-center z-[100]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Layout */}
        <div className="flex p-0.5 rounded-lg border border-white/10 bg-white/5">
          <button
            className="p-2 hover:bg-white/10 rounded-md text-gray-400 hover:text-white transition-all cursor-pointer"
            title="Vertical layout"
            onClick={() => onLayout("TB")}
          >
            <FaArrowsUpDown size={13} />
          </button>
          <button
            className="p-2 hover:bg-white/10 rounded-md text-gray-400 hover:text-white transition-all cursor-pointer"
            title="Horizontal layout"
            onClick={() => onLayout("LR")}
          >
            <FaArrowsLeftRight size={13} />
          </button>
        </div>

        <div className="w-px h-5 bg-white/10" />

        {/* Color pickers */}
        <div className="flex gap-3 items-center">
          {colorPickers.map((item) => (
            <div key={item.type} className="relative">
              <button
                onClick={() => setActiveModal(activeModal === item.type ? null : item.type)}
                className="flex items-center gap-2 text-xs text-gray-400 hover:text-white transition-colors cursor-pointer py-1"
              >
                {item.label}
                <div
                  className="w-4 h-4 rounded-full border border-white/20"
                  style={{ backgroundColor: item.color }}
                />
              </button>
              {activeModal === item.type && (
                <div className="absolute top-9 left-0 z-[110] shadow-2xl rounded-xl overflow-hidden border border-white/10">
                  <ColorPicker color={item.color} onChange={(c) => item.setter(c.hex)} />
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="w-px h-5 bg-white/10" />

        {/* Quick add */}
        <div className="flex gap-2">
          <ToggleButton active={false} onClick={handleAddProcess} icon={FaPlus}>
            Add node
          </ToggleButton>
          <ToggleButton active={false} onClick={handleAddDecision} icon={FaDiamond}>
            Add decision
          </ToggleButton>
        </div>

        <div className="w-px h-5 bg-white/10" />

        {/* Toggles */}
        <div className="flex gap-2">
          <ToggleButton active={showMiniMap} onClick={() => setShowMiniMap((v) => !v)} icon={FaMap}>
            MiniMap
          </ToggleButton>
          <ToggleButton active={animateEdges} onClick={() => setAnimateEdges((v) => !v)} icon={FaPlay}>
            Animate
          </ToggleButton>
        </div>

        <button
          onClick={handleDownload}
          className="ml-auto flex items-center gap-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 px-4 py-2 rounded-lg transition-all border border-blue-500/25 hover:border-blue-400/40 active:scale-95 text-sm font-semibold"
        >
          Export PNG <FaDownload size={13} />
        </button>
      </div>

      {/* CANVAS */}
      <div
        className="flex-1 relative outline-none"
        ref={flowWrapperRef}
        tabIndex={0}
        onKeyDown={onCanvasKeyDown}
      >
        <ReactFlow
          style={{ backgroundColor: "#020412" }}
          nodes={nodesWithEditableText}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeDoubleClick={onNodeDoubleClick}
          onPaneDoubleClick={onPaneDoubleClick}
          onInit={setReactFlowInstance}
          onSelectionChange={setSelection}
          fitView
          fitViewOptions={{ padding: 0.25 }}
          snapToGrid
          snapGrid={[10, 10]}
          minZoom={0.2}
          maxZoom={2}
          defaultEdgeOptions={{ type: "smoothstep", style: { strokeWidth: 2 } }}
          proOptions={{ hideAttribution: true }}
        >
          <Background variant="dots" gap={24} size={1} color="rgba(255,255,255,0.07)" />
          <Controls
            style={{
              background: "#0f172a",
              borderRadius: "12px",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          />
          {showMiniMap && (
            <MiniMap
              style={{
                backgroundColor: "#0a0f1e",
                borderRadius: "10px",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
              maskColor="rgba(0,0,0,0.5)"
              nodeColor={(n) => (n.type === "decision" ? "#3b82f6" : nodeColor)}
            />
          )}
        </ReactFlow>

        {nodes.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none gap-3">
            <div className="text-6xl opacity-10">◈</div>
            <p className="text-gray-600 text-sm tracking-wide">
              Describe a process in the chat to generate a diagram
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FlowDiagram;
