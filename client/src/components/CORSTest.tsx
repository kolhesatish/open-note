import React, { useState } from 'react';
import { testCORS, testAuthCORS, runAllCORSTests } from '../utils/corsTest';
import { CheckCircle, XCircle, Loader, AlertTriangle } from 'lucide-react';

const CORSTest: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<any>(null);

  const runTests = async () => {
    setIsRunning(true);
    setResults(null);
    
    try {
      const testResults = await runAllCORSTests();
      setResults(testResults);
    } catch (error) {
      console.error('Test error:', error);
      setResults({ error: 'Failed to run tests' });
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (success: boolean, type?: string) => {
    if (success) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    } else if (type === 'CORS_ERROR' || type === 'CORS_BLOCKED') {
      return <XCircle className="h-4 w-4 text-red-500" />;
    } else {
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusColor = (success: boolean, type?: string) => {
    if (success) {
      return 'text-green-600';
    } else if (type === 'CORS_ERROR' || type === 'CORS_BLOCKED') {
      return 'text-red-600';
    } else {
      return 'text-yellow-600';
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">CORS Test</h3>
        <button
          onClick={runTests}
          disabled={isRunning}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
        >
          {isRunning ? (
            <Loader className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle className="h-4 w-4" />
          )}
          <span>{isRunning ? 'Testing...' : 'Run CORS Tests'}</span>
        </button>
      </div>

      <div className="text-sm text-gray-600 mb-4">
        Test CORS configuration between your frontend and backend
      </div>

      {results && (
        <div className="space-y-4">
          {/* Basic CORS Test */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              {getStatusIcon(results.basic?.success, results.basic?.type)}
              <span className={`font-medium ${getStatusColor(results.basic?.success, results.basic?.type)}`}>
                Basic CORS Test
              </span>
            </div>
            <p className="text-sm text-gray-600">{results.basic?.message}</p>
            {results.basic?.data && (
              <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                <pre>{JSON.stringify(results.basic.data, null, 2)}</pre>
              </div>
            )}
          </div>

          {/* Auth CORS Test */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              {getStatusIcon(results.auth?.success, results.auth?.type)}
              <span className={`font-medium ${getStatusColor(results.auth?.success, results.auth?.type)}`}>
                Auth CORS Test
              </span>
            </div>
            <p className="text-sm text-gray-600">{results.auth?.message}</p>
            {results.auth?.status && (
              <div className="mt-2 text-xs text-gray-500">
                HTTP Status: {results.auth.status}
              </div>
            )}
          </div>

          {/* Troubleshooting */}
          {results.basic?.type === 'CORS_ERROR' || results.auth?.type === 'CORS_BLOCKED' ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="font-medium text-red-800 mb-2">🚨 CORS Issue Detected</h4>
              <div className="text-sm text-red-700 space-y-1">
                <p>• Your backend needs to be redeployed with the updated CORS configuration</p>
                <p>• Make sure your frontend origin is in the allowed origins list</p>
                <p>• Check browser console for detailed CORS error messages</p>
              </div>
            </div>
          ) : results.basic?.success && results.auth?.success ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-medium text-green-800 mb-2">✅ CORS Working Correctly</h4>
              <p className="text-sm text-green-700">
                Your frontend can successfully communicate with the backend!
              </p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default CORSTest;
