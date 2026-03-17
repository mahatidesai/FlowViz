import express from "express";
import axios from "axios";
import dotenv from "dotenv";
import cors from "cors";
import { jsonrepair } from "jsonrepair";

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors({ origin: process.env.CLIENT_ORIGIN || "http://localhost:5173" }));

const PORT = process.env.PORT || 3000;

const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3:8b";
const OLLAMA_URL =
  process.env.OLLAMA_URL || "http://localhost:11434/api/generate";

// ---------------------------------------------------------------------------
// JSON CLEANING
// ---------------------------------------------------------------------------
function cleanJSON(raw) {
  if (!raw) return "";
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");

  if (start !== -1 && end !== -1) {
    raw = raw.slice(start, end + 1);
  }

  return raw
    .replace(/```json|```/g, "")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/,(\s*[\]}])/g, "$1");
}

function safeParse(text) {
  const cleaned = cleanJSON(text);
  try {
    return JSON.parse(cleaned);
  } catch {
    return JSON.parse(jsonrepair(cleaned));
  }
}

// ---------------------------------------------------------------------------
// CONTEXT HELPERS
// ---------------------------------------------------------------------------

function clampArray(arr, maxItems) {
  if (!Array.isArray(arr)) return [];
  if (!Number.isFinite(maxItems) || maxItems <= 0) return [];
  return arr.slice(-maxItems);
}

function summarizeDiagram(currentDiagram) {
  const nodes = Array.isArray(currentDiagram?.nodes) ? currentDiagram.nodes : [];
  const edges = Array.isArray(currentDiagram?.edges) ? currentDiagram.edges : [];

  const nodeSummary = nodes
    .map((n) => ({
      id: n?.id,
      type: n?.type || "default",
      label:
        typeof n?.data?.label === "string"
          ? n.data.label
          : typeof n?.label === "string"
            ? n.label
            : "",
    }))
    .filter((n) => n.id && n.label)
    .slice(0, 60);

  const edgeSummary = edges
    .map((e) => ({
      source: e?.source,
      target: e?.target,
      label: typeof e?.label === "string" ? e.label : "",
    }))
    .filter((e) => e.source && e.target)
    .slice(0, 120);

  return { nodes: nodeSummary, edges: edgeSummary };
}

function formatHistory(history) {
  const turns = clampArray(history, 12);
  return turns
    .map((m) => {
      const role =
        m?.sender === "user" ? "User" : m?.sender === "server" ? "Assistant" : "Other";
      const content = typeof m?.text === "string" ? m.text.trim() : "";
      if (!content) return null;
      return `${role}: ${content}`;
    })
    .filter(Boolean)
    .join("\n");
}

// ---------------------------------------------------------------------------
// FLOW BUILDER
// ---------------------------------------------------------------------------

function buildFlowFromSteps(steps) {

  const nodes = []
  const edges = []

  const labelMap = new Map()

  let nodeIndex = 1
  let y = 0

  function newId() {
    return `n${nodeIndex++}`
  }

  function normalize(label){
    return label.toLowerCase().replace(/\s+/g,'')
  }

  function createNode(label,type="default",x=0,yPos=0){
    const key = normalize(label)
    if(labelMap.has(key)){
      return labelMap.get(key)
    }
    const id = newId()
    nodes.push({
      id,
      type,
      position:{x,y:yPos},
      data:{label}
    })
    labelMap.set(key,id)
    return id
  }

  // START
  const startId = createNode("Start","input",0,y)
  let prevNode = startId

  y += 180

  for(const step of steps){

    if (step.type === "decision") {
      const decisionId = createNode(step.label, "decision", 0, y);
    
      edges.push({
        id: `e-${prevNode}-${decisionId}`,
        source: prevNode,
        target: decisionId,
      });
    
      // YES path (right side)
      const yesId = createNode(step.yes, "default", 250, y + 150);
    
      // NO path (left side)
      const noId = createNode(step.no, "default", -250, y + 150);
    
      edges.push({
        id: `e-${decisionId}-${yesId}`,
        source: decisionId,
        sourceHandle: "yes",
        target: yesId,
        label: "Yes",
      });
    
      edges.push({
        id: `e-${decisionId}-${noId}`,
        source: decisionId,
        sourceHandle: "no",
        target: noId,
        label: "No",
      });
    
      // 🔁 RETRY LOOP FIX
      if (normalize(step.no).includes("retry")) {
        const paymentNode = nodes.find(n =>
          normalize(n.data.label).includes("payment")
        );
    
        if (paymentNode) {
          edges.push({
            id: `e-${noId}-${paymentNode.id}`,
            source: noId,
            target: paymentNode.id,
            label: "Retry",
          });
        }
      }
    
      // ✅ MERGE NODE (VERY IMPORTANT)
      const mergeId = createNode("Continue", "default", 0, y + 300);
    
      edges.push({
        id: `e-${yesId}-${mergeId}`,
        source: yesId,
        target: mergeId,
      });
    
      prevNode = mergeId;
      y += 300;
      continue;
    }

    const nodeId = createNode(step.label,"default",0,y)

    edges.push({
      id:`e-${prevNode}-${nodeId}`,
      source:prevNode,
      target:nodeId,
      label:""
    })

    prevNode = nodeId
    y += 180
  }

  if(!nodes.some(n=>normalize(n.data.label)==="end")){

    const endId = createNode("End","default",0,y)

    edges.push({
      id:`e-${prevNode}-${endId}`,
      source:prevNode,
      target:endId,
      label:""
    })

  }

  return {nodes,edges}
}

