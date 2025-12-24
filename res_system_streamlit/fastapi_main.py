"""
FastAPI service for DBMS Resource Recommendation System
"""
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime
import uvicorn
import os
import sys

# Add parent directory to path to import modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from modules.recommender_by_questions import (
    recommend_for_student,
    load_resources,
    detect_weak_questions,
    map_questions_to_cos_topics
)
from modules.recommender import (
    init_logs,
    log_vote,
    log_feedback,
    mark_resource_completed,
    aggregate_votes,
    aggregate_feedback,
    get_resource_effectiveness,
    read_votes_table,
    read_feedback_table
)

# Initialize FastAPI app
app = FastAPI(
    title="DBMS Resource Recommender API",
    description="AI-powered personalized learning resource recommendations",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize logs on startup
@app.on_event("startup")
async def startup_event():
    init_logs()

# Pydantic models for request/response
class RecommendationRequest(BaseModel):
    student_id: str
    internal_no: int
    threshold: int = 5
    top_k_per_co: int = 7
    use_cf: bool = True
    cf_weight: float = 0.7

class VoteRequest(BaseModel):
    student_id: str
    resource_id: str
    vote: int  # 1 for upvote, -1 for downvote

class FeedbackRequest(BaseModel):
    student_id: str
    resource_id: str
    rating: int  # 1-5
    comment: Optional[str] = ""

class CompletionRequest(BaseModel):
    student_id: str
    resource_id: str

class StudyPlanRequest(BaseModel):
    recommendations: Dict[str, List[Dict[str, Any]]]
    study_days: int = 7

class ResourceResponse(BaseModel):
    resource_id: str
    title: str
    url: str
    CO: str
    topic: str
    estimated_time_min: int
    difficulty: str
    description: str
    effectiveness: Optional[float] = None
    cf_rating: Optional[float] = None
    num_similar_students: Optional[int] = None
    hybrid_score: Optional[float] = None
    type: Optional[str] = None

class RecommendationResponse(BaseModel):
    student_id: str
    internal_no: int
    weak_questions: List[str]
    co_map: Dict[str, List[str]]
    topic_map: Dict[str, List[str]]
    recommendations: Dict[str, List[Dict[str, Any]]]
    total_resources: int
    total_time_minutes: int
    cos_count: int

class StudyPlanResponse(BaseModel):
    total_days: int
    hours_per_day: float
    daily_schedule: Dict[int, List[Dict[str, Any]]]

# API Endpoints

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "message": "DBMS Resource Recommender API",
        "status": "healthy",
        "version": "1.0.0"
    }

@app.get("/health")
async def health_check():
    """Health check for docker"""
    return {"status": "healthy"}

