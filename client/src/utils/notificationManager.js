import { toast } from 'react-hot-toast';

// OneSignal configuration
const ONESIGNAL_APP_ID = import.meta.env.VITE_ONESIGNAL_APP_ID;

// Improved iOS/Safari detection
const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
const isIOSSafari = isSafari && isIOS;
const isIOSChrome = /CriOS/.test(navigator.userAgent);

class NotificationManager {
  constructor() {
    this.oneSignal = null;
    this.isInitialized = false;
    this.isSubscribed = false;
    this.userId = null;
    
    console.log('🔔 NotificationManager initialized');
    console.log('🔔 Environment variables check:');
    console.log('  - VITE_ONESIGNAL_APP_ID:', ONESIGNAL_APP_ID ? `✅ "${ONESIGNAL_APP_ID}"` : '❌ Not set');
    console.log('  - VITE_API_URL:', import.meta.env.VITE_API_URL ? `✅ "${import.meta.env.VITE_API_URL}"` : '❌ Not set');
    console.log('  - NODE_ENV:', import.meta.env.MODE);
    console.log('  - Browser Safari:', isSafari ? '🦁 Yes' : '❌ No');
    
    if (isIOSSafari && !isIOSChrome) {
      console.log('🦁 iOS Safari detected - OneSignal will be disabled');
      console.log('🦁 Notifications will use database fallback only');
      this.isInitialized = true; // Mark as initialized to prevent retries
      return;
    }
    
    if (!ONESIGNAL_APP_ID) {
      console.warn('🔔 OneSignal App ID is not configured!');
      console.warn('🔔 To enable OneSignal push notifications:');
      console.warn('🔔 1. Create a OneSignal account at https://onesignal.com');
      console.warn('🔔 2. Create a new app and get your App ID');
      console.warn('🔔 3. Create a .env file in the client directory');
      console.warn('🔔 4. Add: VITE_ONESIGNAL_APP_ID=your-app-id-here');
      console.warn('🔔 5. Restart your development server');
    } else {
      console.log('🔔 OneSignal App ID is configured correctly!');
    }
  }

  // Initialize OneSignal
  async initialize(userId = null) {
    try {
      if (this.isInitialized) {
        console.log('🔔 NotificationManager already initialized');
        return true;
      }

      // Skip OneSignal initialization for iOS Safari only (not iOS Chrome)
      if (isIOSSafari && !isIOSChrome) {
        console.log('🦁 iOS Safari detected - skipping OneSignal initialization');
        console.log('🦁 Notifications will use database fallback only');
        this.isInitialized = true;
        return false;
      }

      if (!ONESIGNAL_APP_ID) {
        console.warn('🔔 OneSignal App ID not configured - notifications will use database only');
        console.warn('🔔 To enable OneSignal, set VITE_ONESIGNAL_APP_ID in your .env file');
        this.isInitialized = true; // Mark as initialized to prevent repeated attempts
        return false;
      }

      // Check if OneSignal is already available and initialized
      if (typeof OneSignal !== 'undefined' && OneSignal.User && OneSignal.Notifications) {
        console.log('🔔 OneSignal SDK v16 already available, using existing instance');
        this.oneSignal = OneSignal;
        this.isInitialized = true;
        
        // Set external user ID if provided
        if (userId) {
          await this.setUserId(userId);
        }
        
        return true;
      }

      // Wait for OneSignal to be available (using the new v16 deferred pattern)
      let attempts = 0;
      const maxAttempts = 100; // Wait up to 10 seconds (100 * 100ms)
      
      while (typeof OneSignal === 'undefined' && attempts < maxAttempts) {
        console.log('🔔 Waiting for OneSignal SDK v16 to load...', attempts + 1);
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }

      // Check if OneSignal is available
      if (typeof OneSignal === 'undefined') {
        console.warn('🔔 OneSignal SDK v16 not loaded after 10 seconds - notifications will use database only');
        console.warn('🔔 This could be due to network issues, firewall blocking, or CDN problems');
        console.warn('🔔 Check browser console for any script loading errors');
        this.isInitialized = true; // Mark as initialized to prevent repeated attempts
        return false;
      }

      console.log('🔔 OneSignal SDK v16 loaded, checking initialization...');

      // Wait for OneSignal to be fully initialized
      attempts = 0;
      while (attempts < 150) { // Wait up to 15 seconds
        try {
          // Check if OneSignal is ready using multiple methods
          if (OneSignal && OneSignal.isInitialized && OneSignal.isInitialized()) {
            console.log('🔔 OneSignal SDK v16 is ready (isInitialized check)');
            break;
          }
          
          // Alternative check for OneSignal readiness
          if (OneSignal && OneSignal.User && OneSignal.Notifications) {
            console.log('🔔 OneSignal SDK v16 appears ready (User/Notifications check)');
            break;
          }
          
          // Check if OneSignal has been initialized (non-async method)
          if (OneSignal && OneSignal.init && OneSignal.User) {
            console.log('🔔 OneSignal SDK v16 appears ready (init/User check)');
            break;
          }
          
          console.log('🔔 Waiting for OneSignal SDK v16 to be ready...', attempts + 1);
          await new Promise(resolve => setTimeout(resolve, 100));
          attempts++;
        } catch (error) {
          console.log('🔔 OneSignal not ready yet, waiting...', attempts + 1);
          await new Promise(resolve => setTimeout(resolve, 100));
          attempts++;
        }
      }

      if (attempts >= 150) {
        console.warn('🔔 OneSignal SDK v16 initialization timeout - notifications will use database only');
        this.isInitialized = true;
        return false;
      }

      this.oneSignal = OneSignal;
      this.isInitialized = true;

      // Set external user ID if provided
      if (userId) {
        await this.setUserId(userId);
      }

      console.log('🔔 OneSignal SDK v16 initialized successfully');
      return true;
    } catch (error) {
      console.error('🔔 Error initializing OneSignal SDK v16:', error);
      console.warn('🔔 Notifications will use database only');
      this.isInitialized = true; // Mark as initialized to prevent repeated attempts
      return false;
    }
  }

