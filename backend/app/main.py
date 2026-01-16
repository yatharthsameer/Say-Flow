"""FastAPI application entry point"""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.core.logging import setup_logging, get_logger
from app.api.v1.routes import health, transcriptions, stats, realtime

# Setup logging on import
setup_logging()
logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler"""
    settings = get_settings()
    logger.info(f"Starting sayFlow backend (env={settings.env})")
    yield
    logger.info("Shutting down sayFlow backend")


def create_app() -> FastAPI:
    """Create and configure the FastAPI application"""
    settings = get_settings()
    
    app = FastAPI(
        title="sayFlow Backend",
        description="Audio transcription service powered by Gemini",
        version="1.0.0",
        lifespan=lifespan,
    )
    
    # CORS middleware (for local testing; macOS app typically doesn't need CORS)
    if settings.cors_origins_list:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=settings.cors_origins_list,
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )
    
    # Register v1 routes
    app.include_router(health.router, prefix="/v1", tags=["health"])
    app.include_router(transcriptions.router, prefix="/v1", tags=["transcriptions"])
    app.include_router(stats.router, prefix="/v1", tags=["stats"])
    app.include_router(realtime.router, prefix="/v1", tags=["realtime"])
    
    return app


# Create the application instance
app = create_app()
