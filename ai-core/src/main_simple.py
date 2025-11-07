"""
VectorOS AI Core - Simplified for Revenue Forecasting
"""
import os
from typing import List, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Revenue forecaster
from .services.revenue_forecaster import get_revenue_forecaster
# Embeddings service
from .services.embeddings_service import get_embeddings_service
# ML Deal Scorer
from .services.ml_deal_scorer import get_ml_deal_scorer

# Create FastAPI app
app = FastAPI(
    title="VectorOS AI Core",
    description="Enterprise Revenue Intelligence",
    version="0.1.0"
)

# CORS
origins = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:3001").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "vectoros-ai-core",
        "version": "0.1.0"
    }

@app.get("/api/v1/forecast")
async def generate_forecast(workspace_id: str, timeframe: str = "30d", scenario: str = "likely"):
    """Generate Monte Carlo revenue forecast"""
    try:
        backend_url = os.getenv('BACKEND_URL', 'http://localhost:3001')
        forecaster = get_revenue_forecaster(backend_url=backend_url)
        forecast = await forecaster.forecast_revenue(workspace_id, timeframe, scenario)
        return forecast
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/deals/score-workspace")
async def score_workspace(request: dict):
    """Placeholder for deal scoring - returns empty scores"""
    return {
        "success": True,
        "data": {
            "scored_deals": [],  # Empty array instead of undefined
            "metrics": {
                "average_health": 0,
                "total_deals": 0,
                "scored_deals": 0,
                "health_distribution": {
                    "excellent": 0,
                    "good": 0,
                    "fair": 0,
                    "poor": 0,
                    "critical": 0
                }
            }
        }
    }

# Pydantic models for vector search
class EmbedDealRequest(BaseModel):
    deal: dict

class EmbedMultipleDealsRequest(BaseModel):
    deals: List[dict]

class FindSimilarDealsRequest(BaseModel):
    deal_id: Optional[str] = None
    deal_text: Optional[str] = None
    limit: int = 10
    score_threshold: float = 0.7

@app.post("/api/v1/embeddings/embed-deal")
async def embed_deal(request: EmbedDealRequest):
    """
    Embed a single deal and store in vector database

    Example:
    {
        "deal": {
            "id": "deal-uuid",
            "title": "Enterprise Deal - Acme Corp",
            "company": "Acme Corp",
            "value": 100000,
            "stage": "proposal",
            "probability": 98
        }
    }
    """
    try:
        embeddings_service = get_embeddings_service()
        point_id = embeddings_service.embed_deal(request.deal)
        return {
            "success": True,
            "point_id": point_id,
            "message": f"Deal '{request.deal.get('title')}' embedded successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to embed deal: {str(e)}")

