const express = require('express');
const rateLimit = require('express-rate-limit');
const ChatSession = require('../models/ChatSession');
const Message = require('../models/Message');
const geminiService = require('../services/geminiService');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Rate limiting for chat endpoints
const chatLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 20, // limit each IP to 20 requests per minute
  message: { error: 'Too many requests, please slow down' }
});

// Get all chat sessions for user
router.get('/sessions', authenticateToken, async (req, res) => {
  try {
    const sessions = await ChatSession.findByUserId(req.user.id);
    res.json({ sessions });
  } catch (err) {
    console.error('Error fetching chat sessions:', err);
    res.status(500).json({ error: 'Failed to fetch chat sessions' });
  }
});

// Create new chat session
router.post('/sessions', authenticateToken, async (req, res) => {
  try {
    const { title } = req.body;
    const session = await ChatSession.create(req.user.id, title);
    res.status(201).json({ session });
  } catch (err) {
    console.error('Error creating chat session:', err);
    res.status(500).json({ error: 'Failed to create chat session' });
  }
});

// Get specific chat session with messages
router.get('/sessions/:sessionId', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    // Verify session belongs to user
    const session = await ChatSession.findById(sessionId, req.user.id);
    if (!session) {
      return res.status(404).json({ error: 'Chat session not found' });
    }

    // Get messages for this session
    const messages = await Message.findByChatSessionId(sessionId);
    
    res.json({ session, messages });
  } catch (err) {
    console.error('Error fetching chat session:', err);
    res.status(500).json({ error: 'Failed to fetch chat session' });
  }
});

// Update chat session title
router.put('/sessions/:sessionId', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { title } = req.body;

    if (!title || title.trim().length === 0) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const session = await ChatSession.updateTitle(sessionId, req.user.id, title.trim());
    if (!session) {
      return res.status(404).json({ error: 'Chat session not found' });
    }

    res.json({ session });
  } catch (err) {
    console.error('Error updating chat session:', err);
    res.status(500).json({ error: 'Failed to update chat session' });
  }
});

// Delete chat session
router.delete('/sessions/:sessionId', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const session = await ChatSession.delete(sessionId, req.user.id);
    if (!session) {
      return res.status(404).json({ error: 'Chat session not found' });
    }

    res.json({ message: 'Chat session deleted successfully' });
  } catch (err) {
    console.error('Error deleting chat session:', err);
    res.status(500).json({ error: 'Failed to delete chat session' });
  }
});

