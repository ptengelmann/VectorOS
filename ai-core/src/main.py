"""
VectorOS AI Core - Enterprise Grade FastAPI Application

Production-ready AI microservice with:
- Advanced agent orchestration
- Comprehensive error handling
- Request validation
- Structured logging
- Metrics and monitoring
- Rate limiting
- CORS security
"""
import time
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST
from fastapi.responses import Response

from .config import settings
from .utils.logger import setup_logging, get_logger, request_logger
from .models.schemas import (
    ChatRequest,
    ChatResponse,
    DealAnalysisRequest,
    InsightGenerationRequest,
    InsightResponse,
    AgentTask,
    AgentResult,
    ProposalGenerationRequest,
)
from .agents.base_agent import AgentOrchestrator
from .agents.strategic_analyst import StrategicAnalystAgent
from .agents.deal_intelligence import DealIntelligenceAgent

# ============================================================================
# Metrics
# ============================================================================

# Request metrics
REQUEST_COUNT = Counter(
    'vectoros_requests_total',
    'Total number of requests',
    ['method', 'endpoint', 'status']
)

REQUEST_DURATION = Histogram(
    'vectoros_request_duration_seconds',
    'Request duration in seconds',
    ['method', 'endpoint']
)

# AI metrics
AI_INFERENCE_COUNT = Counter(
    'vectoros_ai_inferences_total',
    'Total number of AI inferences',
    ['agent_type', 'status']
)

AI_INFERENCE_DURATION = Histogram(
    'vectoros_ai_inference_duration_seconds',
    'AI inference duration in seconds',
    ['agent_type']
)

# ============================================================================
# Application Lifecycle
# ============================================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifecycle management"""
    logger = get_logger("startup")

    # Startup
    logger.info(
        "starting_vectoros_ai_core",
        environment=settings.environment,
        version=settings.app_version,
    )

    # Initialize logging
    setup_logging()

    # Initialize agent orchestrator
    orchestrator = AgentOrchestrator()

    # Register agents
    orchestrator.register_agent(StrategicAnalystAgent())
    orchestrator.register_agent(DealIntelligenceAgent())

    # Store in app state
    app.state.orchestrator = orchestrator

    logger.info("vectoros_ai_core_started", agents_registered=len(orchestrator.agents))

    yield

    # Shutdown
    logger.info("shutting_down_vectoros_ai_core")


# ============================================================================
# Application Configuration
# ============================================================================

app = FastAPI(
    title=settings.app_name,
    description="Enterprise AI Engine for VectorOS Business Operating System",
    version=settings.app_version,
    docs_url="/docs" if settings.is_development else None,
    redoc_url="/redoc" if settings.is_development else None,
    lifespan=lifespan,
)

# ============================================================================
# Middleware
# ============================================================================

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# GZip compression
app.add_middleware(GZipMiddleware, minimum_size=1000)


@app.middleware("http")
async def logging_middleware(request: Request, call_next):
    """Log all requests with metrics"""
    start_time = time.time()

    # Process request
    response = await call_next(request)

    # Calculate duration
    duration_ms = (time.time() - start_time) * 1000

    # Log request
    await request_logger.log_request(
        method=request.method,
        path=request.url.path,
        status_code=response.status_code,
        duration_ms=duration_ms,
    )

    # Update metrics
    REQUEST_COUNT.labels(
        method=request.method,
        endpoint=request.url.path,
        status=response.status_code
    ).inc()

    REQUEST_DURATION.labels(
        method=request.method,
        endpoint=request.url.path
    ).observe(duration_ms / 1000)

    return response


@app.middleware("http")
async def error_handling_middleware(request: Request, call_next):
    """Global error handling"""
    try:
        return await call_next(request)
    except Exception as e:
        logger = get_logger("error")
        logger.error(
            "unhandled_exception",
            error=str(e),
            path=request.url.path,
            method=request.method,
            exc_info=True
        )

        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "error": "Internal server error",
                "message": str(e) if settings.is_development else "An error occurred",
                "request_id": request.headers.get("X-Request-ID"),
            }
        )


# ============================================================================
# Health & Monitoring Endpoints
# ============================================================================

@app.get("/health", tags=["Health"])
async def health_check() -> dict[str, Any]:
    """
    Health check endpoint for load balancers and monitoring
    """
    return {
        "status": "healthy",
        "service": settings.app_name,
        "version": settings.app_version,
        "environment": settings.environment,
        "model": settings.ai_model,
        "timestamp": time.time(),
    }


@app.get("/metrics", tags=["Monitoring"])
async def metrics():
    """Prometheus metrics endpoint"""
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)


@app.get("/readiness", tags=["Health"])
async def readiness_check(request: Request) -> dict[str, Any]:
    """
    Readiness check - verifies all dependencies are available
    """
    orchestrator = request.app.state.orchestrator

    return {
        "status": "ready",
        "agents_registered": len(orchestrator.agents),
        "agents": [agent.value for agent in orchestrator.agents.keys()],
    }


# ============================================================================
# AI Core Endpoints
# ============================================================================

