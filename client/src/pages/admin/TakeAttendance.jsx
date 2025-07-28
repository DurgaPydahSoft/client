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
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline';
import api from '../../utils/axios';
import LoadingSpinner from '../../components/LoadingSpinner';
import { toast } from 'react-hot-toast';
import SEO from '../../components/SEO';

const TakeAttendance = () => {
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
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [stats, setStats] = useState({
    totalStudents: 0,
    attendanceTaken: 0
  });
  const [courses, setCourses] = useState([]);
  const [branches, setBranches] = useState([]);
  const [filteredBranches, setFilteredBranches] = useState([]);

  useEffect(() => {
    fetchStudents();
    fetchFilters();
  }, [selectedDate, filters]);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        date: selectedDate,
        ...filters
      });

      const response = await api.get(`/api/attendance/students?${params}`);
      
      if (response.data.success) {
        setStudents(response.data.data.students);
        setStats(response.data.data);
        
        // Initialize attendance data
        const initialAttendance = {};
        response.data.data.students.forEach(student => {
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

  useEffect(() => {
    if (!filters.course) {
      setFilteredBranches(branches);
    } else {
      setFilteredBranches(branches.filter(b =>
        b.course === filters.course || (typeof b.course === 'object' && b.course._id === filters.course)
      ));
    }
  }, [filters.course, branches]);

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

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const attendanceRecords = Object.entries(attendanceData).map(([studentId, data]) => ({
        studentId,
        morning: data.morning,
        evening: data.evening,
        night: data.night,
        notes: data.notes
      }));

      const response = await api.post('/api/attendance/take', {
        date: selectedDate,
        attendanceData: attendanceRecords
      });

      if (response.data.success) {
        toast.success(`Attendance saved for ${response.data.data.successful} students`);
        fetchStudents(); // Refresh data
      }
    } catch (error) {
      console.error('Error saving attendance:', error);
      toast.error('Failed to save attendance');
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

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="p-3 sm:p-4 lg:p-6">
      {/* Stats Display */}
      <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="text-left sm:text-right">
          <p className="text-xs sm:text-sm text-gray-500">Total Students</p>
          <p className="text-lg sm:text-2xl font-bold text-blue-600">{stats.totalStudents}</p>
        </div>
        <div className="text-right">
          <p className="text-xs sm:text-sm text-gray-500">Attendance Taken</p>
          <p className="text-lg sm:text-2xl font-bold text-green-600">{stats.attendanceTaken}</p>
        </div>
      </div>

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
              {/* Date Selector */}
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

              {/* Course Filter */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                  <FunnelIcon className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" />
                  Course
                </label>
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

              {/* Branch Filter */}
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

              {/* Gender Filter */}
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

              {/* Category Filter */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Category</label>
                <select
                  name="category"
                  value={filters.category}
                  onChange={handleFilterChange}
                  className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs sm:text-sm"
                >
                  <option value="">All Categories</option>
                  <option value="A+">A+</option>
                  <option value="A">A</option>
                  <option value="B+">B+</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                </select>
              </div>

              {/* Room Filter */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Room</label>
                <input
                  type="text"
                  name="roomNumber"
                  value={filters.roomNumber}
                  onChange={handleFilterChange}
                  placeholder="Room number"
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
        transition={{ delay: 0.1 }}
        className="hidden lg:block bg-white rounded-lg shadow-sm p-3 sm:p-4 lg:p-6 mb-4 sm:mb-6"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
          {/* Date Selector */}
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

          {/* Filters */}
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
              <FunnelIcon className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" />
              Course
            </label>
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
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Category</label>
            <select
              name="category"
              value={filters.category}
              onChange={handleFilterChange}
              className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs sm:text-sm"
            >
              <option value="">All Categories</option>
              <option value="A+">A+</option>
              <option value="A">A</option>
              <option value="B+">B+</option>
              <option value="B">B</option>
              <option value="C">C</option>
            </select>
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Room</label>
            <input
              type="text"
              name="roomNumber"
              value={filters.roomNumber}
              onChange={handleFilterChange}
              placeholder="Room number"
              className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs sm:text-sm"
            />
          </div>
        </div>
      </motion.div>

      {/* Students List */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-lg shadow-sm overflow-hidden"
      >
        <div className="px-3 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900">
            Students ({students.length})
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Student
                </th>
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
                    <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div>
                          <div className="text-xs sm:text-sm font-medium text-gray-900">
                            {student.name}
                          </div>
                          <div className="text-xs sm:text-sm text-gray-500">
                            {student.rollNumber} • {getCourseName(student.course)} {student.year} • {getBranchName(student.branch)}
                          </div>
                          <div className="text-xs text-gray-400">
                            Room {student.roomNumber} • {student.gender}
                          </div>
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-2 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-center">
                      <input
                        type="checkbox"
                        checked={attendanceData[student._id]?.morning || false}
                        onChange={(e) => handleAttendanceChange(student._id, 'morning', e.target.checked)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                    </td>
                    
                    <td className="px-2 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-center">
                      <input
                        type="checkbox"
                        checked={attendanceData[student._id]?.evening || false}
                        onChange={(e) => handleAttendanceChange(student._id, 'evening', e.target.checked)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                    </td>
                    
                    <td className="px-2 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-center">
                      <input
                        type="checkbox"
                        checked={attendanceData[student._id]?.night || false}
                        onChange={(e) => handleAttendanceChange(student._id, 'night', e.target.checked)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                    </td>
                    
                    <td className="px-2 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
                        {getStatusIcon(status)}
                        <span className="ml-1 hidden sm:inline">{status}</span>
                        <span className="ml-1 sm:hidden">{status.charAt(0)}</span>
                      </span>
                    </td>
                    
                    <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                      <input
                        type="text"
                        value={attendanceData[student._id]?.notes || ''}
                        onChange={(e) => handleNotesChange(student._id, e.target.value)}
                        placeholder="Add notes..."
                        className="w-full px-2 py-1 text-xs sm:text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Submit Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mt-4 sm:mt-6 flex justify-end"
      >
        <button
          onClick={handleSubmit}
          disabled={submitting || students.length === 0}
          className="inline-flex items-center px-4 sm:px-6 py-2 sm:py-3 border border-transparent text-sm sm:text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ArrowDownTrayIcon className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
          <span className="hidden sm:inline">{submitting ? 'Saving...' : 'Save Attendance'}</span>
          <span className="sm:hidden">{submitting ? 'Saving...' : 'Save'}</span>
        </button>
      </motion.div>
    </div>
  );
};

export default TakeAttendance; 