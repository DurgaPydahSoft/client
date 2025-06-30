import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, NavLink, Outlet, Routes, Route, Link, useLocation } from 'react-router-dom';
import api from '../../utils/axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bars3Icon,
  XMarkIcon,
  LockClosedIcon,
  ShieldExclamationIcon
} from '@heroicons/react/24/outline';
import ComplaintList from './ComplaintList';
import MemberManagement from './MemberManagement';
import AnnouncementManagement from './AnnouncementManagement';
import DashboardHome from './DashboardHome';
import NotificationBell from '../../components/NotificationBell';
import PollManagement from './PollManagement';
import LeaveManagement from "./LeaveManagement";
import MenuManagement from './MenuManagement';
import Attendance from './Attendance';

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
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
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
  const hasPermission = isSuperAdmin || user?.permissions?.includes(permission);

  if (!hasPermission) {
    return <PermissionDenied sectionName={sectionName} />;
  }

  return children;
};

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
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
        console.log('🔔 Temporarily disabled notification fetching for testing');
        
        // Temporarily disable notification API calls
        setNotificationCount(0);
        setNotificationStates({
          complaint: false,
          announcement: false,
          poll: false
        });
        
        console.log('🔔 Notification states set to defaults');
      } catch (err) {
        console.error('🔔 Failed to fetch notification count:', err);
        // Don't let notification errors cause logout - just set defaults
        setNotificationCount(0);
        setNotificationStates({
          complaint: false,
          announcement: false,
          poll: false
        });
      }
    };

    fetchNotificationCount();
    
    // Refresh count when new notification arrives
    const refreshHandler = () => fetchNotificationCount();
    window.addEventListener('refresh-notifications', refreshHandler);
    
    // Poll for new notifications every minute
    const interval = setInterval(fetchNotificationCount, 60000);

    return () => {
      window.removeEventListener('refresh-notifications', refreshHandler);
      clearInterval(interval);
    };
  }, [pathname]);

  // Initialize scroll indicators
  useEffect(() => {
    const nav = document.querySelector('nav.overflow-y-auto');
    const bottomFade = document.getElementById('bottom-fade');
    
    if (nav && bottomFade) {
      // Check if content is scrollable
      const isScrollable = nav.scrollHeight > nav.clientHeight;
      bottomFade.style.opacity = isScrollable ? '1' : '0';
    }
  }, []);

  const isSuperAdmin = user?.role === 'super_admin';
  const hasPermission = (permission) => {
    console.log('🔐 Permission check:', {
      permission,
      userRole: user?.role,
      userPermissions: user?.permissions,
      isSuperAdmin,
      hasPermission: isSuperAdmin || user?.permissions?.includes(permission)
    });
    return isSuperAdmin || user?.permissions?.includes(permission);
  };

  const menuItems = [
    {
      name: 'Dashboard Home',
      icon: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z',
      path: '/admin/dashboard',
      show: true,
      locked: false
    },
    {
      name: 'Room Management',
      icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
      path: '/admin/dashboard/rooms',
      show: true,
      locked: !hasPermission('room_management')
    },
    {
      name: 'Student Management',
      icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
      path: '/admin/dashboard/students',
      show: true,
      locked: !hasPermission('student_management')
    },
    {
      name: 'Complaints',
      icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
      path: '/admin/dashboard/complaints',
      show: true,
      locked: !hasPermission('complaint_management')
    },
    {
      name: 'Leave Management',
      icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
      path: '/admin/dashboard/leave',
      show: true,
      locked: !hasPermission('leave_management')
    },
    {
      name: 'Members',
      icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
      path: '/admin/dashboard/members',
      show: true,
      locked: !hasPermission('member_management')
    },
    {
      name: 'Announcements',
      icon: 'M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z',
      path: '/admin/dashboard/announcements',
      show: true,
      locked: !hasPermission('announcement_management')
    },
    {
      name: 'Polls',
      icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
      path: '/admin/dashboard/polls',
      show: true,
      locked: !hasPermission('poll_management')
    },
    {
      name: 'Admin Management',
      icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
      path: '/admin/dashboard/admin-management',
      show: isSuperAdmin,
      locked: !isSuperAdmin
    },
    {
      name: 'Menu',
      icon: 'M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.871c1.355 0 2.697.056 4.024.166C17.155 8.51 18 9.473 18 10.608v2.513M15 8.25v-1.5m-6 1.5v-1.5m12 9.75-1.5.75a3.354 3.354 0 0 1-3 0 3.354 3.354 0 0 0-3 0 3.354 3.354 0 0 1-3 0 3.354 3.354 0 0 0-3 0 3.354 3.354 0 0 1-3 0L3 16.5m15-3.379a48.474 48.474 0 0 0-6-.371c-2.032 0-4.034.126-6 .371m12 0c.39.049.777.102 1.163.16 1.07.16 1.837 1.094 1.837 2.175v5.169c0 .621-.504 1.125-1.125 1.125H4.125A1.125 1.125 0 0 1 3 20.625v-5.17c0-1.08.768-2.014 1.837-2.174A47.78 47.78 0 0 1 6 13.12M12.265 3.11a.375.375 0 1 1-.53 0L12 2.845l.265.265Zm-3 0a.375.375 0 1 1-.53 0L9 2.845l.265.265Zm6 0a.375.375 0 1 1-.53 0L15 2.845l.265.265Z',
      path: '/admin/dashboard/menu',
      show: true,
      locked: !hasPermission('menu_management')
    },
    {
      name: 'Attendance',
      icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
      path: '/admin/dashboard/attendance',
      show: true,
      locked: !hasPermission('attendance_management')
    }
  ];

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-blue-50 via-white to-blue-50">
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
        className="fixed lg:relative top-0 left-0 w-56 h-screen bg-white border-r border-blue-100 shadow-lg flex flex-col z-50 lg:translate-x-0 lg:!transform-none"
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
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-3 rounded-xl shadow-lg flex items-center gap-2">
            <div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-sm">
              <svg className="w-4 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div className="flex-1">
              <h1 className="font-semibold text-xs">Hostel Admin</h1>
              <p className="text-xs text-blue-100">Management Portal</p>
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
                      `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-normal transition-all duration-300 ${
                        isActive
                          ? "bg-blue-50 text-blue-700 shadow-sm"
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
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold shadow-md">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-gray-900 truncate">
                {user?.name || 'Admin'}
              </div>
              <div className="text-xs text-gray-500 truncate">
                {user?.role === 'super_admin' ? 'Super Admin' : user?.role === 'sub_admin' ? 'Sub Admin' : 'Admin'}
              </div>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-xs font-normal text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-all duration-300 shadow hover:shadow-md"
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
      <main className="flex-1 overflow-y-auto h-screen">
        <div className="max-w-7xl mx-auto p-4 lg:p-8">
          <div className="flex justify-end mb-4">
            <NotificationBell />
          </div>
          <Outlet />
        </div>
      </main>
    </div>
  );
};

const AdminDashboardLayout = () => (
  <Routes>
    <Route index element={<DashboardHome />} />
    <Route path="complaints" element={<ComplaintList />} />
    <Route path="leave" element={<LeaveManagement />} />
    <Route path="members" element={<MemberManagement />} />
    <Route path="announcements" element={<AnnouncementManagement />} />
    <Route path="polls" element={<PollManagement />} />
    <Route path="menu" element={<MenuManagement />} />
    <Route path="attendance" element={<Attendance />} />
  </Routes>
);

export default AdminDashboard;