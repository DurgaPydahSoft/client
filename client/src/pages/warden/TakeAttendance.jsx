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
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [students, setStudents] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
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

  // Get current date in YYYY-MM-DD format
  const currentDate = new Date().toISOString().split('T')[0];

  // Force selectedDate to always be current date for warden
  useEffect(() => {
    if (selectedDate !== currentDate) {
      setSelectedDate(currentDate);
    }
  }, [selectedDate, currentDate]);

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

  // Helper to map hostelType to gender
  const getWardenGender = () => {
    if (!user?.hostelType) return undefined;
    if (user.hostelType.toLowerCase() === 'boys') return 'Male';
    if (user.hostelType.toLowerCase() === 'girls') return 'Female';
    return undefined;
  };

  const fetchStudents = async () => {
    setLoading(true);
    try {
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

      const response = await api.get(`/api/attendance/date?${params}`);
      
      if (response.data.success) {
        console.log('🔍 Attendance records received:', response.data.data.attendance.length);
        
        // Extract students from attendance records
        const attendanceRecords = response.data.data.attendance;
        let filteredAttendance = attendanceRecords;
        
        // Frontend filtering - ensure only students of warden's gender are shown
        if (wardenGender) {
          filteredAttendance = attendanceRecords.filter(record => 
            record.student?.gender === wardenGender
          );
          console.log('🔍 After gender filtering:', filteredAttendance.length, 'records');
        }

        // Frontend filtering for course and branch
        if (filters.course) {
          filteredAttendance = filteredAttendance.filter(record => 
            record.student?.course?._id === filters.course || record.student?.course === filters.course
          );
          console.log('🔍 After course filtering:', filteredAttendance.length, 'records');
        }

        if (filters.branch) {
          filteredAttendance = filteredAttendance.filter(record => 
            record.student?.branch?._id === filters.branch || record.student?.branch === filters.branch
          );
          console.log('🔍 After branch filtering:', filteredAttendance.length, 'records');
        }
        
        // Convert attendance records to student format for the UI
        const students = filteredAttendance.map(record => ({
          ...record.student,
          attendance: {
            morning: record.morning || false,
            evening: record.evening || false,
            night: record.night || false,
            status: record.status,
            percentage: record.percentage
          }
        }));
        
        setStudents(students);
        setStats({
          ...response.data.data.statistics,
          totalStudents: students.length
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
    if (selectedDate !== currentDate) {
      toast.error('Warden can only take attendance for today');
      setSelectedDate(currentDate);
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

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <SEO title="Take Attendance - Warden Dashboard" />
      
      <div className="max-w-7xl mx-auto p-3 sm:p-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg shadow-sm p-4 sm:p-6 mb-4 sm:mb-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
                <UserGroupIcon className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
                Take Attendance {user?.hostelType && `(${user.hostelType} Students)`}
              </h1>
              <p className="text-gray-600 mt-1 text-sm sm:text-base">
                Mark daily attendance for {user?.hostelType ? `${user.hostelType.toLowerCase()}` : 'all'} students
              </p>
            </div>
            <div className="grid grid-cols-2 sm:flex sm:flex-row gap-4 text-center sm:text-right">
              <div className="bg-gray-50 rounded-lg p-3 sm:bg-transparent sm:p-0">
                <p className="text-xs sm:text-sm text-gray-500">Total Students</p>
                <p className="text-xl sm:text-2xl font-bold text-green-600">{stats.totalStudents}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 sm:bg-transparent sm:p-0">
                <p className="text-xs sm:text-sm text-gray-500">Attendance Taken</p>
                <p className="text-xl sm:text-2xl font-bold text-blue-600">{stats.attendanceTaken}</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Controls */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-lg shadow-sm p-4 sm:p-6 mb-4 sm:mb-6"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
            {/* Date Selector */}
            <div className="sm:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <CalendarIcon className="w-4 h-4 inline mr-1" />
                Date (Today Only)
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={currentDate}
                  min={currentDate}
                  max={currentDate}
                  disabled={true}
                  className="w-full px-3 py-2 border border-green-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-sm bg-green-50 cursor-not-allowed text-green-700 font-medium"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                </div>
              </div>
              <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                Warden can only take attendance for today
              </p>
            </div>

            {/* Filters */}
            <div className="sm:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FunnelIcon className="w-4 h-4 inline mr-1" />
                Course
              </label>
              <select
                name="course"
                value={filters.course}
                onChange={handleFilterChange}
                disabled={loadingFilters}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-sm disabled:bg-gray-100"
              >
                <option value="">{loadingFilters ? 'Loading...' : 'All Courses'}</option>
                {courses.map((course) => (
                  <option key={course._id} value={course._id}>
                    {course.name} ({course.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">Branch</label>
              <select
                name="branch"
                value={filters.branch}
                onChange={handleFilterChange}
                disabled={loadingFilters || !filters.course}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-sm disabled:bg-gray-100"
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

            <div className="sm:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Gender {user?.hostelType && `(${user.hostelType} Warden)`}
              </label>
              <select
                name="gender"
                value={user?.hostelType || ''}
                disabled={true}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-sm bg-gray-50 cursor-not-allowed"
              >
                <option value="">{user?.hostelType || 'Not Assigned'}</option>
              </select>
            </div>

            <div className="sm:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
              <select
                name="category"
                value={filters.category}
                onChange={handleFilterChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
              >
                <option value="">All Categories</option>
                <option value="A+">A+</option>
                <option value="A">A</option>
                <option value="B+">B+</option>
                <option value="B">B</option>
                <option value="C">C</option>
              </select>
            </div>

            <div className="sm:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">Room</label>
              <input
                type="text"
                name="roomNumber"
                value={roomInput}
                onChange={handleRoomInputChange}
                placeholder="Room number"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
              />
            </div>
          </div>
        </motion.div>

        {/* Submit Button - Mobile Optimized */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-4 sm:mb-6 sticky top-16 z-10 bg-gray-50 p-3 -mx-3 sm:mx-0 sm:p-0 sm:bg-transparent sm:static"
        >
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <button
            onClick={handleSubmit}
            disabled={submitting}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-xl font-semibold text-base"
          >
            {submitting ? (
              <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Saving Attendance...</span>
              </>
            ) : (
              <>
                    <CheckIcon className="w-6 h-6" />
                    <span className="hidden sm:inline">Save Attendance ({students.length} students)</span>
                    <span className="sm:hidden">Save Attendance</span>
              </>
            )}
          </button>
            
            {/* Quick Stats */}
            <div className="flex justify-between sm:hidden text-sm text-gray-600 bg-white rounded-lg p-3 border border-gray-200">
              <div className="text-center">
                <div className="font-semibold text-green-600">{students.filter(s => getAttendanceStatus(s) === 'Present').length}</div>
                <div className="text-xs">Present</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-yellow-600">{students.filter(s => getAttendanceStatus(s) === 'Partial').length}</div>
                <div className="text-xs">Partial</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-red-600">{students.filter(s => getAttendanceStatus(s) === 'Absent').length}</div>
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
          className="bg-white rounded-lg shadow-sm overflow-hidden"
        >
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Students ({students.length})
            </h2>
              <div className="hidden sm:flex items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span>Present: {students.filter(s => getAttendanceStatus(s) === 'Present').length}</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span>Partial: {students.filter(s => getAttendanceStatus(s) === 'Partial').length}</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
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
                    className="p-4 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                  >
                    {/* Student Info */}
                    <div className="mb-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base font-semibold text-gray-900 truncate">{student.name}</h3>
                          {/* Mobile: Show only course and room */}
                          <p className="text-sm text-gray-600 mt-1 sm:hidden">
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
                        <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ml-3 flex-shrink-0 ${getStatusColor(status)}`}>
                          {getStatusIcon(status)}
                          <span className="ml-1">{status}</span>
                        </span>
                      </div>
                    </div>

                    {/* Attendance Controls */}
                    <div className="space-y-2 mb-3">
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <SunIcon className="w-4 h-4 text-yellow-600" />
                          <span className="text-sm font-medium">Morning</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={attendanceData[student._id]?.morning || false}
                          onChange={(e) => handleAttendanceChange(student._id, 'morning', e.target.checked)}
                          className="w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500"
                        />
                      </div>
                      
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <MoonIcon className="w-4 h-4 text-blue-600" />
                          <span className="text-sm font-medium">Evening</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={attendanceData[student._id]?.evening || false}
                          onChange={(e) => handleAttendanceChange(student._id, 'evening', e.target.checked)}
                          className="w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500"
                        />
                      </div>

                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <StarIcon className="w-4 h-4 text-purple-600" />
                          <span className="text-sm font-medium">Night</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={attendanceData[student._id]?.night || false}
                          onChange={(e) => handleAttendanceChange(student._id, 'night', e.target.checked)}
                          className="w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500"
                        />
                      </div>
                    </div>

                    {/* Notes */}
                    <div className="mt-4">
                      <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
                      <input
                        type="text"
                        value={attendanceData[student._id]?.notes || ''}
                        onChange={(e) => handleNotesChange(student._id, e.target.value)}
                        placeholder="Add notes for this student..."
                        className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
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
                          <input
                            type="checkbox"
                            checked={attendanceData[student._id]?.morning || false}
                            onChange={(e) => handleAttendanceChange(student._id, 'morning', e.target.checked)}
                            className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                          />
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <input
                            type="checkbox"
                            checked={attendanceData[student._id]?.evening || false}
                            onChange={(e) => handleAttendanceChange(student._id, 'evening', e.target.checked)}
                            className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                          />
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <input
                            type="checkbox"
                            checked={attendanceData[student._id]?.night || false}
                            onChange={(e) => handleAttendanceChange(student._id, 'night', e.target.checked)}
                            className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                          />
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
            <div className="text-center py-12">
              <UserGroupIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No students found with the selected filters.</p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default TakeAttendance; 