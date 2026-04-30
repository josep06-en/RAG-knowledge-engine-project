import React, { useState, useRef, useEffect } from 'react';
import { apiKeyManager } from './apiKeyManager';

export default function App() {
  const [activeTab, setActiveTab] = useState<'chat' | 'documents' | 'history'>('chat');
  const [message, setMessage] = useState('');
  // Simple markdown parser for basic formatting
  const parseMarkdown = (text: string) => {
    // Parse bold text **text** -> <strong>text</strong>
    let parsed = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Parse italic text *text* -> <em>text</em>
    parsed = parsed.replace(/\*(.*?)\*/g, '<em>$1</em>');
    // Remove API key button text markers [🔑 ...] since we render buttons separately
    parsed = parsed.replace(/\[🔑(.*?)\]/g, '');
    // Parse line breaks
    parsed = parsed.replace(/\n/g, '<br />');
    return parsed;
  };

  const [chatMessages, setChatMessages] = useState<Array<{
    role: string, 
    content: string, 
    timestamp?: string,
    sources?: Array<{
      filename: string;
      content: string;
      similarity_score: number;
      chunk_index: number;
    }>,
    showApiKeyButton?: boolean
  }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [documents, setDocuments] = useState<Array<{
    document_id: string;
    filename: string;
    file_type: string;
    file_size: number;
    upload_timestamp: string;
    chunk_count: number;
    total_tokens: number;
  }>>([]);
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [apiKey, setApiKey] = useState<string>('');
  const [apiKeyError, setApiKeyError] = useState<string>('');
  const [showSetupAlert, setShowSetupAlert] = useState<boolean>(true);
  const [isFirstTime, setIsFirstTime] = useState<boolean>(true);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  useEffect(() => {
    fetchDocuments();
    // Load API key from localStorage on mount
    const savedApiKey = apiKeyManager.getApiKey();
    if (savedApiKey) {
      setApiKey(savedApiKey);
    }
    // Always show popup on page refresh
    setShowSetupAlert(true);
  }, []);

  const saveApiKey = () => {
    if (!apiKey.trim()) {
      setApiKeyError('API key cannot be empty');
      return;
    }
    
    const validation = apiKeyManager.validateApiKey(apiKey.trim());
    if (!validation.isValid) {
      setApiKeyError(validation.error);
      return;
    }
    
    apiKeyManager.saveApiKey(apiKey.trim());
    setApiKeyError('');
    setIsFirstTime(false);
  };

  const clearApiKey = () => {
    apiKeyManager.clearApiKey();
    setApiKey('');
    setApiKeyError('');
    console.log('API key cleared');
  };

  const fetchDocuments = async () => {
    try {
      console.log('Fetching documents from: /api/v1/documents/list (via proxy)');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      // Add Authorization header if API key is available
      if (apiKey.trim()) {
        headers['Authorization'] = `Bearer ${apiKey.trim()}`;
      }
      
      const response = await fetch('/api/v1/documents/list', {
        method: 'GET',
        headers,
      });
      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);
      const data = await response.json();
      console.log('Documents data:', data);
      setDocuments(data);
    } catch (error) {
      console.error('Failed to fetch documents:', error);
      console.error('Error details:', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const deleteDocument = async (documentId: string, filename: string) => {
    if (!confirm(`Are you sure you want to delete "${filename}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (apiKey.trim()) {
        headers['Authorization'] = `Bearer ${apiKey.trim()}`;
      }
      
      const response = await fetch(`/api/v1/documents/${documentId}`, {
        method: 'DELETE',
        headers,
      });
      
      if (response.ok) {
        // Remove from selected documents if it was selected
        setSelectedDocuments(prev => prev.filter(id => id !== documentId));
        // Refresh documents list
        await fetchDocuments();
        // Show success message
        alert(`Successfully deleted "${filename}"`);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to delete document');
      }
    } catch (error) {
      console.error('Failed to delete document:', error);
      alert(`Failed to delete "${filename}": ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isLoading) return;

    const userMessage = {
      role: 'user' as const,
      content: message.trim(),
      timestamp: new Date().toISOString()
    };

    setChatMessages(prev => [...prev, userMessage]);
    setMessage('');
    setIsLoading(true);

    try {
      // API key is optional - allow chat without API key (will use mock service)
      if (!apiKey.trim()) {
        console.log('No API key provided - using mock service for chat');
      }
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      // Add Authorization header if API key is available
      if (apiKey.trim()) {
        headers['Authorization'] = `Bearer ${apiKey.trim()}`;
      }
      
      const response = await fetch('/api/v1/chat/query', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          query: message,
          top_k: 5,
          similarity_threshold: 0.7,
          selected_documents: selectedDocuments
        })
      });

      if (response.ok) {
        const data = await response.json();
        let content = data.answer;
        
        // Add API key notification if no API key is being used
        if (!apiKey.trim()) {
          content += '\n\n---\n**⚠️ Using Mock Service**\n\nYou\'re currently using the service without an API key. Responses are generated using mock services. For better results, add an OpenAI API key.\n\n[🔑 Add API Key]';
        }
        
        setChatMessages(prev => [...prev, {
          role: 'assistant',
          content: content,
          timestamp: new Date().toISOString(),
          sources: data.sources || [],
          showApiKeyButton: !apiKey.trim()
        }]);
      } else {
        const errorMessage = apiKey.trim() 
          ? 'Sorry, I encountered an error. Please make sure the backend is running.'
          : "You're not using an API key. Please use an API key for chatting.\n\n[🔑 Introduce API Key]";
        
        setChatMessages(prev => [...prev, {
          role: 'assistant',
          content: errorMessage,
          timestamp: new Date().toISOString(),
          showApiKeyButton: !apiKey.trim()
        }]);
      }
    } catch (error) {
      const catchErrorMessage = apiKey.trim() 
        ? `Error connecting to backend. Please check if the backend server is running on ${process.env.NODE_ENV === 'production' ? '/api/v1' : 'http://localhost:8001/api/v1'}`
        : "You're not using an API key. Please use an API key for chatting.\n\n[🔑 Introduce API Key]";
      
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: catchErrorMessage,
        timestamp: new Date().toISOString(),
        showApiKeyButton: !apiKey.trim()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    const validFiles = files.filter(file => 
      file.type === 'application/pdf' || 
      file.type === 'text/plain' || 
      file.name.endsWith('.md')
    );
    
    setUploadedFiles(prev => [...prev, ...validFiles]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setUploadedFiles(prev => [...prev, ...files]);
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const clearAllFiles = () => {
    setUploadedFiles([]);
  };

  const uploadFiles = async () => {
    if (uploadedFiles.length === 0) return;

    // Show immediate loading feedback
    setIsLoading(true);
    console.log('Starting fast upload...');

    try {
      // Create FormData for file upload
      const formData = new FormData();
      uploadedFiles.forEach(file => {
        formData.append('files', file);
      });

      console.log('Uploading files to: /api/v1/ingest/batch (via proxy)');
      console.log('Files to upload:', uploadedFiles.map(f => f.name));
      
      // API key is optional - allow uploads without API key (will use mock service)
      if (!apiKey.trim()) {
        console.log('No API key provided - using mock service for upload');
      }
      
      const headers: Record<string, string> = {};
      
      // Add Authorization header if API key is available
      if (apiKey.trim()) {
        headers['Authorization'] = `Bearer ${apiKey.trim()}`;
      }
      // Note: Don't set Content-Type for FormData - browser sets it automatically with boundary
      
      const response = await fetch('/api/v1/ingest/batch', {
        method: 'POST',
        headers,
        body: formData
      });
      
      console.log('Upload response status:', response.status);
      console.log('Upload response ok:', response.ok);
      console.log('Upload response headers:', response.headers);

      if (response.ok) {
        const result = await response.json();
        console.log('Upload result:', result);
        console.log('Result type:', typeof result);
        console.log('Is array?', Array.isArray(result));
        if (Array.isArray(result)) {
          console.log('First item status:', result[0]?.status);
        }
        
        // Check if all files were uploaded successfully
        const successful = result.filter((r: any) => r.status === 'success').length;
        const failed = result.filter((r: any) => r.status === 'error').length;
        
        if (successful > 0 && failed === 0) {
          alert(`Successfully uploaded ${successful} document${successful !== 1 ? 's' : ''}!`);
          // Refresh documents list after successful upload
          fetchDocuments();
        } else if (successful > 0) {
          alert(`Uploaded ${successful} document${successful !== 1 ? 's' : ''} successfully. ${failed} failed.`);
          // Refresh documents list after successful upload
          fetchDocuments();
        } else {
          alert('Upload failed. Please check the files and try again.');
        }
        
        setUploadedFiles([]);
        setIsLoading(false); // Clear loading state
      } else {
        let errorMessage = 'Unknown error';
        try {
          // Clone the response first to avoid "body stream already read" error
          const responseClone = response.clone();
          const error = await responseClone.json();
          console.error('Upload error:', error);
          errorMessage = error.detail || error.message || JSON.stringify(error);
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError);
          try {
            const errorText = await response.text();
            console.error('Error response text:', errorText);
            errorMessage = errorText || `HTTP ${response.status}: ${response.statusText}`;
          } catch (textError) {
            console.error('Failed to get response text:', textError);
            errorMessage = `HTTP ${response.status}: ${response.statusText}`;
          }
        }
        alert(`Upload failed: ${errorMessage}`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      console.error('Upload error details:', error instanceof Error ? error.message : 'Unknown error');
      alert(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false); // Always clear loading state
    }
  };

  const formatTime = (timestamp?: string) => {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      backgroundColor: '#f8fafc',
    }}>
      {/* API Key Setup Popup */}
      {showSetupAlert && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setShowSetupAlert(false);
          }
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            padding: '24px',
            borderRadius: '12px',
            maxWidth: '400px',
            width: '90%',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)'
          }}
          onClick={(e) => e.stopPropagation()}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <h3 style={{
                margin: 0,
                fontSize: '18px',
                fontWeight: '600',
                color: '#1e293b'
              }}>
                API Key Setup
              </h3>
              <button
                onClick={() => setShowSetupAlert(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer',
                  color: '#64748b',
                  padding: '4px'
                }}
              >
                ×
              </button>
            </div>
            
            {isFirstTime && (
              <div style={{
                backgroundColor: '#f0f9ff',
                border: '1px solid #0ea5e9',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '20px'
              }}>
                <p style={{
                  margin: '0 0 8px 0',
                  fontSize: '13px',
                  fontWeight: '500',
                  color: '#0c4a6e'
                }}>
                  🔍 Get your API key:
                </p>
                <ol style={{
                  margin: 0,
                  paddingLeft: '16px',
                  fontSize: '12px',
                  color: '#64748b'
                }}>
                  <li>Go to <a href="https://platform.openai.com/api-keys" target="_blank" style={{ color: '#0ea5e9', textDecoration: 'none' }}>OpenAI Platform</a></li>
                  <li>Click "Create new secret key"</li>
                  <li>Copy the key (starts with "sk-")</li>
                </ol>
              </div>
            )}
            
            <div style={{ marginBottom: '16px' }}>
              <label 
                htmlFor="openai-api-key"
                style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '8px'
                }}
              >
                OpenAI API Key
              </label>
              <input
                id="openai-api-key"
                name="openai-api-key"
                type="password"
                placeholder="sk-..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: `2px solid ${apiKeyError ? '#ef4444' : '#d1d5db'}`,
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                  backgroundColor: '#ffffff',
                  minHeight: '44px',
                  boxSizing: 'border-box'
                }}
                autoComplete="off"
              />
            </div>
            
            {apiKeyError && (
              <div style={{
                fontSize: '12px',
                color: '#ef4444',
                marginBottom: '16px',
                padding: '8px 12px',
                backgroundColor: '#fef2f2',
                borderRadius: '6px',
                border: '1px solid #fecaca'
              }}>
                ⚠️ {apiKeyError}
              </div>
            )}
            
            <div style={{
              display: 'flex',
              gap: '12px'
            }}>
              <button
                onClick={() => setShowSetupAlert(false)}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  backgroundColor: '#6b7280',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                Skip
              </button>
              <button
                onClick={() => {
                  saveApiKey();
                  if (!apiKeyError && apiKey.trim()) {
                    setShowSetupAlert(false);
                  }
                }}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  backgroundColor: apiKey.trim() ? '#10b981' : '#6b7280',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                Save Key
              </button>
              <button
                onClick={() => {
                  clearApiKey();
                  setShowSetupAlert(false);
                }}
                style={{
                  padding: '10px 16px',
                  backgroundColor: '#ef4444',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                Clear
              </button>
            </div>
            
            <p style={{
              margin: '12px 0 0 0',
              fontSize: '11px',
              color: '#64748b',
              textAlign: 'center'
            }}>
              Your API key is stored only in your browser
            </p>
          </div>
        </div>
      )}
      {/* Sidebar */}
      <div style={{
        width: '280px',
        backgroundColor: '#ffffff',
        borderRight: '1px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{
          padding: '24px',
          borderBottom: '1px solid #e2e8f0'
        }}>
          <h1 style={{
            fontSize: '20px',
            fontWeight: '600',
            color: '#1e293b',
            margin: 0
          }}>
            Knowledge Engine
          </h1>
          <p style={{
            fontSize: '14px',
            color: '#64748b',
            margin: '4px 0 0 0'
          }}>
            RAG-powered Q&A System
          </p>
        </div>

        
        <nav style={{ flex: 1, padding: '16px' }}>
          <button
            onClick={() => setShowSetupAlert(true)}
            style={{
              width: '100%',
              padding: '12px 16px',
              marginBottom: '8px',
              backgroundColor: '#10b981',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              textAlign: 'left'
            }}
          >
             API Key Setup
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            style={{
              width: '100%',
              padding: '12px 16px',
              marginBottom: '8px',
              backgroundColor: activeTab === 'chat' ? '#3b82f6' : 'transparent',
              color: activeTab === 'chat' ? '#ffffff' : '#64748b',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              textAlign: 'left'
            }}
          >
            Chat Interface
          </button>
          <button
            onClick={() => setActiveTab('documents')}
            style={{
              width: '100%',
              padding: '12px 16px',
              marginBottom: '8px',
              backgroundColor: activeTab === 'documents' ? '#3b82f6' : 'transparent',
              color: activeTab === 'documents' ? '#ffffff' : '#64748b',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              textAlign: 'left'
            }}
          >
            Documents
          </button>
          <button
            onClick={() => setActiveTab('history')}
            style={{
              width: '100%',
              padding: '12px 16px',
              marginBottom: '8px',
              backgroundColor: activeTab === 'history' ? '#3b82f6' : 'transparent',
              color: activeTab === 'history' ? '#ffffff' : '#64748b',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              textAlign: 'left'
            }}
          >
             Chat History
          </button>
        </nav>

              </div>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {activeTab === 'chat' && (
          <>
            {/* Chat Header */}
            <div style={{
              backgroundColor: '#ffffff',
              borderBottom: '1px solid #e2e8f0',
              padding: '20px 24px'
            }}>
              <h2 style={{
                fontSize: '18px',
                fontWeight: '600',
                color: '#1e293b',
                margin: 0
              }}>
                Chat with your Knowledge Base
              </h2>
              <p style={{
                fontSize: '14px',
                color: '#64748b',
                margin: '4px 0 0 0'
              }}>
                Ask questions about your uploaded documents
              </p>
            </div>

            {/* Document Selection */}
            {documents.length > 0 && (
              <div style={{
                backgroundColor: '#f8fafc',
                borderBottom: '1px solid #e2e8f0',
                padding: '16px 24px'
              }}>
                <div style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '12px'
                }}>
                  📄 Select Documents to Search Within:
                </div>
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '8px',
                  marginBottom: '12px'
                }}>
                  <div
                    onClick={() => setSelectedDocuments([])}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '6px 12px',
                      fontSize: '12px',
                      border: selectedDocuments.length === 0 ? '2px solid #3b82f6' : '1px solid #d1d5db',
                      borderRadius: '6px',
                      backgroundColor: selectedDocuments.length === 0 ? '#eff6ff' : '#ffffff',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = selectedDocuments.length === 0 ? '#dbeafe' : '#f9fafb';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = selectedDocuments.length === 0 ? '#eff6ff' : '#ffffff';
                    }}
                  >
                    <span>📚 All Documents</span>
                  </div>
                  {documents.map(doc => (
                    <div
                      key={doc.document_id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '6px 12px',
                        fontSize: '12px',
                        border: selectedDocuments.includes(doc.document_id) ? '2px solid #3b82f6' : '1px solid #d1d5db',
                        borderRadius: '6px',
                        backgroundColor: selectedDocuments.includes(doc.document_id) ? '#eff6ff' : '#ffffff',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      onClick={() => {
                        if (selectedDocuments.includes(doc.document_id)) {
                          setSelectedDocuments(selectedDocuments.filter(id => id !== doc.document_id));
                        } else {
                          setSelectedDocuments([...selectedDocuments, doc.document_id]);
                        }
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = selectedDocuments.includes(doc.document_id) ? '#dbeafe' : '#f9fafb';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = selectedDocuments.includes(doc.document_id) ? '#eff6ff' : '#ffffff';
                      }}
                    >
                      <span style={{ 
                        flex: 1, 
                        whiteSpace: 'nowrap', 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis',
                        maxWidth: '180px'
                      }}>
                        📄 {doc.filename}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteDocument(doc.document_id, doc.filename);
                        }}
                        style={{
                          padding: '2px 6px',
                          fontSize: '10px',
                          border: '1px solid #ef4444',
                          borderRadius: '4px',
                          backgroundColor: '#ffffff',
                          color: '#ef4444',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '2px'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#ef4444';
                          e.currentTarget.style.color = '#ffffff';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#ffffff';
                          e.currentTarget.style.color = '#ef4444';
                        }}
                        title={`Delete ${doc.filename}`}
                      >
                        🗑️
                      </button>
                    </div>
                  ))}
                </div>
                <div style={{
                  fontSize: '12px',
                  color: '#6b7280'
                }}>
                  {selectedDocuments.length === 0 
                    ? 'Searching across all uploaded documents' 
                    : `Searching in ${selectedDocuments.length} selected document(s)`}
                  {documents.length > 0 && (
                    <span style={{ marginLeft: '8px', color: '#9ca3af' }}>
                      • Click 🗑️ to delete a document
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Messages */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '24px',
              backgroundColor: '#f8fafc'
            }}>
              {chatMessages.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '60px 20px',
                  color: '#64748b'
                }}>
                  <div style={{
                    fontSize: '48px',
                    marginBottom: '16px'
                  }}>🤖</div>
                  <h3 style={{
                    fontSize: '18px',
                    fontWeight: '600',
                    color: '#1e293b',
                    marginBottom: '8px'
                  }}>
                    Start a conversation
                  </h3>
                  <p>
                    Ask questions about your documents to get intelligent answers with sources.
                  </p>
                </div>
              ) : (
                <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                  {chatMessages.map((msg, index) => (
                    <div key={index} style={{
                      marginBottom: '24px',
                      display: 'flex',
                      flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                      alignItems: 'flex-start'
                    }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        backgroundColor: msg.role === 'user' ? '#3b82f6' : '#10b981',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: '14px',
                        fontWeight: '600',
                        margin: msg.role === 'user' ? '0 0 0 12px' : '0 12px 0 0'
                      }}>
                        {msg.role === 'user' ? 'U' : 'A'}
                      </div>
                      <div style={{
                        maxWidth: '70%',
                        backgroundColor: msg.role === 'user' ? '#3b82f6' : '#ffffff',
                        color: msg.role === 'user' ? '#ffffff' : '#1e293b',
                        padding: '16px',
                        borderRadius: '12px',
                        border: msg.role === 'user' ? 'none' : '1px solid #e2e8f0'
                      }}>
                        <div style={{ fontSize: '14px', lineHeight: '1.5' }}>
                          {msg.content.split('\n').map((line, lineIndex) => (
                            <div key={lineIndex}>
                              <span dangerouslySetInnerHTML={{ __html: parseMarkdown(line) }} />
                              {(line.includes('[🔑 Add API Key]') || line.includes('[🔑 Introduce API Key]') || line.includes('[🔑 Update API Key]')) && (
                                <button
                                  onClick={() => setShowSetupAlert(true)}
                                  style={{
                                    marginLeft: '8px',
                                    padding: '4px 8px',
                                    backgroundColor: '#3b82f6',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    fontSize: '12px',
                                    cursor: 'pointer'
                                  }}
                                >
                                  🔑 {line.includes('Introduce') ? 'Introduce API Key' : line.includes('Update') ? 'Update API Key' : 'Add API Key'}
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                        {msg.timestamp && (
                          <div style={{
                            fontSize: '12px',
                            color: msg.role === 'user' ? 'rgba(255,255,255,0.7)' : '#94a3b8',
                            marginTop: '8px'
                          }}>
                            {formatTime(msg.timestamp)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '16px',
                      backgroundColor: '#ffffff',
                      borderRadius: '12px',
                      border: '1px solid #e2e8f0',
                      maxWidth: '70%'
                    }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        backgroundColor: '#10b981',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: '14px',
                        fontWeight: '600'
                      }}>
                        A
                      </div>
                      <div style={{ color: '#64748b' }}>
                        Thinking...
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Input */}
            <div style={{
              backgroundColor: '#ffffff',
              borderTop: '1px solid #e2e8f0',
              padding: '20px 24px'
            }}>
              <form onSubmit={handleSubmit} style={{
                display: 'flex',
                gap: '12px',
                maxWidth: '800px',
                margin: '0 auto'
              }}>
                <input
                  id="chat-message-input"
                  name="chat-message"
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type your question here..."
                  disabled={isLoading}
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                    backgroundColor: '#ffffff'
                  }}
                  autoComplete="off"
                />
                <button
                  type="submit"
                  disabled={isLoading || !message.trim()}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: isLoading || !message.trim() ? '#94a3b8' : '#3b82f6',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: isLoading || !message.trim() ? 'not-allowed' : 'pointer'
                  }}
                >
                  {isLoading ? 'Sending...' : 'Send'}
                </button>
              </form>
            </div>
          </>
        )}

        {activeTab === 'documents' && (
          <div style={{
            padding: '24px',
            backgroundColor: '#f8fafc',
            height: '100%',
            overflowY: 'auto'
          }}>
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              padding: '24px',
              border: '1px solid #e2e8f0'
            }}>
              <h3 style={{
                fontSize: '18px',
                fontWeight: '600',
                color: '#1e293b',
                marginBottom: '16px'
              }}>
                Upload Documents
              </h3>
              
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                style={{
                  border: `2px dashed ${isDragging ? '#3b82f6' : '#d1d5db'}`,
                  borderRadius: '8px',
                  padding: '40px',
                  textAlign: 'center',
                  backgroundColor: isDragging ? '#eff6ff' : '#f9fafb',
                  cursor: 'pointer',
                  marginBottom: '20px'
                }}
                onClick={() => fileInputRef.current?.click()}
              >
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>📁</div>
                <h4 style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#1e293b',
                  marginBottom: '8px'
                }}>
                  {isDragging ? 'Drop files here' : 'Drag & drop files here'}
                </h4>
                <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '16px' }}>
                  or click to browse
                </p>
                <p style={{ fontSize: '12px', color: '#94a3b8' }}>
                  Supported formats: PDF, TXT, MD (Max: 50MB)
                </p>
                <input
                  ref={fileInputRef}
                  id="file-upload"
                  name="file-upload"
                  type="file"
                  multiple
                  accept=".pdf,.txt,.md"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />
              </div>

              {uploadedFiles.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <h4 style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#1e293b',
                    marginBottom: '12px'
                  }}>
                    Files to Upload ({uploadedFiles.length})
                  </h4>
                  <div>
                    {uploadedFiles.map((file, index) => (
                      <div key={index} style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px',
                        backgroundColor: '#f8fafc',
                        borderRadius: '6px',
                        border: '1px solid #e2e8f0',
                        marginBottom: '12px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ fontSize: '20px' }}>📄</span>
                          <div>
                            <div style={{ fontSize: '14px', fontWeight: '500', color: '#1e293b' }}>
                              {file.name}
                            </div>
                            <div style={{ fontSize: '12px', color: '#64748b' }}>
                              {(file.size / 1024 / 1024).toFixed(2)} MB
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => removeFile(index)}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#ef4444',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '12px',
                            cursor: 'pointer'
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                  <button
                    onClick={uploadFiles}
                    disabled={isLoading}
                    style={{
                      padding: '12px 24px',
                      backgroundColor: isLoading ? '#64748b' : '#10b981',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: isLoading ? 'not-allowed' : 'pointer',
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                  >
                    {isLoading ? (
                      <>
                        <div style={{
                          width: '16px',
                          height: '16px',
                          border: '2px solid #ffffff',
                          borderTop: '2px solid transparent',
                          borderRadius: '50%'
                        }}></div>
                        Processing...
                      </>
                    ) : (
                      <>
                        ⚡ Upload {uploadedFiles.length} File{uploadedFiles.length !== 1 ? 's' : ''}
                      </>
                    )}
                  </button>
                  <button
                    onClick={clearAllFiles}
                    style={{
                      padding: '12px 24px',
                      backgroundColor: '#6b7280',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: 'pointer'
                    }}
                  >
                    Clear All
                  </button>
                </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div style={{
            padding: '24px',
            backgroundColor: '#f8fafc',
            height: '100%',
            overflowY: 'auto'
          }}>
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              padding: '24px',
              border: '1px solid #e2e8f0'
            }}>
              <h3 style={{
                fontSize: '18px',
                fontWeight: '600',
                color: '#1e293b',
                marginBottom: '16px'
              }}>
                Chat History
              </h3>
              {chatMessages.length === 0 ? (
                <p style={{ color: '#64748b', textAlign: 'center', padding: '40px' }}>
                  No chat history yet. Start a conversation to see it here.
                </p>
              ) : (
                <div>
                  {chatMessages.map((msg, index) => (
                    <div key={index} style={{
                      padding: '12px',
                      backgroundColor: '#f8fafc',
                      borderRadius: '6px',
                      border: '1px solid #e2e8f0'
                    }}>
                      <div style={{
                        fontSize: '12px',
                        fontWeight: '600',
                        color: msg.role === 'user' ? '#3b82f6' : '#10b981',
                        marginBottom: '4px'
                      }}>
                        {msg.role === 'user' ? 'You' : 'Assistant'}
                        {msg.timestamp && (
                          <span style={{ color: '#94a3b8', marginLeft: '8px' }}>
                            {formatTime(msg.timestamp)}
                          </span>
                        )}
                      </div>
                      <div style={{
                        fontSize: '14px',
                        color: '#1e293b',
                        lineHeight: '1.4'
                      }}>
                        {msg.content.substring(0, 100)}
                        {msg.content.length > 100 && '...'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
