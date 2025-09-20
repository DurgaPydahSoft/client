import React, { useState, useEffect, useCallback } from 'react';
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
  ArrowDownTrayIcon,
  BuildingOfficeIcon,
  PhoneIcon,
  EnvelopeIcon
} from '@heroicons/react/24/outline';
import api from '../../utils/axios';
import LoadingSpinner from '../../components/LoadingSpinner';
import { toast } from 'react-hot-toast';
import SEO from '../../components/SEO';
import { useAuth } from '../../context/AuthContext';

const TakeStaffAttendance = () => {
  const { user } = useAuth();
  
  // Debug logging to check user data
  console.log('🔍 TakeStaffAttendance Component - Full user object:', user);
  console.log('🔍 TakeStaffAttendance Component - User hostelType:', user?.hostelType);
  console.log('🔍 TakeStaffAttendance Component - User role:', user?.role);
  
  // Session time windows (IST)
  const SESSION_TIMES = {
    morning: { start: 7.5, end: 9.5 }, // 7:30 AM - 9:30 AM
    evening: { start: 17.5, end: 19 }, // 5:30 PM - 7:00 PM
    night: { start: 20, end: 22 } // 8:00 PM - 10:00 PM
  };

  // Get current time in IST
  const getCurrentISTTime = () => {
    const now = new Date();
    // Get IST time by creating a new date with IST timezone
    const istTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    return istTime;
  };

  // Get current date in YYYY-MM-DD format (IST)
  const getCurrentISTDate = () => {
    const istTime = getCurrentISTTime();
    return istTime.toISOString().split('T')[0];
  };
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [staff, setStaff] = useState([]);
  const [selectedDate, setSelectedDate] = useState(getCurrentISTDate());
  const [attendanceData, setAttendanceData] = useState({});
  const [filters, setFilters] = useState({
    type: '',
    department: '',
    gender: ''
  });
  const [stats, setStats] = useState({
    totalStaff: 0,
    attendanceTaken: 0
  });
  const [departments, setDepartments] = useState([]);
  const [loadingFilters, setLoadingFilters] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Time-based session management
  const [currentTime, setCurrentTime] = useState(new Date());
  const [sessionStatus, setSessionStatus] = useState({
    morning: { isActive: false, timeLeft: '', canEdit: false },
    evening: { isActive: false, timeLeft: '', canEdit: false },
    night: { isActive: false, timeLeft: '', canEdit: false }
  });

  // Check if a session is currently active
  const isSessionActive = (session) => {
    const currentTime = getCurrentISTTime();
    const currentHour = currentTime.getHours() + (currentTime.getMinutes() / 60);
    const sessionTime = SESSION_TIMES[session];
    
    console.log(`🔍 Session ${session}: Current hour: ${currentHour}, Session: ${sessionTime.start}-${sessionTime.end}, Active: ${currentHour >= sessionTime.start && currentHour < sessionTime.end}`);
    
    return currentHour >= sessionTime.start && currentHour < sessionTime.end;
  };

  // Calculate time left for a session with seconds precision
  const getTimeLeft = (session) => {
    const currentTime = getCurrentISTTime();
    const sessionTime = SESSION_TIMES[session];
    const currentHour = currentTime.getHours() + (currentTime.getMinutes() / 60) + (currentTime.getSeconds() / 3600);
    
    if (currentHour < sessionTime.start) {
      // Session hasn't started yet
      const timeUntilStart = (sessionTime.start - currentHour) * 60; // Convert to minutes
      const hours = Math.floor(timeUntilStart / 60);
      const minutes = Math.floor(timeUntilStart % 60);
      return `Starts in ${hours}h ${minutes}m`;
    } else if (currentHour >= sessionTime.end) {
      // Session has ended
      return 'Ended';
    } else {
      // Session is active
      const timeLeft = (sessionTime.end - currentHour) * 60; // Convert to minutes
      const hours = Math.floor(timeLeft / 60);
      const minutes = Math.floor(timeLeft % 60);
      return `${hours}h ${minutes}m left`;
    }
  };

  // Check if any session is currently active
  const isAnySessionActive = () => {
    return isSessionActive('morning') || isSessionActive('evening') || isSessionActive('night');
  };

  // Update session status
  const updateSessionStatus = useCallback(() => {
    const newStatus = {};
    
    ['morning', 'evening', 'night'].forEach(session => {
      const isActive = isSessionActive(session);
      const timeLeft = getTimeLeft(session);
      const canEdit = isActive || (session === 'morning' && isSessionActive('evening')) || 
                     (session === 'evening' && isSessionActive('night')) ||
                     (session === 'night' && isSessionActive('morning'));
      
      newStatus[session] = { isActive, timeLeft, canEdit };
    });
    
    setSessionStatus(newStatus);
  }, []);

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
      updateSessionStatus();
    }, 1000);

    return () => clearInterval(timer);
  }, [updateSessionStatus]);

  // Fetch staff for attendance
  const fetchStaff = async () => {
    try {
      setLoading(true);
      console.log('🔍 Fetching staff for attendance...');
      
      // Determine warden's gender for filtering
      const wardenGender = user?.hostelType === 'Boys' ? 'Male' : 
                          user?.hostelType === 'Girls' ? 'Female' : null;
      
      console.log('🔍 Warden gender filter:', wardenGender);
      
      const params = new URLSearchParams({
        date: selectedDate,
        ...(filters.type && { type: filters.type }),
        ...(filters.department && { department: filters.department }),
        ...(wardenGender && { gender: wardenGender })
      });

      console.log('🔍 API params:', params.toString());
      
      const response = await api.get(`/api/staff-attendance/warden/staff?${params}`);
      console.log('🔍 Staff attendance API response:', response.data);
      
      if (response.data.success) {
        console.log('🔍 Staff received:', response.data.data.staff.length);
        
        // Get staff directly from the response
        let staff = response.data.data.staff;
        
        // Frontend filtering for type and department
        if (filters.type) {
          staff = staff.filter(staffMember => 
            staffMember.type === filters.type
          );
          console.log('🔍 After type filtering:', staff.length, 'staff');
        }

        if (filters.department) {
          staff = staff.filter(staffMember => 
            staffMember.department === filters.department
          );
          console.log('🔍 After department filtering:', staff.length, 'staff');
        }
        
        setStaff(staff);
        setStats({
          totalStaff: staff.length,
          attendanceTaken: response.data.data.attendanceTaken
        });
        
        // Initialize attendance data
        const initialAttendance = {};
        staff.forEach(staffMember => {
          initialAttendance[staffMember._id] = {
            morning: staffMember.attendance?.morning || false,
            evening: staffMember.attendance?.evening || false,
            night: staffMember.attendance?.night || false,
            notes: ''
          };
        });
        setAttendanceData(initialAttendance);
      }
    } catch (error) {
      console.error('Error fetching staff:', error);
      toast.error('Failed to fetch staff');
    } finally {
      setLoading(false);
    }
  };

  // Fetch departments for filtering
  const fetchDepartments = async () => {
    try {
      setLoadingFilters(true);
      const response = await api.get('/api/admin/staff-guests?limit=1000');
      if (response.data.success) {
        const departments = [...new Set(
          response.data.data.staffGuests
            .filter(sg => sg.department)
            .map(sg => sg.department)
        )].sort();
        setDepartments(departments);
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
    } finally {
      setLoadingFilters(false);
    }
  };

  // Handle attendance change
  const handleAttendanceChange = (staffId, session, value) => {
    setAttendanceData(prev => ({
      ...prev,
      [staffId]: {
        ...prev[staffId],
        [session]: value
      }
    }));
  };

  // Handle notes change
  const handleNotesChange = (staffId, notes) => {
    setAttendanceData(prev => ({
      ...prev,
      [staffId]: {
        ...prev[staffId],
        notes
      }
    }));
  };

  // Handle filter change
  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  // Handle submit
  const handleSubmit = async () => {
    // Validate that warden can only submit for current date
    const currentISTDate = getCurrentISTDate();
    if (selectedDate !== currentISTDate) {
      toast.error('Warden can only take attendance for today');
      setSelectedDate(currentISTDate);
      return;
    }

    // Check if any session is currently active
    if (!isAnySessionActive()) {
      toast.error('No attendance session is currently active. Please wait for an active session.');
      return;
    }

    setSubmitting(true);
    try {
      const attendanceRecords = Object.entries(attendanceData).map(([staffId, data]) => ({
        staffId,
        morning: data.morning,
        evening: data.evening,
        night: data.night,
        notes: data.notes
      }));

      // Show progress message
      toast.loading(`Saving attendance for ${attendanceRecords.length} staff members...`, {
        id: 'attendance-progress'
      });

      const response = await api.post('/api/staff-attendance/warden/take', {
        date: selectedDate,
        attendanceData: attendanceRecords
      }, {
        timeout: 90000 // 90 seconds timeout for attendance operations
      });

      if (response.data.success) {
        toast.success(`Attendance saved for ${response.data.data.successful} staff members`, {
          id: 'attendance-progress'
        });
        fetchStaff(); // Refresh data
      }
    } catch (error) {
      console.error('Error saving attendance:', error);
      
      // Provide more specific error messages
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        toast.error('Attendance operation timed out. Please try again with fewer staff or check your connection.', {
          id: 'attendance-progress'
        });
      } else if (error.response?.status === 400) {
        toast.error(error.response.data.message || 'Invalid attendance data', {
          id: 'attendance-progress'
        });
      } else {
        toast.error('Failed to save attendance. Please try again.', {
          id: 'attendance-progress'
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Get attendance status
  const getAttendanceStatus = (staffMember) => {
    // Check if staff member is on leave first
    if (staffMember.isOnLeave) return 'On Leave';
    
    const attendance = attendanceData[staffMember._id];
    if (!attendance) return 'Absent';
    
    if (attendance.morning && attendance.evening && attendance.night) return 'Present';
    if (attendance.morning || attendance.evening || attendance.night) return 'Partial';
    return 'Absent';
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'Present': return 'text-green-600 bg-green-50';
      case 'Partial': return 'text-yellow-600 bg-yellow-50';
      case 'Absent': return 'text-red-600 bg-red-50';
      case 'On Leave': return 'text-blue-600 bg-blue-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  // Get status icon
  const getStatusIcon = (status) => {
    switch (status) {
      case 'Present': return <CheckIcon className="w-4 h-4" />;
      case 'Partial': return <ClockIcon className="w-4 h-4" />;
      case 'Absent': return <XMarkIcon className="w-4 h-4" />;
      case 'On Leave': return <CalendarIcon className="w-4 h-4" />;
      default: return null;
    }
  };

  // Fetch data when component mounts or filters change
  useEffect(() => {
    fetchStaff();
    fetchDepartments();
  }, [selectedDate, filters.type, filters.department, filters.gender]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <SEO title="Take Staff Attendance - Warden Dashboard" />
      
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8 mt-12 sm:mt-0">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg sm:rounded-xl shadow-sm p-3 sm:p-4 lg:p-6 mb-3 sm:mb-4 lg:mb-6"
        >
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 sm:gap-4">
            <div>
              <h1 className="text-lg sm:text-xl lg:text-2xl font-bold bg-gradient-to-r from-green-600 to-green-700 bg-clip-text text-transparent flex items-center gap-1.5 sm:gap-2">
                <UserGroupIcon className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-green-600 flex-shrink-0" />
                <span>Take Staff Attendance {user?.hostelType && `(${user.hostelType} Staff)`}</span>
              </h1>
              <p className="text-gray-600 mt-1 text-xs sm:text-sm lg:text-base">
                Mark daily attendance for {user?.hostelType ? `${user.hostelType.toLowerCase()}` : 'all'} staff members
              </p>
            </div>
            <div className="grid grid-cols-2 lg:flex lg:flex-row gap-2 sm:gap-4 text-center lg:text-right">
              <div className="bg-gray-50 rounded-lg p-2 sm:p-3 lg:bg-transparent lg:p-0">
                <p className="text-xs sm:text-sm text-gray-500">Total Staff</p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-green-600">{stats.totalStaff}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-2 sm:p-3 lg:bg-transparent lg:p-0">
                <p className="text-xs sm:text-sm text-gray-500">Attendance Taken</p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-600">{stats.attendanceTaken}</p>
              </div>
            </div>
          </div>
          
          {/* Session Status Indicator */}
          <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ClockIcon className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">Current Session Status</span>
              </div>
              <div className="text-xs text-blue-600">
                IST: {currentTime.toLocaleTimeString('en-IN', { 
                  hour: '2-digit', 
                  minute: '2-digit',
                  second: '2-digit'
                })} | Date: {selectedDate}
              </div>
            </div>
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
              {Object.entries(sessionStatus).map(([session, status]) => (
                <div key={session} className={`p-2 rounded-lg text-xs ${
                  status.isActive 
                    ? 'bg-green-100 border border-green-300 text-green-800' 
                    : 'bg-gray-100 border border-gray-300 text-gray-600'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="font-medium capitalize">{session}</span>
                    <span className={`w-2 h-2 rounded-full ${
                      status.isActive ? 'bg-green-500' : 'bg-gray-400'
                    }`}></span>
                  </div>
                  <div className="mt-1 text-xs">
                    {status.timeLeft}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Controls */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-lg sm:rounded-xl shadow-sm p-3 sm:p-4 lg:p-6 mb-3 sm:mb-4 lg:mb-6"
        >
          {/* Mobile Filter Toggle */}
          <div className="lg:hidden mb-3">
            <button
              onClick={() => setShowMobileFilters(!showMobileFilters)}
              className="flex items-center gap-2 px-3 py-2 text-xs sm:text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <FunnelIcon className="w-3 h-3 sm:w-4 sm:h-4" />
              Filters
              <svg
                className={`w-3 h-3 sm:w-4 sm:h-4 transition-transform duration-200 ${
                  showMobileFilters ? 'rotate-180' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>

          {/* Mobile Filters Panel */}
          {showMobileFilters && (
            <div className="lg:hidden mb-4 p-3 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Date Selection */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    <CalendarIcon className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" />
                    Date
                  </label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    max={getCurrentISTDate()}
                    className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-xs sm:text-sm"
                  />
                </div>

                {/* Type Filter */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select
                    value={filters.type}
                    onChange={(e) => handleFilterChange('type', e.target.value)}
                    className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-xs sm:text-sm"
                  >
                    <option value="">All Types</option>
                    <option value="staff">Staff</option>
                    <option value="guest">Guest</option>
                  </select>
                </div>

                {/* Department Filter */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Department</label>
                  <select
                    value={filters.department}
                    onChange={(e) => handleFilterChange('department', e.target.value)}
                    disabled={loadingFilters}
                    className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-xs sm:text-sm disabled:bg-gray-100"
                  >
                    <option value="">All Departments</option>
                    {departments.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>

                {/* Gender Filter */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Gender</label>
                  <select
                    value={filters.gender}
                    onChange={(e) => handleFilterChange('gender', e.target.value)}
                    className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-xs sm:text-sm"
                  >
                    <option value="">All Genders</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Desktop Controls */}
          <div className="hidden lg:grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 lg:gap-4">
            {/* Date Selection */}
            <div className="sm:col-span-1">
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                <CalendarIcon className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" />
                Date
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                max={getCurrentISTDate()}
                className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-xs sm:text-sm"
              />
            </div>

            {/* Type Filter */}
            <div className="sm:col-span-1">
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                <FunnelIcon className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" />
                Type
              </label>
              <select
                value={filters.type}
                onChange={(e) => handleFilterChange('type', e.target.value)}
                className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-xs sm:text-sm"
              >
                <option value="">All Types</option>
                <option value="staff">Staff</option>
                <option value="guest">Guest</option>
              </select>
            </div>

            {/* Department Filter */}
            <div className="sm:col-span-1">
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Department</label>
              <select
                value={filters.department}
                onChange={(e) => handleFilterChange('department', e.target.value)}
                disabled={loadingFilters}
                className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-xs sm:text-sm disabled:bg-gray-100"
              >
                <option value="">All Departments</option>
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>

            {/* Gender Filter */}
            <div className="sm:col-span-1">
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Gender</label>
              <select
                value={filters.gender}
                onChange={(e) => handleFilterChange('gender', e.target.value)}
                className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-xs sm:text-sm"
              >
                <option value="">All Genders</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
        </motion.div>

        {/* Submit Button - Mobile Optimized */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-3 sm:mb-4 lg:mb-6 sticky top-12 z-[60] bg-gray-50 p-3 -mx-3 sm:mx-0 sm:p-0 sm:bg-transparent sm:static border-b border-gray-200 sm:border-b-0"
        >
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 lg:gap-4">
            <button
              onClick={handleSubmit}
              disabled={submitting || !isAnySessionActive()}
              className={`w-full flex items-center justify-center gap-2 sm:gap-3 px-4 sm:px-6 py-3 sm:py-4 rounded-lg sm:rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl font-semibold text-sm sm:text-base ${
                submitting || !isAnySessionActive()
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700 hover:shadow-xl text-white'
              }`}
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-xs sm:text-sm">Saving Attendance...</span>
                </>
              ) : !isAnySessionActive() ? (
                <>
                  <ClockIcon className="w-4 h-4 sm:w-6 sm:h-6" />
                  <span className="hidden sm:inline">No Active Session</span>
                  <span className="sm:hidden text-xs">No Active Session</span>
                </>
              ) : (
                <>
                  <CheckIcon className="w-4 h-4 sm:w-6 sm:h-6" />
                  <span className="hidden sm:inline">Save Attendance ({staff.length} staff)</span>
                  <span className="sm:hidden text-xs">Save Attendance</span>
                </>
              )}
            </button>
            
            {/* Quick Stats */}
            <div className="flex justify-between sm:hidden text-xs sm:text-sm text-gray-600 bg-white rounded-lg p-2 sm:p-3 border border-gray-200">
              <div className="text-center">
                <div className="font-semibold text-green-600 text-sm sm:text-base">{staff.filter(s => getAttendanceStatus(s) === 'Present').length}</div>
                <div className="text-xs">Present</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-yellow-600 text-sm sm:text-base">{staff.filter(s => getAttendanceStatus(s) === 'Partial').length}</div>
                <div className="text-xs">Partial</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-red-600 text-sm sm:text-base">{staff.filter(s => getAttendanceStatus(s) === 'Absent').length}</div>
                <div className="text-xs">Absent</div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Staff List - Mobile Optimized */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-lg sm:rounded-xl shadow-sm overflow-hidden"
        >
          <div className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900">
                Staff Members ({staff.length})
              </h2>
              <div className="hidden sm:flex items-center gap-3 sm:gap-4 text-xs sm:text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 sm:w-3 sm:h-3 bg-green-500 rounded-full"></div>
                  <span>Present: {staff.filter(s => getAttendanceStatus(s) === 'Present').length}</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 sm:w-3 sm:h-3 bg-yellow-500 rounded-full"></div>
                  <span>Partial: {staff.filter(s => getAttendanceStatus(s) === 'Partial').length}</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 sm:w-3 sm:h-3 bg-red-500 rounded-full"></div>
                  <span>Absent: {staff.filter(s => getAttendanceStatus(s) === 'Absent').length}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile Card View */}
          <div className="block sm:hidden">
            <div className="divide-y divide-gray-200">
              {staff.map((staffMember, index) => {
                const status = getAttendanceStatus(staffMember);
                return (
                  <motion.div
                    key={staffMember._id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="p-3 sm:p-4 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                  >
                    {/* Staff Member Info */}
                    <div className="mb-3 sm:mb-4">
                      <div className="flex items-start justify-between mb-2 sm:mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm sm:text-base font-semibold text-gray-900 truncate">{staffMember.name}</h3>
                          {/* Mobile: Show only type and department */}
                          <p className="text-xs sm:text-sm text-gray-600 mt-1 sm:hidden">
                            {staffMember.type} • {staffMember.department || 'No Department'}
                          </p>
                          {/* Desktop: Show full details */}
                          <p className="hidden sm:block text-sm text-gray-600 mt-1">
                            {staffMember.phoneNumber} • {staffMember.type} • {staffMember.department || 'No Department'}
                          </p>
                          <p className="hidden sm:block text-xs text-gray-500 mt-1">
                            {staffMember.email || 'No Email'} • {staffMember.gender}
                          </p>
                        </div>
                        <span className={`inline-flex items-center px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-medium ml-2 sm:ml-3 flex-shrink-0 ${getStatusColor(status)}`}>
                          {getStatusIcon(status)}
                          <span className="ml-1">{status}</span>
                        </span>
                      </div>
                    </div>

                    {/* Attendance Controls */}
                    <div className="space-y-1.5 sm:space-y-2 mb-2 sm:mb-3">
                      {/* Morning Session */}
                      <div className={`flex items-center justify-between p-2 sm:p-3 rounded-lg ${
                        attendanceData[staffMember._id]?.morning 
                          ? 'bg-blue-50 border border-blue-200' 
                          : sessionStatus.morning.isActive 
                            ? 'bg-green-50 border border-green-200' 
                            : 'bg-gray-50 border border-gray-200'
                      }`}>
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <SunIcon className={`w-3 h-3 sm:w-4 sm:h-4 ${
                            attendanceData[staffMember._id]?.morning
                              ? 'text-blue-600'
                              : sessionStatus.morning.isActive 
                                ? 'text-yellow-600' 
                                : 'text-gray-400'
                          }`} />
                          <div>
                            <span className={`text-xs sm:text-sm font-medium ${
                              attendanceData[staffMember._id]?.morning
                                ? 'text-blue-800'
                                : sessionStatus.morning.isActive 
                                  ? 'text-green-800' 
                                  : 'text-gray-500'
                            }`}>
                              Morning
                              {attendanceData[staffMember._id]?.morning && (
                                <span className="ml-1 text-xs bg-blue-100 text-blue-700 px-1 py-0.5 rounded">✓ Taken</span>
                              )}
                            </span>
                            <div className="text-xs text-gray-500">{sessionStatus.morning.timeLeft}</div>
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={attendanceData[staffMember._id]?.morning || false}
                          onChange={(e) => handleAttendanceChange(staffMember._id, 'morning', e.target.checked)}
                          disabled={!sessionStatus.morning.canEdit}
                          className={`w-4 h-4 sm:w-5 sm:h-5 border-gray-300 rounded focus:ring-green-500 ${
                            attendanceData[staffMember._id]?.morning
                              ? 'text-blue-600 bg-blue-50'
                              : sessionStatus.morning.canEdit 
                                ? 'text-green-600' 
                                : 'text-gray-400 cursor-not-allowed'
                          }`}
                        />
                      </div>
                      
                      {/* Evening Session */}
                      <div className={`flex items-center justify-between p-2 sm:p-3 rounded-lg ${
                        attendanceData[staffMember._id]?.evening 
                          ? 'bg-blue-50 border border-blue-200' 
                          : sessionStatus.evening.isActive 
                            ? 'bg-green-50 border border-green-200' 
                            : 'bg-gray-50 border border-gray-200'
                      }`}>
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <MoonIcon className={`w-3 h-3 sm:w-4 sm:h-4 ${
                            attendanceData[staffMember._id]?.evening
                              ? 'text-blue-600'
                              : sessionStatus.evening.isActive 
                                ? 'text-blue-600' 
                                : 'text-gray-400'
                          }`} />
                          <div>
                            <span className={`text-xs sm:text-sm font-medium ${
                              attendanceData[staffMember._id]?.evening
                                ? 'text-blue-800'
                                : sessionStatus.evening.isActive 
                                  ? 'text-green-800' 
                                  : 'text-gray-500'
                            }`}>
                              Evening
                              {attendanceData[staffMember._id]?.evening && (
                                <span className="ml-1 text-xs bg-blue-100 text-blue-700 px-1 py-0.5 rounded">✓ Taken</span>
                              )}
                            </span>
                            <div className="text-xs text-gray-500">{sessionStatus.evening.timeLeft}</div>
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={attendanceData[staffMember._id]?.evening || false}
                          onChange={(e) => handleAttendanceChange(staffMember._id, 'evening', e.target.checked)}
                          disabled={!sessionStatus.evening.canEdit}
                          className={`w-4 h-4 sm:w-5 sm:h-5 border-gray-300 rounded focus:ring-green-500 ${
                            attendanceData[staffMember._id]?.evening
                              ? 'text-blue-600 bg-blue-50'
                              : sessionStatus.evening.canEdit 
                                ? 'text-green-600' 
                                : 'text-gray-400 cursor-not-allowed'
                          }`}
                        />
                      </div>

                      {/* Night Session */}
                      <div className={`flex items-center justify-between p-2 sm:p-3 rounded-lg ${
                        attendanceData[staffMember._id]?.night 
                          ? 'bg-blue-50 border border-blue-200' 
                          : sessionStatus.night.isActive 
                            ? 'bg-green-50 border border-green-200' 
                            : 'bg-gray-50 border border-gray-200'
                      }`}>
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <StarIcon className={`w-3 h-3 sm:w-4 sm:h-4 ${
                            attendanceData[staffMember._id]?.night
                              ? 'text-blue-600'
                              : sessionStatus.night.isActive 
                                ? 'text-purple-600' 
                                : 'text-gray-400'
                          }`} />
                          <div>
                            <span className={`text-xs sm:text-sm font-medium ${
                              attendanceData[staffMember._id]?.night
                                ? 'text-blue-800'
                                : sessionStatus.night.isActive 
                                  ? 'text-green-800' 
                                  : 'text-gray-500'
                            }`}>
                              Night
                              {attendanceData[staffMember._id]?.night && (
                                <span className="ml-1 text-xs bg-blue-100 text-blue-700 px-1 py-0.5 rounded">✓ Taken</span>
                              )}
                            </span>
                            <div className="text-xs text-gray-500">{sessionStatus.night.timeLeft}</div>
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={attendanceData[staffMember._id]?.night || false}
                          onChange={(e) => handleAttendanceChange(staffMember._id, 'night', e.target.checked)}
                          disabled={!sessionStatus.night.canEdit}
                          className={`w-4 h-4 sm:w-5 sm:h-5 border-gray-300 rounded focus:ring-green-500 ${
                            attendanceData[staffMember._id]?.night
                              ? 'text-blue-600 bg-blue-50'
                              : sessionStatus.night.canEdit 
                                ? 'text-green-600' 
                                : 'text-gray-400 cursor-not-allowed'
                          }`}
                        />
                      </div>
                    </div>

                    {/* Notes */}
                    <div className="mt-3 sm:mt-4">
                      <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
                      <input
                        type="text"
                        value={attendanceData[staffMember._id]?.notes || ''}
                        onChange={(e) => handleNotesChange(staffMember._id, e.target.value)}
                        placeholder="Add notes for this staff member..."
                        className="w-full px-2 sm:px-3 py-2 sm:py-2.5 text-xs sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Desktop Table View */}
          <div className="hidden sm:block">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Staff Member
                    </th>
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
                      Notes
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {staff.map((staffMember, index) => {
                    const status = getAttendanceStatus(staffMember);
                    return (
                      <motion.tr
                        key={staffMember._id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="hover:bg-gray-50"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {staffMember.name}
                              </div>
                              <div className="text-sm text-gray-500">
                                {staffMember.phoneNumber} • {staffMember.type} • {staffMember.department || 'No Department'}
                              </div>
                              <div className="text-xs text-gray-400">
                                {staffMember.email || 'No Email'} • {staffMember.gender}
                              </div>
                            </div>
                          </div>
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="flex flex-col items-center">
                            <div className="relative">
                              <input
                                type="checkbox"
                                checked={attendanceData[staffMember._id]?.morning || false}
                                onChange={(e) => handleAttendanceChange(staffMember._id, 'morning', e.target.checked)}
                                disabled={!sessionStatus.morning.canEdit}
                                className={`w-4 h-4 border-gray-300 rounded focus:ring-green-500 ${
                                  attendanceData[staffMember._id]?.morning
                                    ? 'text-blue-600 bg-blue-50'
                                    : sessionStatus.morning.canEdit 
                                      ? 'text-green-600' 
                                      : 'text-gray-400 cursor-not-allowed'
                                }`}
                              />
                              {attendanceData[staffMember._id]?.morning && (
                                <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full"></div>
                              )}
                            </div>
                            <div className={`text-xs mt-1 ${
                              attendanceData[staffMember._id]?.morning
                                ? 'text-blue-600'
                                : sessionStatus.morning.isActive 
                                  ? 'text-green-600' 
                                  : 'text-gray-500'
                            }`}>
                              {attendanceData[staffMember._id]?.morning 
                                ? '✓ Taken' 
                                : sessionStatus.morning.timeLeft
                              }
                            </div>
                          </div>
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="flex flex-col items-center">
                            <div className="relative">
                              <input
                                type="checkbox"
                                checked={attendanceData[staffMember._id]?.evening || false}
                                onChange={(e) => handleAttendanceChange(staffMember._id, 'evening', e.target.checked)}
                                disabled={!sessionStatus.evening.canEdit}
                                className={`w-4 h-4 border-gray-300 rounded focus:ring-green-500 ${
                                  attendanceData[staffMember._id]?.evening
                                    ? 'text-blue-600 bg-blue-50'
                                    : sessionStatus.evening.canEdit 
                                      ? 'text-green-600' 
                                      : 'text-gray-400 cursor-not-allowed'
                                }`}
                              />
                              {attendanceData[staffMember._id]?.evening && (
                                <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full"></div>
                              )}
                            </div>
                            <div className={`text-xs mt-1 ${
                              attendanceData[staffMember._id]?.evening
                                ? 'text-blue-600'
                                : sessionStatus.evening.isActive 
                                  ? 'text-green-600' 
                                  : 'text-gray-500'
                            }`}>
                              {attendanceData[staffMember._id]?.evening 
                                ? '✓ Taken' 
                                : sessionStatus.evening.timeLeft
                              }
                            </div>
                          </div>
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="flex flex-col items-center">
                            <div className="relative">
                              <input
                                type="checkbox"
                                checked={attendanceData[staffMember._id]?.night || false}
                                onChange={(e) => handleAttendanceChange(staffMember._id, 'night', e.target.checked)}
                                disabled={!sessionStatus.night.canEdit}
                                className={`w-4 h-4 border-gray-300 rounded focus:ring-green-500 ${
                                  attendanceData[staffMember._id]?.night
                                    ? 'text-blue-600 bg-blue-50'
                                    : sessionStatus.night.canEdit 
                                      ? 'text-green-600' 
                                      : 'text-gray-400 cursor-not-allowed'
                                }`}
                              />
                              {attendanceData[staffMember._id]?.night && (
                                <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full"></div>
                              )}
                            </div>
                            <div className={`text-xs mt-1 ${
                              attendanceData[staffMember._id]?.night
                                ? 'text-blue-600'
                                : sessionStatus.night.isActive 
                                  ? 'text-green-600' 
                                  : 'text-gray-500'
                            }`}>
                              {attendanceData[staffMember._id]?.night 
                                ? '✓ Taken' 
                                : sessionStatus.night.timeLeft
                              }
                            </div>
                          </div>
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
                            {getStatusIcon(status)}
                            <span className="ml-1">{status}</span>
                          </span>
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="text"
                            value={attendanceData[staffMember._id]?.notes || ''}
                            onChange={(e) => handleNotesChange(staffMember._id, e.target.value)}
                            placeholder="Add notes..."
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500"
                          />
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {staff.length === 0 && (
            <div className="text-center py-8 sm:py-12">
              <UserGroupIcon className="w-8 h-8 sm:w-12 sm:h-12 text-gray-400 mx-auto mb-3 sm:mb-4" />
              <p className="text-xs sm:text-sm text-gray-500">No staff members found with the selected filters.</p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default TakeStaffAttendance;
