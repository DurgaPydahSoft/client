import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import useFeatureToggles from '../hooks/useFeatureToggles';
import { toast } from 'react-hot-toast';

const FeatureProtectedRoute = ({ children, feature }) => {
  const { isFeatureEnabled, loading } = useFeatureToggles();
  const location = useLocation();

  // Show loading while feature toggles are being fetched
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // If feature is disabled, redirect to dashboard and show notification
  if (!isFeatureEnabled(feature)) {
    toast.error('This feature is currently disabled by the administrator.');
    return <Navigate to="/student" replace />;
  }

  // If feature is enabled, render the children
  return children;
};

export default FeatureProtectedRoute; 