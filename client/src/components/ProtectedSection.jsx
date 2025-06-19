import React from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldExclamationIcon } from '@heroicons/react/24/outline';

// Permission Denied Component
const PermissionDenied = ({ sectionName }) => {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center max-w-md mx-auto">
        <div className="w-20 h-20 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
          <ShieldExclamationIcon className="w-10 h-10 text-red-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Restricted</h2>
        <p className="text-gray-600 mb-6">
          You don't have permission to access the <strong>{sectionName}</strong> section. 
          Please contact your super admin to request access.
        </p>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>Available sections:</strong> Check the sidebar for sections you can access.
          </p>
        </div>
      </div>
    </div>
  );
};

// Protected Section Component
const ProtectedSection = ({ permission, sectionName, children }) => {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin';
  const hasPermission = isSuperAdmin || user?.permissions?.includes(permission);

  if (!hasPermission) {
    return <PermissionDenied sectionName={sectionName} />;
  }

  return children;
};

export default ProtectedSection; 