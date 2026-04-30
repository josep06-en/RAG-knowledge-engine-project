import structlog
import json
from datetime import datetime
from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import structlog
from app.api import router as api_router
from app.models import HealthResponse
from app.middleware.api_key import APIKeyMiddleware
from app.config import settings
import time
from app.models import ErrorResponse

# Custom JSON encoder to handle datetime objects
class DateTimeEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, datetime):
            return obj.isoformat()
        return super().default(obj)

# Configure structured logging
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.processors.JSONRenderer()
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    wrapper_class=structlog.stdlib.BoundLogger,
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger(__name__)

# Create FastAPI application
app = FastAPI(
    title=settings.app_name,
    description="Enterprise Knowledge Retrieval System - Production-ready RAG implementation",
    version=settings.app_version,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)

# Add API key middleware (before CORS)
app.add_middleware(APIKeyMiddleware)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Include API router
app.include_router(api_router, prefix="/api/v1")


# Global exception handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    """Handle HTTP exceptions with structured logging."""
    logger.warning("HTTP exception occurred",
                  status_code=exc.status_code,
                  detail=exc.detail,
                  path=request.url.path)
    
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": f"HTTP {exc.status_code}",
            "detail": exc.detail
        }
    )


@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    """Handle unexpected exceptions with structured logging."""
    logger.error("Unexpected exception occurred",
                 error=str(exc),
                 path=request.url.path,
                 exc_info=True)
    
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal Server Error",
            "detail": "An unexpected error occurred. Please try again later."
        }
    )


@app.get("/")
async def root():
    """
    Root endpoint with basic API information.
    
    Returns:
        Basic information about the API
    """
    return {
        "name": settings.app_name,
        "version": settings.app_version,
        "description": "Enterprise Knowledge Retrieval System",
        "docs_url": "/docs",
        "health_check": "/api/v1/health"
    }


@app.get("/health")
async def simple_health():
    """
    Simple health check endpoint.
    
    Returns:
        Basic health status
    """
    return {"status": "healthy", "service": settings.app_name}


# Startup and shutdown events
@app.on_event("startup")
async def startup_event():
    """Initialize services on application startup."""
    logger.info("Starting Enterprise Knowledge Retrieval System",
                version=settings.app_version,
                debug=settings.debug)
    
    # Test OpenAI API key
    try:
        from app.services.embeddings import get_embedding_service
        embedding_service = get_embedding_service()
        embedding_info = embedding_service.get_model_info()
        logger.info("OpenAI embeddings service initialized", **embedding_info)
    except Exception as e:
        logger.error("Failed to initialize embeddings service", error=str(e))
        raise
    
    # Test vector store
    try:
        from app.db.vector_store import vector_store
        stats = vector_store.get_stats()
        logger.info("Vector store initialized", **stats)
    except Exception as e:
        logger.error("Failed to initialize vector store", error=str(e))
        raise
    
    # Test LLM service
    try:
        from app.services.llm import get_llm_service
        llm_service = get_llm_service()
        llm_info = llm_service.get_model_info()
        logger.info("OpenAI LLM service initialized", **llm_info)
    except Exception as e:
        logger.error("Failed to initialize LLM service", error=str(e))
        raise
    
    logger.info("All services initialized successfully")


@app.on_event("shutdown")
async def shutdown_event():
    """Clean up resources on application shutdown."""
    logger.info("Shutting down Enterprise Knowledge Retrieval System")
    
    # Save any pending vector store data
    try:
        from app.db.vector_store import vector_store
        vector_store._save_index()
        logger.info("Vector store data saved")
    except Exception as e:
        logger.error("Failed to save vector store data", error=str(e))
    
    logger.info("Shutdown completed")
