"""
Recommendations API endpoints
"""

from fastapi import APIRouter, HTTPException, Query, Depends
from typing import Optional, Dict, Any
import logging

from models.schemas import (
    RecommendationRequest,
    RecommendationResponse,
    StudyPlanRequest,
    StudyPlanResponse,
    BatchRecommendationRequest
)
from services.recommender_service import RecommenderService
from services.study_plan_service import StudyPlanService
from services.backend_client import BackendClient

router = APIRouter()
logger = logging.getLogger(__name__)

recommender_service = RecommenderService()
study_plan_service = StudyPlanService()
backend_client = BackendClient()


@router.post("/student", response_model=RecommendationResponse)
async def get_recommendations(request: RecommendationRequest):
    """
    Get personalized recommendations for a student
    
    - Analyzes student performance on internal test
    - Identifies weak questions and COs
    - Recommends relevant learning resources
    - Supports collaborative filtering and content-based filtering
    """
    try:
        logger.info(f"Getting recommendations for student {request.student_id}, internal {request.internal_no}")
        
        # Get recommendations
        result = await recommender_service.recommend_for_student(
            student_id=request.student_id,
            internal_no=request.internal_no,
            threshold=request.threshold,
            top_k_per_co=request.top_k_per_co,
            use_cf=request.use_cf,
            cf_weight=request.cf_weight,
            course_id=request.course_id
        )
        
        # Add statistics
        result["statistics"] = {
            "weak_questions_count": len(result["weak_questions"]),
            "cos_affected": len(result["co_map"]),
            "topics_affected": len(result["topic_map"]),
            "total_resources": sum(len(resources) for resources in result["recommendations"].values()),
            "recommendation_mode": "collaborative_filtering" if request.use_cf else "content_based",
            "cf_weight": request.cf_weight if request.use_cf else 0
        }
        
        return result
        
    except ValueError as e:
        logger.error(f"Validation error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error getting recommendations: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to generate recommendations: {str(e)}")


@router.get("/student/{student_id}")
async def get_recommendations_by_params(
    student_id: str,
    internal_no: int = Query(..., ge=1, le=3),
    course_id: Optional[int] = None,
    threshold: int = Query(5, ge=1, le=10),
    top_k: int = Query(7, ge=1, le=20),
    use_cf: bool = Query(True),
    cf_weight: float = Query(0.7, ge=0, le=1)
):
    """Get recommendations using query parameters"""
    request = RecommendationRequest(
        student_id=student_id,
        course_id=course_id,
        internal_no=internal_no,
        threshold=threshold,
        top_k_per_co=top_k,
        use_cf=use_cf,
        cf_weight=cf_weight
    )
    return await get_recommendations(request)


@router.post("/study-plan", response_model=StudyPlanResponse)
async def generate_study_plan(request: StudyPlanRequest):
    """
    Generate a personalized study plan for a student
    
    - Distributes recommended resources over specified days
    - Balances daily study load
    - Prioritizes based on CO importance and resource difficulty
    """
    try:
        logger.info(f"Generating study plan for student {request.student_id}")
        
        # First get recommendations
        rec_result = await recommender_service.recommend_for_student(
            student_id=request.student_id,
            internal_no=request.internal_no,
            threshold=request.threshold,
            top_k_per_co=7,
            use_cf=request.use_cf,
            cf_weight=request.cf_weight
        )
        
        # Generate study plan
        study_plan = study_plan_service.generate_plan(
            recommendations=rec_result["recommendations"],
            study_days=request.study_days,
            student_id=request.student_id
        )
        
        return study_plan
        
    except Exception as e:
        logger.error(f"Error generating study plan: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to generate study plan: {str(e)}")


@router.get("/study-plan/{student_id}")
async def get_study_plan(
    student_id: str,
    internal_no: int = Query(..., ge=1, le=3),
    study_days: int = Query(7, ge=1, le=30),
    threshold: int = Query(5, ge=1, le=10)
):
    """Get study plan using query parameters"""
    request = StudyPlanRequest(
        student_id=student_id,
        internal_no=internal_no,
        study_days=study_days,
        threshold=threshold
    )
    return await generate_study_plan(request)


