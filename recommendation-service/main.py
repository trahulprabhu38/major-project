"""
FastAPI Recommendation Service
Provides personalized learning resource recommendations based on student performance
"""

from fastapi import FastAPI, HTTPException, Depends, status, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from typing import List, Optional, Dict, Any
import logging
from datetime import datetime
import os

from api import recommendations, analytics, resources, feedback
from models.schemas import HealthCheck
from core.config import settings
from core.logging_config import setup_logging

# Setup logging
setup_logging()
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Educational Recommendation System API",
    description="Personalized learning resource recommendations with collaborative filtering",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(recommendations.router, prefix="/api/recommendations", tags=["Recommendations"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["Analytics"])
app.include_router(resources.router, prefix="/api/resources", tags=["Resources"])
app.include_router(feedback.router, prefix="/api/feedback", tags=["Feedback"])


@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    logger.info("Starting Recommendation Service...")
    logger.info(f"Environment: {settings.ENVIRONMENT}")
    logger.info(f"Backend API URL: {settings.BACKEND_API_URL}")
    
    # Create necessary directories
    os.makedirs(settings.DATA_DIR, exist_ok=True)
    os.makedirs(settings.LOGS_DIR, exist_ok=True)
    
    logger.info("Recommendation Service started successfully!")


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    logger.info("Shutting down Recommendation Service...")


@app.get("/", response_model=Dict[str, Any])
async def root():
    """Root endpoint"""
    return {
        "service": "Educational Recommendation System",
        "version": "2.0.0",
        "status": "operational",
        "timestamp": datetime.utcnow().isoformat(),
        "endpoints": {
            "docs": "/docs",
            "health": "/health",
            "recommendations": "/api/recommendations",
            "analytics": "/api/analytics",
            "resources": "/api/resources",
            "feedback": "/api/feedback"
        }
    }


@app.get("/health", response_model=HealthCheck)
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "2.0.0",
        "environment": settings.ENVIRONMENT
    }


@app.get("/api/status")
async def api_status():
    """Detailed API status"""
    return {
        "service": "recommendation-service",
        "status": "operational",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "2.0.0",
        "features": {
            "collaborative_filtering": True,
            "content_based_filtering": True,
            "hybrid_recommendations": True,
            "study_plan_generation": True,
            "performance_analysis": True
        },
        "data": {
            "resources_loaded": os.path.exists(f"{settings.DATA_DIR}/resources.csv"),
            "logs_directory": os.path.exists(settings.LOGS_DIR)
        }
    }


# Error handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    """Handle HTTP exceptions"""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": exc.detail,
            "timestamp": datetime.utcnow().isoformat()
        }
    )


@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    """Handle general exceptions"""
    logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": "Internal server error",
            "details": str(exc) if settings.ENVIRONMENT == "development" else None,
            "timestamp": datetime.utcnow().isoformat()
        }
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8003,
        reload=settings.ENVIRONMENT == "development",
        log_level="info"
    )



