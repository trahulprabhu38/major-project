"""
Resources API endpoints
"""

from fastapi import APIRouter, HTTPException, Query, UploadFile, File
from typing import List, Optional
import logging

from models.schemas import ResourceUpload, Resource
from services.resource_service import ResourceService

router = APIRouter()
logger = logging.getLogger(__name__)

resource_service = ResourceService()


@router.get("/", response_model=List[Resource])
async def get_all_resources(
    co: Optional[str] = None,
    topic: Optional[str] = None,
    difficulty: Optional[str] = None,
    resource_type: Optional[str] = None,
    limit: int = Query(100, ge=1, le=500)
):
    """
    Get all resources with optional filtering
    
    Filters:
    - CO (Course Outcome)
    - Topic
    - Difficulty (easy, medium, hard)
    - Resource type (video, article, tutorial, etc.)
    """
    try:
        resources = await resource_service.get_resources(
            co=co,
            topic=topic,
            difficulty=difficulty,
            resource_type=resource_type,
            limit=limit
        )
        return resources
    except Exception as e:
        logger.error(f"Error getting resources: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{resource_id}", response_model=Resource)
async def get_resource_by_id(resource_id: str):
    """Get a specific resource by ID"""
    try:
        resource = await resource_service.get_resource_by_id(resource_id)
        if not resource:
            raise HTTPException(status_code=404, detail=f"Resource {resource_id} not found")
        return resource
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting resource: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/", response_model=Resource)
async def create_resource(resource: ResourceUpload):
    """
    Create a new resource
    
    Only accessible by teachers/admins
    """
    try:
        created_resource = await resource_service.create_resource(resource)
        return created_resource
    except Exception as e:
        logger.error(f"Error creating resource: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{resource_id}", response_model=Resource)
async def update_resource(resource_id: str, resource: ResourceUpload):
    """
    Update an existing resource
    
    Only accessible by teachers/admins
    """
    try:
        updated_resource = await resource_service.update_resource(resource_id, resource)
        if not updated_resource:
            raise HTTPException(status_code=404, detail=f"Resource {resource_id} not found")
        return updated_resource
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating resource: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{resource_id}")
async def delete_resource(resource_id: str):
    """
    Delete a resource
    
    Only accessible by teachers/admins
    """
    try:
        success = await resource_service.delete_resource(resource_id)
        if not success:
            raise HTTPException(status_code=404, detail=f"Resource {resource_id} not found")
        return {
            "success": True,
            "message": f"Resource {resource_id} deleted successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting resource: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/upload-csv")
async def upload_resources_csv(file: UploadFile = File(...)):
    """
    Upload resources via CSV file
    
    Expected CSV columns:
    - resource_id, title, url, CO, topic, estimated_time_min, 
      difficulty, description, type
    """
    try:
        if not file.filename.endswith('.csv'):
            raise HTTPException(status_code=400, detail="Only CSV files are accepted")
        
        result = await resource_service.upload_resources_csv(file)
        return {
            "success": True,
            "message": f"Uploaded {result['created']} resources, updated {result['updated']}",
            "details": result
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading CSV: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/co/{co}/topics")
async def get_topics_by_co(co: str):
    """Get all topics for a specific CO"""
    try:
        topics = await resource_service.get_topics_by_co(co)
        return {
            "success": True,
            "co": co,
            "topics": topics
        }
    except Exception as e:
        logger.error(f"Error getting topics: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats/summary")
async def get_resources_summary():
    """Get summary statistics of all resources"""
    try:
        summary = await resource_service.get_resources_summary()
        return {
            "success": True,
            "summary": summary
        }
    except Exception as e:
        logger.error(f"Error getting resources summary: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))



