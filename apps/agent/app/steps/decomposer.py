import re
from typing import List
from app.contracts.types import PipelineState, SubProblem, AuditEvent
from app.gateway.call_llm import call_llm

def step_decomposer(state: PipelineState) -> PipelineState:
    # 1. Hard-signal shortcut (Architecture §6)
    if state.guard and state.guard.force_escalation:
        state.sub_problems = [
            SubProblem(id="SP-1", domain="policy", description=state.message)
        ]
        state.audit_trail.append(AuditEvent(
            step="decompose",
            actor="HardSignalDecomposer",
            summary="Hard guard triggered: routed directly to Policy/Escalation specialist",
            kind="rule"
        ))
        return state

    cls = state.classification
    if not cls:
        state.sub_problems = [SubProblem(id="SP-1", domain="policy", description=state.message)]
        return state

    # If single intent or greeting/faq
    if not cls.is_multi_issue or len(cls.intents) <= 1:
        domain = cls.primary_intent if cls.primary_intent not in ["greeting", "faq"] else "policy"
        state.sub_problems = [
            SubProblem(id="SP-1", domain=domain, description=state.message)
        ]
        state.audit_trail.append(AuditEvent(
            step="decompose",
            actor="SingleIntentDecomposer",
            summary=f"Single problem identified for domain '{domain}'",
            kind="rule"
        ))
        return state

    # 2. Try LLM Decomposition
    domains_str = ", ".join([i.type for i in cls.intents])
    prompt = f"""
    Customer Message: "{state.message}"
    Identified Domains: {domains_str}

    Split into distinct sub-problems for each domain.
    Return JSON:
    [
      {{"id": "SP-1", "domain": "technical", "description": "Checkout page keeps crashing"}},
      {{"id": "SP-2", "domain": "billing", "description": "Was charged twice for order"}}
    ]
    """
    llm_res = call_llm(prompt, system_prompt="Split multi-intent support request.", json_mode=True)

    if llm_res and isinstance(llm_res, list) and len(llm_res) > 0:
        sp_list = [SubProblem(**sp) for sp in llm_res]
        state.sub_problems = sp_list
        state.audit_trail.append(AuditEvent(
            step="decompose",
            actor="LLMDecomposer",
            summary=f"Decomposed into {len(sp_list)} parallel sub-problems: {', '.join([sp.domain for sp in sp_list])}",
            kind="llm"
        ))
        return state

    # 3. Heuristic Clause-Splitting Fallback
    intents = [i.type for i in cls.intents]
    sub_problems = []

    # Split message by clauses ("and", "also", "plus", ",")
    clauses = re.split(r'\band\b|\balso\b|\bplus\b|;', state.message, flags=re.IGNORECASE)

    for idx, domain in enumerate(intents):
        matched_clause = state.message
        for clause in clauses:
            if domain == "technical" and any(k in clause.lower() for k in ["login", "crash", "error", "checkout"]):
                matched_clause = clause.strip()
                break
            elif domain == "billing" and any(k in clause.lower() for k in ["charge", "billed", "refund", "invoice", "twice"]):
                matched_clause = clause.strip()
                break
            elif domain == "orders" and any(k in clause.lower() for k in ["track", "order", "delivery", "shipping"]):
                matched_clause = clause.strip()
                break
            elif domain == "products" and any(k in clause.lower() for k in ["stock", "price", "keyboard", "headphones"]):
                matched_clause = clause.strip()
                break

        sub_problems.append(SubProblem(
            id=f"SP-{idx+1}",
            domain=domain,
            description=matched_clause
        ))

    state.sub_problems = sub_problems
    state.audit_trail.append(AuditEvent(
        step="decompose",
        actor="HeuristicDecomposer",
        summary=f"Heuristic decomposed into {len(sub_problems)} sub-problems",
        kind="heuristic"
    ))

    return state
