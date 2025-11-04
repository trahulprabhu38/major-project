"""
Pydantic models for CO Generator API
"""
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from uuid import UUID


class COUploadRequest(BaseModel):
    """Request model for syllabus upload"""
    course_id: UUID
    teacher_id: UUID


class COGenerateRequest(BaseModel):
    """Request model for CO generation"""
    course_id: UUID
    teacher_id: UUID
    n_co: int = Field(default=5, ge=1, le=20, description="Number of COs to generate")
    syllabus_file_path: Optional[str] = None


class BloomLevel(BaseModel):
    """Bloom's taxonomy level"""
    level: str
    verbs: List[str]


class GeneratedCO(BaseModel):
    """Single generated course outcome"""
    co_text: str = Field(..., description="The course outcome statement")
    bloom_level: str = Field(..., description="Bloom's taxonomy level")
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)


class COGenerateResponse(BaseModel):
    """Response model for CO generation"""
    success: bool
    message: str
    course_id: UUID
    teacher_id: UUID
    cos: List[GeneratedCO]
    generated_at: datetime = Field(default_factory=datetime.utcnow)


class COVerifyRequest(BaseModel):
    """Request to verify a CO"""
    co_id: int
    verified: bool = True


class COListItem(BaseModel):
    """Single CO in the list"""
    id: int
    course_id: UUID
    teacher_id: UUID
    co_text: str
    bloom_level: str
    verified: bool
    created_at: datetime


class COListResponse(BaseModel):
    """Response for listing COs"""
    success: bool
    count: int
    cos: List[COListItem]


class HealthResponse(BaseModel):
    """Health check response"""
    status: str
    chroma_connected: bool
    faiss_available: bool
    model_loaded: bool
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class ErrorResponse(BaseModel):
    """Error response"""
    success: bool = False
    error: str
    detail: Optional[str] = None
