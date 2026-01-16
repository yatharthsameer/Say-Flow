"""Authentication dependency using Supabase"""
from typing import Annotated

import httpx
from fastapi import Depends, HTTPException, Header, status
from pydantic import BaseModel

from app.core.config import get_settings, Settings
from app.core.logging import get_logger

logger = get_logger(__name__)


class CurrentUser(BaseModel):
    """Authenticated user model"""
    id: str
    email: str | None = None
    
    
async def verify_supabase_token(
    authorization: Annotated[str | None, Header()] = None,
    settings: Settings = Depends(get_settings),
) -> CurrentUser:
    """
    Verify Supabase JWT by calling Supabase Auth API.
    
    This is Option A from the PRD - simple token verification via API call.
    """
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authorization header",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Extract token from "Bearer <token>"
    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header format",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    token = parts[1]
    
    # Verify token by calling Supabase Auth API
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{settings.supabase_url}/auth/v1/user",
                headers={
                    "Authorization": f"Bearer {token}",
                    "apikey": settings.supabase_service_role_key,
                },
                timeout=10.0,
            )
            
            if response.status_code == 401:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid or expired token",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            
            if response.status_code != 200:
                logger.error(f"Supabase auth error: {response.status_code} - {response.text}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Authentication service error",
                )
            
            user_data = response.json()
            return CurrentUser(
                id=user_data["id"],
                email=user_data.get("email"),
            )
            
    except httpx.RequestError as e:
        logger.error(f"Failed to verify token: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Authentication service unavailable",
        )


# Type alias for dependency injection
AuthenticatedUser = Annotated[CurrentUser, Depends(verify_supabase_token)]
