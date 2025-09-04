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
  BoltIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import RaiseComplaint from './RaiseComplaint';
import MyComplaints from './MyComplaints';
import Announcements from './Announcements';
import Polls from './Polls';
import Profile from './Profile';
import NotificationBell from '../../components/NotificationBell';
import PollPopup from '../../components/PollPopup';
import SEO from '../../components/SEO';
import Leave from './Leave';
import MealRating from '../../components/MealRating';
import MyAttendance from './MyAttendance';
import FoundLost from './FoundLost';
import HostelFee from './HostelFee';
import PaymentHistory from './PaymentHistory';
import FAQ from './FAQ';
import useFeatureToggles from '../../hooks/useFeatureToggles';
import FeatureProtectedRoute from '../../components/FeatureProtectedRoute';
import FloatingCallButton from '../../components/FloatingCallButton';

const navItems = [
  {
    name: "Overview",
    path: "/student",
    feature: "overview",
    icon: "M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z",
    notificationType: null
  },
  {
    name: "Raise Complaint",
    path: "raise",
    feature: "raiseComplaint",
    icon: "M12 6v6m0 0v6m0-6h6m-6 0H6",
    notificationType: null
  },
  {
    name: "My Complaints",
    path: "my-complaints",
    feature: "myComplaints",
    icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
    notificationType: 'complaint'
  },
  {
    name: 'Attendance',
    path: 'attendance',
    feature: "attendance",
    icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
    notificationType: null
  },
  {
    name: "Leave",
    path: "leave",
    feature: "leave",
    icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
    notificationType: null
  },
  {
    name: "Found & Lost",
    path: "foundlost",
    feature: "foundLost",
    icon: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
    notificationType: null
  },
  {
    name: "Hostel Fee",
    path: "hostel-fee",
    feature: "hostelFee",
    icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1",
    notificationType: 'fee_reminder'
  },
  {
    name: "Payment History",
    path: "payment-history",
    feature: "paymentHistory",
    icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
    notificationType: null
  },
  {
    name: "Announcements",
    path: "announcements",
    feature: "announcements",
    icon: "M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z",
    notificationType: 'announcement'
  },
  {
    name: "Polls",
    path: "polls",
    feature: "polls",
    icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
    notificationType: 'poll'
  },
  {
    name: 'Profile',
    path: 'profile',
    feature: "profile",
    icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
    notificationType: null
  },
  {
    name: 'FAQ',
    path: 'faq',
    feature: null,
    icon: "M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    notificationType: null
  }
];

const StudentDashboardLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { isFeatureEnabled, loading: featureLoading, featureToggles } = useFeatureToggles();
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

  // Show loading state while feature toggles are being fetched
  if (featureLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading features...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-blue-50 via-white to-blue-50 overflow-hidden">
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsSidebarOpen(true)}
        className="lg:hidden fixed top-3 left-3 z-50 p-2.5 rounded-lg bg-white shadow-lg hover:bg-gray-50 transition-colors duration-200 touch-manipulation"
      >
        <Bars3Icon className="w-5 h-5 text-gray-600" />
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
        className="fixed lg:relative top-0 left-0 w-64 sm:w-72 h-screen bg-gradient-to-b from-blue-900 to-blue-800 border-r border-blue-700 shadow-lg flex flex-col z-50 lg:translate-x-0 lg:!transform-none rounded-tr-3xl rounded-br-3xl"
      >
        {/* Mobile Close Button */}
        <button
          onClick={() => setIsSidebarOpen(false)}
          className="lg:hidden absolute top-3 right-3 p-2.5 rounded-lg hover:bg-white/10 transition-colors duration-200 touch-manipulation"
        >
          <XMarkIcon className="w-5 h-5 text-white" />
        </button>

        <motion.div
          whileHover={{ scale: 1.02 }}
          className="p-4 sm:p-6 font-bold text-lg sm:text-xl tracking-wide flex items-center gap-2 flex-shrink-0"
        >
          <svg
            className="w-6 h-6 sm:w-8 sm:h-8 text-cyan-300"
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

        <nav className="flex-1 px-3 sm:px-4 space-y-1 sm:space-y-2 mt-4 overflow-y-auto scrollbar-visible-blue">
          {navItems
            .filter(item => !item.feature || isFeatureEnabled(item.feature))
            .map((item, index) => (
              <motion.div
                key={item.path}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: index * 0.1 }}
              >
                <NavLink
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-2.5 sm:py-3 rounded-lg text-sm sm:text-sm font-medium transition-all duration-300 touch-manipulation ${isActive
                      ? "bg-white/10 text-white shadow-lg font-semibold"
                      : "text-white/90 hover:bg-white/10 hover:text-white hover:shadow-md"
                    }`
                  }
                  end
                >
                  <div className="relative">
                    <svg
                      className="w-4 h-4 sm:w-5 sm:h-5"
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
                  <span className="truncate">{item.name}</span>
                </NavLink>
              </motion.div>
            ))}
        </nav>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="p-4 sm:p-6 border-t border-blue-700/50 bg-blue-900/30 flex-shrink-0 rounded-br-3xl"
        >
          <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
            <motion.div
              whileHover={{ scale: 1.1 }}
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-cyan-300 to-blue-500 flex items-center justify-center text-blue-900 font-bold shadow-md"
            >
              {user?.name?.charAt(0).toUpperCase()}
            </motion.div>
            <div className="flex-1 min-w-0">
              <div className="text-xs sm:text-xs font-semibold text-white truncate">
                {user?.name}
              </div>
              <div className="text-xs sm:text-xs text-cyan-200/90 truncate">
                {user?.rollNumber}
              </div>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 sm:py-2 text-xs sm:text-xs font-medium text-white bg-blue-700/50 hover:bg-blue-600 rounded-lg transition-all duration-300 shadow hover:shadow-md touch-manipulation"
          >
            <svg
              className="w-4 h-4 sm:w-5 sm:h-5"
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
      <main className="flex-1 overflow-y-auto h-screen scrollbar-visible">
        <div className="max-w-7xl mx-auto p-3 sm:p-4 lg:p-8">
          <div className="flex justify-end mb-3 sm:mb-4">
            <NotificationBell />
          </div>
          <Outlet context={metrics} />
        </div>
      </main>

      {/* Floating Call Button */}
      <FloatingCallButton />
    </div>
  );
};

const MetricCard = ({ title, value, icon, color, change }) => (
  <motion.div
    whileHover={{ scale: 1.02 }}
    className={`bg-white rounded-xl shadow-lg p-3 sm:p-4 lg:p-6 ${color} border border-gray-100`}
  >
    <div className="flex items-center justify-between mb-2 sm:mb-3 lg:mb-4">
      <div>
        <p className="text-xs sm:text-sm text-gray-500">{title}</p>
        <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">{value}</h3>
      </div>
      <div className={`p-2 sm:p-3 rounded-lg ${color} bg-opacity-10`}>{icon}</div>
    </div>
    {change && (
      <div className="flex items-center text-xs sm:text-sm">
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
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [todaysMenu, setTodaysMenu] = useState(null);
  const [modalMenu, setModalMenu] = useState(null);
  const [loadingMenu, setLoadingMenu] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [selectedMealType, setSelectedMealType] = useState('breakfast');
  const [expandedItems, setExpandedItems] = useState(new Set());
  const [refreshingBills, setRefreshingBills] = useState(false);

  // Function to refresh electricity bills data
  const refreshElectricityBills = async (showLoading = false) => {
    try {
      if (showLoading) {
        setRefreshingBills(true);
      }
      console.log('🔄 Refreshing electricity bills data...');
      const billsRes = await api.get('/api/rooms/student/electricity-bills');
      if (billsRes.data.success) {
        setElectricityBills(billsRes.data.data);
        console.log('✅ Electricity bills data refreshed:', billsRes.data.data);
      }
    } catch (err) {
      console.error('❌ Error refreshing electricity bills:', err);
    } finally {
      if (showLoading) {
        setRefreshingBills(false);
      }
    }
  };

  // Function to open bill modal and refresh data
  const handleOpenBillModal = async () => {
    setShowBillModal(true);
    // Always refresh data when opening the modal
    await refreshElectricityBills();
  };

  // Add interval to refresh bills data when modal is open
  useEffect(() => {
    let interval;
    if (showBillModal) {
      // Refresh every 10 seconds when modal is open
      interval = setInterval(refreshElectricityBills, 10000);
    }
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [showBillModal]);

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

  // Refresh bills data when component becomes visible (user returns from payment)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // User returned to the tab, refresh bills data
        console.log('👁️ Tab became visible, refreshing bills data...');
        refreshElectricityBills();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Also refresh when user focuses on the window
  useEffect(() => {
    const handleFocus = () => {
      refreshElectricityBills();
    };

    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  useEffect(() => {
    const fetchMenu = async () => {
      setLoadingMenu(true);
      try {
        const res = await api.get('/api/cafeteria/menu/today/with-ratings');
        setTodaysMenu(res.data.data);
      } catch (err) {
        setTodaysMenu(null);
      } finally {
        setLoadingMenu(false);
      }
    };
    fetchMenu();
  }, []);

  // Handler to open today's menu modal
  const handleOpenMenuModal = async () => {
    setShowMenuModal(true);
    setModalLoading(true);
    try {
      const res = await api.get('/api/cafeteria/menu/today/with-ratings');
      setModalMenu(res.data.data);
    } catch (err) {
      setModalMenu(null);
    } finally {
      setModalLoading(false);
    }
  };

  const handleCloseMenuModal = () => {
    setShowMenuModal(false);
    setModalMenu(null);
    setExpandedItems(new Set()); // Reset expanded items when modal closes
  };

  const handleRatingSubmit = () => {
    // Refresh menu data after rating submission
    handleOpenMenuModal();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6 sm:space-y-8 mt-16 sm:mt-0"
    >
      <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 lg:p-8 flex flex-col lg:block">
        <div className="flex items-center justify-between mb-4 order-1 lg:order-none">

          {/* Profile Photo - Mobile Only */}
          <div className="lg:hidden ml-4">
            {user?.studentPhoto ? (
              <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-blue-200 shadow-lg">
                <img
                  src={user.studentPhoto}
                  alt={user?.name}
                  className="w-full h-full object-cover"
                  onClick={() => navigate("profile")}
                />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-lg font-bold shadow-lg">
                {user?.name?.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          <div className="text-center flex-1">
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-blue-900 mb-2 sm:mb-3 lg:mb-4 bg-clip-text">
              Welcome back, {user?.name}
            </h2>
            <div className="w-20 sm:w-24 h-1 bg-gradient-to-r from-blue-400 to-cyan-400 mx-auto rounded-full"></div>
          </div>


        </div>
        {/* Quick Actions - order-2 on mobile, order-none on lg+ */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4 lg:gap-6 mt-4 sm:mt-6 lg:mt-0 order-2 lg:order-none">
          {/* First 6 buttons for all screen sizes */}
          <div className="contents">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate("raise")}
              className="p-2.5 sm:p-3 lg:p-4 rounded-lg bg-gradient-to-br from-red-50 to-red-100 text-red-700 hover:from-red-100 hover:to-red-200 transition-all duration-300 touch-manipulation border border-red-200"
            >
              <svg
                className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 mb-1.5 sm:mb-2 mx-auto"
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
              className="p-2.5 sm:p-3 lg:p-4 rounded-lg bg-gradient-to-br from-emerald-50 to-emerald-100 text-emerald-700 hover:from-emerald-100 hover:to-emerald-200 transition-all duration-300 touch-manipulation border border-emerald-200"
            >
              <svg
                className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 mb-1.5 sm:mb-2 mx-auto"
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
              onClick={() => navigate("leave")}
              className="p-2.5 sm:p-3 lg:p-4 rounded-lg bg-gradient-to-br from-violet-50 to-violet-100 text-violet-700 hover:from-violet-100 hover:to-violet-200 transition-all duration-300 touch-manipulation border border-violet-200"
            >
              <svg
                className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 mb-1.5 sm:mb-2 mx-auto"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <span className="text-xs sm:text-sm">Apply Leave</span>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate("attendance")}
              className="p-2.5 sm:p-3 lg:p-4 rounded-lg bg-gradient-to-br from-sky-50 to-sky-100 text-sky-700 hover:from-sky-100 hover:to-sky-200 transition-all duration-300 touch-manipulation border border-sky-200"
            >
              <svg
                className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 mb-1.5 sm:mb-2 mx-auto"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
              <span className="text-xs sm:text-sm">Attendance</span>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleOpenBillModal}
              className="p-2.5 sm:p-3 lg:p-4 rounded-lg bg-gradient-to-br from-amber-50 to-amber-100 text-amber-700 hover:from-amber-100 hover:to-amber-200 transition-all duration-300 touch-manipulation border border-amber-200"
            >
              <BoltIcon className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 mb-1.5 sm:mb-2 mx-auto" />
              <span className="text-xs sm:text-sm">Electricity Bills</span>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleOpenMenuModal}
              className="p-2.5 sm:p-3 lg:p-4 rounded-lg bg-gradient-to-br from-rose-50 to-rose-100 text-rose-700 hover:from-rose-100 hover:to-rose-200 transition-all duration-300 touch-manipulation border border-rose-200"
            >
              <div className="w-20 h-6 sm:w-24 sm:h-7 lg:w-28 lg:h-8 mb-1.5 sm:mb-2 mx-auto overflow-hidden">
                <div className="flex animate-scroll-left">
                  <span className="text-lg sm:text-xl lg:text-2xl flex-shrink-0 mr-2">🍳</span>
                  <span className="text-lg sm:text-xl lg:text-2xl flex-shrink-0 mr-2">🍽️</span>
                  <span className="text-lg sm:text-xl lg:text-2xl flex-shrink-0 mr-2">🥗</span>
                  <span className="text-lg sm:text-xl lg:text-2xl flex-shrink-0 mr-2">🍰</span>
                  <span className="text-lg sm:text-xl lg:text-2xl flex-shrink-0 mr-2">🍳</span>
                  <span className="text-lg sm:text-xl lg:text-2xl flex-shrink-0 mr-2">🍽️</span>
                  <span className="text-lg sm:text-xl lg:text-2xl flex-shrink-0 mr-2">🥗</span>
                  <span className="text-lg sm:text-xl lg:text-2xl flex-shrink-0 mr-2">🍰</span>
                  <span className="text-lg sm:text-xl lg:text-2xl flex-shrink-0 mr-2">🍳</span>
                  <span className="text-lg sm:text-xl lg:text-2xl flex-shrink-0 mr-2">🍽️</span>
                  <span className="text-lg sm:text-xl lg:text-2xl flex-shrink-0 mr-2">🥗</span>
                  <span className="text-lg sm:text-xl lg:text-2xl flex-shrink-0 mr-2">🍰</span>
                </div>
              </div>
              <span className="text-xs sm:text-sm">Today's Menu</span>
            </motion.button>
          </div>

          {/* FAQ Button - Only visible on mobile and tablet, spans full width */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate("faq")}
            className="lg:hidden col-span-2 p-2.5 sm:p-3 lg:p-4 rounded-lg bg-gradient-to-br from-teal-50 to-teal-100 text-teal-700 hover:from-teal-100 hover:to-teal-200 transition-all duration-300 touch-manipulation border border-teal-200"
          >
            <svg
              className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 mb-1.5 sm:mb-2 mx-auto"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="text-xs sm:text-sm">FAQ</span>
          </motion.button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        <MetricCard
          title="Total Complaints"
          value={metrics.totalComplaints}
          icon={
            <svg
              className="w-4 h-4 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-blue-600"
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
              className="w-4 h-4 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-green-600"
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
              className="w-4 h-4 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-yellow-600"
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
              className="w-4 h-4 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-purple-600"
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

      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:gap-8">
        {/* Latest Announcements Section */}
        <div className="bg-white rounded-xl shadow-lg p-3 sm:p-4 lg:p-6">
          <div className="flex items-center justify-between mb-3 sm:mb-4 lg:mb-6">
            <h3 className="text-sm sm:text-base lg:text-lg font-bold text-gray-900 flex items-center gap-2">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
              </svg>
              Latest Announcements
            </h3>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('announcements')}
              className="text-xs sm:text-sm text-blue-600 hover:text-blue-700 font-medium touch-manipulation"
            >
              View All
            </motion.button>
          </div>
          <div className="space-y-2 sm:space-y-3 lg:space-y-4">
            {announcements.slice(0, 3).map((announcement, index) => (
              <motion.div
                key={announcement._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="p-2.5 sm:p-3 lg:p-4 rounded-lg bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-100"
              >
                <h4 className="font-semibold text-blue-900 text-xs sm:text-sm lg:text-base mb-1 sm:mb-2">{announcement.title}</h4>
                <p className="text-xs sm:text-sm text-gray-600 line-clamp-2">{announcement.description}</p>
                <div className="flex items-center gap-2 mt-1.5 sm:mt-2 text-xs text-gray-500">
                  <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {new Date(announcement.createdAt).toLocaleString()}
                </div>
              </motion.div>
            ))}
            {announcements.length === 0 && (
              <div className="text-center text-gray-500 py-4 sm:py-6 lg:py-8">
                <svg className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 mx-auto mb-2 sm:mb-3 lg:mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                </svg>
                <p className="text-xs sm:text-sm">No announcements yet</p>
              </div>
            )}
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
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-xl p-3 sm:p-4 lg:p-6 w-full max-w-sm sm:max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto scrollbar-visible"
            >
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-3 sm:mb-4 lg:mb-6 gap-3">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center">
                    <BoltIcon className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">Electricity Bills</h2>
                    <p className="text-xs sm:text-sm lg:text-base text-gray-600">Room {user?.roomNumber} • Manage your electricity payments</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => refreshElectricityBills(true)}
                    disabled={refreshingBills}
                    className="p-2 hover:bg-blue-100 rounded-lg transition-colors text-blue-600 touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Refresh bills"
                  >
                    <svg
                      className={`w-4 h-4 sm:w-5 sm:h-5 ${refreshingBills ? 'animate-spin' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </motion.button>
                  <button
                    onClick={() => setShowBillModal(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors touch-manipulation"
                  >
                    <XMarkIcon className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" />
                  </button>
                </div>
              </div>

              {electricityBills.length === 0 ? (
                <div className="text-center py-6 sm:py-8 lg:py-12">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-16 lg:h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-2 sm:mb-3 lg:mb-4">
                    <BoltIcon className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-yellow-600" />
                  </div>
                  <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900 mb-2">No Electricity Bills</h3>
                  <p className="text-xs sm:text-sm lg:text-base text-gray-500">You don't have any electricity bills yet.</p>
                </div>
              ) : (
                <div className="space-y-2 sm:space-y-3 lg:space-y-4">
                  {electricityBills.map((bill, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl p-3 sm:p-4 lg:p-6 hover:shadow-lg transition-all duration-300"
                    >
                      {/* Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 sm:mb-3 lg:mb-4 gap-3">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <div className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                            <BoltIcon className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-yellow-600" />
                          </div>
                          <div>
                            <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900">Electricity Bill</h3>
                            <p className="text-xs sm:text-sm text-gray-600">Room {user?.roomNumber} • {bill.month}</p>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <span className={`inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium ${bill.paymentStatus === 'paid'
                            ? 'text-green-700 bg-green-100 border border-green-200'
                            : bill.paymentStatus === 'pending'
                              ? 'text-yellow-700 bg-yellow-100 border border-yellow-200'
                              : 'text-red-700 bg-red-100 border border-red-200'
                          }`}>
                          {bill.paymentStatus === 'paid' ? (
                            <CheckCircleIcon className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                          ) : bill.paymentStatus === 'pending' ? (
                            <ClockIcon className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                          ) : (
                            <XCircleIcon className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                          )}
                          <span className="text-xs sm:text-sm">{bill.paymentStatus === 'paid' ? 'Paid' : bill.paymentStatus === 'pending' ? 'Pending' : 'Unpaid'}</span>
                        </span>
                      </div>

                      {/* Bill Details Grid */}
                      <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:gap-4 mb-3 sm:mb-4 lg:mb-6">
                        <div className="bg-white rounded-lg p-2 sm:p-3 border border-yellow-200">
                          <p className="text-xs text-gray-500 mb-1">Start Units</p>
                          <p className="text-xs sm:text-sm lg:text-lg font-semibold text-gray-900">{bill.startUnits}</p>
                        </div>
                        <div className="bg-white rounded-lg p-2 sm:p-3 border border-yellow-200">
                          <p className="text-xs text-gray-500 mb-1">End Units</p>
                          <p className="text-xs sm:text-sm lg:text-lg font-semibold text-gray-900">{bill.endUnits}</p>
                        </div>
                        <div className="bg-white rounded-lg p-2 sm:p-3 border border-yellow-200">
                          <p className="text-xs text-gray-500 mb-1">Consumption</p>
                          <p className="text-xs sm:text-sm lg:text-lg font-semibold text-blue-600">
                            {bill.consumption !== undefined ? bill.consumption : bill.endUnits - bill.startUnits} units
                          </p>
                        </div>
                        <div className="bg-white rounded-lg p-2 sm:p-3 border border-yellow-200">
                          <p className="text-xs text-gray-500 mb-1">Rate/Unit</p>
                          <p className="text-xs sm:text-sm lg:text-lg font-semibold text-gray-900">₹{bill.rate}</p>
                        </div>
                      </div>

                      {/* Bill Amounts */}
                      <div className="bg-white rounded-lg p-2.5 sm:p-3 lg:p-4 border border-yellow-200 mb-3 sm:mb-4 lg:mb-6">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-0 mb-2">
                          <p className="text-xs sm:text-sm text-gray-600">Total Room Bill:</p>
                          <p className="text-xs sm:text-sm lg:text-base font-medium text-gray-900">₹{bill.total}</p>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-0">
                          <p className="text-xs sm:text-sm text-blue-700 font-semibold">Your Share:</p>
                          <p className="text-base sm:text-lg lg:text-xl font-bold text-blue-700">₹{bill.studentShare}</p>
                        </div>
                      </div>

                      {/* Total Amount and Actions */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pt-2.5 sm:pt-3 lg:pt-4 border-t border-yellow-200 gap-3">
                        <div>
                          <p className="text-xs sm:text-sm text-gray-600 mb-1">Your Payment</p>
                          <p className="text-lg sm:text-xl lg:text-2xl font-bold text-yellow-700">₹{bill.studentShare}</p>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                          {bill.paymentStatus === 'paid' && bill.paidAt && (
                            <div className="text-center sm:text-right">
                              <p className="text-xs text-gray-500">Paid on</p>
                              <p className="text-xs sm:text-sm font-medium text-green-700">
                                {new Date(bill.paidAt).toLocaleDateString()}
                              </p>
                            </div>
                          )}

                          {bill.paymentStatus !== 'paid' && (
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => window.location.href = `/student/electricity-payment/${bill._id}`}
                              className="px-3 sm:px-4 lg:px-6 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white font-semibold rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-300 shadow-lg hover:shadow-xl text-xs sm:text-sm lg:text-base touch-manipulation"
                            >
                              Pay ₹{bill.studentShare}
                            </motion.button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Today's Menu Modal */}
      {showMenuModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 p-2 sm:p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-sm sm:max-w-lg max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-3 sm:p-4 border-b border-gray-200">
              <h3 className="text-base sm:text-lg font-bold text-green-900">Today's Menu</h3>
              <button
                onClick={handleCloseMenuModal}
                className="text-gray-500 hover:text-gray-700 text-lg p-1 rounded-full hover:bg-gray-100 transition-colors"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Meal Type Tabs */}
            <div className="flex border-b border-gray-200 bg-gray-50">
              {['breakfast', 'lunch', 'snacks', 'dinner'].map(meal => (
                <button
                  key={meal}
                  onClick={() => setSelectedMealType(meal)}
                  className={`flex-1 px-2 py-2 text-xs font-medium transition-colors ${selectedMealType === meal
                      ? 'bg-white text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-600 hover:text-gray-800'
                    }`}
                >
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-sm">
                      {meal === 'breakfast' && '🥞'}
                      {meal === 'lunch' && '🍛'}
                      {meal === 'snacks' && '🍿'}
                      {meal === 'dinner' && '🍽️'}
                    </span>
                    <span className="capitalize">{meal}</span>
                  </div>
                </button>
              ))}
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 scrollbar-visible">
              {modalLoading ? (
                <div className="text-center py-8 text-gray-500 text-sm flex items-center justify-center gap-2">
                  <span role="img" aria-label="hourglass">⏳</span>Loading menu...
                </div>
              ) : modalMenu ? (
                <div className="space-y-4">
                  {/* Items List */}
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Menu Items</h4>
                    <div className="space-y-3 max-h-48 sm:max-h-56 overflow-y-auto scrollbar-visible">
                      {modalMenu.meals[selectedMealType]?.map((item, idx) => {
                        const itemKey = `${selectedMealType}-${idx}`;
                        const isExpanded = expandedItems.has(itemKey);

                        return (
                          <div key={idx} className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
                            {/* Clickable Header */}
                            <button
                              onClick={() => {
                                setExpandedItems(prev => {
                                  const newSet = new Set(prev);
                                  if (isExpanded) {
                                    newSet.delete(itemKey);
                                  } else {
                                    newSet.add(itemKey);
                                  }
                                  return newSet;
                                });
                              }}
                              className="w-full flex items-center justify-between p-3 sm:p-4 hover:bg-gray-100 transition-colors"
                            >
                              <div className="flex items-center gap-3 sm:gap-4 flex-1">
                                <span className="text-sm sm:text-base text-gray-700 font-medium truncate">
                                  {item.name || item}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                {item.imageUrl && (
                                  <span className="text-xs text-blue-600 font-medium">
                                    {isExpanded ? 'Hide' : 'View'} Image
                                  </span>
                                )}
                                <svg
                                  className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''
                                    }`}
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M19 9l-7 7-7-7"
                                  />
                                </svg>
                              </div>
                            </button>

                            {/* Expandable Image Section */}
                            {isExpanded && item.imageUrl && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.3, ease: 'easeInOut' }}
                                className="border-t border-gray-200 bg-white"
                              >
                                <div className="p-4 flex justify-center">
                                  <img
                                    src={item.imageUrl}
                                    alt={item.name || item}
                                    className="w-32 h-32 sm:w-40 sm:h-40 object-cover rounded-lg border border-gray-200 shadow-md"
                                    onError={(e) => {
                                      e.target.style.display = 'none';
                                    }}
                                    crossOrigin="anonymous"
                                    loading="lazy"
                                  />
                                </div>
                              </motion.div>
                            )}
                          </div>
                        );
                      })}
                      {(!modalMenu.meals[selectedMealType] || modalMenu.meals[selectedMealType].length === 0) && (
                        <div className="text-center py-4 text-gray-400 text-xs">
                          No items added yet
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Rating Section - Only show if meal has items */}
                  {['breakfast', 'lunch', 'dinner'].includes(selectedMealType) &&
                    modalMenu?.meals[selectedMealType]?.length > 0 && (
                      <div className="bg-white rounded-lg border border-gray-200 p-3">
                        <h5 className="text-xs font-medium text-gray-700 mb-3">Rate This Meal</h5>
                        <MealRating
                          mealType={selectedMealType}
                          date={new Date().toISOString().slice(0, 10)}
                          onRatingSubmit={handleRatingSubmit}
                          hasItems={modalMenu?.meals[selectedMealType]?.length > 0}
                        />
                      </div>
                    )}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400 text-sm flex items-center justify-center gap-2">
                  <span role="img" aria-label="sad">😔</span>No menu set for today.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
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
        <Route path="raise" element={
          <FeatureProtectedRoute feature="raiseComplaint">
            <RaiseComplaint />
          </FeatureProtectedRoute>
        } />
        <Route path="my-complaints" element={
          <FeatureProtectedRoute feature="myComplaints">
            <MyComplaints />
          </FeatureProtectedRoute>
        } />
        <Route path="leave" element={
          <FeatureProtectedRoute feature="leave">
            <Leave />
          </FeatureProtectedRoute>
        } />
        <Route path="foundlost" element={
          <FeatureProtectedRoute feature="foundLost">
            <FoundLost />
          </FeatureProtectedRoute>
        } />
        <Route path="hostel-fee" element={
          <FeatureProtectedRoute feature="hostelFee">
            <HostelFee />
          </FeatureProtectedRoute>
        } />
        <Route path="payment-history" element={
          <FeatureProtectedRoute feature="paymentHistory">
            <PaymentHistory />
          </FeatureProtectedRoute>
        } />
        <Route path="announcements" element={
          <FeatureProtectedRoute feature="announcements">
            <Announcements />
          </FeatureProtectedRoute>
        } />
        <Route path="polls" element={
          <FeatureProtectedRoute feature="polls">
            <Polls />
          </FeatureProtectedRoute>
        } />
        <Route path="profile" element={
          <FeatureProtectedRoute feature="profile">
            <Profile />
          </FeatureProtectedRoute>
        } />
        <Route path="attendance" element={
          <FeatureProtectedRoute feature="attendance">
            <MyAttendance />
          </FeatureProtectedRoute>
        } />
        <Route path="faq" element={<FAQ />} />
      </Route>
    </Routes>
  </>
);

export default StudentDashboard;
