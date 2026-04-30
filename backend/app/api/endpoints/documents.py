from fastapi import APIRouter, HTTPException
from typing import List
import structlog
from app.models import DocumentMetadata
from app.db.vector_store import vector_store

logger = structlog.get_logger(__name__)
router = APIRouter()

@router.get("/list", response_model=List[DocumentMetadata])
async def list_documents():
    """
    Get a list of all uploaded documents.
    
    Returns:
        List of document metadata for all uploaded files
    """
    try:
        logger.info("Retrieving document list")
        
        # Get all unique documents from vector store
        documents = {}
        for chunk_id, chunk in vector_store.chunks_metadata.items():
            doc_id = chunk.document_id
            if doc_id not in documents:
                documents[doc_id] = chunk.metadata
        
        # Convert to list and sort by upload time (newest first)
        document_list = list(documents.values())
        document_list.sort(key=lambda x: x.upload_timestamp, reverse=True)
        
        logger.info("Document list retrieved", count=len(document_list))
        return document_list
        
    except Exception as e:
        logger.error("Failed to retrieve document list", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve document list")

@router.delete("/{document_id}")
async def delete_document(document_id: str):
    """
    Delete a document and all its chunks from the vector store.
    
    Args:
        document_id: ID of the document to delete
        
    Returns:
        Success message
        
    Raises:
        HTTPException: If document not found or deletion fails
    """
    try:
        logger.info("Deleting document", document_id=document_id)
        
        # Check if document exists
        documents = {}
        for chunk_id, chunk in vector_store.chunks_metadata.items():
            doc_id = chunk.document_id
            if doc_id not in documents:
                documents[doc_id] = chunk.metadata
        
        if document_id not in documents:
            logger.warning("Document not found", document_id=document_id)
            raise HTTPException(status_code=404, detail=f"Document {document_id} not found")
        
        # Delete document from vector store
        success = await vector_store.delete_document(document_id)
        
        if not success:
            logger.error("Failed to delete document", document_id=document_id)
            raise HTTPException(status_code=500, detail="Failed to delete document")
        
        logger.info("Document deleted successfully", document_id=document_id)
        return {"message": f"Document {document_id} deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to delete document", document_id=document_id, error=str(e))
        raise HTTPException(status_code=500, detail="Failed to delete document")

