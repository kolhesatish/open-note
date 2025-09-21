const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// User Schema
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 50
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email format']
  },
  passwordHash: {
    type: String,
    required: true
  }
}, {
  timestamps: true // This adds createdAt and updatedAt automatically
});

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  if (!this.isModified('passwordHash')) return next();
  
  try {
    const saltRounds = 12;
    this.passwordHash = await bcrypt.hash(this.passwordHash, saltRounds);
    next();
  } catch (error) {
    next(error);
  }
});

// Instance method to validate password
userSchema.methods.validatePassword = async function(plainPassword) {
  return bcrypt.compare(plainPassword, this.passwordHash);
};

// Static method to create user
userSchema.statics.create = async function({ username, email, password }) {
  try {
    const user = new this({
      username,
      email,
      passwordHash: password // Will be hashed by pre-save middleware
    });
    
    const savedUser = await user.save();
    return {
      id: savedUser._id,
      username: savedUser.username,
      email: savedUser.email,
      created_at: savedUser.createdAt
    };
  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      throw new Error(`${field.charAt(0).toUpperCase() + field.slice(1)} already exists`);
    }
    throw error;
  }
};

// Static method to find by email
userSchema.statics.findByEmail = async function(email) {
  const user = await this.findOne({ email });
  if (!user) return null;
  
  return {
    id: user._id,
    username: user.username,
    email: user.email,
    password_hash: user.passwordHash,
    created_at: user.createdAt
  };
};

// Static method to find by ID
userSchema.statics.findById = async function(id) {
  const user = await mongoose.model('User').findById(id);
  if (!user) return null;
  
  return {
    id: user._id,
    username: user.username,
    email: user.email,
    created_at: user.createdAt
  };
};

// Static method to validate password (static version)
userSchema.statics.validatePassword = async function(plainPassword, hashedPassword) {
  return bcrypt.compare(plainPassword, hashedPassword);
};

const User = mongoose.model('User', userSchema);

module.exports = User;