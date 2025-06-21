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
  ShieldCheckIcon,
  EyeIcon,
  FunnelIcon
} from '@heroicons/react/24/outline';
import SEO from '../../components/SEO';

const SecurityDashboard = () => {
  const [leaves, setLeaves] = useState([]);
  const [filteredLeaves, setFilteredLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [verificationStatus, setVerificationStatus] = useState('Verified');
  const [showUpcomingPasses, setShowUpcomingPasses] = useState(false);
  const [filters, setFilters] = useState({
    verificationStatus: '',
    page: 1
  });

  useEffect(() => {
    fetchApprovedLeaves();
  }, [filters.page]);

  useEffect(() => {
    // Apply filters to the fetched leaves
    let filtered = [...leaves];
    
    if (filters.verificationStatus) {
      filtered = filtered.filter(leave => leave.verificationStatus === filters.verificationStatus);
    }
    
    setFilteredLeaves(filtered);
  }, [leaves, filters.verificationStatus]);

  const fetchApprovedLeaves = async () => {
    try {
      console.log('Fetching approved leaves with filters:', filters);
      const response = await api.get('/api/leave/approved', { params: { page: filters.page } });
      console.log('Approved leaves response:', response.data);
      if (response.data.success) {
        setLeaves(response.data.data.leaves);
        console.log('Set approved leaves:', response.data.data.leaves);
      }
    } catch (error) {
      console.error('Error fetching approved leaves:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        headers: error.response?.headers
      });
      toast.error('Failed to fetch approved leave requests');
    } finally {
      setLoading(false);
    }
  };

  const handleVerification = async () => {
    try {
      const response = await api.post('/api/leave/verify', {
        leaveId: selectedLeave._id,
        verificationStatus
      });
      
      if (response.data.success) {
        toast.success(response.data.data.message);
        setShowVerificationModal(false);
        setVerificationStatus('Verified');
        fetchApprovedLeaves();
      }
    } catch (error) {
      console.error('Error updating verification status:', error);
      toast.error(error.response?.data?.message || 'Failed to update verification status');
    }
  };

  const getVerificationStatusColor = (status) => {
    switch (status) {
      case 'Verified':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'Expired':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'Not Verified':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getVerificationStatusIcon = (status) => {
    switch (status) {
      case 'Verified':
        return <CheckCircleIcon className="w-4 h-4" />;
      case 'Expired':
        return <XCircleIcon className="w-4 h-4" />;
      case 'Not Verified':
        return <ExclamationCircleIcon className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const isLeaveExpired = (leave) => {
    const now = new Date();
    const endDate = new Date(leave.endDate);
    return now > endDate;
  };

  const handleFilterChange = (newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters, page: 1 }));
  };

  // Helper: is today
  const isToday = (date) => {
    const now = new Date();
    return date.getDate() === now.getDate() && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  };

  // Helper: sort and auto-expire
  const getSortedLeaves = () => {
    const now = new Date();
    // Clone and add frontend-only expired status if needed
    const enhanced = filteredLeaves.map(leave => {
      const start = new Date(leave.startDate);
      if (
        leave.verificationStatus !== 'Verified' &&
        now - start > 12 * 60 * 60 * 1000 // 12 hours
      ) {
        return { ...leave, _frontendExpired: true };
      }
      return leave;
    });
    // Today's first, then by start date/time ascending
    return enhanced.sort((a, b) => {
      const aStart = new Date(a.startDate);
      const bStart = new Date(b.startDate);
      const aToday = isToday(aStart);
      const bToday = isToday(bStart);
      if (aToday && !bToday) return -1;
      if (!aToday && bToday) return 1;
      return aStart - bStart;
    });
  };

  // Helper: get blinking dot
  const getBlinkingDot = (leave) => {
    const now = new Date();
    const start = new Date(leave.startDate);
    const diff = start - now;
    const diffPast = now - start;
    
    // Don't show dots for verified leaves
    if (leave.verificationStatus === 'Verified') return null;
    
    // Debug logging for timing
    console.log(`Leave ${leave._id}:`, {
      student: leave.student?.name,
      startTime: start.toLocaleString(),
      now: now.toLocaleString(),
      diffMinutes: Math.round(diff / (60 * 1000)),
      diffPastMinutes: Math.round(diffPast / (60 * 1000)),
      status: leave.verificationStatus
    });
    
    // Green dot: within 30 min of start time (urgent - student is about to leave)
    if (diff > 0 && diff <= 30 * 60 * 1000) {
      console.log(`  -> Showing GREEN dot (urgent - ${Math.round(diff / (60 * 1000))} min until start)`);
      return (
        <span className="inline-block align-middle mr-2">
          <span className="animate-pulse bg-green-500 rounded-full w-4 h-4 inline-block shadow-sm"></span>
        </span>
      );
    }
    
    // Red dot: overdue leaves (any time past start and not verified)
    if (diffPast > 0) {
      console.log(`  -> Showing RED dot (overdue - ${Math.round(diffPast / (60 * 1000))} min past start)`);
      return (
        <span className="inline-block align-middle mr-2">
          <span className="animate-pulse bg-red-500 rounded-full w-4 h-4 inline-block shadow-sm"></span>
        </span>
      );
    }
    
    console.log(`  -> No dot shown`);
    return null;
  };

  // Section helpers
  const now = new Date();
  const todayLeaves = getSortedLeaves().filter(leave => {
    const start = new Date(leave.startDate);
    return isToday(start) && (!leave._frontendExpired && leave.verificationStatus !== 'Expired');
  });
  const upcomingLeaves = getSortedLeaves().filter(leave => {
    const start = new Date(leave.startDate);
    return start > now && (!leave._frontendExpired && leave.verificationStatus !== 'Expired');
  });
  const expiredLeaves = getSortedLeaves().filter(leave => {
    const start = new Date(leave.startDate);
    // Only include if start time is more than 24 hours ago
    return (now - start > 24 * 60 * 60 * 1000);
  }).sort((a, b) => new Date(b.startDate) - new Date(a.startDate));

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8">
        <SEO 
          title="Security Dashboard"
          description="Security guard dashboard for leave verification"
          keywords="security dashboard, leave verification, guard access"
        />

        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
            <div className="flex items-center gap-3">
              <ShieldCheckIcon className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-blue-900">Security Dashboard</h1>
                <p className="text-sm sm:text-base text-gray-600">Manage approved leave verifications</p>
              </div>
            </div>
            
            {/* Filters */}
            <div className="flex items-center gap-2 sm:gap-3">
              <FunnelIcon className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
              <select
                value={filters.verificationStatus}
                onChange={(e) => handleFilterChange({ verificationStatus: e.target.value })}
                className="px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs sm:text-sm"
              >
                <option value="">All Status</option>
                <option value="Not Verified">Not Verified</option>
                <option value="Verified">Verified</option>
                <option value="Expired">Expired</option>
              </select>
              
              {/* Upcoming Leaves Toggle */}
              <button
                onClick={() => setShowUpcomingPasses(!showUpcomingPasses)}
                className={`px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors flex items-center gap-1 ${
                  showUpcomingPasses 
                    ? 'bg-blue-600 text-white hover:bg-blue-700' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <CalendarIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Upcoming</span>
                <span className="sm:hidden">Up</span>
              </button>
            </div>
          </div>
        </div>

        {/* Leave List */}
        <div className="bg-white rounded-lg shadow-sm overflow-x-auto">
          {loading ? (
            <div className="p-4 sm:p-8 text-center">
              <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-sm sm:text-base text-gray-600">Loading leave requests...</p>
            </div>
          ) : (
            <>
              {/* Today's Leaves */}
              <SectionTable 
                title="Today's Leaves" 
                leaves={todayLeaves} 
                getBlinkingDot={getBlinkingDot} 
                isLeaveExpired={isLeaveExpired} 
                getVerificationStatusColor={getVerificationStatusColor} 
                getVerificationStatusIcon={getVerificationStatusIcon}
                setSelectedLeave={setSelectedLeave}
                setShowVerificationModal={setShowVerificationModal}
              />
              {/* Upcoming Leaves - Only show when toggled */}
              {showUpcomingPasses && (
                <SectionTable 
                  title="Upcoming Leaves" 
                  leaves={upcomingLeaves} 
                  getBlinkingDot={getBlinkingDot} 
                  isLeaveExpired={isLeaveExpired} 
                  getVerificationStatusColor={getVerificationStatusColor} 
                  getVerificationStatusIcon={getVerificationStatusIcon}
                  setSelectedLeave={setSelectedLeave}
                  setShowVerificationModal={setShowVerificationModal}
                />
              )}
              {/* Expired/Recent Requests */}
              <SectionTable 
                title="Expired / Recent Requests" 
                leaves={expiredLeaves} 
                getBlinkingDot={getBlinkingDot} 
                isLeaveExpired={isLeaveExpired} 
                getVerificationStatusColor={getVerificationStatusColor} 
                getVerificationStatusIcon={getVerificationStatusIcon}
                setSelectedLeave={setSelectedLeave}
                setShowVerificationModal={setShowVerificationModal}
              />
            </>
          )}
        </div>
      </div>

      {/* Verification Modal */}
      {showVerificationModal && selectedLeave && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
          >
            <h2 className="text-lg sm:text-xl font-semibold mb-4">Verify Leave</h2>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Verification Status
              </label>
              <select
                value={verificationStatus}
                onChange={(e) => setVerificationStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value="Verified">Verified</option>
                <option value="Expired">Expired</option>
              </select>
            </div>

            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-2 text-sm">Leave Details:</h3>
              <div className="space-y-1 text-xs sm:text-sm">
                <p className="text-gray-600">Student: {selectedLeave.student?.name}</p>
                <p className="text-gray-600">Roll No: {selectedLeave.student?.rollNumber}</p>
                <p className="text-gray-600">Date: {new Date(selectedLeave.startDate).toLocaleDateString()} - {new Date(selectedLeave.endDate).toLocaleDateString()}</p>
                <p className="text-gray-600">Reason: {selectedLeave.reason}</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:justify-end gap-2 sm:gap-3">
              <button
                onClick={() => {
                  setShowVerificationModal(false);
                  setVerificationStatus('Verified');
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleVerification}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                Update Status
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

// SectionTable component
const SectionTable = ({ 
  title, 
  leaves, 
  getBlinkingDot, 
  isLeaveExpired, 
  getVerificationStatusColor, 
  getVerificationStatusIcon,
  setSelectedLeave,
  setShowVerificationModal 
}) => (
  <div className="mb-8">
    <h2 className="text-lg font-bold text-blue-800 mb-2 mt-6">{title}</h2>
    {leaves.length === 0 ? (
      <div className="p-4 text-center text-gray-400">No leaves in this section.</div>
    ) : (
      <div className="overflow-x-auto">
        {/* Desktop Table */}
        <div className="hidden md:block">
          <div className="bg-gray-50 border-b border-gray-200" style={{ minWidth: '900px', tableLayout: 'fixed' }}>
            <div className="grid grid-cols-12 gap-2 sm:gap-4 text-xs sm:text-sm font-medium text-gray-700">
              <div className="col-span-3 max-w-xs truncate">Student Details</div>
              <div className="col-span-2 max-w-xs truncate">Date Range</div>
              <div className="col-span-2 max-w-[120px] truncate">Duration</div>
              <div className="col-span-2 max-w-xs truncate">Reason</div>
              <div className="col-span-2 max-w-[120px] truncate">Status</div>
              <div className="col-span-1 max-w-[80px] truncate">Action</div>
            </div>
          </div>
        </div>
        {/* Desktop Table Body */}
        <div className="hidden md:block divide-y divide-gray-200" style={{ minWidth: '900px', tableLayout: 'fixed' }}>
          {leaves.map((leave) => (
            <motion.div
              key={leave._id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 sm:p-4 lg:p-6 hover:bg-gray-50 transition-colors"
            >
              {/* Desktop Layout */}
              <div className="hidden md:grid md:grid-cols-12 md:gap-2 lg:gap-4 md:items-center">
                {/* Student Details */}
                <div className="col-span-3 max-w-xs truncate flex flex-col gap-1 justify-center">
                  <div className="flex items-center gap-2 mb-1">
                    <UserIcon className="w-4 h-4 text-gray-500" />
                    <span className="font-medium text-gray-900 text-sm truncate">{leave.student?.name || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-600 truncate">
                    <AcademicCapIcon className="w-4 h-4" />
                    <span className="truncate">{leave.student?.rollNumber || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-600 truncate">
                    <PhoneIcon className="w-4 h-4" />
                    <span className="truncate">{leave.parentPhone || 'N/A'}</span>
                  </div>
                </div>

                {/* Date Range */}
                <div className="col-span-2 max-w-xs truncate flex flex-col gap-1 justify-center">
                  <div className="text-xs text-gray-900 truncate">
                    <div className="flex items-center gap-1 mb-1">
                      <CalendarIcon className="w-4 h-4 text-gray-500" />
                      <span className="font-medium">From:</span>
                    </div>
                    <span className="font-bold text-base flex items-center">
                      {getBlinkingDot(leave)}
                      {isNaN(new Date(leave.startDate)) ? 'Invalid Date' : new Date(leave.startDate).toLocaleDateString()} {isNaN(new Date(leave.startDate)) ? '' : new Date(leave.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="text-xs text-gray-900 mt-1 truncate">
                    <div className="flex items-center gap-1 mb-1">
                      <CalendarIcon className="w-4 h-4 text-gray-500" />
                      <span className="font-medium">To:</span>
                    </div>
                    <span>{isNaN(new Date(leave.endDate)) ? 'Invalid Date' : new Date(leave.endDate).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Duration */}
                <div className="col-span-2 max-w-[120px] truncate flex flex-col gap-1 justify-center">
                  <div className="flex items-center gap-1">
                    <ClockIcon className="w-4 h-4 text-gray-500" />
                    <span className="font-medium text-xs">{leave.numberOfDays} day{leave.numberOfDays > 1 ? 's' : ''}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1 truncate">
                    Approved: {isNaN(new Date(leave.approvedAt)) ? 'Invalid Date' : new Date(leave.approvedAt).toLocaleDateString()}
                  </div>
                </div>

                {/* Reason */}
                <div className="col-span-2 max-w-xs truncate flex items-center">
                  <p className="text-xs text-gray-700 truncate">{leave.reason}</p>
                </div>

                {/* Status */}
                <div className="col-span-2 max-w-[120px] truncate flex flex-col gap-1 justify-center">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getVerificationStatusColor(leave._frontendExpired ? 'Expired' : leave.verificationStatus)}`}
                    style={{ minWidth: '90px' }}>
                    {getVerificationStatusIcon(leave._frontendExpired ? 'Expired' : leave.verificationStatus)}
                    <span className="ml-1 truncate">{leave._frontendExpired ? 'Expired' : leave.verificationStatus}</span>
                  </span>
                  {isLeaveExpired(leave) && !leave._frontendExpired && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-red-600 bg-red-50 border border-red-200 mt-1 truncate">
                      <XCircleIcon className="w-3 h-3 mr-1" />
                      Expired
                    </span>
                  )}
                </div>

                {/* Action */}
                <div className="col-span-1 max-w-[80px] flex items-center justify-center">
                  {leave.verificationStatus === 'Verified' ? (
                    <div className="flex items-center gap-1 text-green-600 text-xs">
                      <CheckCircleIcon className="w-4 h-4" />
                      <span className="font-medium">Verified</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setSelectedLeave(leave);
                        setShowVerificationModal(true);
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs font-medium flex items-center gap-1"
                    >
                      <EyeIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                      Verify
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
        {/* Mobile Card List */}
        <div className="md:hidden flex flex-col gap-4">
          {leaves.map((leave) => (
            <motion.div
              key={leave._id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-lg shadow p-4 flex flex-col gap-2 border border-gray-100"
            >
              <div className="flex justify-between items-center mb-1">
                <div className="flex items-center gap-2">
                  {getBlinkingDot(leave)}
                  <span className="font-bold text-base">
                    {isNaN(new Date(leave.startDate)) ? 'Invalid Date' : new Date(leave.startDate).toLocaleDateString()} {isNaN(new Date(leave.startDate)) ? '' : new Date(leave.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getVerificationStatusColor(leave._frontendExpired ? 'Expired' : leave.verificationStatus)}`}
                  style={{ minWidth: '70px' }}>
                  {getVerificationStatusIcon(leave._frontendExpired ? 'Expired' : leave.verificationStatus)}
                  <span className="ml-1 truncate">{leave._frontendExpired ? 'Expired' : leave.verificationStatus}</span>
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <UserIcon className="w-4 h-4 text-gray-500" />
                <span className="font-medium">{leave.student?.name || 'N/A'}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <AcademicCapIcon className="w-4 h-4" />
                <span>{leave.student?.rollNumber || 'N/A'}</span>
                <PhoneIcon className="w-4 h-4 ml-2" />
                <span>{leave.parentPhone || 'N/A'}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <CalendarIcon className="w-4 h-4" />
                <span>To: {isNaN(new Date(leave.endDate)) ? 'Invalid Date' : new Date(leave.endDate).toLocaleDateString()}</span>
                <ClockIcon className="w-4 h-4 ml-2" />
                <span>{leave.numberOfDays} day{leave.numberOfDays > 1 ? 's' : ''}</span>
              </div>
              <div className="text-xs text-gray-700"><span className="font-medium">Reason:</span> {leave.reason}</div>
              <div className="flex justify-end mt-2">
                {leave.verificationStatus === 'Verified' || leave._frontendExpired ? (
                  <div className="flex items-center gap-1 text-green-600 text-xs">
                    <CheckCircleIcon className="w-4 h-4" />
                    <span className="font-medium">{leave._frontendExpired ? 'Expired' : 'Verified'}</span>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setSelectedLeave(leave);
                      setShowVerificationModal(true);
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs font-medium flex items-center gap-1"
                  >
                    <EyeIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                    Verify
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    )}
  </div>
);

export default SecurityDashboard;
