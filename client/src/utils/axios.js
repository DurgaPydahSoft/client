import axios from 'axios';

// Create axios instance with base URL
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://192.168.3.148:5000',
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true // Enable sending cookies
});

// Add a request interceptor to add the auth token to every request
api.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => {
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
    
    // Only logout on 401 errors that are authentication-related
    // Skip logout for dashboard data fetching errors to prevent immediate logout
    if (error.response?.status === 401 && !window.location.pathname.includes('/reset-password')) {
      // Check if this is a dashboard data fetching error
      const isDashboardDataError = error.config?.url?.includes('/admin/students/count') ||
                                  error.config?.url?.includes('/announcements/admin/all') ||
                                  error.config?.url?.includes('/polls/admin/all') ||
                                  error.config?.url?.includes('/admin/members') ||
                                  error.config?.url?.includes('/complaints/admin/all');
      
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
      
      // Clear token and user data
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Use window.location.replace to prevent back button from returning to protected page
      window.location.replace('/login');
    }
    return Promise.reject(error);
  }
);

export default api; 