  // Set user ID for OneSignal
  async setUserId(userId) {
    try {
      if (!this.isInitialized || !this.oneSignal) {
        console.log('🔔 OneSignal not initialized, cannot set user ID');
        return false;
      }

      // Validate user ID
      if (!userId || typeof userId !== 'string' || userId.trim() === '') {
        console.warn('🔔 Invalid user ID provided:', userId);
        return false;
      }

      this.userId = userId;
      
      // Use the new OneSignal v16 login method with error handling
      try {
        await this.oneSignal.login(userId);
        console.log('🔔 OneSignal user ID set (login):', userId);
        return true;
      } catch (loginError) {
        console.warn('🔔 OneSignal login failed, but continuing:', loginError);
        return false;
      }
    } catch (error) {
      console.error('🔔 Error setting OneSignal user ID:', error);
      return false;
    }
  }

  // Request notification permission
  async requestPermission() {
    try {
      if (!this.isInitialized || !this.oneSignal) {
        console.log('🔔 OneSignal not initialized, cannot request permission');
        return { oneSignal: false, legacy: false };
      }

      console.log('🔔 Requesting notification permission...');

      // Check if Notification API is available
      if (typeof Notification === 'undefined') {
        console.warn('🔔 Notification API not supported in this browser');
        return { oneSignal: false, legacy: false };
      }

      // Use the new OneSignal v16 notification permission API with error handling
      try {
        const permission = await this.oneSignal.Notifications.requestPermission();
        
        if (permission) {
          console.log('🔔 Notification permission granted');
          this.isSubscribed = true;
          return { oneSignal: true, legacy: false };
        } else {
          console.log('🔔 Notification permission denied');
          return { oneSignal: false, legacy: false };
        }
      } catch (permissionError) {
        console.warn('🔔 OneSignal permission request failed, trying browser API:', permissionError);
        
        // Fallback to browser notification API
        try {
          const browserPermission = await Notification.requestPermission();
          if (browserPermission === 'granted') {
            console.log('🔔 Browser notification permission granted');
            return { oneSignal: false, legacy: true };
          } else {
            console.log('🔔 Browser notification permission denied');
            return { oneSignal: false, legacy: false };
          }
        } catch (browserError) {
          console.error('🔔 Browser notification permission request failed:', browserError);
          return { oneSignal: false, legacy: false };
        }
      }
    } catch (error) {
      console.error('🔔 Error requesting notification permission:', error);
      return { oneSignal: false, legacy: false };
    }
  }

  // Check if notifications are enabled
  async isEnabled() {
    try {
      if (!this.isInitialized || !this.oneSignal) {
        return false;
      }

      // Check if Notification API is available
      if (typeof Notification === 'undefined') {
        return false;
      }

      // Use the new OneSignal v16 notification permission API
      const permission = await this.oneSignal.Notifications.permission;
      return permission === 'granted';
    } catch (error) {
      console.error('🔔 Error checking notification permission:', error);
      return false;
    }
  }

