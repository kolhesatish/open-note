# 🚀 Deployment Guide - Keep Your Backend Alive

This guide will help you deploy your backend with a robust keep-alive mechanism to prevent it from sleeping on platforms like Render, Vercel, Railway, etc.

## 🔧 Keep-Alive Features Implemented

### ✅ Enhanced Keep-Alive Service
- **Automatic pinging** every 2 minutes in production
- **Self-monitoring** with detailed logging
- **Graceful shutdown** handling
- **Error recovery** mechanisms
- **Memory and uptime tracking**

### ✅ New API Endpoints
- `GET /api/ping` - Basic health check with detailed info
- `GET /api/health` - Comprehensive health status
- `POST /api/keep-alive/trigger` - Manual ping trigger
- `GET /api/keep-alive/status` - Keep-alive service status

## 🌐 Deployment Platforms

### 1. **Vercel Deployment**

#### Setup:
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy from server directory
cd server
vercel

# Set environment variables
vercel env add NODE_ENV
vercel env add SERVER_URL
vercel env add DATABASE_URL
vercel env add JWT_SECRET
vercel env add GOOGLE_AI_API_KEY
```

#### Environment Variables:
```env
NODE_ENV=production
SERVER_URL=https://your-app-name.vercel.app
DATABASE_URL=your_postgresql_connection_string
JWT_SECRET=your_jwt_secret
GOOGLE_AI_API_KEY=your_google_ai_key
```

### 2. **Render Deployment**

#### Setup:
1. Connect your GitHub repository
2. Create a new Web Service
3. Set build command: `npm install`
4. Set start command: `npm start`

#### Environment Variables:
```env
NODE_ENV=production
SERVER_URL=https://your-app-name.onrender.com
DATABASE_URL=your_postgresql_connection_string
JWT_SECRET=your_jwt_secret
GOOGLE_AI_API_KEY=your_google_ai_key
```

### 3. **Railway Deployment**

#### Setup:
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway init
railway up
```

## 🔄 Keep-Alive Configuration

### Automatic Keep-Alive
The service automatically starts when `NODE_ENV=production` and:
- Pings every 2 minutes
- Logs all ping attempts
- Handles errors gracefully
- Monitors server health

### Manual Keep-Alive Triggers

#### Using External Services:
1. **UptimeRobot** - Set up monitoring for `/api/ping`
2. **Pingdom** - Monitor your health endpoint
3. **Cron-job.org** - Free cron service to ping your API

#### Using GitHub Actions:
```yaml
name: Keep Alive
on:
  schedule:
    - cron: '*/5 * * * *'  # Every 5 minutes
jobs:
  keep-alive:
    runs-on: ubuntu-latest
    steps:
      - name: Ping server
        run: curl -X GET ${{ secrets.SERVER_URL }}/api/ping
```

## 📊 Monitoring Your Backend

### Health Check Endpoints:
```bash
# Basic health check
curl https://your-app.vercel.app/api/health

# Keep-alive status
curl https://your-app.vercel.app/api/keep-alive/status

# Manual ping trigger
curl -X POST https://your-app.vercel.app/api/keep-alive/trigger
```

### Response Examples:
```json
{
  "status": "healthy",
  "environment": "production",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600,
  "memory": {
    "rss": 45678912,
    "heapTotal": 20971520,
    "heapUsed": 15728640,
    "external": 1234567
  },
  "keepAlive": {
    "isActive": true,
    "pingInterval": 120000,
    "serverUrl": "https://your-app.vercel.app",
    "environment": "production"
  }
}
```

## 🛠️ Troubleshooting

### Common Issues:

1. **Server still sleeping?**
   - Check `NODE_ENV=production` is set
   - Verify `SERVER_URL` matches your actual URL
   - Check logs for ping failures

2. **Ping failures?**
   - Ensure your server URL is correct
   - Check if your deployment platform allows self-pinging
   - Verify network connectivity

3. **Memory issues?**
   - Monitor memory usage via `/api/health`
   - Consider upgrading your plan
   - Check for memory leaks in your code

### Debug Commands:
```bash
# Check if keep-alive is working
curl https://your-app.vercel.app/api/keep-alive/status

# Test manual ping
curl -X POST https://your-app.vercel.app/api/keep-alive/trigger

# Check server health
curl https://your-app.vercel.app/api/health
```

## 🎯 Best Practices

1. **Always set `NODE_ENV=production`** in production
2. **Use HTTPS URLs** for `SERVER_URL`
3. **Monitor your logs** regularly
4. **Set up external monitoring** as backup
5. **Test your deployment** after changes

## 📈 Performance Tips

- Keep-alive pings are lightweight (just HTTP GET requests)
- Service only runs in production mode
- Automatic error handling prevents crashes
- Memory usage is minimal
- No impact on your main application performance

Your backend will now stay awake and responsive 24/7! 🎉
