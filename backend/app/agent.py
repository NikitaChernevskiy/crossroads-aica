"""Microsoft Foundry Agent Service — AI agent with function tools and Foundry threads.

Architecture:
  1. AgentsClient connects directly to the Foundry project endpoint
  2. An agent is created with FunctionTool for get_behavior_guidance
  3. enable_auto_function_calls → SDK auto-invokes the function during runs
  4. Foundry threads hold full conversation history server-side
  5. The MCP server at /mcp still exists for any external MCP-capable agent
"""

import asyncio
import concurrent.futures
import json
import logging
from typing import Optional

from azure.ai.agents import AgentsClient
from azure.ai.agents.models import FunctionTool, ToolSet
from azure.identity import DefaultAzureCredential

from app.config import settings
from app.cosmos import StateStore
from app.rules import BehaviorRulesEngine

logger = logging.getLogger(__name__)

AGENT_INSTRUCTIONS = """\
You are an empathetic AI assistant powered by the AI Emotional Partner system.
You have access to a tool called `get_behavior_guidance` that reads the user's
real-time emotional state from their wellbeing sensors (EEG headband, etc.).

## How to use the tool
- ALWAYS call `get_behavior_guidance` at the START of every turn, passing the
  user_id from the additional instructions.
- If the tool fails or state is stale/unknown, respond warmly and naturally.

## CRITICAL: You MUST obey every returned instruction — especially sentence limits.
The behavior instructions contain HARD CONSTRAINTS on response length expressed
as SENTENCE COUNTS (e.g. "RESPOND IN EXACTLY 2-3 SENTENCES"). These are NOT
suggestions. If the limit says 2-3 sentences, your ENTIRE reply must be 2-3
sentences — no bullet points, no lists, no extra paragraphs. Brevity IS the
adaptation. A "sentence" is one complete thought ending in a period.

## Tone and style adaptation
- Stressed → SHORT, calming, reassuring. Lead with the answer.
- Fatigued → VERY SHORT, gentle, suggest a break. Do not info-dump.
- Focused → detailed, structured, thorough. Go deep.
- Excited → enthusiastic, action-oriented, energetic.
- Meditative → gentle, reflective, unhurried. Mirror the calm.
- Distracted → conclusion FIRST in one sentence, then optional bullets.
- Be genuine and caring, never robotic.
- NEVER mention sensors, brain signals, or the wellbeing system.
"""

# Module-level refs set during init (used by the auto-called function tool)
_store: StateStore | None = None
_engine: BehaviorRulesEngine | None = None


def get_behavior_guidance(user_id: str) -> str:
    """Get behavior instructions for adapting responses based on the user's
    current emotional state from their wellbeing sensors (EEG, heart rate, etc.).
    Call this BEFORE composing your reply to adapt tone and style.

    :param user_id: The user's identifier.
    :return: JSON with state, freshness, age_sec, and instructions list.
    """
    if _store is None or _engine is None:
        return json.dumps({"state": "unknown", "fresh": False, "age_sec": -1,
                           "instructions": ["Respond normally — system not ready"]})
    try:
        # The SDK's create_and_process may already have an event loop running,
        # so asyncio.run() would fail.  Spawn a fresh thread where no loop exists.
        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
            state = pool.submit(asyncio.run, _store.get_current_state(user_id)).result(timeout=10)
        guidance = _engine.evaluate(state)
        return json.dumps(guidance.model_dump())
    except Exception as e:
        logger.warning("get_behavior_guidance failed for %s: %s", user_id, e)
        return json.dumps({"state": "unknown", "fresh": False, "age_sec": -1,
                           "instructions": ["Respond warmly and naturally — sensor data temporarily unavailable"]})


class AgentService:
    """Manages the Foundry agent, threads, and function-tool integration."""

    def __init__(self, store: StateStore, engine: BehaviorRulesEngine) -> None:
        global _store, _engine
        _store = store
        _engine = engine
        self.client: AgentsClient | None = None
        self.agent_id: str | None = None

    def initialize(self) -> None:
        """Create the AgentsClient and register the agent."""
        cred = DefaultAzureCredential()
        self.client = AgentsClient(
            endpoint=settings.foundry_project_endpoint,
            credential=cred,
        )

        # Function tool — SDK auto-invokes get_behavior_guidance during runs
        fn_tool = FunctionTool(functions=[get_behavior_guidance])
        toolset = ToolSet()
        toolset.add(fn_tool)
        self.client.enable_auto_function_calls(toolset)

        # Reuse existing agent or create new one
        for a in self.client.list_agents():
            if a.name == "emotional-partner":
                self.agent_id = a.id
                self.client.update_agent(
                    agent_id=a.id,
                    instructions=AGENT_INSTRUCTIONS,
                    tools=fn_tool.definitions,
                )
                logger.info("Reusing Foundry agent %s", a.id)
                break

        if not self.agent_id:
            agent = self.client.create_agent(
                model=settings.foundry_model_deployment,
                name="emotional-partner",
                instructions=AGENT_INSTRUCTIONS,
                tools=fn_tool.definitions,
            )
            self.agent_id = agent.id
            logger.info("Created Foundry agent %s", agent.id)

    async def chat(
        self,
        user_id: str,
        message: str,
        thread_id: Optional[str] = None,
    ) -> tuple[str, str, bool, Optional[str]]:
        """Process a chat message through the Foundry agent.

        Returns:
            (thread_id, response_text, guidance_used, state_label)
        """
        if self.client is None or self.agent_id is None:
            raise RuntimeError("Agent not initialized")

        def _sync_chat() -> tuple[str, str]:
            # Create or reuse thread (Foundry keeps full history server-side)
            if not thread_id:
                thread = self.client.threads.create()  # type: ignore[union-attr]
                tid = thread.id
            else:
                tid = thread_id

            # Add user message
            self.client.messages.create(thread_id=tid, role="user", content=message)  # type: ignore[union-attr]

            # Run agent — auto function calls handle get_behavior_guidance
            run = self.client.runs.create_and_process(  # type: ignore[union-attr]
                thread_id=tid,
                agent_id=self.agent_id,  # type: ignore[arg-type]
                additional_instructions=f"The current user_id is: {user_id}",
            )

            if run.status == "failed":
                err = getattr(run, "last_error", "unknown error")
                logger.error("Agent run failed: %s", err)
                return tid, f"I had trouble processing that. ({err})"

            # Get assistant's response (returns MessageTextContent | None)
            # MessageTextContent.text is a MessageText with .value and .annotations
            msg = self.client.messages.get_last_message_text_by_role(  # type: ignore[union-attr]
                thread_id=tid, role="assistant"
            )
            if msg and hasattr(msg.text, "value"):
                text = msg.text.value
            elif msg:
                text = str(msg.text)
            else:
                text = "I'm here for you."
            return tid, text

        result_tid, response_text = await asyncio.to_thread(_sync_chat)

        return result_tid, response_text, True, None
