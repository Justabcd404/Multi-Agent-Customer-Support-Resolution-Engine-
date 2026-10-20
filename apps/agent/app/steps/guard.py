import os
import json
import re
from app.contracts.types import PipelineState, Guard, AuditEvent

CONFIG_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "runtime-config", "policies.json")

def step_guard(state: PipelineState) -> PipelineState:
    message_lower = state.message.lower()
    signals = []

    if os.path.exists(CONFIG_PATH):
        try:
            with open(CONFIG_PATH, "r", encoding="utf-8") as f:
                cfg = json.load(f)
                signals = cfg.get("guard", {}).get("signals", [])
        except Exception:
            pass

    if not signals:
        signals = [
            {"phrase": "talk to a manager", "enabled": True},
            {"phrase": "chargeback", "enabled": True},
            {"phrase": "sue", "enabled": True},
            {"phrase": "lawyer", "enabled": True}
        ]

    matched_phrase = None
    for sig in signals:
        if sig.get("enabled", True):
            phrase = sig.get("phrase", "").lower()
            if phrase and phrase in message_lower:
                matched_phrase = phrase
                break

    if matched_phrase:
        state.guard = Guard(
            force_escalation=True,
            matched_phrase=matched_phrase,
            reason=f"Hard guard signal phrase detected: '{matched_phrase}'"
        )
        state.audit_trail.append(AuditEvent(
            step="guard",
            actor="GuardRuleEngine",
            summary=f"Hard signal triggered: '{matched_phrase}'",
            detail="Forcing human escalation path",
            kind="rule"
        ))
    else:
        state.guard = Guard(force_escalation=False)
        state.audit_trail.append(AuditEvent(
            step="guard",
            actor="GuardRuleEngine",
            summary="No hard guard signals detected",
            kind="rule"
        ))

    return state
