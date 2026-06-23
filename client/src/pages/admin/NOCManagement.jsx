import React, { useState, useEffect } from 'react';
import api from '../../utils/axios';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { 
  DocumentTextIcon, 
  ClockIcon, 
  CheckCircleIcon, 
  XCircleIcon,
  EyeIcon,
  UserIcon,
  FunnelIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  InformationCircleIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import LoadingSpinner from '../../components/LoadingSpinner';

const NOCManagement = () => {
  const [activeTab, setActiveTab] = useState('requests'); // 'requests' or 'process'
  
  // NOC Requests state
  const [nocRequests, setNocRequests] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [action, setAction] = useState(''); // 'approve', 'reject', or 'view'
  const [remarks, setRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Create NOC on behalf of student state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [students, setStudents] = useState([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [nocReason, setNocReason] = useState('');
  const [vacatingDate, setVacatingDate] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [selectedAY, setSelectedAY] = useState('');

  const getDefaultAcademicYear = () => {
    const year = new Date().getFullYear();
    return `${year}-${year + 1}`;
  };

  const generateAcademicYears = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = -3; i <= 3; i++) {
      const year = currentYear + i;
      years.push(`${year}-${year + 1}`);
    }
    return years;
  };

  useEffect(() => {
    if (activeTab === 'requests') {
      fetchNOCRequests();
      fetchStats();
    }
  }, [filter, activeTab]);

  // Fetch students when create modal is open and search or selectedAY changes
  useEffect(() => {
    if (showCreateModal && selectedAY) {
      fetchStudents();
    } else {
      setStudents([]);
    }
  }, [showCreateModal, studentSearch, selectedAY]);

  const fetchStudents = async () => {
    if (!selectedAY) {
      setStudents([]);
      return;
    }
    setLoadingStudents(true);
    try {
      const params = new URLSearchParams();
      if (studentSearch) params.append('search', studentSearch);
      params.append('academicYear', selectedAY);
      
      const response = await api.get(`/api/noc/admin/students?${params.toString()}`);
      if (response.data.success) {
        setStudents(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
      toast.error('Failed to fetch students');
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleCreateNOC = async () => {
    if (!selectedStudent) {
      toast.error('Please select a student');
      return;
    }
    if (!nocReason.trim() || nocReason.trim().length < 10) {
      toast.error('Please enter a valid reason (at least 10 characters)');
      return;
    }

    if (!vacatingDate) {
      toast.error('Please select a vacating date');
      return;
    }

    // Allow any date (past or future) for vacating date

    setIsCreating(true);
    try {
      const response = await api.post('/api/noc/admin/create', {
        studentId: selectedStudent._id,
        reason: nocReason.trim(),
        vacatingDate: vacatingDate
      });

      if (response.data.success) {
        toast.success('NOC request created successfully');
        setShowCreateModal(false);
        setSelectedStudent(null);
        setNocReason('');
        setVacatingDate('');
        setStudentSearch('');
        setSelectedAY('');
        fetchNOCRequests();
        fetchStats();
      }
    } catch (error) {
      console.error('Error creating NOC:', error);
      toast.error(error.response?.data?.message || 'Failed to create NOC request');
    } finally {
      setIsCreating(false);
    }
  };

  const fetchNOCRequests = async () => {
    try {
      const url = filter === 'all' ? '/api/noc/admin/all' : `/api/noc/admin/all?status=${filter}`;
      const response = await api.get(url);
      if (response.data.success) {
        setNocRequests(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching NOC requests:', error);
      toast.error('Failed to fetch NOC requests');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/api/noc/admin/stats');
      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching NOC stats:', error);
    }
  };

  const handleAction = (request, actionType) => {
    setSelectedRequest(request);
    setAction(actionType);
    setRemarks('');
    setShowModal(true);
  };

  const handleSubmitAction = async () => {
    if (!selectedRequest) return;

    if (action === 'reject' && !remarks.trim()) {
      toast.error('Rejection reason is required');
      return;
    }

    setIsSubmitting(true);
    try {
      const requestId = selectedRequest.id || selectedRequest._id;
      let response;

      if (action === 'delete') {
        response = await api.delete(`/api/noc/admin/${requestId}`);
      } else if (action === 'approve') {
        response = await api.post(`/api/noc/admin/${requestId}/approve`, { adminRemarks: remarks });
      } else {
        response = await api.post(`/api/noc/admin/${requestId}/reject`, { rejectionReason: remarks });
      }
      
      if (response.data.success) {
        toast.success(
          action === 'delete' 
            ? 'NOC request deleted and student reactivated successfully'
            : `NOC request ${action === 'approve' ? 'approved and student deactivated' : 'rejected'} successfully`
        );
        setShowModal(false);
        setSelectedRequest(null);
        setRemarks('');
        fetchNOCRequests();
        fetchStats();
      }
    } catch (error) {
      console.error(`Error ${action}ing NOC request:`, error);
      toast.error(error.response?.data?.message || `Failed to ${action} NOC request`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
      case 'Approved':
        return 'bg-green-100 text-green-800 border border-green-200';
      case 'Rejected':
        return 'bg-red-100 text-red-800 border border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Pending':
        return <ClockIcon className="h-4 w-4" />;
      case 'Approved':
        return <CheckCircleIcon className="h-4 w-4" />;
      case 'Rejected':
        return <XCircleIcon className="h-4 w-4" />;
      default:
        return <ClockIcon className="h-4 w-4" />;
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredRequests = nocRequests.filter(request => {
    if (filter === 'all') return true;
    return request.status === filter;
  });

  if (loading && activeTab === 'requests') {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Header */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center">
                  <DocumentTextIcon className="h-8 w-8 text-blue-600 mr-3" />
                  <div>
                    <h1 className="text-2xl font-bold text-blue-900">NOC Management</h1>
                    <p className="text-gray-600">Approve and manage NOC requests</p>
                  </div>
                </div>
                {activeTab === 'requests' && (
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => setShowCreateModal(true)}
                      className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200 text-sm font-medium shadow-sm"
                    >
                      <PlusIcon className="h-5 w-5 mr-1" />
                      <span>Create NOC</span>
                    </button>
                    <div className="flex items-center">
                      <FunnelIcon className="h-5 w-5 text-gray-400 mr-2" />
                      <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                      >
                        <option value="all">All Requests</option>
                        <option value="Pending">Pending</option>
                        <option value="Approved">Approved</option>
                        <option value="Rejected">Rejected</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Tabs */}
            <div className="flex border-b border-gray-200">
              <button
                onClick={() => setActiveTab('requests')}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'requests'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                NOC Requests
              </button>
              <button
                onClick={() => setActiveTab('process')}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'process'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center">
                  <InformationCircleIcon className="h-4 w-4 mr-2" />
                  Process Guide
                </div>
              </button>
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === 'process' ? (
            /* Process Guide Tab */
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center mb-4">
                  <InformationCircleIcon className="h-6 w-6 text-blue-600 mr-2" />
                  <h2 className="text-xl font-semibold text-gray-900">NOC Process Overview</h2>
                </div>
                <p className="text-gray-600 mb-6">
                  The simplified NOC (No Objection Certificate) workflow allows students to request vacating the hostel for their current academic year. 
                  Admins and Wardens can review pending requests and approve them directly. Once approved, the student is immediately deactivated, and their room, bed, and locker assignments are vacated.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-blue-50 p-5 rounded-lg border border-blue-100">
                    <h3 className="font-semibold text-blue-900 text-lg mb-2">1. Creation</h3>
                    <p className="text-sm text-blue-800">
                      Requests can be raised by the student directly from their portal, or on their behalf by a Warden or Admin. 
                      Every request is tied specifically to the student's active academic year.
                    </p>
                  </div>
                  <div className="bg-green-50 p-5 rounded-lg border border-green-100">
                    <h3 className="font-semibold text-green-900 text-lg mb-2">2. Direct Approval & Deactivation</h3>
                    <p className="text-sm text-green-800">
                      An Admin or Warden reviews the pending request. Approving it directly marks the student profile as **Inactive** for the hostel and **Expired** for the application status. 
                      All allotted resources (room, bed, locker layouts) are instantly cleared.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Stats Cards */}
              {stats && (
                <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-6">
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <ChartBarIcon className="h-6 w-6 text-blue-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Total Requests</p>
                        <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center">
                      <div className="p-2 bg-yellow-100 rounded-lg">
                        <ClockIcon className="h-6 w-6 text-yellow-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Pending</p>
                        <p className="text-2xl font-bold text-gray-900">{stats.byStatus.Pending || 0}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <CheckCircleIcon className="h-6 w-6 text-green-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Approved</p>
                        <p className="text-2xl font-bold text-gray-900">{stats.byStatus.Approved || 0}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center">
                      <div className="p-2 bg-red-100 rounded-lg">
                        <XCircleIcon className="h-6 w-6 text-red-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Rejected</p>
                        <p className="text-2xl font-bold text-gray-900">{stats.byStatus.Rejected || 0}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center">
                      <div className="p-2 bg-indigo-100 rounded-lg">
                        <UserIcon className="h-6 w-6 text-indigo-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Deactivated</p>
                        <p className="text-2xl font-bold text-gray-900">{stats.deactivatedStudents}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* NOC Requests List */}
              {filteredRequests.length === 0 ? (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                  <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No NOC Requests</h3>
                  <p className="text-gray-600">
                    {filter === 'all' 
                      ? 'No NOC requests found.' 
                      : `No ${filter.toLowerCase()} NOC requests found.`
                    }
                  </p>
                </div>
              ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        NOC ID
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Student
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Academics
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Vacating Date
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Raised By
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredRequests.map((request, index) => (
                      <tr key={request.id || request._id || `noc-request-${index}`} className="hover:bg-gray-50 transition-colors duration-150">
                        <td className="px-6 py-4 whitespace-nowrap text-xs font-medium text-gray-900">
                          #{(request.id || request._id) ? (request.id || request._id).slice(-8).toUpperCase() : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{request.studentName}</div>
                          <div className="text-xs text-gray-500">{request.rollNumber}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-xs text-gray-900">{request.course?.name}</div>
                          <div className="text-xs text-gray-500">Year {request.year} (AY: {request.academicYear})</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-700 font-sans">
                          {request.vacatingDate ? new Date(request.vacatingDate).toLocaleDateString('en-IN', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          }) : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {request.raisedBy === 'warden' ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                              <UserIcon className="h-3 w-3 mr-1" />
                              Warden
                            </span>
                          ) : request.raisedBy === 'admin' ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              <UserIcon className="h-3 w-3 mr-1" />
                              Admin
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              <UserIcon className="h-3 w-3 mr-1" />
                              Student
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                            {getStatusIcon(request.status)}
                            <span className="ml-1">{request.status}</span>
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-xs font-medium">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => {
                                setSelectedRequest(request);
                                setAction('view');
                                setShowModal(true);
                              }}
                              className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors duration-200"
                              title="View Details"
                            >
                              <EyeIcon className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => handleAction(request, 'delete')}
                              className="p-1.5 text-gray-400 hover:text-red-600 transition-colors duration-200"
                              title="Delete NOC Request"
                            >
                              <TrashIcon className="h-5 w-5" />
                            </button>
                            
                            {request.status === 'Pending' && (
                              <div className="flex space-x-1.5">
                                <button
                                  onClick={() => handleAction(request, 'approve')}
                                  className="px-2.5 py-1.5 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors duration-200 whitespace-nowrap"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleAction(request, 'reject')}
                                  className="px-2.5 py-1.5 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors duration-200 whitespace-nowrap"
                                >
                                  Reject
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
              )}

              {/* Action Modal */}
              {showModal && selectedRequest && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
                  >
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {action === 'view' ? 'NOC Request Details' : 
                         action === 'approve' ? 'Approve NOC Request' : 
                         action === 'delete' ? 'Delete NOC Request' : 'Reject NOC Request'}
                      </h3>
                    </div>
                    
                    <div className="px-6 py-4">
                      {action === 'view' ? (
                        <div className="space-y-4">
                          <div>
                            <h4 className="text-sm font-semibold text-gray-900 mb-2">Student Information</h4>
                            <div className="grid grid-cols-2 gap-4 text-sm text-gray-700 bg-gray-50 p-3 rounded-md">
                              <div><span className="font-medium text-gray-500">Name:</span> {selectedRequest.studentName}</div>
                              <div><span className="font-medium text-gray-500">Roll No:</span> {selectedRequest.rollNumber}</div>
                              <div><span className="font-medium text-gray-500">Course:</span> {selectedRequest.course?.name}</div>
                              <div><span className="font-medium text-gray-500">Branch:</span> {selectedRequest.branch?.name}</div>
                              <div><span className="font-medium text-gray-500">Year:</span> {selectedRequest.year}</div>
                              <div><span className="font-medium text-gray-500">Academic Year:</span> {selectedRequest.academicYear}</div>
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-500 mb-1">Reason</label>
                            <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-md whitespace-pre-wrap">{selectedRequest.reason}</p>
                          </div>

                          {selectedRequest.vacatingDate && (
                            <div>
                              <span className="font-medium text-sm text-gray-500">Vacating Date:</span>{' '}
                              <span className="text-sm text-gray-900">
                                {new Date(selectedRequest.vacatingDate).toLocaleDateString('en-IN', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric'
                                })}
                              </span>
                            </div>
                          )}

                          <div>
                            <span className="font-medium text-sm text-gray-500 mr-2">Status:</span>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedRequest.status)}`}>
                              {getStatusIcon(selectedRequest.status)}
                              <span className="ml-1">{selectedRequest.status}</span>
                            </span>
                          </div>

                          {selectedRequest.rejectionReason && (
                            <div>
                              <label className="block text-sm font-medium text-red-500 mb-1">Rejection Reason</label>
                              <p className="text-sm text-red-900 bg-red-50 p-3 rounded-md">{selectedRequest.rejectionReason}</p>
                            </div>
                          )}

                          {selectedRequest.adminRemarks && (
                            <div>
                              <label className="block text-sm font-medium text-blue-500 mb-1">Admin Remarks</label>
                              <p className="text-sm text-blue-900 bg-blue-50 p-3 rounded-md">{selectedRequest.adminRemarks}</p>
                            </div>
                          )}

                          {selectedRequest.wardenRemarks && (
                            <div>
                              <label className="block text-sm font-medium text-gray-500 mb-1">Warden Remarks</label>
                              <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-md">{selectedRequest.wardenRemarks}</p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {action === 'approve' && (
                            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                              <div className="flex">
                                <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500 mr-2 mt-0.5 flex-shrink-0" />
                                <div>
                                  <h4 className="text-sm font-medium text-yellow-800">Direct Approval & Deactivation</h4>
                                  <p className="mt-1 text-xs text-yellow-700">
                                    Approving this NOC request will immediately deactivate the student's hostel profile for this academic year ({selectedRequest.academicYear}) and vacate their room allotment. This action cannot be undone.
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}

                          {action === 'delete' && (
                            <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                              <div className="flex">
                                <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                                <div>
                                  <h4 className="text-sm font-medium text-red-800">Delete Request & Reactivate Student</h4>
                                  <p className="mt-1 text-xs text-red-700">
                                    Are you sure you want to delete this NOC request? If this request was already approved, deleting it will restore the student's status to <strong>Active</strong> and re-allocate their original room, bed, and locker layouts.
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}

                          {action !== 'delete' && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                {action === 'approve' ? 'Remarks / Approval Notes (Optional)' : 'Rejection Reason *'}
                              </label>
                              <textarea
                                value={remarks}
                                onChange={(e) => setRemarks(e.target.value)}
                                rows={4}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                                placeholder={action === 'approve' 
                                  ? 'Add any notes or remarks about this approval...'
                                  : 'Please provide a detailed reason for rejection...'
                                }
                                required={action === 'reject'}
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="px-6 py-4 bg-gray-50 flex justify-end space-x-3">
                      <button
                        onClick={() => {
                          setShowModal(false);
                          setSelectedRequest(null);
                          setRemarks('');
                        }}
                        className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
                      >
                        {action === 'view' ? 'Close' : 'Cancel'}
                      </button>
                      {action !== 'view' && (
                        <button
                          onClick={handleSubmitAction}
                          disabled={isSubmitting || (action === 'reject' && !remarks.trim())}
                          className={`px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${
                            action === 'approve' 
                              ? 'bg-green-600 hover:bg-green-700'
                              : 'bg-red-600 hover:bg-red-700'
                          }`}
                        >
                          {isSubmitting ? 'Processing...' : (action === 'approve' ? 'Approve' : action === 'delete' ? 'Delete' : 'Reject')}
                        </button>
                      )}
                    </div>
                  </motion.div>
                </div>
              )}
            </>
          )}

          {/* Create NOC Modal */}
          {showCreateModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
              >
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Create NOC Request for Student
                  </h3>
                 
                </div>

                <div className="px-6 py-4 space-y-4">
                  {/* Academic Year Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Academic Year *
                    </label>
                    <select
                      value={selectedAY}
                      onChange={(e) => {
                        setSelectedAY(e.target.value);
                        setSelectedStudent(null); // Reset selected student when AY changes
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
                    >
                      <option value="">Select Academic Year...</option>
                      {generateAcademicYears().map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Student Search */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Search Student *
                    </label>
                    <div className="relative">
                      <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={studentSearch}
                        onChange={(e) => setStudentSearch(e.target.value)}
                        disabled={!selectedAY}
                        placeholder={selectedAY ? "Search by name or roll number..." : "Select Academic Year first..."}
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>

                  {/* Student Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Student *
                    </label>
                    {!selectedAY ? (
                      <div className="text-center py-4 bg-gray-50 rounded-md">
                        <InformationCircleIcon className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">
                          Please select an Academic Year first to load students
                        </p>
                      </div>
                    ) : loadingStudents ? (
                      <div className="flex items-center justify-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                        <span className="ml-2 text-sm text-gray-500">Loading students...</span>
                      </div>
                    ) : students.length === 0 ? (
                      <div className="text-center py-4 bg-gray-50 rounded-md">
                        <UserIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">
                          {studentSearch ? 'No students found matching your search' : 'No eligible active students found for this Academic Year'}
                        </p>
                      </div>
                    ) : (
                      <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-md font-sans">
                        {students.map((student) => (
                          <div
                            key={student._id}
                            onClick={() => setSelectedStudent(student)}
                            className={`p-3 cursor-pointer transition-colors duration-200 border-b border-gray-100 last:border-b-0 ${
                              selectedStudent?._id === student._id
                                ? 'bg-blue-50 border-l-4 border-l-blue-500'
                                : 'hover:bg-gray-50'
                            }`}
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-medium text-gray-900 text-sm">{student.name}</p>
                                <p className="text-xs text-gray-500">{student.rollNumber}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-xs text-gray-600">{student.course?.name}</p>
                                <p className="text-xs text-gray-500">Year {student.year} (AY: {student.academicYear})</p>
                              </div>
                            </div>
                            {student.roomNumber && (
                              <p className="text-xs text-gray-400 mt-1">Room: {student.roomNumber}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Selected Student Display */}
                  {selectedStudent && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                      <p className="text-xs font-medium text-blue-800">Selected Student:</p>
                      <p className="text-sm font-semibold text-blue-900">{selectedStudent.name} ({selectedStudent.rollNumber})</p>
                      <p className="text-xs text-blue-700">{selectedStudent.course?.name} - Year {selectedStudent.year} (Academic Year: {selectedStudent.academicYear})</p>
                    </div>
                  )}

                  {/* NOC Reason */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Reason for NOC *
                    </label>
                    <textarea
                      value={nocReason}
                      onChange={(e) => setNocReason(e.target.value)}
                      rows={4}
                      maxLength={500}
                      className="w-full px-3 py-2 border border-blue-500 focus:border-blue-500 text-sm rounded-md shadow-sm focus:outline-none focus:ring-blue-500"
                      placeholder="Enter the reason for requesting NOC (minimum 10 characters)..."
                    />
                    <p className="text-xs text-gray-500 mt-1 text-right">
                      {nocReason.length}/500 characters
                    </p>
                  </div>

                  {/* Vacating Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Vacating Date from Hostel *
                    </label>
                    <input
                      type="date"
                      value={vacatingDate}
                      onChange={(e) => setVacatingDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Select the date when the student plans to vacate the hostel
                    </p>
                  </div>
                </div>

                <div className="px-6 py-4 bg-gray-50 flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      setShowCreateModal(false);
                      setSelectedStudent(null);
                      setNocReason('');
                      setVacatingDate('');
                      setStudentSearch('');
                      setSelectedAY('');
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateNOC}
                    disabled={isCreating || !selectedStudent || nocReason.trim().length < 10 || !vacatingDate}
                    className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isCreating ? 'Creating...' : 'Create NOC Request'}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default NOCManagement;
