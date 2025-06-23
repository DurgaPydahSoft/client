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
        
        // Set user ID for OneSignal
        try {
          await OneSignal.login(user._id);
          console.log('🔔 PushNotificationInitializer: User ID set for OneSignal');
        } catch (error) {
          console.warn('🔔 PushNotificationInitializer: Could not set user ID:', error);
        }

        // Check for permission and subscribe if needed
        try {
          const permission = await OneSignal.Notifications.permission;
          if (permission !== 'granted') {
            console.log('🔔 PushNotificationInitializer: Requesting notification permission...');
            await OneSignal.Notifications.requestPermission();
          }
        } catch (error) {
          console.warn('🔔 PushNotificationInitializer: Could not request permission:', error);
        }

        // Set up notification listeners
        try {
          OneSignal.Notifications.addEventListener('click', (event) => {
            console.log('🔔 Notification clicked:', event);
            const url = event.notification?.additionalData?.url;
            if (url) {
              window.location.href = url;
            }
          });

          OneSignal.Notifications.addEventListener('foregroundWillDisplay', (event) => {
            console.log('🔔 Foreground notification received:', event);
            toast.success(event.notification.title, {
              id: event.notification.rawPayload.custom.i,
            });
            window.dispatchEvent(new CustomEvent('refresh-notifications'));
          });

          console.log('🔔 PushNotificationInitializer: Notification listeners set up successfully');
        } catch (error) {
          console.warn('🔔 PushNotificationInitializer: Could not set up listeners:', error);
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

  return null; // This component does not render anything
};

export default PushNotificationInitializer; 