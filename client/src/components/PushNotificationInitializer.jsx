import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import notificationManager from '../utils/notificationManager';
import { toast } from 'react-hot-toast';

const PushNotificationInitializer = () => {
  const { user } = useAuth();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (!user || isInitialized) {
      return;
    }

    const initializeNotifications = async () => {
      try {
        console.log('🔔 PushNotificationInitializer: Setting up for user:', user._id);
        
        // Wait for OneSignal to be available (already initialized in HTML)
        let attempts = 0;
        const maxAttempts = 50; // Wait up to 5 seconds
        
        while (typeof OneSignal === 'undefined' && attempts < maxAttempts) {
          console.log('🔔 PushNotificationInitializer: Waiting for OneSignal...', attempts + 1);
          await new Promise(resolve => setTimeout(resolve, 100));
          attempts++;
        }

        if (typeof OneSignal === 'undefined') {
          console.log('🔔 PushNotificationInitializer: OneSignal not available, using database notifications only.');
          setIsInitialized(true);
          return;
        }

        // OneSignal is already initialized in HTML, just set up user and listeners
        console.log('🔔 PushNotificationInitializer: OneSignal available, setting up user and listeners...');
        
        // Wait for OneSignal to be fully ready
        attempts = 0;
        while (attempts < 30) {
          try {
            if (OneSignal && OneSignal.User && OneSignal.Notifications) {
              console.log('🔔 PushNotificationInitializer: OneSignal is ready');
              break;
            }
            console.log('🔔 PushNotificationInitializer: Waiting for OneSignal to be ready...', attempts + 1);
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
          } catch (error) {
            console.log('🔔 PushNotificationInitializer: OneSignal not ready yet...', attempts + 1);
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
          }
        }

        if (attempts >= 30) {
          console.warn('🔔 PushNotificationInitializer: OneSignal initialization timeout');
          setIsInitialized(true);
          return;
        }

        // Set user ID for OneSignal (External User ID)
        try {
          console.log('🔔 PushNotificationInitializer: Setting external user ID:', user._id);
          await OneSignal.login(user._id);
          console.log('🔔 PushNotificationInitializer: External user ID set successfully');
        } catch (error) {
          console.warn('🔔 PushNotificationInitializer: Could not set external user ID:', error);
        }

        // Check for permission and subscribe if needed
        try {
          const permission = await OneSignal.Notifications.permission;
          console.log('🔔 PushNotificationInitializer: Current permission status:', permission);
          
          if (permission !== 'granted') {
            console.log('🔔 PushNotificationInitializer: Requesting notification permission...');
            const newPermission = await OneSignal.Notifications.requestPermission();
            console.log('🔔 PushNotificationInitializer: Permission result:', newPermission);
            
            if (newPermission) {
              console.log('🔔 PushNotificationInitializer: Permission granted successfully');
            } else {
              console.log('🔔 PushNotificationInitializer: Permission denied');
            }
          } else {
            console.log('🔔 PushNotificationInitializer: Permission already granted');
          }
        } catch (error) {
          console.warn('🔔 PushNotificationInitializer: Could not request permission:', error);
        }

        // Set up notification listeners
        try {
          // Notification click handler
          OneSignal.Notifications.addEventListener('click', (event) => {
            console.log('🔔 Notification clicked:', event);
            const url = event.notification?.additionalData?.url;
            if (url) {
              window.location.href = url;
            }
          });

          // Foreground notification handler
          OneSignal.Notifications.addEventListener('foregroundWillDisplay', (event) => {
            console.log('🔔 Foreground notification received:', event);
            
            // Show toast notification
            toast.success(event.notification.title, {
              id: event.notification.rawPayload?.custom?.i || 'notification',
              duration: 5000,
            });
            
            // Trigger notification refresh
            window.dispatchEvent(new CustomEvent('refresh-notifications'));
          });

          // Permission change handler
          OneSignal.Notifications.addEventListener('permissionChange', (event) => {
            console.log('🔔 Permission changed:', event);
            // Trigger notification refresh
            window.dispatchEvent(new CustomEvent('refresh-notifications'));
          });

          console.log('🔔 PushNotificationInitializer: Notification listeners set up successfully');
        } catch (error) {
          console.warn('🔔 PushNotificationInitializer: Could not set up listeners:', error);
        }

        // Initialize notification manager
        try {
          await notificationManager.initialize(user._id);
          console.log('🔔 PushNotificationInitializer: Notification manager initialized');
        } catch (error) {
          console.warn('🔔 PushNotificationInitializer: Could not initialize notification manager:', error);
        }

        setIsInitialized(true);
        console.log('🔔 PushNotificationInitializer: Setup completed successfully');

      } catch (error) {
        console.error('🔔 PushNotificationInitializer: Error setting up notifications:', error);
        console.log('🔔 PushNotificationInitializer: Using database notifications only.');
        setIsInitialized(true);
      }
    };

    // Delay initialization slightly to ensure OneSignal is ready
    const timer = setTimeout(initializeNotifications, 1000);
    return () => clearTimeout(timer);

  }, [user, isInitialized]);

  return null; // This component doesn't render anything
};

export default PushNotificationInitializer; 