from pydantic_settings import BaseSettings
from typing import List, Optional
import os


class Settings(BaseSettings):
    # Application
    app_name: str = "Enterprise Knowledge Retrieval System"
    app_version: str = "1.0.0"
    debug: bool = False
    
    # API
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    cors_origins: List[str] = ["*"]
    
    # OpenAI
    openai_api_key: str
    openai_embedding_model: str = "text-embedding-3-small"
    openai_chat_model: str = "gpt-4o-mini"
    openai_max_tokens: int = 16384
    openai_temperature: float = 0.1
    
    # FAISS
    faiss_index_path: str = "./data/faiss_index"
    faiss_index_type: str = "IndexFlatIP"  # or "IndexIVFFlat" for larger datasets
    faiss_dimension: int = 1536  # OpenAI embedding dimension
    
    # Document Processing
    chunk_min_tokens: int = 500
    chunk_max_tokens: int = 1000
    chunk_overlap_tokens: int = 100
    max_file_size_mb: int = 50
    
    # Storage
    data_directory: str = "./data"
    metadata_file: str = "./data/metadata.json"
    
    # Logging
    log_level: str = "INFO"
    log_format: str = "json"
    
    class Config:
        env_file = ".env"
        case_sensitive = False


# Global settings instance
settings = Settings()
