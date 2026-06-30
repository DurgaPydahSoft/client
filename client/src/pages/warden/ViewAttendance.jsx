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
  const [initialLoading, setInitialLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [attendance, setAttendance] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [viewMode, setViewMode] = useState('date'); // 'date' or 'range'
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const getDefaultAcademicYear = () => {
    const year = new Date().getFullYear();
    return `${year}-${year + 1}`;
  };

  const generateAcademicYears = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = -3; i <= 3; i++) {
      const year = currentYear + i;
      years.push(`${year}-${year + 1}`);
    }
    return years;
  };

  const [filters, setFilters] = useState({
    studentId: '',
    course: '',
    branch: '',
    gender: '',
    status: '',
    academicYear: getDefaultAcademicYear()
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

      if (filters.course) params.append('course', filters.course);
      if (filters.branch) params.append('branch', filters.branch);
      if (filters.studentId) params.append('studentId', filters.studentId);
      if (filters.status) params.append('status', filters.status);
      if (filters.academicYear) params.append('academicYear', filters.academicYear);

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
      setInitialLoading(false);
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
      if (filters.academicYear) params.append('academicYear', filters.academicYear);

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
      setInitialLoading(false);
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
      setInitialLoading(false);
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

  if (initialLoading) {
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
          className="mb-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-start flex-1 min-w-0">
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h1 className="text-base sm:text-xl lg:text-2xl font-bold bg-gradient-to-r from-green-600 to-green-700 bg-clip-text text-transparent leading-tight">
                    View Attendance {user?.hostelType && `(${user.hostelType} Students)`}
                  </h1>
                  {/* Mobile Academic Year Select */}
                  <div className="sm:hidden flex items-center gap-2 flex-shrink-0">
                    {loading && (
                      <div className="w-3.5 h-3.5 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                    )}
                    <select
                      name="academicYear"
                      value={filters.academicYear}
                      onChange={handleFilterChange}
                      className="px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500 text-xs font-semibold text-gray-700 bg-white shadow-sm"
                    >
                      {generateAcademicYears().map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <p className="text-gray-500 mt-0.5 text-xs sm:text-sm lg:text-base">
                  View and analyze attendance records for {user?.hostelType ? `${user.hostelType.toLowerCase()}` : 'all'} students
                </p>
              </div>
            </div>

            {/* Desktop Stats & Academic Year */}
            <div className="flex flex-row items-center justify-between sm:justify-end gap-3 sm:gap-4 border-t sm:border-t-0 border-gray-100 pt-3 sm:pt-0">
              <div className="bg-green-50/50 border border-green-100 p-2 rounded-lg min-w-[100px] text-center">
                <p className="text-[10px] sm:text-xs text-gray-500 font-medium">Total Records</p>
                <p className="text-base sm:text-lg font-bold text-green-600">{attendance.length}</p>
              </div>
              {/* Desktop Academic Year Select */}
              <div className="hidden sm:flex items-center gap-2">
                {loading && (
                  <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                )}
                <select
                  name="academicYear"
                  value={filters.academicYear}
                  onChange={handleFilterChange}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm font-semibold text-gray-700 bg-white shadow-sm"
                >
                  {generateAcademicYears().map((year) => (
                    <option key={year} value={year}>
                      {year} AY
                    </option>
                  ))}
                </select>
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
            className="mb-6"
          >
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-4">
              <div className="text-center p-3 bg-green-50/50 rounded-lg border border-green-100/50">
                <p className="text-xs font-semibold text-green-700">Total Students</p>
                <p className="text-xl sm:text-2xl font-bold text-green-600 mt-1">{statistics.totalStudents}</p>
              </div>
              <div className="text-center p-3 bg-yellow-50/50 rounded-lg border border-yellow-100/50">
                <p className="text-xs font-semibold text-yellow-700 flex items-center justify-center gap-1">
                  <SunIcon className="w-3.5 h-3.5" /> Morn Present
                </p>
                <p className="text-xl sm:text-2xl font-bold text-yellow-600 mt-1">{statistics.morningPresent}</p>
              </div>
              <div className="text-center p-3 bg-purple-50/50 rounded-lg border border-purple-100/50">
                <p className="text-xs font-semibold text-purple-700 flex items-center justify-center gap-1">
                  <MoonIcon className="w-3.5 h-3.5" /> Eve Present
                </p>
                <p className="text-xl sm:text-2xl font-bold text-purple-600 mt-1">{statistics.eveningPresent}</p>
              </div>
              <div className="text-center p-3 bg-indigo-50/50 rounded-lg border border-indigo-100/50">
                <p className="text-xs font-semibold text-indigo-700 flex items-center justify-center gap-1">
                  <StarIcon className="w-3.5 h-3.5" /> Night Present
                </p>
                <p className="text-xl sm:text-2xl font-bold text-indigo-600 mt-1">{statistics.nightPresent}</p>
              </div>
              <div className="text-center p-3 bg-emerald-50/50 rounded-lg border border-emerald-100/50">
                <p className="text-xs font-semibold text-emerald-700">Fully Present</p>
                <p className="text-xl sm:text-2xl font-bold text-emerald-600 mt-1">{statistics.fullyPresent}</p>
              </div>
              <div className="text-center p-3 bg-orange-50/50 rounded-lg border border-orange-100/50">
                <p className="text-xs font-semibold text-orange-700">Partially Present</p>
                <p className="text-xl sm:text-2xl font-bold text-orange-600 mt-1">{statistics.partiallyPresent}</p>
              </div>
              <div className="text-center p-3 bg-red-50/50 rounded-lg border border-red-100/50">
                <p className="text-xs font-semibold text-red-700">Absent</p>
                <p className="text-xl sm:text-2xl font-bold text-red-600 mt-1">{statistics.absent}</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Mobile Filter Toggle */}
        <div className="sm:hidden mb-4">
          <button
            onClick={() => setShowMobileFilters(!showMobileFilters)}
            className="w-full flex items-center justify-center gap-2 bg-white px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 shadow-sm active:bg-gray-50"
          >
            <FunnelIcon className="w-5 h-5 text-gray-500" />
            {showMobileFilters ? 'Hide Filters' : 'Show Filters'}
          </button>
        </div>

        {/* Controls */}
        <div className={`${showMobileFilters ? 'block' : 'hidden'} sm:block`}>
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
            {/* Academic Year Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Academic Year</label>
              <select
                name="academicYear"
                value={filters.academicYear}
                onChange={handleFilterChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 font-medium text-gray-700 bg-white"
              >
                {generateAcademicYears().map((year) => (
                  <option key={year} value={year}>
                    {year} AY
                  </option>
                ))}
              </select>
            </div>

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
                <option value="On Leave">On Leave</option>
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
      </div>

        {/* Attendance List */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="relative min-h-[200px]"
        >
          {loading && (
            <div className="absolute inset-0 bg-white/75 flex items-center justify-center z-10">
              <div className="flex flex-col items-center gap-2">
                <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-sm font-medium text-gray-600">Loading records...</p>
              </div>
            </div>
          )}
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Attendance Records ({attendance.length})
            </h2>
          </div>

          <div className="hidden md:block overflow-x-auto">
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
                            <span className="text-gray-400 text-sm font-medium">-</span>
                          )}
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {record.evening ? (
                            <CheckIcon className="w-5 h-5 text-green-600 mx-auto" />
                          ) : (
                            <span className="text-gray-400 text-sm font-medium">-</span>
                          )}
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {record.night ? (
                            <CheckIcon className="w-5 h-5 text-green-600 mx-auto" />
                          ) : (
                            <span className="text-gray-400 text-sm font-medium">-</span>
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
                                                <span className="text-gray-400 text-xs font-medium">-</span>
                                              )}
                                            </td>
                                            <td className="px-3 py-2 text-center">
                                              {attRecord.evening ? (
                                                <CheckIcon className="w-4 h-4 text-green-600 mx-auto" />
                                              ) : (
                                                <span className="text-gray-400 text-xs font-medium">-</span>
                                              )}
                                            </td>
                                            <td className="px-3 py-2 text-center">
                                              {attRecord.night ? (
                                                <CheckIcon className="w-4 h-4 text-green-600 mx-auto" />
                                              ) : (
                                                <span className="text-gray-400 text-xs font-medium">-</span>
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

          {/* Mobile view cards */}
          <div className="block md:hidden divide-y divide-gray-200">
            {getDisplayData().map((record, index) => {
              if (viewMode === 'date') {
                const status = getAttendanceStatus(record);
                return (
                  <div key={record._id || index} className="p-4 hover:bg-gray-50 bg-white">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900">{record.student?.name || 'Unknown'}</h4>
                        <p className="text-xs text-gray-500">{record.student?.rollNumber || 'N/A'}</p>
                      </div>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
                        {getStatusIcon(status)}
                        <span className="ml-1">{status}</span>
                      </span>
                    </div>

                    <div className="text-xs text-gray-500 mb-3 space-y-0.5">
                      <p>{(record.student?.course?.name || record.student?.course || 'N/A')} {record.student?.year || 'N/A'} • {(record.student?.branch?.name || record.student?.branch || 'N/A')}</p>
                      <p>Room {record.student?.roomNumber || 'N/A'} • {record.student?.gender || 'N/A'}</p>
                    </div>

                    <div className="grid grid-cols-3 gap-2 border-t border-b border-gray-100 py-2.5 my-2.5 bg-gray-50 rounded-lg text-center">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-gray-400 flex items-center justify-center gap-0.5 mb-1">
                          <SunIcon className="w-3.5 h-3.5 text-yellow-500" /> Morning
                        </p>
                        {record.morning ? (
                          <CheckIcon className="w-4 h-4 text-green-600 mx-auto" />
                        ) : (
                          <span className="text-gray-400 text-xs font-medium">-</span>
                        )}
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-gray-400 flex items-center justify-center gap-0.5 mb-1">
                          <MoonIcon className="w-3.5 h-3.5 text-indigo-500" /> Evening
                        </p>
                        {record.evening ? (
                          <CheckIcon className="w-4 h-4 text-green-600 mx-auto" />
                        ) : (
                          <span className="text-gray-400 text-xs font-medium">-</span>
                        )}
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-gray-400 flex items-center justify-center gap-0.5 mb-1">
                          <StarIcon className="w-3.5 h-3.5 text-purple-500" /> Night
                        </p>
                        {record.night ? (
                          <CheckIcon className="w-4 h-4 text-green-600 mx-auto" />
                        ) : (
                          <span className="text-gray-400 text-xs font-medium">-</span>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-xs text-gray-400 mt-2">
                      <span>Marked: {record.markedBy?.username ? `${record.markedBy.username} (${record.markedBy.role})` : 'System'}</span>
                      {record.notes && <span className="italic text-gray-500 max-w-[50%] truncate">Note: {record.notes}</span>}
                    </div>
                  </div>
                );
              } else {
                const { student, summary } = record;
                const isExpanded = expandedStudents.has(student._id);
                return (
                  <div key={student._id} className="p-4 hover:bg-gray-50 bg-white">
                    <div className="flex justify-between items-start mb-2" onClick={() => toggleStudentExpansion(student._id)}>
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900">{student.name || 'Unknown'}</h4>
                        <p className="text-xs text-gray-500">{student.rollNumber || 'N/A'}</p>
                      </div>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPercentageColor(summary.attendancePercentage)}`}>
                        {getPercentageIcon(summary.attendancePercentage)}
                        <span className="ml-1">{summary.attendancePercentage}%</span>
                      </span>
                    </div>

                    <div className="text-xs text-gray-500 mb-3 space-y-0.5" onClick={() => toggleStudentExpansion(student._id)}>
                      <p>{(student.course?.name || student.course || 'N/A')} {student.year || 'N/A'} • {(student.branch?.name || student.branch || 'N/A')}</p>
                      <p>Room {student.roomNumber || 'N/A'} • {student.gender || 'N/A'}</p>
                    </div>

                    <div className="grid grid-cols-4 gap-1 border-t border-b border-gray-100 py-2 my-2 bg-gray-50 rounded-lg text-center" onClick={() => toggleStudentExpansion(student._id)}>
                      <div>
                        <p className="text-[10px] text-gray-400">Total</p>
                        <p className="text-xs font-bold text-gray-700">{summary.totalDays}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-green-500">Present</p>
                        <p className="text-xs font-bold text-green-600">{summary.presentDays}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-yellow-500">Partial</p>
                        <p className="text-xs font-bold text-yellow-600">{summary.partialDays}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-red-500">Absent</p>
                        <p className="text-xs font-bold text-red-600">{summary.absentDays}</p>
                      </div>
                    </div>

                    <div className="flex justify-center mt-2">
                      <button 
                        className="text-blue-600 hover:text-blue-800 text-xs font-medium w-full py-1 text-center bg-blue-50/50 rounded hover:bg-blue-50 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleStudentExpansion(student._id);
                        }}
                      >
                        {isExpanded ? 'Hide Daily Details' : 'Show Daily Details'}
                      </button>
                    </div>

                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t border-gray-200 space-y-3">
                        <h5 className="text-xs font-semibold text-gray-800">Daily Details:</h5>
                        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                          {record.attendanceRecords.map((attRecord) => {
                            const dayStatus = getAttendanceStatus(attRecord);
                            return (
                              <div key={attRecord._id} className="text-[11px] p-2 bg-gray-50 rounded border border-gray-100">
                                <div className="flex justify-between items-center mb-1">
                                  <span className="font-medium text-gray-700">{formatDate(attRecord.date)}</span>
                                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${getStatusColor(dayStatus)}`}>
                                    {dayStatus}
                                  </span>
                                </div>
                                <div className="grid grid-cols-3 gap-1 text-center text-gray-500">
                                  <div>Morn: {attRecord.morning ? '✔️' : '❌'}</div>
                                  <div>Eve: {attRecord.evening ? '✔️' : '❌'}</div>
                                  <div>Night: {attRecord.night ? '✔️' : '❌'}</div>
                                </div>
                                {attRecord.notes && (
                                  <div className="text-[10px] text-gray-400 mt-1 italic">
                                    Note: {attRecord.notes}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              }
            })}
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