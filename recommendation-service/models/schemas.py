"""
Pydantic models for API requests and responses
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum


class HealthCheck(BaseModel):
    """Health check response"""
    status: str
    timestamp: str
    version: str
    environment: str


class DifficultyLevel(str, Enum):
    """Resource difficulty levels"""
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"


class ResourceType(str, Enum):
    """Resource types"""
    VIDEO = "video"
    ARTICLE = "article"
    TUTORIAL = "tutorial"
    PRACTICE = "practice"
    DOCUMENTATION = "documentation"


class Resource(BaseModel):
    """Resource model"""
    resource_id: str
    title: str
    url: str
    CO: str
    topic: str
    estimated_time_min: int
    difficulty: str
    description: str
    type: str = Field(alias="rtype", default="video")
    
    # CF-specific fields
    cf_rating: Optional[float] = None
    num_similar_students: Optional[int] = None
    hybrid_score: Optional[float] = None
    effectiveness: Optional[float] = 3.0

    class Config:
        populate_by_name = True


class RecommendationRequest(BaseModel):
    """Request for student recommendations"""
    student_id: str = Field(..., description="Student USN/ID")
    course_id: Optional[int] = Field(None, description="Course ID from backend")
    internal_no: int = Field(..., ge=1, le=3, description="Internal test number (1-3)")
    threshold: int = Field(5, ge=1, le=10, description="Pass threshold out of 10")
    top_k_per_co: int = Field(7, ge=1, le=20, description="Number of resources per CO")
    use_cf: bool = Field(True, description="Use collaborative filtering")
    cf_weight: float = Field(0.7, ge=0, le=1, description="CF weight in hybrid scoring")


class StudyPlanRequest(BaseModel):
    """Request for study plan generation"""
    student_id: str
    internal_no: int = Field(..., ge=1, le=3)
    study_days: int = Field(7, ge=1, le=30)
    threshold: int = Field(5, ge=1, le=10)
    use_cf: bool = True
    cf_weight: float = 0.7


class QuestionAnalysis(BaseModel):
    """Question-level analysis"""
    question: str
    obtained: float
    max: float
    percentage: float
    is_attempted: bool
    status: str


class AssessmentPerformance(BaseModel):
    """Assessment performance"""
    assessment_name: str
    assessment_type: str
    marks_obtained: float
    max_marks: float
    percentage: float
    all_questions: List[QuestionAnalysis]


class COPerformance(BaseModel):
    """CO-level performance"""
    co_number: int
    co_id: int
    description: str
    bloom_level: Optional[str]
    total_marks_obtained: float
    total_max_marks: float
    percentage: float
    assessments: List[AssessmentPerformance]


class RecommendationResponse(BaseModel):
    """Recommendation response"""
    student_id: str
    internal_no: int
    weak_questions: List[str]
    co_map: Dict[str, List[str]]
    topic_map: Dict[str, List[str]]
    recommendations: Dict[str, List[Resource]]
    statistics: Optional[Dict[str, Any]] = None
    generated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


class StudyPlanDay(BaseModel):
    """Single day in study plan"""
    day: int
    total_minutes: int
    resources: List[Dict[str, Any]]


class StudyPlanResponse(BaseModel):
    """Study plan response"""
    student_id: str
    study_days: int
    hours_per_day_needed: float
    total_hours: float
    schedule: List[StudyPlanDay]
    generated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


class Vote(BaseModel):
    """Vote submission"""
    student_id: str
    resource_id: str
    vote: int = Field(..., ge=-1, le=1, description="Vote: 1 (upvote) or -1 (downvote)")


class Feedback(BaseModel):
    """Feedback submission"""
    student_id: str
    resource_id: str
    rating: int = Field(..., ge=1, le=5, description="Rating from 1 to 5")
    comment: Optional[str] = None


class CompletionMark(BaseModel):
    """Resource completion mark"""
    student_id: str
    resource_id: str


class ResourceEffectivenessResponse(BaseModel):
    """Resource effectiveness metrics"""
    resource_id: str
    title: str
    effectiveness_score: float
    total_votes: int
    total_ratings: int
    average_rating: float
    completion_count: int


class AnalyticsOverview(BaseModel):
    """Analytics overview"""
    total_students: int
    total_resources: int
    total_interactions: int
    total_completions: int
    avg_resource_effectiveness: float
    top_resources: List[ResourceEffectivenessResponse]
    recent_feedback: List[Dict[str, Any]]


class StudentProgress(BaseModel):
    """Student progress tracking"""
    student_id: str
    resources_viewed: int
    resources_completed: int
    total_study_time_min: int
    feedback_given: int
    avg_rating_given: float
    weak_cos: List[str]
    improvement_areas: List[str]


class BatchRecommendationRequest(BaseModel):
    """Batch recommendation request for multiple students"""
    student_ids: List[str]
    course_id: int
    internal_no: int
    threshold: int = 5
    top_k_per_co: int = 7
    use_cf: bool = True


class ResourceUpload(BaseModel):
    """Resource upload/update"""
    resource_id: str
    title: str
    url: str
    CO: str
    topic: str
    estimated_time_min: int
    difficulty: str
    description: str
    type: str


class PerformanceDataRequest(BaseModel):
    """Request to fetch performance data from backend"""
    course_id: int
    student_id: Optional[str] = None
    internal_no: Optional[int] = None