// Send message in chat session with streaming
router.post('/sessions/:sessionId/messages/stream', authenticateToken, chatLimiter, async (req, res) => {
  try {
    console.log('Streaming endpoint hit');
    const { sessionId } = req.params;
    const { content } = req.body;

    console.log('Session ID:', sessionId, 'Content:', content);

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Message content is required' });
    }

    // Verify session belongs to user
    const session = await ChatSession.findById(sessionId, req.user.id);
    if (!session) {
      return res.status(404).json({ error: 'Chat session not found' });
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
        isStreaming: false
      });
    }

    // Set up Server-Sent Events
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    // Send initial user message
    res.write(`data: ${JSON.stringify({
      type: 'user_message',
      data: userMessage
    })}\n\n`);

    try {
      // Get recent conversation history for context
      const recentMessages = await Message.getRecentMessages(sessionId, 10);
      
      // Create a temporary assistant message for streaming
      let assistantMessage = await Message.create({
        chatSessionId: sessionId,
        role: 'assistant',
        content: '',
        has_diagram: false
      });

      // Send initial assistant message
      res.write(`data: ${JSON.stringify({
        type: 'assistant_start',
        data: assistantMessage
      })}\n\n`);

      let fullContent = '';
      let hasDiagram = false;

      // Stream AI response
      console.log('Starting streaming response...');
      for await (const chunk of geminiService.generateStreamingResponse(content.trim(), recentMessages)) {
        console.log('Received chunk:', chunk.content.substring(0, 50) + '...');
        fullContent += chunk.content;
        hasDiagram = chunk.hasDiagram;

        // Send chunk to client
        const chunkData = {
          type: 'chunk',
          content: chunk.content,
          hasDiagram: chunk.hasDiagram,
          isComplete: chunk.isComplete
        };
        console.log('Sending chunk to client:', chunkData);
        res.write(`data: ${JSON.stringify(chunkData)}\n\n`);

        // Update the message in database with current content
        await Message.update(assistantMessage.id, {
          content: fullContent,
          has_diagram: hasDiagram
        });

        if (chunk.isComplete) {
          console.log('Streaming complete');
          break;
        }
      }

      // Send completion signal
      res.write(`data: ${JSON.stringify({
        type: 'complete',
        data: { id: assistantMessage.id, content: fullContent, has_diagram: hasDiagram }
      })}\n\n`);

    } catch (aiError) {
      console.error('AI streaming error:', aiError);
      
      // Send error to client
      res.write(`data: ${JSON.stringify({
        type: 'error',
        error: `I apologize, but I'm experiencing technical difficulties: ${aiError.message}. Please try again later.`
      })}\n\n`);
    }

    res.end();

  } catch (err) {
    console.error('Error in streaming message:', err);
    res.write(`data: ${JSON.stringify({
      type: 'error',
      error: 'Failed to process message'
    })}\n\n`);
    res.end();
  }
});

// Send message in chat session (non-streaming fallback)
router.post('/sessions/:sessionId/messages', authenticateToken, chatLimiter, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { content } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Message content is required' });
    }

    // Verify session belongs to user
    const session = await ChatSession.findById(sessionId, req.user.id);
    if (!session) {
      return res.status(404).json({ error: 'Chat session not found' });
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
        assistantMessage: errorResponse
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
        assistantMessage
      });
    } catch (aiError) {
      console.error('AI generation error:', aiError);
      
      // Save error response
      const errorMessage = await Message.create({
        chatSessionId: sessionId,
        role: 'assistant',
        content: `I apologize, but I'm experiencing technical difficulties: ${aiError.message}. Please try again later.`,
        has_diagram: false
      });

      res.json({
        userMessage,
        assistantMessage: errorMessage
      });
    }
  } catch (err) {
    console.error('Error sending message:', err);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Regenerate last AI response
router.post('/sessions/:sessionId/regenerate', authenticateToken, chatLimiter, async (req, res) => {
  try {
    const { sessionId } = req.params;

    // Verify session belongs to user
    const session = await ChatSession.findById(sessionId, req.user.id);
    if (!session) {
      return res.status(404).json({ error: 'Chat session not found' });
    }

    // Get recent messages
    const messages = await Message.findByChatSessionId(sessionId);
    if (messages.length < 2) {
      return res.status(400).json({ error: 'No messages to regenerate' });
    }

    // Find the last user message
    const lastUserMessage = [...messages].reverse().find(msg => msg.role === 'user');
    if (!lastUserMessage) {
      return res.status(400).json({ error: 'No user message found to regenerate response for' });
    }

    // Check if Gemini service is configured
    if (!geminiService.isConfigured()) {
      return res.status(503).json({ error: 'AI service not configured' });
    }

    try {
      // Get conversation history excluding the last AI response
      const contextMessages = messages.filter(msg => 
        msg.id !== messages[messages.length - 1].id || msg.role !== 'assistant'
      );

      // Generate new AI response
      const aiResponse = await geminiService.generateResponse(lastUserMessage.content, contextMessages);
      
      // Save new AI response
      const assistantMessage = await Message.create({
        chatSessionId: sessionId,
        role: 'assistant',
        content: aiResponse.content,
        has_diagram: aiResponse.hasDiagram
      });

      res.json({ assistantMessage });
    } catch (aiError) {
      console.error('AI regeneration error:', aiError);
      res.status(500).json({ error: `Failed to regenerate response: ${aiError.message}` });
    }
  } catch (err) {
    console.error('Error regenerating message:', err);
    res.status(500).json({ error: 'Failed to regenerate message' });
  }
});

module.exports = router;