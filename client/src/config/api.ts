// API Configuration
export const API_CONFIG = {
  // Use environment variable or fallback to production URL
  BASE_URL: process.env.REACT_APP_API_URL || 'https://open-note-backend.vercel.app/api/',
  
  // API endpoints
  ENDPOINTS: {
    AUTH: {
      LOGIN: '/auth/login',
      SIGNUP: '/auth/signup',
      ME: '/auth/me',
      LOGOUT: '/auth/logout'
    },
    CHAT: {
      SESSIONS: '/chat/sessions',
      MESSAGES: '/chat/sessions/:id/messages',
      STREAM: '/chat/sessions/:id/messages/stream',
      REGENERATE: '/chat/sessions/:id/regenerate'
    },
    HEALTH: {
      PING: '/ping',
      HEALTH: '/health',
      KEEP_ALIVE_STATUS: '/keep-alive/status',
      KEEP_ALIVE_TRIGGER: '/keep-alive/trigger'
    }
  },
  
  // Request configuration
  TIMEOUT: 30000, // 30 seconds
  RETRY_ATTEMPTS: 3,
  
  // Environment info
  ENVIRONMENT: process.env.NODE_ENV || 'development',
  IS_PRODUCTION: process.env.NODE_ENV === 'production'
};

// Log API configuration on startup
console.log('🔗 API Configuration:', {
  baseUrl: API_CONFIG.BASE_URL,
  environment: API_CONFIG.ENVIRONMENT,
  isProduction: API_CONFIG.IS_PRODUCTION
});

export default API_CONFIG;
