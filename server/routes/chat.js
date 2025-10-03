const express = require('express');
const rateLimit = require('express-rate-limit');
const ChatSession = require('../models/ChatSession');
const Message = require('../models/Message');
const geminiService = require('../services/geminiService');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Enhanced logging middleware
const logRequest = (req, res, next) => {
  console.log(`💬 Chat Route: ${req.method} ${req.path}`, {
    params: req.params,
    query: req.query,
    bodyKeys: req.body ? Object.keys(req.body) : [],
    bodySize: req.body ? JSON.stringify(req.body).length : 0,
    contentType: req.headers['content-type'],
    contentLength: req.headers['content-length'],
    origin: req.headers.origin,
    userAgent: req.headers['user-agent']?.slice(0, 50),
    hasAuth: !!req.headers.authorization,
    timestamp: new Date().toISOString()
  });
  next();
};

// Enhanced rate limiting for chat endpoints
const chatLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // Increased limit
  message: { 
    error: 'Too many requests, please slow down',
    retryAfter: 60,
    timestamp: new Date().toISOString()
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.ip || req.connection.remoteAddress || 'unknown';
  },
  handler: (req, res) => {
    console.log(`🚫 Rate limit exceeded for IP: ${req.ip}, path: ${req.path}`);
    res.status(429).json({
      error: 'Too many requests',
      message: 'Please wait before making more requests',
      retryAfter: 60,
      timestamp: new Date().toISOString()
    });
  }
});

// Apply logging to all routes
router.use(logRequest);

// Middleware to validate session ID
const validateSessionId = (req, res, next) => {
  const sessionId = req.params.sessionId;
  
  if (!sessionId) {
    console.log('❌ Missing session ID');
    return res.status(400).json({
      error: 'Missing session ID',
      message: 'Session ID is required in the URL path',
      path: req.path,
      timestamp: new Date().toISOString()
    });
  }

  if (!/^\d+$/.test(sessionId)) {
    console.log(`❌ Invalid session ID: ${sessionId}`);
    return res.status(400).json({
      error: 'Invalid session ID',
      message: 'Session ID must be a positive integer',
      sessionId,
      path: req.path,
      timestamp: new Date().toISOString()
    });
  }

  next();
};

// Enhanced authentication middleware with better error handling
const enhancedAuth = async (req, res, next) => {
  try {
    // First check if we have the authenticateToken middleware
    if (!authenticateToken) {
      console.error('❌ authenticateToken middleware not available');
      return res.status(500).json({
        error: 'Authentication service unavailable',
        timestamp: new Date().toISOString()
      });
    }

    // Call the original auth middleware
    authenticateToken(req, res, (err) => {
      if (err) {
        console.error('❌ Authentication error:', err);
        return res.status(401).json({
          error: 'Authentication failed',
          message: 'Invalid or missing authentication token',
          timestamp: new Date().toISOString()
        });
      }

      if (!req.user || !req.user.id) {
        console.error('❌ No user in request after authentication');
        return res.status(401).json({
          error: 'User not authenticated',
          message: 'Valid user session required',
          timestamp: new Date().toISOString()
        });
      }

      console.log(`✅ Authenticated user: ${req.user.id}`);
      next();
    });
  } catch (error) {
    console.error('❌ Auth middleware error:', error);
    res.status(500).json({
      error: 'Authentication system error',
      timestamp: new Date().toISOString()
    });
  }
};

