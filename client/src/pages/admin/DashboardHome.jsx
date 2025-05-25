import React, { useEffect, useState, useMemo } from 'react';
import api from '../../utils/axios';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, LineChart, Line, AreaChart, Area } from 'recharts';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { CheckCircleIcon, ClockIcon, ArrowTrendingUpIcon, ExclamationTriangleIcon, ArrowPathIcon, UserGroupIcon, UserIcon, MegaphoneIcon, ChartBarIcon, ChartPieIcon, BoltIcon, EyeIcon, ExclamationCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import LoadingSpinner from '../../components/LoadingSpinner';
import { toast } from 'react-hot-toast';
import SEO from '../../components/SEO';

const ALL_CATEGORIES = ['Internet', 'Plumbing', 'Electricity', 'Canteen', 'Others'];

const COLORS = ['#0ea5e9', '#155e75', '#22d3ee', '#1e3a8a', '#0369a1', '#0284c7'];
const CATEGORY_COLORS = [
  '#0ea5e9', // Internet
  '#f59e42', // Plumbing
  '#22d3ee', // Electricity
  '#a78bfa', // Canteen
  '#f43f5e', // Others
  '#10b981', // etc.
];

const STATUS_COLORS = {
  'Received': '#0ea5e9',      // Blue
  'In Progress': '#f59e42',   // Orange
  'Resolved': '#10b981',      // Green
  'Reopened': '#f43f5e',      // Red
  'Pending': '#6366f1',       // Indigo
  'Unassigned': '#a78bfa',    // Purple
  'Uncategorized': '#64748b', // Gray
};

const STATUS_OPTIONS = ['Received','Pending', 'In Progress', 'Resolved', ];

// StatCard component (compact version)
const StatCard = ({ icon: Icon, label, value, color, extra, animateDelay = 0 }) => {
  const [isAnimating, setIsAnimating] = React.useState(true);

  React.useEffect(() => {
    return () => {
      setIsAnimating(false);
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={isAnimating ? { opacity: 1, y: 0 } : { opacity: 1, y: 0 }}
      transition={{ delay: animateDelay, duration: 0.4 }}
      className={`bg-white rounded-lg shadow p-3 flex flex-col items-start border-l-4 ${color} min-w-[100px] w-full`}
    >
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`w-5 h-5 ${color}`} />
        <span className="text-base font-bold text-gray-900">{value}</span>
      </div>
      <div className="text-xs text-gray-500 font-medium leading-tight">{label}</div>
      {extra && <div className="mt-0.5 text-xs text-gray-400">{extra}</div>}
    </motion.div>
  );
};

// AnalyticsCharts Widgets
const AnalyticsCharts = ({ categoryChartData, pieData, trends, barData, totalCategoryComplaints }) => {
  const [isAnimating, setIsAnimating] = React.useState(true);

  React.useEffect(() => {
    return () => {
      setIsAnimating(false);
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={isAnimating ? { opacity: 1, y: 0 } : { opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6"
    >
      {/* Pie Chart: Complaint Status */}
      <div className="bg-white rounded-xl shadow-lg p-4 flex flex-col">
        <div className="flex items-center gap-2 mb-2">
          <ChartPieIcon className="w-5 h-5 text-blue-600" />
          <span className="font-bold text-blue-900">Complaint Status</span>
        </div>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name] || COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
      {/* Line Chart: Complaints Over Time */}
      <div className="bg-white rounded-xl shadow-lg p-4 flex flex-col">
        <div className="flex items-center gap-2 mb-2">
          <BoltIcon className="w-5 h-5 text-cyan-600" />
          <span className="font-bold text-blue-900">Complaints Over Time</span>
        </div>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={barData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" fontSize={12} />
              <YAxis allowDecimals={false} fontSize={12} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#0ea5e9" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      {/* Bar Chart: Complaints by Category */}
      <div className="bg-white rounded-xl shadow-lg p-4 flex flex-col">
        <div className="flex items-center gap-2 mb-2">
          <ChartBarIcon className="w-5 h-5 text-indigo-600" />
          <span className="font-bold text-blue-900">Complaints by Category</span>
        </div>
        <div className="h-48 overflow-x-auto">
          <ResponsiveContainer width={Math.max(ALL_CATEGORIES.length * 100, 300)} height="100%">
            <BarChart data={categoryChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" fontSize={12} />
              <YAxis allowDecimals={false} fontSize={12} />
              <Tooltip content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const { name, value } = payload[0].payload;
                  const percent = totalCategoryComplaints ? ((value / totalCategoryComplaints) * 100).toFixed(1) : 0;
                  return (
                    <div className="bg-white p-2 rounded shadow text-xs">
                      <div><b>{name}</b></div>
                      <div>Count: {value}</div>
                      <div>Percent: {percent}%</div>
                    </div>
                  );
                }
                return null;
              }} />
              <Bar dataKey="value" fill="#0ea5e9">
                {categoryChartData.map((entry, idx) => (
                  <Cell key={`cell-${idx}`} fill={CATEGORY_COLORS[idx % CATEGORY_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </motion.div>
  );
};

// Member Assignment Heatmap
const MemberAssignmentHeatmap = ({ members, complaints }) => {
  // Build analytics per member
  const memberStats = useMemo(() => {
    return members.map(member => {
      // Get all complaints assigned to this specific member
      const assigned = complaints.filter(c => {
        if (!c.assignedTo) return false;
        const memberId = member._id || member.id;
        const assignedToId = c.assignedTo._id || c.assignedTo.id;
        return memberId && assignedToId && memberId === assignedToId;
      });

      // Calculate statistics for this member
    const resolved = assigned.filter(c => c.currentStatus === 'Resolved');
      const active = assigned.filter(c => c.currentStatus === 'In Progress');
    const rate = assigned.length ? ((resolved.length / assigned.length) * 100).toFixed(0) : '-';
      
    return {
      name: member.name,
      category: member.category,
      assigned: assigned.length,
      resolved: resolved.length,
        active: active.length,
      rate,
        // Add additional metrics
        pending: assigned.filter(c => c.currentStatus === 'Pending').length,
        reopened: assigned.filter(c => c.isReopened).length
    };
    }).sort((a, b) => b.assigned - a.assigned); // Sort by number of assignments
  }, [members, complaints]);

  return (
    <div className="bg-white rounded-xl shadow-lg p-4 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <UserGroupIcon className="w-5 h-5 text-green-600" />
        <span className="font-bold text-green-900">Member Assignment Heatmap</span>
      </div>
      <div className="overflow-x-auto">
        <div className="min-w-[800px]"> {/* Minimum width to prevent squishing */}
          <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50">
                <th className="px-3 py-2 text-left font-semibold text-gray-600 sticky left-0 bg-gray-50">Name</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-600">Category</th>
                <th className="px-3 py-2 text-center font-semibold text-gray-600">Total</th>
                <th className="px-3 py-2 text-center font-semibold text-gray-600">Active</th>
                <th className="px-3 py-2 text-center font-semibold text-gray-600">Pending</th>
                <th className="px-3 py-2 text-center font-semibold text-gray-600">Resolved</th>
                <th className="px-3 py-2 text-center font-semibold text-gray-600">Rate</th>
          </tr>
        </thead>
            <tbody className="divide-y divide-gray-100">
          {memberStats.map((m, i) => (
                <tr key={i} className="hover:bg-green-50 transition-colors">
                  <td className="px-3 py-2 font-medium text-gray-900 sticky left-0 bg-white">{m.name}</td>
                  <td className="px-3 py-2 text-gray-600">{m.category}</td>
                  <td className="px-3 py-2 text-center">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {m.assigned}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      {m.active}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                      {m.pending}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      {m.resolved}
                    </span>
                  </td>
                  <td className={`px-3 py-2 text-center font-medium ${
                    m.rate === '-' ? 'text-gray-400' : 
                    m.rate >= 80 ? 'text-green-600' : 
                    m.rate >= 50 ? 'text-yellow-600' : 
                    'text-red-600'
                  }`}>
                    {m.rate === '-' ? '-' : `${m.rate}%`}
                  </td>
            </tr>
          ))}
        </tbody>
      </table>
        </div>
      </div>
    </div>
  );
};

// Recent Activity Feed (recent events)
const RealTimeFeed = ({ complaints, announcements, polls }) => {
  // Build a combined feed and limit to 3 items
  const feed = [
    ...complaints.map(c => ({
      type: 'complaint',
      time: new Date(c.createdAt),
      text: c.title || c.description?.slice(0, 40) || 'Complaint',
      status: c.currentStatus,
      by: c.student?.name,
    })),
    ...announcements.map(a => ({
      type: 'announcement',
      time: new Date(a.createdAt),
      text: a.title,
      by: a.createdBy?.name,
    })),
    ...polls.map(p => ({
      type: 'poll',
      time: new Date(p.createdAt),
      text: p.question,
      status: p.status,
    })),
  ].sort((a, b) => b.time - a.time).slice(0, 3); // Changed from 10 to 3

  return (
    <div className="bg-white rounded-xl shadow-lg p-4 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <BoltIcon className="w-5 h-5 text-yellow-600" />
        <span className="font-bold text-yellow-900">Recent Activity</span>
      </div>
      <div className="overflow-y-auto">
      <ul className="space-y-2">
        {feed.length === 0 && <li className="text-xs text-gray-400">No recent activity</li>}
        {feed.map((item, i) => (
            <li key={i} className="flex flex-col sm:flex-row sm:items-center gap-2 text-xs text-gray-700 p-2 hover:bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className={`flex-shrink-0 inline-block w-2 h-2 rounded-full ${
                  item.type === 'complaint' ? 'bg-blue-500' : 
                  item.type === 'announcement' ? 'bg-green-500' : 
                  'bg-purple-500'
                }`}></span>
                <span className="font-semibold truncate">{item.text}</span>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-gray-400 flex-shrink-0">
                <span className="whitespace-nowrap">{item.time.toLocaleString()}</span>
                {item.status && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 whitespace-nowrap">
                    {item.status}
                  </span>
                )}
                {item.by && (
                  <span className="text-gray-400 whitespace-nowrap">by {item.by}</span>
                )}
              </div>
          </li>
        ))}
      </ul>
      </div>
    </div>
  );
};

// Long Pending Popup Component
const LongPendingPopup = ({ isOpen, onClose, complaints, days, onComplaintClick }) => {
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [note, setNote] = useState('');
  const [updating, setUpdating] = useState(false);
  const [members, setMembers] = useState({});
  const [selectedMember, setSelectedMember] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchMembers();
    }
  }, [isOpen]);

  const fetchMembers = async () => {
    try {
      const res = await api.get('/api/admin/members');
      if (!res.data.success) {
        throw new Error(res.data.message || 'Failed to load members data');
      }
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

  const handleComplaintClick = async (complaint) => {
    setSelectedComplaint(complaint);
    setStatus(complaint.currentStatus || 'Received');
    setNote('');
    setSelectedMember(complaint.assignedTo?._id || '');
    setTimeline([]);
    setTimelineLoading(true);

    try {
      const res = await api.get(`/api/complaints/admin/${complaint._id}/timeline`);
      let timelineData;
      if (res.data?.success) {
        timelineData = Array.isArray(res.data.data) ? res.data.data : res.data.data?.timeline || [];
      } else {
        timelineData = [];
      }

      if (!timelineData || timelineData.length === 0) {
        timelineData = [{
          status: complaint.currentStatus,
          timestamp: complaint.createdAt,
          note: 'Complaint created',
          assignedTo: complaint.assignedTo
        }];
      }
      
      timelineData.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      setTimeline(timelineData);
    } catch (err) {
      console.error('Error fetching timeline:', err);
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

  const handleStatusUpdate = async (e) => {
    e.preventDefault();
    if (!selectedComplaint) {
      toast.error('No complaint selected');
      return;
    }

    if (status === 'In Progress' && !selectedMember) {
      toast.error('Please assign a member for In Progress status');
      return;
    }

    const payload = {
      status: status,
      note: note || '',
      memberId: status === 'In Progress' ? selectedMember : null
    };

    setUpdating(true);
    try {
      const statusRes = await api.put(`/api/complaints/admin/${selectedComplaint._id}/status`, payload);

      if (statusRes.data.success) {
        toast.success('Status updated successfully');
        onComplaintClick(selectedComplaint); // Refresh the complaint data
        setSelectedComplaint(null); // Close the details view
      } else {
        throw new Error(statusRes.data.message || 'Failed to update status');
      }
    } catch (err) {
      console.error('Error updating complaint:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to update complaint status';
      toast.error(errorMessage);
    } finally {
      setUpdating(false);
    }
  };

  if (!isOpen) return null;

  // Filter complaints based on the selected days threshold with proper ranges
  const filteredComplaints = complaints.filter(complaint => {
    if (complaint.currentStatus === 'Resolved') return false;
    const activeDuration = complaint.getActiveStatusDuration ? 
      complaint.getActiveStatusDuration() : 
      Math.floor((new Date() - new Date(complaint.createdAt)) / (1000 * 60 * 60 * 24));
    
    // Apply different ranges based on the selected days
    switch (days) {
      case 3:
        return activeDuration > 3 && activeDuration <= 5;
      case 5:
        return activeDuration > 5 && activeDuration <= 7;
      case 7:
        return activeDuration > 7;
      default:
        return false;
    }
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-blue-900">
            {days === 3 ? 'Complaints Pending 3-5 Days' :
             days === 5 ? 'Complaints Pending 5-7 Days' :
             'Complaints Pending Over 7 Days'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
            </div>

        {selectedComplaint ? (
          <div className="p-6 overflow-y-auto">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Complaint Details</h2>
              <p className="text-base text-gray-600">{selectedComplaint.description}</p>
              {selectedComplaint.imageUrl && (
                <div className="mt-4">
                  <div className="relative w-full pt-[56.25%] overflow-hidden rounded-lg border border-gray-200">
                    <img
                      src={selectedComplaint.imageUrl}
                      alt="Complaint"
                      className="absolute inset-0 w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                    />
            </div>
          </div>
              )}
        </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                <div className="flex items-center gap-2 mb-3">
                  <UserIcon className="w-5 h-5 text-gray-500" />
                  <span className="text-base font-medium text-gray-700">Student Details</span>
                </div>
                <div className="space-y-2">
                  <p className="text-base text-gray-600">
                    <span className="font-medium">Name:</span> {selectedComplaint.student?.name || 'N/A'}
                  </p>
                  <p className="text-sm text-gray-500">
                    <span className="font-medium">Roll No:</span> {selectedComplaint.student?.rollNumber || 'N/A'}
                  </p>
                  
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                <div className="flex items-center gap-2 mb-3">
                  <ClockIcon className="w-5 h-5 text-gray-500" />
                  <span className="text-base font-medium text-gray-700">Status Information</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    selectedComplaint.currentStatus === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                    selectedComplaint.currentStatus === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {selectedComplaint.currentStatus}
                  </span>
                  {selectedComplaint.isReopened && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                      Reopened
                    </span>
                  )}
                </div>
                {selectedComplaint.assignedTo && (
                  <div className="mt-2 text-sm text-gray-600">
                    <span className="font-medium">Assigned to:</span> {selectedComplaint.assignedTo.name}
                    <span className="text-gray-500 ml-1">({selectedComplaint.assignedTo.category})</span>
                  </div>
                )}
              </div>
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
                    <div key={`${selectedComplaint._id}-timeline-${i}`} className="flex items-start gap-3">
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
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                            t.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                            t.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
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

            {!selectedComplaint.isLockedForUpdates && (
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
                      <option key={`status-option-${opt}`} value={opt}>{opt}</option>
                    ))}
                  </select>
            </div>

                {status === 'In Progress' && (
                  (() => {
                    const complaintCategory = selectedComplaint?.category;
                    const complaintSubCategory = selectedComplaint?.subCategory;
                    
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
                          onChange={e => setSelectedMember(e.target.value)}
                          required={status === 'In Progress'}
                        >
                          <option value="">Select a member</option>
                          {availableMembersForCategory?.map(member => (
                            <option key={member._id} value={member._id}>
                              {member.name} ({member.category})
                            </option>
                          ))}
                        </select>
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

                <div className="flex gap-4">
                  <button 
                    type="button"
                    onClick={() => setSelectedComplaint(null)}
                    className="flex-1 py-2 px-4 rounded-lg text-gray-700 font-medium border border-gray-300 hover:bg-gray-50 transition-all duration-200"
                  >
                    Back to List
                  </button>
                  <button 
                    type="submit"
                    className={`flex-1 py-2 px-4 rounded-lg text-white font-medium transition-all duration-200 ${
                      updating 
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg'
                    }`}
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
                </div>
              </form>
            )}
          </div>
        ) : (
          <div className="p-4 overflow-y-auto">
            {filteredComplaints.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No complaints pending over {days} days</p>
            ) : (
              <div className="space-y-4">
                {filteredComplaints.map(complaint => (
                  <div
                    key={complaint._id}
                    className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                    onClick={() => handleComplaintClick(complaint)}
                  >
                    <div className="flex justify-between items-start">
            <div>
                        <h4 className="font-medium text-gray-900">
                          {complaint.category}
                          {complaint.subCategory && (
                            <span className="text-gray-500"> - {complaint.subCategory}</span>
                          )}
                        </h4>
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {complaint.description}
                        </p>
            </div>
                      <div className="mt-2 flex items-center gap-2">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          complaint.currentStatus === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                          complaint.currentStatus === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {complaint.currentStatus}
                        </span>
                        <span className="text-xs text-gray-500">
                          {complaint.getActiveStatusDuration ? 
                            complaint.getActiveStatusDuration() : 
                            Math.floor((new Date() - new Date(complaint.createdAt)) / (1000 * 60 * 60 * 24))} days pending
                        </span>
          </div>
        </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const DashboardHome = () => {
  const [complaints, setComplaints] = useState([]);
  const [totalStudents, setTotalStudents] = useState(0);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('week');
  const [categoryGraphStartDate, setCategoryGraphStartDate] = useState('');
  const [categoryGraphEndDate, setCategoryGraphEndDate] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [announcements, setAnnouncements] = useState([]);
  const [polls, setPolls] = useState([]);
  const [debugOpen, setDebugOpen] = useState(false);
  const [debugData, setDebugData] = useState({});
  const [members, setMembers] = useState([]);
  const [selectedDays, setSelectedDays] = useState(null);
  const navigate = useNavigate();

  // Calculate complaints by threshold
  const complaintsByThreshold = useMemo(() => {
    const now = new Date();
    return complaints.reduce((acc, complaint) => {
      if (complaint.currentStatus !== 'Resolved') {
        const activeDuration = complaint.getActiveStatusDuration ? 
          complaint.getActiveStatusDuration() : 
          Math.floor((now - new Date(complaint.createdAt)) / (1000 * 60 * 60 * 24));
        
        // Update the counting logic to use ranges
        if (activeDuration > 7) acc.over7++;
        if (activeDuration > 5 && activeDuration <= 7) acc.over5++;
        if (activeDuration > 3 && activeDuration <= 5) acc.over3++;
      }
      return acc;
    }, { over3: 0, over5: 0, over7: 0 });
  }, [complaints]);

  // Calculate all derived data from complaints using useMemo to prevent multiple declarations
  const derivedData = useMemo(() => {
    try {
      const complaintsList = Array.isArray(complaints) ? complaints : [];
      
      const processedComplaints = complaintsList.map(c => ({
        ...c,
        _id: c._id || c.id || `temp-${Math.random()}`,
        createdAt: c.createdAt || new Date().toISOString(),
        currentStatus: c.currentStatus || 'Unknown',
        category: c.category || 'Uncategorized'
      }));

      const now = new Date();
      const longPending = processedComplaints.filter(complaint => {
        try {
          // Use getActiveStatusDuration if available, otherwise fallback to total age
          const activeDuration = complaint.getActiveStatusDuration ? 
            complaint.getActiveStatusDuration() : 
            Math.ceil(Math.abs(now - new Date(complaint.createdAt)) / (1000 * 60 * 60 * 24));
          
          return complaint.currentStatus !== 'Resolved' && activeDuration > 7;
        } catch (error) {
          console.error('Error calculating pending days:', error);
          return false;
        }
      }).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

      return {
        longPendingComplaints: longPending,
        reopenedComplaints: processedComplaints.filter(c => c.currentStatus === 'Reopened'),
        unassignedComplaints: processedComplaints.filter(c => !c.assignedTo),
        recentComplaints: [...processedComplaints]
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 5),
        feedbackPending: processedComplaints.filter(c => c.currentStatus === 'Resolved' && !c.feedback)
      };
    } catch (error) {
      console.error('Error calculating derived data:', error);
      return {
        longPendingComplaints: [],
        reopenedComplaints: [],
        unassignedComplaints: [],
        recentComplaints: [],
        feedbackPending: []
      };
    }
  }, [complaints]);

  const { longPendingComplaints, reopenedComplaints, unassignedComplaints, recentComplaints, feedbackPending } = derivedData;

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [complaintsRes, studentCountRes, announcementsRes, pollsRes, membersRes] = await Promise.all([
          api.get('/api/complaints/admin/all'),
          api.get('/api/admin/students/count'),
          api.get('/api/announcements/admin/all'),
          api.get('/api/polls/admin/all'),
          api.get('/api/admin/members'),
        ]);
        
        // Handle complaints response
        let complaintsData = [];
        try {
          if (complaintsRes?.data?.success) {
            const responseData = complaintsRes.data.data;
            if (responseData?.complaints && Array.isArray(responseData.complaints)) {
              complaintsData = responseData.complaints.filter(c => c && typeof c === 'object');
            } else if (Array.isArray(responseData)) {
              complaintsData = responseData.filter(c => c && typeof c === 'object');
            } else {
              console.warn('Unexpected complaints data format:', responseData);
            }
          } else if (Array.isArray(complaintsRes?.data)) {
            complaintsData = complaintsRes.data.filter(c => c && typeof c === 'object');
          } else {
            console.warn('Invalid complaints response format:', complaintsRes?.data);
          }
          
          // Ensure each complaint has required properties and valid dates
          complaintsData = complaintsData.map(c => {
            try {
              const createdAt = c.createdAt ? new Date(c.createdAt) : new Date();
              const resolvedAt = c.resolvedAt ? new Date(c.resolvedAt) : null;
              
              return {
                ...c,
                _id: c._id || c.id || `temp-${Math.random()}`,
                createdAt: createdAt.toISOString(),
                resolvedAt: resolvedAt?.toISOString() || null,
                currentStatus: c.currentStatus || 'Unknown',
                category: c.category || 'Uncategorized',
                // Add helper method for active duration
                getActiveStatusDuration: function() {
                  if (this.currentStatus === 'Resolved' && this.resolvedAt) {
                    return Math.ceil((new Date(this.resolvedAt) - new Date(this.createdAt)) / (1000 * 60 * 60 * 24));
                  }
                  return Math.ceil((new Date() - new Date(this.createdAt)) / (1000 * 60 * 60 * 24));
                }
              };
            } catch (error) {
              console.error('Error processing complaint:', error, c);
              return null;
            }
          }).filter(Boolean); // Remove any null entries from failed processing
        } catch (error) {
          console.error('Error processing complaints data:', error);
          complaintsData = [];
        }

        // Handle student count response
        let studentCountData = 0;
        try {
          if (studentCountRes?.data?.success && typeof studentCountRes.data.data?.count === 'number') {
            studentCountData = studentCountRes.data.data.count;
          } else {
            console.warn('Invalid student count data format:', studentCountRes?.data);
          }
        } catch (error) {
          console.error('Error processing student count:', error);
        }

        // Announcements
        let announcementsData = [];
        try {
          if (announcementsRes?.data?.success && Array.isArray(announcementsRes.data.data)) {
            announcementsData = announcementsRes.data.data
              .filter(a => a && typeof a === 'object')
              .map(a => ({
                ...a,
                createdAt: a.createdAt ? new Date(a.createdAt).toISOString() : new Date().toISOString()
              }))
              .slice(0, 3);
          } else {
            console.warn('Invalid announcements data format:', announcementsRes?.data);
          }
        } catch (error) {
          console.error('Error processing announcements:', error);
        }

        // Polls
        let pollsData = [];
        try {
          if (pollsRes?.data?.success && Array.isArray(pollsRes.data.data)) {
            pollsData = pollsRes.data.data
              .filter(p => p && typeof p === 'object')
              .map(p => ({
                ...p,
                createdAt: p.createdAt ? new Date(p.createdAt).toISOString() : new Date().toISOString(),
                endTime: p.endTime ? new Date(p.endTime).toISOString() : null
              }));
          } else {
            console.warn('Invalid polls data format:', pollsRes?.data);
          }
        } catch (error) {
          console.error('Error processing polls:', error);
        }

        // Members
        let membersData = [];
        try {
          if (membersRes?.data?.success && Array.isArray(membersRes.data.data?.members)) {
            membersData = membersRes.data.data.members.filter(m => m && typeof m === 'object');
          } else {
            console.warn('Invalid members data format:', membersRes?.data);
          }
        } catch (error) {
          console.error('Error processing members:', error);
        }

        // Debug: store raw API data
        setDebugData({
          complaints: complaintsRes.data,
          students: studentCountRes.data,
          announcements: announcementsRes.data,
          polls: pollsRes.data,
          members: membersRes.data
        });

        setComplaints(complaintsData);
        setTotalStudents(studentCountData);
        setAnnouncements(announcementsData);
        setPolls(pollsData);
        setMembers(membersData);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setComplaints([]);
        setTotalStudents(0);
        setAnnouncements([]);
        setPolls([]);
        setMembers([]);
        setDebugData({ error: err.message });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Helper to get start date for week/month
  const getTimeframeStartDate = () => {
    const now = new Date();
    if (timeframe === 'week') {
      const start = new Date(now);
      start.setDate(now.getDate() - 6); // Last 7 days
      return start;
    } else if (timeframe === 'month') {
      const start = new Date(now);
      start.setMonth(now.getMonth() - 1);
      return start;
    }
    return null;
  };

  // Filter complaints by timeframe and date range
  const getFilteredComplaints = () => {
    let filtered = [...complaints];
    const tfStart = getTimeframeStartDate();
    if (tfStart) {
      filtered = filtered.filter(c => new Date(c.createdAt) >= tfStart);
    }
    if (categoryGraphStartDate) {
      const start = new Date(categoryGraphStartDate);
      filtered = filtered.filter(c => new Date(c.createdAt) >= start);
    }
    if (categoryGraphEndDate) {
      const end = new Date(categoryGraphEndDate);
      filtered = filtered.filter(c => new Date(c.createdAt) <= end);
    }
    return filtered;
  };

  // Use filtered complaints everywhere
  const filteredComplaints = getFilteredComplaints();

  // Metrics
  const totalComplaints = filteredComplaints?.length || 0;
  const resolved = filteredComplaints?.filter(c => c.currentStatus === 'Resolved')?.length || 0;
  const pending = filteredComplaints?.filter(c => c.currentStatus !== 'Resolved')?.length || 0;

  // Pie chart data for complaint status
  const statusCounts = filteredComplaints?.reduce((acc, c) => {
    acc[c.currentStatus] = (acc[c.currentStatus] || 0) + 1;
    return acc;
  }, {}) || {};
  const pieData = Object.entries(statusCounts).map(([status, value]) => ({ name: status, value }));

  // Bar chart data (complaints per day)
  const barData = Object.values(
    filteredComplaints?.reduce((acc, c) => {
      const rawDate = new Date(c.createdAt);
      const formattedDate = rawDate.toLocaleDateString();
      if (!acc[formattedDate]) {
        acc[formattedDate] = { date: formattedDate, rawDate, count: 0 };
      }
      acc[formattedDate].count++;
      return acc;
    }, {}) || {}
  );

  // Sort barData by rawDate ascending for the line chart
  const sortedBarData = [...barData].sort((a, b) => a.rawDate - b.rawDate);

  // Normalize category names in reducer
  const categoryData = filteredComplaints?.reduce((acc, c) => {
    let cat = c.category ? String(c.category).trim() : '';
    if (cat === 'Maintenance' && c.subCategory) {
      cat = String(c.subCategory).trim();
    }
    cat = cat.charAt(0).toUpperCase() + cat.slice(1).toLowerCase(); // Normalize
    if (!cat) cat = 'Uncategorized';
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {}) || {};

  const categoryChartData = ALL_CATEGORIES.map(category => ({
    name: category,
    value: categoryData[category] || 0
  }));

  // Response time calculation
  const responseTime = filteredComplaints
    ?.filter(c => c.currentStatus === 'Resolved')
    ?.reduce((acc, c) => {
      const created = new Date(c.createdAt);
      const resolved = new Date(c.resolvedAt);
      return acc + (resolved - created) / (1000 * 60 * 60 * 24); // days
    }, 0) / (resolved || 1) || 0;

  // Monthly trends (filtered)
  const trends = Object.entries(
    filteredComplaints?.reduce((acc, c) => {
      const month = new Date(c.createdAt).toLocaleString('default', { month: 'short' });
      acc[month] = acc[month] || { month, count: 0, resolved: 0 };
      acc[month].count++;
      if (c.currentStatus === 'Resolved') acc[month].resolved++;
      return acc;
    }, {}) || {}
  ).map(([, value]) => value);

  // For category chart tooltips
  const totalCategoryComplaints = categoryChartData.reduce((sum, d) => sum + d.value, 0);

  // Polls analytics
  const activePolls = polls.filter(p => p.status === 'active');
  const scheduledPolls = polls.filter(p => p.status === 'scheduled');
  const endedPolls = polls.filter(p => p.status === 'ended');
  const latestPoll = polls[0];

  // Calculate additional KPIs from filtered complaints
  const kpiMetrics = useMemo(() => {
    return {
      inProgress: filteredComplaints.filter(c => c.currentStatus === 'In Progress').length,
      reopened: filteredComplaints.filter(c => c.isReopened).length,
      longPending: filteredComplaints.filter(c => c.currentStatus !== 'Resolved' && ((new Date() - new Date(c.createdAt)) / (1000 * 60 * 60 * 24) > 7)).length
    };
  }, [filteredComplaints]);

  const { inProgress, reopened, longPending } = kpiMetrics;

  const avgResolution7 = (() => {
    const last7 = filteredComplaints.filter(c => c.currentStatus === 'Resolved' && (new Date() - new Date(c.resolvedAt)) / (1000 * 60 * 60 * 24) <= 7);
    if (!last7.length) return '-';
    return (last7.reduce((acc, c) => acc + ((new Date(c.resolvedAt) - new Date(c.createdAt)) / (1000 * 60 * 60 * 24)), 0) / last7.length).toFixed(1) + 'd';
  })();
  const avgResolution30 = (() => {
    const last30 = filteredComplaints.filter(c => c.currentStatus === 'Resolved' && (new Date() - new Date(c.resolvedAt)) / (1000 * 60 * 60 * 24) <= 30);
    if (!last30.length) return '-';
    return (last30.reduce((acc, c) => acc + ((new Date(c.resolvedAt) - new Date(c.createdAt)) / (1000 * 60 * 60 * 24)), 0) / last30.length).toFixed(1) + 'd';
  })();

  // Use derived data from the useMemo hook above

  return (
    <>
      <SEO 
        title="Admin Dashboard"
        description="Manage hostel complaints, track resolution status, and handle student grievances. Comprehensive admin portal for hostel complaint management."
        keywords="Admin Dashboard, Complaint Management, Hostel Administration, Grievance Resolution, Admin Portal, Hostel Services"
      />
    <div className="p-2 sm:p-3 md:p-4 mt-12 sm:mt-0 w-full">
      {/* Header with Filters */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-blue-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-1">Welcome back! Here's what's happening today.</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <div className="flex gap-2 bg-white p-2 rounded-lg shadow-sm">
            <button
              onClick={() => setTimeframe('week')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                timeframe === 'week' 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setTimeframe('month')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                timeframe === 'month' 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Month
            </button>
          </div>
          <div className="flex gap-2">
            <input 
              type="date" 
              value={categoryGraphStartDate}
              onChange={e => setCategoryGraphStartDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
            <input 
              type="date" 
              value={categoryGraphEndDate}
              onChange={e => setCategoryGraphEndDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>
        </div>
      </div>
      {/* Top KPIs Section (compact) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 mb-4">
        <StatCard icon={ArrowTrendingUpIcon} label="Total Complaints" value={totalComplaints} color="border-blue-500 text-blue-600" animateDelay={0.05} />
        <StatCard icon={ClockIcon} label="In Progress" value={inProgress} color="border-yellow-500 text-yellow-600" animateDelay={0.1} />
        <StatCard icon={CheckCircleIcon} label="Resolved" value={resolved} color="border-green-500 text-green-600" animateDelay={0.15} />
        <StatCard icon={ArrowPathIcon} label="Reopened" value={reopened} color="border-cyan-500 text-cyan-600" animateDelay={0.2} />
        
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Analytics Charts */}
          <AnalyticsCharts
            categoryChartData={categoryChartData}
            pieData={pieData}
            trends={trends}
            barData={sortedBarData}
            totalCategoryComplaints={totalCategoryComplaints}
          />

          {/* Long Pending Complaints Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div 
              onClick={() => setSelectedDays(7)}
              className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 cursor-pointer hover:shadow-xl transition-all duration-300"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-full bg-red-100">
                  <ExclamationTriangleIcon className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-red-900">Over 7 Days</h3>
                  <p className="text-sm text-red-600">Critical attention needed</p>
                </div>
              </div>
              <div className="text-3xl font-bold text-red-600">{complaintsByThreshold.over7}</div>
            </div>

            <div 
              onClick={() => setSelectedDays(5)}
              className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 cursor-pointer hover:shadow-xl transition-all duration-300"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-full bg-orange-100">
                  <ExclamationCircleIcon className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-orange-900">5-7 Days</h3>
                  <p className="text-sm text-orange-600">High priority</p>
                </div>
              </div>
              <div className="text-3xl font-bold text-orange-600">{complaintsByThreshold.over5}</div>
            </div>

            <div 
              onClick={() => setSelectedDays(3)}
              className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 cursor-pointer hover:shadow-xl transition-all duration-300"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-full bg-yellow-100">
                  <ClockIcon className="w-6 h-6 text-yellow-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-yellow-900">3-5 Days</h3>
                  <p className="text-sm text-yellow-600">Needs attention</p>
                </div>
              </div>
              <div className="text-3xl font-bold text-yellow-600">{complaintsByThreshold.over3}</div>
            </div>
          </div>

          {/* Three Column Layout for Recent Activity, Announcements, and Polls */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Recent Activity */}
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
              <div className="flex items-center gap-2 mb-4">
                <BoltIcon className="w-5 h-5 text-yellow-600" />
                <span className="font-bold text-yellow-900">Recent Activity</span>
              </div>
              <div className="overflow-y-auto">
                <ul className="space-y-2">
                  {recentComplaints.slice(0, 3).map((complaint, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${
                        complaint.currentStatus === 'Resolved' ? 'bg-green-100' : 'bg-yellow-100'
                      }`}>
                        <svg className={`w-5 h-5 ${
                          complaint.currentStatus === 'Resolved' ? 'text-green-600' : 'text-yellow-600'
                        }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                          <p className="text-sm font-semibold text-gray-900 truncate">
                          {complaint.title || complaint.description?.slice(0, 40) || 'No Title'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {complaint.student?.name && <>By: {complaint.student.name}</>}
                          {complaint.student?.rollNumber && <> | Roll: {complaint.student.rollNumber}</>}
                        </p>
                        <p className="text-xs text-gray-400">{new Date(complaint.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                      complaint.currentStatus === 'Resolved' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {complaint.currentStatus}
                    </span>
                  </div>
                ))}
                  {recentComplaints.length === 0 && (
                    <div className="text-gray-400 text-sm text-center py-4">No recent activity</div>
                  )}
                </ul>
              </div>
            </div>

            {/* Recent Announcements */}
            <div className="bg-white rounded-xl shadow-lg p-6 border border-blue-100 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <MegaphoneIcon className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-bold text-blue-900">Recent Announcements</h2>
                </div>
                <button
                  className="text-sm text-blue-600 hover:underline"
                  onClick={() => navigate('/admin/announcements')}
                >
                  View All
                </button>
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto max-h-[400px]">
                {announcements.length === 0 && (
                  <div className="text-gray-400 text-sm">No announcements found.</div>
                )}
                {announcements.map((a, idx) => (
                  <div key={a._id || idx} className="flex items-center gap-3 p-2 rounded hover:bg-blue-50 transition">
                    <div className="flex-1">
                      <div className="font-medium text-gray-800 truncate">{a.title}</div>
                      <div className="text-xs text-gray-500">{new Date(a.createdAt).toLocaleDateString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Polls Overview */}
            <div className="bg-white rounded-xl shadow-lg p-6 border border-blue-100 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <ChartPieIcon className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-bold text-blue-900">Polls Overview</h2>
                </div>
                <button
                  className="text-sm text-blue-600 hover:underline"
                  onClick={() => navigate('/admin/polls')}
                >
                  View All
                </button>
              </div>
              <div className="flex gap-3 mb-4">
                <div className="flex flex-col items-center flex-1">
                  <span className="text-blue-700 font-bold text-lg">{activePolls.length}</span>
                  <span className="text-xs text-gray-500">Active</span>
                </div>
                <div className="flex flex-col items-center flex-1">
                  <span className="text-yellow-600 font-bold text-lg">{scheduledPolls.length}</span>
                  <span className="text-xs text-gray-500">Scheduled</span>
                </div>
                <div className="flex flex-col items-center flex-1">
                  <span className="text-gray-500 font-bold text-lg">{endedPolls.length}</span>
                  <span className="text-xs text-gray-500">Ended</span>
                </div>
              </div>
              <div className="overflow-y-auto max-h-[300px]">
              {latestPoll ? (
                  <div className="bg-blue-50 rounded-lg p-3">
                  <div className="font-medium text-blue-900 truncate">{latestPoll.question}</div>
                  <div className="flex gap-2 mt-1 flex-wrap">
                    {latestPoll.options.map((opt, i) => (
                        <span key={`${latestPoll._id}-option-${i}`} className="bg-white border border-blue-200 text-xs px-2 py-1 rounded-full text-blue-700 mr-1 mb-1">
                        {opt.text} ({opt.votes})
                      </span>
                    ))}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Status: <span className={
                        latestPoll.status === 'active' ? 'text-green-700' : 
                        latestPoll.status === 'scheduled' ? 'text-yellow-700' : 
                        'text-gray-500'
                    }>{latestPoll.status.charAt(0).toUpperCase() + latestPoll.status.slice(1)}</span>
                    {latestPoll.endTime && (
                      <> | Ends: {new Date(latestPoll.endTime).toLocaleString()}</>
                    )}
                  </div>
                </div>
              ) : (
                  <div className="text-gray-400 text-sm">No polls found.</div>
              )}
              </div>
            </div>
          </div>

          {/* Member Assignment Heatmap at the bottom */}
          <MemberAssignmentHeatmap members={members} complaints={complaints} />

          {/* Add the LongPendingPopup */}
          <LongPendingPopup
            isOpen={selectedDays !== null}
            onClose={() => setSelectedDays(null)}
            complaints={complaints}
            days={selectedDays}
            onComplaintClick={(complaint) => {
              const updatedComplaints = complaints.map(c => 
                c._id === complaint._id ? complaint : c
              );
              setComplaints(updatedComplaints);
            }}
          />
        </div>
      )}

      {/* Debug Output (collapsible) */}
      <div className="mt-8">
        <button
          className="text-xs text-blue-600 underline mb-2"
          onClick={() => setDebugOpen(v => !v)}
        >
          {debugOpen ? 'Hide' : 'Show'} Debug API Data
        </button>
        {debugOpen && (
          <div className="bg-gray-100 rounded p-4 overflow-x-auto text-xs max-h-96">
            <pre>{JSON.stringify(debugData, null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
    </>
  );
};

export default DashboardHome;