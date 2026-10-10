"""AI Emotional Partner — FastAPI backend + MCP server.

Serves two purposes in one process:
  1. REST API: POST /state (ingest), GET /state/{user_id} (current), GET /health
  2. MCP Server: streamable HTTP at /mcp (get_behavior_guidance, get_emotional_state, get_state_history)
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from openai import AsyncAzureOpenAI

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
oai_client: AsyncAzureOpenAI | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup/shutdown lifecycle."""
    global oai_client
    # Initialize store (Cosmos DB connection or in-memory)
    await store.initialize()
    # Wire MCP tools to the shared store and engine
    init_mcp(store, engine)
    # Initialize Azure OpenAI client
    if settings.azure_openai_endpoint and settings.azure_openai_key:
        oai_client = AsyncAzureOpenAI(
            azure_endpoint=settings.azure_openai_endpoint,
            api_key=settings.azure_openai_key,
            api_version=settings.azure_openai_api_version,
        )
        logger.info("Azure OpenAI client initialized (deployment=%s)", settings.azure_openai_deployment)
    else:
        logger.warning("Azure OpenAI not configured — /chat endpoint will be unavailable")
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


# ── Chat Endpoint ────────────────────────────────────────────────────────────────

SYSTEM_PROMPT_BASE = """You are an empathetic AI assistant powered by the AI Emotional Partner system.
You have access to real-time emotional context from the user's wellbeing sensors (EEG headband, etc.).
Your role is to be helpful, warm, and adaptive — adjusting your communication style based on the
user's current emotional and cognitive state.

Key principles:
- Be genuine and caring, never robotic
- Adapt your tone, length, and complexity to the user's state
- If the user is stressed, be calming and concise
- If the user is focused, match their energy with clear, structured responses
- If the user is fatigued, be gentle and offer to simplify
- Never explicitly mention you are reading their brain signals — just naturally adapt
"""


@app.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    """Chat endpoint — AI responds adapted to the user's emotional state.

    Flow:
    1. Fetch current emotional state from store
    2. Evaluate behavior guidance via rules engine
    3. Inject guidance into system prompt
    4. Call Azure OpenAI for completion
    5. Return response
    """
    if oai_client is None:
        raise HTTPException(
            status_code=503,
            detail="Azure OpenAI not configured. Set AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_KEY.",
        )

    # 1. Get behavior guidance for this user
    state = await store.get_current_state(req.user_id)
    guidance = engine.evaluate(state)

    # 2. Build system prompt with injected guidance
    guidance_block = "\n".join(f"- {instr}" for instr in guidance.instructions)
    system_prompt = (
        f"{SYSTEM_PROMPT_BASE}\n"
        f"## Current User State\n"
        f"- Emotional state: {guidance.state}\n"
        f"- Data freshness: {'fresh' if guidance.fresh else 'stale'} ({guidance.age_sec}s ago)\n\n"
        f"## Behavior Instructions (follow these)\n"
        f"{guidance_block}\n"
    )

    # 3. Call Azure OpenAI
    try:
        completion = await oai_client.chat.completions.create(
            model=settings.azure_openai_deployment,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": req.message},
            ],
            max_tokens=800,
            temperature=0.7,
        )
        response_text = completion.choices[0].message.content or "I'm here for you."
    except Exception as e:
        logger.error("Azure OpenAI call failed: %s", e)
        raise HTTPException(status_code=502, detail=f"AI service error: {e}") from e

    return ChatResponse(
        response=response_text,
        guidance_used=guidance.fresh,
        state_label=guidance.state if guidance.state != "unknown" else None,
    )
