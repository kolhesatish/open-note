import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Message as MessageType } from '../types';
import { User, Bot, Copy, RotateCcw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import mermaid from 'mermaid';

// Type-safe icon components
const UserIcon = User as any;
const BotIcon = Bot as any;
const CopyIcon = Copy as any;
const RotateCcwIcon = RotateCcw as any;

mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
  securityLevel: 'loose',
  fontFamily: 'monospace',
  flowchart: {
    useMaxWidth: true,
    htmlLabels: true,
    curve: 'basis',
    padding: 20
  },
  sequence: {
    useMaxWidth: true
  },
  gantt: {
    useMaxWidth: true
  },
  themeVariables: {
    primaryColor: '#ffffff',
    primaryTextColor: '#000000',
    primaryBorderColor: '#d1d5db',
    lineColor: '#000000',
    sectionBkgColor: '#f9fafb',
    altSectionBkgColor: '#ffffff',
    gridColor: '#e5e7eb',
    textColor: '#000000',
    taskBkgColor: '#ffffff',
    taskTextColor: '#000000',
    taskTextLightColor: '#6b7280',
    taskTextOutsideColor: '#000000',
    taskTextClickableColor: '#3b82f6',
    activeTaskBkgColor: '#dbeafe',
    activeTaskBorderColor: '#3b82f6',
    section0: '#f9fafb',
    section1: '#ffffff',
    section2: '#f3f4f6',
    section3: '#e5e7eb'
  }
});

interface MessageProps {
  message: MessageType;
  onRegenerate?: () => void;
  isLastAssistantMessage?: boolean;
  isStreaming?: boolean;
}

// Function to safely format date/time
const formatMessageTime = (dateString: string | undefined | null): string => {
  try {
    if (!dateString) {
      return new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
    }
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      // If date is invalid, use current time as fallback
      return new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
    }
    
    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (error) {
    // If any error occurs, use current time as fallback
    return new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  }
};

// Function to fix common Mermaid syntax issues
const fixMermaidSyntax = (code: string): string => {
  let fixedCode = code.trim();
  
  // Fix common issues:
  // 1. Remove parentheses from decision node labels
  fixedCode = fixedCode.replace(/\{([^}]*?)\([^)]*\)([^}]*?)\}/g, '{$1$2}');
  
  // 2. Remove question marks from decision node labels
  fixedCode = fixedCode.replace(/\{([^}]*?)\?([^}]*?)\}/g, '{$1$2}');
  
  // 3. Fix semicolons at the end of lines (should not be there in most cases)
  fixedCode = fixedCode.replace(/;\s*$/gm, '');
  
  // 4. Fix common arrow syntax issues
  fixedCode = fixedCode.replace(/-->\s*;/g, '-->');
  fixedCode = fixedCode.replace(/--\s*([^-\s][^-\n]*?)\s*-->/g, '-- $1 -->');
  
  // 5. Ensure proper spacing around arrows
  fixedCode = fixedCode.replace(/(\w+)\s*-->\s*(\w+)/g, '$1 --> $2');
  
  // 6. Fix node label issues with special characters
  fixedCode = fixedCode.replace(/\[([^\]]*?)\([^)]*\)([^\]]*?)\]/g, '[$1$2]');
  fixedCode = fixedCode.replace(/\[([^\]]*?)\?([^\]]*?)\]/g, '[$1$2]');
  
  return fixedCode;
};

// Add this function after the fixMermaidSyntax function
const hideMermaidErrors = () => {
  // Hide any error elements that might appear
  const errorElements = document.querySelectorAll('.mermaid .error, .mermaid [class*="error"], [data-mermaid-error]');
  errorElements.forEach(el => {
    (el as HTMLElement).style.display = 'none';
    (el as HTMLElement).style.visibility = 'hidden';
    (el as HTMLElement).style.opacity = '0';
    (el as HTMLElement).style.height = '0';
    (el as HTMLElement).style.width = '0';
    (el as HTMLElement).style.overflow = 'hidden';
  });

  // Also hide any text nodes containing error messages
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    null
  );
  
  let node;
  while (node = walker.nextNode()) {
    if (node.textContent && (
      node.textContent.includes('Syntax error in text') ||
      node.textContent.includes('mermaid version') ||
      node.textContent.includes('syntax error')
    )) {
      const parent = node.parentElement;
      if (parent) {
        parent.style.display = 'none';
        parent.style.visibility = 'hidden';
        parent.style.opacity = '0';
        parent.style.height = '0';
        parent.style.width = '0';
        parent.style.overflow = 'hidden';
      }
    }
  }
};

