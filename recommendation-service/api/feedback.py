"""
Feedback API endpoints
"""

from fastapi import APIRouter, HTTPException
from typing import List
import logging

from models.schemas import Vote, Feedback, CompletionMark
from services.feedback_service import FeedbackService

router = APIRouter()
logger = logging.getLogger(__name__)

feedback_service = FeedbackService()


@router.post("/vote")
async def submit_vote(vote: Vote):
    """
    Submit a vote for a resource
    
    - 1 for upvote (resource is helpful)
    - -1 for downvote (resource is not helpful)
    """
    try:
        logger.info(f"Vote submitted: {vote.student_id} -> {vote.resource_id} ({vote.vote})")
        await feedback_service.log_vote(vote.student_id, vote.resource_id, vote.vote)
        return {
            "success": True,
            "message": "Vote recorded successfully",
            "vote": vote.vote
        }
    except Exception as e:
        logger.error(f"Error submitting vote: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/rating")
async def submit_feedback(feedback: Feedback):
    """
    Submit feedback/rating for a resource
    
    - Rating: 1-5 stars
    - Optional comment for detailed feedback
    """
    try:
        logger.info(f"Feedback submitted: {feedback.student_id} -> {feedback.resource_id} (rating: {feedback.rating})")
        await feedback_service.log_feedback(
            feedback.student_id,
            feedback.resource_id,
            feedback.rating,
            feedback.comment
        )
        return {
            "success": True,
            "message": "Feedback recorded successfully",
            "rating": feedback.rating
        }
    except Exception as e:
        logger.error(f"Error submitting feedback: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/completion")
async def mark_completed(completion: CompletionMark):
    """
    Mark a resource as completed by student
    """
    try:
        logger.info(f"Resource marked complete: {completion.student_id} -> {completion.resource_id}")
        await feedback_service.mark_resource_completed(completion.student_id, completion.resource_id)
        return {
            "success": True,
            "message": "Resource marked as completed"
        }
    except Exception as e:
        logger.error(f"Error marking completion: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/student/{student_id}/history")
async def get_student_feedback_history(student_id: str):
    """
    Get feedback history for a student
    
    Returns all votes, ratings, and completions by the student
    """
    try:
        history = await feedback_service.get_student_history(student_id)
        return {
            "success": True,
            "student_id": student_id,
            "history": history
        }
    except Exception as e:
        logger.error(f"Error getting feedback history: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/resource/{resource_id}/stats")
async def get_resource_feedback_stats(resource_id: str):
    """
    Get aggregated feedback stats for a resource
    
    Returns votes, ratings, completions, and effectiveness score
    """
    try:
        stats = await feedback_service.get_resource_stats(resource_id)
        return {
            "success": True,
            "resource_id": resource_id,
            "stats": stats
        }
    except Exception as e:
        logger.error(f"Error getting resource stats: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))



