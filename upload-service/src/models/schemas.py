"""
Pydantic Models for Upload Service API
"""

from pydantic import BaseModel, Field
from typing import List, Dict, Optional
from datetime import datetime


class UploadResponse(BaseModel):
    """Response for file upload"""
    success: bool
    message: str
    marksheet_id: Optional[str] = None
    file_hash: Optional[str] = None
    already_processed: bool = False
    data: Optional[Dict] = None


class MarksheetMetadata(BaseModel):
    """Marksheet metadata"""
    marksheet_id: str
    file_name: str
    file_hash: str
    file_size: int
    file_type: str
    q_columns: List[str]
    co_mappings: Dict[str, int]
    student_count: int
    total_scores: int
    uploaded_at: datetime
    status: str


class COMapping(BaseModel):
    """CO mapping for a question column"""
    column_name: str
    co_number: int


class UpdateCOMappingsRequest(BaseModel):
    """Request to update CO mappings"""
    co_mappings: List[COMapping]


class HealthResponse(BaseModel):
    """Health check response"""
    status: str
    version: str
    database_connected: bool


class ErrorResponse(BaseModel):
    """Error response"""
    success: bool = False
    message: str
    errors: Optional[List[str]] = []
