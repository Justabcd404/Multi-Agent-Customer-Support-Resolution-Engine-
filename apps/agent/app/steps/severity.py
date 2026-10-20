from app.contracts.types import PipelineState, Severity, AuditEvent

HIGH_KEYWORDS = ["outage", "security", "breach", "locked", "service down", "unauthorized", "compromised"]
MEDIUM_KEYWORDS = ["refund", "charge", "duplicate", "billing", "payment", "delay", "failed checkout"]

def step_severity(state: PipelineState) -> PipelineState:
    reports = state.agent_reports or []
    findings_blob = " ".join([f for r in reports for f in r.findings]).lower()
    evidence_blob = " ".join([e for r in reports for e in r.evidence]).lower()
    combined_blob = f"{findings_blob} {evidence_blob}"

    # Determine Severity Level from Findings (ADR-010)
    if any(k in combined_blob for k in HIGH_KEYWORDS):
        level = "high"
        reasoning = "High severity keywords found in technical/security investigation findings."
    elif any(k in combined_blob for k in MEDIUM_KEYWORDS):
        level = "medium"
        reasoning = "Medium severity monetary or billing keywords present in findings."
    else:
        level = "low"
        reasoning = "Standard low-severity routine request."

    # Priority Calculation (1 = highest priority, 3 = lowest)
    # Base priority: low=3, medium=2, high=1
    base_priority = 1 if level == "high" else (2 if level == "medium" else 3)
    priority_score = base_priority

    # Productive partial check (one agent resolved suppress nudge)
    is_productive_partial = (
        state.investigation and
        state.investigation.overall_status == "partial" and
        any(r.status == "resolved" for r in reports)
    )

    # Sentiment nudge (angry tone adds urgency)
    if state.sentiment and state.sentiment.label in ["angry", "frustrated"] and not is_productive_partial:
        priority_score -= 1

    # Repeat contact nudge
    if state.message_count > 1:
        priority_score -= 1

    # Clamp priority between P1 (1) and P3 (3)
    priority = max(1, min(3, priority_score))

    state.severity = Severity(
        level=level,
        priority=priority,
        reasoning=f"{reasoning} Assigned P{priority} priority."
    )

    state.audit_trail.append(AuditEvent(
        step="severity",
        actor="SeverityRulesEngine",
        summary=f"Severity: {level.upper()}, Priority: P{priority}",
        detail=reasoning,
        kind="rule"
    ))

    return state
