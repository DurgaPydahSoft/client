import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/axios';
import { toast } from 'react-hot-toast';
import {
  UserGroupIcon,
  ChartBarIcon,
  CalendarIcon,
  AcademicCapIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import LoadingSpinner from '../../components/LoadingSpinner';
import SEO from '../../components/SEO';

// Helper function to get course name consistently
const getCourseName = (course) => {
  if (!course) return 'Course Management';
  if (typeof course === 'object' && course.name) return course.name;
  if (typeof course === 'string') return course;
  return 'Course Management';
};

const PrincipalHome = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalStudents: 0,
    presentToday: 0,
    absentToday: 0,
    attendanceRate: 0,
    courseStudents: 0
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch attendance stats for today
      const today = new Date().toISOString().split('T')[0];
      
      // Server already filters by course for principals, no need to pass course parameter
      const [statsRes, studentsRes] = await Promise.all([
        api.get(`/api/attendance/principal/stats?date=${today}`),
        api.get(`/api/attendance/principal/students/count`)
      ]);

      if (statsRes.data.success) {
        const statsData = statsRes.data.data;
        setStats({
          totalStudents: studentsRes.data.success ? studentsRes.data.data.total : 0,
          presentToday: statsData.presentToday || 0,
          absentToday: statsData.absentToday || 0,
          attendanceRate: statsData.attendanceRate || 0,
          courseStudents: statsData.courseStudents || 0
        });
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  const StatCard = ({ title, value, icon: Icon, color, subtitle }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl shadow-lg p-3 sm:p-6 border border-gray-100"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs sm:text-sm font-medium text-gray-600">{title}</p>
          <p className="text-lg sm:text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <div className={`p-2 sm:p-3 rounded-lg ${color}`}>
          <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-gray-50 mt-16 sm:mt-0">
      <SEO title="Principal Dashboard" />
      
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-lg p-4 sm:p-6 mb-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
                <AcademicCapIcon className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
                Principal Dashboard
              </h1>
              <p className="text-gray-600 mt-1 text-xs sm:text-sm">
                Welcome back, {user?.name || 'Principal'}! Here's an overview of your {getCourseName(user?.course)} management.
              </p>
            </div>
            <div className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-purple-50 rounded-lg">
              <AcademicCapIcon className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
              <span className="text-xs sm:text-sm font-medium text-purple-700">
                {getCourseName(user?.course)}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8"
        >
          <StatCard
            title="Total Students"
            value={stats.totalStudents}
            icon={UserGroupIcon}
            color="bg-blue-500"
            subtitle="Enrolled in course"
          />
          <StatCard
            title="Present Today"
            value={stats.presentToday}
            icon={CheckCircleIcon}
            color="bg-green-500"
            subtitle="All 3 sessions"
          />
          <StatCard
            title="Absent Today"
            value={stats.absentToday}
            icon={XCircleIcon}
            color="bg-red-500"
            subtitle="All sessions"
          />
          <StatCard
            title="Attendance Rate"
            value={`${stats.attendanceRate}%`}
            icon={ChartBarIcon}
            color="bg-purple-500"
            subtitle="Today's average"
          />
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl shadow-lg p-4 sm:p-6 mb-6 sm:mb-8"
        >
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-3 p-3 sm:p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors border border-purple-200 touch-manipulation"
            >
              <CalendarIcon className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
              <div className="text-left">
                <p className="font-medium text-purple-900 text-sm sm:text-base">View Attendance</p>
                <p className="text-xs sm:text-sm text-purple-600">Check attendance records</p>
              </div>
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-3 p-3 sm:p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200 touch-manipulation"
            >
              <ChartBarIcon className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
              <div className="text-left">
                <p className="font-medium text-blue-900 text-sm sm:text-base">Analytics</p>
                <p className="text-xs sm:text-sm text-blue-600">View attendance trends</p>
              </div>
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-3 p-3 sm:p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors border border-green-200 touch-manipulation"
            >
              <ClockIcon className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
              <div className="text-left">
                <p className="font-medium text-green-900 text-sm sm:text-base">Today's Report</p>
                <p className="text-xs sm:text-sm text-green-600">Current day summary</p>
              </div>
            </motion.button>
          </div>
        </motion.div>



        {/* Course Information */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-xl shadow-lg p-4 sm:p-6 mt-6 sm:mt-8"
        >
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Course Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <h3 className="font-medium text-gray-900 mb-2 text-sm sm:text-base">Course Details</h3>
              <div className="space-y-2 text-xs sm:text-sm text-gray-600">
                <p><span className="font-medium">Course:</span> {getCourseName(user?.course)}</p>
                <p><span className="font-medium">Total Students:</span> {stats.totalStudents}</p>
                <p><span className="font-medium">Today's Attendance:</span> {stats.attendanceRate}%</p>
              </div>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-2 text-sm sm:text-base">Quick Stats</h3>
              <div className="space-y-2 text-xs sm:text-sm text-gray-600">
                <p><span className="font-medium">Present Today:</span> {stats.presentToday} students</p>
                <p><span className="font-medium">Absent Today:</span> {stats.absentToday} students</p>
                <p><span className="font-medium">Last Updated:</span> {new Date().toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default PrincipalHome; 