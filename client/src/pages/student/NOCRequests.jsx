import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/axios';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  DocumentTextIcon, 
  PlusIcon, 
  ClockIcon, 
  CheckCircleIcon, 
  XCircleIcon,
  EyeIcon,
  TrashIcon,
  ExclamationTriangleIcon,
  UserIcon,
  CalendarIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline';
import LoadingSpinner from '../../components/LoadingSpinner';

const NOCRequests = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [nocRequests, setNocRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchNOCRequests();
  }, []);

  const fetchNOCRequests = async () => {
    try {
      const response = await api.get('/api/noc/student/my-requests');
      if (response.data.success) {
        console.log('NOC Requests data:', response.data.data);
        setNocRequests(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching NOC requests:', error);
      toast.error('Failed to fetch NOC requests');
      setNocRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    
    if (!reason.trim()) {
      toast.error('Please provide a reason for NOC request');
      return;
    }

    if (reason.trim().length < 10) {
      toast.error('Reason must be at least 10 characters long');
      return;
    }

    if (reason.trim().length > 500) {
      toast.error('Reason cannot exceed 500 characters');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await api.post('/api/noc/student/create', {
        reason: reason.trim()
      });

      if (response.data.success) {
        toast.success('NOC request submitted successfully');
        setReason('');
        setShowCreateForm(false);
        fetchNOCRequests();
      }
    } catch (error) {
      console.error('Error submitting NOC request:', error);
      toast.error(error.response?.data?.message || 'Failed to submit NOC request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this NOC request?')) {
      return;
    }

    setDeletingId(id);
    try {
      const response = await api.delete(`/api/noc/student/${id}`);
      if (response.data.success) {
        toast.success('NOC request deleted successfully');
        fetchNOCRequests();
      }
    } catch (error) {
      console.error('Error deleting NOC request:', error);
      toast.error(error.response?.data?.message || 'Failed to delete NOC request');
    } finally {
      setDeletingId(null);
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
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Header */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4 sm:mb-6">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                <div className="flex items-center">
                  <DocumentTextIcon className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600 mr-2 sm:mr-3" />
                  <div>
                    <h1 className="text-lg sm:text-2xl font-bold text-gray-900">My NOC Requests</h1>
                    <p className="text-sm sm:text-base text-gray-600">Track your No Objection Certificate requests</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="inline-flex items-center justify-center px-3 py-2 sm:px-4 sm:py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                >
                  <PlusIcon className="h-4 w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">New NOC Request</span>
                  <span className="sm:hidden">New</span>
                </button>
              </div>
            </div>
          </div>

          {/* NOC Requests List */}
          {nocRequests.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sm:p-12 text-center">
              <DocumentTextIcon className="h-10 w-10 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-3 sm:mb-4" />
              <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">No NOC Requests</h3>
              <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">You haven't submitted any NOC requests yet.</p>
              <button
                onClick={() => setShowCreateForm(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Submit Your First NOC Request
              </button>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {nocRequests.filter(request => request && typeof request === 'object').map((request, index) => (
                <motion.div
                  key={request.id || request._id || `noc-request-${index}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200"
                >
                  <div className="p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-3">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium w-fit ${getStatusColor(request.status)}`}>
                            {getStatusIcon(request.status)}
                            <span className="ml-1">{request.status}</span>
                          </span>
                          {request.raisedBy === 'warden' && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 w-fit">
                              <UserIcon className="h-3 w-3 mr-1" />
                              Raised by Warden
                            </span>
                          )}
                          <span className="text-xs sm:text-sm text-gray-500">
                            {formatDate(request.createdAt)}
                          </span>
                        </div>
                        
                        <div className="mb-3">
                          <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-1">
                            NOC Request #{(request.id || request._id) ? (request.id || request._id).slice(-8).toUpperCase() : 'N/A'}
                          </h3>
                          <p className="text-sm sm:text-base text-gray-600 line-clamp-2">{request.reason}</p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600">
                          <div>
                            <span className="font-medium">Course:</span> {request.course?.name || 'N/A'}
                          </div>
                          <div>
                            <span className="font-medium">Branch:</span> {request.branch?.name || 'N/A'}
                          </div>
                          <div>
                            <span className="font-medium">Year:</span> {request.year || 'N/A'}
                          </div>
                        </div>

                        {/* Additional info based on status */}
                        {request.wardenRemarks && (
                          <div className="mt-3 p-3 bg-blue-50 rounded-md">
                            <p className="text-xs sm:text-sm text-blue-800">
                              <span className="font-medium">Warden Remarks:</span> {request.wardenRemarks}
                            </p>
                          </div>
                        )}

                        {request.rejectionReason && (
                          <div className="mt-3 p-3 bg-red-50 rounded-md">
                            <p className="text-xs sm:text-sm text-red-800">
                              <span className="font-medium">Rejection Reason:</span> {request.rejectionReason}
                            </p>
                          </div>
                        )}

                        {request.studentDeactivated && (
                          <div className="mt-3 p-3 bg-green-50 rounded-md">
                            <p className="text-xs sm:text-sm text-green-800">
                              <span className="font-medium">Account Status:</span> Deactivated
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-end sm:justify-start gap-2 sm:gap-3">
                        {(request.id || request._id) && (
                          <button
                            onClick={() => navigate(`/student/noc-request/${request.id || request._id}`)}
                            className="p-2 text-gray-400 hover:text-blue-600 transition-colors duration-200"
                            title="View Details"
                          >
                            <EyeIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                          </button>
                        )}
                        
                        {request.status === 'Pending' && (request.id || request._id) && (
                          <button
                            onClick={() => handleDelete(request.id || request._id)}
                            disabled={deletingId === (request.id || request._id)}
                            className="p-2 text-gray-400 hover:text-red-600 transition-colors duration-200 disabled:opacity-50"
                            title="Delete Request"
                          >
                            {deletingId === (request.id || request._id) ? (
                              <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-red-600"></div>
                            ) : (
                              <TrashIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* Create NOC Request Modal */}
          <AnimatePresence>
            {showCreateForm && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4"
              >
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
                >
                  {/* Modal Header */}
                  <div className="bg-gradient-to-r from-blue-600 to-blue-800 px-4 sm:px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <DocumentTextIcon className="h-6 w-6 sm:h-8 sm:w-8 text-white mr-2 sm:mr-3" />
                        <div>
                          <h2 className="text-lg sm:text-2xl font-bold text-white">NOC Request</h2>
                          <p className="text-blue-100 text-sm sm:text-base">Submit a No Objection Certificate request</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setShowCreateForm(false)}
                        className="p-1 sm:p-2 text-white hover:bg-white/20 rounded-md transition-colors duration-200"
                      >
                        <XCircleIcon className="h-5 w-5 sm:h-6 sm:w-6" />
                      </button>
                    </div>
                  </div>

                  {/* Student Info */}
                  <div className="px-4 sm:px-6 py-4 bg-gray-50 border-b">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3">Student Information</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700">Name</label>
                        <p className="mt-1 text-xs sm:text-sm text-gray-900">{user?.name}</p>
                      </div>
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700">Roll Number</label>
                        <p className="mt-1 text-xs sm:text-sm text-gray-900">{user?.rollNumber}</p>
                      </div>
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700">Course</label>
                        <p className="mt-1 text-xs sm:text-sm text-gray-900">{user?.course?.name}</p>
                      </div>
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700">Branch</label>
                        <p className="mt-1 text-xs sm:text-sm text-gray-900">{user?.branch?.name}</p>
                      </div>
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700">Year</label>
                        <p className="mt-1 text-xs sm:text-sm text-gray-900">{user?.year}</p>
                      </div>
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700">Academic Year</label>
                        <p className="mt-1 text-xs sm:text-sm text-gray-900">{user?.academicYear}</p>
                      </div>
                    </div>
                  </div>

                  {/* Warning */}
                  <div className="px-4 sm:px-6 py-4 bg-yellow-50 border-l-4 border-yellow-400">
                    <div className="flex">
                      <ExclamationTriangleIcon className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-400 mr-2 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="text-xs sm:text-sm font-medium text-yellow-800">Important Notice</h4>
                        <p className="mt-1 text-xs sm:text-sm text-yellow-700">
                          Once your NOC request is approved, your account will be deactivated and you will not be able to access the application. 
                          Please ensure you have completed all necessary formalities before submitting this request.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Form */}
                  <form onSubmit={handleCreateSubmit} className="px-4 sm:px-6 py-4 sm:py-6">
                    <div className="mb-4 sm:mb-6">
                      <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-2">
                        Reason for NOC Request *
                      </label>
                      <textarea
                        id="reason"
                        rows={4}
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
                        placeholder="Please provide a detailed reason for requesting NOC..."
                        maxLength={500}
                        required
                      />
                      <div className="mt-1 flex justify-between text-xs sm:text-sm text-gray-500">
                        <span>Minimum 10 characters required</span>
                        <span>{reason.length}/500</span>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
                      <button
                        type="button"
                        onClick={() => setShowCreateForm(false)}
                        className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting || !reason.trim()}
                        className="w-full sm:w-auto px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSubmitting ? 'Submitting...' : 'Submit NOC Request'}
                      </button>
                    </div>
                  </form>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
};

export default NOCRequests;