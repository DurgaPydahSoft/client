import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/axios';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import LoadingSpinner from '../../components/LoadingSpinner';
import jsPDF from 'jspdf';
import { UserIcon, CheckCircleIcon, ClockIcon, ExclamationCircleIcon, PhotoIcon } from '@heroicons/react/24/outline';

const TimelineItem = ({ status, timestamp, note, assignedTo, isLast }) => (
  <div className="group relative py-2 sm:py-3 pl-6 sm:pl-8 lg:pl-32">
    <div className="mb-1 flex flex-col items-start before:absolute before:left-1.5 sm:before:left-2 before:h-full before:-translate-x-1/2 before:translate-y-2 sm:before:translate-y-3 before:self-start before:bg-slate-300 before:px-px group-last:before:hidden after:absolute after:left-1.5 sm:after:left-2 after:box-content after:h-1.5 sm:after:h-2 after:w-1.5 sm:after:w-2 after:-translate-x-1/2 after:translate-y-1 sm:after:translate-y-1.5 after:rounded-full after:border-2 sm:after:border-4 after:border-slate-50 after:bg-indigo-600 sm:flex-row sm:before:left-0 sm:before:ml-[6.5rem] sm:after:left-0 sm:after:ml-[6.5rem]">
      <time className="left-0 mb-2 sm:mb-3 inline-flex h-5 sm:h-6 w-20 sm:w-24 translate-y-0.5 items-center justify-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-600 uppercase sm:absolute sm:mb-0">
        {new Date(timestamp).toLocaleDateString(undefined, { month: 'short', year: 'numeric', day: 'numeric' })}
      </time>
      <div className="text-sm sm:text-base lg:text-xl font-bold text-slate-900 break-words">{status}</div>
    </div>
    {note && note.trim() && (
      <div className="text-slate-500 text-xs sm:text-sm mb-1 break-words leading-relaxed">{note}</div>
    )}
        {assignedTo && (
      <div className="flex items-center gap-1 text-xs text-gray-600 mt-1 flex-wrap">
            <span className="break-words">Assigned to: {assignedTo.name}</span>
        {assignedTo.category && <span className="text-xs text-gray-500 flex-shrink-0">({assignedTo.category})</span>}
      </div>
    )}
  </div>
);

