"""
VectorOS AI Core - Main Application
"""
import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from anthropic import Anthropic

# Load environment variables
load_dotenv("../.env")

app = FastAPI(
    title="VectorOS AI Core",
    description="AI Engine for VectorOS Business Operating System",
    version="0.1.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_URL", "http://localhost:3000")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Anthropic client
anthropic_client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))


# Request/Response models
class ChatRequest(BaseModel):
    message: str
    context: dict = {}


class ChatResponse(BaseModel):
    response: str
    confidence: float = 1.0


class InsightRequest(BaseModel):
    workspace_id: str
    data_type: str  # deals, pipeline, metrics
    data: dict


class InsightResponse(BaseModel):
    insights: list[dict]
    recommendations: list[dict]


# Health check
@app.get("/health")
async def health_check():
    return {
        "status": "ok",
        "service": "vectoros-ai-core",
        "model": "claude-3-5-sonnet-20241022"
    }


# Chat endpoint
@app.post("/api/v1/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    try:
        message = anthropic_client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=1024,
            messages=[
                {
                    "role": "user",
                    "content": f"Context: {request.context}\n\nQuestion: {request.message}"
                }
            ]
        )

        return ChatResponse(
            response=message.content[0].text,
            confidence=1.0
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Generate insights
@app.post("/api/v1/insights", response_model=InsightResponse)
async def generate_insights(request: InsightRequest):
    """
    Analyze business data and generate AI insights
    """
    try:
        # Build prompt based on data type
        prompt = f"""
        Analyze the following {request.data_type} data for workspace {request.workspace_id}:

        {request.data}

        Provide:
        1. Key insights (3-5 points)
        2. Actionable recommendations (3-5 points)
        3. Risk factors to watch
        4. Growth opportunities

        Format as JSON with 'insights' and 'recommendations' arrays.
        Each item should have: title, description, priority (low/medium/high), confidence (0-1).
        """

        message = anthropic_client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=2048,
            messages=[{"role": "user", "content": prompt}]
        )

        # Parse response (simplified - would need proper JSON parsing)
        response_text = message.content[0].text

        return InsightResponse(
            insights=[
                {
                    "title": "Sample Insight",
                    "description": response_text[:200],
                    "priority": "medium",
                    "confidence": 0.85
                }
            ],
            recommendations=[
                {
                    "title": "Sample Recommendation",
                    "description": "Based on analysis...",
                    "priority": "high",
                    "confidence": 0.9
                }
            ]
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("AI_CORE_PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
