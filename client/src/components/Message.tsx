import React, { useEffect, useRef } from 'react';
import { Message as MessageType } from '../types';
import { User, Bot, Copy, RotateCcw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import mermaid from 'mermaid';

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
}

const Message: React.FC<MessageProps> = ({ 
  message, 
  onRegenerate, 
  isLastAssistantMessage = false 
}) => {
  const mermaidRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (message.has_diagram && mermaidRef.current) {
      const mermaidBlocks = mermaidRef.current.querySelectorAll('.mermaid-diagram');
      mermaidBlocks.forEach((block, index) => {
        const element = block as HTMLElement;
        const code = element.textContent || '';
        
        if (code.trim()) {
          const uniqueId = `mermaid-${message.id}-${index}`;
          element.id = uniqueId;
          
          try {
            mermaid.render(`${uniqueId}-svg`, code).then((result) => {
              element.innerHTML = result.svg;
            }).catch((error) => {
              console.error('Mermaid rendering error:', error);
              element.innerHTML = `<pre class="bg-red-50 border border-red-200 text-red-700 p-3 rounded text-sm">Error rendering diagram: ${error.message}</pre>`;
            });
          } catch (error) {
            console.error('Mermaid error:', error);
          }
        }
      });
    }
  }, [message.has_diagram, message.id]);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const formatMessageContent = (content: string) => {
    // Extract mermaid diagrams
    const mermaidRegex = /```mermaid\n([\s\S]*?)\n```/g;
    let processedContent = content;
    const diagrams: string[] = [];

    let match;
    while ((match = mermaidRegex.exec(content)) !== null) {
      diagrams.push(match[1]);
      processedContent = processedContent.replace(
        match[0],
        `<div class="mermaid-container"><div class="mermaid-diagram">${match[1]}</div></div>`
      );
    }

    return processedContent;
  };

  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-6 message-animate`}>
      <div className={`flex max-w-4xl ${isUser ? 'flex-row-reverse' : 'flex-row'} items-start space-x-3 ${isUser ? 'space-x-reverse' : ''}`}>
        {/* Avatar */}
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isUser 
            ? 'bg-primary-600 text-white' 
            : 'bg-gray-200 text-gray-600'
        }`}>
          {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
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
                  div: ({ children, className, ...props }) => {
                    if (className === 'mermaid-container') {
                      return (
                        <div className="my-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                          {children}
                        </div>
                      );
                    }
                    return <div {...props}>{children}</div>;
                  }
                }}
              >
                {formatMessageContent(message.content)}
              </ReactMarkdown>
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
                  <Copy className="h-3 w-3" />
                </button>
                
                {!isUser && isLastAssistantMessage && onRegenerate && (
                  <button
                    onClick={onRegenerate}
                    className="p-1 rounded text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                    title="Regenerate response"
                  >
                    <RotateCcw className="h-3 w-3" />
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