const MyComplaints = () => {
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
      console.log('Initial fetch of complaints for user:', user);
      fetchComplaints();
    }
  }, [user]);

  const fetchComplaints = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('Fetching complaints...');
      const res = await api.get('/api/complaints/my');
      console.log('Complaints response:', res.data);
      
      // Handle the new response format
      let complaintsData;
      if (res.data?.success && res.data.data?.complaints) {
        complaintsData = res.data.data.complaints;
      } else if (Array.isArray(res.data)) {
        // Fallback for old format
        complaintsData = res.data;
      } else {
        console.error('Invalid complaints data format:', res.data);
        setError('Received invalid data format from server');
        return;
      }

      // Log sample complaint data for debugging
      if (complaintsData.length > 0) {
        console.log('Sample complaint data:', {
          id: complaintsData[0]._id,
          title: complaintsData[0].title,
          hasAssignedTo: !!complaintsData[0].assignedTo,
          assignedToDetails: complaintsData[0].assignedTo
        });
      }

      // Sort complaints by date (newest first)
      complaintsData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setComplaints(complaintsData);
      
    } catch (err) {
      console.error('Error fetching complaints:', err);
      if (err.response?.status === 401) {
        toast.error('Your session has expired. Please log in again.');
      } else {
        setError('Failed to fetch complaints. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const openDetails = async complaint => {
    if (!complaint || typeof complaint !== 'object') {
      console.error('Invalid complaint object:', complaint);
      toast.error('Invalid complaint data');
      return;
    }

    console.log('Opening complaint details:', {
      id: complaint._id,
      title: complaint.title,
      hasAssignedTo: !!complaint.assignedTo,
      assignedToDetails: complaint.assignedTo
    });

    const complaintId = complaint._id;
    if (!complaintId) {
      console.error('Complaint missing ID:', complaint);
      toast.error('Invalid complaint data');
      return;
    }

    // Set the selected complaint with the data we already have
    setSelected(complaint);
    setTimeline([]);
    setTimelineLoading(true);
    setFeedback('');
    setFeedbackComment('');

    try {
      // Fetch timeline data
      console.log('Fetching timeline for complaint:', complaintId);
      const res = await api.get(`/api/complaints/${complaintId}/timeline`);
      console.log('Timeline response:', res.data);
      
      if (res.data?.success && res.data.data) {
        const { timeline: timelineData, currentAssignedTo } = res.data.data;
        
        // Update the selected complaint with the current assigned member if different
        if (currentAssignedTo && 
            (!complaint.assignedTo || 
             currentAssignedTo._id !== complaint.assignedTo._id)) {
          setSelected(prev => ({
            ...prev,
            assignedTo: currentAssignedTo
          }));
        }

        // Sort timeline by date (oldest first)
        const sortedTimeline = timelineData.sort((a, b) => 
          new Date(a.timestamp) - new Date(b.timestamp)
        );
        
        console.log('Timeline data received:', sortedTimeline);
        console.log('Timeline entries with notes:', sortedTimeline.filter(entry => entry.note));
        
        setTimeline(sortedTimeline);
      } else {
        console.error('Invalid timeline data format:', res.data);
        setTimeline([{
          status: complaint.currentStatus,
          timestamp: complaint.createdAt || new Date().toISOString(),
          note: 'Complaint created',
          assignedTo: complaint.assignedTo
        }]);
      }
    } catch (err) {
      console.error('Error fetching timeline:', err);
      setTimeline([{
        status: complaint.currentStatus,
        timestamp: complaint.createdAt || new Date().toISOString(),
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

  const handleFeedback = async e => {
    e.preventDefault();
    if (!selected) return;
    if (submittingFeedback) return;
    
    setSubmittingFeedback(true);
    try {
      const res = await api.post(`/api/complaints/${selected._id}/feedback`, {
        isSatisfied: feedback === 'satisfied',
        comment: feedbackComment
      });
      
      if (res.data.success) {
        // Update the selected complaint with the feedback
        setSelected(prev => ({
          ...prev,
          feedback: {
            isSatisfied: feedback === 'satisfied',
            comment: feedbackComment,
            timestamp: new Date().toISOString()
          }
        }));
        
        // Update the complaints list
        setComplaints(prev => 
          prev.map(c => 
            c._id === selected._id 
              ? {
                  ...c,
                  feedback: {
                    isSatisfied: feedback === 'satisfied',
                    comment: feedbackComment,
                    timestamp: new Date().toISOString()
                  }
                }
              : c
          )
        );

        // Refresh timeline to show any status changes from feedback
        try {
          const timelineRes = await api.get(`/api/complaints/${selected._id}/timeline`);
          if (timelineRes.data?.success && timelineRes.data.data) {
            const { timeline: timelineData, currentAssignedTo } = timelineRes.data.data;
            const sortedTimeline = timelineData.sort((a, b) => 
              new Date(a.timestamp) - new Date(b.timestamp)
            );
            setTimeline(sortedTimeline);
            
            // Update selected complaint with new status if changed
            if (timelineData.length > 0) {
              const latestStatus = timelineData[timelineData.length - 1].status;
              setSelected(prev => ({
                ...prev,
                currentStatus: latestStatus,
                assignedTo: currentAssignedTo
              }));
            }
          }
        } catch (timelineError) {
          console.error('Error refreshing timeline after feedback:', timelineError);
        }

        toast.success('Feedback submitted successfully');
        setFeedback('');
        setFeedbackComment('');
      }
    } catch (err) {
      console.error('Error submitting feedback:', err);
      if (err.response?.status === 401) {
        toast.error('Your session has expired. Please log in again.');
        navigate('/login');
      } else {
        toast.error(err.response?.data?.message || 'Failed to submit feedback. Please try again.');
      }
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const handleDownload = () => {
    if (!selected) return;

    try {
      // Initialize PDF document
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 15;
      const contentWidth = pageWidth - (margin * 2);
      
      // Set fonts and colors
      doc.setFont("helvetica");
      doc.setTextColor(59, 130, 246); // Blue color
      
      // Simple header
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("Complaint Details", margin, 20);
      
      // Add date
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 100, 100);
      doc.text(`Date: ${new Date().toLocaleDateString()}`, pageWidth - margin - 40, 20);
      
      // Add a line separator
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, 25, pageWidth - margin, 25);
      
      // Content starts here
      let y = 35;
      
      // Student Details Section
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(59, 130, 246); // Blue
      doc.text("Student Details", margin, y);
      y += 7;
      
      // Get student details
      const studentName = selected.student?.name || 'N/A';
      const studentRoll = selected.student?.rollNumber || selected.student?.roll || 'N/A';
      
      
      // Display student details
      doc.text(`Name: ${studentName}`, margin, y);
      y += 5;
      doc.text(`Roll Number: ${studentRoll}`, margin, y);
      y += 5;
      
      
      // Status badge
      const statusColor = selected.currentStatus === 'Resolved' ? [34, 197, 94] : // green
                         selected.currentStatus === 'In Progress' ? [59, 130, 246] : // blue
                         [234, 179, 8]; // yellow
      doc.setFillColor(statusColor[0], statusColor[1], statusColor[2], 0.1);
      doc.roundedRect(margin, y, 60, 8, 2, 2, "F");
      doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
      doc.setFont("helvetica", "bold");
      doc.text(selected.currentStatus, margin + 5, y + 6);
      
      y += 15;
      
      // Category and Sub-category
      doc.setTextColor(59, 130, 246); // Blue
      doc.setFont("helvetica", "bold");
      doc.text("Category:", margin, y);
      doc.setFont("helvetica", "normal");
      doc.text(selected.category, margin + 25, y);
      
      if (selected.subCategory) {
        y += 7;
        doc.setFont("helvetica", "bold");
        doc.text("Sub-Category:", margin, y);
        doc.setFont("helvetica", "normal");
        doc.text(selected.subCategory, margin + 30, y);
      }
      
      y += 12;
      
      // Description
      doc.setFont("helvetica", "bold");
      doc.text("Description:", margin, y);
      y += 7;
      doc.setFont("helvetica", "normal");
      const splitDescription = doc.splitTextToSize(selected.description, contentWidth);
      doc.text(splitDescription, margin, y);
      y += splitDescription.length * 5 + 10;
      
      // Timeline section
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("Status Timeline", margin, y);
      y += 8;
      
      // Draw timeline line
      const timelineStartY = y;
      doc.setDrawColor(200, 200, 200);
      doc.line(margin + 4, timelineStartY, margin + 4, 250);
      
      doc.setFontSize(9);
      timeline.forEach((item, index) => {
        // Status icon
        const iconColor = item.status === 'Resolved' ? [34, 197, 94] : // green
                         item.status === 'In Progress' ? [59, 130, 246] : // blue
                         [234, 179, 8]; // yellow
        doc.setFillColor(iconColor[0], iconColor[1], iconColor[2], 0.1);
        doc.circle(margin + 4, y, 2, "F");
        
        // Status and timestamp
        doc.setFont("helvetica", "bold");
        doc.setTextColor(iconColor[0], iconColor[1], iconColor[2]);
        doc.text(item.status, margin + 10, y);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 100, 100);
        doc.text(new Date(item.timestamp).toLocaleString(), margin + 45, y);
        y += 5;
        
        // Note
        doc.setTextColor(59, 130, 246); // Blue
        const splitNote = doc.splitTextToSize(item.note, contentWidth - 15);
        doc.text(splitNote, margin + 10, y);
        y += splitNote.length * 4 + 3;
        
        // Assigned to if exists
        if (item.assignedTo) {
          doc.setTextColor(100, 100, 100);
          doc.text(`Assigned to: ${item.assignedTo.name}`, margin + 10, y);
          y += 4;
        }
        
        y += 5; // Space between timeline items
      });
      
      // Save the PDF
      doc.save(`complaint-${selected._id}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF. Please try again.');
    }
  };

  if (!user) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">Please log in to view your complaints.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-6 mt-12 sm:mt-0">
      <div className="flex items-center gap-2 sm:gap-3 lg:gap-4 mb-4 sm:mb-6 lg:mb-8">
        <div className="p-2 sm:p-2.5 lg:p-3 bg-gradient-to-r from-blue-600 to-blue-800 rounded-xl sm:rounded-2xl shadow-lg shadow-blue-100 flex-shrink-0">
          <svg className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg sm:text-xl lg:text-2xl font-bold bg-gradient-to-r from-blue-900 to-blue-700 bg-clip-text text-transparent truncate">
            My Complaints
          </h2>
          <p className="text-gray-600 text-xs sm:text-sm mt-0.5 sm:mt-1 line-clamp-1">Track and manage your submitted complaints</p>
        </div>
        </div>

      {error ? (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-600 flex items-center gap-3 shadow-sm"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </motion.div>
      ) : complaints.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-white rounded-xl shadow-md p-8 text-center max-w-md mx-auto"
        >
          <div className="w-16 h-16 mx-auto mb-4 text-blue-800">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-700 mb-2">No complaints found</h3>
          <p className="text-gray-500">You haven't submitted any complaints yet.</p>
        </motion.div>
      ) : (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6"
        >
          {complaints.map((c, index) => (
            <motion.div
              key={c._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ y: -5 }}
              className="bg-white rounded-lg sm:rounded-xl shadow-md overflow-hidden border border-gray-100 hover:shadow-lg transition-all duration-300"
            >
              <div className="p-3 sm:p-4 lg:p-6">
                <div className="flex justify-between items-start mb-2 sm:mb-3 lg:mb-4 gap-2">
                  <div className="space-y-1 min-w-0 flex-1">
                    <h3 className="font-semibold text-blue-900 text-sm sm:text-base lg:text-lg line-clamp-2 leading-tight">{c.title}</h3>
                    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                      <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium truncate max-w-full">
                        {c.category}
                      </span>
                      {c.subCategory && (
                        <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-cyan-50 text-cyan-700 rounded-full text-xs font-medium truncate max-w-full">
                          {c.subCategory}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className={`px-1.5 sm:px-2 lg:px-2.5 py-0.5 sm:py-1 rounded-full text-xs font-medium flex-shrink-0 ${
                    c.currentStatus === 'Resolved' ? 'bg-green-100 text-green-800' :
                    c.currentStatus === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {c.currentStatus}
                  </span>
                </div>
                
                <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-gray-500 mb-2 sm:mb-3 lg:mb-4">
                  <svg className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="truncate">{new Date(c.createdAt).toLocaleDateString()}</span>
                </div>

                {c.assignedTo && (
                  <div className="flex items-start gap-1.5 sm:gap-2 text-xs sm:text-sm text-gray-600 mb-2 sm:mb-3 lg:mb-4">
                    <UserIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0 mt-0.5" />
                    <div className="flex flex-col min-w-0 flex-1">
                      <div className="flex items-center gap-1 flex-wrap">
                        <span className="truncate">Assigned to: {c.assignedTo.name}</span>
                        {c.assignedTo.category && <span className="text-xs text-gray-500 flex-shrink-0">({c.assignedTo.category})</span>}
                      </div>
                      {c.assignedTo.phone && (
                        <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                          <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          <span className="truncate">{c.assignedTo.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <p className="text-gray-600 text-xs sm:text-sm line-clamp-3 mb-3 sm:mb-4 leading-relaxed">{c.description}</p>

                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {c.feedback && (
                      <span className={`px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-xs font-medium ${
                        c.feedback.isSatisfied ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {c.feedback.isSatisfied ? 'Satisfied' : 'Not Satisfied'}
                      </span>
                    )}
                    {/* Show feedback required badge if resolved and feedback is missing */}
                    {!c.feedback && c.currentStatus === 'Resolved' && (
                      <span className="text-center px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 animate-pulse break-words">
                        Feedback required
                      </span>
                    )}
                  </div>
                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => openDetails(c)}
                    className="w-full sm:w-auto text-xs sm:text-sm font-medium text-blue-600 hover:text-blue-800 flex items-center justify-center gap-1.5 sm:gap-1 py-1.5 sm:py-2 px-3 sm:px-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                  >
                    <span>View Details</span>
                    <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </motion.button>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Details Modal */}
      <AnimatePresence>
        {selected && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="fixed inset-0 bg-black bg-opacity-30 backdrop-blur-sm flex items-center justify-center z-50 p-0 sm:p-2 lg:p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 20, opacity: 0 }}
              transition={{ 
                duration: 0.3, 
                ease: "easeOut",
                opacity: { duration: 0.2 },
              }}
              className="bg-white rounded-none sm:rounded-xl shadow-2xl w-full h-full sm:h-auto sm:max-w-lg sm:max-h-[90vh] overflow-y-auto border-0 sm:border border-gray-100 overflow-x-hidden"
              style={{ 
                boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)" 
              }}
            >
              <div className="relative">
                <div className="absolute right-0 top-0 flex items-center z-10 bg-white sm:bg-transparent rounded-bl-lg sm:rounded-none">
                  {/* Download Button */}
                  <button
                    className="p-2 sm:p-2.5 text-gray-400 hover:text-blue-600 transition-all duration-200 active:bg-gray-100 sm:active:bg-transparent"
                    onClick={handleDownload}
                    title="Download Details as PDF"
                  >
                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </button>
                  {/* Close Button */}
                  <div className="border-l border-gray-200">
                    <button
                      className="p-2 sm:p-2.5 text-gray-400 hover:text-red-600 transition-all duration-200 active:bg-gray-100 sm:active:bg-transparent"
                      onClick={() => setSelected(null)}
                      disabled={submittingFeedback}
                      title="Close"
                    >
                      <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="p-3 sm:p-4 lg:p-6">
                  <h3 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900 mb-2 sm:mb-3 lg:mb-4 pr-8 sm:pr-12 break-words leading-tight">{selected.title}</h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 lg:gap-4 mb-3 sm:mb-4 lg:mb-6">
                    <div className="bg-gray-50 p-2.5 sm:p-3 lg:p-4 rounded-lg">
                      <div className="flex items-center gap-1.5 sm:gap-2 mb-1 sm:mb-2">
                        <UserIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-gray-500 flex-shrink-0" />
                        <span className="font-medium text-gray-700 text-xs sm:text-sm lg:text-base">Student Details</span>
                      </div>
                      <p className="text-gray-600 text-xs sm:text-sm truncate">{selected.student?.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5 truncate">Roll No: {selected.student?.rollNumber || selected.student?.roll || 'N/A'}</p>
                    </div>

                    <div className="bg-gray-50 p-2.5 sm:p-3 lg:p-4 rounded-lg">
                      <div className="flex items-center gap-1.5 sm:gap-2 mb-1 sm:mb-2">
                        <ClockIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-gray-500 flex-shrink-0" />
                        <span className="font-medium text-gray-700 text-xs sm:text-sm lg:text-base">Status Information</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          selected.currentStatus === 'Resolved' ? 'bg-green-100 text-green-800' :
                          selected.currentStatus === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                          selected.currentStatus === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {selected.currentStatus}
                        </span>
                        {selected.isReopened && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            Reopened
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Add image display section */}
                    {selected.imageUrl && (
                      <div className="col-span-1 sm:col-span-2 bg-gray-50 p-2.5 sm:p-3 lg:p-4 rounded-lg">
                        <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                          <PhotoIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-gray-500 flex-shrink-0" />
                          <span className="font-medium text-gray-700 text-xs sm:text-sm lg:text-base">Complaint Image</span>
                        </div>
                        <div className="relative aspect-video w-full overflow-hidden rounded-lg">
                          <img
                            src={selected.imageUrl}
                            alt="Complaint"
                            className="object-cover w-full h-full hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                      </div>
                    )}

                    {/* Assigned Member Information */}
                    {selected.assignedTo && (
                      <div className="col-span-1 sm:col-span-2 bg-blue-50 p-2.5 sm:p-3 lg:p-4 rounded-lg border border-blue-100">
                        <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                          <UserIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-blue-500 flex-shrink-0" />
                          <span className="font-medium text-blue-700 text-xs sm:text-sm lg:text-base">Assigned Member</span>
                        </div>
                        <div className="space-y-1.5 sm:space-y-2">
                          <p className="text-blue-600 text-xs sm:text-sm font-medium break-words">{selected.assignedTo.name}</p>
                          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm text-blue-600">
                            <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-blue-100 rounded-full text-xs font-medium">
                              {selected.assignedTo.category}
                            </span>
                            {selected.assignedTo.phone && (
                              <div className="flex items-center gap-1 min-w-0">
                                <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 lg:w-4 lg:h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                </svg>
                                <span className="truncate">{selected.assignedTo.phone}</span>
                              </div>
                            )}
                            {selected.assignedTo.email && (
                              <div className="flex items-center gap-1 min-w-0 flex-1">
                                <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 lg:w-4 lg:h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                <span className="truncate text-xs">{selected.assignedTo.email}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="mb-4 sm:mb-6">
                    <h4 className="font-medium text-gray-900 text-sm sm:text-base mb-2">Description</h4>
                    <p className="text-gray-600 bg-gray-50 p-3 sm:p-4 rounded-lg text-sm break-words whitespace-pre-wrap overflow-wrap-anywhere leading-relaxed">{selected.description}</p>
                  </div>

                  <div className="mb-4 sm:mb-6">
                    <h4 className="font-medium text-gray-900 text-sm sm:text-base mb-3 sm:mb-4">Timeline</h4>
                    <div className="space-y-3 sm:space-y-4">
                      {timelineLoading ? (
                        <div className="flex justify-center py-4">
                          <LoadingSpinner size="md" />
                        </div>
                      ) : timeline.length > 0 ? (
                        timeline.map((item, index) => (
                          <TimelineItem
                            key={item.timestamp}
                            {...item}
                            isLast={index === timeline.length - 1}
                          />
                        ))
                      ) : (
                        <p className="text-gray-500 text-center py-4 text-sm">No timeline data available</p>
                          )}
                    </div>
                  </div>

                  {/* Feedback Section */}
                  {selected.currentStatus === 'Resolved' && (
                    <div className="border-t border-gray-100 pt-4 sm:pt-6">
                      <div className="font-medium text-blue-900 text-sm sm:text-base mb-3">
                        {selected.feedback ? 'Your Previous Feedback' : 'Provide Feedback'}
                      </div>
                      
                      {selected.feedback ? (
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                              selected.feedback.isSatisfied ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {selected.feedback.isSatisfied ? 'Satisfied' : 'Not Satisfied'}
                            </span>
                            <span className="text-xs text-gray-500">
                              {new Date(selected.feedback.timestamp).toLocaleString()}
                            </span>
                          </div>
                          {selected.feedback.comment && (
                            <p className="text-sm text-gray-600">{selected.feedback.comment}</p>
                          )}
                        </div>
                      ) : (
                        <>
                          <div className="flex gap-3 sm:gap-4 mb-3 sm:mb-4">
                            <motion.button
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => setFeedback('satisfied')}
                              className={`flex-1 px-3 sm:px-4 py-2 sm:py-3 rounded-lg border text-sm ${
                                feedback === 'satisfied'
                                  ? 'bg-green-50 border-green-200 text-green-700 shadow-inner'
                                  : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                              } transition-all`}
                            >
                              <div className="flex items-center justify-center gap-2">
                                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                                </svg>
                                Satisfied
                              </div>
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => setFeedback('not-satisfied')}
                              className={`flex-1 px-3 sm:px-4 py-2 sm:py-3 rounded-lg border text-sm ${
                                feedback === 'not-satisfied'
                                  ? 'bg-red-50 border-red-200 text-red-700 shadow-inner'
                                  : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                              } transition-all`}
                            >
                              <div className="flex items-center justify-center gap-2">
                                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
                                </svg>
                                Not Satisfied
                              </div>
                            </motion.button>
                          </div>
                          {feedback && (
                            <motion.div 
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              className="space-y-3"
                            >
                              <textarea
                                value={feedbackComment}
                                onChange={e => setFeedbackComment(e.target.value)}
                                placeholder="Additional comments (optional)"
                                className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm text-sm"
                                rows="3"
                              />
                              <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={handleFeedback}
                                disabled={submittingFeedback}
                                className={`w-full py-2 sm:py-3 px-4 sm:px-6 rounded-lg font-medium text-white text-sm transition-all duration-300 shadow-md ${
                                  submittingFeedback 
                                    ? 'bg-gray-400 cursor-not-allowed' 
                                    : 'bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600'
                                }`}
                              >
                                {submittingFeedback ? (
                                  <div className="flex items-center justify-center gap-2">
                                    <LoadingSpinner size="sm" className="border-white" />
                                    <span>Submitting...</span>
                                  </div>
                                ) : (
                                  'Submit Feedback'
                                )}
                              </motion.button>
                            </motion.div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MyComplaints;