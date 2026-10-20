import os
import json
from typing import Dict, Any
from fastapi import FastAPI, HTTPException, Request, Header
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from app.graph import run_pipeline, run_pipeline_stream

app = FastAPI(title="Multi-Agent Support Engine - Python LangGraph Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

CONFIG_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "runtime-config")
LIBRARY_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "library")

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "agent-pipeline-python", "port": 5000}

@app.post("/run")
async def run_agent_pipeline(payload: Dict[str, Any]):
    try:
        state = await run_pipeline(payload)
        return state.model_dump()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/run/stream")
async def run_agent_pipeline_stream(payload: Dict[str, Any]):
    return StreamingResponse(
        run_pipeline_stream(payload),
        media_type="text/event-stream"
    )

# --- Admin Platform Config Endpoints ---

@app.get("/admin/policies")
def get_policies():
    path = os.path.join(CONFIG_DIR, "policies.json")
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}

@app.put("/admin/policies")
async def update_policies(payload: Dict[str, Any]):
    path = os.path.join(CONFIG_DIR, "policies.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)
    return {"status": "updated"}

@app.get("/admin/agents")
def get_agents():
    path = os.path.join(CONFIG_DIR, "agents.json")
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    return {"specialists": []}

@app.put("/admin/agents")
async def update_agents(payload: Dict[str, Any]):
    path = os.path.join(CONFIG_DIR, "agents.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)
    return {"status": "updated"}

@app.get("/admin/faq")
def get_faq():
    path = os.path.join(CONFIG_DIR, "faq.json")
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    return []

@app.post("/admin/faq")
async def update_faq(payload: Any):
    path = os.path.join(CONFIG_DIR, "faq.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)
    return {"status": "updated"}

@app.get("/admin/kb/{filename}")
def get_kb_file(filename: str):
    path = os.path.join(LIBRARY_DIR, filename)
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            return {"filename": filename, "content": f.read()}
    raise HTTPException(status_code=404, detail="KB file not found")

@app.put("/admin/kb/{filename}")
async def save_kb_file(filename: str, payload: Dict[str, Any]):
    path = os.path.join(LIBRARY_DIR, filename)
    content = payload.get("content", "")
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    return {"status": "saved", "filename": filename}

@app.post("/admin/kb/suggest")
async def suggest_kb_article(payload: Dict[str, Any]):
    ticket_id = payload.get("ticket_id", "TKT-GEN")
    resolution = payload.get("resolution", "Resolved issue")
    findings = payload.get("findings", [])

    content = f"""# KB Article Draft - {ticket_id}

## Issue Summary
{resolution}

## Findings & Troubleshooting Steps
- {chr(10).join(findings) if findings else 'Verified account settings and resolved duplicate charges.'}

## Recommended Resolution
Clear cache, confirm order details, and issue appropriate refund or error fix.
"""
    return {
        "title": f"Resolution Guide for {ticket_id}",
        "filename": f"auto_{ticket_id.lower().replace('-', '_')}.md",
        "content": content,
        "source": "template"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5000)
