import React, { createContext, useContext, useState, useEffect } from 'react';
import { useSocket } from '../hooks/useSocket';
import toast from 'react-hot-toast';
import api, { safeLocalStorage } from '../utils/axios';

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
  const [token, setToken] = useState(safeLocalStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  const [requiresPasswordChange, setRequiresPasswordChange] = useState(false);
  const [skipValidation, setSkipValidation] = useState(false);
  const socketRef = useSocket(token);

  // iOS/Safari-specific initialization
  useEffect(() => {
    // Check if we're on iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    const isIOSSafari = isSafari && isIOS;
    const isIOSChrome = /CriOS/.test(navigator.userAgent);
    
    if (isIOS || isIOSSafari || isIOSChrome) {
      console.log('🦁 iOS device detected - applying iOS-specific auth handling');
      
      // Ensure localStorage is available and working
      try {
        const testKey = '__ios_test__';
        localStorage.setItem(testKey, 'test');
        localStorage.removeItem(testKey);
        console.log('🦁 iOS localStorage is working');
      } catch (error) {
        console.warn('🦁 iOS localStorage test failed:', error);
        // Fallback to sessionStorage if localStorage fails
        console.log('🦁 Falling back to sessionStorage for iOS');
      }
    }
  }, []);

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
        const userRole = safeLocalStorage.getItem('userRole');
        
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
          
          // Update local storage to match validated data using safe localStorage
          safeLocalStorage.setItem('user', JSON.stringify(freshUser));
          safeLocalStorage.setItem('userRole', freshUser.role);
        } else {
          throw new Error('Invalid token validation response');
        }
      } catch (error) {
        console.error('🔍 Token validation failed:', error.response?.data || error.message);
        
        // Enhanced iOS error logging for authentication
        if (isIOS || isIOSSafari || isIOSChrome) {
          console.error('🦁 iOS Authentication Error:', {
            error: error.message,
            response: error.response?.data,
            status: error.response?.status,
            url: error.config?.url,
            timestamp: new Date().toISOString(),
            pathname: window.location.pathname
          });
        }
        
        // Clear invalid token and user data using safe localStorage
        setToken(null);
        setUser(null);
        safeLocalStorage.removeItem('token');
        safeLocalStorage.removeItem('user');
        safeLocalStorage.removeItem('userRole');
        
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
  }, [token]); // Removed socketRef dependency to prevent infinite re-renders in Safari

  // Helper to fetch and set the latest user profile (for students)
  const fetchAndSetUserProfile = async () => {
    try {
      const res = await api.get('/api/students/profile');
      if (res.data.success && res.data.data) {
        setUser(res.data.data);
        safeLocalStorage.setItem('user', JSON.stringify(res.data.data));
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
        
        // Store admin data with the actual role from backend using safe localStorage
        const tokenStored = safeLocalStorage.setItem('token', newToken);
        const userStored = safeLocalStorage.setItem('user', JSON.stringify(admin));
        const roleStored = safeLocalStorage.setItem('userRole', admin.role);
        
        console.log('AuthContext: Data stored in localStorage:');
        console.log('AuthContext: - token stored:', tokenStored);
        console.log('AuthContext: - user stored:', userStored);
        console.log('AuthContext: - userRole stored:', roleStored);
        
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
          
          // Always set the token and user data to establish a session using safe localStorage
          const tokenStored = safeLocalStorage.setItem('token', newToken);
          const userStored = safeLocalStorage.setItem('user', JSON.stringify(studentUser));
          const roleStored = safeLocalStorage.setItem('userRole', 'student');
          
          console.log('AuthContext: Student data stored:', { tokenStored, userStored, roleStored });
          
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
      
      // Enhanced iOS error handling and logging
      if (isIOS || isIOSSafari || isIOSChrome) {
        console.error('🦁 iOS Login Error:', {
          error: error.message,
          response: error.response?.data,
          status: error.response?.status,
          url: error.config?.url,
          timestamp: new Date().toISOString(),
          pathname: window.location.pathname
        });
        
        if (error.message.includes('Network Error') || error.code === 'ERR_NETWORK') {
          throw new Error('Connection issue on iOS. Please check your internet connection and try again.');
        }
      }
      
      throw error;
    }
  };

  const logout = () => {
    safeLocalStorage.removeItem('token');
    safeLocalStorage.removeItem('user');
    safeLocalStorage.removeItem('userRole');
    setToken(null);
    setUser(null);
    setRequiresPasswordChange(false);
    setSkipValidation(false);
    delete api.defaults.headers.common['Authorization'];
    toast.success('Logged out successfully');
  };

  const updateUser = async (updatedUser) => {
    setUser(updatedUser);
    safeLocalStorage.setItem('user', JSON.stringify(updatedUser));
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