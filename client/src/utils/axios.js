import axios from 'axios';

// Create axios instance with base URL
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
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
    console.error('API Error:', error.response?.data || error.message);
    // Don't redirect to login if we're already on the reset password page
    if (error.response?.status === 401 && !window.location.pathname.includes('/reset-password')) {
      console.log('Token expired or invalid, logging out...');
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