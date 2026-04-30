import React from 'react';
import { DocumentUpload } from '../components/DocumentUpload';
import { DocumentList } from '../components/DocumentList';

export const DocumentsPage: React.FC = () => {
  return (
    <div className="h-full flex flex-col">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
        <p className="text-sm text-gray-600 mt-1">Upload and manage your knowledge base</p>
      </div>
      
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-6xl mx-auto space-y-8">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload Documents</h2>
            <DocumentUpload />
          </div>
          
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Documents</h2>
            <DocumentList />
          </div>
        </div>
      </div>
    </div>
  );
};
