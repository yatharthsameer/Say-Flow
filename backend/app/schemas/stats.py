"""Response schemas for stats endpoints"""
from datetime import datetime
from typing import Optional, Literal

from pydantic import BaseModel


class StatsResponse(BaseModel):
    """Response from GET /v1/stats"""
    range: Literal["today", "7d", "30d"]
    minutes_transcribed: float
    words_transcribed_est: int
    requests: int
    last_activity_at: Optional[datetime] = None
