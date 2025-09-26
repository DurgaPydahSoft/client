import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import api from '../../utils/axios';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { hasPermission, getAccessLevel } from '../../utils/permissionUtils';
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
  TagIcon,
  ClipboardDocumentIcon,
  ChevronDownIcon,
  LockClosedIcon
} from '@heroicons/react/24/outline';
import SEO from '../../components/SEO';

const SecurityDashboard = () => {
  const { user } = useAuth();
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
  const [outgoingSearchQuery, setOutgoingSearchQuery] = useState('');
  const [securitySettings, setSecuritySettings] = useState({
    viewProfilePictures: true,
    viewPhoneNumbers: true,
    viewGuardianImages: true
  });
  // Add state for expandable sections
  const [expandedSections, setExpandedSections] = useState({
    outgoing: true, // Default open
    incoming: false,
    completed: false,
    upcoming: false,
    expired: false
  });

  // Permission checks
  const hasSecurityPermission = hasPermission(user, 'security_management');
  const securityAccessLevel = getAccessLevel(user, 'security_management');
  const isViewOnly = hasSecurityPermission && securityAccessLevel === 'view';
  const isSuperAdmin = user?.role === 'super_admin';

  // Check if user can access security dashboard
  if (!hasSecurityPermission && !isSuperAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-t flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="w-20 h-20 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
            <LockClosedIcon className="w-10 h-10 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Restricted</h2>
          <p className="text-gray-600 mb-6">
            You don't have permission to access the Security Dashboard. 
            Please contact your super admin to request access.
          </p>
        </div>
      </div>
    );
  }

  useEffect(() => {
    fetchApprovedLeaves();
    fetchSecuritySettings();
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
      const response = await api.get('/api/leave/approved', { params: { page: filters.page, limit: 100 } });
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

  const fetchSecuritySettings = async () => {
    try {
      const res = await api.get('/api/security-settings');
      if (res.data.success) {
        setSecuritySettings(res.data.data);
      }
    } catch (err) {
      // fallback: all true
      setSecuritySettings({
        viewProfilePictures: true,
        viewPhoneNumbers: true,
        viewGuardianImages: true
      });
    }
  };

  const handleVerification = async () => {
    try {
      // Check if this is an incoming request
      if (selectedLeave.verificationStatus === 'Verified' && selectedLeave.incomingQrGenerated) {
        // This is an incoming request - scan incoming QR
        const response = await api.post(`/api/leave/incoming-qr/${selectedLeave._id}`, {
          scannedBy: 'Security Guard',
          location: 'Main Gate'
        });
        
        if (response.data.success) {
          toast.success('Incoming visit recorded - Leave completed');
          setShowVerificationModal(false);
          setVerificationStatus('Verified');
          fetchApprovedLeaves();
        }
      } else {
        // This is an outgoing request - record visit and update verification status
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

  const getVerificationStatusColor = (status, leaveStatus) => {
    // Handle special case for warden verified but not principal approved
    if (leaveStatus === 'Warden Verified') {
      return 'text-orange-600 bg-orange-50 border-orange-200';
    }
    
    switch (status) {
      case 'Verified':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'Expired':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'Not Verified':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'Completed':
        return 'text-purple-600 bg-purple-50 border-purple-200';
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

  const getVerificationStatusIcon = (status, leaveStatus) => {
    // Handle special case for warden verified but not principal approved
    if (leaveStatus === 'Warden Verified') {
      return <ExclamationCircleIcon className="w-4 h-4" />;
    }
    
    switch (status) {
      case 'Verified':
        return <CheckCircleIcon className="w-4 h-4" />;
      case 'Rejected':
      case 'Expired':
        return <XCircleIcon className="w-4 h-4" />;
      case 'Not Verified':
        return <ExclamationCircleIcon className="w-4 h-4" />;
      case 'Completed':
        return <CheckCircleIcon className="w-4 h-4" />;
      default:
        return null;
    }
  };

  // Helper function to get display status text
  const getDisplayStatus = (leave) => {
    if (leave.status === 'Warden Verified') {
      return 'Principal Not Yet Approved';
    }
    return leave._frontendExpired ? 'Expired' : leave.verificationStatus;
  };

  // Helper function to filter outgoing requests based on search query
  const filterOutgoingRequests = (requests) => {
    if (!outgoingSearchQuery.trim()) {
      return requests;
    }
    
    const query = outgoingSearchQuery.toLowerCase().trim();
    return requests.filter(leave => {
      const studentName = (leave.student?.name || '').toLowerCase();
      const rollNumber = (leave.student?.rollNumber || '').toLowerCase();
      const course = (leave.student?.course?.name || leave.student?.course || '').toLowerCase();
      const branch = (leave.student?.branch?.name || leave.student?.branch || '').toLowerCase();
      
      return studentName.includes(query) || 
             rollNumber.includes(query) || 
             course.includes(query) || 
             branch.includes(query);
    });
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

  // Helper: is today (IST) - Fixed to properly handle permission dates
  const isToday = (date) => {
    // Convert both date and now to IST and normalize to date only (remove time)
    const toISTDateOnly = (d) => {
      // IST is UTC+5:30
      const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
      const istDate = new Date(utc + (5.5 * 60 * 60 * 1000));
      // Normalize to start of day (00:00:00) to ignore time components
      return new Date(istDate.getFullYear(), istDate.getMonth(), istDate.getDate());
    };
    const nowIST = toISTDateOnly(new Date());
    const dateIST = toISTDateOnly(date);
    return nowIST.getTime() === dateIST.getTime();
  };

  // Helper: is today or yesterday (IST) - For outgoing requests
  const isTodayOrYesterday = (date) => {
    // Convert both date and now to IST and normalize to date only (remove time)
    const toISTDateOnly = (d) => {
      // IST is UTC+5:30
      const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
      const istDate = new Date(utc + (5.5 * 60 * 60 * 1000));
      // Normalize to start of day (00:00:00) to ignore time components
      return new Date(istDate.getFullYear(), istDate.getMonth(), istDate.getDate());
    };
    const nowIST = toISTDateOnly(new Date());
    const yesterdayIST = new Date(nowIST);
    yesterdayIST.setDate(yesterdayIST.getDate() - 1);
    const dateIST = toISTDateOnly(date);
    
    return nowIST.getTime() === dateIST.getTime() || yesterdayIST.getTime() === dateIST.getTime();
  };

  // Helper: sort and auto-expire
  const getSortedLeaves = () => {
    const now = new Date();
    // Clone and add frontend-only expired status if needed
    const enhanced = filteredLeaves.map(leave => {
      const start = getRequestDate(leave);
      // Only mark as expired if it's from before yesterday (not today or yesterday)
      if (
        leave.verificationStatus !== 'Verified' &&
        !isTodayOrYesterday(start) // Only expire if not today or yesterday
      ) {
        return { ...leave, _frontendExpired: true };
      }
      return leave;
    });
    
    // Sort: unverified first, then verified, then completed
    return enhanced.sort((a, b) => {
      const aStart = getRequestDate(a);
      const bStart = getRequestDate(b);
      const aToday = isToday(aStart);
      const bToday = isToday(bStart);
      
      // First priority: Today's requests first
      if (aToday && !bToday) return -1;
      if (!aToday && bToday) return 1;
      
      // Second priority: Verification status (unverified first, verified last)
      if (a.verificationStatus === 'Not Verified' && b.verificationStatus !== 'Not Verified') return -1;
      if (a.verificationStatus !== 'Not Verified' && b.verificationStatus === 'Not Verified') return 1;
      if (a.verificationStatus === 'Verified' && b.verificationStatus === 'Completed') return -1;
      if (a.verificationStatus === 'Completed' && b.verificationStatus === 'Verified') return 1;
      
      // Third priority: Start time (earliest first)
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
        <div className="flex items-center gap-1">
          <span className="animate-pulse bg-green-500 rounded-full w-3 h-3 shadow-sm"></span>
          <span className="text-xs text-green-600 font-medium">Urgent</span>
        </div>
      );
    }
    
    // Red dot: overdue leaves (any time past start and not verified)
    if (diffPast > 0) {
      return (
        <div className="flex items-center gap-1">
          <span className="animate-pulse bg-red-500 rounded-full w-3 h-3 shadow-sm"></span>
          <span className="text-xs text-red-600 font-medium">Overdue</span>
        </div>
      );
    }
    
    return null;
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard!');
    } catch (err) {
      toast.error('Failed to copy to clipboard');
    }
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
      // Always fetch latest settings before showing student
      await fetchSecuritySettings();
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
  
  // Outgoing leaves (not verified yet) - includes today and yesterday
  const outgoingLeavesBase = sortedLeaves.filter(leave => {
    const start = getRequestDate(leave);
    const isTodayOrYesterdayResult = isTodayOrYesterday(start);
    const isNotVerified = leave.verificationStatus === 'Not Verified';
    const isNotExpired = !leave._frontendExpired;
    const shouldInclude = isTodayOrYesterdayResult && isNotVerified && isNotExpired;
    
    // Debug logging for yesterday's leaves
    if (isTodayOrYesterdayResult && !isToday(start)) {
      console.log('Yesterday leave debug:', {
        studentName: leave.student?.name,
        rollNumber: leave.student?.rollNumber,
        startDate: start,
        verificationStatus: leave.verificationStatus,
        isNotVerified,
        isNotExpired,
        shouldInclude
      });
    }
    
    return shouldInclude;
  });

  // Apply search filter to outgoing leaves
  const outgoingLeaves = filterOutgoingRequests(outgoingLeavesBase);
  
  // Incoming leaves (verified outgoing, waiting for incoming)
  const incomingLeaves = sortedLeaves.filter(leave => {
    const start = getRequestDate(leave);
    return isToday(start) && leave.verificationStatus === 'Verified' && leave.incomingQrGenerated && !leave._frontendExpired;
  });
  
  // Completed leaves (incoming QR scanned)
  const completedLeaves = sortedLeaves.filter(leave => {
    const start = getRequestDate(leave);
    return isToday(start) && leave.verificationStatus === 'Completed';
  });
  
  // Upcoming leaves
  const upcomingLeaves = sortedLeaves.filter(leave => {
    const start = getRequestDate(leave);
    return start > now && (!leave._frontendExpired && leave.verificationStatus !== 'Expired');
  });
  
  // Expired/Recent requests
  const expiredLeaves = sortedLeaves.filter(leave => {
    const start = getRequestDate(leave);
    // Only include if start time is more than 2 days ago
    return (now - start > 2 * 24 * 60 * 60 * 1000);
  }).sort((a, b) => getRequestDate(b) - getRequestDate(a));

  // Toggle section expansion
  const toggleSection = (sectionKey) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-t">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 py-2 sm:py-4 lg:py-6">
        <SEO 
          title="Security Dashboard"
          description="Security guard dashboard for leave and permission verification"
          keywords="security dashboard, leave verification, permission verification, guard access"
        />

        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-3 mb-3 mt-8">
          <div className="flex flex-col gap-2">
            {/* Title Section */}
            <div className="flex items-center gap-2">
              <ShieldCheckIcon className="w-5 h-5 text-blue-600 hidden sm:block" />
              <div>
                <h1 className="text-lg font-bold text-blue-900">Security Dashboard</h1>
                <p className="text-xs text-gray-600">Manage approved leave & permission verifications</p>
                
              </div>
            </div>
            
            {/* Search Section */}
            <form onSubmit={handleSearch} className="w-full">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={isViewOnly ? "Search disabled for view-only access" : "Search student by Roll Number..."}
                  disabled={isViewOnly}
                  className={`w-full pl-3 pr-10 py-2 border rounded-lg text-sm ${
                    isViewOnly 
                      ? 'border-gray-200 bg-gray-100 text-gray-500 cursor-not-allowed' 
                      : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                  }`}
                />
                <button 
                  type="submit" 
                  disabled={isSearching || isViewOnly} 
                  className={`absolute inset-y-0 right-0 px-2 flex items-center ${
                    isViewOnly 
                      ? 'text-gray-400 cursor-not-allowed' 
                      : 'text-gray-500 hover:text-blue-600'
                  }`}
                  title={isViewOnly ? 'Search disabled for view-only access' : 'Search student'}
                >
                  {isSearching 
                    ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    : <EyeIcon className="w-4 h-4" />
                  }
                </button>
              </div>
            </form>
            
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-1">
              <FunnelIcon className="w-3 h-3 text-gray-500" />
              <select
                value={filters.applicationType}
                onChange={(e) => handleFilterChange({ applicationType: e.target.value })}
                className="px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs"
              >
                <option value="">All Types</option>
                <option value="Leave">Leave</option>
                <option value="Permission">Permission</option>
              </select>
              <select
                value={filters.verificationStatus}
                onChange={(e) => handleFilterChange({ verificationStatus: e.target.value })}
                className="px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs"
              >
                <option value="">All Status</option>
                <option value="Not Verified">Not Verified</option>
                <option value="Verified">Verified</option>
                <option value="Completed">Completed</option>
                <option value="Expired">Expired</option>
              </select>
              
              {/* Upcoming Leaves Toggle */}
              <button
                onClick={() => setShowUpcomingPasses(!showUpcomingPasses)}
                className={`px-2 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1 ${
                  showUpcomingPasses 
                    ? 'bg-blue-600 text-white hover:bg-blue-700' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <CalendarIcon className="w-3 h-3" />
                <span>Upcoming</span>
              </button>
            </div>
          </div>
        </div>

        {/* Searched Student Details */}
        {searchedStudent && (
          <StudentDetailsCard student={searchedStudent} onClose={() => {
            setSearchedStudent(null);
            setSearchQuery('');
          }} securitySettings={securitySettings} />
        )}
        {searchError && !searchedStudent && (
          <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 my-4 sm:my-6 text-center">
            <p className="text-red-500 font-medium text-sm sm:text-base">{searchError}</p>
          </div>
        )}

        {/* Leave List */}
        <div className="bg-white rounded-lg shadow-sm overflow-x-auto">
          {loading ? (
            <div className="p-4 sm:p-6 lg:p-8 text-center">
              <div className="animate-spin rounded-full h-5 w-5 sm:h-6 sm:w-6 lg:h-8 lg:w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-xs sm:text-sm lg:text-base text-gray-600">Loading requests...</p>
            </div>
          ) : (
            <>
                            {/* Outgoing Leaves - Always visible for all users */}
              <SectionTable 
                title="Outgoing Requests (Exit) - Today & Yesterday" 
                leaves={outgoingLeaves} 
                getBlinkingDot={getBlinkingDot} 
                isLeaveExpired={isLeaveExpired} 
                getVerificationStatusColor={getVerificationStatusColor}
                getApplicationTypeColor={getApplicationTypeColor}
                getVerificationStatusIcon={getVerificationStatusIcon}
                getDisplayStatus={getDisplayStatus}
                setSelectedLeave={setSelectedLeave}
                setShowVerificationModal={setShowVerificationModal}
                getRequestDate={getRequestDate}
                copyToClipboard={copyToClipboard}
                isExpanded={expandedSections.outgoing}
                onToggle={() => toggleSection('outgoing')}
                sectionKey="outgoing"
                isViewOnly={isViewOnly}
                isToday={isToday}
                isTodayOrYesterday={isTodayOrYesterday}
                searchQuery={outgoingSearchQuery}
                onSearchChange={setOutgoingSearchQuery}
                showSearch={true}
                baseCount={outgoingLeavesBase.length}
              />
              
              {/* Incoming Leaves - Only visible for full access users */}
              {!isViewOnly && (
                <SectionTable 
                  title="Incoming Requests (Re-entry)" 
                  leaves={incomingLeaves} 
                  getBlinkingDot={getBlinkingDot} 
                  isLeaveExpired={isLeaveExpired} 
                  getVerificationStatusColor={getVerificationStatusColor}
                  getApplicationTypeColor={getApplicationTypeColor}
                  getVerificationStatusIcon={getVerificationStatusIcon}
                  getDisplayStatus={getDisplayStatus}
                  setSelectedLeave={setSelectedLeave}
                  setShowVerificationModal={setShowVerificationModal}
                  getRequestDate={getRequestDate}
                  copyToClipboard={copyToClipboard}
                  isExpanded={expandedSections.incoming}
                  onToggle={() => toggleSection('incoming')}
                  sectionKey="incoming"
                  isViewOnly={isViewOnly}
                  isToday={isToday}
                  isTodayOrYesterday={isTodayOrYesterday}
                />
              )}
              
              {/* Completed Leaves - Only visible for full access users */}
              {!isViewOnly && (
                <SectionTable 
                  title="Completed Requests" 
                  leaves={completedLeaves} 
                  getBlinkingDot={getBlinkingDot} 
                  isLeaveExpired={isLeaveExpired} 
                  getVerificationStatusColor={getVerificationStatusColor}
                  getApplicationTypeColor={getApplicationTypeColor}
                  getVerificationStatusIcon={getVerificationStatusIcon}
                  getDisplayStatus={getDisplayStatus}
                  setSelectedLeave={setSelectedLeave}
                  setShowVerificationModal={setShowVerificationModal}
                  getRequestDate={getRequestDate}
                  copyToClipboard={copyToClipboard}
                  isExpanded={expandedSections.completed}
                  onToggle={() => toggleSection('completed')}
                  sectionKey="completed"
                  isViewOnly={isViewOnly}
                  isToday={isToday}
                  isTodayOrYesterday={isTodayOrYesterday}
                />
              )}
              
              {/* Upcoming Leaves - Only show when toggled and for full access users */}
              {!isViewOnly && showUpcomingPasses && (
                <SectionTable 
                  title="Upcoming Requests" 
                  leaves={upcomingLeaves} 
                  getBlinkingDot={getBlinkingDot} 
                  isLeaveExpired={isLeaveExpired} 
                  getVerificationStatusColor={getVerificationStatusColor}
                  getApplicationTypeColor={getApplicationTypeColor}
                  getVerificationStatusIcon={getVerificationStatusIcon}
                  getDisplayStatus={getDisplayStatus}
                  setSelectedLeave={setSelectedLeave}
                  setShowVerificationModal={setShowVerificationModal}
                  getRequestDate={getRequestDate}
                  copyToClipboard={copyToClipboard}
                  isExpanded={expandedSections.upcoming}
                  onToggle={() => toggleSection('upcoming')}
                  sectionKey="upcoming"
                  isViewOnly={isViewOnly}
                  isToday={isToday}
                  isTodayOrYesterday={isTodayOrYesterday}
                />
              )}
              
              {/* Expired/Recent Requests - Only visible for full access users */}
              {!isViewOnly && (
                <SectionTable 
                  title="Expired / Recent Requests (2+ days ago)" 
                  leaves={expiredLeaves} 
                  getBlinkingDot={getBlinkingDot} 
                  isLeaveExpired={isLeaveExpired} 
                  getVerificationStatusColor={getVerificationStatusColor}
                  getApplicationTypeColor={getApplicationTypeColor}
                  getVerificationStatusIcon={getVerificationStatusIcon}
                  getDisplayStatus={getDisplayStatus}
                  setSelectedLeave={setSelectedLeave}
                  setShowVerificationModal={setShowVerificationModal}
                  getRequestDate={getRequestDate}
                  copyToClipboard={copyToClipboard}
                  isExpanded={expandedSections.expired}
                  onToggle={() => toggleSection('expired')}
                  sectionKey="expired"
                  isViewOnly={isViewOnly}
                  isToday={isToday}
                  isTodayOrYesterday={isTodayOrYesterday}
                />
              )}
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
                
                {/* Show warden verification status if applicable */}
                {selectedLeave.status === 'Warden Verified' && (
                  <div className="mt-2 p-2 bg-orange-50 rounded border border-orange-200">
                    <p className="text-orange-700 text-xs font-medium">Warden Verified</p>
                    <p className="text-orange-600 text-xs">Waiting for Principal Approval</p>
                    {selectedLeave.verifiedBy?.name && (
                      <p className="text-orange-600 text-xs">Verified by: {selectedLeave.verifiedBy.name}</p>
                    )}
                    {selectedLeave.verifiedAt && (
                      <p className="text-orange-600 text-xs">Verified at: {new Date(selectedLeave.verifiedAt).toLocaleString()}</p>
                    )}
                  </div>
                )}
                
                {selectedLeave.incomingQrGenerated && (
                  <div className="mt-2 p-2 bg-blue-50 rounded">
                    <p className="text-blue-700 text-xs font-medium">Incoming QR Available</p>
                    <p className="text-blue-600 text-xs">Expires: {new Date(selectedLeave.incomingQrExpiresAt).toLocaleString()}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:gap-3">
              {selectedLeave?.status === 'Warden Verified' ? (
                <div className="px-4 py-2 bg-orange-100 text-orange-700 rounded-lg text-sm font-medium text-center border border-orange-200">
                  Cannot verify - Waiting for Principal Approval
                </div>
              ) : (
                <button
                  onClick={handleVerification}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  {selectedLeave?.verificationStatus === 'Verified' && selectedLeave?.incomingQrGenerated 
                    ? 'Scan Incoming QR' 
                    : 'Update Status'
                  }
                </button>
              )}
              <button
                onClick={() => {
                  setShowVerificationModal(false);
                  setVerificationStatus('Verified');
                }}
                className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm font-medium border border-red-200"
              >
                Cancel
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
  getDisplayStatus,
  setSelectedLeave,
  setShowVerificationModal,
  getRequestDate,
  copyToClipboard,
  isExpanded,
  onToggle,
  sectionKey,
  isViewOnly = false,
  isToday,
  isTodayOrYesterday,
  searchQuery,
  onSearchChange,
  showSearch = false,
  baseCount
}) => (
  <div className="mb-6 sm:mb-8 bg-white rounded-lg shadow-sm overflow-hidden">
    {/* Section Header with Toggle */}
    <div className="p-3 sm:p-4 bg-gradient-to-r from-blue-50 to-blue-100 border-b border-blue-200">
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-2">
          <h2 className="text-base sm:text-lg font-bold text-blue-800">
            {title} 
            {showSearch && searchQuery ? (
              <span className="text-sm font-normal text-gray-600">
                {' '}({leaves.length} of {baseCount || leaves.length} results)
              </span>
            ) : (
              ` (${leaves.length})`
            )}
          </h2>
          {leaves.length > 0 && (
            <span className="px-2 py-1 bg-blue-200 text-blue-800 text-xs font-medium rounded-full">
              {leaves.length}
            </span>
          )}
        </div>
        <button 
          onClick={onToggle} 
          className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-200 rounded-full transition-all duration-200 flex-shrink-0"
        >
          {isExpanded ? (
            <ChevronDownIcon className="w-5 h-5 sm:w-6 sm:h-6 transform rotate-180 transition-transform duration-200" />
          ) : (
            <ChevronDownIcon className="w-5 h-5 sm:w-6 sm:h-6 transition-transform duration-200" />
          )}
        </button>
      </div>
      
      {/* Search Input for Outgoing Section */}
      {showSearch && isExpanded && (
        <div className="mt-2">
          <div className="relative">
            <input
              type="text"
              value={searchQuery || ''}
              onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
              placeholder="Search by name, roll number, course..."
              className="w-full pl-3 pr-20 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <div className="absolute inset-y-0 right-0 flex items-center">
              {searchQuery && (
                <button
                  onClick={() => onSearchChange && onSearchChange('')}
                  className="px-2 py-1 text-gray-500 hover:text-red-600 transition-colors"
                  title="Clear search"
                >
                  <XCircleIcon className="w-4 h-4" />
                </button>
              )}
              <div className="px-2">
                <EyeIcon className="w-4 h-4 text-gray-500" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    
    {/* Expandable Content */}
    {isExpanded && (
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: "auto" }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="overflow-hidden"
      >
        {leaves.length === 0 ? (
          <div className="p-6 text-center text-gray-400 text-sm bg-gray-50">
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                <ClipboardDocumentIcon className="w-6 h-6 text-gray-400" />
              </div>
              {showSearch && searchQuery ? (
                <div>
                  <p>No requests found for "{searchQuery}"</p>
                  <button
                    onClick={() => onSearchChange && onSearchChange('')}
                    className="mt-2 text-blue-600 hover:text-blue-800 text-xs underline"
                  >
                    Clear search
                  </button>
                </div>
              ) : (
                <p>No requests in this section</p>
              )}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            {/* Desktop Table Header */}
            <div className="hidden md:block">
              <div className="bg-gray-50 border-b border-gray-200 text-left" style={{ minWidth: '900px' }}>
                <div className="grid grid-cols-12 gap-2 sm:gap-4 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-gray-700">
                  <div className="col-span-3">Student Details</div>
                  <div className="col-span-3">Timeframe</div>
                  <div className="col-span-3">Details</div>
                  <div className="col-span-2">Status</div>
                  <div className="col-span-1 text-center">Action</div>
                </div>
              </div>
            </div>
            
            {/* Desktop Body */}
            <div className="hidden md:block divide-y divide-gray-100" style={{ minWidth: '900px' }}>
              {leaves.map((leave) => (
                <motion.div
                  key={leave._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 sm:p-4 hover:bg-gray-50 transition-colors"
                >
                  {/* Desktop Layout */}
                  <div className="hidden md:grid md:grid-cols-12 md:gap-2 lg:gap-4 md:items-center">
                    {/* Student Details */}
                    <div className="col-span-3 flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <UserIcon className="w-4 h-4 text-gray-500" />
                        <span className="font-medium text-gray-900 text-sm break-words">{leave.student?.name || 'N/A'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-600 ml-6">
                        <AcademicCapIcon className="w-4 h-4" />
                        <span className="break-words">{leave.student?.rollNumber || 'N/A'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-600 ml-6">
                        <PhoneIcon className="w-4 h-4" />
                        <span className="break-words">{leave.parentPhone || 'N/A'}</span>
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
                            {/* Show if this is yesterday's request */}
                            {!isToday(getRequestDate(leave)) && isTodayOrYesterday(getRequestDate(leave)) && (
                              <span className="px-1.5 py-0.5 bg-orange-100 text-orange-700 text-xs font-medium rounded ml-2">
                                Yesterday
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <CalendarIcon className="w-4 h-4 text-gray-500" />
                            <span className="font-medium">{new Date(leave.permissionDate).toLocaleDateString()}</span>
                            {/* Show if this is yesterday's request */}
                            {!isToday(getRequestDate(leave)) && isTodayOrYesterday(getRequestDate(leave)) && (
                              <span className="px-1.5 py-0.5 bg-orange-100 text-orange-700 text-xs font-medium rounded ml-2">
                                Yesterday
                              </span>
                            )}
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
                      <div className="text-gray-500 mt-1 break-words">
                        Outgoing: {leave.outgoingVisitCount || 0}/{leave.maxVisits || 2}
                        {leave.incomingQrGenerated && (
                          <div className="text-xs text-green-600">
                            Incoming: {leave.incomingVisitCount || 0}/1
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Status */}
                    <div className="col-span-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getVerificationStatusColor(leave._frontendExpired ? 'Expired' : leave.verificationStatus, leave.status)}`}
                        style={{ minWidth: '90px' }}>
                        {getVerificationStatusIcon(leave._frontendExpired ? 'Expired' : leave.verificationStatus, leave.status)}
                        <span className="ml-1 break-words">{getDisplayStatus(leave)}</span>
                      </span>
                    </div>

                    {/* Action */}
                    <div className="col-span-1 text-center">
                      {leave.status === 'Warden Verified' ? (
                        <div className="flex items-center justify-center gap-1 text-orange-600 text-xs">
                          <ExclamationCircleIcon className="w-4 h-4" />
                          <span>Waiting Principal</span>
                        </div>
                      ) : leave.verificationStatus === 'Verified' && !leave.incomingQrGenerated ? (
                        <div className="flex items-center justify-center gap-1 text-blue-600 text-xs">
                          <CheckCircleIcon className="w-4 h-4" />
                          <span>Outgoing Verified</span>
                        </div>
                      ) : leave.verificationStatus === 'Verified' && leave.incomingQrGenerated ? (
                        <button
                          onClick={() => {
                            if (!isViewOnly) {
                              setSelectedLeave(leave);
                              setShowVerificationModal(true);
                            }
                          }}
                          disabled={isViewOnly}
                          className={`px-2 sm:px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors ${
                            isViewOnly 
                              ? 'bg-gray-400 text-gray-200 cursor-not-allowed' 
                              : 'bg-green-600 text-white hover:bg-green-700'
                          }`}
                          title={isViewOnly ? 'View-only access - Cannot scan incoming QR' : 'Scan Incoming QR'}
                        >
                          <EyeIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                          <span>{isViewOnly ? 'View Only' : 'Scan Incoming'}</span>
                        </button>
                      ) : leave.verificationStatus === 'Completed' ? (
                        <div className="flex items-center justify-center gap-1 text-purple-600 text-xs">
                          <CheckCircleIcon className="w-4 h-4" />
                          <span>Completed</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            // View-only users CAN verify outgoing requests
                            setSelectedLeave(leave);
                            setShowVerificationModal(true);
                          }}
                          className="px-2 sm:px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs font-medium flex items-center gap-1"
                          title="Verify Request"
                        >
                          <EyeIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                          <span>Verify</span>
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
            
            {/* Mobile Layout */}
            <div className="md:hidden">
              {leaves.map((leave) => (
                <motion.div
                  key={leave._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-3"
                >
                  {/* Mobile Layout - Compact Design for Small Screens */}
                  <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-3 mb-3 mx-1">
                    {/* Status Badge */}
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-1 flex-wrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getApplicationTypeColor(leave.applicationType)}`}>
                          {leave.applicationType}
                        </span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getVerificationStatusColor(leave._frontendExpired ? 'Expired' : leave.verificationStatus, leave.status)}`}>
                          {getVerificationStatusIcon(leave._frontendExpired ? 'Expired' : leave.verificationStatus, leave.status)}
                          <span className="ml-1">{getDisplayStatus(leave)}</span>
                        </span>
                      </div>
                      <div className="flex-shrink-0">
                        {getBlinkingDot(leave)}
                      </div>
                    </div>

                    {/* Student Information */}
                    <div className="bg-blue-50 rounded-lg p-2 mb-2">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                          <UserIcon className="w-3 h-3 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-sm text-gray-900 break-words">{leave.student?.name || 'N/A'}</h3>
                          <div className="flex items-center gap-1">
                            <p className="text-xs text-gray-600">Roll: {leave.student?.rollNumber || 'N/A'}</p>
                            <button
                              onClick={() => copyToClipboard(leave.student?.rollNumber || 'N/A')}
                              className="p-1 text-gray-500 hover:text-blue-600 transition-colors"
                              title="Copy roll number"
                            >
                              <ClipboardDocumentIcon className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                      
                      {/* Course Information */}
                      <div className="bg-white rounded p-1 mb-1">
                        <div className="flex items-center gap-1 text-xs">
                          <AcademicCapIcon className="w-3 h-3 text-gray-500" />
                          <span className="font-medium text-gray-700 break-words">
                            {leave.student?.course?.name || leave.student?.course} - {leave.student?.branch?.name || leave.student?.branch}
                          </span>
                        </div>
                      </div>

                      {/* Contact Information */}
                      <div className="flex items-center gap-1 text-xs text-gray-600">
                        <PhoneIcon className="w-3 h-3" />
                        <span className="truncate">{leave.parentPhone || 'N/A'}</span>
                      </div>
                    </div>

                    {/* Time Information */}
                    <div className="bg-gray-50 rounded p-2 mb-2">
                      <div className="flex items-center gap-1 text-xs text-gray-700 mb-1">
                        <CalendarIcon className="w-3 h-3 text-gray-500" />
                        <span className="font-medium">
                          {leave.applicationType === 'Leave' ? (
                            `${new Date(leave.startDate).toLocaleDateString()} - ${new Date(leave.endDate).toLocaleDateString()}`
                          ) : (
                            new Date(leave.permissionDate).toLocaleDateString()
                          )}
                        </span>
                        {/* Show if this is yesterday's request */}
                        {!isToday(getRequestDate(leave)) && isTodayOrYesterday(getRequestDate(leave)) && (
                          <span className="px-1.5 py-0.5 bg-orange-100 text-orange-700 text-xs font-medium rounded">
                            Yesterday
                          </span>
                        )}
                      </div>
                      
                      {leave.applicationType === 'Permission' && (
                        <div className="flex items-center gap-1 text-xs text-gray-700 ml-4">
                          <ClockIcon className="w-3 h-3" />
                          <span>{leave.outTime} - {leave.inTime}</span>
                        </div>
                      )}
                    </div>

                    {/* Visit Count Information */}
                    <div className="bg-blue-50 rounded p-2 mb-2">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1">
                          <span className="font-medium text-gray-700">Outgoing:</span>
                          <span className="text-blue-600 font-bold">{leave.outgoingVisitCount || 0}/{leave.maxVisits || 2}</span>
                        </div>
                        {leave.incomingQrGenerated && (
                          <div className="flex items-center gap-1">
                            <span className="font-medium text-gray-700">Incoming:</span>
                            <span className="text-green-600 font-bold">{leave.incomingVisitCount || 0}/1</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="flex justify-center">
                      {leave.status === 'Warden Verified' ? (
                        <div className="flex items-center gap-1 text-orange-600 text-xs font-medium px-3 py-2 bg-orange-50 rounded w-full justify-center border border-orange-200">
                          <ExclamationCircleIcon className="w-3 h-3" />
                          <span>Waiting Principal Approval</span>
                        </div>
                      ) : leave.verificationStatus === 'Verified' && !leave.incomingQrGenerated ? (
                        <div className="flex items-center gap-1 text-green-600 text-xs font-medium px-3 py-2 bg-green-50 rounded w-full justify-center border border-green-200">
                          <CheckCircleIcon className="w-3 h-3" />
                          <span>Outgoing Verified</span>
                        </div>
                      ) : leave.verificationStatus === 'Verified' && leave.incomingQrGenerated ? (
                        <button
                          onClick={() => {
                            if (!isViewOnly) {
                              setSelectedLeave(leave);
                              setShowVerificationModal(true);
                            }
                          }}
                          disabled={isViewOnly}
                          className={`w-full px-3 py-2 rounded text-xs font-medium flex items-center justify-center gap-1 transition-colors ${
                            isViewOnly 
                              ? 'bg-gray-400 text-gray-200 cursor-not-allowed' 
                              : 'bg-green-600 text-white hover:bg-green-700'
                          }`}
                          title={isViewOnly ? 'View-only access - Cannot scan incoming QR' : 'Scan Incoming QR'}
                        >
                          <EyeIcon className="w-3 h-3" />
                          <span>{isViewOnly ? 'View Only' : 'Scan Incoming QR'}</span>
                        </button>
                      ) : leave.verificationStatus === 'Completed' ? (
                        <div className="flex items-center gap-1 text-purple-600 text-xs font-medium px-3 py-2 bg-purple-50 rounded w-full justify-center border border-purple-200">
                          <CheckCircleIcon className="w-3 h-3" />
                          <span>Completed</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            // View-only users CAN verify outgoing requests
                            setSelectedLeave(leave);
                            setShowVerificationModal(true);
                          }}
                          className="w-full px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-xs font-medium flex items-center justify-center gap-1"
                          title="Verify Request"
                        >
                          <EyeIcon className="w-3 h-3" />
                          <span>Verify Request</span>
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    )}
  </div>
);

const StudentDetailsCard = ({ student, onClose, securitySettings }) => {
  const [popupImage, setPopupImage] = useState(null);
  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="bg-white rounded-lg shadow-lg p-3 sm:p-4 lg:p-6 mb-4 sm:mb-6 border-l-4 border-blue-600"
      >
        <div className="flex justify-between items-start mb-3 sm:mb-4">
          <h2 className="text-base sm:text-lg lg:text-xl font-bold text-blue-900">Student Details</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full">
            <XCircleIcon className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>
        <div className="flex flex-col md:flex-row gap-4 sm:gap-6 items-center md:items-start">
          <div className="flex flex-col items-center w-full md:w-1/3">
            {/* Profile Picture */}
            {securitySettings.viewProfilePictures && student.studentPhoto ? (
              <img
                src={student.studentPhoto}
                alt={student.name}
                className="w-20 h-20 sm:w-24 sm:h-24 lg:w-32 lg:h-32 rounded-full object-cover border-4 border-gray-100 shadow-md cursor-pointer hover:scale-105 transition-transform"
                onClick={() => setPopupImage(student.studentPhoto)}
              />
            ) : securitySettings.viewProfilePictures ? (
              <img
                src={`https://ui-avatars.com/api/?name=${student.name}&background=0D8ABC&color=fff&size=128`}
                alt={student.name}
                className="w-20 h-20 sm:w-24 sm:h-24 lg:w-32 lg:h-32 rounded-full object-cover border-4 border-gray-100 shadow-md"
              />
            ) : (
              <div className="w-20 h-20 sm:w-24 sm:h-24 lg:w-32 lg:h-32 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-sm sm:text-lg font-semibold border-4 border-gray-100 shadow-md">
                Hidden by admin
              </div>
            )}
            <span className={`mt-2 sm:mt-3 px-2 sm:px-3 py-1 text-xs sm:text-sm font-semibold rounded-full ${
              student.hostelStatus === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {student.hostelStatus}
            </span>
            {/* Guardian Photos */}
            {securitySettings.viewGuardianImages && (student.guardianPhoto1 || student.guardianPhoto2) ? (
              <div className="mt-3 sm:mt-4 w-full flex flex-row justify-center items-center gap-2">
                {student.guardianPhoto1 && (
                  <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 rounded-lg overflow-hidden border border-gray-200 cursor-pointer hover:scale-105 transition-transform">
                    <img src={student.guardianPhoto1} alt="Guardian 1" className="w-full h-full object-cover" onClick={() => setPopupImage(student.guardianPhoto1)} />
                    <div className="text-xs text-center text-gray-500 mt-1">Guardian Photo 1</div>
                  </div>
                )}
                {student.guardianPhoto2 && (
                  <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 rounded-lg overflow-hidden border border-gray-200 cursor-pointer hover:scale-105 transition-transform">
                    <img src={student.guardianPhoto2} alt="Guardian 2" className="w-full h-full object-cover" onClick={() => setPopupImage(student.guardianPhoto2)} />
                    <div className="text-xs text-center text-gray-500 mt-1">Guardian Photo 2</div>
                  </div>
                )}
              </div>
            ) : !securitySettings.viewGuardianImages && (student.guardianPhoto1 || student.guardianPhoto2) ? (
              <div className="mt-3 sm:mt-4 w-full flex flex-row justify-center items-center gap-2">
                <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 rounded-lg bg-gray-200 flex items-center justify-center text-gray-500 text-xs font-semibold border border-gray-200">
                  Guardian images hidden
                </div>
              </div>
            ) : null}
          </div>
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm w-full">
            <InfoField icon={<UserIcon />} label="Name" value={student.name} />
            <InfoField icon={<AcademicCapIcon />} label="Roll Number" value={student.rollNumber} />
            <InfoField icon={<TagIcon />} label="Course" value={`${student.course?.name || student.course} - ${student.branch?.name || student.branch}`} />
            <InfoField icon={<CalendarIcon />} label="Year" value={student.year} />
            <InfoField icon={<PhoneIcon />} label="Student Phone" value={securitySettings.viewPhoneNumbers ? student.studentPhone : 'Hidden by admin'} />
            <InfoField icon={<PhoneIcon />} label="Parent Phone" value={securitySettings.viewPhoneNumbers ? student.parentPhone : 'Hidden by admin'} />
            <InfoField icon={<div className="font-bold">R</div>} label="Room" value={student.roomNumber} />
            <InfoField icon={<div className="font-bold">C</div>} label="Category" value={student.category} />
            <InfoField icon={<CalendarIcon />} label="Batch" value={student.batch} />
            <InfoField icon={<CalendarIcon />} label="Academic Year" value={student.academicYear} />
          </div>
        </div>
      </motion.div>
      {/* Image Popup Modal */}
      {popupImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 p-2 sm:p-4">
          <div className="relative bg-white rounded-lg shadow-lg p-2 max-w-full max-h-full flex flex-col items-center">
            <button
              onClick={() => setPopupImage(null)}
              className="absolute top-1 sm:top-2 right-1 sm:right-2 p-1 sm:p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full z-10"
            >
              <XCircleIcon className="w-5 h-5 sm:w-7 sm:h-7" />
            </button>
            <img
              src={popupImage}
              alt="Enlarged"
              className="max-w-[95vw] max-h-[85vh] rounded-lg object-contain"
            />
          </div>
        </div>
      )}
    </>
  );
}

const InfoField = ({ icon, label, value }) => (
  <div className="flex items-start gap-2 sm:gap-3">
    <div className="flex-shrink-0 w-4 h-4 sm:w-5 sm:h-5 text-gray-500 mt-0.5">{icon}</div>
    <div>
      <p className="font-semibold text-gray-800 text-xs sm:text-sm">{label}</p>
      <p className="text-gray-600 text-xs sm:text-sm">{value}</p>
    </div>
  </div>
);

export default SecurityDashboard;