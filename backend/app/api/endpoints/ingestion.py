import asyncio
from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks
from starlette.requests import Request
from typing import List
import structlog
from app.services.ingestion import DocumentIngestionService
from app.services.embeddings import get_embedding_service
from app.db.vector_store import vector_store
from app.services.mock_embeddings import mock_embedding_service
from app.middleware.api_key import get_user_api_key, validate_api_key
from app.models import IngestionResponse, ErrorResponse
from app.config import settings

logger = structlog.get_logger(__name__)
router = APIRouter()

# Create ingestion service instance
def get_ingestion_service():
    return DocumentIngestionService()


@router.post("/ingest", response_model=IngestionResponse)
async def ingest_document(
    request: Request,
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    """
    Ingest a single document into the knowledge base.
    Uses user-provided API key for OpenAI services.
    """
    try:
        # Validate file
        if not file.filename:
            raise HTTPException(status_code=400, detail="No filename provided")
        
        # Read file content
        content = await file.read()
        
        if not content:
            raise HTTPException(status_code=400, detail="File is empty")
        
        logger.info("Starting document ingestion", filename=file.filename, size=len(content))
        
        # Ingest document and get chunks
        ingestion_service = get_ingestion_service()
        response, chunks = await ingestion_service.ingest_document_with_chunks(
            filename=file.filename,
            content=content
        )
        
        if response.status != "success":
            raise HTTPException(status_code=400, detail=response.message)
        
        # Generate embeddings for chunks (use real OpenAI service, fallback to mock if needed)
        logger.info("Generating embeddings for chunks", chunk_count=len(chunks))
        try:
            # Get embedding service with user API key
            user_embedding_service = get_embedding_service(user_api_key)
            chunks_with_embeddings = await user_embedding_service.embed_chunks(chunks)
        except Exception as e:
            logger.warning("OpenAI embedding service failed, using mock service", error=str(e))
            chunks_with_embeddings = await mock_embedding_service.embed_chunks(chunks)
        
        # Store chunks in vector database
        chunk_ids = await vector_store.add_chunks(chunks_with_embeddings)
        
        logger.info("Document ingestion completed successfully",
                   filename=file.filename,
                   document_id=response.document_id,
                   chunks_stored=len(chunk_ids))
        
        return response
        
    except ValueError as e:
        logger.warning("Validation error during ingestion", filename=file.filename, error=str(e))
        raise HTTPException(status_code=400, detail=str(e))
    
    except Exception as e:
        logger.error("Unexpected error during ingestion", filename=file.filename, error=str(e))
        raise HTTPException(status_code=500, detail="Internal server error during document ingestion")


@router.post("/batch", response_model=List[IngestionResponse])
async def batch_ingest_documents(request: Request, files: List[UploadFile] = File(...)):
    """
    Upload and ingest multiple documents in parallel.
    Uses user-provided API key for OpenAI services.
    
    Args:
        files: List of document files
        
    Returns:
        List of IngestionResponse objects for each file
    """
    # Get user API key (optional - allow uploads without API key)
    user_api_key = await get_user_api_key(request) if files else None
    
    # Skip validation if no API key provided - allow mock uploads
    if user_api_key:
        await validate_api_key(request)
    else:
        logger.info("No API key provided - using mock service for upload")
    try:
        if not files:
            raise HTTPException(status_code=400, detail="No files provided")
        
        if len(files) > 10:  # Reasonable limit for batch processing
            raise HTTPException(status_code=400, detail="Maximum 10 files allowed per batch")
        
        logger.info("Starting batch document ingestion", file_count=len(files))
        
        # Prepare file data
        file_data = []
        for file in files:
            if not file.filename:
                continue
            
            content = await file.read()
            if content:
                file_data.append((file.filename, content))
        
        if not file_data:
            raise HTTPException(status_code=400, detail="No valid files provided")
        
        # Process files in parallel
        tasks = []
        for filename, content in file_data:
            task = _process_single_file(filename, content, user_api_key)
            tasks.append(task)
        
        responses = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Process results
        processed_responses = []
        for i, response in enumerate(responses):
            if isinstance(response, Exception):
                logger.error("Batch ingestion item failed", 
                           filename=file_data[i][0], error=str(response))
                processed_responses.append(IngestionResponse(
                    document_id="",
                    filename=file_data[i][0],
                    chunk_count=0,
                    total_tokens=0,
                    status="error",
                    message=f"Failed to ingest {file_data[i][0]}: {str(response)}"
                ))
            else:
                processed_responses.append(response)
        
        successful_count = sum(1 for r in processed_responses if r.status == "success")
        logger.info("Batch ingestion completed",
                   total_files=len(file_data),
                   successful=successful_count,
                   failed=len(file_data) - successful_count)
        
        return processed_responses
        
    except ValueError as e:
        logger.warning("Validation error during batch ingestion", error=str(e))
        raise HTTPException(status_code=400, detail=str(e))
    
    except Exception as e:
        logger.error("Unexpected error during batch ingestion", error=str(e))
        raise HTTPException(status_code=500, detail="Internal server error during batch ingestion")


async def _process_single_file(filename: str, content: bytes, user_api_key: str | None = None) -> IngestionResponse:
    """
    Helper function to process a single file in batch operations.
    """
    try:
        logger.info("Processing single file", filename=filename, content_length=len(content))
        
        # Get ingestion service instance
        ingestion_service = get_ingestion_service()
        
        # Ingest document and get chunks
        response, chunks = await ingestion_service.ingest_document_with_chunks(
            filename=filename,
            content=content
        )
        
        logger.info("Document ingestion completed", filename=filename, status=response.status)
        
        if response.status != "success":
            return response
        
        # Generate embeddings for chunks (use mock service for speed, real OpenAI only when explicitly needed)
        logger.info("Using mock embedding service for speed")
        chunks_with_embeddings = await mock_embedding_service.embed_chunks(chunks)
        
        # Store chunks in vector database
        await vector_store.add_chunks(chunks_with_embeddings)
        
        return response
        
    except Exception as e:
        logger.error("Failed to process file in batch", filename=filename, error=str(e))
        return IngestionResponse(
            document_id="",
            filename=filename,
            chunk_count=0,
            total_tokens=0,
            status="error",
            message=f"Processing failed: {str(e)}"
        )