@app.post("/api/recommendations", response_model=RecommendationResponse)
async def get_recommendations(request: RecommendationRequest):
    """
    Get personalized resource recommendations for a student
    
    Args:
        student_id: Student USN
        internal_no: Internal test number (1, 2, or 3)
        threshold: Marks threshold for identifying weak areas (default: 5)
        top_k_per_co: Number of resources to recommend per CO (default: 7)
        use_cf: Use collaborative filtering (default: True)
        cf_weight: Weight for CF in hybrid recommendations (default: 0.7)
    """
    try:
        result = recommend_for_student(
            student_id=request.student_id,
            internal_no=request.internal_no,
            threshold=request.threshold,
            top_k_per_co=request.top_k_per_co,
            use_cf=request.use_cf,
            cf_weight=request.cf_weight
        )
        
        # Calculate summary statistics
        total_resources = sum(len(v) for v in result['recommendations'].values())
        total_time = sum(
            int(r.get('estimated_time_min', 0)) 
            for items in result['recommendations'].values() 
            for r in items
        )
        cos_count = len(result['recommendations'])
        
        return RecommendationResponse(
            student_id=result['student_id'],
            internal_no=result['internal_no'],
            weak_questions=result['weak_questions'],
            co_map=result['co_map'],
            topic_map=result['topic_map'],
            recommendations=result['recommendations'],
            total_resources=total_resources,
            total_time_minutes=total_time,
            cos_count=cos_count
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating recommendations: {str(e)}")

@app.get("/api/recommendations/{student_id}")
async def get_recommendations_simple(
    student_id: str,
    internal_no: int = Query(..., description="Internal test number (1-3)"),
    threshold: int = Query(5, description="Marks threshold"),
    top_k: int = Query(7, description="Resources per CO"),
    use_cf: bool = Query(True, description="Use collaborative filtering"),
    cf_weight: float = Query(0.7, description="CF weight")
):
    """Simplified GET endpoint for recommendations"""
    request = RecommendationRequest(
        student_id=student_id,
        internal_no=internal_no,
        threshold=threshold,
        top_k_per_co=top_k,
        use_cf=use_cf,
        cf_weight=cf_weight
    )
    return await get_recommendations(request)

@app.post("/api/vote")
async def submit_vote(vote_request: VoteRequest):
    """
    Submit a vote (upvote/downvote) for a resource
    
    Args:
        student_id: Student USN
        resource_id: Resource ID
        vote: 1 for upvote, -1 for downvote
    """
    try:
        if vote_request.vote not in [1, -1]:
            raise HTTPException(status_code=400, detail="Vote must be 1 or -1")
        
        log_vote(
            student_id=vote_request.student_id,
            resource_id=vote_request.resource_id,
            vote=vote_request.vote
        )
        
        return {
            "message": "Vote recorded successfully",
            "student_id": vote_request.student_id,
            "resource_id": vote_request.resource_id,
            "vote": vote_request.vote
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error recording vote: {str(e)}")

@app.post("/api/feedback")
async def submit_feedback(feedback_request: FeedbackRequest):
    """
    Submit feedback/rating for a resource
    
    Args:
        student_id: Student USN
        resource_id: Resource ID
        rating: Rating from 1-5
        comment: Optional comment
    """
    try:
        if not (1 <= feedback_request.rating <= 5):
            raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")
        
        log_feedback(
            student_id=feedback_request.student_id,
            resource_id=feedback_request.resource_id,
            rating=feedback_request.rating,
            comment=feedback_request.comment or ""
        )
        
        return {
            "message": "Feedback recorded successfully",
            "student_id": feedback_request.student_id,
            "resource_id": feedback_request.resource_id,
            "rating": feedback_request.rating
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error recording feedback: {str(e)}")

@app.post("/api/complete")
async def mark_completed(completion_request: CompletionRequest):
    """
    Mark a resource as completed by a student
    
    Args:
        student_id: Student USN
        resource_id: Resource ID
    """
    try:
        mark_resource_completed(
            student_id=completion_request.student_id,
            resource_id=completion_request.resource_id
        )
        
        return {
            "message": "Resource marked as completed",
            "student_id": completion_request.student_id,
            "resource_id": completion_request.resource_id
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error marking completion: {str(e)}")

@app.post("/api/study-plan", response_model=StudyPlanResponse)
async def generate_study_plan(request: StudyPlanRequest):
    """
    Generate a day-by-day study plan based on recommendations
    
    Args:
        recommendations: Dict of CO -> list of resources
        study_days: Number of days to spread the study plan over
    """
    try:
        recommendations_dict = request.recommendations
        study_days = request.study_days
        
        # Calculate total time
        total_time = sum(
            r.get('estimated_time_min', 0) 
            for items in recommendations_dict.values() 
            for r in items
        )
        
        if total_time == 0:
            return StudyPlanResponse(
                total_days=study_days,
                hours_per_day=0.0,
                daily_schedule={}
            )
        
        hours_per_day_needed = total_time / (study_days * 60)
        
        # Create schedule
        schedule = {}
        current_day = 1
        daily_time = 0
        max_daily_minutes = (total_time / study_days) if study_days > 0 else total_time
        
        for co, resources_list in recommendations_dict.items():
            for resource in resources_list:
                duration = int(resource.get('estimated_time_min', 30))
                
                if daily_time + duration > max_daily_minutes and current_day < study_days:
                    current_day += 1
                    daily_time = 0
                
                if current_day not in schedule:
                    schedule[current_day] = []
                
                schedule[current_day].append({
                    "resource": resource,
                    "co": co,
                    "duration": duration
                })
                daily_time += duration
        
        return StudyPlanResponse(
            total_days=study_days,
            hours_per_day=round(hours_per_day_needed, 1),
            daily_schedule=schedule
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating study plan: {str(e)}")

@app.get("/api/resources")
async def get_all_resources():
    """Get all available resources"""
    try:
        resources_df = load_resources()
        resources = resources_df.to_dict('records')
        return {
            "total": len(resources),
            "resources": resources
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error loading resources: {str(e)}")

@app.get("/api/analytics/votes")
async def get_vote_analytics():
    """Get voting analytics (admin/teacher view)"""
    try:
        votes_df = read_votes_table()
        return {
            "total_votes": len(votes_df),
            "votes": votes_df.sort_values("timestamp", ascending=False).head(200).to_dict('records')
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error loading votes: {str(e)}")

@app.get("/api/analytics/feedback")
async def get_feedback_analytics():
    """Get feedback analytics (admin/teacher view)"""
    try:
        feedback_df = read_feedback_table()
        agg_feedback = aggregate_feedback()
        
        return {
            "total_feedback": len(feedback_df),
            "recent_feedback": feedback_df.sort_values("timestamp", ascending=False).head(200).to_dict('records'),
            "aggregated": agg_feedback.to_dict('records')
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error loading feedback: {str(e)}")

@app.get("/api/student/{student_id}/weak-areas")
async def get_student_weak_areas(
    student_id: str,
    internal_no: int = Query(..., description="Internal test number (1-3)"),
    threshold: int = Query(5, description="Marks threshold")
):
    """Get weak areas (questions/COs) for a student"""
    try:
        weak_questions = detect_weak_questions(student_id, internal_no, threshold)
        
        if not weak_questions:
            return {
                "student_id": student_id,
                "internal_no": internal_no,
                "weak_questions": [],
                "cos": [],
                "topics": []
            }
        
        cos, co_map, topics, topic_map = map_questions_to_cos_topics(weak_questions, internal_no)
        
        return {
            "student_id": student_id,
            "internal_no": internal_no,
            "weak_questions": weak_questions,
            "co_map": co_map,
            "topic_map": topic_map,
            "cos": list(cos),
            "topics": list(topics)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error analyzing weak areas: {str(e)}")

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8004))
    uvicorn.run(app, host="0.0.0.0", port=port, reload=True)

