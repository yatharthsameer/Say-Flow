"""Usage tracking and stats service"""
from datetime import datetime, timedelta, timezone
from typing import Optional

from supabase import Client

from app.core.logging import get_logger
from app.db.models import TranscriptionRequestCreate
from app.db.supabase import get_supabase

logger = get_logger(__name__)


class UsageService:
    """Service for tracking transcription usage and retrieving stats"""
    
    def __init__(self, supabase: Client):
        self.supabase = supabase
    
    async def check_idempotency(
        self,
        user_id: str,
        idempotency_key: str,
    ) -> Optional[dict]:
        """
        Check if a transcription with this idempotency key already exists.
        
        Returns the existing record if found, None otherwise.
        """
        try:
            response = (
                self.supabase.table("transcription_requests")
                .select("*")
                .eq("user_id", user_id)
                .eq("idempotency_key", idempotency_key)
                .execute()
            )
            
            if response.data and len(response.data) > 0:
                return response.data[0]
            return None
            
        except Exception as e:
            logger.error(f"Failed to check idempotency: {e}")
            raise
    
    async def record_transcription(
        self,
        data: TranscriptionRequestCreate,
    ) -> dict:
        """
        Record a successful transcription in the database.
        
        Returns the created record.
        """
        try:
            response = (
                self.supabase.table("transcription_requests")
                .insert(data.model_dump())
                .execute()
            )
            
            if response.data and len(response.data) > 0:
                logger.info(
                    f"Recorded transcription",
                    extra={
                        "user_id": data.user_id,
                        "duration_ms": data.duration_ms,
                    }
                )
                return response.data[0]
            
            raise Exception("No data returned from insert")
            
        except Exception as e:
            logger.error(f"Failed to record transcription: {e}")
            raise
    
    async def get_stats(
        self,
        user_id: str,
        range_type: str = "today",
    ) -> dict:
        """
        Get usage statistics for a user.
        
        Args:
            user_id: The user's ID
            range_type: One of 'today', '7d', or '30d'
        
        Returns:
            Dictionary with usage statistics
        """
        # Calculate date range
        now = datetime.now(timezone.utc)
        
        if range_type == "today":
            start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
        elif range_type == "7d":
            start_date = now - timedelta(days=7)
        elif range_type == "30d":
            start_date = now - timedelta(days=30)
        else:
            start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
        
        try:
            response = (
                self.supabase.table("transcription_requests")
                .select("duration_ms, transcript_text, created_at")
                .eq("user_id", user_id)
                .eq("status", "success")
                .gte("created_at", start_date.isoformat())
                .order("created_at", desc=True)
                .execute()
            )
            
            data = response.data or []
            
            # Calculate aggregates
            total_duration_ms = sum(r.get("duration_ms", 0) for r in data)
            total_words = sum(
                len(r.get("transcript_text", "").split())
                for r in data
            )
            
            last_activity = None
            if data:
                last_activity = data[0].get("created_at")
            
            return {
                "range": range_type,
                "minutes_transcribed": round(total_duration_ms / 60000, 2),
                "words_transcribed_est": total_words,
                "requests": len(data),
                "last_activity_at": last_activity,
            }
            
        except Exception as e:
            logger.error(f"Failed to get stats: {e}")
            raise


def get_usage_service() -> UsageService:
    """Get usage service instance"""
    return UsageService(get_supabase())
