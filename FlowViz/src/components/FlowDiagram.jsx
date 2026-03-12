import { useState, useCallback, useEffect, useRef } from "react";
import { getLayoutedElements } from "../utils/layout";
import {
  ReactFlow,
  Background,
  Controls,
  applyNodeChanges,
  MiniMap,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import ColorPicker from "react-pick-color";
import {
  FaDownload,
  FaMap,
  FaPlay,
  FaArrowsLeftRight,
  FaArrowsUpDown,
} from "react-icons/fa6";
import { toPng } from "html-to-image";
import DecisionNode from "./DecisionNode";

const nodeTypes = {
  decision: DecisionNode,
};

const FlowDiagram = ({ initialNodes = [], initialEdges = [] }) => {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);

  const [nodeColor, setNodeColor] = useState("#0a0a0a");
  const [textColor, setTextColor] = useState("#ffffff");
  const [edgeColor, setEdgeColor] = useState("#3b82f6");

  const [animateEdges, setAnimateEdges] = useState(false);
  const [activeModal, setActiveModal] = useState(null);
  const [showMiniMap, setShowMiniMap] = useState(false);

  /* ---------- Inline Editing ---------- */

  const [editingNode, setEditingNode] = useState(null);
  const [editingText, setEditingText] = useState("");

  const flowWrapperRef = useRef(null);

  /* ---------- Layout Initial Diagram ---------- */

  useEffect(() => {
    if (!initialNodes.length) return;

    const layouted = getLayoutedElements(initialNodes, initialEdges, "TB");

    setNodes(
      layouted.nodes.map((node) => {
        if (node.type === "decision") return node;
        return {
          ...node,
          style: {
            ...node.style,
            backgroundColor: nodeColor,
            color: textColor,
            borderRadius: "8px",
            border: "1px solid #444",
            padding: "6px",
          },
        };
      })
    );
    
    setEdges(
      layouted.edges.map((edge) => ({
        ...edge,
        animated: animateEdges,
        style: { stroke: edgeColor, strokeWidth: 2 },
      }))
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialNodes, initialEdges]);

  /* ---------- Node Styling ---------- */

  useEffect(() => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.type === "decision") return node;

        return {
          ...node,
          style: {
            ...node.style,
            backgroundColor: nodeColor,
            color: textColor,
            borderRadius: "8px",
            border: "1px solid #444",
            padding: "6px",
          },
        };
      })
    );
  }, [nodeColor, textColor]);

  /* ---------- Edge Styling ---------- */

  useEffect(() => {
    setEdges((eds) =>
      eds.map((edge) => ({
        ...edge,
        animated: animateEdges,
        style: { stroke: edgeColor, strokeWidth: 2 },
      }))
    );
  }, [edgeColor, animateEdges]);

  /* ---------- Node Change ---------- */

  const onNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );

  /* ---------- Layout Switch ---------- */

  const onLayout = (direction) => {
    const layouted = getLayoutedElements(nodes, edges, direction);
    setNodes([...layouted.nodes]);
    setEdges([...layouted.edges]);
  };

  /* ---------- Export PNG ---------- */

  const handleDownload = async () => {
    if (!flowWrapperRef.current) return;

    try {
      const dataUrl = await toPng(flowWrapperRef.current, {
        backgroundColor: "#121212",
        quality: 1,
      });

      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = "flow-diagram.png";
      link.click();
    } catch (error) {
      console.error("Export error:", error);
    }
  };

  /* ---------- Toolbar Button ---------- */

  const ToggleButton = ({ active, onClick, children, icon: Icon }) => (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all cursor-pointer ${
        active
          ? "bg-gradient-to-bl from-blue-500/50 to-transparent text-white"
          : "bg-gray-800 text-gray-300 hover:bg-gray-700"
      }`}
    >
      {Icon && <Icon size={14} />}
      {children}
    </button>
  );

  /* ---------- Double Click → Start Editing ---------- */

  const onNodeDoubleClick = (event, node) => {
    setEditingNode(node.id);
    setEditingText(node.data.label);
  };

  /* ---------- Save Edited Text ---------- */

  const saveNodeText = () => {
    if (!editingNode) return;

    setNodes((nds) =>
      nds.map((n) =>
        n.id === editingNode
          ? { ...n, data: { ...n.data, label: editingText } }
          : n
      )
    );

    setEditingNode(null);
  };

  /* ---------- Render Nodes With Editing ---------- */

  const nodesWithEditableText = nodes.map((node) => ({
    ...node,
    data: {
      ...node.data,
      label:
        editingNode === node.id ? (
          <input
            autoFocus
            value={editingText}
            onChange={(e) => setEditingText(e.target.value)}
            onBlur={saveNodeText}
            onKeyDown={(e) => {
              if (e.key === "Enter") saveNodeText();
            }}
            style={{
              background: "transparent",
              border: "none",
              outline: "none",
              color: textColor,
              width: "100%",
              textAlign: "center",
            }}
          />
        ) : (
          node.data.label
        ),
    },
  }));

  return (
    <div
      className="w-full h-full flex flex-col font-sans"
      onClick={() => setActiveModal(null)}
    >
      {/* ---------- TOP TOOLBAR ---------- */}

      <div
        className="w-full border-b border-gray-800 backdrop-blur-md p-3 flex gap-4 items-center z-[100]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Layout */}

        <div className="flex p-1 rounded-lg border border-gray-800 mr-2">
          <button
            className="p-2 hover:bg-gray-800 rounded text-white cursor-pointer"
            title="Vertical Layout"
            onClick={() => onLayout("TB")}
          >
            <FaArrowsUpDown />
          </button>

          <button
            className="p-2 hover:bg-gray-800 rounded text-white cursor-pointer"
            title="Horizontal Layout"
            onClick={() => onLayout("LR")}
          >
            <FaArrowsLeftRight />
          </button>
        </div>

        {/* Color Pickers */}

        <div className="flex gap-4 items-center border-l border-gray-700 pl-4">
          {[
            { label: "Node", color: nodeColor, type: "node" },
            { label: "Text", color: textColor, type: "text" },
            { label: "Edge", color: edgeColor, type: "edge" },
          ].map((item) => (
            <div key={item.type} className="relative">
              <button
                onClick={() =>
                  setActiveModal(
                    activeModal === item.type ? null : item.type
                  )
                }
                className="flex items-center gap-2 text-xs text-gray-400 hover:text-white transition-colors cursor-pointer"
              >
                {item.label}

                <div
                  className="w-4 h-4 rounded-full border border-gray-600"
                  style={{ backgroundColor: item.color }}
                />
              </button>

              {activeModal === item.type && (
                <div className="absolute top-10 left-0 z-[110] shadow-2xl">
                  <ColorPicker
                    color={item.color}
                    onChange={(c) => {
                      if (item.type === "node") setNodeColor(c.hex);
                      if (item.type === "text") setTextColor(c.hex);
                      if (item.type === "edge") setEdgeColor(c.hex);
                    }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Toggles */}

        <div className="flex gap-2 ml-4 border-l border-gray-700 pl-4">
          <ToggleButton
            active={showMiniMap}
            onClick={() => setShowMiniMap(!showMiniMap)}
            icon={FaMap}
          >
            MiniMap
          </ToggleButton>

          <ToggleButton
            active={animateEdges}
            onClick={() => setAnimateEdges(!animateEdges)}
            icon={FaPlay}
          >
            Animate
          </ToggleButton>
        </div>

        {/* Export */}

        <button
          onClick={handleDownload}
          className="ml-auto flex items-center gap-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 px-4 py-2 rounded-lg transition-all border border-blue-500/20 active:scale-95"
        >
          <span className="text-sm font-semibold">Export PNG</span>
          <FaDownload size={14} />
        </button>
      </div>

      {/* ---------- FLOW CANVAS ---------- */}

      <div className="flex-1 relative" ref={flowWrapperRef}>
        <ReactFlow
          style={{ backgroundColor: "#010107" }}
          nodes={nodesWithEditableText}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onNodeDoubleClick={onNodeDoubleClick}
          fitView
          snapToGrid
          snapGrid={[15, 15]}
          defaultEdgeOptions={{
            style: { strokeWidth: 2 },
            labelStyle: { fill: "#000000", fontSize: 12 },
          }}
        >
          <Background variant="dots" gap={20} size={1} color="#333" />

          <Controls
            style={{
              background: "#1e293b",
              borderRadius: "10px",
              border: "1px solid #334155",
            }}
          />

          {showMiniMap && (
            <MiniMap
              style={{
                backgroundColor: "#1a1a1a",
                borderRadius: "8px",
                border: "1px solid #333",
              }}
              maskColor="rgba(0,0,0,0.4)"
              nodeColor={() => nodeColor}
            />
          )}
        </ReactFlow>
      </div>
    </div>
  );
};

export default FlowDiagram;