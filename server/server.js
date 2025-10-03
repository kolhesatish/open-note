const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const fetch = require('node-fetch');
require('dotenv').config();

const { initDB } = require('./config/database');
const authRoutes = require('./routes/auth');
const chatRoutes = require('./routes/chat');
const keepAliveService = require('./services/keepAliveService');

const app = express();
const PORT = process.env.PORT || 5000;

// Trust proxy for Vercel (fixes X-Forwarded-For issues)
app.set('trust proxy', 1);

// Initialize database
initDB().catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});

// Security middleware - Configure before CORS
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false
}));

// CORS configuration
const allowedOrigins = [
  'http://localhost:3000',           
  'http://localhost:3001',           
  'http://127.0.0.1:3000',          
  'https://open-note.vercel.app',   
  'https://open-note-frontend.vercel.app', 
  'https://student-note.vercel.app',
];

// Add custom origins from environment variable
if (process.env.ALLOWED_ORIGINS) {
  const customOrigins = process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim());
  allowedOrigins.push(...customOrigins);
}

// Enhanced CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      console.log('⚠️ CORS: No origin header, allowing request');
      return callback(null, true);
    }
    
    if (allowedOrigins.includes(origin)) {
      console.log('✅ CORS: Allowed origin:', origin);
      return callback(null, true);
    }
    
    // In development, be more permissive
    if (process.env.NODE_ENV !== 'production') {
      console.log('⚠️ CORS: Allowing origin in development:', origin);
      return callback(null, true);
    }
    
    console.log('❌ CORS: Blocked origin:', origin);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With', 
    'Accept', 
    'Origin',
    'Cache-Control',
    'Connection',
    'Keep-Alive',
    'Accept-Encoding'
  ],
  exposedHeaders: ['Content-Length', 'X-Foo', 'X-Bar'],
  optionsSuccessStatus: 200,
  preflightContinue: false,
  maxAge: 86400 // 24 hours cache for preflight
};

// Apply CORS middleware
app.use(cors(corsOptions));

// Enhanced preflight handler - should be AFTER cors middleware
app.options('*', (req, res) => {
  console.log('🔄 OPTIONS request:', {
    method: req.method,
    path: req.path,
    origin: req.headers.origin,
    headers: Object.keys(req.headers)
  });
  
  // CORS middleware should have already handled this, but ensure headers are set
  res.header('Access-Control-Max-Age', '86400');
  res.status(200).end();
});

// Request logging middleware
app.use((req, res, next) => {
  console.log(`📨 ${req.method} ${req.path}`, {
    origin: req.headers.origin,
    contentType: req.headers['content-type'],
    userAgent: req.headers['user-agent']?.slice(0, 50)
  });
  next();
});

// Body parsing middleware - with enhanced error handling
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf, encoding) => {
    try {
      JSON.parse(buf);
    } catch (err) {
      console.error('JSON parsing error:', err.message);
      throw new Error('Invalid JSON payload');
    }
  }
}));

app.use(express.urlencoded({ 
  extended: true, 
  limit: '10mb' 
}));

// Enhanced error handling for body parsing
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    console.error('Body parsing error:', err.message);
    return res.status(400).json({ 
      error: 'Invalid request body',
      message: 'Request body must be valid JSON',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
  next(err);
});

// API routes with enhanced error handling
app.use('/api/auth', (req, res, next) => {
  console.log('🔐 Auth route accessed:', req.method, req.path);
  next();
}, authRoutes);

app.use('/api/chat', (req, res, next) => {
  console.log('💬 Chat route accessed:', req.method, req.path);
  next();
}, chatRoutes);

// Keep-alive endpoint
app.get('/api/ping', (req, res) => {
  res.json({ 
    status: 'alive', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    keepAlive: keepAliveService.getStatus()
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    keepAlive: keepAliveService.getStatus(),
    allowedOrigins: process.env.NODE_ENV === 'development' ? allowedOrigins : undefined
  });
});

