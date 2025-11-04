"""
Verify endpoint for marking COs as verified
"""
import logging
from fastapi import APIRouter, HTTPException

from app.models.co_schema import COVerifyRequest
from app.services.database import verify_co as db_verify_co

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/verify")
async def verify_co(request: COVerifyRequest):
    """
    Mark a Course Outcome as verified or unverified

    Args:
        request: Verification request with co_id and verified status

    Returns:
        Success response
    """
    try:
        logger.info(f"Verifying CO {request.co_id}: {request.verified}")

        # Update database
        success = db_verify_co(request.co_id, request.verified)

        if not success:
            raise HTTPException(
                status_code=500,
                detail="Failed to update verification status"
            )

        return {
            "success": True,
            "message": f"CO {request.co_id} {'verified' if request.verified else 'unverified'} successfully",
            "co_id": request.co_id,
            "verified": request.verified
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Verification error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to verify CO: {str(e)}"
        )


@router.post("/verify/batch")
async def verify_cos_batch(co_ids: list[int], verified: bool = True):
    """
    Verify multiple COs at once

    Args:
        co_ids: List of CO IDs to verify
        verified: Verification status

    Returns:
        Batch verification response
    """
    try:
        logger.info(f"Batch verifying {len(co_ids)} COs")

        success_count = 0
        failed_count = 0

        for co_id in co_ids:
            try:
                db_verify_co(co_id, verified)
                success_count += 1
            except Exception as e:
                logger.error(f"Failed to verify CO {co_id}: {str(e)}")
                failed_count += 1

        return {
            "success": True,
            "message": f"Verified {success_count} COs, {failed_count} failed",
            "total": len(co_ids),
            "successful": success_count,
            "failed": failed_count
        }

    except Exception as e:
        logger.error(f"Batch verification error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to verify COs: {str(e)}"
        )
