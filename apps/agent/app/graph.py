import json
import logging
from typing import Dict, Any, AsyncGenerator
from app.contracts.types import PipelineState, Message, PriorRunContext
from app.steps.guard import step_guard
from app.steps.classifier import step_classifier
from app.steps.sentiment import step_sentiment
from app.steps.decomposer import step_decomposer
from app.steps.orchestrator import step_orchestrator
from app.steps.severity import step_severity
from app.steps.escalation import step_escalation
from app.steps.synthesizer import step_synthesizer

logger = logging.getLogger("agent_graph")

def create_pipeline_state(input_data: Dict[str, Any]) -> PipelineState:
    history_items = []
    for h in input_data.get("history", []):
        if isinstance(h, dict):
            history_items.append(Message(**h))

    prior_ctx = None
    if input_data.get("prior_context"):
        prior_ctx = PriorRunContext(**input_data["prior_context"])

    return PipelineState(
        run_id=input_data.get("run_id", f"run_{input_data.get('ticket_id', 'tkt_001')}"),
        message=input_data.get("message", ""),
        ticket_id=input_data.get("ticket_id", "tkt_001"),
        customer_id=input_data.get("customer_id", "cust_001"),
        message_count=input_data.get("message_count", 1),
        history=history_items,
        prior_context=prior_ctx
    )

async def run_pipeline(input_data: Dict[str, Any]) -> PipelineState:
    state = create_pipeline_state(input_data)

    try:
        # LangGraph StateGraph / Sequential node execution (ADR-002)
        state = step_guard(state)
        state = step_classifier(state)
        state = step_sentiment(state)

        # Short-circuit check for FAQ or Greeting
        if state.classification and state.classification.category in ["faq", "greeting"]:
            state = step_synthesizer(state)
            return state

        state = step_decomposer(state)
        state = await step_orchestrator(state)
        state = step_severity(state)
        state = step_escalation(state)
        state = step_synthesizer(state)

    except Exception as e:
        logger.error(f"Pipeline error, executing fallback: {e}", exc_info=True)

    return state

async def run_pipeline_stream(input_data: Dict[str, Any]) -> AsyncGenerator[str, None]:
    state = create_pipeline_state(input_data)

    steps = [
        ("guard", step_guard),
        ("classify", step_classifier),
        ("sentiment", step_sentiment),
        ("decompose", step_decomposer),
        ("investigate", step_orchestrator),
        ("severity", step_severity),
        ("escalation", step_escalation),
        ("synthesize", step_synthesizer),
    ]

    for step_name, step_fn in steps:
        yield json.dumps({
            "type": "progress",
            "step": step_name,
            "message": f"Running step: {step_name}"
        }) + "\n"

        if step_name == "investigate":
            state = await step_orchestrator(state)
        else:
            state = step_fn(state)

        # Emit snapshot after each step
        yield json.dumps({
            "type": "step_done",
            "step": step_name,
            "audit": [a.model_dump() for a in state.audit_trail[-1:]]
        }) + "\n"

        # Check for FAQ / Greeting short-circuit
        if step_name == "classify" and state.classification and state.classification.category in ["faq", "greeting"]:
            state = step_synthesizer(state)
            yield json.dumps({
                "type": "step_done",
                "step": "synthesize",
                "audit": [a.model_dump() for a in state.audit_trail[-1:]]
            }) + "\n"
            break

    yield json.dumps({
        "type": "done",
        "state": state.model_dump()
    }) + "\n"
