import React, { useEffect, useState, useMemo, useCallback } from 'react';
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
          <ResponsiveContainer width={Math.max(categoryChartData.length * 60, 300)} height="100%">
            <BarChart data={categoryChartData} margin={{ left: 10, right: 10, top: 5, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" fontSize={10} angle={-45} textAnchor="end" height={60} />
              <YAxis allowDecimals={false} fontSize={10} />
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
              <Bar dataKey="value" fill="#0ea5e9" barSize={20}>
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
      const memberId = member._id || member.id;
      
      // Get all complaints assigned to this specific member (including Closed status)
      const assigned = complaints.filter(c => {
        if (!c.assignedTo) return false;
        const assignedToId = c.assignedTo._id || c.assignedTo.id;
        return memberId && assignedToId && memberId === assignedToId;
      });

      // Calculate statistics for this member
      const resolved = assigned.filter(c => c.currentStatus === 'Resolved');
      const active = assigned.filter(c => c.currentStatus === 'In Progress');
      const pending = assigned.filter(c => c.currentStatus === 'Pending');
      const rate = assigned.length ? ((resolved.length / assigned.length) * 100).toFixed(0) : '-';
      
      return {
        name: member.name,
        category: member.category,
        assigned: assigned.length,
        resolved: resolved.length,
        active: active.length,
        rate,
        pending: pending.length,
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
          {memberStats.length === 0 ? (
            <tr>
              <td colSpan="7" className="px-3 py-4 text-center text-gray-500">
                No members found
              </td>
            </tr>
          ) : (
            memberStats.map((m, i) => (
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
            ))
          )}
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
      const res = await api.get('/api/members');
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
    if (complaint.currentStatus === 'Resolved' || complaint.currentStatus === 'Closed') return false;
    const activeDuration = Math.floor((new Date() - new Date(complaint.createdAt)) / (1000 * 60 * 60 * 24));
    
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
  const [members, setMembers] = useState([]);
  const [selectedDays, setSelectedDays] = useState(null);
  const navigate = useNavigate();

  // Safari detection - memoized to prevent unnecessary re-renders
  const isSafari = useMemo(() => /^((?!chrome|android).)*safari/i.test(navigator.userAgent), []);

  // Centralized complaint status constants
  const COMPLAINT_STATUSES = {
    RECEIVED: 'Received',
    PENDING: 'Pending',
    IN_PROGRESS: 'In Progress',
    RESOLVED: 'Resolved',
    REOPENED: 'Reopened',
    CLOSED: 'Closed'
  };

  // Helper function to validate and normalize complaint data (less strict)
  const validateComplaintData = useCallback((complaint) => {
    try {
      if (!complaint || typeof complaint !== 'object') {
        return null;
      }

      // Only filter out completely broken objects
      if (!complaint._id && !complaint.id) {
        return null;
      }

      // Ensure basic fields exist with fallbacks
      const validated = {
        _id: complaint._id || complaint.id,
        createdAt: complaint.createdAt || new Date().toISOString(),
        currentStatus: complaint.currentStatus || 'Unknown',
        category: complaint.category || 'Uncategorized',
        subCategory: complaint.subCategory || null,
        resolvedAt: complaint.resolvedAt || null,
        assignedTo: complaint.assignedTo || null,
        isReopened: Boolean(complaint.isReopened),
        feedback: complaint.feedback || null,
        student: complaint.student || null,
        description: complaint.description || '',
        title: complaint.title || ''
      };

      return validated;
    } catch (error) {
      return null;
    }
  }, []);

  // Helper function to calculate active duration for a complaint
  const calculateActiveDuration = useCallback((complaint) => {
    try {
      if (!complaint || !complaint.createdAt) return 0;
      
      const now = new Date();
      const createdAt = new Date(complaint.createdAt);
      
      // If complaint is resolved and has resolvedAt, calculate duration until resolution
      if (complaint.currentStatus === COMPLAINT_STATUSES.RESOLVED && complaint.resolvedAt) {
        const resolvedAt = new Date(complaint.resolvedAt);
        if (!isNaN(resolvedAt.getTime())) {
          return Math.floor((resolvedAt - createdAt) / (1000 * 60 * 60 * 24));
        }
      }
      
      // Calculate current active duration
      if (!isNaN(createdAt.getTime())) {
        return Math.floor((now - createdAt) / (1000 * 60 * 60 * 24));
      }
      
      return 0;
    } catch (error) {
      return 0;
    }
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
    
    // Check if custom dates are set
    const hasCustomDates = categoryGraphStartDate || categoryGraphEndDate;
    
    if (hasCustomDates) {
      // Use custom date range (ignore week/month toggle)
      if (categoryGraphStartDate) {
        const start = new Date(categoryGraphStartDate);
        filtered = filtered.filter(c => new Date(c.createdAt) >= start);
      }
      if (categoryGraphEndDate) {
        const end = new Date(categoryGraphEndDate);
        // Add 1 day to end date to include the entire end date
        end.setDate(end.getDate() + 1);
        filtered = filtered.filter(c => new Date(c.createdAt) < end);
      }
    } else {
      // Use week/month toggle
      const tfStart = getTimeframeStartDate();
      if (tfStart) {
        filtered = filtered.filter(c => new Date(c.createdAt) >= tfStart);
      }
    }
    
    return filtered;
  };

  // Use filtered complaints for timeframe-based analytics
  const filteredComplaints = getFilteredComplaints();

  // Consolidated analytics calculations using filtered complaints array
  const analyticsData = useMemo(() => {
    try {
      // Use filtered complaints array to respect timeframe selection
      const validComplaints = filteredComplaints
        .map(validateComplaintData)
        .filter(Boolean);

      // Filter out Closed complaints for most analytics
      const activeComplaints = validComplaints.filter(c => c.currentStatus !== COMPLAINT_STATUSES.CLOSED);

      // Calculate status counts (excluding Closed)
      const statusCounts = activeComplaints.reduce((acc, c) => {
        acc[c.currentStatus] = (acc[c.currentStatus] || 0) + 1;
        return acc;
      }, {});

      // Calculate category counts (excluding Closed)
      const categoryCounts = activeComplaints.reduce((acc, c) => {
        let category = c.category || 'Uncategorized';
        if (category === 'Maintenance' && c.subCategory) {
          category = c.subCategory;
        }
        category = category.charAt(0).toUpperCase() + category.slice(1).toLowerCase();
        acc[category] = (acc[category] || 0) + 1;
        return acc;
      }, {});

      // Calculate threshold-based counts (exclude Resolved and Closed)
      const thresholdCounts = validComplaints.reduce((acc, c) => {
        if (c.currentStatus !== COMPLAINT_STATUSES.RESOLVED && c.currentStatus !== COMPLAINT_STATUSES.CLOSED) {
          const duration = calculateActiveDuration(c);
          if (duration > 7) acc.over7++;
          else if (duration > 5) acc.over5++;
          else if (duration > 3) acc.over3++;
        }
        return acc;
      }, { over3: 0, over5: 0, over7: 0 });

      // Calculate response time for resolved complaints
      const resolvedComplaints = validComplaints.filter(c => c.currentStatus === COMPLAINT_STATUSES.RESOLVED);
      const responseTimeData = resolvedComplaints.reduce((acc, c) => {
        const duration = calculateActiveDuration(c);
        if (duration > 0) {
          acc.total += duration;
          acc.count++;
        }
        return acc;
      }, { total: 0, count: 0 });

      const avgResponseTime = responseTimeData.count > 0 ? 
        (responseTimeData.total / responseTimeData.count).toFixed(1) : 0;

      // Calculate daily complaint counts (excluding Closed)
      const dailyCounts = activeComplaints.reduce((acc, c) => {
        try {
          const date = new Date(c.createdAt);
          if (!isNaN(date.getTime())) {
            const formattedDate = date.toLocaleDateString();
            if (!acc[formattedDate]) {
              acc[formattedDate] = { date: formattedDate, rawDate: date, count: 0 };
            }
            acc[formattedDate].count++;
          }
        } catch (error) {
          // Skip complaints with invalid dates
        }
        return acc;
      }, {});

      // Sort daily counts by date
      const sortedDailyCounts = Object.values(dailyCounts)
        .sort((a, b) => a.rawDate - b.rawDate);

      // Calculate monthly trends (excluding Closed)
      const monthlyTrends = activeComplaints.reduce((acc, c) => {
        try {
          const date = new Date(c.createdAt);
          if (!isNaN(date.getTime())) {
            const month = date.toLocaleString('default', { month: 'short' });
            if (!acc[month]) {
              acc[month] = { month, count: 0, resolved: 0 };
            }
            acc[month].count++;
            if (c.currentStatus === COMPLAINT_STATUSES.RESOLVED) {
              acc[month].resolved++;
            }
          }
        } catch (error) {
          // Skip complaints with invalid dates
        }
        return acc;
      }, {});

      return {
        total: validComplaints.filter(c => c.currentStatus !== COMPLAINT_STATUSES.CLOSED).length, // Total excluding Closed
        statusCounts,
        categoryCounts,
        thresholdCounts,
        avgResponseTime,
        dailyCounts: sortedDailyCounts,
        monthlyTrends: Object.values(monthlyTrends),
        resolved: statusCounts[COMPLAINT_STATUSES.RESOLVED] || 0,
        pending: activeComplaints.filter(c => c.currentStatus !== COMPLAINT_STATUSES.RESOLVED).length,
        inProgress: statusCounts[COMPLAINT_STATUSES.IN_PROGRESS] || 0,
        reopened: validComplaints.filter(c => c.isReopened).length, // Include all reopened (including Closed)
        unassigned: activeComplaints.filter(c => !c.assignedTo).length,
        feedbackPending: activeComplaints.filter(c => 
          c.currentStatus === COMPLAINT_STATUSES.RESOLVED && !c.feedback
        ).length,
        recentComplaints: [...activeComplaints] // Recent activity excludes Closed
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 5)
      };
    } catch (error) {
      console.error('Error calculating analytics data:', error);
      return {
        total: 0,
        statusCounts: {},
        categoryCounts: {},
        thresholdCounts: { over3: 0, over5: 0, over7: 0 },
        avgResponseTime: 0,
        dailyCounts: [],
        monthlyTrends: [],
        resolved: 0,
        pending: 0,
        inProgress: 0,
        reopened: 0,
        unassigned: 0,
        feedbackPending: 0,
        recentComplaints: []
      };
    }
  }, [filteredComplaints, validateComplaintData, calculateActiveDuration]);

  // Extract values from analytics data
  const {
    total: totalComplaints,
    resolved,
    pending,
    inProgress,
    reopened,
    unassigned,
    feedbackPending,
    recentComplaints,
    statusCounts,
    categoryCounts,
    thresholdCounts,
    avgResponseTime,
    dailyCounts,
    monthlyTrends
  } = analyticsData;

  // Use the corrected threshold counts
  const complaintsByThreshold = thresholdCounts;

  // Prepare chart data
  const pieData = Object.entries(statusCounts).map(([status, value]) => ({ 
    name: status, 
    value 
  }));

  const categoryChartData = ALL_CATEGORIES.map(category => ({
    name: category,
    value: categoryCounts[category] || 0
  }));

  const totalCategoryComplaints = categoryChartData.reduce((sum, d) => sum + d.value, 0);

  // Polls analytics
  const activePolls = polls.filter(p => p.status === 'active');
  const scheduledPolls = polls.filter(p => p.status === 'scheduled');
  const endedPolls = polls.filter(p => p.status === 'ended');
  const latestPoll = polls[0];

  // Calculate additional KPIs from filtered complaints
  const kpiMetrics = useMemo(() => {
    return {
      inProgress: inProgress,
      reopened: reopened,
      longPending: complaintsByThreshold.over7
    };
  }, [inProgress, reopened, complaintsByThreshold.over7]);

  const { inProgress: kpiInProgress, reopened: kpiReopened, longPending: kpiLongPending } = kpiMetrics;

  const avgResolution7 = (() => {
    const last7Days = complaints.filter(c => c.currentStatus === COMPLAINT_STATUSES.RESOLVED && (new Date() - new Date(c.createdAt)) / (1000 * 60 * 60 * 24) <= 7);
    if (!last7Days.length) return '-';
    return (last7Days.reduce((acc, c) => acc + ((new Date() - new Date(c.createdAt)) / (1000 * 60 * 60 * 24)), 0) / last7Days.length).toFixed(1) + 'd';
  })();
  const avgResolution30 = (() => {
    const last30Days = complaints.filter(c => c.currentStatus === COMPLAINT_STATUSES.RESOLVED && (new Date() - new Date(c.createdAt)) / (1000 * 60 * 60 * 24) <= 30);
    if (!last30Days.length) return '-';
    return (last30Days.reduce((acc, c) => acc + ((new Date() - new Date(c.createdAt)) / (1000 * 60 * 60 * 24)), 0) / last30Days.length).toFixed(1) + 'd';
  })();

  // Use derived data from the useMemo hook above

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        
        
        // Fetch all data in parallel with Safari-specific error handling
        const apiCalls = [
          api.get('/api/complaints/admin/all'),
          api.get('/api/admin/students/count'),
          api.get('/api/announcements/admin/all'),
          api.get('/api/polls/admin/all'),
          api.get('/api/members')
        ];

        // Add Safari-specific timeout handling
        const timeoutDuration = isSafari ? 45000 : 30000; // Longer timeout for Safari
        
        const [complaintsRes, studentsRes, announcementsRes, pollsRes, membersRes] = await Promise.allSettled(
          apiCalls.map(call => 
            Promise.race([
              call,
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Request timeout')), timeoutDuration)
              )
            ])
          )
        );

        // Set complaints data with Safari-specific error handling
        if (complaintsRes.status === 'fulfilled' && complaintsRes.value.data.success) {
          setComplaints(complaintsRes.value.data.data.complaints || []);
        } else {
          console.error('Failed to fetch complaints:', complaintsRes.status === 'fulfilled' ? complaintsRes.value.data : complaintsRes.reason);
          setComplaints([]);
        }

        // Set students count with Safari-specific error handling
        if (studentsRes.status === 'fulfilled' && studentsRes.value.data.success) {
          setTotalStudents(studentsRes.value.data.data.count || 0);
        } else {
          console.error('Failed to fetch students count:', studentsRes.status === 'fulfilled' ? studentsRes.value.data : studentsRes.reason);
          setTotalStudents(0);
        }

        // Set announcements data with Safari-specific error handling
        if (announcementsRes.status === 'fulfilled' && announcementsRes.value.data.success) {
          setAnnouncements(announcementsRes.value.data.data || []);
        } else {
          console.error('Failed to fetch announcements:', announcementsRes.status === 'fulfilled' ? announcementsRes.value.data : announcementsRes.reason);
          setAnnouncements([]);
        }

        // Set polls data with Safari-specific error handling
        if (pollsRes.status === 'fulfilled' && pollsRes.value.data.success) {
          setPolls(pollsRes.value.data.data || []);
        } else {
          console.error('Failed to fetch polls:', pollsRes.status === 'fulfilled' ? pollsRes.value.data : pollsRes.reason);
          setPolls([]);
        }

        // Set members data with Safari-specific error handling
        if (membersRes.status === 'fulfilled' && membersRes.value.data.success) {
          setMembers(membersRes.value.data.data.members || []);
        } else {
          console.error('Failed to fetch members:', membersRes.status === 'fulfilled' ? membersRes.value.data : membersRes.reason);
          setMembers([]);
        }
        
      } catch (err) {
        console.error('📊 Error in fetchData:', err);
        
        
        // Set default values on error
        setComplaints([]);
        setTotalStudents(0);
        setAnnouncements([]);
        setPolls([]);
        setMembers([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [isSafari]);

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
            trends={monthlyTrends}
            barData={dailyCounts}
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
                        complaint.currentStatus === COMPLAINT_STATUSES.RESOLVED ? 'bg-green-100' : 'bg-yellow-100'
                      }`}>
                        <svg className={`w-5 h-5 ${
                          complaint.currentStatus === COMPLAINT_STATUSES.RESOLVED ? 'text-green-600' : 'text-yellow-600'
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
                      complaint.currentStatus === COMPLAINT_STATUSES.RESOLVED ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
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
                  onClick={() => navigate('/admin/dashboard/announcements')}
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
                  onClick={() => navigate('/admin/dashboard/polls')}
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
            complaints={filteredComplaints}
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
    </div>
    </>
  );
};

export default DashboardHome;