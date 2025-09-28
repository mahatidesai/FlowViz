import { useState, useCallback, useEffect, useRef } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  applyEdgeChanges,
  applyNodeChanges,
  addEdge,
  MiniMap,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import ColorPicker from "react-pick-color";
import { FaDownload } from "react-icons/fa6";

import { toPng } from "html-to-image"; // for download

const nodeWidth = 150;
const nodeHeight = 60;
const spacing = 80;

const FlowDiagram = ({initialNodes, initialEdges}) => {
  const [nodeColor, setNodeColor] = useState("#fff");
  const [textColor, setTextColor] = useState("#000");
  const [edgeColor, setEdgeColor] = useState('#fff');
  const [animateEdges, setAnimateEdges] = useState(false);
  const [nodeColorModal, setNodeColorModal] = useState(false);
  const [textColorModal, setTextColorModal] = useState(false);
  const [edgeColorModal, setEdgeColorModal] = useState(false);
  const [showMiniMap, setShowMiniMap] = useState(false);

  // Ref for download
  const flowWrapperRef = useRef(null);

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
      console.error("Error exporting diagram:", error);
    }
  };

  // const initialNodes = [
  //   { id: "n1", position: { x: 0, y: 0 }, data: { label: "Start" }, type: "input" },
  //   { id: "n2", position: { x: 200, y: 0 }, data: { label: "Choose Option: Login or Signin" }, type: "default" },
  //   { id: "n3", position: { x: 400, y: -100 }, data: { label: "Signin Page" }, type: "default" },
  //   { id: "n4", position: { x: 600, y: -100 }, data: { label: "Registration Page" }, type: "default" },
  //   { id: "n5", position: { x: 800, y: -100 }, data: { label: "Enter Email & Password (Signin)" }, type: "default" },
  //   { id: "n6", position: { x: 1000, y: -100 }, data: { label: "Store Credentials in Backend" }, type: "default" },
  //   { id: "n7", position: { x: 400, y: 100 }, data: { label: "Login Page" }, type: "default" },
  //   { id: "n8", position: { x: 600, y: 100 }, data: { label: "Enter Email & Password (Login)" }, type: "default" },
  //   { id: "n9", position: { x: 800, y: 100 }, data: { label: "Validate Credentials" }, type: "default" },
  //   { id: "n10", position: { x: 1000, y: 0 }, data: { label: "Homepage" }, type: "output" },
  //   { id: "n11", position: { x: 800, y: 250 }, data: { label: "Stay on Login Page" }, type: "default" },
  //   { id: "n12", position: { x: 1200, y: 0 }, data: { label: "End" }, type: "output" }
  // ];
  
  // const initialEdges = [
  //   { id: "e1-2", source: "n1", target: "n2" },
  //   { id: "e2-3", source: "n2", target: "n3", label: "Signin" },
  //   { id: "e2-7", source: "n2", target: "n7", label: "Login" },
  //   { id: "e3-4", source: "n3", target: "n4" },
  //   { id: "e4-5", source: "n4", target: "n5" },
  //   { id: "e5-6", source: "n5", target: "n6" },
  //   { id: "e6-10", source: "n6", target: "n10" },
  //   { id: "e7-8", source: "n7", target: "n8" },
  //   { id: "e8-9", source: "n8", target: "n9" },
  //   { id: "e9-10", source: "n9", target: "n10", label: "Valid" },
  //   { id: "e9-11", source: "n9", target: "n11", label: "Invalid" },
  //   { id: "e10-12", source: "n10", target: "n12" },
  //   { id: "e11-7", source: "n11", target: "n7" }
  // ];

  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);

  useEffect(()=> {
    setNodes(initialNodes)
    setEdges(initialEdges)
  },[initialNodes, initialEdges])

  //Setting the text and the node color change
  useEffect(() => {
    setNodes((nds) =>
      nds.map((node) => ({
        ...node,
        style: { ...node.style, backgroundColor: nodeColor, color: textColor },
      }))
    );
  }, [nodeColor, textColor]);

  // Animation addition in the edges
  useEffect(() => {
    setEdges((edg) =>
      edg.map((edge) => ({
        ...edge,
        animated: animateEdges,
        style: {stroke: edgeColor},
      }))
    );
  }, [animateEdges, edgeColor]);

  
  const onNodesChange = useCallback((changes) => setNodes((nds) => applyNodeChanges(changes, nds)), []);
  // const onEdgesChange = useCallback((changes) => setEdges((eds) => applyEdgeChanges(changes, eds)), []);
  // const onConnect = useCallback((params) => setEdges((eds) => addEdge(params, eds)), []);

  
  // Layout
  const onLayout = (direction) => {
    const updated = nodes.map((node, i) => {
      if (direction === "TB") return { ...node, position: { x: 0, y: i * (nodeHeight + spacing) } };
      if (direction === "LR") return { ...node, position: { x: i * (nodeWidth + spacing), y: 0 } };
      return node;
    });
    setNodes(updated);
  };



  return (
    <div className="w-full h-full flex flex-col text-black" tabIndex={0}>
      {/* Top bar */}
      <div className="w-full text-white p-3 flex gap-6 items-center">
        <button className="p-1 bg-gray-500 rounded text-sm cursor-pointer" onClick={() => onLayout("TB")}>
          Vertical Layout
        </button>
        <button className="p-1 bg-gray-500 rounded text-sm cursor-pointer" onClick={() => onLayout("LR")}>
          Horizontal Layout
        </button>

        {/* Node Color Picker */}
        <div onClick={() => setNodeColorModal(!nodeColorModal)} className="flex flex-row items-center cursor-pointer gap-2">
          Node color
          <div className="w-6 h-6 rounded-xl cursor-pointer" style={{ backgroundColor: nodeColor }}></div>
        </div>
        {nodeColorModal && (
          <ColorPicker
            color={nodeColor}
            onChange={(c) => setNodeColor(c.hex)}
            className="absolute left-[35%] top-[6%] z-[100]"
          />
        )}

        {/* Text Color Picker */}
        <div onClick={() => setTextColorModal(!textColorModal)} className="flex flex-row items-center cursor-pointer gap-2">
          Text color
          <div className="w-6 h-6 rounded-xl cursor-pointer" style={{ backgroundColor: textColor }}></div>
        </div>
        {textColorModal && (
          <ColorPicker
            color={textColor}
            onChange={(c) => setTextColor(c.hex)}
            className="absolute left-[45%] top-[6%] z-[100]"
          />
        )}

        {/* Edge Color Picker */}
        <div onClick={() => setEdgeColorModal(!edgeColorModal)} className="flex flex-row items-center cursor-pointer gap-2">
          Edge color
          <div className="w-6 h-6 rounded-xl cursor-pointer" style={{ backgroundColor: edgeColor }}></div>
        </div>
        {edgeColorModal && (
          <ColorPicker
            color={edgeColor}
            onChange={(c) => setEdgeColor(c.hex)}
            className="absolute left-[45%] top-[6%] z-[100]"
          />
        )}

        {/* MiniMap */}
        <div onClick={()=> {setShowMiniMap(!showMiniMap)}} className="cursor-pointer">
            MiniMap
        </div>

        {/* Edge animation */}
        <div className="cursor-pointer" onClick={()=> {setAnimateEdges(!animateEdges)}}>
          Animate Edge
        </div>

        {/* Download */}
        <div onClick={handleDownload} className="flex flex-row gap-2 items-center ml-auto cursor-pointer text-[#1891be]">
          Download
          <FaDownload size={18} color={"#1891be"} />
        </div>
      </div>

      {/* Flow area */}
      <div className="flex-1" ref={flowWrapperRef}>
        <ReactFlow
          colorMode="dark"
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          // onEdgesChange={onEdgesChange}
          // onConnect={onConnect}
          fitView
        >
          <Background />
          <Controls className="!text-black" />
          {showMiniMap && <MiniMap />}
        </ReactFlow>
      </div>
    </div>
  );
};

export default FlowDiagram;
