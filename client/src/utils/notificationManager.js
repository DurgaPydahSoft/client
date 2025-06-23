import { 
  initializeOneSignal, 
  registerOneSignalUser, 
  requestOneSignalPermission,
  sendNotificationToUser,
  sendNotificationToSegment,
  areNotificationsEnabled,
  addNotificationClickListener,
  removeNotificationClickListener,
  isOneSignalSupported
} from './oneSignal';

import { 
  checkNotificationSupport,
  registerServiceWorker,
  requestNotificationPermission,
  subscribeToPushNotifications,
  sendTestNotification as sendLegacyTestNotification
} from './pushNotifications';

import { connectSocket, disconnectSocket } from './socket';

// Notification Manager - Hybrid approach
class NotificationManager {
  constructor() {
    this.isOneSignalEnabled = false;
    this.isLegacyEnabled = false;
    this.isInitialized = false;
    this.user = null;
    this.notificationClickCallback = null;
  }

  // Initialize both notification systems
  async initialize(user) {
    try {
      console.log('🔔 NotificationManager: Initializing notification systems...');
      
      this.user = user;
      
      // Initialize OneSignal if supported
      if (isOneSignalSupported()) {
        console.log('🔔 NotificationManager: OneSignal is supported, initializing...');
        this.isOneSignalEnabled = await initializeOneSignal();
        
        if (this.isOneSignalEnabled) {
          await registerOneSignalUser(user);
          console.log('🔔 NotificationManager: OneSignal initialized successfully');
        }
      } else {
        console.log('🔔 NotificationManager: OneSignal not supported, using legacy system');
      }

      // Initialize legacy system as fallback
      if (checkNotificationSupport()) {
        console.log('🔔 NotificationManager: Legacy system supported, initializing...');
        const registration = await registerServiceWorker();
        if (registration) {
          const hasPermission = await requestNotificationPermission();
          if (hasPermission) {
            await subscribeToPushNotifications(registration);
            this.isLegacyEnabled = true;
            console.log('🔔 NotificationManager: Legacy system initialized successfully');
          }
        }
      }

      // Connect Socket.IO for real-time notifications
      connectSocket();

      this.isInitialized = true;
      console.log('🔔 NotificationManager: All notification systems initialized');
      
      return {
        oneSignal: this.isOneSignalEnabled,
        legacy: this.isLegacyEnabled,
        socket: true
      };
    } catch (error) {
      console.error('🔔 NotificationManager: Error initializing notification systems:', error);
      return {
        oneSignal: false,
        legacy: false,
        socket: false
      };
    }
  }

  // Request notification permission for both systems
  async requestPermission() {
    try {
      console.log('🔔 NotificationManager: Requesting notification permissions...');
      
      const results = {
        oneSignal: false,
        legacy: false
      };

      // Request OneSignal permission
      if (this.isOneSignalEnabled) {
        results.oneSignal = await requestOneSignalPermission();
      }

      // Request legacy permission
      if (checkNotificationSupport()) {
        results.legacy = await requestNotificationPermission();
      }

      console.log('🔔 NotificationManager: Permission results:', results);
      return results;
    } catch (error) {
      console.error('🔔 NotificationManager: Error requesting permissions:', error);
      return { oneSignal: false, legacy: false };
    }
  }

  // Check if notifications are enabled
  async areNotificationsEnabled() {
    try {
      if (this.isOneSignalEnabled) {
        return await areNotificationsEnabled();
      }
      
      // Fallback to legacy check
      return Notification.permission === 'granted';
    } catch (error) {
      console.error('🔔 NotificationManager: Error checking notification status:', error);
      return false;
    }
  }

  // Send notification using the best available system
  async sendNotification(notificationData) {
    try {
      console.log('🔔 NotificationManager: Sending notification:', notificationData);
      
      let sent = false;

      // Try OneSignal first
      if (this.isOneSignalEnabled && this.user) {
        const userId = this.user._id || this.user.id;
        sent = await sendNotificationToUser(userId, notificationData);
        if (sent) {
          console.log('🔔 NotificationManager: Notification sent via OneSignal');
        }
      }

      // Fallback to legacy system if OneSignal fails
      if (!sent && this.isLegacyEnabled) {
        // Legacy system sends notifications through the backend
        // This would typically be handled by the server
        console.log('🔔 NotificationManager: Using legacy notification system');
        sent = true; // Legacy system handles this through Socket.IO
      }

      return sent;
    } catch (error) {
      console.error('🔔 NotificationManager: Error sending notification:', error);
      return false;
    }
  }

  // Send notification to segment (OneSignal only)
  async sendNotificationToSegment(segment, notificationData) {
    try {
      if (!this.isOneSignalEnabled) {
        console.warn('🔔 NotificationManager: OneSignal not available for segment notifications');
        return false;
      }

      console.log('🔔 NotificationManager: Sending segment notification:', segment, notificationData);
      return await sendNotificationToSegment(segment, notificationData);
    } catch (error) {
      console.error('🔔 NotificationManager: Error sending segment notification:', error);
      return false;
    }
  }

  // Set up notification click handling
  setupNotificationClickHandler(callback) {
    try {
      this.notificationClickCallback = callback;

      // Set up OneSignal click handler
      if (this.isOneSignalEnabled) {
        addNotificationClickListener(callback);
      }

      // Legacy system handles clicks through service worker
      console.log('🔔 NotificationManager: Notification click handler set up');
    } catch (error) {
      console.error('🔔 NotificationManager: Error setting up click handler:', error);
    }
  }

  // Remove notification click handler
  removeNotificationClickHandler() {
    try {
      if (this.isOneSignalEnabled && this.notificationClickCallback) {
        removeNotificationClickListener(this.notificationClickCallback);
      }
      this.notificationClickCallback = null;
      console.log('🔔 NotificationManager: Notification click handler removed');
    } catch (error) {
      console.error('🔔 NotificationManager: Error removing click handler:', error);
    }
  }

  // Send test notification
  async sendTestNotification() {
    try {
      console.log('🔔 NotificationManager: Sending test notification...');
      
      let sent = false;

      // Try OneSignal first
      if (this.isOneSignalEnabled) {
        sent = await this.sendNotification({
          title: 'Test Notification (OneSignal)',
          body: 'This is a test notification from the hybrid notification system',
          type: 'test',
          url: '/',
          priority: 10
        });
      }

      // Fallback to legacy test
      if (!sent && this.isLegacyEnabled) {
        sent = await sendLegacyTestNotification();
      }

      return sent;
    } catch (error) {
      console.error('🔔 NotificationManager: Error sending test notification:', error);
      return false;
    }
  }

  // Get system status
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      oneSignal: this.isOneSignalEnabled,
      legacy: this.isLegacyEnabled,
      user: this.user ? 'registered' : 'not_registered'
    };
  }

  // Cleanup
  cleanup() {
    try {
      this.removeNotificationClickHandler();
      disconnectSocket();
      this.isInitialized = false;
      this.user = null;
      console.log('🔔 NotificationManager: Cleanup completed');
    } catch (error) {
      console.error('🔔 NotificationManager: Error during cleanup:', error);
    }
  }
}

// Create singleton instance
const notificationManager = new NotificationManager();

export default notificationManager; 