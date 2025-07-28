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
import { useAuth } from '../../context/AuthContext';

const ViewAttendance = () => {
  const { user } = useAuth();
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
  const [statistics, setStatistics] = useState({
    totalStudents: 0,
    morningPresent: 0,
    eveningPresent: 0,
    fullyPresent: 0,
    partiallyPresent: 0,
    absent: 0
  });
  const [expandedStudents, setExpandedStudents] = useState(new Set());
  const [courses, setCourses] = useState([]);
  const [allBranches, setAllBranches] = useState([]);
  const [filteredBranches, setFilteredBranches] = useState([]);
  const [loadingFilters, setLoadingFilters] = useState(false);

  // Helper to map hostelType to gender
  const getWardenGender = () => {
    if (!user?.hostelType) return undefined;
    if (user.hostelType.toLowerCase() === 'boys') return 'Male';
    if (user.hostelType.toLowerCase() === 'girls') return 'Female';
    return undefined;
  };

  useEffect(() => {
    // Add a small delay to prevent rapid successive API calls
    const timer = setTimeout(() => {
      if (viewMode === 'date') {
        fetchAttendanceForDate();
      } else {
        fetchAttendanceForRange();
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [selectedDate, dateRange, viewMode, filters]);

  useEffect(() => {
    fetchFilters();
  }, []);

  const fetchAttendanceForDate = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        date: selectedDate
      });

      // Use mapped gender for filtering
      const wardenGender = getWardenGender();
      if (wardenGender) {
        params.append('gender', wardenGender);
        console.log('🔍 ViewAttendance: Warden hostelType:', user.hostelType, '| Gender for filter:', wardenGender);
      }

      // Add other filters that don't involve course/branch IDs
      if (filters.studentId) params.append('studentId', filters.studentId);
      if (filters.status) params.append('status', filters.status);

      console.log('🔍 ViewAttendance: API params for date view:', params.toString());
      console.log('🔍 ViewAttendance: Current filters:', filters);

      const response = await api.get(`/api/attendance/date?${params}`);
      
      if (response.data.success) {
        // Frontend filtering - ensure only students of warden's gender are shown
        let filteredAttendance = response.data.data.attendance;
        if (wardenGender) {
          filteredAttendance = response.data.data.attendance.filter(record => 
            record.student?.gender === wardenGender
          );
          console.log('🔍 ViewAttendance: After gender filtering:', filteredAttendance.length, 'records');
        }

        // Frontend filtering for course and branch
        if (filters.course) {
          filteredAttendance = filteredAttendance.filter(record => 
            record.student?.course?._id === filters.course || record.student?.course === filters.course
          );
          console.log('🔍 ViewAttendance: After course filtering:', filteredAttendance.length, 'records');
        }

        if (filters.branch) {
          filteredAttendance = filteredAttendance.filter(record => 
            record.student?.branch?._id === filters.branch || record.student?.branch === filters.branch
          );
          console.log('🔍 ViewAttendance: After branch filtering:', filteredAttendance.length, 'records');
        }
        
        setAttendance(filteredAttendance);
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
        endDate: dateRange.endDate
      });

      // Use mapped gender for filtering
      const wardenGender = getWardenGender();
      if (wardenGender) {
        params.append('gender', wardenGender);
        console.log('🔍 ViewAttendance: Warden hostelType:', user.hostelType, '| Gender for filter:', wardenGender);
      }

      // Add other filters that don't involve course/branch IDs
      if (filters.studentId) params.append('studentId', filters.studentId);
      if (filters.status) params.append('status', filters.status);

      console.log('🔍 ViewAttendance: API params for range view:', params.toString());
      console.log('🔍 ViewAttendance: Current filters:', filters);

      const response = await api.get(`/api/attendance/range?${params}`);
      
      if (response.data.success) {
        // Frontend filtering - ensure only students of warden's gender are shown
        let filteredAttendance = response.data.data.attendance;
        if (wardenGender) {
          filteredAttendance = response.data.data.attendance.filter(record => 
            record.student?.gender === wardenGender
          );
          console.log('🔍 ViewAttendance: After gender filtering:', filteredAttendance.length, 'records');
        }

        // Frontend filtering for course and branch
        if (filters.course) {
          filteredAttendance = filteredAttendance.filter(record => 
            record.student?.course?._id === filters.course || record.student?.course === filters.course
          );
          console.log('🔍 ViewAttendance: After course filtering:', filteredAttendance.length, 'records');
        }

        if (filters.branch) {
          filteredAttendance = filteredAttendance.filter(record => 
            record.student?.branch?._id === filters.branch || record.student?.branch === filters.branch
          );
          console.log('🔍 ViewAttendance: After branch filtering:', filteredAttendance.length, 'records');
        }
        
        setAttendance(filteredAttendance);
        
        // Calculate statistics from attendance data
        const stats = {
          totalStudents: response.data.data.totalRecords || filteredAttendance.length,
          morningPresent: 0,
          eveningPresent: 0,
          nightPresent: 0,
          fullyPresent: 0,
          partiallyPresent: 0,
          absent: 0
        };

        // Calculate statistics from the attendance records
        filteredAttendance.forEach(record => {
          if (record.morning) stats.morningPresent++;
          if (record.evening) stats.eveningPresent++;
          if (record.night) stats.nightPresent++;
          
          if (record.morning && record.evening && record.night) {
            stats.fullyPresent++;
          } else if (record.morning || record.evening || record.night) {
            stats.partiallyPresent++;
          } else {
            stats.absent++;
          }
        });

        setStatistics(stats);
      }
    } catch (error) {
      console.error('Error fetching attendance:', error);
      toast.error('Failed to fetch attendance data');
    } finally {
      setLoading(false);
    }
  };

  const fetchFilters = async () => {
    setLoadingFilters(true);
    try {
      // Fetch courses
      const coursesResponse = await api.get('/api/course-management/courses');
      if (coursesResponse.data.success) {
        setCourses(coursesResponse.data.data);
      }

      // Fetch all branches
      const branchesResponse = await api.get('/api/course-management/branches');
      if (branchesResponse.data.success) {
        setAllBranches(branchesResponse.data.data);
        setFilteredBranches([]); // Initially no branches selected
      }
    } catch (error) {
      console.error('Error fetching filters:', error);
      toast.error('Failed to fetch filter options');
    } finally {
      setLoadingFilters(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    
    // If course changes, update branches dropdown and clear branch selection
    if (name === 'course') {
      if (value) {
        // Filter branches for the selected course
        const courseBranches = allBranches.filter(branch => branch.course._id === value);
        setFilteredBranches(courseBranches);
      } else {
        // If no course selected, show no branches
        setFilteredBranches([]);
      }
      // Clear branch selection when course changes
      setFilters(prev => ({
        ...prev,
        [name]: value,
        branch: ''
      }));
    } else {
      setFilters(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const getAttendanceStatus = (record) => {
    if (record.morning && record.evening && record.night) return 'Present';
    if (record.morning || record.evening || record.night) return 'Partial';
    return 'Absent';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Present': return 'text-green-600 bg-green-50';
      case 'Partial': return 'text-yellow-600 bg-yellow-50';
      case 'Absent': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Present': return <CheckIcon className="w-4 h-4" />;
      case 'Partial': return <ClockIcon className="w-4 h-4" />;
      case 'Absent': return <XMarkIcon className="w-4 h-4" />;
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
      const effectivePresentDays = presentDays + (partialDays * 0.33); // Count partial as 0.33 (1/3 of a day)
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
    <div className="min-h-screen bg-gray-50 p-6">
      <SEO title="View Attendance - Warden Dashboard" />
      
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg shadow-sm p-6 mb-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-green-600 to-green-700 bg-clip-text text-transparent flex items-center gap-2">
                <EyeIcon className="w-6 h-6 text-green-600" />
                View Attendance {user?.hostelType && `(${user.hostelType} Students)`}
              </h1>
              <p className="text-gray-600 mt-1">
                View and analyze attendance records for {user?.hostelType ? `${user.hostelType.toLowerCase()}` : 'all'} students
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-gray-500">Total Records</p>
                <p className="text-2xl font-bold text-green-600">{attendance.length}</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Statistics */}
        {viewMode === 'date' && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-lg shadow-sm p-6 mb-6"
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <ChartBarIcon className="w-5 h-5 text-green-600" />
              Attendance Statistics
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-7 gap-4">
              <div className="text-center">
                <p className="text-sm text-gray-500">Total Students</p>
                <p className="text-2xl font-bold text-green-600">{statistics.totalStudents}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-500">Morning Present</p>
                <p className="text-2xl font-bold text-yellow-600">{statistics.morningPresent}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-500">Evening Present</p>
                <p className="text-2xl font-bold text-purple-600">{statistics.eveningPresent}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-500">Night Present</p>
                <p className="text-2xl font-bold text-indigo-600">{statistics.nightPresent}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-500">Fully Present</p>
                <p className="text-2xl font-bold text-green-600">{statistics.fullyPresent}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-500">Partially Present</p>
                <p className="text-2xl font-bold text-orange-600">{statistics.partiallyPresent}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-500">Absent</p>
                <p className="text-2xl font-bold text-red-600">{statistics.absent}</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Controls */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-lg shadow-sm p-6 mb-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            {/* View Mode Toggle */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">View Mode</label>
              <select
                value={viewMode}
                onChange={(e) => setViewMode(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="date">Single Date</option>
                <option value="range">Date Range</option>
              </select>
            </div>

            {/* Date Selector */}
            {viewMode === 'date' ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <CalendarIcon className="w-4 h-4 inline mr-1" />
                  Date
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                  <input
                    type="date"
                    value={dateRange.startDate}
                    onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                  <input
                    type="date"
                    value={dateRange.endDate}
                    onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </>
            )}

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                name="status"
                value={filters.status}
                onChange={handleFilterChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">All Status</option>
                <option value="Present">Present</option>
                <option value="Partial">Partial</option>
                <option value="Absent">Absent</option>
              </select>
            </div>
          </div>

          {/* Additional Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Course</label>
              <select
                name="course"
                value={filters.course}
                onChange={handleFilterChange}
                disabled={loadingFilters}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-100"
              >
                <option value="">{loadingFilters ? 'Loading...' : 'All Courses'}</option>
                {courses.map((course) => (
                  <option key={course._id} value={course._id}>
                    {course.name} ({course.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Branch</label>
              <select
                name="branch"
                value={filters.branch}
                onChange={handleFilterChange}
                disabled={loadingFilters || !filters.course}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-100"
              >
                <option value="">
                  {loadingFilters ? 'Loading...' : !filters.course ? 'Select Course First' : 'All Branches'}
                </option>
                {filteredBranches.map((branch) => (
                  <option key={branch._id} value={branch._id}>
                    {branch.name} ({branch.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Gender {user?.hostelType && `(${user.hostelType} Warden)`}
              </label>
              <select
                name="gender"
                value={user?.hostelType || ''}
                disabled={true}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 bg-gray-50 cursor-not-allowed"
              >
                <option value="">{user?.hostelType || 'Not Assigned'}</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Student ID</label>
              <input
                type="text"
                name="studentId"
                value={filters.studentId}
                onChange={handleFilterChange}
                placeholder="Search by student ID"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
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
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Attendance Records ({attendance.length})
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Student
                  </th>
                  {viewMode === 'date' ? (
                    <>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <SunIcon className="w-4 h-4 inline mr-1" />
                        Morning
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <MoonIcon className="w-4 h-4 inline mr-1" />
                        Evening
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <StarIcon className="w-4 h-4 inline mr-1" />
                        Night
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Marked By
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Notes
                      </th>
                    </>
                  ) : (
                    <>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <CalendarDaysIcon className="w-4 h-4 inline mr-1" />
                        Total Days
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <CheckIcon className="w-4 h-4 inline mr-1" />
                        Present Days
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <ClockIcon className="w-4 h-4 inline mr-1" />
                        Partial Days
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <XMarkIcon className="w-4 h-4 inline mr-1" />
                        Absent Days
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <ChartBarIcon className="w-4 h-4 inline mr-1" />
                        Attendance %
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
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
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {record.student?.name || 'Unknown'}
                              </div>
                              <div className="text-sm text-gray-500">
                                {record.student?.rollNumber || 'N/A'} • {(record.student?.course?.name || record.student?.course || 'N/A')} {record.student?.year || 'N/A'} • {(record.student?.branch?.name || record.student?.branch || 'N/A')}
                              </div>
                              <div className="text-xs text-gray-400">
                                Room {record.student?.roomNumber || 'N/A'} • {record.student?.gender || 'N/A'}
                              </div>
                            </div>
                          </div>
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {record.morning ? (
                            <CheckIcon className="w-5 h-5 text-green-600 mx-auto" />
                          ) : (
                            <XMarkIcon className="w-5 h-5 text-red-600 mx-auto" />
                          )}
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {record.evening ? (
                            <CheckIcon className="w-5 h-5 text-green-600 mx-auto" />
                          ) : (
                            <XMarkIcon className="w-5 h-5 text-red-600 mx-auto" />
                          )}
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {record.night ? (
                            <CheckIcon className="w-5 h-5 text-green-600 mx-auto" />
                          ) : (
                            <XMarkIcon className="w-5 h-5 text-red-600 mx-auto" />
                          )}
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
                            {getStatusIcon(status)}
                            <span className="ml-1">{status}</span>
                          </span>
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {record.markedBy?.username ? `${record.markedBy.username} (${record.markedBy.role})` : 'System'}
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
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
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0">
                                <button className="text-gray-400 hover:text-gray-600">
                                  {isExpanded ? (
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                  ) : (
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                  )}
                                </button>
                              </div>
                              <div className="ml-3">
                                <div className="text-sm font-medium text-gray-900">
                                  {student.name || 'Unknown'}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {student.rollNumber || 'N/A'} • {(student.course?.name || student.course || 'N/A')} {student.year || 'N/A'} • {(student.branch?.name || student.branch || 'N/A')}
                                </div>
                                <div className="text-xs text-gray-400">
                                  Room {student.roomNumber || 'N/A'} • {student.gender || 'N/A'}
                                </div>
                              </div>
                            </div>
                          </td>
                          
                          <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                            {summary.totalDays}
                          </td>
                          
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-green-600 bg-green-50">
                              <CheckIcon className="w-3 h-3 mr-1" />
                              {summary.presentDays}
                            </span>
                          </td>
                          
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-yellow-600 bg-yellow-50">
                              <ClockIcon className="w-3 h-3 mr-1" />
                              {summary.partialDays}
                            </span>
                          </td>
                          
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-red-600 bg-red-50">
                              <XMarkIcon className="w-3 h-3 mr-1" />
                              {summary.absentDays}
                            </span>
                          </td>
                          
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPercentageColor(summary.attendancePercentage)}`}>
                              {getPercentageIcon(summary.attendancePercentage)}
                              <span className="ml-1">{summary.attendancePercentage}%</span>
                            </span>
                          </td>
                          
                          <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
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
                            <td colSpan="7" className="px-6 py-4">
                              <div className="bg-white rounded-lg border border-gray-200 p-4">
                                <h4 className="text-sm font-medium text-gray-900 mb-3">Daily Attendance Details</h4>
                                <div className="overflow-x-auto">
                                  <table className="min-w-full text-xs">
                                    <thead className="bg-gray-50">
                                      <tr>
                                        <th className="px-3 py-2 text-left">Date</th>
                                        <th className="px-3 py-2 text-center">Morning</th>
                                        <th className="px-3 py-2 text-center">Evening</th>
                                        <th className="px-3 py-2 text-center">Night</th>
                                        <th className="px-3 py-2 text-center">Status</th>
                                        <th className="px-3 py-2 text-left">Notes</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                      {record.attendanceRecords.map((attRecord, idx) => {
                                        const dayStatus = getAttendanceStatus(attRecord);
                                        return (
                                          <tr key={attRecord._id} className="hover:bg-gray-50">
                                            <td className="px-3 py-2 text-gray-900">
                                              {formatDate(attRecord.date)}
                                            </td>
                                            <td className="px-3 py-2 text-center">
                                              {attRecord.morning ? (
                                                <CheckIcon className="w-4 h-4 text-green-600 mx-auto" />
                                              ) : (
                                                <XMarkIcon className="w-4 h-4 text-red-600 mx-auto" />
                                              )}
                                            </td>
                                            <td className="px-3 py-2 text-center">
                                              {attRecord.evening ? (
                                                <CheckIcon className="w-4 h-4 text-green-600 mx-auto" />
                                              ) : (
                                                <XMarkIcon className="w-4 h-4 text-red-600 mx-auto" />
                                              )}
                                            </td>
                                            <td className="px-3 py-2 text-center">
                                              {attRecord.night ? (
                                                <CheckIcon className="w-4 h-4 text-green-600 mx-auto" />
                                              ) : (
                                                <XMarkIcon className="w-4 h-4 text-red-600 mx-auto" />
                                              )}
                                            </td>
                                            <td className="px-3 py-2 text-center">
                                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(dayStatus)}`}>
                                                {getStatusIcon(dayStatus)}
                                                <span className="ml-1">{dayStatus}</span>
                                              </span>
                                            </td>
                                            <td className="px-3 py-2 text-gray-500">
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

          {getDisplayData().length === 0 && (
            <div className="text-center py-12">
              <UserGroupIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">
                {viewMode === 'date' 
                  ? 'No attendance records found for the selected date.'
                  : 'No attendance records found for the selected date range.'
                }
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default ViewAttendance; 