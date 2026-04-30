import os
import json
import pickle
import numpy as np
import faiss
from typing import List, Dict, Any, Optional, Tuple
from pathlib import Path
import structlog
from app.models import DocumentChunk, SourceDocument
from app.config import settings

logger = structlog.get_logger(__name__)


class FAISSVectorStore:
    """
    Production-ready FAISS vector database for storing and retrieving document embeddings.
    Supports both exact and approximate search with persistent storage.
    """
    
    def __init__(self):
        self.index_path = settings.faiss_index_path
        self.metadata_path = settings.metadata_file
        self.dimension = settings.faiss_dimension
        self.index_type = settings.faiss_index_type
        
        # Create data directory if it doesn't exist
        os.makedirs(os.path.dirname(self.index_path), exist_ok=True)
        os.makedirs(os.path.dirname(self.metadata_path), exist_ok=True)
        
        # Initialize FAISS index and metadata storage
        self.index = None
        self.chunks_metadata = {}  # chunk_id -> DocumentChunk
        self.id_to_index = {}     # chunk_id -> faiss_index
        
        # Load existing index if available
        self._load_index()
    
    def _create_index(self) -> faiss.Index:
        """Create a new FAISS index based on configuration."""
        if self.index_type == "IndexFlatIP":
            # Inner product search (exact)
            index = faiss.IndexFlatIP(self.dimension)
            logger.info("Created FAISS IndexFlatIP", dimension=self.dimension)
        elif self.index_type == "IndexIVFFlat":
            # Inverted file with coarse quantizer (approximate)
            nlist = min(100, 4096)  # Number of Voronoi cells
            quantizer = faiss.IndexFlatIP(self.dimension)
            index = faiss.IndexIVFFlat(quantizer, self.dimension, nlist)
            logger.info("Created FAISS IndexIVFFlat", dimension=self.dimension, nlist=nlist)
        else:
            # Default to exact search
            index = faiss.IndexFlatIP(self.dimension)
            logger.info("Created default FAISS IndexFlatIP", dimension=self.dimension)
        
        return index
    
    def _load_index(self) -> None:
        """Load existing FAISS index and metadata from disk."""
        try:
            if os.path.exists(self.index_path) and os.path.exists(self.metadata_path):
                # Load FAISS index
                self.index = faiss.read_index(self.index_path)
                
                # Load metadata
                with open(self.metadata_path, 'rb') as f:
                    data = pickle.load(f)
                    self.chunks_metadata = data.get('chunks_metadata', {})
                    self.id_to_index = data.get('id_to_index', {})
                
                logger.info("Loaded existing FAISS index",
                           index_path=self.index_path,
                           total_chunks=len(self.chunks_metadata))
            else:
                # Create new index
                self.index = self._create_index()
                logger.info("Created new FAISS index", index_type=self.index_type)
        except Exception as e:
            logger.error("Failed to load FAISS index", error=str(e))
            # Create new index as fallback
            self.index = self._create_index()
    
    def _save_index(self) -> None:
        """Save FAISS index and metadata to disk."""
        try:
            # Save FAISS index
            faiss.write_index(self.index, self.index_path)
            
            # Save metadata
            data = {
                'chunks_metadata': self.chunks_metadata,
                'id_to_index': self.id_to_index
            }
            with open(self.metadata_path, 'wb') as f:
                pickle.dump(data, f)
            
            logger.debug("Saved FAISS index and metadata",
                        index_path=self.index_path,
                        total_chunks=len(self.chunks_metadata))
        except Exception as e:
            logger.error("Failed to save FAISS index", error=str(e))
            raise
    
    def _normalize_embedding(self, embedding: List[float]) -> np.ndarray:
        """Normalize embedding vector for inner product search."""
        embedding_np = np.array(embedding, dtype=np.float32)
        norm = np.linalg.norm(embedding_np)
        if norm > 0:
            embedding_np = embedding_np / norm
        return embedding_np
    
    async def add_chunks(self, chunks: List[DocumentChunk]) -> List[str]:
        """
        Add document chunks to the vector store.
        
        Args:
            chunks: List of DocumentChunk objects with embeddings
            
        Returns:
            List of chunk IDs that were added
        """
        if not chunks:
            return []
        
        chunk_ids = []
        embeddings_list = []
        
        # Prepare embeddings and metadata
        for chunk in chunks:
            if not hasattr(chunk, 'embedding') or chunk.embedding is None:
                logger.warning("Chunk missing embedding, skipping", chunk_id=chunk.chunk_id)
                continue
            
            # Normalize embedding for inner product search
            embedding = self._normalize_embedding(chunk.embedding)
            embeddings_list.append(embedding)
            
            # Store metadata
            self.chunks_metadata[chunk.chunk_id] = chunk
            chunk_ids.append(chunk.chunk_id)
        
        if not embeddings_list:
            logger.warning("No valid embeddings to add")
            return []
        
        # Convert to numpy array
        embeddings_array = np.vstack(embeddings_list).astype(np.float32)
        
        # Add to FAISS index
        start_index = self.index.ntotal
        self.index.add(embeddings_array)
        
        # Update ID mapping
        for i, chunk_id in enumerate(chunk_ids):
            self.id_to_index[chunk_id] = start_index + i
        
        # Save to disk
        self._save_index()
        
        logger.info("Added chunks to vector store",
                   chunk_count=len(chunk_ids),
                   total_chunks=self.index.ntotal)
        
        return chunk_ids
    
    async def similarity_search(
        self,
        query_embedding: List[float],
        top_k: int = 5,
        similarity_threshold: float = 0.7,
        selected_document_ids: List[str] = None
    ) -> List[SourceDocument]:
        """
        Search for similar chunks using the query embedding.
        
        Args:
            query_embedding: Query embedding vector
            top_k: Number of results to return
            similarity_threshold: Minimum similarity score
            
        Returns:
            List of SourceDocument objects with similarity scores
        """
        if self.index.ntotal == 0:
            logger.warning("Vector store is empty")
            return []
        
        # Normalize query embedding
        query_embedding_np = self._normalize_embedding(query_embedding).reshape(1, -1)
        
        # Search in FAISS index
        search_k = min(top_k * 2, self.index.ntotal)  # Search more to filter by threshold
        similarities, indices = self.index.search(query_embedding_np, search_k)
        
        results = []
        for similarity, idx in zip(similarities[0], indices[0]):
            if idx == -1:  # FAISS returns -1 for invalid indices
                continue
            
            if similarity < similarity_threshold:
                continue
            
            # Find chunk ID from index
            chunk_id = None
            for cid, faiss_idx in self.id_to_index.items():
                if faiss_idx == idx:
                    chunk_id = cid
                    break
            
            if chunk_id is None:
                logger.warning("Could not find chunk ID for FAISS index", faiss_index=idx)
                continue
            
            # Get chunk metadata
            chunk = self.chunks_metadata.get(chunk_id)
            if chunk is None:
                logger.warning("Chunk metadata not found", chunk_id=chunk_id)
                continue
            
            # Filter by selected document IDs if provided
            if selected_document_ids and chunk.document_id not in selected_document_ids:
                continue
            
            # Create source document
            source_doc = SourceDocument(
                chunk_id=chunk.chunk_id,
                document_id=chunk.document_id,
                filename=chunk.metadata.filename,
                content=chunk.content,
                similarity_score=float(similarity),
                chunk_index=chunk.chunk_index
            )
            results.append(source_doc)
            
            if len(results) >= top_k:
                break
        
        logger.info("Similarity search completed",
                   query_embedding_dim=len(query_embedding),
                   results_found=len(results),
                   similarity_threshold=similarity_threshold)
        
        return results
    
    async def get_chunk(self, chunk_id: str) -> Optional[DocumentChunk]:
        """Retrieve a specific chunk by ID."""
        return self.chunks_metadata.get(chunk_id)
    
    async def get_document_chunks(self, document_id: str) -> List[DocumentChunk]:
        """Retrieve all chunks for a specific document."""
        chunks = [
            chunk for chunk in self.chunks_metadata.values()
            if chunk.document_id == document_id
        ]
        # Sort by chunk index
        chunks.sort(key=lambda x: x.chunk_index)
        return chunks
    
    async def delete_document(self, document_id: str) -> bool:
        """
        Delete all chunks for a specific document.
        Note: FAISS doesn't support deletion, so we'll need to rebuild the index.
        """
        # Find chunks to delete
        chunks_to_delete = [
            chunk_id for chunk_id, chunk in self.chunks_metadata.items()
            if chunk.document_id == document_id
        ]
        
        if not chunks_to_delete:
            logger.warning("No chunks found for document", document_id=document_id)
            return False
        
        # Remove from metadata
        for chunk_id in chunks_to_delete:
            del self.chunks_metadata[chunk_id]
            if chunk_id in self.id_to_index:
                del self.id_to_index[chunk_id]
        
        # Rebuild index (FAISS limitation)
        remaining_chunks = list(self.chunks_metadata.values())
        self.index = self._create_index()
        self.id_to_index.clear()
        
        if remaining_chunks:
            # Re-add remaining chunks
            await self.add_chunks(remaining_chunks)
        
        logger.info("Deleted document from vector store",
                   document_id=document_id,
                   chunks_deleted=len(chunks_to_delete),
                   remaining_chunks=len(remaining_chunks))
        
        return True
    
    def get_stats(self) -> Dict[str, Any]:
        """Get vector store statistics."""
        return {
            "total_chunks": len(self.chunks_metadata),
            "index_size": self.index.ntotal,
            "index_type": self.index_type,
            "dimension": self.dimension,
            "index_path": self.index_path,
            "metadata_path": self.metadata_path
        }


# Global instance
vector_store = FAISSVectorStore()
