"""
Generate endpoint for CO generation
"""
import logging
import json
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from typing import AsyncGenerator
from uuid import UUID

from app.models.co_schema import COGenerateRequest, COGenerateResponse, GeneratedCO
from app.services.model_runner import get_model_runner
from app.services.bloom_classifier import BloomClassifier
from app.services.database import save_cos
from app.utils.chroma_client import get_chroma_client
from app.utils.faiss_client import get_faiss_client
from app.utils.prompt_builder import PromptBuilder

logger = logging.getLogger(__name__)

router = APIRouter()

# Initialize Bloom classifier
bloom_classifier = BloomClassifier()

# Initialize prompt builder
with open("bloom_levels.json", 'r') as f:
    bloom_data = json.load(f)
prompt_builder = PromptBuilder(bloom_data)


@router.post("/generate", response_model=COGenerateResponse)
async def generate_cos(request: COGenerateRequest):
    """
    Generate Course Outcomes from syllabus

    Args:
        request: Generation request with course_id, teacher_id, n_co

    Returns:
        Generated COs with Bloom levels
    """
    try:
        logger.info(f"Generating {request.n_co} COs for course {request.course_id}")

        # Retrieve context from ChromaDB or FAISS
        context = await _retrieve_context(str(request.course_id), request.n_co)

        if not context:
            raise HTTPException(
                status_code=400,
                detail="No syllabus context found. Please upload a syllabus first."
            )

        # Build prompt
        prompt = prompt_builder.build_co_generation_prompt(context, request.n_co)

        logger.info(f"Generated prompt with {len(context)} characters of context")

        # Generate COs using model
        model_runner = get_model_runner()

        if not model_runner.is_loaded():
            raise HTTPException(
                status_code=503,
                detail="Model not loaded. Please try again later."
            )

        raw_output = await model_runner.generate(
            prompt=prompt,
            max_new_tokens=512,
            temperature=0.2  # More deterministic
        )

        logger.info(f"Model output: {raw_output[:200]}...")

        # Extract COs from response
        co_texts = prompt_builder.extract_cos_from_response(raw_output)

        if not co_texts:
            raise HTTPException(
                status_code=500,
                detail="Failed to generate valid COs. Please try again."
            )

        # Ensure we have requested number of COs
        co_texts = co_texts[:request.n_co]

        # Classify COs by Bloom level
        classified_cos = bloom_classifier.classify_batch(co_texts)

        # Convert to response format
        generated_cos = [
            GeneratedCO(
                co_text=co["co_text"],
                bloom_level=co["bloom_level"],
                confidence=co["confidence"]
            )
            for co in classified_cos
        ]

        # Save to database
        try:
            co_ids = save_cos(
                teacher_id=request.teacher_id,
                course_id=request.course_id,
                cos=[
                    {
                        "co_text": co.co_text,
                        "bloom_level": co.bloom_level
                    }
                    for co in generated_cos
                ]
            )
            logger.info(f"Saved {len(co_ids)} COs to database")
        except Exception as e:
            logger.error(f"Failed to save COs to database: {str(e)}")
            # Continue even if DB save fails

        return COGenerateResponse(
            success=True,
            message=f"Generated {len(generated_cos)} course outcomes successfully",
            course_id=request.course_id,
            teacher_id=request.teacher_id,
            cos=generated_cos
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Generation error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate COs: {str(e)}"
        )


@router.post("/generate/stream")
async def generate_cos_stream(request: COGenerateRequest):
    """
    Generate COs with streaming response (Server-Sent Events)

    Args:
        request: Generation request

    Returns:
        StreamingResponse with generated COs
    """
    async def generate_stream() -> AsyncGenerator[str, None]:
        try:
            logger.info(f"Streaming generation for {request.n_co} COs")

            # Retrieve context
            context = await _retrieve_context(str(request.course_id), request.n_co)

            if not context:
                yield f"data: {json.dumps({'error': 'No context found'})}\n\n"
                return

            # Build prompt
            prompt = prompt_builder.build_co_generation_prompt(context, request.n_co)

            # Get model
            model_runner = get_model_runner()

            if not model_runner.is_loaded():
                yield f"data: {json.dumps({'error': 'Model not loaded'})}\n\n"
                return

            # Stream generation
            full_text = ""
            async for chunk in model_runner.generate_stream(prompt):
                full_text += chunk
                yield f"data: {json.dumps({'chunk': chunk})}\n\n"

            # Extract and classify COs
            co_texts = prompt_builder.extract_cos_from_response(full_text)
            co_texts = co_texts[:request.n_co]

            classified_cos = bloom_classifier.classify_batch(co_texts)

            # Send final result
            yield f"data: {json.dumps({'cos': classified_cos, 'done': True})}\n\n"

            # Save to database
            try:
                save_cos(
                    teacher_id=request.teacher_id,
                    course_id=request.course_id,
                    cos=[
                        {
                            "co_text": co["co_text"],
                            "bloom_level": co["bloom_level"]
                        }
                        for co in classified_cos
                    ]
                )
            except Exception as e:
                logger.error(f"Failed to save streamed COs: {str(e)}")

        except Exception as e:
            logger.error(f"Streaming error: {str(e)}", exc_info=True)
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(
        generate_stream(),
        media_type="text/event-stream"
    )


async def _retrieve_context(course_id: str, n_co: int) -> str:
    """
    Retrieve relevant context from ChromaDB or FAISS with metadata

    Args:
        course_id: Course ID
        n_co: Number of COs to generate

    Returns:
        Retrieved context text with source attribution
    """
    # Build query
    query = prompt_builder.build_context_query(n_co)

    # Try ChromaDB first (with context reconstruction)
    chroma_client = get_chroma_client()
    if chroma_client.is_connected():
        try:
            context = chroma_client.query_with_context(query, n_results=5, course_id=course_id)
            if context:
                logger.info(f"✅ Retrieved context from ChromaDB with metadata")
                return context
        except Exception as e:
            logger.warning(f"ChromaDB query failed: {str(e)}")

    # Fallback to FAISS (with context reconstruction)
    faiss_client = get_faiss_client()
    if faiss_client.is_available():
        try:
            context = faiss_client.query_with_context(query, n_results=5, course_id=course_id)
            if context:
                logger.info(f"✅ Retrieved context from FAISS with metadata")
                return context
        except Exception as e:
            logger.error(f"FAISS query failed: {str(e)}")

    logger.warning("⚠️ No context retrieved from either ChromaDB or FAISS")
    return ""
