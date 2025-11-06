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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
