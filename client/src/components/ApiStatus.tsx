import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { CheckCircle, XCircle, Loader, RefreshCw } from 'lucide-react';

interface ApiStatusProps {
  showDetails?: boolean;
}

const ApiStatus: React.FC<ApiStatusProps> = ({ showDetails = false }) => {
  const [status, setStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [message, setMessage] = useState('');
  const [healthData, setHealthData] = useState<any>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const checkApiStatus = async () => {
    setStatus('checking');
    setMessage('Testing API connection...');
    
    try {
      const result = await apiService.testConnection();
      
      if (result.success) {
        setStatus('connected');
        setMessage('API connected successfully');
        setHealthData(result.data);
      } else {
        setStatus('error');
        setMessage(result.message);
      }
    } catch (error: any) {
      setStatus('error');
      setMessage(error.message || 'Connection failed');
    }
    
    setLastChecked(new Date());
  };

  useEffect(() => {
    checkApiStatus();
  }, []);

  const getStatusIcon = () => {
    switch (status) {
      case 'checking':
        return <Loader className="h-4 w-4 animate-spin text-blue-500" />;
      case 'connected':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'checking':
        return 'text-blue-600';
      case 'connected':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {getStatusIcon()}
          <span className={`font-medium ${getStatusColor()}`}>
            API Status: {status === 'checking' ? 'Checking...' : status === 'connected' ? 'Connected' : 'Error'}
          </span>
        </div>
        <button
          onClick={checkApiStatus}
          className="p-1 rounded hover:bg-gray-100 transition-colors"
          title="Refresh API status"
        >
          <RefreshCw className="h-4 w-4 text-gray-500" />
        </button>
      </div>
      
      <p className="text-sm text-gray-600 mt-1">{message}</p>
      
      {lastChecked && (
        <p className="text-xs text-gray-400 mt-1">
          Last checked: {lastChecked.toLocaleTimeString()}
        </p>
      )}
      
      {showDetails && healthData && (
        <div className="mt-3 p-3 bg-gray-50 rounded text-xs">
          <h4 className="font-medium text-gray-700 mb-2">API Details:</h4>
          <div className="space-y-1">
            <div><strong>Status:</strong> {healthData.status}</div>
            <div><strong>Uptime:</strong> {Math.round(healthData.uptime)}s</div>
            <div><strong>Memory:</strong> {Math.round(healthData.memory?.heapUsed / 1024 / 1024)}MB</div>
            {healthData.keepAlive && (
              <div><strong>Keep-Alive:</strong> {healthData.keepAlive.isActive ? 'Active' : 'Inactive'}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ApiStatus;