@router.post("/batch", response_model=Dict[str, Any])
async def get_batch_recommendations(request: BatchRecommendationRequest):
    """
    Get recommendations for multiple students
    
    Useful for teacher dashboards to see what resources
    are being recommended to multiple students
    """
    try:
        logger.info(f"Getting batch recommendations for {len(request.student_ids)} students")
        
        results = {}
        errors = {}
        
        for student_id in request.student_ids:
            try:
                result = await recommender_service.recommend_for_student(
                    student_id=student_id,
                    internal_no=request.internal_no,
                    threshold=request.threshold,
                    top_k_per_co=request.top_k_per_co,
                    use_cf=request.use_cf,
                    course_id=request.course_id
                )
                results[student_id] = {
                    "weak_questions": result["weak_questions"],
                    "co_map": result["co_map"],
                    "recommendations_count": {
                        co: len(resources) 
                        for co, resources in result["recommendations"].items()
                    }
                }
            except Exception as e:
                logger.error(f"Error for student {student_id}: {str(e)}")
                errors[student_id] = str(e)
        
        return {
            "success": True,
            "processed": len(results),
            "errors": len(errors),
            "results": results,
            "error_details": errors if errors else None
        }
        
    except Exception as e:
        logger.error(f"Error in batch recommendations: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/course/{course_id}/recommendations-summary")
async def get_course_recommendations_summary(
    course_id: int,
    internal_no: int = Query(..., ge=1, le=3)
):
    """
    Get summary of recommendations for all students in a course
    
    Useful for teachers to see overall class performance and recommendations
    """
    try:
        logger.info(f"Getting recommendations summary for course {course_id}")
        
        # Fetch student performance data from backend
        students_data = await backend_client.get_course_students(course_id)
        
        if not students_data:
            return {
                "success": True,
                "course_id": course_id,
                "internal_no": internal_no,
                "students_count": 0,
                "summary": {},
                "message": "No students found for this course"
            }
        
        # Aggregate recommendations
        co_weakness_count = {}
        topic_weakness_count = {}
        resource_popularity = {}
        
        for student in students_data:
            try:
                result = await recommender_service.recommend_for_student(
                    student_id=student["usn"],
                    internal_no=internal_no,
                    threshold=5,
                    top_k_per_co=7,
                    use_cf=False,  # Use content-based for summary
                    course_id=course_id
                )
                
                # Count CO weaknesses
                for co, questions in result["co_map"].items():
                    co_weakness_count[co] = co_weakness_count.get(co, 0) + 1
                
                # Count topic weaknesses
                for topic in result["topic_map"].keys():
                    topic_weakness_count[topic] = topic_weakness_count.get(topic, 0) + 1
                
                # Track recommended resources
                for co, resources in result["recommendations"].items():
                    for resource in resources:
                        rid = resource["resource_id"]
                        if rid not in resource_popularity:
                            resource_popularity[rid] = {
                                "count": 0,
                                "title": resource["title"],
                                "co": co,
                                "topic": resource["topic"]
                            }
                        resource_popularity[rid]["count"] += 1
                        
            except Exception as e:
                logger.error(f"Error processing student {student.get('usn')}: {str(e)}")
                continue
        
        # Sort and prepare response
        top_resources = sorted(
            resource_popularity.items(),
            key=lambda x: x[1]["count"],
            reverse=True
        )[:10]
        
        return {
            "success": True,
            "course_id": course_id,
            "internal_no": internal_no,
            "students_count": len(students_data),
            "summary": {
                "weakest_cos": sorted(co_weakness_count.items(), key=lambda x: x[1], reverse=True),
                "weakest_topics": sorted(topic_weakness_count.items(), key=lambda x: x[1], reverse=True)[:10],
                "most_recommended_resources": [
                    {
                        "resource_id": rid,
                        "title": data["title"],
                        "co": data["co"],
                        "topic": data["topic"],
                        "recommended_to_count": data["count"]
                    }
                    for rid, data in top_resources
                ]
            }
        }
        
    except Exception as e:
        logger.error(f"Error getting course summary: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))



