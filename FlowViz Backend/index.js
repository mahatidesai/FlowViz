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
  const { text } = req.body;

  console.log("📩 Request received:", text);

  const prompt = `
You are a flow diagram generator.  
Your task is to read the given text and convert it into a JSON object containing "nodes" and "edges" for a flowchart that follows the React Flow schema.  

Rules:
- Output ONLY valid JSON, no explanations, no extra text.  
- Each node must have:
  { "id": "nX", "position": { "x": number, "y": number }, "data": { "label": "..." }, "type": "input" | "default" }  
- The first step must always be "input". All other steps must be "default".  
- Positions must be **dynamic**:  
  - Arrange nodes vertically (y increasing by 100 for each step).  
  - Keep x = 0 unless a branch/decision creates parallel flows (then offset x by ±200).  
- Each edge must have:
  { "id": "eX", "source": "nX", "target": "nY", "label": "" }  
- Use sequential IDs: n1, n2, n3...  
- Each edge should have a unique id as eX 
- Ensure all node IDs in edges exist.  
- Output a COMPLETE and VALID JSON object with two keys: "nodes" and "edges".  
- Do not stop early. Always close all brackets and quotes.  
- Respond only with JSON, nothing else.

Text: "${text}"
`;

  try {
    console.log("➡️ Sending request to Ollama...");
    const response = await axios.post(
      OLLAMA_URL,
      {
        model: OLLAMA_MODEL,
        prompt,
        stream: false,
        format: "json", // force JSON output
        keep_alive: OLLAMA_KEEP_ALIVE,
        options: {
          // Reduce over-generation to speed up responses
          num_predict: 300,
          temperature: 0.2,
          top_p: 0.9,
          top_k: 40,
          repeat_penalty: 1.1,
          num_ctx: 1024
        }
      },
      { responseType: "json", timeout: 60_000 }
    );

    console.log("📥 Raw Ollama response:", response.data);

    // Extract model output
    const rawText = response.data?.choices?.[0]?.text;
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
