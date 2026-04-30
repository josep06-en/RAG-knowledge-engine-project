import asyncio
from typing import List, Dict, Any, Optional
import openai
import tiktoken
import numpy as np
import structlog
from app.models import EmbeddingRequest, EmbeddingResponse
from app.config import settings

logger = structlog.get_logger(__name__)


class OpenAIEmbeddingService:
    """
    Production-ready OpenAI embeddings service for generating text embeddings.
    Supports batch processing and automatic retry logic.
    """
    
    def __init__(self, api_key: Optional[str] = None):
        # Use provided API key or fall back to settings
        effective_api_key = api_key or settings.openai_api_key
        self.client = openai.OpenAI(api_key=effective_api_key)
        self.model = settings.openai_embedding_model
        self.max_tokens = settings.openai_max_tokens
        self.encoding = tiktoken.get_encoding("cl100k_base")
        
        logger.info("Initialized OpenAI embedding service", 
                   model=self.model, 
                   has_user_key=bool(api_key))
    
    def _count_tokens(self, text: str) -> int:
        """Count tokens in text using OpenAI's encoding."""
        return len(self.encoding.encode(text))
    
    def _validate_texts(self, texts: List[str]) -> None:
        """Validate texts before embedding generation."""
        if not texts:
            raise ValueError("No texts provided for embedding generation")
        
        for i, text in enumerate(texts):
            if not text.strip():
                raise ValueError(f"Text at index {i} is empty")
            
            token_count = self._count_tokens(text)
            if token_count > self.max_tokens:
                raise ValueError(f"Text at index {i} exceeds maximum token limit: {token_count} > {self.max_tokens}")
    
    async def generate_embeddings(self, texts: List[str]) -> List[List[float]]:
        """
        Generate embeddings for a list of texts using OpenAI's API.
        
        Args:
            texts: List of text strings to embed
            
        Returns:
            List of embedding vectors
        """
        self._validate_texts(texts)
        
        try:
            # Process in batches to handle rate limits
            batch_size = 100  # OpenAI's recommended batch size
            all_embeddings = []
            
            for i in range(0, len(texts), batch_size):
                batch_texts = texts[i:i + batch_size]
                
                logger.debug("Generating embeddings for batch",
                           batch_start=i,
                           batch_size=len(batch_texts),
                           total_texts=len(texts))
                
                # Call OpenAI API
                response = self.client.embeddings.create(
                    model=self.model,
                    input=batch_texts
                )
                
                # Extract embeddings
                batch_embeddings = [item.embedding for item in response.data]
                all_embeddings.extend(batch_embeddings)
                
                # Add small delay to respect rate limits
                if i + batch_size < len(texts):
                    await asyncio.sleep(0.1)
            
            logger.info("Successfully generated embeddings",
                       text_count=len(texts),
                       embedding_dimension=len(all_embeddings[0]) if all_embeddings else 0)
            
            return all_embeddings
            
        except openai.RateLimitError as e:
            logger.error("OpenAI rate limit exceeded", error=str(e))
            raise Exception(f"Rate limit exceeded. Please try again later: {str(e)}")
        
        except openai.APIError as e:
            logger.error("OpenAI API error", error=str(e))
            raise Exception(f"OpenAI API error: {str(e)}")
        
        except Exception as e:
            logger.error("Failed to generate embeddings", error=str(e))
            raise
    
    async def generate_single_embedding(self, text: str) -> List[float]:
        """
        Generate embedding for a single text.
        
        Args:
            text: Text string to embed
            
        Returns:
            Single embedding vector
        """
        embeddings = await self.generate_embeddings([text])
        return embeddings[0]
    
    async def generate_embeddings_with_usage(
        self, 
        texts: List[str]
    ) -> tuple[List[List[float]], int]:
        """
        Generate embeddings and return usage information.
        
        Args:
            texts: List of text strings to embed
            
        Returns:
            Tuple of (embeddings, total_tokens_used)
        """
        self._validate_texts(texts)
        
        try:
            # Calculate total tokens
            total_tokens = sum(self._count_tokens(text) for text in texts)
            
            # Generate embeddings
            embeddings = await self.generate_embeddings(texts)
            
            return embeddings, total_tokens
            
        except Exception as e:
            logger.error("Failed to generate embeddings with usage", error=str(e))
            raise
    
    def calculate_similarity(self, embedding1: List[float], embedding2: List[float]) -> float:
        """
        Calculate cosine similarity between two embedding vectors.
        
        Args:
            embedding1: First embedding vector
            embedding2: Second embedding vector
            
        Returns:
            Cosine similarity score (0.0 to 1.0)
        """
        vec1 = np.array(embedding1, dtype=np.float32)
        vec2 = np.array(embedding2, dtype=np.float32)
        
        # Calculate cosine similarity
        dot_product = np.dot(vec1, vec2)
        norm1 = np.linalg.norm(vec1)
        norm2 = np.linalg.norm(vec2)
        
        if norm1 == 0 or norm2 == 0:
            return 0.0
        
        similarity = dot_product / (norm1 * norm2)
        
        # Ensure result is in [0, 1] range
        return float(max(0.0, min(1.0, similarity)))
    
    async def embed_chunks(self, chunks: List[Any]) -> List[Any]:
        """
        Embed document chunks and attach embeddings to chunk objects.
        
        Args:
            chunks: List of chunk objects with content property
            
        Returns:
            List of chunk objects with embedding property added
        """
        if not chunks:
            return []
        
        # Extract text content from chunks
        texts = [chunk.content for chunk in chunks]
        
        # Generate embeddings
        embeddings = await self.generate_embeddings(texts)
        
        # Attach embeddings to chunks
        for chunk, embedding in zip(chunks, embeddings):
            chunk.embedding = embedding
        
        logger.info("Embedded chunks", chunk_count=len(chunks))
        
        return chunks
    
    def get_model_info(self) -> Dict[str, Any]:
        """Get information about the embedding model."""
        return {
            "model": self.model,
            "max_tokens": self.max_tokens,
            "provider": "OpenAI",
            "dimension": 1536 if "text-embedding-3-small" in self.model else 1536  # OpenAI standard dimension
        }


# Global instance (will be initialized with user API key)
embedding_service = None


def get_embedding_service(api_key: str = None) -> OpenAIEmbeddingService:
    """Get embedding service instance with user API key."""
    global embedding_service
    if embedding_service is None or api_key:
        embedding_service = OpenAIEmbeddingService(api_key=api_key)
    return embedding_service
