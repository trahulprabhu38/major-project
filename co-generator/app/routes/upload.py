"""
Upload endpoint for syllabus files
"""
import os
import logging
from fastapi import APIRouter, File, UploadFile, Form, HTTPException
from uuid import UUID
import tempfile
from pathlib import Path

from app.services.text_extractor import TextExtractor
from app.utils.chroma_client import get_chroma_client
from app.utils.faiss_client import get_faiss_client

logger = logging.getLogger(__name__)

router = APIRouter()

# Temporary upload directory
UPLOAD_DIR = tempfile.mkdtemp()


@router.post("/upload")
async def upload_syllabus(
    file: UploadFile = File(...),
    course_id: str = Form(...),
    teacher_id: str = Form(...)
):
    """
    Upload syllabus file and extract text

    Args:
        file: Syllabus file (PDF, DOCX, TXT)
        course_id: Course UUID
        teacher_id: Teacher UUID

    Returns:
        Success response with extracted text info
    """
    try:
        # Validate file extension
        file_ext = Path(file.filename).suffix.lower()
        if file_ext not in ['.pdf', '.docx', '.txt']:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file format: {file_ext}. Supported: .pdf, .docx, .txt"
            )

        # Save uploaded file
        temp_file_path = os.path.join(UPLOAD_DIR, f"{course_id}_{file.filename}")
        with open(temp_file_path, 'wb') as f:
            content = await file.read()
            f.write(content)

        logger.info(f"Saved uploaded file: {temp_file_path}")

        # Extract text
        extractor = TextExtractor()
        text = extractor.extract(temp_file_path)

        if not text or len(text) < 50:
            raise HTTPException(
                status_code=400,
                detail="Extracted text is too short or empty. Please check the file."
            )

        # Clean text
        text = extractor.clean_text(text)

        # Chunk text for embedding
        chunks = extractor.chunk_text(text, chunk_size=512, overlap=50)

        logger.info(f"Extracted {len(text)} characters, created {len(chunks)} chunks")

        # Store in ChromaDB (with FAISS fallback) - now with source metadata
        chroma_client = get_chroma_client()
        stored_in_chroma = False

        # Extract source filename
        source_filename = file.filename

        if chroma_client.is_connected():
            try:
                chroma_client.add_documents(
                    texts=chunks,
                    course_id=course_id,
                    source_file=source_filename,
                    page_numbers=None  # TODO: Extract page numbers from PDF
                )
                stored_in_chroma = True
                logger.info(f"✅ Stored {len(chunks)} chunks in ChromaDB with source: {source_filename}")
            except Exception as e:
                logger.warning(f"Failed to store in ChromaDB: {str(e)}")

        # Fallback to FAISS
        if not stored_in_chroma:
            faiss_client = get_faiss_client()
            if faiss_client.is_available():
                faiss_client.add_documents(
                    texts=chunks,
                    course_id=course_id,
                    source_file=source_filename,
                    page_numbers=None  # TODO: Extract page numbers from PDF
                )
                logger.info(f"✅ Stored {len(chunks)} chunks in FAISS with source: {source_filename}")

        # Store file path for later use
        file_storage_path = temp_file_path

        return {
            "success": True,
            "message": "Syllabus uploaded and processed successfully",
            "course_id": course_id,
            "teacher_id": teacher_id,
            "filename": file.filename,
            "text_length": len(text),
            "chunk_count": len(chunks),
            "stored_in_chroma": stored_in_chroma,
            "file_path": file_storage_path
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Upload error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process upload: {str(e)}"
        )
