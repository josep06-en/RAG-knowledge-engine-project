import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Loader2, AlertCircle, RefreshCw, Trash2, Clock, FileText } from 'lucide-react';
import { useChat } from '@/hooks/useChat';
import { useTheme } from '@/store';

export const ChatInterface: React.FC = () => {
  const {
    messages,
    currentResponse,
    sources,
    isLoading,
    isRetrieving,
    error,
    responseTime,
    sendMessage,
    clearConversation,
    retryLastQuery,
    messagesEndRef,
  } = useChat();

  const { isDark } = useTheme();
  const [inputValue, setInputValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, [inputValue]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const message = inputValue.trim();
    setInputValue('');
    await sendMessage(message);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <div className={`flex flex-col h-full ${isDark ? 'dark' : ''}`}>
      <div className={`border-b ${isDark ? 'border-gray-700' : 'border-gray-200'} px-6 py-4`}>
        <div className="flex items-center justify-between">
          <h1 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Knowledge Engine
          </h1>
          <div className="flex items-center space-x-2">
            {responseTime > 0 && (
              <div className={`flex items-center space-x-1 text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                <Clock className="w-3 h-3" />
                <span>{formatTime(responseTime)}</span>
              </div>
            )}
            <button
              onClick={retryLastQuery}
              disabled={messages.length === 0 || isLoading}
              className={`p-2 rounded-lg transition-colors ${
                isDark 
                  ? 'hover:bg-gray-700 text-gray-400 disabled:text-gray-600' 
                  : 'hover:bg-gray-100 text-gray-500 disabled:text-gray-300'
              }`}
              title="Retry last query"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={clearConversation}
              disabled={messages.length === 0}
              className={`p-2 rounded-lg transition-colors ${
                isDark 
                  ? 'hover:bg-gray-700 text-gray-400 disabled:text-gray-600' 
                  : 'hover:bg-gray-100 text-gray-500 disabled:text-gray-300'
              }`}
              title="Clear conversation"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className={`flex-1 overflow-y-auto ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
        <div className="max-w-4xl mx-auto px-4 py-6">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${
                isDark ? 'bg-gray-800' : 'bg-gray-100'
              }`}>
                <FileText className={`w-8 h-8 ${isDark ? 'text-gray-600' : 'text-gray-400'}`} />
              </div>
              <h3 className={`text-lg font-medium mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Welcome to Knowledge Engine
              </h3>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Ask questions about your uploaded documents to get intelligent answers with sources.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <AnimatePresence>
                {messages.map((message, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                    className={`flex ${
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-2xl px-4 py-3 rounded-2xl ${
                        message.role === 'user'
                          ? isDark 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-blue-500 text-white'
                          : isDark
                            ? 'bg-gray-800 text-gray-100 border border-gray-700'
                            : 'bg-gray-100 text-gray-900 border border-gray-200'
                      }`}
                    >
                      <div className="flex items-start space-x-2">
                        <div className="flex-1">
                          <p className="text-sm whitespace-pre-wrap break-words">
                            {message.content}
                          </p>
                          {message.timestamp && (
                            <p className={`text-xs mt-2 ${
                              message.role === 'user'
                                ? 'text-blue-100'
                                : isDark ? 'text-gray-500' : 'text-gray-400'
                            }`}>
                              {new Date(message.timestamp).toLocaleTimeString()}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {isRetrieving && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-start"
                >
                  <div
                    className={`max-w-2xl px-4 py-3 rounded-2xl ${
                      isDark
                        ? 'bg-gray-800 text-gray-100 border border-gray-700'
                        : 'bg-gray-100 text-gray-900 border border-gray-200'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">Retrieving knowledge...</span>
                    </div>
                  </div>
                </motion.div>
              )}

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-center"
                >
                  <div className={`max-w-2xl px-4 py-3 rounded-2xl border ${
                    isDark
                      ? 'bg-red-900/20 border-red-800 text-red-400'
                      : 'bg-red-50 border-red-200 text-red-700'
                  }`}>
                    <div className="flex items-center space-x-2">
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-sm">{error}</span>
                    </div>
                  </div>
                </motion.div>
              )}

              {sources.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className={`mt-6 p-4 rounded-xl border ${
                    isDark
                      ? 'bg-gray-800/50 border-gray-700'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <h4 className={`text-sm font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Sources ({sources.length})
                  </h4>
                  <div className="space-y-2">
                    {sources.map((source, index) => (
                      <div
                        key={source.chunk_id}
                        className={`p-3 rounded-lg border ${
                          isDark
                            ? 'bg-gray-800 border-gray-700'
                            : 'bg-white border-gray-200'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs font-medium mb-1 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                              {source.filename}
                            </p>
                            <p className={`text-xs line-clamp-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                              {source.content}
                            </p>
                          </div>
                          <div className={`text-xs text-right ml-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                            <div className="font-medium">
                              {(source.similarity_score * 100).toFixed(1)}%
                            </div>
                            <div>Chunk {source.chunk_index}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      <div className={`border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
        <form onSubmit={handleSubmit} className="p-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex space-x-3">
              <div className="flex-1 relative">
                <textarea
                  ref={textareaRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about your documents..."
                  className={`w-full px-4 py-3 rounded-xl border resize-none focus:outline-none focus:ring-2 ${
                    isDark
                      ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:ring-blue-500 focus:border-blue-500'
                  }`}
                  disabled={isLoading}
                  rows={1}
                />
                {inputValue.length > 0 && (
                  <div className={`absolute right-2 top-1/2 transform -translate-y-1/2 text-xs ${
                    isDark ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    {inputValue.length}/1000
                  </div>
                )}
              </div>
              <button
                type="submit"
                disabled={!inputValue.trim() || isLoading}
                className={`px-6 py-3 rounded-xl font-medium transition-all transform active:scale-95 ${
                  isLoading
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:scale-105 active:scale-95'
                } ${
                  isDark
                    ? 'bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-700'
                    : 'bg-blue-500 hover:bg-blue-600 text-white disabled:bg-gray-300'
                }`}
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
