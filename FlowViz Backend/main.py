# ========================== IMPORTS ================================
import os

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.responses import StreamingResponse
from openai import APIError, OpenAI
import uvicorn

from helper.clean_json import safe_parse_json
from helper.flow_build import build_flow_from_steps, build_prompt
from utils.logger import logger
from models.FlowRequest import FlowRequest
# ====================================================================

app = FastAPI(title="FlowViz Backend")

# ============================== LOADING DATA FROM ENV ==============================
load_dotenv()

_openai_base = (
    os.getenv("OPENAI_BASE_URL")
    or os.getenv("OLLAMA_URL")
    or "http://localhost:11434/v1"
)

# OpenAI client expects base URL without trailing slash issues — normalize
_openai_base = _openai_base.rstrip("/")
openai_client = OpenAI(
    base_url=_openai_base,
    api_key=os.getenv("OPENAI_API_KEY", "ollama"),
)

_client_origin = os.getenv("CLIENT_ORIGIN", "http://localhost:5173")
# Default 8000 — matches frontend VITE_API_URL fallback (http://localhost:8000)
PORT = int(os.getenv("PORT", "8000"))
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL") or os.getenv("MODEL", "llama3:8b")
# ======================================================================================


# ================================= MIDDLEWARE =========================================
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        _client_origin,
        "http://127.0.0.1:5173",
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# =======================================================================================

# ================================== API CALL ============================================
@app.post("/api/generate-flow")
def generate_flow(body: FlowRequest):
    # If the body does not contain text return error
    if not body.text or not body.text.strip():
        return JSONResponse(
            status_code=400,
            content={"error": "Text required"},
        )

    # Building user promt from the payload
    prompt = build_prompt(body.text, body.history, body.current_diagram)

    system_prompt = """
You build and update flowcharts from natural language. Return ONLY valid JSON — no markdown, no explanation.

Input may include: the user instruction, conversation history, and current diagram (nodes, edges, labeledFlow).

Output: the UPDATED full "steps" array. Do NOT emit node ids or edges — only "steps".

If a current diagram exists, preserve it unless the user changes it. Use labeledFlow and history to resolve "that step", "before the decision", etc.

Rules:
1. Logical execution order. One "decision" object uses yes/no string labels for the FIRST step on each branch (not the literal words "Yes"/"No" unless those are the real step names).
2. Do NOT put "Start" or "End" in steps — the system adds them.
3. After a decision: put the NEXT shared process step immediately after the decision object in the array ONLY if both branches should meet the same step. If the "no" path is a retry loop, use a no label like "Retry" and do NOT add a fake merge step — retry is only on the no branch.
4. For "if success then A else retry": yes = A (e.g. "Show order confirmed"), no = "Retry". Put no extra steps between decision and End unless the user asked for them.
5. Retry / try again: put that text in the "no" label (or similar). The system loops back to the step before the decision.
6. Avoid vague labels ("Process", "Step"). Max ~5 words per label.
7. Simple linear descriptions become process steps only (no decision unless the user implies a branch).

Schema example:

{
  "steps":[
    {"type":"process","label":"Browse products"},
    {"type":"process","label":"Add to cart"},
    {
      "type":"decision",
      "label":"Payment successful?",
      "yes":"Show order confirmed",
      "no":"Retry"
    }
  ]
}

Output ONLY a JSON object with a "steps" key.
    """

    # Calling openai api 
    try:
        completion = openai_client.chat.completions.create(
            model=OLLAMA_MODEL,
            messages=[{
                "role": "system",
                "content": system_prompt,
                },
                {"role": "user", "content": prompt}],
            temperature=0.1,
            max_tokens=2048,
        )
        raw = completion.choices[0].message.content or ""
        logger.info("Model response length: %s", len(raw))

        parsed = safe_parse_json(raw)
        steps = parsed.get("steps")
        if not isinstance(steps, list):
            return JSONResponse(
                status_code=500,
                content={"error": "Invalid AI response"},
            )

        flow = build_flow_from_steps(steps)
        return {"status": 200, "flow": flow}
    except APIError as e:
        logger.exception("OpenAI-compatible API error: %s", e)
        return JSONResponse(
            status_code=502,
            content={"error": "LLM request failed"},
        )
    except Exception as e:
        logger.exception("Flow generation error: %s", e)
        return JSONResponse(
            status_code=500,
            content={"error": "Flow generation failed"},
        )
# ========================================================================================

# =============================== TEST API CALL =======================================
@app.get("/")
def root():
    return {"message": "FlowViz API", "docs": "/docs"}
# =====================================================================================

# ================================= RUNNING THE APP WITH UVICORN ========================
if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="127.0.0.1",
        port=PORT,
        reload=True,
    )