// Manual keep-alive trigger endpoint
app.post('/api/keep-alive/trigger', (req, res) => {
  keepAliveService.manualPing()
    .then(success => {
      res.json({ 
        success,
        message: success ? 'Keep-alive ping sent successfully' : 'Keep-alive ping failed',
        timestamp: new Date().toISOString()
      });
    })
    .catch(error => {
      console.error('Keep-alive error:', error);
      res.status(500).json({ 
        success: false,
        message: 'Keep-alive ping failed',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    });
});

// Keep-alive status endpoint
app.get('/api/keep-alive/status', (req, res) => {
  res.json(keepAliveService.getStatus());
});

// Enhanced CORS test endpoints
app.get('/api/cors-test', (req, res) => {
  res.json({
    message: 'CORS is working!',
    origin: req.headers.origin,
    timestamp: new Date().toISOString(),
    allowedOrigins: process.env.NODE_ENV === 'development' ? allowedOrigins : 'hidden in production',
    environment: process.env.NODE_ENV,
    requestHeaders: req.headers
  });
});

app.post('/api/cors-test', (req, res) => {
  res.json({
    message: 'CORS POST is working!',
    origin: req.headers.origin,
    body: req.body,
    timestamp: new Date().toISOString(),
    contentType: req.headers['content-type']
  });
});

// Debug endpoint for troubleshooting
app.all('/api/debug/:path?', (req, res) => {
  res.json({
    method: req.method,
    path: req.path,
    params: req.params,
    query: req.query,
    headers: req.headers,
    body: req.body,
    timestamp: new Date().toISOString()
  });
});

// Serve static files from React build (for production)
if (process.env.NODE_ENV === 'production') {
  const buildPath = path.join(__dirname, '../client/build');
  try {
    const fs = require('fs');
    if (fs.existsSync(buildPath)) {
      app.use(express.static(buildPath));
      
      // Handle React routing, return all requests to React app
      app.get('*', (req, res) => {
        // Skip API routes
        if (req.path.startsWith('/api/')) {
          return res.status(404).json({ error: 'API endpoint not found' });
        }
        res.sendFile(path.join(buildPath, 'index.html'));
      });
    } else {
      console.log('⚠️ React build directory not found, serving API only');
      // API-only mode fallback
      app.get('*', (req, res) => {
        if (req.path.startsWith('/api/')) {
          res.status(404).json({ 
            error: 'API endpoint not found',
            path: req.path,
            method: req.method
          });
        } else {
          res.status(404).json({ 
            error: 'Not found',
            message: 'This is an API-only deployment. Frontend not available.',
            availableEndpoints: {
              auth: '/api/auth/*',
              chat: '/api/chat/*',
              health: '/api/health',
              ping: '/api/ping',
              debug: '/api/debug/*'
            }
          });
        }
      });
    }
  } catch (error) {
    console.log('⚠️ Error checking build directory:', error.message);
    // Fallback to API-only mode
    app.get('*', (req, res) => {
      if (req.path.startsWith('/api/')) {
        res.status(404).json({ 
          error: 'API endpoint not found',
          path: req.path,
          method: req.method
        });
      } else {
        res.status(404).json({ 
          error: 'Not found',
          message: 'This is an API-only deployment.',
          availableEndpoints: {
            auth: '/api/auth/*',
            chat: '/api/chat/*',
            health: '/api/health',
            ping: '/api/ping'
          }
        });
      }
    });
  }
} else {
  // Development route
  app.get('/', (req, res) => {
    res.json({ 
      message: 'ChatGPT Clone Backend API - Development Mode',
      endpoints: {
        auth: '/api/auth/*',
        chat: '/api/chat/*',
        ping: '/api/ping',
        health: '/api/health',
        keepAlive: {
          trigger: 'POST /api/keep-alive/trigger',
          status: 'GET /api/keep-alive/status'
        },
        cors: {
          test: 'GET /api/cors-test',
          testPost: 'POST /api/cors-test'
        },
        debug: '/api/debug/*'
      },
      keepAlive: keepAliveService.getStatus(),
      environment: process.env.NODE_ENV
    });
  });
}

// Enhanced error handling middleware
app.use((err, req, res, next) => {
  console.error('🚨 Unhandled error:', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    origin: req.headers.origin,
    body: req.body
  });

  // Handle specific error types
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation Error',
      message: err.message,
      details: process.env.NODE_ENV === 'development' ? err.errors : undefined
    });
  }

  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication required'
    });
  }

  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      error: 'CORS Error',
      message: 'Origin not allowed',
      origin: req.headers.origin
    });
  }

  // Generic error response
  res.status(err.status || 500).json({ 
    error: 'Internal server error',
    message: err.message,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString(),
    ...(process.env.NODE_ENV === 'development' && { 
      details: err.message,
      stack: err.stack 
    })
  });
});

// Enhanced 404 handler
app.use((req, res) => {
  console.log('🔍 404 - Route not found:', {
    path: req.path,
    method: req.method,
    origin: req.headers.origin
  });

  res.status(404).json({ 
    error: 'Route not found',
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString(),
    suggestion: req.path.startsWith('/api/') ? 'Check if this API endpoint exists' : 'This might be a frontend route'
  });
});

// Start the enhanced keep-alive service
keepAliveService.start();

// Enhanced server startup
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📚 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 API endpoints available at http://localhost:${PORT}/api`);
  console.log(`🌐 Allowed origins:`, allowedOrigins);
  console.log(`⏰ Keep-alive service:`, keepAliveService.getStatus().enabled ? 'enabled' : 'disabled');
});

module.exports = app;