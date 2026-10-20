from typing import List, Optional, Dict, Any, Literal
from pydantic import BaseModel, Field
from datetime import datetime

class Message(BaseModel):
    role: Literal["customer", "agent", "system"]
    text: str
    created_at: Optional[str] = None

class PriorRunContext(BaseModel):
    summary: Optional[str] = None
    domain: Optional[str] = None
    resolved: Optional[bool] = None

class Guard(BaseModel):
    force_escalation: bool = False
    matched_phrase: Optional[str] = None
    reason: Optional[str] = None

class IntentItem(BaseModel):
    type: str
    confidence: float

class Classification(BaseModel):
    primary_intent: str = "general"
    intents: List[IntentItem] = Field(default_factory=list)
    is_multi_issue: bool = False
    fallback: bool = False
    category: str = "support"  # "greeting" | "faq" | "out_of_scope" | "support"
    faq_answer: Optional[str] = None
    faq_label: Optional[str] = None

class Sentiment(BaseModel):
    label: str = "neutral"  # "angry" | "frustrated" | "neutral" | "positive"
    score: float = 0.0
    frustration: bool = False
    drivers: List[str] = Field(default_factory=list)
    trend: str = "steady"  # "rising" | "steady" | "easing"

class SubProblem(BaseModel):
    id: str
    domain: str
    description: str

class AgentReport(BaseModel):
    domain: str
    status: str = "resolved"  # "resolved" | "partial" | "unresolved" | "failed"
    findings: List[str] = Field(default_factory=list)
    actions: List[str] = Field(default_factory=list)
    reasoning: str = ""
    evidence: List[str] = Field(default_factory=list)
    confidence: float = 1.0
    duration_ms: int = 0

class Investigation(BaseModel):
    overall_status: str = "resolved"  # "resolved" | "partial" | "unresolved"
    conflicts: List[str] = Field(default_factory=list)

class Severity(BaseModel):
    level: str = "low"  # "high" | "medium" | "low"
    priority: int = 3   # 1 (P1) | 2 (P2) | 3 (P3)
    reasoning: str = ""

class Escalation(BaseModel):
    escalate: bool = False
    reasons: List[str] = Field(default_factory=list)
    recommended_team: str = "Tier 1 Support"
    urgency: str = "low"
    assigned_agent: Optional[str] = None
    reason: str = ""
    internal_actions: List[str] = Field(default_factory=list)

class Resolution(BaseModel):
    summary: str = ""
    findings: List[str] = Field(default_factory=list)
    actions: List[str] = Field(default_factory=list)
    reasoning: str = ""
    evidence: List[str] = Field(default_factory=list)

class AuditEvent(BaseModel):
    step: str
    actor: str
    summary: str
    detail: Optional[str] = None
    kind: Literal["llm", "heuristic", "rule"]
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")

class PipelineState(BaseModel):
    run_id: str
    message: str
    ticket_id: str
    customer_id: Optional[str] = "cust_default"
    message_count: int = 1
    history: List[Message] = Field(default_factory=list)
    prior_context: Optional[PriorRunContext] = None

    # Step outputs
    guard: Optional[Guard] = None
    classification: Optional[Classification] = None
    sentiment: Optional[Sentiment] = None
    sub_problems: Optional[List[SubProblem]] = None
    agent_reports: Optional[List[AgentReport]] = None
    investigation: Optional[Investigation] = None
    severity: Optional[Severity] = None
    escalation: Optional[Escalation] = None
    resolution: Optional[Resolution] = None

    audit_trail: List[AuditEvent] = Field(default_factory=list)
