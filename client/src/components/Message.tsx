import React, { useEffect, useRef } from 'react';
import { Message as MessageType } from '../types';
import { User, Bot, Copy, RotateCcw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import mermaid from 'mermaid';

// Type-safe icon components
const UserIcon = User as any;
const BotIcon = Bot as any;
const CopyIcon = Copy as any;
const RotateCcwIcon = RotateCcw as any;

// Initialize Mermaid
mermaid.initialize({ 
  startOnLoad: false,
  theme: 'default',
  securityLevel: 'loose',
  fontFamily: 'monospace'
});

interface MessageProps {
  message: MessageType;
  onRegenerate?: () => void;
  isLastAssistantMessage?: boolean;
  isStreaming?: boolean;
}

const Message: React.FC<MessageProps> = ({ 
  message, 
  onRegenerate, 
  isLastAssistantMessage = false,
  isStreaming = false
}) => {
  const mermaidRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (message.has_diagram && mermaidRef.current) {
      console.log('Processing diagram for message:', message.id);
      console.log('Message content:', message.content);
      
      // Look for mermaid code in the original content
      const mermaidRegex = /```mermaid\s*\n?([\s\S]*?)\n?```/g;
      let match;
      let index = 0;
      
      while ((match = mermaidRegex.exec(message.content)) !== null) {
        const code = match[1].trim();
        console.log('Found mermaid code:', code);
        
        if (code) {
          const container = document.createElement('div');
          container.className = 'mermaid-container';
          container.innerHTML = `<div class="mermaid-diagram">${code}</div>`;
          mermaidRef.current.appendChild(container);
          
          const element = container.querySelector('.mermaid-diagram') as HTMLElement;
          const uniqueId = `mermaid-${message.id}-${index}`;
          element.id = uniqueId;
          
          console.log('Rendering mermaid with ID:', uniqueId);
          
          try {
            mermaid.render(`${uniqueId}-svg`, code).then((result) => {
              console.log('Mermaid rendered successfully');
              element.innerHTML = result.svg;
            }).catch((error) => {
              console.error('Mermaid rendering error:', error);
              const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
              element.innerHTML = `<pre class="bg-red-50 border border-red-200 text-red-700 p-3 rounded text-sm">Error rendering diagram: ${errorMessage}</pre>`;
            });
          } catch (error) {
            console.error('Mermaid error:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            element.innerHTML = `<pre class="bg-red-50 border border-red-200 text-red-700 p-3 rounded text-sm">Error rendering diagram: ${errorMessage}</pre>`;
          }
          index++;
        }
      }
    }
  }, [message.has_diagram, message.id, message.content]);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const formatMessageContent = (content: string) => {
    // Don't process mermaid diagrams here - let the useEffect handle them
    // Just return the original content for ReactMarkdown to process
    return content;
  };

  const isUser = message.role === 'user';

  // Typing indicator component
  const TypingIndicator = () => (
    <div className="flex items-center space-x-1 text-gray-400">
      <div className="flex space-x-1">
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
      </div>
      <span className="text-xs ml-2">AI is typing...</span>
    </div>
  );

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-6 message-animate`}>
      <div className={`flex max-w-4xl ${isUser ? 'flex-row-reverse' : 'flex-row'} items-start space-x-3 ${isUser ? 'space-x-reverse' : ''}`}>
        {/* Avatar */}
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isUser 
            ? 'bg-primary-600 text-white' 
            : 'bg-gray-200 text-gray-600'
        }`}>
          {isUser ? <UserIcon className="h-4 w-4" /> : <BotIcon className="h-4 w-4" />}
        </div>

        {/* Message Content */}
        <div className={`flex-1 ${isUser ? 'text-right' : 'text-left'}`}>
          <div className={`inline-block max-w-full p-4 rounded-lg ${
            isUser 
              ? 'bg-primary-600 text-white rounded-br-sm' 
              : 'bg-white border border-gray-200 rounded-bl-sm shadow-sm'
          }`}>
            <div className="message-content" ref={mermaidRef}>
              <ReactMarkdown
                components={{
                  pre: ({ children, ...props }) => (
                    <pre {...props} className={`${isUser ? 'bg-primary-700 border-primary-500' : 'bg-gray-100 border-gray-200'} border rounded-lg p-3 overflow-x-auto text-sm`}>
                      {children}
                    </pre>
                  ),
                  code: ({ children, className, ...props }) => {
                    const isInline = !className;
                    return (
                      <code 
                        {...props} 
                        className={`${
                          isInline 
                            ? `${isUser ? 'bg-primary-700' : 'bg-gray-100'} px-1 py-0.5 rounded text-sm` 
                            : ''
                        }`}
                      >
                        {children}
                      </code>
                    );
                  },
                }}
              >
                {formatMessageContent(message.content)}
              </ReactMarkdown>
              
              {/* Show typing indicator for streaming assistant messages */}
              {!isUser && isStreaming && message.content === '' && (
                <div className="mt-2">
                  <TypingIndicator />
                </div>
              )}
            </div>

            {/* Message Actions */}
            <div className={`flex items-center justify-between mt-3 pt-2 border-t ${
              isUser ? 'border-primary-500' : 'border-gray-200'
            }`}>
              <span className={`text-xs ${isUser ? 'text-primary-100' : 'text-gray-500'}`}>
                {new Date(message.created_at).toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </span>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => copyToClipboard(message.content)}
                  className={`p-1 rounded hover:bg-opacity-80 transition-colors ${
                    isUser 
                      ? 'text-primary-100 hover:bg-primary-700' 
                      : 'text-gray-400 hover:bg-gray-100'
                  }`}
                  title="Copy message"
                >
                  <CopyIcon className="h-3 w-3" />
                </button>
                
                {!isUser && isLastAssistantMessage && onRegenerate && (
                  <button
                    onClick={onRegenerate}
                    className="p-1 rounded text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                    title="Regenerate response"
                  >
                    <RotateCcwIcon className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Message;