import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { BellIcon } from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../utils/axios';
import { toast } from 'react-hot-toast';
import notificationManager from '../utils/notificationManager';
import NotificationPermission from './NotificationPermission';

const NotificationBell = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasNewNotification, setHasNewNotification] = useState(false);
  const [showPermissionBanner, setShowPermissionBanner] = useState(false);
  const [notificationStatus, setNotificationStatus] = useState(null);
  const { user } = useAuth();

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'sub_admin';

  const fetchNotifications = async () => {
    try {
      console.log('🔔 NotificationBell: Fetching notifications for role:', isAdmin ? 'admin' : 'student');
      const [notificationsRes, countRes] = await Promise.all([
        api.get(isAdmin ? '/api/notifications/admin/unread' : '/api/notifications/unread'),
        api.get(isAdmin ? '/api/notifications/admin/unread-count' : '/api/notifications/count')
      ]);

      console.log('🔔 NotificationBell: Responses:', { notificationsRes: notificationsRes.data, countRes: countRes.data });

      if (notificationsRes.data.success) {
        const newNotifications = notificationsRes.data.data;
        setNotifications(newNotifications);
        if (newNotifications.length > 0) {
          setHasNewNotification(true);
        }
      }

      if (countRes.data.success) {
        const newCount = countRes.data.count;
        if (newCount > unreadCount) {
          setHasNewNotification(true);
        }
        setUnreadCount(newCount);
      }
    } catch (err) {
      console.error('🔔 NotificationBell: Failed to fetch notifications:', err);
      // Don't let notification errors cause logout - just set defaults
      setNotifications([]);
      setUnreadCount(0);
      setHasNewNotification(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const handler = () => fetchNotifications();
    window.addEventListener('refresh-notifications', handler);
    
    // Get notification system status
    const status = notificationManager.getStatus();
    setNotificationStatus(status);
    
    return () => window.removeEventListener('refresh-notifications', handler);
  }, []);

  // Auto-close notification panel after 7 seconds
  useEffect(() => {
    let timer;
    if (isOpen) {
      timer = setTimeout(() => {
        setIsOpen(false);
      }, 7000);
    }
    return () => clearTimeout(timer);
  }, [isOpen]);

  const handleMarkAsRead = async (notificationId) => {
    try {
      await api.patch(`/api/notifications/${notificationId}/read`);
      fetchNotifications();
      toast.success('Notification marked as read');
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
      toast.error('Failed to mark notification as read');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.patch('/api/notifications/read-all');
      setNotifications([]);
      setUnreadCount(0);
      setHasNewNotification(false);
      toast.success('All notifications marked as read');
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
      toast.error('Failed to mark all notifications as read');
    }
  };

  const handleEnableNotifications = async () => {
    try {
      const results = await notificationManager.requestPermission();
      
      if (results.oneSignal || results.legacy) {
        toast.success('Notifications enabled successfully!');
        setShowPermissionBanner(false);
        
        // Update status
        setNotificationStatus(notificationManager.getStatus());
      } else {
        toast.error('Please enable notifications in your browser settings');
      }
    } catch (error) {
      console.error('Error enabling notifications:', error);
      toast.error('Failed to enable notifications. Please try again.');
    }
  };

  const handleTestNotification = async () => {
    try {
      const sent = await notificationManager.sendTestNotification();
      if (sent) {
        toast.success('Test notification sent successfully!');
      } else {
        toast.error('Failed to send test notification');
      }
    } catch (error) {
      console.error('Error sending test notification:', error);
      toast.error('Failed to send test notification');
    }
  };

  return (
    <>
      <NotificationPermission />
      <div className="fixed top-4 right-4 z-50">
        <button
          onClick={() => {
            setIsOpen(!isOpen);
            setHasNewNotification(false);
          }}
          className="relative p-2 text-gray-600 hover:text-blue-600 transition-colors duration-200 bg-white rounded-full shadow-md hover:shadow-lg"
        >
          <motion.div
            animate={hasNewNotification ? {
              scale: [1, 1.2, 1],
              rotate: [0, 10, -10, 0],
            } : {}}
            transition={{
              duration: 0.5,
              repeat: hasNewNotification ? Infinity : 0,
              repeatDelay: 1
            }}
          >
            <BellIcon className="h-6 w-6" />
          </motion.div>
          {unreadCount > 0 && (
            <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-500 rounded-full">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200"
            >
              <div className="p-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
                  {notifications.length > 0 && (
                    <button
                      onClick={handleMarkAllAsRead}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      Mark all as read
                    </button>
                  )}
                </div>
                
                {/* Notification System Status */}
                {notificationStatus && (
                  <div className="mb-3 p-2 bg-gray-50 rounded text-xs">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">System Status:</span>
                      <div className="flex gap-2">
                        {notificationStatus.oneSignal && (
                          <span className="px-2 py-1 bg-green-100 text-green-800 rounded">OneSignal</span>
                        )}
                        {notificationStatus.legacy && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">Legacy</span>
                        )}
                        {notificationStatus.socket && (
                          <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded">Socket</span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                
                {isLoading ? (
                  <div className="flex justify-center items-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-gray-500 mb-4">No new notifications</p>
                    <div className="space-y-2">
                      <button
                        onClick={handleEnableNotifications}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        Enable Notifications
                      </button>
                      {notificationStatus?.oneSignal && (
                        <button
                          onClick={handleTestNotification}
                          className="block w-full text-sm text-green-600 hover:text-green-800"
                        >
                          Send Test Notification
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {notifications.map((notification) => (
                      <div
                        key={notification._id}
                        className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                        onClick={() => handleMarkAsRead(notification._id)}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h4 className="text-sm font-medium text-gray-900">
                              {notification.title}
                            </h4>
                            <p className="text-xs text-gray-600 mt-1">
                              {notification.message}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              {new Date(notification.createdAt).toLocaleString()}
                            </p>
                          </div>
                          {!notification.isRead && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full ml-2"></div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};

export default NotificationBell; 