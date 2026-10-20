import re
from app.contracts.types import PipelineState, Sentiment, AuditEvent
from app.gateway.call_llm import call_llm

ANGRY_WORDS = ["terrible", "worst", "horrible", "unacceptable", "furious", "mad", "angry", "ridiculous", "hate"]
FRUSTRATED_WORDS = ["third time", "again", "still", "waiting", "delay", "help", "broken", "fail", "useless"]

def step_sentiment(state: PipelineState) -> PipelineState:
    message = state.message
    msg_upper = message.upper()
    words = message.split()

    # 1. Try LLM sentiment
    prompt = f"""
    Analyze customer sentiment in message: "{message}"
    Message count on ticket: {state.message_count}

    Return JSON:
    {{
      "label": "angry" | "frustrated" | "neutral" | "positive",
      "score": 0.85,
      "frustration": true,
      "drivers": ["repeated failure", "all-caps wording"],
      "trend": "rising" | "steady" | "easing"
    }}
    """
    llm_res = call_llm(prompt, system_prompt="Analyze conversation sentiment.", json_mode=True)

    if llm_res and isinstance(llm_res, dict) and "label" in llm_res:
        state.sentiment = Sentiment(
            label=llm_res.get("label", "neutral"),
            score=float(llm_res.get("score", 0.0)),
            frustration=bool(llm_res.get("frustration", False)),
            drivers=llm_res.get("drivers", []),
            trend=llm_res.get("trend", "steady")
        )
        state.audit_trail.append(AuditEvent(
            step="sentiment",
            actor="LLMSentimentAnalyzer",
            summary=f"Sentiment: {state.sentiment.label} (score: {state.sentiment.score}, frustration: {state.sentiment.frustration})",
            kind="llm"
        ))
        return state

    # 2. Heuristic Sentiment Analysis (LLD §9)
    score = 0.0
    drivers = []

    # Angry word detection
    for w in ANGRY_WORDS:
        if w in message.lower():
            score += 0.5
            drivers.append(f"Angry tone word: '{w}'")

    # Frustrated word detection
    for w in FRUSTRATED_WORDS:
        if w in message.lower():
            score += 0.3
            drivers.append(f"Frustration indicator: '{w}'")

    # Exclamations
    excl_count = message.count("!")
    if excl_count > 0:
        score += min(0.3, excl_count * 0.1)
        drivers.append(f"Multiple exclamation marks ({excl_count})")

    # ALL CAPS detection
    caps_words = [w for w in words if len(w) > 2 and w.isupper()]
    if len(caps_words) >= 2:
        score += min(0.3, len(caps_words) * 0.1)
        drivers.append(f"ALL-CAPS words: {', '.join(caps_words[:3])}")

    # Repeat contact nudge
    if state.message_count > 1:
        score += 0.15
        drivers.append(f"Repeat contact (turn #{state.message_count})")

    score = round(min(1.0, score), 2)
    frustration = score >= 0.35

    if score >= 0.7:
        label = "angry"
    elif score >= 0.35:
        label = "frustrated"
    else:
        label = "neutral"

    state.sentiment = Sentiment(
        label=label,
        score=score,
        frustration=frustration,
        drivers=drivers,
        trend="rising" if state.message_count > 1 and score > 0.4 else "steady"
    )

    state.audit_trail.append(AuditEvent(
        step="sentiment",
        actor="HeuristicSentimentAnalyzer",
        summary=f"Heuristic sentiment: {label} (score: {score})",
        kind="heuristic"
    ))

    return state
