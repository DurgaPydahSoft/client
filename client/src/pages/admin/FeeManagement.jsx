import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/axios';
import toast from 'react-hot-toast';
import { 
  CurrencyDollarIcon, 
  ExclamationTriangleIcon, 
  CheckCircleIcon, 
  ClockIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowPathIcon,
  EyeIcon,
  PencilIcon,
  Cog6ToothIcon,
  PlusIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import LoadingSpinner from '../../components/LoadingSpinner';

const FeeManagement = () => {
  const { user } = useAuth();
  const [feeReminders, setFeeReminders] = useState([]);
  const [stats, setStats] = useState({
    totalStudents: 0,
    paidStudents: 0,
    pendingStudents: 0,
    activeReminders: 0,
    paymentRate: 0
  });
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    search: '',
    academicYear: '',
    status: ''
  });
  const [selectedReminder, setSelectedReminder] = useState(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateForm, setUpdateForm] = useState({
    term1: '',
    term2: '',
    term3: ''
  });
  const [updating, setUpdating] = useState(false);

  // Fee Structure Management
  const [feeStructures, setFeeStructures] = useState([]);
  const [showFeeStructureModal, setShowFeeStructureModal] = useState(false);
  const [selectedFeeStructure, setSelectedFeeStructure] = useState(null);
  const [feeStructureForm, setFeeStructureForm] = useState({
    academicYear: '',
    category: '',
    totalFee: 45000
  });
  const [feeStructureLoading, setFeeStructureLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('reminders'); // 'reminders' or 'structure'

  // Debug authentication state
  useEffect(() => {
    console.log('🔍 FeeManagement: Current user:', user);
    console.log('🔍 FeeManagement: Token in localStorage:', localStorage.getItem('token') ? 'exists' : 'missing');
    console.log('🔍 FeeManagement: User role:', user?.role);
    
    // Test admin validation endpoint
    const testAdminAuth = async () => {
      try {
        console.log('🔍 FeeManagement: Testing admin validation...');
        const response = await api.get('/api/admin-management/validate');
        console.log('🔍 FeeManagement: Admin validation successful:', response.data);
      } catch (err) {
        console.error('🔍 FeeManagement: Admin validation failed:', err.response?.data || err.message);
      }
    };
    
    if (user?.role && (user.role === 'admin' || user.role === 'super_admin' || user.role === 'sub_admin' || user.role === 'warden' || user.role === 'principal')) {
      testAdminAuth();
    }
  }, [user]);

  useEffect(() => {
    fetchStats();
    fetchFeeReminders();
  }, []);

  useEffect(() => {
    fetchFeeReminders();
  }, [currentPage, filters]);

  const fetchStats = async () => {
    try {
      console.log('🔍 FeeManagement: Fetching stats...');
      console.log('🔍 FeeManagement: Auth header:', api.defaults.headers.common['Authorization'] ? 'present' : 'missing');
      
      const response = await api.get('/api/fee-reminders/admin/stats');
      
      console.log('🔍 FeeManagement: Stats response:', response.data);
      
      if (response.data.success) {
        const { totalStudents, paidReminders, pendingReminders, activeReminders } = response.data.data;
        const paymentRate = totalStudents > 0 ? Math.round((paidReminders / totalStudents) * 100) : 0;
        
        setStats({
          totalStudents,
          paidStudents: paidReminders,
          pendingStudents: pendingReminders,
          activeReminders,
          paymentRate
        });
      } else {
        setError('Failed to fetch stats');
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
      console.error('🔍 FeeManagement: Stats error response:', err.response?.data);
      setError(err.response?.data?.message || 'Failed to fetch stats');
    }
  };

  const fetchFeeReminders = async () => {
    try {
      setTableLoading(true);
      const params = new URLSearchParams({
        page: currentPage,
        limit: 10
      });

      if (filters.search) params.append('search', filters.search);
      if (filters.academicYear) params.append('academicYear', filters.academicYear);
      if (filters.status) params.append('status', filters.status);

      console.log('🔍 Frontend: Fetching fee reminders with params:', params.toString());
      console.log('🔍 Frontend: Auth header:', api.defaults.headers.common['Authorization'] ? 'present' : 'missing');
      
      const response = await api.get(`/api/fee-reminders/admin/all?${params}`);
      
      console.log('🔍 Frontend: Response received:', response.data);
      
      if (response.data.success) {
        const reminders = response.data.data.feeReminders;
        console.log('🔍 Frontend: Fee reminders received:', reminders.length);
        console.log('🔍 Frontend: Sample reminder:', reminders[0]);
        
        setFeeReminders(reminders);
        setTotalPages(response.data.data.totalPages);
      } else {
        setError('Failed to fetch fee reminders');
      }
    } catch (err) {
      console.error('Error fetching fee reminders:', err);
      console.error('🔍 Frontend: Fee reminders error response:', err.response?.data);
      setError(err.response?.data?.message || 'Failed to fetch fee reminders');
    } finally {
      setTableLoading(false);
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    if (!selectedReminder) return;

    try {
      setUpdating(true);
      const response = await api.put(`/api/fee-reminders/admin/${selectedReminder._id}/status`, updateForm);
      
      if (response.data.success) {
        toast.success('Fee payment status updated successfully');
        setShowUpdateModal(false);
        setSelectedReminder(null);
        setUpdateForm({ term1: '', term2: '', term3: '' });
        fetchFeeReminders();
        fetchStats();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update fee status');
    } finally {
      setUpdating(false);
    }
  };

  const openUpdateModal = (reminder) => {
    setSelectedReminder(reminder);
    setUpdateForm({
      term1: reminder.feeStatus.term1,
      term2: reminder.feeStatus.term2,
      term3: reminder.feeStatus.term3
    });
    setShowUpdateModal(true);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Paid':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'Unpaid':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Paid':
        return <CheckCircleIcon className="w-4 h-4 text-green-600" />;
      case 'Unpaid':
        return <ExclamationTriangleIcon className="w-4 h-4 text-red-600" />;
      default:
        return <ClockIcon className="w-4 h-4 text-gray-600" />;
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({ search: '', academicYear: '', status: '' });
    setCurrentPage(1);
  };

  const createFeeRemindersForAll = async () => {
    try {
      setLoading(true);
      console.log('🔍 FeeManagement: Creating fee reminders for all students...');
      console.log('🔍 FeeManagement: Auth header:', api.defaults.headers.common['Authorization'] ? 'present' : 'missing');
      
      const response = await api.post('/api/fee-reminders/admin/create-all', {
        academicYear: '2024-2025'
      });
      
      console.log('🔍 FeeManagement: Create response:', response.data);
      
      if (response.data.success) {
        alert(`Successfully created ${response.data.data.created} fee reminders for students`);
        fetchFeeReminders();
        fetchStats();
      } else {
        setError('Failed to create fee reminders');
      }
    } catch (err) {
      console.error('Error creating fee reminders:', err);
      console.error('🔍 FeeManagement: Create error response:', err.response?.data);
      setError(err.response?.data?.message || 'Failed to create fee reminders');
    } finally {
      setLoading(false);
    }
  };

  // Fee Structure Management Functions
  const fetchFeeStructures = async () => {
    try {
      console.log('🔍 Fetching fee structures...');
      setFeeStructureLoading(true);
      const academicYear = feeStructureForm.academicYear || '2024-2025';
      console.log('🔍 Academic year:', academicYear);
      
      const response = await api.get(`/api/fee-structures?academicYear=${academicYear}`);
      console.log('🔍 Fee structures response:', response.data);
      
      if (response.data.success) {
        const structures = response.data.data || [];
        console.log('🔍 Fee structures received:', structures);
        console.log('🔍 Structures type:', typeof structures);
        console.log('🔍 Is array:', Array.isArray(structures));
        
        // Ensure we have an array and validate the data
        if (Array.isArray(structures)) {
          setFeeStructures(structures);
          console.log('🔍 Fee structures set successfully:', structures.length);
        } else {
          console.error('🔍 Invalid data format - expected array:', structures);
          setFeeStructures([]);
          setError('Invalid data format received');
        }
      } else {
        console.error('🔍 Failed to fetch fee structures:', response.data);
        setError('Failed to fetch fee structures');
      }
    } catch (err) {
      console.error('Error fetching fee structures:', err);
      console.error('🔍 Fee structures error response:', err.response?.data);
      setError(err.response?.data?.message || 'Failed to fetch fee structures');
    } finally {
      setFeeStructureLoading(false);
    }
  };

  const handleFeeStructureSubmit = async (e) => {
    e.preventDefault();
    try {
      setFeeStructureLoading(true);
      
      // Send only the totalFee to backend - backend will calculate term fees
      const feeData = {
        academicYear: feeStructureForm.academicYear,
        category: feeStructureForm.category,
        totalFee: feeStructureForm.totalFee
      };
      
      console.log('🔍 Frontend: Sending fee data to backend:', feeData);
      
      const response = await api.post('/api/fee-structures', feeData);
      
      console.log('🔍 Frontend: Response from backend:', response.data);
      
      if (response.data.success) {
        toast.success('Fee structure saved successfully');
        setShowFeeStructureModal(false);
        setFeeStructureForm({
          academicYear: '',
          category: '',
          totalFee: 45000
        });
        fetchFeeStructures();
      } else {
        console.error('🔍 Frontend: Backend returned error:', response.data);
        setError(response.data.message || 'Failed to save fee structure');
      }
    } catch (err) {
      console.error('Error saving fee structure:', err);
      setError(err.response?.data?.message || 'Failed to save fee structure');
    } finally {
      setFeeStructureLoading(false);
    }
  };

  // Get available categories (excluding already created ones)
  const getAvailableCategories = () => {
    const allCategories = ['A+', 'A', 'B+', 'B', 'C'];
    const existingCategories = feeStructures.map(structure => structure.category);
    const academicYear = feeStructureForm.academicYear || '2024-2025';
    
    // If editing, include the current category
    if (selectedFeeStructure) {
      return allCategories;
    }
    
    // If creating new, exclude existing categories for the same academic year
    return allCategories.filter(category => !existingCategories.includes(category));
  };

  const openFeeStructureModal = (structure = null) => {
    if (structure) {
      setSelectedFeeStructure(structure);
      setFeeStructureForm({
        academicYear: structure.academicYear,
        category: structure.category,
        totalFee: (structure.totalFee || 0) || ((structure.term1Fee || 0) + (structure.term2Fee || 0) + (structure.term3Fee || 0))
      });
    } else {
      setSelectedFeeStructure(null);
      setFeeStructureForm({
        academicYear: '2024-2025',
        category: '',
        totalFee: 45000
      });
    }
    
    setShowFeeStructureModal(true);
  };

  const deleteFeeStructure = async (academicYear, category) => {
    if (!window.confirm(`Are you sure you want to delete fee structure for ${category} category?`)) {
      return;
    }

    try {
      setFeeStructureLoading(true);
      const response = await api.delete(`/api/fee-structures/${academicYear}/${category}`);
      
      if (response.data.success) {
        toast.success('Fee structure deleted successfully');
        fetchFeeStructures();
      } else {
        setError('Failed to delete fee structure');
      }
    } catch (err) {
      console.error('Error deleting fee structure:', err);
      setError(err.response?.data?.message || 'Failed to delete fee structure');
    } finally {
      setFeeStructureLoading(false);
    }
  };



  useEffect(() => {
    console.log('🔍 useEffect triggered - activeTab:', activeTab);
    if (activeTab === 'structure') {
      console.log('🔍 Structure tab active, fetching fee structures...');
      fetchFeeStructures();
    }
  }, [activeTab, feeStructureForm.academicYear]);

  // Initial load - fetch fee structures if structure tab is active
  useEffect(() => {
    console.log('🔍 Initial load useEffect - activeTab:', activeTab);
    if (activeTab === 'structure') {
      console.log('🔍 Initial load - fetching fee structures...');
      fetchFeeStructures();
    }
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto mt-16 sm:mt-0">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-blue-900 mb-2">
          Hostel Fee Management
        </h1>
        <p className="text-gray-600">
          Manage student fee payments and track payment status
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('reminders')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'reminders'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Fee Reminders
            </button>
            <button
              onClick={() => setActiveTab('structure')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'structure'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Fee Structure
            </button>
          </nav>
        </div>
      </div>

      {activeTab === 'reminders' ? (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <CurrencyDollarIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Total Students</p>
              <p className="text-lg font-semibold text-gray-900">{stats.totalStudents}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircleIcon className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Paid Students</p>
              <p className="text-lg font-semibold text-gray-900">{stats.paidStudents}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <ExclamationTriangleIcon className="w-6 h-6 text-red-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Pending Students</p>
              <p className="text-lg font-semibold text-gray-900">{stats.pendingStudents}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <ClockIcon className="w-6 h-6 text-orange-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Active Reminders</p>
              <p className="text-lg font-semibold text-gray-900">{stats.activeReminders}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <CurrencyDollarIcon className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Payment Rate</p>
              <p className="text-lg font-semibold text-gray-900">{stats.paymentRate}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by student name or roll number..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <select
              value={filters.academicYear}
              onChange={(e) => handleFilterChange('academicYear', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Academic Years</option>
              <option value="2023-2024">2023-2024</option>
              <option value="2024-2025">2024-2025</option>
              <option value="2025-2026">2025-2026</option>
            </select>
            
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Status</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
            </select>
            
            <button
              onClick={clearFilters}
              className="px-3 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <FunnelIcon className="w-4 h-4" />
            </button>
            
            <button
              onClick={fetchFeeReminders}
              className="px-3 py-2 text-blue-600 hover:text-blue-800 border border-blue-300 rounded-lg hover:bg-blue-50"
            >
              <ArrowPathIcon className="w-4 h-4" />
            </button>
            
            <button
              onClick={createFeeRemindersForAll}
              disabled={loading}
              className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Fee Reminders'}
            </button>
          </div>
        </div>
      </div>

      {/* Fee Reminders Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Student
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Academic Year
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Term 1
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Term 2
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Term 3
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Current Reminder
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Updated
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {tableLoading ? (
                <tr>
                  <td colSpan="8" className="px-6 py-4 text-center">
                    <LoadingSpinner />
                  </td>
                </tr>
              ) : feeReminders.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-4 text-center text-gray-500">
                    <div className="space-y-2">
                      <p>No fee reminders found</p>
                      <p className="text-sm">Click "Create Fee Reminders" to generate fee records for all students</p>
                    </div>
                  </td>
                </tr>
              ) : (
                feeReminders.map((reminder) => (
                  <tr key={reminder._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {reminder.student?.name || 'No Name'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {reminder.student?.rollNumber || 'No Roll Number'}
                        </div>
                        {!reminder.student && (
                          <div className="text-xs text-red-500">
                            Student data missing
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {reminder.academicYear}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(reminder.feeStatus.term1)}`}>
                        {getStatusIcon(reminder.feeStatus.term1)}
                        <span className="ml-1">{reminder.feeStatus.term1}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(reminder.feeStatus.term2)}`}>
                        {getStatusIcon(reminder.feeStatus.term2)}
                        <span className="ml-1">{reminder.feeStatus.term2}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(reminder.feeStatus.term3)}`}>
                        {getStatusIcon(reminder.feeStatus.term3)}
                        <span className="ml-1">{reminder.feeStatus.term3}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {reminder.currentReminder > 0 ? `Reminder ${reminder.currentReminder}` : 'None'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {reminder.lastUpdatedAt ? formatDate(reminder.lastUpdatedAt) : 'Not updated'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => openUpdateModal(reminder)}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Page <span className="font-medium">{currentPage}</span> of{' '}
                  <span className="font-medium">{totalPages}</span>
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Update Modal */}
      {showUpdateModal && selectedReminder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Update Fee Payment Status
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Student: {selectedReminder.student?.name} ({selectedReminder.student?.rollNumber})
            </p>
            
            <form onSubmit={handleUpdateStatus}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Term 1 Status
                  </label>
                  <select
                    value={updateForm.term1}
                    onChange={(e) => setUpdateForm(prev => ({ ...prev, term1: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="Unpaid">Unpaid</option>
                    <option value="Paid">Paid</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Term 2 Status
                  </label>
                  <select
                    value={updateForm.term2}
                    onChange={(e) => setUpdateForm(prev => ({ ...prev, term2: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="Unpaid">Unpaid</option>
                    <option value="Paid">Paid</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Term 3 Status
                  </label>
                  <select
                    value={updateForm.term3}
                    onChange={(e) => setUpdateForm(prev => ({ ...prev, term3: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="Unpaid">Unpaid</option>
                    <option value="Paid">Paid</option>
                  </select>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowUpdateModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {updating ? 'Updating...' : 'Update Status'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

        </>
      ) : (
        <>
          {/* Fee Structure Management */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Fee Structure Management</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => openFeeStructureModal()}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={getAvailableCategories().length === 0}
                >
                  <PlusIcon className="w-4 h-4" />
                  Add Fee Structure
                </button>
              </div>
            </div>
            
            {feeStructureLoading ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner />
              </div>
            ) : feeStructures.length === 0 ? (
              <div className="text-center py-8">
                <Cog6ToothIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500">No fee structures found</p>
                <p className="text-sm text-gray-400">Create fee structures for different categories and academic years</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Academic Year
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Term 1 Fee
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Term 2 Fee
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Term 3 Fee
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total Fee
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {feeStructures && feeStructures.length > 0 && feeStructures.map((structure, index) => (
                      <tr key={`${structure.academicYear}-${structure.category}`} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {structure.academicYear}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {structure.category}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ₹{(structure.term1Fee || 0).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ₹{(structure.term2Fee || 0).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ₹{(structure.term3Fee || 0).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          ₹{((structure.totalFee || 0) || (structure.term1Fee || 0) + (structure.term2Fee || 0) + (structure.term3Fee || 0)).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => openFeeStructureModal(structure)}
                            className="text-blue-600 hover:text-blue-900 mr-3"
                          >
                            <PencilIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteFeeStructure(structure.academicYear, structure.category)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Fee Structure Modal - Outside conditional blocks so it's always available */}
      {showFeeStructureModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {selectedFeeStructure ? 'Edit Fee Structure' : 'Add Fee Structure'}
            </h3>
            
            <form onSubmit={handleFeeStructureSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Academic Year
                  </label>
                  <input
                    type="text"
                    value={feeStructureForm.academicYear}
                    onChange={(e) => setFeeStructureForm(prev => ({ ...prev, academicYear: e.target.value }))}
                    placeholder="e.g., 2024-2025"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    value={feeStructureForm.category}
                    onChange={(e) => setFeeStructureForm(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                    disabled={getAvailableCategories().length === 0}
                  >
                    <option value="">
                      {getAvailableCategories().length === 0 
                        ? 'All categories already created for this academic year' 
                        : 'Select Category'
                      }
                    </option>
                    {getAvailableCategories().map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                  {getAvailableCategories().length === 0 && (
                    <p className="text-sm text-gray-500 mt-1">
                      All fee structure categories have been created for the selected academic year.
                    </p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Total Fee (₹)
                  </label>
                  <input
                    type="number"
                    value={feeStructureForm.totalFee}
                    onChange={(e) => setFeeStructureForm(prev => ({ ...prev, totalFee: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                    min="0"
                  />
                </div>
                
                {/* Term Fee Breakdown Preview */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Term Fee Breakdown (Auto-calculated)</h4>
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div className="text-center">
                      <div className="font-medium text-blue-600">Term 1</div>
                      <div className="text-gray-600">₹{Math.round((feeStructureForm.totalFee || 0) * 0.4).toLocaleString()}</div>
                      <div className="text-xs text-gray-500">40%</div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium text-green-600">Term 2</div>
                      <div className="text-gray-600">₹{Math.round((feeStructureForm.totalFee || 0) * 0.3).toLocaleString()}</div>
                      <div className="text-xs text-gray-500">30%</div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium text-purple-600">Term 3</div>
                      <div className="text-gray-600">₹{Math.round((feeStructureForm.totalFee || 0) * 0.3).toLocaleString()}</div>
                      <div className="text-xs text-gray-500">30%</div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowFeeStructureModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={feeStructureLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {feeStructureLoading ? 'Saving...' : (selectedFeeStructure ? 'Update' : 'Save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeeManagement; 