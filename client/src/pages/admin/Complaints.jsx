import React, { useEffect, useState, useMemo } from 'react';
import api from '../../utils/axios';
import toast from 'react-hot-toast';
import { FunnelIcon, XMarkIcon, ClockIcon, UserIcon, CheckCircleIcon, ExclamationCircleIcon, ChevronLeftIcon, ChevronRightIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import LoadingSpinner from '../../components/LoadingSpinner';
import { useLocation } from 'react-router-dom';
import SEO from '../../components/SEO';

const STATUS_OPTIONS = ['All', 'Received', 'Pending', 'In Progress', 'Resolved', 'Closed'];

const STATUS_COLORS = {
  'Received': 'bg-blue-100 text-blue-800',
  'Pending': 'bg-yellow-100 text-yellow-800',
  'In Progress': 'bg-purple-100 text-purple-800',
  'Resolved': 'bg-green-300 text-green-800'
};

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
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [note, setNote] = useState('');
  const [updating, setUpdating] = useState(false);
  const [members, setMembers] = useState({});
  const [selectedMember, setSelectedMember] = useState('');

  // Simplified filters
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterSubCategory, setFilterSubCategory] = useState('All');
  const [filterDateRange, setFilterDateRange] = useState({ from: '', to: '' });
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const complaintsPerPage = 10;

  // Add pagination state
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 10,
    pages: 0
  });

  useEffect(() => {
    // Apply filters from navigation state if available
    if (location.state?.filters) {
      const { status, category, subCategory, dateRange } = location.state.filters;
      if (status) setFilterStatus(status);
      if (category) setFilterCategory(category);
      if (subCategory) setFilterSubCategory(subCategory);
      if (dateRange) setFilterDateRange(dateRange);
    }
    
    fetchComplaints();
    fetchMembers();
  }, [location.state]);

  const fetchComplaints = async () => {
    setLoading(true);
    setError(null);
    try {
      // Build query parameters
      const params = new URLSearchParams();
      if (filterStatus !== 'All') params.append('status', filterStatus);
      if (filterCategory !== 'All') params.append('category', filterCategory);
      if (filterSubCategory !== 'All') params.append('subCategory', filterSubCategory);
      if (filterDateRange.from) params.append('fromDate', filterDateRange.from);
      if (filterDateRange.to) params.append('toDate', filterDateRange.to);
      if (searchQuery) params.append('search', searchQuery);
      params.append('page', currentPage);
      params.append('limit', complaintsPerPage);

      const res = await api.get(`/api/complaints/admin/all?${params.toString()}`);
      
      if (!res.data.success) {
        throw new Error(res.data.message || 'Failed to fetch complaints');
      }

      // Update complaints and pagination from the response
      setComplaints(res.data.data.complaints);
      setPagination(res.data.data.pagination);
    } catch (err) {
      console.error('Error fetching complaints:', err);
      setError(err.message || 'Failed to fetch complaints');
      toast.error(err.message || 'Failed to fetch complaints');
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async () => {
    try {
      const res = await api.get('/api/admin/members');
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
    setStatus(complaint.currentStatus || 'Received');
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
        // Close the modal
        setSelected(null);
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
  };

  const handleFilterChange = () => {
    setCurrentPage(1);
    fetchComplaints();
  };

  // Filter form JSX
  const renderFilterForm = () => (
    <div className="space-y-4">
      {/* Status Filter */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
        <select
          value={filterStatus}
          onChange={(e) => {
            setFilterStatus(e.target.value);
            handleFilterChange();
          }}
          className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
        >
          {STATUS_OPTIONS.map(status => (
            <option key={status} value={status}>{status}</option>
          ))}
        </select>
      </div>

      {/* Category Filter */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
        <select
          value={filterCategory}
          onChange={(e) => {
            setFilterCategory(e.target.value);
            setFilterSubCategory('All');
            handleFilterChange();
          }}
          className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
        >
          {CATEGORY_OPTIONS.map(category => (
            <option key={category} value={category}>{category}</option>
          ))}
        </select>
      </div>

      {/* Subcategory Filter (only for Maintenance) */}
      {filterCategory === 'Maintenance' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Subcategory</label>
          <select
            value={filterSubCategory}
            onChange={(e) => {
              setFilterSubCategory(e.target.value);
              handleFilterChange();
            }}
            className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
          >
            <option value="All">All</option>
            {MAINTENANCE_SUBCATEGORIES.map(subCategory => (
              <option key={subCategory} value={subCategory}>{subCategory}</option>
            ))}
          </select>
        </div>
      )}

      {/* Date Range Filter */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
        <div className="space-y-2">
          <input
            type="date"
            value={filterDateRange.from}
            onChange={(e) => {
              setFilterDateRange(prev => ({ ...prev, from: e.target.value }));
              handleFilterChange();
            }}
            className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
          />
          <input
            type="date"
            value={filterDateRange.to}
            onChange={(e) => {
              setFilterDateRange(prev => ({ ...prev, to: e.target.value }));
              handleFilterChange();
            }}
            className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
          />
        </div>
      </div>

      {/* Search */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              handleFilterChange();
            }}
            placeholder="Search by description or student..."
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
          />
          <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
        </div>
      </div>

      {/* Clear Filters Button */}
      <button
        onClick={clearFilters}
        className="w-full px-4 py-2 text-sm text-gray-600 hover:text-red-600 flex items-center justify-center gap-2 rounded-lg hover:bg-gray-50 transition-all duration-200 border border-gray-200"
      >
        <XMarkIcon className="w-4 h-4" />
        Clear Filters
      </button>
    </div>
  );

  // Update useEffect to fetch complaints when filters or page changes
  useEffect(() => {
    fetchComplaints();
  }, [currentPage, filterStatus, filterCategory, filterSubCategory, filterDateRange, searchQuery]);

  // Update pagination handlers
  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Update the pagination section in the render
  const renderPagination = () => {
    if (pagination.pages <= 1) return null;

    return (
      <div className="mt-6 flex items-center justify-between border-t border-gray-200 pt-4">
        <div className="flex-1 flex justify-between sm:hidden">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className={`relative inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg
              ${currentPage === 1 
                ? 'text-gray-400 cursor-not-allowed' 
                : 'text-blue-600 hover:bg-blue-50'
              }`}
          >
            Previous
          </button>
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === pagination.pages}
            className={`relative inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg
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
            <p className="text-sm text-gray-700">
              Showing <span className="font-medium">{((currentPage - 1) * pagination.limit) + 1}</span> to{' '}
              <span className="font-medium">{Math.min(currentPage * pagination.limit, pagination.total)}</span> of{' '}
              <span className="font-medium">{pagination.total}</span> complaints
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className={`relative inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg
                ${currentPage === 1 
                  ? 'text-gray-400 cursor-not-allowed' 
                  : 'text-blue-600 hover:bg-blue-50'
                }`}
            >
              <ChevronLeftIcon className="h-5 w-5 mr-1" />
              Previous
            </button>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === pagination.pages}
              className={`relative inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg
                ${currentPage === pagination.pages 
                  ? 'text-gray-400 cursor-not-allowed' 
                  : 'text-blue-600 hover:bg-blue-50'
                }`}
            >
              Next
              <ChevronRightIcon className="h-5 w-5 ml-1" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Update the complaints list section to use pagination
  const renderComplaintsList = () => (
    <div className="space-y-4">
      {complaints.length === 0 ? (
        <div className="text-center py-12">
          <div className="flex flex-col items-center gap-3">
            <div className="text-gray-400">
              <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-base text-gray-500 font-medium">No complaints found</p>
            <p className="text-sm text-gray-400">Try adjusting your filters</p>
          </div>
        </div>
      ) : (
        complaints.map((c, index) => {
          const complaintKey = `${c._id || c.student?._id || 'unknown'}-${index}`;
          const isLocked = c.isLockedForUpdates === true;
          return (
            <div key={complaintKey} className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100 hover:bg-gray-100 transition-colors duration-200 gap-4 ${isLocked ? 'opacity-70' : ''}`}>
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0 h-12 w-12 bg-white rounded-full flex items-center justify-center border border-gray-200">
                  <UserIcon className="w-6 h-6 text-gray-600" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">{c.student?.name || 'Unknown'}</span>
                    <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                      {c.category || 'Uncategorized'}
                    </span>
                    {isLocked && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                        Locked
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-500">Roll No: {c.student?.rollNumber || 'N/A'}</div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[c.currentStatus] || STATUS_COLORS['Received']}`}>
                  {c.currentStatus || 'Received'}
                </span>
                <button 
                  className="w-full sm:w-auto px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 text-blue-600 hover:bg-blue-50"
                  onClick={() => openDetails(c)}
                >
                  View Details
                </button>
              </div>
            </div>
          );
        })
      )}
      {renderPagination()}
    </div>
  );

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
    <div className="min-h-screen bg-gray-50 pt-12 sm:pt-0">
      {/* Top Navigation Bar */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-blue-900">Complaint Management</h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-4">
                <div className="bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100">
                  <span className="text-sm text-gray-600">Total: </span>
                    <span className="font-semibold text-blue-700">{complaints.length}</span>
                </div>
                
                <div className="bg-yellow-50 px-3 py-1.5 rounded-lg border border-yellow-100">
                  <span className="text-sm text-gray-600">Active: </span>
                  <span className="font-semibold text-yellow-700">
                    {complaints.filter(c => c.currentStatus === 'Pending' || c.currentStatus === 'Received').length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Stats Bar */}
      <div className="sm:hidden bg-white border-b border-gray-200">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100">
              <span className="text-sm text-gray-600">Total: </span>
                <span className="font-semibold text-blue-700">{complaints.length}</span>
            </div>
            <div className="bg-yellow-50 px-3 py-1.5 rounded-lg border border-yellow-100">
              <span className="text-sm text-gray-600">Active: </span>
              <span className="font-semibold text-yellow-700">
                {complaints.filter(c => c.currentStatus === 'Pending' || c.currentStatus === 'Received').length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Complaints Management</h1>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Sidebar - Filters */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sticky top-24">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-50">
                    <FunnelIcon className="w-5 h-5 text-blue-600" />
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
                </div>
              </div>

                {renderFilterForm()}
            </div>
          </div>

          {/* Right Content - Complaints List */}
          <div className="lg:col-span-2">
            {/* Active Complaints Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-yellow-50">
                  <ClockIcon className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Active Complaints</h2>
                  <p className="text-sm text-gray-500">Requiring immediate attention</p>
                </div>
              </div>

              <div className="space-y-4">
                {complaints
                  .filter(c => c.currentStatus === 'Pending' || c.currentStatus === 'Received')
                  .slice(0, 3)
                  .map((c, index) => {
                    const complaintKey = `${c._id || c.student?._id || 'unknown'}-${index}`;
                    return (
                      <div key={complaintKey} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100 hover:bg-gray-100 transition-colors duration-200 gap-4">
                        <div className="flex items-center gap-4">
                          <div className="flex-shrink-0 h-12 w-12 bg-white rounded-full flex items-center justify-center border border-gray-200">
                            <UserIcon className="w-6 h-6 text-gray-600" />
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-medium text-gray-900">{c.student?.name || 'Unknown'}</span>
                              <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                                {c.category || 'Uncategorized'}
                              </span>
                            </div>
                            <div className="text-sm text-gray-500">Roll No: {c.student?.rollNumber || 'N/A'}</div>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-4">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[c.currentStatus] || STATUS_COLORS['Received']}`}>
                            {c.currentStatus || 'Received'}
                          </span>
                          <button 
                            className="w-full sm:w-auto px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 text-blue-600 hover:bg-blue-50"
                            onClick={() => openDetails(c)}
                          >
                            View Details
                          </button>
                        </div>
                      </div>
                    );
                  })}
                {complaints.filter(c => c.currentStatus === 'Pending' || c.currentStatus === 'Received').length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-sm text-gray-500">No active complaints</p>
                  </div>
                )}
              </div>
            </div>

            {/* All Complaints Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-50">
                    <FunnelIcon className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">All Complaints</h2>
                    <p className="text-sm text-gray-500">
                        Showing {((currentPage - 1) * pagination.limit) + 1}-{Math.min(currentPage * pagination.limit, pagination.total)} of {pagination.total}
                    </p>
                  </div>
                </div>
              </div>

                {renderComplaintsList()}
                      </div>
          </div>
        </div>
      </div>

      {/* Details Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-2xl relative animate-fade-in-up max-h-[90vh] overflow-y-auto">
            <button
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors duration-200"
              onClick={() => setSelected(null)}
              disabled={updating}
            >
              <XMarkIcon className="w-6 h-6" />
            </button>

            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Complaint Details</h2>
              <p className="text-base text-gray-600">{selected.description}</p>
              {selected.imageUrl && (
                <div className="mt-4">
                  <div className="relative w-full pt-[56.25%] overflow-hidden rounded-lg border border-gray-200">
                    <img
                      src={selected.imageUrl}
                      alt="Complaint"
                      className="absolute inset-0 w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <p className="mt-2 text-sm text-gray-500">Complaint Image</p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                <div className="flex items-center gap-2 mb-3">
                  <UserIcon className="w-5 h-5 text-gray-500" />
                  <span className="text-base font-medium text-gray-700">Student Details</span>
                </div>
                <p className="text-base text-gray-600">{selected.student?.name}</p>
                <p className="text-sm text-gray-500">Roll No: {selected.student?.rollNumber}</p>
                {selected.student?.phone && (
                  <p className="text-sm text-gray-500">Phone: {selected.student.phone}</p>
                )}
              </div>

              <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                <div className="flex items-center gap-2 mb-3">
                  <ClockIcon className="w-5 h-5 text-gray-500" />
                  <span className="text-base font-medium text-gray-700">Status Information</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${STATUS_COLORS[selected.currentStatus]}`}>
                    {selected.currentStatus}
                  </span>
                  {selected.isReopened && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                      Reopened
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircleIcon className="w-5 h-5 text-gray-500" />
                <span className="text-base font-medium text-gray-700">Feedback</span>
              </div>
              {selected.feedback ? (
                <div className={`flex items-center gap-2 ${
                  selected.feedback.isSatisfied ? 'text-green-600' : 'text-red-600'
                }`}>
                  {selected.feedback.isSatisfied ? (
                    <CheckCircleIcon className="w-5 h-5" />
                  ) : (
                    <ExclamationCircleIcon className="w-5 h-5" />
                  )}
                  {selected.feedback.isSatisfied ? 'Satisfied' : 'Not Satisfied'}
                </div>
              ) : (
                <p className="text-gray-500">No feedback provided yet</p>
              )}
            </div>

            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <ClockIcon className="w-5 h-5 text-gray-500" />
                <span className="text-base font-medium text-gray-700">Timeline</span>
              </div>
              {timelineLoading ? (
                <div className="flex justify-center py-4">
                  <LoadingSpinner size="sm" />
                </div>
              ) : (
                <div className="space-y-4">
                  {timeline.map((t, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                        {t.status === "Received" && (
                          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                          </svg>
                        )}
                        {t.status === "Pending" && (
                          <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )}
                        {t.status === "In Progress" && (
                          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                        )}
                        {t.status === "Resolved" && (
                          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${STATUS_COLORS[t.status]}`}>
                            {t.status}
                          </span>
                          <span className="text-sm text-gray-500">
                            {new Date(t.timestamp).toLocaleString()}
                          </span>
                          {t.assignedTo && (
                            <div className="flex items-center gap-1 text-sm text-gray-600">
                              <UserIcon className="w-4 h-4" />
                              <span>Assigned to: {t.assignedTo.name}</span>
                              <span className="text-xs text-gray-500">({t.assignedTo.category})</span>
                            </div>
                          )}
                        </div>
                        {t.note && (
                          <p className="mt-1 text-sm text-gray-600">{t.note}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Update Form */}
            {!selected.isLockedForUpdates && (
              <form className="space-y-4 mt-6 border-t pt-6" onSubmit={handleStatusUpdate}>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Update Status</label>
                  <select 
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                    value={status} 
                    onChange={e => setStatus(e.target.value)} 
                    required
                  >
                    {STATUS_OPTIONS.filter(opt => opt !== 'All').map(opt => (
                      <option key={`status-${opt}`} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>

                {status === 'In Progress' && (
                  (() => {
                    const complaintCategory = selected?.category;
                    const complaintSubCategory = selected?.subCategory;
                    
                    const categoryToFilterBy = complaintCategory === 'Maintenance' && complaintSubCategory 
                      ? complaintSubCategory 
                      : complaintCategory;

                    const availableMembersForCategory = categoryToFilterBy ? members[categoryToFilterBy] : [];
                    
                    return (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Assign Member</label>
                        <select
                          className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                          value={selectedMember}
                          onChange={e => {
                            console.log('Selected member value:', e.target.value);
                            setSelectedMember(e.target.value);
                          }}
                          required={status === 'In Progress'}
                        >
                          <option key="default" value="">Select a member</option>
                          {availableMembersForCategory?.map(member => {
                            const memberId = member._id || member.id;
                            console.log('Member data:', member);
                            return (
                              <option key={memberId} value={memberId}>
                                {member.name} ({member.category})
                              </option>
                            );
                          })}
                        </select>
                        {(!availableMembersForCategory || availableMembersForCategory.length === 0) && (
                          <p className="mt-1 text-sm text-gray-500">
                            No members available for {complaintCategory === 'Maintenance' ? complaintSubCategory : complaintCategory}
                          </p>
                        )}
                      </div>
                    );
                  })()
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Add Note (Optional)</label>
                  <input 
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                    placeholder="Enter a note about this status update"
                    value={note} 
                    onChange={e => setNote(e.target.value)}
                  />
                </div>

                <button 
                  className={`w-full py-2 px-4 rounded-lg text-white font-medium transition-all duration-200 ${
                    updating 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg'
                  }`} 
                  type="submit" 
                  disabled={updating || (status === 'In Progress' && !selectedMember)}
                >
                  {updating ? (
                    <div className="flex items-center justify-center gap-2">
                      <LoadingSpinner size="sm" className="border-white" />
                      <span>Updating...</span>
                    </div>
                  ) : (
                    'Update Status'
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
    </>
  );
};

export default Complaints;