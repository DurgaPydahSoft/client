import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/axios';
import toast from 'react-hot-toast';
import {
  UserPlusIcon,
  EyeIcon,
  CheckIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  CalendarIcon,
  PhoneIcon,
  EnvelopeIcon,
  AcademicCapIcon,
  HomeIcon,
  CameraIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';
import LoadingSpinner from '../../components/LoadingSpinner';
import SEO from '../../components/SEO';
import { useAuth } from '../../context/AuthContext';

const PreRegistrationRequests = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [preregistrations, setPreregistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Rejection form data
  const [rejectionData, setRejectionData] = useState({
    reason: ''
  });

  // Room mappings for validation
  const ROOM_MAPPINGS = {
    Male: {
      'A+': ['302', '309', '310', '311', '312'],
      'A': ['303', '304', '305', '306', '308', '320', '324', '325'],
      'B+': ['321'],
      'B': ['314', '315', '316', '317', '322', '323']
    },
    Female: {
      'A+': ['209', '211', '212', '213', '214', '215'],
      'A': ['103', '115', '201', '202', '203', '204', '205', '206', '207', '208', '216', '217'],
      'B': ['101', '102', '104', '105', '106', '108', '109', '111', '112', '114'],
      'C': ['117']
    }
  };

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800'
  };

  const statusIcons = {
    pending: ClockIcon,
    approved: CheckCircleIcon,
    rejected: XCircleIcon
  };

  useEffect(() => {
    fetchPreregistrations();
  }, [currentPage, statusFilter, searchTerm]);

  const fetchPreregistrations = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage,
        limit: 10,
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(searchTerm && { search: searchTerm })
      });

      const response = await api.get(`/api/student/preregistrations?${params}`);
      setPreregistrations(response.data.data);
      setTotalPages(response.data.pagination.pages);
      setTotalCount(response.data.pagination.total);
    } catch (error) {
      toast.error('Failed to fetch preregistration requests');
      console.error('Error fetching preregistrations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (id) => {
    try {
      const response = await api.get(`/api/student/preregistrations/${id}`);
      setSelectedRequest(response.data.data);
      setShowModal(true);
    } catch (error) {
      toast.error('Failed to fetch request details');
    }
  };

  const handleApprove = (request) => {
    // Navigate to Students page with prefilled data
    const prefilledData = {
      name: request.name,
      rollNumber: request.rollNumber,
      gender: request.gender,
      course: request.course?._id || request.course,
      year: request.year,
      branch: request.branch?._id || request.branch,
      batch: request.batch,
      academicYear: request.academicYear,
      studentPhone: request.studentPhone,
      parentPhone: request.parentPhone,
      motherName: request.motherName,
      motherPhone: request.motherPhone,
      localGuardianName: request.localGuardianName,
      localGuardianPhone: request.localGuardianPhone,
      email: request.email,
      mealType: request.mealType,
      parentPermissionForOuting: request.parentPermissionForOuting,
      studentPhoto: request.studentPhoto,
      guardianPhoto1: request.guardianPhoto1,
      guardianPhoto2: request.guardianPhoto2,
      // These will need to be filled by admin
      category: '',
      roomNumber: '',
      bedNumber: '',
      lockerNumber: '',
      concession: 0
    };

    // Store the prefilled data in sessionStorage for the Students component to pick up
    sessionStorage.setItem('preregistrationData', JSON.stringify(prefilledData));
    
    // Navigate to Students page with add tab
    navigate('/admin/dashboard/students?tab=add');
    
    toast.success('Navigating to Add Student form with prefilled data');
  };

  const handleReject = (request) => {
    setSelectedRequest(request);
    setRejectionData({ reason: '' });
    setShowRejectionModal(true);
  };


  const submitRejection = async () => {
    if (!rejectionData.reason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    try {
      setActionLoading(true);
      await api.post(`/api/student/preregistrations/${selectedRequest._id}/reject`, rejectionData);
      toast.success('Pre-registration rejected successfully');
      setShowRejectionModal(false);
      setShowModal(false);
      fetchPreregistrations();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reject preregistration');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this preregistration request?')) {
      return;
    }

    try {
      await api.delete(`/api/student/preregistrations/${id}`);
      toast.success('Pre-registration deleted successfully');
      fetchPreregistrations();
    } catch (error) {
      toast.error('Failed to delete preregistration');
    }
  };


  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const StatusBadge = ({ status }) => {
    const Icon = statusIcons[status];
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[status]}`}>
        <Icon className="w-3 h-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SEO title="Pre-Registration Requests" description="Manage student preregistration requests" />
      
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <div className="p-1.5 bg-blue-100 rounded-md">
                <UserPlusIcon className="h-5 w-5 text-blue-600" />
              </div>
              Pre-Registration Requests
            </h1>
            <p className="text-sm text-gray-600 mt-1">Manage student preregistration requests and approvals</p>
          </div>
          <div className="mt-3 sm:mt-0 flex items-center gap-3">
            <div className="text-center">
              <div className="text-lg font-bold text-blue-600">{totalCount}</div>
              <div className="text-xs text-gray-500">Total</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-yellow-600">
                {preregistrations.filter(r => r.status === 'pending').length}
              </div>
              <div className="text-xs text-gray-500">Pending</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-700 mb-1">Search Requests</label>
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search by name, roll number, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
            </div>
          </div>
          <div className="lg:w-48">
            <label className="block text-xs font-medium text-gray-700 mb-1">Filter by Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {/* Requests Cards */}
      <div className="space-y-3">
        {preregistrations.length === 0 ? (
          <div className="text-center py-6 bg-white rounded-lg shadow-sm border border-gray-200">
            <UserPlusIcon className="mx-auto h-8 w-8 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No preregistration requests</h3>
            <p className="mt-1 text-xs text-gray-500">
              {searchTerm || statusFilter !== 'all' 
                ? 'No requests match your current filters.' 
                : 'No students have submitted preregistration requests yet.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
            {preregistrations.map((request) => (
              <motion.div
                key={request._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200"
              >
                {/* Card Header */}
                <div className="p-4 border-b border-gray-100">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      {request.studentPhoto ? (
                        <img
                          className="h-12 w-12 rounded-full object-cover border border-gray-200"
                          src={request.studentPhoto}
                          alt={request.name}
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center border border-gray-200">
                          <UserPlusIcon className="h-6 w-6 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-gray-900 truncate">{request.name}</h3>
                      <p className="text-xs text-gray-500 font-mono">{request.rollNumber}</p>
                      <div className="mt-1">
                        <StatusBadge status={request.status} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-4 space-y-2">
                  {/* Academic Info */}
                  <div className="space-y-1">
                    <div className="flex items-center text-xs">
                      <AcademicCapIcon className="h-3 w-3 text-gray-400 mr-1.5" />
                      <span className="text-gray-500">Course:</span>
                      <span className="ml-1.5 font-medium text-gray-900 truncate">{request.course?.name}</span>
                    </div>
                    <div className="flex items-center text-xs">
                      <span className="text-gray-500 ml-5">Branch:</span>
                      <span className="ml-1.5 font-medium text-gray-900 truncate">{request.branch?.name}</span>
                    </div>
                    <div className="flex items-center text-xs">
                      <span className="text-gray-500 ml-5">Year:</span>
                      <span className="ml-1.5 font-medium text-gray-900">{request.year}</span>
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="space-y-1">
                    <div className="flex items-center text-xs">
                      <PhoneIcon className="h-3 w-3 text-gray-400 mr-1.5" />
                      <span className="text-gray-500">Phone:</span>
                      <span className="ml-1.5 font-medium text-gray-900">{request.studentPhone}</span>
                    </div>
                    {request.email && (
                      <div className="flex items-center text-xs">
                        <EnvelopeIcon className="h-3 w-3 text-gray-400 mr-1.5" />
                        <span className="text-gray-500">Email:</span>
                        <span className="ml-1.5 font-medium text-gray-900 truncate">{request.email}</span>
                      </div>
                    )}
                  </div>

                  {/* Submission Info */}
                  <div className="flex items-center text-xs text-gray-500">
                    <CalendarIcon className="h-3 w-3 mr-1.5" />
                    <span>Submitted: {formatDate(request.submittedAt)}</span>
                  </div>
                </div>

                {/* Card Footer - Actions */}
                <div className="px-4 py-3 bg-gray-50 rounded-b-lg">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => handleViewDetails(request._id)}
                      className="flex items-center px-2 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
                    >
                      <EyeIcon className="h-3 w-3 mr-1" />
                      View
                    </button>
                    
                    <div className="flex items-center space-x-1">
                      {request.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleApprove(request)}
                            className="flex items-center px-2 py-1.5 text-xs font-medium text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors"
                          >
                            <CheckIcon className="h-3 w-3 mr-1" />
                            Approve
                          </button>
                          <button
                            onClick={() => handleReject(request)}
                            className="flex items-center px-2 py-1.5 text-xs font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors"
                          >
                            <XMarkIcon className="h-3 w-3 mr-1" />
                            Reject
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleDelete(request._id)}
                        className="flex items-center px-2 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                      >
                        <XMarkIcon className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="text-xs text-gray-700">
              Showing page <span className="font-semibold">{currentPage}</span> of <span className="font-semibold">{totalPages}</span>
              <span className="ml-1 text-gray-500">({totalCount} total)</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="flex items-center px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
              >
                <ChevronLeftIcon className="h-3 w-3 mr-1" />
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="flex items-center px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
              >
                Next
                <ChevronRightIcon className="h-3 w-3 ml-1" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      <AnimatePresence>
        {showModal && selectedRequest && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900">Pre-Registration Details</h2>
                  <button
                    onClick={() => setShowModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XMarkIcon className="w-6 h-6" />
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Personal Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <UserPlusIcon className="w-5 h-5" />
                      Personal Information
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Name</label>
                        <p className="text-gray-900">{selectedRequest.name}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Roll Number</label>
                        <p className="text-gray-900">{selectedRequest.rollNumber}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Gender</label>
                        <p className="text-gray-900">{selectedRequest.gender}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Email</label>
                        <p className="text-gray-900">{selectedRequest.email || 'Not provided'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Academic Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <AcademicCapIcon className="w-5 h-5" />
                      Academic Information
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Course</label>
                        <p className="text-gray-900">{selectedRequest.course?.name}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Branch</label>
                        <p className="text-gray-900">{selectedRequest.branch?.name}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Year</label>
                        <p className="text-gray-900">{selectedRequest.year}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Batch</label>
                        <p className="text-gray-900">{selectedRequest.batch}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Academic Year</label>
                        <p className="text-gray-900">{selectedRequest.academicYear}</p>
                      </div>
                    </div>
                  </div>

                  {/* Contact Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <PhoneIcon className="w-5 h-5" />
                      Contact Information
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Student Phone</label>
                        <p className="text-gray-900">{selectedRequest.studentPhone}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Parent Phone</label>
                        <p className="text-gray-900">{selectedRequest.parentPhone}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Mother Name</label>
                        <p className="text-gray-900">{selectedRequest.motherName || 'Not provided'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Mother Phone</label>
                        <p className="text-gray-900">{selectedRequest.motherPhone || 'Not provided'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Local Guardian</label>
                        <p className="text-gray-900">
                          {selectedRequest.localGuardianName || 'Not provided'}
                          {selectedRequest.localGuardianPhone && ` (${selectedRequest.localGuardianPhone})`}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Preferences & Photos */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <HomeIcon className="w-5 h-5" />
                      Preferences & Photos
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Meal Type</label>
                        <p className="text-gray-900 capitalize">{selectedRequest.mealType}</p>
                      </div>
                    </div>

                    {/* Photos */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium text-gray-700">Photos</h4>
                      <div className="grid grid-cols-3 gap-3">
                        {selectedRequest.studentPhoto && (
                          <div className="text-center">
                            <img
                              src={selectedRequest.studentPhoto}
                              alt="Student"
                              className="w-20 h-20 rounded-lg object-cover mx-auto"
                            />
                            <p className="text-xs text-gray-500 mt-1">Student</p>
                          </div>
                        )}
                        {selectedRequest.guardianPhoto1 && (
                          <div className="text-center">
                            <img
                              src={selectedRequest.guardianPhoto1}
                              alt="Guardian 1"
                              className="w-20 h-20 rounded-lg object-cover mx-auto"
                            />
                            <p className="text-xs text-gray-500 mt-1">Guardian 1</p>
                          </div>
                        )}
                        {selectedRequest.guardianPhoto2 && (
                          <div className="text-center">
                            <img
                              src={selectedRequest.guardianPhoto2}
                              alt="Guardian 2"
                              className="w-20 h-20 rounded-lg object-cover mx-auto"
                            />
                            <p className="text-xs text-gray-500 mt-1">Guardian 2</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                {selectedRequest.status === 'pending' && (
                  <div className="mt-6 flex justify-end gap-3">
                    <button
                      onClick={() => handleReject(selectedRequest)}
                      className="px-4 py-2 text-sm font-medium text-red-700 bg-red-100 border border-red-300 rounded-md hover:bg-red-200"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => handleApprove(selectedRequest)}
                      className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700"
                    >
                      Approve & Add Student
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>


      {/* Rejection Modal */}
      <AnimatePresence>
        {showRejectionModal && selectedRequest && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-lg shadow-xl max-w-md w-full"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Reject Registration</h3>
                  <button
                    onClick={() => setShowRejectionModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Reason for Rejection *
                    </label>
                    <textarea
                      value={rejectionData.reason}
                      onChange={(e) => setRejectionData(prev => ({ ...prev, reason: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      rows="4"
                      placeholder="Please provide a reason for rejection..."
                      required
                    />
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    onClick={() => setShowRejectionModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
                    disabled={actionLoading}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={submitRejection}
                    disabled={actionLoading}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 disabled:opacity-50"
                  >
                    {actionLoading ? 'Rejecting...' : 'Reject Registration'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PreRegistrationRequests;
