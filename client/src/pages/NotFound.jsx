import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NotFound = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  const handleGoBack = () => {
    navigate(-1);
  };

  const redirectPath = () => {
    if (user?.role === 'warden') {
      return '/warden/dashboard';
    }
    return user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'sub_admin' ? '/admin/dashboard' : '/student';
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="max-w-md w-full p-8 bg-white rounded-lg shadow-lg text-center">
        <h1 className="text-6xl font-bold text-red-600 mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Page Not Found</h2>
        <p className="text-gray-600 mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="space-y-4">
          <button
            onClick={handleGoBack}
            className="w-full py-2 px-4 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
          >
            Go Back
          </button>
          <Link
            to={redirectPath()}
            className="block w-full py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Go to Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound; 