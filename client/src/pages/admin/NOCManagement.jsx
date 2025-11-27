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
  CalendarIcon,
  FunnelIcon,
  ChartBarIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import LoadingSpinner from '../../components/LoadingSpinner';

const NOCManagement = () => {
  const [nocRequests, setNocRequests] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [action, setAction] = useState(''); // 'approve', 'reject', or 'view'
  const [remarks, setRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchNOCRequests();
    fetchStats();
  }, [filter]);

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

    setIsSubmitting(true);
    try {
      const requestId = selectedRequest.id || selectedRequest._id;
      const url = action === 'approve' 
        ? `/api/noc/admin/${requestId}/approve`
        : `/api/noc/admin/${requestId}/reject`;
      
      const payload = action === 'approve' 
        ? {} 
        : { rejectionReason: remarks };

      const response = await api.post(url, payload);
      
      if (response.data.success) {
        toast.success(`NOC request ${action === 'approve' ? 'approved' : 'rejected'} successfully`);
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
        return 'bg-yellow-100 text-yellow-800';
      case 'Warden Verified':
        return 'bg-blue-100 text-blue-800';
      case 'Approved':
        return 'bg-green-100 text-green-800';
      case 'Rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Pending':
        return <ClockIcon className="h-4 w-4" />;
      case 'Warden Verified':
        return <CheckCircleIcon className="h-4 w-4" />;
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

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-white py-8">
      <div className="mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Header */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <DocumentTextIcon className="h-8 w-8 text-blue-600 mr-3" />
                  <div>
                    <h1 className="text-2xl font-bold text-blue-900">NOC Management</h1>
                    <p className="text-gray-600">Approve and manage NOC requests</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="flex items-center">
                    <FunnelIcon className="h-5 w-5 text-gray-400 mr-2" />
                    <select
                      value={filter}
                      onChange={(e) => setFilter(e.target.value)}
                      className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="all">All Requests</option>
                      <option value="Pending">Pending</option>
                      <option value="Warden Verified">Warden Verified</option>
                      <option value="Approved">Approved</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
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
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <CheckCircleIcon className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Warden Verified</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.byStatus['Warden Verified'] || 0}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <CheckCircleIcon className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Deactivated Students</p>
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
            <div className="space-y-4">
              {filteredRequests.map((request, index) => (
                <motion.div
                  key={request.id || request._id || `noc-request-${index}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200"
                >
                  <div className="px-6 py-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center flex-wrap gap-2 mb-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                            {getStatusIcon(request.status)}
                            <span className="ml-1">{request.status}</span>
                          </span>
                          {request.raisedBy === 'warden' && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                              <UserIcon className="h-3 w-3 mr-1" />
                              Raised by Warden
                            </span>
                          )}
                          <span className="text-sm text-gray-500">
                            Submitted on {formatDate(request.createdAt)}
                          </span>
                        </div>
                        
                        <div className="mb-3">
                          <h3 className="text-lg font-medium text-gray-900 mb-1">
                            NOC Request #{(request.id || request._id) ? (request.id || request._id).slice(-8).toUpperCase() : 'N/A'}
                          </h3>
                          <p className="text-gray-600 line-clamp-2">{request.reason}</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-gray-600">
                          <div>
                            <span className="font-medium">Student:</span> {request.studentName}
                          </div>
                          <div>
                            <span className="font-medium">Roll No:</span> {request.rollNumber}
                          </div>
                          <div>
                            <span className="font-medium">Course:</span> {request.course?.name}
                          </div>
                          <div>
                            <span className="font-medium">Year:</span> {request.year}
                          </div>
                        </div>

                        {/* Warden Remarks */}
                        {request.wardenRemarks && (
                          <div className="mt-3 p-3 bg-blue-50 rounded-md">
                            <p className="text-sm text-blue-800">
                              <span className="font-medium">Warden Remarks:</span> {request.wardenRemarks}
                            </p>
                          </div>
                        )}

                        {/* Rejection Reason */}
                        {request.rejectionReason && (
                          <div className="mt-3 p-3 bg-red-50 rounded-md">
                            <p className="text-sm text-red-800">
                              <span className="font-medium">Rejection Reason:</span> {request.rejectionReason}
                            </p>
                          </div>
                        )}

                        {/* Account Status */}
                        {request.studentDeactivated && (
                          <div className="mt-3 p-3 bg-green-50 rounded-md">
                            <p className="text-sm text-green-800">
                              <span className="font-medium">Account Status:</span> Deactivated
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center space-x-2 ml-4">
                        <button
                          onClick={() => {
                            setSelectedRequest(request);
                            setAction('view');
                            setShowModal(true);
                          }}
                          className="p-2 text-gray-400 hover:text-blue-600 transition-colors duration-200"
                          title="View Details"
                        >
                          <EyeIcon className="h-5 w-5" />
                        </button>
                        
                        {request.status === 'Warden Verified' && (
                          <>
                            <button
                              onClick={() => handleAction(request, 'approve')}
                              className="px-3 py-1 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors duration-200"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleAction(request, 'reject')}
                              className="px-3 py-1 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors duration-200"
                            >
                              Reject
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* Action Modal */}
          {showModal && selectedRequest && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
              >
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {action === 'view' ? 'NOC Request Details' : 
                     action === 'approve' ? 'Approve NOC Request' : 'Reject NOC Request'}
                  </h3>
                </div>
                
                <div className="px-6 py-4">
                  {action === 'view' ? (
                    <div className="space-y-6">
                      {/* Student Information */}
                      <div>
                        <h4 className="text-md font-semibold text-gray-900 mb-3">Student Information</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Name</label>
                            <p className="mt-1 text-sm text-gray-900">{selectedRequest.studentName}</p>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Roll Number</label>
                            <p className="mt-1 text-sm text-gray-900">{selectedRequest.rollNumber}</p>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Course</label>
                            <p className="mt-1 text-sm text-gray-900">{selectedRequest.course?.name}</p>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Branch</label>
                            <p className="mt-1 text-sm text-gray-900">{selectedRequest.branch?.name}</p>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Year</label>
                            <p className="mt-1 text-sm text-gray-900">{selectedRequest.year}</p>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Academic Year</label>
                            <p className="mt-1 text-sm text-gray-900">{selectedRequest.academicYear}</p>
                          </div>
                        </div>
                      </div>

                      {/* NOC Details */}
                      <div>
                        <h4 className="text-md font-semibold text-gray-900 mb-3">NOC Request Details</h4>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Reason</label>
                          <div className="p-4 bg-gray-50 rounded-md">
                            <p className="text-sm text-gray-900 whitespace-pre-wrap">{selectedRequest.reason}</p>
                          </div>
                        </div>
                      </div>

                      {/* Warden Remarks */}
                      {selectedRequest.wardenRemarks && (
                        <div>
                          <h4 className="text-md font-semibold text-gray-900 mb-3">Warden Remarks</h4>
                          <div className="p-4 bg-blue-50 rounded-md">
                            <p className="text-sm text-blue-900 whitespace-pre-wrap">{selectedRequest.wardenRemarks}</p>
                          </div>
                        </div>
                      )}

                      {/* Status */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedRequest.status)}`}>
                          {getStatusIcon(selectedRequest.status)}
                          <span className="ml-1">{selectedRequest.status}</span>
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {action === 'approve' && (
                        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                          <div className="flex">
                            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400 mr-2 mt-0.5" />
                            <div>
                              <h4 className="text-sm font-medium text-yellow-800">Warning</h4>
                              <p className="mt-1 text-sm text-yellow-700">
                                Approving this NOC request will deactivate the student's account. 
                                This action cannot be undone.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {action === 'approve' ? 'Approval Notes (Optional)' : 'Rejection Reason *'}
                        </label>
                        <textarea
                          value={remarks}
                          onChange={(e) => setRemarks(e.target.value)}
                          rows={4}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          placeholder={action === 'approve' 
                            ? 'Add any notes about this approval...'
                            : 'Please provide a reason for rejection...'
                          }
                          required={action === 'reject'}
                        />
                      </div>
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
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    {action === 'view' ? 'Close' : 'Cancel'}
                  </button>
                  {action !== 'view' && (
                    <button
                      onClick={handleSubmitAction}
                      disabled={isSubmitting || (action === 'reject' && !remarks.trim())}
                      className={`px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                        action === 'approve' 
                          ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
                          : 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                      }`}
                    >
                      {isSubmitting ? 'Processing...' : (action === 'approve' ? 'Approve & Deactivate' : 'Reject')}
                    </button>
                  )}
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