@app.post("/api/v1/embeddings/embed-multiple")
async def embed_multiple_deals(request: EmbedMultipleDealsRequest):
    """
    Embed multiple deals in batch

    Example:
    {
        "deals": [
            {"id": "1", "title": "Deal 1", ...},
            {"id": "2", "title": "Deal 2", ...}
        ]
    }
    """
    try:
        embeddings_service = get_embeddings_service()
        point_ids = embeddings_service.embed_multiple_deals(request.deals)
        return {
            "success": True,
            "embedded_count": len(point_ids),
            "point_ids": point_ids,
            "message": f"Successfully embedded {len(point_ids)}/{len(request.deals)} deals"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to embed deals: {str(e)}")

@app.post("/api/v1/embeddings/find-similar")
async def find_similar_deals(request: FindSimilarDealsRequest):
    """
    Find similar deals using vector search

    Example 1 (by deal ID):
    {
        "deal_id": "deal-uuid",
        "limit": 10,
        "score_threshold": 0.7
    }

    Example 2 (by text):
    {
        "deal_text": "Enterprise software deal for financial services company",
        "limit": 5,
        "score_threshold": 0.8
    }
    """
    try:
        embeddings_service = get_embeddings_service()
        similar_deals = embeddings_service.find_similar_deals(
            deal_id=request.deal_id,
            deal_text=request.deal_text,
            limit=request.limit,
            score_threshold=request.score_threshold
        )
        return {
            "success": True,
            "count": len(similar_deals),
            "similar_deals": similar_deals
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to find similar deals: {str(e)}")

@app.get("/api/v1/embeddings/stats")
async def get_embeddings_stats():
    """Get statistics about the vector database"""
    try:
        embeddings_service = get_embeddings_service()
        stats = embeddings_service.get_collection_stats()
        return {
            "success": True,
            "stats": stats
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get stats: {str(e)}")

# ML Deal Scoring Endpoints

class ScoreDealRequest(BaseModel):
    deal: dict
    similar_deals: Optional[List[dict]] = None

class ScoreMultipleDealsRequest(BaseModel):
    deals: List[dict]
    similar_deals_map: Optional[dict] = None

@app.post("/api/v1/ml/score-deal")
async def ml_score_deal(request: ScoreDealRequest):
    """
    Score a single deal using ML model

    Example:
    {
        "deal": {
            "id": "deal-uuid",
            "title": "Enterprise Deal - Acme Corp",
            "value": 100000,
            "stage": "proposal",
            "probability": 65,
            "closeDate": "2025-12-31",
            "createdAt": "2025-01-01",
            "updatedAt": "2025-11-07",
            "activities": []
        },
        "similar_deals": []  // Optional
    }
    """
    try:
        ml_scorer = get_ml_deal_scorer()
        score = ml_scorer.score_deal(request.deal, request.similar_deals)
        return {
            "success": True,
            "score": score
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to score deal: {str(e)}")

@app.post("/api/v1/ml/score-multiple")
async def ml_score_multiple_deals(request: ScoreMultipleDealsRequest):
    """
    Score multiple deals in batch using ML model

    Example:
    {
        "deals": [
            {"id": "1", "title": "Deal 1", ...},
            {"id": "2", "title": "Deal 2", ...}
        ],
        "similar_deals_map": {  // Optional
            "1": [...],
            "2": [...]
        }
    }
    """
    try:
        ml_scorer = get_ml_deal_scorer()
        scores = ml_scorer.score_multiple_deals(request.deals, request.similar_deals_map)
        return {
            "success": True,
            "scores": scores,
            "count": len(scores)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to score deals: {str(e)}")

@app.get("/api/v1/ml/model-info")
async def get_ml_model_info():
    """Get ML model metadata and feature importance"""
    try:
        ml_scorer = get_ml_deal_scorer()
        model_info = ml_scorer.get_model_info()
        feature_importance = ml_scorer.get_feature_importance()
        return {
            "success": True,
            "model_info": model_info,
            "feature_importance": feature_importance[:15]  # Top 15 features
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get model info: {str(e)}")

# Autonomous Monitoring Endpoints

class AnalyzeDealsRequest(BaseModel):
    deals: List[dict]
    ml_scores: Optional[dict] = None

class MonitorWorkspaceRequest(BaseModel):
    workspace_id: str

@app.post("/api/v1/monitoring/analyze-deals")
async def analyze_deals(request: AnalyzeDealsRequest):
    """
    Analyze deals for anomalies and health issues

    Example:
    {
        "deals": [
            {"id": "1", "title": "Deal 1", "activities": [...], ...},
            {"id": "2", "title": "Deal 2", "activities": [...], ...}
        ],
        "ml_scores": {  // Optional
            "1": {"win_probability": 0.75, "risk_level": "low"},
            "2": {"win_probability": 0.25, "risk_level": "critical"}
        }
    }
    """
    try:
        from .services.anomaly_detector import get_anomaly_detector

        anomaly_detector = get_anomaly_detector()
        anomalies = anomaly_detector.analyze_workspace_deals(
            request.deals,
            request.ml_scores
        )

        return {
            "success": True,
            "anomalies_detected": len(anomalies),
            "anomalies": anomalies
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to analyze deals: {str(e)}")

@app.post("/api/v1/monitoring/run-once")
async def run_monitoring_once(request: MonitorWorkspaceRequest):
    """
    Run monitoring cycle once for a workspace

    Example:
    {
        "workspace_id": "workspace-uuid"
    }
    """
    try:
        from .workers.deal_monitor import DealMonitor

        monitor = DealMonitor()
        result = await monitor.run_once(workspace_id=request.workspace_id)

        return {
            "success": True,
            "result": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to run monitoring: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
