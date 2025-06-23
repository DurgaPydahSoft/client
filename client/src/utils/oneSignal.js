import OneSignal from 'react-onesignal';

// OneSignal configuration
const ONESIGNAL_APP_ID = import.meta.env.VITE_ONESIGNAL_APP_ID;
const ONESIGNAL_REST_API_KEY = import.meta.env.VITE_ONESIGNAL_REST_API_KEY;

// Initialize OneSignal
export const initializeOneSignal = async () => {
  try {
    if (!ONESIGNAL_APP_ID) {
      console.warn('OneSignal App ID is not set in environment variables');
      return false;
    }

    console.log('Initializing OneSignal...');
    
    await OneSignal.init({
      appId: ONESIGNAL_APP_ID,
      allowLocalhostAsSecureOrigin: true,
      notifyButton: {
        enable: false, // We'll use our custom notification bell
      },
      autoRegister: false, // We'll handle registration manually
      autoResubscribe: true,
      persistNotification: false,
      promptOptions: {
        slidedown: {
          prompts: [
            {
              type: "push",
              autoPrompt: true,
              text: {
                actionMessage: "We'd like to show you notifications for the latest updates.",
                acceptButton: "Allow",
                cancelButton: "Not now"
              },
              delay: {
                pageViews: 1,
                timeDelay: 20
              }
            }
          ]
        }
      }
    });

    console.log('OneSignal initialized successfully');
    return true;
  } catch (error) {
    console.error('Error initializing OneSignal:', error);
    return false;
  }
};

// Register user with OneSignal
export const registerOneSignalUser = async (user) => {
  try {
    if (!user) {
      console.warn('No user data provided for OneSignal registration');
      return false;
    }

    console.log('Registering user with OneSignal:', user.email);

    // Set external user ID
    await OneSignal.setExternalUserId(user._id || user.id);
    
    // Set user properties
    await OneSignal.setProfile({
      email: user.email,
      name: user.name,
      role: user.role,
      hostelBlock: user.hostelBlock || 'N/A',
      roomNumber: user.roomNumber || 'N/A'
    });

    // Add tags for segmentation
    await OneSignal.sendTag('role', user.role);
    await OneSignal.sendTag('user_type', user.role === 'admin' ? 'admin' : 'student');
    
    if (user.hostelBlock) {
      await OneSignal.sendTag('hostel_block', user.hostelBlock);
    }
    if (user.roomNumber) {
      await OneSignal.sendTag('room_number', user.roomNumber);
    }

    console.log('User registered with OneSignal successfully');
    return true;
  } catch (error) {
    console.error('Error registering user with OneSignal:', error);
    return false;
  }
};

// Request notification permission
export const requestOneSignalPermission = async () => {
  try {
    console.log('Requesting OneSignal notification permission...');
    
    const permission = await OneSignal.Notifications.requestPermission();
    console.log('OneSignal permission status:', permission);
    
    return permission;
  } catch (error) {
    console.error('Error requesting OneSignal permission:', error);
    return false;
  }
};

// Check if OneSignal is supported
export const isOneSignalSupported = () => {
  return typeof OneSignal !== 'undefined' && ONESIGNAL_APP_ID;
};

// Get OneSignal user ID
export const getOneSignalUserId = async () => {
  try {
    const userId = await OneSignal.User.getOneSignalId();
    return userId;
  } catch (error) {
    console.error('Error getting OneSignal user ID:', error);
    return null;
  }
};

// Send notification to specific user
export const sendNotificationToUser = async (userId, notificationData) => {
  try {
    if (!ONESIGNAL_REST_API_KEY) {
      console.warn('OneSignal REST API key is not set');
      return false;
    }

    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`
      },
      body: JSON.stringify({
        app_id: ONESIGNAL_APP_ID,
        include_external_user_ids: [userId],
        headings: { en: notificationData.title },
        contents: { en: notificationData.body },
        url: notificationData.url || '/',
        data: {
          type: notificationData.type,
          id: notificationData.id,
          ...notificationData.data
        },
        chrome_web_image: notificationData.image,
        chrome_web_icon: notificationData.icon,
        priority: notificationData.priority || 10,
        ttl: notificationData.ttl || 86400, // 24 hours
        collapse_id: notificationData.collapseId,
        web_push_topic: notificationData.topic,
        buttons: notificationData.buttons || []
      })
    });

    if (!response.ok) {
      throw new Error(`OneSignal API error: ${response.status}`);
    }

    const result = await response.json();
    console.log('OneSignal notification sent successfully:', result);
    return true;
  } catch (error) {
    console.error('Error sending OneSignal notification:', error);
    return false;
  }
};

// Send notification to segment
export const sendNotificationToSegment = async (segment, notificationData) => {
  try {
    if (!ONESIGNAL_REST_API_KEY) {
      console.warn('OneSignal REST API key is not set');
      return false;
    }

    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`
      },
      body: JSON.stringify({
        app_id: ONESIGNAL_APP_ID,
        included_segments: [segment],
        headings: { en: notificationData.title },
        contents: { en: notificationData.body },
        url: notificationData.url || '/',
        data: {
          type: notificationData.type,
          id: notificationData.id,
          ...notificationData.data
        },
        chrome_web_image: notificationData.image,
        chrome_web_icon: notificationData.icon,
        priority: notificationData.priority || 10,
        ttl: notificationData.ttl || 86400,
        collapse_id: notificationData.collapseId,
        web_push_topic: notificationData.topic,
        buttons: notificationData.buttons || []
      })
    });

    if (!response.ok) {
      throw new Error(`OneSignal API error: ${response.status}`);
    }

    const result = await response.json();
    console.log('OneSignal segment notification sent successfully:', result);
    return true;
  } catch (error) {
    console.error('Error sending OneSignal segment notification:', error);
    return false;
  }
};

// Get notification permission status
export const getNotificationPermission = () => {
  return OneSignal.Notifications.permission;
};

// Check if notifications are enabled
export const areNotificationsEnabled = async () => {
  try {
    const permission = await OneSignal.Notifications.permission;
    return permission === 'granted';
  } catch (error) {
    console.error('Error checking notification permission:', error);
    return false;
  }
};

// Add notification click listener
export const addNotificationClickListener = (callback) => {
  try {
    OneSignal.Notifications.addEventListener('click', callback);
  } catch (error) {
    console.error('Error adding notification click listener:', error);
  }
};

// Remove notification click listener
export const removeNotificationClickListener = (callback) => {
  try {
    OneSignal.Notifications.removeEventListener('click', callback);
  } catch (error) {
    console.error('Error removing notification click listener:', error);
  }
};

// Test notification function
export const sendTestNotification = async () => {
  try {
    const userId = await getOneSignalUserId();
    if (!userId) {
      console.warn('No OneSignal user ID available for test notification');
      return false;
    }

    return await sendNotificationToUser(userId, {
      title: 'Test Notification',
      body: 'This is a test notification from OneSignal integration',
      type: 'test',
      url: '/',
      priority: 10
    });
  } catch (error) {
    console.error('Error sending test notification:', error);
    return false;
  }
}; 