"""Pydantic models for the AI Emotional Partner API."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class EmotionalState(BaseModel):
    """Unified emotional state format — sent by any sensor client."""

    user_id: str = Field(..., description="User identifier (e.g. Entra OID)")
    source: str = Field(
        ..., description="Device source identifier (e.g. 'muse-s-athena', 'simulation')"
    )
    timestamp: datetime = Field(
        default_factory=datetime.utcnow, description="ISO 8601 timestamp"
    )
    valence: float = Field(..., ge=-1.0, le=1.0, description="Valence: -1 (negative) to 1 (positive)")
    arousal: float = Field(..., ge=0.0, le=1.0, description="Arousal: 0 (calm) to 1 (excited)")
    focus: float = Field(..., ge=0.0, le=1.0, description="Focus: 0 (distracted) to 1 (focused)")
    stress: float = Field(..., ge=0.0, le=1.0, description="Stress: 0 (relaxed) to 1 (stressed)")
    label: str = Field(..., description="Human-readable emotional state label (e.g. 'stressed', 'calm', 'focused', 'meditative')")


class StoredState(EmotionalState):
    """Emotional state as stored in Cosmos DB."""

    id: str = Field(..., description="Unique document ID")


class BehaviorGuidance(BaseModel):
    """Response from get_behavior_guidance MCP tool."""

    state: str = Field(..., description="Current emotional state label")
    fresh: bool = Field(..., description="Whether the state data is fresh (within threshold)")
    age_sec: int = Field(..., description="Age of the state data in seconds")
    instructions: list[str] = Field(
        ..., description="Behavior instructions for the AI agent"
    )


class StateHistoryRequest(BaseModel):
    """Request parameters for state history."""

    user_id: str
    minutes: int = Field(default=60, ge=1, le=1440, description="History window in minutes")


class StateResponse(BaseModel):
    """API response for POST /state."""

    status: str = "ok"
    id: str = Field(..., description="Stored document ID")


class ChatRequest(BaseModel):
    """Chat request from the frontend."""

    user_id: str = Field(..., description="User identifier")
    message: str = Field(..., min_length=1, max_length=4000, description="User message")
    thread_id: Optional[str] = Field(None, description="Thread ID for conversation continuity (omit for new chat)")


class ChatResponse(BaseModel):
    """Chat response with AI-generated text."""

    response: str = Field(..., description="AI-generated response")
    thread_id: str = Field(..., description="Thread ID — send this back in subsequent messages")
    guidance_used: bool = Field(..., description="Whether behavior guidance was applied")
    state_label: Optional[str] = Field(None, description="Emotional state label used")


class HealthResponse(BaseModel):
    """Health check response."""

    status: str = "healthy"
    version: str = "0.1.0"
    storage: str = Field(..., description="Storage backend type")
