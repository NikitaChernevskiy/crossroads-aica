"""Microsoft Foundry Agent Service — AI agent with function tools and Foundry threads.

Architecture:
  1. AgentsClient connects directly to the Foundry project endpoint
  2. An agent is created with FunctionTool for get_behavior_guidance
  3. enable_auto_function_calls → SDK auto-invokes the function during runs
  4. Foundry threads hold full conversation history server-side
  5. The MCP server at /mcp still exists for any external MCP-capable agent
"""

import asyncio
import json
import logging
from typing import Optional

from azure.ai.agents import AgentsClient
from azure.ai.agents.models import FunctionTool, ToolSet
from azure.identity import DefaultAzureCredential
from opentelemetry import trace

from app.config import settings
from app.cosmos import StateStore
from app.rules import BehaviorRulesEngine

logger = logging.getLogger(__name__)
tracer = trace.get_tracer(__name__, "0.1.0")

AGENT_INSTRUCTIONS = """\
You are an empathetic AI assistant powered by the AI Emotional Partner system.
You have access to a tool called `get_behavior_guidance` that reads the user's
real-time emotional state from their wellbeing sensors (EEG headband, etc.).

## How to use the tool
- ALWAYS call `get_behavior_guidance` at the START of every turn, passing the
  user_id from the additional instructions.
- If the tool fails or state is stale/unknown, respond warmly and naturally.

## CRITICAL RULES — read these before EVERY reply

### 1. Follow the FORMAT and TEMPLATE exactly
The behavior instructions include a FORMAT (sentence count, structure) and a
TEMPLATE (what each part should contain). Follow them literally. If the format
says "1 sentence + 3 bullets" then output exactly that structure.

### 2. COUNT before you write
Before writing, decide exactly how many sentences you will write based on the
FORMAT rule. Then write exactly that many. If it says 2, write 2. If it says
2-3, write 2 or 3. NEVER exceed the upper limit.

### 3. Change your VOICE, not just your length
This is the most important rule. Each mood has a distinct personality:
- Stressed → You are a calm, reassuring friend. Simple words. Warm opener.
- Fatigued → You are a caring friend who notices they're tired. Soft and gentle.
- Focused → You are a brilliant teacher. Structured, thorough, confident.
- Excited → You are an enthusiastic friend sharing something amazing! Use '!' marks.
- Meditative → You are a thoughtful companion on a quiet walk. Wonder > precision.
- Distracted → You are a helpful assistant giving a quick summary card.

### 4. Never mention the system
- NEVER mention sensors, brain signals, EEG, emotional state, or the wellbeing system.
- NEVER say "I notice you're feeling..." or reference the user's mood.
- Simply BE the appropriate voice naturally.
"""

# Module-level refs set during init (used by the auto-called function tool)
_store: StateStore | None = None
_engine: BehaviorRulesEngine | None = None
_main_loop: asyncio.AbstractEventLoop | None = None  # main event loop for cross-thread Cosmos calls
_last_guidance_ok: bool = False  # tracks whether the last guidance call succeeded
_last_state_label: str | None = None  # tracks the state label from the last successful guidance call


