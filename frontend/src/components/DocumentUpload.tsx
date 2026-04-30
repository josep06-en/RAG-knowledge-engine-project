import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import { 
  Upload, 
  FileText, 
  X, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  Trash2,
  FilePlus
} from 'lucide-react';
import { useDocumentStore } from '@/store';
import { apiService } from '@/services/api';
import { useTheme } from '@/store';

export const DocumentUpload: React.FC = () => {
  const { isDark } = useTheme();
  const { isUploading, uploadProgress, setUploading, setUploadProgress, setError, clearError } = useDocumentStore();
  
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [uploadResults, setUploadResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const validFiles = acceptedFiles.filter(file => 
      apiService.isSupportedFileType(file.name)
    );

    if (validFiles.length === 0) {
      setError('No valid files found. Please upload PDF, TXT, or MD files.');
      return;
    }

    setUploadedFiles(validFiles);
    setShowResults(false);
    setUploadResults([]);
  }, [setError]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt'],
      'text/markdown': ['.md'],
    },
    multiple: true,
    maxSize: 50 * 1024 * 1024, // 50MB
  });

  const uploadFiles = async () => {
    if (uploadedFiles.length === 0) return;

    setUploading(true);
    setUploadProgress(0);
    setError(null);
    setShowResults(false);

    try {
      const results = await apiService.batchUploadDocuments(uploadedFiles);
      setUploadResults(results);
      setShowResults(true);
      setUploadedFiles([]);
      setUploadProgress(100);
    } catch (error: any) {
      setError(error.message || 'Upload failed');
    } finally {
      setUploading(false);
      setUploadProgress(0);
      console.error('Upload failed:', error);
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files);
    }
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div
        className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          dragActive
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        } ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={!isLoading ? openFileDialog : undefined}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".txt,.pdf,.docx,.md"
          onChange={handleChange}
          className="hidden"
          disabled={isLoading}
        />
        
        <div className="space-y-2">
          <div className="mx-auto w-12 h-12 text-gray-400">
            <svg
              className="w-full h-full"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
          </div>
          
          <div>
            <p className="text-lg font-medium text-gray-900">
              {isLoading ? 'Uploading...' : 'Drop documents here'}
            </p>
            <p className="text-sm text-gray-500">
              {!isLoading && 'or click to select files'}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Supports: TXT, PDF, DOCX, MD
            </p>
          </div>
        </div>
      </div>
      
      {isLoading && (
        <div className="mt-4 text-center">
          <div className="inline-flex items-center space-x-2 text-blue-600">
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-sm">Processing documents...</span>
          </div>
        </div>
      )}
    </div>
  );
};
