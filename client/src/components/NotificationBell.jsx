import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { BellIcon } from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../utils/axios';
import { toast } from 'react-hot-toast';
import notificationManager from '../utils/notificationManager';

const NotificationBell = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasNewNotification, setHasNewNotification] = useState(false);
  const [notificationStatus, setNotificationStatus] = useState(null);
  const [permissionStatus, setPermissionStatus] = useState(null);
  const { user } = useAuth();

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'sub_admin';
  const isWarden = user?.role === 'warden';

  const fetchNotifications = async () => {
    try {
      setIsLoading(true);
      let endpointPrefix;
      if (isAdmin) {
        endpointPrefix = '/api/notifications/admin';
        console.log('🔔 NotificationBell: Fetching notifications for role: admin');
      } else if (isWarden) {
        endpointPrefix = '/api/notifications/warden';
        console.log('🔔 NotificationBell: Fetching notifications for role: warden');
      } else {
        endpointPrefix = '/api/notifications';
        console.log('🔔 NotificationBell: Fetching notifications for role: student');
      }

      const [notificationsRes, countRes] = await Promise.all([
        api.get(`${endpointPrefix}/unread`),
        api.get(`${endpointPrefix}/count`)
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
    } finally {
      setIsLoading(false);
    }
  };

  // Check current permission status
  const checkPermissionStatus = () => {
    const status = {
      browser: Notification.permission,
      oneSignal: Notification.permission // Use browser permission as fallback
    };

    // For now, avoid OneSignal permission API to prevent crashes
    // We'll rely on browser permission status
    setPermissionStatus(status);
  };

  useEffect(() => {
    fetchNotifications();
    const handler = () => fetchNotifications();
    window.addEventListener('refresh-notifications', handler);
    
    // Get notification system status
    const status = notificationManager.getStatus();
    setNotificationStatus(status);
    
    // Check permission status
    checkPermissionStatus();
    
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
      let route;
      if (isAdmin) {
        route = `/api/notifications/admin/${notificationId}/read`;
      } else if (isWarden) {
        route = `/api/notifications/warden/${notificationId}/read`;
      } else {
        route = `/api/notifications/${notificationId}/read`;
      }
      
      await api.patch(route);
      fetchNotifications();
      toast.success('Notification marked as read');
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
      toast.error('Failed to mark notification as read');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      let route;
      if (isAdmin) {
        route = '/api/notifications/admin/read-all';
      } else if (isWarden) {
        route = '/api/notifications/warden/read-all';
      } else {
        route = '/api/notifications/read-all';
      }
      
      await api.patch(route);
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
        
        // Update status
        setNotificationStatus(notificationManager.getStatus());
        
        // Refresh notifications and permission status
        fetchNotifications();
        checkPermissionStatus();
      } else {
        toast.error('Please enable notifications in your browser settings');
        
        // Show helpful instructions
        if (Notification.permission === 'denied') {
          toast.error('Notifications are blocked. Please enable them in your browser settings and refresh the page.');
        } else if (Notification.permission === 'default') {
          toast.error('Please allow notifications when prompted by your browser.');
        }
      }
    } catch (error) {
      console.error('Error enabling notifications:', error);
      toast.error('Failed to enable notifications. Please try again.');
    }
  };

  const handleManualPermissionRequest = async () => {
    try {
      console.log('🔔 Manually requesting notification permission...');
      
      // Check if OneSignal is available
      if (typeof OneSignal !== 'undefined' && OneSignal.Notifications) {
        try {
          const permission = await OneSignal.Notifications.requestPermission();
          console.log('🔔 Manual permission request result:', permission);
          
          if (permission) {
            toast.success('Notification permission granted!');
            setNotificationStatus(notificationManager.getStatus());
            fetchNotifications();
            checkPermissionStatus();
          } else {
            toast.error('Permission denied. Please enable notifications in browser settings.');
            checkPermissionStatus();
          }
        } catch (oneSignalError) {
          console.warn('🔔 OneSignal permission request failed, trying browser API:', oneSignalError);
          // Fallback to browser notification API
          try {
            const permission = await Notification.requestPermission();
            console.log('🔔 Browser permission request result:', permission);
            
            if (permission === 'granted') {
              toast.success('Notification permission granted!');
              setNotificationStatus(notificationManager.getStatus());
              fetchNotifications();
              checkPermissionStatus();
            } else {
              toast.error('Permission denied. Please enable notifications in browser settings.');
              checkPermissionStatus();
            }
          } catch (browserError) {
            console.error('🔔 Browser permission request also failed:', browserError);
            toast.error('Failed to request notification permission. Please try again.');
            checkPermissionStatus();
          }
        }
      } else {
        // Fallback to browser notification API
        try {
          const permission = await Notification.requestPermission();
          console.log('🔔 Browser permission request result:', permission);
          
          if (permission === 'granted') {
            toast.success('Notification permission granted!');
            setNotificationStatus(notificationManager.getStatus());
            fetchNotifications();
            checkPermissionStatus();
          } else {
            toast.error('Permission denied. Please enable notifications in browser settings.');
            checkPermissionStatus();
          }
        } catch (browserError) {
          console.error('🔔 Browser permission request failed:', browserError);
          toast.error('Failed to request notification permission. Please try again.');
          checkPermissionStatus();
        }
      }
    } catch (error) {
      console.error('🔔 Error in handleManualPermissionRequest:', error);
      toast.error('Failed to request notification permission. Please try again.');
    }
  };

  const handleTestNotification = async () => {
    try {
      console.log('🔔 Testing notification system...');
      const sent = await notificationManager.sendTestNotification();
      if (sent) {
        toast.success('Test notification sent successfully! Check your browser for push notification.');
        console.log('🔔 Test notification sent successfully');
      } else {
        toast.error('Failed to send test notification. Check console for details.');
        console.error('🔔 Failed to send test notification');
      }
    } catch (error) {
      console.error('🔔 Error sending test notification:', error);
      toast.error('Failed to send test notification');
    }
  };

  const handleTestPushNotification = async () => {
    try {
      console.log('🔔 Testing OneSignal push notification...');
      const sent = await notificationManager.sendTestPushNotification();
      if (sent) {
        toast.success('Test push notification sent successfully! Check your browser for push notification.');
        console.log('🔔 Test push notification sent successfully');
      } else {
        toast.error('Failed to send test push notification. Check console for details.');
        console.error('🔔 Failed to send test push notification');
      }
    } catch (error) {
      console.error('🔔 Error sending test push notification:', error);
      toast.error('Failed to send test push notification');
    }
  };

  const handleTestOneSignalConnection = async () => {
    try {
      console.log('🔔 Testing OneSignal connection...');
      const result = await notificationManager.testOneSignalConnection();
      if (result.success) {
        toast.success('OneSignal connection test successful!');
        console.log('🔔 OneSignal connection test successful:', result);
      } else {
        toast.error('OneSignal connection test failed. Check console for details.');
        console.error('🔔 OneSignal connection test failed:', result);
      }
    } catch (error) {
      console.error('🔔 Error testing OneSignal connection:', error);
      toast.error('Failed to test OneSignal connection');
    }
  };

  const formatNotificationTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'complaint':
        return '📝';
      case 'announcement':
        return '📢';
      case 'poll':
        return '📊';
      case 'leave':
        return '🏠';
      case 'system':
        return '🔔';
      default:
        return '📌';
    }
  };

  return (
    <>
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
                
                {notifications.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-gray-500 mb-4">No new notifications</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {notifications.map((notification) => (
                      <div
                        key={notification._id}
                        className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                        onClick={() => handleMarkAsRead(notification._id)}
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-lg">{getNotificationIcon(notification.type)}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {notification.message}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {formatNotificationTime(notification.createdAt)}
                            </p>
                          </div>
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