import { Handle, Position } from "@xyflow/react";

const DecisionNode = ({ data }) => {
  return (
    <div
      style={{
        width: 160,
        height: 160,
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Diamond Shape */}
      <div
        style={{
          width: 110,
          height: 110,
          background: "#1e293b",
          border: "2px solid #3b82f6",
          transform: "rotate(45deg)",
          borderRadius: "6px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 6px 18px rgba(0,0,0,0.4)"
        }}
      >
        {/* Text */}
        <div
          style={{
            transform: "rotate(-45deg)",
            color: "white",
            fontSize: "12px",
            textAlign: "center",
            width: "85px",
            lineHeight: "1.2",
            fontWeight: 500,
            pointerEvents: "none"
          }}
        >
          {data.label}
        </div>
      </div>

      {/* Handles */}
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: "#3b82f6" }}
      />

      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: "#3b82f6" }}
      />

      <Handle
        type="source"
        position={Position.Left}
        style={{ background: "#3b82f6" }}
      />

      <Handle
        type="source"
        position={Position.Right}
        style={{ background: "#3b82f6" }}
      />
    </div>
  );
};

export default DecisionNode;