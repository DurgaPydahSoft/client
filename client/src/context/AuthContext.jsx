import React, { createContext, useContext, useState, useEffect } from 'react';
import { useSocket } from '../hooks/useSocket';
import toast from 'react-hot-toast';
import api from '../utils/axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  const [requiresPasswordChange, setRequiresPasswordChange] = useState(false);
  const socketRef = useSocket(token);

  // Validate token on mount and token change
  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setLoading(false);
        setUser(null);
        return;
      }

      try {
        console.log('Validating token...');
        const res = await api.get('/api/auth/validate');
        
        if (res.data.success && res.data.data?.user) {
          console.log('Token validation successful:', res.data.data.user);
          setUser(res.data.data.user);
          
          // Update stored user data if needed
          const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
          if (JSON.stringify(storedUser) !== JSON.stringify(res.data.data.user)) {
            localStorage.setItem('user', JSON.stringify(res.data.data.user));
          }
        } else {
          console.error('Invalid token validation response:', res.data);
          throw new Error('Invalid token validation response');
        }
      } catch (error) {
        console.error('Token validation failed:', error);
        // Clear invalid token and user data
        setToken(null);
        setUser(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        // Only redirect if we're not already on the login page
        if (!window.location.pathname.includes('/login')) {
          window.location.replace('/login');
    }
      } finally {
    setLoading(false);
      }
    };

    validateToken();
  }, [token]);

  // Listen for real-time notifications
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;
    const handler = (data) => {
      toast.success(data.title + ': ' + data.message);
      window.dispatchEvent(new Event('refresh-notifications'));
    };
    socket.on('notification', handler);
    return () => {
      socket.off('notification', handler);
    };
  }, [socketRef, token]);

  const login = async (type, credentials) => {
    try {
      console.log('Login attempt:', { type, credentials });
      const url = `/api/auth/${type}/login`;
      console.log('Login URL:', url);

      const res = await api.post(url, credentials);
      console.log('Login response:', res.data);
      
      if (res.data.success) {
        const { token: newToken, admin, student, requiresPasswordChange: needsPasswordChange } = res.data.data;
        const userData = admin || student;
        
        if (!userData) {
          throw new Error('No user data received from server');
        }
        
        // Ensure role is set correctly
        userData.role = admin ? 'admin' : 'student';
        
        console.log('Login successful, user data:', userData);
        
        // Store token and user data
        localStorage.setItem('token', newToken);
        localStorage.setItem('user', JSON.stringify(userData));
        setToken(newToken);
        setUser(userData);
        setRequiresPasswordChange(needsPasswordChange || false);
        
    // Register socket room for notifications
        if (socketRef.current && userData.id) {
          socketRef.current.emit('register', userData.id);
        }

        return { requiresPasswordChange: needsPasswordChange };
      } else {
        throw new Error(res.data.message || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error.response || error);
      const errorMessage = error.response?.data?.message || error.message || 'Login failed';
      toast.error(errorMessage);
      throw error;
    }
  };

  const logout = () => {
    console.log('Logging out user');
    setToken(null);
    setUser(null);
    setRequiresPasswordChange(false);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      token, 
      login, 
      logout, 
      loading, 
      socket: socketRef.current,
      requiresPasswordChange,
      setRequiresPasswordChange,
      isAuthenticated: !!user && !!token
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext); 