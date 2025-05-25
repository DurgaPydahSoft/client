import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  checkNotificationSupport,
  registerServiceWorker,
  requestNotificationPermission,
  subscribeToPushNotifications,
  canReenableNotifications,
  getBrowserInstructions
} from '../utils/pushNotifications';

const PushNotificationInitializer = () => {
  const { user } = useAuth();
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const initializePushNotifications = async () => {
      try {
        // Only initialize for authenticated users
        if (!user) {
          console.log('User not authenticated, skipping push notification initialization');
          return;
        }

        // Check if browser supports notifications
        if (!checkNotificationSupport()) {
          console.log('Push notifications not supported in this browser');
          return;
        }

        // Register service worker
        const registration = await registerServiceWorker();
        if (!registration) {
          console.log('Service worker registration failed');
          return;
        }

        // Request notification permission
        const permissionGranted = await requestNotificationPermission();
        if (!permissionGranted) {
          console.log('Notification permission not granted');
          return;
        }

        // Subscribe to push notifications
        const subscription = await subscribeToPushNotifications(registration);
        if (!subscription) {
          console.log('Failed to subscribe to push notifications');
          return;
        }

        console.log('Push notifications initialized successfully');
        setIsInitialized(true);
      } catch (error) {
        console.warn('Error initializing push notifications:', error);
        setError(error.message);
      }
    };

    initializePushNotifications();
  }, [user]);

  // Don't render anything - this is a background component
  return null;
};

export default PushNotificationInitializer; 