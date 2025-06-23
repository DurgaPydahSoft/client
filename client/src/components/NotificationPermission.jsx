import { useState, useEffect } from 'react';
import { BellAlertIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';
import notificationManager from '../utils/notificationManager';
import { toast } from 'react-hot-toast';

const NotificationPermission = () => {
  const [showBanner, setShowBanner] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // We need to wait for OneSignal to be initialized before checking permission
    const checkPermission = async () => {
      // Give OneSignal a moment to initialize
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const isEnabled = await notificationManager.isEnabled();
      // Only show the banner if notifications are not granted and not blocked
      if (Notification.permission === 'default' && !isEnabled) {
        setShowBanner(true);
      }
    };

    checkPermission();
  }, []);

  const handlePermissionRequest = async () => {
    try {
      setIsLoading(true);
      const result = await notificationManager.requestPermission();
      
      if (result.oneSignal) {
        toast.success('Notifications enabled successfully!');
        setShowBanner(false);
      } else {
        toast.error('Please enable notifications in your browser settings.');
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      toast.error('Failed to enable notifications.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!showBanner) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-[95%] max-w-lg"
      >
        <div className="bg-white rounded-lg shadow-lg border-l-4 border-blue-500 p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <BellAlertIcon className="h-6 w-6 text-blue-500" />
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-gray-900">Enable Notifications</h3>
              <p className="mt-1 text-sm text-gray-600">
                Stay updated with important announcements and complaint updates.
              </p>
            </div>
            <div className="ml-4 flex-shrink-0 flex items-center gap-2">
              <button
                onClick={handlePermissionRequest}
                disabled={isLoading}
                className={`inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isLoading ? 'Enabling...' : 'Enable'}
              </button>
              <button
                onClick={() => setShowBanner(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default NotificationPermission; 