"""
VectorOS AI Core - Simplified for Revenue Forecasting
"""
import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Revenue forecaster
from .services.revenue_forecaster import get_revenue_forecaster

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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
