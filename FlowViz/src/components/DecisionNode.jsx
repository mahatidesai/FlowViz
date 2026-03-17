import { Handle, Position } from "@xyflow/react";

/**
 * Diamond-shaped decision node for Yes/No branches.
 * Renders as a rotated square with handles on all four sides.
 */
const DecisionNode = ({ data }) => {
  const label = data?.label ?? "Decision";

  return (
    <div
      style={{
        width: 130,
        height: 130,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
      }}
    >
      {/* Diamond shape */}
      <div
        style={{
          width: 110,
          height: 110,
          background: "linear-gradient(135deg, #1e3a5f 0%, #0f2040 100%)",
          border: "2px solid #3b82f6",
          borderRadius: "6px",
          transform: "rotate(45deg)",
          position: "absolute",
          boxShadow: "0 0 16px rgba(59,130,246,0.3)",
        }}
      />

      {/* Label (counter-rotated so text stays upright) */}
      <span
        style={{
          position: "relative",
          zIndex: 1,
          color: "#e2e8f0",
          fontSize: "11px",
          fontWeight: 600,
          textAlign: "center",
          maxWidth: "80px",
          lineHeight: 1.3,
          letterSpacing: "0.01em",
          pointerEvents: "none",
          userSelect: "none",
        }}
      >
        {label}
      </span>

      {/* Handles — top (in), left (No), right (Yes), bottom (pass-through) */}
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: "#3b82f6", width: 8, height: 8, top: -4 }}
      />
      <Handle
        id="yes"
        type="source"
        position={Position.Right}
        style={{ background: "#22c55e", width: 8, height: 8, right: -4 }}
      />
      <Handle
        id="no"
        type="source"
        position={Position.Left}
        style={{ background: "#ef4444", width: 8, height: 8, left: -4 }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: "#3b82f6", width: 8, height: 8, bottom: -4 }}
      />
    </div>
  );
};

export default DecisionNode;
