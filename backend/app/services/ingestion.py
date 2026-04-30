import io
import asyncio
from typing import List, Optional, BinaryIO
from pathlib import Path
from datetime import datetime
import structlog
from PyPDF2 import PdfReader
from app.models import (
    DocumentMetadata, DocumentChunk, DocumentType, 
    IngestionRequest, IngestionResponse
)
from app.services.chunking import DocumentChunker
from app.config import settings

logger = structlog.get_logger(__name__)


class DocumentIngestionService:
    """
    Production-ready document ingestion service that handles PDF and text files.
    Extracts content, creates metadata, and chunks documents for processing.
    """
    
    def __init__(self):
        self.chunker = DocumentChunker()
        self.supported_formats = {'.txt', '.pdf', '.md'}
        self.max_file_size = settings.max_file_size_mb * 1024 * 1024  # Convert to bytes
    
    def _validate_file(self, filename: str, content: bytes) -> None:
        """Validate file format and size."""
        file_ext = Path(filename).suffix.lower()
        
        if file_ext not in self.supported_formats:
            raise ValueError(f"Unsupported file format: {file_ext}. Supported formats: {', '.join(self.supported_formats)}")
        
        if len(content) > self.max_file_size:
            raise ValueError(f"File size exceeds maximum allowed size of {settings.max_file_size_mb}MB")
    
    def _extract_pdf_content(self, pdf_content: bytes) -> str:
        """Extract text content from PDF bytes."""
        try:
            pdf_file = io.BytesIO(pdf_content)
            pdf_reader = PdfReader(pdf_file)
            
            text_content = []
            for page_num, page in enumerate(pdf_reader.pages):
                try:
                    page_text = page.extract_text()
                    if page_text.strip():
                        text_content.append(page_text)
                except Exception as e:
                    logger.warning("Failed to extract text from page", 
                                 page_num=page_num, error=str(e))
                    continue
            
            if not text_content:
                raise ValueError("No extractable text found in PDF")
            
            return "\n\n".join(text_content)
            
        except Exception as e:
            logger.error("PDF extraction failed", filename="unknown", error=str(e))
            raise ValueError(f"Failed to extract content from PDF: {str(e)}")
    
    def _extract_text_content(self, text_content: bytes) -> str:
        """Extract text content from text files."""
        try:
            # Try UTF-8 first, then fallback to other encodings
            encodings = ['utf-8', 'latin-1', 'cp1252']
            
            for encoding in encodings:
                try:
                    return text_content.decode(encoding)
                except UnicodeDecodeError:
                    continue
            
            raise ValueError("Unable to decode text file with supported encodings")
            
        except Exception as e:
            logger.error("Text extraction failed", error=str(e))
            raise ValueError(f"Failed to extract content from text file: {str(e)}")
    
    def _determine_document_type(self, filename: str) -> DocumentType:
        """Determine document type from filename."""
        ext = Path(filename).suffix.lower()
        
        type_mapping = {
            '.pdf': DocumentType.PDF,
            '.txt': DocumentType.TXT,
            '.md': DocumentType.MD
        }
        
        return type_mapping.get(ext, DocumentType.TXT)
    
    def _create_metadata(self, filename: str, file_size: int, document_type: DocumentType) -> DocumentMetadata:
        """Create document metadata."""
        return DocumentMetadata(
            filename=filename,
            file_type=document_type,
            file_size=file_size,
            upload_timestamp=datetime.utcnow()
        )
    
    async def ingest_document(self, filename: str, content: bytes) -> IngestionResponse:
        """
        Ingest a single document and return chunked content.
        
        Args:
            filename: Name of the file
            content: File content as bytes
            
        Returns:
            IngestionResponse with document metadata and chunks
        """
        logger.info("Starting document ingestion", filename=filename, size=len(content))
        
        try:
            # Validate file
            self._validate_file(filename, content)
            
            # Determine document type
            document_type = self._determine_document_type(filename)
            
            # Extract content based on file type
            if document_type == DocumentType.PDF:
                text_content = self._extract_pdf_content(content)
            else:  # TXT or MD
                text_content = self._extract_text_content(content)
            
            # Create metadata
            metadata = self._create_metadata(filename, len(content), document_type)
            
            # Chunk the document
            chunks = self.chunker.chunk_document(text_content, metadata)
            
            # Update metadata with chunk information
            metadata.chunk_count = len(chunks)
            metadata.total_tokens = sum(chunk.token_count for chunk in chunks)
            
            logger.info("Document ingestion completed successfully",
                       filename=filename,
                       chunk_count=len(chunks),
                       total_tokens=metadata.total_tokens)
            
            return IngestionResponse(
                document_id=metadata.document_id,
                filename=filename,
                chunk_count=len(chunks),
                total_tokens=metadata.total_tokens,
                status="success",
                message=f"Successfully ingested {filename} with {len(chunks)} chunks"
            )
            
        except Exception as e:
            logger.error("Document ingestion failed", filename=filename, error=str(e))
            raise
    
    async def ingest_document_with_chunks(self, filename: str, content: bytes) -> tuple[IngestionResponse, List[DocumentChunk]]:
        """
        Ingest document and return both response and chunks for further processing.
        """
        # Validate file
        self._validate_file(filename, content)
        
        # Determine document type
        document_type = self._determine_document_type(filename)
        
        # Extract content
        if document_type == DocumentType.PDF:
            text_content = self._extract_pdf_content(content)
        else:
            text_content = self._extract_text_content(content)
        
        # Create metadata
        metadata = self._create_metadata(filename, len(content), document_type)
        
        # Chunk the document
        chunks = self.chunker.chunk_document(text_content, metadata)
        
        # Update metadata
        metadata.chunk_count = len(chunks)
        metadata.total_tokens = sum(chunk.token_count for chunk in chunks)
        
        # Create response
        response = IngestionResponse(
            document_id=metadata.document_id,
            filename=filename,
            chunk_count=len(chunks),
            total_tokens=metadata.total_tokens,
            status="success",
            message=f"Successfully ingested {filename} with {len(chunks)} chunks"
        )
        
        return response, chunks
    
    async def batch_ingest(self, files: List[tuple[str, bytes]]) -> List[IngestionResponse]:
        """
        Ingest multiple documents in parallel.
        
        Args:
            files: List of (filename, content) tuples
            
        Returns:
            List of IngestionResponse objects
        """
        logger.info("Starting batch ingestion", file_count=len(files))
        
        tasks = [self.ingest_document(filename, content) for filename, content in files]
        responses = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Convert exceptions to error responses
        processed_responses = []
        for i, response in enumerate(responses):
            if isinstance(response, Exception):
                logger.error("Batch ingestion item failed", 
                           filename=files[i][0], error=str(response))
                processed_responses.append(IngestionResponse(
                    document_id="",
                    filename=files[i][0],
                    chunk_count=0,
                    total_tokens=0,
                    status="error",
                    message=f"Failed to ingest {files[i][0]}: {str(response)}"
                ))
            else:
                processed_responses.append(response)
        
        successful_count = sum(1 for r in processed_responses if r.status == "success")
        logger.info("Batch ingestion completed",
                   total_files=len(files),
                   successful=successful_count,
                   failed=len(files) - successful_count)
        
        return processed_responses
