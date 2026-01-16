"""Supabase client initialization"""
from functools import lru_cache

from supabase import create_client, Client

from app.core.config import get_settings


@lru_cache
def get_supabase_client() -> Client:
    """
    Get cached Supabase client using service role key.
    
    Uses service role key for backend operations (DB writes).
    This key should NEVER be exposed to clients.
    """
    settings = get_settings()
    return create_client(
        settings.supabase_url,
        settings.supabase_service_role_key
    )


def get_supabase() -> Client:
    """Dependency function to get Supabase client"""
    return get_supabase_client()
