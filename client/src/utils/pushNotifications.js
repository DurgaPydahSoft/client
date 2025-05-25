const publicVapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;

if (!publicVapidKey) {
  console.warn('VAPID public key is not set in environment variables. Push notifications will not work.');
}

// Check if service workers and push messaging is supported
const checkNotificationSupport = () => {
  try {
  if (!('serviceWorker' in navigator)) {
      console.warn('Service Workers are not supported in your browser.');
      return false;
  }
  if (!('PushManager' in window)) {
      console.warn('Push notifications are not supported in your browser.');
      return false;
  }
  return true;
  } catch (error) {
    console.warn('Error checking notification support:', error);
    return false;
  }
};

// Register service worker
const registerServiceWorker = async () => {
  try {
    if (!('serviceWorker' in navigator)) {
      console.warn('Service Workers are not supported in your browser.');
      return null;
    }

    console.log('Attempting to register service worker...');
    const registration = await navigator.serviceWorker.register('/service-worker.js', {
      scope: '/'
    });
    console.log('Service Worker registered successfully:', registration);
    return registration;
  } catch (error) {
    console.warn('Service Worker registration failed:', error);
    return null;
  }
};

// Request notification permission
const requestNotificationPermission = async () => {
  try {
    if (!('Notification' in window)) {
      console.warn('Notifications are not supported in your browser.');
      return false;
    }

    // First check if permission is already granted
    const currentPermission = Notification.permission;
    console.log('Current notification permission:', currentPermission);
    
    if (currentPermission === 'granted') {
      console.log('Notification permission already granted');
      return true;
    }
    
    // If permission is denied, we can't request it again
    if (currentPermission === 'denied') {
      console.log('Notification permission was previously denied');
      return false;
    }

    // Request permission
    console.log('Requesting notification permission...');
    const permission = await Notification.requestPermission();
    console.log('Notification permission status:', permission);
    
    if (permission !== 'granted') {
      console.log('Notification permission denied by user');
      return false;
    }

    return true;
  } catch (error) {
    console.warn('Error requesting notification permission:', error);
    return false;
  }
};

// Check if notifications can be re-enabled
const canReenableNotifications = () => {
  return 'Notification' in window && Notification.permission === 'denied';
};

// Get browser-specific instructions for enabling notifications
const getBrowserInstructions = () => {
  const userAgent = navigator.userAgent.toLowerCase();
  
  if (userAgent.includes('chrome')) {
    return {
      title: 'Enable Notifications in Chrome',
      steps: [
        'Click the lock/info icon in the address bar',
        'Find "Notifications" in the site settings',
        'Change the setting to "Allow"',
        'Refresh the page'
      ]
    };
  } else if (userAgent.includes('firefox')) {
    return {
      title: 'Enable Notifications in Firefox',
      steps: [
        'Click the lock icon in the address bar',
        'Click "Connection secure"',
        'Find "Notifications" in the permissions',
        'Change to "Allow"',
        'Refresh the page'
      ]
    };
  } else if (userAgent.includes('safari')) {
    return {
      title: 'Enable Notifications in Safari',
      steps: [
        'Click Safari in the menu bar',
        'Click "Preferences"',
        'Go to "Websites" tab',
        'Find "Notifications" in the left sidebar',
        'Find this website and change to "Allow"',
        'Refresh the page'
      ]
    };
  } else {
    return {
      title: 'Enable Notifications',
      steps: [
        'Open your browser settings',
        'Find the notifications or permissions section',
        'Enable notifications for this website',
        'Refresh the page'
      ]
    };
  }
};

// Subscribe to push notifications
const subscribeToPushNotifications = async (registration) => {
  try {
    if (!registration || !registration.pushManager) {
      console.warn('Push Manager not available');
      return null;
    }

    console.log('Starting push notification subscription process...');
    
    if (!checkNotificationSupport()) {
      console.warn('Push notifications are not supported in this browser');
      return null;
    }

    // Check if already subscribed
    console.log('Checking for existing subscription...');
    const existingSubscription = await registration.pushManager.getSubscription();
    if (existingSubscription) {
      console.log('Already subscribed to push notifications:', existingSubscription);
      return existingSubscription;
    }

    if (!publicVapidKey) {
      console.warn('VAPID public key is not set. Cannot subscribe to push notifications.');
      return null;
    }

    console.log('Attempting to subscribe to push notifications...');
    console.log('Using VAPID public key:', publicVapidKey);
    
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
    });
    
    console.log('Push notification subscription successful:', subscription);

    // Send subscription to server
    console.log('Sending subscription to server...');
    const response = await fetch('/api/push-subscriptions/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(subscription)
    });

    if (!response.ok) {
      throw new Error('Failed to save subscription on server');
    }

    return subscription;
  } catch (error) {
    console.warn('Error subscribing to push notifications:', error);
    return null;
  }
};

// Helper function to convert base64 string to Uint8Array
const urlBase64ToUint8Array = (base64String) => {
  try {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
  } catch (error) {
    console.warn('Error converting base64 to Uint8Array:', error);
    return null;
  }
};

// Test notification function
const sendTestNotification = async () => {
  try {
    if (!('serviceWorker' in navigator)) {
      console.warn('Service Workers are not supported in your browser.');
      return false;
    }

    console.log('Sending test notification...');
    const registration = await navigator.serviceWorker.ready;
    console.log('Service worker ready:', registration);
    
    await registration.showNotification('Test Notification', {
      body: 'This is a test notification to verify the system is working.',
      icon: '/icon-192x192.png',
      badge: '/badge-72x72.png',
      vibrate: [200, 100, 200],
      requireInteraction: true,
      actions: [
        {
          action: 'open',
          title: 'Open'
        },
        {
          action: 'close',
          title: 'Close'
        }
      ]
    });
    console.log('Test notification sent successfully');
    return true;
  } catch (error) {
    console.warn('Error sending test notification:', error);
    return false;
  }
};

export {
  checkNotificationSupport,
  registerServiceWorker,
  requestNotificationPermission,
  canReenableNotifications,
  getBrowserInstructions,
  subscribeToPushNotifications,
  sendTestNotification
}; 