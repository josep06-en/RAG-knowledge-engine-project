from typing import List, Dict, Any, Optional
from app.services.embeddings import EmbeddingService
from app.db.vector_store import VectorStore

class DocumentRetriever:
    def __init__(self, vector_store: VectorStore, embedding_service: EmbeddingService):
        self.vector_store = vector_store
        self.embedding_service = embedding_service
    
    async def retrieve_relevant_documents(
        self, 
        query: str, 
        top_k: int = 5,
        similarity_threshold: float = 0.7
    ) -> List[Dict[str, Any]]:
        """Retrieve relevant documents for a given query."""
        # Generate embedding for the query
        query_embedding = await self.embedding_service.generate_single_embedding(query)
        
        # Search for similar documents in vector store
        results = await self.vector_store.similarity_search(
            query_embedding=query_embedding,
            top_k=top_k,
            similarity_threshold=similarity_threshold
        )
        
        return results
    
    async def retrieve_by_document_id(self, document_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve a specific document by its ID."""
        return await self.vector_store.get_document(document_id)
    
    async def search_by_metadata(
        self, 
        filters: Dict[str, Any],
        top_k: int = 10
    ) -> List[Dict[str, Any]]:
        """Search documents by metadata filters."""
        return await self.vector_store.search_by_metadata(filters, top_k)
