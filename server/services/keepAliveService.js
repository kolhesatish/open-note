const fetch = require('node-fetch');

class KeepAliveService {
  constructor() {
    this.isActive = false;
    this.intervalId = null;
    this.pingInterval = 2 * 60 * 1000; // 2 minutes
    this.serverUrl = process.env.SERVER_URL || `http://localhost:${process.env.PORT || 5000}`;
  }

  start() {
    if (this.isActive) {
      console.log('🔄 Keep-alive service is already running');
      return;
    }

    if (process.env.NODE_ENV === 'production') {
      console.log('🔄 Starting enhanced keep-alive service...');
      this.isActive = true;
      
      // Initial ping
      this.pingServer();
      
      // Set up regular pings
      this.intervalId = setInterval(() => {
        this.pingServer();
      }, this.pingInterval);
      
      // Set up process event handlers
      this.setupProcessHandlers();
      
      console.log(`✅ Keep-alive service started - pinging every ${this.pingInterval / 1000} seconds`);
    } else {
      console.log('ℹ️ Keep-alive service disabled in development mode');
    }
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isActive = false;
    console.log('🛑 Keep-alive service stopped');
  }

  async pingServer() {
    try {
      const startTime = Date.now();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
      
      const response = await fetch(`${this.serverUrl}/api/ping`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'User-Agent': 'KeepAlive-Service/1.0',
          'X-Keep-Alive': 'true'
        }
      });
      
      clearTimeout(timeoutId);
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Keep-alive ping successful - Response time: ${responseTime}ms - Uptime: ${data.uptime}s`);
        return true;
      } else {
        console.log(`⚠️ Keep-alive ping returned status: ${response.status} - Response time: ${responseTime}ms`);
        return false;
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log(`⏰ Keep-alive ping timeout after 15 seconds`);
      } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        console.log(`🌐 Keep-alive ping network error: ${error.message}`);
      } else {
        console.log(`❌ Keep-alive ping failed: ${error.message}`);
      }
      return false;
    }
  }

  setupProcessHandlers() {
    // Handle graceful shutdown
    const gracefulShutdown = (signal) => {
      console.log(`🛑 ${signal} received, sending final ping...`);
      this.pingServer().then(() => {
        console.log('✅ Final ping sent, shutting down keep-alive service');
        this.stop();
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.log('💥 Uncaught exception, sending emergency ping...');
      this.pingServer();
      console.error('Uncaught Exception:', error);
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.log('💥 Unhandled rejection, sending emergency ping...');
      this.pingServer();
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    });
  }

  // Method to get service status
  getStatus() {
    return {
      isActive: this.isActive,
      pingInterval: this.pingInterval,
      serverUrl: this.serverUrl,
      environment: process.env.NODE_ENV
    };
  }

  // Method to manually trigger a ping
  async manualPing() {
    console.log('🔄 Manual ping triggered');
    return await this.pingServer();
  }
}

module.exports = new KeepAliveService();
