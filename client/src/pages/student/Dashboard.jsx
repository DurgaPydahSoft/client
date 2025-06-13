import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, NavLink, Outlet, Routes, Route, useOutletContext, useLocation } from 'react-router-dom';
import api from '../../utils/axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bars3Icon,
  XMarkIcon,
  BellIcon,
  BellSlashIcon,
  BellAlertIcon,
  HomeIcon,
  PlusCircleIcon,
  ClipboardDocumentListIcon,
  MegaphoneIcon,
  ChartBarIcon,
  UserIcon,
  BoltIcon
} from '@heroicons/react/24/outline';
import RaiseComplaint from './RaiseComplaint';
import MyComplaints from './MyComplaints';
import Announcements from './Announcements';
import Polls from './Polls';
import Profile from './Profile';
import NotificationBell from '../../components/NotificationBell';
import PollPopup from '../../components/PollPopup';
import { canReenableNotifications } from '../../utils/pushNotifications';
import SEO from '../../components/SEO';
import Outpass from './Outpass';

const navItems = [
  {
    name: "Overview",
    path: "/student",
    icon: "M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z",
    notificationType: null
  },
  {
    name: "Raise Complaint",
    path: "raise",
    icon: "M12 6v6m0 0v6m0-6h6m-6 0H6",
    notificationType: null
  },
  {
    name: "My Complaints",
    path: "my-complaints",
    icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
    notificationType: 'complaint'
  },
  {
    name: "Outpass",
    path: "outpass",
    icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
    notificationType: null
  },
  {
    name: "Announcements",
    path: "announcements",
    icon: "M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z",
    notificationType: 'announcement'
  },
  {
    name: "Polls",
    path: "polls",
    icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
    notificationType: 'poll'
  },
  {
    name: 'Profile',
    path: 'profile',
    icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
    notificationType: null
  }
];

const StudentDashboardLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState({
    totalComplaints: 0,
    resolved: 0,
    pending: 0,
    inProgress: 0,
    responseTime: 0,
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [unvotedPolls, setUnvotedPolls] = useState([]);
  const [currentPollIndex, setCurrentPollIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [notificationStates, setNotificationStates] = useState({
    complaint: false,
    announcement: false,
    poll: false
  });

  // Close sidebar when route changes
  const location = useLocation();
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [metricsRes, pollsRes, notificationsRes] = await Promise.all([
          api.get("/api/complaints/my"),
          api.get('/api/polls/active'),
          api.get('/api/notifications/unread')
        ]);

        // Handle metrics data
        let complaints;
        if (Array.isArray(metricsRes.data)) {
          complaints = metricsRes.data;
        } else if (metricsRes.data.success && Array.isArray(metricsRes.data.data.complaints)) {
          complaints = metricsRes.data.data.complaints;
        } else {
          console.error('Invalid complaints data format:', metricsRes.data);
          return;
        }

        // Update notification states based on unread notifications
        if (notificationsRes.data.success) {
          const notifications = notificationsRes.data.data;
          setNotificationStates({
            complaint: notifications.some(n => n.type === 'complaint'),
            announcement: notifications.some(n => n.type === 'announcement'),
            poll: notifications.some(n => n.type === 'poll')
          });
        }

        const resolved = complaints.filter(c => c.currentStatus === "Resolved").length;
        const inProgress = complaints.filter(c => c.currentStatus === "In Progress").length;
        const pending = complaints.filter(c => ["Received", "Pending"].includes(c.currentStatus)).length;

        const resolvedComplaints = complaints.filter(c => c.currentStatus === "Resolved");
        const totalTime = resolvedComplaints.reduce((acc, c) => {
          const created = new Date(c.createdAt);
          const resolved = new Date(c.statusHistory.find(s => s.status === "Resolved")?.timestamp || c.updatedAt);
          return acc + (resolved - created) / (1000 * 60 * 60);
        }, 0);
        
        const avgResponseTime = resolvedComplaints.length ? totalTime / resolvedComplaints.length : 0;

        setMetrics({
          totalComplaints: complaints.length,
          resolved,
          pending,
          inProgress,
          responseTime: avgResponseTime,
        });

        // Handle polls data
        if (pollsRes.data.success) {
          const unvoted = pollsRes.data.data.filter(poll => !poll.hasVoted);
          setUnvotedPolls(unvoted);
          setCurrentPollIndex(0);
        }
      } catch (err) {
        console.error("Error fetching data:", err);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchData();
    }
  }, [user]);

  const handlePollVote = () => {
    if (currentPollIndex < unvotedPolls.length - 1) {
      // Move to next poll
      setCurrentPollIndex(prev => prev + 1);
    } else {
      // All polls have been voted on
      setUnvotedPolls([]);
      setCurrentPollIndex(0);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // If there are unvoted polls, show the current one in the popup
  if (unvotedPolls.length > 0) {
    return (
      <PollPopup 
        poll={unvotedPolls[currentPollIndex]} 
        onVote={handlePollVote}
        remainingPolls={unvotedPolls.length - 1 - currentPollIndex}
      />
    );
  }

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-blue-50 via-white to-blue-50 overflow-hidden">
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsSidebarOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-white shadow-lg hover:bg-gray-50 transition-colors duration-200"
      >
        <Bars3Icon className="w-6 h-6 text-gray-600" />
      </button>

      {/* Mobile Sidebar Backdrop */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden fixed inset-0 bg-black/50 z-40"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{
          x: isSidebarOpen ? 0 : '-100%',
        }}
        transition={{ type: 'spring', damping: 20 }}
        className="fixed lg:relative top-0 left-0 w-72 h-screen bg-gradient-to-b from-blue-900 to-blue-800 border-r border-blue-700 shadow-lg flex flex-col z-50 lg:translate-x-0 lg:!transform-none rounded-tr-3xl rounded-br-3xl"
      >
        {/* Mobile Close Button */}
        <button
          onClick={() => setIsSidebarOpen(false)}
          className="lg:hidden absolute top-4 right-4 p-2 rounded-lg hover:bg-white/10 transition-colors duration-200"
        >
          <XMarkIcon className="w-6 h-6 text-white" />
        </button>

        <motion.div
          whileHover={{ scale: 1.02 }}
          className="p-8 font-extrabold text-2xl tracking-wide flex items-center gap-2 flex-shrink-0"
        >
          <svg
            className="w-8 h-8 text-cyan-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
            />
          </svg>
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-300 to-white">
            Student Portal
          </span>
        </motion.div>

        <nav className="flex-1 px-4 space-y-2 mt-4 overflow-y-auto">
          {navItems.map((item, index) => (
            <motion.div
              key={item.path}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: index * 0.1 }}
            >
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all duration-300 ${
                    isActive
                      ? "bg-white/10 text-white shadow-lg font-bold"
                      : "text-white/90 hover:bg-white/10 hover:text-white hover:shadow-md"
                  }`
                }
                end
              >
                <div className="relative">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d={item.icon}
                    />
                  </svg>
                  {item.notificationType && notificationStates[item.notificationType] && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"
                    >
                      <motion.div
                        animate={{
                          scale: [1, 1.2, 1],
                          opacity: [1, 0.5, 1]
                        }}
                        transition={{
                          duration: 1.5,
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                        className="w-full h-full bg-red-500 rounded-full"
                      />
                    </motion.div>
                  )}
                </div>
                {item.name}
              </NavLink>
            </motion.div>
          ))}
        </nav>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="p-6 border-t border-blue-700/50 bg-blue-900/30 flex-shrink-0 rounded-br-3xl"
        >
          <div className="flex items-center gap-3 mb-4">
            <motion.div
              whileHover={{ scale: 1.1 }}
              className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-300 to-blue-500 flex items-center justify-center text-blue-900 font-bold shadow-md"
            >
              {user?.name?.charAt(0).toUpperCase()}
            </motion.div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-white truncate">
                {user?.name}
              </div>
              <div className="text-xs text-cyan-200/90 truncate">
                {user?.rollNumber}
              </div>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-700/50 hover:bg-blue-600 rounded-lg transition-all duration-300 shadow hover:shadow-md"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
            Logout
          </motion.button>
        </motion.div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto h-screen">
        <div className="max-w-7xl mx-auto p-4 lg:p-8">
          <div className="flex justify-end mb-4">
            <NotificationBell />
          </div>
          <Outlet context={metrics} />
        </div>
      </main>
    </div>
  );
};

const MetricCard = ({ title, value, icon, color, change }) => (
  <motion.div
    whileHover={{ scale: 1.02 }}
    className={`bg-white rounded-xl shadow-lg p-6 ${color} border border-gray-100`}
  >
    <div className="flex items-center justify-between mb-4">
      <div>
        <p className="text-sm text-gray-500">{title}</p>
        <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
      </div>
      <div className={`p-3 rounded-lg ${color} bg-opacity-10`}>{icon}</div>
    </div>
    {change && (
      <div className="flex items-center text-sm">
        <span className="text-green-500 mr-1">↑</span>
        <span className="text-gray-600">{change}</span>
      </div>
    )}
  </motion.div>
);

const DashboardHome = () => {
  const { user } = useAuth();
  const metrics = useOutletContext();
  const navigate = useNavigate();
  const [announcements, setAnnouncements] = useState([]);
  const [electricityBills, setElectricityBills] = useState([]);
  const [showBillModal, setShowBillModal] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [announcementsRes, billsRes] = await Promise.all([
          api.get('/api/announcements'),
          api.get('/api/rooms/student/electricity-bills')
        ]);
        
        if (announcementsRes.data.success) {
          setAnnouncements(announcementsRes.data.data);
        }
        
        if (billsRes.data.success) {
          setElectricityBills(billsRes.data.data);
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      }
    };
    fetchData();
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-8 mt-16 sm:mt-0"
    >
      <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8">
        <div className="flex items-center justify-between mb-4">
          <div className="text-center flex-1">
            <h2 className="text-2xl sm:text-3xl font-bold text-blue-900 mb-3 sm:mb-4 bg-clip-text">
              Welcome back, {user?.name}
            </h2>
            <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">
              View your complaint statistics and manage your requests below.
            </p>
            <div className="w-24 h-1 bg-gradient-to-r from-blue-400 to-cyan-400 mx-auto rounded-full"></div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <MetricCard
          title="Total Complaints"
          value={metrics.totalComplaints}
          icon={
            <svg
              className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
          }
          color="text-blue-600"
        />
        <MetricCard
          title="Resolved"
          value={metrics.resolved}
          icon={
            <svg
              className="w-6 h-6 sm:w-8 sm:h-8 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M5 13l4 4L19 7"
              />
            </svg>
          }
          color="text-green-600"
        />
        <MetricCard
          title="In Progress"
          value={metrics.inProgress}
          icon={
            <svg
              className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          }
          color="text-yellow-600"
        />
        <MetricCard
          title="Pending"
          value={metrics.pending}
          icon={
            <svg
              className="w-6 h-6 sm:w-8 sm:h-8 text-purple-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          }
          color="text-purple-600"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 sm:gap-8">
        {/* Latest Announcements Section */}
        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h3 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
              </svg>
              Latest Announcements
            </h3>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('announcements')}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              View All
            </motion.button>
          </div>
          <div className="space-y-3 sm:space-y-4">
            {announcements.slice(0, 3).map((announcement, index) => (
              <motion.div
                key={announcement._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="p-3 sm:p-4 rounded-lg bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-100"
              >
                <h4 className="font-semibold text-blue-900 text-sm sm:text-base mb-1 sm:mb-2">{announcement.title}</h4>
                <p className="text-xs sm:text-sm text-gray-600 line-clamp-2">{announcement.description}</p>
                <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                  <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {new Date(announcement.createdAt).toLocaleString()}
                </div>
              </motion.div>
            ))}
            {announcements.length === 0 && (
              <div className="text-center text-gray-500 py-6 sm:py-8">
                <svg className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                </svg>
                <p className="text-sm">No announcements yet</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-4">
            Resolution Rate
          </h3>
          <div className="flex items-center">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border-4 border-blue-500 flex items-center justify-center mr-4">
              <span className="text-lg sm:text-xl font-bold text-blue-600">
                {metrics.totalComplaints
                  ? Math.round((metrics.resolved / metrics.totalComplaints) * 100)
                  : 0}%
              </span>
            </div>
            <div>
              <p className="text-xs sm:text-sm text-gray-500">
                {metrics.resolved} out of {metrics.totalComplaints} complaints resolved
              </p>
              <p className="text-xs sm:text-sm text-gray-400 mt-1">
                Average response time: {Math.round(metrics.responseTime)} hours
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-4">
            Quick Actions
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate("raise")}
              className="p-3 sm:p-4 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-all duration-300"
            >
              <svg
                className="w-5 h-5 sm:w-6 sm:h-6 mb-2 mx-auto"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
              <span className="text-xs sm:text-sm">Raise Complaint</span>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate("my-complaints")}
              className="p-3 sm:p-4 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 transition-all duration-300"
            >
              <svg
                className="w-5 h-5 sm:w-6 sm:h-6 mb-2 mx-auto"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
              <span className="text-xs sm:text-sm">View Complaints</span>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowBillModal(true)}
              className="p-3 sm:p-4 rounded-lg bg-yellow-50 text-yellow-700 hover:bg-yellow-100 transition-all duration-300"
            >
              <BoltIcon className="w-5 h-5 sm:w-6 sm:h-6 mb-2 mx-auto" />
              <span className="text-xs sm:text-sm">Electricity Bills</span>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate("/student")}
              className="p-3 sm:p-4 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 transition-all duration-300"
            >
              <svg
                className="w-5 h-5 sm:w-6 sm:h-6 mb-2 mx-auto"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                />
              </svg>
              <span className="text-xs sm:text-sm">Overview</span>
            </motion.button>
          </div>
        </div>
      </div>

      {/* Electricity Bill Modal */}
      <AnimatePresence>
        {showBillModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Electricity Bills - Room {user?.roomNumber}</h2>
                <button
                  onClick={() => setShowBillModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>

              {electricityBills.length === 0 ? (
                <div className="text-center py-8">
                  <BoltIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500">No electricity bills found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm border">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="px-4 py-2 border">Month</th>
                        <th className="px-4 py-2 border">Start Units</th>
                        <th className="px-4 py-2 border">End Units</th>
                        <th className="px-4 py-2 border">Consumption</th>
                        <th className="px-4 py-2 border">Rate/Unit</th>
                        <th className="px-4 py-2 border">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {electricityBills.map((bill, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-4 py-2 border">{bill.month}</td>
                          <td className="px-4 py-2 border">{bill.startUnits}</td>
                          <td className="px-4 py-2 border">{bill.endUnits}</td>
                          <td className="px-4 py-2 border">{bill.consumption !== undefined ? bill.consumption : bill.endUnits - bill.startUnits}</td>
                          <td className="px-4 py-2 border">₹{bill.rate}</td>
                          <td className="px-4 py-2 border">₹{bill.total}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const StudentDashboard = () => (
  <>
    <SEO 
      title="Student Dashboard"
      description="Access your hostel complaints, track their status, and submit new complaints. Manage your hostel-related grievances efficiently."
      keywords="Student Dashboard, Hostel Complaints, Complaint Status, Submit Complaint, Track Complaints, Student Portal"
    />
  <Routes>
    <Route element={<StudentDashboardLayout />}>
      <Route index element={<DashboardHome />} />
      <Route path="raise" element={<RaiseComplaint />} />
      <Route path="my-complaints" element={<MyComplaints />} />
        <Route path="outpass" element={<Outpass />} />
      <Route path="announcements" element={<Announcements />} />
      <Route path="polls" element={<Polls />} />
        <Route path="profile" element={<Profile />} />
    </Route>
  </Routes>
  </>
);

export default StudentDashboard;
