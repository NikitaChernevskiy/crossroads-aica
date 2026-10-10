"""AI Foundry Agent Service — manages conversations with behavior-adaptive AI.

Architecture:
  1. Azure OpenAI (connected to AI Foundry hub) provides the chat model
  2. Each conversation gets a thread_id (UUID) with full message history in memory
  3. Before each response, the agent fetches behavior guidance from the rules engine
     (same logic exposed via MCP tools at /mcp)
  4. Guidance is injected into the system prompt so the AI adapts tone/style/length
  5. Full conversation history is sent with each request → the AI remembers context
"""

import logging
import uuid
from collections import defaultdict
from typing import Optional

from openai import AsyncAzureOpenAI

from app.config import settings
from app.cosmos import StateStore
from app.rules import BehaviorRulesEngine

logger = logging.getLogger(__name__)

SYSTEM_PROMPT_BASE = """\
You are an empathetic AI assistant powered by the AI Emotional Partner system.
You have access to real-time emotional context from the user's wellbeing sensors
(EEG headband, fitness tracker, etc.). Your role is to be helpful, warm, and
adaptive — adjusting your communication style based on the user's current
emotional and cognitive state.

Core principles:
- Be genuine and caring, never robotic
- Adapt your tone, length, and complexity to the user's state
- If the user is stressed → be calming, concise, and reassuring
- If the user is focused → match their energy with clear, structured responses
- If the user is fatigued → be gentle, brief, and offer to simplify
- If the user is excited → be enthusiastic and engaging
- Never explicitly say you are reading brain signals — just naturally adapt
- You may acknowledge the user's mood casually if appropriate
"""

# Max messages to keep per thread (prevent unbounded memory growth)
MAX_HISTORY = 50


class AgentService:
    """Manages conversations with behavior guidance from the MCP tools layer."""

    def __init__(
        self,
        openai_client: AsyncAzureOpenAI,
        store: StateStore,
        engine: BehaviorRulesEngine,
    ) -> None:
        self.client = openai_client
        self.store = store
        self.engine = engine
        # Thread storage: thread_id → list of {"role": ..., "content": ...}
        self._threads: dict[str, list[dict]] = defaultdict(list)

    async def initialize(self) -> None:
        """Verify the OpenAI connection works."""
        logger.info(
            "AgentService initialized (deployment=%s, endpoint=%s)",
            settings.azure_openai_deployment,
            settings.azure_openai_endpoint[:40] + "...",
        )

    async def chat(
        self,
        user_id: str,
        message: str,
        thread_id: Optional[str] = None,
    ) -> tuple[str, str, bool, Optional[str]]:
        """Process a chat message with full conversation history.

        Returns:
            (thread_id, response_text, guidance_used, state_label)
        """
        # 1. Create or reuse thread
        if not thread_id or thread_id not in self._threads:
            thread_id = str(uuid.uuid4())
            self._threads[thread_id] = []
            logger.info("New thread %s for user %s", thread_id, user_id)

        history = self._threads[thread_id]

        # 2. Get behavior guidance (same logic as MCP get_behavior_guidance tool)
        state = await self.store.get_current_state(user_id)
        guidance = self.engine.evaluate(state)

        guidance_block = "\n".join(f"- {i}" for i in guidance.instructions)
        system_prompt = (
            f"{SYSTEM_PROMPT_BASE}\n"
            f"## Current Emotional State\n"
            f"- State: {guidance.state}\n"
            f"- Freshness: {'fresh' if guidance.fresh else 'stale'}"
            f" ({guidance.age_sec}s ago)\n\n"
            f"## Behavior Instructions (follow these)\n"
            f"{guidance_block}\n"
        )

        # 3. Append user message to history
        history.append({"role": "user", "content": message})

        # Trim history if too long (keep system prompt + recent messages)
        if len(history) > MAX_HISTORY:
            history[:] = history[-MAX_HISTORY:]

        # 4. Build full message list: system + history
        messages = [{"role": "system", "content": system_prompt}] + history

        # 5. Call Azure OpenAI via Foundry connection
        try:
            completion = await self.client.chat.completions.create(
                model=settings.azure_openai_deployment,
                messages=messages,
                max_tokens=800,
                temperature=0.7,
            )
            response_text = completion.choices[0].message.content or "I'm here for you."
        except Exception as e:
            logger.error("Azure OpenAI call failed: %s", e)
            raise

        # 6. Append assistant response to history
        history.append({"role": "assistant", "content": response_text})

        return (
            thread_id,
            response_text,
            guidance.fresh,
            guidance.state if guidance.state != "unknown" else None,
        )
