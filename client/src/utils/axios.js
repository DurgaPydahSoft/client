import axios from 'axios';

// Safari-compatible localStorage helper
const safeLocalStorage = {
  getItem: (key) => {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.warn('Safari localStorage getItem failed:', error);
      return null;
    }
  },
  setItem: (key, value) => {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (error) {
      console.warn('Safari localStorage setItem failed:', error);
      return false;
    }
  },
  removeItem: (key) => {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.warn('Safari localStorage removeItem failed:', error);
      return false;
    }
  }
};

// Create axios instance with Safari-compatible configuration
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://192.168.3.148:5000',
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true, // Enable sending cookies
  timeout: 60000, // 60 second timeout for attendance operations
  // Safari-specific axios config
  validateStatus: function (status) {
    return status >= 200 && status < 300; // Accept all 2xx status codes
  }
});

// Add a request interceptor to add the auth token to every request
api.interceptors.request.use(
  config => {
    const token = safeLocalStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // iOS/Safari-specific request headers (only add if not already present)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    const isIOSSafari = isSafari && isIOS;
    const isIOSChrome = /CriOS/.test(navigator.userAgent);
    
    if (isIOS || isIOSSafari || isIOSChrome) {
      if (!config.headers['X-Requested-With']) {
        config.headers['X-Requested-With'] = 'XMLHttpRequest';
      }
      // Add iOS-specific headers for better compatibility
      if (!config.headers['Accept']) {
        config.headers['Accept'] = 'application/json, text/plain, */*';
      }
    }
    
    return config;
  },
  error => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle token expiration
api.interceptors.response.use(
  response => response,
  error => {
    // Skip logging 404 errors for menu endpoints (normal when no menu is set)
    const isMenu404 = error.response?.status === 404 && 
                     error.config?.url?.includes('/api/cafeteria/menu/today');
    
    if (isMenu404) {
      // Silently handle menu 404s - this is expected when no menu is set
      return Promise.reject(error);
    }

    // Enhanced iOS error logging for other errors
    const errorDetails = {
      message: error.response?.data || error.message,
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      headers: error.config?.headers,
      pathname: window.location.pathname,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent),
      isSafari: /^((?!chrome|android).)*safari/i.test(navigator.userAgent),
      isIOSChrome: /CriOS/.test(navigator.userAgent)
    };

    console.error('🚨 API Error Details:', errorDetails);
    
    // Store error in localStorage for debugging
    try {
      const errorLog = JSON.parse(localStorage.getItem('ios_error_log') || '[]');
      errorLog.push(errorDetails);
      if (errorLog.length > 10) errorLog.shift(); // Keep only last 10 errors
      localStorage.setItem('ios_error_log', JSON.stringify(errorLog));
    } catch (e) {
      console.warn('Could not save error to localStorage:', e);
    }
    
    // iOS/Safari-specific error handling
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    const isIOSSafari = isSafari && isIOS;
    const isIOSChrome = /CriOS/.test(navigator.userAgent);
    
    if (isIOS || isIOSSafari || isIOSChrome) {
      console.log('🚨 iOS device detected - applying iOS-specific error handling');
      
      // Handle iOS network issues
      if (error.code === 'ERR_NETWORK' || error.message.includes('Network Error')) {
        console.log('🚨 iOS network error detected - this might be a connection issue');
        return Promise.reject(new Error('Network connection issue on iOS. Please check your internet connection and try again.'));
      }
      
      // Handle CORS preflight errors specifically
      if (error.message.includes('CORS') || error.message.includes('preflight')) {
        console.log('🚨 iOS CORS preflight error detected');
        return Promise.reject(new Error('iOS security policy is blocking the request. Please try refreshing the page or use a different browser.'));
      }
      
      // Handle iOS-specific timeout issues
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        console.log('🚨 iOS timeout error detected');
        return Promise.reject(new Error('Request timed out on iOS. Please try again or check your internet connection.'));
      }
    }
    
    // Only logout on 401 errors that are authentication-related
    // Skip logout for dashboard data fetching errors to prevent immediate logout
    if (error.response?.status === 401 && !window.location.pathname.includes('/reset-password')) {
      // Check if this is a dashboard data fetching error or expected 404
      const isDashboardDataError = error.config?.url?.includes('/admin/students/count') ||
                                  error.config?.url?.includes('/announcements/admin/all') ||
                                  error.config?.url?.includes('/polls/admin/all') ||
                                  error.config?.url?.includes('/admin/members') ||
                                  error.config?.url?.includes('/complaints/admin/all') ||
                                  error.config?.url?.includes('/api/menu/') ||
                                  error.config?.url?.includes('/api/menu/today') ||
                                  error.config?.url?.includes('/api/menu/ratings/stats') ||
                                  error.config?.url?.includes('/api/payments/') ||
                                  error.config?.url?.includes('/api/rooms/student/electricity-bills') ||
                                  error.config?.url?.includes('/api/admin/rooms');
      
      if (isDashboardDataError) {
        console.log('🚨 Dashboard data error - not logging out, just logging error');
        console.log('🚨 Failed dashboard request URL:', error.config?.url);
        console.log('🚨 Error response data:', error.response?.data);
        return Promise.reject(error);
      }
      
      console.log('🚨 Authentication error - logging out...');
      console.log('🚨 Failed request URL:', error.config?.url);
      console.log('🚨 Failed request method:', error.config?.method);
      console.log('🚨 Error response data:', error.response?.data);
      
      // Clear token and user data using safe localStorage
      safeLocalStorage.removeItem('token');
      safeLocalStorage.removeItem('user');
      safeLocalStorage.removeItem('userRole');
      
      // Use window.location.replace to prevent back button from returning to protected page
      window.location.replace('/login');
    }
    return Promise.reject(error);
  }
);

export default api; 
export { safeLocalStorage }; 