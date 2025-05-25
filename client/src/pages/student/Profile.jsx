import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { motion } from 'framer-motion';
import api from '../../utils/axios';
import toast from 'react-hot-toast';
import LoadingSpinner from '../../components/LoadingSpinner';

const Profile = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [year, setYear] = useState(user?.year || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setLoading(false);
    }
  }, [user]);

  const handleYearChange = async () => {
    if (!year || year === user?.year) return;
    
    setSaving(true);
    try {
      const res = await api.put(`/api/student/profile`, { year });
      if (res.data.success) {
        toast.success('Year updated successfully');
        setEditing(false);
        // Update the user context with new year
        user.year = year;
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update year');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12"
    >
      <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 lg:p-8">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 sm:mb-8">
          <div className="text-center sm:text-left">
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-blue-900 mb-1 sm:mb-2">Profile</h2>
            <p className="text-sm sm:text-base text-gray-600">View and manage your profile information</p>
          </div>
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center text-white text-2xl sm:text-3xl font-bold shadow-lg">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {/* Left Column */}
          <div className="space-y-3 sm:space-y-4">
            <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
              <h3 className="text-xs sm:text-sm font-medium text-gray-500 mb-1">Name</h3>
              <p className="text-base sm:text-lg font-medium text-gray-900">{user?.name}</p>
            </div>
            <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
              <h3 className="text-xs sm:text-sm font-medium text-gray-500 mb-1">Roll Number</h3>
              <p className="text-base sm:text-lg font-medium text-gray-900">{user?.rollNumber}</p>
            </div>
            <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
              <h3 className="text-xs sm:text-sm font-medium text-gray-500 mb-1">Course</h3>
              <p className="text-base sm:text-lg font-medium text-gray-900">{user?.course}</p>
            </div>
            <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
              <h3 className="text-xs sm:text-sm font-medium text-gray-500 mb-1">Branch</h3>
              <p className="text-base sm:text-lg font-medium text-gray-900">{user?.branch}</p>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-3 sm:space-y-4">
            <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
              <h3 className="text-xs sm:text-sm font-medium text-gray-500 mb-1">Gender</h3>
              <p className="text-base sm:text-lg font-medium text-gray-900">{user?.gender || 'Not specified'}</p>
            </div>
            <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
              <h3 className="text-xs sm:text-sm font-medium text-gray-500 mb-1">Category</h3>
              <p className="text-base sm:text-lg font-medium text-gray-900">
                {user?.category === 'A+' ? 'A+ (AC)' : user?.category === 'B+' ? 'B+ (AC)' : user?.category || 'Not specified'}
              </p>
            </div>
            <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
              <h3 className="text-xs sm:text-sm font-medium text-gray-500 mb-1">Room Number</h3>
              <p className="text-base sm:text-lg font-medium text-gray-900">Room {user?.roomNumber || 'Not assigned'}</p>
            </div>
            <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex-1">
                  <h3 className="text-xs sm:text-sm font-medium text-gray-500 mb-1">Year</h3>
                  {editing ? (
                    <select
                      value={year}
                      onChange={(e) => setYear(e.target.value)}
                      className="w-full mt-1 block pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                    >
                      {Array.from(
                        { length: user?.course === 'B.Tech' || user?.course === 'Pharmacy' ? 4 : 3 },
                        (_, i) => i + 1
                      ).map((y) => (
                        <option key={y} value={y}>
                          Year {y}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-base sm:text-lg font-medium text-gray-900">Year {user?.year || 'Not specified'}</p>
                  )}
                </div>
                {editing ? (
                  <div className="flex gap-2 mt-2 sm:mt-0">
                    <button
                      onClick={() => {
                        setYear(user?.year);
                        setEditing(false);
                      }}
                      className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleYearChange}
                      disabled={saving || year === user?.year}
                      className={`px-3 py-1.5 text-sm rounded-md ${
                        saving || year === user?.year
                          ? 'bg-gray-300 cursor-not-allowed'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setEditing(true)}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium mt-2 sm:mt-0"
                  >
                    Edit
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Phone Numbers Section */}
        <div className="mt-6 sm:mt-8 grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
            <h3 className="text-xs sm:text-sm font-medium text-gray-500 mb-1">Student Phone</h3>
            <p className="text-base sm:text-lg font-medium text-gray-900">{user?.studentPhone || 'Not provided'}</p>
          </div>
          <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
            <h3 className="text-xs sm:text-sm font-medium text-gray-500 mb-1">Parent Phone</h3>
            <p className="text-base sm:text-lg font-medium text-gray-900">{user?.parentPhone || 'Not provided'}</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default Profile; 