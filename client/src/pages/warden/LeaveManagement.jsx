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
  HomeIcon
} from '@heroicons/react/24/outline';
import SEO from '../../components/SEO';

const LeaveManagement = () => {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [otp, setOtp] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [filters, setFilters] = useState({
    status: 'Pending OTP Verification',
    applicationType: '',
    page: 1,
    fromDate: '',
    toDate: ''
  });

  useEffect(() => {
    fetchLeaves();
  }, [filters]);

  const fetchLeaves = async () => {
    try {
      console.log('Fetching leaves with filters:', filters);
      const params = { ...filters };
      if (!params.status) delete params.status;
      if (!params.applicationType) delete params.applicationType;
      if (!params.fromDate) delete params.fromDate;
      if (!params.toDate) delete params.toDate;
      const response = await api.get('/api/leave/warden/all', { params });
      console.log('Leave response:', response.data);
      if (response.data.success) {
        setLeaves(response.data.data.leaves);
        console.log('Set leaves:', response.data.data.leaves);
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

  const handleVerifyOTP = async () => {
    try {
      const response = await api.post('/api/leave/warden/verify-otp', {
        leaveId: selectedLeave._id,
        otp
      });
      if (response.data.success) {
        toast.success(`${selectedLeave.applicationType} request verified and sent to principal for approval`);
        setShowOTPModal(false);
        setOtp('');
        fetchLeaves();
      }
    } catch (error) {
      console.error('Error verifying OTP:', error);
      toast.error(error.response?.data?.message || 'Failed to verify OTP');
    }
  };

  const handleReject = async () => {
    try {
      const response = await api.post('/api/leave/warden/reject', {
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
        return <CheckCircleIcon className="w-4 h-4 sm:w-5 sm:h-5" />;
      case 'Rejected':
        return <XCircleIcon className="w-4 h-4 sm:w-5 sm:h-5" />;
      case 'Pending':
      case 'Pending OTP Verification':
        return <ExclamationCircleIcon className="w-4 h-4 sm:w-5 sm:h-5" />;
      case 'Warden Verified':
        return <ArrowRightIcon className="w-4 h-4 sm:w-5 sm:h-5" />;
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

  return (
    <div className="min-h-screen bg-gray-50">
      <SEO 
        title="Leave & Permission Management - Warden"
        description="Verify OTP and manage student leave and permission requests"
        keywords="leave management, permission management, OTP verification, warden"
      />
      
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8 mt-12 sm:mt-0">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg sm:rounded-xl shadow-sm p-3 sm:p-4 lg:p-6 mb-3 sm:mb-4 lg:mb-6"
        >
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 sm:gap-4">
            <div>
              <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-green-900 flex items-center gap-2 sm:gap-3">
                <DocumentTextIcon className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-green-600 flex-shrink-0" />
                <span>Leave & Permission Management</span>
              </h1>
              <p className="text-xs sm:text-sm lg:text-base text-gray-600 mt-1 sm:mt-2">
                OTP verification for leave requests - forwards to course-specific principals
              </p>
            </div>
          </div>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-lg sm:rounded-xl shadow-sm p-3 sm:p-4 lg:p-6 mb-3 sm:mb-4 lg:mb-6"
        >
          <div className="flex flex-col gap-3 sm:gap-4">
            {/* Date Range */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <div className="flex-1">
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">From Date</label>
                <input
                  type="date"
                  value={filters.fromDate}
                  onChange={e => setFilters(f => ({ ...f, fromDate: e.target.value, page: 1 }))}
                  className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500 text-xs sm:text-sm"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">To Date</label>
                <input
                  type="date"
                  value={filters.toDate}
                  onChange={e => setFilters(f => ({ ...f, toDate: e.target.value, page: 1 }))}
                  className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500 text-xs sm:text-sm"
                />
              </div>
            </div>
            
            {/* Dropdowns */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <div className="flex-1">
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Application Type</label>
                <select
                  value={filters.applicationType}
                  onChange={(e) => setFilters({ ...filters, applicationType: e.target.value, page: 1 })}
                  className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500 text-xs sm:text-sm"
                >
                  <option value="">All Types</option>
                  <option value="Leave">Leave</option>
                  <option value="Permission">Permission</option>
                  <option value="Stay in Hostel">Stay in Hostel</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
                  className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500 text-xs sm:text-sm"
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
          </div>
        </motion.div>

        {/* Leave List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-lg sm:rounded-xl shadow-sm overflow-hidden"
        >
          {loading ? (
            <div className="p-6 sm:p-8 text-center">
              <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-green-600 mx-auto"></div>
            </div>
          ) : leaves.length === 0 ? (
            <div className="p-6 sm:p-8 text-center text-gray-500">
              <DocumentTextIcon className="w-8 h-8 sm:w-12 sm:h-12 mx-auto mb-2 sm:mb-3 text-gray-400" />
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
                    className="p-3 sm:p-4 lg:p-6 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex flex-col gap-3 sm:gap-4">
                      {/* Status and Type Badges */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`inline-flex items-center px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-xs font-medium ${getStatusColor(leave.status)}`}>
                          {getStatusIcon(leave.status)}
                          <span className="ml-1">{leave.status === 'Pending OTP Verification' ? 'Pending OTP' : leave.status}</span>
                        </span>
                        <span className={`inline-flex items-center px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-xs font-medium border ${getApplicationTypeColor(leave.applicationType)}`}>
                          {leave.applicationType}
                        </span>
                        <span className="text-xs sm:text-sm text-gray-500">
                          {new Date(leave.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      {/* Student Details */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
                        <div className="flex items-center gap-1 text-xs sm:text-sm text-gray-600">
                          <UserIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                          <span className="truncate">{leave.student?.name || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs sm:text-sm text-gray-600">
                          <AcademicCapIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                          <span className="truncate">{leave.student?.rollNumber || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs sm:text-sm text-gray-600">
                          <PhoneIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                          <span className="truncate">{leave.parentPhone || 'N/A'}</span>
                        </div>
                        {leave.student?.gender && (
                          <div className="flex items-center gap-1 text-xs sm:text-sm text-gray-600">
                            <span>Gender: {leave.student.gender === 'Male' ? 'Male' : 'Female'}</span>
                          </div>
                        )}
                      </div>

                      {/* Date/Time Information */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 text-xs sm:text-sm text-gray-600">
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
                        <div className="flex items-center gap-1 text-xs sm:text-sm text-gray-600">
                          <ArrowRightIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                          <span>Gate Pass: {displayInfo.gatePass}</span>
                        </div>
                      )}

                      {/* Reason */}
                      <div className="text-xs sm:text-sm text-gray-700 break-words">
                        <strong>Reason:</strong> {leave.reason}
                      </div>

                      {/* Rejection Reason */}
                      {leave.rejectionReason && (
                        <div className="text-xs sm:text-sm text-red-600">
                          <strong>Rejection Reason:</strong> {leave.rejectionReason}
                        </div>
                      )}

                      {/* Action Buttons */}
                      {leave.status === 'Pending OTP Verification' && (
                        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-3 sm:mt-4">
                          <button
                            onClick={() => {
                              setSelectedLeave(leave);
                              setShowOTPModal(true);
                            }}
                            className="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xs sm:text-sm font-medium"
                          >
                            Verify OTP
                          </button>
                          <button
                            onClick={() => {
                              setSelectedLeave(leave);
                              setShowRejectModal(true);
                            }}
                            className="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-xs sm:text-sm font-medium"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>

      {/* OTP Verification Modal */}
      {showOTPModal && selectedLeave && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg sm:rounded-xl p-4 sm:p-6 w-full max-w-md"
          >
            <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">Verify OTP</h2>
            <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">
              Enter the OTP sent to the parent's phone number: {selectedLeave.parentPhone}
            </p>
            <div className="mb-3 sm:mb-4 p-2 sm:p-3 bg-green-50 rounded-lg border border-green-200">
              <p className="text-xs text-green-700">
                <strong>Note:</strong> After OTP verification, the request will be sent to the principal for final approval.
              </p>
            </div>
            {/* OTP Input Boxes */}
            <div className="flex justify-center gap-2 mb-3 sm:mb-4">
              {[0, 1, 2, 3].map((idx) => (
                <input
                  key={idx}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={otp[idx] || ''}
                  onChange={e => {
                    const val = e.target.value.replace(/[^0-9]/g, '');
                    if (!val) return;
                    const newOtp = otp.split('');
                    newOtp[idx] = val;
                    setOtp(newOtp.join('').slice(0, 4));
                    // Auto-focus next
                    const next = document.getElementById(`otp-input-${idx + 1}`);
                    if (next && val) next.focus();
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Backspace') {
                      if (otp[idx]) {
                        // Clear current digit only
                        const newOtp = otp.split('');
                        newOtp[idx] = '';
                        setOtp(newOtp.join(''));
                        e.preventDefault();
                      } else if (idx > 0) {
                        // Move focus to previous box
                        const prev = document.getElementById(`otp-input-${idx - 1}`);
                        if (prev) prev.focus();
                      }
                    }
                  }}
                  id={`otp-input-${idx}`}
                  name={`otp-${idx}`}
                  autoComplete="one-time-code"
                  className="w-10 h-10 sm:w-12 sm:h-12 text-lg sm:text-2xl text-center border border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  style={{ letterSpacing: '2px' }}
                  autoFocus={idx === 0}
                />
              ))}
            </div>
            <div className="flex flex-col gap-2 sm:gap-3">
              <button
                onClick={handleVerifyOTP}
                className="w-full px-3 sm:px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xs sm:text-sm font-medium"
                disabled={otp.length !== 4 || !/^[0-9]{4}$/.test(otp)}
              >
                Verify & Forward
              </button>
              <button
                onClick={() => {
                  setShowOTPModal(false);
                  setOtp('');
                }}
                className="w-full px-3 sm:px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors text-xs sm:text-sm"
              >
                Cancel
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
            className="bg-white rounded-lg sm:rounded-xl p-4 sm:p-6 w-full max-w-md"
          >
            <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">Reject {selectedLeave.applicationType} Request</h2>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Enter reason for rejection"
              className="w-full px-2 sm:px-3 py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 mb-3 sm:mb-4"
              rows="4"
            />
            <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectionReason('');
                }}
                className="px-3 sm:px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors text-xs sm:text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                className="px-3 sm:px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-xs sm:text-sm"
              >
                Reject Request
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default LeaveManagement; 