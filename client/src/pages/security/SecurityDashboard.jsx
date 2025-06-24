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
  FunnelIcon,
  TagIcon
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
    applicationType: '',
    page: 1
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchedStudent, setSearchedStudent] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

  useEffect(() => {
    fetchApprovedLeaves();
  }, [filters.page]);

  useEffect(() => {
    // Apply filters to the fetched leaves
    let filtered = [...leaves];
    
    if (filters.verificationStatus) {
      filtered = filtered.filter(leave => leave.verificationStatus === filters.verificationStatus);
    }
    
    if (filters.applicationType) {
      filtered = filtered.filter(leave => leave.applicationType === filters.applicationType);
    }
    
    setFilteredLeaves(filtered);
  }, [leaves, filters.verificationStatus, filters.applicationType]);

  const fetchApprovedLeaves = async () => {
    try {
      setLoading(true);
      console.log('Fetching approved leaves with filters:', filters);
      const response = await api.get('/api/leave/approved', { params: { page: filters.page } });
      console.log('Approved leaves response:', response.data);
      if (response.data.success) {
        setLeaves(response.data.data.leaves);
        console.log('Set approved leaves:', response.data.data.leaves);
      }
    } catch (error) {
      console.error('Error fetching approved leaves:', error);
      toast.error('Failed to fetch approved leave requests');
    } finally {
      setLoading(false);
    }
  };

  const handleVerification = async () => {
    try {
      // Record the visit first
      await recordVisit(selectedLeave._id, 'Security Guard');
      
      // Then update verification status
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

  // Add visit recording function
  const recordVisit = async (leaveId, scannedBy) => {
    try {
      const response = await api.post(`/api/leave/${leaveId}/record-visit`, {
        scannedBy,
        location: 'Main Gate' // Can be made configurable
      });
      
      if (response.data.success) {
        toast.success('Visit recorded successfully');
        fetchApprovedLeaves(); // Refresh the list
      }
    } catch (error) {
      if (error.response?.status === 409) {
        toast.error('Visit already recorded recently');
      } else if (error.response?.data?.visitLocked) {
        toast.error('Maximum visits reached for this leave');
      } else {
        toast.error('Failed to record visit');
      }
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

  const getVerificationStatusIcon = (status) => {
    switch (status) {
      case 'Verified':
        return <CheckCircleIcon className="w-4 h-4" />;
      case 'Rejected':
      case 'Expired':
        return <XCircleIcon className="w-4 h-4" />;
      case 'Not Verified':
        return <ExclamationCircleIcon className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const getRequestDate = (leave) => leave.applicationType === 'Leave' ? new Date(leave.startDate) : new Date(leave.permissionDate);

  const isLeaveExpired = (leave) => {
    const now = new Date();
    const endDate = leave.applicationType === 'Leave' ? new Date(leave.endDate) : new Date(new Date(leave.permissionDate).setHours(23, 59, 59, 999));
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
      const start = getRequestDate(leave);
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
      const aStart = getRequestDate(a);
      const bStart = getRequestDate(b);
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
    const start = getRequestDate(leave);
    const diff = start - now;
    const diffPast = now - start;
    
    // Don't show dots for verified leaves
    if (leave.verificationStatus === 'Verified') return null;
    
    // Green dot: within 30 min of start time (urgent - student is about to leave)
    if (diff > 0 && diff <= 30 * 60 * 1000) {
      return (
        <span className="inline-block align-middle mr-2">
          <span className="animate-pulse bg-green-500 rounded-full w-4 h-4 inline-block shadow-sm"></span>
        </span>
      );
    }
    
    // Red dot: overdue leaves (any time past start and not verified)
    if (diffPast > 0) {
      return (
        <span className="inline-block align-middle mr-2">
          <span className="animate-pulse bg-red-500 rounded-full w-4 h-4 inline-block shadow-sm"></span>
        </span>
      );
    }
    
    return null;
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      toast.error('Please enter a roll number to search.');
      return;
    }
    
    setIsSearching(true);
    setSearchError('');
    setSearchedStudent(null);
    
    try {
      const response = await api.get(`/api/admin/students/search/${searchQuery.trim()}`);
      if (response.data.success) {
        setSearchedStudent(response.data.data);
        toast.success('Student found!');
      } else {
        setSearchError(response.data.message || 'Student not found.');
        toast.error(response.data.message || 'Student not found.');
      }
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to search for student.';
      setSearchError(msg);
      toast.error(msg);
    } finally {
      setIsSearching(false);
    }
  };

  // Section helpers
  const now = new Date();
  const sortedLeaves = getSortedLeaves();
  const todayLeaves = sortedLeaves.filter(leave => {
    const start = getRequestDate(leave);
    return isToday(start) && (!leave._frontendExpired && leave.verificationStatus !== 'Expired');
  });
  const upcomingLeaves = sortedLeaves.filter(leave => {
    const start = getRequestDate(leave);
    return start > now && (!leave._frontendExpired && leave.verificationStatus !== 'Expired');
  });
  const expiredLeaves = sortedLeaves.filter(leave => {
    const start = getRequestDate(leave);
    // Only include if start time is more than 24 hours ago
    return (now - start > 24 * 60 * 60 * 1000);
  }).sort((a, b) => getRequestDate(b) - getRequestDate(a));

  return (
    <div className="min-h-screen bg-gradient-to-t from-blue-50 to-blue-200">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8">
        <SEO 
          title="Security Dashboard"
          description="Security guard dashboard for leave and permission verification"
          keywords="security dashboard, leave verification, permission verification, guard access"
        />

        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
            <div className="flex items-center gap-3">
              <ShieldCheckIcon className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-blue-900">Security Dashboard</h1>
                <p className="text-sm sm:text-base text-gray-600">Manage approved leave & permission verifications</p>
              </div>
            </div>
            
            <form onSubmit={handleSearch} className="flex-grow max-w-md w-full lg:w-auto">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search student by Roll Number..."
                  className="w-full pl-4 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <button type="submit" disabled={isSearching} className="absolute inset-y-0 right-0 px-3 flex items-center bg-transparent text-gray-500 hover:text-blue-600">
                  {isSearching 
                    ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                    : <EyeIcon className="w-5 h-5" />
                  }
                </button>
              </div>
            </form>
            
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <FunnelIcon className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
              <select
                value={filters.applicationType}
                onChange={(e) => handleFilterChange({ applicationType: e.target.value })}
                className="px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs sm:text-sm"
              >
                <option value="">All Types</option>
                <option value="Leave">Leave</option>
                <option value="Permission">Permission</option>
              </select>
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

        {/* Searched Student Details */}
        {searchedStudent && (
          <StudentDetailsCard student={searchedStudent} onClose={() => {
            setSearchedStudent(null);
            setSearchQuery('');
          }} />
        )}
        {searchError && !searchedStudent && (
          <div className="bg-white rounded-lg shadow-sm p-6 my-6 text-center">
            <p className="text-red-500 font-medium">{searchError}</p>
          </div>
        )}

        {/* Leave List */}
        <div className="bg-white rounded-lg shadow-sm overflow-x-auto">
          {loading ? (
            <div className="p-4 sm:p-8 text-center">
              <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:h-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-sm sm:text-base text-gray-600">Loading requests...</p>
            </div>
          ) : (
            <>
              {/* Today's Leaves */}
              <SectionTable 
                title="Today's Requests" 
                leaves={todayLeaves} 
                getBlinkingDot={getBlinkingDot} 
                isLeaveExpired={isLeaveExpired} 
                getVerificationStatusColor={getVerificationStatusColor}
                getApplicationTypeColor={getApplicationTypeColor}
                getVerificationStatusIcon={getVerificationStatusIcon}
                setSelectedLeave={setSelectedLeave}
                setShowVerificationModal={setShowVerificationModal}
                getRequestDate={getRequestDate}
              />
              {/* Upcoming Leaves - Only show when toggled */}
              {showUpcomingPasses && (
                <SectionTable 
                  title="Upcoming Requests" 
                  leaves={upcomingLeaves} 
                  getBlinkingDot={getBlinkingDot} 
                  isLeaveExpired={isLeaveExpired} 
                  getVerificationStatusColor={getVerificationStatusColor}
                  getApplicationTypeColor={getApplicationTypeColor}
                  getVerificationStatusIcon={getVerificationStatusIcon}
                  setSelectedLeave={setSelectedLeave}
                  setShowVerificationModal={setShowVerificationModal}
                  getRequestDate={getRequestDate}
                />
              )}
              {/* Expired/Recent Requests */}
              <SectionTable 
                title="Expired / Recent Requests" 
                leaves={expiredLeaves} 
                getBlinkingDot={getBlinkingDot} 
                isLeaveExpired={isLeaveExpired} 
                getVerificationStatusColor={getVerificationStatusColor}
                getApplicationTypeColor={getApplicationTypeColor}
                getVerificationStatusIcon={getVerificationStatusIcon}
                setSelectedLeave={setSelectedLeave}
                setShowVerificationModal={setShowVerificationModal}
                getRequestDate={getRequestDate}
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
            <h2 className="text-lg sm:text-xl font-semibold mb-4">Verify {selectedLeave.applicationType}</h2>
            
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
              <h3 className="font-medium text-gray-900 mb-2 text-sm">{selectedLeave.applicationType} Details:</h3>
              <div className="space-y-1 text-xs sm:text-sm">
                <p className="text-gray-600">Student: {selectedLeave.student?.name}</p>
                <p className="text-gray-600">Roll No: {selectedLeave.student?.rollNumber}</p>
                {selectedLeave.applicationType === 'Leave' ? (
                  <p className="text-gray-600">Date: {new Date(selectedLeave.startDate).toLocaleDateString()} - {new Date(selectedLeave.endDate).toLocaleDateString()}</p>
                ) : (
                  <>
                    <p className="text-gray-600">Date: {new Date(selectedLeave.permissionDate).toLocaleDateString()}</p>
                    <p className="text-gray-600">Time: {selectedLeave.outTime} - {selectedLeave.inTime}</p>
                  </>
                )}
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
  getVerificationStatusColor,
  getApplicationTypeColor,
  getVerificationStatusIcon,
  setSelectedLeave,
  setShowVerificationModal,
  getRequestDate
}) => (
  <div className="mb-8">
    <h2 className="text-lg font-bold text-blue-800 p-4">{title} ({leaves.length})</h2>
    {leaves.length === 0 ? (
      <div className="p-4 text-center text-gray-400">No requests in this section.</div>
    ) : (
      <div className="overflow-x-auto">
        {/* Desktop Table Header */}
        <div className="hidden md:block">
          <div className="bg-gray-50 border-b border-gray-200 text-left" style={{ minWidth: '900px' }}>
            <div className="grid grid-cols-12 gap-2 sm:gap-4 px-4 py-2 text-xs sm:text-sm font-medium text-gray-700">
              <div className="col-span-3">Student Details</div>
              <div className="col-span-3">Timeframe</div>
              <div className="col-span-3">Details</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-1 text-center">Action</div>
            </div>
          </div>
        </div>
        
        {/* Desktop & Mobile Body */}
        <div className="divide-y divide-gray-100 md:divide-y-0" style={{ minWidth: '900px' }}>
          {leaves.map((leave) => (
            <motion.div
              key={leave._id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 hover:bg-gray-50 transition-colors"
            >
              {/* Desktop Layout */}
              <div className="hidden md:grid md:grid-cols-12 md:gap-2 lg:gap-4 md:items-center">
                {/* Student Details */}
                <div className="col-span-3 flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <UserIcon className="w-4 h-4 text-gray-500" />
                    <span className="font-medium text-gray-900 text-sm truncate">{leave.student?.name || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-600 ml-6">
                    <AcademicCapIcon className="w-4 h-4" />
                    <span className="truncate">{leave.student?.rollNumber || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-600 ml-6">
                    <PhoneIcon className="w-4 h-4" />
                    <span className="truncate">{leave.parentPhone || 'N/A'}</span>
                  </div>
                </div>

                {/* Timeframe */}
                <div className="col-span-3 flex flex-col gap-1 text-sm">
                  <div className="flex items-center">
                    {getBlinkingDot(leave)}
                    {leave.applicationType === 'Leave' ? (
                      <div className="flex items-center gap-1">
                        <CalendarIcon className="w-4 h-4 text-gray-500" />
                        <span className="font-medium">{new Date(leave.startDate).toLocaleDateString()}</span>
                        <span>-</span>
                        <span className="font-medium">{new Date(leave.endDate).toLocaleDateString()}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <CalendarIcon className="w-4 h-4 text-gray-500" />
                        <span className="font-medium">{new Date(leave.permissionDate).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                  {leave.applicationType === 'Permission' && (
                    <div className="flex items-center gap-1 text-xs text-gray-600 ml-6">
                      <ClockIcon className="w-4 h-4" />
                      <span>{leave.outTime} - {leave.inTime}</span>
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="col-span-3 flex flex-col gap-1 text-xs">
                  <div className="flex items-center gap-1">
                    <TagIcon className="w-4 h-4 text-gray-500" />
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-medium border ${getApplicationTypeColor(leave.applicationType)}`}>
                      {leave.applicationType}
                    </span>
                  </div>
                  <div className="text-gray-500 mt-1 truncate">
                    Visits: {leave.visitCount || 0}/{leave.maxVisits || 2}
                  </div>
                </div>

                {/* Status */}
                <div className="col-span-2">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getVerificationStatusColor(leave._frontendExpired ? 'Expired' : leave.verificationStatus)}`}
                    style={{ minWidth: '90px' }}>
                    {getVerificationStatusIcon(leave._frontendExpired ? 'Expired' : leave.verificationStatus)}
                    <span className="ml-1 truncate">{leave._frontendExpired ? 'Expired' : leave.verificationStatus}</span>
                  </span>
                </div>

                {/* Action */}
                <div className="col-span-1 text-center">
                  {leave.verificationStatus === 'Verified' ? (
                    <div className="flex items-center justify-center gap-1 text-green-600 text-xs">
                      <CheckCircleIcon className="w-4 h-4" />
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setSelectedLeave(leave);
                        setShowVerificationModal(true);
                      }}
                      className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs font-medium flex items-center gap-1"
                    >
                      <EyeIcon className="w-4 h-4" />
                      <span>Verify</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Mobile Layout */}
              <div className="md:hidden flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <UserIcon className="w-5 h-5 text-gray-500" />
                      <span className="font-bold text-base text-gray-900">{leave.student?.name || 'N/A'}</span>
                    </div>
                    <div className="text-sm text-gray-600 ml-7">{leave.student?.rollNumber || 'N/A'}</div>
                  </div>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getApplicationTypeColor(leave.applicationType)}`}>
                    {leave.applicationType}
                  </span>
                </div>

                <div className="border-t border-gray-100 pt-3">
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    {getBlinkingDot(leave)}
                    <CalendarIcon className="w-4 h-4 text-gray-500" />
                    {leave.applicationType === 'Leave' ? (
                      <span>{new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}</span>
                    ) : (
                      <span>{new Date(leave.permissionDate).toLocaleDateString()}</span>
                    )}
                  </div>
                  {leave.applicationType === 'Permission' && (
                    <div className="flex items-center gap-2 text-sm text-gray-700 ml-7">
                      <ClockIcon className="w-4 h-4" />
                      <span>{leave.outTime} - {leave.inTime}</span>
                    </div>
                  )}
                </div>
                
                <div className="flex justify-between items-center">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getVerificationStatusColor(leave._frontendExpired ? 'Expired' : leave.verificationStatus)}`}
                    style={{ minWidth: '70px' }}>
                    {getVerificationStatusIcon(leave._frontendExpired ? 'Expired' : leave.verificationStatus)}
                    <span className="ml-1 truncate">{leave._frontendExpired ? 'Expired' : leave.verificationStatus}</span>
                  </span>
                  <div className="text-sm text-blue-600 font-medium">Visits: {leave.visitCount || 0}/{leave.maxVisits || 2}</div>
                  {leave.verificationStatus !== 'Verified' && !leave._frontendExpired && (
                    <button
                      onClick={() => {
                        setSelectedLeave(leave);
                        setShowVerificationModal(true);
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs font-medium flex items-center gap-1"
                    >
                      <EyeIcon className="w-4 h-4" />
                      Verify
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    )}
  </div>
);

const StudentDetailsCard = ({ student, onClose }) => {
  const [popupImage, setPopupImage] = useState(null);
  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="bg-white rounded-lg shadow-lg p-4 sm:p-6 mb-6 border-l-4 border-blue-600"
      >
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-lg sm:text-xl font-bold text-blue-900">Student Details</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full">
            <XCircleIcon className="w-6 h-6" />
          </button>
        </div>
        <div className="flex flex-col md:flex-row gap-6 items-center md:items-start">
          <div className="flex flex-col items-center w-full md:w-1/3">
            <img
              src={student.studentPhoto || `https://ui-avatars.com/api/?name=${student.name}&background=0D8ABC&color=fff&size=128`}
              alt={student.name}
              className="w-24 h-24 sm:w-32 sm:h-32 rounded-full object-cover border-4 border-gray-100 shadow-md cursor-pointer hover:scale-105 transition-transform"
              onClick={() => setPopupImage(student.studentPhoto || `https://ui-avatars.com/api/?name=${student.name}&background=0D8ABC&color=fff&size=512`)}
            />
            <span className={`mt-3 px-3 py-1 text-sm font-semibold rounded-full ${
              student.hostelStatus === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {student.hostelStatus}
            </span>
            {/* Guardian Photos */}
            {(student.guardianPhoto1 || student.guardianPhoto2) && (
              <div className="mt-4 w-full flex flex-row justify-center items-center gap-2">
                {student.guardianPhoto1 && (
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg overflow-hidden border border-gray-200 cursor-pointer hover:scale-105 transition-transform">
                    <img src={student.guardianPhoto1} alt="Guardian 1" className="w-full h-full object-cover" onClick={() => setPopupImage(student.guardianPhoto1)} />
                    <div className="text-xs text-center text-gray-500 mt-1">Guardian Photo 1</div>
                  </div>
                )}
                {student.guardianPhoto2 && (
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg overflow-hidden border border-gray-200 cursor-pointer hover:scale-105 transition-transform">
                    <img src={student.guardianPhoto2} alt="Guardian 2" className="w-full h-full object-cover" onClick={() => setPopupImage(student.guardianPhoto2)} />
                    <div className="text-xs text-center text-gray-500 mt-1">Guardian Photo 2</div>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm w-full">
            <InfoField icon={<UserIcon />} label="Name" value={student.name} />
            <InfoField icon={<AcademicCapIcon />} label="Roll Number" value={student.rollNumber} />
            <InfoField icon={<TagIcon />} label="Course" value={`${student.course} - ${student.branch}`} />
            <InfoField icon={<CalendarIcon />} label="Year" value={student.year} />
            <InfoField icon={<PhoneIcon />} label="Student Phone" value={student.studentPhone} />
            <InfoField icon={<PhoneIcon />} label="Parent Phone" value={student.parentPhone} />
            <InfoField icon={<div className="font-bold">R</div>} label="Room" value={student.roomNumber} />
            <InfoField icon={<div className="font-bold">C</div>} label="Category" value={student.category} />
            <InfoField icon={<CalendarIcon />} label="Batch" value={student.batch} />
            <InfoField icon={<CalendarIcon />} label="Academic Year" value={student.academicYear} />
          </div>
        </div>
      </motion.div>
      {/* Image Popup Modal */}
      {popupImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 p-4">
          <div className="relative bg-white rounded-lg shadow-lg p-2 max-w-full max-h-full flex flex-col items-center">
            <button
              onClick={() => setPopupImage(null)}
              className="absolute top-2 right-2 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full z-10"
            >
              <XCircleIcon className="w-7 h-7" />
            </button>
            <img
              src={popupImage}
              alt="Enlarged"
              className="max-w-[90vw] max-h-[80vh] rounded-lg object-contain"
            />
          </div>
        </div>
      )}
    </>
  );
}

const InfoField = ({ icon, label, value }) => (
  <div className="flex items-start gap-3">
    <div className="flex-shrink-0 w-5 h-5 text-gray-500 mt-0.5">{icon}</div>
    <div>
      <p className="font-semibold text-gray-800">{label}</p>
      <p className="text-gray-600">{value}</p>
    </div>
  </div>
);

export default SecurityDashboard;
