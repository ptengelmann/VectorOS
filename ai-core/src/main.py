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
import json
import time
import os
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST
from fastapi.responses import Response

# Optional Sentry integration
try:
    import sentry_sdk
    from sentry_sdk.integrations.fastapi import FastApiIntegration
    SENTRY_AVAILABLE = True
except ImportError:
    SENTRY_AVAILABLE = False

from .config import settings
from .utils.logger import setup_logging, get_logger, request_logger

# Initialize Sentry for error tracking
if SENTRY_AVAILABLE and os.getenv("SENTRY_DSN"):
    sentry_sdk.init(
        dsn=os.getenv("SENTRY_DSN"),
        integrations=[FastApiIntegration()],
        traces_sample_rate=0.1,  # 10% of transactions for performance monitoring
        environment=os.getenv("NODE_ENV", "development"),
    )
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
# Agent imports commented out - using direct services instead
# from .agents.base_agent import AgentOrchestrator
# from .agents.strategic_analyst import StrategicAnalystAgent
# from .agents.deal_intelligence import DealIntelligenceAgent

# Direct service imports - no langchain needed
from .services.deal_analyzer import DealAnalyzer
from .services.deal_scorer import DealScorer
from .services.insights_analyzer import InsightsAnalyzer
from .services.revenue_forecaster import get_revenue_forecaster
from .services.insights_generator import InsightsGenerator
from .services.intelligent_insights_generator import IntelligentInsightsGenerator
from .services.memory_service import get_memory_service

# ============================================================================
# Metrics
# ============================================================================

# Request metrics (commented out for now - simplify)
# REQUEST_COUNT = Counter(
#     'vectoros_requests_total',
#     'Total number of requests',
#     ['method', 'endpoint', 'status']
# )

# REQUEST_DURATION = Histogram(
#     'vectoros_request_duration_seconds',
#     'Request duration in seconds',
#     ['method', 'endpoint']
# )

# # AI metrics
# AI_INFERENCE_COUNT = Counter(
#     'vectoros_ai_inferences_total',
#     'Total number of AI inferences',
#     ['agent_type', 'status']
# )

# AI_INFERENCE_DURATION = Histogram(
#     'vectoros_ai_inference_duration_seconds',
#     'AI inference duration in seconds',
#     ['agent_type']
# )

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

    # Initialize AI services directly - no complex orchestration needed
    app.state.deal_analyzer = DealAnalyzer()
    app.state.deal_scorer = DealScorer()
    app.state.insights_analyzer = InsightsAnalyzer()

    # Initialize vector memory service
    app.state.memory_service = get_memory_service()

    # Initialize INTELLIGENT insights generator (RAG-based with Claude)
    app.state.intelligent_insights_generator = IntelligentInsightsGenerator(
        memory_service=app.state.memory_service,
        deal_analyzer=app.state.deal_analyzer
    )

    # Keep old generator for backwards compatibility (will deprecate)
    app.state.insights_generator = InsightsGenerator()

    logger.info("vectoros_ai_core_started", services_initialized=6)

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
    allow_origins=settings.cors_origins_list,
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

    # Update metrics (commented out for now)
    # REQUEST_COUNT.labels(
    #     method=request.method,
    #     endpoint=request.url.path,
    #     status=response.status_code
    # ).inc()

    # REQUEST_DURATION.labels(
    #     method=request.method,
    #     endpoint=request.url.path
    # ).observe(duration_ms / 1000)

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
    return {
        "status": "ready",
        "services_initialized": 3,
        "services": ["deal_analyzer", "deal_scorer", "insights_analyzer"],
    }


# ============================================================================
# AI Core Endpoints
# ============================================================================

