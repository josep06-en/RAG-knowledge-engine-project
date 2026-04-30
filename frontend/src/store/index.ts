import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ChatMessage, QueryResponse, SourceDocument, IngestionResponse, HealthResponse } from '@/services/api';

// Chat State Interface
interface ChatState {
  messages: ChatMessage[];
  currentResponse: string;
  sources: SourceDocument[];
  isLoading: boolean;
  isRetrieving: boolean;
  error: string | null;
  responseTime: number;
  
  // Actions
  setMessages: (messages: ChatMessage[]) => void;
  addMessage: (message: ChatMessage) => void;
  setCurrentResponse: (response: string) => void;
  appendToResponse: (text: string) => void;
  setSources: (sources: SourceDocument[]) => void;
  setLoading: (loading: boolean) => void;
  setRetrieving: (retrieving: boolean) => void;
  setError: (error: string | null) => void;
  setResponseTime: (time: number) => void;
  clearChat: () => void;
}

// Document State Interface
interface DocumentState {
  documents: IngestionResponse[];
  uploadedFiles: File[];
  isUploading: boolean;
  uploadProgress: number;
  error: string | null;
  
  // Actions
  setDocuments: (documents: IngestionResponse[]) => void;
  addDocument: (document: IngestionResponse) => void;
  setUploadedFiles: (files: File[]) => void;
  setUploading: (uploading: boolean) => void;
  setUploadProgress: (progress: number) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

// UI State Interface
interface UIState {
  sidebarOpen: boolean;
  activeView: 'chat' | 'documents';
  theme: 'dark' | 'light';
  isMobile: boolean;
  
  // Actions
  setSidebarOpen: (open: boolean) => void;
  setActiveView: (view: 'chat' | 'documents') => void;
  setTheme: (theme: 'dark' | 'light') => void;
  setIsMobile: (isMobile: boolean) => void;
  toggleSidebar: () => void;
}

// App State Interface
interface AppState {
  health: HealthResponse | null;
  isOnline: boolean;
  
  // Actions
  setHealth: (health: HealthResponse | null) => void;
  setIsOnline: (online: boolean) => void;
}

// Chat Store
export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      messages: [],
      currentResponse: '',
      sources: [],
      isLoading: false,
      isRetrieving: false,
      error: null,
      responseTime: 0,

      setMessages: (messages) => set({ messages }),
      
      addMessage: (message) => set((state) => ({
        messages: [...state.messages, { ...message, timestamp: new Date().toISOString() }]
      })),
      
      setCurrentResponse: (response) => set({ currentResponse: response }),
      
      appendToResponse: (text) => set((state) => ({
        currentResponse: state.currentResponse + text
      })),
      
      setSources: (sources) => set({ sources }),
      
      setLoading: (isLoading) => set({ isLoading }),
      
      setRetrieving: (isRetrieving) => set({ isRetrieving }),
      
      setError: (error) => set({ error }),
      
      setResponseTime: (responseTime) => set({ responseTime }),
      
      clearChat: () => set({
        messages: [],
        currentResponse: '',
        sources: [],
        error: null,
        responseTime: 0
      }),
    }),
    {
      name: 'chat-store',
      partialize: (state) => ({
        messages: state.messages,
      }),
    }
  )
);

// Document Store
export const useDocumentStore = create<DocumentState>()((set, get) => ({
  documents: [],
  uploadedFiles: [],
  isUploading: false,
  uploadProgress: 0,
  error: null,

  setDocuments: (documents) => set({ documents }),
  
  addDocument: (document) => set((state) => ({
    documents: [document, ...state.documents]
  })),
  
  setUploadedFiles: (files) => set({ uploadedFiles: files }),
  
  setUploading: (isUploading) => set({ isUploading }),
  
  setUploadProgress: (uploadProgress) => set({ uploadProgress }),
  
  setError: (error) => set({ error }),
  
  clearError: () => set({ error: null }),
}));

// UI Store
export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      sidebarOpen: true,
      activeView: 'chat',
      theme: 'dark',
      isMobile: false,

      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
      
      setActiveView: (activeView) => set({ activeView }),
      
      setTheme: (theme) => set({ theme }),
      
      setIsMobile: (isMobile) => set({ isMobile }),
      
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
    }),
    {
      name: 'ui-store',
      partialize: (state) => ({
        sidebarOpen: state.sidebarOpen,
        activeView: state.activeView,
        theme: state.theme,
      }),
    }
  )
);

// App Store
export const useAppStore = create<AppState>((set, get) => ({
  health: null,
  isOnline: navigator.onLine,

  setHealth: (health) => set({ health }),
  
  setIsOnline: (isOnline) => set({ isOnline }),
}));

// Utility hooks
export const useChatHistory = () => {
  const { messages, clearChat } = useChatStore();
  
  const clearHistory = () => {
    if (window.confirm('Are you sure you want to clear the entire chat history?')) {
      clearChat();
    }
  };
  
  return {
    messages,
    clearHistory,
    messageCount: messages.length
  };
};

export const useTheme = () => {
  const { theme, setTheme } = useUIStore();
  
  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };
  
  return {
    theme,
    setTheme,
    toggleTheme,
    isDark: theme === 'dark'
  };
};
