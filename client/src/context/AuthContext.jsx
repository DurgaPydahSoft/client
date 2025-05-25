import React, { createContext, useContext, useState, useEffect } from 'react';
import { useSocket } from '../hooks/useSocket';
import toast from 'react-hot-toast';
import api from '../utils/axios';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastPath, setLastPath] = useState(null);
  const [requiresPasswordChange, setRequiresPasswordChange] = useState(false);
  const socketRef = useSocket(localStorage.getItem('token'));

  // Initialize auth state from localStorage
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const token = localStorage.getItem('token');
        const savedUser = localStorage.getItem('user');
        const savedPath = localStorage.getItem('lastPath');

        if (token && savedUser) {
          // Verify token with backend
          const response = await api.get('/api/auth/verify');
          
          if (response.data.success) {
            setUser(JSON.parse(savedUser));
            setIsAuthenticated(true);
            if (savedPath) {
              setLastPath(savedPath);
            }
          } else {
            // Clear invalid auth data
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            localStorage.removeItem('lastPath');
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        // Clear invalid auth data
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('lastPath');
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // Save last path when it changes
  useEffect(() => {
    if (lastPath) {
      localStorage.setItem('lastPath', lastPath);
    }
  }, [lastPath]);

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
  }, [socketRef, localStorage.getItem('token')]);

  const login = async (type, credentials) => {
    try {
      console.log('Login attempt:', { type, credentials });
      const url = `/api/auth/${type}/login`;
      console.log('Login URL:', url);

      const response = await api.post(url, credentials);
      console.log('Login response:', response.data);
      
      if (response.data.success) {
        const { token, admin, student, requiresPasswordChange: needsPasswordChange } = response.data.data;
        const userData = admin || student;
        
        if (!userData) {
          throw new Error('No user data received from server');
        }
        
        // Ensure role is set correctly
        userData.role = admin ? 'admin' : 'student';
        
        console.log('Login successful, user data:', userData);
        
        // Store token and user data
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userData));

        setUser(userData);
        setIsAuthenticated(true);
        setRequiresPasswordChange(needsPasswordChange || false);
        
        // Register socket room for notifications
        if (socketRef.current && userData._id) {
          socketRef.current.emit('register', userData._id);
        }

        return { success: true };
      } else {
        throw new Error(response.data.message || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Login failed'
      };
    }
  };

  const logout = () => {
    // Clear auth data
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('lastPath');
    
    setUser(null);
    setIsAuthenticated(false);
    setLastPath(null);
    setRequiresPasswordChange(false);
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
  };

  const updateLastPath = (path) => {
    setLastPath(path);
  };

  const value = {
    user,
    isAuthenticated,
    loading,
    lastPath,
    login,
    logout,
    updateLastPath,
    requiresPasswordChange,
    setRequiresPasswordChange,
    socket: socketRef.current
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 