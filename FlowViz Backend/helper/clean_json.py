import json
import re

from json_repair import repair_json
from utils.logger import logger


def prepare_llm_json(raw: str) -> str:
    """Extract and normalize JSON-like text from model output (matches Node cleanJSON)."""
    if not raw:
        return ""

    start = raw.find("{")
    end = raw.rfind("}")
    if start != -1 and end != -1:
        raw = raw[start : end + 1]

    raw = re.sub(r"```json|```", "", raw)
    raw = (
        raw.replace("\u201c", '"')
        .replace("\u201d", '"')
        .replace("\u2018", "'")
        .replace("\u2019", "'")
    )
    raw = re.sub(r",(\s*[\]}])", r"\1", raw)
    return raw


def safe_parse_json(text: str) -> dict:
    """Parse JSON; fall back to json-repair if needed (matches Node safeParse)."""
    cleaned = prepare_llm_json(text)
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        try:
            repaired = repair_json(cleaned)
            if isinstance(repaired, str):
                return json.loads(repaired)
            return repaired
        except Exception as e:
            logger.error("safe_parse_json repair failed: %s", e)
            raise


def clean_json(json_data: str):
    """
    Legacy helper: parse multi-block LLM output. Kept for compatibility.
    """
    cleaned = re.sub(r"```json|```", "", json_data).strip()
    blocks = [b.strip() for b in cleaned.split("\n\n") if b.strip()]

    results = []
    for block in blocks:
        try:
            results.append(json.loads(block))
        except json.JSONDecodeError:
            logger.error("Failed to parse JSON block: %s", block)
            results.append({"error": "Invalid JSON", "raw": block})

    return results
