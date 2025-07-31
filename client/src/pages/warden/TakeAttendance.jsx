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
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline';
import api from '../../utils/axios';
import LoadingSpinner from '../../components/LoadingSpinner';
import { toast } from 'react-hot-toast';
import SEO from '../../components/SEO';
import { useAuth } from '../../context/AuthContext';

const TakeAttendance = () => {
  const { user } = useAuth();
  
  // Debug logging to check user data
  console.log('🔍 TakeAttendance Component - Full user object:', user);
  console.log('🔍 TakeAttendance Component - User hostelType:', user?.hostelType);
  console.log('🔍 TakeAttendance Component - User role:', user?.role);
  
  // Session time windows (IST)
  const SESSION_TIMES = {
    morning: { start: 7, end: 9 }, // 7:00 AM - 9:00 AM
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
  const [students, setStudents] = useState([]);
  const [selectedDate, setSelectedDate] = useState(getCurrentISTDate());
  const [attendanceData, setAttendanceData] = useState({});
  const [filters, setFilters] = useState({
    course: '',
    branch: '',
    gender: '',
    category: '',
    roomNumber: ''
  });
  const [roomInput, setRoomInput] = useState('');
  const [stats, setStats] = useState({
    totalStudents: 0,
    attendanceTaken: 0
  });
  const [courses, setCourses] = useState([]);
  const [allBranches, setAllBranches] = useState([]);
  const [filteredBranches, setFilteredBranches] = useState([]);
  const [loadingFilters, setLoadingFilters] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [availableRooms, setAvailableRooms] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(false);

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
      const timeUntilStart = sessionTime.start - currentHour;
      const hours = Math.floor(timeUntilStart);
      const minutes = Math.floor((timeUntilStart - hours) * 60);
      const seconds = Math.floor(((timeUntilStart - hours) * 60 - minutes) * 60);
      
      if (hours > 0) {
        return `Starts in ${hours}h ${minutes}m`;
      } else if (minutes > 0) {
        return `Starts in ${minutes}m ${seconds}s`;
      } else {
        return `Starts in ${seconds}s`;
      }
    } else if (currentHour >= sessionTime.start && currentHour < sessionTime.end) {
      // Session is active
      const timeLeft = sessionTime.end - currentHour;
      const hours = Math.floor(timeLeft);
      const minutes = Math.floor((timeLeft - hours) * 60);
      const seconds = Math.floor(((timeLeft - hours) * 60 - minutes) * 60);
      
      if (hours > 0) {
        return `Ends in ${hours}h ${minutes}m`;
      } else if (minutes > 0) {
        return `Ends in ${minutes}m ${seconds}s`;
      } else {
        return `Ends in ${seconds}s`;
      }
    } else {
      // Session has ended
      return 'Session ended';
    }
  };

  // Check if any session is currently active
  const isAnySessionActive = () => {
    return Object.values(sessionStatus).some(session => session.isActive);
  };

  // Check if a session has been completed (attendance already taken)
  const isSessionCompleted = (studentId, session) => {
    return attendanceData[studentId]?.[session] === true;
  };

  // Get session status for a student
  const getSessionStatus = (studentId, session) => {
    const isActive = sessionStatus[session].isActive;
    const isCompleted = isSessionCompleted(studentId, session);
    const canEdit = sessionStatus[session].canEdit;
    
    if (isCompleted) return 'completed';
    if (isActive && canEdit) return 'active';
    if (!isActive) return 'inactive';
    return 'disabled';
  };

  // Update session status every second for real-time countdown
  useEffect(() => {
    const updateTime = () => {
      const now = getCurrentISTTime();
      setCurrentTime(now);
      
      const newSessionStatus = {};
      Object.keys(SESSION_TIMES).forEach(session => {
        const isActive = isSessionActive(session);
        const timeLeft = getTimeLeft(session);
        const canEdit = isActive;
        
        newSessionStatus[session] = {
          isActive,
          timeLeft,
          canEdit
        };
      });
      
      setSessionStatus(newSessionStatus);
    };

    // Update immediately
    updateTime();
    
    // Update every second for real-time countdown
    const interval = setInterval(updateTime, 1000);
    
    return () => clearInterval(interval);
  }, []);

  // Force selectedDate to always be current IST date for warden
  useEffect(() => {
    const currentISTDate = getCurrentISTDate();
    if (selectedDate !== currentISTDate) {
      setSelectedDate(currentISTDate);
    }
  }, [selectedDate]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters(prev => ({
        ...prev,
        roomNumber: roomInput
      }));
    }, 500);

    return () => clearTimeout(timer);
  }, [roomInput]);

  useEffect(() => {
    fetchStudents();
  }, [selectedDate, filters]);

  useEffect(() => {
    fetchFilters();
  }, []);

  // Fetch rooms when category changes
  useEffect(() => {
    if (filters.category) {
      fetchRooms();
    } else {
      setAvailableRooms([]);
    }
  }, [filters.category]);

  // Helper to map hostelType to gender
  const getWardenGender = () => {
    if (!user?.hostelType) return undefined;
    if (user.hostelType.toLowerCase() === 'boys') return 'Male';
    if (user.hostelType.toLowerCase() === 'girls') return 'Female';
    return undefined;
  };

  const fetchRooms = async () => {
    if (!filters.category) return;
    
    setLoadingRooms(true);
    try {
      const wardenGender = getWardenGender();
      const params = {
        gender: wardenGender,
        category: filters.category
      };
      
      const response = await api.get('/api/admin/rooms', { params });
      
      if (response.data.success) {
        const rooms = response.data.data.rooms || [];
        setAvailableRooms(rooms);
        console.log('🔍 Fetched rooms for category:', filters.category, 'gender:', wardenGender, 'count:', rooms.length);
      }
    } catch (error) {
      console.error('Error fetching rooms:', error);
      toast.error('Failed to fetch rooms');
    } finally {
      setLoadingRooms(false);
    }
  };

  const fetchStudents = async () => {
    setLoading(true);
    try {
      console.log('🔍 Fetching students for date:', selectedDate, 'Current IST date:', getCurrentISTDate());
      const params = new URLSearchParams({
        date: selectedDate
      });

      // Use mapped gender for filtering
      const wardenGender = getWardenGender();
      if (wardenGender) {
        params.append('gender', wardenGender);
        console.log('🔍 Warden hostelType:', user.hostelType, '| Gender for filter:', wardenGender);
      }

      // Add other filters that don't involve course/branch IDs
      if (filters.category) params.append('category', filters.category);
      if (filters.roomNumber) params.append('roomNumber', filters.roomNumber);

      console.log('🔍 API params:', params.toString());

      const response = await api.get(`/api/attendance/students?${params}`);
      
      if (response.data.success) {
        console.log('🔍 Students received:', response.data.data.students.length);
        
        // Get students directly from the response
        let students = response.data.data.students;
        
        // Frontend filtering - ensure only students of warden's gender are shown
        if (wardenGender) {
          students = students.filter(student => 
            student.gender === wardenGender
          );
          console.log('🔍 After gender filtering:', students.length, 'students');
        }

        // Frontend filtering for course and branch
        if (filters.course) {
          students = students.filter(student => 
            student.course?._id === filters.course || student.course === filters.course
          );
          console.log('🔍 After course filtering:', students.length, 'students');
        }

        if (filters.branch) {
          students = students.filter(student => 
            student.branch?._id === filters.branch || student.branch === filters.branch
          );
          console.log('🔍 After branch filtering:', students.length, 'students');
        }
        
        setStudents(students);
        setStats({
          totalStudents: students.length,
          attendanceTaken: response.data.data.attendanceTaken
        });
        
        // Initialize attendance data
        const initialAttendance = {};
        students.forEach(student => {
          initialAttendance[student._id] = {
            morning: student.attendance?.morning || false,
            evening: student.attendance?.evening || false,
            night: student.attendance?.night || false,
            notes: ''
          };
        });
        setAttendanceData(initialAttendance);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
      toast.error('Failed to fetch students');
    } finally {
      setLoading(false);
    }
  };

  const handleAttendanceChange = (studentId, session, value) => {
    setAttendanceData(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [session]: value
      }
    }));
  };

  const handleNotesChange = (studentId, notes) => {
    setAttendanceData(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        notes
      }
    }));
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
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
    
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
        branch: ''
      }));
    }
  };

  const handleRoomInputChange = (e) => {
    setRoomInput(e.target.value);
  };

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
      const attendanceRecords = Object.entries(attendanceData).map(([studentId, data]) => ({
        studentId,
        morning: data.morning,
        evening: data.evening,
        night: data.night,
        notes: data.notes
      }));

      // Show progress message
      toast.loading(`Saving attendance for ${attendanceRecords.length} students...`, {
        id: 'attendance-progress'
      });

      const response = await api.post('/api/attendance/take', {
        date: selectedDate,
        attendanceData: attendanceRecords
      }, {
        timeout: 90000 // 90 seconds timeout for attendance operations
      });

      if (response.data.success) {
        toast.success(`Attendance saved for ${response.data.data.successful} students`, {
          id: 'attendance-progress'
        });
        fetchStudents(); // Refresh data
      }
    } catch (error) {
      console.error('Error saving attendance:', error);
      
      // Provide more specific error messages
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        toast.error('Attendance operation timed out. Please try again with fewer students or check your connection.', {
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

  const getAttendanceStatus = (student) => {
    // Check if student is on leave first
    if (student.isOnLeave) return 'On Leave';
    
    const attendance = attendanceData[student._id];
    if (!attendance) return 'Absent';
    
    if (attendance.morning && attendance.evening && attendance.night) return 'Present';
    if (attendance.morning || attendance.evening || attendance.night) return 'Partial';
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

  // Helper function to get category options based on gender
  const getCategoryOptions = (gender) => {
    return gender === 'Male' 
      ? ['A+', 'A', 'B+', 'B']
      : ['A+', 'A', 'B', 'C'];
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <SEO title="Take Attendance - Warden Dashboard" />
      
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
                <span>Take Attendance {user?.hostelType && `(${user.hostelType} Students)`}</span>
              </h1>
              <p className="text-gray-600 mt-1 text-xs sm:text-sm lg:text-base">
                Mark daily attendance for {user?.hostelType ? `${user.hostelType.toLowerCase()}` : 'all'} students
              </p>
            </div>
            <div className="grid grid-cols-2 lg:flex lg:flex-row gap-2 sm:gap-4 text-center lg:text-right">
              <div className="bg-gray-50 rounded-lg p-2 sm:p-3 lg:bg-transparent lg:p-0">
                <p className="text-xs sm:text-sm text-gray-500">Total Students</p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-green-600">{stats.totalStudents}</p>
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
                {/* Course Filter */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    <FunnelIcon className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" />
                    Course
                  </label>
                  <select
                    name="course"
                    value={filters.course}
                    onChange={handleFilterChange}
                    disabled={loadingFilters}
                    className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-xs sm:text-sm disabled:bg-gray-100"
                  >
                    <option value="">{loadingFilters ? 'Loading...' : 'All Courses'}</option>
                    {courses.map((course) => (
                      <option key={course._id} value={course._id}>
                        {course.name} ({course.code})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Branch Filter */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Branch</label>
                  <select
                    name="branch"
                    value={filters.branch}
                    onChange={handleFilterChange}
                    disabled={loadingFilters || !filters.course}
                    className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-xs sm:text-sm disabled:bg-gray-100"
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

                {/* Category Filter */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    name="category"
                    value={filters.category}
                    onChange={handleFilterChange}
                    className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-xs sm:text-sm"
                  >
                    <option value="">All Categories</option>
                    {getCategoryOptions(getWardenGender()).map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>

                {/* Room Filter */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Room</label>
                  <select
                    name="roomNumber"
                    value={roomInput}
                    onChange={handleRoomInputChange}
                    disabled={loadingRooms || availableRooms.length === 0}
                    className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-xs sm:text-sm disabled:bg-gray-100"
                  >
                    <option value="">{loadingRooms ? 'Loading...' : availableRooms.length === 0 ? 'No rooms available' : 'Select a room'}</option>
                    {availableRooms.map((room) => (
                      <option key={room._id} value={room.roomNumber}>
                        {room.roomNumber} ({room.category})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Desktop Controls */}
          <div className="hidden lg:grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2 sm:gap-3 lg:gap-4">
            {/* Date Selector */}
            <div className="sm:col-span-1">
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                <CalendarIcon className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" />
                Date (Today Only)
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={getCurrentISTDate()}
                  min={getCurrentISTDate()}
                  max={getCurrentISTDate()}
                  disabled={true}
                  className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-green-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-xs sm:text-sm bg-green-50 cursor-not-allowed text-green-700 font-medium"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-2 sm:pr-3">
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-500 rounded-full animate-pulse"></div>
                </div>
              </div>
              <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-500 rounded-full"></span>
                Warden can only take attendance for today
              </p>
            </div>

            {/* Course Filter */}
            <div className="sm:col-span-1">
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                <FunnelIcon className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" />
                Course
              </label>
              <select
                name="course"
                value={filters.course}
                onChange={handleFilterChange}
                disabled={loadingFilters}
                className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-xs sm:text-sm disabled:bg-gray-100"
              >
                <option value="">{loadingFilters ? 'Loading...' : 'All Courses'}</option>
                {courses.map((course) => (
                  <option key={course._id} value={course._id}>
                    {course.name} ({course.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Branch Filter */}
            <div className="sm:col-span-1">
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Branch</label>
              <select
                name="branch"
                value={filters.branch}
                onChange={handleFilterChange}
                disabled={loadingFilters || !filters.course}
                className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-xs sm:text-sm disabled:bg-gray-100"
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

            {/* Category Filter */}
            <div className="sm:col-span-1">
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Category</label>
              <select
                name="category"
                value={filters.category}
                onChange={handleFilterChange}
                className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-xs sm:text-sm"
              >
                <option value="">All Categories</option>
                {getCategoryOptions(getWardenGender()).map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            {/* Room Filter */}
            <div className="sm:col-span-1">
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Room</label>
              <select
                name="roomNumber"
                value={roomInput}
                onChange={handleRoomInputChange}
                disabled={loadingRooms || availableRooms.length === 0}
                className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-xs sm:text-sm disabled:bg-gray-100"
              >
                <option value="">{loadingRooms ? 'Loading...' : availableRooms.length === 0 ? 'No rooms available' : 'Select a room'}</option>
                {availableRooms.map((room) => (
                  <option key={room._id} value={room.roomNumber}>
                    {room.roomNumber} ({room.category})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </motion.div>

        {/* Submit Button - Mobile Optimized */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-3 sm:mb-4 lg:mb-6 sticky top-16 z-10 bg-gray-50 p-3 -mx-3 sm:mx-0 sm:p-0 sm:bg-transparent sm:static"
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
                    <span className="hidden sm:inline">Save Attendance ({students.length} students)</span>
                    <span className="sm:hidden text-xs">Save Attendance</span>
              </>
            )}
          </button>
            
            {/* Quick Stats */}
            <div className="flex justify-between sm:hidden text-xs sm:text-sm text-gray-600 bg-white rounded-lg p-2 sm:p-3 border border-gray-200">
              <div className="text-center">
                <div className="font-semibold text-green-600 text-sm sm:text-base">{students.filter(s => getAttendanceStatus(s) === 'Present').length}</div>
                <div className="text-xs">Present</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-yellow-600 text-sm sm:text-base">{students.filter(s => getAttendanceStatus(s) === 'Partial').length}</div>
                <div className="text-xs">Partial</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-red-600 text-sm sm:text-base">{students.filter(s => getAttendanceStatus(s) === 'Absent').length}</div>
                <div className="text-xs">Absent</div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Students List - Mobile Optimized */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-lg sm:rounded-xl shadow-sm overflow-hidden"
        >
          <div className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900">
              Students ({students.length})
            </h2>
              <div className="hidden sm:flex items-center gap-3 sm:gap-4 text-xs sm:text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 sm:w-3 sm:h-3 bg-green-500 rounded-full"></div>
                  <span>Present: {students.filter(s => getAttendanceStatus(s) === 'Present').length}</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 sm:w-3 sm:h-3 bg-yellow-500 rounded-full"></div>
                  <span>Partial: {students.filter(s => getAttendanceStatus(s) === 'Partial').length}</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 sm:w-3 sm:h-3 bg-red-500 rounded-full"></div>
                  <span>Absent: {students.filter(s => getAttendanceStatus(s) === 'Absent').length}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile Card View */}
          <div className="block sm:hidden">
            <div className="divide-y divide-gray-200">
              {students.map((student, index) => {
                const status = getAttendanceStatus(student);
                return (
                  <motion.div
                    key={student._id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="p-3 sm:p-4 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                  >
                    {/* Student Info */}
                    <div className="mb-3 sm:mb-4">
                      <div className="flex items-start justify-between mb-2 sm:mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm sm:text-base font-semibold text-gray-900 truncate">{student.name}</h3>
                          {/* Mobile: Show only course and room */}
                          <p className="text-xs sm:text-sm text-gray-600 mt-1 sm:hidden">
                            {getCourseName(student.course)} {student.year} • Room {student.roomNumber}
                          </p>
                          {/* Desktop: Show full details */}
                          <p className="hidden sm:block text-sm text-gray-600 mt-1">
                            {student.rollNumber} • {getCourseName(student.course)} {student.year} • {getBranchName(student.branch)}
                          </p>
                          <p className="hidden sm:block text-xs text-gray-500 mt-1">
                            Room {student.roomNumber} • {student.gender}
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
                        getSessionStatus(student._id, 'morning') === 'completed' 
                          ? 'bg-blue-50 border border-blue-200' 
                          : sessionStatus.morning.isActive 
                            ? 'bg-green-50 border border-green-200' 
                            : 'bg-gray-50 border border-gray-200'
                      }`}>
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <SunIcon className={`w-3 h-3 sm:w-4 sm:h-4 ${
                            getSessionStatus(student._id, 'morning') === 'completed'
                              ? 'text-blue-600'
                              : sessionStatus.morning.isActive 
                                ? 'text-yellow-600' 
                                : 'text-gray-400'
                          }`} />
                          <div>
                            <span className={`text-xs sm:text-sm font-medium ${
                              getSessionStatus(student._id, 'morning') === 'completed'
                                ? 'text-blue-800'
                                : sessionStatus.morning.isActive 
                                  ? 'text-green-800' 
                                  : 'text-gray-500'
                            }`}>
                              Morning
                              {getSessionStatus(student._id, 'morning') === 'completed' && (
                                <span className="ml-1 text-xs bg-blue-100 text-blue-700 px-1 py-0.5 rounded">✓ Taken</span>
                              )}
                            </span>
                            <div className="text-xs text-gray-500">{sessionStatus.morning.timeLeft}</div>
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={attendanceData[student._id]?.morning || false}
                          onChange={(e) => handleAttendanceChange(student._id, 'morning', e.target.checked)}
                          disabled={!sessionStatus.morning.canEdit}
                          className={`w-4 h-4 sm:w-5 sm:h-5 border-gray-300 rounded focus:ring-green-500 ${
                            getSessionStatus(student._id, 'morning') === 'completed'
                              ? 'text-blue-600 bg-blue-50'
                              : sessionStatus.morning.canEdit 
                                ? 'text-green-600' 
                                : 'text-gray-400 cursor-not-allowed'
                          }`}
                        />
                      </div>
                      
                      {/* Evening Session */}
                      <div className={`flex items-center justify-between p-2 sm:p-3 rounded-lg ${
                        getSessionStatus(student._id, 'evening') === 'completed' 
                          ? 'bg-blue-50 border border-blue-200' 
                          : sessionStatus.evening.isActive 
                            ? 'bg-green-50 border border-green-200' 
                            : 'bg-gray-50 border border-gray-200'
                      }`}>
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <MoonIcon className={`w-3 h-3 sm:w-4 sm:h-4 ${
                            getSessionStatus(student._id, 'evening') === 'completed'
                              ? 'text-blue-600'
                              : sessionStatus.evening.isActive 
                                ? 'text-blue-600' 
                                : 'text-gray-400'
                          }`} />
                          <div>
                            <span className={`text-xs sm:text-sm font-medium ${
                              getSessionStatus(student._id, 'evening') === 'completed'
                                ? 'text-blue-800'
                                : sessionStatus.evening.isActive 
                                  ? 'text-green-800' 
                                  : 'text-gray-500'
                            }`}>
                              Evening
                              {getSessionStatus(student._id, 'evening') === 'completed' && (
                                <span className="ml-1 text-xs bg-blue-100 text-blue-700 px-1 py-0.5 rounded">✓ Taken</span>
                              )}
                            </span>
                            <div className="text-xs text-gray-500">{sessionStatus.evening.timeLeft}</div>
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={attendanceData[student._id]?.evening || false}
                          onChange={(e) => handleAttendanceChange(student._id, 'evening', e.target.checked)}
                          disabled={!sessionStatus.evening.canEdit}
                          className={`w-4 h-4 sm:w-5 sm:h-5 border-gray-300 rounded focus:ring-green-500 ${
                            getSessionStatus(student._id, 'evening') === 'completed'
                              ? 'text-blue-600 bg-blue-50'
                              : sessionStatus.evening.canEdit 
                                ? 'text-green-600' 
                                : 'text-gray-400 cursor-not-allowed'
                          }`}
                        />
                      </div>

                      {/* Night Session */}
                      <div className={`flex items-center justify-between p-2 sm:p-3 rounded-lg ${
                        getSessionStatus(student._id, 'night') === 'completed' 
                          ? 'bg-blue-50 border border-blue-200' 
                          : sessionStatus.night.isActive 
                            ? 'bg-green-50 border border-green-200' 
                            : 'bg-gray-50 border border-gray-200'
                      }`}>
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <StarIcon className={`w-3 h-3 sm:w-4 sm:h-4 ${
                            getSessionStatus(student._id, 'night') === 'completed'
                              ? 'text-blue-600'
                              : sessionStatus.night.isActive 
                                ? 'text-purple-600' 
                                : 'text-gray-400'
                          }`} />
                          <div>
                            <span className={`text-xs sm:text-sm font-medium ${
                              getSessionStatus(student._id, 'night') === 'completed'
                                ? 'text-blue-800'
                                : sessionStatus.night.isActive 
                                  ? 'text-green-800' 
                                  : 'text-gray-500'
                            }`}>
                              Night
                              {getSessionStatus(student._id, 'night') === 'completed' && (
                                <span className="ml-1 text-xs bg-blue-100 text-blue-700 px-1 py-0.5 rounded">✓ Taken</span>
                              )}
                            </span>
                            <div className="text-xs text-gray-500">{sessionStatus.night.timeLeft}</div>
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={attendanceData[student._id]?.night || false}
                          onChange={(e) => handleAttendanceChange(student._id, 'night', e.target.checked)}
                          disabled={!sessionStatus.night.canEdit}
                          className={`w-4 h-4 sm:w-5 sm:h-5 border-gray-300 rounded focus:ring-green-500 ${
                            getSessionStatus(student._id, 'night') === 'completed'
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
                        value={attendanceData[student._id]?.notes || ''}
                        onChange={(e) => handleNotesChange(student._id, e.target.value)}
                        placeholder="Add notes for this student..."
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
                      Student
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
                  {students.map((student, index) => {
                    const status = getAttendanceStatus(student);
                    return (
                      <motion.tr
                        key={student._id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="hover:bg-gray-50"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {student.name}
                              </div>
                              <div className="text-sm text-gray-500">
                                {student.rollNumber} • {getCourseName(student.course)} {student.year} • {getBranchName(student.branch)}
                              </div>
                              <div className="text-xs text-gray-400">
                                Room {student.roomNumber} • {student.gender}
                              </div>
                            </div>
                          </div>
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="flex flex-col items-center">
                            <div className="relative">
                              <input
                                type="checkbox"
                                checked={attendanceData[student._id]?.morning || false}
                                onChange={(e) => handleAttendanceChange(student._id, 'morning', e.target.checked)}
                                disabled={!sessionStatus.morning.canEdit}
                                className={`w-4 h-4 border-gray-300 rounded focus:ring-green-500 ${
                                  getSessionStatus(student._id, 'morning') === 'completed'
                                    ? 'text-blue-600 bg-blue-50'
                                    : sessionStatus.morning.canEdit 
                                      ? 'text-green-600' 
                                      : 'text-gray-400 cursor-not-allowed'
                                }`}
                              />
                              {getSessionStatus(student._id, 'morning') === 'completed' && (
                                <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full"></div>
                              )}
                            </div>
                            <div className={`text-xs mt-1 ${
                              getSessionStatus(student._id, 'morning') === 'completed'
                                ? 'text-blue-600'
                                : sessionStatus.morning.isActive 
                                  ? 'text-green-600' 
                                  : 'text-gray-500'
                            }`}>
                              {getSessionStatus(student._id, 'morning') === 'completed' 
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
                                checked={attendanceData[student._id]?.evening || false}
                                onChange={(e) => handleAttendanceChange(student._id, 'evening', e.target.checked)}
                                disabled={!sessionStatus.evening.canEdit}
                                className={`w-4 h-4 border-gray-300 rounded focus:ring-green-500 ${
                                  getSessionStatus(student._id, 'evening') === 'completed'
                                    ? 'text-blue-600 bg-blue-50'
                                    : sessionStatus.evening.canEdit 
                                      ? 'text-green-600' 
                                      : 'text-gray-400 cursor-not-allowed'
                                }`}
                              />
                              {getSessionStatus(student._id, 'evening') === 'completed' && (
                                <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full"></div>
                              )}
                            </div>
                            <div className={`text-xs mt-1 ${
                              getSessionStatus(student._id, 'evening') === 'completed'
                                ? 'text-blue-600'
                                : sessionStatus.evening.isActive 
                                  ? 'text-green-600' 
                                  : 'text-gray-500'
                            }`}>
                              {getSessionStatus(student._id, 'evening') === 'completed' 
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
                                checked={attendanceData[student._id]?.night || false}
                                onChange={(e) => handleAttendanceChange(student._id, 'night', e.target.checked)}
                                disabled={!sessionStatus.night.canEdit}
                                className={`w-4 h-4 border-gray-300 rounded focus:ring-green-500 ${
                                  getSessionStatus(student._id, 'night') === 'completed'
                                    ? 'text-blue-600 bg-blue-50'
                                    : sessionStatus.night.canEdit 
                                      ? 'text-green-600' 
                                      : 'text-gray-400 cursor-not-allowed'
                                }`}
                              />
                              {getSessionStatus(student._id, 'night') === 'completed' && (
                                <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full"></div>
                              )}
                            </div>
                            <div className={`text-xs mt-1 ${
                              getSessionStatus(student._id, 'night') === 'completed'
                                ? 'text-blue-600'
                                : sessionStatus.night.isActive 
                                  ? 'text-green-600' 
                                  : 'text-gray-500'
                            }`}>
                              {getSessionStatus(student._id, 'night') === 'completed' 
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
                            value={attendanceData[student._id]?.notes || ''}
                            onChange={(e) => handleNotesChange(student._id, e.target.value)}
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

          {students.length === 0 && (
            <div className="text-center py-8 sm:py-12">
              <UserGroupIcon className="w-8 h-8 sm:w-12 sm:h-12 text-gray-400 mx-auto mb-3 sm:mb-4" />
              <p className="text-xs sm:text-sm text-gray-500">No students found with the selected filters.</p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default TakeAttendance; 