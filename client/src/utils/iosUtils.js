// iOS detection and compatibility utilities

// Improved iOS/Safari detection
export const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
export const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
export const isIOSSafari = isSafari && isIOS;
export const isIOSChrome = /CriOS/.test(navigator.userAgent);
export const isIOSDevice = isIOS || isIOSSafari || isIOSChrome;

// iOS-specific localStorage wrapper
export const safeLocalStorage = {
  getItem: (key) => {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.warn('iOS localStorage getItem failed:', error);
      return null;
    }
  },
  setItem: (key, value) => {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (error) {
      console.warn('iOS localStorage setItem failed:', error);
      return false;
    }
  },
  removeItem: (key) => {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.warn('iOS localStorage removeItem failed:', error);
      return false;
    }
  }
};

// iOS-specific axios configuration
export const getIOSAxiosConfig = () => {
  if (isIOSDevice) {
    return {
      timeout: 45000, // Longer timeout for iOS
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        'Accept': 'application/json, text/plain, */*'
      }
    };
  }
  return {};
};

// iOS-specific socket configuration
export const getIOSSocketConfig = (token) => {
  if (isIOSDevice) {
    return {
      auth: { token },
      transports: ['polling'], // Use polling only for iOS
      reconnection: true,
      reconnectionAttempts: 3, // Fewer attempts for iOS
      reconnectionDelay: 2000, // Longer delay for iOS
      withCredentials: true,
      path: '/socket.io',
      timeout: 45000 // Longer timeout for iOS
    };
  }
  return {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    withCredentials: true,
    path: '/socket.io',
    timeout: 30000
  };
};

// iOS-specific error handling
export const handleIOSError = (error) => {
  if (!isIOSDevice) {
    return error;
  }

  console.log('🚨 iOS device detected - applying iOS-specific error handling');

  // Handle iOS network issues
  if (error.code === 'ERR_NETWORK' || error.message.includes('Network Error')) {
    console.log('🚨 iOS network error detected');
    return new Error('Network connection issue on iOS. Please check your internet connection and try again.');
  }

  // Handle CORS preflight errors
  if (error.message.includes('CORS') || error.message.includes('preflight')) {
    console.log('🚨 iOS CORS preflight error detected');
    return new Error('iOS security policy is blocking the request. Please try refreshing the page or use a different browser.');
  }

  // Handle iOS-specific timeout issues
  if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
    console.log('🚨 iOS timeout error detected');
    return new Error('Request timed out on iOS. Please try again or check your internet connection.');
  }

  return error;
};

// iOS-specific loading message
export const getIOSLoadingMessage = () => {
  if (isIOSDevice) {
    return 'Please wait 30-40 seconds. iOS may take longer to establish connection...';
  }
  return 'Please wait at least 30-40 seconds because sometimes the server faces huge loads';
};

// iOS-specific OneSignal configuration
export const shouldSkipOneSignal = () => {
  return isIOSSafari && !isIOSChrome;
};

// Log iOS detection info
export const logIOSInfo = () => {
  const info = {
    userAgent: navigator.userAgent,
    isIOS,
    isSafari,
    isIOSSafari,
    isIOSChrome,
    isIOSDevice,
    timestamp: new Date().toISOString(),
    url: window.location.href,
    pathname: window.location.pathname
  };
  
  console.log('🦁 iOS Detection Info:', info);
  
  // Store iOS info for debugging
  try {
    localStorage.setItem('ios_detection_info', JSON.stringify(info));
  } catch (e) {
    console.warn('Could not save iOS info to localStorage:', e);
  }
  
  return info;
};

// Get stored error log
export const getErrorLog = () => {
  try {
    return JSON.parse(localStorage.getItem('ios_error_log') || '[]');
  } catch (e) {
    console.warn('Could not read error log from localStorage:', e);
    return [];
  }
};

// Clear error log
export const clearErrorLog = () => {
  try {
    localStorage.removeItem('ios_error_log');
    console.log('🦁 Error log cleared');
  } catch (e) {
    console.warn('Could not clear error log:', e);
  }
}; 