from fastapi import Depends, HTTPException, Header, status
from app.integrations.supabase_client import supabase_integration
import logging

logger = logging.getLogger(__name__)

async def get_current_user(authorization: str = Header(None)) -> dict:
    """
    Validates JWT token using Supabase client.
    Extracts user details (id, email).
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing authentication token"
        )
    
    token = authorization.split(" ")[1]
    
    try:
        # Use supabase.auth.get_user(token) to verify on backend
        client = supabase_integration.get_client()
        response = client.auth.get_user(token)
        
        if not response or not response.user:
            raise HTTPException(status_code=401, detail="User not found")
            
        user = response.user
        return {
            "id": user.id,
            "email": user.email,
            "metadata": user.user_metadata
        }
            
    except Exception as e:
        logger.error(f"Auth error: {e}")
        # Supabase client usually raises explicitly on invalid tokens
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials"
        )
