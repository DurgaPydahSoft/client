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
  StarIcon
} from '@heroicons/react/24/outline';
import LoadingSpinner from '../../components/LoadingSpinner';

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

  const getStatusText = (morning, evening, night) => {
    if (morning && evening && night) return 'Present';
    if (morning || evening || night) return 'Partial';
    return 'Absent';
  };

  const getStatusColor = (morning, evening, night) => {
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
    <div className="p-6">
      

      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex flex-col lg:flex-row gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
            <select
              name="branch"
              value={filters.branch}
              onChange={handleFilterChange}
              disabled={loadingFilters}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100"
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
            <select
              name="gender"
              value={filters.gender}
              onChange={handleFilterChange}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">All Genders</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              name="category"
              value={filters.category}
              onChange={handleFilterChange}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">All Categories</option>
              <option value="General">General</option>
              <option value="OBC">OBC</option>
              <option value="SC">SC</option>
              <option value="ST">ST</option>
            </select>
          </div>
        </div>
      </div>

      {/* Students List */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">
              Take Attendance ({students.length} students)
            </h3>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <ClockIcon className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircleIcon className="w-4 h-4" />
                  Save Attendance
                </>
              )}
            </button>
          </div>
        </div>

        {students.length === 0 ? (
          <div className="p-8 text-center">
            <UserGroupIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">No students found for the selected criteria</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Student
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Roll Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Branch
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Morning
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Evening
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <StarIcon className="w-4 h-4 inline mr-1" />
                    Night
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {students.map((student) => (
                  <tr key={student._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                            <span className="text-sm font-medium text-purple-600">
                              {student.name?.charAt(0) || 'S'}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {student.name || 'Unknown Student'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {student.gender || 'N/A'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {student.rollNumber || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {getBranchName(student.branch)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={attendanceData[student._id]?.morning || false}
                        onChange={(e) => handleAttendanceChange(student._id, 'morning', e.target.checked)}
                        className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={attendanceData[student._id]?.evening || false}
                        onChange={(e) => handleAttendanceChange(student._id, 'evening', e.target.checked)}
                        className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={attendanceData[student._id]?.night || false}
                        onChange={(e) => handleAttendanceChange(student._id, 'night', e.target.checked)}
                        className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                        attendanceData[student._id]?.morning || false,
                        attendanceData[student._id]?.evening || false,
                        attendanceData[student._id]?.night || false
                      )}`}>
                        {getStatusText(
                          attendanceData[student._id]?.morning || false,
                          attendanceData[student._id]?.evening || false,
                          attendanceData[student._id]?.night || false
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="text"
                        value={attendanceData[student._id]?.notes || ''}
                        onChange={(e) => handleAttendanceChange(student._id, 'notes', e.target.value)}
                        placeholder="Add notes..."
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
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