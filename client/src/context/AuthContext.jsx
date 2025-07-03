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
      if (!token) {
        setLoading(false);
        setUser(null);
        return;
      }

      // This flag was causing the validation to be skipped on fresh logins.
      // We will now validate every time the token is set.
      if (skipValidation) {
        setSkipValidation(false);
      }

      try {
        console.log('🔍 Starting token validation...');
        const userRole = localStorage.getItem('userRole');
        
        let res;
        if (userRole === 'admin' || userRole === 'super_admin' || userRole === 'sub_admin' || userRole === 'warden' || userRole === 'principal') {
          console.log('🔍 Validating admin/warden/principal token...');
          res = await api.get('/api/admin-management/validate');
        } else {
          console.log('🔍 Validating student token...');
          res = await api.get('/api/auth/validate');
        }
        
        if (res.data.success && res.data.data?.user) {
          const freshUser = res.data.data.user;
          console.log('🔍 Token validation successful:', freshUser);
          setUser(freshUser);
          
          // Update local storage to match validated data
          localStorage.setItem('user', JSON.stringify(freshUser));
          localStorage.setItem('userRole', freshUser.role);
        } else {
          throw new Error('Invalid token validation response');
        }
      } catch (error) {
        console.error('🔍 Token validation failed:', error.response?.data || error.message);
        
        // Clear invalid token and user data
        setToken(null);
        setUser(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('userRole');
        
      } finally {
        setLoading(false);
      }
    };

    validateToken();
  }, [token]); // Removed skipValidation dependency

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

  // Helper to fetch and set the latest user profile (for students)
  const fetchAndSetUserProfile = async () => {
    try {
      const res = await api.get('/api/students/profile');
      if (res.data.success && res.data.data) {
        setUser(res.data.data);
        localStorage.setItem('user', JSON.stringify(res.data.data));
      }
    } catch (err) {
      console.error('Failed to fetch user profile:', err);
    }
  };

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

          // Fetch and set the latest profile (populated)
          await fetchAndSetUserProfile();

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

  const updateUser = async (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
    // Fetch and set the latest profile (populated)
    await fetchAndSetUserProfile();
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

  const isWarden = () => {
    return user?.role === 'warden';
  };

  const isStudent = () => {
    return user?.role === 'student';
  };

  const isPrincipal = () => {
    return user?.role === 'principal';
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
    isWarden,
    isStudent,
    isPrincipal,
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