  // Send test notification
  async sendTestNotification() {
    try {
      if (!this.isInitialized || !this.userId) {
        console.log('🔔 Cannot send test notification - not initialized or no user ID');
        return false;
      }

      console.log('🔔 Sending test notification...');

      const response = await fetch('/api/notifications/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        console.log('🔔 Test notification sent successfully');
        return true;
      } else {
        console.error('🔔 Failed to send test notification');
        return false;
      }
    } catch (error) {
      console.error('🔔 Error sending test notification:', error);
      return false;
    }
  }

  // Send test push notification directly to OneSignal
  async sendTestPushNotification() {
    try {
      if (!this.userId) {
        console.log('🔔 Cannot send test push notification - no user ID');
        return false;
      }

      console.log('🔔 Sending test push notification to OneSignal...');

      const response = await fetch('/test-push-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          userId: this.userId
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('🔔 Test push notification sent successfully:', result);
        return true;
      } else {
        const error = await response.json();
        console.error('🔔 Failed to send test push notification:', error);
        return false;
      }
    } catch (error) {
      console.error('🔔 Error sending test push notification:', error);
      return false;
    }
  }

  // Test OneSignal connection
  async testOneSignalConnection() {
    try {
      console.log('🔔 Testing OneSignal connection...');

      const response = await fetch('/test-onesignal', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        console.log('🔔 OneSignal connection test result:', result);
        return result;
      } else {
        const error = await response.json();
        console.error('🔔 OneSignal connection test failed:', error);
        return { success: false, error };
      }
    } catch (error) {
      console.error('🔔 Error testing OneSignal connection:', error);
      return { success: false, error: error.message };
    }
  }

  // Get notification status
  getStatus() {
    return {
      oneSignal: this.isInitialized && this.oneSignal !== null,
      database: true,
      socket: true
    };
  }

  // Menu notification timers
  menuNotificationTimers = {
    breakfast: null,
    lunch: null,
    dinner: null
  };

  // Initialize menu notification timers
  initializeMenuNotifications() {
    console.log('🔔 Initializing menu notification timers...');
    
    // Clear any existing timers
    this.clearMenuNotificationTimers();
    
    // Set up timers for each meal
    this.setupMenuNotificationTimer('breakfast', 7, 0); // 7:00 AM
    this.setupMenuNotificationTimer('lunch', 12, 0);    // 12:00 PM
    this.setupMenuNotificationTimer('dinner', 19, 0);   // 7:00 PM
    
    console.log('🔔 Menu notification timers initialized');
  }

  // Setup timer for a specific meal
  setupMenuNotificationTimer(mealType, hour, minute) {
    const now = new Date();
    const targetTime = new Date();
    targetTime.setHours(hour, minute, 0, 0);
    
    // If target time has passed today, schedule for tomorrow
    if (targetTime <= now) {
      targetTime.setDate(targetTime.getDate() + 1);
    }
    
    const timeUntilTarget = targetTime.getTime() - now.getTime();
    
    console.log(`🔔 Scheduling ${mealType} notification for ${targetTime.toLocaleString()}`);
    
    // Set timer
    this.menuNotificationTimers[mealType] = setTimeout(() => {
      this.sendMenuNotification(mealType);
      // Schedule next day's notification
      this.setupMenuNotificationTimer(mealType, hour, minute);
    }, timeUntilTarget);
  }

  // Clear all menu notification timers
  clearMenuNotificationTimers() {
    Object.keys(this.menuNotificationTimers).forEach(mealType => {
      if (this.menuNotificationTimers[mealType]) {
        clearTimeout(this.menuNotificationTimers[mealType]);
        this.menuNotificationTimers[mealType] = null;
      }
    });
  }

  // Send menu notification for a specific meal
  async sendMenuNotification(mealType) {
    try {
      console.log(`🔔 Sending ${mealType} menu notification...`);
      
      const mealEmojis = {
        breakfast: '🥞',
        lunch: '🍛',
        dinner: '🍽️'
      };
      
      const mealNames = {
        breakfast: 'Breakfast',
        lunch: 'Lunch',
        dinner: 'Dinner'
      };
      
      const notificationData = {
        title: `${mealEmojis[mealType]} ${mealNames[mealType]} is Ready!`,
        message: `🍽️ check out today's menu! Tap to see what's cooking.`,
        type: 'menu',
        mealType: mealType,
        url: '/student', // Redirect to student dashboard
        priority: 'high'
      };
      
      // Send via OneSignal if available
      if (this.isInitialized && this.oneSignal) {
        try {
          await this.sendOneSignalNotification(notificationData);
          console.log(`🔔 ${mealType} notification sent via OneSignal`);
        } catch (error) {
          console.warn(`🔔 OneSignal ${mealType} notification failed, using database fallback:`, error);
          await this.sendDatabaseNotification(notificationData);
        }
      } else {
        // Fallback to database notification
        await this.sendDatabaseNotification(notificationData);
      }
      
    } catch (error) {
      console.error(`🔔 Error sending ${mealType} menu notification:`, error);
    }
  }

