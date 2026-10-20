import os
import json
from app.contracts.types import PipelineState, Escalation, AuditEvent
from app.gateway.call_llm import call_llm

CONFIG_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "runtime-config", "policies.json")

def step_escalation(state: PipelineState) -> PipelineState:
    escalate = False
    reasons = []

    rules = {
        "hard_guard": True,
        "high_severity": True,
        "unresolved": True,
        "conflicts": True,
        "frustration_repeat": True
    }

    if os.path.exists(CONFIG_PATH):
        try:
            with open(CONFIG_PATH, "r", encoding="utf-8") as f:
                cfg = json.load(f)
                rules.update(cfg.get("escalation", {}).get("rules", {}))
        except Exception:
            pass

    reports = state.agent_reports or []
    is_productive_partial = (
        state.investigation and
        state.investigation.overall_status == "partial" and
        any(r.status == "resolved" for r in reports)
    )

    # 1. Hard Guard Signal Check
    if rules.get("hard_guard") and state.guard and state.guard.force_escalation:
        escalate = True
        reasons.append(f"Hard signal trigger: '{state.guard.matched_phrase}'")

    # 2. High Severity Check
    if rules.get("high_severity") and state.severity and state.severity.level == "high":
        escalate = True
        reasons.append("High severity issue detected during specialist investigation.")

    # 3. All Agents Unresolved
    if rules.get("unresolved") and state.investigation and state.investigation.overall_status == "unresolved":
        escalate = True
        reasons.append("Specialist agents could not resolve sub-problems.")

    # 4. Conflicts Check
    if rules.get("conflicts") and state.investigation and state.investigation.conflicts and not is_productive_partial:
        escalate = True
        reasons.append("Conflicting policy or technical findings detected across agents.")

    # 5. Frustration + Repeat Contact
    if rules.get("frustration_repeat") and state.sentiment and state.sentiment.frustration and state.message_count > 1 and not is_productive_partial:
        escalate = True
        reasons.append("Repeat contact with persistent customer frustration.")

    if not escalate:
        state.escalation = Escalation(
            escalate=False,
            reason="All criteria handled autonomously by specialist agents."
        )
        state.audit_trail.append(AuditEvent(
            step="escalation",
            actor="EscalationGateEngine",
            summary="Escalation Gate: PASS (No escalation required)",
            kind="rule"
        ))
        return state

    # Escalate to human agent - Build handoff plan
    primary_intent = state.classification.primary_intent if state.classification else "general"
    team_by_domain = {
        "technical": "Engineering On-call",
        "billing": "Billing Lead",
        "policy": "Policy & Compliance",
        "orders": "Order Operations",
        "products": "Merchandising"
    }
    recommended_team = team_by_domain.get(primary_intent, "Tier 1 Support Team")

    urgency = "high" if (state.severity and state.severity.level == "high") or (state.guard and state.guard.force_escalation) else "medium"

    prompt = f"""
    Ticket escalated due to: {', '.join(reasons)}
    Primary intent: {primary_intent}
    Findings: {[f for r in reports for f in r.findings]}

    Generate human agent handoff plan.
    Return JSON:
    {{
      "recommended_team": "{recommended_team}",
      "urgency": "{urgency}",
      "reason": "{' | '.join(reasons)}",
      "internal_actions": ["Verify identity", "Review double charge invoice"]
    }}
    """
    llm_res = call_llm(prompt, system_prompt="Generate human agent handoff plan.", json_mode=True)

    if llm_res and isinstance(llm_res, dict) and "reason" in llm_res:
        state.escalation = Escalation(
            escalate=True,
            reasons=reasons,
            recommended_team=llm_res.get("recommended_team", recommended_team),
            urgency=llm_res.get("urgency", urgency),
            reason=llm_res.get("reason", " | ".join(reasons)),
            internal_actions=llm_res.get("internal_actions", ["Review ticket history", "Contact customer directly"])
        )
    else:
        state.escalation = Escalation(
            escalate=True,
            reasons=reasons,
            recommended_team=recommended_team,
            urgency=urgency,
            reason=" | ".join(reasons),
            internal_actions=["Review automated investigation findings", "Assigned to department queue"]
        )

    state.audit_trail.append(AuditEvent(
        step="escalation",
        actor="EscalationGateEngine",
        summary=f"Escalation Gate: TRIGGERED -> Handoff to {recommended_team} (Urgency: {urgency})",
        detail=f"Reasons: {' | '.join(reasons)}",
        kind="rule"
    ))

    return state
