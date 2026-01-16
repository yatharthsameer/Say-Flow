"""Request and response schemas for transcription endpoints"""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class TimingInfo(BaseModel):
    """Timing information for a transcription request"""
    provider_latency_ms: int
    total_latency_ms: int


class TranscriptionResponse(BaseModel):
    """Response from POST /v1/transcriptions"""
    id: str
    text: str
    duration_ms: int
    language: str = "en"
    provider: str = "gemini"
    model: str = "gemini-2.5-flash-lite"
    created_at: datetime
    request_id: str
    timing: TimingInfo


class TranscriptionForm(BaseModel):
    """
    Form data for transcription request.
    
    Note: This is used for documentation/validation.
    Actual form parsing is done in the route.
    """
    duration_ms: int = Field(..., gt=0, description="Audio duration in milliseconds")
    audio_format: str = Field(..., description="Audio format (e.g., m4a, wav)")
    language: str = Field(default="en", description="Target language")
    noisy_room: bool = Field(default=False, description="Whether the audio was recorded in a noisy environment")
    provider: Optional[str] = Field(default=None, description="Transcription provider (e.g., gemini, openai)")
    model: Optional[str] = Field(default=None, description="Model to use for transcription")
