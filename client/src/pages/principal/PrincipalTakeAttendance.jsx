import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/axios';
import { toast } from 'react-hot-toast';
import {
  UserGroupIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  CalendarIcon,
  AcademicCapIcon,
  StarIcon,
  FunnelIcon
} from '@heroicons/react/24/outline';
import LoadingSpinner from '../../components/LoadingSpinner';
import { AnimatePresence } from 'framer-motion';

const PrincipalTakeAttendance = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [filters, setFilters] = useState({
    branch: '',
    gender: '',
    category: ''
  });
  const [attendanceData, setAttendanceData] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [allBranches, setAllBranches] = useState([]);
  const [filteredBranches, setFilteredBranches] = useState([]);
  const [loadingFilters, setLoadingFilters] = useState(false);
  const [filtersCollapsed, setFiltersCollapsed] = useState(true);

  useEffect(() => {
    fetchStudents();
  }, [selectedDate, filters]);

  useEffect(() => {
    if (user?.course) {
      fetchFilters();
      
    }
  }, [user?.course]);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      // Use principal-specific endpoint - server already filters by course
      const params = new URLSearchParams({ date: selectedDate });
      if (filters.gender) params.append('gender', filters.gender);
      if (filters.category) params.append('category', filters.category);
      console.log('[DEBUG] Fetching students with params:', params.toString());
      const response = await api.get(`/api/attendance/principal/date?${params}`);
      console.log('[DEBUG] API response:', response.data);
      if (response.data.success) {
        let filteredStudents = response.data.data.attendance; // Access the attendance array
        console.log('[DEBUG] Students before branch filter:', filteredStudents);
        if (filters.branch) {
          filteredStudents = filteredStudents.filter(student => 
            student.branch?._id === filters.branch || student.branch === filters.branch
          );
        }
        console.log('[DEBUG] Students after branch filter:', filteredStudents);
        setStudents(filteredStudents);
        const initialAttendance = {};
        filteredStudents.forEach(student => {
          initialAttendance[student._id] = {
            morning: student.morning || false,
            evening: student.evening || false,
            night: student.night || false,
            notes: student.notes || ''
          };
        });
        setAttendanceData(initialAttendance);
      }
    } catch (error) {
      console.error('[DEBUG] Error fetching students:', error);
      toast.error('Failed to fetch students data');
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

  const handleAttendanceChange = (studentId, field, value) => {
    setAttendanceData(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: value
      }
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
        toast.success('Attendance taken successfully');
        fetchStudents(); // Refresh data
      }
    } catch (error) {
      console.error('Error taking attendance:', error);
      toast.error('Failed to take attendance');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusText = (morning, evening, night, isOnLeave) => {
    if (isOnLeave) return 'On Leave';
    if (morning && evening && night) return 'Present';
    if (morning || evening || night) return 'Partial';
    return 'Absent';
  };

  const getStatusColor = (morning, evening, night, isOnLeave) => {
    if (isOnLeave) return 'bg-blue-100 text-blue-800';
    if (morning && evening && night) return 'bg-green-100 text-green-800';
    if (morning || evening || night) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  // Helper function to safely get branch name
  const getBranchName = (branch) => {
    if (!branch) return 'N/A';
    if (typeof branch === 'object' && branch.name) return branch.name;
    if (typeof branch === 'string') return branch;
    return 'N/A';
  };

  const courseName = typeof user.course === 'object' ? user.course.name : user.course;
  const courseCode = typeof user.course === 'object' ? user.course.code : '';

  if (loading || !user?.course) return <LoadingSpinner />;

  return (
    <div className="p-3 sm:p-6">
      

      {/* Header */}
      <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 mb-4 sm:mb-6">
        {/* Filter Toggle Button */}
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900">Attendance Filters</h3>
          <button
            onClick={() => setFiltersCollapsed(!filtersCollapsed)}
            className="flex items-center gap-2 px-3 py-2 text-xs sm:text-sm font-medium text-purple-600 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors touch-manipulation"
          >
            <FunnelIcon className="w-4 h-4" />
            {filtersCollapsed ? 'Show Filters' : 'Hide Filters'}
          </button>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Select Date</label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full px-2.5 sm:px-3 py-2 sm:py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-xs sm:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Branch</label>
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
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Gender</label>
                  <select
                    name="gender"
                    value={filters.gender}
                    onChange={handleFilterChange}
                    className="w-full px-2.5 sm:px-3 py-2 sm:py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-xs sm:text-sm"
                  >
                    <option value="">All Genders</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    name="category"
                    value={filters.category}
                    onChange={handleFilterChange}
                    className="w-full px-2.5 sm:px-3 py-2 sm:py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-xs sm:text-sm"
                  >
                    <option value="">All Categories</option>
                    <option value="General">General</option>
                    <option value="OBC">OBC</option>
                    <option value="SC">SC</option>
                    <option value="ST">ST</option>
                  </select>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Students List */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-0">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900">
              Take Attendance ({students.length} students)
            </h3>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex items-center justify-center gap-2 px-4 py-2.5 sm:py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 text-xs sm:text-sm font-medium touch-manipulation"
            >
              {submitting ? (
                <>
                  <ClockIcon className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <CheckCircleIcon className="w-4 h-4" />
                  <span>Save Attendance</span>
                </>
              )}
            </button>
          </div>
        </div>

        {students.length === 0 ? (
          <div className="p-6 sm:p-8 text-center">
            <UserGroupIcon className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500 text-xs sm:text-sm">No students found for the selected criteria</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Student
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                    Roll Number
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                    Branch
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Morning
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
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
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {students.map((student) => (
                  <tr key={student._id} className="hover:bg-gray-50">
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8 sm:h-10 sm:w-10">
                          <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-purple-100 flex items-center justify-center">
                            <span className="text-xs sm:text-sm font-medium text-purple-600">
                              {student.name?.charAt(0) || 'S'}
                            </span>
                          </div>
                        </div>
                        <div className="ml-3 sm:ml-4">
                          <div className="text-xs sm:text-sm font-medium text-gray-900">
                            {student.name || 'Unknown Student'}
                          </div>
                          <div className="text-xs sm:text-sm text-gray-500">
                            {student.gender || 'N/A'}
                          </div>
                          <div className="text-xs text-gray-400 sm:hidden">
                            {student.rollNumber || 'N/A'} • {getBranchName(student.branch)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900 hidden sm:table-cell">
                      {student.rollNumber || 'N/A'}
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900 hidden lg:table-cell">
                      {getBranchName(student.branch)}
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-center">
                      <input
                        type="checkbox"
                        checked={attendanceData[student._id]?.morning || false}
                        onChange={(e) => handleAttendanceChange(student._id, 'morning', e.target.checked)}
                        className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500 touch-manipulation"
                      />
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-center">
                      <input
                        type="checkbox"
                        checked={attendanceData[student._id]?.evening || false}
                        onChange={(e) => handleAttendanceChange(student._id, 'evening', e.target.checked)}
                        className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500 touch-manipulation"
                      />
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-center">
                      <input
                        type="checkbox"
                        checked={attendanceData[student._id]?.night || false}
                        onChange={(e) => handleAttendanceChange(student._id, 'night', e.target.checked)}
                        className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500 touch-manipulation"
                      />
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                        attendanceData[student._id]?.morning || false,
                        attendanceData[student._id]?.evening || false,
                        attendanceData[student._id]?.night || false,
                        student.isOnLeave || false
                      )}`}>
                        {getStatusText(
                          attendanceData[student._id]?.morning || false,
                          attendanceData[student._id]?.evening || false,
                          attendanceData[student._id]?.night || false,
                          student.isOnLeave || false
                        )}
                      </span>
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap hidden md:table-cell">
                      <input
                        type="text"
                        value={attendanceData[student._id]?.notes || ''}
                        onChange={(e) => handleAttendanceChange(student._id, 'notes', e.target.value)}
                        placeholder="Add notes..."
                        className="w-full px-2 py-1 text-xs sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default PrincipalTakeAttendance; 