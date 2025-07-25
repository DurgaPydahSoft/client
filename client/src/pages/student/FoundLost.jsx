import React, { useState, useEffect, useCallback, memo } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/axios';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import LoadingSpinner from '../../components/LoadingSpinner';
import SEO from '../../components/SEO';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  XMarkIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  CalendarIcon,
  UserIcon,
  ArrowPathIcon
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

const FoundLost = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [myPosts, setMyPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPost, setSelectedPost] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [activeTab, setActiveTab] = useState('browse'); // 'browse' or 'my-posts'

  // Filters
  const [filterType, setFilterType] = useState('all');
  const [filterCategory, setFilterCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalPosts, setTotalPosts] = useState(0);

  const [submitting, setSubmitting] = useState(false);

  const fetchPosts = useCallback(async (search = searchQuery, type = filterType, category = filterCategory, page = currentPage) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (type !== 'all') params.append('type', type);
      if (category !== 'All') params.append('category', category);
      if (search) params.append('search', search);
      params.append('page', page);
      params.append('limit', 10);

      const res = await api.get(`/api/foundlost/all?${params.toString()}`);
      
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
  }, []);

  const fetchMyPosts = useCallback(async () => {
    try {
      const res = await api.get('/api/foundlost/my');
      if (res.data.success) {
        setMyPosts(res.data.data.posts);
      }
    } catch (err) {
      console.error('Error fetching my posts:', err);
    }
  }, []);

  // Initial load effect
  useEffect(() => {
    if (user) {
      fetchPosts('', 'all', 'All', 1);
      fetchMyPosts();
    }
  }, [user, fetchPosts, fetchMyPosts]);

  // Debounced search effect
  useEffect(() => {
    if (!user) return;
    
    const timeoutId = setTimeout(() => {
      fetchPosts(searchQuery, filterType, filterCategory, currentPage);
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [searchQuery, filterType, filterCategory, currentPage, fetchPosts, user]);

  // Auto-refresh on window focus (when user returns to tab)
  useEffect(() => {
    const handleFocus = () => {
      if (user) {
        fetchPosts(searchQuery, filterType, filterCategory, currentPage);
        fetchMyPosts();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [user, fetchPosts, fetchMyPosts, searchQuery, filterType, filterCategory, currentPage]);

  // Periodic refresh every 30 seconds to check for admin updates
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      fetchPosts(searchQuery, filterType, filterCategory, currentPage);
      fetchMyPosts();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [user, fetchPosts, fetchMyPosts, searchQuery, filterType, filterCategory, currentPage]);

  // Manual refresh function
  const handleRefresh = useCallback(async () => {
    if (user) {
      setLoading(true);
      try {
        await Promise.all([
          fetchPosts(searchQuery, filterType, filterCategory, currentPage),
          fetchMyPosts()
        ]);
        toast.success('Posts refreshed successfully');
      } catch (error) {
        toast.error('Failed to refresh posts');
      } finally {
        setLoading(false);
      }
    }
  }, [user, fetchPosts, fetchMyPosts, searchQuery, filterType, filterCategory, currentPage]);



  const handleSubmit = async (formData) => {
    if (!user) {
      toast.error('Please log in to create a post');
      return;
    }

    setSubmitting(true);
    try {
      const response = await api.post('/api/foundlost', formData, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.data.success) {
        toast.success('Post created successfully and is pending admin approval');
        setShowCreateModal(false);
        fetchPosts(searchQuery, filterType, filterCategory, currentPage);
        fetchMyPosts();
      }
    } catch (err) {
      console.error('Error creating post:', err);
      toast.error(err.response?.data?.message || 'Failed to create post');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClaim = async (postId) => {
    try {
      const response = await api.post(`/api/foundlost/${postId}/claim`);
      if (response.data.success) {
        toast.success('Item claimed successfully! The original poster has been notified.');
        // Refresh both browse posts and my posts to show updated status
        await Promise.all([
          fetchPosts(searchQuery, filterType, filterCategory, currentPage),
          fetchMyPosts()
        ]);
        setShowDetailsModal(false);
      }
    } catch (err) {
      console.error('Error claiming item:', err);
      toast.error(err.response?.data?.message || 'Failed to claim item');
    }
  };

  const handleUpdate = async (formData) => {
    if (!selectedPost) return;

    setSubmitting(true);
    try {
      const response = await api.put(`/api/foundlost/${selectedPost._id}`, formData, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.data.success) {
        toast.success('Post updated successfully');
        setShowEditModal(false);
        fetchPosts(searchQuery, filterType, filterCategory, currentPage);
        fetchMyPosts();
      }
    } catch (err) {
      console.error('Error updating post:', err);
      toast.error(err.response?.data?.message || 'Failed to update post');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = async (postId) => {
    if (!window.confirm('Are you sure you want to close this post?')) return;

    try {
      const response = await api.delete(`/api/foundlost/${postId}`);
      if (response.data.success) {
        toast.success('Post closed successfully');
        fetchPosts(searchQuery, filterType, filterCategory, currentPage);
        fetchMyPosts();
      }
    } catch (err) {
      console.error('Error closing post:', err);
      toast.error(err.response?.data?.message || 'Failed to close post');
    }
  };



  const openDetails = (post) => {
    setSelectedPost(post);
    setShowDetailsModal(true);
  };

  const openEdit = (post) => {
    setSelectedPost(post);
    setShowEditModal(true);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'claimed':
        return 'bg-blue-100 text-blue-800';
      case 'closed':
        return 'bg-gray-100 text-gray-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type) => {
    return type === 'found' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800';
  };

  const PostCard = ({ post, showActions = true }) => (
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
              {post.status === 'pending' && '⏳ Pending Approval'}
              {post.status === 'active' && '🟢 Active'}
              {post.status === 'claimed' && '✅ Claimed'}
              {post.status === 'closed' && '🔒 Closed'}
              {post.status === 'rejected' && '❌ Rejected'}
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
        {showActions && (
          <div className="flex flex-col gap-2 pt-2 border-t border-gray-100">
            <button
              onClick={() => openDetails(post)}
              className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 text-sm font-medium bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 hover:text-blue-800 transition-all duration-200 transform hover:scale-105"
            >
              <EyeIcon className="w-4 h-4" />
              <span>View Details</span>
            </button>
            
            {post.student?._id === user?._id && (post.status === 'active' || post.status === 'pending') && (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => openEdit(post)}
                  className="flex items-center justify-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 text-sm font-medium bg-yellow-50 text-yellow-700 rounded-lg hover:bg-yellow-100 hover:text-yellow-800 transition-all duration-200 transform hover:scale-105"
                >
                  <PencilIcon className="w-4 h-4" />
                  <span>Edit</span>
                </button>
                <button
                  onClick={() => handleClose(post._id)}
                  className="flex items-center justify-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 text-sm font-medium bg-red-50 text-red-700 rounded-lg hover:bg-red-100 hover:text-red-800 transition-all duration-200 transform hover:scale-105"
                >
                  <TrashIcon className="w-4 h-4" />
                  <span>Close</span>
                </button>
              </div>
            )}

            {post.student?._id !== user?._id && post.status === 'active' && (
              <button
                onClick={() => handleClaim(post._id)}
                className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 text-sm font-medium bg-green-50 text-green-700 rounded-lg hover:bg-green-100 hover:text-green-800 transition-all duration-200 transform hover:scale-105"
              >
                <CheckCircleIcon className="w-4 h-4" />
                <span>Claim</span>
              </button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );

  // Memoized form component to prevent re-renders
  const CreateForm = memo(({ onSubmit, onCancel, submitting, initialForm = null }) => {
    const [formData, setFormData] = useState(initialForm || {
      title: '',
      description: '',
      type: 'lost',
      category: 'Electronics'
    });



    const handleSubmit = (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      if (!formData.title.trim() || !formData.description.trim()) {
        toast.error('Please fill in all required fields');
        return;
      }

      onSubmit(formData);
    };

    const handleCancel = () => {
      setFormData(initialForm || {
        title: '',
        description: '',
        type: 'lost',
        category: 'Electronics'
      });
      onCancel();
    };

    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Category *
          </label>
          <select
            value={formData.category}
            onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {CATEGORIES.filter(cat => cat !== 'All').map(category => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Title *
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Brief description of the item"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description *
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Detailed description of the item"
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
            disabled={submitting}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {submitting ? 'Creating...' : 'Create Post'}
          </button>
        </div>
      </form>
    );
  });

  const Modal = memo(({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
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
              className="p-1 sm:p-2 hover:bg-gray-100 rounded-lg transition-colors"
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
  });

  return (
    <>
      <SEO
        title="Found & Lost Platform"
        description="Browse and manage found and lost items in the hostel. Post about items you've found or lost, and help others find their belongings."
        keywords="Found Items, Lost Items, Hostel Lost and Found, Item Recovery, Student Belongings"
      />

      <div className="min-h-screen bg-gray-50 pt-12 sm:pt-0">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 py-3 sm:py-0 sm:h-16">
              <div className="flex items-center justify-between sm:justify-start">
                <h1 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-blue-900 to-blue-700 bg-clip-text text-transparent">Found & Lost Platform</h1>
                <button
                  onClick={handleRefresh}
                  disabled={loading}
                  className="sm:hidden flex items-center gap-1 p-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                  title="Refresh posts"
                >
                  <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  onClick={handleRefresh}
                  disabled={loading}
                  className="hidden sm:flex items-center gap-2 px-3 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                  title="Refresh posts"
                >
                  <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm sm:text-base"
                >
                  <PlusIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="hidden xs:inline">Post Item</span>
                  <span className="xs:hidden">Post</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6">
          {/* Tabs */}
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-4 sm:mb-6">
            <button
              onClick={() => setActiveTab('browse')}
              className={`flex-1 py-2 px-2 sm:px-4 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                activeTab === 'browse'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <span className="hidden sm:inline">Browse Items</span>
              <span className="sm:hidden">Browse</span>
            </button>
            <button
              onClick={() => setActiveTab('my-posts')}
              className={`flex-1 py-2 px-2 sm:px-4 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                activeTab === 'my-posts'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <span className="hidden sm:inline">My Posts</span>
              <span className="sm:hidden">My Posts</span>
            </button>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4 mb-4 sm:mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 lg:gap-4">
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

              {/* Clear Filters */}
              <button
                onClick={() => {
                  setFilterType('all');
                  setFilterCategory('All');
                  setSearchQuery('');
                }}
                className="px-3 sm:px-4 py-2 text-sm sm:text-base text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <span className="hidden sm:inline">Clear Filters</span>
                <span className="sm:hidden">Clear</span>
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
              <p className="text-sm sm:text-base text-gray-600 px-4">{error}</p>
            </div>
          ) : (
            <>
              {/* Posts Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
                <AnimatePresence>
                  {(activeTab === 'browse' ? posts : myPosts).map(post => (
                    <PostCard key={post._id} post={post} />
                  ))}
                </AnimatePresence>
              </div>

              {/* Pagination */}
              {activeTab === 'browse' && totalPages > 1 && (
                <div className="flex justify-center">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="px-2 sm:px-3 py-2 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      <span className="hidden sm:inline">Previous</span>
                      <span className="sm:hidden">Prev</span>
                    </button>
                    <span className="px-2 sm:px-3 py-2 text-sm text-gray-600">
                      <span className="hidden sm:inline">Page {currentPage} of {totalPages}</span>
                      <span className="sm:hidden">{currentPage}/{totalPages}</span>
                    </span>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="px-2 sm:px-3 py-2 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      <span className="hidden sm:inline">Next</span>
                      <span className="sm:hidden">Next</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Empty State */}
              {(activeTab === 'browse' ? posts : myPosts).length === 0 && (
                <div className="text-center py-8 sm:py-12">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                    <ExclamationTriangleIcon className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" />
                  </div>
                  <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">
                    No {activeTab === 'browse' ? 'items' : 'posts'} found
                  </h3>
                  <p className="text-sm sm:text-base text-gray-600 px-4">
                    {activeTab === 'browse' 
                      ? 'Try adjusting your search criteria or check back later.'
                      : 'You haven\'t posted any items yet.'
                    }
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Create Modal */}
        <Modal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          title="Post Found/Lost Item"
        >
          <CreateForm
            onSubmit={handleSubmit}
            onCancel={() => setShowCreateModal(false)}
            submitting={submitting}
          />
        </Modal>

        {/* Details Modal */}
        <Modal
          isOpen={showDetailsModal}
          onClose={() => setShowDetailsModal(false)}
          title="Item Details"
        >
          {selectedPost && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getTypeColor(selectedPost.type)}`}>
                  {selectedPost.type === 'found' ? '🔍 Found' : '❓ Lost'}
                </span>
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(selectedPost.status)}`}>
                  {selectedPost.status === 'pending' && '⏳ Pending Approval'}
                  {selectedPost.status === 'active' && '🟢 Active'}
                  {selectedPost.status === 'claimed' && '✅ Claimed'}
                  {selectedPost.status === 'closed' && '🔒 Closed'}
                  {selectedPost.status === 'rejected' && '❌ Rejected'}
                </span>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {selectedPost.title}
                </h3>
                <p className="text-gray-600 mb-4">
                  {selectedPost.description}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <p className="text-gray-900">{selectedPost.category}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Posted by</label>
                  <p className="text-gray-900">{selectedPost.student?.name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Posted on</label>
                  <p className="text-gray-900">
                    {new Date(selectedPost.createdAt).toLocaleDateString()}
                  </p>
                </div>
                {selectedPost.status === 'claimed' && selectedPost.claimedBy && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Claimed by</label>
                    <p className="text-gray-900">{selectedPost.claimedBy?.name}</p>
                  </div>
                )}
                {selectedPost.status === 'claimed' && selectedPost.claimedAt && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Claimed on</label>
                    <p className="text-gray-900">
                      {new Date(selectedPost.claimedAt).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>



              {selectedPost.student?._id !== user?._id && selectedPost.status === 'active' && (
                <div className="pt-4 border-t border-gray-200">
                  <button
                    onClick={() => handleClaim(selectedPost._id)}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Claim This Item
                  </button>
                </div>
              )}
            </div>
          )}
        </Modal>

        {/* Edit Modal */}
        <Modal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          title="Edit Post"
        >
          {selectedPost && (
            <CreateForm
              onSubmit={handleUpdate}
              onCancel={() => setShowEditModal(false)}
              submitting={submitting}
              initialForm={{
                title: selectedPost.title,
                description: selectedPost.description,
                type: selectedPost.type,
                category: selectedPost.category
              }}
            />
          )}
        </Modal>
      </div>
    </>
  );
};

export default FoundLost; 