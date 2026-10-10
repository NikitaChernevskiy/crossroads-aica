"""Tests for the AI Emotional Partner API."""

import pytest
from httpx import AsyncClient, ASGITransport

from app.main import app


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.mark.anyio
async def test_health():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "healthy"
        assert data["storage"] == "in-memory"


@pytest.mark.anyio
async def test_ingest_and_get_state():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Ingest a state
        state = {
            "user_id": "test-user-1",
            "source": "simulation",
            "valence": -0.35,
            "arousal": 0.72,
            "focus": 0.41,
            "stress": 0.68,
            "label": "tense",
        }
        resp = await client.post("/state", json=state)
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "ok"
        assert "id" in data

        # Get current state
        resp = await client.get("/state/test-user-1")
        assert resp.status_code == 200
        data = resp.json()
        assert data["user_id"] == "test-user-1"
        assert data["label"] == "tense"
        assert data["stress"] == 0.68


@pytest.mark.anyio
async def test_get_state_not_found():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/state/nonexistent-user")
        assert resp.status_code == 404


@pytest.mark.anyio
async def test_ingest_validation():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Missing required fields
        resp = await client.post("/state", json={"user_id": "x"})
        assert resp.status_code == 422

        # Out-of-range values
        resp = await client.post(
            "/state",
            json={
                "user_id": "x",
                "source": "test",
                "valence": 5.0,  # out of range
                "arousal": 0.5,
                "focus": 0.5,
                "stress": 0.5,
                "label": "test",
            },
        )
        assert resp.status_code == 422


@pytest.mark.anyio
async def test_reload_rules():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post("/rules/reload")
        assert resp.status_code == 200
        assert resp.json()["status"] == "ok"
