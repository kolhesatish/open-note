import React, { useState } from 'react';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<'login' | 'signup' | 'chat'>('login');

  const renderView = () => {
    switch (currentView) {
      case 'login':
        return (
          <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="max-w-md w-full space-y-8">
              <div>
                <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                  Sign in to your account
                </h2>
              </div>
              <form className="mt-8 space-y-6">
                <div className="rounded-md shadow-sm -space-y-px">
                  <div>
                    <input
                      type="email"
                      required
                      className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Email address"
                    />
                  </div>
                  <div>
                    <input
                      type="password"
                      required
                      className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Password"
                    />
                  </div>
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => setCurrentView('chat')}
                    className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Sign in
                  </button>
                </div>
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setCurrentView('signup')}
                    className="text-blue-600 hover:text-blue-500"
                  >
                    Don't have an account? Sign up
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      case 'signup':
        return (
          <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="max-w-md w-full space-y-8">
              <div>
                <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                  Create your account
                </h2>
              </div>
              <form className="mt-8 space-y-6">
                <div className="rounded-md shadow-sm -space-y-px">
                  <div>
                    <input
                      type="text"
                      required
                      className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Full name"
                    />
                  </div>
                  <div>
                    <input
                      type="email"
                      required
                      className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Email address"
                    />
                  </div>
                  <div>
                    <input
                      type="password"
                      required
                      className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Password"
                    />
                  </div>
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => setCurrentView('chat')}
                    className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Sign up
                  </button>
                </div>
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setCurrentView('login')}
                    className="text-blue-600 hover:text-blue-500"
                  >
                    Already have an account? Sign in
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      case 'chat':
        return (
          <div className="h-screen bg-gray-100 flex">
            {/* Sidebar */}
            <div className="w-64 bg-white shadow-lg">
              <div className="p-4">
                <h1 className="text-xl font-bold text-gray-800">ChatGPT Clone</h1>
                <button
                  onClick={() => setCurrentView('login')}
                  className="mt-4 w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
                >
                  New Chat
                </button>
              </div>
              <div className="p-4">
                <div className="space-y-2">
                  <div className="p-2 bg-gray-100 rounded cursor-pointer hover:bg-gray-200">
                    Previous conversation 1
                  </div>
                  <div className="p-2 bg-gray-100 rounded cursor-pointer hover:bg-gray-200">
                    Previous conversation 2
                  </div>
                </div>
              </div>
              <div className="absolute bottom-0 p-4">
                <button
                  onClick={() => setCurrentView('login')}
                  className="text-red-600 hover:text-red-800"
                >
                  Logout
                </button>
              </div>
            </div>
            
            {/* Main chat area */}
            <div className="flex-1 flex flex-col">
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-4">
                  <div className="flex justify-start">
                    <div className="bg-white p-3 rounded-lg shadow max-w-xs">
                      <p className="text-gray-800">Hello! How can I help you today?</p>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <div className="bg-blue-600 text-white p-3 rounded-lg shadow max-w-xs">
                      <p>This is a test message from the user.</p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Input area */}
              <div className="border-t bg-white p-4">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    placeholder="Type your message here..."
                    className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
                    Send
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="App">
      {renderView()}
    </div>
  );
};

export default App;