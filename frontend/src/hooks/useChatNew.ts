import { useCallback, useRef, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiService, ChatMessage, QueryRequest, QueryResponse } from '@/services/api';
import { useChatStore } from '@/store';

export const useChat = () => {
  const {
    messages,
    currentResponse,
    sources,
    isLoading,
    isRetrieving,
    error,
    responseTime,
    setMessages,
    addMessage,
    setCurrentResponse,
    appendToResponse,
    setSources,
    setLoading,
    setRetrieving,
    setError,
    setResponseTime,
    clearChat,
  } = useChatStore();

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentResponse]);

  // Query mutation with React Query
  const queryMutation = useMutation({
    mutationFn: async (request: QueryRequest) => {
      setRetrieving(true);
      setError(null);
      setCurrentResponse('');
      setSources([]);
      
      const startTime = Date.now();
      const response = await apiService.askQuestion(request);
      const endTime = Date.now();
      
      setResponseTime(endTime - startTime);
      return response;
    },
    onMutate: () => {
      setLoading(true);
    },
    onSuccess: (data: QueryResponse, variables: QueryRequest) => {
      // Add user message
      addMessage({
        role: 'user',
        content: variables.query,
      });

      // Add assistant response
      addMessage({
        role: 'assistant',
        content: data.answer,
      });

      // Set sources
      setSources(data.sources);

      // Reset loading states
      setLoading(false);
      setRetrieving(false);
    },
    onError: (error: any) => {
      setError(error.message || 'Failed to get response');
      setLoading(false);
      setRetrieving(false);
    },
  });

  // Send message function
  const sendMessage = useCallback(async (query: string) => {
    if (!query.trim() || isLoading) return;

    const request: QueryRequest = {
      query: query.trim(),
      top_k: 5,
      similarity_threshold: 0.7,
    };

    queryMutation.mutate(request);
  }, [isLoading, queryMutation]);

  // Clear chat function
  const clearConversation = useCallback(() => {
    clearChat();
  }, [clearChat]);

  // Retry function
  const retryLastQuery = useCallback(() => {
    if (messages.length > 0) {
      const lastUserMessage = messages
        .filter(msg => msg.role === 'user')
        .pop();
      
      if (lastUserMessage) {
        sendMessage(lastUserMessage.content);
      }
    }
  }, [messages, sendMessage]);

  return {
    // State
    messages,
    currentResponse,
    sources,
    isLoading,
    isRetrieving,
    error,
    responseTime,
    
    // Actions
    sendMessage,
    clearConversation,
    retryLastQuery,
    
    // Refs
    messagesEndRef,
  };
};
