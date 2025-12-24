"""
Analytics API endpoints
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional
import logging

from services.analytics_service import AnalyticsService

router = APIRouter()
logger = logging.getLogger(__name__)

analytics_service = AnalyticsService()


@router.get("/overview")
async def get_analytics_overview():
    """
    Get overall analytics overview
    
    Returns:
    - Total students, resources, interactions
    - Top performing resources
    - Recent feedback
    """
    try:
        overview = await analytics_service.get_overview()
        return {
            "success": True,
            "data": overview
        }
    except Exception as e:
        logger.error(f"Error getting analytics overview: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/student/{student_id}/progress")
async def get_student_progress(student_id: str):
    """
    Get detailed progress for a student
    
    Returns:
    - Resources viewed, completed
    - Study time
    - Feedback given
    - Weak areas and improvement suggestions
    """
    try:
        progress = await analytics_service.get_student_progress(student_id)
        return {
            "success": True,
            "student_id": student_id,
            "progress": progress
        }
    except Exception as e:
        logger.error(f"Error getting student progress: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/resources/effectiveness")
async def get_resources_effectiveness(
    co: Optional[str] = None,
    topic: Optional[str] = None,
    min_interactions: int = Query(1, ge=0)
):
    """
    Get effectiveness scores for all resources
    
    Optionally filter by CO and topic
    Sort by effectiveness score
    """
    try:
        resources = await analytics_service.get_resources_effectiveness(
            co=co,
            topic=topic,
            min_interactions=min_interactions
        )
        return {
            "success": True,
            "filters": {
                "co": co,
                "topic": topic,
                "min_interactions": min_interactions
            },
            "resources": resources
        }
    except Exception as e:
        logger.error(f"Error getting resource effectiveness: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/trends/weak-areas")
async def get_weak_areas_trends(
    internal_no: Optional[int] = None,
    limit: int = Query(10, ge=1, le=50)
):
    """
    Get trending weak areas across all students
    
    Shows which COs and topics students are struggling with most
    """
    try:
        trends = await analytics_service.get_weak_areas_trends(
            internal_no=internal_no,
            limit=limit
        )
        return {
            "success": True,
            "trends": trends
        }
    except Exception as e:
        logger.error(f"Error getting weak area trends: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/teacher/dashboard")
async def get_teacher_dashboard():
    """
    Get comprehensive analytics for teacher dashboard
    
    Returns:
    - Overall statistics
    - Top resources
    - Student engagement metrics
    - Effectiveness reports
    """
    try:
        dashboard = await analytics_service.get_teacher_dashboard()
        return {
            "success": True,
            "dashboard": dashboard
        }
    except Exception as e:
        logger.error(f"Error getting teacher dashboard: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))



