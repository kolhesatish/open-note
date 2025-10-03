import React, { useState, useRef, useEffect } from 'react';
import { Send, Square, Plus } from 'lucide-react';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  disabled?: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({ 
  onSendMessage, 
  isLoading, 
  disabled = false 
}) => {
  const [message, setMessage] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (inputRef.current && inputRef.current.textContent !== message) {
      inputRef.current.textContent = message;
    }
  }, [message]);

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    const text = e.currentTarget.textContent || '';
    setMessage(text);
  };

  const handleSubmit = () => {
    if (message.trim() && !isLoading && !disabled) {
      onSendMessage(message.trim());
      setMessage('');
      if (inputRef.current) {
        inputRef.current.textContent = '';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
  };

  const handleStop = () => {
    console.log('Stop generation requested');
  };

  const containerStyle: React.CSSProperties = {
    position: 'sticky',
    bottom: 0,
    zIndex: 10,
    borderTop: '1px solid #e5e7eb',
    backgroundColor: '#ffffff'
  };

  const inputContainerStyle: React.CSSProperties = {
    border: `1px solid ${isFocused ? '#d1d5db' : '#e5e7eb'}`,
    borderRadius: '24px',
    backgroundColor: disabled ? '#f9fafb' : '#ffffff',
    transition: 'all 0.2s ease-in-out',
    boxShadow: isFocused ? '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)' : '0 1px 2px 0 rgb(0 0 0 / 0.05)'
  };

  const buttonStyle: React.CSSProperties = {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    border: 'none',
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'all 0.2s ease-in-out',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  };

  const addButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    backgroundColor: 'transparent',
    color: '#9ca3af'
  };

  const sendButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    backgroundColor: message.trim() && !disabled ? '#111827' : '#e5e7eb',
    color: message.trim() && !disabled ? '#ffffff' : '#9ca3af'
  };

  const inputStyle: React.CSSProperties = {
    minHeight: '20px',
    maxHeight: '128px',
    overflowY: 'auto',
    padding: '8px 12px',
    fontSize: '14px',
    lineHeight: '1.4',
    color: disabled || isLoading ? '#9ca3af' : '#111827',
    cursor: disabled || isLoading ? 'not-allowed' : 'text',
    outline: 'none',
    border: 'none',
    backgroundColor: 'transparent',
    wordWrap: 'break-word',
    whiteSpace: 'pre-wrap',
    resize: 'none'
  };

  const placeholderStyle: React.CSSProperties = {
    position: 'absolute',
    left: '12px',
    top: '8px',
    color: '#9ca3af',
    fontSize: '14px',
    pointerEvents: 'none',
    userSelect: 'none'
  };

  return (
    <div style={containerStyle} className="p-4">
      <div className="w-full max-w-4xl mx-auto">
        <div className="flex items-end" style={{ gap: '12px', ...inputContainerStyle, padding: '8px' }}>
          
          {/* Add/Attachment Button */}
          <button
            type="button"
            disabled={disabled}
            style={addButtonStyle}
            title="Add attachment"
            onMouseEnter={(e) => {
              if (!disabled) {
                e.currentTarget.style.backgroundColor = '#f3f4f6';
                e.currentTarget.style.color = '#6b7280';
              }
            }}
            onMouseLeave={(e) => {
              if (!disabled) {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = '#9ca3af';
              }
            }}
          >
            <Plus size={16} />
          </button>

          {/* Input Area */}
          <div className="flex-1 relative">
            <div
              ref={inputRef}
              contentEditable={!disabled && !isLoading}
              onInput={handleInput}
              onKeyDown={handleKeyDown}
              onFocus={handleFocus}
              onBlur={handleBlur}
              style={inputStyle}
              suppressContentEditableWarning={true}
            />
            
            {/* Custom placeholder */}
            {!message && !isFocused && (
              <div style={placeholderStyle}>
                {disabled ? "Select or create a chat to start messaging..." : "Message Claude..."}
              </div>
            )}
          </div>

          {/* Send/Stop Button */}
          <div>
            {isLoading ? (
              <button
                type="button"
                onClick={handleStop}
                style={{
                  ...buttonStyle,
                  backgroundColor: '#e5e7eb',
                  color: '#6b7280'
                }}
                title="Stop generation"
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#d1d5db';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#e5e7eb';
                }}
              >
                <Square size={12} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!message.trim() || disabled}
                style={sendButtonStyle}
                title="Send message"
                onMouseEnter={(e) => {
                  if (message.trim() && !disabled) {
                    e.currentTarget.style.backgroundColor = '#1f2937';
                  }
                }}
                onMouseLeave={(e) => {
                  if (message.trim() && !disabled) {
                    e.currentTarget.style.backgroundColor = '#111827';
                  }
                }}
              >
                <Send size={12} />
              </button>
            )}
          </div>
        </div>
        
        {/* Helper text */}
        {message.trim() && !disabled && (
          <div className="mt-2 text-xs text-center" style={{ color: '#9ca3af' }}>
            Press ⏎ to send, Shift + ⏎ for new line
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatInput;