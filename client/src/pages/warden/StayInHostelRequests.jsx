import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import api from '../../utils/axios';
import toast from 'react-hot-toast';
import {
  CalendarIcon,
  DocumentTextIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationCircleIcon,
  ArrowRightIcon,
  HomeIcon,
  UserIcon,
  AcademicCapIcon,
  PhoneIcon
} from '@heroicons/react/24/outline';
import SEO from '../../components/SEO';

const StayInHostelRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRecommendationModal, setShowRecommendationModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [recommendation, setRecommendation] = useState('Recommended');
  const [comment, setComment] = useState('');
  const todayStr = new Date().toISOString().slice(0, 10);
  const [filters, setFilters] = useState({
    status: '',
    wardenRecommendation: '',
    fromDate: todayStr,
    toDate: todayStr,
    page: 1
  });

  useEffect(() => {
    fetchRequests();
  }, [filters]);

  const fetchRequests = async () => {
    try {
      console.log('Fetching Stay in Hostel requests with filters:', filters);
      const response = await api.get('/api/leave/warden/stay-in-hostel', { params: filters });
      console.log('Stay in Hostel response:', response.data);
      
      if (response.data.success) {
        setRequests(response.data.data.leaves);
      } else {
        throw new Error(response.data.message || 'Failed to fetch requests');
      }
    } catch (error) {
      console.error('Error fetching Stay in Hostel requests:', error);
      toast.error('Failed to fetch Stay in Hostel requests');
    } finally {
      setLoading(false);
    }
  };

  const handleRecommendation = async () => {
    try {
      const response = await api.post('/api/leave/warden/recommendation', {
        leaveId: selectedRequest._id,
        recommendation,
        comment
      });

      if (response.data.success) {
        toast.success(response.data.data.message);
        setShowRecommendationModal(false);
        setSelectedRequest(null);
        setRecommendation('Recommended');
        setComment('');
        fetchRequests();
      }
    } catch (error) {
      console.error('Error submitting recommendation:', error);
      toast.error(error.response?.data?.message || 'Failed to submit recommendation');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Principal Approved':
        return 'text-green-600 bg-green-50';
      case 'Principal Rejected':
      case 'Rejected':
        return 'text-red-600 bg-red-50';
      case 'Pending':
        return 'text-yellow-600 bg-yellow-50';
      case 'Warden Recommended':
        return 'text-blue-600 bg-blue-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Principal Approved':
        return <CheckCircleIcon className="w-5 h-5" />;
      case 'Principal Rejected':
      case 'Rejected':
        return <XCircleIcon className="w-5 h-5" />;
      case 'Pending':
        return <ExclamationCircleIcon className="w-5 h-5" />;
      case 'Warden Recommended':
        return <ArrowRightIcon className="w-5 h-5" />;
      default:
        return null;
    }
  };

  const getWardenRecommendationColor = (recommendation) => {
    switch (recommendation) {
      case 'Recommended':
        return 'text-green-600 bg-green-50';
      case 'Not Recommended':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const formatDisplayDate = (request) => {
    return {
      date: new Date(request.stayDate).toLocaleDateString(),
      duration: '1 day'
    };
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-2 sm:px-6 py-4 sm:py-8">
        <SEO 
          title="Stay in Hostel Requests - Warden"
          description="Manage and review student stay in hostel requests"
          keywords="stay in hostel, warden, student requests, hostel management"
        />

        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 sm:mb-6 gap-3 sm:gap-0 mt-4">
          <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-green-900 to-green-700 bg-clip-text text-transparent">
            Stay in Hostel Requests
          </h1>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                <option value="">All Status</option>
                <option value="Pending">Pending</option>
                <option value="Warden Recommended">Warden Recommended</option>
                <option value="Principal Approved">Principal Approved</option>
                <option value="Principal Rejected">Principal Rejected</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Warden Recommendation
              </label>
              <select
                value={filters.wardenRecommendation}
                onChange={(e) => setFilters({ ...filters, wardenRecommendation: e.target.value, page: 1 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                <option value="">All Recommendations</option>
                <option value="Pending">Pending</option>
                <option value="Recommended">Recommended</option>
                <option value="Not Recommended">Not Recommended</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                From Date
              </label>
              <input
                type="date"
                value={filters.fromDate}
                onChange={(e) => setFilters({ ...filters, fromDate: e.target.value, page: 1 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                To Date
              </label>
              <input
                type="date"
                value={filters.toDate}
                onChange={(e) => setFilters({ ...filters, toDate: e.target.value, page: 1 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={() => setFilters({ status: '', wardenRecommendation: '', fromDate: todayStr, toDate: todayStr, page: 1 })}
                className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Requests List */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
            </div>
          ) : requests.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <HomeIcon className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p>No Stay in Hostel requests found</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {requests.map((request) => {
                const displayInfo = formatDisplayDate(request);
                return (
                  <motion.div
                    key={request._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 sm:p-6 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                            {getStatusIcon(request.status)}
                            <span className="ml-1">{request.status}</span>
                          </span>
                          {request.wardenRecommendation && (
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getWardenRecommendationColor(request.wardenRecommendation)}`}>
                              {request.wardenRecommendation}
                            </span>
                          )}
                          <span className="text-xs sm:text-sm text-gray-500">
                            {new Date(request.createdAt).toLocaleDateString()}
                          </span>
                        </div>

                        {/* Student Information */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-3">
                          <div className="flex items-center gap-2">
                            <UserIcon className="w-4 h-4 text-gray-500" />
                            <span className="text-sm font-medium">{request.student?.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <AcademicCapIcon className="w-4 h-4 text-gray-500" />
                            <span className="text-sm text-gray-600">{request.student?.rollNumber}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <DocumentTextIcon className="w-4 h-4 text-gray-500" />
                            <span className="text-sm text-gray-600">{request.student?.course?.name || request.student?.course}{request.student?.branch ? ` - ${request.student.branch?.name || request.student.branch}` : ''}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <PhoneIcon className="w-4 h-4 text-gray-500" />
                            <span className="text-sm text-gray-600">{request.student?.year} Year</span>
                          </div>
                        </div>

                        {/* Request Details */}
                        <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-gray-600 mb-3">
                          <div className="flex items-center gap-1">
                            <HomeIcon className="w-4 h-4" />
                            <span>Stay Date: {displayInfo.date}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <ClockIcon className="w-4 h-4" />
                            <span>{displayInfo.duration}</span>
                          </div>
                        </div>

                        <p className="text-gray-700 mb-3 text-sm sm:text-base break-words">
                          <strong>Reason:</strong> {request.reason}
                        </p>

                        {/* Warden Recommendation Display */}
                        {request.wardenRecommendation && request.wardenRecommendation !== 'Pending' && (
                          <div className="mt-2 p-2 bg-blue-50 rounded-lg">
                            <p className="text-xs sm:text-sm text-blue-700">
                              <strong>Your Recommendation:</strong> {request.wardenRecommendation}
                              {request.wardenComment && ` - ${request.wardenComment}`}
                            </p>
                            <p className="text-xs text-blue-600 mt-1">
                              Recommended on: {new Date(request.recommendedAt).toLocaleDateString()}
                            </p>
                          </div>
                        )}

                        {/* Principal Decision Display */}
                        {request.principalDecision && request.principalDecision !== 'Pending' && (
                          <div className="mt-2 p-2 bg-green-50 rounded-lg">
                            <p className="text-xs sm:text-sm text-green-700">
                              <strong>Principal Decision:</strong> {request.principalDecision}
                              {request.principalComment && ` - ${request.principalComment}`}
                            </p>
                            <p className="text-xs text-green-600 mt-1">
                              Decided on: {new Date(request.decidedAt).toLocaleDateString()}
                            </p>
                          </div>
                        )}

                        {request.rejectionReason && (
                          <p className="text-xs sm:text-sm text-red-600 mt-2">
                            <strong>Rejection Reason:</strong> {request.rejectionReason}
                          </p>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-col gap-2">
                        {request.status === 'Pending' && (
                          <button
                            onClick={() => {
                              setSelectedRequest(request);
                              setShowRecommendationModal(true);
                            }}
                            className="w-full sm:w-auto px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-semibold"
                          >
                            Make Recommendation
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Recommendation Modal */}
      {showRecommendationModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl p-6 w-full max-w-md"
          >
            <h2 className="text-xl font-semibold mb-4">Make Recommendation</h2>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                <strong>Student:</strong> {selectedRequest.student?.name} ({selectedRequest.student?.rollNumber})
              </p>
              <p className="text-sm text-gray-600 mb-2">
                <strong>Stay Date:</strong> {new Date(selectedRequest.stayDate).toLocaleDateString()}
              </p>
              <p className="text-sm text-gray-600 mb-4">
                <strong>Reason:</strong> {selectedRequest.reason}
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Recommendation
              </label>
              <select
                value={recommendation}
                onChange={(e) => setRecommendation(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                <option value="Recommended">Recommended</option>
                <option value="Not Recommended">Not Recommended</option>
              </select>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Comment (Optional)
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows="3"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="Add any additional comments..."
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowRecommendationModal(false);
                  setSelectedRequest(null);
                  setRecommendation('Recommended');
                  setComment('');
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRecommendation}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Submit Recommendation
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default StayInHostelRequests; 