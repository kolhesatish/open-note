import React, { useEffect, useMemo, useRef } from 'react';
import { Message as MessageType } from '../types';
import { User, Bot, Copy, RotateCcw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import mermaid from 'mermaid';

// Type-safe icon components
const UserIcon = User as any;
const BotIcon = Bot as any;
const CopyIcon = Copy as any;
const RotateCcwIcon = RotateCcw as any;

// Initialize Mermaid once
mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
  securityLevel: 'loose',
  fontFamily: 'monospace',
});

interface MessageProps {
  message: MessageType;
  onRegenerate?: () => void;
  isLastAssistantMessage?: boolean;
  isStreaming?: boolean;
}

// Inline Mermaid block renderer - renders diagram exactly where the code block appears
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

    try {
      mermaid
        .render(`${renderId}-svg`, code.trim())
        .then((result) => {
          target.innerHTML = result.svg;
        })
        .catch((error) => {
          const msg = error instanceof Error ? error.message : 'Unknown error';
          target.innerHTML = `<pre class="bg-red-50 border border-red-200 text-red-700 p-3 rounded text-sm">Error rendering diagram: ${msg}</pre>`;
        });
    } catch (error: any) {
      const msg = error?.message || 'Unknown error';
      target.innerHTML = `<pre class="bg-red-50 border border-red-200 text-red-700 p-3 rounded text-sm">Error rendering diagram: ${msg}</pre>`;
    }
  }, [code, renderId]);

  return <div ref={containerRef} className="mermaid-container" />;
};

const Message: React.FC<MessageProps> = ({
  message,
  onRegenerate,
  isLastAssistantMessage = false,
  isStreaming = false,
}) => {
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
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
        <div
          className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
            isUser ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-600'
          }`}
        >
          {isUser ? <UserIcon className="h-4 w-4" /> : <BotIcon className="h-4 w-4" />}
        </div>

        {/* Message Content */}
        <div className={`flex-1 ${isUser ? 'text-right' : 'text-left'}`}>
          <div
            className={`inline-block max-w-full p-4 rounded-lg ${
              isUser
                ? 'bg-primary-600 text-white rounded-br-sm'
                : 'bg-white border border-gray-200 rounded-bl-sm shadow-sm'
            }`}
          >
            <div className="message-content">
              <ReactMarkdown
                components={{
                  pre: ({ children, ...props }) => (
                    <pre
                      {...props}
                      className={`${
                        isUser
                          ? 'bg-primary-700 border-primary-500'
                          : 'bg-gray-100 border-gray-200'
                      } border rounded-lg p-3 overflow-x-auto text-sm`}
                    >
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
                        className={
                          isInline
                            ? `${
                                isUser
                                  ? 'bg-primary-700'
                                  : 'bg-gray-100'
                              } px-1 py-0.5 rounded text-sm`
                            : ''
                        }
                      >
                        {children}
                      </code>
                    );
                  },
                }}
              >
                {message.content}
              </ReactMarkdown>

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
                {new Date(message.created_at).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
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
