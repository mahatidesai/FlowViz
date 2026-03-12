import { Handle, Position } from "@xyflow/react";

const EditableNode = ({ id, data, selected }) => {
  const { label, editingNode, editingText, setEditingText, saveNodeText } = data;

  const isEditing = editingNode === id;

  return (
    <div
      style={{
        background: "#0a0a0a",
        border: "1px solid #444",
        padding: "8px",
        borderRadius: "8px",
        minWidth: 120,
        textAlign: "center",
        color: "white"
      }}
    >
      {isEditing ? (
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
            color: "white",
            width: "100%",
            textAlign: "center"
          }}
        />
      ) : (
        <span>{label}</span>
      )}

      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
};

export default EditableNode;