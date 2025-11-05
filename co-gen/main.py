"""
CO Generator FastAPI Service
Main application with all endpoints
"""
import os
import logging
import tempfile
from pathlib import Path
from typing import Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Query, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn

from config import settings
from utils.chroma_client import get_chroma_client
from utils.groq_generator import get_groq_generator
from utils.text_extractor import TextExtractor

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# Lifespan context manager for startup/shutdown
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize services on startup"""
    logger.info("Starting CO Generator Service...")

    # Initialize ChromaDB client
    try:
        chroma_client = get_chroma_client()
        logger.info("ChromaDB client initialized")
    except Exception as e:
        logger.error(f"Failed to initialize ChromaDB: {e}")
        raise

    # Initialize Groq generator
    try:
        groq_gen = get_groq_generator()
        logger.info("Groq generator initialized")
    except Exception as e:
        logger.error(f"Failed to initialize Groq: {e}")
        raise

    logger.info("CO Generator Service started successfully")

    yield

    logger.info("Shutting down CO Generator Service...")


# Create FastAPI app
app = FastAPI(
    title="CO Generator API",
    description="Course Outcome Generator with RAG using ChromaDB and Groq",
    version="1.0.0",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================================
# ENDPOINTS
# ============================================================================

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        chroma_client = get_chroma_client()
        chroma_client.client.heartbeat()
        return {
            "status": "healthy",
            "service": "co-generator",
            "chromadb": "connected",
            "groq": "ready"
        }
    except Exception as e:
        return JSONResponse(
            status_code=503,
            content={
                "status": "unhealthy",
                "error": str(e)
            }
        )


@app.post("/api/co/upload")
async def upload_syllabus(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    course_id: str = Form(...),
    course_code: str = Form(...),
    teacher_id: str = Form(...)
):
    """
    Upload syllabus file and ingest into ChromaDB
    This endpoint matches the frontend API call:
    coAPI.post('/upload', formData)
    """
    logger.info(f"Received upload request for course {course_code} (ID: {course_id})")

    # Validate file type
    allowed_extensions = ['.pdf', '.docx', '.pptx', '.txt']
    file_ext = Path(file.filename).suffix.lower()

    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {file_ext}. Allowed: {allowed_extensions}"
        )

    # Save file temporarily
    temp_file = None
    try:
        # Create temp file with proper suffix
        with tempfile.NamedTemporaryFile(delete=False, suffix=file_ext) as temp_file:
            content = await file.read()
            temp_file.write(content)
            temp_path = temp_file.name

        logger.info(f"Saved uploaded file temporarily: {temp_path}")

        # Extract text
        try:
            text = TextExtractor.extract(temp_path)
            logger.info(f"Extracted {len(text)} characters from {file.filename}")
        except Exception as e:
            logger.error(f"Text extraction failed: {e}")
            raise HTTPException(status_code=400, detail=f"Failed to extract text: {str(e)}")

        # Extract syllabus section
        syllabus_text = TextExtractor.extract_syllabus_section(text)
        logger.info(f"Extracted syllabus section: {len(syllabus_text)} characters")

        # Ingest into ChromaDB (can be async in background)
        def ingest_task():
            try:
                chroma_client = get_chroma_client()
                num_chunks = chroma_client.ingest_document(
                    course_code=course_code,
                    course_id=course_id,
                    text=syllabus_text,
                    filename=file.filename
                )
                logger.info(f"Ingested {num_chunks} chunks for course {course_code}")
            except Exception as e:
                logger.error(f"Ingestion failed: {e}")
            finally:
                # Clean up temp file
                try:
                    os.unlink(temp_path)
                except:
                    pass

        # Run ingestion in background
        background_tasks.add_task(ingest_task)

        return {
            "success": True,
            "message": "Syllabus uploaded successfully. Ingestion started in background.",
            "course_id": course_id,
            "course_code": course_code,
            "filename": file.filename,
            "text_length": len(text),
            "syllabus_length": len(syllabus_text)
        }

    except HTTPException:
        # Clean up temp file on error
        if temp_file:
            try:
                os.unlink(temp_path)
            except:
                pass
        raise
    except Exception as e:
        # Clean up temp file on error
        if temp_file:
            try:
                os.unlink(temp_path)
            except:
                pass
        logger.error(f"Upload failed: {e}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@app.post("/api/co/generate")
async def generate_cos(
    course_id: str = Query(...),
    course_code: str = Query(...),
    num_cos: int = Query(5, ge=1, le=10)
):
    """
    Generate Course Outcomes using RAG
    This endpoint matches the frontend API call:
    coAPI.post(`/generate?course_id=${courseId}&course_code=${courseCode}&num_cos=${numCos}`)
    """
    logger.info(f"Generating {num_cos} COs for course {course_code} (ID: {course_id})")

    try:
        # Get ChromaDB client
        chroma_client = get_chroma_client()

        # Retrieve contexts from ChromaDB
        contexts = chroma_client.retrieve_contexts(
            course_code=course_code,
            n_results=settings.DEFAULT_RETRIEVAL_K
        )

        if not contexts:
            raise HTTPException(
                status_code=404,
                detail=f"No syllabus data found for course {course_code}. Please upload syllabus first."
            )

        logger.info(f"Retrieved {len(contexts)} contexts from ChromaDB")

        # Generate COs using Groq
        groq_gen = get_groq_generator()

        # Get course name (use course_code if not available)
        course_name = course_code

        cos = groq_gen.generate_cos_from_contexts(
            contexts=contexts,
            course_name=course_name,
            num_cos=num_cos
        )

        # Get total document count
        total_docs = chroma_client.get_document_count(course_code)

        logger.info(f"Successfully generated {len(cos)} COs")

        # Format response to match frontend expectations
        # Frontend expects: { contexts: [...], total_docs: N }
        response = {
            "success": True,
            "course_id": course_id,
            "course_code": course_code,
            "contexts": contexts,  # Frontend uses this
            "generated_cos": cos,  # Additional field with structured COs
            "total_docs": total_docs,
            "num_generated": len(cos)
        }

        return response

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"CO generation failed: {e}")
        raise HTTPException(status_code=500, detail=f"CO generation failed: {str(e)}")


@app.get("/api/co/stats/{course_id}")
async def get_co_stats(
    course_id: str,
    course_code: str = Query(...)
):
    """
    Get CO statistics for a course
    This endpoint matches the frontend API call:
    coAPI.get(`/stats/${courseId}?course_code=${courseCode}`)
    """
    logger.info(f"Getting stats for course {course_code} (ID: {course_id})")

    try:
        chroma_client = get_chroma_client()

        # Get document count from ChromaDB
        doc_count = chroma_client.get_document_count(course_code)

        response = {
            "success": True,
            "course_id": course_id,
            "course_code": course_code,
            "chroma_doc_count": doc_count,
            "total_chunks": doc_count
        }

        return response

    except Exception as e:
        logger.error(f"Failed to get stats: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get stats: {str(e)}")


@app.get("/api/co/list/{course_code}")
async def list_cos(course_code: str):
    """
    List all COs for a course (legacy endpoint for compatibility)
    """
    logger.info(f"Listing COs for course {course_code}")

    try:
        chroma_client = get_chroma_client()

        # Get all contexts
        contexts = chroma_client.retrieve_contexts(
            course_code=course_code,
            n_results=50  # Get more for listing
        )

        return {
            "success": True,
            "course_code": course_code,
            "cos": contexts,
            "total": len(contexts)
        }

    except Exception as e:
        logger.error(f"Failed to list COs: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to list COs: {str(e)}")


@app.delete("/api/co/collection/{course_code}")
async def delete_collection(course_code: str):
    """
    Delete a course collection (for testing/reset)
    """
    if not settings.ALLOW_RESET:
        raise HTTPException(status_code=403, detail="Reset not allowed in production")

    logger.info(f"Deleting collection for course {course_code}")

    try:
        chroma_client = get_chroma_client()
        success = chroma_client.delete_collection(course_code)

        if success:
            return {
                "success": True,
                "message": f"Collection for {course_code} deleted successfully"
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to delete collection")

    except Exception as e:
        logger.error(f"Failed to delete collection: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete collection: {str(e)}")


# ============================================================================
# MAIN
# ============================================================================

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=settings.PORT,
        reload=False,
        log_level=settings.LOG_LEVEL.lower()
    )
