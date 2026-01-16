"""Health check endpoint"""
from datetime import datetime, timezone

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


class HealthResponse(BaseModel):
    """Health check response"""
    status: str
    version: str
    time: datetime


@router.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    """
    Health check endpoint.
    
    Returns the current server status, version, and time.
    """
    return HealthResponse(
        status="ok",
        version="v1",
        time=datetime.now(timezone.utc),
    )
