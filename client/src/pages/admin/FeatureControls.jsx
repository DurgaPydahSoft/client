import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/axios';
import { toast } from 'react-hot-toast';
import {
  Cog6ToothIcon,
  EyeIcon,
  EyeSlashIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import LoadingSpinner from '../../components/LoadingSpinner';

const FeatureControls = () => {
  const { user } = useAuth();
  const [featureToggles, setFeatureToggles] = useState({
    overview: true,
    raiseComplaint: true,
    myComplaints: true,
    attendance: true,
    leave: true,
    foundLost: true,
    hostelFee: true,
    paymentHistory: true,
    announcements: true,
    polls: true,
    profile: true
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Feature descriptions for better UX
  const featureDescriptions = {
    overview: {
      name: "Overview Dashboard",
      description: "Main dashboard showing student statistics and quick actions",
      icon: "📊"
    },
    raiseComplaint: {
      name: "Raise Complaint",
      description: "Allow students to create new complaints",
      icon: "📝"
    },
    myComplaints: {
      name: "My Complaints",
      description: "Allow students to view and track their complaints",
      icon: "📋"
    },
    attendance: {
      name: "Attendance",
      description: "Allow students to view their attendance records",
      icon: "📅"
    },
    leave: {
      name: "Leave Management",
      description: "Allow students to apply for leave and permissions",
      icon: "🚪"
    },
    foundLost: {
      name: "Found & Lost",
      description: "Allow students to post and browse found/lost items",
      icon: "🔍"
    },
    hostelFee: {
      name: "Hostel Fee",
      description: "Allow students to view and manage hostel fees",
      icon: "💰"
    },
    paymentHistory: {
      name: "Payment History",
      description: "Allow students to view their payment records",
      icon: "📄"
    },
    announcements: {
      name: "Announcements",
      description: "Allow students to view announcements",
      icon: "📢"
    },
    polls: {
      name: "Polls",
      description: "Allow students to participate in polls",
      icon: "📊"
    },
    profile: {
      name: "Profile Management",
      description: "Allow students to view and edit their profile",
      icon: "👤"
    }
  };

  useEffect(() => {
    fetchFeatureToggles();
  }, []);

  const fetchFeatureToggles = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/feature-toggles/admin');

      if (response.data.success) {
        setFeatureToggles(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching feature toggles:', error);
      toast.error('Failed to load feature settings');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleChange = async (feature) => {
    try {
      setSaving(true);

      // Optimistically update the UI
      const newToggles = {
        ...featureToggles,
        [feature]: !featureToggles[feature]
      };
      setFeatureToggles(newToggles);

      // Prepare the update data
      const validFeatures = [
        'overview', 'raiseComplaint', 'myComplaints', 'attendance',
        'leave', 'foundLost', 'hostelFee', 'paymentHistory',
        'announcements', 'polls', 'profile'
      ];

      const updates = {};
      validFeatures.forEach(f => {
        if (newToggles.hasOwnProperty(f)) {
          updates[f] = newToggles[f];
        }
      });

      // Save to backend
      const response = await api.put('/api/feature-toggles/admin', updates);

      if (response.data.success) {
        toast.success(`${featureDescriptions[feature].name} ${newToggles[feature] ? 'enabled' : 'disabled'} successfully!`);
      } else {
        // Revert on error
        setFeatureToggles(prev => ({
          ...prev,
          [feature]: !prev[feature]
        }));
        toast.error('Failed to update feature setting');
      }
    } catch (error) {
      console.error('Error saving feature toggle:', error);
      // Revert on error
      setFeatureToggles(prev => ({
        ...prev,
        [feature]: !prev[feature]
      }));
      toast.error('Failed to update feature setting');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    try {
      setSaving(true);
      const response = await api.post('/api/feature-toggles/admin/reset');

      if (response.data.success) {
        setFeatureToggles(response.data.data);
        toast.success('Feature settings reset to default!');
      }
    } catch (error) {
      console.error('Error resetting feature toggles:', error);
      toast.error('Failed to reset feature settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
        <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="p-2 sm:p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg">
            <Cog6ToothIcon className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-blue-900">Feature Controls</h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1">
              Control which features are available to students in their dashboard. Changes are saved automatically.
            </p>
          </div>
        </div>

        {/* Reset Button */}
        <div className="flex flex-wrap gap-2 sm:gap-3">
          <button
            onClick={handleReset}
            disabled={saving}
            className="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
          >
            <ArrowPathIcon className="w-4 h-4 sm:w-5 sm:h-5" />
            Reset to Default
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 bg-green-100 rounded-lg">
              <EyeIcon className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
            </div>
            <div>
              <div className="text-lg sm:text-xl font-bold text-green-600">
                {Object.values(featureToggles).filter(Boolean).length}
              </div>
              <div className="text-xs text-gray-600">Features Enabled</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 bg-red-100 rounded-lg">
              <EyeSlashIcon className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />
            </div>
            <div>
              <div className="text-lg sm:text-xl font-bold text-red-600">
                {Object.values(featureToggles).filter(v => !v).length}
              </div>
              <div className="text-xs text-gray-600">Features Disabled</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4 sm:col-span-2 lg:col-span-1">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 bg-blue-100 rounded-lg">
              <Cog6ToothIcon className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-lg sm:text-xl font-bold text-blue-600">
                {Object.keys(featureToggles).length}
              </div>
              <div className="text-xs text-gray-600">Total Features</div>
            </div>
          </div>
        </div>
      </div>

      {/* Feature Toggles Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
        {Object.entries(featureDescriptions).map(([feature, info]) => (
          <div
            key={feature}
            className={`bg-white rounded-lg border-2 transition-all duration-300 hover:shadow-md ${featureToggles[feature]
                ? 'border-green-200 shadow-sm'
                : 'border-red-200 shadow-sm'
              }`}
          >
            <div className="p-3 sm:p-4">
              {/* Header */}
              <div className="flex items-start justify-between mb-2 sm:mb-3">
                <div className="flex items-start gap-1.5 sm:gap-2 flex-1 min-w-0">
                  <span className="text-lg sm:text-xl flex-shrink-0">{info.icon}</span>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm sm:text-base font-semibold text-gray-900 truncate">
                      {info.name}
                    </h3>
                    <p className="text-xs text-gray-600 mt-0.5 sm:mt-1 line-clamp-2">
                      {info.description}
                    </p>
                  </div>
                </div>

                {/* Toggle Switch */}
                <div className="flex-shrink-0 ml-2 sm:ml-3">
                  <button
                    onClick={() => handleToggleChange(feature)}
                    disabled={saving}
                    className={`relative inline-flex h-5 w-9 sm:h-6 sm:w-10 items-center rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${featureToggles[feature]
                        ? 'bg-green-600'
                        : 'bg-gray-300'
                      }`}
                  >
                    <span
                      className={`inline-block h-3 w-3 sm:h-4 sm:w-4 transform rounded-full bg-white shadow-sm transition-all duration-200 ${featureToggles[feature] ? 'translate-x-4 sm:translate-x-5' : 'translate-x-1'
                        }`}
                    />
                    {saving && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 border border-white border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                  </button>
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center gap-1.5 sm:gap-2">
                {featureToggles[feature] ? (
                  <>
                    <EyeIcon className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-green-600 flex-shrink-0" />
                    <span className="text-xs font-medium text-green-600">
                      Visible to Students
                    </span>
                  </>
                ) : (
                  <>
                    <EyeSlashIcon className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-red-600 flex-shrink-0" />
                    <span className="text-xs font-medium text-red-600">
                      Hidden from Students
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Warning */}
      {Object.values(featureToggles).filter(v => !v).length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg sm:rounded-xl p-4 sm:p-6">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="flex-shrink-0">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h4 className="text-base sm:text-lg font-semibold text-yellow-800 mb-1 sm:mb-2">
                Disabled Features
              </h4>
              <p className="text-sm sm:text-base text-yellow-700">
                Some features are currently disabled. Students will not be able to access these features in their dashboard.
                Changes are saved automatically and take effect immediately for new sessions.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeatureControls; 