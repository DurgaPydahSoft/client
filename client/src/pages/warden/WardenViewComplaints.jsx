import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/axios';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import LoadingSpinner from '../../components/LoadingSpinner';
import SEO from '../../components/SEO';
import { 
  UserIcon, 
  CheckCircleIcon, 
  ClockIcon, 
  ExclamationCircleIcon, 
  PhotoIcon,
  BuildingOfficeIcon,
  PlusIcon,
  FunnelIcon,
  EyeIcon
} from '@heroicons/react/24/outline';

const TimelineItem = ({ status, timestamp, note, assignedTo, isLast }) => (
  <div className="group relative py-3 pl-8 sm:pl-32">
    <div className="mb-1 flex flex-col items-start before:absolute before:left-2 before:h-full before:-translate-x-1/2 before:translate-y-3 before:self-start before:bg-slate-300 before:px-px group-last:before:hidden after:absolute after:left-2 after:box-content after:h-2 after:w-2 after:-translate-x-1/2 after:translate-y-1.5 after:rounded-full after:border-4 after:border-slate-50 after:bg-green-600 sm:flex-row sm:before:left-0 sm:before:ml-[6.5rem] sm:after:left-0 sm:after:ml-[6.5rem]">
      <time className="left-0 mb-3 inline-flex h-6 w-24 translate-y-0.5 items-center justify-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-600 uppercase sm:absolute sm:mb-0">
        {new Date(timestamp).toLocaleDateString(undefined, { month: 'short', year: 'numeric', day: 'numeric' })}
      </time>
      <div className="text-base sm:text-xl font-bold text-slate-900">{status}</div>
    </div>
    {note && note.trim() && (
      <div className="text-slate-500 text-sm mb-1">{note}</div>
    )}
    {assignedTo && (
      <div className="flex items-center gap-1 text-xs text-gray-600 mt-1">
        <span>Assigned to: {assignedTo.name}</span>
        {assignedTo.category && <span className="text-xs text-gray-500">({assignedTo.category})</span>}
      </div>
    )}
  </div>
);

