import React, { useState, useEffect } from 'react';
import { BellIcon, BellSlashIcon, BellAlertIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';
import { requestNotificationPermission, canReenableNotifications } from '../utils/pushNotifications';
import { toast } from 'react-hot-toast';

const NotificationPermission = () => {
  const [permissionStatus, setPermissionStatus] = useState(Notification.permission);
  const [showBanner, setShowBanner] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Check permission status on mount
    setPermissionStatus(Notification.permission);
  }, []);

  const handlePermissionRequest = async () => {
    try {
      setIsLoading(true);
      const granted = await requestNotificationPermission();
      
      if (granted) {
        setPermissionStatus('granted');
        toast.success('Notifications enabled successfully!');
        setShowBanner(false);
      } else {
        setPermissionStatus('denied');
        toast.error('Please enable notifications in your browser settings');
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      toast.error('Failed to enable notifications');
    } finally {
      setIsLoading(false);
    }
  };

  const getPermissionMessage = () => {
    switch (permissionStatus) {
      case 'denied':
        return {
          title: 'Notifications Blocked',
          message: 'To receive important updates, please enable notifications in your browser settings.',
          icon: BellSlashIcon,
          color: 'red',
          action: 'Enable in Settings'
        };
      case 'default':
        return {
          title: 'Enable Notifications',
          message: 'Stay updated with important announcements, complaint updates, and polls.',
          icon: BellAlertIcon,
          color: 'yellow',
          action: 'Enable Notifications'
        };
      default:
        return null;
    }
  };

  const permissionInfo = getPermissionMessage();

  if (permissionStatus === 'granted' || !showBanner || !permissionInfo) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-[95%] max-w-md sm:w-full sm:mx-4"
      >
        <div className={`bg-white rounded-lg shadow-lg border-l-4 border-${permissionInfo.color}-500 p-3 sm:p-4`}>
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <permissionInfo.icon className={`h-5 w-5 sm:h-6 sm:w-6 text-${permissionInfo.color}-500`} />
            </div>
            <div className="ml-2 sm:ml-3 flex-1 min-w-0">
              <h3 className="text-xs sm:text-sm font-medium text-gray-900 truncate">{permissionInfo.title}</h3>
              <p className="mt-1 text-xs sm:text-sm text-gray-500 line-clamp-2">{permissionInfo.message}</p>
              <div className="mt-2 sm:mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <button
                  onClick={handlePermissionRequest}
                  disabled={isLoading}
                  className={`w-full sm:w-auto inline-flex items-center justify-center px-3 py-1.5 sm:py-2 border border-transparent text-xs sm:text-sm leading-4 font-medium rounded-md text-white bg-${permissionInfo.color}-600 hover:bg-${permissionInfo.color}-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${permissionInfo.color}-500 ${
                    isLoading ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-3 w-3 sm:h-4 sm:w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Enabling...
                    </>
                  ) : (
                    permissionInfo.action
                  )}
                </button>
                <button
                  onClick={() => setShowBanner(false)}
                  className="w-full sm:w-auto inline-flex items-center justify-center px-3 py-1.5 sm:py-2 border border-gray-300 text-xs sm:text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Dismiss
                </button>
              </div>
            </div>
            <button
              onClick={() => setShowBanner(false)}
              className="ml-2 sm:ml-4 flex-shrink-0 text-gray-400 hover:text-gray-500"
            >
              <XMarkIcon className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default NotificationPermission; 