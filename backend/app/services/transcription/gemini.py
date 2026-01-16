"""Gemini transcription provider using google-genai SDK"""
import time
from functools import lru_cache
from typing import Optional

from google import genai
from google.genai import types

from app.core.config import get_settings
from app.core.logging import get_logger
from app.services.transcription.base import (
    TranscriptionError,
    TranscriptionProvider,
    TranscriptionResult,
)


logger = get_logger(__name__)


# Map common audio formats to MIME types
MIME_TYPE_MAP = {
    "m4a": "audio/mp4",
    "mp4": "audio/mp4",
    "wav": "audio/wav",
    "mp3": "audio/mpeg",
    "aac": "audio/aac",
    "ogg": "audio/ogg",
    "flac": "audio/flac",
    "webm": "audio/webm",
}


@lru_cache
def get_genai_client() -> genai.Client:
    """Get cached Gemini client"""
    settings = get_settings()
    return genai.Client(api_key=settings.gemini_api_key)


def get_transcription_prompt(noisy_room: bool = False) -> str:
    """
    Get the transcription prompt for Gemini.
    
    Forces transcription-only output as per PRD requirements.
    """
    base_prompt = (
        "Transcribe the audio to English. "
        "Return only the transcript text. "
        "Do not add punctuation commentary, metadata, or any other text. "
        "If the audio is silent or contains no speech, return an empty string."
    )
    
    if noisy_room:
        base_prompt += (
            " The audio may contain background noise; "
            "focus on the primary speaker and be robust to noise."
        )
    
    return base_prompt


class GeminiTranscriptionProvider(TranscriptionProvider):
    """Transcription provider using Google Gemini"""
    
    name = "gemini"
    supported_models = [
        "gemini-2.5-flash-lite",
        "gemini-2.5-flash",
        "gemini-2.0-flash",
    ]
    default_model = "gemini-2.5-flash-lite"
    
    async def transcribe(
        self,
        audio_bytes: bytes,
        audio_format: str,
        model: Optional[str] = None,
        language: str = "en",
        noisy_room: bool = False,
    ) -> TranscriptionResult:
        """
        Transcribe audio using Gemini.
        
        Args:
            audio_bytes: Raw audio file bytes
            audio_format: Audio format (e.g., 'm4a', 'wav')
            model: Gemini model to use (default: gemini-2.5-flash-lite)
            language: Target language (default: en)
            noisy_room: Whether to use noise-robust prompting
        
        Returns:
            TranscriptionResult with transcript text and latency
        
        Raises:
            TranscriptionError: If transcription fails
        """
        model_name = self.validate_model(model)
        start_time = time.time()
        
        mime_type = MIME_TYPE_MAP.get(audio_format.lower(), f"audio/{audio_format}")
        
        try:
            client = get_genai_client()
            
            # Create inline audio data using the new SDK
            audio_part = types.Part.from_bytes(
                data=audio_bytes,
                mime_type=mime_type,
            )
            
            prompt = get_transcription_prompt(noisy_room)
            
            # Generate transcription using new SDK
            response = client.models.generate_content(
                model=model_name,
                contents=[prompt, audio_part],
                config=types.GenerateContentConfig(
                    temperature=0.0,  # Deterministic for transcription
                    max_output_tokens=8192,
                ),
            )
            
            latency_ms = int((time.time() - start_time) * 1000)
            
            # Extract text from response
            if response.text:
                transcript = response.text.strip()
            else:
                transcript = ""
            
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
                f"Gemini transcription failed: {e}",
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
_gemini_provider: Optional[GeminiTranscriptionProvider] = None


def get_gemini_provider() -> GeminiTranscriptionProvider:
    """Get the Gemini transcription provider instance"""
    global _gemini_provider
    if _gemini_provider is None:
        _gemini_provider = GeminiTranscriptionProvider()
    return _gemini_provider
