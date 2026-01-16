"""Structured logging configuration"""
import logging
import sys
from datetime import datetime, timezone

from app.core.config import get_settings


class StructuredFormatter(logging.Formatter):
    """Custom formatter for structured logging"""
    
    def format(self, record: logging.LogRecord) -> str:
        timestamp = datetime.now(timezone.utc).isoformat()
        level = record.levelname
        message = record.getMessage()
        
        # Add extra fields if present
        extra_parts = []
        for key in ["request_id", "user_id", "duration_ms", "status"]:
            if hasattr(record, key):
                extra_parts.append(f"{key}={getattr(record, key)}")
        
        extra_str = " ".join(extra_parts)
        if extra_str:
            return f"[{timestamp}] {level}: {message} | {extra_str}"
        return f"[{timestamp}] {level}: {message}"


def setup_logging() -> None:
    """Configure application logging"""
    settings = get_settings()
    
    # Get root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, settings.log_level.upper()))
    
    # Remove existing handlers
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)
    
    # Add console handler with structured formatter
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(StructuredFormatter())
    root_logger.addHandler(console_handler)
    
    # Reduce noise from third-party libraries
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    logging.getLogger("urllib3").setLevel(logging.WARNING)


def get_logger(name: str) -> logging.Logger:
    """Get a logger with the given name"""
    return logging.getLogger(name)
