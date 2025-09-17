import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, NavLink, Outlet, useLocation } from 'react-router-dom';
import api from '../../utils/axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bars3Icon,
  XMarkIcon,
  ShieldExclamationIcon
} from '@heroicons/react/24/outline';
import NotificationBell from '../../components/NotificationBell';
import ResetPasswordModal from '../admin/ResetPasswordModal';

// Helper function to get course name consistently
const getCourseName = (course) => {
  if (!course) return 'Course Management';
  if (typeof course === 'object' && course.name) return course.name;
  if (typeof course === 'string') return course;
  return 'Course Management';
};

// Permission Denied Component
const PermissionDenied = ({ sectionName }) => {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center max-w-md mx-auto">
        <div className="w-20 h-20 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
          <ShieldExclamationIcon className="w-10 h-10 text-red-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Restricted</h2>
        <p className="text-gray-600 mb-6">
          You don't have permission to access the <strong>{sectionName}</strong> section.
          Please contact your super admin to request access.
        </p>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <p className="text-sm text-purple-800">
            <strong>Available sections:</strong> Check the sidebar for sections you can access.
          </p>
        </div>
      </div>
    </div>
  );
};

// Protected Section Component
const ProtectedSection = ({ permission, sectionName, children }) => {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin';
  const isPrincipal = user?.role === 'principal';
  const hasPermission = isSuperAdmin || isPrincipal || user?.permissions?.includes(permission);

  if (!hasPermission) {
    return <PermissionDenied sectionName={sectionName} />;
  }

  return children;
};

const PrincipalDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);

  // Debug: Log user data to see what permissions principals have
  console.log('🎓 Principal Dashboard - User Data:', {
    role: user?.role,
    permissions: user?.permissions,
    course: user?.course,
    username: user?.username
  });
  const [notificationCount, setNotificationCount] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [notificationStates, setNotificationStates] = useState({
    complaint: false,
    announcement: false,
    poll: false
  });
  const { pathname } = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Close sidebar when route changes
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    const fetchNotificationCount = async () => {
      try {
        console.log('🔔 Fetching notification count for principal');

        const response = await api.get('/api/notifications/principal/count');
        if (response.data.success) {
          setNotificationCount(response.data.count);
          console.log('🔔 Principal notification count:', response.data.count);
        }
      } catch (error) {
        console.error('Error fetching notification count:', error);
        // Don't set count to 0 on error, keep previous count
      }
    };

    fetchNotificationCount();

    // Set up polling for notifications
    const interval = setInterval(fetchNotificationCount, 30000); // Poll every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const refreshHandler = () => fetchNotificationCount();

  const hasPermission = (permission) => {
    const isSuperAdmin = user?.role === 'super_admin';
    const isPrincipal = user?.role === 'principal';

    console.log('🔐 Permission check:', {
      permission,
      userRole: user?.role,
      userPermissions: user?.permissions,
      isSuperAdmin,
      isPrincipal,
      hasPermission: isSuperAdmin || isPrincipal || user?.permissions?.includes(permission)
    });
    // Principals should have access to their own sections
    return isSuperAdmin || isPrincipal || user?.permissions?.includes(permission);
  };

  const menuItems = [
    {
      name: 'Dashboard Home',
      icon: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z',
      path: '/principal/dashboard',
      show: true,
      locked: false
    },
    {
      name: 'Attendance',
      icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
      path: '/principal/dashboard/attendance',
      show: true,
      locked: false // Principals should always have access to attendance
    },
    {
      name: 'Students',
      icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
      path: '/principal/dashboard/students',
      show: true,
      locked: false
    },
    {
      name: 'Complaints',
      icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
      path: '/principal/dashboard/complaints',
      show: true,
      locked: false
    },
    {
      name: 'Leaves',
      icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
      path: '/principal/dashboard/leave-management',
      show: true,
      locked: false
    },
    {
      name: 'Stay in Requests',
      icon: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2 M12 12v3 M12 12a2 2 0 100-4 2 2 0 000 4z',
      path: '/principal/dashboard/stay-in-hostel-requests',
      show: true,
      locked: false
    }
  ];

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-purple-50 via-white to-purple-50">
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
        className="fixed lg:relative top-0 left-0 bottom-0 w-56 bg-white border-r border-purple-100 shadow-lg flex flex-col z-50 lg:translate-x-0 lg:!transform-none"
      >
        {/* Mobile Close Button */}
        <button
          onClick={() => setIsSidebarOpen(false)}
          className="lg:hidden absolute top-4 right-4 p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200"
        >
          <XMarkIcon className="w-6 h-6 text-gray-600" />
        </button>

        {/* Header */}
        <div className="p-4 flex-shrink-0">
          <div className="bg-gradient-to-r from-purple-600 to-purple-800 text-white p-3 rounded-xl shadow-lg flex items-center gap-2">
            <div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-sm">
              <svg className="w-4 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l9-5-9-5-9 5 9 5z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
              </svg>
            </div>
            <div className="flex-1">
              <h1 className="font-semibold text-xs">Principal Portal</h1>
              <p className="text-xs text-purple-100">{getCourseName(user?.course)}</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Top fade indicator */}
          <div className="absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-white to-transparent pointer-events-none z-10 opacity-0 transition-opacity duration-300"
            id="top-fade"></div>

          <nav className="flex-1 px-4 space-y-2 overflow-y-auto min-h-0 scrollbar-visible"
            onScroll={(e) => {
              const target = e.target;
              const topFade = document.getElementById('top-fade');
              const bottomFade = document.getElementById('bottom-fade');

              if (topFade && bottomFade) {
                // Show top fade when scrolled down
                topFade.style.opacity = target.scrollTop > 10 ? '1' : '0';

                // Show bottom fade when not at bottom
                const isAtBottom = target.scrollTop + target.clientHeight >= target.scrollHeight - 5;
                bottomFade.style.opacity = isAtBottom ? '0' : '1';
              }
            }}>
            {menuItems.filter(item => item.show).map((item, index) => (
              <motion.div
                key={item.name}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: index * 0.1 }}
              >
                {item.locked ? (
                  // Locked item - show as disabled (icon + faded label only)
                  <div className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 cursor-not-allowed opacity-60 select-none">
                    <div className="relative">
                      <svg
                        className="w-4 h-4"
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
                    </div>
                    <span className="flex-1 text-sm font-normal">{item.name}</span>
                  </div>
                ) : (
                  // Active item - normal NavLink
                  <NavLink
                    to={item.path}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-normal transition-all duration-300 ${isActive
                        ? "bg-purple-50 text-purple-700 shadow-sm"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      }`
                    }
                    end
                  >
                    <div className="relative">
                      <svg
                        className="w-4 h-4"
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
                )}
              </motion.div>
            ))}
          </nav>

          {/* Bottom fade indicator */}
          <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-white to-transparent pointer-events-none z-10 opacity-0 transition-opacity duration-300"
            id="bottom-fade"></div>
        </div>

        {/* User Profile and Logout */}
        <div className="p-4 border-t border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-md">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'P'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-gray-900 truncate">
                {user?.name || 'Principal'}
              </div>
              <div className="text-xs text-gray-500 truncate">
                {user?.course ? `${getCourseName(user?.course)} Principal` : 'Principal'}
              </div>
            </div>
          </div>

          {/* Password Reset Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowResetPasswordModal(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-xs font-normal text-white bg-orange-600 hover:bg-orange-700 rounded-lg transition-all duration-300 shadow hover:shadow-md mb-2"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
              />
            </svg>
            Reset Password
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-xs font-normal text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-all duration-300 shadow hover:shadow-md"
          >
            <svg
              className="w-4 h-4"
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
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-4 lg:p-8">
          <div className="flex justify-end mb-4">
            <NotificationBell />
          </div>
          <Outlet />
        </div>
      </main>

      {/* Reset Password Modal */}
      <ResetPasswordModal
        isOpen={showResetPasswordModal}
        onClose={() => setShowResetPasswordModal(false)}
      />
    </div>
  );
};

export default PrincipalDashboard; 