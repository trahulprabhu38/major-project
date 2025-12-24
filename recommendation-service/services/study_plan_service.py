"""
Study Plan Generation Service
"""

import logging
from typing import Dict, List, Any
from datetime import datetime

logger = logging.getLogger(__name__)


class StudyPlanService:
    """Generates personalized study plans"""
    
    def generate_plan(
        self,
        recommendations: Dict[str, List[Dict[str, Any]]],
        study_days: int,
        student_id: str
    ) -> Dict[str, Any]:
        """
        Generate a study plan distributing resources over days
        
        Args:
            recommendations: CO -> list of resources
            study_days: Number of days for the plan
            student_id: Student identifier
        
        Returns:
            Study plan with day-wise schedule
        """
        try:
            # Calculate total time
            total_time = sum(
                r.get("estimated_time_min", 0)
                for resources in recommendations.values()
                for r in resources
            )
            
            if total_time == 0:
                return {
                    "student_id": student_id,
                    "study_days": study_days,
                    "hours_per_day_needed": 0,
                    "total_hours": 0,
                    "schedule": [],
                    "generated_at": datetime.utcnow().isoformat()
                }
            
            hours_per_day_needed = total_time / (study_days * 60)
            total_hours = total_time / 60
            
            # Distribute resources across days
            schedule = []
            current_day = 1
            daily_time = 0
            max_daily_minutes = total_time / study_days if study_days > 0 else total_time
            day_resources = []
            
            for co, resources_list in recommendations.items():
                for resource in resources_list:
                    duration = int(resource.get("estimated_time_min", 30))
                    
                    # If adding this resource exceeds daily limit, start new day
                    if daily_time + duration > max_daily_minutes and current_day < study_days:
                        if day_resources:
                            schedule.append({
                                "day": current_day,
                                "total_minutes": daily_time,
                                "resources": day_resources
                            })
                        current_day += 1
                        daily_time = 0
                        day_resources = []
                    
                    # Add resource to current day
                    day_resources.append({
                        "resource_id": resource.get("resource_id"),
                        "title": resource.get("title"),
                        "co": co,
                        "topic": resource.get("topic"),
                        "estimated_time_min": duration,
                        "difficulty": resource.get("difficulty"),
                        "url": resource.get("url")
                    })
                    daily_time += duration
            
            # Add last day if it has resources
            if day_resources:
                schedule.append({
                    "day": current_day,
                    "total_minutes": daily_time,
                    "resources": day_resources
                })
            
            return {
                "student_id": student_id,
                "study_days": study_days,
                "hours_per_day_needed": round(hours_per_day_needed, 2),
                "total_hours": round(total_hours, 2),
                "schedule": schedule,
                "generated_at": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error generating study plan: {str(e)}", exc_info=True)
            raise



