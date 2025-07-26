import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, NavLink, Outlet, Routes, Route, Link, useLocation } from 'react-router-dom';
import api from '../../utils/axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bars3Icon,
  XMarkIcon,
  LockClosedIcon,
  ShieldExclamationIcon,
  ChevronDownIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';
import { hasPermission, hasFullAccess, canPerformAction } from '../../utils/permissionUtils';
import ComplaintList from './ComplaintList';
import MemberManagement from './MemberManagement';
import AnnouncementManagement from './AnnouncementManagement';
import DashboardHome from './DashboardHome';
import NotificationBell from '../../components/NotificationBell';
import PollManagement from './PollManagement';
import LeaveManagement from "./LeaveManagement";
import MenuManagement from './MenuManagement';
import Attendance from './Attendance';
import FeeManagement from './FeeManagement';
import FeatureControls from './FeatureControls';
import RoomManagement from './RoomManagement';
import ElectricityBills from './ElectricityBills';
import SecurityDashboard from '../security/SecurityDashboard';
import SecuritySettings from './SecuritySettings';
import ResetPassword from './ResetPassword';
import ResetPasswordModal from './ResetPasswordModal';

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
const ProtectedSection = ({ permission, sectionName, children, requiredAccess = 'view' }) => {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin';
  
  // For super admin, always allow access
  if (isSuperAdmin) {
    return children;
  }
  
  // Check if user has the required permission and access level
  const canAccess = canPerformAction(user, permission, requiredAccess);
  
  if (!canAccess) {
    return <PermissionDenied sectionName={sectionName} />;
  }

  return children;
};

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [notificationStates, setNotificationStates] = useState({
    complaint: false,
    announcement: false,
    poll: false
  });
  const [expandedMenus, setExpandedMenus] = useState({});
  const { pathname } = useLocation();
  
  // iOS/Safari detection - memoized to prevent unnecessary re-renders
  const isIOS = useMemo(() => /iPad|iPhone|iPod/.test(navigator.userAgent), []);
  const isSafari = useMemo(() => /^((?!chrome|android).)*safari/i.test(navigator.userAgent), []);
  const isIOSSafari = useMemo(() => isSafari && isIOS, [isSafari, isIOS]);
  const isIOSChrome = useMemo(() => /CriOS/.test(navigator.userAgent), []);
  
  // Define these variables before useEffect hooks that use them
  const isSuperAdmin = user?.role === 'super_admin';
  const checkPermission = (permission) => {
    console.log('🔐 Permission check:', {
      permission,
      userRole: user?.role,
      userPermissions: user?.permissions,
      isSuperAdmin,
      hasPermission: isSuperAdmin || hasPermission(user, permission)
    });
    return isSuperAdmin || hasPermission(user, permission);
  };

  // Helper function to get first available section for sub-admins
  const getFirstAvailableSection = () => {
    const availableSections = menuItems.filter(item => 
      item.show && !item.locked && item.path !== '/admin/dashboard'
    );
    return availableSections.length > 0 ? availableSections[0] : null;
  };
  
  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleSubmenu = (menuName) => {
    setExpandedMenus(prev => ({
      ...prev,
      [menuName]: !prev[menuName]
    }));
  };

  // Close sidebar when route changes and auto-expand submenus
  useEffect(() => {
    setIsSidebarOpen(false);
    
    // Auto-expand Rooms submenu if on rooms-related pages
    if (pathname.startsWith('/admin/dashboard/rooms')) {
      setExpandedMenus(prev => ({
        ...prev,
        'Rooms': true
      }));
    }
    
    // Auto-expand Maintenance Ticket Management submenu if on complaints or members pages
    if (pathname.startsWith('/admin/dashboard/complaints') || pathname.startsWith('/admin/dashboard/members')) {
      setExpandedMenus(prev => ({
        ...prev,
        'Maintenance Ticket Management': true
      }));
    }
  }, [pathname]);

  // Auto-redirect sub-admins without dashboard_home permission to their first available section
  useEffect(() => {
    if (!isSuperAdmin && !hasPermission(user, 'dashboard_home') && pathname === '/admin/dashboard') {
      const firstSection = getFirstAvailableSection();
      
      if (firstSection) {
        console.log('🔄 Auto-redirecting to first available section:', firstSection.path);
        navigate(firstSection.path, { replace: true });
      }
    }
  }, [pathname, isSuperAdmin, user?.permissions, navigate]);

  useEffect(() => {
    const fetchNotificationCount = async () => {
      try {
        console.log('🔔 Fetching admin notification count...');
        
        // Safari-specific timeout handling
        const timeoutDuration = isSafari ? 45000 : 30000;
        
        const [countRes, unreadRes] = await Promise.allSettled([
          Promise.race([
            api.get('/api/notifications/admin/count'),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Request timeout')), timeoutDuration)
            )
          ]),
          Promise.race([
            api.get('/api/notifications/admin/unread'),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Request timeout')), timeoutDuration)
            )
          ])
        ]);

        if (countRes.status === 'fulfilled' && countRes.value.data.success) {
          const newCount = countRes.value.data.count;
          setNotificationCount(newCount);
          console.log('🔔 Admin notification count:', newCount);
        } else {
          console.error('Failed to fetch notification count:', countRes.status === 'fulfilled' ? countRes.value.data : countRes.reason);
        }

        if (unreadRes.status === 'fulfilled' && unreadRes.value.data.success) {
          const unreadNotifications = unreadRes.value.data.data;
          
          // Check for specific notification types
          const hasComplaints = unreadNotifications.some(n => n.type === 'complaint');
          const hasAnnouncements = unreadNotifications.some(n => n.type === 'announcement');
          const hasPolls = unreadNotifications.some(n => n.type === 'poll');
          
          setNotificationStates({
            complaint: hasComplaints,
            announcement: hasAnnouncements,
            poll: hasPolls
          });
          
          console.log('🔔 Notification states:', {
            complaint: hasComplaints,
            announcement: hasAnnouncements,
            poll: hasPolls
          });
        } else {
          console.error('Failed to fetch unread notifications:', unreadRes.status === 'fulfilled' ? unreadRes.value.data : unreadRes.reason);
        }
      } catch (err) {
        console.error('🔔 Failed to fetch notification count:', err);
        
        // Safari-specific error handling
        if (isSafari) {
          console.log('🦁 Safari notification error - setting defaults');
        }
        
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
    
    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchNotificationCount, 30000);

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

  const menuItems = [
    {
      name: 'Home',
      icon: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z',
      path: '/admin/dashboard',
      show: isSuperAdmin || hasPermission(user, 'dashboard_home'),
      locked: !isSuperAdmin && !hasPermission(user, 'dashboard_home')
    },
    {
      name: 'Rooms',
      icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
      path: '/admin/dashboard/rooms',
      show: true,
      locked: !isSuperAdmin && !hasPermission(user, 'room_management'),
      hasSubmenu: true,
      submenu: [
        {
          name: 'Room Management',
          path: '/admin/dashboard/rooms/management',
          icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4'
        },
        {
          name: 'Electricity Bills',
          path: '/admin/dashboard/rooms/electricity',
          icon: 'M13 10V3L4 14h7v7l9-11h-7z'
        }
      ]
    },
    {
      name: 'Students',
      icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
      path: '/admin/dashboard/students',
      show: true,
      locked: !isSuperAdmin && !hasPermission(user, 'student_management')
    },
    {
      name: 'Attendance',
      icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
      path: '/admin/dashboard/attendance',
      show: true,
      locked: !isSuperAdmin && !hasPermission(user, 'attendance_management')
    },
    {
      name: 'Ticket Management',
      icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
      path: '/admin/dashboard/complaints-members',
      show: true,
      locked: !isSuperAdmin && !hasPermission(user, 'maintenance_ticket_management'),
      notificationType: 'complaint',
      hasSubmenu: true,
      submenu: [
        {
          name: 'Complaints',
          path: '/admin/dashboard/complaints',
          icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
          notificationType: 'complaint'
        },
        {
          name: 'Members',
          path: '/admin/dashboard/members',
          icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z'
        }
      ]
    },
    {
      name: 'Found & Lost',
      icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
      path: '/admin/dashboard/foundlost',
      show: true,
      locked: !isSuperAdmin && !hasPermission(user, 'found_lost_management')
    },
    {
      name: 'Fees',
      icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1',
      path: '/admin/dashboard/fee-management',
      show: true,
      locked: !isSuperAdmin && !hasPermission(user, 'fee_management')
    },
    {
      name: 'Leaves',
      icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
      path: '/admin/dashboard/leave',
      show: true,
      locked: !isSuperAdmin && !hasPermission(user, 'leave_management')
    },
    {
      name: 'Security',
      icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
      path: '/admin/dashboard/security',
      show: true,
      locked: !isSuperAdmin && !hasPermission(user, 'security_management'),
      hasSubmenu: true,
      submenu: [
        {
          name: 'Security Dashboard',
          path: '/admin/dashboard/security',
          icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
          show: true // Always show for view access
        },
        {
          name: 'Security Settings',
          path: '/admin/dashboard/security/settings',
          icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z',
          show: isSuperAdmin || hasFullAccess(user, 'security_management') // Only show for full access
        }
      ]
    },

    {
      name: 'Announcements',
      icon: 'M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z',
      path: '/admin/dashboard/announcements',
      show: true,
      locked: !isSuperAdmin && !hasPermission(user, 'announcement_management'),
      notificationType: 'announcement'
    },
    {
      name: 'Polls',
      icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
      path: '/admin/dashboard/polls',
      show: true,
      locked: !isSuperAdmin && !hasPermission(user, 'poll_management'),
      notificationType: 'poll'
    },
    {
      name: 'Admins',
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
      locked: !isSuperAdmin && !hasPermission(user, 'menu_management')
    },
   
    {
      name: 'Student Controls',
      icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z',
      path: '/admin/dashboard/feature-controls',
      show: true,
      locked: !isSuperAdmin && !hasPermission(user, 'feature_controls')
    }
  ];

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-blue-50 via-white to-blue-50 relative">
      <style>{`
        .scrollbar-visible::-webkit-scrollbar {
          width: 4px;
        }
        .scrollbar-visible::-webkit-scrollbar-track {
          background: transparent;
        }
        .scrollbar-visible::-webkit-scrollbar-thumb {
          background: rgba(0, 0, 0, 0.1);
          border-radius: 2px;
        }
        .scrollbar-visible::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 0, 0, 0.2);
        }
        @media (max-width: 1024px) {
          .scrollbar-visible::-webkit-scrollbar {
            width: 6px;
          }
        }
      `}</style>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsSidebarOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-white shadow-lg hover:bg-gray-50 transition-colors duration-200 border border-gray-200"
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
        className="fixed lg:relative top-0 left-0 w-72 sm:w-80 lg:w-64 xl:w-72 h-screen bg-white border-r border-blue-100 shadow-lg flex flex-col z-50 lg:translate-x-0 lg:!transform-none overflow-hidden"
      >


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
        <div className="flex-1 flex flex-col min-h-0 relative">
          {/* Top fade indicator */}
          <div className="absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-white to-transparent pointer-events-none z-10 opacity-0 transition-opacity duration-300" 
               id="top-fade"></div>
          
          <nav className="flex-1 px-4 space-y-2 overflow-y-auto min-h-0 scrollbar-visible pb-4" 
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
            {menuItems.filter(item => {
              // For super admin, show all items
              if (isSuperAdmin) return item.show;
              
              // For sub-admins, only show items they have access to (not locked)
              return item.show && !item.locked;
            }).map((item, index) => (
              <motion.div
                key={item.name}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: index * 0.1 }}
              >
                {item.hasSubmenu ? (
                  // Submenu item
                  <div>
                    <button
                      onClick={() => toggleSubmenu(item.name)}
                      className={`flex items-center justify-between w-full px-4 py-3 rounded-lg text-sm font-normal transition-all duration-300 ${
                        pathname.startsWith(item.path)
                          ? "bg-blue-50 text-blue-700 shadow-sm"
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      }`}
                    >
                      <div className="flex items-center gap-3">
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
                        <span>{item.name}</span>
                      </div>
                      {expandedMenus[item.name] ? (
                        <ChevronDownIcon className="w-4 h-4" />
                      ) : (
                        <ChevronRightIcon className="w-4 h-4" />
                      )}
                    </button>
                    
                    {/* Submenu items */}
                    <AnimatePresence>
                      {expandedMenus[item.name] && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="ml-6 mt-1 space-y-1"
                        >
                          {item.submenu.filter(subItem => subItem.show !== false).map((subItem, subIndex) => (
                            <NavLink
                              key={subItem.name}
                              to={subItem.path}
                              className={({ isActive }) =>
                                `flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-normal transition-all duration-300 ${
                                  isActive
                                    ? "bg-blue-50 text-blue-700 shadow-sm"
                                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                                }`
                              }
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
                                    d={subItem.icon}
                                  />
                                </svg>
                                {subItem.notificationType && notificationStates[subItem.notificationType] && (
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
                              <span>{subItem.name}</span>
                            </NavLink>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ) : (
                  // Regular item - normal NavLink
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
                )}
              </motion.div>
            ))}
          </nav>
          
          {/* Bottom fade indicator */}
          <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-white to-transparent pointer-events-none z-10 opacity-0 transition-opacity duration-300" 
               id="bottom-fade"></div>
        </div>

        {/* User Profile and Logout */}
        <div className="p-4 border-t border-gray-100 flex-shrink-0 bg-white">
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
          
          {/* Password Reset Button - Only show for sub-admins and principals */}
          {(user?.role === 'sub_admin' || user?.role === 'principal') && (
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
          )}
          
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-xs font-normal text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-all duration-300 shadow hover:shadow-md mt-2"
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
        <div className="w-full p-4 lg:p-8">
          <div className="flex justify-end mb-4">
            <NotificationBell />
          </div>
          <div className="min-h-[calc(100vh-120px)]">
            <Outlet />
          </div>
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
    <Route path="fee-management" element={<FeeManagement />} />
    <Route path="feature-controls" element={<FeatureControls />} />
    <Route path="rooms/management" element={<RoomManagement />} />
    <Route path="rooms/electricity" element={<ElectricityBills />} />
    <Route path="security" element={<SecurityDashboard />} />
    <Route path="security/settings" element={
      <ProtectedSection permission="security_management" sectionName="Security Settings" requiredAccess="full">
        <SecuritySettings />
      </ProtectedSection>
    } />
  </Routes>
);

export default AdminDashboard;