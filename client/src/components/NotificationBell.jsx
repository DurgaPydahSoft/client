import React, { useState, useEffect, useMemo } from 'react';
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
  const [nextMealTime, setNextMealTime] = useState(null);
  const { user } = useAuth();

  // TEMPORARILY DISABLED: Hide notification bell completely for wardens to prevent 500 errors
  if (!user || user?.role === 'warden') {
    return null;
  }

  // Safari detection - memoized to prevent unnecessary re-renders
  const isSafari = useMemo(() => /^((?!chrome|android).)*safari/i.test(navigator.userAgent), []);

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'sub_admin';
  const isWarden = user?.role === 'warden';
  const isPrincipal = user?.role === 'principal';

  const fetchNotifications = async () => {
    // TEMPORARILY DISABLED: Notification API calls for warden to prevent 500 errors
    if (isWarden) {
      console.log('🔔 NotificationBell: Notifications temporarily disabled for warden role');
      setNotifications([]);
      setUnreadCount(0);
      setHasNewNotification(false);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      let endpointPrefix;
      if (isAdmin) {
        endpointPrefix = '/api/notifications/admin';
        console.log('🔔 NotificationBell: Fetching notifications for role: admin');
      } else if (isWarden) {
        endpointPrefix = '/api/notifications/warden';
        console.log('🔔 NotificationBell: Fetching notifications for role: warden');
      } else if (isPrincipal) {
        endpointPrefix = '/api/notifications/principal';
        console.log('🔔 NotificationBell: Fetching notifications for role: principal');
      } else {
        endpointPrefix = '/api/notifications';
        console.log('🔔 NotificationBell: Fetching notifications for role: student');
      }

      // Safari-specific timeout handling
      const timeoutDuration = isSafari ? 45000 : 30000;
      
      const [notificationsRes, countRes] = await Promise.allSettled([
        Promise.race([
          api.get(`${endpointPrefix}/unread`),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Request timeout')), timeoutDuration)
          )
        ]).catch(err => {
          console.error(`🔔 NotificationBell: Error fetching unread notifications:`, err);
          throw err;
        }),
        Promise.race([
          api.get(`${endpointPrefix}/count`),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Request timeout')), timeoutDuration)
          )
        ]).catch(err => {
          console.error(`🔔 NotificationBell: Error fetching notification count:`, err);
          throw err;
        })
      ]);

      console.log('🔔 NotificationBell: Responses:', { 
        notificationsRes: notificationsRes.status === 'fulfilled' ? notificationsRes.value.data : 'Failed',
        countRes: countRes.status === 'fulfilled' ? countRes.value.data : 'Failed'
      });

      if (notificationsRes.status === 'fulfilled' && notificationsRes.value.data.success) {
        const newNotifications = notificationsRes.value.data.data;
        setNotifications(newNotifications);
        if (newNotifications.length > 0) {
          setHasNewNotification(true);
        }
      }

      if (countRes.status === 'fulfilled' && countRes.value.data.success) {
        const newCount = countRes.value.data.count;
        if (newCount > unreadCount) {
          setHasNewNotification(true);
        }
        setUnreadCount(newCount);
      }
    } catch (err) {
      console.error('🔔 NotificationBell: Failed to fetch notifications:', err);
      
      // Safari-specific error handling
      if (isSafari) {
        console.log('🦁 Safari notification error - setting defaults');
      }
      
      // Check if it's a network/CORS error
      if (err.message === 'Network Error' || err.code === 'ERR_NETWORK') {
        console.log('🔔 Network error detected - server might be down or CORS issue');
      }
      
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
      browser: typeof Notification !== 'undefined' ? Notification.permission : 'not-supported',
      oneSignal: typeof Notification !== 'undefined' ? Notification.permission : 'not-supported' // Use browser permission as fallback
    };

    // For now, avoid OneSignal permission API to prevent crashes
    // We'll rely on browser permission status
    setPermissionStatus(status);
  };

  useEffect(() => {
    fetchNotifications();
    checkPermissionStatus();
    setNotificationStatus(notificationManager.getStatus());

    // Set up polling for real-time updates (disabled for wardens)
    let pollInterval;
    if (!isWarden) {
      pollInterval = setInterval(fetchNotifications, 30000); // 30 seconds
    }

    // Listen for push-triggered refresh (disabled for wardens)
    const handler = () => {
      if (!isWarden) {
        fetchNotifications();
      }
    };
    window.addEventListener('refresh-notifications', handler);

    // Set up menu notification timer for students
    let menuInterval;
    if (user?.role === 'student') {
      updateNextMealTime();
      menuInterval = setInterval(updateNextMealTime, 60000); // Update every minute
    }

    return () => {
      if (pollInterval) clearInterval(pollInterval);
      if (menuInterval) clearInterval(menuInterval);
      window.removeEventListener('refresh-notifications', handler);
    };
  }, [user]);

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

  // Update next meal time
  const updateNextMealTime = () => {
    const nextMeal = notificationManager.getNextMealTime();
    setNextMealTime(nextMeal);
  };

  const handleMarkAsRead = async (notificationId) => {
    // TEMPORARILY DISABLED: Notification actions for warden to prevent 500 errors
    if (isWarden) {
      console.log('🔔 NotificationBell: Mark as read temporarily disabled for warden role');
      toast.info('Notifications temporarily disabled for warden role');
      return;
    }

    try {
      let route;
      if (isAdmin) {
        route = `/api/notifications/admin/${notificationId}/read`;
      } else if (isWarden) {
        route = `/api/notifications/warden/${notificationId}/read`;
      } else if (isPrincipal) {
        route = `/api/notifications/principal/${notificationId}/read`;
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
    // TEMPORARILY DISABLED: Notification actions for warden to prevent 500 errors
    if (isWarden) {
      console.log('🔔 NotificationBell: Mark all as read temporarily disabled for warden role');
      toast.info('Notifications temporarily disabled for warden role');
      return;
    }

    try {
      let route;
      if (isAdmin) {
        route = '/api/notifications/admin/read-all';
      } else if (isWarden) {
        route = '/api/notifications/warden/read-all';
      } else if (isPrincipal) {
        route = '/api/notifications/principal/read-all';
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
        if (typeof Notification !== 'undefined') {
        if (Notification.permission === 'denied') {
          toast.error('Notifications are blocked. Please enable them in your browser settings and refresh the page.');
        } else if (Notification.permission === 'default') {
          toast.error('Please allow notifications when prompted by your browser.');
          }
        } else {
          toast.error('Notifications are not supported in this browser.');
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
          if (typeof Notification !== 'undefined') {
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
          } else {
            console.error('🔔 Notification API not supported in this browser');
            toast.error('Notifications are not supported in this browser.');
            checkPermissionStatus();
          }
        }
      } else {
        // Fallback to browser notification API
        if (typeof Notification !== 'undefined') {
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
        } else {
          console.error('🔔 Notification API not supported in this browser');
          toast.error('Notifications are not supported in this browser.');
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
      case 'foundlost':
        return '🔍';
      case 'system':
        return '🔔';
      default:
        return '📌';
    }
  };

  // Manual trigger for menu notifications (for testing)
  const handleTriggerMenuNotification = async (mealType) => {
    try {
      console.log(`🔔 Manually triggering ${mealType} menu notification...`);
      await notificationManager.sendMenuNotification(mealType);
      toast.success(`${mealType.charAt(0).toUpperCase() + mealType.slice(1)} notification sent!`);
    } catch (error) {
      console.error(`🔔 Error triggering ${mealType} notification:`, error);
      toast.error(`Failed to send ${mealType} notification`);
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
                
                {/* Notification List */}
                <div className="max-h-96 overflow-y-auto">
                  {notifications.length > 0 ? (
                    notifications.map((notification) => (
                      <div
                        key={notification._id}
                        className={`p-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${
                          !notification.isRead ? 'bg-blue-50' : ''
                        }`}
                        onClick={() => handleMarkAsRead(notification._id)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">
                              {notification.title}
                            </p>
                            <p className="text-xs text-gray-600 mt-1">
                              {notification.message}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              {formatNotificationTime(notification.createdAt)}
                            </p>
                          </div>
                          {!notification.isRead && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full ml-2"></div>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-gray-500 text-sm">
                      No notifications
                    </div>
                  )}
                </div>

                {/* Menu Notification Section for Students */}
                
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};

export default NotificationBell; 