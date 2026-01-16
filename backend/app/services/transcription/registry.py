"""Provider registry for transcription services"""
from typing import Optional

from app.core.config import get_settings
from app.core.logging import get_logger
from app.services.transcription.base import (
    Provider,
    TranscriptionError,
    TranscriptionProvider,
)


logger = get_logger(__name__)


class ProviderRegistry:
    """Registry for transcription providers"""
    
    _providers: dict[str, TranscriptionProvider] = {}
    _initialized: bool = False
    
    @classmethod
    def register(cls, provider: TranscriptionProvider) -> None:
        """Register a transcription provider"""
        cls._providers[provider.name] = provider
        logger.debug(f"Registered transcription provider: {provider.name}")
    
    @classmethod
    def get(cls, name: str) -> TranscriptionProvider:
        """
        Get a provider by name.
        
        Args:
            name: Provider name (e.g., 'gemini', 'openai')
        
        Returns:
            The transcription provider instance
        
        Raises:
            TranscriptionError: If provider is not registered
        """
        cls._ensure_initialized()
        
        if name not in cls._providers:
            available = list(cls._providers.keys())
            raise TranscriptionError(
                f"Provider '{name}' not registered. Available providers: {available}",
                provider=name,
            )
        return cls._providers[name]
    
    @classmethod
    def get_default(cls) -> TranscriptionProvider:
        """Get the default provider based on settings"""
        cls._ensure_initialized()
        settings = get_settings()
        return cls.get(settings.default_provider)
    
    @classmethod
    def list_providers(cls) -> list[str]:
        """List all registered provider names"""
        cls._ensure_initialized()
        return list(cls._providers.keys())
    
    @classmethod
    def get_provider_info(cls) -> dict[str, dict]:
        """Get info about all registered providers"""
        cls._ensure_initialized()
        return {
            name: {
                "name": provider.name,
                "supported_models": provider.supported_models,
                "default_model": provider.default_model,
            }
            for name, provider in cls._providers.items()
        }
    
    @classmethod
    def _ensure_initialized(cls) -> None:
        """Ensure providers are registered"""
        if not cls._initialized:
            cls._initialize_providers()
    
    @classmethod
    def _initialize_providers(cls) -> None:
        """Initialize and register all available providers"""
        settings = get_settings()
        
        # Register Gemini provider if API key is configured
        if settings.gemini_api_key:
            from app.services.transcription.gemini import get_gemini_provider
            cls.register(get_gemini_provider())
        
        # Register OpenAI provider if API key is configured
        if settings.openai_api_key:
            from app.services.transcription.openai import get_openai_provider
            cls.register(get_openai_provider())
        
        cls._initialized = True
        logger.info(f"Initialized transcription providers: {list(cls._providers.keys())}")
    
    @classmethod
    def reset(cls) -> None:
        """Reset the registry (mainly for testing)"""
        cls._providers = {}
        cls._initialized = False


def get_provider(name: Optional[str] = None) -> TranscriptionProvider:
    """
    Get a transcription provider.
    
    Args:
        name: Provider name, or None for default
    
    Returns:
        The transcription provider instance
    """
    if name is None:
        return ProviderRegistry.get_default()
    return ProviderRegistry.get(name)


def get_provider_registry() -> type[ProviderRegistry]:
    """Get the provider registry class"""
    return ProviderRegistry
