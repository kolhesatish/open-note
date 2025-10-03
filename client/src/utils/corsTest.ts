// CORS Testing Utility
export const testCORS = async (baseUrl: string = 'https://open-note-backend.vercel.app') => {
  console.log('🧪 Testing CORS configuration...');
  
  const testUrl = `${baseUrl}/api/cors-test`;
  
  try {
    console.log('📡 Making request to:', testUrl);
    
    const response = await fetch(testUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Important for CORS with credentials
    });
    
    console.log('📊 Response status:', response.status);
    console.log('📋 Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ CORS test successful:', data);
      return {
        success: true,
        message: 'CORS is working correctly',
        data
      };
    } else {
      console.log('❌ CORS test failed with status:', response.status);
      return {
        success: false,
        message: `CORS test failed with status: ${response.status}`,
        status: response.status
      };
    }
  } catch (error: any) {
    console.error('💥 CORS test error:', error);
    
    // Check if it's a CORS error
    if (error.message.includes('CORS') || error.message.includes('cross-origin')) {
      return {
        success: false,
        message: 'CORS error detected - backend not allowing requests from this origin',
        error: error.message,
        type: 'CORS_ERROR'
      };
    }
    
    // Check if it's a network error
    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      return {
        success: false,
        message: 'Network error - check if backend is running and accessible',
        error: error.message,
        type: 'NETWORK_ERROR'
      };
    }
    
    return {
      success: false,
      message: 'Unknown error occurred',
      error: error.message,
      type: 'UNKNOWN_ERROR'
    };
  }
};

// Test authentication endpoint specifically
export const testAuthCORS = async (baseUrl: string = 'https://open-note-backend.vercel.app') => {
  console.log('🔐 Testing Auth CORS...');
  
  const testUrl = `${baseUrl}/api/auth/login`;
  
  try {
    const response = await fetch(testUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'testpassword'
      })
    });
    
    console.log('📊 Auth CORS test response status:', response.status);
    
    // We expect this to fail with 400/401, but CORS should work
    if (response.status === 0) {
      return {
        success: false,
        message: 'CORS error - Status 0 indicates blocked request',
        type: 'CORS_BLOCKED'
      };
    }
    
    return {
      success: true,
      message: 'Auth CORS is working (got proper HTTP status)',
      status: response.status,
      type: 'CORS_WORKING'
    };
    
  } catch (error: any) {
    console.error('💥 Auth CORS test error:', error);
    return {
      success: false,
      message: 'Auth CORS test failed',
      error: error.message,
      type: 'AUTH_CORS_ERROR'
    };
  }
};

// Run all CORS tests
export const runAllCORSTests = async () => {
  console.log('🚀 Running comprehensive CORS tests...');
  
  const results = {
    basic: await testCORS(),
    auth: await testAuthCORS()
  };
  
  console.log('📋 CORS Test Results:', results);
  
  return results;
};
