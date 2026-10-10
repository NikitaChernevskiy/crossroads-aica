"""AI Emotional Partner — FastAPI backend + MCP server.

Serves two purposes in one process:
  1. REST API: POST /state (ingest), GET /state/{user_id} (current), GET /health
  2. MCP Server: streamable HTTP at /mcp (get_behavior_guidance, get_emotional_state, get_state_history)
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.cosmos import create_store
from app.mcp_tools import init_mcp, mcp_server
from app.models import EmotionalState, HealthResponse, StateResponse
from app.rules import BehaviorRulesEngine

# Shared instances
store = create_store()
engine = BehaviorRulesEngine()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup/shutdown lifecycle."""
    # Initialize store (Cosmos DB connection or in-memory)
    await store.initialize()
    # Wire MCP tools to the shared store and engine
    init_mcp(store, engine)
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
    doc_id = await store.save_state(state)
    return StateResponse(id=doc_id)


@app.get("/state/{user_id}")
async def get_current_state(user_id: str):
    """Get the current emotional state for a user (REST convenience endpoint)."""
    state = await store.get_current_state(user_id)
    if state is None:
        raise HTTPException(status_code=404, detail="No state found for this user")
    return state.model_dump(mode="json")


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
