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
  FunnelIcon,
  ArrowDownTrayIcon,
  MapPinIcon,
  CalendarDaysIcon,
  UsersIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import api from '../../utils/axios';
import LoadingSpinner from '../../components/LoadingSpinner';
import { toast } from 'react-hot-toast';
import SEO from '../../components/SEO';
import { useAuth } from '../../context/AuthContext';

const BulkOuting = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [students, setStudents] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [bulkOutings, setBulkOutings] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [outingData, setOutingData] = useState({
    outingDate: '',
    reason: ''
  });
  const [filters, setFilters] = useState({
    course: '',
    branch: '',
    gender: '',
    category: '',
    roomNumber: '',
    batch: '',
    academicYear: '',
    hostelStatus: 'Active'
  });
  const [stats, setStats] = useState({
    totalStudents: 0,
    selectedStudents: 0
  });
  const [showStudentsModal, setShowStudentsModal] = useState(false);
  const [selectedOutingStudents, setSelectedOutingStudents] = useState([]);
  const [selectedOutingDetails, setSelectedOutingDetails] = useState(null);
  const [loadingStudents, setLoadingStudents] = useState(false);
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

  useEffect(() => {
    if (!showHistory) {
      fetchStudents();
    } else {
      fetchBulkOutings();
    }
  }, [showHistory]);

  useEffect(() => {
    fetchFilters();
  }, []);

  useEffect(() => {
    setStats(prev => ({
      ...prev,
      selectedStudents: selectedStudents.length
    }));
  }, [selectedStudents]);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      
      Object.keys(filters).forEach(key => {
        if (filters[key]) {
          params.append(key, filters[key]);
        }
      });

      // Use mapped gender for filtering
      const wardenGender = getWardenGender();
      if (wardenGender) {
        params.delete('gender');
        params.append('gender', wardenGender);
        console.log('🔍 BulkOuting: Warden hostelType:', user.hostelType, '| Gender for filter:', wardenGender);
      }

      const response = await api.get(`/api/bulk-outing/warden/students?${params}`);
      
      if (response.data.success) {
        // Frontend filtering as fallback - ensure only students of warden's gender are shown
        let filteredStudents = response.data.data;
        if (wardenGender) {
          filteredStudents = response.data.data.filter(student => 
            student.gender === wardenGender
          );
          console.log('🔍 BulkOuting: After frontend filtering:', filteredStudents.length, 'students');
        }
        
        setStudents(filteredStudents);
        setStats(prev => ({
          ...prev,
          totalStudents: filteredStudents.length
        }));
      }
    } catch (error) {
      console.error('Error fetching students:', error);
      toast.error('Failed to fetch students');
    } finally {
      setLoading(false);
    }
  };

  const fetchBulkOutings = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/bulk-outing/warden');
      if (response.data.success) {
        setBulkOutings(response.data.data.bulkOutings);
      }
    } catch (error) {
      console.error('Error fetching bulk outings:', error);
      toast.error('Failed to fetch bulk outing history');
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

  const handleStudentSelection = (studentId, checked) => {
    if (checked) {
      setSelectedStudents(prev => [...prev, studentId]);
    } else {
      setSelectedStudents(prev => prev.filter(id => id !== studentId));
    }
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedStudents(students.map(student => student._id));
    } else {
      setSelectedStudents([]);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setOutingData(prev => ({
      ...prev,
      [name]: value
    }));
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

  const applyFilters = async () => {
    if (!showHistory) {
      await fetchStudents();
    }
  };

  const handleSubmit = async () => {
    if (selectedStudents.length === 0) {
      toast.error('Please select at least one student');
      return;
    }

    if (!outingData.outingDate || !outingData.reason) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    try {
      const response = await api.post('/api/bulk-outing/create', {
        outingDate: outingData.outingDate,
        reason: outingData.reason,
        selectedStudentIds: selectedStudents,
        filters: filters
      });

      if (response.data.success) {
        toast.success(`Bulk outing request created for ${selectedStudents.length} students`);
        setSelectedStudents([]);
        setOutingData({
          outingDate: '',
          reason: ''
        });
        fetchBulkOutings();
        setShowHistory(true);
      }
    } catch (error) {
      console.error('Error creating bulk outing:', error);
      toast.error(error.response?.data?.message || 'Failed to create bulk outing request');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Approved': return 'text-green-600 bg-green-50';
      case 'Rejected': return 'text-red-600 bg-red-50';
      case 'Pending': return 'text-yellow-600 bg-yellow-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Approved': return <CheckIcon className="w-4 h-4" />;
      case 'Rejected': return <XMarkIcon className="w-4 h-4" />;
      case 'Pending': return <ClockIcon className="w-4 h-4" />;
      default: return null;
    }
  };

  const handleViewStudents = async (outing) => {
    setSelectedOutingDetails(outing);
    setShowStudentsModal(true);
    setLoadingStudents(true);
    
    try {
      const response = await api.get(`/api/bulk-outing/admin/${outing._id}/students`);
      if (response.data.success) {
        setSelectedOutingStudents(response.data.data.students);
      }
    } catch (error) {
      console.error('Error fetching outing students:', error);
      toast.error('Failed to fetch students list');
    } finally {
      setLoadingStudents(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-3 sm:p-6">
      <SEO title="Bulk Outing - Warden Dashboard" />
      
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg shadow-sm p-4 sm:p-6 mb-4 sm:mb-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
                <UsersIcon className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
                Bulk Outing Management {user?.hostelType && `(${user.hostelType} Students)`}
              </h1>
              <p className="text-gray-600 mt-1 text-sm sm:text-base">
                Create bulk outing requests for {user?.hostelType ? `${user.hostelType.toLowerCase()}` : 'all'} students
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 text-center sm:text-right">
              <div>
                <p className="text-sm text-gray-500">Total Students</p>
                <p className="text-2xl font-bold text-green-600">{stats.totalStudents}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Selected</p>
                <p className="text-2xl font-bold text-blue-600">{stats.selectedStudents}</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Toggle Buttons */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-lg shadow-sm p-4 mb-4 sm:mb-6"
        >
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setShowHistory(false)}
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                !showHistory
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <UsersIcon className="w-4 h-4 inline mr-2" />
              Create Outing
            </button>
            <button
              onClick={() => setShowHistory(true)}
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                showHistory
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <ClockIcon className="w-4 h-4 inline mr-2" />
              Outing History
            </button>
          </div>
        </motion.div>

        {!showHistory ? (
          <>
            {/* Outing Details Form */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-lg shadow-sm p-4 sm:p-6 mb-4 sm:mb-6"
            >
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-green-600" />
                Outing Details
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <CalendarIcon className="w-4 h-4 inline mr-1" />
                    Outing Date
                  </label>
                  <input
                    type="date"
                    name="outingDate"
                    value={outingData.outingDate}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <MapPinIcon className="w-4 h-4 inline mr-1" />
                    Reason/Purpose
                  </label>
                  <input
                    type="text"
                    name="reason"
                    value={outingData.reason}
                    onChange={handleInputChange}
                    placeholder="Enter reason for outing"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                    required
                  />
                </div>
              </div>
            </motion.div>

            {/* Filters */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-lg shadow-sm p-4 sm:p-6 mb-4 sm:mb-6"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FunnelIcon className="w-5 h-5 text-green-600" />
                Filter Students
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Course</label>
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
                <div>
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
                <div>
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                  <select
                    name="category"
                    value={filters.category}
                    onChange={handleFilterChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                  >
                    <option value="">All Categories</option>
                    <option value="General">General</option>
                    <option value="OBC">OBC</option>
                    <option value="SC">SC</option>
                    <option value="ST">ST</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Room Number</label>
                  <input
                    type="text"
                    name="roomNumber"
                    value={filters.roomNumber}
                    onChange={handleFilterChange}
                    placeholder="Enter room number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Batch</label>
                  <input
                    type="text"
                    name="batch"
                    value={filters.batch}
                    onChange={handleFilterChange}
                    placeholder="Enter batch"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Academic Year</label>
                  <input
                    type="text"
                    name="academicYear"
                    value={filters.academicYear}
                    onChange={handleFilterChange}
                    placeholder="Enter academic year"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Hostel Status</label>
                  <select
                    name="hostelStatus"
                    value={filters.hostelStatus}
                    onChange={handleFilterChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>
              
              {/* Apply Filters Button */}
              <div className="mt-4 flex justify-end">
                <button
                  onClick={applyFilters}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Loading...
                    </div>
                  ) : (
                    'Apply Filters'
                  )}
                </button>
              </div>
            </motion.div>

            {/* Student Selection */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white rounded-lg shadow-sm overflow-hidden"
            >
              <div className="px-4 sm:px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <UserGroupIcon className="w-5 h-5 text-green-600" />
                  Select Students ({students.length})
                </h2>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedStudents.length === students.length && students.length > 0}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                  />
                  <span className="text-sm text-gray-600">Select All</span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Select
                      </th>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Student
                      </th>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Course & Branch
                      </th>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Room
                      </th>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Contact
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {students.filter(student => student !== null && student !== undefined).map((student, index) => (
                      <motion.tr
                        key={student._id || `student-${index}`}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="hover:bg-gray-50"
                      >
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={selectedStudents.includes(student._id)}
                            onChange={(e) => handleStudentSelection(student._id, e.target.checked)}
                            className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                          />
                        </td>
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {student.name || 'Unknown Student'}
                            </div>
                            <div className="text-sm text-gray-500">
                              {student.rollNumber || 'N/A'}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {getCourseName(student.course)} {student.year || ''}
                          </div>
                          <div className="text-sm text-gray-500">
                            {getBranchName(student.branch)}
                          </div>
                        </td>
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          Room {student.roomNumber || 'N/A'}
                        </td>
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {student.phone || 'N/A'}
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {students.length === 0 && (
                <div className="text-center py-12">
                  <UserGroupIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No students found with the selected filters.</p>
                </div>
              )}
            </motion.div>

            {/* Submit Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mt-4 sm:mt-6 flex justify-end"
            >
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSubmit}
                disabled={submitting || selectedStudents.length === 0}
                className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-300 shadow hover:shadow-md"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Creating Outing Request...
                  </>
                ) : (
                  <>
                    <CalendarDaysIcon className="w-5 h-5" />
                    Create Bulk Outing Request ({selectedStudents.length} students)
                  </>
                )}
              </motion.button>
            </motion.div>
          </>
        ) : (
          /* Bulk Outing History */
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-lg shadow-sm overflow-hidden"
          >
            <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <ClockIcon className="w-5 h-5 text-green-600" />
                Bulk Outing History ({bulkOutings.length})
              </h2>
            </div>

            {bulkOutings.length === 0 ? (
              <div className="text-center py-12">
                <ClockIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No bulk outing requests found.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {bulkOutings.map((outing) => (
                  <motion.div
                    key={outing._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 sm:p-6 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(outing.status)}`}>
                            {getStatusIcon(outing.status)}
                            <span className="ml-1">{outing.status}</span>
                          </span>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border text-purple-600 bg-purple-50 border-purple-200">
                            Bulk Outing
                          </span>
                          <span className="text-sm text-gray-500">
                            {new Date(outing.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        
                        <div className="space-y-2">
                          <div>
                            <span className="text-sm font-medium text-gray-700">Outing Date:</span>
                            <span className="text-sm text-gray-600 ml-2">
                              {new Date(outing.outingDate).toLocaleDateString()}
                            </span>
                          </div>
                          <div>
                            <span className="text-sm font-medium text-gray-700">Reason:</span>
                            <span className="text-sm text-gray-600 ml-2">{outing.reason}</span>
                          </div>
                          <div>
                            <span className="text-sm font-medium text-gray-700">Students:</span>
                            <span className="text-sm text-gray-600 ml-2">{outing.selectedStudents?.length || outing.studentCount || 0} students</span>
                          </div>
                          {outing.rejectionReason && (
                            <div>
                              <span className="text-sm font-medium text-red-700">Rejection Reason:</span>
                              <span className="text-sm text-red-600 ml-2">{outing.rejectionReason}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleViewStudents(outing)}
                          className="inline-flex items-center gap-1 px-3 py-1 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
                        >
                          <EyeIcon className="w-4 h-4" />
                          See Students List
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* Students List Modal */}
      {showStudentsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <UsersIcon className="w-5 h-5 text-blue-600" />
                  Students in Bulk Outing
                </h3>
                {selectedOutingDetails && (
                  <p className="text-sm text-gray-600 mt-1">
                    {new Date(selectedOutingDetails.outingDate).toLocaleDateString()} - {selectedOutingDetails.reason}
                  </p>
                )}
              </div>
              <button
                onClick={() => {
                  setShowStudentsModal(false);
                  setSelectedOutingStudents([]);
                  setSelectedOutingDetails(null);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {loadingStudents ? (
                <div className="flex items-center justify-center py-8">
                  <LoadingSpinner />
                </div>
              ) : selectedOutingStudents.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Student
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Course & Branch
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Room
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Contact
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {selectedOutingStudents.filter(student => student !== null && student !== undefined).map((student, index) => (
                        <motion.tr
                          key={student._id || `student-${index}`}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="hover:bg-gray-50"
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {student.name || 'Unknown Student'}
                              </div>
                              <div className="text-sm text-gray-500">
                                {student.rollNumber || 'N/A'}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {getCourseName(student.course)} {student.year || ''}
                            </div>
                            <div className="text-sm text-gray-500">
                              {getBranchName(student.branch)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            Room {student.roomNumber || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {student.studentPhone || 'N/A'}
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <UsersIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No students found for this outing.</p>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center">
              <span className="text-sm text-gray-600">
                Total: {selectedOutingStudents.length} students
              </span>
              <button
                onClick={() => {
                  setShowStudentsModal(false);
                  setSelectedOutingStudents([]);
                  setSelectedOutingDetails(null);
                }}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default BulkOuting; 