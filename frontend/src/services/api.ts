import axios from 'axios';

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

// Create axios instance with default configuration
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for logging
apiClient.interceptors.request.use(
  (config) => {
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('API Response Error:', error);
    
    if (error.response?.status === 401) {
      // Handle unauthorized
      console.error('Unauthorized access');
    } else if (error.response?.status >= 500) {
      // Handle server errors
      console.error('Server error:', error.response.data);
    }
    
    return Promise.reject(error);
  }
);

// Type definitions
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

export interface QueryRequest {
  query: string;
  top_k?: number;
  similarity_threshold?: number;
}

export interface SourceDocument {
  chunk_id: string;
  document_id: string;
  filename: string;
  content: string;
  similarity_score: number;
  chunk_index: number;
}

export interface QueryResponse {
  answer: string;
  sources: SourceDocument[];
  query: string;
  response_time_ms: number;
  total_chunks_retrieved: number;
}

export interface IngestionResponse {
  document_id: string;
  filename: string;
  chunk_count: number;
  total_tokens: number;
  status: 'success' | 'error';
  message: string;
}

export interface HealthResponse {
  status: string;
  timestamp: number;
  version: string;
  total_documents: number;
  total_chunks: number;
}

// API Service Class
export class ApiService {
  // Query endpoints
  async askQuestion(request: QueryRequest): Promise<QueryResponse> {
    const response = await apiClient.post<QueryResponse>('/chat/query', request);
    return response.data;
  }

  // Document ingestion endpoints
  async uploadDocument(file: File): Promise<IngestionResponse> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post<IngestionResponse>('/ingest/ingest', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  }

  async batchUploadDocuments(files: File[]): Promise<IngestionResponse[]> {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));

    const response = await apiClient.post<IngestionResponse[]>('/ingest/ingest/batch', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  }

  // Health check endpoints
  async healthCheck(): Promise<HealthResponse> {
    const response = await apiClient.get<HealthResponse>('/health');
    return response.data;
  }

  async chatHealthCheck(): Promise<any> {
    const response = await apiClient.get('/chat/health');
    return response.data;
  }

  // Utility methods
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  isSupportedFileType(filename: string): boolean {
    const supportedTypes = ['.pdf', '.txt', '.md'];
    const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
    return supportedTypes.includes(extension);
  }
}

// Export singleton instance
export const apiService = new ApiService();
