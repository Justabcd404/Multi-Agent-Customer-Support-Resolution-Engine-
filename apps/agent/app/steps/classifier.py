import os
import json
from typing import Optional, Dict, Any, List
from app.contracts.types import PipelineState, Classification, IntentItem, AuditEvent
from app.gateway.call_llm import call_llm

CONFIG_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "runtime-config")

def match_faq(message: str) -> Optional[Dict[str, Any]]:
    faq_file = os.path.join(CONFIG_DIR, "faq.json")
    if not os.path.exists(faq_file):
        return None
    try:
        with open(faq_file, "r", encoding="utf-8") as f:
            faqs = json.load(f)
            msg_lower = message.lower()
            for faq in faqs:
                if not faq.get("enabled", True):
                    continue
                match_type = faq.get("match", "contains")
                triggers = faq.get("triggers", [])
                for trig in triggers:
                    trig_lower = trig.lower()
                    if match_type == "exact" and msg_lower == trig_lower:
                        return faq
                    elif match_type == "contains" and trig_lower in msg_lower:
                        return faq
    except Exception:
        pass
    return None

def step_classifier(state: PipelineState) -> PipelineState:
    msg_lower = state.message.lower()

    # 1. FAQ Short-circuit (ADR-013)
    faq_match = match_faq(state.message)
    if faq_match:
        state.classification = Classification(
            primary_intent="faq",
            intents=[IntentItem(type="faq", confidence=1.0)],
            is_multi_issue=False,
            fallback=False,
            category="faq",
            faq_answer=faq_match["answer"],
            faq_label=faq_match["label"]
        )
        state.audit_trail.append(AuditEvent(
            step="classify",
            actor="FaqMatcher",
            summary=f"FAQ matched: '{faq_match['label']}' — short-circuiting pipeline",
            kind="rule"
        ))
        return state

    # 2. Simple Greetings / Out of Scope check
    greetings = ["hi", "hello", "hey", "good morning", "good evening"]
    if msg_lower.strip() in greetings or (len(msg_lower.split()) <= 2 and any(g in msg_lower for g in greetings)):
        state.classification = Classification(
            primary_intent="greeting",
            intents=[IntentItem(type="greeting", confidence=1.0)],
            is_multi_issue=False,
            category="greeting"
        )
        state.audit_trail.append(AuditEvent(
            step="classify",
            actor="GreetingMatcher",
            summary="Greeting intent recognized",
            kind="rule"
        ))
        return state

    # 3. LLM Intent Classification
    prompt = f"""
    Customer Message: "{state.message}"

    Classify into categories: technical, billing, policy, orders, products.
    Return JSON:
    {{
      "primary_intent": "billing",
      "intents": [
        {{"type": "billing", "confidence": 0.9}},
        {{"type": "technical", "confidence": 0.8}}
      ],
      "is_multi_issue": true
    }}
    """
    llm_res = call_llm(prompt, system_prompt="Classify customer support intent.", json_mode=True)

    if llm_res and isinstance(llm_res, dict) and "primary_intent" in llm_res:
        intents_list = [IntentItem(**i) for i in llm_res.get("intents", [])]
        state.classification = Classification(
            primary_intent=llm_res["primary_intent"],
            intents=intents_list,
            is_multi_issue=llm_res.get("is_multi_issue", len(intents_list) > 1),
            fallback=False,
            category="support"
        )
        state.audit_trail.append(AuditEvent(
            step="classify",
            actor="LLMClassifier",
            summary=f"Primary intent: {llm_res['primary_intent']} (multi_issue: {state.classification.is_multi_issue})",
            kind="llm"
        ))
        return state

    # 4. Heuristic Fallback Classifier (ADR-005)
    matched_domains = []
    domain_keywords = {
        "technical": ["login", "crash", "error", "app", "checkout", "fail", "token", "bug"],
        "billing": ["charge", "double", "billed", "refund", "invoice", "payment", "bank", "money"],
        "orders": ["order", "track", "package", "delivery", "shipping", "fedex", "ups", "where"],
        "products": ["stock", "product", "price", "keyboard", "headphones", "spec", "item"],
        "policy": ["return", "cancel", "warranty", "policy", "terms", "guarantee"]
    }

    for dom, kws in domain_keywords.items():
        if any(kw in msg_lower for kw in kws):
            matched_domains.append(dom)

    if not matched_domains:
        matched_domains = ["policy"]

    primary = matched_domains[0]
    intents = [IntentItem(type=d, confidence=0.85) for d in matched_domains]
    is_multi = len(matched_domains) > 1

    state.classification = Classification(
        primary_intent=primary,
        intents=intents,
        is_multi_issue=is_multi,
        fallback=True,
        category="support"
    )
    state.audit_trail.append(AuditEvent(
        step="classify",
        actor="HeuristicClassifier",
        summary=f"Heuristic intents: {', '.join(matched_domains)} (fallback)",
        kind="heuristic"
    ))
    return state