  // Send notification via OneSignal
  async sendOneSignalNotification(notificationData) {
    if (!this.userId) {
      throw new Error('No user ID available');
    }

    const response = await fetch('/api/notifications/send-menu', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        ...notificationData,
        userId: this.userId
      })
    });

    if (!response.ok) {
      throw new Error('Failed to send OneSignal notification');
    }

    return await response.json();
  }

  // Send notification via database
  async sendDatabaseNotification(notificationData) {
    const response = await fetch('/api/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(notificationData)
    });

    if (!response.ok) {
      throw new Error('Failed to send database notification');
    }

    return await response.json();
  }

  // Check if it's time for a meal notification
  isMealTime(mealType) {
    const now = new Date();
    const hour = now.getHours();
    
    const mealTimes = {
      breakfast: 7,
      lunch: 12,
      dinner: 19
    };
    
    return hour === mealTimes[mealType];
  }

  // Get next meal time
  getNextMealTime() {
    const now = new Date();
    const hour = now.getHours();
    
    const mealTimes = [
      { meal: 'breakfast', hour: 7, emoji: '🥞' },
      { meal: 'lunch', hour: 12, emoji: '🍛' },
      { meal: 'dinner', hour: 19, emoji: '🍽️' }
    ];
    
    // Find next meal
    for (const meal of mealTimes) {
      if (hour < meal.hour) {
        return meal;
      }
    }
    
    // If all meals passed today, return breakfast tomorrow
    return mealTimes[0];
  }

  // Subscribe to notifications
  async subscribe() {
    try {
      if (!this.isInitialized || !this.oneSignal) {
        console.log('🔔 OneSignal not initialized, cannot subscribe');
        return false;
      }

      console.log('🔔 Subscribing to notifications...');

      // Use the new OneSignal v16 subscription API
      await this.oneSignal.User.PushSubscription.optIn();
      
      const permission = await this.requestPermission();
      
      if (permission.oneSignal) {
        console.log('🔔 Successfully subscribed to OneSignal notifications');
        this.isSubscribed = true;
        return true;
      } else {
        console.log('🔔 Failed to subscribe to notifications');
        return false;
      }
    } catch (error) {
      console.error('🔔 Error subscribing to notifications:', error);
      return false;
    }
  }

  // Unsubscribe from notifications
  async unsubscribe() {
    try {
      if (!this.isInitialized || !this.oneSignal) {
        console.log('🔔 OneSignal not initialized, cannot unsubscribe');
        return false;
      }

      console.log('🔔 Unsubscribing from notifications...');

      // Use the new OneSignal v16 subscription API
      await this.oneSignal.User.PushSubscription.optOut();
      this.isSubscribed = false;

      console.log('🔔 Successfully unsubscribed from notifications');
      return true;
    } catch (error) {
      console.error('🔔 Error unsubscribing from notifications:', error);
      return false;
    }
  }

  // Set up notification click handler
  onNotificationClick(callback) {
    if (!this.isInitialized || !this.oneSignal) {
      console.log('🔔 OneSignal not initialized, cannot set up click handler');
      return;
    }
    // Use the new OneSignal v16 event API
    this.oneSignal.Notifications.addEventListener('click', callback);
  }

  // Set up permission change handler
  onPermissionChange(callback) {
    if (!this.isInitialized || !this.oneSignal) {
      console.log('🔔 OneSignal not initialized, cannot set up permission change handler');
      return;
    }
    // Use the new OneSignal v16 event API
    this.oneSignal.Notifications.addEventListener('permissionChange', callback);
  }

  // Handle notification received
  onNotificationReceived(callback) {
    if (!this.isInitialized || !this.oneSignal) {
      console.log('🔔 OneSignal not initialized, cannot set received handler');
      return;
    }

    // Use the new OneSignal v16 event API
    this.oneSignal.Notifications.addEventListener('foregroundWillDisplay', callback);
  }
}

// Create singleton instance
const notificationManager = new NotificationManager();

export default notificationManager; 