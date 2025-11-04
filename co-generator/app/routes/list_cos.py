"""
List endpoint for retrieving COs
"""
import logging
from fastapi import APIRouter, HTTPException, Query
from uuid import UUID
from typing import Optional

from app.models.co_schema import COListResponse, COListItem
from app.services.database import get_cos_by_course, get_cos_by_teacher

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/list", response_model=COListResponse)
async def list_cos(
    course_id: Optional[str] = Query(None, description="Filter by course ID"),
    teacher_id: Optional[str] = Query(None, description="Filter by teacher ID"),
    verified_only: bool = Query(False, description="Return only verified COs")
):
    """
    List Course Outcomes with optional filters

    Args:
        course_id: Optional course UUID filter
        teacher_id: Optional teacher UUID filter
        verified_only: If True, return only verified COs

    Returns:
        List of COs
    """
    try:
        logger.info(f"Listing COs - course: {course_id}, teacher: {teacher_id}, verified: {verified_only}")

        cos = []

        # Get COs based on filters
        if course_id and teacher_id:
            cos = get_cos_by_course(UUID(course_id), UUID(teacher_id))
        elif course_id:
            cos = get_cos_by_course(UUID(course_id))
        elif teacher_id:
            cos = get_cos_by_teacher(UUID(teacher_id))
        else:
            raise HTTPException(
                status_code=400,
                detail="Please provide at least course_id or teacher_id"
            )

        # Filter by verified status if requested
        if verified_only:
            cos = [co for co in cos if co.get("verified", False)]

        # Convert to response format
        co_items = [
            COListItem(
                id=co["id"],
                course_id=co["course_id"],
                teacher_id=co["teacher_id"],
                co_text=co["co_text"],
                bloom_level=co.get("bloom_level", "Unknown"),
                verified=co.get("verified", False),
                created_at=co["created_at"]
            )
            for co in cos
        ]

        logger.info(f"Found {len(co_items)} COs")

        return COListResponse(
            success=True,
            count=len(co_items),
            cos=co_items
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"List error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to list COs: {str(e)}"
        )


@router.get("/list/{course_id}", response_model=COListResponse)
async def list_cos_by_course(
    course_id: str,
    verified_only: bool = Query(False)
):
    """
    List all COs for a specific course

    Args:
        course_id: Course UUID
        verified_only: If True, return only verified COs

    Returns:
        List of COs for the course
    """
    try:
        logger.info(f"Listing COs for course {course_id}")

        cos = get_cos_by_course(UUID(course_id))

        # Filter by verified status if requested
        if verified_only:
            cos = [co for co in cos if co.get("verified", False)]

        # Convert to response format
        co_items = [
            COListItem(
                id=co["id"],
                course_id=co["course_id"],
                teacher_id=co["teacher_id"],
                co_text=co["co_text"],
                bloom_level=co.get("bloom_level", "Unknown"),
                verified=co.get("verified", False),
                created_at=co["created_at"]
            )
            for co in cos
        ]

        return COListResponse(
            success=True,
            count=len(co_items),
            cos=co_items
        )

    except Exception as e:
        logger.error(f"List by course error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to list COs: {str(e)}"
        )


@router.get("/stats/{course_id}")
async def get_co_stats(course_id: str):
    """
    Get statistics about COs for a course

    Args:
        course_id: Course UUID

    Returns:
        CO statistics
    """
    try:
        cos = get_cos_by_course(UUID(course_id))

        # Calculate statistics
        total_cos = len(cos)
        verified_cos = sum(1 for co in cos if co.get("verified", False))

        # Bloom level distribution
        bloom_distribution = {}
        for co in cos:
            level = co.get("bloom_level", "Unknown")
            bloom_distribution[level] = bloom_distribution.get(level, 0) + 1

        return {
            "success": True,
            "course_id": course_id,
            "total_cos": total_cos,
            "verified_cos": verified_cos,
            "unverified_cos": total_cos - verified_cos,
            "verification_percentage": (verified_cos / total_cos * 100) if total_cos > 0 else 0,
            "bloom_distribution": bloom_distribution
        }

    except Exception as e:
        logger.error(f"Stats error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get stats: {str(e)}"
        )
