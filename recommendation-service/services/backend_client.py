"""
Backend API client for fetching student performance data
"""

import httpx
import logging
from typing import List, Dict, Any, Optional
from core.config import settings

logger = logging.getLogger(__name__)


class BackendClient:
    """Client for interacting with the main backend API"""
    
    def __init__(self):
        self.base_url = settings.BACKEND_API_URL
        self.timeout = 30.0
    
    async def _make_request(self, endpoint: str, method: str = "GET", **kwargs) -> Dict[str, Any]:
        """Make HTTP request to backend"""
        url = f"{self.base_url}{endpoint}"
        
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                if method == "GET":
                    response = await client.get(url, **kwargs)
                elif method == "POST":
                    response = await client.post(url, **kwargs)
                else:
                    raise ValueError(f"Unsupported method: {method}")
                
                response.raise_for_status()
                return response.json()
                
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error {e.response.status_code} for {url}: {e.response.text}")
            return {}
        except httpx.RequestError as e:
            logger.error(f"Request error for {url}: {str(e)}")
            return {}
        except Exception as e:
            logger.error(f"Unexpected error for {url}: {str(e)}")
            return {}
    
    async def get_course_students(self, course_id: int) -> List[Dict[str, Any]]:
        """Get list of students enrolled in a course"""
        try:
            response = await self._make_request(f"/detailed-calculations/course/{course_id}/students")
            if response.get("success"):
                return response.get("data", [])
            return []
        except Exception as e:
            logger.error(f"Error fetching course students: {str(e)}")
            return []
    
    async def get_student_performance(
        self, 
        course_id: int, 
        student_id: int
    ) -> Optional[Dict[str, Any]]:
        """Get detailed student performance data from backend"""
        try:
            response = await self._make_request(
                f"/detailed-calculations/course/{course_id}/student/{student_id}/performance"
            )
            if response.get("success"):
                return response.get("data")
            return None
        except Exception as e:
            logger.error(f"Error fetching student performance: {str(e)}")
            return None
    
    async def get_horizontal_analysis(
        self, 
        course_id: int
    ) -> List[Dict[str, Any]]:
        """Get horizontal analysis (per-student) for a course"""
        try:
            response = await self._make_request(
                f"/detailed-calculations/course/{course_id}/horizontal-analysis"
            )
            if response.get("success"):
                return response.get("data", [])
            return []
        except Exception as e:
            logger.error(f"Error fetching horizontal analysis: {str(e)}")
            return []
    
    async def get_student_marks_by_usn(
        self,
        course_id: int,
        usn: str,
        assessment_type: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Get student marks from horizontal analysis by USN
        
        This provides question-level marks which we can use for recommendations
        """
        try:
            horizontal_data = await self.get_horizontal_analysis(course_id)
            
            # Filter by USN
            student_data = [
                record for record in horizontal_data 
                if record.get("usn", "").upper() == usn.upper()
            ]
            
            # Further filter by assessment type if provided
            if assessment_type:
                student_data = [
                    record for record in student_data
                    if record.get("assessment_type") == assessment_type
                ]
            
            return student_data
            
        except Exception as e:
            logger.error(f"Error fetching student marks: {str(e)}")
            return []
    
    async def get_co_attainment(
        self,
        course_id: int
    ) -> List[Dict[str, Any]]:
        """Get combined CO attainment for a course"""
        try:
            response = await self._make_request(
                f"/detailed-calculations/course/{course_id}/combined-co-attainment"
            )
            if response.get("success"):
                return response.get("data", [])
            return []
        except Exception as e:
            logger.error(f"Error fetching CO attainment: {str(e)}")
            return []
    
    async def get_vertical_analysis(
        self,
        course_id: int
    ) -> List[Dict[str, Any]]:
        """Get vertical analysis (per-question) for a course"""
        try:
            response = await self._make_request(
                f"/detailed-calculations/course/{course_id}/vertical-analysis"
            )
            if response.get("success"):
                return response.get("data", [])
            return []
        except Exception as e:
            logger.error(f"Error fetching vertical analysis: {str(e)}")
            return []



