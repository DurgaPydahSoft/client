import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/axios';
import { toast } from 'react-hot-toast';
import {
  UserGroupIcon,
  ChartBarIcon,
  CalendarIcon,
  AcademicCapIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  UserIcon,
  DocumentTextIcon,
  HomeIcon,
  SunIcon,
  MoonIcon,
  StarIcon,
  CheckIcon,
  XMarkIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from '@heroicons/react/24/outline';
import LoadingSpinner from '../../components/LoadingSpinner';
import Modal from '../../components/Modal';
import SEO from '../../components/SEO';

// Helper function to get course name consistently
const getCourseName = (course) => {
  if (!course) return 'Course Management';
  if (typeof course === 'object' && course.name) return course.name;
  if (typeof course === 'string') return course;
  return 'Course Management';
};

// Helper function to format date with ordinal suffix
const formatDateWithOrdinal = (date) => {
  const day = date.getDate();
  const month = date.toLocaleDateString('en-US', { month: 'long' });
  const year = date.getFullYear();
  
  // Add ordinal suffix to day
  const getOrdinalSuffix = (day) => {
    if (day > 3 && day < 21) return 'th';
    switch (day % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  };
  
  return `${day}${getOrdinalSuffix(day)} ${month} ${year}`;
};

// Helper function to safely get course name
const getCourseNameFromObject = (course) => {
  if (!course) return 'N/A';
  if (typeof course === 'object' && course.name) return course.name;
  if (typeof course === 'string') return course;
  return 'N/A';
};

// Helper function to safely get branch name
const getBranchName = (branch) => {
  if (!branch) return 'N/A';
  if (typeof branch === 'object' && branch.name) return branch.name;
  if (typeof branch === 'string') return branch;
  return 'N/A';
};

// Student Card Component with Dropdown
const StudentCard = ({ student }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getStatusColor = (status) => {
    switch (status) {
      case 'Present': return 'text-green-600 bg-green-50';
      case 'Partial': return 'text-yellow-600 bg-yellow-50';
      case 'Absent': return 'text-red-600 bg-red-50';
      case 'On Leave': return 'text-blue-600 bg-blue-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Present': return <CheckIcon className="w-4 h-4" />;
      case 'Partial': return <ClockIcon className="w-4 h-4" />;
      case 'Absent': return <XMarkIcon className="w-4 h-4" />;
      case 'On Leave': return <CalendarIcon className="w-4 h-4" />;
      default: return null;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden"
    >
      {/* Main Card - Always Visible */}
      <div 
        className="p-3 sm:p-4 cursor-pointer hover:bg-gray-100 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Student Photo */}
          <div className="flex-shrink-0">
            {student.studentPhoto ? (
              <img
                src={student.studentPhoto}
                alt={student.name}
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover border-2 border-white shadow-sm"
              />
            ) : (
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-purple-100 flex items-center justify-center border-2 border-white shadow-sm">
                <span className="text-sm sm:text-base font-medium text-purple-600">
                  {student.name?.charAt(0) || 'S'}
                </span>
              </div>
            )}
          </div>
          
          {/* Student Name and Basic Info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 text-sm sm:text-base truncate">
              {student.name}
            </h3>
            <p className="text-xs sm:text-sm text-gray-500 truncate">
              {student.rollNumber} • {getCourseNameFromObject(student.course)} {student.year}
            </p>
          </div>
          
          {/* Status Badge */}
          <div className="flex-shrink-0">
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(student.status)}`}>
              {getStatusIcon(student.status)}
              <span className="ml-1 hidden sm:inline">{student.status}</span>
              <span className="ml-1 sm:hidden">{student.status.charAt(0)}</span>
            </span>
          </div>
          
          {/* Expand/Collapse Icon */}
          <div className="flex-shrink-0">
            {isExpanded ? (
              <ChevronUpIcon className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDownIcon className="w-5 h-5 text-gray-400" />
            )}
          </div>
        </div>
      </div>
      
      {/* Expanded Details */}
      <motion.div
        initial={false}
        animate={{ height: isExpanded ? 'auto' : 0, opacity: isExpanded ? 1 : 0 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="overflow-hidden"
      >
        <div className="px-3 sm:px-4 pb-3 sm:pb-4 bg-white border-t border-gray-200">
          {/* Detailed Information */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-3">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Course Details</p>
              <p className="text-sm text-gray-900">{getCourseNameFromObject(student.course)} {student.year}</p>
              <p className="text-sm text-gray-600">{getBranchName(student.branch)}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Hostel Details</p>
              <p className="text-sm text-gray-900">Room {student.roomNumber}</p>
              <p className="text-sm text-gray-600">{student.gender}</p>
            </div>
          </div>
          
          {/* Attendance Session Details */}
          {student.morning !== undefined && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Attendance Sessions</p>
              <div className="flex flex-wrap gap-3 sm:gap-4">
                <span className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${student.morning ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'}`}>
                  <SunIcon className="w-3 h-3" />
                  <span className="hidden sm:inline">Morning</span>
                  <span className="sm:hidden">M</span>
                  {student.morning ? '✓' : '✗'}
                </span>
                <span className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${student.evening ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'}`}>
                  <MoonIcon className="w-3 h-3" />
                  <span className="hidden sm:inline">Evening</span>
                  <span className="sm:hidden">E</span>
                  {student.evening ? '✓' : '✗'}
                </span>
                <span className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${student.night ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'}`}>
                  <StarIcon className="w-3 h-3" />
                  <span className="hidden sm:inline">Night</span>
                  <span className="sm:hidden">N</span>
                  {student.night ? '✓' : '✗'}
                </span>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

const PrincipalHome = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalStudents: 0,
    presentToday: 0,
    absentToday: 0,
    attendanceRate: 0,
    courseStudents: 0,
    // Detailed stats
    morningPresent: 0,
    eveningPresent: 0,
    nightPresent: 0,
    fullyPresent: 0,
    partiallyPresent: 0,
    onLeave: 0
  });
  const [studentsModal, setStudentsModal] = useState({
    open: false,
    students: [],
    status: '',
    count: 0,
    loading: false
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Always fetch today's stats
      const today = new Date().toISOString().split('T')[0];
      
      // Server already filters by course for principals, no need to pass course parameter
      const [statsRes, studentsRes, detailedStatsRes] = await Promise.all([
        api.get(`/api/attendance/principal/stats?date=${today}`),
        api.get(`/api/attendance/principal/students/count`),
        api.get(`/api/attendance/principal/date?date=${today}`)
      ]);

      if (statsRes.data.success) {
        const statsData = statsRes.data.data;
        setStats({
          totalStudents: studentsRes.data.success ? studentsRes.data.data.total : 0,
          presentToday: statsData.presentToday || 0,
          absentToday: statsData.absentToday || 0,
          attendanceRate: statsData.attendanceRate || 0,
          courseStudents: statsData.courseStudents || 0,
          // Detailed stats from the detailed endpoint
          morningPresent: detailedStatsRes.data.success ? detailedStatsRes.data.data.statistics.morningPresent : 0,
          eveningPresent: detailedStatsRes.data.success ? detailedStatsRes.data.data.statistics.eveningPresent : 0,
          nightPresent: detailedStatsRes.data.success ? detailedStatsRes.data.data.statistics.nightPresent : 0,
          fullyPresent: detailedStatsRes.data.success ? detailedStatsRes.data.data.statistics.fullyPresent : 0,
          partiallyPresent: detailedStatsRes.data.success ? detailedStatsRes.data.data.statistics.partiallyPresent : 0,
          onLeave: detailedStatsRes.data.success ? detailedStatsRes.data.data.statistics.onLeave : 0
        });
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleStatClick = async (status) => {
    try {
      // Open modal instantly with loading state
      setStudentsModal({
        open: true,
        students: [],
        status: status,
        count: 0,
        loading: true
      });

      // Always use today's date for the modal
      const today = new Date().toISOString().split('T')[0];
      const response = await api.get(`/api/attendance/principal/students/by-status?date=${today}&status=${status}`);
      
      if (response.data.success) {
        setStudentsModal({
          open: true,
          students: response.data.data.students,
          status: status,
          count: response.data.data.count,
          loading: false
        });
      }
    } catch (error) {
      console.error('Error fetching students by status:', error);
      toast.error('Failed to load students');
      // Close modal on error
      setStudentsModal({
        open: false,
        students: [],
        status: '',
        count: 0,
        loading: false
      });
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Present': return 'text-green-600 bg-green-50';
      case 'Partial': return 'text-yellow-600 bg-yellow-50';
      case 'Absent': return 'text-red-600 bg-red-50';
      case 'On Leave': return 'text-blue-600 bg-blue-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Present': return <CheckIcon className="w-4 h-4" />;
      case 'Partial': return <ClockIcon className="w-4 h-4" />;
      case 'Absent': return <XMarkIcon className="w-4 h-4" />;
      case 'On Leave': return <CalendarIcon className="w-4 h-4" />;
      default: return null;
    }
  };

  if (loading) return <LoadingSpinner />;

  const StatCard = ({ title, value, icon: Icon, color, subtitle, clickable = false, onClick }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white rounded-xl shadow-lg p-2 sm:p-3 md:p-6 border border-gray-100 ${clickable ? 'cursor-pointer hover:shadow-xl transition-all duration-300 relative group' : ''}`}
      onClick={clickable ? onClick : undefined}
      whileHover={clickable ? { scale: 1.02 } : {}}
      whileTap={clickable ? { scale: 0.98 } : {}}
    >
      {clickable && (
        <div className="absolute top-1 right-1 sm:top-2 sm:right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="bg-blue-500 text-white text-xs px-1 py-0.5 sm:px-2 sm:py-1 rounded-full">
            <span className="hidden sm:inline">Click to view</span>
            <span className="sm:hidden">View</span>
          </div>
        </div>
      )}
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">{title}</p>
          <p className="text-sm sm:text-lg md:text-2xl font-bold text-gray-900 mt-1 truncate">{value}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-1 truncate">{subtitle}</p>}
        </div>
        <div className={`p-1.5 sm:p-2 md:p-3 rounded-lg ${color} flex-shrink-0`}>
          <Icon className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-white" />
        </div>
      </div>
    </motion.div>
  );

  // Quick action handlers
  const handleQuickAction = (path) => {
    navigate(path);
  };

  return (
    <div className="min-h-screen bg-gray-50 mt-16 sm:mt-0">
      <SEO title="Principal Dashboard" />
      
      <div className="mx-auto">
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
                <span className="bg-gradient-to-r from-purple-900 to-purple-700 text-transparent bg-clip-text">Principal Dashboard</span>
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

        {/* Main Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8"
        >
          <StatCard
            title="Total Students"
            value={stats.totalStudents}
            icon={UserGroupIcon}
            color="bg-blue-500"
            subtitle="Enrolled in course"
            clickable={true}
            onClick={() => handleStatClick('All')}
          />
          <StatCard
            title="Present Today"
            value={stats.fullyPresent}
            icon={CheckCircleIcon}
            color="bg-green-500"
            subtitle="All 3 sessions"
            clickable={true}
            onClick={() => handleStatClick('Present')}
          />
          <StatCard
            title="Partially Present"
            value={stats.partiallyPresent}
            icon={ClockIcon}
            color="bg-yellow-500"
            subtitle="Some sessions"
            clickable={true}
            onClick={() => handleStatClick('Partial')}
          />
          <StatCard
            title="Absent Today"
            value={stats.absentToday}
            icon={XCircleIcon}
            color="bg-red-500"
            subtitle="All sessions"
            clickable={true}
            onClick={() => handleStatClick('Absent')}
          />
          <StatCard
            title="Attendance Rate"
            value={`${stats.attendanceRate}%`}
            icon={ChartBarIcon}
            color="bg-purple-500"
            subtitle="Today's average"
          />
        </motion.div>

        {/* Detailed Statistics */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-xl shadow-lg p-3 sm:p-4 md:p-6 mb-6 sm:mb-8"
        >
          <h2 className="text-sm sm:text-base md:text-lg font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
            <ChartBarIcon className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
            Detailed Attendance Statistics
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 md:gap-4">
            <motion.div 
              className="text-center cursor-pointer hover:bg-gray-50 rounded-lg p-2 sm:p-3 transition-colors relative group"
              onClick={() => handleStatClick('Morning')}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="bg-blue-500 text-white text-xs px-1 py-0.5 rounded-full">
                  <span className="hidden sm:inline">View</span>
                  <span className="sm:hidden">V</span>
                </div>
              </div>
              <p className="text-xs sm:text-sm text-gray-500">Morning Present</p>
              <p className="text-sm sm:text-lg md:text-2xl font-bold text-yellow-600">{stats.morningPresent}</p>
            </motion.div>
            <motion.div 
              className="text-center cursor-pointer hover:bg-gray-50 rounded-lg p-2 sm:p-3 transition-colors relative group"
              onClick={() => handleStatClick('Evening')}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="bg-blue-500 text-white text-xs px-1 py-0.5 rounded-full">
                  <span className="hidden sm:inline">View</span>
                  <span className="sm:hidden">V</span>
                </div>
              </div>
              <p className="text-xs sm:text-sm text-gray-500">Evening Present</p>
              <p className="text-sm sm:text-lg md:text-2xl font-bold text-indigo-600">{stats.eveningPresent}</p>
            </motion.div>
            <motion.div 
              className="text-center cursor-pointer hover:bg-gray-50 rounded-lg p-2 sm:p-3 transition-colors relative group"
              onClick={() => handleStatClick('Night')}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="bg-blue-500 text-white text-xs px-1 py-0.5 rounded-full">
                  <span className="hidden sm:inline">View</span>
                  <span className="sm:hidden">V</span>
                </div>
              </div>
              <p className="text-xs sm:text-sm text-gray-500">Night Present</p>
              <p className="text-sm sm:text-lg md:text-2xl font-bold text-blue-600">{stats.nightPresent}</p>
            </motion.div>
            <motion.div 
              className="text-center cursor-pointer hover:bg-gray-50 rounded-lg p-2 sm:p-3 transition-colors relative group"
              onClick={() => handleStatClick('Present')}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="bg-blue-500 text-white text-xs px-1 py-0.5 rounded-full">
                  <span className="hidden sm:inline">View</span>
                  <span className="sm:hidden">V</span>
                </div>
              </div>
              <p className="text-xs sm:text-sm text-gray-500">Fully Present</p>
              <p className="text-sm sm:text-lg md:text-2xl font-bold text-green-600">{stats.fullyPresent}</p>
            </motion.div>
            <motion.div 
              className="text-center cursor-pointer hover:bg-gray-50 rounded-lg p-2 sm:p-3 transition-colors relative group"
              onClick={() => handleStatClick('Partial')}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="bg-blue-500 text-white text-xs px-1 py-0.5 rounded-full">
                  <span className="hidden sm:inline">View</span>
                  <span className="sm:hidden">V</span>
                </div>
              </div>
              <p className="text-xs sm:text-sm text-gray-500">Partially Present</p>
              <p className="text-sm sm:text-lg md:text-2xl font-bold text-orange-600">{stats.partiallyPresent}</p>
            </motion.div>
            <motion.div 
              className="text-center cursor-pointer hover:bg-gray-50 rounded-lg p-2 sm:p-3 transition-colors relative group"
              onClick={() => handleStatClick('On Leave')}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="bg-blue-500 text-white text-xs px-1 py-0.5 rounded-full">
                  <span className="hidden sm:inline">View</span>
                  <span className="sm:hidden">V</span>
                </div>
              </div>
              <p className="text-xs sm:text-sm text-gray-500">On Leave</p>
              <p className="text-sm sm:text-lg md:text-2xl font-bold text-blue-600">{stats.onLeave}</p>
            </motion.div>
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-xl shadow-lg p-4 sm:p-6 mb-6 sm:mb-8"
        >
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleQuickAction('/principal/dashboard/attendance')}
              className="flex items-center gap-3 p-3 sm:p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors border border-purple-200 touch-manipulation"
            >
              <CalendarIcon className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
              <div className="text-left">
                <p className="font-medium text-purple-900 text-sm sm:text-base">Attendance</p>
                <p className="text-xs sm:text-sm text-purple-600">View and manage attendance</p>
              </div>
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleQuickAction('/principal/dashboard/students')}
              className="flex items-center gap-3 p-3 sm:p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200 touch-manipulation"
            >
              <UserIcon className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
              <div className="text-left">
                <p className="font-medium text-blue-900 text-sm sm:text-base">Students</p>
                <p className="text-xs sm:text-sm text-blue-600">Manage student information</p>
              </div>
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleQuickAction('/principal/dashboard/leave-management')}
              className="flex items-center gap-3 p-3 sm:p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors border border-green-200 touch-manipulation"
            >
              <DocumentTextIcon className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
              <div className="text-left">
                <p className="font-medium text-green-900 text-sm sm:text-base">Leave Management</p>
                <p className="text-xs sm:text-sm text-green-600">Approve leave requests</p>
              </div>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleQuickAction('/principal/dashboard/stay-in-hostel-requests')}
              className="flex items-center gap-3 p-3 sm:p-4 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors border border-orange-200 touch-manipulation"
            >
              <HomeIcon className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" />
              <div className="text-left">
                <p className="font-medium text-orange-900 text-sm sm:text-base">Stay in Hostel</p>
                <p className="text-xs sm:text-sm text-orange-600">Review stay requests</p>
              </div>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleQuickAction('/principal/dashboard/attendance')}
              className="flex items-center gap-3 p-3 sm:p-4 bg-teal-50 hover:bg-teal-100 rounded-lg transition-colors border border-teal-200 touch-manipulation"
            >
              <ClockIcon className="w-5 h-5 sm:w-6 sm:h-6 text-teal-600" />
              <div className="text-left">
                <p className="font-medium text-teal-900 text-sm sm:text-base">Today's Report</p>
                <p className="text-xs sm:text-sm text-teal-600">Current day summary</p>
              </div>
            </motion.button>
          </div>
        </motion.div>

        {/* Course Information */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
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
                <p><span className="font-medium">Present Today:</span> {stats.fullyPresent} students</p>
                <p><span className="font-medium">Absent Today:</span> {stats.absentToday} students</p>
                <p><span className="font-medium">Last Updated:</span> {formatDateWithOrdinal(new Date())}</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Students Modal */}
      <Modal isOpen={studentsModal.open} onClose={() => setStudentsModal({ open: false, students: [], status: '', count: 0, loading: false })} title={`${studentsModal.status} Students (${studentsModal.count})`}>
        {studentsModal.loading ? (
          <LoadingSpinner />
        ) : (
          <div className="w-full">
            {studentsModal.students.length === 0 ? (
              <div className="text-center py-6 sm:py-8">
                <UserGroupIcon className="w-8 h-8 sm:w-12 sm:h-12 text-gray-400 mx-auto mb-3 sm:mb-4" />
                <p className="text-gray-500 text-sm sm:text-base">No students found for this status</p>
              </div>
            ) : (
              <div className="overflow-y-auto max-h-[60vh] sm:max-h-96">
                <div className="grid gap-2 sm:gap-3">
                  {studentsModal.students.map((student, index) => (
                    <StudentCard key={student._id || index} student={student} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default PrincipalHome; 