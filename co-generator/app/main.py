"""
FastAPI Main Application for CO Generator
"""
import logging
import sys
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

# Import services for initialization
from app.services.database import init_database, test_connection
from app.services.model_runner import get_model_runner
from app.utils.chroma_client import get_chroma_client
from app.utils.faiss_client import get_faiss_client

# Import routes
from app.routes import upload, generate, verify, list_cos


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan events for startup and shutdown
    """
    # Startup
    logger.info("🚀 Starting CO Generator Service...")

    # Initialize database
    logger.info("📊 Initializing database...")
    db_connected = test_connection()
    if db_connected:
        init_database()
        logger.info("✅ Database initialized")
    else:
        logger.warning("⚠️  Database connection failed - some features may not work")

    # Initialize ChromaDB
    logger.info("🔗 Connecting to ChromaDB...")
    chroma_client = get_chroma_client()
    if chroma_client.is_connected():
        logger.info("✅ ChromaDB connected")
    else:
        logger.warning("⚠️  ChromaDB not available - using FAISS fallback")

    # Initialize FAISS
    logger.info("📚 Loading FAISS index...")
    faiss_client = get_faiss_client()
    if faiss_client.is_available():
        logger.info("✅ FAISS index loaded")
    else:
        logger.warning("⚠️  FAISS index not available")

    # Load ML model
    logger.info("🤖 Loading ML model...")
    try:
        model_runner = get_model_runner()
        if model_runner.is_loaded():
            logger.info("✅ Model loaded successfully")
        else:
            logger.warning("⚠️  Model loading failed")
    except Exception as e:
        logger.error(f"❌ Model loading error: {str(e)}")

    # Print RAG Engine status
    logger.info("=" * 80)

    # Determine primary retriever
    primary_retriever = "ChromaDB" if chroma_client.is_connected() else "FAISS"

    # Get context count
    if chroma_client.is_connected():
        chroma_stats = chroma_client.get_collection_stats()
        context_count = chroma_stats.get("document_count", 0)
    elif faiss_client.is_available():
        faiss_stats = faiss_client.get_stats()
        context_count = faiss_stats.get("total_documents", 0)
    else:
        context_count = 0

    # Get model name
    model_name = "sentence-transformers/all-MiniLM-L6-v2"

    logger.info(f"✅ RAG Engine Ready | Model: {model_name} | Retriever: {primary_retriever} | Contexts: {context_count} chunks")
    logger.info("=" * 80)

    logger.info("✅ CO Generator Service is ready!")

    yield

    # Shutdown
    logger.info("🛑 Shutting down CO Generator Service...")


# Create FastAPI app
app = FastAPI(
    title="CO Generator API",
    description="FastAPI microservice for generating Course Outcomes using LLM and Bloom's Taxonomy",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global exception: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": "Internal server error",
            "detail": str(exc)
        }
    )


# Root endpoint
@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "CO Generator API",
        "version": "1.0.0",
        "status": "running",
        "timestamp": datetime.utcnow().isoformat()
    }


# Health check endpoint (enhanced with RAG stats)
@app.get("/health")
async def health_check():
    """Enhanced health check with RAG service status and stats"""
    from app.models.co_schema import HealthResponse

    # Check services
    db_connected = test_connection()

    chroma_client = get_chroma_client()
    chroma_connected = chroma_client.is_connected()
    chroma_stats = chroma_client.get_collection_stats() if chroma_connected else {}

    faiss_client = get_faiss_client()
    faiss_available = faiss_client.is_available()
    faiss_stats = faiss_client.get_stats() if faiss_available else {}

    model_runner = get_model_runner()
    model_loaded = model_runner.is_loaded()

    # Determine overall status
    retriever_available = chroma_connected or faiss_available
    overall_status = "healthy" if all([db_connected, retriever_available, model_loaded]) else "degraded"

    return {
        "status": overall_status,
        "chroma_connected": chroma_connected,
        "faiss_available": faiss_available,
        "model_loaded": model_loaded,
        "chroma_stats": chroma_stats,
        "faiss_stats": faiss_stats,
        "timestamp": datetime.utcnow().isoformat()
    }


# Debug endpoint for testing RAG retrieval
@app.post("/query")
async def query_rag(request: dict):
    """
    Debug endpoint for testing RAG retrieval

    Request body:
    {
        "question": "What is normalization?",
        "course_id": "optional-course-id",
        "n_results": 5
    }

    Returns:
        Retrieved context with metadata and similarity scores
    """
    try:
        question = request.get("question")
        course_id = request.get("course_id")
        n_results = request.get("n_results", 5)

        if not question:
            return JSONResponse(
                status_code=400,
                content={"error": "Question is required"}
            )

        logger.info(f"🔍 Debug query: '{question}' (course_id: {course_id})")

        # Try ChromaDB first
        chroma_client = get_chroma_client()
        chromadb_results = []

        if chroma_client.is_connected():
            try:
                results = chroma_client.query(
                    question,
                    n_results=n_results,
                    course_id=course_id,
                    return_metadata=True
                )
                chromadb_results = [
                    {
                        "text": text[:200] + "..." if len(text) > 200 else text,
                        "source": meta.get("source_file", "unknown"),
                        "page": meta.get("page"),
                        "similarity": round(score, 3)
                    }
                    for text, meta, score in results
                ]
            except Exception as e:
                logger.error(f"ChromaDB query error: {str(e)}")

        # Try FAISS
        faiss_client = get_faiss_client()
        faiss_results = []

        if faiss_client.is_available():
            try:
                results = faiss_client.query(
                    question,
                    n_results=n_results,
                    course_id=course_id,
                    return_metadata=True
                )
                faiss_results = [
                    {
                        "text": text[:200] + "..." if len(text) > 200 else text,
                        "source": meta.get("source_file", "unknown"),
                        "page": meta.get("page"),
                        "similarity": round(score, 3)
                    }
                    for text, meta, score in results
                ]
            except Exception as e:
                logger.error(f"FAISS query error: {str(e)}")

        return {
            "success": True,
            "question": question,
            "course_id": course_id,
            "chromadb_results": chromadb_results,
            "faiss_results": faiss_results,
            "timestamp": datetime.utcnow().isoformat()
        }

    except Exception as e:
        logger.error(f"Query endpoint error: {str(e)}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={"error": str(e)}
        )


# Debug endpoint for rebuilding FAISS index
@app.post("/rebuild_index")
async def rebuild_index(request: dict):
    """
    Rebuild FAISS index from index_meta.json

    Request body:
    {
        "metadata_file": "/path/to/index_meta.json"
    }

    Returns:
        Rebuild status
    """
    try:
        metadata_file = request.get("metadata_file")

        if not metadata_file:
            return JSONResponse(
                status_code=400,
                content={"error": "metadata_file is required"}
            )

        logger.info(f"🔄 Rebuilding FAISS index from {metadata_file}")

        faiss_client = get_faiss_client()

        if not faiss_client.is_available():
            return JSONResponse(
                status_code=503,
                content={"error": "FAISS client not available"}
            )

        success = faiss_client.rebuild_index_from_metadata(metadata_file)

        if success:
            stats = faiss_client.get_stats()
            return {
                "success": True,
                "message": "Index rebuilt successfully",
                "stats": stats,
                "timestamp": datetime.utcnow().isoformat()
            }
        else:
            return JSONResponse(
                status_code=500,
                content={"error": "Failed to rebuild index"}
            )

    except Exception as e:
        logger.error(f"Rebuild index error: {str(e)}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={"error": str(e)}
        )


# Include routers
app.include_router(upload.router, prefix="/api/co", tags=["Upload"])
app.include_router(generate.router, prefix="/api/co", tags=["Generate"])
app.include_router(verify.router, prefix="/api/co", tags=["Verify"])
app.include_router(list_cos.router, prefix="/api/co", tags=["List"])


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8085,
        reload=True,
        log_level="info"
    )
