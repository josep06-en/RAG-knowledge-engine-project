import React from 'react';
import { useDocuments } from '../hooks/useDocuments';

export const DocumentList: React.FC = () => {
  const { documents, isLoading, error, deleteDocument, totalCount } = useDocuments();

  const handleDelete = async (documentId: string, filename: string) => {
    if (window.confirm(`Are you sure you want to delete "${filename}"?`)) {
      try {
        await deleteDocument(documentId);
      } catch (error) {
        // Error is handled by the hook
        console.error('Delete failed:', error);
      }
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString() + ' ' + new Date(dateString).toLocaleTimeString();
  };

  const formatFileSize = (metadata: any) => {
    const size = metadata.size;
    if (!size) return 'Unknown size';
    
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (isLoading && documents.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-gray-500">Loading documents...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
        <p className="font-medium">Error loading documents</p>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">
          Documents ({totalCount})
        </h3>
      </div>

      {documents.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <div className="w-16 h-16 mx-auto mb-4 text-gray-300">
            <svg
              className="w-full h-full"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <p className="text-lg font-medium">No documents yet</p>
          <p className="text-sm">Upload some documents to get started</p>
        </div>
      ) : (
        <div className="space-y-2">
          {documents.map((document) => (
            <div
              key={document.id}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-gray-900 truncate">
                    {document.metadata.filename || 'Untitled Document'}
                  </h4>
                  <div className="mt-1 flex items-center space-x-4 text-xs text-gray-500">
                    <span>Type: {document.metadata.type?.toUpperCase() || 'Unknown'}</span>
                    <span>{formatFileSize(document.metadata)}</span>
                    <span>Created: {formatDate(document.created_at)}</span>
                  </div>
                  <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                    {document.content.substring(0, 150)}
                    {document.content.length > 150 && '...'}
                  </p>
                </div>
                
                <div className="ml-4 flex-shrink-0">
                  <button
                    onClick={() => handleDelete(document.id, document.metadata.filename)}
                    className="text-red-600 hover:text-red-800 text-sm font-medium"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
