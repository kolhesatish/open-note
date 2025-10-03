import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Sidebar from '../components/Sidebar';
import Message from '../components/Message';
import ChatInput from '../components/ChatInput';
import { ChatSession, Message as MessageType, ChatSessionWithMessages } from '../types';
import apiService from '../services/api';
import { MessageSquare, Sparkles } from 'lucide-react';

// Type-safe icon components
const MessageSquareIcon = MessageSquare as any;
const SparklesIcon = Sparkles as any;

const ChatPage: React.FC = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSession, setCurrentSession] = useState<ChatSessionWithMessages | null>(null);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [error, setError] = useState<string>('');
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setVisible(false);
        setTimeout(() => setError(''), 500); 
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [error]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [currentSession?.messages]);

  // Load chat sessions on component mount
  useEffect(() => {
    loadChatSessions();
  }, []);

  const loadChatSessions = async () => {
    try {
      setError('');
      const response = await apiService.getChatSessions();
      setSessions(response.sessions);
      
      // Auto-select the most recent session if available
      if (response.sessions.length > 0 && !currentSession) {
        loadChatSession(response.sessions[0].id);
      }
    } catch (err: any) {
      setError('Failed to load chat sessions');
      console.error('Error loading sessions:', err);
    } finally {
      setIsLoadingSessions(false);
    }
  };

  const loadChatSession = async (sessionId: number) => {
    try {
      setError('');
      setIsLoadingMessages(true);
      const sessionData = await apiService.getChatSession(sessionId);
      setCurrentSession(sessionData);
    } catch (err: any) {
      setError('Failed to load chat session');
      console.error('Error loading session:', err);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const createNewChat = async () => {
    try {
      setError('');
      const response = await apiService.createChatSession('New Chat');
      
      // Add new session to the beginning of the list
      setSessions(prevSessions => [response.session, ...prevSessions]);
      
      // Set as current session with empty messages
      setCurrentSession({
        session: response.session,
        messages: []
      });
    } catch (err: any) {
      setError('Failed to create new chat');
      console.error('Error creating new chat:', err);
    }
  };

  const handleSessionSelect = (sessionId: number) => {
    if (currentSession?.session.id !== sessionId) {
      loadChatSession(sessionId);
    }
  };

  const handleSessionDelete = async (sessionId: number) => {
    try {
      setError('');
      await apiService.deleteChatSession(sessionId);
      
      // Remove from sessions list
      setSessions(prevSessions => prevSessions.filter(s => s.id !== sessionId));
      
      // If current session was deleted, clear it
      if (currentSession?.session.id === sessionId) {
        setCurrentSession(null);
        
        // Auto-select next available session
        const remainingSessions = sessions.filter(s => s.id !== sessionId);
        if (remainingSessions.length > 0) {
          loadChatSession(remainingSessions[0].id);
        }
      }
    } catch (err: any) {
      setError('Failed to delete chat session');
      console.error('Error deleting session:', err);
    }
  };

  const handleSessionRename = async (sessionId: number, newTitle: string) => {
    try {
      setError('');
      const response = await apiService.updateChatSessionTitle(sessionId, newTitle);
      
      // Update sessions list
      setSessions(prevSessions => 
        prevSessions.map(s => s.id === sessionId ? response.session : s)
      );
      
      // Update current session if it's the one being renamed
      if (currentSession?.session.id === sessionId) {
        setCurrentSession(prev => prev ? {
          ...prev,
          session: response.session
        } : null);
      }
    } catch (err: any) {
      setError('Failed to rename chat session');
      console.error('Error renaming session:', err);
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!currentSession) return;

    try {
      setError('');
      setIsSendingMessage(true);

      // Add user message immediately
      const userMessage = {
        id: Date.now(), // Temporary ID
        chat_session_id: currentSession.session.id,
        role: 'user' as const,
        content: content.trim(),
        has_diagram: false,
        created_at: new Date().toISOString()
      };

      // Update current session with user message
      setCurrentSession(prev => {
        if (!prev) return null;
        return {
          ...prev,
          messages: [...prev.messages, userMessage]
        };
      });

      // Create a temporary assistant message for streaming
      let assistantMessage = {
        id: Date.now() + 1, // Temporary ID
        chat_session_id: currentSession.session.id,
        role: 'assistant' as const,
        content: '',
        has_diagram: false,
        created_at: new Date().toISOString()
      };

      // Add empty assistant message for streaming
      setCurrentSession(prev => {
        if (!prev) return null;
        return {
          ...prev,
          messages: [...prev.messages, assistantMessage]
        };
      });

      // Start streaming
      console.log('Starting streaming for session:', currentSession.session.id);
      await apiService.sendMessageStream(
        currentSession.session.id,
        content,
        // onChunk
        (chunk: string) => {
          console.log('Received chunk in ChatPage:', chunk.substring(0, 50) + '...');
          setCurrentSession(prev => {
            if (!prev) return null;
            const updatedMessages = [...prev.messages];
            const lastMessage = updatedMessages[updatedMessages.length - 1];
            if (lastMessage && lastMessage.role === 'assistant') {
              updatedMessages[updatedMessages.length - 1] = {
                ...lastMessage,
                content: lastMessage.content + chunk
              };
            }
            return {
              ...prev,
              messages: updatedMessages
            };
          });
        },
        // onComplete
        (message: MessageType) => {
          console.log('Streaming completed with message:', message);
          setCurrentSession(prev => {
            if (!prev) return null;
            const updatedMessages = [...prev.messages];
            updatedMessages[updatedMessages.length - 1] = message;
            return {
              ...prev,
              messages: updatedMessages
            };
          });

          // Update session in the list
          setSessions(prevSessions => {
            const updatedSessions = prevSessions.map(s => 
              s.id === currentSession.session.id 
                ? { ...s, message_count: s.message_count + 2, updated_at: new Date().toISOString() }
                : s
            );
            
            // Move current session to top
            const currentSessionIndex = updatedSessions.findIndex(s => s.id === currentSession.session.id);
            if (currentSessionIndex > 0) {
              const [currentSessionItem] = updatedSessions.splice(currentSessionIndex, 1);
              updatedSessions.unshift(currentSessionItem);
            }
            
            return updatedSessions;
          });
        },
        // onError
        (error: string) => {
          setError(error);
          console.error('Streaming error:', error);
        }
      );

    } catch (err: any) {
      setError('Failed to send message');
      console.error('Error sending message:', err);
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleRegenerateResponse = async () => {
    if (!currentSession) return;

    try {
      setError('');
      setIsSendingMessage(true);

      const response = await apiService.regenerateResponse(currentSession.session.id);
      
      // Add regenerated message to current session
      setCurrentSession(prev => {
        if (!prev) return null;
        return {
          ...prev,
          messages: [...prev.messages, response.assistantMessage]
        };
      });

    } catch (err: any) {
      setError('Failed to regenerate response');
      console.error('Error regenerating response:', err);
    } finally {
      setIsSendingMessage(false);
    }
  };

  const getLastAssistantMessageIndex = () => {
    if (!currentSession?.messages) return -1;
    for (let i = currentSession.messages.length - 1; i >= 0; i--) {
      if (currentSession.messages[i].role === 'assistant') {
        return i;
      }
    }
    return -1;
  };

  // Premium styling
  const containerStyle: React.CSSProperties = {
    display: 'flex',
    height: '100vh',
    backgroundColor: '#ffffff'
  };

  const headerStyle: React.CSSProperties = {
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e5e7eb',
    padding: '16px 24px'
  };

  const errorStyle: React.CSSProperties = {
    margin: '16px 24px 0',
    padding: '12px',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    color: '#b91c1c',
    borderRadius: '8px',
    fontSize: '14px',
    transition: 'opacity 0.5s ease-in-out'
  };

  const messagesAreaStyle: React.CSSProperties = {
    flex: 1,
    overflowY: 'auto',
    padding: '24px',
    backgroundColor: '#ffffff'
  };

  const emptyStateStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    textAlign: 'center'
  };

  const primaryButtonStyle: React.CSSProperties = {
    backgroundColor: '#111827',
    color: '#ffffff',
    padding: '12px 24px',
    borderRadius: '8px',
    border: 'none',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s ease-in-out'
  };

  const suggestionButtonStyle: React.CSSProperties = {
    padding: '12px',
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    textAlign: 'left',
    cursor: 'pointer',
    transition: 'all 0.2s ease-in-out',
    fontSize: '14px',
    color: '#374151'
  };

  const loadingSpinnerStyle: React.CSSProperties = {
    width: '48px',
    height: '48px',
    border: '3px solid #e5e7eb',
    borderTop: '3px solid #111827',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  };

  return (
    <div style={containerStyle}>
      {/* Sidebar */}
      <Sidebar
        sessions={sessions}
        currentSessionId={currentSession?.session.id || null}
        onSessionSelect={handleSessionSelect}
        onNewChat={createNewChat}
        onSessionDelete={handleSessionDelete}
        onSessionRename={handleSessionRename}
        isLoading={isLoadingSessions}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div style={headerStyle}>
          <div className="flex items-center justify-between">
            <div className="flex items-center" style={{ gap: '12px' }}>
              <MessageSquareIcon size={24} style={{ color: '#6b7280' }} />
              <h1 className="text-xl font-semibold" style={{ color: '#111827' }}>
                {currentSession?.session.title || 'ChatGPT Clone'}
              </h1>
            </div>
            <div className="flex items-center text-sm" style={{ gap: '8px', color: '#6b7280' }}>
              <SparklesIcon size={16} />
              <span>AI Assistant</span>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div
            style={{
              ...errorStyle,
              opacity: visible ? 1 : 0
            }}
          >
            {error}
          </div>
        )}

        {/* Messages Area */}
        <div 
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto scrollbar-thin"
          style={messagesAreaStyle}
        >
          {!currentSession ? (
            <div style={emptyStateStyle}>
              <MessageSquareIcon size={64} style={{ color: '#d1d5db', marginBottom: '16px' }} />
              <h2 className="text-2xl font-semibold mb-2" style={{ color: '#111827' }}>
                Welcome to ChatGPT Clone
              </h2>
              <p style={{ color: '#6b7280', marginBottom: '24px', maxWidth: '448px', lineHeight: '1.5' }}>
                Start a conversation with our AI assistant. Ask questions, request explanations, 
                or even generate diagrams and charts!
              </p>
              <button
                onClick={createNewChat}
                style={primaryButtonStyle}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#1f2937';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#111827';
                }}
              >
                Start New Chat
              </button>
            </div>
          ) : isLoadingMessages ? (
            <div className="flex items-center justify-center h-full">
              <div style={loadingSpinnerStyle}></div>
            </div>
          ) : currentSession.messages.length === 0 ? (
            <div style={emptyStateStyle}>
              <SparklesIcon size={64} style={{ color: '#d1d5db', marginBottom: '16px' }} />
              <h2 className="text-2xl font-semibold mb-2" style={{ color: '#111827' }}>
                Ready to help!
              </h2>
              <p style={{ color: '#6b7280', marginBottom: '24px', maxWidth: '448px', lineHeight: '1.5' }}>
                I can help you with explanations, create diagrams, write code, and much more. 
                What would you like to explore today?
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 max-w-2xl" style={{ gap: '12px' }}>
                {[
                  "Explain quantum computing with a diagram",
                  "Create a flowchart for user registration",
                  "Show me a network architecture diagram",
                  "Help me understand machine learning"
                ].map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleSendMessage(suggestion)}
                    style={suggestionButtonStyle}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#9ca3af';
                      e.currentTarget.style.backgroundColor = '#f9fafb';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#e5e7eb';
                      e.currentTarget.style.backgroundColor = '#ffffff';
                    }}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto">
              {currentSession.messages.map((message, index) => {
                const lastAssistantIndex = getLastAssistantMessageIndex();
                const isLastAssistantMessage = 
                  message.role === 'assistant' && index === lastAssistantIndex;
                
                return (
                  <Message
                    key={message.id}
                    message={message}
                    onRegenerate={isLastAssistantMessage ? handleRegenerateResponse : undefined}
                    isLastAssistantMessage={isLastAssistantMessage}
                    isStreaming={isLastAssistantMessage && isSendingMessage && message.content === ''}
                  />
                );
              })}
              
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Chat Input */}
        <ChatInput
          onSendMessage={handleSendMessage}
          isLoading={isSendingMessage}
          disabled={!currentSession}
        />
      </div>
    </div>
  );
};

export default ChatPage;