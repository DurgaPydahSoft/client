import axios from 'axios';

// Create axios instance with base URL
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://hostel-complaint-backend.onrender.com',
  headers: {
    'Content-Type': 'application/json'
  }
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
    // Don't redirect to login if we're already on the reset password page
    if (error.response?.status === 401 && !window.location.pathname.includes('/reset-password')) {
      console.log('Token expired or invalid, logging out...');
      // Clear token and user data
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Use window.location.href to prevent back button from returning to protected page
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api; 