const WardenViewComplaints = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [feedbackComment, setFeedbackComment] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all', 'student', 'facility', 'warden'
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'pending', 'in-progress', 'resolved'

  // Add event listener for complaint submission
  useEffect(() => {
    const handleComplaintSubmitted = () => {
      console.log('Complaint submitted event received, refreshing complaints...');
      fetchComplaints();
    };

    window.addEventListener('complaint-submitted', handleComplaintSubmitted);
    return () => {
      window.removeEventListener('complaint-submitted', handleComplaintSubmitted);
    };
  }, []);

  // Initial fetch
  useEffect(() => {
    if (user) {
      console.log('Initial fetch of complaints for warden:', user);
      fetchComplaints();
    }
  }, [user, filter, statusFilter]);

  const fetchComplaints = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('Fetching complaints for warden...');
      let url = '/api/complaints/warden';
      const params = new URLSearchParams();
      
      if (filter !== 'all') {
        params.append('type', filter);
      }
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const res = await api.get(url);
      console.log('Complaints response:', res.data);
      
      // Debug: Log sample complaint data
      if (res.data?.data?.complaints && res.data.data.complaints.length > 0) {
        console.log('Sample complaint assignedTo:', res.data.data.complaints[0].assignedTo);
      }
      
      // Handle the response format
      let complaintsData;
      if (res.data?.success && res.data.data?.complaints) {
        complaintsData = res.data.data.complaints;
      } else if (Array.isArray(res.data)) {
        complaintsData = res.data;
      } else {
        console.error('Invalid complaints data format:', res.data);
        setError('Received invalid data format from server');
        return;
      }

      // Sort complaints by date (newest first)
      complaintsData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setComplaints(complaintsData);
      
    } catch (err) {
      console.error('Error fetching complaints:', err);
      setError('Failed to load complaints');
      toast.error('Failed to load complaints');
    } finally {
      setLoading(false);
    }
  };

  const fetchTimeline = async (complaintId) => {
    console.log('🔍 Fetching timeline for complaint ID:', complaintId);
    setTimelineLoading(true);
    try {
      const res = await api.get(`/api/complaints/warden/${complaintId}/timeline`);
      if (res.data.success) {
        setTimeline(res.data.data.timeline || []);
      }
    } catch (err) {
      console.error('Error fetching timeline:', err);
      toast.error('Failed to load timeline');
    } finally {
      setTimelineLoading(false);
    }
  };

  const handleViewDetails = async (complaint) => {
    console.log('🔍 View details for complaint:', complaint);
    console.log('🔍 Complaint ID (_id):', complaint._id);
    console.log('🔍 Complaint ID (id):', complaint.id);
    setSelected(complaint);
    // Try both _id and id
    const complaintId = complaint._id || complaint.id;
    await fetchTimeline(complaintId);
  };

  const handleCloseModal = () => {
    setSelected(null);
    setTimeline([]);
    setFeedback('');
    setFeedbackComment('');
  };

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    if (!feedback.trim()) {
      toast.error('Please select a rating');
      return;
    }

    setSubmittingFeedback(true);
    try {
      const complaintId = selected._id || selected.id;
      const res = await api.post(`/api/complaints/${complaintId}/feedback`, {
        rating: feedback,
        comment: feedbackComment
      });

      if (res.data.success) {
        toast.success('Feedback submitted successfully!');
        setFeedback('');
        setFeedbackComment('');
        handleCloseModal();
        fetchComplaints(); // Refresh the list
      } else {
        toast.error(res.data.message || 'Failed to submit feedback');
      }
    } catch (err) {
      console.error('Error submitting feedback:', err);
      toast.error('Failed to submit feedback');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return 'bg-yellow-500 text-white border-yellow-600';
      case 'in progress':
      case 'in-progress':
        return 'bg-blue-500 text-white border-blue-600';
      case 'resolved':
        return 'bg-green-500 text-white border-green-600';
      case 'rejected':
        return 'bg-red-500 text-white border-red-600';
      case 'received':
        return 'bg-purple-500 text-white border-purple-600';
      default:
        return 'bg-gray-500 text-white border-gray-600';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getComplaintTypeIcon = (type) => {
    if (type === 'facility') {
      return <BuildingOfficeIcon className="w-4 h-4" />;
    }
    return <UserIcon className="w-4 h-4" />;
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-8 mt-12 sm:mt-0">
      <SEO title="View Complaints - Warden" />
      
      {/* Header */}
      <div className="mb-4 sm:mb-6 lg:mb-8">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-green-900 to-green-700 bg-clip-text text-transparent">
              View Complaints
            </h1>
            <p className="text-gray-600 mt-1 sm:mt-2 text-xs sm:text-sm lg:text-base">
              Monitor all complaints including student and facility issues
            </p>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={() => navigate('/warden/dashboard/complaints/raise')}
              className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xs sm:text-sm lg:text-base"
            >
              <PlusIcon className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Raise Complaint</span>
              <span className="sm:hidden">Raise</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 sm:mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4 lg:p-6">
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <div className="flex items-center gap-2">
            <FunnelIcon className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="flex-1 sm:flex-none px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-xs sm:text-sm"
            >
              <option value="all">All Types</option>
              <option value="student">Student Complaints</option>
              <option value="facility">Facility Issues</option>
              <option value="warden">Warden Raised</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="flex-1 sm:flex-none px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-xs sm:text-sm"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="in-progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {/* Complaints List */}
      <div className="space-y-4">
        {error ? (
          <div className="text-center py-8">
            <ExclamationCircleIcon className="w-12 h-12 text-red-400 mx-auto mb-3" />
            <p className="text-gray-500">{error}</p>
          </div>
        ) : complaints.length === 0 ? (
          <div className="text-center py-8">
            <ExclamationCircleIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">No complaints found</p>
          </div>
        ) : (
          complaints.map((complaint, index) => (
            <motion.div
              key={complaint._id || complaint.id || `complaint-${index}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4 lg:p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2 sm:gap-3 lg:gap-4">
                <div className="flex-1">
                  <div className="flex items-start gap-2 sm:gap-3">
                    <div className="flex-shrink-0">
                      {getComplaintTypeIcon(complaint.complaintType || 'student')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1 sm:gap-2 mb-2">
                        <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900 truncate">
                          {complaint.category}
                          {complaint.subCategory && ` - ${complaint.subCategory}`}
                        </h3>
                      </div>
                      
                      {/* Status Row */}
                      <div className="flex flex-wrap items-center gap-1 sm:gap-2 mb-2">
                        <span className={`inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(complaint.currentStatus || complaint.status)} shadow-sm`}>
                          {complaint.currentStatus || complaint.status || 'Pending'}
                        </span>
                      </div>
                      
                      <p className="text-gray-600 mb-2 sm:mb-3 line-clamp-2 text-xs sm:text-sm lg:text-base">{complaint.description}</p>
                      
                      <div className="flex flex-wrap gap-1 sm:gap-2 lg:gap-4 text-xs sm:text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <span>Type:</span>
                          <span className="font-medium">
                            {complaint.complaintType === 'facility' ? 'Facility Issue' : 'Student Complaint'}
                          </span>
                        </div>
                        {complaint.student && (
                          <div className="flex items-center gap-1">
                            <span>Student:</span>
                            <span className="font-medium truncate max-w-20 sm:max-w-none">{complaint.student.name}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <span>Raised:</span>
                          <span className="font-medium">
                            {new Date(complaint.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        {complaint.raisedBy && (
                          <div className="flex items-center gap-1">
                            <span>By:</span>
                            <span className="font-medium capitalize">{complaint.raisedBy}</span>
                          </div>
                        )}
                        {complaint.assignedTo && (
                          <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-gray-600">
                            <UserIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                            <div className="flex flex-col">
                              <div className="flex items-center gap-1">
                                <span>Assigned to:</span>
                                <span className="font-medium truncate max-w-16 sm:max-w-none">{complaint.assignedTo.name}</span>
                              </div>
                              {complaint.assignedTo.phone && (
                                <div className="text-xs text-gray-500 flex items-center gap-1">
                                  <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                  </svg>
                                  <span className="truncate max-w-20 sm:max-w-none">{complaint.assignedTo.phone}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-1 sm:gap-2">
                  {complaint.imageUrl && (
                    <div className="flex-shrink-0">
                      <PhotoIcon className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-gray-400" />
                    </div>
                  )}
                  <button
                    onClick={() => handleViewDetails(complaint)}
                    className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors"
                  >
                    <EyeIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">View Details</span>
                    <span className="sm:hidden">View</span>
                  </button>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={handleCloseModal}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto mx-2 sm:mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-green-600 to-green-800 px-3 sm:px-4 lg:px-6 py-2 sm:py-3 lg:py-4 rounded-t-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 sm:gap-3">
                    {getComplaintTypeIcon(selected.complaintType || 'student')}
                    <div>
                      <h2 className="text-base sm:text-lg lg:text-xl font-semibold text-white">
                        {selected.category}
                        {selected.subCategory && ` - ${selected.subCategory}`}
                      </h2>
                      <p className="text-green-100 text-xs sm:text-sm">
                        {selected.complaintType === 'facility' ? 'Facility Issue' : 'Student Complaint'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleCloseModal}
                    className="text-white hover:text-green-100 transition-colors"
                  >
                    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-3 sm:p-4 lg:p-6 space-y-3 sm:space-y-4 lg:space-y-6">
                {/* Status */}
                <div className="flex flex-wrap gap-1 sm:gap-2">
                  <span className={`inline-flex items-center px-2 sm:px-3 lg:px-4 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-medium border ${getStatusColor(selected.currentStatus || selected.status)} shadow-sm`}>
                    {selected.currentStatus || selected.status || 'Pending'}
                  </span>
                </div>

                {/* Student Details */}
                {selected.student && (
                  <div className="bg-gray-50 p-2 sm:p-3 lg:p-4 rounded-lg">
                    <div className="flex items-center gap-1 sm:gap-2 mb-2 sm:mb-3">
                      <UserIcon className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500" />
                      <span className="font-medium text-gray-700 text-xs sm:text-sm lg:text-base">Student Details</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 sm:gap-2 text-xs sm:text-sm">
                      <div>
                        <span className="text-gray-500">Name:</span>
                        <span className="ml-1 sm:ml-2 font-medium">{selected.student.name}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Roll No:</span>
                        <span className="ml-1 sm:ml-2 font-medium">{selected.student.rollNumber}</span>
                      </div>
                      {selected.student.roomNumber && (
                        <div>
                          <span className="text-gray-500">Room:</span>
                          <span className="ml-1 sm:ml-2 font-medium">{selected.student.roomNumber}</span>
                        </div>
                      )}
                      {selected.student.category && (
                        <div>
                          <span className="text-gray-500">Category:</span>
                          <span className="ml-1 sm:ml-2 font-medium">{selected.student.category}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Description */}
                <div>
                  <h3 className="font-medium text-gray-900 mb-1 sm:mb-2 text-xs sm:text-sm lg:text-base">Description</h3>
                  <p className="text-gray-600 bg-gray-50 p-2 sm:p-3 lg:p-4 rounded-lg text-xs sm:text-sm lg:text-base break-words whitespace-pre-wrap overflow-hidden">{selected.description}</p>
                </div>

                {/* Assigned Member Information */}
                {selected.assignedTo && (
                  <div>
                    <h3 className="font-medium text-gray-900 mb-1 sm:mb-2 text-xs sm:text-sm lg:text-base">Assigned Member</h3>
                    <div className="bg-blue-50 p-2 sm:p-3 lg:p-4 rounded-lg border border-blue-100">
                      <div className="space-y-1 sm:space-y-1.5 lg:space-y-2">
                        <p className="text-xs sm:text-sm lg:text-base text-blue-600 font-medium">{selected.assignedTo.name}</p>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-1.5 lg:gap-2 text-xs sm:text-sm text-blue-600">
                          {selected.assignedTo.phone && (
                            <div className="flex items-center gap-1">
                              <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3 lg:w-4 lg:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                              </svg>
                              {selected.assignedTo.phone}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Image */}
                {selected.imageUrl && (
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2 text-sm sm:text-base">Image</h3>
                    <img
                      src={selected.imageUrl}
                      alt="Complaint"
                      className="max-w-full h-auto rounded-lg border"
                    />
                  </div>
                )}

                {/* Timeline */}
                <div>
                  <h3 className="font-medium text-gray-900 mb-4 text-sm sm:text-base">Timeline</h3>
                  {timelineLoading ? (
                    <LoadingSpinner />
                  ) : timeline.length > 0 ? (
                    <div className="space-y-4">
                      {timeline.map((item, index) => (
                        <TimelineItem
                          key={index}
                          status={item.status}
                          timestamp={item.timestamp}
                          note={item.note}
                          assignedTo={item.assignedTo}
                          isLast={index === timeline.length - 1}
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-4 text-sm sm:text-base">No timeline available</p>
                  )}
                </div>

                {/* Feedback Form (only for resolved complaints) */}
                {selected.status === 'resolved' && (
                  <div className="bg-green-50 p-3 sm:p-4 rounded-lg">
                    <h3 className="font-medium text-gray-900 mb-3 text-sm sm:text-base">Rate this resolution</h3>
                    <form onSubmit={handleFeedbackSubmit} className="space-y-3">
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                          Rating
                        </label>
                        <div className="flex gap-2">
                          {[1, 2, 3, 4, 5].map((rating) => (
                            <button
                              key={rating}
                              type="button"
                              onClick={() => setFeedback(rating.toString())}
                              className={`p-1 sm:p-2 rounded-lg transition-colors text-xs sm:text-sm ${
                                feedback === rating.toString()
                                  ? 'bg-green-600 text-white'
                                  : 'bg-white text-gray-600 hover:bg-gray-50'
                              }`}
                            >
                              {rating}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                          Comment (Optional)
                        </label>
                        <textarea
                          value={feedbackComment}
                          onChange={(e) => setFeedbackComment(e.target.value)}
                          rows="3"
                          className="w-full px-2 sm:px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-xs sm:text-sm"
                          placeholder="Share your experience..."
                        />
                      </div>
                      <div className="flex justify-end">
                        <button
                          type="submit"
                          disabled={submittingFeedback || !feedback}
                          className={`px-3 sm:px-4 py-2 rounded-lg text-white font-medium transition-colors text-xs sm:text-sm ${
                            submittingFeedback || !feedback
                              ? 'bg-gray-400 cursor-not-allowed'
                              : 'bg-green-600 hover:bg-green-700'
                          }`}
                        >
                          {submittingFeedback ? 'Submitting...' : 'Submit Feedback'}
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default WardenViewComplaints; 