const MermaidBlock: React.FC<{ code: string }> = ({ code }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  // Stable id to avoid double-render in StrictMode
  const renderId = useMemo(
    () => `mermaid-${Math.random().toString(36).slice(2)}`,
    []
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Clear previous render to prevent duplicates on re-renders
    el.innerHTML = '';

    const target = document.createElement('div');
    target.id = `${renderId}-src`;
    el.appendChild(target);

    // Fix the mermaid syntax before rendering
    const fixedCode = fixMermaidSyntax(code);
    
    try {
      mermaid
        .render(`${renderId}-svg`, fixedCode)
        .then((result) => {
          target.innerHTML = result.svg;
          // Add CSS to ensure SVG scales properly and text doesn't get cut off
          const svg = target.querySelector('svg');
          if (svg) {
            svg.style.maxWidth = '100%';
            svg.style.height = 'auto';
            svg.style.display = 'block';
          }
          
          // Hide any errors that might have appeared
          hideMermaidErrors();
        })
        .catch((error) => {
          console.warn('Mermaid rendering failed:', error);
          // Hide the error and show a fallback message
          hideMermaidErrors();
          target.innerHTML = '<div class="text-gray-500 text-sm">Diagram could not be rendered</div>';
        });
    } catch (error) {
      console.warn('Mermaid rendering failed:', error);
      hideMermaidErrors();
      target.innerHTML = '<div class="text-gray-500 text-sm">Diagram could not be rendered</div>';
    }
  }, [code, renderId]);

  return <div ref={containerRef} className="mermaid-container w-full overflow-x-auto" style={{ minWidth: 'max-content' }} />;
};

