import express from 'express';
import axios from 'axios';
import dotenv from 'dotenv';
import cors from 'cors';
import { jsonrepair } from 'jsonrepair'; // npm install jsonrepair

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors({ origin: "http://localhost:5173" }));

const PORT = process.env.PORT || 3000;
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "mistral:7b-instruct";
const OLLAMA_KEEP_ALIVE = process.env.OLLAMA_KEEP_ALIVE || "30m"; // keep model loaded

// Ollama API (local mistral)
const OLLAMA_URL = "http://localhost:11434/v1/completions";

// 🧹 Helper to clean JSON-like strings
function cleanJSON(raw) {
  return raw
    .replace(/```json|```/g, "") // remove code fences
    .replace(/'/g, '"')          // replace single quotes with double quotes
    .replace(/\,(?=\s*[\]}])/g, ""); // remove trailing commas
}

app.post('/api/generate-flow', async (req, res) => {
  const { text, history, currentDiagram } = req.body;

  console.log("📩 Request received:", text);

  const chatContext = history
  ?.map(m => `${m.sender === 'user' ? "User" : "Assistant"}: ${m.text}`)
  .join("\n") || "";

  const prompt = `
  You are an AI that generates and edits flow diagrams.

  Conversation history:
  ${chatContext}

  Current diagram JSON:
  ${JSON.stringify(currentDiagram)}

  User request:
  ${text}

  TASK:
  Update the flow diagram according to the user's request.

  IMPORTANT RULES:
  - If there is NO current diagram, generate a new one.
  - If a diagram exists, MODIFY the existing nodes and edges instead of recreating everything.
  - Preserve existing node IDs whenever possible.
  - Only add or remove nodes if necessary.

  FLOW LOGIC RULES:
  - If the text contains conditions such as "if", "else", "otherwise", or "check", create a decision node.
  - Decision nodes should have type "decision".
  - Decision nodes usually branch into two edges labeled "Yes" and "No".

  OUTPUT FORMAT:
  Return ONLY valid JSON with this structure:

  {
    "nodes": [...],
    "edges": [...]
  }

  NODE FORMAT:
  {
    "id": "nX",
    "position": { "x": number, "y": number },
    "data": { "label": "text" },
    "type": "input" | "default" | "decision"
  }

  RULES FOR NODES:
  - The first node should usually be type "input".
  - Decision nodes must use type "decision".
  - All other nodes use type "default".

  EDGE FORMAT:
  {
    "id": "eX",
    "source": "nX",
    "target": "nY",
    "label": ""
  }

  EDGE RULES:
  - If branching occurs, label edges "Yes" and "No".
  - Every edge must reference an existing node ID.

  CRITICAL:
  - Output ONLY JSON
  - No explanations
  - No markdown
  - No text outside the JSON
  `;

  try {
    console.log("➡️ Sending request to Ollama...");
    const response = await axios.post(
      OLLAMA_URL,
      {
        model: OLLAMA_MODEL,
        prompt,
        stream: false,
        format: {
          type: "json_object"
        },
        keep_alive: OLLAMA_KEEP_ALIVE,
        options: {
          // Reduce over-generation to speed up responses
          num_predict: 120,
          temperature: 0.2,
          top_p: 0.9,
          top_k: 40,
          repeat_penalty: 1.1,
          num_ctx: 4096
        }
      },
      { responseType: "json", timeout: 60_000 }
    );

    console.log("📥 Raw Ollama response:", response.data);

    // Extract model output
    const rawText =
      response.data?.choices?.[0]?.text ||
      response.data?.response ||
      "";
    if (!rawText) {
      throw new Error("No text returned from Ollama");
    }

    //  Clean up JSON string
    const cleaned = cleanJSON(rawText).trim();

    // 🔧 Try parsing JSON with repair fallback
    let flowData;
    try {
      flowData = JSON.parse(cleaned);
    } catch (err) {
      console.warn("⚠️ JSON.parse failed, attempting jsonrepair...");
      try {
        flowData = JSON.parse(jsonrepair(cleaned));
      } catch (repairErr) {
        console.error("❌ JSON repair also failed:", cleaned);
        return res
          .status(400)
          .json({ error: "Model did not return valid JSON", raw: cleaned });
      }
    }

    console.log("✅ Parsed flow data:", flowData);
    res.json({ status: 200, flow: flowData });

  } catch (error) {
    console.error("❌ Error fetching from Ollama:", error.message);
    res.status(500).json({ error: "Failed to generate flow diagram", details: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  // Kick off a background warmup to avoid first-request cold start
  (async () => {
    try {
      await axios.post(
        OLLAMA_URL,
        {
          model: OLLAMA_MODEL,
          prompt: "Return an empty JSON object {}",
          stream: false,
          format: "json",
          keep_alive: OLLAMA_KEEP_ALIVE,
          options: { num_predict: 16, temperature: 0 }
        },
        { responseType: "json", timeout: 30_000 }
      );
      console.log("🔥 Ollama model warmed and kept alive");
    } catch (e) {
      console.warn("⚠️ Ollama warmup skipped:", e.message);
    }
  })();
});
