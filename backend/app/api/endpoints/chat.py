import time
import structlog
import json
from datetime import datetime
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from starlette.requests import Request
from typing import List
from app.services.llm import get_llm_service
from app.services.embeddings import get_embedding_service
from app.db.vector_store import vector_store
from app.services.mock_embeddings import mock_embedding_service
from app.services.mock_llm import mock_llm_service
from app.middleware.api_key import get_user_api_key, validate_api_key
from app.models import QueryRequest, QueryResponse, ErrorResponse

logger = structlog.get_logger(__name__)

# Custom JSON encoder to handle datetime objects
class DateTimeEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, datetime):
            return obj.isoformat()
        return super().default(obj)

router = APIRouter()


@router.post("/query")
async def query_documents(http_request: Request, request: QueryRequest):
    """
    Ask a question about ingested documents using RAG (Retrieval-Augmented Generation).
    Uses user-provided API key for OpenAI services.
    
    Args:
        request: Query request with question and parameters
        
    Returns:
        QueryResponse with answer, sources, and metadata
    """
    # Get user API key (optional - allow chat without API key)
    user_api_key = await get_user_api_key(http_request)
    
    # Skip validation if no API key provided - allow mock chat
    if user_api_key:
        await validate_api_key(http_request)
    else:
        logger.info("No API key provided - using mock service for chat")
    try:
        start_time = time.time()
        
        logger.info("Processing query request",
                   query_length=len(request.query),
                   top_k=request.top_k,
                   similarity_threshold=request.similarity_threshold)
        
        # Generate embedding for the query (use real OpenAI service if API key provided, otherwise use mock)
        logger.info("Generating query embedding")
        if user_api_key:
            try:
                # Get embedding service with user API key
                user_embedding_service = get_embedding_service(user_api_key)
                query_embedding = await user_embedding_service.generate_single_embedding(request.query)
                logger.info("Used OpenAI embedding service for query")
            except Exception as e:
                logger.warning("OpenAI embedding service failed, using mock service", error=str(e))
                query_embedding = await mock_embedding_service.generate_single_embedding(request.query)
        else:
            # No API key - use mock service directly
            logger.info("No API key provided - using mock embedding service for query")
            query_embedding = await mock_embedding_service.generate_single_embedding(request.query)
        
        # Retrieve relevant document chunks
        logger.info("Searching for relevant documents", selected_docs=len(request.selected_documents))
        sources = await vector_store.similarity_search(
            query_embedding=query_embedding,
            top_k=request.top_k,
            similarity_threshold=request.similarity_threshold,
            selected_document_ids=request.selected_documents if request.selected_documents else None
        )
        
        if not sources:
            logger.warning("No relevant documents found for query", query=request.query)
            # Return a response indicating no sources found
            return QueryResponse(
                answer="I couldn't find any relevant information in the uploaded documents to answer your question. Please try rephrasing your question or upload more relevant documents.",
                sources=[],
                query=request.query,
                response_time_ms=(time.time() - start_time) * 1000,
                total_chunks_retrieved=0
            )
        
        logger.info("Retrieved relevant documents", count=len(sources))
        
        # Generate answer using RAG (use real OpenAI service if API key provided, otherwise use mock)
        if user_api_key:
            try:
                logger.info("Generating OpenAI response")
                # Get LLM service with user API key
                user_llm_service = get_llm_service(user_api_key)
                response = await user_llm_service.answer_question(request, sources)
                logger.info("Used OpenAI LLM service for response")
            except Exception as e:
                error_str = str(e)
                logger.warning("OpenAI LLM service failed, checking if quota error", error=error_str)
                
                # Check if it's a quota error - if so, fallback to mock service
                if "quota" in error_str.lower() or "429" in error_str or "insufficient_quota" in error_str:
                    logger.info("Quota exceeded, falling back to mock service")
                    # Use mock service directly with quota notification
                    context_chunks = [source.content for source in sources]
                    source_docs = [
                        {
                            "filename": source.filename,
                            "content": source.content,
                            "similarity_score": source.similarity_score,
                            "chunk_index": source.chunk_index
                        }
                        for source in sources
                    ]
                    
                    mock_answer = await mock_llm_service.generate_response(
                        request.query, 
                        context_chunks, 
                        source_docs
                    )
                    # Add quota notification to mock response
                    mock_answer += "\n\n---\n**⚠️ API Key Quota Exceeded**\n\nYour OpenAI API key has exceeded its quota. You're currently using mock services. For better results, please check your OpenAI billing or add a different API key.\n\n[🔑 Update API Key]"
                    response = mock_answer
                else:
                    # For other errors, still fallback to mock service
                    logger.warning("OpenAI LLM service failed with non-quota error, using mock service", error=error_str)
                    context_chunks = [source.content for source in sources]
                    source_docs = [
                        {
                            "filename": source.filename,
                            "content": source.content,
                            "similarity_score": source.similarity_score,
                            "chunk_index": source.chunk_index
                        }
                        for source in sources
                    ]
                    
                    response = await mock_llm_service.generate_response(
                        request.query, 
                        context_chunks, 
                        source_docs
                    )
        else:
            # No API key - use mock service directly
            logger.info("No API key provided - using mock LLM service for response")
            context_chunks = [source.content for source in sources]
            source_docs = [
                {
                    "filename": source.filename,
                    "content": source.content,
                    "similarity_score": source.similarity_score,
                    "chunk_index": source.chunk_index
                }
                for source in sources
            ]
            
            response = await mock_llm_service.generate_response(
                request.query, 
                context_chunks, 
                source_docs
            )
        
        sources_clean = []
        for source in sources:
            source_dict = source.dict()
            # Ensure no datetime objects in the source
            sources_clean.append(source_dict)
        
        # Extract the answer text from response object
        # For mock service, response is already a string
        # For OpenAI service, response has an .answer attribute
        if hasattr(response, 'answer'):
            answer_text = response.answer
        else:
            answer_text = response  # response is already a string from mock service
        
        response_dict = {
            "answer": answer_text,
            "sources": sources_clean,
            "query": request.query,
            "response_time_ms": (time.time() - start_time) * 1000,
            "total_chunks_retrieved": len(sources)
        }
        
        # Use custom JSON encoder to handle any remaining datetime objects
        response_json = json.dumps(response_dict, cls=DateTimeEncoder)
        response_data = json.loads(response_json)
        
        logger.info("Query processed successfully",
                   query=request.query,
                   sources_used=len(sources),
                   response_time_ms=response_data["response_time_ms"])
        
        return JSONResponse(
            content=response_data,
            status_code=200
        )
        
    except ValueError as e:
        logger.warning("Validation error during query", error=str(e))
        raise HTTPException(status_code=400, detail=str(e))
    
    except Exception as e:
        logger.error("Unexpected error during query processing", error=str(e))
        raise HTTPException(status_code=500, detail="Internal server error during query processing")


