import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import { IoMdSend } from "react-icons/io";
import {
  TbLayoutSidebarLeftExpand,
  TbLayoutSidebarLeftCollapse,
} from "react-icons/tb";
import { useState, useContext, useEffect, useRef, useCallback } from "react";
import { MessageContext } from "../context/messageContext";
import { JsonDataContext } from "../context/flowJsonContext";
import axios from "axios";
import FlowVizLogo from "../assets/FlowVizLogo.png";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

// ---------------------------------------------------------------------------
// Loading indicator: animated dots
// ---------------------------------------------------------------------------

const LoadingDots = () => (
  <span className="inline-flex gap-1 items-center">
    {[0, 150, 300].map((delay) => (
      <span
        key={delay}
        className="w-1.5 h-1.5 rounded-full bg-[#1891be] animate-bounce"
        style={{ animationDelay: `${delay}ms` }}
      />
    ))}
  </span>
);

// ---------------------------------------------------------------------------
// Single chat bubble
// ---------------------------------------------------------------------------

const ChatBubble = ({ msg }) => (
  <div className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
    <div
      className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm shadow-sm
        ${
          msg.sender === "user"
            ? "bg-gradient-to-bl from-blue-500/50 to-transparent text-white rounded-tr-none"
            : "bg-slate-800 text-slate-200 border border-white/5 rounded-tl-none"
        }`}
    >
      {msg.isLoading ? <LoadingDots /> : msg.text}
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const Sidebar = () => {
  const { message, setMessage } = useContext(MessageContext);
  const { initialNodes, setInitialNodes, initialEdges, setInitialEdges } =
    useContext(JsonDataContext);

  const [isOpen, setIsOpen] = useState(true);
  const [newMessage, setNewMessage] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to latest message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [message]);

  // Re-focus input after response arrives
  useEffect(() => {
    if (!isGenerating && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isGenerating]);

  // -------------------------------------------------------------------------
  // Send message
  // -------------------------------------------------------------------------

  const handleMessageSend = useCallback(async () => {
    const text = newMessage.trim();
    if (!text || isGenerating) return;

    setNewMessage("");
    setIsGenerating(true);

    // Optimistically add user message + loading placeholder
    const userMsg = { sender: "user", text };
    const loadingMsg = {
      sender: "server",
      text: "",
      isLoading: true,
      id: "__loading__",
    };

    // We need the history BEFORE adding the loading message
    const historySnapshot = [...message, userMsg];

    setMessage((prev) => [...prev, userMsg, loadingMsg]);

    try {
      const response = await axios.post(`${API_URL}/api/generate-flow`, {
        text,
        history: historySnapshot,
        currentDiagram: {
          nodes: initialNodes,
          edges: initialEdges,
        },
      });

      const flowData = response?.data?.flow;

      if (!flowData?.nodes || !flowData?.edges) {
        throw new Error("Invalid diagram structure returned from server.");
      }

      const addedNodes = flowData.nodes.length - initialNodes.length;
      const summaryText =
        addedNodes > 0
          ? `✅ Diagram updated — ${addedNodes} new step${addedNodes > 1 ? "s" : ""} added.`
          : "✅ Diagram structure updated.";

      setInitialNodes(flowData.nodes);
      setInitialEdges(flowData.edges);

      setMessage((prev) =>
        prev
          .filter((m) => !m.isLoading)
          .concat([{ sender: "server", text: summaryText }])
      );
    } catch (error) {
      const serverMsg =
        error?.response?.data?.error ||
        error?.message ||
        "Unknown error occurred.";

      console.error("❌ Flow generation error:", serverMsg);

      setMessage((prev) =>
        prev
          .filter((m) => !m.isLoading)
          .concat([
            {
              sender: "server",
              text: `❌ Error: ${serverMsg}`,
            },
          ])
      );
    } finally {
      setIsGenerating(false);
    }
  }, [
    newMessage,
    isGenerating,
    message,
    initialNodes,
    initialEdges,
    setMessage,
    setInitialNodes,
    setInitialEdges,
  ]);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleMessageSend();
      }
    },
    [handleMessageSend]
  );

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <aside
      className={`transition-all duration-300 ease-in-out border-r border-white/10 ${
        isOpen ? "w-full md:w-[350px] lg:w-[400px]" : "w-[60px]"
      } flex flex-col h-screen shrink-0`}
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div
        className={`p-4 flex items-center justify-between border-b border-white/5 ${
          !isOpen && "flex-col gap-4"
        }`}
      >
        {isOpen && (
          <div className="flex items-center gap-3">
            <img
              className="w-8 h-8 drop-shadow-[0_0_8px_rgba(24,145,190,0.5)]"
              src={FlowVizLogo}
              alt="FlowViz Logo"
            />
            <span className="text-xl font-bold tracking-tight text-white">
              Flow<span className="text-[#1891be]">Viz</span>
            </span>
          </div>
        )}

        <button
          onClick={() => setIsOpen((v) => !v)}
          className="p-1.5 rounded-lg hover:bg-white/5 transition-colors text-[#1891be]"
          title={isOpen ? "Collapse sidebar" : "Expand sidebar"}
        >
          {isOpen ? (
            <TbLayoutSidebarLeftCollapse size={26} />
          ) : (
            <TbLayoutSidebarLeftExpand size={26} />
          )}
        </button>
      </div>

      {/* ── Chat panel (hidden when collapsed) ─────────────────────────────── */}
      {isOpen && (
        <>
          {/* Messages */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar"
          >
            {message.length === 0 && (
              <p className="text-center text-slate-500 text-sm mt-8 select-none">
                Describe a process to generate your first flow diagram.
              </p>
            )}

            {message.map((msg, index) => (
              <ChatBubble key={msg.id ?? index} msg={msg} />
            ))}
          </div>

          {/* Input bar */}
          <div className="p-2 border-t border-white/5">
            <div className="flex items-end gap-2 bg-[#010107] rounded-xl p-1.5 border border-slate-700/50 focus-within:border-[#1891be]/50 transition-colors">
              <TextField
                inputRef={inputRef}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Describe your process…"
                multiline
                maxRows={4}
                variant="standard"
                fullWidth
                disabled={isGenerating}
                InputProps={{
                  disableUnderline: true,
                  sx: {
                    color: "white",
                    fontSize: "0.9rem",
                    px: 1,
                    py: 1,
                  },
                }}
              />

              <button
                onClick={handleMessageSend}
                disabled={!newMessage.trim() || isGenerating}
                className="mb-1 p-2 bg-[#1891be] hover:bg-[#157da5] text-white rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
                title="Send"
              >
                <IoMdSend size={20} />
              </button>
            </div>

            {isGenerating && (
              <p className="text-xs text-slate-500 text-center mt-1.5 animate-pulse">
                Generating diagram…
              </p>
            )}
          </div>
        </>
      )}
    </aside>
  );
};

export default Sidebar;
