import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/axios';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { 
  DocumentTextIcon, 
  ArrowLeftIcon,
  ClockIcon, 
  CheckCircleIcon, 
  XCircleIcon,
  UserIcon,
  CalendarIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from '@heroicons/react/24/outline';
import LoadingSpinner from '../../components/LoadingSpinner';

const NOCRequestDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [nocRequest, setNocRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState({
    studentInfo: true,
    nocDetails: true,
    wardenRemarks: false,
    rejectionReason: false,
    accountStatus: false,
    timeline: true
  });

  useEffect(() => {
    fetchNOCRequest();
  }, [id]);

  const fetchNOCRequest = async () => {
    try {
      const response = await api.get(`/api/noc/student/${id}`);
      if (response.data.success) {
        setNocRequest(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching NOC request:', error);
      toast.error('Failed to fetch NOC request details');
      navigate('/student/noc-requests');
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Warden Verified':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Approved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Pending':
        return <ClockIcon className="h-4 w-4 sm:h-5 sm:w-5" />;
      case 'Warden Verified':
        return <CheckCircleIcon className="h-4 w-4 sm:h-5 sm:w-5" />;
      case 'Approved':
        return <CheckCircleIcon className="h-4 w-4 sm:h-5 sm:w-5" />;
      case 'Rejected':
        return <XCircleIcon className="h-4 w-4 sm:h-5 sm:w-5" />;
      default:
        return <ClockIcon className="h-4 w-4 sm:h-5 sm:w-5" />;
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

  if (!nocRequest) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">NOC Request Not Found</h2>
          <p className="text-sm sm:text-base text-gray-600 mb-4">The requested NOC request could not be found.</p>
          <button
            onClick={() => navigate('/student/noc-requests')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm sm:text-base"
          >
            Back to NOC Requests
          </button>
        </div>
      </div>
    );
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
                  <button
                    onClick={() => navigate('/student/noc-requests')}
                    className="mr-3 p-2 text-gray-400 hover:text-gray-600 transition-colors duration-200"
                  >
                    <ArrowLeftIcon className="h-5 w-5" />
                  </button>
                  <DocumentTextIcon className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600 mr-2 sm:mr-3" />
                  <div>
                    <h1 className="text-lg sm:text-2xl font-bold text-gray-900">NOC Request Details</h1>
                    <p className="text-sm sm:text-base text-gray-600">Request #{(nocRequest.id || nocRequest._id) ? (nocRequest.id || nocRequest._id).slice(-8).toUpperCase() : 'N/A'}</p>
                  </div>
                </div>
                <div className={`inline-flex items-center px-2.5 py-1 sm:px-3 sm:py-1 rounded-full text-xs sm:text-sm font-medium border ${getStatusColor(nocRequest.status)}`}>
                  {getStatusIcon(nocRequest.status)}
                  <span className="ml-1 sm:ml-2">{nocRequest.status}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-4 sm:space-y-6">
              {/* Student Information */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <button
                  onClick={() => toggleSection('studentInfo')}
                  className="w-full px-4 sm:px-6 py-4 border-b border-gray-200 flex items-center justify-between hover:bg-gray-50 transition-colors duration-200"
                >
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center">
                    <UserIcon className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                    Student Information
                  </h3>
                  {expandedSections.studentInfo ? (
                    <ChevronUpIcon className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500" />
                  ) : (
                    <ChevronDownIcon className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500" />
                  )}
                </button>
                {expandedSections.studentInfo && (
                  <div className="px-4 sm:px-6 py-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700">Name</label>
                        <p className="mt-1 text-xs sm:text-sm text-gray-900">{nocRequest.studentName}</p>
                      </div>
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700">Roll Number</label>
                        <p className="mt-1 text-xs sm:text-sm text-gray-900">{nocRequest.rollNumber}</p>
                      </div>
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700">Course</label>
                        <p className="mt-1 text-xs sm:text-sm text-gray-900">{nocRequest.course?.name}</p>
                      </div>
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700">Branch</label>
                        <p className="mt-1 text-xs sm:text-sm text-gray-900">{nocRequest.branch?.name}</p>
                      </div>
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700">Year</label>
                        <p className="mt-1 text-xs sm:text-sm text-gray-900">{nocRequest.year}</p>
                      </div>
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700">Academic Year</label>
                        <p className="mt-1 text-xs sm:text-sm text-gray-900">{nocRequest.academicYear}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* NOC Details */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <button
                  onClick={() => toggleSection('nocDetails')}
                  className="w-full px-4 sm:px-6 py-4 border-b border-gray-200 flex items-center justify-between hover:bg-gray-50 transition-colors duration-200"
                >
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center">
                    <DocumentTextIcon className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                    NOC Request Details
                  </h3>
                  {expandedSections.nocDetails ? (
                    <ChevronUpIcon className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500" />
                  ) : (
                    <ChevronDownIcon className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500" />
                  )}
                </button>
                {expandedSections.nocDetails && (
                  <div className="px-4 sm:px-6 py-4">
                    <div className="mb-4">
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Reason for NOC Request</label>
                      <div className="p-3 sm:p-4 bg-gray-50 rounded-md">
                        <p className="text-xs sm:text-sm text-gray-900 whitespace-pre-wrap">{nocRequest.reason}</p>
                      </div>
                    </div>
                    <div className="flex items-center text-xs sm:text-sm text-gray-600">
                      <CalendarIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                      <span>Submitted on {formatDate(nocRequest.createdAt)}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Warden Remarks */}
              {nocRequest.wardenRemarks && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                  <button
                    onClick={() => toggleSection('wardenRemarks')}
                    className="w-full px-4 sm:px-6 py-4 border-b border-gray-200 flex items-center justify-between hover:bg-gray-50 transition-colors duration-200"
                  >
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900">Warden Remarks</h3>
                    {expandedSections.wardenRemarks ? (
                      <ChevronUpIcon className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500" />
                    ) : (
                      <ChevronDownIcon className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500" />
                    )}
                  </button>
                  {expandedSections.wardenRemarks && (
                    <div className="px-4 sm:px-6 py-4">
                      <div className="p-3 sm:p-4 bg-blue-50 rounded-md">
                        <p className="text-xs sm:text-sm text-blue-900 whitespace-pre-wrap">{nocRequest.wardenRemarks}</p>
                      </div>
                      {nocRequest.verifiedAt && (
                        <p className="mt-2 text-xs text-gray-500">
                          Verified on {formatDate(nocRequest.verifiedAt)}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Rejection Reason */}
              {nocRequest.rejectionReason && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                  <button
                    onClick={() => toggleSection('rejectionReason')}
                    className="w-full px-4 sm:px-6 py-4 border-b border-gray-200 flex items-center justify-between hover:bg-gray-50 transition-colors duration-200"
                  >
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900">Rejection Reason</h3>
                    {expandedSections.rejectionReason ? (
                      <ChevronUpIcon className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500" />
                    ) : (
                      <ChevronDownIcon className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500" />
                    )}
                  </button>
                  {expandedSections.rejectionReason && (
                    <div className="px-4 sm:px-6 py-4">
                      <div className="p-3 sm:p-4 bg-red-50 rounded-md">
                        <p className="text-xs sm:text-sm text-red-900 whitespace-pre-wrap">{nocRequest.rejectionReason}</p>
                      </div>
                      {nocRequest.rejectedAt && (
                        <p className="mt-2 text-xs text-gray-500">
                          Rejected on {formatDate(nocRequest.rejectedAt)}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Account Status */}
              {nocRequest.studentDeactivated && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                  <button
                    onClick={() => toggleSection('accountStatus')}
                    className="w-full px-4 sm:px-6 py-4 border-b border-gray-200 flex items-center justify-between hover:bg-gray-50 transition-colors duration-200"
                  >
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900">Account Status</h3>
                    {expandedSections.accountStatus ? (
                      <ChevronUpIcon className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500" />
                    ) : (
                      <ChevronDownIcon className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500" />
                    )}
                  </button>
                  {expandedSections.accountStatus && (
                    <div className="px-4 sm:px-6 py-4">
                      <div className="p-3 sm:p-4 bg-green-50 rounded-md">
                        <p className="text-xs sm:text-sm text-green-900">
                          Your account has been deactivated as per your NOC request approval.
                        </p>
                      </div>
                      {nocRequest.deactivatedAt && (
                        <p className="mt-2 text-xs text-gray-500">
                          Deactivated on {formatDate(nocRequest.deactivatedAt)}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-4 sm:space-y-6">
              {/* Status Timeline */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <button
                  onClick={() => toggleSection('timeline')}
                  className="w-full px-4 sm:px-6 py-4 border-b border-gray-200 flex items-center justify-between hover:bg-gray-50 transition-colors duration-200"
                >
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900">Status Timeline</h3>
                  {expandedSections.timeline ? (
                    <ChevronUpIcon className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500" />
                  ) : (
                    <ChevronDownIcon className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500" />
                  )}
                </button>
                {expandedSections.timeline && (
                  <div className="px-4 sm:px-6 py-4">
                    <div className="space-y-3 sm:space-y-4">
                      <div className="flex items-start">
                        <div className="flex-shrink-0">
                          <div className="w-6 h-6 sm:w-8 sm:h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <CheckCircleIcon className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600" />
                          </div>
                        </div>
                        <div className="ml-3">
                          <p className="text-xs sm:text-sm font-medium text-gray-900">Request Submitted</p>
                          <p className="text-xs text-gray-500">{formatDate(nocRequest.createdAt)}</p>
                        </div>
                      </div>

                      {nocRequest.verifiedAt && (
                        <div className="flex items-start">
                          <div className="flex-shrink-0">
                            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <CheckCircleIcon className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600" />
                            </div>
                          </div>
                          <div className="ml-3">
                            <p className="text-xs sm:text-sm font-medium text-gray-900">Warden Verified</p>
                            <p className="text-xs text-gray-500">{formatDate(nocRequest.verifiedAt)}</p>
                          </div>
                        </div>
                      )}

                      {nocRequest.approvedAt && (
                        <div className="flex items-start">
                          <div className="flex-shrink-0">
                            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-green-100 rounded-full flex items-center justify-center">
                              <CheckCircleIcon className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
                            </div>
                          </div>
                          <div className="ml-3">
                            <p className="text-xs sm:text-sm font-medium text-gray-900">Approved</p>
                            <p className="text-xs text-gray-500">{formatDate(nocRequest.approvedAt)}</p>
                          </div>
                        </div>
                      )}

                      {nocRequest.rejectedAt && (
                        <div className="flex items-start">
                          <div className="flex-shrink-0">
                            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-red-100 rounded-full flex items-center justify-center">
                              <XCircleIcon className="h-3 w-3 sm:h-4 sm:w-4 text-red-600" />
                            </div>
                          </div>
                          <div className="ml-3">
                            <p className="text-xs sm:text-sm font-medium text-gray-900">Rejected</p>
                            <p className="text-xs text-gray-500">{formatDate(nocRequest.rejectedAt)}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Quick Actions */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900">Quick Actions</h3>
                </div>
                <div className="px-4 sm:px-6 py-4">
                  <button
                    onClick={() => navigate('/student/noc-requests')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Back to NOC Requests
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default NOCRequestDetails;