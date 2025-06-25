import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  MegaphoneIcon,
  UsersIcon,
  MagnifyingGlassIcon,
  UserGroupIcon,
  CalendarIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';
import api from '../../utils/axios';
import toast from 'react-hot-toast';
import LoadingSpinner from '../../components/LoadingSpinner';
import SEO from '../../components/SEO';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const WardenDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [announcements, setAnnouncements] = useState([]);
  const [students, setStudents] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalStudents, setTotalStudents] = useState(0);
  const [filters, setFilters] = useState({
    search: '',
    course: '',
    branch: '',
    gender: '',
    category: '',
    roomNumber: '',
    batch: '',
    academicYear: '',
    hostelStatus: 'Active'
  });

  // Bulk outing states
  const [showBulkOuting, setShowBulkOuting] = useState(true);
  const [bulkOutingStudents, setBulkOutingStudents] = useState([]);
  const [selectedBulkStudents, setSelectedBulkStudents] = useState([]);
  const [bulkOutingLoading, setBulkOutingLoading] = useState(false);
  const [submittingBulkOuting, setSubmittingBulkOuting] = useState(false);
  const [bulkOutings, setBulkOutings] = useState([]);
  const [showBulkHistory, setShowBulkHistory] = useState(false);
  
  // Bulk outing form data
  const [bulkOutingForm, setBulkOutingForm] = useState({
    outingDate: '',
    reason: ''
  });
  
  // Bulk outing filters
  const [bulkOutingFilters, setBulkOutingFilters] = useState({
    course: '',
    branch: '',
    gender: '',
    category: '',
    roomNumber: '',
    batch: '',
    academicYear: '',
    hostelStatus: 'Active'
  });

  const { logout, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardData();
    fetchStudents();
    fetchBulkOutings();
  }, []);

  useEffect(() => {
    if (showBulkOuting) {
      fetchBulkOutingStudents();
    }
  }, [bulkOutingFilters]);

  const fetchDashboardData = async () => {
    try {
      // Fetch announcements using warden-specific endpoint
      const announcementsRes = await api.get('/api/announcements/warden');

      if (announcementsRes.data.success) {
        setAnnouncements(announcementsRes.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    setStudentsLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage,
        limit: 10
      });

      // Add filters only if they have values
      if (filters.search) params.append('search', filters.search);
      if (filters.course) params.append('course', filters.course);
      if (filters.branch) params.append('branch', filters.branch);
      if (filters.gender) params.append('gender', filters.gender);
      if (filters.category) params.append('category', filters.category);
      if (filters.roomNumber) params.append('roomNumber', filters.roomNumber);
      if (filters.batch) params.append('batch', filters.batch);
      if (filters.academicYear) params.append('academicYear', filters.academicYear);
      if (filters.hostelStatus) params.append('hostelStatus', filters.hostelStatus);

      const res = await api.get(`/api/admin/warden/students?${params}`);
      if (res.data.success) {
        setStudents(res.data.data.students || []);
        setTotalPages(res.data.data.totalPages || 1);
        setTotalStudents(res.data.data.totalStudents || 0);
      } else {
        throw new Error(res.data.message || 'Failed to fetch students');
      }
    } catch (error) {
      console.error('Error fetching students:', error);
      toast.error('Failed to fetch students');
      setStudents([]);
      setTotalPages(1);
      setTotalStudents(0);
    } finally {
      setStudentsLoading(false);
    }
  };

  const fetchBulkOutingStudents = async () => {
    setBulkOutingLoading(true);
    try {
      const params = new URLSearchParams();
      Object.keys(bulkOutingFilters).forEach(key => {
        if (bulkOutingFilters[key]) {
          params.append(key, bulkOutingFilters[key]);
        }
      });

      const response = await api.get(`/api/bulk-outing/warden/students?${params}`);
      if (response.data.success) {
        setBulkOutingStudents(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching bulk outing students:', error);
      toast.error('Failed to fetch students');
    } finally {
      setBulkOutingLoading(false);
    }
  };

  const fetchBulkOutings = async () => {
    try {
      const response = await api.get('/api/bulk-outing/warden');
      if (response.data.success) {
        setBulkOutings(response.data.data.bulkOutings);
      }
    } catch (error) {
      console.error('Error fetching bulk outings:', error);
      toast.error('Failed to fetch bulk outing history');
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
    setCurrentPage(1); // Reset to first page when filters change
  };

  const handleBulkOutingFilterChange = (e) => {
    const { name, value } = e.target;
    setBulkOutingFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleBulkOutingFormChange = (e) => {
    const { name, value } = e.target;
    setBulkOutingForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  const handleStudentSelect = (studentId) => {
    setSelectedBulkStudents(prev => {
      if (prev.includes(studentId)) {
        return prev.filter(id => id !== studentId);
      } else {
        return [...prev, studentId];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedBulkStudents.length === bulkOutingStudents.length) {
      setSelectedBulkStudents([]);
    } else {
      setSelectedBulkStudents(bulkOutingStudents.map(student => student._id));
    }
  };

  const handleBulkOutingSubmit = async (e) => {
    e.preventDefault();
    
    if (!bulkOutingForm.outingDate || !bulkOutingForm.reason) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (selectedBulkStudents.length === 0) {
      toast.error('Please select at least one student');
      return;
    }

    setSubmittingBulkOuting(true);
    try {
      const response = await api.post('/api/bulk-outing/create', {
        outingDate: bulkOutingForm.outingDate,
        reason: bulkOutingForm.reason,
        selectedStudentIds: selectedBulkStudents,
        filters: bulkOutingFilters
      });

      if (response.data.success) {
        toast.success(`Bulk outing request created for ${selectedBulkStudents.length} students`);
        setBulkOutingForm({ outingDate: '', reason: '' });
        setSelectedBulkStudents([]);
        fetchBulkOutings();
        setShowBulkOuting(false);
      }
    } catch (error) {
      console.error('Error creating bulk outing:', error);
      toast.error(error.response?.data?.message || 'Failed to create bulk outing request');
    } finally {
      setSubmittingBulkOuting(false);
    }
  };

  // Clear selected students when filters change
  useEffect(() => {
    setSelectedBulkStudents([]);
  }, [bulkOutingFilters]);

  // Clear selected students when form is hidden
  useEffect(() => {
    if (!showBulkOuting) {
      setSelectedBulkStudents([]);
    }
  }, [showBulkOuting]);

  useEffect(() => {
    fetchStudents();
  }, [currentPage, filters]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'Approved':
        return 'text-green-600 bg-green-50';
      case 'Rejected':
        return 'text-red-600 bg-red-50';
      case 'Pending':
        return 'text-yellow-600 bg-yellow-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Approved':
        return <CheckCircleIcon className="w-5 h-5" />;
      case 'Rejected':
        return <XCircleIcon className="w-5 h-5" />;
      case 'Pending':
        return <ExclamationCircleIcon className="w-5 h-5" />;
      default:
        return null;
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <SEO title="Warden Dashboard" />
      
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-900 to-blue-700 bg-clip-text text-transparent">
              Warden Dashboard
            </h1>
            <p className="text-gray-600 mt-2">
              Welcome back! Here's an overview of hostel announcements and student management.
            </p>
          </div>
          <button
            onClick={() => { logout(); navigate('/login'); }}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium shadow"
            title="Logout"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Two-column grid: Bulk Outing left (wide), Announcements right (narrow) */}
      <div className="mb-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Bulk Outing Section (left, wide) */}
        <div className="lg:col-span-2 order-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <UserGroupIcon className="w-5 h-5 text-purple-600" />
                <h3 className="font-semibold text-gray-900">Bulk Outing Management</h3>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { setShowBulkOuting(true); setShowBulkHistory(false); }}
                  className={`px-3 py-1 text-sm rounded-lg font-medium transition-colors ${showBulkOuting ? 'bg-purple-700 text-white' : 'bg-purple-100 text-purple-700 hover:bg-purple-200'}`}
                >
                  Create Outing
                </button>
                <button
                  onClick={() => { setShowBulkHistory(true); setShowBulkOuting(false); }}
                  className={`px-3 py-1 text-sm rounded-lg font-medium transition-colors ${showBulkHistory ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  View History
                </button>
              </div>
            </div>
            {/* Show either the form or the history, not both */}
            {showBulkOuting && (
              <div className="mb-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
                <h4 className="font-medium text-purple-900 mb-4">Create Bulk Outing Request</h4>
                
                <form onSubmit={handleBulkOutingSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Outing Date *
                      </label>
                      <input
                        type="date"
                        name="outingDate"
                        value={bulkOutingForm.outingDate}
                        onChange={handleBulkOutingFormChange}
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Reason *
                      </label>
                      <input
                        type="text"
                        name="reason"
                        value={bulkOutingForm.reason}
                        onChange={handleBulkOutingFormChange}
                        placeholder="Enter outing reason..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        required
                      />
                    </div>
                  </div>

                  {/* Student Filters */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h5 className="text-sm font-medium text-gray-700">Filter Students</h5>
                      <button
                        type="button"
                        onClick={fetchBulkOutingStudents}
                        disabled={bulkOutingLoading}
                        className="px-3 py-1 text-sm bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 disabled:opacity-50 transition-colors"
                      >
                        {bulkOutingLoading ? 'Loading...' : 'Refresh'}
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <select
                        name="course"
                        value={bulkOutingFilters.course}
                        onChange={handleBulkOutingFilterChange}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      >
                        <option value="">All Courses</option>
                        <option value="B.Tech">B.Tech</option>
                        <option value="Diploma">Diploma</option>
                        <option value="Pharmacy">Pharmacy</option>
                        <option value="Degree">Degree</option>
                      </select>
                      <select
                        name="gender"
                        value={bulkOutingFilters.gender}
                        onChange={handleBulkOutingFilterChange}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      >
                        <option value="">All Genders</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                      </select>
                      <select
                        name="hostelStatus"
                        value={bulkOutingFilters.hostelStatus}
                        onChange={handleBulkOutingFilterChange}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      >
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                        <option value="">All Status</option>
                      </select>
                    </div>
                  </div>

                  {/* Student Selection */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="block text-sm font-medium text-gray-700">
                        Select Students ({selectedBulkStudents.length} selected)
                      </label>
                      <button
                        type="button"
                        onClick={handleSelectAll}
                        className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                      >
                        {selectedBulkStudents.length === bulkOutingStudents.length && bulkOutingStudents.length > 0 ? 'Deselect All' : 'Select All'}
                      </button>
                    </div>

                    {bulkOutingLoading ? (
                      <div className="flex justify-center py-4">
                        <LoadingSpinner />
                      </div>
                    ) : (
                      <div className="max-h-48 overflow-y-auto border border-gray-300 rounded-lg p-2 space-y-2">
                        {bulkOutingStudents.length > 0 ? (
                          bulkOutingStudents.map((student) => (
                            <div
                              key={student._id}
                              className={`flex items-center p-2 rounded-lg border-2 cursor-pointer transition-all ${
                                selectedBulkStudents.includes(student._id)
                                  ? 'border-purple-500 bg-purple-50'
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                              onClick={() => handleStudentSelect(student._id)}
                            >
                              <input
                                type="checkbox"
                                checked={selectedBulkStudents.includes(student._id)}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  handleStudentSelect(student._id);
                                }}
                                className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                              />
                              <div className="ml-3 flex-1">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="text-sm font-medium text-gray-900">{student.name}</p>
                                    <p className="text-xs text-gray-500">{student.rollNumber}</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-xs text-gray-600">{student.course} - {student.branch}</p>
                                    <p className="text-xs text-gray-500">Room {student.roomNumber}</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-4 text-gray-500">
                            <UserGroupIcon className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                            <p className="text-sm">No students found with current filters</p>
                            <p className="text-xs text-gray-400 mt-1">Try adjusting your filters</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-center">
                    <div className="text-sm text-gray-600">
                      {selectedBulkStudents.length > 0 && (
                        <span className="text-purple-600 font-medium">
                          {selectedBulkStudents.length} student{selectedBulkStudents.length !== 1 ? 's' : ''} selected
                        </span>
                      )}
                    </div>
                    <button
                      type="submit"
                      disabled={submittingBulkOuting || selectedBulkStudents.length === 0 || !bulkOutingForm.outingDate || !bulkOutingForm.reason}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {submittingBulkOuting ? (
                        <div className="flex items-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Creating...
                        </div>
                      ) : (
                        `Create Outing (${selectedBulkStudents.length} students)`
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {showBulkHistory && (
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Bulk Outing History</h4>
                
                {bulkOutings.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <CalendarIcon className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                    <p>No bulk outing requests found</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {bulkOutings.map((outing) => (
                      <div key={outing._id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(outing.status)}`}>
                              {getStatusIcon(outing.status)}
                              <span className="ml-1">{outing.status}</span>
                            </span>
                            <span className="text-sm text-gray-500">
                              {new Date(outing.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="text-sm text-gray-500">
                            {outing.studentCount} students
                          </div>
                        </div>
                        
                        <div className="mb-2">
                          <p className="text-sm font-medium text-gray-900">
                            Date: {new Date(outing.outingDate).toLocaleDateString()}
                          </p>
                          <p className="text-sm text-gray-600">{outing.reason}</p>
                        </div>
                        
                        {outing.status === 'Rejected' && outing.rejectionReason && (
                          <div className="p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                            <strong>Rejection Reason:</strong> {outing.rejectionReason}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        {/* Announcements Section (right, narrow) */}
        <div className="lg:col-span-1 order-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <MegaphoneIcon className="w-5 h-5 text-indigo-600" />
                <h3 className="font-semibold text-gray-900">Latest Announcements</h3>
              </div>
              <button 
                onClick={() => window.location.href = '/warden/announcements'}
                className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
              >
                View All
              </button>
            </div>
            <div className="space-y-4">
              {announcements.length === 0 ? (
                <div className="text-center py-8">
                  <MegaphoneIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500">No announcements</p>
                </div>
              ) : (
                announcements.slice(0, 5).map((announcement) => (
                  <div key={announcement._id} className="p-4 bg-gray-50 rounded-lg flex flex-col gap-2">
                    {announcement.imageUrl && (
                      <img
                        src={announcement.imageUrl}
                        alt={announcement.title}
                        className="w-full h-32 object-cover rounded mb-2 border"
                        style={{ maxHeight: '130px' }}
                      />
                    )}
                    <h4 className="font-medium text-gray-900 mb-1">{announcement.title}</h4>
                    <p className="text-sm text-gray-600 line-clamp-2">{announcement.description}</p>
                    <p className="text-xs text-gray-500 mt-2">
                      {new Date(announcement.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Student Management Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <UsersIcon className="w-5 h-5 text-green-600" />
            <h3 className="font-semibold text-gray-900">Student Management</h3>
          </div>
          <div className="text-sm text-gray-500">
            Total Students: {totalStudents}
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="relative">
            <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              name="search"
              placeholder="Search by name or roll number..."
              value={filters.search}
              onChange={handleFilterChange}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            name="course"
            value={filters.course}
            onChange={handleFilterChange}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Courses</option>
            <option value="B.Tech">B.Tech</option>
            <option value="Diploma">Diploma</option>
            <option value="Pharmacy">Pharmacy</option>
            <option value="Degree">Degree</option>
          </select>
          <select
            name="gender"
            value={filters.gender}
            onChange={handleFilterChange}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Genders</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
          <select
            name="hostelStatus"
            value={filters.hostelStatus}
            onChange={handleFilterChange}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
            <option value="">All Status</option>
          </select>
        </div>

        {/* Students Table */}
        {studentsLoading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner />
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
                    Course & Branch
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Room & Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {students.map((student) => (
                  <tr key={student._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          {student.studentPhoto ? (
                            <img
                              className="h-10 w-10 rounded-full object-cover"
                              src={student.studentPhoto}
                              alt={student.name}
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                              <span className="text-sm font-medium text-gray-700">
                                {student.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{student.name}</div>
                          <div className="text-sm text-gray-500">{student.rollNumber}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{student.course}</div>
                      <div className="text-sm text-gray-500">{student.branch} - Year {student.year}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">Room {student.roomNumber}</div>
                      <div className="text-sm text-gray-500">{student.category}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{student.studentPhone}</div>
                      <div className="text-sm text-gray-500">{student.parentPhone}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        student.hostelStatus === 'Active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {student.hostelStatus || 'Active'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {students.length === 0 && (
              <div className="text-center py-8">
                <UsersIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500">No students found</p>
              </div>
            )}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <div className="text-sm text-gray-700">
              Showing page {currentPage} of {totalPages}
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Previous
              </button>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-8 text-center">
        <p className="text-sm text-gray-500">
          Last updated: {new Date().toLocaleString()}
        </p>
      </div>
    </div>
  );
};

export default WardenDashboard;