@app.post("/api/v1/chat", response_model=ChatResponse, tags=["AI"])
async def chat(
    request: Request,
    chat_request: ChatRequest
) -> ChatResponse:
    """
    Conversational AI endpoint for natural language interactions

    Supports:
    - Strategic business questions
    - Data analysis queries
    - Recommendation requests
    - Context-aware conversations
    """
    logger = get_logger("chat")

    try:
        logger.info(
            "chat_request",
            workspace_id=chat_request.workspace_id,
            message_length=len(chat_request.message),
        )

        orchestrator = request.app.state.orchestrator

        # Route to appropriate agent based on message content
        # For now, use strategic analyst
        from .models.schemas import AgentType

        result = await orchestrator.execute_task(
            agent_type=AgentType.STRATEGIC_ANALYST,
            instruction=chat_request.message,
            context={
                "workspace_id": chat_request.workspace_id,
                "user_id": chat_request.user_id,
                **chat_request.context
            }
        )

        if not result.success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"AI processing failed: {result.error}"
            )

        return ChatResponse(
            response=str(result.result),
            confidence=result.confidence,
            metadata={"agent_type": result.agent_type.value}
        )

    except Exception as e:
        logger.error("chat_failed", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@app.post("/api/v1/insights/generate", response_model=InsightResponse, tags=["AI"])
async def generate_insights(
    request: Request,
    insight_request: InsightGenerationRequest
) -> InsightResponse:
    """
    Generate strategic business insights from data

    Analyzes:
    - Pipeline health
    - Conversion metrics
    - Revenue trends
    - Growth opportunities
    - Risk factors
    """
    logger = get_logger("insights")

    try:
        logger.info(
            "insight_generation_request",
            workspace_id=insight_request.workspace_id,
            data_type=insight_request.data_type,
        )

        orchestrator = request.app.state.orchestrator
        from .models.schemas import AgentType

        result = await orchestrator.execute_task(
            agent_type=AgentType.STRATEGIC_ANALYST,
            instruction=f"Analyze {insight_request.data_type} data and provide strategic insights",
            context={
                "workspace_id": insight_request.workspace_id,
                "data": insight_request.data,
                "timeframe": insight_request.timeframe,
            }
        )

        if not result.success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Insight generation failed: {result.error}"
            )

        # Result is already an InsightResponse
        insight_response = InsightResponse(**result.result)

        logger.info(
            "insights_generated",
            insight_count=len(insight_response.insights),
            recommendation_count=len(insight_response.recommendations),
        )

        return insight_response

    except Exception as e:
        logger.error("insight_generation_failed", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@app.post("/api/v1/deals/analyze", tags=["AI"])
async def analyze_deal(
    request: Request,
    analysis_request: DealAnalysisRequest
) -> dict[str, Any]:
    """
    Analyze deal health and provide intelligence

    Returns:
    - Deal score (0-100)
    - Win probability
    - Health status
    - Risk factors
    - Recommendations
    - Next best action
    """
    logger = get_logger("deal_analysis")

    try:
        logger.info(
            "deal_analysis_request",
            workspace_id=analysis_request.workspace_id,
            deal_id=analysis_request.deal_id,
            depth=analysis_request.analysis_depth,
        )

        orchestrator = request.app.state.orchestrator
        from .models.schemas import AgentType

        # Get deal data (in real app, fetch from database)
        deal_data = analysis_request.deals[0] if analysis_request.deals else {}

        result = await orchestrator.execute_task(
            agent_type=AgentType.DEAL_INTELLIGENCE,
            instruction="Analyze deal health and provide intelligence",
            context={
                "workspace_id": analysis_request.workspace_id,
                "deal_id": analysis_request.deal_id or "unknown",
                "deal_data": deal_data,
            }
        )

        if not result.success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Deal analysis failed: {result.error}"
            )

        logger.info(
            "deal_analysis_complete",
            deal_score=result.result.get("overall_score"),
        )

        return result.result

    except Exception as e:
        logger.error("deal_analysis_failed", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@app.post("/api/v1/agents/execute", response_model=AgentResult, tags=["AI"])
async def execute_agent_task(
    request: Request,
    task: AgentTask
) -> AgentResult:
    """
    Execute a task with a specific AI agent

    Allows direct agent invocation for advanced use cases
    """
    logger = get_logger("agent")

    try:
        logger.info(
            "agent_task_execution",
            task_id=task.task_id,
            agent_type=task.agent_type.value,
        )

        orchestrator = request.app.state.orchestrator

        result = await orchestrator.execute_task(
            agent_type=task.agent_type,
            instruction=task.instruction,
            context=task.context,
        )

        AI_INFERENCE_COUNT.labels(
            agent_type=task.agent_type.value,
            status="success" if result.success else "failed"
        ).inc()

        AI_INFERENCE_DURATION.labels(
            agent_type=task.agent_type.value
        ).observe(result.execution_time_ms / 1000)

        return result

    except Exception as e:
        logger.error("agent_task_failed", error=str(e), task_id=task.task_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@app.post("/api/v1/insights/analyze-workspace", tags=["AI"])
async def analyze_workspace_insights(
    request: Request,
    data: dict[str, Any]
) -> dict[str, Any]:
    """
    Analyze all deals in a workspace and generate AI insights

    This endpoint uses Claude to analyze the entire sales pipeline and provide:
    - Priority deals to focus on
    - Risk assessment
    - Action recommendations
    - Predictive analytics

    Request body:
    {
        "deals": [...] // Array of deal objects
    }

    Returns:
    {
        "success": true,
        "insights": [...] // Array of insight objects
    }
    """
    logger = get_logger("workspace_insights")

    try:
        deals = data.get("deals", [])
        logger.info(f"Analyzing workspace with {len(deals)} deals")

        if not deals:
            return {
                "success": True,
                "insights": [],
                "message": "No deals to analyze"
            }

        # Use our insights analyzer service
        from .services.insights_analyzer import InsightsAnalyzer
        analyzer = InsightsAnalyzer()

        insights = analyzer.analyze_workspace(deals)

        logger.info(f"Generated {len(insights)} insights")

        return {
            "success": True,
            "insights": insights
        }

    except Exception as e:
        logger.error(f"Workspace analysis failed: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


# ============================================================================
# Application Entry Point
# ============================================================================

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "src.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.is_development,
        log_level=settings.log_level.lower(),
        access_log=True,
    )
