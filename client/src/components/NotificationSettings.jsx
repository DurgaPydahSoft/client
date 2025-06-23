import React, { useState } from 'react';
import { useOneSignal } from '../hooks/useOneSignal';
import { toast } from 'react-hot-toast';
import { 
  BellIcon, 
  BellSlashIcon, 
  CogIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';

const NotificationSettings = () => {
  const {
    status,
    isLoading,
    error,
    requestPermission,
    sendTestNotification,
    areNotificationsEnabled,
    isOneSignalActive,
    isLegacyActive,
    isSocketActive,
    clearError
  } = useOneSignal();

  const [showSettings, setShowSettings] = useState(false);
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);

  const handleRequestPermission = async () => {
    try {
      setIsRequestingPermission(true);
      const results = await requestPermission();
      
      if (results.oneSignal || results.legacy) {
        toast.success('Notifications enabled successfully!');
      } else {
        toast.error('Please enable notifications in your browser settings');
      }
    } catch (error) {
      toast.error('Failed to enable notifications');
    } finally {
      setIsRequestingPermission(false);
    }
  };

  const handleTestNotification = async () => {
    try {
      const sent = await sendTestNotification();
      if (sent) {
        toast.success('Test notification sent successfully!');
      } else {
        toast.error('Failed to send test notification');
      }
    } catch (error) {
      toast.error('Failed to send test notification');
    }
  };

  const getStatusIcon = (isActive) => {
    return isActive ? (
      <CheckCircleIcon className="h-5 w-5 text-green-500" />
    ) : (
      <XCircleIcon className="h-5 w-5 text-red-500" />
    );
  };

  const getStatusText = (isActive) => {
    return isActive ? 'Active' : 'Inactive';
  };

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <XCircleIcon className="h-5 w-5 text-red-500 mr-2" />
            <span className="text-red-700">Notification Error: {error}</span>
          </div>
          <button
            onClick={clearError}
            className="text-red-600 hover:text-red-800 text-sm"
          >
            Dismiss
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center">
          <BellIcon className="h-6 w-6 text-gray-600 mr-3" />
          <h3 className="text-lg font-semibold text-gray-900">Notification Settings</h3>
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <CogIcon className="h-5 w-5" />
        </button>
      </div>

      {/* Status Overview */}
      <div className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
              <span className="text-sm font-medium text-gray-700">OneSignal</span>
            </div>
            <div className="flex items-center">
              {getStatusIcon(isOneSignalActive)}
              <span className={`ml-2 text-sm ${isOneSignalActive ? 'text-green-600' : 'text-red-600'}`}>
                {getStatusText(isOneSignalActive)}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
              <span className="text-sm font-medium text-gray-700">Legacy System</span>
            </div>
            <div className="flex items-center">
              {getStatusIcon(isLegacyActive)}
              <span className={`ml-2 text-sm ${isLegacyActive ? 'text-green-600' : 'text-red-600'}`}>
                {getStatusText(isLegacyActive)}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-purple-500 rounded-full mr-3"></div>
              <span className="text-sm font-medium text-gray-700">Real-time</span>
            </div>
            <div className="flex items-center">
              {getStatusIcon(isSocketActive)}
              <span className={`ml-2 text-sm ${isSocketActive ? 'text-green-600' : 'text-red-600'}`}>
                {getStatusText(isSocketActive)}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={handleRequestPermission}
            disabled={isLoading || isRequestingPermission}
            className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isRequestingPermission ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Requesting Permission...
              </>
            ) : (
              <>
                <BellIcon className="h-4 w-4 mr-2" />
                Enable Notifications
              </>
            )}
          </button>

          {isOneSignalActive && (
            <button
              onClick={handleTestNotification}
              disabled={isLoading}
              className="w-full flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <CheckCircleIcon className="h-4 w-4 mr-2" />
              Send Test Notification
            </button>
          )}
        </div>
      </div>

      {/* Detailed Settings */}
      {showSettings && (
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Advanced Settings</h4>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">System Status</span>
              <span className="text-sm font-medium text-gray-900">
                {status?.isInitialized ? 'Initialized' : 'Not Initialized'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">User Registration</span>
              <span className="text-sm font-medium text-gray-900">
                {status?.user === 'registered' ? 'Registered' : 'Not Registered'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Permission Status</span>
              <span className="text-sm font-medium text-gray-900">
                {Notification.permission === 'granted' ? 'Granted' : 
                 Notification.permission === 'denied' ? 'Denied' : 'Default'}
              </span>
            </div>
          </div>

          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <h5 className="text-sm font-medium text-blue-900 mb-2">About This System</h5>
            <p className="text-xs text-blue-700">
              This notification system uses a hybrid approach with OneSignal for enhanced push notifications 
              and a legacy system as fallback. Real-time notifications are handled via WebSocket connections.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationSettings; 