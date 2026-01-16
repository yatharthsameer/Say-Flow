"""Request context helpers for timing and request ID"""
import time
import uuid
from contextvars import ContextVar
from dataclasses import dataclass, field
from typing import Optional


# Context variables for request-scoped data
request_id_var: ContextVar[str] = ContextVar("request_id", default="")
request_start_var: ContextVar[float] = ContextVar("request_start", default=0.0)


@dataclass
class RequestTiming:
    """Track timing for a request"""
    start_time: float = field(default_factory=time.time)
    gemini_latency_ms: Optional[int] = None
    
    def elapsed_ms(self) -> int:
        """Get elapsed time in milliseconds"""
        return int((time.time() - self.start_time) * 1000)
    
    def set_gemini_latency(self, latency_ms: int) -> None:
        """Record Gemini API latency"""
        self.gemini_latency_ms = latency_ms


def generate_request_id() -> str:
    """Generate a unique request ID"""
    return str(uuid.uuid4())


def get_request_id() -> str:
    """Get the current request ID from context"""
    return request_id_var.get()


def set_request_id(request_id: str) -> None:
    """Set the request ID in context"""
    request_id_var.set(request_id)
