# API Documentation

## Overview

The AI Knowledge Engine API provides RESTful endpoints for document ingestion, chat interactions, and document management.

## Base URL

```
http://localhost:8000/api/v1
```

## Authentication

Currently, the API does not require authentication. This will be implemented in future versions.

## Endpoints

### Document Ingestion

#### Upload Single Document

```http
POST /ingest/upload
Content-Type: multipart/form-data
```

**Request:**
- `file`: The document file to upload (supports .txt, .pdf, .docx, .md)

**Response:**
```json
{
  "document_id": "uuid-string",
  "status": "success",
  "metadata": {
    "filename": "document.pdf",
    "size": 1024,
    "type": ".pdf"
  }
}
```

#### Batch Upload Documents

```http
POST /ingest/batch
Content-Type: multipart/form-data
```

**Request:**
- `files`: Multiple document files

**Response:**
```json
{
  "results": [
    {
      "document_id": "uuid-string",
      "filename": "document1.pdf",
      "status": "success"
    }
  ],
  "total_processed": 1
}
```

### Chat

#### Ask Question

```http
POST /chat/ask
Content-Type: application/json
```

**Request Body:**
```json
{
  "message": "What is the main topic of the uploaded documents?",
  "conversation_history": [
    {
      "role": "user",
      "content": "Previous question"
    },
    {
      "role": "assistant", 
      "content": "Previous answer"
    }
  ],
  "top_k": 5,
  "similarity_threshold": 0.7
}
```

**Response:**
```json
{
  "response": "Based on the documents, the main topic is...",
  "sources": [
    {
      "document_id": "uuid-string",
      "content": "Relevant document content...",
      "metadata": {
        "filename": "document.pdf",
        "type": ".pdf"
      },
      "similarity": 0.85
    }
  ],
  "query": "What is the main topic of the uploaded documents?"
}
```

#### Stream Chat (Placeholder)

```http
POST /chat/stream
Content-Type: application/json
```

**Note:** Streaming is not yet implemented.

### Document Management

#### List Documents

```http
GET /documents?limit=10&offset=0
```

**Query Parameters:**
- `limit`: Number of documents to return (default: 10, max: 100)
- `offset`: Number of documents to skip (default: 0)

**Response:**
```json
{
  "documents": [
    {
      "id": "uuid-string",
      "content": "Document content...",
      "metadata": {
        "filename": "document.pdf",
        "size": 1024,
        "type": ".pdf"
      },
      "created_at": "2023-12-01T12:00:00Z"
    }
  ],
  "total": 1,
  "limit": 10,
  "offset": 0
}
```

#### Get Document by ID

```http
GET /documents/{document_id}
```

**Response:**
```json
{
  "id": "uuid-string",
  "content": "Document content...",
  "metadata": {
    "filename": "document.pdf",
    "size": 1024,
    "type": ".pdf"
  },
  "created_at": "2023-12-01T12:00:00Z"
}
```

#### Delete Document

```http
DELETE /documents/{document_id}
```

**Response:**
```json
{
  "message": "Document deleted successfully"
}
```

#### Search by Metadata

```http
GET /documents/search/metadata?filename=document.pdf&file_type=.pdf&limit=10
```

**Query Parameters:**
- `filename`: Filter by filename (optional)
- `file_type`: Filter by file type (optional)
- `limit`: Number of results to return (default: 10)

**Response:**
```json
{
  "documents": [
    {
      "id": "uuid-string",
      "content": "Document content...",
      "metadata": {
        "filename": "document.pdf",
        "size": 1024,
        "type": ".pdf"
      },
      "created_at": "2023-12-01T12:00:00Z"
    }
  ],
  "total": 1
}
```

### Health Check

```http
GET /health
```

**Response:**
```json
{
  "status": "healthy"
}
```

## Error Responses

All endpoints may return error responses with the following format:

```json
{
  "detail": "Error message describing what went wrong"
}
```

Common HTTP status codes:
- `400`: Bad Request - Invalid input data
- `404`: Not Found - Resource not found
- `500`: Internal Server Error - Server-side error

## Rate Limiting

Currently, there are no rate limits implemented. This will be added in future versions.

## Data Models

### Document

```json
{
  "id": "string",
  "content": "string",
  "metadata": {
    "filename": "string",
    "size": "number",
    "type": "string"
  },
  "created_at": "string",
  "updated_at": "string"
}
```

### Chat Message

```json
{
  "role": "user|assistant",
  "content": "string",
  "timestamp": "string"
}
```

### Search Result

```json
{
  "document_id": "string",
  "content": "string",
  "metadata": "object",
  "similarity": "number"
}
```
