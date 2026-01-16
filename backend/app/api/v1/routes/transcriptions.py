"""Transcription endpoint"""
from datetime import datetime, timezone
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, File, Form, Header, HTTPException, UploadFile, status

from app.core.config import get_settings, Settings
from app.core.logging import get_logger
from app.db.models import TranscriptionRequestCreate
from app.deps.auth import AuthenticatedUser
from app.deps.request_context import RequestTiming, generate_request_id
from app.schemas.transcriptions import TranscriptionResponse, TimingInfo
from app.services.transcription import get_provider, TranscriptionError
from app.services.usage import get_usage_service, UsageService

router = APIRouter()
logger = get_logger(__name__)

# Allowed audio formats
ALLOWED_FORMATS = {"m4a", "mp4", "wav", "mp3", "aac", "ogg", "flac", "webm"}


@router.post("/transcriptions", response_model=TranscriptionResponse)
async def create_transcription(
    user: AuthenticatedUser,
    audio: Annotated[UploadFile, File(description="Audio file to transcribe")],
    duration_ms: Annotated[int, Form(description="Audio duration in milliseconds", gt=0)],
    audio_format: Annotated[str, Form(description="Audio format (e.g., m4a, wav)")],
    idempotency_key: Annotated[str, Header(alias="Idempotency-Key")],
    language: Annotated[str, Form(description="Target language")] = "en",
    noisy_room: Annotated[bool, Form(description="Noisy room flag")] = False,
    provider: Annotated[Optional[str], Form(description="Transcription provider (gemini, openai)")] = None,
    model: Annotated[Optional[str], Form(description="Model to use for transcription")] = None,
    x_client_request_id: Annotated[Optional[str], Header(alias="X-Client-Request-Id")] = None,
    settings: Settings = Depends(get_settings),
    usage_service: UsageService = Depends(get_usage_service),
) -> TranscriptionResponse:
    """
    Transcribe uploaded audio using Gemini.
    
    Requires authentication via Supabase JWT.
    Supports idempotency via Idempotency-Key header.
    
    Audio is processed in-memory and not stored on the server.
    """
    timing = RequestTiming()
    request_id = x_client_request_id or generate_request_id()
    
    # Validate audio format
    format_lower = audio_format.lower()
    if format_lower not in ALLOWED_FORMATS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported audio format: {audio_format}. Allowed: {', '.join(ALLOWED_FORMATS)}",
        )
    
    # Check idempotency - return existing result if found
    existing = await usage_service.check_idempotency(user.id, idempotency_key)
    if existing:
        logger.info(f"Returning cached transcription for idempotency key", extra={"request_id": request_id})
        return TranscriptionResponse(
            id=existing["id"],
            text=existing["transcript_text"],
            duration_ms=existing["duration_ms"],
            language=existing.get("language", "en"),
            provider=existing.get("provider", "gemini"),
            model=existing.get("model", "gemini-2.5-flash-lite"),
            created_at=existing["created_at"],
            request_id=request_id,
            timing=TimingInfo(
                provider_latency_ms=existing.get("provider_latency_ms", 0),
                total_latency_ms=existing.get("total_latency_ms", 0),
            ),
        )
    
    # Read and validate audio file
    audio_bytes = await audio.read()
    
    if len(audio_bytes) > settings.max_audio_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Audio file too large. Maximum size: {settings.max_audio_mb}MB",
        )
    
    if len(audio_bytes) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Audio file is empty",
        )
    
    # Validate duration
    max_duration_ms = settings.max_audio_seconds * 1000
    if duration_ms > max_duration_ms:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Audio duration exceeds maximum of {settings.max_audio_seconds} seconds",
        )
    
    # Get the transcription provider
    try:
        transcriber = get_provider(provider)
    except TranscriptionError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    
    # Transcribe audio
    try:
        result = await transcriber.transcribe(
            audio_bytes=audio_bytes,
            audio_format=format_lower,
            model=model,
            noisy_room=noisy_room,
            language=language,
        )
    except TranscriptionError as e:
        logger.error(f"Transcription failed: {e}", extra={"request_id": request_id, "provider": e.provider})
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Transcription service failed. Please retry.",
        )
    
    total_latency_ms = timing.elapsed_ms()
    
    # Record usage
    try:
        record = await usage_service.record_transcription(
            TranscriptionRequestCreate(
                user_id=user.id,
                idempotency_key=idempotency_key,
                duration_ms=duration_ms,
                audio_format=format_lower,
                language=language,
                transcript_text=result.text,
                provider=result.provider,
                model=result.model,
                provider_latency_ms=result.latency_ms,
                total_latency_ms=total_latency_ms,
                status="success",
            )
        )
    except Exception as e:
        # Log but don't fail the request - transcription succeeded
        logger.error(f"Failed to record usage: {e}", extra={"request_id": request_id})
        # Return without DB record ID
        return TranscriptionResponse(
            id=generate_request_id(),  # Generate a temporary ID
            text=result.text,
            duration_ms=duration_ms,
            language=language,
            provider=result.provider,
            model=result.model,
            created_at=datetime.now(timezone.utc),
            request_id=request_id,
            timing=TimingInfo(
                provider_latency_ms=result.latency_ms,
                total_latency_ms=total_latency_ms,
            ),
        )
    
    logger.info(
        f"Transcription completed",
        extra={
            "request_id": request_id,
            "user_id": user.id,
            "duration_ms": duration_ms,
            "provider": result.provider,
            "model": result.model,
            "status": "success",
        }
    )
    
    return TranscriptionResponse(
        id=record["id"],
        text=result.text,
        duration_ms=duration_ms,
        language=language,
        provider=result.provider,
        model=result.model,
        created_at=record["created_at"],
        request_id=request_id,
        timing=TimingInfo(
            provider_latency_ms=result.latency_ms,
            total_latency_ms=total_latency_ms,
        ),
    )
