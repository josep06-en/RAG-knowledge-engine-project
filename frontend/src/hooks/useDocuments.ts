import { useState, useCallback, useEffect } from 'react';
import { apiService, Document } from '../services/api';

export interface UseDocumentsReturn {
  documents: Document[];
  isLoading: boolean;
  error: string | null;
  uploadDocument: (file: File) => Promise<void>;
  batchUploadDocuments: (files: File[]) => Promise<void>;
  deleteDocument: (documentId: string) => Promise<void>;
  refreshDocuments: () => Promise<void>;
  totalCount: number;
}

export const useDocuments = (): UseDocumentsReturn => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  const refreshDocuments = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiService.getDocuments(50, 0); // Get first 50 documents
      setDocuments(response.documents);
      setTotalCount(response.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch documents');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const uploadDocument = useCallback(async (file: File) => {
    setIsLoading(true);
    setError(null);

    try {
      await apiService.uploadDocument(file);
      await refreshDocuments(); // Refresh the document list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload document');
      throw err; // Re-throw to allow caller to handle
    } finally {
      setIsLoading(false);
    }
  }, [refreshDocuments]);

  const batchUploadDocuments = useCallback(async (files: File[]) => {
    if (files.length === 0) return;

    setIsLoading(true);
    setError(null);

    try {
      await apiService.batchUploadDocuments(files);
      await refreshDocuments(); // Refresh the document list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload documents');
      throw err; // Re-throw to allow caller to handle
    } finally {
      setIsLoading(false);
    }
  }, [refreshDocuments]);

  const deleteDocument = useCallback(async (documentId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      await apiService.deleteDocument(documentId);
      await refreshDocuments(); // Refresh the document list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete document');
      throw err; // Re-throw to allow caller to handle
    } finally {
      setIsLoading(false);
    }
  }, [refreshDocuments]);

  // Load documents on mount
  useEffect(() => {
    refreshDocuments();
  }, [refreshDocuments]);

  return {
    documents,
    isLoading,
    error,
    uploadDocument,
    batchUploadDocuments,
    deleteDocument,
    refreshDocuments,
    totalCount,
  };
};
