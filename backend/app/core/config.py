"""Application configuration using pydantic-settings"""
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",  # Allow extra env vars like DATABASE_URL
    )
    
    # Supabase (required for auth and DB operations)
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""
    
    # Transcription Providers
    gemini_api_key: str = ""
    openai_api_key: str = ""
    
    # Default transcription settings
    default_provider: str = "gemini"
    default_model: str = "gemini-2.5-flash-lite"
    
    # Application
    env: str = "dev"
    log_level: str = "INFO"
    max_audio_mb: int = 20
    max_audio_seconds: int = 120
    
    # CORS
    cors_origins: str = ""
    
    @property
    def max_audio_bytes(self) -> int:
        """Maximum audio file size in bytes"""
        return self.max_audio_mb * 1024 * 1024
    
    @property
    def cors_origins_list(self) -> list[str]:
        """Parse CORS origins from comma-separated string"""
        if not self.cors_origins:
            return []
        return [origin.strip() for origin in self.cors_origins.split(",")]
    
    @property
    def is_production(self) -> bool:
        """Check if running in production"""
        return self.env.lower() == "prod"


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()
