import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import api from '../../utils/axios';
import toast from 'react-hot-toast';
import { FunnelIcon, XMarkIcon, ClockIcon, UserIcon, CheckCircleIcon, ExclamationCircleIcon, ChevronLeftIcon, ChevronRightIcon, MagnifyingGlassIcon, CogIcon } from '@heroicons/react/24/outline';
import LoadingSpinner from '../../components/LoadingSpinner';
import { useLocation } from 'react-router-dom';
import SEO from '../../components/SEO';
import AIConfigPanel from '../../components/AIConfigPanel';
import useDebounce from '../../hooks/useDebounce';
import { useAuth } from '../../context/AuthContext';

const STATUS_OPTIONS = ['All', 'Received', 'In Progress', 'Resolved', 'Closed'];

// Function to get valid next statuses based on current status
const getValidNextStatuses = (currentStatus, isReopened = false) => {
  switch (currentStatus) {
    case 'Received':
      return ['In Progress', 'Resolved'];
    case 'In Progress':
      return ['Resolved'];
    case 'Resolved':
      // If reopened, can go back to Received, otherwise can be Closed
      return isReopened ? ['Received'] : ['Closed'];
    case 'Closed':
      return []; // No further status changes allowed
    default:
      return ['In Progress', 'Resolved'];
  }
};

const STATUS_COLORS = {
  'Received': 'bg-blue-100 text-blue-800',
  'In Progress': 'bg-purple-100 text-purple-800',
  'Resolved': 'bg-green-100 text-green-800',
  'Closed': 'bg-gray-100 text-gray-800'
};

// Function to get column configuration based on filter
const getColumnConfig = (statusFilter) => ({
  'Received': {
    title: 'Received',
    color: 'blue',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    textColor: 'text-blue-700',
    iconColor: 'text-blue-600',
    statuses: ['Received']
  },
  'In Progress': {
    title: 'In Progress',
    color: 'yellow',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    textColor: 'text-yellow-700',
    iconColor: 'text-yellow-600',
    statuses: ['In Progress']
  },
  'Resolved': {
    title: statusFilter === 'Closed' ? 'Closed' : 'Resolved',
    color: 'green',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    textColor: 'text-green-700',
    iconColor: 'text-green-600',
    statuses: statusFilter === 'Closed' ? ['Closed'] : ['Resolved']
  }
});

const CATEGORY_OPTIONS = [
  'All',
  'Canteen',
  'Internet',
  'Maintenance',
  'Others'
];

const MAINTENANCE_SUBCATEGORIES = [
  'Housekeeping',
  'Plumbing',
  'Electricity'
];

// Course and branch mappings
const COURSES = {
  'B.Tech': 'BTECH',
  'Diploma': 'DIPLOMA',
  'Pharmacy': 'PHARMACY',
  'Degree': 'DEGREE'
};

const BRANCHES = {
  BTECH: ['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL'],
  DIPLOMA: ['DAIML', 'DCSE', 'DECE', 'DME', 'DAP', 'D Fisheries', 'D Animal Husbandry'],
  PHARMACY: ['B-Pharmacy', 'Pharm D', 'Pharm(PB) D', 'Pharmaceutical Analysis', 'Pharmaceutics', 'Pharma Quality Assurance'],
  DEGREE: ['Agriculture', 'Horticulture', 'Food Technology', 'Fisheries', 'Food Science & Nutrition']
};

// Room mappings based on gender and category
const ROOM_MAPPINGS = {
  Male: {
    'A+': ['302', '309', '310', '311', '312'],
    'A': ['303', '304', '305', '306', '308', '320', '324', '325'],
    'B+': ['321'],
    'B': ['314', '315', '316', '317', '322', '323']
  },
  Female: {
    'A+': ['209', '211', '212', '213', '214', '215'],
    'A': ['103', '115', '201', '202', '203', '204', '205', '206', '207', '208', '216', '217'],
    'B': ['101', '102', '104', '105', '106', '108', '109', '111', '112', '114'],
    'C': ['117']
  }
};

const CATEGORIES = ['A+', 'A', 'B+', 'B'];

