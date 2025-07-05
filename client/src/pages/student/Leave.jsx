import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import api from '../../utils/axios';
import toast from 'react-hot-toast';
import QRCode from 'react-qr-code';
import {
  CalendarIcon,
  DocumentTextIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationCircleIcon,
  ArrowRightIcon,
  HomeIcon
} from '@heroicons/react/24/outline';
import SEO from '../../components/SEO';
import { useAuth } from '../../context/AuthContext';

const Leave = () => {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [qrModal, setQrModal] = useState({ open: false, leave: null });
  const [applicationType, setApplicationType] = useState('Leave');
  
  // Form data for Leave applications
  const [leaveFormData, setLeaveFormData] = useState({
    startDate: '',
    endDate: '',
    gatePassDateTime: '',
    reason: ''
  });
  
  // Form data for Permission applications
  const [permissionFormData, setPermissionFormData] = useState({
    permissionDate: '',
    outTime: '',
    inTime: '',
    reason: ''
  });

  // Form data for Stay in Hostel applications
  const [stayInHostelFormData, setStayInHostelFormData] = useState({
    stayDate: '',
    reason: ''
  });
  
  const { user } = useAuth ? useAuth() : { user: null };

  useEffect(() => {
    fetchLeaves();
  }, []);

  const fetchLeaves = async () => {
    try {
      console.log('Fetching leave requests...');
      const response = await api.get('/api/leave/my-requests');
      console.log('Leave response:', response.data);
      
      if (response.data.success) {
        setLeaves(response.data.data);
      } else {
        throw new Error(response.data.message || 'Failed to fetch leave requests');
      }
    } catch (error) {
      console.error('Error fetching leaves:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        headers: error.response?.headers
      });
      
      if (error.response?.status === 401) {
        toast.error('Please login again to continue');
        // Redirect to login if needed
      } else {
        toast.error(error.response?.data?.message || 'Failed to fetch leave requests');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      let formData;
      if (applicationType === 'Leave') {
        // Gate Pass Time Validation
        const gatePassTime = new Date(leaveFormData.gatePassDateTime);
        const hours = gatePassTime.getHours();
        const minutes = gatePassTime.getMinutes();

        if (hours < 16 || (hours === 16 && minutes <= 30)) {
          toast.error('Gate Pass time must be after 4:30 PM.');
          return; // Stop submission
        }
        
        formData = {
          applicationType: 'Leave',
          ...leaveFormData
        };
      } else if (applicationType === 'Permission') {
        formData = {
          applicationType: 'Permission',
          ...permissionFormData
        };
      } else if (applicationType === 'Stay in Hostel') {
        formData = {
          applicationType: 'Stay in Hostel',
          ...stayInHostelFormData
        };
      }

      console.log('Submitting request:', formData);
      const response = await api.post('/api/leave/create', formData);
      console.log('Submit response:', response.data);
      
      if (response.data.success) {
        toast.success(response.data.data.message || 'Request submitted successfully');
        setShowRequestModal(false);
        resetFormData();
        fetchLeaves();
      } else {
        throw new Error(response.data.message || 'Failed to submit request');
      }
    } catch (error) {
      console.error('Error submitting request:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        headers: error.response?.headers
      });
      
      if (error.response?.status === 401) {
        toast.error('Please login again to continue');
        // Redirect to login if needed
      } else {
        toast.error(error.response?.data?.message || 'Failed to submit request');
      }
    }
  };

  const resetFormData = () => {
    setLeaveFormData({
      startDate: '',
      endDate: '',
      gatePassDateTime: '',
      reason: ''
    });
    setPermissionFormData({
      permissionDate: '',
      outTime: '',
      inTime: '',
      reason: ''
    });
    setStayInHostelFormData({
      stayDate: '',
      reason: ''
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Approved':
      case 'Principal Approved':
        return 'text-green-600 bg-green-50';
      case 'Rejected':
      case 'Principal Rejected':
        return 'text-red-600 bg-red-50';
      case 'Pending':
      case 'Pending OTP Verification':
        return 'text-yellow-600 bg-yellow-50';
      case 'Warden Recommended':
        return 'text-blue-600 bg-blue-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Approved':
      case 'Principal Approved':
        return <CheckCircleIcon className="w-5 h-5" />;
      case 'Rejected':
      case 'Principal Rejected':
        return <XCircleIcon className="w-5 h-5" />;
      case 'Pending':
      case 'Pending OTP Verification':
        return <ExclamationCircleIcon className="w-5 h-5" />;
      case 'Warden Recommended':
        return <ArrowRightIcon className="w-5 h-5" />;
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

  // Helper function to check if QR is available
  const isQrAvailable = (leave) => {
    if (leave.status !== 'Approved' || leave.visitLocked || leave.applicationType === 'Stay in Hostel') {
      return false;
    }
    const now = new Date();
    const qrAvailableFrom = new Date(leave.qrAvailableFrom);
    
    if (leave.applicationType === 'Leave') {
      const endDate = new Date(leave.endDate);
      return now >= qrAvailableFrom && now <= endDate;
    } else if (leave.applicationType === 'Permission') {
      const permissionDate = new Date(leave.permissionDate);
      const startOfDay = new Date(permissionDate.setHours(0, 0, 0, 0));
      const endOfDay = new Date(permissionDate.setHours(23, 59, 59, 999));
      return now >= startOfDay && now <= endOfDay;
    }
    
    return false;
  };

  // Helper function to get time until QR is available
  const getTimeUntilQrAvailable = (leave) => {
    const now = new Date();
    const qrAvailableFrom = new Date(leave.qrAvailableFrom);
    const diffMs = qrAvailableFrom - now;
    const diffMins = Math.ceil(diffMs / (1000 * 60));
    return diffMins;
  };

  // Helper function to format display date
  const formatDisplayDate = (leave) => {
    if (leave.applicationType === 'Leave') {
      return {
        start: new Date(leave.startDate).toLocaleDateString(),
        end: new Date(leave.endDate).toLocaleDateString(),
        duration: `${leave.numberOfDays} day${leave.numberOfDays > 1 ? 's' : ''}`
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

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().slice(0, 10);

  return (
    <div className="min-h-screen bg-gray-50 ">
      <div className="max-w-7xl mx-auto px-2 sm:px-6 py-4 sm:py-8">
        <SEO 
          title="Leave & Permission Requests"
          description="Submit and track your hostel leave and permission requests"
          keywords="leave request, permission request, hostel leave, student permissions"
        />

        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 sm:mb-6 gap-3 sm:gap-0 mt-4">
          <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-900 to-blue-700 bg-clip-text text-transparent">Leave & Permission Requests</h1>
          <button
            onClick={() => setShowRequestModal(true)}
            className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-base sm:text-base"
          >
            New Request
          </button>
        </div>

        {/* Leave List */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          ) : leaves.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <DocumentTextIcon className="w-12 h-12 mx-auto mb-3 text-gray-400" />
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
                    className="p-4 sm:p-6 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(leave.status)}`}>
                            {getStatusIcon(leave.status)}
                            <span className="ml-1">{leave.status}</span>
                          </span>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getApplicationTypeColor(leave.applicationType)}`}>
                            {leave.applicationType}
                          </span>
                          <span className="text-xs sm:text-sm text-gray-500">
                            {new Date(leave.createdAt).toLocaleDateString()}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-gray-600 mb-2">
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
                          ) : leave.applicationType === 'Permission' ? (
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
                          ) : (
                            <>
                              <div className="flex items-center gap-1">
                                <HomeIcon className="w-4 h-4" />
                                <span>Date: {displayInfo.date}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <ClockIcon className="w-4 h-4" />
                                <span>{displayInfo.duration}</span>
                              </div>
                            </>
                          )}
                        </div>

                        <p className="text-gray-700 mb-2 text-sm sm:text-base break-words">{leave.reason}</p>

                        {leave.rejectionReason && (
                          <p className="text-xs sm:text-sm text-red-600">
                            Rejection Reason: {leave.rejectionReason}
                          </p>
                        )}

                        {/* Show warden recommendation for Stay in Hostel requests */}
                        {leave.applicationType === 'Stay in Hostel' && leave.wardenRecommendation && (
                          <div className="mt-2 p-2 bg-blue-50 rounded-lg">
                            <p className="text-xs sm:text-sm text-blue-700">
                              <strong>Warden Recommendation:</strong> {leave.wardenRecommendation}
                              {leave.wardenComment && ` - ${leave.wardenComment}`}
                            </p>
                          </div>
                        )}

                        {/* Show principal decision for Stay in Hostel requests */}
                        {leave.applicationType === 'Stay in Hostel' && leave.principalDecision && (
                          <div className="mt-2 p-2 bg-green-50 rounded-lg">
                            <p className="text-xs sm:text-sm text-green-700">
                              <strong>Principal Decision:</strong> {leave.principalDecision}
                              {leave.principalComment && ` - ${leave.principalComment}`}
                            </p>
                          </div>
                        )}
                      </div>
                      {/* QR Code Button for Approved Leave/Permission */}
                      {leave.status === 'Approved' && (
                        <div className="flex flex-col gap-2">
                          {isQrAvailable(leave) ? (
                            <button
                              className={`w-full sm:w-auto px-3 py-2 rounded transition-colors text-sm font-semibold ${leave.visitLocked ? 'bg-gray-400 text-white cursor-not-allowed' : 'bg-green-600 text-white hover:bg-green-700'}`}
                              disabled={leave.visitLocked}
                              onClick={async () => {
                                if (leave.visitLocked) return;
                                try {
                                  const res = await api.post(`/api/leave/qr-view/${leave._id}`);
                                  if (res.data.success) {
                                    setQrModal({ open: true, leave });
                                  }
                                } catch (err) {
                                  if (err.response && err.response.data && err.response.data.visitLocked) {
                                    toast.error('Visit limit reached');
                                    // Optionally update UI
                                    leave.visitLocked = true;
                                    setLeaves([...leaves]);
                                  } else {
                                    toast.error('Unable to open QR code');
                                  }
                                }
                              }}
                            >
                              {leave.visitLocked ? 'Visit Locked' : 'View QR Code'}
                            </button>
                          ) : null}
                          
                          {/* Visit Count Display */}
                          <div className="text-center">
                            <div className="text-xs text-gray-500">
                              Visits: {leave.visitCount || 0}/{leave.maxVisits || 2}
                            </div>
                            {new Date() < new Date(leave.qrAvailableFrom) ? (
                              <div className="text-xs text-gray-500">
                                QR available in {getTimeUntilQrAvailable(leave)} min
                              </div>
                            ) : (
                              <div className="text-xs text-red-500">
                                .
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* QR Code Modal */}
      {qrModal.open && qrModal.leave && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl p-8 w-full max-w-md flex flex-col items-center"
          >
            <h2 className="text-xl font-bold mb-4 text-green-700">
              {qrModal.leave.applicationType} QR Code
            </h2>
            <QRCode
              value={`${window.location.origin}/leave/qr/${qrModal.leave._id}`}
              size={200}
            />
            <button
              className="mt-8 px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-800 transition-colors"
              onClick={() => setQrModal({ open: false, leave: null })}
            >
              Close
            </button>
          </motion.div>
        </div>
      )}

      {/* Request Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
          >
            <h2 className="text-xl font-semibold mb-4">New Request</h2>
            
            {/* Application Type Selector */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Application Type
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setApplicationType('Leave')}
                  className={`px-4 py-2 rounded-lg border transition-colors text-sm ${
                    applicationType === 'Leave'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Leave
                </button>
                <button
                  type="button"
                  onClick={() => setApplicationType('Permission')}
                  className={`px-4 py-2 rounded-lg border transition-colors text-sm ${
                    applicationType === 'Permission'
                      ? 'bg-purple-600 text-white border-purple-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Permission
                </button>
                <button
                  type="button"
                  onClick={() => setApplicationType('Stay in Hostel')}
                  className={`px-4 py-2 rounded-lg border transition-colors text-sm ${
                    applicationType === 'Stay in Hostel'
                      ? 'bg-green-600 text-white border-green-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Stay in Hostel
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              {applicationType === 'Leave' ? (
                // Leave Application Form
                <>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={leaveFormData.startDate}
                      onChange={(e) => setLeaveFormData({ ...leaveFormData, startDate: e.target.value })}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={leaveFormData.endDate}
                      onChange={(e) => setLeaveFormData({ ...leaveFormData, endDate: e.target.value })}
                      min={leaveFormData.startDate}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Gate Pass Date and Time
                    </label>
                    <p className="text-xs text-gray-500 mb-1">Date must be on or before start date. Time must be after 4:30 PM.</p>
                    <input
                      type="datetime-local"
                      value={leaveFormData.gatePassDateTime}
                      onChange={(e) => setLeaveFormData({ ...leaveFormData, gatePassDateTime: e.target.value })}
                      max={leaveFormData.startDate ? `${leaveFormData.startDate}T23:59` : ''}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Reason
                    </label>
                    <textarea
                      value={leaveFormData.reason}
                      onChange={(e) => setLeaveFormData({ ...leaveFormData, reason: e.target.value })}
                      required
                      rows="4"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter your reason for leave"
                    />
                  </div>
                </>
              ) : applicationType === 'Permission' ? (
                // Permission Application Form
                <>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Permission Date
                    </label>
                    <input
                      type="date"
                      value={permissionFormData.permissionDate}
                      onChange={(e) => setPermissionFormData({ ...permissionFormData, permissionDate: e.target.value })}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Out Time
                      </label>
                      <input
                        type="time"
                        value={permissionFormData.outTime}
                        onChange={(e) => setPermissionFormData({ ...permissionFormData, outTime: e.target.value })}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        In Time
                      </label>
                      <input
                        type="time"
                        value={permissionFormData.inTime}
                        onChange={(e) => setPermissionFormData({ ...permissionFormData, inTime: e.target.value })}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      />
                    </div>
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Reason
                    </label>
                    <textarea
                      value={permissionFormData.reason}
                      onChange={(e) => setPermissionFormData({ ...permissionFormData, reason: e.target.value })}
                      required
                      rows="4"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      placeholder="Enter your reason for permission"
                    />
                  </div>
                </>
              ) : (
                // Stay in Hostel Application Form
                <>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Stay Date
                    </label>
                    <input
                      type="date"
                      value={stayInHostelFormData.stayDate}
                      onChange={(e) => setStayInHostelFormData({ ...stayInHostelFormData, stayDate: e.target.value })}
                      required
                      min={todayStr}
                      max={tomorrowStr}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Reason
                    </label>
                    <textarea
                      value={stayInHostelFormData.reason}
                      onChange={(e) => setStayInHostelFormData({ ...stayInHostelFormData, reason: e.target.value })}
                      required
                      rows="4"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="Enter your reason for staying in hostel"
                    />
                  </div>
                </>
              )}
              
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowRequestModal(false);
                    resetFormData();
                  }}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-4 py-2 text-white rounded-lg transition-colors ${
                    applicationType === 'Leave' 
                      ? 'bg-blue-600 hover:bg-blue-700' 
                      : applicationType === 'Permission'
                      ? 'bg-purple-600 hover:bg-purple-700'
                      : 'bg-green-600 hover:bg-green-700'
                  }`}
                >
                  Submit Request
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Leave; 