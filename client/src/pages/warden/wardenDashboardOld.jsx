import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MegaphoneIcon,
  UsersIcon,
  MagnifyingGlassIcon,
  UserGroupIcon,
  CalendarIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationCircleIcon,
  Bars3Icon,
  XMarkIcon,
  ShieldExclamationIcon
} from '@heroicons/react/24/outline';
import api from '../../utils/axios';
import toast from 'react-hot-toast';
import LoadingSpinner from '../../components/LoadingSpinner';
import SEO from '../../components/SEO';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, NavLink, Outlet, Routes, Route, useLocation } from 'react-router-dom';
import WardenHome from './WardenHome';
import TakeAttendance from './TakeAttendance';
import ViewAttendance from './ViewAttendance';
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
  const [loading, setLoading] = useState(true);
  const [announcements, setAnnouncements] = useState([]);
  const [students, setStudents] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalStudents, setTotalStudents] = useState(0);
  const [filters, setFilters] = useState({
    search: '',
    course: '',
    branch: '',
    gender: '',
    category: '',
    roomNumber: '',
    batch: '',
    academicYear: '',
    hostelStatus: 'Active'
  });

  // Bulk outing states
  const [showBulkOuting, setShowBulkOuting] = useState(true);
  const [bulkOutingStudents, setBulkOutingStudents] = useState([]);
  const [selectedBulkStudents, setSelectedBulkStudents] = useState([]);
  const [bulkOutingLoading, setBulkOutingLoading] = useState(false);
  const [submittingBulkOuting, setSubmittingBulkOuting] = useState(false);
  const [bulkOutings, setBulkOutings] = useState([]);
  const [showBulkHistory, setShowBulkHistory] = useState(false);
  
  // Bulk outing form data
  const [bulkOutingForm, setBulkOutingForm] = useState({
    outingDate: '',
    reason: ''
  });
  
  // Bulk outing filters
  const [bulkOutingFilters, setBulkOutingFilters] = useState({
    course: '',
    branch: '',
    gender: '',
    category: '',
    roomNumber: '',
    batch: '',
    academicYear: '',
    hostelStatus: 'Active'
  });

  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    fetchDashboardData();
    fetchStudents();
    fetchBulkOutings();
  }, []);

  useEffect(() => {
    if (showBulkOuting) {
      fetchBulkOutingStudents();
    }
  }, [bulkOutingFilters]);

  const fetchDashboardData = async () => {
    try {
      // Fetch announcements using warden-specific endpoint
      const announcementsRes = await api.get('/api/announcements/warden');

      if (announcementsRes.data.success) {
        setAnnouncements(announcementsRes.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    setStudentsLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage,
        limit: 10
      });

      // Add filters only if they have values
      if (filters.search) params.append('search', filters.search);
      if (filters.course) params.append('course', filters.course);
      if (filters.branch) params.append('branch', filters.branch);
      if (filters.gender) params.append('gender', filters.gender);
      if (filters.category) params.append('category', filters.category);
      if (filters.roomNumber) params.append('roomNumber', filters.roomNumber);
      if (filters.batch) params.append('batch', filters.batch);
      if (filters.academicYear) params.append('academicYear', filters.academicYear);
      if (filters.hostelStatus) params.append('hostelStatus', filters.hostelStatus);

      const res = await api.get(`/api/admin/warden/students?${params}`);
      if (res.data.success) {
        setStudents(res.data.data.students || []);
        setTotalPages(res.data.data.totalPages || 1);
        setTotalStudents(res.data.data.totalStudents || 0);
      } else {
        throw new Error(res.data.message || 'Failed to fetch students');
      }
    } catch (error) {
      console.error('Error fetching students:', error);
      toast.error('Failed to fetch students');
      setStudents([]);
      setTotalPages(1);
      setTotalStudents(0);
    } finally {
      setStudentsLoading(false);
    }
  };

  const fetchBulkOutingStudents = async () => {
    setBulkOutingLoading(true);
    try {
      const params = new URLSearchParams();
      Object.keys(bulkOutingFilters).forEach(key => {
        if (bulkOutingFilters[key]) {
          params.append(key, bulkOutingFilters[key]);
        }
      });

      const response = await api.get(`/api/bulk-outing/warden/students?${params}`);
      if (response.data.success) {
        setBulkOutingStudents(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching bulk outing students:', error);
      toast.error('Failed to fetch students');
    } finally {
      setBulkOutingLoading(false);
    }
  };

  const fetchBulkOutings = async () => {
    try {
      const response = await api.get('/api/bulk-outing/warden');
      if (response.data.success) {
        setBulkOutings(response.data.data.bulkOutings);
      }
    } catch (error) {
      console.error('Error fetching bulk outings:', error);
      toast.error('Failed to fetch bulk outing history');
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
    setCurrentPage(1); // Reset to first page when filters change
  };

  const handleBulkOutingFilterChange = (e) => {
    const { name, value } = e.target;
    setBulkOutingFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleBulkOutingFormChange = (e) => {
    const { name, value } = e.target;
    setBulkOutingForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  const handleStudentSelect = (studentId) => {
    setSelectedBulkStudents(prev => {
      if (prev.includes(studentId)) {
        return prev.filter(id => id !== studentId);
      } else {
        return [...prev, studentId];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedBulkStudents.length === bulkOutingStudents.length) {
      setSelectedBulkStudents([]);
    } else {
      setSelectedBulkStudents(bulkOutingStudents.map(student => student._id));
    }
  };

  const handleBulkOutingSubmit = async (e) => {
    e.preventDefault();
    
    if (!bulkOutingForm.outingDate || !bulkOutingForm.reason) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (selectedBulkStudents.length === 0) {
      toast.error('Please select at least one student');
      return;
    }

    setSubmittingBulkOuting(true);
    try {
      const response = await api.post('/api/bulk-outing/create', {
        outingDate: bulkOutingForm.outingDate,
        reason: bulkOutingForm.reason,
        selectedStudentIds: selectedBulkStudents,
        filters: bulkOutingFilters
      });

      if (response.data.success) {
        toast.success(`Bulk outing request created for ${selectedBulkStudents.length} students`);
        setBulkOutingForm({ outingDate: '', reason: '' });
        setSelectedBulkStudents([]);
        fetchBulkOutings();
        setShowBulkOuting(false);
      }
    } catch (error) {
      console.error('Error creating bulk outing:', error);
      toast.error(error.response?.data?.message || 'Failed to create bulk outing request');
    } finally {
      setSubmittingBulkOuting(false);
    }
  };

  // Clear selected students when filters change
  useEffect(() => {
    setSelectedBulkStudents([]);
  }, [bulkOutingFilters]);

  // Clear selected students when form is hidden
  useEffect(() => {
    if (!showBulkOuting) {
      setSelectedBulkStudents([]);
    }
  }, [showBulkOuting]);

  useEffect(() => {
    fetchStudents();
  }, [currentPage, filters]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'Approved':
        return 'text-green-600 bg-green-50';
      case 'Rejected':
        return 'text-red-600 bg-red-50';
      case 'Pending':
        return 'text-yellow-600 bg-yellow-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Approved':
        return <CheckCircleIcon className="w-5 h-5" />;
      case 'Rejected':
        return <XCircleIcon className="w-5 h-5" />;
      case 'Pending':
        return <ExclamationCircleIcon className="w-5 h-5" />;
      default:
        return null;
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Close sidebar when route changes
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  const menuItems = [
    {
      name: 'Dashboard Home',
      icon: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z',
      path: '/warden/dashboard',
      show: true,
      locked: false
    },
    {
      name: 'Take Attendance',
      icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
      path: '/warden/dashboard/take-attendance',
      show: true,
      locked: false
    },
    {
      name: 'View Attendance',
      icon: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z',
      path: '/warden/dashboard/view-attendance',
      show: true,
      locked: false
    }
  ];

  if (loading) return <LoadingSpinner />;

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
        className="fixed lg:relative top-0 left-0 w-56 h-screen bg-white border-r border-green-100 shadow-lg flex flex-col z-50 lg:translate-x-0 lg:!transform-none"
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
        <div className="flex-1 relative">
          <nav className="flex-1 px-4 space-y-2 overflow-y-auto scrollbar-hide h-full">
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
                ) : (
                  // Active item - normal NavLink
                  <NavLink
                    to={item.path}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-normal transition-all duration-300 ${
                        isActive
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

const WardenDashboardLayout = () => (
  <Routes>
    <Route index element={<WardenHome />} />
    <Route path="take-attendance" element={<TakeAttendance />} />
    <Route path="view-attendance" element={<ViewAttendance />} />
  </Routes>
);

export default WardenDashboard;