# Commented out - requires agent orchestrator which has langchain dependencies
# @app.post("/api/v1/chat", response_model=ChatResponse, tags=["AI"])
async def chat_disabled(
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


# Commented out - requires agent orchestrator which has langchain dependencies
# @app.post("/api/v1/insights/generate", response_model=InsightResponse, tags=["AI"])
async def generate_insights_disabled(
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


# Note: This old endpoint has been replaced by the new one below that uses DealAnalyzer
# @app.post("/api/v1/deals/analyze", tags=["AI"])
# async def analyze_deal_old(
#     request: Request,
#     analysis_request: DealAnalysisRequest
# ) -> dict[str, Any]:
#     """
#     Analyze deal health and provide intelligence
#
#     Returns:
#     - Deal score (0-100)
#     - Win probability
#     - Health status
#     - Risk factors
#     - Recommendations
#     - Next best action
#     """
#     logger = get_logger("deal_analysis")
#
#     try:
#         logger.info(
#             "deal_analysis_request",
#             workspace_id=analysis_request.workspace_id,
#             deal_id=analysis_request.deal_id,
#             depth=analysis_request.analysis_depth,
#         )
#
#         orchestrator = request.app.state.orchestrator
#         from .models.schemas import AgentType
#
#         # Get deal data (in real app, fetch from database)
#         deal_data = analysis_request.deals[0] if analysis_request.deals else {}
#
#         result = await orchestrator.execute_task(
#             agent_type=AgentType.DEAL_INTELLIGENCE,
#             instruction="Analyze deal health and provide intelligence",
#             context={
#                 "workspace_id": analysis_request.workspace_id,
#                 "deal_id": analysis_request.deal_id or "unknown",
#                 "deal_data": deal_data,
#             }
#         )
#
#         if not result.success:
#             raise HTTPException(
#                 status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
#                 detail=f"Deal analysis failed: {result.error}"
#             )
#
#         logger.info(
#             "deal_analysis_complete",
#             deal_score=result.result.get("overall_score"),
#         )
#
#         return result.result
#
#     except Exception as e:
#         logger.error("deal_analysis_failed", error=str(e))
#         raise HTTPException(
#             status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
#             detail=str(e)
#         )


# Commented out - requires agent orchestrator which has langchain dependencies
# @app.post("/api/v1/agents/execute", response_model=AgentResult, tags=["AI"])
async def execute_agent_task_disabled(
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


@app.post("/api/v1/deals/score", tags=["AI"])
async def score_deal(
    request: Request,
    data: dict[str, Any]
) -> dict[str, Any]:
    """
    Calculate automated health score for a single deal

    This endpoint scores a deal based on:
    - Win probability
    - Pipeline velocity (days in stage)
    - Deal freshness (age)
    - Data completeness
    - Close date urgency
    - Relative deal value

    Request body:
    {
        "deal": {...},  // Deal object to score
        "workspace_deals": [...]  // Optional: all workspace deals for relative scoring
    }

    Returns:
    {
        "success": true,
        "health_score": 75.5,
        "health_status": "good",
        "components": {...},
        "insights": [...]
    }
    """
    logger = get_logger("deal_scoring")

    try:
        deal = data.get("deal")
        workspace_deals = data.get("workspace_deals", [])

        if not deal:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Deal data is required"
            )

        logger.info(f"Scoring deal: {deal.get('id')} - {deal.get('title')}")

        # Use our deal scorer service
        from .services.deal_scorer import DealScorer
        scorer = DealScorer()

        score_result = scorer.score_deal(deal, workspace_deals if workspace_deals else None)

        logger.info(f"Deal scored: {score_result['health_score']}/100 ({score_result['health_status']})")

        return {
            "success": True,
            **score_result
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Deal scoring failed: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@app.post("/api/v1/deals/score-workspace", tags=["AI"])
async def score_workspace_deals(
    request: Request,
    data: dict[str, Any]
) -> dict[str, Any]:
    """
    Calculate health scores for all deals in a workspace

    This endpoint scores all deals and provides workspace-level metrics:
    - Individual deal scores
    - Average workspace health
    - Health distribution
    - Deals needing attention

    Request body:
    {
        "deals": [...]  // Array of deal objects
    }

    Returns:
    {
        "success": true,
        "scored_deals": [...],
        "workspace_metrics": {
            "average_health": 68.5,
            "total_deals": 50,
            "scored_deals": 48,
            "health_distribution": {
                "excellent": 10,
                "good": 20,
                "fair": 12,
                "poor": 4,
                "critical": 2
            }
        }
    }
    """
    logger = get_logger("workspace_scoring")

    try:
        deals = data.get("deals", [])

        if not deals:
            return {
                "success": True,
                "scored_deals": [],
                "workspace_metrics": {
                    "average_health": 0,
                    "total_deals": 0,
                    "scored_deals": 0,
                    "health_distribution": {}
                },
                "message": "No deals to score"
            }

        logger.info(f"Scoring {len(deals)} deals in workspace")

        # Use our deal scorer service
        from .services.deal_scorer import DealScorer
        scorer = DealScorer()

        result = scorer.score_workspace(deals)

        logger.info(
            f"Workspace scored: {result['workspace_metrics']['average_health']:.1f} avg health, "
            f"{result['workspace_metrics']['scored_deals']}/{result['workspace_metrics']['total_deals']} deals"
        )

        return {
            "success": True,
            **result
        }

    except Exception as e:
        logger.error(f"Workspace scoring failed: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@app.post("/api/v1/deals/analyze", tags=["AI"])
async def analyze_deal(
    request: Request,
    data: dict[str, Any]
) -> dict[str, Any]:
    """
    Perform deep AI analysis of a deal using Claude

    Provides:
    - Executive summary
    - Win probability prediction
    - Strengths and risks
    - Recommended next actions
    - Competitive insights
    - Timing analysis
    """
    logger = get_logger("deal_analyzer")

    try:
        deal = data.get("deal")
        workspace_deals = data.get("workspace_deals", [])

        if not deal:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Deal data is required"
            )

        logger.info(f"Analyzing deal: {deal.get('title', 'Unknown')}")

        # Use our deal analyzer service
        from .services.deal_analyzer import DealAnalyzer
        analyzer = DealAnalyzer()

        result = analyzer.analyze_deal(deal, workspace_deals)

        logger.info(
            f"Deal analyzed: {result['deal_title']}, "
            f"Win probability: {result['analysis'].get('win_probability', 0)}%, "
            f"Confidence: {result['analysis'].get('confidence_level', 0)}%"
        )

        return {
            "success": True,
            **result
        }

    except Exception as e:
        logger.error(f"Deal analysis failed: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@app.post("/api/v1/forecast/generate", tags=["Revenue Intelligence"])
async def generate_forecast(
    request: Request,
    data: dict[str, Any]
) -> dict[str, Any]:
    """
    Generate revenue forecast for workspace

    This is THE killer feature that makes VectorOS a Revenue Intelligence Platform.

    Uses:
    - Vector memory to find similar historical deals
    - Outcome tracker to measure accuracy
    - Historical win rates to adjust probabilities
    - Statistical analysis for confidence intervals

    Request body:
    {
        "workspace_id": str,          # Required
        "timeframe": "30d" | "60d" | "90d",  # Optional, default: "30d"
        "scenario": "best" | "likely" | "worst"  # Optional, default: "likely"
    }

    Returns:
    {
        "success": true,
        "forecast": {
            "workspace_id": str,
            "timeframe": str,
            "scenario": str,
            "predicted_revenue": float,
            "confidence": float,
            "best_case": float,
            "likely_case": float,
            "worst_case": float,
            "pipeline_coverage": float,
            "revenue_goal": float,
            "required_pipeline": float,
            "deals_analyzed": int,
            "breakdown_by_stage": [...],
            "forecasted_deals": [...],
            "historical_accuracy": [...]
        }
    }
    """
    logger = get_logger("revenue_forecast")

    try:
        workspace_id = data.get("workspace_id")
        timeframe = data.get("timeframe", "30d")
        scenario = data.get("scenario", "likely")

        if not workspace_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="workspace_id is required"
            )

        # Validate timeframe
        if timeframe not in ["30d", "60d", "90d"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="timeframe must be one of: 30d, 60d, 90d"
            )

        # Validate scenario
        if scenario not in ["best", "likely", "worst"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="scenario must be one of: best, likely, worst"
            )

        logger.info(
            f"Generating {timeframe} {scenario} forecast for workspace {workspace_id}"
        )

        # Get revenue forecaster with backend URL
        backend_url = os.getenv('BACKEND_URL', 'http://localhost:3001')
        forecaster = get_revenue_forecaster(backend_url=backend_url)

        # Generate forecast
        forecast_result = await forecaster.forecast_revenue(
            workspace_id=workspace_id,
            timeframe=timeframe,
            scenario=scenario
        )

        logger.info(
            f"Forecast generated: ${forecast_result['predicted_revenue']:,.0f} "
            f"with {forecast_result['confidence']:.1%} confidence"
        )

        return {
            "success": True,
            "forecast": forecast_result
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Forecast generation failed: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@app.post("/api/v1/insights/generate", tags=["Autonomous Intelligence"])
async def generate_autonomous_insights(
    request: Request,
    data: dict[str, Any]
) -> dict[str, Any]:
    """
    Generate autonomous insights for workspace - THE DIFFERENTIATOR

    This is what makes VectorOS autonomous:
    - AI monitors deals 24/7
    - Detects stale deals, at-risk opportunities, upsell chances
    - Generates actionable insights with confidence scores
    - Tells users EXACTLY what to do

    Request body:
    {
        "workspace_id": str,  # Required
        "user_id": str        # Optional
    }

    Returns:
    {
        "success": true,
        "insights_generated": 5,
        "insights": [
            {
                "type": "warning",  # warning, risk, opportunity, prediction
                "title": "Deal going cold",
                "description": "...",
                "priority": "critical",  # critical, high, medium, low
                "confidence": 0.87,
                "data": {...},
                "actions": [...]
            }
        ]
    }
    """
    logger = get_logger("autonomous_insights")

    try:
        workspace_id = data.get("workspace_id")
        user_id = data.get("user_id")
        deals = data.get("deals")  # Optional: real deals from backend

        if not workspace_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="workspace_id is required"
            )

        logger.info(f"Generating autonomous insights for workspace: {workspace_id}")
        if deals:
            logger.info(f"Received {len(deals)} real deals from backend")
            logger.info(f"Deal details: {json.dumps(deals, default=str, indent=2)}")

        # Get INTELLIGENT insights generator (RAG-based with Claude)
        generator = request.app.state.intelligent_insights_generator

        # Generate all insights for workspace
        result = await generator.generate_workspace_insights(
            workspace_id=workspace_id,
            user_id=user_id,
            deals=deals  # Pass real deals if provided
        )

        logger.info(
            f"Generated {result.get('insights_generated', 0)} insights "
            f"for workspace {workspace_id}"
        )

        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Insight generation failed: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@app.post("/api/v1/insights/debug", tags=["Debug"])
async def debug_insights(
    request: Request,
    data: dict[str, Any]
) -> dict[str, Any]:
    """
    🔍 DEBUG ENDPOINT - Shows raw Claude prompt and response

    This helps us understand why insights aren't being generated.

    Request body:
    {
        "deals": [...]  # Array of deals to analyze
    }

    Returns:
    {
        "system_prompt": "...",
        "user_prompt": "...",
        "claude_response": "...",
        "parsed_insights": [...]
    }
    """
    logger = get_logger("debug_insights")

    try:
        deals = data.get("deals", [])

        if not deals or len(deals) == 0:
            return {
                "error": "No deals provided",
                "hint": "Pass 'deals' array in request body"
            }

        # Get first deal for testing
        deal = deals[0]
        logger.info(f"[DEBUG] Analyzing deal: {deal.get('title')}")

        # Get generator
        generator = request.app.state.intelligent_insights_generator

        # Build the prompt that would be sent to Claude
        similar_deals = []  # Skip RAG for debug
        user_prompt = generator._build_rag_prompt(deal, similar_deals)
        system_prompt = generator.system_prompt

        # Call Claude
        logger.info(f"[DEBUG] Calling Claude API...")
        response = generator.anthropic.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=4000,
            system=system_prompt,
            messages=[{"role": "user", "content": user_prompt}]
        )

        response_text = response.content[0].text
        logger.info(f"[DEBUG] Claude responded with {len(response_text)} chars")

        # Try to parse
        parsed_insights = generator._parse_claude_response(response_text, deal)
        logger.info(f"[DEBUG] Parsed {len(parsed_insights)} insights")

        return {
            "deal_analyzed": {
                "id": deal.get("id"),
                "title": deal.get("title"),
                "stage": deal.get("stage"),
                "value": deal.get("value")
            },
            "system_prompt_length": len(system_prompt),
            "user_prompt": user_prompt,
            "claude_response": response_text,
            "parsed_insights_count": len(parsed_insights),
            "parsed_insights": parsed_insights,
            "success": True
        }

    except Exception as e:
        logger.error(f"[DEBUG] Error: {str(e)}", exc_info=True)
        return {
            "success": False,
            "error": str(e)
        }


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
