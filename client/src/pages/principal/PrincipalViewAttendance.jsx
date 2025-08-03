import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/axios';
import { toast } from 'react-hot-toast';
import * as XLSX from 'xlsx';
import {
  CalendarIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  UserGroupIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ChartBarIcon,
  CheckIcon,
  XMarkIcon,
  SunIcon,
  MoonIcon,
  StarIcon,
  EyeIcon,
  CalendarDaysIcon,
  AcademicCapIcon
} from '@heroicons/react/24/outline';
import LoadingSpinner from '../../components/LoadingSpinner';
import Modal from '../../components/Modal';
import SEO from '../../components/SEO';
import { AnimatePresence } from 'framer-motion';

const PrincipalViewAttendance = () => {
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
    branch: '',
    gender: '',
    status: ''
  });
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
  const [photoModal, setPhotoModal] = useState({ open: false, src: '', name: '' });
  const [allBranches, setAllBranches] = useState([]);
  const [filteredBranches, setFilteredBranches] = useState([]);
  const [loadingFilters, setLoadingFilters] = useState(false);
  const [filtersCollapsed, setFiltersCollapsed] = useState(true);
  const [generatingExcel, setGeneratingExcel] = useState(false);

  useEffect(() => {
    if (viewMode === 'date') {
      fetchAttendanceForDate();
    } else {
      fetchAttendanceForRange();
    }
  }, [selectedDate, dateRange, viewMode, filters]);

  useEffect(() => {
    if (user?.course) {
      fetchFilters();
    }
  }, [user?.course]);

  const fetchAttendanceForDate = async () => {
    setLoading(true);
    try {
      // Server already filters by course for principals, no need to pass course parameter
      const params = new URLSearchParams({ date: selectedDate });
      if (filters.studentId) params.append('studentId', filters.studentId);
      if (filters.status) params.append('status', filters.status);
      if (filters.branch) params.append('branch', filters.branch);
      if (filters.gender) params.append('gender', filters.gender);
      console.log('[DEBUG] Fetching attendance for date with params:', params.toString());
      const response = await api.get(`/api/attendance/principal/date?${params}`);
      console.log('[DEBUG] API response:', response.data);
      if (response.data.success) {
        const attendanceData = response.data.data.attendance; // Access the attendance array
        console.log('[DEBUG] Attendance data received:', attendanceData);
        setAttendance(attendanceData);
        // Use server-provided statistics
        setStatistics(response.data.data.statistics);
      }
    } catch (error) {
      console.error('[DEBUG] Error fetching attendance:', error);
      toast.error('Failed to fetch attendance data');
    } finally {
      setLoading(false);
      console.log('[DEBUG] Loading set to false');
    }
  };

  const fetchAttendanceForRange = async () => {
    setLoading(true);
    try {
      // Server already filters by course for principals, no need to pass course parameter
      const params = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      });
      if (filters.studentId) params.append('studentId', filters.studentId);
      if (filters.status) params.append('status', filters.status);
      if (filters.branch) params.append('branch', filters.branch);
      if (filters.gender) params.append('gender', filters.gender);
      console.log('[DEBUG] Fetching attendance for range with params:', params.toString());
      const response = await api.get(`/api/attendance/principal/range?${params}`);
      console.log('[DEBUG] API response:', response.data);
      if (response.data.success) {
        const attendanceData = response.data.data.attendance;
        console.log('[DEBUG] Attendance data received:', attendanceData);
        setAttendance(attendanceData);
        // Use server-provided statistics
        setStatistics(response.data.data.statistics);
      }
    } catch (error) {
      console.error('[DEBUG] Error fetching attendance:', error);
      toast.error('Failed to fetch attendance data');
    } finally {
      setLoading(false);
      console.log('[DEBUG] Loading set to false');
    }
  };

  const fetchFilters = async () => {
    setLoadingFilters(true);
    try {
      const courseId = typeof user.course === 'object' ? user.course._id : user.course;
      const res = await api.get('/api/course-management/branches');
      if (res.data.success) {
        // Filter branches for this course only
        const filtered = res.data.data.filter(branch =>
          branch.course === courseId ||
          (typeof branch.course === 'object' && branch.course._id === courseId)
        );
        setFilteredBranches(filtered);
      } else {
        setFilteredBranches([]);
      }
    } catch (err) {
      toast.error('Failed to fetch branches');
      setFilteredBranches([]);
    } finally {
      setLoadingFilters(false);
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
    if (record.isOnLeave) return 'On Leave';
    
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
            onLeaveDays: 0,
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
      } else if (status === 'On Leave') {
        studentData.summary.onLeaveDays++;
      }
    });

    // Calculate percentages
    studentMap.forEach(studentData => {
      const { totalDays, presentDays, partialDays, onLeaveDays } = studentData.summary;
      const effectivePresentDays = presentDays + (partialDays * 0.33); // Count partial as 0.33 for 3 sessions
      // Exclude onLeaveDays from percentage calculation
      const daysForPercentage = totalDays - onLeaveDays;
      studentData.summary.attendancePercentage = daysForPercentage > 0 
        ? Math.round((effectivePresentDays / daysForPercentage) * 100) 
        : 0;
    });

    return Array.from(studentMap.values());
  };

  const getPercentageColor = (percentage) => {
    if (percentage >= 90) return 'text-green-600 bg-green-50';
    if (percentage >= 75) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getPercentageIcon = (percentage) => {
    if (percentage >= 90) return <CheckIcon className="w-3 h-3" />;
    if (percentage >= 75) return <ClockIcon className="w-3 h-3" />;
    return <XMarkIcon className="w-3 h-3" />;
  };

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
  // Helper function to safely get course name
  const getCourseName = (course) => {
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

  const getDisplayData = () => {
    if (viewMode === 'date') {
      return attendance;
    } else {
      return organizeAttendanceByStudent(attendance);
    }
  };

  const generateExcel = async () => {
    setGeneratingExcel(true);
    try {
      // Get comprehensive attendance data for the report using principal report endpoint
      const params = new URLSearchParams();
      if (viewMode === 'date') {
        params.append('date', selectedDate);
      } else {
        params.append('startDate', dateRange.startDate);
        params.append('endDate', dateRange.endDate);
      }
      if (filters.studentId) params.append('studentId', filters.studentId);
      if (filters.status) params.append('status', filters.status);
      if (filters.branch) params.append('branch', filters.branch);
      if (filters.gender) params.append('gender', filters.gender);

      const response = await api.get(`/api/attendance/principal/report?${params}`);
      
      if (!response.data.success) {
        throw new Error('Failed to fetch attendance data');
      }

      const attendanceData = response.data.data.attendance;
      
      // Get unique dates for column headers
      const uniqueDates = [];
      if (viewMode === 'date') {
        uniqueDates.push(selectedDate);
      } else {
        // Extract unique dates from attendance records
        const dateSet = new Set();
        attendanceData.forEach(record => {
          if (record.date) {
            dateSet.add(new Date(record.date).toISOString().split('T')[0]);
          }
        });
        uniqueDates.push(...Array.from(dateSet).sort());
      }

      // Create table headers
      const tableHeaders = ['S.No', 'Name', 'Roll Number', 'Course', 'Branch'];
      
      // Add date columns
      uniqueDates.forEach(date => {
        tableHeaders.push(date);
      });
      
      // Create the worksheet with headers first
      const headerData = [tableHeaders];
      const worksheet = XLSX.utils.aoa_to_sheet(headerData);
      
      // Apply bold styling to headers immediately
      tableHeaders.forEach((header, index) => {
        const cellRef = XLSX.utils.encode_cell({ r: 0, c: index });
        if (worksheet[cellRef]) {
          worksheet[cellRef].s = {
            font: { bold: true, size: 14 },
            fill: { fgColor: { rgb: "4472C4" } },
            alignment: { horizontal: "center", vertical: "center" },
            border: {
              top: { style: "thin" },
              bottom: { style: "thin" },
              left: { style: "thin" },
              right: { style: "thin" }
            }
          };
        }
      });
      
      // Group attendance by student
      const studentMap = new Map();
      
      attendanceData.forEach(record => {
        const studentId = record.student?._id || record._id;
        if (!studentId) return;

        if (!studentMap.has(studentId)) {
          studentMap.set(studentId, {
            student: record.student || record,
            attendanceRecords: []
          });
        }

        const studentData = studentMap.get(studentId);
        studentData.attendanceRecords.push(record);
      });

      // Create table data
      const tableData = [];
      let serialNumber = 1;

      studentMap.forEach((studentData) => {
        const { student, attendanceRecords } = studentData;
        
        const row = [
          serialNumber++,
          student.name || 'Unknown',
          student.rollNumber || 'N/A',
          getCourseName(student.course),
          getBranchName(student.branch)
        ];

        // Add attendance for each date
        uniqueDates.forEach(date => {
          const dateAttendance = attendanceRecords.find(record => {
            const recordDate = new Date(record.date).toISOString().split('T')[0];
            return recordDate === date;
          });

          if (dateAttendance) {
            const isOnLeave = dateAttendance.isOnLeave || false;
            const morning = isOnLeave ? '🏠' : (dateAttendance.morning ? '✅' : '❌');
            const evening = isOnLeave ? '🏠' : (dateAttendance.evening ? '✅' : '❌');
            const night = isOnLeave ? '🏠' : (dateAttendance.night ? '✅' : '❌');
            row.push(`${morning} | ${evening} | ${night}`);
          } else {
            row.push('-'); // No attendance record
          }
        });

        tableData.push(row);
      });

      // Add table data to worksheet
      XLSX.utils.sheet_add_aoa(worksheet, tableData, { origin: 'A2' });
      
      // Apply styling to the worksheet
      const range = XLSX.utils.decode_range(worksheet['!ref']);
      
      // Set column widths for better readability
      const columnWidths = [];
      tableHeaders.forEach((header, index) => {
        if (index === 0) columnWidths.push(8); // S.No
        else if (index === 1) columnWidths.push(25); // Name
        else if (index === 2) columnWidths.push(15); // Roll Number
        else if (index === 3) columnWidths.push(15); // Course
        else if (index === 4) columnWidths.push(25); // Branch
        else columnWidths.push(18); // Date columns
      });
      worksheet['!cols'] = columnWidths.map(width => ({ width }));
      
      // Style the data rows with borders
      for (let row = 2; row < 2 + tableData.length; row++) {
        for (let col = 0; col <= range.e.c; col++) {
          const cellRef = XLSX.utils.encode_cell({ r: row, c: col });
          if (worksheet[cellRef]) {
            worksheet[cellRef].s = {
              font: { size: 11 },
              border: {
                top: { style: "thin" },
                bottom: { style: "thin" },
                left: { style: "thin" },
                right: { style: "thin" }
              },
              alignment: { horizontal: "center", vertical: "center" }
            };
          }
        }
      }

      // Create workbook and add worksheet
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance Report');

      // Generate filename
      const courseName = typeof user.course === 'object' ? user.course.name : user.course;
      const filename = `Attendance_Report_${courseName}_${new Date().toISOString().split('T')[0]}.xlsx`;

      // Download the file
      XLSX.writeFile(workbook, filename);
      
      toast.success('Excel report generated successfully!');
    } catch (error) {
      console.error('Error generating Excel report:', error);
      toast.error('Failed to generate Excel report');
    } finally {
      setGeneratingExcel(false);
    }
  };

  // Update course display
  const courseName = typeof user.course === 'object' ? user.course.name : user.course;
  const courseCode = typeof user.course === 'object' ? user.course.code : '';

  if (loading || !user?.course) {
    return <LoadingSpinner />;
  }

  return (
    <div className="p-3 sm:p-6">
      <SEO title="View Attendance - Principal Dashboard" />
      
      
      
      {/* Photo Modal */}
      <Modal isOpen={photoModal.open} onClose={() => setPhotoModal({ open: false, src: '', name: '' })}>
        <div className="flex flex-col items-center justify-center p-4">
          <img
            src={photoModal.src}
            alt={photoModal.name}
            className="max-h-[70vh] max-w-full rounded-lg border border-gray-200 shadow-lg"
          />
          <button
            className="mt-4 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
            onClick={() => setPhotoModal({ open: false, src: '', name: '' })}
          >
            Close
          </button>
        </div>
      </Modal>

      {/* Stats Display */}
      <div className="flex items-center justify-end gap-4 mb-4 sm:mb-6">
        <div className="text-right">
          <p className="text-xs sm:text-sm text-gray-500">Total Records</p>
          <p className="text-lg sm:text-2xl font-bold text-purple-600">{attendance.length}</p>
        </div>
      </div>

      {/* Statistics */}
      {viewMode === 'date' && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl shadow-lg p-4 sm:p-6 mb-4 sm:mb-6"
        >
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
            <ChartBarIcon className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
            Attendance Statistics
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 sm:gap-4">
            <div className="text-center">
              <p className="text-xs sm:text-sm text-gray-500">Total Students</p>
              <p className="text-lg sm:text-2xl font-bold text-purple-600">{statistics.totalStudents}</p>
            </div>
            <div className="text-center">
              <p className="text-xs sm:text-sm text-gray-500">Morning Present</p>
              <p className="text-lg sm:text-2xl font-bold text-yellow-600">{statistics.morningPresent}</p>
            </div>
            <div className="text-center">
              <p className="text-xs sm:text-sm text-gray-500">Evening Present</p>
              <p className="text-lg sm:text-2xl font-bold text-indigo-600">{statistics.eveningPresent}</p>
            </div>
            <div className="text-center">
              <p className="text-xs sm:text-sm text-gray-500">Night Present</p>
              <p className="text-lg sm:text-2xl font-bold text-blue-600">{statistics.nightPresent}</p>
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

      {/* Controls */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-xl shadow-lg p-4 sm:p-6 mb-4 sm:mb-6"
      >
        {/* Filter Toggle Button */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3 sm:mb-4">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900">Filters</h3>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <button
              onClick={generateExcel}
              disabled={generatingExcel || attendance.length === 0}
              className="flex items-center justify-center gap-2 px-3 py-2 text-xs sm:text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors touch-manipulation w-full sm:w-auto"
            >
              <ArrowDownTrayIcon className="w-4 h-4" />
              {generatingExcel ? 'Generating...' : 'Generate Excel'}
            </button>
            <button
              onClick={() => setFiltersCollapsed(!filtersCollapsed)}
              className="flex items-center justify-center gap-2 px-3 py-2 text-xs sm:text-sm font-medium text-purple-600 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors touch-manipulation w-full sm:w-auto"
            >
              <FunnelIcon className="w-4 h-4" />
              {filtersCollapsed ? 'Show Filters' : 'Hide Filters'}
            </button>
          </div>
        </div>

        {/* Collapsible Filters */}
        <AnimatePresence>
          {!filtersCollapsed && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-3 sm:mb-4">
                {/* View Mode Toggle */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">View Mode</label>
                  <select
                    value={viewMode}
                    onChange={(e) => setViewMode(e.target.value)}
                    className="w-full px-2.5 sm:px-3 py-2 sm:py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-xs sm:text-sm"
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
                      className="w-full px-2.5 sm:px-3 py-2 sm:py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-xs sm:text-sm"
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
                        className="w-full px-2.5 sm:px-3 py-2 sm:py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-xs sm:text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">End Date</label>
                      <input
                        type="date"
                        value={dateRange.endDate}
                        onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                        className="w-full px-2.5 sm:px-3 py-2 sm:py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-xs sm:text-sm"
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
                    className="w-full px-2.5 sm:px-3 py-2 sm:py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-xs sm:text-sm"
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Branch</label>
                  <select
                    name="branch"
                    value={filters.branch}
                    onChange={handleFilterChange}
                    disabled={loadingFilters}
                    className="w-full px-2.5 sm:px-3 py-2 sm:py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100 text-xs sm:text-sm"
                  >
                    <option value="">{loadingFilters ? 'Loading...' : 'All Branches'}</option>
                    {filteredBranches.map((branch) => (
                      <option key={branch._id} value={branch._id}>
                        {branch.name} ({branch.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Gender</label>
                  <select
                    name="gender"
                    value={filters.gender}
                    onChange={handleFilterChange}
                    className="w-full px-2.5 sm:px-3 py-2 sm:py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-xs sm:text-sm"
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
                    className="w-full px-2.5 sm:px-3 py-2 sm:py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-xs sm:text-sm"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Attendance List */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white rounded-xl shadow-lg overflow-hidden"
      >
        <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900">
            Attendance Records ({attendance.length})
          </h2>
        </div>

        {attendance.length === 0 ? (
          <div className="p-6 sm:p-8 text-center">
            <UserGroupIcon className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500 text-xs sm:text-sm">No attendance records found for the selected criteria</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Student
                  </th>
                  {viewMode === 'date' ? (
                    <>
                      <th className="px-3 sm:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <SunIcon className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" />
                        Morning
                      </th>
                      <th className="px-3 sm:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <MoonIcon className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" />
                        Evening
                      </th>
                      <th className="px-3 sm:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <StarIcon className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" />
                        Night
                      </th>
                      <th className="px-3 sm:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                        Notes
                      </th>
                    </>
                  ) : (
                    <>
                      <th className="px-3 sm:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <CalendarDaysIcon className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" />
                        Total Days
                      </th>
                      <th className="px-3 sm:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <CheckIcon className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" />
                        Present Days
                      </th>
                      <th className="px-3 sm:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <ClockIcon className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" />
                        Partial Days
                      </th>
                      <th className="px-3 sm:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <XMarkIcon className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" />
                        Absent Days
                      </th>
                      <th className="px-3 sm:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <ChartBarIcon className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" />
                        Attendance %
                      </th>
                      <th className="px-3 sm:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
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
                        key={record._id || index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="hover:bg-gray-50"
                      >
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-8 w-8 sm:h-10 sm:w-10">
                              {record.studentPhoto ? (
                                <img
                                  src={record.studentPhoto}
                                  alt={record.name || 'Student Photo'}
                                  className="h-8 w-8 sm:h-10 sm:w-10 rounded-full object-cover border border-gray-200 cursor-pointer"
                                  onClick={() => setPhotoModal({ open: true, src: record.studentPhoto, name: record.name })}
                                />
                              ) : (
                                <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-purple-100 flex items-center justify-center">
                                  <span className="text-xs sm:text-sm font-medium text-purple-600">
                                    {record.name?.charAt(0) || 'S'}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="ml-3 sm:ml-4">
                              <div className="text-xs sm:text-sm font-medium text-gray-900">
                                {record.name || 'Unknown Student'}
                              </div>
                              <div className="text-xs sm:text-sm text-gray-500">
                                {record.rollNumber || 'N/A'} • {getCourseName(record.course)} {record.year || 'N/A'} • {getBranchName(record.branch)}
                              </div>
                              <div className="text-xs text-gray-400">
                                Room {record.roomNumber || 'N/A'} • {record.gender || 'N/A'}
                              </div>
                            </div>
                          </div>
                        </td>
                        
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-center">
                          {record.morning ? (
                            <CheckIcon className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 mx-auto" />
                          ) : (
                            <span className="text-gray-400 text-sm font-medium">-</span>
                          )}
                        </td>
                        
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-center">
                          {record.evening ? (
                            <CheckIcon className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 mx-auto" />
                          ) : (
                            <span className="text-gray-400 text-sm font-medium">-</span>
                          )}
                        </td>
                        
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-center">
                          {record.night ? (
                            <CheckIcon className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 mx-auto" />
                          ) : (
                            <span className="text-gray-400 text-sm font-medium">-</span>
                          )}
                        </td>
                        
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
                            {getStatusIcon(status)}
                            <span className="ml-1">{status}</span>
                          </span>
                        </td>
                        
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500 hidden md:table-cell">
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
                          <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
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
                          
                          <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-center text-xs sm:text-sm text-gray-900">
                            {summary.totalDays}
                          </td>
                          
                          <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-center">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-green-600 bg-green-50">
                              <CheckIcon className="w-3 h-3 mr-1" />
                              {summary.presentDays}
                            </span>
                          </td>
                          
                          <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-center">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-yellow-600 bg-yellow-50">
                              <ClockIcon className="w-3 h-3 mr-1" />
                              {summary.partialDays}
                            </span>
                          </td>
                          
                          <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-center">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-red-600 bg-red-50">
                              <XMarkIcon className="w-3 h-3 mr-1" />
                              {summary.absentDays}
                            </span>
                          </td>
                          
                          <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-center">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getPercentageColor(summary.attendancePercentage)}`}>
                              {getPercentageIcon(summary.attendancePercentage)}
                              <span className="ml-1">{summary.attendancePercentage}%</span>
                            </span>
                          </td>
                          
                          <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-center">
                            <button
                              className="text-purple-600 hover:text-purple-900"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleStudentExpansion(student._id);
                              }}
                            >
                              <EyeIcon className="w-4 h-4" />
                            </button>
                          </td>
                        </motion.tr>
                        
                        {/* Expanded details */}
                        {isExpanded && (
                          <tr>
                            <td colSpan="6" className="px-3 sm:px-6 py-4 bg-gray-50">
                              <div className="space-y-2">
                                <h4 className="font-medium text-gray-900 text-sm sm:text-base">Detailed Attendance Records</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                  {record.attendanceRecords.map((attRecord, idx) => (
                                    <div key={idx} className="bg-white p-2 sm:p-3 rounded border">
                                      <div className="text-xs sm:text-sm font-medium text-gray-900">
                                        {formatDate(attRecord.date)}
                                      </div>
                                      <div className="text-xs text-gray-500 mt-1">
                                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(getAttendanceStatus(attRecord))}`}>
                                          {getStatusIcon(getAttendanceStatus(attRecord))}
                                          <span className="ml-1">{getAttendanceStatus(attRecord)}</span>
                                        </span>
                                      </div>
                                      <div className="text-xs text-gray-400 mt-1">
                                        {attRecord.morning ? '✓' : '-'} Morning • {attRecord.evening ? '✓' : '-'} Evening • {attRecord.night ? '✓' : '-'} Night
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  }
                })}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default PrincipalViewAttendance; 