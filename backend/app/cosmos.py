"""Cosmos DB client with in-memory fallback for local development."""

import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional, Protocol

from app.config import settings
from app.models import EmotionalState, StoredState


class StateStore(Protocol):
    """Protocol for state storage backends."""

    async def initialize(self) -> None: ...
    async def save_state(self, state: EmotionalState) -> str: ...
    async def get_current_state(self, user_id: str) -> Optional[StoredState]: ...
    async def get_state_history(
        self, user_id: str, minutes: int
    ) -> list[StoredState]: ...


class InMemoryStore:
    """In-memory state store for local development and testing."""

    def __init__(self) -> None:
        self._states: list[StoredState] = []

    async def initialize(self) -> None:
        pass

    async def save_state(self, state: EmotionalState) -> str:
        doc_id = str(uuid.uuid4())
        stored = StoredState(id=doc_id, **state.model_dump())
        self._states.append(stored)
        return doc_id

    async def get_current_state(self, user_id: str) -> Optional[StoredState]:
        user_states = [s for s in self._states if s.user_id == user_id]
        if not user_states:
            return None
        return max(user_states, key=lambda s: s.timestamp)

    async def get_state_history(
        self, user_id: str, minutes: int
    ) -> list[StoredState]:
        cutoff = datetime.now(timezone.utc) - timedelta(minutes=minutes)
        return sorted(
            [
                s
                for s in self._states
                if s.user_id == user_id and s.timestamp.replace(tzinfo=timezone.utc) >= cutoff
            ],
            key=lambda s: s.timestamp,
            reverse=True,
        )


class CosmosStore:
    """Azure Cosmos DB state store for production."""

    def __init__(self) -> None:
        self._container = None

    async def initialize(self) -> None:
        from azure.cosmos.aio import CosmosClient

        if settings.cosmos_key:
            client = CosmosClient(settings.cosmos_endpoint, settings.cosmos_key)
        else:
            # Use DefaultAzureCredential (Managed Identity)
            from azure.identity.aio import DefaultAzureCredential

            credential = DefaultAzureCredential()
            client = CosmosClient(settings.cosmos_endpoint, credential=credential)

        database = client.get_database_client(settings.cosmos_database)
        self._container = database.get_container_client(settings.cosmos_container)

    async def save_state(self, state: EmotionalState) -> str:
        doc_id = str(uuid.uuid4())
        doc = state.model_dump(mode="json")
        doc["id"] = doc_id
        doc["timestamp"] = doc["timestamp"] if isinstance(doc["timestamp"], str) else doc["timestamp"].isoformat()
        await self._container.create_item(doc)
        return doc_id

    async def get_current_state(self, user_id: str) -> Optional[StoredState]:
        query = (
            "SELECT TOP 1 * FROM c WHERE c.user_id = @user_id "
            "ORDER BY c.timestamp DESC"
        )
        params = [{"name": "@user_id", "value": user_id}]
        items = [
            item
            async for item in self._container.query_items(
                query, parameters=params, partition_key=user_id
            )
        ]
        if not items:
            return None
        return StoredState(**items[0])

    async def get_state_history(
        self, user_id: str, minutes: int
    ) -> list[StoredState]:
        cutoff = (datetime.now(timezone.utc) - timedelta(minutes=minutes)).isoformat()
        query = (
            "SELECT * FROM c WHERE c.user_id = @user_id "
            "AND c.timestamp >= @cutoff ORDER BY c.timestamp DESC"
        )
        params = [
            {"name": "@user_id", "value": user_id},
            {"name": "@cutoff", "value": cutoff},
        ]
        items = [
            item
            async for item in self._container.query_items(
                query, parameters=params, partition_key=user_id
            )
        ]
        return [StoredState(**item) for item in items]


def create_store() -> StateStore:
    """Factory: returns CosmosStore if configured, else InMemoryStore."""
    if settings.use_in_memory or not settings.cosmos_endpoint:
        return InMemoryStore()
    return CosmosStore()
