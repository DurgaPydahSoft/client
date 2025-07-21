import React, { useState, useEffect, memo, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/axios';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import LoadingSpinner from '../../components/LoadingSpinner';
import SEO from '../../components/SEO';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  XMarkIcon,
  EyeIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  CalendarIcon,
  UserIcon,
  ChartBarIcon,
  DocumentTextIcon,
  ClockIcon,
  CheckIcon,
  ArrowPathIcon,
  XMarkIcon as XMarkIconSolid
} from '@heroicons/react/24/outline';

const CATEGORIES = [
  'All',
  'Electronics',
  'Books',
  'Clothing',
  'Accessories',
  'Documents',
  'Others'
];

const TYPES = [
  { value: 'all', label: 'All Items' },
  { value: 'found', label: 'Found Items' },
  { value: 'lost', label: 'Lost Items' }
];

const STATUSES = [
  { value: 'all', label: 'All Status' },
  { value: 'active', label: 'Active' },
  { value: 'claimed', label: 'Claimed' },
  { value: 'closed', label: 'Closed' }
];

const FoundLostManagement = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPost, setSelectedPost] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);

  // Filters
  const [filterType, setFilterType] = useState('all');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalPosts, setTotalPosts] = useState(0);

  // Status update
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchPosts();
    fetchAnalytics();
  }, [currentPage, filterType, filterCategory, filterStatus, searchQuery]);

  const fetchPosts = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filterType !== 'all') params.append('type', filterType);
      if (filterCategory !== 'All') params.append('category', filterCategory);
      if (filterStatus !== 'all') params.append('status', filterStatus);
      if (searchQuery) params.append('search', searchQuery);
      params.append('page', currentPage);
      params.append('limit', 10);

      const res = await api.get(`/api/foundlost/admin/all?${params.toString()}`);
      
      if (res.data.success) {
        setPosts(res.data.data.posts);
        setTotalPages(res.data.data.pagination.totalPages);
        setTotalPosts(res.data.data.pagination.total);
      }
    } catch (err) {
      console.error('Error fetching posts:', err);
      setError('Failed to fetch posts');
      toast.error('Failed to fetch posts');
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    setAnalyticsLoading(true);
    try {
      console.log('📊 Fetching analytics...');
      const res = await api.get('/api/foundlost/admin/analytics');
      if (res.data.success) {
        console.log('📊 Analytics received:', res.data.data);
        setAnalytics(res.data.data);
      } else {
        console.error('📊 Analytics request failed:', res.data);
      }
    } catch (err) {
      console.error('📊 Error fetching analytics:', err);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const handleStatusUpdate = useCallback(async (formData) => {
    if (!selectedPost) return;

    console.log('🔄 Updating status for post:', selectedPost._id, 'to:', formData.status);
    setUpdating(true);
    try {
      const response = await api.put(`/api/foundlost/admin/${selectedPost._id}/status`, formData);
      if (response.data.success) {
        console.log('✅ Status updated successfully:', response.data);
        toast.success('Status updated successfully');
        setShowStatusModal(false);
        
        // Fetch posts immediately
        console.log('📋 Fetching updated posts...');
        await fetchPosts();
        
        // Add a small delay to ensure database is updated before fetching analytics
        console.log('⏳ Waiting 500ms before fetching analytics...');
        setTimeout(async () => {
          console.log('📊 Fetching updated analytics...');
          await fetchAnalytics();
        }, 500);
      }
    } catch (err) {
      console.error('❌ Error updating status:', err);
      toast.error(err.response?.data?.message || 'Failed to update status');
    } finally {
      setUpdating(false);
    }
  }, [selectedPost, fetchPosts, fetchAnalytics]);

  const openDetails = (post) => {
    setSelectedPost(post);
    setShowDetailsModal(true);
  };

  const openStatusUpdate = useCallback((post) => {
    setSelectedPost(post);
    setShowStatusModal(true);
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'claimed':
        return 'bg-blue-100 text-blue-800';
      case 'closed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type) => {
    return type === 'found' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800';
  };

  // Memoized status update form component to prevent re-renders
  const StatusUpdateForm = memo(({ onSubmit, onCancel, updating, initialForm = null }) => {
    const [formData, setFormData] = useState(initialForm || {
      status: 'active',
      adminNotes: ''
    });

    const handleSubmit = (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      if (!formData.status) {
        toast.error('Please select a status');
        return;
      }

      onSubmit(formData);
    };

    const handleCancel = () => {
      setFormData(initialForm || {
        status: 'active',
        adminNotes: ''
      });
      onCancel();
    };

    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Status *
          </label>
          <select
            value={formData.status}
            onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="active">Active</option>
            <option value="claimed">Claimed</option>
            <option value="closed">Closed</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Admin Notes
          </label>
          <textarea
            value={formData.adminNotes}
            onChange={(e) => setFormData(prev => ({ ...prev, adminNotes: e.target.value }))}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Add any notes about this item..."
          />
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={handleCancel}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={updating}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {updating ? 'Updating...' : 'Update Status'}
          </button>
        </div>
      </form>
    );
  });

  const PostCard = ({ post }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="group bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-xl hover:border-blue-200 transition-all duration-300 transform hover:-translate-y-1"
    >
      {/* Header with gradient background */}
      <div className={`relative h-2 ${post.type === 'found' ? 'bg-gradient-to-r from-green-400 to-green-600' : 'bg-gradient-to-r from-orange-400 to-orange-600'}`}>
        <div className="absolute inset-0 bg-black bg-opacity-10"></div>
      </div>

      <div className="p-4 sm:p-6">
        {/* Title and Status Badges */}
        <div className="flex flex-col gap-2 sm:gap-3 mb-3 sm:mb-4">
          <h3 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900 leading-tight line-clamp-2 group-hover:text-blue-600 transition-colors">
            {post.title}
          </h3>
          <div className="flex flex-wrap gap-1 sm:gap-2">
            <span className={`inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs font-semibold ${getTypeColor(post.type)}`}>
              {post.type === 'found' ? '🔍 Found' : '❓ Lost'}
            </span>
            <span className={`inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(post.status)}`}>
              {post.status === 'active' && '🟢 Active'}
              {post.status === 'claimed' && '✅ Claimed'}
              {post.status === 'closed' && '🔒 Closed'}
            </span>
          </div>
        </div>

        {/* Description */}
        <p className="text-gray-600 text-sm sm:text-base mb-3 sm:mb-4 line-clamp-3 leading-relaxed">
          {post.description}
        </p>

        {/* Info Grid */}
        <div className="grid grid-cols-1 gap-2 sm:gap-3 mb-3 sm:mb-4">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <div className="p-1 sm:p-1.5 bg-blue-50 rounded-lg">
              <CalendarIcon className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-gray-400">Posted on</span>
              <span className="font-medium text-sm sm:text-base">{new Date(post.createdAt).toLocaleDateString()}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-500">
            <div className="p-1 sm:p-1.5 bg-purple-50 rounded-lg">
              <UserIcon className="w-3 h-3 sm:w-4 sm:h-4 text-purple-600" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-gray-400">Posted by</span>
              <span className="font-medium text-sm sm:text-base">{post.student?.name || 'Unknown'}</span>
            </div>
          </div>
        </div>

        {/* Claimed Info */}
        {post.status === 'claimed' && post.claimedBy && (
          <div className="mb-3 sm:mb-4 p-2 sm:p-3 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="p-1 sm:p-1.5 bg-green-100 rounded-lg">
                <CheckCircleIcon className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-green-800">
                  Claimed by {post.claimedBy?.name || 'Unknown'}
                </div>
                {post.claimedAt && (
                  <div className="text-xs text-green-600">
                    on {new Date(post.claimedAt).toLocaleDateString()}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col gap-2 pt-2 border-t border-gray-100">
          <button
            onClick={() => openDetails(post)}
            className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 text-sm font-medium bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 hover:text-blue-800 transition-all duration-200 transform hover:scale-105"
          >
            <EyeIcon className="w-4 h-4" />
            <span>View Details</span>
          </button>
          
          {post.status !== 'claimed' && (
            <button
              onClick={() => openStatusUpdate(post)}
              className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 text-sm font-medium bg-yellow-50 text-yellow-700 rounded-lg hover:bg-yellow-100 hover:text-yellow-800 transition-all duration-200 transform hover:scale-105"
            >
              <CheckCircleIcon className="w-4 h-4" />
              <span>Update Status</span>
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );

  const Modal = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto"
        >
          <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900">{title}</h2>
            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <XMarkIcon className="w-5 h-5 sm:w-6 sm:h-6 text-gray-500" />
            </button>
          </div>
          <div className="p-4 sm:p-6">
            {children}
          </div>
        </motion.div>
      </div>
    );
  };

  const StatCard = ({ title, value, icon: Icon, color, change }) => (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4 lg:p-6 hover:shadow-md transition-shadow duration-200`}>
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">{title}</p>
          <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {change && (
            <p className={`text-xs sm:text-sm mt-1 ${change > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {change > 0 ? '+' : ''}{change} from last week
            </p>
          )}
        </div>
        <div className={`p-1.5 sm:p-2 lg:p-3 rounded-lg ${color} flex-shrink-0`}>
          <Icon className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-white" />
        </div>
      </div>
    </div>
  );

  return (
    <>
      <SEO
        title="Found & Lost Management"
        description="Admin dashboard for managing found and lost items. Monitor posts, update statuses, and view analytics."
        keywords="Found Lost Management, Admin Dashboard, Item Management, Analytics"
      />

      <div className="min-h-screen bg-gray-50 pt-12 sm:pt-0">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8">
            <div className="flex items-center justify-between h-14 sm:h-16">
              <div className="flex items-center">
                <h1 className="text-lg sm:text-xl font-bold text-blue-900">Found & Lost Management</h1>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={fetchAnalytics}
                  disabled={analyticsLoading}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
                >
                  <ArrowPathIcon className={`w-4 h-4 ${analyticsLoading ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Refresh Analytics</span>
                  <span className="sm:hidden">Refresh</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-4 sm:py-6">
          {/* Analytics */}
          {!analyticsLoading && analytics && (
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
              <StatCard
                title="Total Posts"
                value={analytics.totalPosts}
                icon={DocumentTextIcon}
                color="bg-blue-500"
              />
              <StatCard
                title="Found Items"
                value={analytics.foundPosts}
                icon={CheckIcon}
                color="bg-green-500"
              />
              <StatCard
                title="Lost Items"
                value={analytics.lostPosts}
                icon={ExclamationTriangleIcon}
                color="bg-orange-500"
              />
              <StatCard
                title="Active Posts"
                value={analytics.activePosts}
                icon={ClockIcon}
                color="bg-purple-500"
              />
            </div>
          )}

          {/* Category Breakdown */}
          {!analyticsLoading && analytics?.categoryStats && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 mb-6 sm:mb-8">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Category Breakdown</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3 lg:gap-4">
                {analytics.categoryStats.map((stat) => (
                  <div key={stat._id} className="text-center">
                    <div className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">{stat.count}</div>
                    <div className="text-xs sm:text-sm text-gray-600">{stat._id}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4 mb-4 sm:mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-3 lg:gap-4">
              {/* Search */}
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Type Filter */}
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {TYPES.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>

              {/* Category Filter */}
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {CATEGORIES.map(category => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {STATUSES.map(status => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>

              {/* Clear Filters */}
              <button
                onClick={() => {
                  setFilterType('all');
                  setFilterCategory('All');
                  setFilterStatus('all');
                  setSearchQuery('');
                }}
                className="px-3 sm:px-4 py-2 text-sm sm:text-base text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Clear Filters
              </button>
            </div>
          </div>

          {/* Content */}
          {loading ? (
            <div className="flex justify-center py-8 sm:py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : error ? (
            <div className="text-center py-8 sm:py-12">
              <ExclamationTriangleIcon className="w-10 h-10 sm:w-12 sm:h-12 text-red-500 mx-auto mb-3 sm:mb-4" />
              <p className="text-sm sm:text-base text-gray-600">{error}</p>
            </div>
          ) : (
            <>
              {/* Posts Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
                <AnimatePresence>
                  {posts.map(post => (
                    <PostCard key={post._id} post={post} />
                  ))}
                </AnimatePresence>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center">
                  <div className="flex flex-wrap justify-center gap-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Previous
                    </button>
                    <span className="px-3 py-2 text-sm sm:text-base text-gray-600">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}

              {/* Empty State */}
              {posts.length === 0 && (
                <div className="text-center py-8 sm:py-12">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                    <ExclamationTriangleIcon className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" />
                  </div>
                  <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">
                    No posts found
                  </h3>
                  <p className="text-sm sm:text-base text-gray-600">
                    Try adjusting your search criteria or check back later.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Details Modal */}
        <Modal
          isOpen={showDetailsModal}
          onClose={() => setShowDetailsModal(false)}
          title="Item Details"
        >
          {selectedPost && (
            <div className="space-y-3 sm:space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium ${getTypeColor(selectedPost.type)}`}>
                  {selectedPost.type === 'found' ? 'Found' : 'Lost'}
                </span>
                <span className={`px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium ${getStatusColor(selectedPost.status)}`}>
                  {selectedPost.status}
                </span>
              </div>

              <div>
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
                  {selectedPost.title}
                </h3>
                <p className="text-sm sm:text-base text-gray-600 mb-3 sm:mb-4">
                  {selectedPost.description}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Category</label>
                  <p className="text-sm sm:text-base text-gray-900">{selectedPost.category}</p>
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Posted by</label>
                  <p className="text-sm sm:text-base text-gray-900">{selectedPost.student?.name}</p>
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Posted on</label>
                  <p className="text-sm sm:text-base text-gray-900">
                    {new Date(selectedPost.createdAt).toLocaleDateString()}
                  </p>
                </div>
                {selectedPost.claimedBy && (
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Claimed by</label>
                    <p className="text-sm sm:text-base text-gray-900">{selectedPost.claimedBy?.name}</p>
                  </div>
                )}
                {selectedPost.claimedAt && (
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Claimed on</label>
                    <p className="text-sm sm:text-base text-gray-900">
                      {new Date(selectedPost.claimedAt).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>

              {selectedPost.adminNotes && (
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Admin Notes</label>
                  <p className="text-sm sm:text-base text-gray-900 bg-gray-50 p-2 sm:p-3 rounded-lg">
                    {selectedPost.adminNotes}
                  </p>
                </div>
              )}
            </div>
          )}
        </Modal>

        {/* Status Update Modal */}
        <Modal
          isOpen={showStatusModal}
          onClose={() => setShowStatusModal(false)}
          title="Update Status"
        >
          {selectedPost && (
            <StatusUpdateForm
              onSubmit={handleStatusUpdate}
              onCancel={() => setShowStatusModal(false)}
              updating={updating}
              initialForm={{
                status: selectedPost.status,
                adminNotes: selectedPost.adminNotes || ''
              }}
            />
          )}
        </Modal>
      </div>
    </>
  );
};

export default FoundLostManagement; 