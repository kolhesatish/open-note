

const fetch = require('node-fetch');

const SERVER_URL = process.argv[2] || 'https://open-note-backend.vercel.app/';

async function testKeepAlive() {
  console.log('🧪 Testing Keep-Alive Service...\n');
  console.log(`📍 Server URL: ${SERVER_URL}\n`);

  const endpoints = [
    { name: 'Health Check', url: '/api/health', method: 'GET' },
    { name: 'Ping', url: '/api/ping', method: 'GET' },
    { name: 'Keep-Alive Status', url: '/api/keep-alive/status', method: 'GET' },
    { name: 'Manual Ping Trigger', url: '/api/keep-alive/trigger', method: 'POST' }
  ];

  for (const endpoint of endpoints) {
    try {
      console.log(`🔍 Testing ${endpoint.name}...`);
      
      const response = await fetch(`${SERVER_URL}${endpoint.url}`, {
        method: endpoint.method,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'KeepAlive-Test/1.0'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`✅ ${endpoint.name}: SUCCESS`);
        console.log(`   Status: ${response.status}`);
        console.log(`   Response: ${JSON.stringify(data, null, 2)}\n`);
      } else {
        console.log(`❌ ${endpoint.name}: FAILED`);
        console.log(`   Status: ${response.status}`);
        console.log(`   Error: ${response.statusText}\n`);
      }
    } catch (error) {
      console.log(`💥 ${endpoint.name}: ERROR`);
      console.log(`   Error: ${error.message}\n`);
    }
  }

  // Test multiple pings to simulate keep-alive behavior
  console.log('🔄 Testing multiple pings (simulating keep-alive behavior)...\n');
  
  for (let i = 1; i <= 3; i++) {
    try {
      console.log(`Ping #${i}...`);
      const startTime = Date.now();
      
      const response = await fetch(`${SERVER_URL}/api/ping`);
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Ping #${i} successful - Response time: ${responseTime}ms`);
        console.log(`   Uptime: ${data.uptime}s`);
        console.log(`   Memory: ${Math.round(data.memory.heapUsed / 1024 / 1024)}MB\n`);
      } else {
        console.log(`❌ Ping #${i} failed - Status: ${response.status}\n`);
      }
      
      // Wait 2 seconds between pings
      if (i < 3) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (error) {
      console.log(`💥 Ping #${i} error: ${error.message}\n`);
    }
  }

  console.log('🎉 Keep-alive testing completed!');
  console.log('\n📋 Summary:');
  console.log('- If all tests passed, your keep-alive service is working correctly');
  console.log('- In production, the service will automatically ping every 2 minutes');
  console.log('- You can monitor the service status via /api/keep-alive/status');
  console.log('- Manual pings can be triggered via /api/keep-alive/trigger');
}

// Run the test
testKeepAlive().catch(error => {
  console.error('💥 Test failed:', error);
  process.exit(1);
});
