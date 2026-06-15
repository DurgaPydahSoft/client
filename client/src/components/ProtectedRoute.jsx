import React, { useMemo } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from './LoadingSpinner';

// Only log in development mode
const isDevelopment = process.env.NODE_ENV === 'development';
const debugLog = (...args) => {
  if (isDevelopment) {
    console.log(...args);
  }
};

const ProtectedRoute = ({ children, requireAuth = true, role }) => {
  const { user, token, loading } = useAuth();
  const location = useLocation();

  // Memoize permission check to avoid recalculating on every render
  const isPermitted = useMemo(() => {
    if (!role) return true;
    
    if (role === 'admin') {
      return ['admin', 'super_admin', 'sub_admin', 'custom'].includes(user?.role);
    }
    if (role === 'warden') {
      return user?.role === 'warden';
    }
    if (role === 'principal') {
      return user?.role === 'principal';
    }
    return user?.role === role;
  }, [role, user?.role]);

  debugLog('🛡 ProtectedRoute check:', {
    path: location.pathname,
    requireAuth,
    role,
    hasToken: !!token,
    userRole: user?.role,
    isLoading: loading
  });

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // If authentication is required and user is not logged in
  if (requireAuth && !token) {
    debugLog('🛡 No token found, redirecting to login');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Role is specified, check if the user's role is permitted
  if (role && !isPermitted) {
    debugLog(`🛡 Role mismatch: required ${role}, but user has role ${user?.role}`);
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

export default ProtectedRoute;