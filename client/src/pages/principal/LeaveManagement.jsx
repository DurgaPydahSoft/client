import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import api from '../../utils/axios';
import toast from 'react-hot-toast';
import {
  CalendarIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationCircleIcon,
  UserIcon,
  AcademicCapIcon,
  PhoneIcon,
  ArrowRightIcon,
  DocumentTextIcon,
  HomeIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';
import SEO from '../../components/SEO';

const LeaveManagement = () => {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [approvalComment, setApprovalComment] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [studentDetailsModal, setStudentDetailsModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [previousLeaves, setPreviousLeaves] = useState([]);
  const [loadingPreviousLeaves, setLoadingPreviousLeaves] = useState(false);
  const [notifiedLeaves, setNotifiedLeaves] = useState(new Set());
  const [filters, setFilters] = useState({
    status: 'Warden Verified',
    applicationType: '',
    page: 1,
    fromDate: '',
    toDate: ''
  });

  useEffect(() => {
    fetchLeaves();
    // Clear notified leaves when filters change to ensure notifications work properly
    setNotifiedLeaves(new Set());
  }, [filters]);

  // Add real-time notification polling
  useEffect(() => {
    // Initial fetch
    fetchLeaves();
    
    // Set up polling for real-time updates
    const interval = setInterval(fetchLeaves, 30000); // Poll every 30 seconds
    
    // Listen for notification events
    const handleNotificationRefresh = () => {
      console.log('🔔 LeaveManagement: Notification refresh triggered');
      fetchLeaves();
    };
    
    window.addEventListener('refresh-notifications', handleNotificationRefresh);
    
    // Cleanup function
    return () => {
      clearInterval(interval);
      window.removeEventListener('refresh-notifications', handleNotificationRefresh);
      // Clear notified leaves on cleanup to prevent memory leaks
      setNotifiedLeaves(new Set());
    };
  }, [filters]);

  const fetchLeaves = async () => {
    try {
      console.log('Fetching leaves with filters:', filters);
      const params = { ...filters };
      if (!params.status) delete params.status;
      if (!params.applicationType) delete params.applicationType;
      if (!params.fromDate) delete params.fromDate;
      if (!params.toDate) delete params.toDate;
      const response = await api.get('/api/leave/principal/all', { params });
      console.log('Leave response:', response.data);
      if (response.data.success) {
        const newLeaves = response.data.data.leaves;
        setLeaves(newLeaves);
        console.log('Set leaves:', newLeaves);
        
        // Check if there are new warden-verified leaves and show notification
        const wardenVerifiedLeaves = newLeaves.filter(leave => leave.status === 'Warden Verified');
        
        // Find truly new leaves that haven't been notified about yet
        const newLeavesToNotify = wardenVerifiedLeaves.filter(leave => !notifiedLeaves.has(leave._id));
        
        if (newLeavesToNotify.length > 0) {
          console.log('🔔 New warden-verified leaves detected:', newLeavesToNotify.length);
          
          // Show toast notification for new leaves
          if (newLeavesToNotify.length === 1) {
            const leave = newLeavesToNotify[0];
            toast.success(`${leave.student?.name || 'A student'}'s ${leave.applicationType} request is ready for approval!`, {
              duration: 5000,
              icon: '🔔'
            });
          } else {
            toast.success(`${newLeavesToNotify.length} new leave requests are ready for approval!`, {
              duration: 5000,
              icon: '🔔'
            });
          }
          
          // Add these leaves to the notified set
          const newNotifiedSet = new Set(notifiedLeaves);
          newLeavesToNotify.forEach(leave => newNotifiedSet.add(leave._id));
          setNotifiedLeaves(newNotifiedSet);
          
          // Trigger notification refresh
          window.dispatchEvent(new Event('refresh-notifications'));
        }
      }
    } catch (error) {
      console.error('Error fetching leaves:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        headers: error.response?.headers
      });
      toast.error('Failed to fetch leave requests');
    } finally {
      setLoading(false);
    }
  };

  const fetchPreviousLeaves = async (studentId) => {
    try {
      setLoadingPreviousLeaves(true);
      const response = await api.get(`/api/leave/student/${studentId}/history`);
      if (response.data.success) {
        setPreviousLeaves(response.data.data.leaves);
      }
    } catch (error) {
      console.error('Error fetching previous leaves:', error);
      toast.error('Failed to fetch previous leaves');
      setPreviousLeaves([]);
    } finally {
      setLoadingPreviousLeaves(false);
    }
  };

  const handleApprove = async () => {
    try {
      const response = await api.post('/api/leave/principal/approve', {
        leaveId: selectedLeave._id,
        comment: approvalComment
      });
      if (response.data.success) {
        toast.success(`${selectedLeave.applicationType} request approved successfully`);
        setShowApproveModal(false);
        setApprovalComment('');
        fetchLeaves();
      }
    } catch (error) {
      console.error('Error approving leave:', error);
      toast.error(error.response?.data?.message || 'Failed to approve request');
    }
  };

  const handleReject = async () => {
    try {
      const response = await api.post('/api/leave/principal/reject', {
        leaveId: selectedLeave._id,
        rejectionReason
      });
      if (response.data.success) {
        toast.success(`${selectedLeave.applicationType} request rejected`);
        setShowRejectModal(false);
        setRejectionReason('');
        fetchLeaves();
      }
    } catch (error) {
      console.error('Error rejecting leave:', error);
      toast.error('Failed to reject request');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Approved':
        return 'text-green-600 bg-green-50';
      case 'Rejected':
        return 'text-red-600 bg-red-50';
      case 'Pending':
      case 'Pending OTP Verification':
        return 'text-yellow-600 bg-yellow-50';
      case 'Warden Verified':
        return 'text-blue-600 bg-blue-50';
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
      case 'Pending OTP Verification':
        return <ExclamationCircleIcon className="w-5 h-5" />;
      case 'Warden Verified':
        return <ShieldCheckIcon className="w-5 h-5" />;
      default:
        return null;
    }
  };

  const getApplicationTypeColor = (type) => {
    switch (type) {
      case 'Leave':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'Permission':
        return 'text-purple-600 bg-purple-50 border-purple-200';
      case 'Stay in Hostel':
        return 'text-green-600 bg-green-50 border-green-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const formatDisplayDate = (leave) => {
    if (leave.applicationType === 'Leave') {
      return {
        start: new Date(leave.startDate).toLocaleDateString(),
        end: new Date(leave.endDate).toLocaleDateString(),
        duration: `${leave.numberOfDays} day${leave.numberOfDays > 1 ? 's' : ''}`,
        gatePass: new Date(leave.gatePassDateTime).toLocaleString()
      };
    } else if (leave.applicationType === 'Permission') {
      return {
        date: new Date(leave.permissionDate).toLocaleDateString(),
        time: `${leave.outTime} - ${leave.inTime}`,
        duration: '1 day'
      };
    } else if (leave.applicationType === 'Stay in Hostel') {
      return {
        date: new Date(leave.stayDate).toLocaleDateString(),
        duration: '1 day'
      };
    }
    return {};
  };

  const openStudentDetailsModal = (student) => {
    setSelectedStudent(student);
    setStudentDetailsModal(true);
    // Fetch previous leaves for the student
    if (student._id) {
      fetchPreviousLeaves(student._id);
    }
  };



  return (
    <div className="min-h-screen bg-gray-50 mt-16 sm:mt-0">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-8">
        <SEO 
          title="Leave & Permission Management - Principal"
          description="Final approval of student leave and permission requests"
          keywords="leave management, permission management, principal approval"
        />

        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 sm:mb-6 gap-3 sm:gap-4">
          <div>
            <h1 className="text-lg sm:text-2xl font-bold text-purple-900">Leave & Permission Management</h1>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">
              Managing leave requests for your assigned course
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:gap-3 flex-wrap items-start sm:items-center">
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 items-start sm:items-center">
              <label className="text-xs sm:text-sm text-gray-600">From:</label>
              <input
                type="date"
                value={filters.fromDate}
                onChange={e => setFilters(f => ({ ...f, fromDate: e.target.value, page: 1 }))}
                className="px-2 py-1.5 sm:py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-xs sm:text-sm"
                style={{ minWidth: 120 }}
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 items-start sm:items-center">
              <label className="text-xs sm:text-sm text-gray-600">To:</label>
              <input
                type="date"
                value={filters.toDate}
                onChange={e => setFilters(f => ({ ...f, toDate: e.target.value, page: 1 }))}
                className="px-2 py-1.5 sm:py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-xs sm:text-sm"
                style={{ minWidth: 120 }}
              />
            </div>
            <select
              value={filters.applicationType}
              onChange={(e) => setFilters({ ...filters, applicationType: e.target.value, page: 1 })}
              className="px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-xs sm:text-sm"
            >
              <option value="">All Types</option>
              <option value="Leave">Leave</option>
              <option value="Permission">Permission</option>
              <option value="Stay in Hostel">Stay in Hostel</option>
            </select>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
              className="px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-xs sm:text-sm"
            >
              <option value="">All Status</option>
              <option value="Pending">Pending</option>
              <option value="Pending OTP Verification">Pending OTP</option>
              <option value="Warden Verified">Warden Verified</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
        </div>

        {/* Leave List */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {loading ? (
            <div className="p-6 sm:p-8 text-center">
              <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-purple-600 mx-auto"></div>
            </div>
          ) : leaves.length === 0 ? (
            <div className="p-6 sm:p-8 text-center text-gray-500">
              <DocumentTextIcon className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 text-gray-400" />
              <p className="text-xs sm:text-sm">No requests found</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {leaves.map((leave) => {
                const displayInfo = formatDisplayDate(leave);
                return (
                  <motion.div
                    key={leave._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 sm:p-6 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-0">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-2 sm:mb-3">
                          <span className={`inline-flex items-center px-2 py-0.5 sm:px-2.5 sm:py-0.5 rounded-full text-xs font-medium ${getStatusColor(leave.status)}`}>
                            {getStatusIcon(leave.status)}
                            <span className="ml-1">{leave.status}</span>
                          </span>
                          <span className={`inline-flex items-center px-2 py-0.5 sm:px-2.5 sm:py-0.5 rounded-full text-xs font-medium border ${getApplicationTypeColor(leave.applicationType)}`}>
                            {leave.applicationType}
                          </span>
                          <span className="text-xs sm:text-sm text-gray-500">
                            {new Date(leave.createdAt).toLocaleDateString()}
                          </span>
                        </div>

                        {/* Student Details */}
                        <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-2 sm:gap-4 mb-2 sm:mb-3">
                          <div className="flex items-center gap-1 text-xs sm:text-sm text-gray-600">
                            <UserIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                            <button
                              onClick={() => leave.student && openStudentDetailsModal(leave.student)}
                              className={`hover:text-purple-600 hover:underline transition-colors ${
                                leave.student ? 'cursor-pointer' : 'cursor-default'
                              }`}
                              disabled={!leave.student}
                            >
                              {leave.student?.name || 'N/A'}
                            </button>
                          </div>
                          <div className="flex items-center gap-1 text-xs sm:text-sm text-gray-600">
                            <AcademicCapIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                            <span>{leave.student?.rollNumber || 'N/A'}</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs sm:text-sm text-gray-600">
                            <PhoneIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                            <span>{leave.parentPhone || 'N/A'}</span>
                          </div>
                          {leave.student?.gender && (
                            <div className="flex items-center gap-1 text-xs sm:text-sm text-gray-600">
                              <span>Gender: {leave.student.gender === 'Male' ? 'Male' : 'Female'}</span>
                            </div>
                          )}
                        </div>

                        {/* Date/Time Information */}
                        <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600 mb-2">
                          {leave.applicationType === 'Leave' ? (
                            <>
                              <div className="flex items-center gap-1">
                                <CalendarIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                                <span>From: {displayInfo.start}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <CalendarIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                                <span>To: {displayInfo.end}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <ClockIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                                <span>{displayInfo.duration}</span>
                              </div>
                            </>
                          ) : leave.applicationType === 'Permission' ? (
                            <>
                              <div className="flex items-center gap-1">
                                <CalendarIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                                <span>Date: {displayInfo.date}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <ClockIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                                <span>Time: {displayInfo.time}</span>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="flex items-center gap-1">
                                <HomeIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                                <span>Date: {displayInfo.date}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <ClockIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                                <span>{displayInfo.duration}</span>
                              </div>
                            </>
                          )}
                        </div>

                        {/* Gate Pass Information for Leave */}
                        {leave.applicationType === 'Leave' && (
                          <div className="flex items-center gap-1 text-xs sm:text-sm text-gray-600 mb-2">
                            <ArrowRightIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                            <span>Gate Pass: {displayInfo.gatePass}</span>
                          </div>
                        )}

                        <p className="text-xs sm:text-sm text-gray-700 mb-2 break-words">{leave.reason}</p>

                        {leave.rejectionReason && (
                          <p className="text-xs sm:text-sm text-red-600">
                            Rejection Reason: {leave.rejectionReason}
                          </p>
                        )}

                        {/* Warden Verification Info */}
                        {leave.status === 'Warden Verified' && (
                          <div className="mt-2 p-2 bg-blue-50 rounded-lg">
                            <p className="text-xs text-blue-700">
                              <strong>Warden Verified:</strong> OTP has been verified by warden. Ready for final approval.
                            </p>
                          </div>
                        )}

                        {/* Action Buttons */}
                        {leave.status === 'Warden Verified' && (
                          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-3 sm:mt-4">
                            <button
                              onClick={() => {
                                setSelectedLeave(leave);
                                setShowApproveModal(true);
                              }}
                              className="px-3 sm:px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xs sm:text-sm font-medium touch-manipulation"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => {
                                setSelectedLeave(leave);
                                setShowRejectModal(true);
                              }}
                              className="px-3 sm:px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-xs sm:text-sm font-medium touch-manipulation"
                            >
                              Reject
                            </button>
                          </div>
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

      {/* Approve Modal */}
      {showApproveModal && selectedLeave && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl p-4 sm:p-6 w-full max-w-sm sm:max-w-md"
          >
            <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">Approve {selectedLeave.applicationType} Request</h2>
            <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">
              This request has been verified by the warden. You can add an optional comment for approval.
            </p>
            <textarea
              value={approvalComment}
              onChange={(e) => setApprovalComment(e.target.value)}
              placeholder="Optional approval comment (optional)"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 mb-3 sm:mb-4 text-xs sm:text-sm"
              rows="3"
            />
            <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
              <button
                onClick={() => {
                  setShowApproveModal(false);
                  setApprovalComment('');
                }}
                className="px-3 sm:px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors text-xs sm:text-sm font-medium touch-manipulation"
              >
                Cancel
              </button>
              <button
                onClick={handleApprove}
                className="px-3 sm:px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xs sm:text-sm font-medium touch-manipulation"
              >
                Approve Request
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedLeave && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl p-4 sm:p-6 w-full max-w-sm sm:max-w-md"
          >
            <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">Reject {selectedLeave.applicationType} Request</h2>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Enter reason for rejection"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 mb-3 sm:mb-4 text-xs sm:text-sm"
              rows="4"
            />
            <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectionReason('');
                }}
                className="px-3 sm:px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors text-xs sm:text-sm font-medium touch-manipulation"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                className="px-3 sm:px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-xs sm:text-sm font-medium touch-manipulation"
              >
                Reject Request
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Student Details Modal */}
      {studentDetailsModal && selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-6xl w-full max-h-[95vh] overflow-hidden">
            {/* Header */}
            <div className="flex justify-between items-center p-4 sm:p-6 border-b border-gray-200">
              <h3 className="text-lg sm:text-xl font-bold text-gray-800">Student Details</h3>
              <button
                onClick={() => setStudentDetailsModal(false)}
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

            {/* Previous Leaves Section */}
            <div className="border-t border-gray-200 p-4 sm:p-6 bg-gray-50">
              <h4 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4 flex items-center">
                <DocumentTextIcon className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                Previous Leave History
              </h4>
              
              {loadingPreviousLeaves ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600 mx-auto"></div>
                  <p className="text-xs sm:text-sm text-gray-500 mt-2">Loading previous leaves...</p>
                </div>
              ) : previousLeaves.length === 0 ? (
                <div className="text-center py-4">
                  <DocumentTextIcon className="w-8 h-8 sm:w-10 sm:h-10 mx-auto mb-2 text-gray-400" />
                  <p className="text-xs sm:text-sm text-gray-500">No previous leave records found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {previousLeaves.slice(0, 5).map((leave, index) => {
                    const displayInfo = formatDisplayDate(leave);
                    return (
                      <div key={leave._id || index} className="bg-white rounded-lg p-3 sm:p-4 border border-gray-200">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-3">
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(leave.status)}`}>
                                {getStatusIcon(leave.status)}
                                <span className="ml-1">{leave.status}</span>
                              </span>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getApplicationTypeColor(leave.applicationType)}`}>
                                {leave.applicationType}
                              </span>
                              <span className="text-xs text-gray-500">
                                {new Date(leave.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            
                            <div className="text-xs sm:text-sm text-gray-600 mb-2">
                              {leave.applicationType === 'Leave' ? (
                                <>
                                  <div className="flex items-center gap-1 mb-1">
                                    <CalendarIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                                    <span>{displayInfo.start} - {displayInfo.end} ({displayInfo.duration})</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <ArrowRightIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                                    <span>Gate Pass: {displayInfo.gatePass}</span>
                                  </div>
                                </>
                              ) : leave.applicationType === 'Permission' ? (
                                <>
                                  <div className="flex items-center gap-1 mb-1">
                                    <CalendarIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                                    <span>{displayInfo.date}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <ClockIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                                    <span>{displayInfo.time}</span>
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div className="flex items-center gap-1 mb-1">
                                    <HomeIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                                    <span>{displayInfo.date}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <ClockIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                                    <span>{displayInfo.duration}</span>
                                  </div>
                                </>
                              )}
                            </div>
                            
                            <p className="text-xs sm:text-sm text-gray-700 break-words">{leave.reason}</p>
                            
                            {leave.rejectionReason && (
                              <p className="text-xs sm:text-sm text-red-600 mt-1">
                                Rejection Reason: {leave.rejectionReason}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  
                  {previousLeaves.length > 5 && (
                    <div className="text-center py-2">
                      <p className="text-xs sm:text-sm text-gray-500">
                        Showing last 5 records. Total: {previousLeaves.length} leave records
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 p-4 sm:p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setStudentDetailsModal(false)}
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
    </div>
  );
};

export default LeaveManagement; 