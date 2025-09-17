import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, NavLink, Outlet, Routes, Route, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bars3Icon,
  XMarkIcon,
  ShieldExclamationIcon
} from '@heroicons/react/24/outline';
import NotificationBell from '../../components/NotificationBell';

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
          Please contact your admin to request access.
        </p>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-800">
            <strong>Available sections:</strong> Check the sidebar for sections you can access.
          </p>
        </div>
      </div>
    </div>
  );
};

const WardenDashboard = () => {
  return <WardenDashboardLayout />;
};

const WardenDashboardLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState(new Set());
  const { pathname } = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Close sidebar when route changes
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  // Auto-expand complaints section when on complaints pages
  useEffect(() => {
    if (pathname.includes('/complaints')) {
      setExpandedItems(prev => {
        const newSet = new Set(prev);
        newSet.add('Complaints');
        return newSet;
      });
    }
  }, [pathname]);

  // Auto-expand attendance section when on attendance pages
  useEffect(() => {
    if (pathname.includes('/take-attendance') || pathname.includes('/view-attendance')) {
      setExpandedItems(prev => {
        const newSet = new Set(prev);
        newSet.add('Attendance');
        return newSet;
      });
    }
  }, [pathname]);

  // Auto-expand leave & stay requests section when on leave or stay pages
  useEffect(() => {
    if (pathname.includes('/leave-management') || pathname.includes('/stay-in-hostel-requests')) {
      setExpandedItems(prev => {
        const newSet = new Set(prev);
        newSet.add('Leave & Stay Requests');
        return newSet;
      });
    }
  }, [pathname]);

  const toggleExpanded = (itemName) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemName)) {
        newSet.delete(itemName);
      } else {
        newSet.add(itemName);
      }
      return newSet;
    });
  };

  const menuItems = [
    {
      name: 'Dashboard Home',
      icon: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z',
      path: '/warden/dashboard',
      show: true,
      locked: false
    },
    {
      name: 'Attendance',
      icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
      path: '/warden/dashboard/attendance',
      show: true,
      locked: false,
      subItems: [
        {
          name: 'Students',
          path: '/warden/dashboard/take-attendance',
          icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
        },
        {
          name: 'View Attendance',
          path: '/warden/dashboard/view-attendance',
          icon: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z',
        },
        {
          name: 'Staff/Guests',
          path: '/warden/dashboard/take-staff-attendance',
          icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
        }
      ],
    },
    {
      name: 'Complaints',
      icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
      path: '/warden/dashboard/complaints',
      show: true,
      locked: false,
      subItems: [
        {
          name: 'Raise Complaint',
          path: '/warden/dashboard/complaints/raise',
          icon: 'M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z'
        },
        {
          name: 'View Complaints',
          path: '/warden/dashboard/complaints/view',
          icon: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z'
        }
      ]
    },
    {
      name: 'Leave & Stay Requests',
      icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
      path: '/warden/dashboard/leave-management',
      show: true,
      locked: false,
      subItems: [
        {
          name: 'Leave Management',
          path: '/warden/dashboard/leave-management',
          icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
        },
        {
          name: 'Stay in Hostel Requests',
          path: '/warden/dashboard/stay-in-hostel-requests',
          icon: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2 M12 12v3 M12 12a2 2 0 100-4 2 2 0 000 4z'
        }
      ]
    },
    {
      name: 'Bulk Outing',
      icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
      path: '/warden/dashboard/bulk-outing',
      show: true,
      locked: false
    },
    {
      name: 'Fee Management',
      icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1',
      path: '/warden/dashboard/fee-management',
      show: true,
      locked: false
    },
    {
      name: 'Electricity Bills',
      icon: 'M13 10V3L4 14h7v7l9-11h-7z',
      path: '/warden/dashboard/electricity-bills',
      show: true,
      locked: false
    },
    {
      name: 'Notifications',
      icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9',
      path: '/warden/dashboard/notifications',
      show: true,
      locked: false
    }
  ];

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-green-50 via-white to-green-50 overflow-hidden">
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
        className="fixed lg:relative top-0 left-0 bottom-0 w-72 lg:w-56 bg-white border-r border-green-100 shadow-lg flex flex-col z-50 lg:translate-x-0 lg:!transform-none"
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
          <div className="bg-gradient-to-r from-green-600 to-green-800 text-white p-3 rounded-xl shadow-lg flex items-center gap-2">
            <div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-sm">
              <svg className="w-4 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div className="flex-1">
              <h1 className="font-semibold text-xs">Hostel Warden</h1>
              <p className="text-xs text-green-100">Management Portal</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-hidden">
          <nav className="h-full px-4 space-y-2 overflow-y-auto scrollbar-hide">
            {menuItems.filter(item => item.show).map((item, index) => (
              <motion.div
                key={item.name}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: index * 0.1 }}
              >
                {item.locked ? (
                  // Locked item - show as disabled
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
                ) : item.subItems ? (
                  // Item with sub-items
                  <div className="space-y-1">
                    <button
                      onClick={() => toggleExpanded(item.name)}
                      className={`flex items-center justify-between w-full px-4 py-3 rounded-lg text-sm font-normal transition-all duration-300 ${pathname.startsWith(item.path)
                        ? "bg-green-50 text-green-700 shadow-sm"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                        }`}
                    >
                      <div className="flex items-center gap-3">
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
                        {item.name}
                      </div>
                      <svg
                        className={`w-4 h-4 transition-transform duration-200 ${expandedItems.has(item.name) ? 'rotate-180' : ''
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
                    </button>
                    {/* Sub-items */}
                    {expandedItems.has(item.name) && (
                      <div className="ml-6 space-y-1">
                        {item.subItems.map((subItem, subIndex) => (
                          <NavLink
                            key={subItem.name}
                            to={subItem.path}
                            className={({ isActive }) =>
                              `flex items-center gap-3 px-4 py-2 rounded-lg text-xs font-normal transition-all duration-300 ${isActive
                                ? "bg-green-100 text-green-700 shadow-sm"
                                : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                              }`
                            }
                            end
                          >
                            <div className="relative">
                              <svg
                                className="w-3 h-3"
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
                            </div>
                            {subItem.name}
                          </NavLink>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  // Active item - normal NavLink
                  <NavLink
                    to={item.path}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-normal transition-all duration-300 ${isActive
                        ? "bg-green-50 text-green-700 shadow-sm"
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
                    </div>
                    {item.name}
                  </NavLink>
                )}
              </motion.div>
            ))}
          </nav>
          {/* Bottom padding for scroll space */}
          <div className="h-4"></div>
        </div>

        {/* User Profile and Logout */}
        <div className="p-4 border-t border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-white font-bold shadow-md">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'W'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-gray-900 truncate">
                {user?.name || 'Warden'}
              </div>
              <div className="text-xs text-gray-500 truncate">
                Warden
              </div>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-xs font-normal text-white bg-green-600 hover:bg-green-700 rounded-lg transition-all duration-300 shadow hover:shadow-md"
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
    </div>
  );
};

export default WardenDashboard;
