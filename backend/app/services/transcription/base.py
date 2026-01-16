"""Base classes and types for transcription providers"""
from abc import ABC, abstractmethod
from dataclasses import dataclass
from enum import Enum
from typing import Optional


class Provider(str, Enum):
    """Supported transcription providers"""
    GEMINI = "gemini"
    OPENAI = "openai"


@dataclass
class TranscriptionResult:
    """Result from a transcription provider"""
    text: str
    latency_ms: int
    provider: str
    model: str


class TranscriptionError(Exception):
    """Base exception for transcription failures"""
    def __init__(self, message: str, provider: str, model: Optional[str] = None):
        self.provider = provider
        self.model = model
        super().__init__(message)


class TranscriptionProvider(ABC):
    """Abstract base class for transcription providers"""
    
    name: str
    supported_models: list[str]
    default_model: str
    
    @abstractmethod
    async def transcribe(
        self,
        audio_bytes: bytes,
        audio_format: str,
        model: Optional[str] = None,
        language: str = "en",
        noisy_room: bool = False,
    ) -> TranscriptionResult:
        """
        Transcribe audio to text.
        
        Args:
            audio_bytes: Raw audio file bytes
            audio_format: Audio format (e.g., 'm4a', 'wav', 'mp3')
            model: Model to use (defaults to provider's default_model)
            language: Target language (default: en)
            noisy_room: Whether to use noise-robust prompting
        
        Returns:
            TranscriptionResult with transcript text and metadata
        
        Raises:
            TranscriptionError: If transcription fails
        """
        pass
    
    def validate_model(self, model: Optional[str]) -> str:
        """Validate and return the model to use"""
        if model is None:
            return self.default_model
        if model not in self.supported_models:
            raise TranscriptionError(
                f"Model '{model}' not supported. Supported models: {self.supported_models}",
                provider=self.name,
                model=model,
            )
        return model
