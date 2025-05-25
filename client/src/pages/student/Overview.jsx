import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { 
  ChartPieIcon, ClockIcon, CheckCircleIcon, 
  ExclamationCircleIcon, BellIcon 
} from '@heroicons/react/24/outline';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import LoadingSpinner from '../../components/LoadingSpinner';
import { useNavigate } from 'react-router-dom';

const COLORS = ['#0ea5e9', '#22c55e', '#eab308', '#ef4444'];

const Overview = () => {
  const [complaints, setComplaints] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [complaintsRes, announcementsRes] = await Promise.all([
          axios.get('/api/complaints/student/my-complaints'),
          axios.get('/api/announcements')
        ]);
        setComplaints(complaintsRes.data.data.complaints || []);
        setAnnouncements(announcementsRes.data || []);
      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Calculate complaint statistics
  const totalComplaints = complaints.length;
  const resolvedComplaints = complaints.filter(c => c.currentStatus === 'Resolved').length;
  const pendingComplaints = complaints.filter(c => ['Received', 'In Progress'].includes(c.currentStatus)).length;
  const avgResponseTime = complaints.length ? 
    complaints.reduce((acc, c) => acc + (c.responseTime || 0), 0) / complaints.length : 0;

  // Prepare data for pie chart
  const statusData = complaints.reduce((acc, complaint) => {
    acc[complaint.currentStatus] = (acc[complaint.currentStatus] || 0) + 1;
    return acc;
  }, {});

  const pieChartData = Object.entries(statusData).map(([name, value]) => ({
    name,
    value
  }));

  return loading ? (
    <div className="flex justify-center items-center min-h-screen">
      <LoadingSpinner size="lg" />
    </div>
  ) : (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6 mt-16 sm:mt-0">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
        <div className="p-2 sm:p-3 bg-gradient-to-r from-blue-600 to-blue-800 rounded-xl sm:rounded-2xl shadow-lg shadow-blue-100">
          <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        </div>
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-900 to-blue-700 bg-clip-text text-transparent">
            Overview
          </h2>
          <p className="text-gray-600 text-xs sm:text-sm mt-1">Welcome to your student dashboard</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate('/student/raise-complaint')}
          className="bg-white p-3 sm:p-4 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 border border-gray-100 flex items-center gap-3 sm:gap-4"
        >
          <div className="p-2 bg-blue-50 rounded-lg flex-shrink-0">
            <svg className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="text-left min-w-0">
            <h3 className="font-medium text-gray-900 text-sm sm:text-base truncate">Raise a Complaint</h3>
            <p className="text-xs sm:text-sm text-gray-500 truncate">Submit a new complaint</p>
          </div>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate('/student/my-complaints')}
          className="bg-white p-3 sm:p-4 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 border border-gray-100 flex items-center gap-3 sm:gap-4"
        >
          <div className="p-2 bg-green-50 rounded-lg flex-shrink-0">
            <svg className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <div className="text-left min-w-0">
            <h3 className="font-medium text-gray-900 text-sm sm:text-base truncate">My Complaints</h3>
            <p className="text-xs sm:text-sm text-gray-500 truncate">View your complaints</p>
          </div>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate('/student/announcements')}
          className="bg-white p-3 sm:p-4 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 border border-gray-100 flex items-center gap-3 sm:gap-4"
        >
          <div className="p-2 bg-purple-50 rounded-lg flex-shrink-0">
            <svg className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
            </svg>
          </div>
          <div className="text-left min-w-0">
            <h3 className="font-medium text-gray-900 text-sm sm:text-base truncate">Announcements</h3>
            <p className="text-xs sm:text-sm text-gray-500 truncate">View latest updates</p>
          </div>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate('/student/polls')}
          className="bg-white p-3 sm:p-4 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 border border-gray-100 flex items-center gap-3 sm:gap-4"
        >
          <div className="p-2 bg-yellow-50 rounded-lg flex-shrink-0">
            <svg className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div className="text-left min-w-0">
            <h3 className="font-medium text-gray-900 text-sm sm:text-base truncate">Polls</h3>
            <p className="text-xs sm:text-sm text-gray-500 truncate">Participate in polls</p>
          </div>
        </motion.button>
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-md border border-gray-100">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h3 className="text-gray-500 text-xs sm:text-sm font-medium">Total Complaints</h3>
            <div className="p-2 bg-blue-50 rounded-lg">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-gray-900">{totalComplaints}</p>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-md border border-gray-100">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h3 className="text-gray-500 text-xs sm:text-sm font-medium">Resolved</h3>
            <div className="p-2 bg-green-50 rounded-lg">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-gray-900">{resolvedComplaints}</p>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-md border border-gray-100">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h3 className="text-gray-500 text-xs sm:text-sm font-medium">In Progress</h3>
            <div className="p-2 bg-yellow-50 rounded-lg">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-gray-900">{pendingComplaints}</p>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-md border border-gray-100">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h3 className="text-gray-500 text-xs sm:text-sm font-medium">Avg Response Time</h3>
            <div className="p-2 bg-purple-50 rounded-lg">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-gray-900">{Math.round(avgResponseTime)}h</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-8">
        {/* Complaint Status Chart */}
        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-4">Complaints Status</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={pieChartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {pieChartData.map((entry, index) => (
                  <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-4 space-y-2">
            {pieChartData.map((entry, index) => (
              <div key={entry.name} className="flex items-center gap-2">
                <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                <span className="text-xs sm:text-sm text-gray-600">{entry.name}: {entry.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Latest Announcements */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-lg p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h3 className="text-base sm:text-lg font-bold text-gray-800">Latest Announcements</h3>
            <BellIcon className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
          </div>
          <div className="space-y-3 sm:space-y-4">
            {announcements.slice(0, 3).map(announcement => (
              <motion.div
                key={announcement._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 sm:p-4 rounded-lg bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-100"
              >
                {announcement.imageUrl && (
                  <div className="relative w-full pt-[56.25%] mb-3 overflow-hidden rounded-lg">
                    <img
                      src={announcement.imageUrl}
                      alt={announcement.title}
                      className="absolute inset-0 w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                )}
                <h4 className="font-semibold text-blue-900 text-sm sm:text-base mb-1">{announcement.title}</h4>
                <p className="text-xs sm:text-sm text-gray-600 mb-2 line-clamp-2">{announcement.description}</p>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <ClockIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span>{new Date(announcement.createdAt).toLocaleString()}</span>
                </div>
              </motion.div>
            ))}
            {announcements.length === 0 && (
              <div className="text-center text-gray-500 py-4 text-sm">
                No announcements yet
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Complaints Timeline */}
      <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 mt-4 sm:mt-8">
        <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-4 sm:mb-6">Recent Complaints Timeline</h3>
        <div className="space-y-4 sm:space-y-6">
          {complaints.slice(0, 5).map(complaint => (
            <motion.div
              key={complaint._id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex gap-3 sm:gap-4"
            >
              <div className="relative flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-blue-600" />
                <div className="absolute h-full w-0.5 bg-blue-200 -z-10" />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="font-medium text-gray-900 text-sm sm:text-base truncate">{complaint.title}</h4>
                <p className="text-xs sm:text-sm text-gray-600 mt-1 line-clamp-2">{complaint.description}</p>
                <div className="flex items-center gap-2 sm:gap-3 mt-2 flex-wrap">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium
                    ${complaint.currentStatus === 'Resolved' ? 'bg-green-100 text-green-800' :
                      complaint.currentStatus === 'In Progress' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-blue-100 text-blue-800'}`
                  }>
                    {complaint.currentStatus === 'Resolved' ? (
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : complaint.currentStatus === 'In Progress' ? (
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ) : (
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                    {complaint.currentStatus}
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(complaint.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
          {complaints.length === 0 && (
            <div className="text-center text-gray-500 py-4 text-sm">
              No complaints yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const MetricCard = ({ title, value, icon, bgColor, textColor }) => (
  <motion.div
    whileHover={{ scale: 1.02 }}
    className="bg-white rounded-xl shadow-lg p-6"
  >
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-600 mb-1">{title}</p>
        <p className={`text-2xl font-bold ${textColor}`}>{value}</p>
      </div>
      <div className={`p-3 rounded-full ${bgColor}`}>
        {icon}
      </div>
    </div>
  </motion.div>
);

export default Overview;
