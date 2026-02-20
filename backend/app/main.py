from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import router
import logging
import uvicorn
from app.config.settings import settings

# Configure basic logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Neel Drishti Backend",
    description="Oceanographic Data Integration & Query Platform",
    version="1.0.0"
)

# CORS Configuration - Allow all for development simplicity
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api/v1")

@app.get("/")
async def root():
    return {
        "message": "Welcome to Neel Drishti Backend API",
        "docs": "/docs",
        "status": "online"
    }

from pydantic import BaseModel
from app.modules.orchestrator import orchestrator
from app.models.response_model import UnifiedResponse

class AnalyzeRequest(BaseModel):
    query: str

@app.post("/analyze", response_model=UnifiedResponse)
async def handle_analyze(request: AnalyzeRequest):
    """
    Compatibility endpoint for /analyze requests.
    Delegates to the main orchestrator logic.
    """
    logger.info(f"Received legacy /analyze request for query: {request.query}")
    return await orchestrator.process_query(request.query)

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
