import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import api from '../../utils/axios';
import toast from 'react-hot-toast';
import { 
  MagnifyingGlassIcon, 
  FunnelIcon, 
  ChevronLeftIcon, 
  ChevronRightIcon,
  EyeIcon,
  UserIcon,
  AcademicCapIcon,
  PhoneIcon,
  HomeIcon,
  CalendarIcon,
  IdentificationIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import LoadingSpinner from '../../components/LoadingSpinner';
import SEO from '../../components/SEO';
import { useAuth } from '../../context/AuthContext';

// Helper function to get course name consistently
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

const PrincipalStudents = () => {
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalStudents, setTotalStudents] = useState(0);
  const [error, setError] = useState(null);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  
  // Filters
  const [filters, setFilters] = useState({
    search: '',
    gender: '',
    category: '',
    roomNumber: '',
    batch: '',
    academicYear: '',
    hostelStatus: ''
  });

  // Student details modal
  const [studentDetailsModal, setStudentDetailsModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  
  // Photo modal
  const [photoModal, setPhotoModal] = useState({ open: false, src: '', name: '' });

  // Debounce search term
  useEffect(() => {
    const timerId = setTimeout(() => {
      setDebouncedSearchTerm(filters.search);
    }, 500);

    return () => {
      clearTimeout(timerId);
    };
  }, [filters.search]);

  const fetchStudents = useCallback(async (initialLoad = false) => {
    if (initialLoad) {
      setLoading(true);
    } else {
      setTableLoading(true);
    }
    setError(null);
    
    try {
      const params = new URLSearchParams({
        page: currentPage,
        limit: 10
      });

      // Add filters only if they have values
      if (filters.search) params.append('search', filters.search);
      if (filters.gender) params.append('gender', filters.gender);
      if (filters.category) params.append('category', filters.category);
      if (filters.roomNumber) params.append('roomNumber', filters.roomNumber);
      if (filters.batch) params.append('batch', filters.batch);
      if (filters.academicYear) params.append('academicYear', filters.academicYear);
      if (filters.hostelStatus) params.append('hostelStatus', filters.hostelStatus);

      console.log('🎓 Fetching students with params:', params.toString());

      const res = await api.get(`/api/principal/students?${params}`);
      if (res.data.success) {
        setStudents(res.data.data.students || []);
        setTotalPages(res.data.data.totalPages || 1);
        setTotalStudents(res.data.data.totalStudents || 0);
      } else {
        throw new Error(res.data.message || 'Failed to fetch students');
      }
    } catch (err) {
      setError('Failed to fetch students');
      toast.error(err.response?.data?.message || 'Failed to fetch students');
      setStudents([]);
      setTotalPages(1);
      setTotalStudents(0);
    } finally {
      if (initialLoad) {
        setLoading(false);
      } else {
        setTableLoading(false);
      }
    }
  }, [currentPage, filters.search, filters.gender, filters.category, filters.roomNumber, filters.batch, filters.academicYear, filters.hostelStatus, debouncedSearchTerm]);

  // Fetch students when currentPage or filters change
  useEffect(() => {
    fetchStudents(true);
  }, [currentPage, filters.gender, filters.category, filters.roomNumber, filters.batch, filters.academicYear, filters.hostelStatus, debouncedSearchTerm]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1); // Reset to first page when filters change
  };

  const handleSearchChange = (value) => {
    setFilters(prev => ({ ...prev, search: value }));
    setCurrentPage(1); // Reset to first page when search changes
  };

  const openStudentDetailsModal = (student) => {
    setSelectedStudent(student);
    setStudentDetailsModal(true);
  };

  const closeStudentDetailsModal = () => {
    setStudentDetailsModal(false);
    setSelectedStudent(null);
  };

  const closePhotoModal = () => {
    setPhotoModal({ open: false, src: '', name: '' });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Active': return 'text-green-600 bg-green-50';
      case 'Inactive': return 'text-red-600 bg-red-50';
      case 'Pending': return 'text-yellow-600 bg-yellow-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="max-w-7xl mx-auto mt-16 sm:mt-0">
      <SEO 
        title="Students - Principal Dashboard"
        description="View all students in your assigned course"
        keywords="students, principal, course management"
      />
      
      {/* Header */}
      <div className="mb-6 sm:mb-8 px-3 sm:px-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-purple-600 to-purple-700 rounded-lg flex items-center justify-center">
            <UserIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg sm:text-2xl font-bold text-gray-900">Students</h1>
            <p className="text-xs sm:text-sm text-gray-600">
              {getCourseName(user?.course)} - {totalStudents} students
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4 sm:p-6 mb-4 sm:mb-6 mx-3 sm:mx-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Search */}
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search students..."
              value={filters.search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-9 sm:pl-10 pr-4 py-2.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-xs sm:text-sm"
            />
          </div>

          {/* Gender Filter */}
          <select
            value={filters.gender}
            onChange={(e) => handleFilterChange('gender', e.target.value)}
            className="px-2.5 sm:px-3 py-2.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-xs sm:text-sm"
          >
            <option value="">All Genders</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>

          {/* Category Filter */}
          <select
            value={filters.category}
            onChange={(e) => handleFilterChange('category', e.target.value)}
            className="px-2.5 sm:px-3 py-2.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-xs sm:text-sm"
          >
            <option value="">All Categories</option>
            <option value="A+">A+</option>
            <option value="A">A</option>
            <option value="B+">B+</option>
            <option value="B">B</option>
            <option value="C">C</option>
          </select>

          {/* Hostel Status Filter */}
          <select
            value={filters.hostelStatus}
            onChange={(e) => handleFilterChange('hostelStatus', e.target.value)}
            className="px-2.5 sm:px-3 py-2.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-xs sm:text-sm"
          >
            <option value="">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
            <option value="Pending">Pending</option>
          </select>
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden mx-3 sm:mx-6">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Student
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                  Course & Branch
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                  Contact
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                  Room & Category
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>

              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {tableLoading ? (
                <tr>
                  <td colSpan="5" className="px-3 sm:px-6 py-4 text-center">
                    <div className="flex items-center justify-center">
                      <div className="w-5 h-5 sm:w-6 sm:h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                      <span className="ml-2 text-gray-600 text-xs sm:text-sm">Loading students...</span>
                    </div>
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-3 sm:px-6 py-6 sm:py-8 text-center text-gray-500 text-xs sm:text-sm">
                    <div className="flex flex-col items-center">
                      <UserIcon className="w-8 h-8 sm:w-12 sm:h-12 text-gray-300 mb-2" />
                      <p>No students found</p>
                      <p className="text-xs text-gray-400 mt-1">Try adjusting your filters</p>
                    </div>
                  </td>
                </tr>
              ) : (
                students.map((student) => (
                  <tr 
                    key={student._id} 
                    className="hover:bg-purple-50 cursor-pointer transition-all duration-200"
                    onClick={() => openStudentDetailsModal(student)}
                  >
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap hover:border-l-4 hover:border-l-purple-500">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8 sm:h-10 sm:w-10">
                          {student.studentPhoto ? (
                            <img
                              src={student.studentPhoto}
                              alt={student.name || 'Student Photo'}
                              className="h-8 w-8 sm:h-10 sm:w-10 rounded-full object-cover border border-gray-200 cursor-pointer"
                              onClick={() => setPhotoModal({ open: true, src: student.studentPhoto, name: student.name })}
                            />
                          ) : (
                            <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-purple-100 flex items-center justify-center">
                              <span className="text-xs sm:text-sm font-medium text-purple-600">
                                {student.name?.charAt(0)?.toUpperCase() || 'S'}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="ml-3 sm:ml-4">
                          <div className="text-xs sm:text-sm font-medium text-gray-900">
                            {student.name || 'Unknown Student'}
                          </div>
                          <div className="text-xs sm:text-sm text-gray-500">
                            {student.rollNumber || 'N/A'}
                          </div>
                          <div className="text-xs text-gray-400">
                            {student.hostelId || 'N/A'}
                          </div>
                          {/* Mobile-only additional info */}
                          <div className="text-xs text-gray-500 sm:hidden">
                            {getCourseName(student.course)} • Room {student.roomNumber}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap hidden sm:table-cell">
                      <div className="text-xs sm:text-sm text-gray-900">
                        {getCourseName(student.course)}
                      </div>
                      <div className="text-xs sm:text-sm text-gray-500">
                        {getBranchName(student.branch)}
                      </div>
                      <div className="text-xs text-gray-400">
                        Year {student.year} • {student.batch}
                      </div>
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap hidden md:table-cell">
                      <div className="text-xs sm:text-sm text-gray-900">
                        {student.studentPhone || 'N/A'}
                      </div>
                      <div className="text-xs sm:text-sm text-gray-500">
                        {student.parentPhone || 'N/A'}
                      </div>
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap hidden lg:table-cell">
                      <div className="text-xs sm:text-sm text-gray-900">
                        Room {student.roomNumber}
                      </div>
                      <div className="text-xs sm:text-sm text-gray-500">
                        {student.category}
                      </div>
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(student.hostelStatus)}`}>
                        {student.hostelStatus || 'Active'}
                      </span>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-white px-3 sm:px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-3 sm:px-4 py-2 border border-gray-300 text-xs sm:text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="ml-3 relative inline-flex items-center px-3 sm:px-4 py-2 border border-gray-300 text-xs sm:text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-700">
                  Showing <span className="font-medium">{(currentPage - 1) * 10 + 1}</span> to{' '}
                  <span className="font-medium">
                    {Math.min(currentPage * 10, totalStudents)}
                  </span>{' '}
                  of <span className="font-medium">{totalStudents}</span> results
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-xs sm:text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                  >
                    <ChevronLeftIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`relative inline-flex items-center px-3 sm:px-4 py-2 border text-xs sm:text-sm font-medium touch-manipulation ${
                        page === currentPage
                          ? 'z-10 bg-purple-50 border-purple-500 text-purple-600'
                          : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-xs sm:text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                  >
                    <ChevronRightIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Student Details Modal */}
      {studentDetailsModal && selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-6xl w-full max-h-[95vh] overflow-hidden">
            {/* Header */}
            <div className="flex justify-between items-center p-4 sm:p-6 border-b border-gray-200">
              <h3 className="text-lg sm:text-xl font-bold text-gray-800">Student Details</h3>
              <button
                onClick={closeStudentDetailsModal}
                className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-lg touch-manipulation"
              >
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(95vh-140px)]">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                {/* Left Column - Photo and Basic Info */}
                <div className="lg:col-span-1">
                  {/* Student Photo */}
                  <div className="flex justify-center mb-4 sm:mb-6">
                    {selectedStudent.studentPhoto ? (
                      <img
                        src={selectedStudent.studentPhoto}
                        alt={selectedStudent.name}
                        className="w-32 h-32 sm:w-40 sm:h-40 rounded-full object-cover border-4 border-gray-200 shadow-lg"
                      />
                    ) : (
                      <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full bg-gradient-to-br from-purple-600 to-purple-800 flex items-center justify-center text-white text-2xl sm:text-4xl font-bold shadow-lg">
                        {selectedStudent.name?.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* Basic Information */}
                  <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                    <h4 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">Basic Information</h4>
                    <div className="space-y-2 sm:space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs sm:text-sm text-gray-600">Name:</span>
                        <span className="font-medium text-gray-900 text-xs sm:text-sm">{selectedStudent.name}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs sm:text-sm text-gray-600">Roll Number:</span>
                        <span className="font-medium text-gray-900 text-xs sm:text-sm">{selectedStudent.rollNumber}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs sm:text-sm text-gray-600">Hostel ID:</span>
                        <span className="font-medium text-gray-900 text-xs sm:text-sm">{selectedStudent.hostelId || 'Not assigned'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs sm:text-sm text-gray-600">Gender:</span>
                        <span className="font-medium text-gray-900 text-xs sm:text-sm">{selectedStudent.gender}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Columns - Academic, Contact, and Hostel Info */}
                <div className="lg:col-span-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                    {/* Academic Information */}
                    <div className="bg-purple-50 rounded-lg p-3 sm:p-4">
                      <h4 className="text-base sm:text-lg font-semibold text-purple-800 mb-3 sm:mb-4 flex items-center">
                        <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                        Academic Information
                      </h4>
                      <div className="space-y-2 sm:space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-xs sm:text-sm text-purple-700">Course:</span>
                          <span className="font-medium text-purple-900 text-xs sm:text-sm">{selectedStudent.course?.name || selectedStudent.course}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs sm:text-sm text-purple-700">Branch:</span>
                          <span className="font-medium text-purple-900 text-xs sm:text-sm">{selectedStudent.branch?.name || selectedStudent.branch}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs sm:text-sm text-purple-700">Year:</span>
                          <span className="font-medium text-purple-900 text-xs sm:text-sm">Year {selectedStudent.year}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs sm:text-sm text-purple-700">Category:</span>
                          <span className="font-medium text-purple-900 text-xs sm:text-sm">{selectedStudent.category === 'A+' ? 'A+ (AC)' : selectedStudent.category === 'B+' ? 'B+ (AC)' : selectedStudent.category}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs sm:text-sm text-purple-700">Batch:</span>
                          <span className="font-medium text-purple-900 text-xs sm:text-sm">{selectedStudent.batch}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs sm:text-sm text-purple-700">Academic Year:</span>
                          <span className="font-medium text-purple-900 text-xs sm:text-sm">{selectedStudent.academicYear}</span>
                        </div>
                      </div>
                    </div>

                    {/* Contact Information */}
                    <div className="bg-green-50 rounded-lg p-3 sm:p-4">
                      <h4 className="text-base sm:text-lg font-semibold text-green-800 mb-3 sm:mb-4 flex items-center">
                        <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        Contact Information
                      </h4>
                      <div className="space-y-2 sm:space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-xs sm:text-sm text-green-700">Student Phone:</span>
                          <span className="font-medium text-green-900 text-xs sm:text-sm">{selectedStudent.studentPhone}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs sm:text-sm text-green-700">Parent Phone:</span>
                          <span className="font-medium text-green-900 text-xs sm:text-sm">{selectedStudent.parentPhone}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs sm:text-sm text-green-700">Email:</span>
                          <span className="font-medium text-green-900 break-all text-xs sm:text-sm">{selectedStudent.email}</span>
                        </div>
                      </div>
                    </div>

                    {/* Hostel Information */}
                    <div className="bg-purple-50 rounded-lg p-3 sm:p-4">
                      <h4 className="text-base sm:text-lg font-semibold text-purple-800 mb-3 sm:mb-4 flex items-center">
                        <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        Hostel Information
                      </h4>
                      <div className="space-y-2 sm:space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-xs sm:text-sm text-purple-700">Room Number:</span>
                          <span className="font-medium text-purple-900 text-xs sm:text-sm">Room {selectedStudent.roomNumber}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs sm:text-sm text-purple-700">Hostel Status:</span>
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            selectedStudent.hostelStatus === 'Active' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {selectedStudent.hostelStatus}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs sm:text-sm text-purple-700">Graduation Status:</span>
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            selectedStudent.graduationStatus === 'Graduated' 
                              ? 'bg-blue-100 text-blue-800' 
                              : selectedStudent.graduationStatus === 'Dropped'
                              ? 'bg-gray-100 text-gray-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {selectedStudent.graduationStatus}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 p-4 sm:p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={closeStudentDetailsModal}
                className="px-3 sm:px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center text-xs sm:text-sm font-medium touch-manipulation"
              >
                <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Photo Modal */}
      {photoModal.open && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-3 sm:px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={closePhotoModal}></div>
            </div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-3 sm:px-4 pt-4 sm:pt-5 pb-3 sm:pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                    <h3 className="text-base sm:text-lg leading-6 font-medium text-gray-900 mb-3 sm:mb-4">
                      {photoModal.name || 'Student Photo'}
                    </h3>
                    <div className="flex justify-center">
                      <img
                        src={photoModal.src}
                        alt={photoModal.name || 'Student Photo'}
                        className="max-w-full max-h-64 sm:max-h-96 object-contain rounded-lg"
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-3 sm:px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={closePhotoModal}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-3 sm:px-4 py-2 bg-purple-600 text-xs sm:text-sm font-medium text-white hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 sm:ml-3 sm:w-auto touch-manipulation"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PrincipalStudents; 