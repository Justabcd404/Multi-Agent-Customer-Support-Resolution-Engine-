from app.contracts.types import PipelineState, Resolution, AuditEvent
from app.gateway.call_llm import call_llm

def step_synthesizer(state: PipelineState) -> PipelineState:
    cls = state.classification
    category = cls.category if cls else "support"

    # 1. Category Shortcuts (ADR-013)
    if category == "faq" and cls and cls.faq_answer:
        state.resolution = Resolution(
            summary=cls.faq_answer,
            findings=[f"Matched FAQ article: {cls.faq_label or 'Knowledge Base'}"],
            actions=["Provided instant canned answer."],
            reasoning="Exact match against platform FAQ database.",
            evidence=[f"FAQ Label: {cls.faq_label}"]
        )
        state.audit_trail.append(AuditEvent(
            step="synthesize",
            actor="FaqSynthesizer",
            summary="Synthesized canned FAQ answer",
            kind="rule"
        ))
        return state

    if category == "greeting":
        state.resolution = Resolution(
            summary="Hello! How can I assist you with your orders, billing, technical issues, or product inquiries today?",
            findings=["Customer greeting detected."],
            actions=["Offered customer assistance."],
            reasoning="Polite automated greeting response.",
            evidence=[]
        )
        state.audit_trail.append(AuditEvent(
            step="synthesize",
            actor="GreetingSynthesizer",
            summary="Synthesized greeting message",
            kind="rule"
        ))
        return state

    # 2. Support Resolution Synthesis (Merge agent reports)
    reports = state.agent_reports or []

    all_findings = [f for r in reports for f in r.findings]
    all_actions = [a for r in reports for a in r.actions]
    all_evidence = [e for r in reports for e in r.evidence]
    all_reasoning = " | ".join([f"[{r.domain}]: {r.reasoning}" for r in reports if r.reasoning])

    # If escalated to human agent
    if state.escalation and state.escalation.escalate:
        summary_prefix = f"I've investigated your request across our specialized departments. Due to {state.escalation.reason}, I have escalated your ticket to our {state.escalation.recommended_team} for priority human support."
        all_actions.append(f"Escalated ticket #{state.ticket_id} to human specialist team.")
    else:
        summary_prefix = "Thank you for reaching out. Here is the resolution from our specialist teams:"

    # LLM Synthesis call
    prompt = f"""
    Customer Request: "{state.message}"
    Escalated to Human: {state.escalation.escalate if state.escalation else False}

    Specialist Findings: {all_findings}
    Specialist Actions: {all_actions}
    Specialist Reasoning: {all_reasoning}
    Specialist Evidence: {all_evidence}

    Compose a unified, customer-friendly response summary combining the findings into clear empathetic language.
    Return JSON:
    {{
      "summary": "Clear, empathetic customer reply summarizing all findings...",
      "findings": {all_findings},
      "actions": {all_actions},
      "reasoning": "{all_reasoning}",
      "evidence": {all_evidence}
    }}
    """
    llm_res = call_llm(prompt, system_prompt="Synthesize customer support response.", json_mode=True, temperature=0.3)

    if llm_res and isinstance(llm_res, dict) and "summary" in llm_res:
        state.resolution = Resolution(
            summary=llm_res["summary"],
            findings=llm_res.get("findings", all_findings),
            actions=llm_res.get("actions", all_actions),
            reasoning=all_reasoning,  # Grounded in original agent reports (ADR-012)
            evidence=all_evidence     # Never fabricated
        )
        state.audit_trail.append(AuditEvent(
            step="synthesize",
            actor="LLMSynthesizer",
            summary="Synthesized customer-ready reply with grounded agent evidence",
            kind="llm"
        ))
        return state

    # Heuristic Template Merge Fallback (ADR-012)
    findings_str = "\n• " + "\n• ".join(all_findings) if all_findings else ""
    actions_str = "\n• " + "\n• ".join(all_actions) if all_actions else ""
    full_summary = f"{summary_prefix}\n\n**Findings:**{findings_str}\n\n**Next Steps:**{actions_str}"

    state.resolution = Resolution(
        summary=full_summary,
        findings=all_findings,
        actions=all_actions,
        reasoning=all_reasoning or "Investigated across specialist domain registries.",
        evidence=all_evidence
    )

    state.audit_trail.append(AuditEvent(
        step="synthesize",
        actor="TemplateSynthesizer",
        summary="Synthesized template response from specialist findings",
        kind="heuristic"
    ))

    return state
