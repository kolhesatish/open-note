const mongoose = require('mongoose');

// ChatSession Schema
const chatSessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    default: 'New Chat',
    maxlength: 255
  }
}, {
  timestamps: true // This adds createdAt and updatedAt automatically
});

// Static method to create chat session
chatSessionSchema.statics.create = async function(userId, title = 'New Chat') {
  const session = new this({ userId, title });
  const savedSession = await session.save();
  
  return {
    id: savedSession._id,
    user_id: savedSession.userId,
    title: savedSession.title,
    created_at: savedSession.createdAt,
    updated_at: savedSession.updatedAt
  };
};

// Static method to find sessions by user ID with message count
chatSessionSchema.statics.findByUserId = async function(userId) {
  const Message = mongoose.model('Message');
  
  const sessions = await this.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    {
      $lookup: {
        from: 'messages',
        localField: '_id',
        foreignField: 'chatSessionId',
        as: 'messages'
      }
    },
    {
      $addFields: {
        message_count: { $size: '$messages' }
      }
    },
    { $sort: { updatedAt: -1 } },
    {
      $project: {
        id: '$_id',
        user_id: '$userId',
        title: 1,
        created_at: '$createdAt',
        updated_at: '$updatedAt',
        message_count: 1
      }
    }
  ]);
  
  return sessions;
};

// Static method to find by ID and user ID
chatSessionSchema.statics.findById = async function(id, userId) {
  const session = await this.findOne({ _id: id, userId });
  if (!session) return null;
  
  return {
    id: session._id,
    user_id: session.userId,
    title: session.title,
    created_at: session.createdAt,
    updated_at: session.updatedAt
  };
};

// Static method to update title
chatSessionSchema.statics.updateTitle = async function(id, userId, title) {
  const session = await this.findOneAndUpdate(
    { _id: id, userId },
    { title, updatedAt: new Date() },
    { new: true }
  );
  
  if (!session) return null;
  
  return {
    id: session._id,
    user_id: session.userId,
    title: session.title,
    created_at: session.createdAt,
    updated_at: session.updatedAt
  };
};

// Static method to delete session
chatSessionSchema.statics.delete = async function(id, userId) {
  const session = await this.findOneAndDelete({ _id: id, userId });
  if (!session) return null;
  
  // Also delete associated messages
  const Message = mongoose.model('Message');
  await Message.deleteMany({ chatSessionId: id });
  
  return {
    id: session._id,
    user_id: session.userId,
    title: session.title,
    created_at: session.createdAt,
    updated_at: session.updatedAt
  };
};

// Static method to update timestamp
chatSessionSchema.statics.updateTimestamp = async function(id) {
  await this.findByIdAndUpdate(id, { updatedAt: new Date() });
};

const ChatSession = mongoose.model('ChatSession', chatSessionSchema);

module.exports = ChatSession;