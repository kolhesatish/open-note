const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
require('dotenv').config();

const { initDB } = require('./config/database');
const authRoutes = require('./routes/auth');
const chatRoutes = require('./routes/chat');

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize database
initDB().catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false // Allow embedding for development
}));

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-domain.vercel.app'] // Update with your production domain
    : ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);

// Keep-alive endpoint to prevent server sleep
app.get('/api/ping', (req, res) => {
  res.json({ 
    status: 'alive', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

// Serve static files from React build (for production)
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
  
  // Handle React routing, return all requests to React app
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
  });
} else {
  // Development route
  app.get('/', (req, res) => {
    res.json({ 
      message: 'ChatGPT Clone Backend API',
      endpoints: {
        auth: '/api/auth/*',
        chat: '/api/chat/*',
        ping: '/api/ping',
        health: '/api/health'
      }
    });
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { details: err.message })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Background job to keep server alive (ping every 5 minutes)
if (process.env.NODE_ENV === 'production') {
  setInterval(() => {
    // Self-ping to keep server alive
    fetch(`${process.env.SERVER_URL || 'http://localhost:' + PORT}/api/ping`)
      .then(() => console.log('Keep-alive ping sent'))
      .catch(err => console.log('Keep-alive ping failed:', err.message));
  }, 5 * 60 * 1000); // 5 minutes
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📚 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 API endpoints available at http://localhost:${PORT}/api`);
});

module.exports = app;