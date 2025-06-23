import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import notificationManager from '../utils/notificationManager';

const PushNotificationInitializer = () => {
  const { user } = useAuth();
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    const initializeNotifications = async () => {
      try {
        // Only initialize for authenticated users
        if (!user) {
          console.log('🔔 PushNotificationInitializer: User not authenticated, skipping initialization');
          return;
        }

        console.log('🔔 PushNotificationInitializer: Starting initialization for user:', user.name);
        
        // Initialize the hybrid notification manager
        const initStatus = await notificationManager.initialize(user);
        setStatus(initStatus);
        
        if (initStatus.oneSignal || initStatus.legacy || initStatus.socket) {
          console.log('🔔 PushNotificationInitializer: Notification systems initialized successfully');
          setIsInitialized(true);
          
          // Set up notification click handler
          notificationManager.setupNotificationClickHandler((event) => {
            console.log('🔔 Notification clicked:', event);
            // Handle notification clicks here
            // You can navigate to specific pages based on notification type
            if (event.data?.url) {
              window.location.href = event.data.url;
            }
          });
        } else {
          console.warn('🔔 PushNotificationInitializer: No notification systems were initialized');
          setError('No notification systems available');
        }
      } catch (error) {
        console.error('🔔 PushNotificationInitializer: Error initializing notifications:', error);
        setError(error.message);
      }
    };

    initializeNotifications();

    // Cleanup function
    return () => {
      notificationManager.cleanup();
    };
  }, [user]);

  // Don't render anything - this is a background component
  return null;
};

export default PushNotificationInitializer; 