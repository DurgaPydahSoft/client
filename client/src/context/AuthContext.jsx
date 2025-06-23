import React, { createContext, useContext, useState, useEffect } from 'react';
import { useSocket } from '../hooks/useSocket';
import toast from 'react-hot-toast';
import api from '../utils/axios';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  const [requiresPasswordChange, setRequiresPasswordChange] = useState(false);
  const [skipValidation, setSkipValidation] = useState(false);
  const socketRef = useSocket(token);

  // Validate token on mount and token change
  useEffect(() => {
    const validateToken = async () => {
      console.log('🔍 Token validation useEffect triggered');
      console.log('🔍 Current token:', token ? 'exists' : 'null');
      console.log('🔍 Skip validation flag:', skipValidation);
      console.log('🔍 Loading state:', loading);
      console.log('🔍 Current user state:', user);
      
      if (!token) {
        console.log('🔍 No token, setting loading to false and user to null');
        setLoading(false);
        setUser(null);
        return;
      }

      // Skip validation if we just logged in
      if (skipValidation) {
        console.log('🔍 Skipping token validation after login');
        setSkipValidation(false);
        setLoading(false);
        return;
      }

      // Additional check: if we have valid user data in localStorage and no current user, 
      // it might be a fresh login, so skip validation
      const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
      const userRole = localStorage.getItem('userRole');
      
      console.log('🔍 Stored user from localStorage:', storedUser);
      console.log('🔍 Stored userRole from localStorage:', userRole);
      
      if (storedUser && storedUser.id && !user && (userRole === 'admin' || storedUser.role === 'admin' || storedUser.role === 'super_admin' || storedUser.role === 'sub_admin')) {
        console.log('🔍 Fresh admin login detected, setting user from localStorage');
        setUser(storedUser);
        setLoading(false);
        return;
      }

      try {
        console.log('🔍 Starting token validation...');
        
        console.log('🔍 Stored user role:', userRole);
        console.log('🔍 Stored user data:', storedUser);
        console.log('🔍 Current user state:', user);
        
        let res;
        if (userRole === 'admin' || storedUser.role === 'admin' || storedUser.role === 'super_admin' || storedUser.role === 'sub_admin') {
          console.log('🔍 Validating admin token...');
          try {
            res = await api.get('/api/admin-management/validate');
            console.log('🔍 Admin validation successful:', res.data);
          } catch (adminError) {
            console.error('🔍 Admin validation failed:', adminError.response?.data);
            console.error('🔍 Admin validation error status:', adminError.response?.status);
            throw adminError;
          }
        } else {
          console.log('🔍 Validating student token...');
          try {
            res = await api.get('/api/auth/validate');
            console.log('🔍 Student validation successful:', res.data);
          } catch (studentError) {
            console.error('🔍 Student validation failed:', studentError.response?.data);
            throw studentError;
          }
        }
        
        console.log('🔍 Validation response:', res.data);
        
        if (res.data.success && res.data.data?.user) {
          console.log('🔍 Token validation successful:', res.data.data.user);
          setUser(res.data.data.user);
          
          // Update stored user data if needed
          if (JSON.stringify(storedUser) !== JSON.stringify(res.data.data.user)) {
            localStorage.setItem('user', JSON.stringify(res.data.data.user));
          }
        } else {
          console.error('🔍 Invalid token validation response:', res.data);
          throw new Error('Invalid token validation response');
        }
      } catch (error) {
        console.error('🔍 Token validation failed:', error);
        console.error('🔍 Error details:', error.response?.data);
        console.error('🔍 Error status:', error.response?.status);
        console.error('🔍 Error message:', error.message);
        
        // Clear invalid token and user data
        console.log('🔍 Clearing token and user data due to validation failure');
        setToken(null);
        setUser(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('userRole');
        
        // Only redirect if we're not already on the login page
        if (!window.location.pathname.includes('/login')) {
          console.log('🔍 Redirecting to login page');
          window.location.replace('/login');
        }
      } finally {
        console.log('🔍 Setting loading to false');
        setLoading(false);
      }
    };

    validateToken();
  }, [token, skipValidation]);

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

  const login = async (role, credentials) => {
    try {
      let response;
      
      if (role === 'admin') {
        console.log('AuthContext: Admin login attempt');
        // Admin login
        response = await api.post('/api/admin-management/login', credentials);
        console.log('AuthContext: Admin login response:', response.data);
        const { token: newToken, admin } = response.data.data;
        
        console.log('AuthContext: Token received:', newToken ? 'yes' : 'no');
        console.log('AuthContext: Admin data received:', admin);
        console.log('AuthContext: Admin role:', admin.role);
        
        // Store admin data with the actual role from backend
        localStorage.setItem('token', newToken);
        localStorage.setItem('user', JSON.stringify(admin));
        localStorage.setItem('userRole', admin.role); // Use actual role instead of hardcoding 'admin'
        
        console.log('AuthContext: Data stored in localStorage:');
        console.log('AuthContext: - token:', localStorage.getItem('token') ? 'stored' : 'not stored');
        console.log('AuthContext: - user:', localStorage.getItem('user'));
        console.log('AuthContext: - userRole:', localStorage.getItem('userRole'));
        
        // Set skip validation BEFORE setting token to prevent immediate validation
        setSkipValidation(true);
        
        // Set user state immediately
        setToken(newToken);
        setUser(admin);
        api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
        
        console.log('AuthContext: Admin login successful, user set:', admin);
        console.log('AuthContext: Stored userRole as:', admin.role);
        
        return { success: true, user: admin };
      } else {
        console.log('AuthContext: Student login attempt');
        // Student login
        response = await api.post('/api/auth/student/login', credentials);
        console.log('AuthContext: Student login response:', response.data);
        
        if (response.data.success) {
          const { token: newToken, student: studentUser, requiresPasswordChange } = response.data.data;
          
          // Always set the token and user data to establish a session
          localStorage.setItem('token', newToken);
          localStorage.setItem('user', JSON.stringify(studentUser));
          localStorage.setItem('userRole', 'student');
          
          setSkipValidation(true);
          setToken(newToken);
          setUser(studentUser);
          api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
          
          // Set the password change requirement state
          setRequiresPasswordChange(requiresPasswordChange);

          // Return a consistent success object
          return { 
            success: true, 
            user: studentUser, 
            requiresPasswordChange: requiresPasswordChange 
          };
        } else {
          throw new Error(response.data.message || 'Login failed');
        }
      }
    } catch (error) {
      console.error('AuthContext: Login error:', error);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('userRole');
    setToken(null);
    setUser(null);
    setRequiresPasswordChange(false);
    setSkipValidation(false);
    delete api.defaults.headers.common['Authorization'];
    toast.success('Logged out successfully');
  };

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  const hasPermission = (permission) => {
    if (!user) return false;
    
    // Super admin has all permissions
    if (user.role === 'super_admin') return true;
    
    // Check specific permission
    return user.permissions?.includes(permission) || false;
  };

  const isSuperAdmin = () => {
    return user?.role === 'super_admin';
  };

  const isAdmin = () => {
    return user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'sub_admin';
  };

  const isStudent = () => {
    return user?.role === 'student';
  };

  const value = {
    user,
    token,
    loading,
    login,
    logout,
    updateUser,
    hasPermission,
    isSuperAdmin,
    isAdmin,
    isStudent,
    requiresPasswordChange,
    setRequiresPasswordChange,
    isAuthenticated: !!token && !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 