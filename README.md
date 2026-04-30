# AI Knowledge Engine

A RAG (Retrieval-Augmented Generation) based knowledge engine for document processing and intelligent Q&A.

## ✨ Features

- **📄 Document Ingestion**: Upload and process various document formats (PDF, TXT, DOCX, MD)
- **🔍 Vector Storage**: Store document embeddings for semantic search
- **💬 Intelligent Chat**: Ask questions about your uploaded documents with AI-powered responses
- **🗂 Document Management**: View, search, select, and delete documents with modern UI
- **🎨 Modern UI**: Clean, responsive interface built with React and TypeScript
- **🔑 API Key Management**: Add/remove OpenAI API keys with secure storage
- **🚀 Production Ready**: Configured for Netlify deployment with serverless functions

## 🌐 Deployment

### 🎯 Quick Deploy (Netlify)
```bash
# 1. Push to GitHub
git add .
git commit -m "Ready for Netlify deployment"
git push origin main

# 2. Deploy to Netlify
# Connect your repo: https://github.com/josep06-en/RAG-knowledge-engine-project.git
# Build: cd frontend && npm run build
# Publish: frontend/dist
```

**📖 See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.**

### 🏗️ Architecture

#### Frontend (React + Vite)
- **React 18**: Modern UI framework with TypeScript
- **Vite**: Fast build tool and development server
- **TailwindCSS**: Utility-first CSS framework
- **Netlify Functions**: Serverless API proxy for production

#### Backend (FastAPI) - Reference
- **FastAPI**: Modern, fast web framework for building APIs
- **Enhanced Mock LLM**: Intelligent response generation with query analysis
- **Vector Store**: FAISS for document embeddings
- **Document Processing**: Support for multiple file formats


### Frontend (React + TypeScript)
- **React 18**: Modern React with hooks and functional components
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first CSS framework
- **Zustand**: Lightweight state management
- **Custom Hooks**: Reusable logic for API interactions

## Project Structure

```
ai-knowledge-engine/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI application entry point
│   │   ├── api/                 # API endpoints
│   │   │   ├── __init__.py
│   │   │   └── endpoints/
│   │   │       ├── ingestion.py # Document upload endpoints
│   │   │       ├── chat.py      # Chat/Q&A endpoints
│   │   │       └── documents.py # Document management endpoints
│   │   ├── services/            # Business logic
│   │   │   ├── ingestion.py     # Document processing
│   │   │   ├── embeddings.py    # Text embeddings
│   │   │   ├── retriever.py     # Document retrieval
│   │   │   └── llm.py          # Language model integration
│   │   ├── db/
│   │   │   └── vector_store.py  # Vector database interface
│   │   ├── models/              # Pydantic models
│   │   │   └── __init__.py
│   │   └── utils/               # Utility functions
│   │       └── __init__.py
│   ├── tests/                   # Backend tests
│   └── requirements.txt         # Python dependencies
│
├── frontend/
│   ├── src/
│   │   ├── components/          # React components
│   │   │   ├── ChatInterface.tsx
│   │   │   ├── DocumentUpload.tsx
│   │   │   └── DocumentList.tsx
│   │   ├── pages/               # Page components
│   │   │   ├── ChatPage.tsx
│   │   │   └── DocumentsPage.tsx
│   │   ├── services/            # API service layer
│   │   │   └── api.ts
│   │   ├── hooks/               # Custom React hooks
│   │   │   ├── useChat.ts
│   │   │   └── useDocuments.ts
│   │   ├── store/               # State management
│   │   │   └── index.ts
│   │   ├── App.tsx              # Main application component
│   │   ├── index.tsx            # Application entry point
│   │   └── index.css            # Global styles
│   ├── public/
│   │   └── index.html
│   ├── package.json            # Node.js dependencies
│   ├── tsconfig.json           # TypeScript configuration
│   └── tailwind.config.js      # Tailwind CSS configuration
│
├── docs/                       # Documentation
├── docker/                     # Docker configuration
└── README.md                   # This file
```

## Getting Started

### Prerequisites

- Python 3.8+
- Node.js 16+
- npm or yarn

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Start the FastAPI server:
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

The API will be available at `http://localhost:8000`

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

The application will be available at `http://localhost:3000`

## API Documentation

Once the backend is running, you can access the interactive API documentation at:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Usage

1. **Upload Documents**: Navigate to the Documents page to upload PDF, TXT, DOCX, or MD files
2. **Chat with Documents**: Go to the Chat page to ask questions about your uploaded documents
3. **Manage Knowledge Base**: View, search, and delete documents from the Documents page

## Development Notes

### Current Implementation Status

- ✅ Basic project structure
- ✅ FastAPI backend with placeholder implementations
- ✅ React frontend with TypeScript
- ✅ Document upload interface
- ✅ Chat interface
- ✅ State management with Zustand

### TODOs

- [ ] Implement actual document parsing (PDF, DOCX)
- [ ] Integrate real embedding model (sentence-transformers)
- [ ] Implement proper vector database (Chroma/FAISS)
- [ ] Add real LLM integration (OpenAI/Anthropic)
- [ ] Add authentication and user management
- [ ] Implement streaming chat responses
- [ ] Add document chunking strategies
- [ ] Add more sophisticated search capabilities
- [ ] Implement conversation history persistence
- [ ] Add error handling and validation
- [ ] Write comprehensive tests
- [ ] Add Docker configuration
- [ ] Create deployment documentation

### Environment Variables

Create a `.env` file in the backend directory:

```env
# OpenAI API Key (if using OpenAI)
OPENAI_API_KEY=your_api_key_here

# Embedding model settings
EMBEDDING_MODEL=all-MiniLM-L6-v2

# Vector database settings
VECTOR_DB_TYPE=chroma
VECTOR_DB_PATH=./data/vector_db

# Application settings
DEBUG=True
CORS_ORIGINS=["http://localhost:3000"]
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.
