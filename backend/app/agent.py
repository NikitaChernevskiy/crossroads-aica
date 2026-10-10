"""AI Foundry Agent Service — manages the AI assistant, threads, and tool calls.

Architecture:
  1. An Assistant is created in the Azure AI Foundry project with function tools
  2. Each conversation gets a Thread (maintains full chat history server-side)
  3. When the user sends a message, a Run is created on the thread
  4. The assistant may call `get_behavior_guidance` tool → backend evaluates rules
  5. The assistant uses the guidance to adapt its response tone/style/length
"""

import json
import logging
from typing import Optional

from openai import AsyncAzureOpenAI

from app.config import settings
from app.cosmos import StateStore
from app.rules import BehaviorRulesEngine

logger = logging.getLogger(__name__)

ASSISTANT_INSTRUCTIONS = """\
You are an empathetic AI assistant powered by the AI Emotional Partner system.
You have access to a tool called `get_behavior_guidance` that reads the user's
real-time emotional state from their wellbeing sensors (EEG headband, etc.) and
returns behavior instructions you MUST follow.

## How to Use the Tool
- Call `get_behavior_guidance` at the START of every conversation turn before you
  compose your reply. Pass the user_id you receive.
- Read the returned `instructions` array and follow every instruction.
- If the state is `stale` or `unknown`, respond normally but warmly.

## Core Principles
- Be genuine and caring, never robotic.
- Adapt your tone, length, and complexity per the instructions.
- If the user is stressed → be calming and concise.
- If the user is focused → match their energy with clear, structured responses.
- If the user is fatigued → be gentle and offer to simplify.
- Never explicitly say you are reading brain signals — just naturally adapt.
- You may acknowledge the user's mood casually if appropriate ("You seem calm today").
"""

BEHAVIOR_TOOL = {
    "type": "function",
    "function": {
        "name": "get_behavior_guidance",
        "description": (
            "Get behavior instructions for adapting your response based on the "
            "user's current emotional state from their wellbeing sensors. "
            "ALWAYS call this tool before composing your reply."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "user_id": {
                    "type": "string",
                    "description": "The user's identifier",
                }
            },
            "required": ["user_id"],
        },
    },
}


class AgentService:
    """Manages the AI Foundry Assistant, threads, and function-tool calls."""

    def __init__(
        self,
        openai_client: AsyncAzureOpenAI,
        store: StateStore,
        engine: BehaviorRulesEngine,
    ) -> None:
        self.client = openai_client
        self.store = store
        self.engine = engine
        self.assistant_id: str | None = None

    async def initialize(self) -> None:
        """Create (or reuse) the AI Assistant in Azure OpenAI."""
        # Check for an existing assistant we created earlier
        try:
            assistants = await self.client.beta.assistants.list(limit=20)
            for a in assistants.data:
                if a.name == "AI Emotional Partner":
                    self.assistant_id = a.id
                    logger.info("Reusing existing assistant %s", a.id)
                    # Update instructions in case they changed
                    await self.client.beta.assistants.update(
                        assistant_id=a.id,
                        instructions=ASSISTANT_INSTRUCTIONS,
                        tools=[BEHAVIOR_TOOL],
                    )
                    return
        except Exception as e:
            logger.warning("Could not list assistants: %s", e)

        # Create new assistant
        assistant = await self.client.beta.assistants.create(
            model=settings.azure_openai_deployment,
            name="AI Emotional Partner",
            instructions=ASSISTANT_INSTRUCTIONS,
            tools=[BEHAVIOR_TOOL],
        )
        self.assistant_id = assistant.id
        logger.info("Created new assistant %s", assistant.id)

    async def chat(
        self,
        user_id: str,
        message: str,
        thread_id: Optional[str] = None,
    ) -> tuple[str, str, bool, Optional[str]]:
        """Process a chat message through the AI Agent.

        Returns:
            (thread_id, response_text, guidance_used, state_label)
        """
        if self.assistant_id is None:
            raise RuntimeError("Agent not initialized")

        # 1. Create or reuse thread
        if thread_id:
            # Verify thread exists
            try:
                await self.client.beta.threads.retrieve(thread_id)
            except Exception:
                logger.warning("Thread %s not found, creating new one", thread_id)
                thread_id = None

        if not thread_id:
            thread = await self.client.beta.threads.create()
            thread_id = thread.id
            logger.info("Created new thread %s for user %s", thread_id, user_id)

        # 2. Add user message to thread
        await self.client.beta.threads.messages.create(
            thread_id=thread_id,
            role="user",
            content=message,
        )

        # 3. Create a run (assistant processes the thread)
        run = await self.client.beta.threads.runs.create(
            thread_id=thread_id,
            assistant_id=self.assistant_id,
            # Pass user_id as additional context
            additional_instructions=f"The current user_id is: {user_id}",
        )

        # 4. Poll until completion, handling tool calls
        guidance_used = False
        state_label = None

        while True:
            run = await self.client.beta.threads.runs.retrieve(
                thread_id=thread_id,
                run_id=run.id,
            )

            if run.status == "completed":
                break
            elif run.status == "requires_action":
                # Handle tool calls
                tool_outputs = []
                for tc in run.required_action.submit_tool_outputs.tool_calls:
                    output, used, label = await self._handle_tool_call(tc)
                    tool_outputs.append(
                        {"tool_call_id": tc.id, "output": output}
                    )
                    if used:
                        guidance_used = True
                        state_label = label

                run = await self.client.beta.threads.runs.submit_tool_outputs(
                    thread_id=thread_id,
                    run_id=run.id,
                    tool_outputs=tool_outputs,
                )
            elif run.status in ("failed", "cancelled", "expired"):
                error_msg = getattr(run, "last_error", None)
                logger.error("Run %s failed: %s — %s", run.id, run.status, error_msg)
                raise RuntimeError(f"Agent run {run.status}: {error_msg}")
            else:
                # Still in progress (queued, in_progress, cancelling)
                import asyncio
                await asyncio.sleep(0.5)

        # 5. Get the assistant's response (latest message)
        messages = await self.client.beta.threads.messages.list(
            thread_id=thread_id,
            order="desc",
            limit=1,
        )
        if messages.data:
            response_text = messages.data[0].content[0].text.value
        else:
            response_text = "I'm here for you."

        return thread_id, response_text, guidance_used, state_label

    async def _handle_tool_call(self, tool_call) -> tuple[str, bool, Optional[str]]:
        """Process a function tool call from the assistant.

        Returns:
            (json_output, guidance_used, state_label)
        """
        fn_name = tool_call.function.name
        try:
            args = json.loads(tool_call.function.arguments)
        except json.JSONDecodeError:
            args = {}

        if fn_name == "get_behavior_guidance":
            user_id = args.get("user_id", "")
            state = await self.store.get_current_state(user_id)
            guidance = self.engine.evaluate(state)
            return (
                json.dumps(guidance.model_dump()),
                guidance.fresh,
                guidance.state if guidance.state != "unknown" else None,
            )
        else:
            logger.warning("Unknown tool call: %s", fn_name)
            return json.dumps({"error": f"Unknown tool: {fn_name}"}), False, None
