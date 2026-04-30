from pydantic import BaseModel, Field, validator
from typing import List, Dict, Any, Optional, Union
from datetime import datetime
from enum import Enum
import uuid


class DocumentType(str, Enum):
    PDF = "pdf"
    TXT = "txt"
    MD = "md"


class DocumentMetadata(BaseModel):
    filename: str
    file_type: DocumentType
    file_size: int
    upload_timestamp: datetime
    document_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    chunk_count: int = 0
    total_tokens: int = 0
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class DocumentChunk(BaseModel):
    chunk_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    document_id: str
    chunk_index: int
    content: str
    token_count: int
    metadata: DocumentMetadata
    embedding: List[float] = Field(default_factory=list)
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class IngestionRequest(BaseModel):
    filename: str
    file_type: DocumentType
    content: str
    metadata: Optional[Dict[str, Any]] = None


class IngestionResponse(BaseModel):
    document_id: str
    filename: str
    chunk_count: int
    total_tokens: int
    status: str
    message: str


class QueryRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=1000, description="Natural language question")
    top_k: int = Field(default=5, ge=1, le=20, description="Number of relevant chunks to retrieve")
    similarity_threshold: float = Field(default=0.7, ge=0.0, le=1.0, description="Minimum similarity score")
    selected_documents: List[str] = Field(default=[], description="List of document IDs to search within")
    
    @validator('query')
    def validate_query(cls, v):
        if not v.strip():
            raise ValueError('Query cannot be empty')
        return v.strip()


class SourceDocument(BaseModel):
    chunk_id: str
    document_id: str
    filename: str
    content: str
    similarity_score: float
    chunk_index: int


class QueryResponse(BaseModel):
    answer: str
    sources: List[SourceDocument]
    query: str
    response_time_ms: float
    total_chunks_retrieved: int
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class HealthResponse(BaseModel):
    status: str
    timestamp: datetime
    version: str
    total_documents: int
    total_chunks: int
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class ErrorResponse(BaseModel):
    error: str
    detail: Optional[str] = None


class EmbeddingRequest(BaseModel):
    texts: List[str] = Field(..., min_items=1, max_items=100)
    
    @validator('texts')
    def validate_texts(cls, v):
        if any(not text.strip() for text in v):
            raise ValueError('All texts must be non-empty')
        return [text.strip() for text in v]


class EmbeddingResponse(BaseModel):
    embeddings: List[List[float]]
    model_used: str
    total_tokens: int
