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
      // Fetch announcements using warden-specific endpoint
      try {
        const announcementsRes = await api.get('/api/announcements/warden');
        if (announcementsRes.data.success) {
          setAnnouncements(announcementsRes.data.data || []);
        }
      } catch (announcementError) {
        console.error('Error fetching announcements:', announcementError);
        // Set empty array if announcements fail
        setAnnouncements([]);
      }

      // Fetch real stats from available endpoints with individual error handling
      let totalStudents = 0;
      let todayAttendance = 0;
      let activeStudents = 0;
      let maleStudents = 0;
      let femaleStudents = 0;
      let maleActive = 0;
      let femaleActive = 0;
      let maleAttendance = 0;
      let femaleAttendance = 0;

      // Get total students count
      try {
        const studentsRes = await api.get('/api/admin/students/count');
        totalStudents = studentsRes.data.success ? studentsRes.data.data.count : 0;
      } catch (error) {
        console.error('Error fetching total students count:', error);
      }

      // Get today's attendance data using the same endpoint as ViewAttendance
      try {
        const today = new Date().toISOString().split('T')[0];
        console.log('🔍 WardenHome: Using date for attendance:', today);
        
        // Validate that the date is not in the future
        const currentDate = new Date();
        const selectedDate = new Date(today);
        let attendanceDate = today;
        
        if (selectedDate > currentDate) {
          console.warn('🔍 WardenHome: Date is in the future, using current date instead');
          attendanceDate = currentDate.toISOString().split('T')[0];
          console.log('🔍 WardenHome: Using current date instead:', attendanceDate);
        }
        
        const attendanceRes = await api.get(`/api/attendance/date?date=${attendanceDate}`);
        todayAttendance = attendanceRes.data.success ? attendanceRes.data.data.attendance?.length || 0 : 0;
      } catch (error) {
        console.error('Error fetching today attendance:', error);
      }

      // Get active students (students with Active hostel status)
      try {
        const activeStudentsRes = await api.get('/api/admin/students?hostelStatus=Active&limit=1000');
        activeStudents = activeStudentsRes.data.success ? activeStudentsRes.data.data.students?.length || 0 : 0;
      } catch (error) {
        console.error('Error fetching active students:', error);
      }

      // Get gender-specific statistics
      try {
        const maleStudentsRes = await api.get('/api/admin/students?gender=Male&limit=1000');
        const femaleStudentsRes = await api.get('/api/admin/students?gender=Female&limit=1000');
        
        maleStudents = maleStudentsRes.data.success ? maleStudentsRes.data.data.students?.length || 0 : 0;
        femaleStudents = femaleStudentsRes.data.success ? femaleStudentsRes.data.data.students?.length || 0 : 0;
      } catch (error) {
        console.error('Error fetching gender-specific students:', error);
      }

      // Get gender-specific active students
      try {
        const maleActiveRes = await api.get('/api/admin/students?gender=Male&hostelStatus=Active&limit=1000');
        const femaleActiveRes = await api.get('/api/admin/students?gender=Female&hostelStatus=Active&limit=1000');
        
        maleActive = maleActiveRes.data.success ? maleActiveRes.data.data.students?.length || 0 : 0;
        femaleActive = femaleActiveRes.data.success ? femaleActiveRes.data.data.students?.length || 0 : 0;
      } catch (error) {
        console.error('Error fetching gender-specific active students:', error);
      }

      // Get gender-specific attendance using the same endpoint as ViewAttendance
      try {
        const today = new Date().toISOString().split('T')[0];
        const currentDate = new Date();
        const selectedDate = new Date(today);
        let attendanceDate = today;
        
        if (selectedDate > currentDate) {
          attendanceDate = currentDate.toISOString().split('T')[0];
        }
        
        console.log('🔍 WardenHome: Fetching gender-specific attendance for date:', attendanceDate);
        const maleAttendanceRes = await api.get(`/api/attendance/date?date=${attendanceDate}&gender=Male`);
        const femaleAttendanceRes = await api.get(`/api/attendance/date?date=${attendanceDate}&gender=Female`);
        
        maleAttendance = maleAttendanceRes.data.success ? maleAttendanceRes.data.data.attendance?.length || 0 : 0;
        femaleAttendance = femaleAttendanceRes.data.success ? femaleAttendanceRes.data.data.attendance?.length || 0 : 0;
      } catch (error) {
        console.error('Error fetching gender-specific attendance:', error);
      }

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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <SEO title="Warden Dashboard" />
      
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-green-900 to-green-700 bg-clip-text text-transparent">
              Warden Dashboard
            </h1>
            <p className="text-gray-600 mt-2">
              Welcome back! Here's an overview of hostel announcements and student management.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <FunnelIcon className="w-5 h-5 text-gray-500" />
              <select
                value={genderFilter}
                onChange={(e) => setGenderFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
              >
                <option value="">All Students</option>
                <option value="Male">Male Students</option>
                <option value="Female">Female Students</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
        >
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <UsersIcon className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Total Students {genderFilter && `(${genderFilter})`}
                </dt>
                <dd className="text-lg font-medium text-gray-900">
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
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
        >
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <UserGroupIcon className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Active Students {genderFilter && `(${genderFilter})`}
                </dt>
                <dd className="text-lg font-medium text-gray-900">
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
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
        >
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CalendarIcon className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Today's Attendance {genderFilter && `(${genderFilter})`}
                </dt>
                <dd className="text-lg font-medium text-gray-900">
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
      <div className="mb-8 lg:hidden">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
        >
          <div className="flex items-center gap-2 mb-6">
            <CheckCircleIcon className="w-5 h-5 text-green-600" />
            <h3 className="font-semibold text-gray-900">Quick Actions</h3>
          </div>
          <div className="grid grid-cols-1 gap-4">
            <button
              onClick={() => window.location.href = '/warden/dashboard/take-attendance'}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
            >
              <CalendarIcon className="w-5 h-5" />
              Take Attendance
            </button>
            <button
              onClick={() => window.location.href = '/warden/dashboard/view-attendance'}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <UsersIcon className="w-5 h-5" />
              View Attendance
            </button>
            <button
              onClick={() => window.location.href = '/warden/dashboard/bulk-outing'}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
            >
              <UserGroupIcon className="w-5 h-5" />
              Bulk Outing
            </button>
          </div>
        </motion.div>
      </div>

      {/* Two-column grid: Announcements left (wide), Quick Actions right (narrow) - Desktop Only */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Announcements Section (left, wide) */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <MegaphoneIcon className="w-5 h-5 text-indigo-600" />
                <h3 className="font-semibold text-gray-900">Latest Announcements</h3>
              </div>
            </div>
            <div className="space-y-4">
              {announcements.length === 0 ? (
                <div className="text-center py-8">
                  <MegaphoneIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500">No announcements</p>
                </div>
              ) : (
                announcements.slice(0, 5).map((announcement) => (
                  <div key={announcement._id} className="p-4 bg-gray-50 rounded-lg flex flex-col gap-2">
                    {announcement.imageUrl && (
                      <img
                        src={announcement.imageUrl}
                        alt={announcement.title}
                        className="w-full h-32 object-cover rounded mb-2 border"
                        style={{ maxHeight: '130px' }}
                      />
                    )}
                    <h4 className="font-medium text-gray-900 mb-1">{announcement.title}</h4>
                    <p className="text-sm text-gray-600 line-clamp-2">{announcement.description}</p>
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
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-6">
              <CheckCircleIcon className="w-5 h-5 text-green-600" />
              <h3 className="font-semibold text-gray-900">Quick Actions</h3>
            </div>
            <div className="space-y-4">
              <button
                onClick={() => window.location.href = '/warden/dashboard/take-attendance'}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                <CalendarIcon className="w-5 h-5" />
                Take Attendance
              </button>
              <button
                onClick={() => window.location.href = '/warden/dashboard/view-attendance'}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                <UsersIcon className="w-5 h-5" />
                View Attendance
              </button>
              <button
                onClick={() => window.location.href = '/warden/dashboard/bulk-outing'}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
              >
                <UserGroupIcon className="w-5 h-5" />
                Bulk Outing
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 text-center">
        <p className="text-sm text-gray-500">
          Last updated: {new Date().toLocaleString()}
        </p>
      </div>
    </div>
  );
};

export default WardenHome; 