const Message: React.FC<MessageProps> = ({ 
  message, 
  onRegenerate, 
  isLastAssistantMessage = false,
  isStreaming = false
}) => {
  const mermaidRef = useRef<HTMLDivElement>(null);
  const processedMessageId = useRef<string>('');

  useEffect(() => {
    // Only process if this is a new message and has diagrams
    if (message.has_diagram && mermaidRef.current && processedMessageId.current !== String(message.id)) {
      console.log('Processing diagram for message:', message.id);
      
      // Clear any existing content first
      mermaidRef.current.innerHTML = '';
      
      // Mark this message as being processed
      processedMessageId.current = String(message.id);
      
      // Look for mermaid code blocks in the content
      const mermaidRegex = /```mermaid\s*\n([\s\S]*?)\n```/g;
      const matches: RegExpExecArray[] = [];
      let match;
      while ((match = mermaidRegex.exec(message.content)) !== null) {
        matches.push(match);
      }
      
      if (matches.length === 0) {
        mermaidRef.current.innerHTML = `
          <div class="bg-yellow-50 border border-yellow-200 text-yellow-700 p-3 rounded text-sm">
            <strong>Note:</strong> No valid Mermaid diagrams found in this message.
          </div>
        `;
        return;
      }
      
      matches.forEach((match, index) => {
        const code = match[1].trim();
        console.log('Found mermaid code:', code);
        
        if (code && code.length > 0) {
          const uniqueId = `mermaid-${message.id}-${index}`;
          
          // Create container for this diagram
          const container = document.createElement('div');
          container.className = 'mermaid-container mb-4';
          container.innerHTML = `<div id="${uniqueId}" class="mermaid-diagram bg-white p-4 border rounded-lg w-full min-w-0 overflow-x-auto" style="min-width: max-content;"></div>`;
          
          if (mermaidRef.current) {
            mermaidRef.current.appendChild(container);
          }
          
          const element = container.querySelector(`#${uniqueId}`) as HTMLElement;
          
          console.log('Rendering mermaid with ID:', uniqueId);
          
          // Fix the mermaid syntax before rendering
          const fixedCode = fixMermaidSyntax(code);
          console.log('Fixed mermaid code:', fixedCode);
          
          // Render the mermaid diagram
          mermaid.render(`${uniqueId}-svg`, fixedCode)
            .then((result) => {
              console.log('Mermaid rendered successfully for:', uniqueId);
              if (element && element.parentNode) {
                element.innerHTML = result.svg;
                // Add CSS to ensure SVG scales properly and text doesn't get cut off
                const svg = element.querySelector('svg');
                if (svg) {
                  svg.style.maxWidth = '100%';
                  svg.style.height = 'auto';
                  svg.style.overflow = 'visible';
                }
              }
            })
            .catch((error) => {
              console.error('Mermaid rendering error for', uniqueId, ':', error);
              if (element && element.parentNode) {
                element.innerHTML = `
                  <div class="bg-red-50 border border-red-200 text-red-700 p-3 rounded text-sm">
                    <strong>Error rendering diagram:</strong> ${error.message || 'Unknown error occurred'}
                    <details class="mt-2">
                      <summary class="cursor-pointer text-xs">Show original code</summary>
                      <pre class="mt-1 text-xs bg-gray-100 p-2 rounded overflow-x-auto">${code}</pre>
                    </details>
                    <details class="mt-2">
                      <summary class="cursor-pointer text-xs">Show fixed code</summary>
                      <pre class="mt-1 text-xs bg-gray-100 p-2 rounded overflow-x-auto">${fixedCode}</pre>
                    </details>
                  </div>
                `;
              }
            });
        }
      });
    }
    
    // Reset processed message ID when message ID changes
    return () => {
      if (processedMessageId.current !== String(message.id)) {
        processedMessageId.current = '';
      }
    };
  }, [message.has_diagram, message.id, message.content]);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const formatMessageContent = (content: string) => {
    // Remove mermaid code blocks from content since they're handled separately
    if (message.has_diagram) {
      return content.replace(/```mermaid\s*\n[\s\S]*?\n```/g, '');
    }
    return content;
  };

  const isUser = message.role === 'user';

  // Typing indicator component
  const TypingIndicator = () => {
  const [dots, setDots] = useState('');
  
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => {
        if (prev.length >= 3) return '';
        return prev + '.';
      });
    }, 500);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center space-x-3 py-2">
      <div className="flex space-x-1">
        <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '0ms', animationDuration: '1s' }}></div>
        <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '200ms', animationDuration: '1s' }}></div>
        <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '400ms', animationDuration: '1s' }}></div>
      </div>
      <div className="flex items-center space-x-2">
        <span className="text-blue-600 text-sm font-medium">Claude is thinking</span>
        <span className="text-blue-400 font-mono text-sm min-w-[1rem]">{dots}</span>
      </div>
    </div>
  );
};

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-6 message-animate`}>
      <div className={`flex max-w-4xl ${isUser ? 'flex-row-reverse' : 'flex-row'} items-start space-x-3 ${isUser ? 'space-x-reverse' : ''}`}>
        {/* Avatar */}
        <div
          className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
            isUser ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-600'
          }`}
        >
          {isUser ? <UserIcon className="h-4 w-4" /> : <BotIcon className="h-4 w-4" />}
        </div>

        {/* Message Content */}
        <div className={`flex-1 ${isUser ? 'text-right' : 'text-left'}`}>
          <div className={`inline-block max-w-full p-4 rounded-lg ${
            isUser 
              ? 'bg-primary-600 text-white rounded-br-sm' 
              : 'bg-white border border-gray-200 rounded-bl-sm shadow-sm'
          }`}>
            <div className="message-content">
              {/* Regular markdown content */}
              {(formatMessageContent(message.content).trim() || isStreaming) && (
                <ReactMarkdown
                  components={{
                    pre: ({ children, ...props }) => (
                      <pre {...props} className={`${isUser ? 'bg-primary-700 border-primary-500' : 'bg-gray-100 border-gray-200'} border rounded-lg p-3 overflow-x-auto text-sm`}>
                        {children}
                      </pre>
                    ),
                    code: ({ children, className, ...props }) => {
                      const codeText = String(children ?? '');
                      const isBlock = !!className;
                      const isMermaid = /language-mermaid/.test(className || '');

                      if (isBlock && isMermaid) {
                        return <MermaidBlock code={codeText} />;
                      }

                      const isInline = !isBlock;
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
                  {formatMessageContent(message.content) || ''}
                </ReactMarkdown>
              )}
              
              {/* Show typing indicator for streaming assistant messages */}
              {!isUser && isStreaming && message.content === '' && (
                <div className="mt-2">
                  <TypingIndicator />
                </div>
              )}
            </div>

            {/* Message Actions */}
            <div
              className={`flex items-center justify-between mt-3 pt-2 border-t ${
                isUser ? 'border-primary-500' : 'border-gray-200'
              }`}
            >
              <span className={`text-xs ${isUser ? 'text-primary-100' : 'text-gray-500'}`}>
                {formatMessageTime(message.created_at)}
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
          
          {/* Mermaid diagrams rendered outside message bubble for better spacing */}
          {message.has_diagram && !isUser && (
            <div className="mt-3 w-full overflow-x-auto" ref={mermaidRef}></div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Message;