def get_behavior_guidance(user_id: str) -> str:
    """Get behavior instructions for adapting responses based on the user's
    current emotional state from their wellbeing sensors (EEG, heart rate, etc.).
    Call this BEFORE composing your reply to adapt tone and style.

    :param user_id: The user's identifier.
    :return: JSON with state, freshness, age_sec, and instructions list.
    """
    global _last_guidance_ok, _last_state_label
    _last_guidance_ok = False
    _last_state_label = None

    if _store is None or _engine is None:
        return json.dumps({"state": "unknown", "fresh": False, "age_sec": -1,
                           "instructions": ["Respond normally — system not ready"]})

    with tracer.start_as_current_span(
        "get_behavior_guidance",
        attributes={"user_id": user_id, "component": "foundry_function_tool"},
    ) as span:
        try:
            # Schedule the async Cosmos query on the MAIN event loop (where the
            # async CosmosClient was created).  Using asyncio.run() in a worker
            # thread would create a NEW event loop, and the Cosmos aiohttp session
            # is bound to the original loop — causing silent failures.
            if _main_loop is None or _main_loop.is_closed():
                raise RuntimeError("Main event loop not available")
            future = asyncio.run_coroutine_threadsafe(
                _store.get_current_state(user_id), _main_loop
            )
            state = future.result(timeout=10)

            guidance = _engine.evaluate(state)
            _last_guidance_ok = guidance.fresh
            _last_state_label = guidance.state if guidance.fresh else None

            span.set_attribute("guidance.state", guidance.state)
            span.set_attribute("guidance.fresh", guidance.fresh)
            span.set_attribute("guidance.age_sec", guidance.age_sec)
            span.set_status(trace.StatusCode.OK)

            logger.info(
                "[GUIDANCE] user=%s state=%s fresh=%s age=%ds instructions=%s",
                user_id, guidance.state, guidance.fresh, guidance.age_sec,
                guidance.instructions[:1],  # first instruction as preview
            )
            return json.dumps(guidance.model_dump())
        except Exception as e:
            span.set_status(trace.StatusCode.ERROR, str(e))
            span.record_exception(e)
            logger.warning("get_behavior_guidance FAILED for %s: %s", user_id, e, exc_info=True)
            return json.dumps({"state": "unknown", "fresh": False, "age_sec": -1,
                               "instructions": ["Respond warmly and naturally — sensor data temporarily unavailable"]})


class AgentService:
    """Manages the Foundry agent, threads, and function-tool integration."""

    def __init__(self, store: StateStore, engine: BehaviorRulesEngine) -> None:
        global _store, _engine, _main_loop
        _store = store
        _engine = engine
        # Capture the main event loop so get_behavior_guidance can schedule
        # async Cosmos queries on it from the SDK's worker thread.
        try:
            _main_loop = asyncio.get_running_loop()
        except RuntimeError:
            _main_loop = asyncio.get_event_loop()
        logger.info("[AGENT] Captured main event loop: %s", _main_loop)
        self.client: AgentsClient | None = None
        self.agent_id: str | None = None

    def initialize(self) -> None:
        """Create the AgentsClient and register the agent."""
        with tracer.start_as_current_span(
            "foundry_agent_initialize",
            attributes={"component": "foundry_agent"},
        ) as span:
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
                    span.set_attribute("agent.reused", True)
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
                span.set_attribute("agent.reused", False)

            span.set_attribute("agent.id", self.agent_id or "unknown")
            span.set_status(trace.StatusCode.OK)

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
            with tracer.start_as_current_span(
                "foundry_agent_chat",
                attributes={
                    "user_id": user_id,
                    "thread.reused": bool(thread_id),
                    "component": "foundry_agent",
                },
            ) as span:
                # Create or reuse thread (Foundry keeps full history server-side)
                if not thread_id:
                    thread = self.client.threads.create()  # type: ignore[union-attr]
                    tid = thread.id
                else:
                    tid = thread_id
                span.set_attribute("thread.id", tid)

                # Add user message
                self.client.messages.create(thread_id=tid, role="user", content=message)  # type: ignore[union-attr]

                # Run agent — auto function calls handle get_behavior_guidance
                run = self.client.runs.create_and_process(  # type: ignore[union-attr]
                    thread_id=tid,
                    agent_id=self.agent_id,  # type: ignore[arg-type]
                    additional_instructions=f"The current user_id is: {user_id}",
                )
                span.set_attribute("run.id", run.id)
                span.set_attribute("run.status", run.status)

                if run.status == "failed":
                    err = getattr(run, "last_error", "unknown error")
                    logger.error("Agent run failed: %s", err)
                    span.set_status(trace.StatusCode.ERROR, str(err))
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

                span.set_attribute("response.length", len(text))
                span.set_status(trace.StatusCode.OK)
                return tid, text

        result_tid, response_text = await asyncio.to_thread(_sync_chat)

        return result_tid, response_text, _last_guidance_ok, _last_state_label