const Complaints = () => {
  const location = useLocation();
  const { user } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(false);
  const [contentLoading, setContentLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [note, setNote] = useState('');
  const [updating, setUpdating] = useState(false);
  const [members, setMembers] = useState({});
  const [selectedMember, setSelectedMember] = useState('');
  
  // Mobile status tab
  const [mobileStatusTab, setMobileStatusTab] = useState('All');
  
  // Check if user is super_admin
  const isSuperAdmin = user?.role === 'super_admin';

  // Simplified filters
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterSubCategory, setFilterSubCategory] = useState('All');
  const [filterDateRange, setFilterDateRange] = useState({ from: '', to: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 500);

  // Track if component has mounted to avoid initial double fetch
  const isInitialMount = useRef(true);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const complaintsPerPage = 1000;

  // Add pagination state
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 10,
    pages: 0
  });

  // Complaint counts/stats state
  const [complaintCounts, setComplaintCounts] = useState({
    total: 0,
    active: 0,
    inProgress: 0,
    resolved: 0,
    closed: 0
  });

  // AI configuration state
  const [aiConfig, setAiConfig] = useState(null);
  const [aiStats, setAiStats] = useState({
    totalProcessed: 0,
    averageProcessingTime: 0,
    successRate: 0,
    totalComplaints: 0
  });
  const [showAIConfig, setShowAIConfig] = useState(false);

  // Mobile filters state
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Desktop filters state
  const [showDesktopFilters, setShowDesktopFilters] = useState(false);

  // Dynamic column config based on filter status (for Kanban board)
  const columnConfig = useMemo(() => getColumnConfig(filterStatus), [filterStatus]);

  useEffect(() => {
    // Apply filters from navigation state if available
    if (location.state?.filters) {
      const { status, category, subCategory, dateRange } = location.state.filters;
      if (status) setFilterStatus(status);
      if (category) setFilterCategory(category);
      if (subCategory) setFilterSubCategory(subCategory);
      if (dateRange) setFilterDateRange(dateRange);
    }

    fetchComplaints(true); // Initial load with full page loading
    fetchMembers();
    fetchAIConfig();
    fetchAIStats();

    // Mark as mounted after a short delay to allow initial fetch
    setTimeout(() => {
      isInitialMount.current = false;
    }, 100);
  }, [location.state]);

  const fetchComplaints = async (isInitialLoad = false) => {
    // Use full page loading only on initial load
    if (isInitialLoad) {
      setLoading(true);
    } else {
      setContentLoading(true);
    }
    setError(null);
    try {
      // Build query parameters
      const params = new URLSearchParams();
      if (filterStatus && filterStatus !== 'All') params.append('status', filterStatus);
      if (filterCategory && filterCategory !== 'All') params.append('category', filterCategory);
      if (filterSubCategory && filterSubCategory !== 'All' && filterCategory === 'Maintenance') params.append('subCategory', filterSubCategory);
      if (filterDateRange.from) params.append('fromDate', filterDateRange.from);
      if (filterDateRange.to) params.append('toDate', filterDateRange.to);
      if (debouncedSearchQuery && debouncedSearchQuery.trim()) params.append('search', debouncedSearchQuery.trim());
      params.append('page', currentPage);
      params.append('limit', complaintsPerPage);

      console.log('🔍 Fetching complaints with params:', params.toString());

      const res = await api.get(`/api/complaints/admin/all?${params.toString()}`);

      if (!res.data.success) {
        throw new Error(res.data.message || 'Failed to fetch complaints');
      }

      // Update complaints and pagination from the response
      setComplaints(res.data.data.complaints);
      setPagination(res.data.data.pagination);

      // Update counts if provided by backend (always update for accurate stats)
      if (res.data.data.counts) {
        setComplaintCounts(res.data.data.counts);
      }
    } catch (err) {
      console.error('Error fetching complaints:', err);
      setError(err.message || 'Failed to fetch complaints');
      toast.error(err.message || 'Failed to fetch complaints');
    } finally {
      setLoading(false);
      setContentLoading(false);
    }
  };

  const fetchMembers = async () => {
    try {
      const res = await api.get('/api/members');
      console.log('Members response:', res.data);

      if (!res.data.success) {
        throw new Error(res.data.message || 'Failed to load members data');
      }

      // Group members by category
      const groupedMembers = res.data.data.members.reduce((acc, member) => {
        if (!acc[member.category]) {
          acc[member.category] = [];
        }
        acc[member.category].push(member);
        return acc;
      }, {});
      setMembers(groupedMembers);
    } catch (err) {
      console.error('Error fetching members:', err);
      toast.error(err.message || 'Failed to fetch members');
      setMembers({});
    }
  };

  const fetchAIConfig = async () => {
    try {
      const response = await api.get('/api/complaints/admin/ai/config');
      if (response.data.success) {
        setAiConfig(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching AI config:', error);
    }
  };

  const fetchAIStats = async () => {
    try {
      const response = await api.get('/api/complaints/admin/ai/stats');
      if (response.data.success) {
        setAiStats(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching AI stats:', error);
    }
  };

  const quickAISetup = async () => {
    try {
      const response = await api.post('/api/complaints/admin/ai/quick-setup');
      if (response.data.success) {
        toast.success('AI enabled successfully!');
        await fetchAIConfig();
        await fetchAIStats();
      }
    } catch (error) {
      console.error('Error enabling AI:', error);
      toast.error('Failed to enable AI');
    }
  };

  const toggleAI = async (enabled) => {
    try {
      const response = await api.post('/api/complaints/admin/ai/toggle', { enabled });
      if (response.data.success) {
        toast.success(`AI ${enabled ? 'enabled' : 'disabled'} successfully!`);
        await fetchAIConfig();
        await fetchAIStats();
      }
    } catch (error) {
      console.error('Error toggling AI:', error);
      toast.error(`Failed to ${enabled ? 'enable' : 'disable'} AI`);
    }
  };



  const handleManualAIProcessing = async (complaintId) => {
    try {
      toast.loading('Processing with AI...');
      const res = await api.post(`/api/complaints/admin/${complaintId}/ai-process`);

      if (res.data.success) {
        toast.success('AI processing completed successfully!');
        // Refresh the complaints list
        await fetchComplaints();
        // Close the modal
        setSelected(null);
      } else {
        throw new Error(res.data.message || 'AI processing failed');
      }
    } catch (error) {
      console.error('Error in manual AI processing:', error);
      toast.error(error.response?.data?.message || 'AI processing failed');
    } finally {
      toast.dismiss();
    }
  };

  const handleDeleteComplaint = async (complaintId, complaintDescription) => {
    // Show confirmation dialog
    const confirmed = window.confirm(
      `Are you sure you want to delete this complaint?\n\nDescription: ${complaintDescription}\n\nThis action cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    try {
      toast.loading('Deleting complaint...');
      const res = await api.delete(`/api/complaints/admin/${complaintId}`);

      if (res.data.success) {
        toast.success('Complaint deleted successfully!');
        // Refresh the complaints list
        await fetchComplaints();
        // Close the modal if it's open for the deleted complaint
        if (selected && selected._id === complaintId) {
          setSelected(null);
        }
      } else {
        throw new Error(res.data.message || 'Failed to delete complaint');
      }
    } catch (error) {
      console.error('Error deleting complaint:', error);
      toast.error(error.response?.data?.message || 'Failed to delete complaint');
    } finally {
      toast.dismiss();
    }
  };

  const openDetails = async complaint => {
    if (!complaint || typeof complaint !== 'object') {
      console.error('Invalid complaint object:', complaint);
      toast.error('Invalid complaint data');
      return;
    }

    const complaintId = complaint._id || complaint.id;
    if (!complaintId) {
      console.error('Complaint missing ID:', complaint);
      toast.error('Invalid complaint data');
      return;
    }

    setSelected(complaint);
    setStatus('');
    setNote('');
    setSelectedMember(complaint.assignedTo?._id || '');
    setTimeline([]);
    setTimelineLoading(true);

    try {
      const res = await api.get(`/api/complaints/admin/${complaintId}/timeline`);
      console.log('Timeline response:', res.data);

      let timelineData;
      if (res.data?.success) {
        // Handle both possible response formats
        timelineData = Array.isArray(res.data.data) ? res.data.data : res.data.data?.timeline || [];
      } else {
        timelineData = [];
      }

      // Ensure we have at least one timeline entry
      if (!timelineData || timelineData.length === 0) {
        timelineData = [{
          status: complaint.currentStatus,
          timestamp: complaint.createdAt,
          note: 'Complaint created',
          assignedTo: complaint.assignedTo
        }];
      }

      // Sort timeline by date (oldest first)
      timelineData.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

      console.log('Admin timeline data received:', timelineData);
      console.log('Admin timeline entries with notes:', timelineData.filter(entry => entry.note));

      setTimeline(timelineData);
    } catch (err) {
      console.error('Error fetching timeline:', err);
      // Create initial timeline entry on error
      setTimeline([{
        status: complaint.currentStatus,
        timestamp: complaint.createdAt,
        note: 'Complaint created',
        assignedTo: complaint.assignedTo
      }]);

      if (err.response?.status !== 404) {
        toast.error('Failed to load complaint timeline. Showing initial status.');
      }
    } finally {
      setTimelineLoading(false);
    }
  };

  const handleStatusUpdate = async e => {
    e.preventDefault();
    if (!selected) {
      toast.error('No complaint selected');
      return;
    }

    const complaintId = selected._id || selected.id;
    if (!complaintId) {
      console.error('Invalid complaint ID for update:', selected);
      toast.error('Invalid complaint data for update');
      return;
    }

    // Validate member assignment for In Progress status
    if (status === 'In Progress' && !selectedMember) {
      toast.error('Please assign a member for In Progress status');
      return;
    }

    // Format the payload
    const payload = {
      status: status,
      note: note || '',
      memberId: status === 'In Progress' ? selectedMember : null
    };

    // Debug logs
    console.log('Complaint ID:', complaintId);
    console.log('Selected Member:', selectedMember);
    console.log('Payload:', payload);

    setUpdating(true);
    try {
      const statusRes = await api.put(`/api/complaints/admin/${complaintId}/status`, payload);

      if (statusRes.data.success) {
        toast.success('Status updated successfully');

        // Refresh the complaints list
        await fetchComplaints();

        // Refresh the timeline for the current complaint
        if (selected) {
          try {
            const timelineRes = await api.get(`/api/complaints/admin/${complaintId}/timeline`);
            if (timelineRes.data?.success) {
              const timelineData = Array.isArray(timelineRes.data.data) ? timelineRes.data.data : timelineRes.data.data?.timeline || [];
              timelineData.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
              setTimeline(timelineData);

              // Update the selected complaint with new status
              setSelected(prev => ({
                ...prev,
                currentStatus: status,
                assignedTo: status === 'In Progress'
                  ? Object.values(members).flat().find(m => m._id === selectedMember)
                  : null
              }));
            }
          } catch (timelineError) {
            console.error('Error refreshing timeline:', timelineError);
          }
        }

        // Keep modal open for 2 seconds to show updated timeline, then close
        setTimeout(() => {
          setSelected(null);
        }, 2000);
      } else {
        throw new Error(statusRes.data.message || 'Failed to update status');
      }
    } catch (err) {
      console.error('Error updating complaint:', err);
      console.error('Error response:', err.response?.data);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to update complaint status';
      toast.error(errorMessage);
    } finally {
      setUpdating(false);
    }
  };

  const clearFilters = () => {
    setFilterStatus('All');
    setFilterCategory('All');
    setFilterSubCategory('All');
    setFilterDateRange({ from: '', to: '' });
    setSearchQuery('');
    setCurrentPage(1);
    // Fetch will be triggered by useEffect when state changes
  };




  // Update useEffect to fetch complaints when filters or page changes
  useEffect(() => {
    // Skip on initial mount (handled by location.state effect)
    if (isInitialMount.current) {
      return;
    }
    fetchComplaints(false); // Content-only loading
  }, [currentPage, filterStatus, filterCategory, filterSubCategory, filterDateRange.from, filterDateRange.to, debouncedSearchQuery]);

  // Prevent body scroll when modal is open (mobile optimization)
  useEffect(() => {
    if (selected) {
      // Save current scroll position
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
      
      return () => {
        // Restore scroll position
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [selected]);

  // Helper function to get complaints by status for each column
  const getComplaintsByStatus = (statuses) => {
    return complaints.filter(complaint =>
      statuses.includes(complaint.currentStatus)
    );
  };

  // Get complaints count for each column
  const getColumnCount = (statuses) => {
    return getComplaintsByStatus(statuses).length;
  };

  // Update pagination handlers
  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Update the pagination section in the render
  const renderPagination = () => {
    if (pagination.pages <= 1) return null;

    return (
      <div className="mt-4 sm:mt-6 flex items-center justify-between border-t border-gray-200 pt-3 sm:pt-4">
        <div className="flex-1 flex justify-between sm:hidden">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className={`relative inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors
              ${currentPage === 1
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-blue-600 hover:bg-blue-50'
              }`}
          >
            Previous
          </button>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">
              {currentPage} of {pagination.pages}
            </span>
          </div>
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === pagination.pages}
            className={`relative inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors
              ${currentPage === pagination.pages
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-blue-600 hover:bg-blue-50'
              }`}
          >
            Next
          </button>
        </div>
        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
          <div>
            <p className="text-xs sm:text-sm text-gray-700">
              Showing <span className="font-medium">{((currentPage - 1) * pagination.limit) + 1}</span> to{' '}
              <span className="font-medium">{Math.min(currentPage * pagination.limit, pagination.total)}</span> of{' '}
              <span className="font-medium">{pagination.total}</span> complaints
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className={`relative inline-flex items-center px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-lg
                ${currentPage === 1
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-blue-600 hover:bg-blue-50'
                }`}
            >
              <ChevronLeftIcon className="h-4 w-4 sm:h-5 sm:w-5 mr-1" />
              Previous
            </button>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === pagination.pages}
              className={`relative inline-flex items-center px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-lg
                ${currentPage === pagination.pages
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-blue-600 hover:bg-blue-50'
                }`}
            >
              Next
              <ChevronRightIcon className="h-4 w-4 sm:h-5 sm:w-5 ml-1" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Update the complaints list section to use pagination
  const renderComplaintsList = () => (
    <div className="space-y-2.5 sm:space-y-3 md:space-y-4">
      {complaints.length === 0 ? (
        <div className="text-center py-10 sm:py-12 md:py-16">
          <div className="flex flex-col items-center gap-2.5 sm:gap-3 md:gap-4">
            <div className="text-gray-400">
              <svg className="w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-sm sm:text-base md:text-lg text-gray-600 font-semibold">No complaints found</p>
            <p className="text-xs sm:text-sm text-gray-400">Try adjusting your filters</p>
          </div>
        </div>
      ) : (
        complaints.map((c, index) => {
          const complaintKey = `${c._id || c.student?._id || 'unknown'}-${index}`;
          const isLocked = c.isLockedForUpdates === true;
          return (
            <div 
              key={complaintKey} 
              className={`flex flex-col p-3 sm:p-4 md:p-5 bg-white rounded-lg sm:rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all duration-200 gap-2.5 sm:gap-3 md:gap-4 active:scale-[0.98] touch-manipulation ${isLocked ? 'opacity-70' : ''}`}
              onClick={() => openDetails(c)}
            >
              <div className="flex items-start gap-2.5 sm:gap-3 md:gap-4">
                <div className="flex-shrink-0 h-10 w-10 sm:h-12 sm:w-12 md:h-14 md:w-14 bg-gradient-to-br from-blue-50 to-blue-100 rounded-full flex items-center justify-center border-2 border-blue-200">
                  <UserIcon className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0 overflow-hidden">
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-2">
                    <span className="text-sm sm:text-base md:text-lg font-semibold text-gray-900 truncate block">
                      {c.raisedBy === 'warden' ? 'Warden' : (c.student?.name || 'Unknown')}
                    </span>
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                      <span className="px-2 sm:px-2.5 py-0.5 sm:py-1 bg-blue-50 text-blue-700 rounded-full text-[10px] sm:text-xs font-semibold border border-blue-200 whitespace-nowrap">
                        {c.category || 'Uncategorized'}
                      </span>
                      {c.raisedBy === 'warden' && (
                        <span className="px-2 sm:px-2.5 py-0.5 sm:py-1 bg-purple-50 text-purple-700 rounded-full text-[10px] sm:text-xs font-semibold border border-purple-200 whitespace-nowrap">
                          Warden
                        </span>
                      )}
                      {c.raisedBy === 'student' && (
                        <span className="px-2 sm:px-2.5 py-0.5 sm:py-1 bg-green-50 text-green-700 rounded-full text-[10px] sm:text-xs font-semibold border border-green-200 whitespace-nowrap">
                          Student
                        </span>
                      )}
                      {isLocked && (
                        <span className="px-2 sm:px-2.5 py-0.5 sm:py-1 bg-gray-100 text-gray-600 rounded-full text-[10px] sm:text-xs font-semibold border border-gray-200 whitespace-nowrap">
                          Locked
                        </span>
                      )}
                    </div>
                  </div>
                  {c.raisedBy === 'student' ? (
                    <>
                      <div className="text-xs sm:text-sm text-gray-600 mb-1.5 sm:mb-2 font-medium">Roll No: <span className="font-semibold">{c.student?.rollNumber || 'N/A'}</span></div>
                      <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-2.5 sm:mb-3">
                        <span className="text-[10px] sm:text-xs md:text-sm text-gray-600 bg-gray-50 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md border border-gray-200 whitespace-nowrap">Room: {c.student?.roomNumber || 'N/A'}</span>
                        <span className="text-[10px] sm:text-xs md:text-sm text-gray-600 bg-gray-50 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md border border-gray-200 whitespace-nowrap">Category: {c.student?.category || 'N/A'}</span>
                      </div>
                    </>
                  ) : (
                    <div className="text-xs sm:text-sm text-purple-600 mb-2 sm:mb-3 font-medium">
                      Raised by: {c.raisedBy === 'warden' ? 'Warden' : 'Student'}
                    </div>
                  )}
                  {c.assignedTo && (
                    <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-blue-600 mb-2.5 sm:mb-3 bg-blue-50 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg border border-blue-200">
                      <UserIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                      <span className="truncate font-medium">Assigned to: {c.assignedTo.name} ({c.assignedTo.category})</span>
                    </div>
                  )}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-2.5 pt-2 border-t border-gray-100">
                    <span className={`inline-flex items-center px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-xs md:text-sm font-semibold w-fit ${STATUS_COLORS[c.currentStatus] || STATUS_COLORS['Received']}`}>
                      {c.currentStatus || 'Received'}
                    </span>
                    <div className="flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto">
                      {c.currentStatus === 'Received' && !isLocked && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteComplaint(c._id, c.description);
                          }}
                          className="p-1.5 sm:p-2 text-red-500 hover:text-red-700 hover:bg-red-50 active:bg-red-100 rounded-lg transition-all duration-200 touch-manipulation min-w-[36px] min-h-[36px] sm:min-w-[44px] sm:min-h-[44px] flex items-center justify-center flex-shrink-0"
                          title="Delete complaint"
                        >
                          <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                      <button
                        className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all duration-200 text-blue-600 hover:bg-blue-50 active:bg-blue-100 border border-blue-200 touch-manipulation min-h-[36px] sm:min-h-[44px] whitespace-nowrap flex-1 sm:flex-none"
                        onClick={(e) => {
                          e.stopPropagation();
                          openDetails(c);
                        }}
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })
      )}
      {renderPagination()}
    </div>
  );

  // Render mobile complaints list with tab filtering
  const renderMobileComplaintsList = () => {
    const filteredComplaints = mobileStatusTab === 'All' 
      ? complaints 
      : complaints.filter(c => c.currentStatus === mobileStatusTab);

    if (filteredComplaints.length === 0) {
      return (
        <div className="text-center py-10">
          <div className="flex flex-col items-center gap-2.5">
            <div className="text-gray-400">
              <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-sm text-gray-600 font-semibold">No {mobileStatusTab !== 'All' ? mobileStatusTab.toLowerCase() : ''} complaints found</p>
            <p className="text-xs text-gray-400">Try selecting a different status</p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-2.5">
        {filteredComplaints.map((c, index) => {
          const complaintKey = `mobile-${c._id || c.student?._id || 'unknown'}-${index}`;
          const isLocked = c.isLockedForUpdates === true;
          const canDelete = c.currentStatus === 'Received' && !isLocked;

          return (
            <div 
              key={complaintKey} 
              className={`bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all duration-200 overflow-hidden active:scale-[0.98] touch-manipulation ${isLocked ? 'opacity-70' : ''}`}
              onClick={() => openDetails(c)}
            >
              {/* Status Color Bar */}
              <div className={`h-1 ${
                c.currentStatus === 'Received' ? 'bg-blue-500' :
                c.currentStatus === 'In Progress' ? 'bg-yellow-500' :
                c.currentStatus === 'Resolved' ? 'bg-green-500' :
                'bg-gray-400'
              }`}></div>
              
              <div className="p-3">
                {/* Header Row */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-50 to-blue-100 rounded-full flex items-center justify-center border border-blue-200 flex-shrink-0">
                      <UserIcon className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {c.raisedBy === 'warden' ? 'Warden' : (c.student?.name || 'Unknown')}
                      </p>
                      <p className="text-[10px] text-gray-500">
                        {c.raisedBy === 'student' ? `Roll: ${c.student?.rollNumber || 'N/A'}` : 'Facility Issue'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {canDelete && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteComplaint(c._id, c.description);
                        }}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-all"
                        title="Delete"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>

                {/* Tags Row */}
                <div className="flex flex-wrap gap-1.5 mb-2">
                  <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-[10px] font-semibold border border-blue-200">
                    {c.category || 'Uncategorized'}
                  </span>
                  {c.subCategory && (
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-[10px] font-medium">
                      {c.subCategory}
                    </span>
                  )}
                  {c.raisedBy === 'warden' && (
                    <span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded-full text-[10px] font-semibold border border-purple-200">
                      Warden
                    </span>
                  )}
                  {isLocked && (
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-[10px] font-semibold flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      Locked
                    </span>
                  )}
                </div>

                {/* Description */}
                <p className="text-xs text-gray-600 line-clamp-2 mb-2 leading-relaxed">
                  {c.description}
                </p>

                {/* Assigned Member */}
                {c.assignedTo && (
                  <div className="flex items-center gap-1.5 text-[10px] text-blue-600 mb-2 bg-blue-50 px-2 py-1 rounded-lg">
                    <UserIcon className="w-3 h-3" />
                    <span className="truncate font-medium">{c.assignedTo.name}</span>
                  </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-[10px] font-semibold ${STATUS_COLORS[c.currentStatus] || STATUS_COLORS['Received']}`}>
                    {c.currentStatus || 'Received'}
                  </span>
                  <span className="text-[10px] text-gray-400">
                    {new Date(c.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
        {renderPagination()}
      </div>
    );
  };

  // Render individual complaint card for Kanban columns
  const renderComplaintCard = (complaint) => {
    const isLocked = complaint.isLockedForUpdates === true;
    const canDelete = complaint.currentStatus === 'Received' && !isLocked;

    return (
      <div
        key={complaint._id || complaint.id}
        className={`bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 mb-3 group cursor-pointer ${isLocked ? 'opacity-70' : ''}`}
        onClick={() => openDetails(complaint)}
      >
        <div className="p-3 sm:p-4">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              <div className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center group-hover:bg-blue-50 transition-colors duration-200 flex-shrink-0">
                <UserIcon className="w-4.5 h-4.5 text-gray-600 group-hover:text-blue-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-900 truncate group-hover:text-blue-700 transition-colors duration-200">
                  {complaint.raisedBy === 'warden' ? 'Warden' : (complaint.student?.name || 'Unknown')}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {complaint.raisedBy === 'student' ? `Room: ${complaint.student?.roomNumber || 'N/A'}` : 'Warden Raised'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[complaint.currentStatus] || STATUS_COLORS['Received']} shadow-sm`}>
                {complaint.currentStatus}
              </span>
              {canDelete && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteComplaint(complaint._id, complaint.description);
                  }}
                  className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 active:bg-red-100 rounded-lg transition-all duration-200 touch-manipulation"
                  title="Delete complaint"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Category and Type */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-md text-xs font-medium border border-gray-200">
              {complaint.category || 'Uncategorized'}
            </span>
            {complaint.subCategory && (
              <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-md text-xs font-medium border border-gray-200">
                {complaint.subCategory}
              </span>
            )}
            {complaint.raisedBy === 'warden' && (
              <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-md text-xs font-medium border border-purple-200">
                Warden
              </span>
            )}
          </div>

          {/* Description */}
          <div className="mb-3">
            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed line-clamp-2">
              {complaint.description}
            </p>
          </div>

          {/* Assigned Member */}
          {complaint.assignedTo && (
            <div className="flex items-center gap-2 text-xs text-blue-600 mb-3 p-2 bg-blue-50 rounded-lg border border-blue-100">
              <UserIcon className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate font-medium">{complaint.assignedTo.name} ({complaint.assignedTo.category})</span>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100">
            <span className="font-medium">{new Date(complaint.createdAt).toLocaleDateString()}</span>
            {isLocked && (
              <span className="text-red-500 font-medium flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Locked
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Render Kanban column
  const renderKanbanColumn = (columnKey, config) => {
    const columnComplaints = getComplaintsByStatus(config.statuses);
    const count = columnComplaints.length;

    return (
      <div key={columnKey} className={`${config.bgColor} ${config.borderColor} border-2 rounded-lg p-4 min-h-[500px] shadow-sm hover:shadow-md transition-all duration-200`}>
        {/* Column Header */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${config.color === 'blue' ? 'bg-blue-500' : config.color === 'yellow' ? 'bg-yellow-500' : config.color === 'purple' ? 'bg-purple-500' : 'bg-green-500'}`}></div>
            <h3 className={`text-base font-semibold ${config.textColor}`}>{config.title}</h3>
          </div>
          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${config.bgColor} ${config.textColor} border ${config.borderColor} shadow-sm`}>
            {count}
          </span>
        </div>

        {/* Complaints List */}
        <div className="space-y-2">
          {count === 0 ? (
            <div className="text-center py-8">
              <div className={`w-12 h-12 mx-auto mb-3 rounded-full ${config.bgColor} flex items-center justify-center`}>
                <svg className={`w-6 h-6 ${config.iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className={`text-sm ${config.textColor} font-medium`}>No complaints</p>
            </div>
          ) : (
            columnComplaints.map(complaint => renderComplaintCard(complaint))
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <>
      <SEO
        title="Complaint Management"
        description="View and manage all hostel complaints. Track complaint status, assign staff, and ensure timely resolution of student grievances."
        keywords="Complaint Management, Hostel Complaints, Grievance Tracking, Complaint Resolution, Staff Assignment, Hostel Services"
      />
      <div className="min-h-screen bg-gray-50 pt-6 sm:pt-0">
        {/* Top Navigation Bar */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-[1400px] mx-auto px-2 sm:px-4 lg:px-8">
            <div className="flex items-center justify-between h-14 sm:h-16">
              <div className="flex items-center">
                <h1 className="text-lg sm:text-xl font-bold text-blue-900">Complaint Management</h1>
              </div>
              <div className="flex items-center gap-2 sm:gap-4">
                <div className="hidden sm:flex items-center gap-3">
                  <div className="bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100">
                    <span className="text-xs text-gray-600">Total: </span>
                    <span className="font-semibold text-blue-700 text-sm">{complaintCounts.total}</span>
                  </div>

                  <div className="bg-green-50 px-3 py-1.5 rounded-lg border border-green-100">
                    <span className="text-xs text-gray-600">Resolved: </span>
                    <span className="font-semibold text-green-700 text-sm">
                      {complaintCounts.resolved}
                    </span>
                  </div>

                  <div className="bg-orange-50 px-3 py-1.5 rounded-lg border border-orange-100">
                    <span className="text-xs text-gray-600">Active: </span>
                    <span className="font-semibold text-orange-700 text-sm">
                      {complaintCounts.active}
                    </span>
                  </div>

                  <div className="bg-purple-50 px-3 py-1.5 rounded-lg border border-purple-100">
                    <span className="text-xs text-gray-600">In Progress: </span>
                    <span className="font-semibold text-purple-700 text-sm">
                      {complaintCounts.inProgress}
                    </span>
                  </div>

                  <div className="bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                    <span className="text-xs text-gray-600">Closed: </span>
                    <span className="font-semibold text-gray-700 text-sm">
                      {complaintCounts.closed}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* AI Status Display */}
                    <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border">
                      <div className={`w-2 h-2 rounded-full ${aiConfig?.isEnabled ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                      <span className="text-sm font-medium text-gray-700">
                        AI: {aiConfig?.isEnabled ? 'ON' : 'OFF'}
                      </span>
                    </div>

                    {/* AI Toggle Switch */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">AI Routing</span>
                      <button
                        onClick={() => toggleAI(!aiConfig?.isEnabled)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${aiConfig?.isEnabled ? 'bg-blue-600' : 'bg-gray-300'
                          }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${aiConfig?.isEnabled ? 'translate-x-6' : 'translate-x-1'
                            }`}
                        />
                      </button>
                    </div>

                    {/* AI Config Button */}
                    {aiConfig?.isEnabled && (
                      <button
                        onClick={() => setShowAIConfig(true)}
                        className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-3 py-1.5 rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 flex items-center gap-2"
                      >
                        <CogIcon className="w-4 h-4" />
                        <span className="text-sm font-medium">Configure</span>
                      </button>
                    )}


                  </div>
                </div>

                {/* Show Filters Button */}
                <button
                  onClick={() => setShowDesktopFilters(prev => !prev)}
                  className="hidden lg:flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-blue-600 rounded-lg hover:bg-gray-50 transition-all duration-200 border border-gray-200"
                >
                  <FunnelIcon className="w-4 h-4" />
                  <span>{showDesktopFilters ? 'Hide' : 'Show'} Filters</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Stats Bar */}
        <div className="sm:hidden bg-white border-b border-gray-200">
          <div className="px-3 py-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-blue-50 px-3 py-2 rounded-lg border border-blue-100">
                <div className="text-xs text-gray-600 mb-1">Total</div>
                <div className="font-semibold text-blue-700 text-lg">{complaintCounts.total}</div>
              </div>
              <div className="bg-orange-50 px-3 py-2 rounded-lg border border-orange-100">
                <div className="text-xs text-gray-600 mb-1">Active</div>
                <div className="font-semibold text-orange-700 text-lg">
                  {complaintCounts.active}
                </div>
              </div>
              <div className="bg-purple-50 px-3 py-2 rounded-lg border border-purple-100">
                <div className="text-xs text-gray-600 mb-1">In Progress</div>
                <div className="font-semibold text-purple-700 text-lg">
                  {complaintCounts.inProgress}
                </div>
              </div>
              <div className="bg-green-50 px-3 py-2 rounded-lg border border-green-100">
                <div className="text-xs text-gray-600 mb-1">Resolved</div>
                <div className="font-semibold text-green-700 text-lg">
                  {complaintCounts.resolved}
                </div>
              </div>
              <div className="bg-gray-50 px-3 py-2 rounded-lg border border-gray-100">
                <div className="text-xs text-gray-600 mb-1">Closed</div>
                <div className="font-semibold text-gray-700 text-lg">
                  {complaintCounts.closed}
                </div>
              </div>
            </div>

            {/* Mobile AI Status */}
            <div className="mt-3 flex items-center justify-between bg-gray-50 px-3 py-2 rounded-lg">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${aiConfig?.isEnabled ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                <span className="text-xs font-medium text-gray-700">
                  AI: {aiConfig?.isEnabled ? 'ON' : 'OFF'}
                </span>
              </div>
              <button
                onClick={() => toggleAI(!aiConfig?.isEnabled)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${aiConfig?.isEnabled ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
              >
                <span
                  className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${aiConfig?.isEnabled ? 'translate-x-5' : 'translate-x-1'
                    }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-[1400px] mx-auto px-2.5 sm:px-4 lg:px-8 py-2 sm:py-4">

          {/* Mobile Filter Toggle */}
          <div className="lg:hidden mb-3">
            <button
              onClick={() => setShowMobileFilters(prev => !prev)}
              className="w-full bg-white rounded-lg shadow-sm border border-gray-100 p-3 flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <FunnelIcon className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-gray-900">Filters</span>
              </div>
              <svg
                className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${showMobileFilters ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Mobile Filters Panel */}
            {showMobileFilters && (
              <div className="mt-2 bg-white rounded-lg shadow-sm border border-gray-100 p-3">
                <div className="grid grid-cols-1 gap-2">
                  {/* Status Filter */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                    <select
                      value={filterStatus}
                      onChange={(e) => {
                        setFilterStatus(e.target.value);
                        setCurrentPage(1); // Reset to first page when filter changes
                      }}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 text-xs"
                    >
                      {STATUS_OPTIONS.map(status => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </div>

                  {/* Category Filter */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
                    <select
                      value={filterCategory}
                      onChange={(e) => {
                        setFilterCategory(e.target.value);
                        setFilterSubCategory('All');
                        setCurrentPage(1); // Reset to first page when filter changes
                      }}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 text-xs"
                    >
                      {CATEGORY_OPTIONS.map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </div>

                  {/* Subcategory Filter (only for Maintenance) */}
                  {filterCategory === 'Maintenance' && (
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Subcategory</label>
                      <select
                        value={filterSubCategory}
                        onChange={(e) => {
                          setFilterSubCategory(e.target.value);
                          setCurrentPage(1); // Reset to first page when filter changes
                        }}
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 text-xs"
                      >
                        <option value="All">All</option>
                        {MAINTENANCE_SUBCATEGORIES.map(subCategory => (
                          <option key={subCategory} value={subCategory}>{subCategory}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Date Range Filter */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">From Date</label>
                      <input
                        type="date"
                        value={filterDateRange.from}
                        onChange={(e) => {
                          setFilterDateRange(prev => ({ ...prev, from: e.target.value }));
                          setCurrentPage(1); // Reset to first page when filter changes
                        }}
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">To Date</label>
                      <input
                        type="date"
                        value={filterDateRange.to}
                        onChange={(e) => {
                          setFilterDateRange(prev => ({ ...prev, to: e.target.value }));
                          setCurrentPage(1); // Reset to first page when filter changes
                        }}
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 text-xs"
                      />
                    </div>
                  </div>

                  {/* Search */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Search</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          // Don't call handleFilterChange here - debounced search will trigger useEffect
                        }}
                        placeholder="Search by description or student..."
                        className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 text-xs"
                      />
                      <MagnifyingGlassIcon className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                    </div>
                  </div>

                  {/* Clear Filters Button */}
                  <button
                    onClick={clearFilters}
                    className="w-full px-4 py-2 text-xs text-gray-600 hover:text-red-600 flex items-center justify-center gap-2 rounded-lg hover:bg-gray-50 transition-all duration-200 border border-gray-200"
                  >
                    <XMarkIcon className="w-3.5 h-3.5" />
                    Clear Filters
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Desktop Filters - Horizontal Row */}
          {showDesktopFilters && (
            <div className="hidden lg:block mb-4">
              <div className="bg-white rounded-lg shadow-sm border border-gray-100">
                {/* Filter Header with Toggle */}
                <div className="p-4 pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-blue-50">
                        <FunnelIcon className="w-5 h-5 text-blue-600" />
                      </div>
                      <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
                    </div>
                    <button
                      onClick={() => setShowDesktopFilters(prev => !prev)}
                      className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-gray-600 hover:text-blue-600 rounded-lg hover:bg-gray-50 transition-all duration-200"
                    >
                      <span>{showDesktopFilters ? 'Hide' : 'Show'} Filters</span>
                      <svg
                        className={`w-3.5 h-3.5 transition-transform duration-200 ${showDesktopFilters ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Filter Content */}
                <div className="px-4 pb-4">
                  <div className="grid grid-cols-2 xl:grid-cols-5 gap-4">
                    {/* Status Filter */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1.5">Status</label>
                      <select
                        value={filterStatus}
                        onChange={(e) => {
                          setFilterStatus(e.target.value);
                          setCurrentPage(1); // Reset to first page when filter changes
                        }}
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 text-xs"
                      >
                        {STATUS_OPTIONS.map(status => (
                          <option key={status} value={status}>{status}</option>
                        ))}
                      </select>
                    </div>

                    {/* Category Filter */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1.5">Category</label>
                      <select
                        value={filterCategory}
                        onChange={(e) => {
                          setFilterCategory(e.target.value);
                          setFilterSubCategory('All');
                          setCurrentPage(1); // Reset to first page when filter changes
                        }}
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 text-xs"
                      >
                        {CATEGORY_OPTIONS.map(category => (
                          <option key={category} value={category}>{category}</option>
                        ))}
                      </select>
                    </div>

                    {/* Subcategory Filter (only for Maintenance) */}
                    {filterCategory === 'Maintenance' ? (
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">Subcategory</label>
                        <select
                          value={filterSubCategory}
                          onChange={(e) => {
                            setFilterSubCategory(e.target.value);
                            setCurrentPage(1); // Reset to first page when filter changes
                          }}
                          className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 text-xs"
                        >
                          <option value="All">All</option>
                          {MAINTENANCE_SUBCATEGORIES.map(subCategory => (
                            <option key={subCategory} value={subCategory}>{subCategory}</option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div></div>
                    )}

                    {/* Date Range Filter */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1.5">From Date</label>
                      <input
                        type="date"
                        value={filterDateRange.from}
                        onChange={(e) => {
                          setFilterDateRange(prev => ({ ...prev, from: e.target.value }));
                          setCurrentPage(1); // Reset to first page when filter changes
                        }}
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1.5">To Date</label>
                      <input
                        type="date"
                        value={filterDateRange.to}
                        onChange={(e) => {
                          setFilterDateRange(prev => ({ ...prev, to: e.target.value }));
                          setCurrentPage(1); // Reset to first page when filter changes
                        }}
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 text-xs"
                      />
                    </div>
                  </div>

                  {/* Search and Clear Filters Row */}
                  <div className="flex items-end gap-4 mt-4 pt-4 border-t border-gray-200">
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-gray-700 mb-1.5">Search</label>
                      <div className="relative">
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => {
                            setSearchQuery(e.target.value);
                            // Don't call handleFilterChange here - debounced search will trigger useEffect
                          }}
                          placeholder="Search by description or student..."
                          className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 text-xs"
                        />
                        <MagnifyingGlassIcon className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                      </div>
                    </div>

                    <button
                      onClick={clearFilters}
                      className="px-4 py-2 text-xs text-gray-600 hover:text-red-600 flex items-center gap-2 rounded-lg hover:bg-gray-50 transition-all duration-200 border border-gray-200 font-medium"
                    >
                      <XMarkIcon className="w-3.5 h-3.5" />
                      Clear Filters
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Main Content - Full Width Kanban Board */}
          <div className="w-full">
            {/* Right Content - 4-Column Kanban Board */}
            <div className="w-full relative">
              {/* Content Loading Overlay */}
              {contentLoading && (
                <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-20 rounded-lg">
                  <LoadingSpinner size="md" />
                </div>
              )}

              {/* Kanban Board - Desktop Only */}
              <div className={`hidden xl:grid grid-cols-3 gap-3 ${contentLoading ? 'opacity-50' : ''}`}>
                {Object.entries(columnConfig).map(([key, config]) =>
                  renderKanbanColumn(key, config)
                )}
              </div>

              {/* Mobile View - With Status Tabs */}
              <div className={`xl:hidden ${contentLoading ? 'opacity-50' : ''}`}>
                {/* Mobile Status Tabs */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-100 mb-3 overflow-hidden">
                  <div className="flex overflow-x-auto scrollbar-hide">
                    {['All', 'Received', 'In Progress', 'Resolved', 'Closed'].map((tab) => {
                      const tabCount = tab === 'All' 
                        ? complaints.length 
                        : complaints.filter(c => c.currentStatus === tab).length;
                      
                      const isActive = mobileStatusTab === tab;
                      const tabColors = {
                        'All': 'border-blue-500 text-blue-600 bg-blue-50',
                        'Received': 'border-blue-500 text-blue-600 bg-blue-50',
                        'In Progress': 'border-yellow-500 text-yellow-600 bg-yellow-50',
                        'Resolved': 'border-green-500 text-green-600 bg-green-50',
                        'Closed': 'border-gray-500 text-gray-600 bg-gray-50'
                      };
                      
                      return (
                        <button
                          key={tab}
                          onClick={() => setMobileStatusTab(tab)}
                          className={`flex-shrink-0 px-4 py-3 text-xs font-semibold border-b-2 transition-all duration-200 flex items-center gap-2 ${
                            isActive 
                              ? tabColors[tab] 
                              : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          <span>{tab}</span>
                          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                            isActive 
                              ? 'bg-white shadow-sm' 
                              : 'bg-gray-100'
                          }`}>
                            {tabCount}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-100 p-2.5 sm:p-3 md:p-4">
                  <h3 className="text-sm sm:text-base md:text-lg font-semibold text-gray-900 mb-2.5 sm:mb-3 md:mb-4 px-1 flex items-center justify-between">
                    <span>{mobileStatusTab === 'All' ? 'All Complaints' : `${mobileStatusTab} Complaints`}</span>
                    <span className="text-xs font-normal text-gray-500">
                      {mobileStatusTab === 'All' 
                        ? complaints.length 
                        : complaints.filter(c => c.currentStatus === mobileStatusTab).length} items
                    </span>
                  </h3>
                  {renderMobileComplaintsList()}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Details Modal */}
        {selected && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setSelected(null);
              }
            }}
            style={{ 
              overscrollBehavior: 'contain',
              WebkitOverflowScrolling: 'touch'
            }}
          >
            <div 
              className="bg-white rounded-t-3xl sm:rounded-xl shadow-2xl w-full h-[95vh] sm:h-auto sm:max-h-[90vh] sm:max-w-2xl relative flex flex-col animate-fade-in-up overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Sticky Header with Close Button */}
              <div className="flex-shrink-0 flex items-center justify-between px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 border-b border-gray-200 bg-white">
                <h2 className="text-base sm:text-xl lg:text-2xl font-bold text-gray-900 pr-10 sm:pr-8">Complaint Details</h2>
                <button
                  className="absolute top-3 sm:top-4 right-3 sm:right-4 p-2.5 sm:p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 active:bg-gray-200 rounded-full transition-colors duration-200 touch-manipulation z-10 min-w-[44px] min-h-[44px] flex items-center justify-center"
                  onClick={() => setSelected(null)}
                  disabled={updating}
                  aria-label="Close modal"
                >
                  <XMarkIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto overscroll-contain px-4 sm:px-6 py-4 sm:py-6" style={{ WebkitOverflowScrolling: 'touch' }}>

                {/* AI Process Button */}
                {selected.currentStatus === 'Received' && !selected.aiProcessed && (
                  <div className="mb-4 sm:mb-5">
                    <button
                      onClick={() => handleManualAIProcessing(selected._id)}
                      className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 active:bg-purple-800 transition-colors duration-200 flex items-center justify-center gap-2 text-sm font-medium touch-manipulation min-h-[44px] shadow-md"
                    >
                      <CogIcon className="w-5 h-5" />
                      <span>Process with AI</span>
                    </button>
                  </div>
                )}

                {/* Description */}
                <div className="mb-4 sm:mb-6">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Description</h3>
                  <p className="text-sm sm:text-base text-gray-700 leading-relaxed break-words">{selected.description}</p>
                </div>

                {selected.imageUrl && (
                  <div className="mb-4 sm:mb-6">
                    <div className="relative w-full pt-[56.25%] overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
                      <img
                        src={selected.imageUrl}
                        alt="Complaint"
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    </div>
                    <p className="mt-2 text-xs text-gray-500 text-center">Complaint Image</p>
                  </div>
                )}

                {/* Details Grid - Two Column Layout on Large Screens */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
                  {/* Left Column - Student Details */}
                  <div className="bg-gray-50 p-3 sm:p-4 rounded-lg border border-gray-100">
                    <div className="flex items-center gap-2 mb-3">
                      <UserIcon className="w-5 h-5 sm:w-5 sm:h-5 text-gray-500 flex-shrink-0" />
                      <span className="text-sm sm:text-base font-semibold text-gray-700">
                        {selected.raisedBy === 'warden' ? 'Complaint Details' : 'Student Details'}
                      </span>
                    </div>
                    {selected.raisedBy === 'warden' ? (
                      <div className="space-y-2">
                        <p className="text-sm text-gray-700 font-medium">Warden Raised</p>
                        <div className="flex flex-wrap gap-2">
                          <span className="text-xs sm:text-sm text-gray-600 bg-white px-2 py-1 rounded">Category: {selected.category}</span>
                          {selected.subCategory && (
                            <span className="text-xs sm:text-sm text-gray-600 bg-white px-2 py-1 rounded">Type: {selected.subCategory}</span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-sm sm:text-base text-gray-700 font-medium">{selected.student?.name}</p>
                        <div className="space-y-1.5">
                          <p className="text-xs sm:text-sm text-gray-600">Roll No: <span className="font-medium">{selected.student?.rollNumber}</span></p>
                          <div className="flex flex-wrap gap-2">
                            <span className="text-xs sm:text-sm text-gray-600 bg-white px-2 py-1 rounded">Room: {selected.student?.roomNumber || 'N/A'}</span>
                            <span className="text-xs sm:text-sm text-gray-600 bg-white px-2 py-1 rounded">Category: {selected.student?.category || 'N/A'}</span>
                          </div>
                          {selected.student?.studentPhone && (
                            <p className="text-xs sm:text-sm text-gray-600">Phone: <span className="font-medium">{selected.student.studentPhone}</span></p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Column - Current Status & Update Form (Large Screens Only) */}
                  <div className="hidden lg:block">
                    {selected.currentStatus === 'Closed' && (
                      <div className="mb-4 bg-gray-50 p-3 sm:p-4 rounded-lg border border-gray-100">
                        <div className="flex items-center gap-2 sm:gap-2.5 mb-1.5 sm:mb-2">
                          <CheckCircleIcon className="w-5 h-5 sm:w-6 sm:h-6 text-green-600 flex-shrink-0" />
                          <span className="text-xs sm:text-sm font-semibold text-gray-700">Complaint Closed</span>
                        </div>
                        <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                          This complaint has been closed and no further status updates are allowed.
                        </p>
                      </div>
                    )}

                    {!selected.isLockedForUpdates && selected.currentStatus !== 'Closed' && (
                      <form className="space-y-3 sm:space-y-4" onSubmit={handleStatusUpdate}>
                        <div className="p-3 sm:p-4 bg-gray-50 rounded-lg border border-gray-100">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs sm:text-sm font-medium text-gray-700">Current Status:</span>
                            <span className={`inline-flex items-center px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-medium ${STATUS_COLORS[selected.currentStatus]}`}>
                              {selected.currentStatus}
                            </span>
                            {selected.isReopened && (
                              <span className="inline-flex items-center px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-medium bg-orange-100 text-orange-800">
                                🔄 Reopened
                              </span>
                            )}
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">Update Status</label>
                          <select
                            className="w-full px-3 sm:px-4 py-2 sm:py-2.5 md:py-3 rounded-lg border border-gray-300 sm:border-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-sm sm:text-base bg-white touch-manipulation min-h-[40px] sm:min-h-[44px] md:min-h-[48px]"
                            value={status}
                            onChange={e => setStatus(e.target.value)}
                            required
                          >
                            <option value="">Select status</option>
                            {STATUS_OPTIONS
                              .filter(opt => opt !== 'All')
                              .filter(opt => opt !== 'Closed' || isSuperAdmin) // Only super_admin can set Closed
                              .map(opt => (
                                <option key={`status-${opt}`} value={opt}>{opt}</option>
                              ))}
                          </select>
                          {!isSuperAdmin && (
                            <p className="mt-1.5 text-xs text-gray-500">
                              Note: Only Super Admin can directly close complaints
                            </p>
                          )}
                        </div>

                        {status === 'In Progress' && (
                          (() => {
                            // Get all members from all categories
                            const allMembers = Object.values(members).flat();
                            console.log('All available members:', allMembers);

                            return (
                              <div>
                                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">Assign Member</label>
                                <select
                                  className="w-full px-3 sm:px-4 py-2 sm:py-2.5 md:py-3 rounded-lg border border-gray-300 sm:border-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-sm sm:text-base bg-white touch-manipulation min-h-[40px] sm:min-h-[44px] md:min-h-[48px]"
                                  value={selectedMember}
                                  onChange={e => {
                                    console.log('Selected member value:', e.target.value);
                                    setSelectedMember(e.target.value);
                                  }}
                                  required={status === 'In Progress'}
                                >
                                  <option key="default" value="">Select a member</option>
                                  {allMembers?.map(member => {
                                    const memberId = member._id || member.id;
                                    return (
                                      <option key={memberId} value={memberId}>
                                        {member.name} ({member.category})
                                      </option>
                                    );
                                  })}
                                </select>
                                {(!allMembers || allMembers.length === 0) && (
                                  <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm text-gray-500">
                                    No members available
                                  </p>
                                )}
                              </div>
                            );
                          })()
                        )}

                        <div>
                          <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">Add Note (Optional)</label>
                          <input
                            className="w-full px-3 sm:px-4 py-2 sm:py-2.5 md:py-3 rounded-lg border border-gray-300 sm:border-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-sm sm:text-base touch-manipulation min-h-[40px] sm:min-h-[44px] md:min-h-[48px]"
                            placeholder="Enter a note about this status update"
                            value={note}
                            onChange={e => setNote(e.target.value)}
                          />
                        </div>

                        <button
                          className={`w-full py-2.5 sm:py-3 md:py-3.5 px-3 sm:px-4 rounded-lg text-white font-semibold transition-all duration-200 text-sm sm:text-base touch-manipulation min-h-[40px] sm:min-h-[44px] md:min-h-[48px] shadow-md sm:shadow-lg ${updating
                            ? 'bg-gray-400 cursor-not-allowed'
                            : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
                            }`}
                          type="submit"
                          disabled={updating || (status === 'In Progress' && !selectedMember)}
                        >
                          {updating ? (
                            <div className="flex items-center justify-center gap-2">
                              <LoadingSpinner size="sm" className="border-white" />
                              <span className="text-sm sm:text-base">Updating...</span>
                            </div>
                          ) : (
                            'Update Status'
                          )}
                        </button>
                      </form>
                    )}
                  </div>
                </div>

                {/* Status Information - Separate Section (shown below the grid) */}
                <div className="bg-gray-50 p-3 sm:p-4 rounded-lg border border-gray-100 mb-4 sm:mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <ClockIcon className="w-5 h-5 sm:w-5 sm:h-5 text-gray-500 flex-shrink-0" />
                    <span className="text-sm sm:text-base font-semibold text-gray-700">Status Information</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium ${STATUS_COLORS[selected.currentStatus]}`}>
                      {selected.currentStatus}
                    </span>
                    {selected.isReopened && (
                      <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium bg-red-100 text-red-800">
                        Reopened
                      </span>
                    )}
                  </div>
                </div>

                {/* Assigned Member Information */}
                {selected.assignedTo && (
                  <div className="mb-4 sm:mb-6">
                    <div className="bg-blue-50 p-3 sm:p-4 rounded-lg border border-blue-100">
                      <div className="flex items-center gap-2 mb-3">
                        <UserIcon className="w-5 h-5 sm:w-5 sm:h-5 text-blue-500 flex-shrink-0" />
                        <span className="text-sm sm:text-base font-semibold text-blue-700">Assigned Member</span>
                      </div>
                      <div className="space-y-2.5">
                        <p className="text-sm sm:text-base text-blue-700 font-semibold">{selected.assignedTo.name}</p>
                        <div className="flex flex-col gap-2 text-xs sm:text-sm text-blue-600">
                          <span className="px-3 py-1.5 bg-blue-100 rounded-full text-xs font-medium w-fit">
                            {selected.assignedTo.category}
                          </span>
                          {selected.assignedTo.phone && (
                            <div className="flex items-center gap-2">
                              <svg className="w-4 h-4 sm:w-4 sm:h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                              </svg>
                              <a href={`tel:${selected.assignedTo.phone}`} className="text-blue-600 hover:text-blue-700 break-all">{selected.assignedTo.phone}</a>
                            </div>
                          )}
                          {selected.assignedTo.email && (
                            <div className="flex items-center gap-2">
                              <svg className="w-4 h-4 sm:w-4 sm:h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                              <a href={`mailto:${selected.assignedTo.email}`} className="text-blue-600 hover:text-blue-700 break-all text-xs sm:text-sm">{selected.assignedTo.email}</a>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Feedback */}
                <div className="mb-4 sm:mb-6">
                  <div className="flex items-center gap-2 mb-2.5">
                    <CheckCircleIcon className="w-5 h-5 sm:w-5 sm:h-5 text-gray-500 flex-shrink-0" />
                    <span className="text-sm sm:text-base font-semibold text-gray-700">Feedback</span>
                  </div>
                  {selected.feedback ? (
                    <div className={`flex items-center gap-2.5 ${selected.feedback.isSatisfied ? 'text-green-600' : 'text-red-600'}`}>
                      {selected.feedback.isSatisfied ? (
                        <CheckCircleIcon className="w-6 h-6 flex-shrink-0" />
                      ) : (
                        <ExclamationCircleIcon className="w-6 h-6 flex-shrink-0" />
                      )}
                      <span className="text-sm sm:text-base font-semibold">{selected.feedback.isSatisfied ? 'Satisfied' : 'Not Satisfied'}</span>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No feedback provided yet</p>
                  )}
                </div>

                {/* Timeline */}
                <div className="mb-4 sm:mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <ClockIcon className="w-5 h-5 sm:w-5 sm:h-5 text-gray-500 flex-shrink-0" />
                    <span className="text-sm sm:text-base font-semibold text-gray-700">Timeline</span>
                  </div>
                  {timelineLoading ? (
                    <div className="flex justify-center py-8">
                      <LoadingSpinner size="sm" />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {timeline.map((t, i) => (
                        <div key={i} className="relative">
                          {/* Mobile Timeline */}
                          <div className="sm:hidden">
                            <div className="flex items-start gap-3">
                              <div className="flex-shrink-0 w-5 h-5 bg-indigo-600 rounded-full mt-0.5 border-2 border-white shadow-sm"></div>
                              <div className="flex-1 min-w-0 pb-3 border-b border-gray-100 last:border-0">
                                <div className="mb-2">
                                  <time className="inline-flex items-center px-2.5 py-1 rounded-full bg-emerald-100 text-xs font-semibold text-emerald-700">
                                    {new Date(t.timestamp).toLocaleDateString(undefined, { month: 'short', year: 'numeric', day: 'numeric' })}
                                  </time>
                                </div>
                                <div className="text-sm font-bold text-gray-900 break-words mb-2">{t.status}</div>
                                {t.note && t.note.trim() && (
                                  <div className="text-sm text-gray-700 break-words mb-2 bg-white p-3 rounded-lg border border-gray-200">{t.note}</div>
                                )}
                                {t.assignedTo && (
                                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-gray-600 mt-2">
                                    <span className="break-words font-medium">Assigned to: {t.assignedTo.name}</span>
                                    {t.assignedTo.category && <span className="text-gray-500 break-words">({t.assignedTo.category})</span>}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Desktop Timeline */}
                          <div className="hidden sm:block group relative py-2 lg:py-3 pl-6 lg:pl-8 xl:pl-32">
                            <div className="mb-1 flex flex-col items-start before:absolute before:left-1 lg:before:left-2 before:h-full before:-translate-x-1/2 before:translate-y-3 before:self-start before:bg-slate-300 before:px-px group-last:before:hidden after:absolute after:left-1 lg:after:left-2 after:box-content after:h-2 after:w-2 after:-translate-x-1/2 after:translate-y-1.5 after:rounded-full after:border-4 after:border-slate-50 after:bg-indigo-600 lg:flex-row xl:before:left-0 xl:before:ml-[6.5rem] xl:after:left-0 xl:after:ml-[6.5rem]">
                              <time className="left-0 mb-2 lg:mb-3 inline-flex h-5 lg:h-6 w-20 lg:w-24 translate-y-0.5 items-center justify-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-600 uppercase xl:absolute xl:mb-0">
                                {new Date(t.timestamp).toLocaleDateString(undefined, { month: 'short', year: 'numeric', day: 'numeric' })}
                              </time>
                              <div className="text-sm lg:text-base xl:text-xl font-bold text-slate-900 break-words">{t.status}</div>
                            </div>
                            {t.note && t.note.trim() && (
                              <div className="text-slate-500 text-sm mb-1 break-words">{t.note}</div>
                            )}
                            {t.assignedTo && (
                              <div className="flex flex-wrap items-center gap-1 text-xs text-gray-600 mt-1">
                                <span className="break-words">Assigned to: {t.assignedTo.name}</span>
                                {t.assignedTo.category && <span className="text-xs text-gray-500 break-words">({t.assignedTo.category})</span>}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Update Form - Mobile Only (shown below on small screens) */}
                {!selected.isLockedForUpdates && selected.currentStatus !== 'Closed' && (
                  <div className="lg:hidden">
                    <form className="space-y-3 sm:space-y-4 mt-4 sm:mt-6 border-t border-gray-200 pt-3 sm:pt-4 md:pt-6" onSubmit={handleStatusUpdate}>
                      <div className="p-3 sm:p-4 bg-gray-50 rounded-lg">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs sm:text-sm font-medium text-gray-700">Current Status:</span>
                          <span className={`inline-flex items-center px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-medium ${STATUS_COLORS[selected.currentStatus]}`}>
                            {selected.currentStatus}
                          </span>
                          {selected.isReopened && (
                            <span className="inline-flex items-center px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-medium bg-orange-100 text-orange-800">
                              🔄 Reopened
                            </span>
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">Update Status</label>
                        <select
                          className="w-full px-3 sm:px-4 py-2 sm:py-2.5 md:py-3 rounded-lg border border-gray-300 sm:border-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-sm sm:text-base bg-white touch-manipulation min-h-[40px] sm:min-h-[44px] md:min-h-[48px]"
                          value={status}
                          onChange={e => setStatus(e.target.value)}
                          required
                        >
                          <option value="">Select status</option>
                          {STATUS_OPTIONS
                            .filter(opt => opt !== 'All')
                            .filter(opt => opt !== 'Closed' || isSuperAdmin) // Only super_admin can set Closed
                            .map(opt => (
                              <option key={`status-${opt}`} value={opt}>{opt}</option>
                            ))}
                        </select>
                        {!isSuperAdmin && (
                          <p className="mt-1.5 text-xs text-gray-500">
                            Note: Only Super Admin can directly close complaints
                          </p>
                        )}
                      </div>

                      {status === 'In Progress' && (
                        (() => {
                          // Get all members from all categories
                          const allMembers = Object.values(members).flat();
                          console.log('All available members:', allMembers);

                          return (
                            <div>
                              <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">Assign Member</label>
                              <select
                                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 md:py-3 rounded-lg border border-gray-300 sm:border-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-sm sm:text-base bg-white touch-manipulation min-h-[40px] sm:min-h-[44px] md:min-h-[48px]"
                                value={selectedMember}
                                onChange={e => {
                                  console.log('Selected member value:', e.target.value);
                                  setSelectedMember(e.target.value);
                                }}
                                required={status === 'In Progress'}
                              >
                                <option key="default" value="">Select a member</option>
                                {allMembers?.map(member => {
                                  const memberId = member._id || member.id;
                                  return (
                                    <option key={memberId} value={memberId}>
                                      {member.name} ({member.category})
                                    </option>
                                  );
                                })}
                              </select>
                              {(!allMembers || allMembers.length === 0) && (
                                <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm text-gray-500">
                                  No members available
                                </p>
                              )}
                            </div>
                          );
                        })()
                      )}

                      <div>
                        <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">Add Note (Optional)</label>
                        <input
                          className="w-full px-3 sm:px-4 py-2 sm:py-2.5 md:py-3 rounded-lg border border-gray-300 sm:border-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-sm sm:text-base touch-manipulation min-h-[40px] sm:min-h-[44px] md:min-h-[48px]"
                          placeholder="Enter a note about this status update"
                          value={note}
                          onChange={e => setNote(e.target.value)}
                        />
                      </div>

                      <button
                        className={`w-full py-2.5 sm:py-3 md:py-3.5 px-3 sm:px-4 rounded-lg text-white font-semibold transition-all duration-200 text-sm sm:text-base touch-manipulation min-h-[40px] sm:min-h-[44px] md:min-h-[48px] shadow-md sm:shadow-lg ${updating
                          ? 'bg-gray-400 cursor-not-allowed'
                          : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
                          }`}
                        type="submit"
                        disabled={updating || (status === 'In Progress' && !selectedMember)}
                      >
                        {updating ? (
                          <div className="flex items-center justify-center gap-2">
                            <LoadingSpinner size="sm" className="border-white" />
                            <span className="text-sm sm:text-base">Updating...</span>
                          </div>
                        ) : (
                          'Update Status'
                        )}
                      </button>
                    </form>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* AI Configuration Modal */}
      {showAIConfig && (
        <AIConfigPanel onClose={() => setShowAIConfig(false)} />
      )}
    </>
  );
};

export default Complaints;