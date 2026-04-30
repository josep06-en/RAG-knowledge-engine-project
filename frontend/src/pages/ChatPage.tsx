import React from 'react';
import { ChatInterface } from '../components/ChatInterface';

export const ChatPage: React.FC = () => {
  return (
    <div className="h-full flex flex-col">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-2xl font-bold text-gray-900">AI Knowledge Engine</h1>
        <p className="text-sm text-gray-600 mt-1">Ask questions about your uploaded documents</p>
      </div>
      
      <div className="flex-1 overflow-hidden">
        <ChatInterface />
      </div>
    </div>
  );
};
