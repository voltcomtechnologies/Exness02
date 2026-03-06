import hashlib
import secrets
import time
from fastapi import HTTPException, Header
from typing import Optional

# Default admin credentials - change these for production
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "admin123"

# In-memory token store: { token: expiry_timestamp }
_active_tokens: dict[str, float] = {}
TOKEN_EXPIRY_HOURS = 24


def _hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


def authenticate_admin(username: str, password: str) -> str:
    """Validate credentials and return a session token."""
    if username != ADMIN_USERNAME or password != ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="Invalid username or password")
    
    token = secrets.token_hex(32)
    _active_tokens[token] = time.time() + (TOKEN_EXPIRY_HOURS * 3600)
    return token


def verify_admin_token(authorization: Optional[str] = Header(None)) -> str:
    """FastAPI dependency to verify admin token on protected routes."""
    if not authorization:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Support "Bearer <token>" format
    token = authorization.replace("Bearer ", "") if authorization.startswith("Bearer ") else authorization
    
    expiry = _active_tokens.get(token)
    if not expiry:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    if time.time() > expiry:
        del _active_tokens[token]
        raise HTTPException(status_code=401, detail="Token expired")
    
    return token


def logout_admin(token: str):
    """Remove a token from active sessions."""
    clean_token = token.replace("Bearer ", "") if token.startswith("Bearer ") else token
    _active_tokens.pop(clean_token, None)