// Get all chat sessions for user
router.get('/sessions', enhancedAuth, async (req, res) => {
  try {
    console.log(`📋 Fetching sessions for user: ${req.user.id}`);
    const sessions = await ChatSession.findByUserId(req.user.id);
    console.log(`✅ Found ${sessions.length} sessions for user: ${req.user.id}`);
    res.json({ sessions, count: sessions.length, timestamp: new Date().toISOString() });
  } catch (err) {
    console.error('❌ Error fetching chat sessions:', err);
    res.status(500).json({ 
      error: 'Failed to fetch chat sessions',
      message: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Create new chat session
router.post('/sessions', enhancedAuth, async (req, res) => {
  try {
    const { title } = req.body || {};
    console.log(`📝 Creating session for user: ${req.user.id}, title: "${title}"`);
    
    const session = await ChatSession.create(req.user.id, title || 'New Chat');
    console.log(`✅ Created session: ${session.id} for user: ${req.user.id}`);
    
    res.status(201).json({ 
      session,
      message: 'Session created successfully',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('❌ Error creating chat session:', err);
    res.status(500).json({ 
      error: 'Failed to create chat session',
      message: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Get specific chat session with messages
router.get('/sessions/:sessionId', enhancedAuth, validateSessionId, async (req, res) => {
  try {
    const { sessionId } = req.params;
    console.log(`📖 Fetching session: ${sessionId} for user: ${req.user.id}`);
    
    // Verify session belongs to user
    const session = await ChatSession.findById(sessionId, req.user.id);
    if (!session) {
      console.log(`❌ Session ${sessionId} not found for user ${req.user.id}`);
      return res.status(404).json({ 
        error: 'Chat session not found',
        sessionId,
        timestamp: new Date().toISOString()
      });
    }

    // Get messages for this session
    const messages = await Message.findByChatSessionId(sessionId);
    console.log(`✅ Found session ${sessionId} with ${messages.length} messages`);
    
    res.json({ 
      session, 
      messages,
      messageCount: messages.length,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('❌ Error fetching chat session:', err);
    res.status(500).json({ 
      error: 'Failed to fetch chat session',
      message: err.message,
      sessionId: req.params.sessionId,
      timestamp: new Date().toISOString()
    });
  }
});

// Update chat session title
router.put('/sessions/:sessionId', enhancedAuth, validateSessionId, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { title } = req.body || {};

    console.log(`📝 Updating session ${sessionId} title to: "${title}"`);

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return res.status(400).json({ 
        error: 'Invalid title',
        message: 'Title must be a non-empty string',
        received: title,
        timestamp: new Date().toISOString()
      });
    }

    const session = await ChatSession.updateTitle(sessionId, req.user.id, title.trim());
    if (!session) {
      console.log(`❌ Session ${sessionId} not found for user ${req.user.id}`);
      return res.status(404).json({ 
        error: 'Chat session not found',
        sessionId,
        timestamp: new Date().toISOString()
      });
    }

    console.log(`✅ Updated session ${sessionId} title`);
    res.json({ 
      session,
      message: 'Session title updated successfully',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('❌ Error updating chat session:', err);
    res.status(500).json({ 
      error: 'Failed to update chat session',
      message: err.message,
      sessionId: req.params.sessionId,
      timestamp: new Date().toISOString()
    });
  }
});

// Delete chat session
router.delete('/sessions/:sessionId', enhancedAuth, validateSessionId, async (req, res) => {
  try {
    const { sessionId } = req.params;
    console.log(`🗑️ Deleting session: ${sessionId} for user: ${req.user.id}`);
    
    const session = await ChatSession.delete(sessionId, req.user.id);
    if (!session) {
      console.log(`❌ Session ${sessionId} not found for user ${req.user.id}`);
      return res.status(404).json({ 
        error: 'Chat session not found',
        sessionId,
        timestamp: new Date().toISOString()
      });
    }

    console.log(`✅ Deleted session: ${sessionId}`);
    res.json({ 
      message: 'Chat session deleted successfully',
      sessionId,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('❌ Error deleting chat session:', err);
    res.status(500).json({ 
      error: 'Failed to delete chat session',
      message: err.message,
      sessionId: req.params.sessionId,
      timestamp: new Date().toISOString()
    });
  }
});

// Send message in chat session with streaming
router.post('/sessions/:sessionId/messages/stream', enhancedAuth, validateSessionId, chatLimiter, async (req, res) => {
  const { sessionId } = req.params;
  
  try {
    console.log(`🌊 Streaming endpoint hit for session: ${sessionId}, user: ${req.user.id}`);
    const { content } = req.body || {};

    console.log('Request body:', { content: content?.slice(0, 100) + '...', bodySize: JSON.stringify(req.body || {}).length });

    // Validate content
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      console.log('❌ Invalid message content');
      return res.status(400).json({ 
        error: 'Invalid message content',
        message: 'Message content must be a non-empty string',
        received: typeof content,
        timestamp: new Date().toISOString()
      });
    }

    // Verify session belongs to user
    const session = await ChatSession.findById(sessionId, req.user.id);
    if (!session) {
      console.log(`❌ Session ${sessionId} not found for user ${req.user.id}`);
      return res.status(404).json({ 
        error: 'Chat session not found',
        sessionId,
        timestamp: new Date().toISOString()
      });
    }

    console.log(`✅ Session verified: ${sessionId}`);

    // Save user message
    const userMessage = await Message.create({
      chatSessionId: sessionId,
      role: 'user',
      content: content.trim()
    });

    console.log(`✅ User message saved: ${userMessage.id}`);

    // Check if Gemini service is configured
    if (!geminiService.isConfigured()) {
      console.log('❌ Gemini service not configured');
      const errorResponse = await Message.create({
        chatSessionId: sessionId,
        role: 'assistant',
        content: 'I apologize, but the AI service is not currently configured. Please contact the administrator to set up the Gemini API key.',
        has_diagram: false
      });

      return res.json({
        userMessage,
        assistantMessage: errorResponse,
        isStreaming: false,
        timestamp: new Date().toISOString()
      });
    }

    // Set up Server-Sent Events with enhanced headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': req.headers.origin || '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
      'Access-Control-Allow-Credentials': 'true',
      'X-Accel-Buffering': 'no' // Disable nginx buffering
    });

    console.log('✅ SSE headers set, starting stream...');

    // Send initial user message
    res.write(`data: ${JSON.stringify({
      type: 'user_message',
      data: userMessage,
      timestamp: new Date().toISOString()
    })}\n\n`);

    try {
      // Get recent conversation history for context
      const recentMessages = await Message.getRecentMessages(sessionId, 10);
      console.log(`📚 Retrieved ${recentMessages.length} recent messages for context`);
      
      // Create a temporary assistant message for streaming
      let assistantMessage = await Message.create({
        chatSessionId: sessionId,
        role: 'assistant',
        content: '',
        has_diagram: false
      });

      console.log(`🤖 Assistant message created: ${assistantMessage.id}, starting AI generation...`);

      // Send initial assistant message
      res.write(`data: ${JSON.stringify({
        type: 'assistant_start',
        data: assistantMessage,
        timestamp: new Date().toISOString()
      })}\n\n`);

      let fullContent = '';
      let hasDiagram = false;
      let chunkCount = 0;

      // Stream AI response
      console.log('🚀 Starting streaming response...');
      for await (const chunk of geminiService.generateStreamingResponse(content.trim(), recentMessages)) {
        chunkCount++;
        console.log(`📦 Chunk ${chunkCount}: ${chunk.content.substring(0, 50)}...`);
        
        fullContent += chunk.content;
        hasDiagram = chunk.hasDiagram;

        // Send chunk to client
        const chunkData = {
          type: 'chunk',
          content: chunk.content,
          hasDiagram: chunk.hasDiagram,
          isComplete: chunk.isComplete,
          chunkNumber: chunkCount,
          timestamp: new Date().toISOString()
        };
        
        res.write(`data: ${JSON.stringify(chunkData)}\n\n`);

        // Update the message in database with current content (batch updates)
        if (chunkCount % 5 === 0 || chunk.isComplete) {
          await Message.update(assistantMessage.id, {
            content: fullContent,
            has_diagram: hasDiagram
          });
        }

        if (chunk.isComplete) {
          console.log(`✅ Streaming complete after ${chunkCount} chunks`);
          break;
        }
      }

      // Final database update
      await Message.update(assistantMessage.id, {
        content: fullContent,
        has_diagram: hasDiagram
      });

      // Send completion signal
      res.write(`data: ${JSON.stringify({
        type: 'complete',
        data: { 
          id: assistantMessage.id, 
          content: fullContent, 
          has_diagram: hasDiagram,
          totalChunks: chunkCount
        },
        timestamp: new Date().toISOString()
      })}\n\n`);

      console.log(`✅ Streaming completed successfully for session ${sessionId}`);

    } catch (aiError) {
      console.error(`❌ AI streaming error for session ${sessionId}:`, aiError);
      
      // Send error to client
      res.write(`data: ${JSON.stringify({
        type: 'error',
        error: `I apologize, but I'm experiencing technical difficulties: ${aiError.message}. Please try again later.`,
        timestamp: new Date().toISOString()
      })}\n\n`);
    }

    res.end();

  } catch (err) {
    console.error(`❌ Critical error in streaming for session ${sessionId}:`, err);
    
    // If headers haven't been sent, send JSON error
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Failed to process streaming message',
        message: err.message,
        sessionId,
        timestamp: new Date().toISOString()
      });
    } else {
      // If streaming has started, send error in stream format
      res.write(`data: ${JSON.stringify({
        type: 'error',
        error: 'Failed to process message',
        message: err.message,
        timestamp: new Date().toISOString()
      })}\n\n`);
      res.end();
    }
  }
});

// Send message in chat session (non-streaming fallback)
router.post('/sessions/:sessionId/messages', enhancedAuth, validateSessionId, chatLimiter, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { content } = req.body || {};

    console.log(`💬 Non-streaming message for session: ${sessionId}, user: ${req.user.id}`);

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return res.status(400).json({ 
        error: 'Invalid message content',
        message: 'Message content must be a non-empty string',
        received: typeof content,
        timestamp: new Date().toISOString()
      });
    }

    // Verify session belongs to user
    const session = await ChatSession.findById(sessionId, req.user.id);
    if (!session) {
      return res.status(404).json({ 
        error: 'Chat session not found',
        sessionId,
        timestamp: new Date().toISOString()
      });
    }

    // Save user message
    const userMessage = await Message.create({
      chatSessionId: sessionId,
      role: 'user',
      content: content.trim()
    });

    // Check if Gemini service is configured
    if (!geminiService.isConfigured()) {
      const errorResponse = await Message.create({
        chatSessionId: sessionId,
        role: 'assistant',
        content: 'I apologize, but the AI service is not currently configured. Please contact the administrator to set up the Gemini API key.',
        has_diagram: false
      });

      return res.json({
        userMessage,
        assistantMessage: errorResponse,
        timestamp: new Date().toISOString()
      });
    }

    try {
      // Get recent conversation history for context
      const recentMessages = await Message.getRecentMessages(sessionId, 10);
      
      // Generate AI response
      const aiResponse = await geminiService.generateResponse(content.trim(), recentMessages);
      
      // Save AI response
      const assistantMessage = await Message.create({
        chatSessionId: sessionId,
        role: 'assistant',
        content: aiResponse.content,
        has_diagram: aiResponse.hasDiagram
      });

      res.json({
        userMessage,
        assistantMessage,
        timestamp: new Date().toISOString()
      });
    } catch (aiError) {
      console.error('❌ AI generation error:', aiError);
      
      // Save error response
      const errorMessage = await Message.create({
        chatSessionId: sessionId,
        role: 'assistant',
        content: `I apologize, but I'm experiencing technical difficulties: ${aiError.message}. Please try again later.`,
        has_diagram: false
      });

      res.json({
        userMessage,
        assistantMessage: errorMessage,
        timestamp: new Date().toISOString()
      });
    }
  } catch (err) {
    console.error('❌ Error sending message:', err);
    res.status(500).json({ 
      error: 'Failed to send message',
      message: err.message,
      sessionId: req.params.sessionId,
      timestamp: new Date().toISOString()
    });
  }
});

// Regenerate last AI response - FIXED VERSION
router.post('/sessions/:sessionId/regenerate', enhancedAuth, validateSessionId, chatLimiter, async (req, res) => {
  const { sessionId } = req.params;
  
  try {
    console.log(`🔄 Regenerate request for session ${sessionId} by user ${req.user.id}`);
    console.log('Request details:', {
      method: req.method,
      contentType: req.headers['content-type'],
      bodySize: req.body ? JSON.stringify(req.body).length : 0,
      body: req.body
    });

    // Verify session belongs to user
    const session = await ChatSession.findById(sessionId, req.user.id);
    if (!session) {
      console.log(`❌ Session ${sessionId} not found for user ${req.user.id}`);
      return res.status(404).json({ 
        error: 'Chat session not found',
        sessionId,
        userId: req.user.id,
        timestamp: new Date().toISOString()
      });
    }

    console.log(`✅ Session ${sessionId} verified for user ${req.user.id}`);

    // Get recent messages
    const messages = await Message.findByChatSessionId(sessionId);
    console.log(`📚 Found ${messages.length} messages in session ${sessionId}`);

    if (messages.length < 2) {
      console.log(`❌ Not enough messages in session ${sessionId} (${messages.length})`);
      return res.status(400).json({ 
        error: 'Insufficient message history',
        message: 'At least one user message and one assistant message are required to regenerate',
        messageCount: messages.length,
        sessionId,
        timestamp: new Date().toISOString()
      });
    }

    // Find the last user message
    const lastUserMessage = [...messages].reverse().find(msg => msg.role === 'user');
    if (!lastUserMessage) {
      console.log(`❌ No user message found in session ${sessionId}`);
      return res.status(400).json({ 
        error: 'No user message found',
        message: 'Cannot regenerate response without a user message',
        sessionId,
        timestamp: new Date().toISOString()
      });
    }

    console.log(`✅ Last user message found: ${lastUserMessage.id}`);

    // Check if Gemini service is configured
    if (!geminiService || !geminiService.isConfigured()) {
      console.log('❌ Gemini service not configured or unavailable');
      return res.status(503).json({ 
        error: 'AI service unavailable',
        message: 'AI service is not properly configured',
        sessionId,
        timestamp: new Date().toISOString()
      });
    }

    console.log('✅ Gemini service is configured');

    try {
      // Get conversation history excluding the last AI response for context
      const contextMessages = messages.filter(msg => 
        !(msg.id === messages[messages.length - 1].id && msg.role === 'assistant')
      );

      console.log(`🤖 Generating new response for session ${sessionId} with ${contextMessages.length} context messages...`);

      // Add timeout and retry logic
      const generateWithTimeout = async (content, context, timeoutMs = 30000) => {
        return Promise.race([
          geminiService.generateResponse(content, context),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Request timeout')), timeoutMs)
          )
        ]);
      };

      // Generate new AI response with timeout
      const aiResponse = await generateWithTimeout(lastUserMessage.content, contextMessages);
      
      if (!aiResponse || !aiResponse.content) {
        throw new Error('Empty or invalid response from AI service');
      }

      console.log(`✅ AI response generated for session ${sessionId} (${aiResponse.content.length} chars)`);
      
      // Save new AI response
      const assistantMessage = await Message.create({
        chatSessionId: sessionId,
        role: 'assistant',
        content: aiResponse.content,
        has_diagram: aiResponse.hasDiagram || false
      });

      console.log(`✅ Regenerate successful for session ${sessionId}, message ID: ${assistantMessage.id}`);

      res.json({ 
        assistantMessage,
        success: true,
        message: 'Response regenerated successfully',
        sessionId,
        originalMessageId: lastUserMessage.id,
        timestamp: new Date().toISOString()
      });

    } catch (aiError) {
      console.error(`❌ AI regeneration error for session ${sessionId}:`, aiError);
      
      // Provide more specific error messages based on the error type
      let errorMessage = 'Failed to regenerate response';
      let statusCode = 500;

      if (aiError.message.includes('timeout')) {
        errorMessage = 'Request timed out. Please try again.';
        statusCode = 408;
      } else if (aiError.message.includes('rate limit')) {
        errorMessage = 'Rate limit exceeded. Please wait a moment and try again.';
        statusCode = 429;
      } else if (aiError.message.includes('network') || aiError.message.includes('ENOTFOUND')) {
        errorMessage = 'Network error. Please check your connection and try again.';
        statusCode = 503;
      } else if (aiError.message.includes('API key') || aiError.message.includes('authentication')) {
        errorMessage = 'AI service authentication error. Please contact support.';
        statusCode = 503;
      } else if (aiError.message.includes('quota') || aiError.message.includes('billing')) {
        errorMessage = 'AI service quota exceeded. Please contact support.';
        statusCode = 503;
      } else {
        errorMessage = `AI service error: ${aiError.message}`;
      }

      res.status(statusCode).json({ 
        error: errorMessage,
        success: false,
        sessionId,
        errorType: aiError.name || 'AIError',
        timestamp: new Date().toISOString(),
        details: process.env.NODE_ENV === 'development' ? {
          originalError: aiError.message,
          stack: aiError.stack
        } : undefined
      });
    }
  } catch (err) {
    console.error(`❌ Critical error regenerating message for session ${sessionId}:`, err);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to regenerate response due to server error',
      success: false,
      sessionId,
      timestamp: new Date().toISOString(),
      details: process.env.NODE_ENV === 'development' ? {
        error: err.message,
        stack: err.stack
      } : undefined
    });
  }
});

module.exports = router;