// ---------------------------------------------------------------------------
// PROMPT
// ---------------------------------------------------------------------------

function buildPrompt({ text, history, currentDiagram }) {
  const diagram = summarizeDiagram(currentDiagram);
  const historyText = formatHistory(history);

  return `
    You are a system that updates a flowchart from natural language instructions.

    Return ONLY valid JSON. No explanation.

    You will be given:
    - The user's new instruction
    - Optional conversation history
    - Optional current diagram (nodes + edges)

    Your job: produce the UPDATED full "steps" list for the diagram.
    If there is an existing diagram, keep it the same unless the user asks to change it.
    Use conversation history + diagram context to resolve pronouns like "that step" or "the last node".

    Rules:

    1. Steps must be in correct logical order.
    2. If there is a decision, its yes/no branches must be logical and MUST re-join via a merge step.
    3. Payment flow must ALWAYS follow:
      - Enter Payment Details
      - Validate Payment
      - Decision: Payment Successful?
    4. Retry loops MUST go back to the correct step (not random nodes).
    5. Avoid vague labels like "Process" or "Step".
    6. Keep labels short (max 5 words).
    7. Ensure proper flow: Start → Steps → Decision → Branches → Merge → End
    8. Output MUST match this schema exactly:
       {"steps":[{"type":"process","label":"..."}, {"type":"decision","label":"...","yes":"...","no":"..."}]}

    Output format:

    {
      "steps": [
        {"type": "process", "label": "Select product"},
        {"type": "process", "label": "Add to cart"},
        {"type": "process", "label": "Enter payment details"},
        {
          "type": "decision",
          "label": "Payment successful?",
          "yes": "Confirm order",
          "no": "Retry payment"
        }
      ]
    }

    Current diagram (compact JSON; may be empty):
    ${JSON.stringify(diagram)}

    Conversation history (most recent last; may be empty):
    ${historyText || "(none)"}

    User instruction:
    ${text}
    `;
    }

// ---------------------------------------------------------------------------
// ROUTE
// ---------------------------------------------------------------------------

app.post("/api/generate-flow", async (req, res) => {
  const { text, history, currentDiagram } = req.body;

  if (!text || !text.trim()) {
    return res.status(400).json({ error: "Text required" });
  }

  const prompt = buildPrompt({ text, history, currentDiagram });

  try {
    const ollama = await axios.post(OLLAMA_URL, {
      model: OLLAMA_MODEL,
      prompt,
      stream: false,
      options: {
        temperature: 0.1,
        num_predict: 700,
      },
    });

    const raw = ollama.data.response;

    const parsed = safeParse(raw);

    if (!parsed.steps || !Array.isArray(parsed.steps)) {
      throw new Error("Invalid AI response");
    }

    const flow = buildFlowFromSteps(parsed.steps);

    res.json({
      status: 200,
      flow,
    });
  } catch (err) {
    console.error("Flow generation error:", err.message);

    res.status(500).json({
      error: "Flow generation failed",
    });
  }
});

// ---------------------------------------------------------------------------
// SERVER
// ---------------------------------------------------------------------------

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});