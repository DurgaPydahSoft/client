import axios from 'axios';

// Create axios instance
const api = axios.create({
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
    // Handle all 401 errors (unauthorized)
    if (error.response?.status === 401) {
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