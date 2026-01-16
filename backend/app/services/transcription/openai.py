"""OpenAI transcription provider"""
import io
import time
from typing import Optional

from openai import OpenAI

from app.core.config import get_settings
from app.core.logging import get_logger
from app.services.transcription.base import (
    TranscriptionError,
    TranscriptionProvider,
    TranscriptionResult,
)


logger = get_logger(__name__)


# Map audio formats to file extensions OpenAI expects
OPENAI_FORMAT_MAP = {
    "m4a": "m4a",
    "mp4": "mp4",
    "wav": "wav",
    "mp3": "mp3",
    "mpeg": "mp3",
    "mpga": "mp3",
    "webm": "webm",
    "ogg": "ogg",
    "flac": "flac",
}


class OpenAITranscriptionProvider(TranscriptionProvider):
    """Transcription provider using OpenAI's speech-to-text API"""
    
    name = "openai"
    supported_models = [
        "gpt-4o-mini-transcribe",
        "gpt-4o-transcribe",
        "gpt-audio-mini-2025-10-06",
        "whisper-1",
    ]
    default_model = "gpt-4o-mini-transcribe"
    
    def __init__(self):
        self._client: Optional[OpenAI] = None
    
    @property
    def client(self) -> OpenAI:
        """Get or create the OpenAI client"""
        if self._client is None:
            settings = get_settings()
            self._client = OpenAI(api_key=settings.openai_api_key)
        return self._client
    
    async def transcribe(
        self,
        audio_bytes: bytes,
        audio_format: str,
        model: Optional[str] = None,
        language: str = "en",
        noisy_room: bool = False,
    ) -> TranscriptionResult:
        """
        Transcribe audio using OpenAI.
        
        Args:
            audio_bytes: Raw audio file bytes
            audio_format: Audio format (e.g., 'm4a', 'wav', 'mp3')
            model: OpenAI model to use (default: gpt-4o-mini-transcribe)
            language: Target language (default: en)
            noisy_room: Whether audio was recorded in noisy environment
        
        Returns:
            TranscriptionResult with transcript text and latency
        
        Raises:
            TranscriptionError: If transcription fails
        """
        model_name = self.validate_model(model)
        start_time = time.time()
        
        # Get file extension for OpenAI
        file_ext = OPENAI_FORMAT_MAP.get(audio_format.lower(), audio_format.lower())
        
        try:
            # Create a file-like object with a name (OpenAI needs the filename)
            audio_file = io.BytesIO(audio_bytes)
            audio_file.name = f"audio.{file_ext}"
            
            # Build optional prompt for noisy audio
            prompt = None
            if noisy_room:
                prompt = (
                    "The audio may contain background noise. "
                    "Focus on the primary speaker and transcribe clearly."
                )
            
            # Call OpenAI transcription API
            response = self.client.audio.transcriptions.create(
                model=model_name,
                file=audio_file,
                language=language if language != "en" else None,  # None for auto-detect or English
                response_format="text",
                prompt=prompt,
            )
            
            latency_ms = int((time.time() - start_time) * 1000)
            
            # Response is the transcript text when response_format="text"
            transcript = response.strip() if isinstance(response, str) else str(response).strip()
            
            logger.info(
                f"Transcription completed",
                extra={
                    "provider": self.name,
                    "model": model_name,
                    "duration_ms": latency_ms,
                    "audio_format": audio_format,
                    "transcript_length": len(transcript),
                }
            )
            
            return TranscriptionResult(
                text=transcript,
                latency_ms=latency_ms,
                provider=self.name,
                model=model_name,
            )
            
        except Exception as e:
            latency_ms = int((time.time() - start_time) * 1000)
            logger.error(
                f"OpenAI transcription failed: {e}",
                extra={
                    "provider": self.name,
                    "model": model_name,
                    "duration_ms": latency_ms,
                    "audio_format": audio_format,
                }
            )
            raise TranscriptionError(
                f"Transcription failed: {str(e)}",
                provider=self.name,
                model=model_name,
            ) from e


# Singleton instance
_openai_provider: Optional[OpenAITranscriptionProvider] = None


def get_openai_provider() -> OpenAITranscriptionProvider:
    """Get the OpenAI transcription provider instance"""
    global _openai_provider
    if _openai_provider is None:
        _openai_provider = OpenAITranscriptionProvider()
    return _openai_provider
