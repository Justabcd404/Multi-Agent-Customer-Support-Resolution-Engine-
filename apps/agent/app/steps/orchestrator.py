import asyncio
import time
from typing import List
from app.contracts.types import PipelineState, AgentReport, Investigation, AuditEvent
from app.agents.runner import run_specialist_agent

async def step_orchestrator(state: PipelineState) -> PipelineState:
    sub_problems = state.sub_problems or []

    if not sub_problems:
        state.agent_reports = []
        state.investigation = Investigation(overall_status="resolved")
        return state

    start_time = time.time()

    # Parallel Fan-Out across all specialist agents using asyncio.gather
    tasks = [run_specialist_agent(sp.domain, sp, state) for sp in sub_problems]
    reports: List[AgentReport] = await asyncio.gather(*tasks)

    wall_clock_ms = int((time.time() - start_time) * 1000)
    sum_parts_ms = sum(r.duration_ms for r in reports)

    state.agent_reports = reports

    # Determine overall investigation status & conflicts
    statuses = [r.status for r in reports]
    if all(s == "resolved" for s in statuses):
        overall = "resolved"
    elif any(s == "resolved" for s in statuses):
        overall = "partial"
    else:
        overall = "unresolved"

    conflicts = []
    # Check if reports contradict each other (e.g. refund amount conflict)
    refund_findings = [f for r in reports for f in r.findings if "refund" in f.lower()]
    if len(refund_findings) > 1 and "denied" in " ".join(refund_findings).lower() and "issued" in " ".join(refund_findings).lower():
        conflicts.append("Conflicting policy findings on refund eligibility between agents.")

    state.investigation = Investigation(
        overall_status=overall,
        conflicts=conflicts
    )

    domains_run = [r.domain for r in reports]
    state.audit_trail.append(AuditEvent(
        step="investigate",
        actor="MultiAgentOrchestrator",
        summary=f"Parallel fan-out completed for [{', '.join(domains_run)}]. Wall-clock: {wall_clock_ms}ms (Sum-of-parts: {sum_parts_ms}ms)",
        detail=f"Overall status: {overall}, conflicts: {len(conflicts)}",
        kind="rule"
    ))

    return state
