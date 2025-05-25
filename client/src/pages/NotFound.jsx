import React from 'react';

const NotFound = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-100">
    <div className="card text-center">
      <h1 className="text-3xl font-bold mb-2">404</h1>
      <p className="mb-4">Page Not Found</p>
      <a href="/login" className="btn-primary">Go to Login</a>
    </div>
  </div>
);

export default NotFound; 