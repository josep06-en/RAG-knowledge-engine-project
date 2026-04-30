# Enterprise Knowledge Retrieval System - Backend

A production-ready RAG (Retrieval-Augmented Generation) system built with FastAPI, FAISS, and OpenAI.

## Features

- **Document Ingestion**: Upload and process PDF, TXT, and MD files
- **Intelligent Chunking**: Smart document splitting (500-1000 tokens with overlap)
- **Vector Storage**: FAISS-based vector database with persistent storage
- **OpenAI Integration**: Embeddings (text-embedding-3-small) and LLM (gpt-4o-mini)
- **RAG Pipeline**: Complete retrieval-augmented generation workflow
- **Production Ready**: Structured logging, error handling, and comprehensive testing

## Architecture

```
├── app/
│   ├── main.py                 # FastAPI application
│   ├── config.py               # Configuration management
│   ├── models/                 # Pydantic models
│   ├── services/               # Business logic
│   │   ├── ingestion.py       # Document processing
│   │   ├── chunking.py       # Intelligent chunking
│   │   ├── embeddings.py     # OpenAI embeddings
│   │   └── llm.py           # GPT-4o-mini integration
│   ├── db/                    # Vector database
│   │   └── vector_store.py   # FAISS integration
│   ├── api/                   # API endpoints
│   │   └── endpoints/
│   │       ├── ingestion.py   # Document upload
│   │       └── chat.py       # Query interface
│   └── utils/                 # Utilities
├── tests/                     # Comprehensive tests
└── requirements.txt           # Dependencies
```

## Quick Start

### 1. Environment Setup

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your OpenAI API key
OPENAI_API_KEY=your_openai_api_key_here
```

### 2. Install Dependencies

```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Run the Application

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`

## API Endpoints

### Document Ingestion

#### Upload Single Document
```http
POST /api/v1/ingest/ingest
Content-Type: multipart/form-data
```

**Response:**
```json
{
  "document_id": "uuid",
  "filename": "document.pdf",
  "chunk_count": 15,
  "total_tokens": 8500,
  "status": "success",
  "message": "Successfully ingested document.pdf with 15 chunks"
}
```

#### Batch Upload
```http
POST /api/v1/ingest/ingest/batch
Content-Type: multipart/form-data
```

### Query Interface

#### Ask Question
```http
POST /api/v1/chat/query
Content-Type: application/json
```

**Request:**
```json
{
  "query": "What are the main features of our product?",
  "top_k": 5,
  "similarity_threshold": 0.7
}
```

**Response:**
```json
{
  "answer": "Based on the uploaded documents, the main features include...",
  "sources": [
    {
      "chunk_id": "uuid",
      "document_id": "uuid",
      "filename": "product_spec.pdf",
      "content": "Product features include...",
      "similarity_score": 0.89,
      "chunk_index": 3
    }
  ],
  "query": "What are the main features of our product?",
  "response_time_ms": 1250.5,
  "total_chunks_retrieved": 3
}
```

### Health Check

#### System Health
```http
GET /api/v1/health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": 1703123456.789,
  "version": "1.0.0",
  "total_documents": 25,
  "total_chunks": 342
}
```

## Configuration

Key configuration options in `.env`:

```bash
# OpenAI Settings
OPENAI_API_KEY=your_api_key
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
OPENAI_CHAT_MODEL=gpt-4o-mini

# Document Processing
CHUNK_MIN_TOKENS=500
CHUNK_MAX_TOKENS=1000
CHUNK_OVERLAP_TOKENS=100
MAX_FILE_SIZE_MB=50

# Vector Database
FAISS_INDEX_PATH=./data/faiss_index
FAISS_INDEX_TYPE=IndexFlatIP
```

## Testing

Run the comprehensive test suite:

```bash
# Install test dependencies
pip install pytest pytest-asyncio

# Run tests
pytest tests/ -v

# Run with coverage
pytest tests/ --cov=app --cov-report=html
```

## Production Deployment

### Docker

```bash
# Build image
docker build -t knowledge-retrieval-backend .

# Run container
docker run -p 8000:8000 --env-file .env knowledge-retrieval-backend
```

### Environment Variables

For production, ensure these are set:

- `OPENAI_API_KEY`: Your OpenAI API key
- `DEBUG=False`: Disable debug mode
- `LOG_LEVEL=INFO`: Set appropriate logging level
- `CORS_ORIGINS`: Configure allowed origins

## Monitoring

### Health Checks

- `/health` - Basic health check
- `/api/v1/health` - Detailed system status
- `/api/v1/chat/health` - Service-specific health

### Logging

Structured JSON logging with:
- Request/response tracking
- Performance metrics
- Error details
- Service health monitoring

### Metrics

The system tracks:
- Document ingestion statistics
- Query response times
- Embedding generation usage
- Vector database operations

## Performance Considerations

### Vector Database
- **IndexFlatIP**: Exact search, best for < 1M vectors
- **IndexIVFFlat**: Approximate search, better for larger datasets
- Persistent storage with automatic saving

### Batch Processing
- Parallel document ingestion
- Batch embedding generation (100 texts per request)
- Configurable concurrency limits

### Memory Management
- Streaming file processing
- Efficient chunk overlap handling
- Automatic cleanup of temporary files

## Security

- Input validation with Pydantic models
- File type restrictions
- Size limits enforcement
- CORS configuration
- Error message sanitization

## Troubleshooting

### Common Issues

1. **OpenAI API Key Error**
   ```
   Solution: Verify OPENAI_API_KEY in .env file
   ```

2. **FAISS Index Corruption**
   ```
   Solution: Delete ./data/faiss_index and restart
   ```

3. **Memory Issues with Large Files**
   ```
   Solution: Reduce MAX_FILE_SIZE_MB or increase system memory
   ```

### Debug Mode

Enable debug logging:
```bash
DEBUG=True LOG_LEVEL=DEBUG uvicorn app.main:app --reload
```

## License

MIT License - see LICENSE file for details.
