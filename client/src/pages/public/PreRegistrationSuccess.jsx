import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const PreRegistrationSuccess = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { rollNumber, name } = location.state || {};

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          {/* Success Icon */}
          <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-green-100 mb-6">
            <svg className="h-12 w-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          {/* Success Message */}
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Pre-Registration Submitted!
          </h2>
          
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <p className="text-gray-600 mb-4">
              Your pre-registration has been submitted successfully and is now pending admin approval.
            </p>
            
            {name && rollNumber && (
              <div className="bg-blue-50 rounded-lg p-4 mb-4">
                <h3 className="text-sm font-medium text-blue-800 mb-2">Registration Details:</h3>
                <div className="text-sm text-blue-700">
                  <p><span className="font-medium">Name:</span> {name}</p>
                  <p><span className="font-medium">Roll Number:</span> {rollNumber}</p>
                </div>
              </div>
            )}

            <div className="bg-yellow-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-yellow-800 mb-2">What happens next?</h3>
              <ul className="text-sm text-yellow-700 space-y-1">
                <li>• Admin will review your information</li>
                <li>• You'll be assigned hostel accommodation</li>
                <li>• You'll receive login credentials via SMS/Email</li>
                <li>• You can then access the student portal</li>
              </ul>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={() => navigate('/student/preregister')}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              Submit Another Registration
            </button>
            
            <button
              onClick={() => window.close()}
              className="w-full flex justify-center py-3 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              Close
            </button>
          </div>

          {/* Contact Information */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500">
              Need help? Contact the hostel administration.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PreRegistrationSuccess;
