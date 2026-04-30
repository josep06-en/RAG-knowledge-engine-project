from fastapi import HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
import structlog

logger = structlog.get_logger(__name__)

class APIKeyMiddleware(BaseHTTPMiddleware):
    """
    Middleware to handle user-provided OpenAI API keys.
    Extracts API key from Authorization header and makes it available to the application.
    """
    
    async def dispatch(self, request: Request, call_next):
        # Extract API key from Authorization header
        authorization = request.headers.get("authorization")
        user_api_key = None
        
        if authorization and authorization.startswith("Bearer "):
            user_api_key = authorization[7:]  # Remove "Bearer " prefix
            logger.info("User API key provided", key_length=len(user_api_key))
        
        # Store API key in request state for later use
        request.state.user_api_key = user_api_key
        
        # Continue with the request
        response = await call_next(request)
        return response


security = HTTPBearer(auto_error=False)


async def get_user_api_key(request: Request) -> str | None:
    """
    Extract user's API key from request state.
    Returns None if no API key is provided (optional for mock services).
    """
    user_api_key = getattr(request.state, "user_api_key", None)
    
    # Return None if no API key provided (optional for mock services)
    if not user_api_key:
        return None
    
    return user_api_key


async def validate_api_key(request: Request) -> bool:
    """
    Basic validation of API key format.
    """
    user_api_key = getattr(request.state, "user_api_key", None)
    
    if not user_api_key:
        return False
    
    # Basic format validation (starts with 'sk-' and reasonable length)
    if not user_api_key.startswith("sk-") or len(user_api_key) < 20:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key format. Please provide a valid OpenAI API key."
        )
    
    return True