@router.get("/health")
async def chat_health():
    """Health check endpoint for the chat service."""
    try:
        # Test embedding service
        embedding_info = embedding_service.get_model_info()
        
        # Test LLM service
        llm_info = llm_service.get_model_info()
        
        # Get vector store stats
        vector_stats = vector_store.get_stats()
        
        return {
            "status": "healthy",
            "timestamp": time.time(),
            "services": {
                "embeddings": embedding_info,
                "llm": llm_info,
                "vector_store": vector_stats
            }
        }
        
    except Exception as e:
        logger.error("Health check failed", error=str(e))
        raise HTTPException(status_code=503, detail="Service unavailable")


@router.post("/stream")
async def stream_query(request: QueryRequest):
    """
    Stream a response for a query (placeholder for future implementation).
    
    This endpoint will implement streaming responses for real-time answers.
    """
    try:
        # For now, return the non-streamed response
        # TODO: Implement actual streaming using Server-Sent Events
        logger.info("Stream query requested (not yet implemented)", query=request.query)
        
        response = await query_documents(request)
        
        return {
            "message": "Streaming not yet implemented. Use /query endpoint for now.",
            "response": response
        }
        
    except Exception as e:
        logger.error("Stream query failed", error=str(e))
        raise HTTPException(status_code=500, detail="Internal server error")
