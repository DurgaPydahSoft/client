import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import notificationManager from '../utils/notificationManager';
import { toast } from 'react-hot-toast';

// Improved iOS/Safari detection
const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
const isIOSSafari = isSafari && isIOS;
const isIOSChrome = /CriOS/.test(navigator.userAgent);

const PushNotificationInitializer = () => {
  const { user } = useAuth();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (!user || isInitialized) {
      return;
    }

    const initializeNotifications = async () => {
      // Skip OneSignal initialization for iOS Safari only (not iOS Chrome)
      if (isIOSSafari && !isIOSChrome) {
        console.log('🦁 iOS Safari detected - skipping OneSignal initialization');
        console.log('🦁 Notifications will use database fallback only');
        setIsInitialized(true);
        return;
      }

      if (!user || !OneSignal) return;

      // Check if OneSignal is properly loaded
      if (typeof OneSignal === 'undefined' || !OneSignal.login) {
        console.warn('🔔 PushNotificationInitializer: OneSignal not properly loaded, using database notifications only');
        setIsInitialized(true);
        return;
      }

      console.log('🔔 PushNotificationInitializer: Starting initialization for user:', user.email);
      
      // Add a small delay to ensure OneSignal is fully loaded
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Add global error handler for OneSignal SDK errors
      const originalError = console.error;
      console.error = (...args) => {
        const errorMessage = args.join(' ');
        if (errorMessage.includes('forceDeltaQueueProcessingOnAllExecutors')) {
          console.warn('🔔 OneSignal SDK internal error (suppressed):', ...args);
          return;
        }
        originalError.apply(console, args);
      };

      try {
      //  console.log('🔔 PushNotificationInitializer: Setting up for user');
        
        // Get user ID
        const userId = user.id || user._id || user.email;
      //  console.log('🔔 PushNotificationInitializer: Using user ID:', userId);

        // Initialize OneSignal with error handling
        let oneSignalInitialized = false;
        try {
          // Check if OneSignal SDK is in a stable state
          if (!OneSignal.User || !OneSignal.Notifications) {
            console.warn('🔔 PushNotificationInitializer: OneSignal SDK not in stable state, skipping initialization');
            oneSignalInitialized = false;
          } else {
            // Set user ID for OneSignal (External User ID)
            if (userId && typeof userId === 'string' && userId.trim() !== '') {
            //  console.log('🔔 PushNotificationInitializer: Setting external user ID:', userId);
              
              // Wrap OneSignal login in additional error handling
              try {
                // Add timeout to prevent hanging
                const loginPromise = OneSignal.login(userId);
                const timeoutPromise = new Promise((_, reject) => 
                  setTimeout(() => reject(new Error('OneSignal login timeout')), 5000)
                );
                
                await Promise.race([loginPromise, timeoutPromise]);
              //  console.log('🔔 PushNotificationInitializer: External user ID set successfully');
                oneSignalInitialized = true;
              } catch (loginError) {
                // This is a known OneSignal SDK v16 internal error that doesn't break functionality
                if (loginError.message && loginError.message.includes('forceDeltaQueueProcessingOnAllExecutors')) {
                  console.warn('🔔 PushNotificationInitializer: OneSignal SDK internal error (non-critical):', loginError.message);
                //  console.log('🔔 PushNotificationInitializer: This error is known and doesn\'t affect functionality');
                  oneSignalInitialized = true; // Consider it initialized even with this error
                } else {
                 // console.warn('🔔 PushNotificationInitializer: OneSignal login error:', loginError);
                  oneSignalInitialized = false;
                }
              }
            } else {
              console.warn('🔔 PushNotificationInitializer: Invalid user ID for OneSignal:', userId);
             // console.log('🔔 PushNotificationInitializer: User ID type:', typeof userId);
             // console.log('🔔 PushNotificationInitializer: User ID value:', userId);
              oneSignalInitialized = false;
            }
          }
        } catch (error) {
         // console.warn('🔔 PushNotificationInitializer: Could not set external user ID:', error);
          oneSignalInitialized = false;
        }

        // Initialize notification manager
        try {
          await notificationManager.initialize(userId);
         // console.log('🔔 PushNotificationInitializer: Notification manager initialized');
          
          // Initialize menu notifications for students
          if (user.role === 'student') {
          //  console.log('🔔 PushNotificationInitializer: Initializing menu notifications for student');
            notificationManager.initializeMenuNotifications();
          }
        } catch (error) {
          console.warn('🔔 PushNotificationInitializer: Could not initialize notification manager:', error);
         // console.log('🔔 PushNotificationInitializer: Using database notifications only');
        }

        // Set up notification listeners only if OneSignal was initialized successfully
        if (oneSignalInitialized) {
          try {
            // Notification click handler
            OneSignal.Notifications.addEventListener('click', (event) => {
            //  console.log('🔔 Notification clicked:', event);
              const url = event.notification?.additionalData?.url;
              if (url) {
                // Check if user is authenticated
                const token = localStorage.getItem('token');
                const user = localStorage.getItem('user');
                
                if (!token || !user) {
                  // User not authenticated, redirect to login page
                //  console.log('🔔 User not authenticated, redirecting to login page');
                  window.location.href = '/login';
                } else {
                  // User is authenticated, redirect to the intended URL
                  console.log('🔔 User authenticated, redirecting to:', url);
                  window.location.href = url;
                }
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

           // console.log('🔔 PushNotificationInitializer: Notification listeners set up successfully');
          } catch (error) {
            console.warn('🔔 PushNotificationInitializer: Could not set up listeners:', error);
         //   console.log('🔔 PushNotificationInitializer: Using database notifications only');
          }
        } else {
         // console.log('🔔 PushNotificationInitializer: OneSignal not initialized, using database notifications only');
        }

        setIsInitialized(true);
       // console.log('🔔 PushNotificationInitializer: Initialization completed successfully');
      } catch (error) {
        console.error('🔔 PushNotificationInitializer: Initialization failed:', error);
        // console.log('🔔 PushNotificationInitializer: Falling back to database notifications only');
        setIsInitialized(true);
      } finally {
        // Restore original console.error
        console.error = originalError;
      }
    };

    // Delay initialization slightly to ensure OneSignal is ready
    const timer = setTimeout(initializeNotifications, 1000);
    return () => {
      clearTimeout(timer);
      // Clean up menu notification timers
      if (user?.role === 'student') {
        notificationManager.clearMenuNotificationTimers();
      }
    };

  }, [user, isInitialized]);

  return null; // This component doesn't render anything
};

export default PushNotificationInitializer; 