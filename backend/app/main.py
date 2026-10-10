"""AI Emotional Partner — FastAPI backend + MCP server.

Serves three purposes in one process:
  1. REST API: POST /state, GET /state/{user_id}, GET /health, POST /chat
  2. MCP Server: streamable HTTP at /mcp (get_behavior_guidance, get_emotional_state, get_state_history)
  3. AI Agent Service: Azure AI Foundry Assistant with function-tool calls + threads for chat history
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.agent import AgentService
from app.config import settings
from app.cosmos import create_store
from app.mcp_tools import init_mcp, mcp_server
from app.models import (
    ChatRequest,
    ChatResponse,
    EmotionalState,
    HealthResponse,
    StateResponse,
)
from app.rules import BehaviorRulesEngine

logger = logging.getLogger(__name__)

# Shared instances
store = create_store()
engine = BehaviorRulesEngine()
agent_service: AgentService | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup/shutdown lifecycle."""
    global agent_service
    # Initialize store (Cosmos DB connection or in-memory)
    await store.initialize()
    # Wire MCP tools to the shared store and engine
    init_mcp(store, engine)
    # Initialize Microsoft Foundry Agent Service
    if settings.foundry_project_endpoint:
        agent_service = AgentService(store, engine)
        agent_service.initialize()
        logger.info("Microsoft Foundry Agent Service initialized (agent=%s)", agent_service.agent_id)
    else:
        logger.warning("Foundry not configured — set FOUNDRY_PROJECT_ENDPOINT and MCP_SERVER_URL")
    yield


app = FastAPI(
    title="AI Emotional Partner",
    description=(
        "Multi-purpose MCP server that provides behavior guidance instructions "
        "to any AI agent based on the user's real-time wellbeing context."
    ),
    version="0.1.0",
    lifespan=lifespan,
)

# CORS — allow sensor-client origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount MCP server at /mcp for streamable HTTP
app.mount("/mcp", mcp_server.streamable_http_app())


# ── REST Endpoints ──────────────────────────────────────────────────────────


@app.post("/state", response_model=StateResponse)
async def ingest_state(state: EmotionalState):
    """Ingest an emotional state snapshot from a sensor client.

    Any device adapter sends the unified state format here.
    The server stores it and makes it available via MCP tools.
    """
    logger.info(
        "[STATE] user=%s source=%s label=%s  v=%.2f a=%.2f f=%.2f s=%.2f",
        state.user_id, state.source, state.label,
        state.valence, state.arousal, state.focus, state.stress,
    )
    doc_id = await store.save_state(state)
    return StateResponse(id=doc_id)


@app.get("/state/{user_id}")
async def get_current_state(user_id: str):
    """Get the current emotional state for a user (REST convenience endpoint)."""
    state = await store.get_current_state(user_id)
    if state is None:
        raise HTTPException(status_code=404, detail="No state found for this user")
    return state.model_dump(mode="json")


@app.get("/state/{user_id}/history")
async def get_state_history(user_id: str, minutes: int = 30):
    """Get emotional state history for calibration review.

    Returns the last N minutes of state snapshots from Cosmos DB,
    newest first. Use this to inspect real EEG data during calibration.

    Query params:
        minutes: how far back to look (default 30)
    """
    states = await store.get_state_history(user_id, minutes)
    return {
        "user_id": user_id,
        "minutes": minutes,
        "count": len(states),
        "states": [s.model_dump(mode="json") for s in states],
    }


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    storage_type = "in-memory" if settings.use_in_memory or not settings.cosmos_endpoint else "cosmos-db"
    return HealthResponse(storage=storage_type)


@app.post("/rules/reload")
async def reload_rules():
    """Hot-reload behavior rules from disk (admin endpoint)."""
    engine.reload()
    return {"status": "ok", "message": "Rules reloaded"}


# ── Chat Endpoint (AI Foundry Agent Service) ──────────────────────────────────


@app.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    """Chat via AI Foundry Agent Service.

    Flow:
    1. Create or reuse a Thread (conversation history is kept server-side)
    2. Add user message to the thread
    3. Run the Assistant — it calls get_behavior_guidance tool automatically
    4. Return adapted response + thread_id for subsequent messages
    """
    if agent_service is None:
        raise HTTPException(
            status_code=503,
            detail="Foundry Agent Service not configured. Set FOUNDRY_PROJECT_ENDPOINT and MCP_SERVER_URL.",
        )

    try:
        thread_id, response_text, guidance_used, state_label = await agent_service.chat(
            user_id=req.user_id,
            message=req.message,
            thread_id=req.thread_id,
        )
    except Exception as e:
        logger.error("Agent service error: %s", e)
        raise HTTPException(status_code=502, detail=f"AI Agent error: {e}") from e

    return ChatResponse(
        response=response_text,
        thread_id=thread_id,
        guidance_used=guidance_used,
        state_label=state_label,
    )
