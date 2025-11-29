import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  MegaphoneIcon,
  UsersIcon,
  UserGroupIcon,
  CalendarIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationCircleIcon,
  FunnelIcon
} from '@heroicons/react/24/outline';
import api from '../../utils/axios';
import toast from 'react-hot-toast';
import LoadingSpinner from '../../components/LoadingSpinner';
import SEO from '../../components/SEO';

const WardenHome = () => {
  const [loading, setLoading] = useState(true);
  const [announcements, setAnnouncements] = useState([]);
  const [genderFilter, setGenderFilter] = useState(''); // 'All', 'Male', 'Female'
  const [stats, setStats] = useState({
    totalStudents: 0,
    activeStudents: 0,
    todayAttendance: 0,
    maleStudents: 0,
    femaleStudents: 0,
    maleActive: 0,
    femaleActive: 0,
    maleAttendance: 0,
    femaleAttendance: 0
  });

  useEffect(() => {
    fetchDashboardData();
  }, [genderFilter]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Use Promise.all to fetch data in parallel for better performance
      const [
        announcementsRes,
        studentsCountRes,
        todayAttendanceRes,
        activeStudentsRes,
        maleStudentsRes,
        femaleStudentsRes,
        maleActiveRes,
        femaleActiveRes,
        maleAttendanceRes,
        femaleAttendanceRes
      ] = await Promise.allSettled([
        // Fetch announcements
        api.get('/api/announcements/warden'),
        
        // Get total students count (optimized endpoint)
        api.get('/api/admin/students/count'),
        
        // Get today's attendance (single call)
        api.get(`/api/attendance/date?date=${new Date().toISOString().split('T')[0]}`),
        
        // Get active students count (optimized)
        api.get('/api/admin/students/count?hostelStatus=Active'),
        
        // Get gender-specific counts (optimized)
        api.get('/api/admin/students/count?gender=Male'),
        api.get('/api/admin/students/count?gender=Female'),
        
        // Get gender-specific active counts (optimized)
        api.get('/api/admin/students/count?gender=Male&hostelStatus=Active'),
        api.get('/api/admin/students/count?gender=Female&hostelStatus=Active'),
        
        // Get gender-specific attendance (optimized)
        api.get(`/api/attendance/date?date=${new Date().toISOString().split('T')[0]}&gender=Male`),
        api.get(`/api/attendance/date?date=${new Date().toISOString().split('T')[0]}&gender=Female`)
      ]);

      // Process announcements
      if (announcementsRes.status === 'fulfilled' && announcementsRes.value.data.success) {
        setAnnouncements(announcementsRes.value.data.data || []);
      } else {
        setAnnouncements([]);
      }

      // Process stats with fallback values
      const totalStudents = studentsCountRes.status === 'fulfilled' && studentsCountRes.value.data.success 
        ? studentsCountRes.value.data.data.count : 0;
      
      const todayAttendance = todayAttendanceRes.status === 'fulfilled' && todayAttendanceRes.value.data.success 
        ? todayAttendanceRes.value.data.data.attendance?.length || 0 : 0;
      
      const activeStudents = activeStudentsRes.status === 'fulfilled' && activeStudentsRes.value.data.success 
        ? activeStudentsRes.value.data.data.count : 0;
      
      const maleStudents = maleStudentsRes.status === 'fulfilled' && maleStudentsRes.value.data.success 
        ? maleStudentsRes.value.data.data.count : 0;
      
      const femaleStudents = femaleStudentsRes.status === 'fulfilled' && femaleStudentsRes.value.data.success 
        ? femaleStudentsRes.value.data.data.count : 0;
      
      const maleActive = maleActiveRes.status === 'fulfilled' && maleActiveRes.value.data.success 
        ? maleActiveRes.value.data.data.count : 0;
      
      const femaleActive = femaleActiveRes.status === 'fulfilled' && femaleActiveRes.value.data.success 
        ? femaleActiveRes.value.data.data.count : 0;
      
      const maleAttendance = maleAttendanceRes.status === 'fulfilled' && maleAttendanceRes.value.data.success 
        ? maleAttendanceRes.value.data.data.attendance?.length || 0 : 0;
      
      const femaleAttendance = femaleAttendanceRes.status === 'fulfilled' && femaleAttendanceRes.value.data.success 
        ? femaleAttendanceRes.value.data.data.attendance?.length || 0 : 0;

      setStats({
        totalStudents,
        activeStudents,
        todayAttendance,
        maleStudents,
        femaleStudents,
        maleActive,
        femaleActive,
        maleAttendance,
        femaleAttendance
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  // Get filtered stats based on gender filter
  const getFilteredStats = () => {
    if (genderFilter === 'Male') {
      return {
        totalStudents: stats.maleStudents,
        activeStudents: stats.maleActive,
        todayAttendance: stats.maleAttendance
      };
    } else if (genderFilter === 'Female') {
      return {
        totalStudents: stats.femaleStudents,
        activeStudents: stats.femaleActive,
        todayAttendance: stats.femaleAttendance
      };
    } else {
      return {
        totalStudents: stats.totalStudents,
        activeStudents: stats.activeStudents,
        todayAttendance: stats.todayAttendance
      };
    }
  };

  const filteredStats = getFilteredStats();

  if (loading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen">
      <SEO title="Warden Dashboard" />
      
      <div className="w-full  mt-12 sm:mt-0">
      {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg sm:rounded-xl shadow-sm p-3 sm:p-4 lg:p-6 mb-3 sm:mb-4 lg:mb-6"
        >
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 sm:gap-4">
          <div>
              <h1 className="text-lg sm:text-xl lg:text-2xl font-bold bg-gradient-to-r from-green-600 to-green-700 bg-clip-text text-transparent flex items-center gap-2 sm:gap-3">
                <UserGroupIcon className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-green-600 flex-shrink-0" />
                <span>Warden Dashboard</span>
            </h1>
              <p className="text-xs sm:text-sm lg:text-base text-gray-600 mt-1 sm:mt-2">
              Welcome back! Here's an overview of hostel announcements and student management.
            </p>
          </div>
            <div className="flex items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-2">
                <FunnelIcon className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-gray-500" />
              <select
                value={genderFilter}
                onChange={(e) => setGenderFilter(e.target.value)}
                  className="px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-xs sm:text-sm"
              >
                <option value="">All Students</option>
                <option value="Male">Male Students</option>
                <option value="Female">Female Students</option>
              </select>
            </div>
          </div>
        </div>
        </motion.div>

      {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 mb-3 sm:mb-4 lg:mb-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
            className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4 lg:p-6"
        >
          <div className="flex items-center">
            <div className="flex-shrink-0">
                <UsersIcon className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-green-600" />
            </div>
              <div className="ml-3 sm:ml-4 lg:ml-5 w-0 flex-1">
              <dl>
                  <dt className="text-xs sm:text-sm font-medium text-gray-500 truncate">
                  Total Students {genderFilter && `(${genderFilter})`}
                </dt>
                  <dd className="text-base sm:text-lg lg:text-xl font-medium text-gray-900">
                  {filteredStats.totalStudents}
                </dd>
                {genderFilter === '' && (
                  <dd className="text-xs text-gray-400 mt-1">
                    Male: {stats.maleStudents} | Female: {stats.femaleStudents}
                  </dd>
                )}
              </dl>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
            className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4 lg:p-6"
        >
          <div className="flex items-center">
            <div className="flex-shrink-0">
                <UserGroupIcon className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-blue-600" />
            </div>
              <div className="ml-3 sm:ml-4 lg:ml-5 w-0 flex-1">
              <dl>
                  <dt className="text-xs sm:text-sm font-medium text-gray-500 truncate">
                  Active Students {genderFilter && `(${genderFilter})`}
                </dt>
                  <dd className="text-base sm:text-lg lg:text-xl font-medium text-gray-900">
                  {filteredStats.activeStudents}
                </dd>
                {genderFilter === '' && (
                  <dd className="text-xs text-gray-400 mt-1">
                    Male: {stats.maleActive} | Female: {stats.femaleActive}
                  </dd>
                )}
              </dl>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
            className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4 lg:p-6 sm:col-span-2 lg:col-span-1"
        >
          <div className="flex items-center">
            <div className="flex-shrink-0">
                <CalendarIcon className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-purple-600" />
            </div>
              <div className="ml-3 sm:ml-4 lg:ml-5 w-0 flex-1">
              <dl>
                  <dt className="text-xs sm:text-sm font-medium text-gray-500 truncate">
                  Today's Attendance {genderFilter && `(${genderFilter})`}
                </dt>
                  <dd className="text-base sm:text-lg lg:text-xl font-medium text-gray-900">
                  {filteredStats.todayAttendance}
                </dd>
                {genderFilter === '' && (
                  <dd className="text-xs text-gray-400 mt-1">
                    Male: {stats.maleAttendance} | Female: {stats.femaleAttendance}
                  </dd>
                )}
              </dl>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Quick Actions Section - Mobile First */}
        <div className="mb-3 sm:mb-4 lg:mb-6 lg:hidden">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
            className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4 lg:p-6"
          >
            <div className="flex items-center gap-2 mb-4 sm:mb-6">
              <CheckCircleIcon className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
              <h3 className="font-semibold text-gray-900 text-sm sm:text-base">Quick Actions</h3>
          </div>
            <div className="grid grid-cols-1 gap-3 sm:gap-4">
            <button
              onClick={() => window.location.href = '/warden/dashboard/take-attendance'}
                className="w-full flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-xs sm:text-sm"
            >
                <CalendarIcon className="w-4 h-4 sm:w-5 sm:h-5" />
              Take Attendance
            </button>
            <button
              onClick={() => window.location.href = '/warden/dashboard/view-attendance'}
                className="w-full flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-xs sm:text-sm"
            >
                <UsersIcon className="w-4 h-4 sm:w-5 sm:h-5" />
              View Attendance
            </button>
            <button
              onClick={() => window.location.href = '/warden/dashboard/bulk-outing'}
                className="w-full flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium text-xs sm:text-sm"
            >
                <UserGroupIcon className="w-4 h-4 sm:w-5 sm:h-5" />
              Bulk Outing
            </button>
          </div>
        </motion.div>
      </div>

      {/* Two-column grid: Announcements left (wide), Quick Actions right (narrow) - Desktop Only */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
        {/* Announcements Section (left, wide) */}
        <div className="lg:col-span-2">
            <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4 lg:p-6">
              <div className="flex items-center justify-between mb-4 sm:mb-6">
              <div className="flex items-center gap-2">
                  <MegaphoneIcon className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />
                  <h3 className="font-semibold text-gray-900 text-sm sm:text-base">Latest Announcements</h3>
                </div>
              </div>
              <div className="space-y-3 sm:space-y-4">
              {announcements.length === 0 ? (
                  <div className="text-center py-6 sm:py-8">
                    <MegaphoneIcon className="w-8 h-8 sm:w-12 sm:h-12 text-gray-400 mx-auto mb-2 sm:mb-3" />
                    <p className="text-gray-500 text-xs sm:text-sm">No announcements</p>
                </div>
              ) : (
                announcements.slice(0, 5).map((announcement) => (
                    <div key={announcement._id} className="p-3 sm:p-4 bg-gray-50 rounded-lg flex flex-col gap-2">
                    {announcement.imageUrl && (
                      <img
                        src={announcement.imageUrl}
                        alt={announcement.title}
                          className="w-full h-24 sm:h-32 object-cover rounded mb-2 border"
                        style={{ maxHeight: '130px' }}
                      />
                    )}
                      <h4 className="font-medium text-gray-900 mb-1 text-sm sm:text-base">{announcement.title}</h4>
                      <p className="text-xs sm:text-sm text-gray-600 line-clamp-2">{announcement.description}</p>
                    <p className="text-xs text-gray-500 mt-2">
                      {new Date(announcement.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions Section (right, narrow) - Desktop Only */}
        <div className="hidden lg:block lg:col-span-1">
            <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4 lg:p-6">
              <div className="flex items-center gap-2 mb-4 sm:mb-6">
                <CheckCircleIcon className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                <h3 className="font-semibold text-gray-900 text-sm sm:text-base">Quick Actions</h3>
            </div>
              <div className="space-y-3 sm:space-y-4">
              <button
                onClick={() => window.location.href = '/warden/dashboard/take-attendance'}
                  className="w-full flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-xs sm:text-sm"
              >
                  <CalendarIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                Take Attendance
              </button>
              <button
                onClick={() => window.location.href = '/warden/dashboard/view-attendance'}
                  className="w-full flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-xs sm:text-sm"
              >
                  <UsersIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                View Attendance
              </button>
              <button
                onClick={() => window.location.href = '/warden/dashboard/bulk-outing'}
                  className="w-full flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium text-xs sm:text-sm"
              >
                  <UserGroupIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                Bulk Outing
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
        <div className="mt-6 sm:mt-8 text-center">
          <p className="text-xs sm:text-sm text-gray-500">
          Last updated: {new Date().toLocaleString()}
        </p>
        </div>
      </div>
    </div>
  );
};

export default WardenHome; 