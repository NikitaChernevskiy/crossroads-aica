"""Behavior rules engine — maps emotional state to agent instructions."""

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from app.config import settings
from app.models import BehaviorGuidance, StoredState

# Default rules file path
RULES_PATH = Path(__file__).parent.parent / "behavior_rules.json"


class BehaviorRulesEngine:
    """Evaluates emotional state against configurable rules to produce agent instructions."""

    def __init__(self, rules_path: Optional[Path] = None) -> None:
        self._rules_path = rules_path or RULES_PATH
        self._rules: dict = {}
        self._load_rules()

    def _load_rules(self) -> None:
        with open(self._rules_path) as f:
            self._rules = json.load(f)

    def reload(self) -> None:
        """Hot-reload rules from disk."""
        self._load_rules()

    def evaluate(self, state: Optional[StoredState]) -> BehaviorGuidance:
        """Evaluate the current state and return behavior guidance."""

        # No state available
        if state is None:
            return BehaviorGuidance(
                state="unknown",
                fresh=False,
                age_sec=-1,
                instructions=self._rules.get("default_instructions", [
                    "Respond normally — no emotional context available"
                ]),
            )

        # Calculate freshness
        now = datetime.now(timezone.utc)
        state_time = state.timestamp.replace(tzinfo=timezone.utc) if state.timestamp.tzinfo is None else state.timestamp
        age_sec = int((now - state_time).total_seconds())
        fresh = age_sec <= settings.state_freshness_seconds

        # Stale data → default mode
        if not fresh:
            return BehaviorGuidance(
                state=state.label,
                fresh=False,
                age_sec=age_sec,
                instructions=self._rules.get("stale_instructions", [
                    "State data is stale — respond normally",
                    "Optionally mention that the wellbeing device may be disconnected",
                ]),
            )

        # Evaluate rules in priority order
        instructions = self._match_rules(state)

        return BehaviorGuidance(
            state=state.label,
            fresh=True,
            age_sec=age_sec,
            instructions=instructions,
        )

    def _match_rules(self, state: StoredState) -> list[str]:
        """Match state against rules — return ONLY the single best-priority rule.

        Lower priority number = higher importance.  Returning instructions from
        multiple rules caused conflicting guidance (e.g. "be brief" + "go deep")
        that the LLM could not satisfy.  Single-rule selection keeps instructions
        coherent and enforceable.
        """
        rules = self._rules.get("rules", [])

        best_rule: dict | None = None
        best_priority = float("inf")

        for rule in rules:
            priority = rule.get("priority", 99)
            if priority < best_priority and self._rule_matches(rule, state):
                best_rule = rule
                best_priority = priority

        if best_rule:
            return best_rule.get("instructions", [])

        # No rules matched — use calm/focused default
        return self._rules.get("default_fresh_instructions", [
            "User appears balanced — respond with normal detail and tone"
        ])

    def _rule_matches(self, rule: dict, state: StoredState) -> bool:
        """Check if a single rule's conditions match the state."""
        conditions = rule.get("conditions", {})

        for field, constraint in conditions.items():
            value = getattr(state, field, None)
            if value is None:
                return False

            if isinstance(constraint, dict):
                if "gte" in constraint and value < constraint["gte"]:
                    return False
                if "lte" in constraint and value > constraint["lte"]:
                    return False
                if "gt" in constraint and value <= constraint["gt"]:
                    return False
                if "lt" in constraint and value >= constraint["lt"]:
                    return False
            elif isinstance(constraint, str):
                if value != constraint:
                    return False

        return True
