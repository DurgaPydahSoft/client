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
    status: 'Pending OTP Verification',
    applicationType: '',
    page: 1,
    fromDate: '',
    toDate: ''
  });
  const [expandedBulkOutings, setExpandedBulkOutings] = useState(new Set());
  const [loadingStudentDetails, setLoadingStudentDetails] = useState(new Set());
  const [studentDetailsModal, setStudentDetailsModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);

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
      const params = { ...filters };
      if (!params.status) delete params.status;
      if (!params.applicationType) delete params.applicationType;
      if (!params.fromDate) delete params.fromDate;
      if (!params.toDate) delete params.toDate;
      const response = await api.get('/api/admin/leave/all', { params });
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
      const params = { ...filters };
      if (!params.status) delete params.status;
      if (!params.applicationType) delete params.applicationType;
      if (!params.fromDate) delete params.fromDate;
      if (!params.toDate) delete params.toDate;
      const response = await api.get('/api/bulk-outing/admin', { params });
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

  const handleTabSwitch = (tab) => {
    setActiveTab(tab);
    setFilters(f => ({
      ...f,
      status: tab === 'leaves' ? 'Pending OTP Verification' : '',
      page: 1
    }));
  };

  const openStudentDetailsModal = (student) => {
    setSelectedStudent(student);
    setStudentDetailsModal(true);
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
          <div className="flex gap-3 flex-wrap items-center">
            <label className="text-sm text-gray-600">From:</label>
            <input
              type="date"
              value={filters.fromDate}
              onChange={e => setFilters(f => ({ ...f, fromDate: e.target.value, page: 1 }))}
              className="px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              style={{ minWidth: 120 }}
            />
            <label className="text-sm text-gray-600">To:</label>
            <input
              type="date"
              value={filters.toDate}
              onChange={e => setFilters(f => ({ ...f, toDate: e.target.value, page: 1 }))}
              className="px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              style={{ minWidth: 120 }}
            />
            <select
              value={filters.applicationType}
              onChange={(e) => setFilters({ ...filters, applicationType: e.target.value, page: 1 })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Types</option>
              <option value="Leave">Leave</option>
              <option value="Permission">Permission</option>
            </select>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
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
            onClick={() => handleTabSwitch('leaves')}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'leaves'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Individual Requests
          </button>
          <button
            onClick={() => handleTabSwitch('bulk-outings')}
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
                              <button
                                onClick={() => leave.student && openStudentDetailsModal(leave.student)}
                                className={`hover:text-blue-600 hover:underline transition-colors ${
                                  leave.student ? 'cursor-pointer' : 'cursor-default'
                                }`}
                                disabled={!leave.student}
                              >
                                {leave.student?.name || 'N/A'}
                              </button>
                            </div>
                            <div className="flex items-center gap-1 text-sm text-gray-600">
                              <AcademicCapIcon className="w-4 h-4" />
                              <span>{leave.student?.rollNumber || 'N/A'}</span>
                            </div>
                            <div className="flex items-center gap-1 text-sm text-gray-600">
                              <PhoneIcon className="w-4 h-4" />
                              <span>{leave.parentPhone || 'N/A'}</span>
                            </div>
                            {leave.student?.gender && (
                              <div className="flex items-center gap-1 text-sm text-gray-600">
                                <span>Gender: {leave.student.gender === 'Male' ? 'Male' : 'Female'}</span>
                              </div>
                            )}
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
                              ) : outing.students && Array.isArray(outing.students) && outing.students.length > 0 ? (
                                (() => {
                                  const validStudents = outing.students.filter(student => student !== null && student !== undefined);
                                  return validStudents.length > 0 ? (
                                    <div className="space-y-2 max-h-60 overflow-y-auto">
                                      {validStudents.map((student, index) => (
                                      <div key={student._id || index} className="flex items-center justify-between p-2 bg-white rounded border">
                                        <div className="flex items-center gap-3">
                                          <div className="flex-shrink-0 h-8 w-8">
                                            {student.studentPhoto ? (
                                              <img
                                                className="h-8 w-8 rounded-full object-cover"
                                                src={student.studentPhoto}
                                                alt={student.name || 'Student'}
                                              />
                                            ) : (
                                              <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
                                                <span className="text-xs font-medium text-gray-700">
                                                  {(student.name || '?').charAt(0).toUpperCase()}
                                                </span>
                                              </div>
                                            )}
                                          </div>
                                          <div>
                                            <p className="text-sm font-medium text-gray-900">{student.name || 'N/A'}</p>
                                            <p className="text-xs text-gray-500">{student.rollNumber || 'N/A'}</p>
                                          </div>
                                        </div>
                                        <div className="text-right">
                                          <p className="text-xs text-gray-600">{(student.course?.name || student.course || 'N/A')} - {(student.branch?.name || student.branch || 'N/A')}</p>
                                          <p className="text-xs text-gray-500">Room {student.roomNumber || 'N/A'}</p>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                  ) : (
                                    <div className="text-center py-4 text-gray-500">
                                      <p className="text-sm">No valid student data available</p>
                                    </div>
                                  );
                                })()
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
            <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-xs text-blue-700">
                <strong>Note:</strong> The OTP (4 digits) was sent in both Telugu and English to the parent's phone.
              </p>
            </div>
            {/* OTP Input Boxes */}
            <div className="flex justify-center gap-2 mb-4">
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
                  className="w-12 h-12 text-2xl text-center border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  style={{ letterSpacing: '2px' }}
                  autoFocus={idx === 0}
                />
              ))}
            </div>
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
                disabled={otp.length !== 4 || !/^[0-9]{4}$/.test(otp)}
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

      {/* Student Details Modal */}
      {studentDetailsModal && selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-6xl w-full max-h-[95vh] overflow-hidden">
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-800">Student Details</h3>
              <button
                onClick={() => setStudentDetailsModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-lg"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(95vh-140px)]">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Photo and Basic Info */}
                <div className="lg:col-span-1">
                  {/* Student Photo */}
                  <div className="flex justify-center mb-6">
                    {selectedStudent.studentPhoto ? (
                      <img
                        src={selectedStudent.studentPhoto}
                        alt={selectedStudent.name}
                        className="w-40 h-40 rounded-full object-cover border-4 border-gray-200 shadow-lg"
                      />
                    ) : (
                      <div className="w-40 h-40 rounded-full bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center text-white text-4xl font-bold shadow-lg">
                        {selectedStudent.name?.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* Basic Information */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-lg font-semibold text-gray-800 mb-4">Basic Information</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Name:</span>
                        <span className="font-medium text-gray-900">{selectedStudent.name}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Roll Number:</span>
                        <span className="font-medium text-gray-900">{selectedStudent.rollNumber}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Hostel ID:</span>
                        <span className="font-medium text-gray-900">{selectedStudent.hostelId || 'Not assigned'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Gender:</span>
                        <span className="font-medium text-gray-900">{selectedStudent.gender}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Columns - Academic, Contact, and Hostel Info */}
                <div className="lg:col-span-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Academic Information */}
                    <div className="bg-blue-50 rounded-lg p-4">
                      <h4 className="text-lg font-semibold text-blue-800 mb-4 flex items-center">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                        Academic Information
                      </h4>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-blue-700">Course:</span>
                          <span className="font-medium text-blue-900">{selectedStudent.course?.name || selectedStudent.course}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-blue-700">Branch:</span>
                          <span className="font-medium text-blue-900">{selectedStudent.branch?.name || selectedStudent.branch}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-blue-700">Year:</span>
                          <span className="font-medium text-blue-900">Year {selectedStudent.year}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-blue-700">Category:</span>
                          <span className="font-medium text-blue-900">{selectedStudent.category === 'A+' ? 'A+ (AC)' : selectedStudent.category === 'B+' ? 'B+ (AC)' : selectedStudent.category}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-blue-700">Batch:</span>
                          <span className="font-medium text-blue-900">{selectedStudent.batch}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-blue-700">Academic Year:</span>
                          <span className="font-medium text-blue-900">{selectedStudent.academicYear}</span>
                        </div>
                      </div>
                    </div>

                    {/* Contact Information */}
                    <div className="bg-green-50 rounded-lg p-4">
                      <h4 className="text-lg font-semibold text-green-800 mb-4 flex items-center">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        Contact Information
                      </h4>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-green-700">Student Phone:</span>
                          <span className="font-medium text-green-900">{selectedStudent.studentPhone}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-green-700">Parent Phone:</span>
                          <span className="font-medium text-green-900">{selectedStudent.parentPhone}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-green-700">Email:</span>
                          <span className="font-medium text-green-900 break-all">{selectedStudent.email}</span>
                        </div>
                      </div>
                    </div>

                    {/* Hostel Information */}
                    <div className="bg-purple-50 rounded-lg p-4">
                      <h4 className="text-lg font-semibold text-purple-800 mb-4 flex items-center">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        Hostel Information
                      </h4>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-purple-700">Room Number:</span>
                          <span className="font-medium text-purple-900">Room {selectedStudent.roomNumber}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-purple-700">Hostel Status:</span>
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            selectedStudent.hostelStatus === 'Active' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {selectedStudent.hostelStatus}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-purple-700">Graduation Status:</span>
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

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setStudentDetailsModal(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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