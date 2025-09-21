const mongoose = require('mongoose');

// Message Schema
const messageSchema = new mongoose.Schema({
  chatSessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChatSession',
    required: true
  },
  role: {
    type: String,
    required: true,
    enum: ['user', 'assistant']
  },
  content: {
    type: String,
    required: true
  },
  hasDiagram: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true // This adds createdAt and updatedAt automatically
});

// Static method to create message
messageSchema.statics.create = async function({ chatSessionId, role, content, hasDiagram = false }) {
  const message = new this({ chatSessionId, role, content, hasDiagram });
  const savedMessage = await message.save();
  
  // Update chat session timestamp
  const ChatSession = mongoose.model('ChatSession');
  await ChatSession.updateTimestamp(chatSessionId);
  
  return {
    id: savedMessage._id,
    chat_session_id: savedMessage.chatSessionId,
    role: savedMessage.role,
    content: savedMessage.content,
    has_diagram: savedMessage.hasDiagram,
    created_at: savedMessage.createdAt
  };
};

// Static method to find messages by chat session ID
messageSchema.statics.findByChatSessionId = async function(chatSessionId, limit = 100) {
  const messages = await this.find({ chatSessionId })
    .sort({ createdAt: 1 })
    .limit(limit);
  
  return messages.map(msg => ({
    id: msg._id,
    chat_session_id: msg.chatSessionId,
    role: msg.role,
    content: msg.content,
    has_diagram: msg.hasDiagram,
    created_at: msg.createdAt
  }));
};

// Static method to get recent messages
messageSchema.statics.getRecentMessages = async function(chatSessionId, limit = 10) {
  const messages = await this.find({ chatSessionId })
    .sort({ createdAt: -1 })
    .limit(limit);
  
  // Return in chronological order (reverse the array)
  return messages.reverse().map(msg => ({
    id: msg._id,
    chat_session_id: msg.chatSessionId,
    role: msg.role,
    content: msg.content,
    has_diagram: msg.hasDiagram,
    created_at: msg.createdAt
  }));
};

// Static method to delete message
messageSchema.statics.delete = async function(id, chatSessionId) {
  const message = await this.findOneAndDelete({ _id: id, chatSessionId });
  if (!message) return null;
  
  return {
    id: message._id,
    chat_session_id: message.chatSessionId,
    role: message.role,
    content: message.content,
    has_diagram: message.hasDiagram,
    created_at: message.createdAt
  };
};

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;