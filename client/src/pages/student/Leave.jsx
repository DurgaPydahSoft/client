import React, { useState, useEffect, useRef } from 'react';
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
  HomeIcon,
  DocumentArrowDownIcon,
  PlusIcon,
  TrashIcon,
  ChevronDownIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import SEO from '../../components/SEO';
import { useAuth } from '../../context/AuthContext';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const Leave = () => {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [qrModal, setQrModal] = useState({ open: false, leave: null });
  const [incomingQrModal, setIncomingQrModal] = useState({ open: false, leave: null });
  const [applicationType, setApplicationType] = useState('Leave');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [showApplicationTypeDropdown, setShowApplicationTypeDropdown] = useState(false);
  const [resendOtpStates, setResendOtpStates] = useState({});
  const [isResendingOtp, setIsResendingOtp] = useState(false);
  const [resendingLeaveId, setResendingLeaveId] = useState(null);
  const isSubmittingRef = useRef(false);
  
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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showApplicationTypeDropdown && !event.target.closest('.application-type-dropdown')) {
        setShowApplicationTypeDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showApplicationTypeDropdown]);

  // Timer effect for resend OTP functionality
  useEffect(() => {
    const timers = {};
    
    leaves.forEach(leave => {
      if (leave.status === 'Pending OTP Verification' && leave.applicationType !== 'Stay in Hostel') {
        const timer = setInterval(() => {
          updateResendOtpState(leave._id);
        }, 1000); // Update every second
        timers[leave._id] = timer;
      }
    });

    return () => {
      Object.values(timers).forEach(timer => clearInterval(timer));
    };
  }, [leaves]);

  const updateResendOtpState = (leaveId) => {
    const leave = leaves.find(l => l._id === leaveId);
    if (!leave) return;

    const now = new Date();
    const createdAt = new Date(leave.createdAt);
    const fiveMinutesInMs = 5 * 60 * 1000;
    const timeSinceCreation = now - createdAt;
    const timeUntilResend = fiveMinutesInMs - timeSinceCreation;

    setResendOtpStates(prev => ({
      ...prev,
      [leaveId]: {
        canResend: timeSinceCreation >= fiveMinutesInMs,
        timeUntilResend: Math.max(0, timeUntilResend),
        minutesUntilResend: Math.ceil(timeUntilResend / (60 * 1000))
      }
    }));
  };

  const fetchLeaves = async () => {
    try {
      console.log('Fetching leave requests...');
      const response = await api.get('/api/leave/my-requests');
      console.log('Leave response:', response.data);
      
      if (response.data.success) {
        setLeaves(response.data.data);
        // Initialize resend OTP states
        const initialStates = {};
        response.data.data.forEach(leave => {
          if (leave.status === 'Pending OTP Verification' && leave.applicationType !== 'Stay in Hostel') {
            updateResendOtpState(leave._id);
          }
        });
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

  const handleResendOTP = async (leaveId) => {
    if (isResendingOtp) return;
    
    setIsResendingOtp(true);
    setResendingLeaveId(leaveId);
    
    try {
      const response = await api.post('/api/leave/resend-otp', { leaveId });
      
      if (response.data.success) {
        toast.success('OTP resend request processed. Same OTP (4 digits) has been sent to your parent\'s phone in both Telugu and English.');
        // Refresh the leaves to get updated data
        fetchLeaves();
      } else {
        throw new Error(response.data.message || 'Failed to resend OTP');
      }
    } catch (error) {
      console.error('Error resending OTP:', error);
      toast.error(error.response?.data?.message || 'Failed to resend OTP');
    } finally {
      setIsResendingOtp(false);
      setResendingLeaveId(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Prevent multiple submissions using both state and ref
    if (isSubmitting || isSubmittingRef.current) {
      console.log('Submission already in progress, ignoring click');
      return;
    }
    
    // Immediately disable the form to prevent multiple clicks
    setIsSubmitting(true);
    isSubmittingRef.current = true;
    
    // Add a small delay to ensure state updates before processing
    await new Promise(resolve => setTimeout(resolve, 100));
    
    try {
      let formData;
      if (applicationType === 'Leave') {
        // Gate Pass Time Validation
        const gatePassTime = new Date(leaveFormData.gatePassDateTime);
        const startDate = new Date(leaveFormData.startDate);
        const today = new Date();
        
        // Check if start date is today
        const isStartDateToday = startDate.toDateString() === today.toDateString();
        
        if (!isStartDateToday) {
          // For future dates, gate pass must be after 4:30 PM
          const hours = gatePassTime.getHours();
          const minutes = gatePassTime.getMinutes();

          if (hours < 16 || (hours === 16 && minutes <= 30)) {
            toast.error('Gate Pass time must be after 4:30 PM for future dates.');
            setIsSubmitting(false);
            return; // Stop submission
          }
        }
        // For same day leave, any time is allowed
        
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
        if (applicationType !== 'Stay in Hostel') {
          toast.success('Request submitted successfully. OTP (4 digits) has been sent to your parent\'s phone in both Telugu and English.');
        } else {
          toast.success(response.data.data.message || 'Request submitted successfully');
        }
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
    } finally {
      setIsSubmitting(false);
      isSubmittingRef.current = false;
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
    setIsSubmitting(false);
    isSubmittingRef.current = false;
  };

  // Check if a request can be deleted based on status
  const canDeleteRequest = (status) => {
    const deletableStatuses = ['Pending', 'Pending OTP Verification', 'Warden Verified', 'Warden Recommended'];
    return deletableStatuses.includes(status);
  };

  // Handle delete request
  const handleDeleteRequest = async (leaveId) => {
    if (!window.confirm('Are you sure you want to delete this request? This action cannot be undone.')) {
      return;
    }

    setIsDeleting(true);
    setDeletingId(leaveId);

    try {
      const response = await api.delete(`/api/leave/${leaveId}`);
      
      if (response.data.success) {
        toast.success('Request deleted successfully');
        // Remove the deleted request from the list
        setLeaves(leaves.filter(leave => leave._id !== leaveId));
      } else {
        throw new Error(response.data.message || 'Failed to delete request');
      }
    } catch (error) {
      console.error('Error deleting request:', error);
      toast.error(error.response?.data?.message || 'Failed to delete request');
    } finally {
      setIsDeleting(false);
      setDeletingId(null);
    }
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
      case 'Warden Verified':
        return 'text-blue-600 bg-blue-50';
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
        return <CheckCircleIcon className="w-4 h-4 sm:w-5 sm:h-5" />;
      case 'Rejected':
      case 'Principal Rejected':
        return <XCircleIcon className="w-4 h-4 sm:w-5 sm:h-5" />;
      case 'Pending':
      case 'Pending OTP Verification':
        return <ExclamationCircleIcon className="w-4 h-4 sm:w-5 sm:h-5" />;
      case 'Warden Verified':
        return <ArrowRightIcon className="w-4 h-4 sm:w-5 sm:h-5" />;
      case 'Warden Recommended':
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

  // Helper function to check if incoming QR is available
  const isIncomingQrAvailable = (leave) => {
    if (leave.status !== 'Approved' || leave.applicationType === 'Stay in Hostel') {
      return false;
    }
    
    if (!leave.incomingQrGenerated) {
      return false;
    }
    
    const now = new Date();
    const incomingQrExpiresAt = new Date(leave.incomingQrExpiresAt);
    
    return now <= incomingQrExpiresAt;
  };

  // Helper function to get time until QR is available
  const getTimeUntilQrAvailable = (leave) => {
    const now = new Date();
    const qrAvailableFrom = new Date(leave.qrAvailableFrom);
    const diffMs = qrAvailableFrom - now;
    const diffMins = Math.ceil(diffMs / (1000 * 60));
    return diffMins;
  };

  // Helper function to get time until incoming QR expires
  const getTimeUntilIncomingQrExpires = (leave) => {
    const now = new Date();
    const incomingQrExpiresAt = new Date(leave.incomingQrExpiresAt);
    const diffMs = incomingQrExpiresAt - now;
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

  // PDF Download function for individual request
  const downloadIndividualRequestPDF = async (leave) => {
    if (isDownloading) return;
    
    setIsDownloading(true);
    
    try {
      const doc = new jsPDF();
      const displayInfo = formatDisplayDate(leave);
      
      // Add header
      doc.setFontSize(20);
      doc.setTextColor(30, 64, 175); // Blue color
      doc.text(`${leave.applicationType} Request`, 105, 20, { align: 'center' });
      
      // Add student info
      doc.setFontSize(12);
      doc.setTextColor(55, 65, 81); // Gray color
      doc.text(`Student Name: ${user?.name || 'N/A'}`, 20, 35);
      doc.text(`Roll Number: ${user?.rollNumber || 'N/A'}`, 20, 42);
      doc.text(`Course: ${user?.course?.name || user?.course || 'N/A'}`, 20, 49);
      doc.text(`Branch: ${user?.branch?.name || user?.branch || 'N/A'}`, 20, 56);
      doc.text(`Room: ${user?.roomNumber || 'N/A'}`, 20, 63);
      
      // Add request details
      doc.setFontSize(14);
      doc.setTextColor(30, 64, 175);
      doc.text('Request Details:', 20, 80);
      
      doc.setFontSize(11);
      doc.setTextColor(55, 65, 81);
      
      // Application type and status
      doc.text(`Application Type: ${leave.applicationType}`, 20, 90);
      
      // Status with color highlighting
      if (leave.status === 'Approved') {
        doc.setTextColor(34, 197, 94); // Green color for approved
        doc.text(`Status: ${leave.status}`, 20, 97);
      } else if (leave.status === 'Rejected') {
        doc.setTextColor(239, 68, 68); // Red color for rejected
        doc.text(`Status: ${leave.status}`, 20, 97);
      } else {
        doc.setTextColor(245, 158, 11); // Yellow color for pending
        doc.text(`Status: ${leave.status}`, 20, 97);
      }
      
      // Reset text color for other fields
      doc.setTextColor(55, 65, 81);
      doc.text(`Applied On: ${new Date(leave.createdAt).toLocaleDateString()}`, 20, 104);
      
      // Date/Time information based on type
      if (leave.applicationType === 'Leave') {
        doc.text(`Start Date: ${displayInfo.start}`, 20, 111);
        doc.text(`End Date: ${displayInfo.end}`, 20, 118);
        doc.text(`Duration: ${displayInfo.duration}`, 20, 125);
        doc.text(`Gate Pass: ${new Date(leave.gatePassDateTime).toLocaleString()}`, 20, 132);
      } else if (leave.applicationType === 'Permission') {
        doc.text(`Permission Date: ${displayInfo.date}`, 20, 111);
        doc.text(`Out Time: ${leave.outTime}`, 20, 118);
        doc.text(`In Time: ${leave.inTime}`, 20, 125);
      } else if (leave.applicationType === 'Stay in Hostel') {
        doc.text(`Stay Date: ${displayInfo.date}`, 20, 111);
      }
      
      // Reason
      doc.text(`Reason: ${leave.reason}`, 20, 140);
      
      // Rejection reason if applicable
      if (leave.rejectionReason) {
        doc.setTextColor(239, 68, 68); // Red color
        doc.text(`Rejection Reason: ${leave.rejectionReason}`, 20, 147);
      }
      
      // Generation info
      doc.setFontSize(8);
      doc.setTextColor(107, 114, 128);
      doc.text(`Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, 20, 160);
      
      // Save the PDF
      const fileName = `${leave.applicationType.toLowerCase().replace(' ', '_')}_request_${user?.rollNumber || 'student'}_${new Date(leave.createdAt).toISOString().slice(0, 10)}.pdf`;
      doc.save(fileName);
      
      toast.success(`${leave.applicationType} request PDF downloaded successfully!`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF');
    } finally {
      setIsDownloading(false);
    }
  };

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().slice(0, 10);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-3 sm:py-8 mt-16 sm:mt-0">
        <SEO 
          title="Leave & Permission Requests"
          description="Submit and track your hostel leave and permission requests"
          keywords="leave request, permission request, hostel leave, student permissions"
        />

        {/* Mobile-optimized header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 sm:mb-6 gap-3 sm:gap-0 mt-4">
          <h1 className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-blue-900 to-blue-700 bg-clip-text text-transparent">Leave & Permission Requests</h1>
          <button
            onClick={() => setShowRequestModal(true)}
            className="w-full sm:w-auto px-4 py-3 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm sm:text-base touch-manipulation flex items-center justify-center gap-2"
          >
            <PlusIcon className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>New Request</span>
          </button>
        </div>

        {/* Leave List - Mobile optimized */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-6 sm:p-8 text-center">
              <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          ) : leaves.length === 0 ? (
            <div className="p-6 sm:p-8 text-center text-gray-500">
              <DocumentTextIcon className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 text-gray-400" />
              <p className="text-sm sm:text-base">No requests found</p>
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
                    <div className="flex flex-col gap-3 sm:gap-0 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex-1 space-y-3">
                        {/* Status and Type Tags - Mobile optimized */}
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(leave.status)}`}>
                            {getStatusIcon(leave.status)}
                            <span className="ml-1 text-xs">
                              {leave.status === 'Warden Verified' ? 'Warden Verified - Pending Principal Approval' : leave.status}
                            </span>
                          </span>
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getApplicationTypeColor(leave.applicationType)}`}>
                            {leave.applicationType}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(leave.createdAt).toLocaleDateString()}
                          </span>
                        </div>

                        {/* Date/Time Info - Mobile optimized */}
                        <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-2 sm:gap-3 text-xs sm:text-sm text-gray-600 mb-2">
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

                        {/* Reason - Mobile optimized */}
                        <p className="text-gray-700 mb-2 text-sm sm:text-base break-words leading-relaxed">{leave.reason}</p>

                        {/* Rejection Reason - Mobile optimized */}
                        {leave.rejectionReason && (
                          <p className="text-xs sm:text-sm text-red-600 leading-relaxed">
                            Rejection Reason: {leave.rejectionReason}
                          </p>
                        )}

                        {/* Status Messages - Mobile optimized */}
                        {leave.applicationType !== 'Stay in Hostel' && leave.status === 'Warden Verified' && (
                          <div className="mt-2 p-2 sm:p-3 bg-blue-50 rounded-lg">
                            <p className="text-xs sm:text-sm text-blue-700 leading-relaxed">
                              <strong>Warden Verified:</strong> Your request has been verified by the warden and is now pending principal approval.
                            </p>
                          </div>
                        )}

                        {leave.applicationType === 'Stay in Hostel' && leave.wardenRecommendation && (
                          <div className="mt-2 p-2 sm:p-3 bg-blue-50 rounded-lg">
                            <p className="text-xs sm:text-sm text-blue-700 leading-relaxed">
                              <strong>Warden Recommendation:</strong> {leave.wardenRecommendation}
                              {leave.wardenComment && ` - ${leave.wardenComment}`}
                            </p>
                          </div>
                        )}

                        {leave.applicationType === 'Stay in Hostel' && leave.principalDecision && (
                          <div className="mt-2 p-2 sm:p-3 bg-green-50 rounded-lg">
                            <p className="text-xs sm:text-sm text-green-700 leading-relaxed">
                              <strong>Principal Decision:</strong> {leave.principalDecision}
                              {leave.principalComment && ` - ${leave.principalComment}`}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Action Buttons - Mobile optimized */}
                      <div className="flex flex-col gap-2 sm:gap-2 w-full sm:w-auto">
                        {/* Download PDF Button */}
                        <button
                          onClick={() => downloadIndividualRequestPDF(leave)}
                          disabled={isDownloading}
                          className={`w-full sm:w-auto px-3 py-2.5 sm:py-2 rounded transition-colors text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 touch-manipulation ${
                            isDownloading
                              ? 'bg-gray-400 text-white cursor-not-allowed'
                              : 'bg-purple-600 text-white hover:bg-purple-700 active:bg-purple-800'
                          }`}
                        >
                          {isDownloading ? (
                            <>
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                              <span className="text-xs sm:text-sm">Generating...</span>
                            </>
                          ) : (
                            <>
                              <DocumentArrowDownIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                              <span className="text-xs sm:text-sm">Download PDF</span>
                            </>
                          )}
                        </button>

                        {/* Delete Button - Only show for deletable requests */}
                        {canDeleteRequest(leave.status) && (
                          <button
                            onClick={() => handleDeleteRequest(leave._id)}
                            disabled={isDeleting && deletingId === leave._id}
                            className={`w-full sm:w-auto px-3 py-2.5 sm:py-2 rounded transition-colors text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 touch-manipulation ${
                              isDeleting && deletingId === leave._id
                                ? 'bg-gray-400 text-white cursor-not-allowed'
                                : 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800'
                            }`}
                          >
                            {isDeleting && deletingId === leave._id ? (
                              <>
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                                <span className="text-xs sm:text-sm">Deleting...</span>
                              </>
                            ) : (
                              <>
                                <TrashIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                                <span className="text-xs sm:text-sm">Delete Request</span>
                              </>
                            )}
                          </button>
                        )}

                        {/* Resend OTP Button - Only show for pending OTP verification requests */}
                        {leave.status === 'Pending OTP Verification' && leave.applicationType !== 'Stay in Hostel' && (
                          <div className="w-full sm:w-auto">
                            {resendOtpStates[leave._id]?.canResend ? (
                              <button
                                onClick={() => handleResendOTP(leave._id)}
                                disabled={isResendingOtp && resendingLeaveId === leave._id}
                                className={`w-full sm:w-auto px-3 py-2.5 sm:py-2 rounded transition-colors text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 touch-manipulation ${
                                  isResendingOtp && resendingLeaveId === leave._id
                                    ? 'bg-gray-400 text-white cursor-not-allowed'
                                    : 'bg-orange-600 text-white hover:bg-orange-700 active:bg-orange-800'
                                }`}
                              >
                                {isResendingOtp && resendingLeaveId === leave._id ? (
                                  <>
                                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                                    <span className="text-xs sm:text-sm">Resending...</span>
                                  </>
                                ) : (
                                  <>
                                    <ArrowPathIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                                    <span className="text-xs sm:text-sm">Resend OTP</span>
                                  </>
                                )}
                              </button>
                            ) : (
                              <div className="w-full sm:w-auto px-3 py-2.5 sm:py-2 rounded bg-gray-100 text-gray-500 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2">
                                <ClockIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                                <span className="text-xs sm:text-sm">
                                  Resend in {resendOtpStates[leave._id]?.minutesUntilResend || 0}m
                                </span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* QR Code Button for Approved Leave/Permission */}
                        {leave.status === 'Approved' && (
                          <>
                            {isQrAvailable(leave) ? (
                              <button
                                className={`w-full sm:w-auto px-3 py-2.5 sm:py-2 rounded transition-colors text-xs sm:text-sm font-semibold touch-manipulation ${leave.visitLocked ? 'bg-gray-400 text-white cursor-not-allowed' : 'bg-green-600 text-white hover:bg-green-700 active:bg-green-800'}`}
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
                                <span className="text-xs sm:text-sm">{leave.visitLocked ? 'Visit Locked' : 'View Outgoing QR'}</span>
                              </button>
                            ) : null}
                            
                            {/* Incoming QR Code Button */}
                            {isIncomingQrAvailable(leave) ? (
                              <button
                                className="w-full sm:w-auto px-3 py-2.5 sm:py-2 rounded transition-colors text-xs sm:text-sm font-semibold touch-manipulation bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800"
                                onClick={async () => {
                                  try {
                                    const res = await api.post(`/api/leave/incoming-qr-view/${leave._id}`);
                                    if (res.data.success) {
                                      setIncomingQrModal({ open: true, leave });
                                    }
                                  } catch (err) {
                                    toast.error(err.response?.data?.message || 'Unable to open incoming QR code');
                                  }
                                }}
                              >
                                <span className="text-xs sm:text-sm">View Incoming QR</span>
                              </button>
                            ) : null}
                            
                            {/* Visit Count Display - Mobile optimized */}
                            <div className="text-center">
                              <div className="text-xs text-gray-500">
                                Outgoing: {leave.outgoingVisitCount || 0}/{leave.maxVisits || 2}
                              </div>
                              {leave.incomingQrGenerated && (
                                <div className="text-xs text-gray-500">
                                  Incoming: {leave.incomingVisitCount || 0}/1
                                </div>
                              )}
                              {new Date() < new Date(leave.qrAvailableFrom) ? (
                                <div className="text-xs text-gray-500">
                                  QR available in {getTimeUntilQrAvailable(leave)} min
                                </div>
                              ) : leave.incomingQrGenerated && new Date() < new Date(leave.incomingQrExpiresAt) ? (
                                <div className="text-xs text-blue-500">
                                  Incoming QR expires in {getTimeUntilIncomingQrExpires(leave)} min
                                </div>
                              ) : (
                                <div className="text-xs text-red-500">
                                  .
                                </div>
                              )}
                            </div>
                          </>
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

      {/* QR Code Modal - Mobile optimized */}
      {qrModal.open && qrModal.leave && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl p-6 sm:p-8 w-full max-w-sm sm:max-w-md flex flex-col items-center"
          >
            <h2 className="text-lg sm:text-xl font-bold mb-4 text-green-700 text-center">
              {qrModal.leave.applicationType} Outgoing QR Code
            </h2>
            <QRCode
              value={`${window.location.origin}/leave/qr/${qrModal.leave._id}`}
              size={180}
              className="mx-auto"
            />
            <button
              className="mt-6 sm:mt-8 px-4 py-2.5 sm:py-2 bg-gray-700 text-white rounded hover:bg-gray-800 transition-colors text-sm sm:text-base touch-manipulation w-full sm:w-auto"
              onClick={() => setQrModal({ open: false, leave: null })}
            >
              Close
            </button>
          </motion.div>
        </div>
      )}

      {/* Incoming QR Code Modal - Mobile optimized */}
      {incomingQrModal.open && incomingQrModal.leave && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl p-6 sm:p-8 w-full max-w-sm sm:max-w-md flex flex-col items-center"
          >
            <h2 className="text-lg sm:text-xl font-bold mb-4 text-blue-700 text-center">
              {incomingQrModal.leave.applicationType} Incoming QR Code
            </h2>
            <QRCode
              value={`${window.location.origin}/leave/incoming-qr/${incomingQrModal.leave._id}`}
              size={180}
              className="mx-auto"
            />
            <div className="mt-4 text-center text-sm text-gray-600">
              <p>Use this QR code to re-enter the hostel</p>
              <p className="text-xs text-gray-500 mt-1">
                Expires: {new Date(incomingQrModal.leave.incomingQrExpiresAt).toLocaleString()}
              </p>
            </div>
            <button
              className="mt-6 sm:mt-8 px-4 py-2.5 sm:py-2 bg-gray-700 text-white rounded hover:bg-gray-800 transition-colors text-sm sm:text-base touch-manipulation w-full sm:w-auto"
              onClick={() => setIncomingQrModal({ open: false, leave: null })}
            >
              Close
            </button>
          </motion.div>
        </div>
      )}

      {/* Request Modal - Mobile optimized */}
      {showRequestModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl p-4 sm:p-6 w-full max-w-sm sm:max-w-md max-h-[95vh] sm:max-h-[90vh] overflow-y-auto relative"
          >
            {/* Close X Button */}
            <button
              onClick={() => {
                setShowRequestModal(false);
                resetFormData();
              }}
              className="absolute top-2 right-2 sm:top-3 sm:right-3 p-1.5 sm:p-1 rounded-full hover:bg-gray-100 transition-colors touch-manipulation"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            <h2 className="text-lg sm:text-xl font-semibold mb-4 pr-8 sm:pr-10">New Request</h2>
            
            {/* Application Type Selector - Dropdown for better mobile UX */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Application Type
              </label>
              <div className="relative application-type-dropdown">
                <button
                  type="button"
                  onClick={() => setShowApplicationTypeDropdown(!showApplicationTypeDropdown)}
                  className="w-full px-3 py-3 sm:py-2.5 border border-gray-300 rounded-lg bg-white text-left text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 flex items-center justify-between"
                >
                  <span className={`font-medium ${
                    applicationType === 'Leave' ? 'text-blue-600' :
                    applicationType === 'Permission' ? 'text-purple-600' :
                    applicationType === 'Stay in Hostel' ? 'text-green-600' : 'text-gray-700'
                  }`}>
                    {applicationType}
                  </span>
                  <ChevronDownIcon className={`w-4 h-4 transition-transform ${
                    showApplicationTypeDropdown ? 'rotate-180' : ''
                  }`} />
                </button>
                
                {showApplicationTypeDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg">
                    <button
                      type="button"
                      onClick={() => {
                        setApplicationType('Leave');
                        setShowApplicationTypeDropdown(false);
                      }}
                      className="w-full px-3 py-2.5 text-left text-sm hover:bg-blue-50 focus:bg-blue-50 transition-colors"
                    >
                      <span className="text-blue-600 font-medium">Leave</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setApplicationType('Permission');
                        setShowApplicationTypeDropdown(false);
                      }}
                      className="w-full px-3 py-2.5 text-left text-sm hover:bg-purple-50 focus:bg-purple-50 transition-colors"
                    >
                      <span className="text-purple-600 font-medium">Permission</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setApplicationType('Stay in Hostel');
                        setShowApplicationTypeDropdown(false);
                      }}
                      className="w-full px-3 py-2.5 text-left text-sm hover:bg-green-50 focus:bg-green-50 transition-colors"
                    >
                      <span className="text-green-600 font-medium">Stay in Hostel</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5" noValidate>
              {applicationType === 'Leave' ? (
                // Leave Application Form - Mobile optimized
                <>
                  <div className="space-y-3 sm:space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Start Date
                      </label>
                      <input
                        type="date"
                        value={leaveFormData.startDate}
                        onChange={(e) => setLeaveFormData({ ...leaveFormData, startDate: e.target.value })}
                        min={todayStr}
                        required
                        className="w-full px-3 py-3 sm:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        End Date
                      </label>
                      <input
                        type="date"
                        value={leaveFormData.endDate}
                        onChange={(e) => setLeaveFormData({ ...leaveFormData, endDate: e.target.value })}
                        min={leaveFormData.startDate}
                        required
                        className="w-full px-3 py-3 sm:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Gate Pass Date and Time
                      </label>
                      <p className="text-xs text-gray-500 mb-2">
                        {leaveFormData.startDate === todayStr 
                          ? 'Select current or future time for today.' 
                          : 'Time must be after 4:30 PM for future dates.'
                        }
                      </p>
                      <input
                        type="datetime-local"
                        value={leaveFormData.gatePassDateTime}
                        onChange={(e) => setLeaveFormData({ ...leaveFormData, gatePassDateTime: e.target.value })}
                        min={leaveFormData.startDate === todayStr ? new Date().toISOString().slice(0, 16) : `${leaveFormData.startDate}T16:30`}
                        required
                        className="w-full px-3 py-3 sm:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Reason
                      </label>
                      <textarea
                        value={leaveFormData.reason}
                        onChange={(e) => setLeaveFormData({ ...leaveFormData, reason: e.target.value })}
                        required
                        maxLength={100}
                        rows="4"
                        className="w-full px-3 py-3 sm:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm resize-none"
                        placeholder="Enter your reason for leave (max 100 characters)"
                      />
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-xs text-gray-500">
                          Keep it brief and specific
                        </span>
                        <span className={`text-xs ${leaveFormData.reason.length > 90 ? 'text-red-500' : 'text-gray-500'}`}>
                          {leaveFormData.reason.length}/100
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              ) : applicationType === 'Permission' ? (
                // Permission Application Form - Mobile optimized
                <>
                  <div className="space-y-3 sm:space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Permission Date
                      </label>
                      <input
                        type="date"
                        value={permissionFormData.permissionDate}
                        onChange={(e) => setPermissionFormData({ ...permissionFormData, permissionDate: e.target.value })}
                        required
                        className="w-full px-3 py-3 sm:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Out Time
                        </label>
                        <input
                          type="time"
                          value={permissionFormData.outTime}
                          onChange={(e) => setPermissionFormData({ ...permissionFormData, outTime: e.target.value })}
                          required
                          className="w-full px-3 py-3 sm:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          In Time
                        </label>
                        <input
                          type="time"
                          value={permissionFormData.inTime}
                          onChange={(e) => setPermissionFormData({ ...permissionFormData, inTime: e.target.value })}
                          required
                          className="w-full px-3 py-3 sm:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Reason
                      </label>
                      <textarea
                        value={permissionFormData.reason}
                        onChange={(e) => setPermissionFormData({ ...permissionFormData, reason: e.target.value })}
                        required
                        rows="4"
                        className="w-full px-3 py-3 sm:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm resize-none"
                        placeholder="Enter your reason for permission"
                      />
                    </div>
                  </div>
                </>
              ) : (
                // Stay in Hostel Application Form - Mobile optimized
                <>
                  <div className="space-y-3 sm:space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Stay Date
                      </label>
                      <input
                        type="date"
                        value={stayInHostelFormData.stayDate}
                        onChange={(e) => setStayInHostelFormData({ ...stayInHostelFormData, stayDate: e.target.value })}
                        required
                        min={todayStr}
                        max={tomorrowStr}
                        className="w-full px-3 py-3 sm:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Reason
                      </label>
                      <textarea
                        value={stayInHostelFormData.reason}
                        onChange={(e) => setStayInHostelFormData({ ...stayInHostelFormData, reason: e.target.value })}
                        required
                        rows="4"
                        className="w-full px-3 py-3 sm:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm resize-none"
                        placeholder="Enter your reason for staying in hostel"
                      />
                    </div>
                  </div>
                </>
              )}
              
              {/* Action Buttons - Mobile optimized */}
              <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 sm:pt-6">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full sm:w-auto px-4 py-3 sm:py-2.5 text-white rounded-lg transition-colors text-sm touch-manipulation font-medium ${
                    isSubmitting
                      ? 'bg-gray-400 cursor-not-allowed'
                      : applicationType === 'Leave' 
                      ? 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 shadow-sm' 
                      : applicationType === 'Permission'
                      ? 'bg-purple-600 hover:bg-purple-700 active:bg-purple-800 shadow-sm'
                      : 'bg-green-600 hover:bg-green-700 active:bg-green-800 shadow-sm'
                  }`}
                >
                  {isSubmitting ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-white"></div>
                      <span className="text-sm">Submitting...</span>
                    </div>
                  ) : (
                    'Submit Request'
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowRequestModal(false);
                    resetFormData();
                  }}
                  className="w-full sm:w-auto px-4 py-3 sm:py-2.5 text-gray-700 hover:bg-gray-100 active:bg-gray-200 rounded-lg transition-colors text-sm touch-manipulation font-medium"
                >
                  Cancel
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