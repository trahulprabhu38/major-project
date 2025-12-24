"""
Analytics Service - provides insights and statistics
"""

import pandas as pd
import logging
from typing import Dict, Any, List, Optional
from core.config import settings
from services.feedback_service import FeedbackService

logger = logging.getLogger(__name__)


class AnalyticsService:
    """Service for analytics and insights"""
    
    def __init__(self):
        self.feedback_service = FeedbackService()
    
    async def get_overview(self) -> Dict[str, Any]:
        """Get overall analytics overview"""
        try:
            # Load data
            votes = pd.read_csv(settings.VOTES_FILE)
            feedback = pd.read_csv(settings.FEEDBACK_FILE)
            completed = pd.read_csv(settings.COMPLETED_FILE)
            resources = pd.read_csv(settings.RESOURCES_FILE)
            
            # Calculate stats
            total_students = len(set(
                list(votes["student_id"].unique()) +
                list(feedback["student_id"].unique()) +
                list(completed["student_id"].unique())
            ))
            
            total_interactions = len(votes) + len(feedback) + len(completed)
            
            # Get top resources
            resource_interactions = pd.concat([
                votes[["resource_id"]],
                feedback[["resource_id"]],
                completed[["resource_id"]]
            ])
            
            top_resource_ids = resource_interactions["resource_id"].value_counts().head(10)
            
            top_resources = []
            for rid, count in top_resource_ids.items():
                stats = await self.feedback_service.get_resource_stats(rid)
                resource_info = resources[resources["resource_id"] == rid]
                if not resource_info.empty:
                    top_resources.append({
                        "resource_id": rid,
                        "title": resource_info.iloc[0].get("title", ""),
                        "interaction_count": int(count),
                        **stats
                    })
            
            # Recent feedback
            recent_feedback = feedback.sort_values("timestamp", ascending=False).head(20)
            recent_feedback_list = recent_feedback.to_dict("records")
            
            return {
                "total_students": total_students,
                "total_resources": len(resources),
                "total_interactions": total_interactions,
                "total_completions": len(completed),
                "avg_resource_effectiveness": float(feedback["rating"].mean()) if len(feedback) > 0 else 0,
                "top_resources": top_resources,
                "recent_feedback": recent_feedback_list
            }
            
        except Exception as e:
            logger.error(f"Error getting overview: {str(e)}", exc_info=True)
            return {}
    
    async def get_student_progress(self, student_id: str) -> Dict[str, Any]:
        """Get detailed progress for a student"""
        try:
            history = await self.feedback_service.get_student_history(student_id)
            
            # Calculate study time
            completed_resources = [c["resource_id"] for c in history["completed"]]
            
            resources = pd.read_csv(settings.RESOURCES_FILE)
            completed_df = resources[resources["resource_id"].isin(completed_resources)]
            
            total_study_time = completed_df["estimated_time_min"].sum()
            
            # Get weak COs (would need more context, placeholder for now)
            feedback_data = pd.DataFrame(history["feedback"])
            
            avg_rating = 0.0
            if len(feedback_data) > 0:
                avg_rating = float(feedback_data["rating"].mean())
            
            return {
                "student_id": student_id,
                "resources_viewed": history["stats"]["total_votes"] + history["stats"]["total_feedback"],
                "resources_completed": history["stats"]["total_completed"],
                "total_study_time_min": int(total_study_time),
                "feedback_given": history["stats"]["total_feedback"],
                "avg_rating_given": avg_rating,
                "weak_cos": [],  # Would need recommendation history
                "improvement_areas": []  # Would need performance tracking
            }
            
        except Exception as e:
            logger.error(f"Error getting student progress: {str(e)}", exc_info=True)
            return {}
    
    async def get_resources_effectiveness(
        self,
        co: Optional[str] = None,
        topic: Optional[str] = None,
        min_interactions: int = 1
    ) -> List[Dict[str, Any]]:
        """Get effectiveness scores for resources"""
        try:
            resources = pd.read_csv(settings.RESOURCES_FILE)
            
            # Filter
            if co:
                resources = resources[resources["CO"] == co]
            if topic:
                resources = resources[resources["topic"] == topic]
            
            # Get stats for each resource
            results = []
            for _, row in resources.iterrows():
                rid = row["resource_id"]
                stats = await self.feedback_service.get_resource_stats(rid)
                
                total_interactions = (
                    stats["total_votes"] +
                    stats["total_ratings"] +
                    stats["total_completions"]
                )
                
                if total_interactions >= min_interactions:
                    results.append({
                        "resource_id": rid,
                        "title": row.get("title", ""),
                        "co": row.get("CO", ""),
                        "topic": row.get("topic", ""),
                        "effectiveness_score": stats["effectiveness_score"],
                        "total_interactions": total_interactions,
                        **stats
                    })
            
            # Sort by effectiveness
            results.sort(key=lambda x: x["effectiveness_score"], reverse=True)
            
            return results
            
        except Exception as e:
            logger.error(f"Error getting resource effectiveness: {str(e)}", exc_info=True)
            return []
    
    async def get_weak_areas_trends(
        self,
        internal_no: Optional[int] = None,
        limit: int = 10
    ) -> Dict[str, Any]:
        """Get trending weak areas"""
        # This would require tracking recommendation history
        # Placeholder implementation
        return {
            "weak_cos": [],
            "weak_topics": [],
            "note": "Requires recommendation history tracking"
        }
    
    async def get_teacher_dashboard(self) -> Dict[str, Any]:
        """Get comprehensive teacher dashboard data"""
        try:
            overview = await self.get_overview()
            effectiveness = await self.get_resources_effectiveness()
            
            return {
                "overview": overview,
                "top_effective_resources": effectiveness[:10],
                "engagement_metrics": {
                    "total_interactions": overview.get("total_interactions", 0),
                    "completion_rate": (
                        overview.get("total_completions", 0) /
                        max(overview.get("total_interactions", 1), 1) * 100
                    )
                }
            }
            
        except Exception as e:
            logger.error(f"Error getting teacher dashboard: {str(e)}", exc_info=True)
            return {}



