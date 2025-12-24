"""
Feedback Service - handles votes, ratings, and completions
"""

import pandas as pd
import logging
import os
from datetime import datetime
from typing import Dict, Any
from core.config import settings

logger = logging.getLogger(__name__)


class FeedbackService:
    """Service for managing student feedback on resources"""
    
    def __init__(self):
        self._ensure_log_files()
    
    def _ensure_log_files(self):
        """Ensure log files exist with proper structure"""
        os.makedirs(settings.LOGS_DIR, exist_ok=True)
        
        if not os.path.exists(settings.VOTES_FILE):
            pd.DataFrame(columns=[
                "timestamp", "student_id", "resource_id", "vote"
            ]).to_csv(settings.VOTES_FILE, index=False)
        
        if not os.path.exists(settings.FEEDBACK_FILE):
            pd.DataFrame(columns=[
                "student_id", "resource_id", "rating", "comment", "timestamp"
            ]).to_csv(settings.FEEDBACK_FILE, index=False)
        
        if not os.path.exists(settings.COMPLETED_FILE):
            pd.DataFrame(columns=[
                "timestamp", "student_id", "resource_id"
            ]).to_csv(settings.COMPLETED_FILE, index=False)
    
    async def log_vote(self, student_id: str, resource_id: str, vote: int):
        """Log a vote (upvote/downvote)"""
        try:
            df = pd.DataFrame([{
                "timestamp": datetime.utcnow().isoformat(),
                "student_id": student_id,
                "resource_id": resource_id,
                "vote": int(vote)
            }])
            df.to_csv(settings.VOTES_FILE, mode="a", header=False, index=False)
            logger.info(f"Vote logged: {student_id} -> {resource_id} ({vote})")
        except Exception as e:
            logger.error(f"Error logging vote: {str(e)}", exc_info=True)
            raise
    
    async def log_feedback(
        self,
        student_id: str,
        resource_id: str,
        rating: int,
        comment: str = None
    ):
        """Log feedback with rating and optional comment"""
        try:
            df = pd.DataFrame([{
                "student_id": student_id,
                "resource_id": resource_id,
                "rating": int(rating),
                "comment": comment if comment else "",
                "timestamp": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
            }])
            df.to_csv(settings.FEEDBACK_FILE, mode="a", header=False, index=False)
            logger.info(f"Feedback logged: {student_id} -> {resource_id} (rating: {rating})")
        except Exception as e:
            logger.error(f"Error logging feedback: {str(e)}", exc_info=True)
            raise
    
    async def mark_resource_completed(self, student_id: str, resource_id: str):
        """Mark a resource as completed"""
        try:
            df = pd.DataFrame([{
                "timestamp": datetime.utcnow().isoformat(),
                "student_id": student_id,
                "resource_id": resource_id
            }])
            df.to_csv(settings.COMPLETED_FILE, mode="a", header=False, index=False)
            logger.info(f"Completion logged: {student_id} -> {resource_id}")
        except Exception as e:
            logger.error(f"Error logging completion: {str(e)}", exc_info=True)
            raise
    
    async def get_student_history(self, student_id: str) -> Dict[str, Any]:
        """Get all feedback history for a student"""
        try:
            votes = pd.read_csv(settings.VOTES_FILE)
            feedback = pd.read_csv(settings.FEEDBACK_FILE)
            completed = pd.read_csv(settings.COMPLETED_FILE)
            
            student_votes = votes[votes["student_id"] == student_id].to_dict("records")
            student_feedback = feedback[feedback["student_id"] == student_id].to_dict("records")
            student_completed = completed[completed["student_id"] == student_id].to_dict("records")
            
            return {
                "votes": student_votes,
                "feedback": student_feedback,
                "completed": student_completed,
                "stats": {
                    "total_votes": len(student_votes),
                    "total_feedback": len(student_feedback),
                    "total_completed": len(student_completed)
                }
            }
        except Exception as e:
            logger.error(f"Error getting student history: {str(e)}", exc_info=True)
            return {"votes": [], "feedback": [], "completed": [], "stats": {}}
    
    async def get_resource_stats(self, resource_id: str) -> Dict[str, Any]:
        """Get aggregated stats for a resource"""
        try:
            votes = pd.read_csv(settings.VOTES_FILE)
            feedback = pd.read_csv(settings.FEEDBACK_FILE)
            completed = pd.read_csv(settings.COMPLETED_FILE)
            
            resource_votes = votes[votes["resource_id"] == resource_id]
            resource_feedback = feedback[feedback["resource_id"] == resource_id]
            resource_completed = completed[completed["resource_id"] == resource_id]
            
            stats = {
                "total_votes": len(resource_votes),
                "upvotes": len(resource_votes[resource_votes["vote"] == 1]),
                "downvotes": len(resource_votes[resource_votes["vote"] == -1]),
                "total_ratings": len(resource_feedback),
                "average_rating": float(resource_feedback["rating"].mean()) if len(resource_feedback) > 0 else 0,
                "total_completions": len(resource_completed),
                "effectiveness_score": 0.0
            }
            
            # Calculate effectiveness score (0-5 scale)
            if stats["total_ratings"] > 0:
                stats["effectiveness_score"] = stats["average_rating"]
            elif stats["total_votes"] > 0:
                avg_vote = resource_votes["vote"].mean()  # -1 to 1
                stats["effectiveness_score"] = 1 + 4 * ((avg_vote + 1) / 2)  # Map to 1-5
            else:
                stats["effectiveness_score"] = 3.0  # Neutral
            
            return stats
            
        except Exception as e:
            logger.error(f"Error getting resource stats: {str(e)}", exc_info=True)
            return {
                "total_votes": 0,
                "upvotes": 0,
                "downvotes": 0,
                "total_ratings": 0,
                "average_rating": 0,
                "total_completions": 0,
                "effectiveness_score": 3.0
            }



