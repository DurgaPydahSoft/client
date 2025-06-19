import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from './LoadingSpinner';

const ProtectedRoute = ({ children, requireAuth = true, requirePasswordChange = false, role }) => {
  const { user, token, loading, requiresPasswordChange: needsPasswordChange } = useAuth();
  const location = useLocation();

  console.log('🛡️ ProtectedRoute check:', {
    path: location.pathname,
    requireAuth,
    requirePasswordChange,
    role,
    hasToken: !!token,
    userRole: user?.role,
    userPermissions: user?.permissions,
    needsPasswordChange,
    isPasswordChanged: user?.isPasswordChanged,
    isLoading: loading,
    user: user ? 'exists' : 'null'
  });

  if (loading) {
    console.log('🛡️ Auth context is loading, ProtectedRoute is waiting...');
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // If authentication is required and user is not logged in
  if (requireAuth && !token) {
    console.log('🛡️ No token found, redirecting to login');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If role is specified and user's role doesn't match
  if (role && user?.role !== role) {
    // Special handling for admin routes - allow 'admin', 'super_admin', and 'sub_admin'
    if (role === 'admin' && (user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'sub_admin')) {
      console.log('🛡️ Admin access granted for role:', user?.role);
    } else {
      console.log(`🛡️ Role mismatch: required ${role}, got ${user?.role}, redirecting to login`);
      return <Navigate to="/login" state={{ from: location }} replace />;
    }
  }

  // If user needs to change password and is not on reset password page
  if (requireAuth && token && needsPasswordChange && !requirePasswordChange) {
    console.log('🛡️ Password change required, redirecting to reset password page');
    return <Navigate to="/student/reset-password" state={{ from: location }} replace />;
  }

  // If on reset password page but password change is not needed
  if (requirePasswordChange && (!token || !needsPasswordChange)) {
    console.log('🛡️ No password change needed, redirecting to student dashboard');
    return <Navigate to="/student" state={{ from: location }} replace />;
  }

  console.log('🛡️ Access granted to protected route');
  return children;
};

export default ProtectedRoute; 