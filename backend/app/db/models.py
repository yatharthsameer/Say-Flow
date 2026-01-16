"""Pydantic models for database rows"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class TranscriptionRequest(BaseModel):
    """Model for transcription_requests table row"""
    id: str
    user_id: str
    idempotency_key: str
    created_at: datetime
    duration_ms: int
    audio_format: Optional[str] = None
    language: str = "en"
    transcript_text: str
    provider: str = "gemini"
    model: str = "gemini-2.5-flash-lite"
    provider_latency_ms: Optional[int] = None
    total_latency_ms: Optional[int] = None
    status: str = "success"


class TranscriptionRequestCreate(BaseModel):
    """Model for creating a transcription request"""
    user_id: str
    idempotency_key: str
    duration_ms: int
    audio_format: Optional[str] = None
    language: str = "en"
    transcript_text: str
    provider: str = "gemini"
    model: str = "gemini-2.5-flash-lite"
    provider_latency_ms: Optional[int] = None
    total_latency_ms: Optional[int] = None
    status: str = "success"
