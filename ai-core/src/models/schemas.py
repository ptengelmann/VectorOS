"""
Pydantic models for type-safe data validation
Enterprise-grade schemas with comprehensive validation
"""
from datetime import datetime
from enum import Enum
from typing import Any, Optional
from pydantic import BaseModel, Field, field_validator, ConfigDict


# ============================================================================
# Enums
# ============================================================================

class DealStage(str, Enum):
    """Sales pipeline stages"""
    LEAD = "lead"
    QUALIFIED = "qualified"
    PROPOSAL = "proposal"
    NEGOTIATION = "negotiation"
    WON = "won"
    LOST = "lost"


class Priority(str, Enum):
    """Priority levels"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class InsightType(str, Enum):
    """Types of AI insights"""
    RECOMMENDATION = "recommendation"
    WARNING = "warning"
    PREDICTION = "prediction"
    OPPORTUNITY = "opportunity"
    RISK = "risk"


class AgentType(str, Enum):
    """AI agent types"""
    STRATEGIC_ANALYST = "strategic_analyst"
    DEAL_INTELLIGENCE = "deal_intelligence"
    PROPOSAL_GENERATOR = "proposal_generator"
    FORECASTER = "forecaster"
    GROWTH_ADVISOR = "growth_advisor"


# ============================================================================
# Request Models
# ============================================================================

class ChatRequest(BaseModel):
    """Chat completion request"""
    model_config = ConfigDict(str_strip_whitespace=True)

    message: str = Field(..., min_length=1, max_length=10000)
    workspace_id: str = Field(..., min_length=1)
    user_id: Optional[str] = None
    context: dict[str, Any] = Field(default_factory=dict)
    stream: bool = Field(default=False)

    @field_validator("message")
    @classmethod
    def validate_message(cls, v: str) -> str:
        if not v or v.isspace():
            raise ValueError("Message cannot be empty or whitespace")
        return v


class DealAnalysisRequest(BaseModel):
    """Request for deal intelligence analysis"""
    model_config = ConfigDict(str_strip_whitespace=True)

    workspace_id: str
    deal_id: Optional[str] = None
    deals: Optional[list[dict[str, Any]]] = None
    analysis_depth: str = Field(default="standard")  # quick, standard, deep

    @field_validator("analysis_depth")
    @classmethod
    def validate_depth(cls, v: str) -> str:
        allowed = ["quick", "standard", "deep"]
        if v not in allowed:
            raise ValueError(f"Analysis depth must be one of {allowed}")
        return v


class InsightGenerationRequest(BaseModel):
    """Request for strategic insights"""
    model_config = ConfigDict(str_strip_whitespace=True)

    workspace_id: str
    data_type: str  # deals, pipeline, revenue, conversion
    data: dict[str, Any]
    timeframe: Optional[str] = "30d"  # 7d, 30d, 90d, 1y
    include_recommendations: bool = True


class ProposalGenerationRequest(BaseModel):
    """Request for AI proposal generation"""
    model_config = ConfigDict(str_strip_whitespace=True)

    deal_id: str
    client_name: str
    client_industry: Optional[str] = None
    requirements: list[str]
    budget_range: Optional[dict[str, float]] = None
    timeline: Optional[str] = None
    tone: str = Field(default="professional")  # professional, casual, technical

    @field_validator("tone")
    @classmethod
    def validate_tone(cls, v: str) -> str:
        allowed = ["professional", "casual", "technical", "friendly"]
        if v not in allowed:
            raise ValueError(f"Tone must be one of {allowed}")
        return v


class ForecastRequest(BaseModel):
    """Request for revenue/pipeline forecasting"""
    model_config = ConfigDict(str_strip_whitespace=True)

    workspace_id: str
    historical_data: list[dict[str, Any]]
    forecast_period: str = Field(default="90d")  # 30d, 60d, 90d, 180d
    confidence_level: float = Field(default=0.95, ge=0.0, le=1.0)
    include_scenarios: bool = True  # Best/worst/likely scenarios


# ============================================================================
# Response Models
# ============================================================================

class ChatResponse(BaseModel):
    """Chat completion response"""
    response: str
    confidence: float = Field(ge=0.0, le=1.0)
    sources: list[dict[str, Any]] = Field(default_factory=list)
    suggested_actions: list[str] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)


class Insight(BaseModel):
    """AI-generated business insight"""
    id: Optional[str] = None
    type: InsightType
    title: str = Field(..., min_length=1, max_length=200)
    description: str = Field(..., min_length=1, max_length=2000)
    priority: Priority
    confidence: float = Field(..., ge=0.0, le=1.0)
    impact_score: Optional[float] = Field(None, ge=0.0, le=100.0)
    data: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Recommendation(BaseModel):
    """Actionable recommendation"""
    title: str = Field(..., min_length=1, max_length=200)
    description: str = Field(..., min_length=1, max_length=2000)
    priority: Priority
    confidence: float = Field(..., ge=0.0, le=1.0)
    expected_impact: Optional[str] = None
    effort_level: Optional[str] = None  # low, medium, high
    timeline: Optional[str] = None
    actions: list[str] = Field(default_factory=list)


class DealScore(BaseModel):
    """Deal intelligence scoring"""
    deal_id: str
    overall_score: float = Field(..., ge=0.0, le=100.0)
    win_probability: float = Field(..., ge=0.0, le=1.0)
    health_status: str  # excellent, good, at_risk, critical
    strengths: list[str]
    risks: list[str]
    recommended_actions: list[str]
    next_best_action: Optional[str] = None


class InsightResponse(BaseModel):
    """Response containing insights and recommendations"""
    insights: list[Insight]
    recommendations: list[Recommendation]
    summary: str
    confidence: float = Field(ge=0.0, le=1.0)
    metadata: dict[str, Any] = Field(default_factory=dict)


class ProposalResponse(BaseModel):
    """AI-generated proposal"""
    proposal_id: str
    title: str
    executive_summary: str
    sections: list[dict[str, Any]]
    pricing: Optional[dict[str, Any]] = None
    timeline: Optional[dict[str, Any]] = None
    confidence: float = Field(ge=0.0, le=1.0)
    generated_at: datetime = Field(default_factory=datetime.utcnow)


class ForecastScenario(BaseModel):
    """Revenue forecast scenario"""
    scenario_type: str  # optimistic, likely, pessimistic
    predicted_value: float
    confidence_interval: tuple[float, float]
    key_assumptions: list[str]
    risk_factors: list[str]


class ForecastResponse(BaseModel):
    """Revenue/pipeline forecast response"""
    forecast_period: str
    scenarios: list[ForecastScenario]
    recommended_scenario: str
    key_insights: list[str]
    confidence: float = Field(ge=0.0, le=1.0)
    methodology: str
    generated_at: datetime = Field(default_factory=datetime.utcnow)


# ============================================================================
# Agent Models
# ============================================================================

class AgentTask(BaseModel):
    """Task for AI agent execution"""
    task_id: str
    agent_type: AgentType
    instruction: str
    context: dict[str, Any] = Field(default_factory=dict)
    max_iterations: int = Field(default=5, ge=1, le=20)
    timeout: int = Field(default=120, ge=10, le=600)


class AgentResult(BaseModel):
    """Result from agent execution"""
    task_id: str
    agent_type: AgentType
    success: bool
    result: Any
    reasoning: list[str] = Field(default_factory=list)
    tools_used: list[str] = Field(default_factory=list)
    confidence: float = Field(ge=0.0, le=1.0)
    execution_time_ms: float
    error: Optional[str] = None


# ============================================================================
# Analytics Models
# ============================================================================

class PipelineMetrics(BaseModel):
    """Pipeline health metrics"""
    total_deals: int = Field(ge=0)
    total_value: float = Field(ge=0.0)
    weighted_value: float = Field(ge=0.0)
    average_deal_size: float = Field(ge=0.0)
    conversion_rate: float = Field(ge=0.0, le=1.0)
    average_sales_cycle_days: float = Field(ge=0.0)
    stage_distribution: dict[str, int]
    velocity: float  # deals per day
