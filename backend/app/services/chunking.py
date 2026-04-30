import tiktoken
import re
from typing import List, Tuple
from app.models import DocumentChunk, DocumentMetadata, DocumentType
from app.config import settings
import structlog

logger = structlog.get_logger(__name__)


class DocumentChunker:
    """
    Intelligent document chunking service that splits documents into 
    optimal chunks based on token count and semantic boundaries.
    """
    
    def __init__(self):
        self.encoding = tiktoken.get_encoding("cl100k_base")  # OpenAI's encoding
        self.chunk_min_tokens = settings.chunk_min_tokens
        self.chunk_max_tokens = settings.chunk_max_tokens
        self.chunk_overlap_tokens = settings.chunk_overlap_tokens
    
    def count_tokens(self, text: str) -> int:
        """Count the number of tokens in a text string."""
        return len(self.encoding.encode(text))
    
    def split_by_sentences(self, text: str) -> List[str]:
        """Split text into sentences while preserving paragraph structure."""
        # Split by sentence boundaries (., !, ?) followed by whitespace
        sentences = re.split(r'(?<=[.!?])\s+', text.strip())
        return [s.strip() for s in sentences if s.strip()]
    
    def split_by_paragraphs(self, text: str) -> List[str]:
        """Split text into paragraphs."""
        paragraphs = re.split(r'\n\s*\n', text.strip())
        return [p.strip() for p in paragraphs if p.strip()]
    
    def create_chunk_with_overlap(self, chunks: List[str], start_idx: int, target_tokens: int) -> Tuple[str, int]:
        """Create a chunk with overlap from the chunks list."""
        chunk_text = ""
        token_count = 0
        i = start_idx
        
        # Add overlap from previous chunk if available
        if start_idx > 0 and self.chunk_overlap_tokens > 0:
            prev_chunks_text = " ".join(chunks[max(0, start_idx - 2):start_idx])
            prev_tokens = self.count_tokens(prev_chunks_text)
            if prev_tokens <= self.chunk_overlap_tokens:
                chunk_text += prev_chunks_text + " "
                token_count += prev_tokens
        
        # Add current and subsequent chunks until target tokens reached
        while i < len(chunks) and token_count < target_tokens:
            chunk_tokens = self.count_tokens(chunks[i])
            if token_count + chunk_tokens > self.chunk_max_tokens:
                break
            
            if chunk_text:
                chunk_text += " "
            chunk_text += chunks[i]
            token_count += chunk_tokens
            i += 1
        
        return chunk_text, token_count
    
    def chunk_document(self, content: str, metadata: DocumentMetadata) -> List[DocumentChunk]:
        """
        Chunk a document into optimal pieces for embedding and retrieval.
        
        Args:
            content: The document content
            metadata: Document metadata
            
        Returns:
            List of DocumentChunk objects
        """
        logger.info("Starting document chunking", 
                   filename=metadata.filename,
                   content_length=len(content))
        
        # Clean and normalize content
        content = re.sub(r'\s+', ' ', content.strip())
        
        # Strategy selection based on document type and content
        if metadata.file_type == DocumentType.TXT:
            chunks = self._chunk_text_document(content, metadata)
        elif metadata.file_type == DocumentType.MD:
            chunks = self._chunk_markdown_document(content, metadata)
        elif metadata.file_type == DocumentType.PDF:
            chunks = self._chunk_text_document(content, metadata)  # PDFs become text after extraction
        else:
            chunks = self._chunk_generic(content, metadata)
        
        logger.info("Document chunking completed",
                   filename=metadata.filename,
                   chunk_count=len(chunks),
                   total_tokens=sum(chunk.token_count for chunk in chunks))
        
        return chunks
    
    def _chunk_text_document(self, content: str, metadata: DocumentMetadata) -> List[DocumentChunk]:
        """Chunk plain text documents using paragraph and sentence boundaries."""
        paragraphs = self.split_by_paragraphs(content)
        
        if not paragraphs:
            return self._chunk_generic(content, metadata)
        
        chunks = []
        chunk_index = 0
        
        i = 0
        while i < len(paragraphs):
            # Try to create chunk with optimal token count
            chunk_text, token_count = self.create_chunk_with_overlap(
                paragraphs, i, self.chunk_max_tokens
            )
            
            if token_count < self.chunk_min_tokens and i + 1 < len(paragraphs):
                # If chunk is too small, try to include more content
                chunk_text, token_count = self.create_chunk_with_overlap(
                    paragraphs, i, self.chunk_max_tokens * 1.5
                )
            
            if token_count >= self.chunk_min_tokens:
                chunk = DocumentChunk(
                    document_id=metadata.document_id,
                    chunk_index=chunk_index,
                    content=chunk_text,
                    token_count=token_count,
                    metadata=metadata
                )
                chunks.append(chunk)
                chunk_index += 1
            
            # Move forward, accounting for overlap
            i += max(1, len(paragraphs) // 10)  # Move forward by 10% of paragraphs
        
        return chunks if chunks else self._chunk_generic(content, metadata)
    
    def _chunk_markdown_document(self, content: str, metadata: DocumentMetadata) -> List[DocumentChunk]:
        """Chunk markdown documents preserving structure."""
        # Split by headers first
        sections = re.split(r'^(#{1,6}\s+.+)$', content, flags=re.MULTILINE)
        
        chunks = []
        chunk_index = 0
        
        # Process sections, preserving headers
        for i in range(0, len(sections), 2):
            if i + 1 < len(sections):
                section_content = sections[i] + sections[i + 1]
                section_chunks = self._chunk_text_document(section_content, metadata)
                
                # Adjust chunk indices
                for chunk in section_chunks:
                    chunk.chunk_index = chunk_index
                    chunks.append(chunk)
                    chunk_index += 1
        
        return chunks if chunks else self._chunk_generic(content, metadata)
    
    def _chunk_generic(self, content: str, metadata: DocumentMetadata) -> List[DocumentChunk]:
        """Generic chunking method as fallback."""
        chunks = []
        chunk_index = 0
        
        # Split by sentences as last resort
        sentences = self.split_by_sentences(content)
        
        i = 0
        while i < len(sentences):
            chunk_text, token_count = self.create_chunk_with_overlap(
                sentences, i, self.chunk_max_tokens
            )
            
            if token_count >= self.chunk_min_tokens // 2:  # Lower threshold for generic method
                chunk = DocumentChunk(
                    document_id=metadata.document_id,
                    chunk_index=chunk_index,
                    content=chunk_text,
                    token_count=token_count,
                    metadata=metadata
                )
                chunks.append(chunk)
                chunk_index += 1
            
            i += max(1, len(sentences) // 20)  # Move forward by 5% of sentences
        
        # If still no chunks, create one with all content
        if not chunks and content.strip():
            chunk = DocumentChunk(
                document_id=metadata.document_id,
                chunk_index=0,
                content=content,
                token_count=self.count_tokens(content),
                metadata=metadata
            )
            chunks.append(chunk)
        
        return chunks
