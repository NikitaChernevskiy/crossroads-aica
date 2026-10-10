"""MCP tool definitions for AI Emotional Partner.

Three tools exposed via streamable HTTP MCP:
  - get_behavior_guidance: returns behavior instructions based on current state
  - get_emotional_state: returns current emotional state for a user
  - get_state_history: returns emotional state history over a period
"""

from mcp.server.fastmcp import FastMCP

from app.cosmos import StateStore
from app.rules import BehaviorRulesEngine

# Module-level references — set by main.py at startup
_store: StateStore = None  # type: ignore[assignment]
_engine: BehaviorRulesEngine = None  # type: ignore[assignment]

mcp_server = FastMCP(
    "AI Emotional Partner",
    instructions=(
        "MCP server providing real-time emotional context for AI agents. "
        "Call get_behavior_guidance before responding to a user to adapt your "
        "tone, length, and presentation style based on their current wellbeing state."
    ),
)


def init_mcp(store: StateStore, engine: BehaviorRulesEngine) -> None:
    """Initialize MCP tools with the shared store and rules engine."""
    global _store, _engine
    _store = store
    _engine = engine


@mcp_server.tool()
async def get_behavior_guidance(user_id: str) -> dict:
    """Get behavior instructions for an AI agent based on the user's current emotional state.

    Call this tool before generating a response. It returns instructions on how to
    adapt your tone, verbosity, and presentation style to the user's real-time
    wellbeing context. The instructions are derived from configurable rules — the
    agent never sees raw biometric data.

    Args:
        user_id: The user's identifier.

    Returns:
        Behavior guidance with state label, freshness indicator, and instructions list.
    """
    state = await _store.get_current_state(user_id)
    guidance = _engine.evaluate(state)
    return guidance.model_dump()


@mcp_server.tool()
async def get_emotional_state(user_id: str) -> dict:
    """Get the user's current emotional state.

    Returns the latest aggregated emotional state including valence, arousal,
    focus, stress, and a human-readable label. Returns null fields if no state
    is available.

    Args:
        user_id: The user's identifier.

    Returns:
        Current emotional state or indicator that no state is available.
    """
    state = await _store.get_current_state(user_id)
    if state is None:
        return {
            "available": False,
            "message": "No emotional state available for this user",
        }
    return {
        "available": True,
        "user_id": state.user_id,
        "source": state.source,
        "timestamp": state.timestamp.isoformat(),
        "valence": state.valence,
        "arousal": state.arousal,
        "focus": state.focus,
        "stress": state.stress,
        "label": state.label,
    }


@mcp_server.tool()
async def get_state_history(user_id: str, minutes: int = 60) -> dict:
    """Get the user's emotional state history over a recent time window.

    Returns a list of state snapshots ordered by time (newest first).
    Useful for understanding trends — e.g. increasing stress, declining focus.

    Args:
        user_id: The user's identifier.
        minutes: How many minutes of history to retrieve (1-1440, default 60).

    Returns:
        List of state snapshots with summary statistics.
    """
    minutes = max(1, min(1440, minutes))
    history = await _store.get_state_history(user_id, minutes)

    states = [
        {
            "timestamp": s.timestamp.isoformat(),
            "valence": s.valence,
            "arousal": s.arousal,
            "focus": s.focus,
            "stress": s.stress,
            "label": s.label,
            "source": s.source,
        }
        for s in history
    ]

    # Compute summary if we have data
    summary = None
    if states:
        summary = {
            "count": len(states),
            "avg_valence": round(sum(s["valence"] for s in states) / len(states), 3),
            "avg_arousal": round(sum(s["arousal"] for s in states) / len(states), 3),
            "avg_focus": round(sum(s["focus"] for s in states) / len(states), 3),
            "avg_stress": round(sum(s["stress"] for s in states) / len(states), 3),
            "dominant_label": max(
                set(s["label"] for s in states),
                key=lambda l: sum(1 for s in states if s["label"] == l),
            ),
        }

    return {
        "user_id": user_id,
        "window_minutes": minutes,
        "states": states,
        "summary": summary,
    }
