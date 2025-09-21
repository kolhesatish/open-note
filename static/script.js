// Initialize Mermaid for diagram rendering
mermaid.initialize({
    startOnLoad: true,
    theme: 'default',
    securityLevel: 'loose',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif'
});

class ChatApp {
    constructor() {
        this.chatMessages = document.getElementById('chatMessages');
        this.messageInput = document.getElementById('messageInput');
        this.sendBtn = document.getElementById('sendBtn');
        this.newChatBtn = document.getElementById('newChatBtn');
        
        this.isLoading = false;
        
        this.initializeEventListeners();
        this.loadChatHistory();
        this.focusInput();
    }
    
    initializeEventListeners() {
        // Send message on button click
        this.sendBtn.addEventListener('click', () => this.sendMessage());
        
        // Send message on Enter key (Shift+Enter for new line)
        this.messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        
        // Auto-resize textarea
        this.messageInput.addEventListener('input', () => {
            this.autoResizeTextarea();
        });
        
        // New chat button
        this.newChatBtn.addEventListener('click', () => this.startNewChat());
        
        // Suggestion pills click handler
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('suggestion-pill')) {
                this.messageInput.value = e.target.textContent;
                this.focusInput();
                this.autoResizeTextarea();
            }
        });
    }
    
    autoResizeTextarea() {
        this.messageInput.style.height = 'auto';
        this.messageInput.style.height = Math.min(this.messageInput.scrollHeight, 120) + 'px';
    }
    
    focusInput() {
        this.messageInput.focus();
    }
    
    async loadChatHistory() {
        try {
            const response = await fetch('/api/chat_history');
            const data = await response.json();
            
            if (data.history && data.history.length > 0) {
                this.chatMessages.innerHTML = '';
                data.history.forEach(message => {
                    this.displayMessage(message.role, message.content);
                });
            } else {
                this.showEmptyState();
            }
        } catch (error) {
            console.error('Error loading chat history:', error);
            this.showEmptyState();
        }
    }
    
    showEmptyState() {
        this.chatMessages.innerHTML = `
            <div class="empty-state">
                <h2>Welcome to AI Chat</h2>
                <p>Start a conversation with the AI assistant. You can ask questions, request explanations, or even ask for diagrams and charts!</p>
                <div class="suggestion-pills">
                    <div class="suggestion-pill">Explain quantum computing</div>
                    <div class="suggestion-pill">Create a flowchart for user registration</div>
                    <div class="suggestion-pill">Show me a network diagram</div>
                    <div class="suggestion-pill">Write a Python function</div>
                </div>
            </div>
        `;
    }
    
    async sendMessage() {
        const message = this.messageInput.value.trim();
        
        if (!message || this.isLoading) {
            return;
        }
        
        // Clear empty state if present
        const emptyState = this.chatMessages.querySelector('.empty-state');
        if (emptyState) {
            this.chatMessages.innerHTML = '';
        }
        
        // Display user message
        this.displayMessage('user', message);
        
        // Clear input and reset height
        this.messageInput.value = '';
        this.autoResizeTextarea();
        
        // Show loading state
        this.setLoading(true);
        const loadingElement = this.showLoadingMessage();
        
        try {
            const response = await fetch('/api/send_message', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ message: message })
            });
            
            const data = await response.json();
            
            // Remove loading message
            if (loadingElement) {
                loadingElement.remove();
            }
            
            if (data.error) {
                this.displayError(data.error);
            } else {
                this.displayMessage('assistant', data.response);
                
                // Render diagrams if present
                if (data.has_diagram) {
                    this.renderDiagrams();
                }
            }
        } catch (error) {
            // Remove loading message
            if (loadingElement) {
                loadingElement.remove();
            }
            
            this.displayError('Network error: Unable to connect to the server. Please check your connection and try again.');
            console.error('Error sending message:', error);
        } finally {
            this.setLoading(false);
            this.focusInput();
        }
    }
    
    displayMessage(role, content) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}`;
        
        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.textContent = role === 'user' ? 'U' : 'AI';
        
        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        
        // Process content for code blocks and markdown
        const processedContent = this.processMessageContent(content);
        messageContent.innerHTML = processedContent;
        
        messageDiv.appendChild(avatar);
        messageDiv.appendChild(messageContent);
        
        this.chatMessages.appendChild(messageDiv);
        this.scrollToBottom();
    }
    
    processMessageContent(content) {
        // Convert markdown-style code blocks to HTML
        content = content.replace(/```(\w+)?\n?([\s\S]*?)```/g, (match, language, code) => {
            const lang = language || '';
            return `<pre><code class="language-${lang}">${this.escapeHtml(code.trim())}</code></pre>`;
        });
        
        // Convert inline code
        content = content.replace(/`([^`]+)`/g, '<code>$1</code>');
        
        // Convert line breaks
        content = content.replace(/\n/g, '<br>');
        
        return content;
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    displayError(errorMessage) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message assistant';
        
        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.textContent = 'AI';
        
        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        messageContent.innerHTML = `<div class="error-message">${this.escapeHtml(errorMessage)}</div>`;
        
        messageDiv.appendChild(avatar);
        messageDiv.appendChild(messageContent);
        
        this.chatMessages.appendChild(messageDiv);
        this.scrollToBottom();
    }
    
    showLoadingMessage() {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message assistant';
        messageDiv.id = 'loading-message';
        
        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.textContent = 'AI';
        
        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        messageContent.innerHTML = `
            <div class="loading">
                <span>Thinking</span>
                <div class="loading-dots">
                    <div class="loading-dot"></div>
                    <div class="loading-dot"></div>
                    <div class="loading-dot"></div>
                </div>
            </div>
        `;
        
        messageDiv.appendChild(avatar);
        messageDiv.appendChild(messageContent);
        
        this.chatMessages.appendChild(messageDiv);
        this.scrollToBottom();
        
        return messageDiv;
    }
    
    setLoading(loading) {
        this.isLoading = loading;
        this.sendBtn.disabled = loading;
        this.messageInput.disabled = loading;
        
        if (loading) {
            this.sendBtn.innerHTML = '⏳';
        } else {
            this.sendBtn.innerHTML = '↗';
        }
    }
    
    scrollToBottom() {
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }
    
    async renderDiagrams() {
        // Find all mermaid code blocks and render them
        const mermaidBlocks = this.chatMessages.querySelectorAll('pre code.language-mermaid');
        
        for (let i = 0; i < mermaidBlocks.length; i++) {
            const block = mermaidBlocks[i];
            const mermaidCode = block.textContent;
            
            try {
                // Create a unique ID for each diagram
                const diagramId = `mermaid-diagram-${Date.now()}-${i}`;
                
                // Create diagram container
                const diagramContainer = document.createElement('div');
                diagramContainer.className = 'diagram-container';
                diagramContainer.innerHTML = `<div id="${diagramId}">${mermaidCode}</div>`;
                
                // Replace the code block with the diagram container
                block.parentElement.parentElement.insertBefore(diagramContainer, block.parentElement.nextSibling);
                
                // Render the mermaid diagram
                await mermaid.init(undefined, `#${diagramId}`);
                
            } catch (error) {
                console.error('Error rendering mermaid diagram:', error);
                // Keep the original code block if rendering fails
            }
        }
    }
    
    async startNewChat() {
        try {
            const response = await fetch('/api/new_chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            
            if (response.ok) {
                // Clear chat messages and show empty state
                this.chatMessages.innerHTML = '';
                this.showEmptyState();
                this.focusInput();
            }
        } catch (error) {
            console.error('Error starting new chat:', error);
        }
    }
}

// Initialize the chat application when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new ChatApp();
});
