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
  ArrowRightIcon
} from '@heroicons/react/24/outline';
import SEO from '../../components/SEO';

const LeaveManagement = () => {
  const [leaves, setLeaves] = useState([]);
  const [bulkOutings, setBulkOutings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bulkOutingsLoading, setBulkOutingsLoading] = useState(false);
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [otp, setOtp] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [activeTab, setActiveTab] = useState('leaves'); // 'leaves' or 'bulk-outings'
  const [filters, setFilters] = useState({
    status: '',
    applicationType: '',
    page: 1
  });
  const [expandedBulkOutings, setExpandedBulkOutings] = useState(new Set());
  const [loadingStudentDetails, setLoadingStudentDetails] = useState(new Set());

  useEffect(() => {
    if (activeTab === 'leaves') {
      fetchLeaves();
    } else {
      fetchBulkOutings();
    }
  }, [filters, activeTab]);

  const fetchLeaves = async () => {
    try {
      console.log('Fetching leaves with filters:', filters);
      const response = await api.get('/api/admin/leave/all', { params: filters });
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

  const fetchBulkOutings = async () => {
    setBulkOutingsLoading(true);
    try {
      const response = await api.get('/api/bulk-outing/admin', { params: filters });
      if (response.data.success) {
        setBulkOutings(response.data.data.bulkOutings);
      }
    } catch (error) {
      console.error('Error fetching bulk outings:', error);
      toast.error('Failed to fetch bulk outing requests');
    } finally {
      setBulkOutingsLoading(false);
    }
  };

  const fetchBulkOutingStudents = async (outingId) => {
    // Set loading state for this specific outing
    setLoadingStudentDetails(prev => new Set(prev).add(outingId));
    
    try {
      const response = await api.get(`/api/bulk-outing/admin/${outingId}/students`);
      if (response.data.success) {
        // Update the specific bulk outing with student details
        setBulkOutings(prev => prev.map(outing => 
          outing._id === outingId 
            ? { ...outing, students: response.data.data.students }
            : outing
        ));
      }
    } catch (error) {
      console.error('Error fetching bulk outing students:', error);
      // Don't show error toast for 404 or other expected errors
      if (error.response?.status !== 404) {
        toast.error('Failed to fetch student details');
      }
    } finally {
      // Clear loading state for this specific outing
      setLoadingStudentDetails(prev => {
        const newSet = new Set(prev);
        newSet.delete(outingId);
        return newSet;
      });
    }
  };

  const handleApproveBulkOuting = async (bulkOutingId) => {
    try {
      const response = await api.post(`/api/bulk-outing/admin/${bulkOutingId}/approve`);
      if (response.data.success) {
        toast.success('Bulk outing request approved successfully');
        fetchBulkOutings();
      }
    } catch (error) {
      console.error('Error approving bulk outing:', error);
      toast.error(error.response?.data?.message || 'Failed to approve bulk outing');
    }
  };

  const handleRejectBulkOuting = async (bulkOutingId, reason) => {
    try {
      const response = await api.post(`/api/bulk-outing/admin/${bulkOutingId}/reject`, {
        rejectionReason: reason
      });
      if (response.data.success) {
        toast.success('Bulk outing request rejected successfully');
        fetchBulkOutings();
      }
    } catch (error) {
      console.error('Error rejecting bulk outing:', error);
      toast.error(error.response?.data?.message || 'Failed to reject bulk outing');
    }
  };

  const handleVerifyOTP = async () => {
    try {
      const response = await api.post('/api/admin/leave/verify-otp', {
        leaveId: selectedLeave._id,
        otp
      });
      if (response.data.success) {
        toast.success(`${selectedLeave.applicationType} request approved`);
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
      const response = await api.post('/api/admin/leave/reject', {
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
    }
    return {};
  };

  const toggleBulkOutingExpansion = (outingId) => {
    setExpandedBulkOutings(prev => {
      const newSet = new Set(prev);
      if (newSet.has(outingId)) {
        newSet.delete(outingId);
      } else {
        newSet.add(outingId);
        // Fetch student details when expanding
        fetchBulkOutingStudents(outingId);
      }
      return newSet;
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <SEO 
          title="Leave & Permission Management"
          description="Manage student leave and permission requests"
          keywords="leave management, permission management, student permissions, hostel leave"
        />

        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
          <h1 className="text-2xl font-bold text-blue-900">Leave & Permission Management</h1>
          <div className="flex gap-3 flex-wrap">
            <select
              value={filters.applicationType}
              onChange={(e) => setFilters({ ...filters, applicationType: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Types</option>
              <option value="Leave">Leave</option>
              <option value="Permission">Permission</option>
            </select>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Status</option>
              <option value="Pending">Pending</option>
              <option value="Pending OTP Verification">Pending OTP</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-6">
          <button
            onClick={() => setActiveTab('leaves')}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'leaves'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Individual Requests
          </button>
          <button
            onClick={() => setActiveTab('bulk-outings')}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'bulk-outings'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Bulk Outing Requests
          </button>
        </div>

        {/* Content based on active tab */}
        {activeTab === 'leaves' ? (
          /* Leave List */
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            ) : leaves.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <p>No requests found</p>
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
                      className="p-6 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(leave.status)}`}>
                              {getStatusIcon(leave.status)}
                              <span className="ml-1">{leave.status}</span>
                            </span>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getApplicationTypeColor(leave.applicationType)}`}>
                              {leave.applicationType}
                            </span>
                            <span className="text-sm text-gray-500">
                              {new Date(leave.createdAt).toLocaleDateString()}
                            </span>
                          </div>

                          {/* Student Details */}
                          <div className="flex flex-wrap items-center gap-4 mb-3">
                            <div className="flex items-center gap-1 text-sm text-gray-600">
                              <UserIcon className="w-4 h-4" />
                              <span>{leave.student?.name || 'N/A'}</span>
                            </div>
                            <div className="flex items-center gap-1 text-sm text-gray-600">
                              <AcademicCapIcon className="w-4 h-4" />
                              <span>{leave.student?.rollNumber || 'N/A'}</span>
                            </div>
                            <div className="flex items-center gap-1 text-sm text-gray-600">
                              <PhoneIcon className="w-4 h-4" />
                              <span>{leave.parentPhone || 'N/A'}</span>
                            </div>
                          </div>

                          {/* Date/Time Information */}
                          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-2">
                            {leave.applicationType === 'Leave' ? (
                              <>
                                <div className="flex items-center gap-1">
                                  <CalendarIcon className="w-4 h-4" />
                                  <span>From: {displayInfo.start}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <CalendarIcon className="w-4 h-4" />
                                  <span>To: {displayInfo.end}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <ClockIcon className="w-4 h-4" />
                                  <span>{displayInfo.duration}</span>
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="flex items-center gap-1">
                                  <CalendarIcon className="w-4 h-4" />
                                  <span>Date: {displayInfo.date}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <ClockIcon className="w-4 h-4" />
                                  <span>Time: {displayInfo.time}</span>
                                </div>
                              </>
                            )}
                          </div>

                          {/* Gate Pass Information for Leave */}
                          {leave.applicationType === 'Leave' && (
                            <div className="flex items-center gap-1 text-sm text-gray-600 mb-2">
                              <ArrowRightIcon className="w-4 h-4" />
                              <span>Gate Pass: {displayInfo.gatePass}</span>
                            </div>
                          )}

                          <p className="text-gray-700 mb-2 break-words">{leave.reason}</p>

                          {leave.rejectionReason && (
                            <p className="text-sm text-red-600">
                              Rejection Reason: {leave.rejectionReason}
                            </p>
                          )}

                          {/* Action Buttons */}
                          {leave.status === 'Pending OTP Verification' && (
                            <div className="flex gap-3 mt-4">
                              <button
                                onClick={() => {
                                  setSelectedLeave(leave);
                                  setShowOTPModal(true);
                                }}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                              >
                                Verify OTP
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedLeave(leave);
                                  setShowRejectModal(true);
                                }}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
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
        ) : (
          /* Bulk Outing List */
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            {bulkOutingsLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            ) : bulkOutings.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <p>No bulk outing requests found</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {bulkOutings.map((outing) => (
                  <motion.div
                    key={outing._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-6 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(outing.status)}`}>
                            {getStatusIcon(outing.status)}
                            <span className="ml-1">{outing.status}</span>
                          </span>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border text-purple-600 bg-purple-50 border-purple-200">
                            Bulk Outing
                          </span>
                          <span className="text-sm text-gray-500">
                            {new Date(outing.createdAt).toLocaleDateString()}
                          </span>
                        </div>

                        {/* Warden Details */}
                        <div className="flex flex-wrap items-center gap-4 mb-3">
                          <div className="flex items-center gap-1 text-sm text-gray-600">
                            <UserIcon className="w-4 h-4" />
                            <span>Warden: {outing.createdBy?.username || 'N/A'}</span>
                          </div>
                          <div className="flex items-center gap-1 text-sm text-gray-600">
                            <span>Hostel: {outing.createdBy?.hostelType || 'N/A'}</span>
                          </div>
                          <div className="flex items-center gap-1 text-sm text-gray-600">
                            <span>Students: {outing.studentCount}</span>
                          </div>
                        </div>

                        {/* Outing Details */}
                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-2">
                          <div className="flex items-center gap-1">
                            <CalendarIcon className="w-4 h-4" />
                            <span>Date: {new Date(outing.outingDate).toLocaleDateString()}</span>
                          </div>
                        </div>

                        <p className="text-gray-700 mb-2 break-words">{outing.reason}</p>

                        {/* Student Details Section */}
                        <div className="mt-4">
                          <button
                            onClick={() => toggleBulkOutingExpansion(outing._id)}
                            className="flex items-center gap-2 text-sm text-purple-600 hover:text-purple-700 font-medium"
                          >
                            <span>{expandedBulkOutings.has(outing._id) ? 'Hide' : 'Show'} Student Details</span>
                            <svg
                              className={`w-4 h-4 transition-transform ${expandedBulkOutings.has(outing._id) ? 'rotate-180' : ''}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>

                          {expandedBulkOutings.has(outing._id) && (
                            <div className="mt-3 p-4 bg-gray-50 rounded-lg">
                              <h5 className="text-sm font-medium text-gray-900 mb-3">Students in this outing:</h5>
                              
                              {loadingStudentDetails.has(outing._id) ? (
                                <div className="flex justify-center py-4">
                                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
                                </div>
                              ) : outing.students && outing.students.length > 0 ? (
                                <div className="space-y-2 max-h-60 overflow-y-auto">
                                  {outing.students.map((student, index) => (
                                    <div key={student._id || index} className="flex items-center justify-between p-2 bg-white rounded border">
                                      <div className="flex items-center gap-3">
                                        <div className="flex-shrink-0 h-8 w-8">
                                          {student.studentPhoto ? (
                                            <img
                                              className="h-8 w-8 rounded-full object-cover"
                                              src={student.studentPhoto}
                                              alt={student.name}
                                            />
                                          ) : (
                                            <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
                                              <span className="text-xs font-medium text-gray-700">
                                                {student.name?.charAt(0).toUpperCase()}
                                              </span>
                                            </div>
                                          )}
                                        </div>
                                        <div>
                                          <p className="text-sm font-medium text-gray-900">{student.name}</p>
                                          <p className="text-xs text-gray-500">{student.rollNumber}</p>
                                        </div>
                                      </div>
                                      <div className="text-right">
                                        <p className="text-xs text-gray-600">{(student.course?.name || student.course || 'N/A')} - {(student.branch?.name || student.branch || 'N/A')}</p>
                                        <p className="text-xs text-gray-500">Room {student.roomNumber}</p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-center py-4 text-gray-500">
                                  <p className="text-sm">Student details not available</p>
                                  <p className="text-xs text-gray-400 mt-1">Click "Show Student Details" to load</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {outing.rejectionReason && (
                          <p className="text-sm text-red-600">
                            Rejection Reason: {outing.rejectionReason}
                          </p>
                        )}

                        {/* Action Buttons */}
                        {outing.status === 'Pending' && (
                          <div className="flex gap-3 mt-4">
                            <button
                              onClick={() => handleApproveBulkOuting(outing._id)}
                              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => {
                                const reason = prompt('Enter rejection reason:');
                                if (reason) {
                                  handleRejectBulkOuting(outing._id, reason);
                                }
                              }}
                              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* OTP Verification Modal */}
      {showOTPModal && selectedLeave && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl p-6 w-full max-w-md"
          >
            <h2 className="text-xl font-semibold mb-4">Verify OTP</h2>
            <p className="text-sm text-gray-600 mb-4">
              Enter the OTP sent to the parent's phone number: {selectedLeave.parentPhone}
            </p>
            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="Enter OTP"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-4"
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowOTPModal(false);
                  setOtp('');
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleVerifyOTP}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Verify & Approve
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedLeave && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl p-6 w-full max-w-md"
          >
            <h2 className="text-xl font-semibold mb-4">Reject {selectedLeave.applicationType} Request</h2>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Enter reason for rejection"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-4"
              rows="4"
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectionReason('');
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
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