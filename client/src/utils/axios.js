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
  timeout: 30000, // 30 second timeout for Safari
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
    
    // Safari-specific request headers (only add if not already present)
    if (navigator.userAgent.includes('Safari') && !navigator.userAgent.includes('Chrome')) {
      if (!config.headers['X-Requested-With']) {
        config.headers['X-Requested-With'] = 'XMLHttpRequest';
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
    console.error('🚨 API Error:', error.response?.data || error.message);
    console.error('🚨 API Error URL:', error.config?.url);
    console.error('🚨 API Error Method:', error.config?.method);
    console.error('🚨 API Error Status:', error.response?.status);
    console.error('🚨 API Error Headers:', error.config?.headers);
    console.error('🚨 Current pathname:', window.location.pathname);
    console.error('🚨 Browser:', navigator.userAgent);
    
    // Safari-specific error handling
    if (navigator.userAgent.includes('Safari') && !navigator.userAgent.includes('Chrome')) {
      console.log('🚨 Safari browser detected - applying Safari-specific error handling');
      
      // Handle Safari CORS issues
      if (error.code === 'ERR_NETWORK' || error.message.includes('Network Error')) {
        console.log('🚨 Safari network error detected - this might be a CORS issue');
        // Don't logout on network errors in Safari, just show a user-friendly message
        return Promise.reject(new Error('Network connection issue. Please check your internet connection and try again.'));
      }
      
      // Handle CORS preflight errors specifically
      if (error.message.includes('CORS') || error.message.includes('preflight')) {
        console.log('🚨 Safari CORS preflight error detected');
        return Promise.reject(new Error('Browser security policy is blocking the request. Please try refreshing the page or use a different browser.'));
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