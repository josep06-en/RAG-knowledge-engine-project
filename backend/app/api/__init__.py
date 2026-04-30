from fastapi import APIRouter
from app.api.endpoints import ingestion, chat, documents
from app.models import HealthResponse
import time
import structlog

logger = structlog.get_logger(__name__)
router = APIRouter()

# Include endpoint routers
router.include_router(ingestion.router, prefix="/ingest", tags=["Document Ingestion"])
router.include_router(chat.router, prefix="/chat", tags=["Query & Chat"])
router.include_router(documents.router, prefix="/documents", tags=["Document Management"])


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """
    Overall health check for the entire application.
    
    Returns:
        HealthResponse with system status and statistics
    """
    try:
        from app.services.embeddings import embedding_service
        from app.services.llm import llm_service
        from app.db.vector_store import vector_store
        
        # Get service statistics
        embedding_info = embedding_service.get_model_info()
        llm_info = llm_service.get_model_info()
        vector_stats = vector_store.get_stats()
        
        return HealthResponse(
            status="healthy",
            timestamp=time.time(),
            version="1.0.0",
            total_documents=len(set(chunk.metadata.document_id for chunk in vector_stats.get('total_chunks', []))),
            total_chunks=vector_stats.get('total_chunks', 0)
        )
        
    except Exception as e:
        logger.error("Health check failed", error=str(e))
        return HealthResponse(
            status="unhealthy",
            timestamp=time.time(),
            version="1.0.0",
            total_documents=0,
            total_chunks=0
        )
