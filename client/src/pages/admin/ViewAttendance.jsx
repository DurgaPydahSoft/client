import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  CalendarIcon, 
  CheckIcon, 
  XMarkIcon,
  UserGroupIcon,
  ClockIcon,
  SunIcon,
  MoonIcon,
  StarIcon,
  FunnelIcon,
  EyeIcon,
  ChartBarIcon,
  CalendarDaysIcon
} from '@heroicons/react/24/outline';
import api from '../../utils/axios';
import LoadingSpinner from '../../components/LoadingSpinner';
import { toast } from 'react-hot-toast';
import SEO from '../../components/SEO';

const ViewAttendance = () => {
  const [loading, setLoading] = useState(true);
  const [attendance, setAttendance] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [viewMode, setViewMode] = useState('date'); // 'date' or 'range'
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [filters, setFilters] = useState({
    studentId: '',
    course: '',
    branch: '',
    gender: '',
    status: ''
  });
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [statistics, setStatistics] = useState({
    totalStudents: 0,
    morningPresent: 0,
    eveningPresent: 0,
    nightPresent: 0,
    fullyPresent: 0,
    partiallyPresent: 0,
    absent: 0
  });
  const [expandedStudents, setExpandedStudents] = useState(new Set());
  const [courses, setCourses] = useState([]);
  const [branches, setBranches] = useState([]);
  const [filteredBranches, setFilteredBranches] = useState([]);

  useEffect(() => {
    if (viewMode === 'date') {
      fetchAttendanceForDate();
    } else {
      fetchAttendanceForRange();
    }
  }, [selectedDate, dateRange, viewMode, filters]);

  useEffect(() => {
    // Fetch courses and branches on mount
    const fetchFilters = async () => {
      try {
        const [coursesRes, branchesRes] = await Promise.all([
          api.get('/api/course-management/courses'),
          api.get('/api/course-management/branches')
        ]);
        if (coursesRes.data.success) setCourses(coursesRes.data.data);
        if (branchesRes.data.success) setBranches(branchesRes.data.data);
      } catch (err) {
        toast.error('Failed to fetch filter options');
        setCourses([]);
        setBranches([]);
      }
    };
    fetchFilters();
  }, []);

  // Filter branches when course changes
  useEffect(() => {
    if (!filters.course) {
      setFilteredBranches(branches);
    } else {
      setFilteredBranches(branches.filter(b =>
        b.course === filters.course || (typeof b.course === 'object' && b.course._id === filters.course)
      ));
    }
  }, [filters.course, branches]);

  const fetchAttendanceForDate = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        date: selectedDate,
        ...filters
      });

      const response = await api.get(`/api/attendance/date?${params}`);
      
      if (response.data.success) {
        setAttendance(response.data.data.attendance);
        setStatistics(response.data.data.statistics);
      }
    } catch (error) {
      console.error('Error fetching attendance:', error);
      toast.error('Failed to fetch attendance data');
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendanceForRange = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        ...filters
      });

      const response = await api.get(`/api/attendance/range?${params}`);
      
      if (response.data.success) {
        const attendanceData = response.data.data.attendance;
        setAttendance(attendanceData);
        
        // Use statistics from backend
        setStatistics(response.data.data.statistics || {
          totalStudents: response.data.data.totalRecords || attendanceData.length,
          morningPresent: 0,
          eveningPresent: 0,
          nightPresent: 0,
          fullyPresent: 0,
          partiallyPresent: 0,
          absent: 0
        });
      }
    } catch (error) {
      console.error('Error fetching attendance:', error);
      toast.error('Failed to fetch attendance data');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const getAttendanceStatus = (record) => {
    // Check if student is on leave first
    if (record.student?.isOnLeave) return 'On Leave';
    
    if (record.morning && record.evening && record.night) return 'Present';
    if (record.morning || record.evening || record.night) return 'Partial';
    return 'Absent';
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

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Helper functions to safely get course and branch names
  const getCourseName = (course) => {
    if (!course) return 'N/A';
    if (typeof course === 'object' && course.name) return course.name;
    if (typeof course === 'string') return course;
    return 'N/A';
  };
  const getBranchName = (branch) => {
    if (!branch) return 'N/A';
    if (typeof branch === 'object' && branch.name) return branch.name;
    if (typeof branch === 'string') return branch;
    return 'N/A';
  };

  // Organize attendance data by student for date range view
  const organizeAttendanceByStudent = (attendanceData) => {
    const studentMap = new Map();

    attendanceData.forEach(record => {
      const studentId = record.student?._id;
      if (!studentId) return;

      if (!studentMap.has(studentId)) {
        studentMap.set(studentId, {
          student: record.student,
          attendanceRecords: [],
          summary: {
            totalDays: 0,
            presentDays: 0,
            absentDays: 0,
            partialDays: 0,
            attendancePercentage: 0
          }
        });
      }

      const studentData = studentMap.get(studentId);
      studentData.attendanceRecords.push(record);

      // Calculate summary
      studentData.summary.totalDays++;
      const status = getAttendanceStatus(record);
      if (status === 'Present') {
        studentData.summary.presentDays++;
      } else if (status === 'Absent') {
        studentData.summary.absentDays++;
      } else if (status === 'Partial') {
        studentData.summary.partialDays++;
      }
    });

    // Calculate attendance percentage for each student
    studentMap.forEach(studentData => {
      const { totalDays, presentDays, partialDays } = studentData.summary;
      const effectivePresentDays = presentDays + (partialDays * 0.33); // Count partial as 0.33 for 3 sessions
      studentData.summary.attendancePercentage = totalDays > 0 
        ? Math.round((effectivePresentDays / totalDays) * 100) 
        : 0;
    });

    return Array.from(studentMap.values());
  };

  // Get attendance percentage color
  const getPercentageColor = (percentage) => {
    if (percentage >= 90) return 'text-green-600 bg-green-50';
    if (percentage >= 75) return 'text-yellow-600 bg-yellow-50';
    if (percentage >= 60) return 'text-orange-600 bg-orange-50';
    return 'text-red-600 bg-red-50';
  };

  // Get attendance percentage icon
  const getPercentageIcon = (percentage) => {
    if (percentage >= 90) return <CheckIcon className="w-4 h-4" />;
    if (percentage >= 75) return <ClockIcon className="w-4 h-4" />;
    if (percentage >= 60) return <ClockIcon className="w-4 h-4" />;
    return <XMarkIcon className="w-4 h-4" />;
  };

  // Toggle expanded student details
  const toggleStudentExpansion = (studentId) => {
    setExpandedStudents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(studentId)) {
        newSet.delete(studentId);
      } else {
        newSet.add(studentId);
      }
      return newSet;
    });
  };

  // Get organized data for display
  const getDisplayData = () => {
    if (viewMode === 'date') {
      return attendance;
    } else {
      return organizeAttendanceByStudent(attendance);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="p-3 sm:p-4 lg:p-6">
      {/* Stats Display */}
      <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="text-left sm:text-right">
          <p className="text-xs sm:text-sm text-gray-500">Total Records</p>
          <p className="text-lg sm:text-2xl font-bold text-blue-600">{attendance.length}</p>
        </div>
      </div>

      {/* Statistics */}
      {viewMode === 'date' && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-lg shadow-sm p-3 sm:p-4 lg:p-6 mb-4 sm:mb-6"
        >
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
            <ChartBarIcon className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
            Attendance Statistics
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2 sm:gap-4">
            <div className="text-center">
              <p className="text-xs sm:text-sm text-gray-500">Total Students</p>
              <p className="text-lg sm:text-2xl font-bold text-blue-600">{statistics.totalStudents}</p>
            </div>
            <div className="text-center">
              <p className="text-xs sm:text-sm text-gray-500">Morning Present</p>
              <p className="text-lg sm:text-2xl font-bold text-yellow-600">{statistics.morningPresent}</p>
            </div>
            <div className="text-center">
              <p className="text-xs sm:text-sm text-gray-500">Evening Present</p>
              <p className="text-lg sm:text-2xl font-bold text-purple-600">{statistics.eveningPresent}</p>
            </div>
            <div className="text-center">
              <p className="text-xs sm:text-sm text-gray-500">Night Present</p>
              <p className="text-lg sm:text-2xl font-bold text-indigo-600">{statistics.nightPresent}</p>
            </div>
            <div className="text-center">
              <p className="text-xs sm:text-sm text-gray-500">Fully Present</p>
              <p className="text-lg sm:text-2xl font-bold text-green-600">{statistics.fullyPresent}</p>
            </div>
            <div className="text-center">
              <p className="text-xs sm:text-sm text-gray-500">Partially Present</p>
              <p className="text-lg sm:text-2xl font-bold text-orange-600">{statistics.partiallyPresent}</p>
            </div>
            <div className="text-center">
              <p className="text-xs sm:text-sm text-gray-500">Absent</p>
              <p className="text-lg sm:text-2xl font-bold text-red-600">{statistics.absent}</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Mobile Filter Toggle */}
      <div className="lg:hidden mb-4">
        <button
          onClick={() => setShowMobileFilters(prev => !prev)}
          className="w-full bg-white rounded-lg shadow-sm border border-gray-100 p-3 flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <FunnelIcon className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-gray-900">Filters</span>
          </div>
          <svg 
            className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${showMobileFilters ? 'rotate-180' : ''}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        
        {/* Mobile Filters Panel */}
        {showMobileFilters && (
          <div className="mt-2 bg-white rounded-lg shadow-sm border border-gray-100 p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              {/* View Mode Toggle */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">View Mode</label>
                <select
                  value={viewMode}
                  onChange={(e) => setViewMode(e.target.value)}
                  className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs sm:text-sm"
                >
                  <option value="date">Single Date</option>
                  <option value="range">Date Range</option>
                </select>
              </div>

              {/* Date Selector */}
              {viewMode === 'date' ? (
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                    <CalendarIcon className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" />
                    Date
                  </label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs sm:text-sm"
                  />
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Start Date</label>
                    <input
                      type="date"
                      value={dateRange.startDate}
                      onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                      className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">End Date</label>
                    <input
                      type="date"
                      value={dateRange.endDate}
                      onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                      className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs sm:text-sm"
                    />
                  </div>
                </>
              )}
            </div>

            {/* Additional Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Status</label>
                <select
                  name="status"
                  value={filters.status}
                  onChange={handleFilterChange}
                  className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs sm:text-sm"
                >
                  <option value="">All Status</option>
                  <option value="Present">Present</option>
                  <option value="Partial">Partial</option>
                  <option value="Absent">Absent</option>
                  <option value="On Leave">On Leave</option>
                </select>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Course</label>
                <select
                  name="course"
                  value={filters.course}
                  onChange={handleFilterChange}
                  className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs sm:text-sm"
                >
                  <option value="">All Courses</option>
                  {courses.map(course => (
                    <option key={course._id} value={course._id}>{course.name} ({course.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Branch</label>
                <select
                  name="branch"
                  value={filters.branch}
                  onChange={handleFilterChange}
                  className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs sm:text-sm"
                >
                  <option value="">All Branches</option>
                  {filteredBranches.map(branch => (
                    <option key={branch._id} value={branch._id}>{branch.name} ({branch.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Gender</label>
                <select
                  name="gender"
                  value={filters.gender}
                  onChange={handleFilterChange}
                  className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs sm:text-sm"
                >
                  <option value="">All</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Student ID</label>
                <input
                  type="text"
                  name="studentId"
                  value={filters.studentId}
                  onChange={handleFilterChange}
                  placeholder="Search by student ID"
                  className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs sm:text-sm"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Desktop Controls */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="hidden lg:block bg-white rounded-lg shadow-sm p-3 sm:p-4 lg:p-6 mb-4 sm:mb-6"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-3 sm:mb-4">
          {/* View Mode Toggle */}
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">View Mode</label>
            <select
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value)}
              className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs sm:text-sm"
            >
              <option value="date">Single Date</option>
              <option value="range">Date Range</option>
            </select>
          </div>

          {/* Date Selector */}
          {viewMode === 'date' ? (
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                <CalendarIcon className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" />
                Date
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs sm:text-sm"
              />
            </div>
          ) : (
            <>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Start Date</label>
                <input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                  className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">End Date</label>
                <input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                  className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs sm:text-sm"
                />
              </div>
            </>
          )}

          {/* Status Filter */}
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Status</label>
            <select
              name="status"
              value={filters.status}
              onChange={handleFilterChange}
              className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs sm:text-sm"
            >
              <option value="">All Status</option>
              <option value="Present">Present</option>
              <option value="Partial">Partial</option>
              <option value="Absent">Absent</option>
            </select>
          </div>
        </div>

        {/* Additional Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Course</label>
            <select
              name="course"
              value={filters.course}
              onChange={handleFilterChange}
                className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs sm:text-sm"
            >
              <option value="">All Courses</option>
              {courses.map(course => (
                <option key={course._id} value={course._id}>{course.name} ({course.code})</option>
              ))}
            </select>
          </div>

          <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Branch</label>
            <select
              name="branch"
              value={filters.branch}
              onChange={handleFilterChange}
                className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs sm:text-sm"
            >
              <option value="">All Branches</option>
              {filteredBranches.map(branch => (
                <option key={branch._id} value={branch._id}>{branch.name} ({branch.code})</option>
              ))}
            </select>
          </div>

          <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Gender</label>
            <select
              name="gender"
              value={filters.gender}
              onChange={handleFilterChange}
                className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs sm:text-sm"
            >
              <option value="">All</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </div>

          <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Student ID</label>
            <input
              type="text"
              name="studentId"
              value={filters.studentId}
              onChange={handleFilterChange}
              placeholder="Search by student ID"
                className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs sm:text-sm"
            />
          </div>
        </div>
      </motion.div>

      {/* Attendance List */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white rounded-lg shadow-sm overflow-hidden"
      >
        <div className="px-3 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900">
            Attendance Records ({attendance.length})
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Student
                </th>
                {viewMode === 'date' ? (
                  <>
                    <th className="px-2 sm:px-6 py-2 sm:py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <SunIcon className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" />
                      <span className="hidden sm:inline">Morning</span>
                      <span className="sm:hidden">M</span>
                    </th>
                    <th className="px-2 sm:px-6 py-2 sm:py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <MoonIcon className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" />
                      <span className="hidden sm:inline">Evening</span>
                      <span className="sm:hidden">E</span>
                    </th>
                    <th className="px-2 sm:px-6 py-2 sm:py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <StarIcon className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" />
                      <span className="hidden sm:inline">Night</span>
                      <span className="sm:hidden">N</span>
                      </th>
                    <th className="px-2 sm:px-6 py-2 sm:py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <span className="hidden sm:inline">Marked By</span>
                      <span className="sm:hidden">By</span>
                    </th>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Notes
                    </th>
                  </>
                ) : (
                  <>
                    <th className="px-2 sm:px-6 py-2 sm:py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <CalendarDaysIcon className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" />
                      <span className="hidden sm:inline">Total Days</span>
                      <span className="sm:hidden">Total</span>
                    </th>
                    <th className="px-2 sm:px-6 py-2 sm:py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <CheckIcon className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" />
                      <span className="hidden sm:inline">Present Days</span>
                      <span className="sm:hidden">Present</span>
                    </th>
                    <th className="px-2 sm:px-6 py-2 sm:py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <ClockIcon className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" />
                      <span className="hidden sm:inline">Partial Days</span>
                      <span className="sm:hidden">Partial</span>
                    </th>
                    <th className="px-2 sm:px-6 py-2 sm:py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <XMarkIcon className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" />
                      <span className="hidden sm:inline">Absent Days</span>
                      <span className="sm:hidden">Absent</span>
                    </th>
                    <th className="px-2 sm:px-6 py-2 sm:py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <ChartBarIcon className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" />
                      <span className="hidden sm:inline">Attendance %</span>
                      <span className="sm:hidden">%</span>
                    </th>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {getDisplayData().map((record, index) => {
                if (viewMode === 'date') {
                  // Single date view - show detailed records
                  const status = getAttendanceStatus(record);
                  return (
                    <motion.tr
                      key={record._id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="hover:bg-gray-50"
                    >
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div>
                            <div className="text-xs sm:text-sm font-medium text-gray-900">
                              {record.student?.name || 'Unknown'}
                            </div>
                            <div className="text-xs sm:text-sm text-gray-500">
                              {record.student?.rollNumber || 'N/A'} • {getCourseName(record.student?.course)} {record.student?.year || 'N/A'} • {getBranchName(record.student?.branch)}
                            </div>
                            <div className="text-xs text-gray-400">
                              Room {record.student?.roomNumber || 'N/A'} • {record.student?.gender || 'N/A'}
                            </div>
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-2 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-center">
                        {record.morning ? (
                          <CheckIcon className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 mx-auto" />
                        ) : (
                          <XMarkIcon className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 mx-auto" />
                        )}
                      </td>
                      
                      <td className="px-2 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-center">
                        {record.evening ? (
                          <CheckIcon className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 mx-auto" />
                        ) : (
                          <XMarkIcon className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 mx-auto" />
                        )}
                      </td>
                      
                      <td className="px-2 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-center">
                        {record.night ? (
                          <CheckIcon className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 mx-auto" />
                        ) : (
                          <XMarkIcon className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 mx-auto" />
                        )}
                      </td>
                      
                      <td className="px-2 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
                          {getStatusIcon(status)}
                          <span className="ml-1 hidden sm:inline">{status}</span>
                          <span className="ml-1 sm:hidden">{status.charAt(0)}</span>
                        </span>
                      </td>
                      
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                        {record.markedBy?.username ? `${record.markedBy.username} (${record.markedBy.role})` : 'System'}
                      </td>
                      
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500">
                        {record.notes || '-'}
                      </td>
                    </motion.tr>
                  );
                } else {
                  // Date range view - show student summaries
                  const { student, summary } = record;
                  const isExpanded = expandedStudents.has(student._id);
                  
                  return (
                    <React.Fragment key={student._id}>
                      <motion.tr
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => toggleStudentExpansion(student._id)}
                      >
                        <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0">
                              <button className="text-gray-400 hover:text-gray-600">
                                {isExpanded ? (
                                  <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                  </svg>
                                ) : (
                                  <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                  </svg>
                                )}
                              </button>
                            </div>
                            <div className="ml-2 sm:ml-3">
                              <div className="text-xs sm:text-sm font-medium text-gray-900">
                                {student.name || 'Unknown'}
                              </div>
                              <div className="text-xs sm:text-sm text-gray-500">
                                {student.rollNumber || 'N/A'} • {getCourseName(student.course)} {student.year || 'N/A'} • {getBranchName(student.branch)}
                              </div>
                              <div className="text-xs text-gray-400">
                                Room {student.roomNumber || 'N/A'} • {student.gender || 'N/A'}
                              </div>
                            </div>
                          </div>
                        </td>
                        
                        <td className="px-2 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-center text-xs sm:text-sm text-gray-900">
                          {summary.totalDays}
                        </td>
                        
                        <td className="px-2 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-center">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-green-600 bg-green-50">
                            <CheckIcon className="w-3 h-3 mr-1" />
                            {summary.presentDays}
                          </span>
                        </td>
                        
                        <td className="px-2 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-center">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-yellow-600 bg-yellow-50">
                            <ClockIcon className="w-3 h-3 mr-1" />
                            {summary.partialDays}
                          </span>
                        </td>
                        
                        <td className="px-2 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-center">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-red-600 bg-red-50">
                            <XMarkIcon className="w-3 h-3 mr-1" />
                            {summary.absentDays}
                          </span>
                        </td>
                        
                        <td className="px-2 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getPercentageColor(summary.attendancePercentage)}`}>
                            {getPercentageIcon(summary.attendancePercentage)}
                            <span className="ml-1">{summary.attendancePercentage}%</span>
                          </span>
                        </td>
                        
                        <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-center text-xs sm:text-sm text-gray-500">
                          <button 
                            className="text-blue-600 hover:text-blue-800 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleStudentExpansion(student._id);
                            }}
                          >
                            {isExpanded ? 'Hide Details' : 'Show Details'}
                          </button>
                        </td>
                      </motion.tr>
                      
                      {/* Expanded Details */}
                      {isExpanded && (
                        <motion.tr
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="bg-gray-50"
                        >
                          <td colSpan="7" className="px-3 sm:px-6 py-3 sm:py-4">
                            <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
                              <h4 className="text-xs sm:text-sm font-medium text-gray-900 mb-2 sm:mb-3">Daily Attendance Details</h4>
                              <div className="overflow-x-auto">
                                <table className="min-w-full text-xs">
                                  <thead className="bg-gray-50">
                                    <tr>
                                      <th className="px-2 sm:px-3 py-1 sm:py-2 text-left">Date</th>
                                      <th className="px-1 sm:px-3 py-1 sm:py-2 text-center">M</th>
                                      <th className="px-1 sm:px-3 py-1 sm:py-2 text-center">E</th>
                                      <th className="px-1 sm:px-3 py-1 sm:py-2 text-center">N</th>
                                      <th className="px-2 sm:px-3 py-1 sm:py-2 text-center">Status</th>
                                      <th className="px-2 sm:px-3 py-1 sm:py-2 text-left">By</th>
                                      <th className="px-2 sm:px-3 py-1 sm:py-2 text-left">Notes</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-200">
                                    {record.attendanceRecords.map((attRecord, idx) => {
                                      const dayStatus = getAttendanceStatus(attRecord);
                                      return (
                                        <tr key={attRecord._id} className="hover:bg-gray-50">
                                          <td className="px-2 sm:px-3 py-1 sm:py-2 text-gray-900">
                                            {formatDate(attRecord.date)}
                                          </td>
                                          <td className="px-1 sm:px-3 py-1 sm:py-2 text-center">
                                            {attRecord.morning ? (
                                              <CheckIcon className="w-3 h-3 sm:w-4 sm:h-4 text-green-600 mx-auto" />
                                            ) : (
                                              <XMarkIcon className="w-3 h-3 sm:w-4 sm:h-4 text-red-600 mx-auto" />
                                            )}
                                          </td>
                                          <td className="px-1 sm:px-3 py-1 sm:py-2 text-center">
                                            {attRecord.evening ? (
                                              <CheckIcon className="w-3 h-3 sm:w-4 sm:h-4 text-green-600 mx-auto" />
                                            ) : (
                                              <XMarkIcon className="w-3 h-3 sm:w-4 sm:h-4 text-red-600 mx-auto" />
                                            )}
                                          </td>
                                          <td className="px-1 sm:px-3 py-1 sm:py-2 text-center">
                                            {attRecord.night ? (
                                              <CheckIcon className="w-3 h-3 sm:w-4 sm:h-4 text-green-600 mx-auto" />
                                            ) : (
                                              <XMarkIcon className="w-3 h-3 sm:w-4 sm:h-4 text-red-600 mx-auto" />
                                            )}
                                          </td>
                                          <td className="px-2 sm:px-3 py-1 sm:py-2 text-center">
                                            <span className={`inline-flex items-center px-1 sm:px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(dayStatus)}`}>
                                              {getStatusIcon(dayStatus)}
                                              <span className="ml-1 hidden sm:inline">{dayStatus}</span>
                                              <span className="ml-1 sm:hidden">{dayStatus.charAt(0)}</span>
                                            </span>
                                          </td>
                                          <td className="px-2 sm:px-3 py-1 sm:py-2 text-gray-900">
                                            {attRecord.markedBy?.username ? `${attRecord.markedBy.username} (${attRecord.markedBy.role})` : 'System'}
                                          </td>
                                          <td className="px-2 sm:px-3 py-1 sm:py-2 text-gray-500">
                                            {attRecord.notes || '-'}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </td>
                        </motion.tr>
                      )}
                    </React.Fragment>
                  );
                }
              })}
            </tbody>
          </table>
        </div>

        {attendance.length === 0 && (
          <div className="text-center py-12">
            <UserGroupIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No attendance records found for the selected criteria.</p>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default ViewAttendance; 