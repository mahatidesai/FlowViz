# ========================== IMPORTS ================================
import os

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from openai import APIError, OpenAI
import uvicorn

from helper.clean_json import safe_parse_json
from helper.flow_build import (
    build_flow_from_steps,
    build_prompt,
    sanitize_llm_steps,
)
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
        You are a system that builds and updates a flowchart from natural language instructions.

Return ONLY valid JSON. No explanation.

You will be given:
- The user's new instruction
- Optional conversation history
- Optional current diagram (nodes + edges)

Your job: produce the UPDATED full "steps" list for the diagram.

If there is an existing diagram, keep it the same unless the user asks to change it.
Use conversation history + diagram context to resolve references like "that step" or "the last node".

Rules:

1. Steps must be in correct logical order.
2. Always include Start as the first step and End as the last step.
3. If there is a decision, its yes/no branches must re-join via a merge step.
4. Retry loops MUST go back to the correct step.
5. Avoid vague labels like "Process" or "Step".
6. Keep labels short (max 5 words).
7. Only include payment flow if user explicitly mentions payment.
8. If input is simple steps, generate sequential process nodes only.
9. Ensure flow: Start → Steps → Decision → Branches → Merge → End

Schema:

{
  "steps":[
    {"type":"process","label":"Start"},
    {"type":"process","label":"..."},
    {
      "type":"decision",
      "label":"...",
      "yes":"...",
      "no":"..."
    },
    {"type":"process","label":"End"}
  ]
}

Output ONLY JSON.
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
            max_tokens=1500,
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
