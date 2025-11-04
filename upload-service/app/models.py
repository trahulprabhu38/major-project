"""
Pydantic models for request/response validation.
"""
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from datetime import datetime


class HealthResponse(BaseModel):
    """Health check response model"""
    status: str = Field(..., description="Service status (healthy/unhealthy)")
    message: str = Field(..., description="Status message")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Response timestamp")


class UploadResponse(BaseModel):
    """Response model for file upload endpoint"""
    success: bool = Field(..., description="Whether upload was successful")
    message: str = Field(..., description="Success or error message")
    table_name: str = Field(..., description="Name of created PostgreSQL table")
    row_count: int = Field(..., description="Number of rows inserted")
    column_count: int = Field(..., description="Number of columns in table")
    columns: List[str] = Field(..., description="List of column names")
    data_types: Dict[str, str] = Field(..., description="Column name to data type mapping")
    preview: Optional[List[Dict[str, Any]]] = Field(
        None,
        description="Preview of first few rows (optional)"
    )
    if_exists_action: str = Field(
        default="replace",
        description="Action taken if table existed (replace/append/fail)"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "message": "File uploaded successfully and table 'student_marks' created in PostgreSQL",
                "table_name": "student_marks",
                "row_count": 150,
                "column_count": 5,
                "columns": ["student_id", "name", "subject", "marks", "semester"],
                "data_types": {
                    "student_id": "int64",
                    "name": "object",
                    "subject": "object",
                    "marks": "float64",
                    "semester": "int64"
                },
                "preview": [
                    {"student_id": 1, "name": "John Doe", "subject": "Math", "marks": 85.5, "semester": 6},
                    {"student_id": 2, "name": "Jane Smith", "subject": "Math", "marks": 92.0, "semester": 6}
                ],
                "if_exists_action": "replace"
            }
        }


class TableInfo(BaseModel):
    """Model for table information"""
    table_name: str
    row_count: int
    columns: List[str]
    created_at: Optional[datetime] = None


class ErrorResponse(BaseModel):
    """Error response model"""
    success: bool = False
    error: str = Field(..., description="Error message")
    detail: Optional[str] = Field(None, description="Detailed error information")
    timestamp: datetime = Field(default_factory=datetime.utcnow)
