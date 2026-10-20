import sys
import asyncio
import json
from app.graph import run_pipeline
from app.steps.guard import step_guard
from app.steps.classifier import step_classifier
from app.steps.sentiment import step_sentiment
from app.steps.decomposer import step_decomposer
from app.contracts.types import PipelineState

async def main():
    if len(sys.argv) < 3:
        print("Usage: python -m app.cli [step|pipeline] [message]")
        print("Examples:")
        print("  python -m app.cli step 'I was charged twice'")
        print("  python -m app.cli pipeline 'Checkout keeps failing and I was charged twice'")
        sys.exit(1)

    mode = sys.argv[1].lower()
    message = " ".join(sys.argv[2:])

    print(f"\n--- Running [{mode}] on: '{message}' ---\n")

    input_data = {
        "run_id": "cli_run_001",
        "ticket_id": "tkt_cli",
        "message": message,
        "message_count": 1,
        "history": []
    }

    if mode == "pipeline":
        state = await run_pipeline(input_data)
        print("\n=== FINAL RESOLUTION ===")
        if state.resolution:
            print(f"SUMMARY: {state.resolution.summary}")
            print(f"FINDINGS: {state.resolution.findings}")
            print(f"ACTIONS: {state.resolution.actions}")
        if state.escalation:
            print(f"\nESCALATION: {state.escalation.escalate} (Team: {state.escalation.recommended_team})")

        print("\n=== AUDIT TRAIL ===")
        for a in state.audit_trail:
            print(f"[{a.step.upper()}] ({a.kind}) {a.summary}")

    elif mode == "step":
        state = PipelineState(run_id="run_step", message=message, ticket_id="tkt_step")
        state = step_guard(state)
        state = step_classifier(state)
        state = step_sentiment(state)
        state = step_decomposer(state)

        print(f"Guard Force Escalation: {state.guard.force_escalation if state.guard else False}")
        print(f"Classifier Primary Intent: {state.classification.primary_intent if state.classification else 'none'}")
        print(f"Sentiment Score: {state.sentiment.score if state.sentiment else 'none'} ({state.sentiment.label if state.sentiment else 'none'})")
        print(f"Sub-Problems: {[sp.domain for sp in state.sub_problems] if state.sub_problems else []}")

if __name__ == "__main__":
    asyncio.run(main())
