"""Stats endpoint"""
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.logging import get_logger
from app.deps.auth import AuthenticatedUser
from app.schemas.stats import StatsResponse
from app.services.usage import get_usage_service, UsageService

router = APIRouter()
logger = get_logger(__name__)


@router.get("/stats", response_model=StatsResponse)
async def get_stats(
    user: AuthenticatedUser,
    range: Literal["today", "7d", "30d"] = Query(default="today", description="Time range for stats"),
    usage_service: UsageService = Depends(get_usage_service),
) -> StatsResponse:
    """
    Get usage statistics for the authenticated user.
    
    Returns transcription metrics for the specified time range.
    """
    try:
        stats = await usage_service.get_stats(user.id, range)
        return StatsResponse(**stats)
    except Exception as e:
        logger.error(f"Failed to get stats: {e}", extra={"user_id": user.id})
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve statistics",
        )
