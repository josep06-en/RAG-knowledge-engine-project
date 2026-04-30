import numpy as np
from typing import List
import structlog
from app.models import DocumentChunk

logger = structlog.get_logger(__name__)

class MockEmbeddingService:
    """Mock embedding service for testing without OpenAI API"""
    
    def __init__(self):
        self.model_name = "mock-embedding-service"
        self.dimension = 1536  # Match OpenAI's dimension
    
    def get_model_info(self) -> dict:
        """Get mock model information"""
        return {
            "model": self.model_name,
            "dimension": self.dimension,
            "type": "mock"
        }
    
    async def embed_chunks(self, chunks: List[DocumentChunk]) -> List[DocumentChunk]:
        """Generate fast mock embeddings for document chunks"""
        logger.info("Generating fast mock embeddings", chunk_count=len(chunks))
        
        # Generate embeddings in batch for speed
        for chunk in chunks:
            # Create a fast deterministic embedding based on content hash
            content_hash = hash(chunk.content) % 1000000
            np.random.seed(content_hash)
            chunk.embedding = np.random.random(self.dimension).astype(np.float32).tolist()
        
        logger.info("Mock embeddings generated successfully", chunk_count=len(chunks))
        return chunks
    
    async def embed_query(self, query: str) -> List[float]:
        """Generate mock embedding for a query"""
        query_hash = hash(query) % 1000000
        np.random.seed(query_hash)
        return np.random.random(self.dimension).astype(np.float32).tolist()
    
    async def generate_single_embedding(self, text: str) -> List[float]:
        """Generate embedding for a single text (alias for embed_query)"""
        return await self.embed_query(text)

# Create global instance
mock_embedding_service = MockEmbeddingService()
