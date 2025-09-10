import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../utils/axios';
import toast from 'react-hot-toast';
import {
  UserPlusIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
  UserIcon,
  PhoneIcon,
  EnvelopeIcon,
  BuildingOfficeIcon,
  CameraIcon,
  CheckCircleIcon,
  ClockIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  EyeIcon,
  EyeSlashIcon,
  ChartBarIcon,
  CalendarIcon,
  SunIcon,
  MoonIcon,
  StarIcon,
  CheckIcon,
  XMarkIcon as XMark,
  DocumentTextIcon,
  CogIcon,
  PrinterIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline';
import LoadingSpinner from '../../components/LoadingSpinner';
import SEO from '../../components/SEO';

const StaffGuestsManagement = () => {
  const [activeTab, setActiveTab] = useState('management');
  const [staffGuests, setStaffGuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingStaffGuest, setEditingStaffGuest] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterGender, setFilterGender] = useState('all');
  const [stats, setStats] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    type: 'staff',
    gender: 'Male',
    profession: '',
    phoneNumber: '',
    email: '',
    department: '',
    purpose: '',
    checkinDate: '',
    checkoutDate: '',
    photo: null
  });

  // Attendance-related state
  const [attendanceData, setAttendanceData] = useState([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceStats, setAttendanceStats] = useState({});
  const [attendanceFilters, setAttendanceFilters] = useState({
    date: new Date().toISOString().split('T')[0],
    type: 'all',
    department: 'all',
    status: 'all'
  });
  const [attendanceSearchTerm, setAttendanceSearchTerm] = useState('');

  // Settings and Admit Card state
  const [dailyRateSettings, setDailyRateSettings] = useState({
    staffDailyRate: 100,
    lastUpdated: null,
    updatedBy: null
  });
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [admitCardData, setAdmitCardData] = useState(null);
  const [admitCardLoading, setAdmitCardLoading] = useState(false);

  useEffect(() => {
    fetchStaffGuests();
    fetchStats();
  }, [currentPage, searchTerm, filterType, filterGender]);

  useEffect(() => {
    if (activeTab === 'attendance') {
      fetchAttendanceData();
      fetchAttendanceStats();
    } else if (activeTab === 'settings') {
      fetchDailyRateSettings();
    }
  }, [activeTab, attendanceFilters, attendanceSearchTerm]);

  const fetchStaffGuests = async () => {
    try {
      setLoading(true);
       const params = new URLSearchParams({
         page: currentPage,
         limit: 10,
         search: searchTerm,
         type: filterType !== 'all' ? filterType : '',
         gender: filterGender !== 'all' ? filterGender : '',
         isActive: 'true'
       });

      const response = await api.get(`/api/admin/staff-guests?${params}`);
      console.log('Full API response:', response);
      console.log('Response data:', response.data);
      if (response.data.success) {
        console.log('Staff/Guests data:', response.data.data);
        console.log('StaffGuests array:', response.data.data.staffGuests);
        console.log('Pagination data:', response.data.data.pagination);
        setStaffGuests(response.data.data.staffGuests || []);
        setTotalPages(response.data.data.pagination?.total || 1);
      } else {
        console.error('API response not successful:', response.data);
      }
    } catch (error) {
      console.error('Error fetching staff/guests:', error);
      toast.error('Failed to fetch staff/guests');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/api/admin/staff-guests/stats');
      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchAttendanceData = async () => {
    try {
      setAttendanceLoading(true);
      const params = new URLSearchParams({
        date: attendanceFilters.date,
        ...(attendanceFilters.type !== 'all' && { type: attendanceFilters.type }),
        ...(attendanceFilters.department !== 'all' && { department: attendanceFilters.department }),
        ...(attendanceFilters.status !== 'all' && { status: attendanceFilters.status }),
        ...(attendanceSearchTerm && { search: attendanceSearchTerm })
      });

      const response = await api.get(`/api/admin/staff-attendance?${params}`);
      if (response.data.success) {
        setAttendanceData(response.data.data.attendance || []);
      }
    } catch (error) {
      console.error('Error fetching attendance data:', error);
      toast.error('Failed to fetch attendance data');
    } finally {
      setAttendanceLoading(false);
    }
  };

  const fetchAttendanceStats = async () => {
    try {
      const params = new URLSearchParams({
        date: attendanceFilters.date,
        ...(attendanceFilters.type !== 'all' && { type: attendanceFilters.type }),
        ...(attendanceFilters.department !== 'all' && { department: attendanceFilters.department })
      });

      const response = await api.get(`/api/admin/staff-attendance/stats?${params}`);
      if (response.data.success) {
        setAttendanceStats(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching attendance stats:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, files } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: files ? files[0] : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      console.log('Form data being submitted:', formData);
      const formDataToSend = new FormData();
      Object.keys(formData).forEach(key => {
        if (formData[key] !== null && formData[key] !== '') {
          formDataToSend.append(key, formData[key]);
        }
      });
      console.log('FormData entries:', Array.from(formDataToSend.entries()));

      if (editingStaffGuest) {
        await api.put(`/api/admin/staff-guests/${editingStaffGuest._id}`, formDataToSend, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        toast.success('Staff/Guest updated successfully');
      } else {
        await api.post('/api/admin/staff-guests', formDataToSend, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        toast.success('Staff/Guest added successfully');
      }

      setShowForm(false);
      setEditingStaffGuest(null);
      setFormData({
        name: '',
        type: 'staff',
        gender: 'Male',
        profession: '',
        phoneNumber: '',
        email: '',
        department: '',
        purpose: '',
        checkinDate: '',
        checkoutDate: '',
        photo: null
      });
      fetchStaffGuests();
      fetchStats();
    } catch (error) {
      console.error('Error saving staff/guest:', error);
      toast.error(error.response?.data?.message || 'Failed to save staff/guest');
    }
  };

  const handleEdit = (staffGuest) => {
    setEditingStaffGuest(staffGuest);
    setFormData({
      name: staffGuest.name,
      type: staffGuest.type,
      gender: staffGuest.gender,
      profession: staffGuest.profession,
      phoneNumber: staffGuest.phoneNumber,
      email: staffGuest.email || '',
      department: staffGuest.department || '',
      purpose: staffGuest.purpose || '',
      checkinDate: staffGuest.checkinDate ? new Date(staffGuest.checkinDate).toISOString().split('T')[0] : '',
      checkoutDate: staffGuest.checkoutDate ? new Date(staffGuest.checkoutDate).toISOString().split('T')[0] : '',
      photo: null
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this staff/guest?')) {
      try {
        await api.delete(`/api/admin/staff-guests/${id}`);
        toast.success('Staff/Guest deleted successfully');
        fetchStaffGuests();
        fetchStats();
      } catch (error) {
        console.error('Error deleting staff/guest:', error);
        toast.error('Failed to delete staff/guest');
      }
    }
  };

  const handleCheckInOut = async (id, action) => {
    try {
      await api.post(`/api/admin/staff-guests/${id}/checkin-out`, { action });
      toast.success(`Staff/Guest ${action === 'checkin' ? 'checked in' : 'checked out'} successfully`);
      fetchStaffGuests();
    } catch (error) {
      console.error('Error checking in/out:', error);
      toast.error('Failed to check in/out staff/guest');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'staff',
      gender: 'Male',
      profession: '',
      phoneNumber: '',
      email: '',
      department: '',
      purpose: '',
      checkinDate: '',
      checkoutDate: '',
      photo: null
    });
    setEditingStaffGuest(null);
    setShowForm(false);
  };

  // Attendance helper functions
  const getAttendanceStatus = (attendance) => {
    if (!attendance) return 'Absent';
    if (attendance.morning && attendance.evening && attendance.night) return 'Present';
    if (attendance.morning || attendance.evening || attendance.night) return 'Partial';
    return 'Absent';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Present': return 'text-green-600 bg-green-50';
      case 'Partial': return 'text-yellow-600 bg-yellow-50';
      case 'Absent': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Present': return <CheckIcon className="w-4 h-4" />;
      case 'Partial': return <ClockIcon className="w-4 h-4" />;
      case 'Absent': return <XMark className="w-4 h-4" />;
      default: return null;
    }
  };

  const handleAttendanceFilterChange = (filterType, value) => {
    setAttendanceFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  // Settings functions
  const fetchDailyRateSettings = async () => {
    try {
      setSettingsLoading(true);
      const response = await api.get('/api/admin/staff-guests/settings/daily-rates');
      if (response.data.success) {
        setDailyRateSettings(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching daily rate settings:', error);
      toast.error('Failed to fetch daily rate settings');
    } finally {
      setSettingsLoading(false);
    }
  };

  const updateDailyRateSettings = async (newRate) => {
    try {
      setSettingsLoading(true);
      const response = await api.put('/api/admin/staff-guests/settings/daily-rates', {
        staffDailyRate: newRate
      });
      if (response.data.success) {
        setDailyRateSettings(response.data.data);
        toast.success('Daily rate updated successfully');
        // Refresh staff/guests to show updated charges
        fetchStaffGuests();
      }
    } catch (error) {
      console.error('Error updating daily rate settings:', error);
      toast.error('Failed to update daily rate settings');
    } finally {
      setSettingsLoading(false);
    }
  };

  // Admit Card functions
  const generateAdmitCard = async (staffGuestId) => {
    try {
      setAdmitCardLoading(true);
      const response = await api.get(`/api/admin/staff-guests/${staffGuestId}/admit-card`);
      if (response.data.success) {
        setAdmitCardData(response.data.data);
        toast.success('Admit card generated successfully');
      }
    } catch (error) {
      console.error('Error generating admit card:', error);
      toast.error('Failed to generate admit card');
    } finally {
      setAdmitCardLoading(false);
    }
  };

  const printAdmitCard = () => {
    if (!admitCardData) return;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Admit Card - ${admitCardData.name}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
            .content { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
            .section { margin-bottom: 15px; }
            .label { font-weight: bold; color: #333; }
            .value { margin-left: 10px; }
            .photo { width: 150px; height: 150px; object-fit: cover; border: 2px solid #333; }
            .charges { background-color: #f0f0f0; padding: 10px; border-radius: 5px; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>HOSTEL ADMIT CARD</h1>
            <h2>${admitCardData.type.toUpperCase()} - ${admitCardData.name}</h2>
          </div>
          <div class="content">
            <div>
              <div class="section">
                <span class="label">Name:</span>
                <span class="value">${admitCardData.name}</span>
              </div>
              <div class="section">
                <span class="label">Type:</span>
                <span class="value">${admitCardData.type}</span>
              </div>
              <div class="section">
                <span class="label">Gender:</span>
                <span class="value">${admitCardData.gender}</span>
              </div>
              <div class="section">
                <span class="label">Profession:</span>
                <span class="value">${admitCardData.profession}</span>
              </div>
              <div class="section">
                <span class="label">Phone:</span>
                <span class="value">${admitCardData.phoneNumber}</span>
              </div>
              <div class="section">
                <span class="label">Email:</span>
                <span class="value">${admitCardData.email || 'N/A'}</span>
              </div>
              <div class="section">
                <span class="label">Department:</span>
                <span class="value">${admitCardData.department || 'N/A'}</span>
              </div>
              <div class="section">
                <span class="label">Purpose:</span>
                <span class="value">${admitCardData.purpose || 'N/A'}</span>
              </div>
            </div>
            <div>
              <div class="section">
                <span class="label">Check-in Date:</span>
                <span class="value">${admitCardData.checkinDate ? new Date(admitCardData.checkinDate).toLocaleDateString() : 'N/A'}</span>
              </div>
              <div class="section">
                <span class="label">Check-out Date:</span>
                <span class="value">${admitCardData.checkoutDate ? new Date(admitCardData.checkoutDate).toLocaleDateString() : 'N/A'}</span>
              </div>
              <div class="section">
                <span class="label">Day Count:</span>
                <span class="value">${admitCardData.dayCount} days</span>
              </div>
              <div class="section">
                <span class="label">Status:</span>
                <span class="value">${admitCardData.isCheckedIn ? 'Checked In' : 'Checked Out'}</span>
              </div>
              <div class="section">
                <span class="label">Stay Duration:</span>
                <span class="value">${admitCardData.stayDuration || 'N/A'}</span>
              </div>
              <div class="section charges">
                <span class="label">Calculated Charges:</span>
                <span class="value">₹${admitCardData.calculatedCharges}</span>
              </div>
              <div class="section">
                <img src="${admitCardData.photo || '/default-avatar.png'}" alt="Photo" class="photo" />
              </div>
            </div>
          </div>
          <div style="margin-top: 30px; text-align: center; font-size: 12px; color: #666;">
            Generated on: ${new Date(admitCardData.generatedAt).toLocaleString()}<br>
            Generated by: ${admitCardData.generatedBy}
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <>
      <SEO 
        title="Staff/Guests Management"
        description="Manage staff and guest information, track check-ins and check-outs. Comprehensive staff and guest management system."
        keywords="Staff Management, Guest Management, Check-in, Check-out, Visitor Management, Staff Tracking"
      />
      
      <div className="p-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-blue-900">Staff/Guests Management </h1>
            <div className="mt-2 mb-4">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                Currently this page is in developing stage
              </span>
            </div>
            <p className="text-gray-600 mt-1">
              {activeTab === 'management' 
                ? 'Manage staff and guest information and track their visits'
                : activeTab === 'attendance'
                ? 'View and analyze staff and guest attendance records'
                : activeTab === 'admit-card'
                ? 'Generate and print admit cards for staff and guests'
                : activeTab === 'settings'
                ? 'Configure daily rates and system settings'
                : 'Staff and guest management system'
              }
            </p>
          </div>
          {activeTab === 'management' && (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <UserPlusIcon className="w-5 h-5" />
              Add Staff/Guest
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('management')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'management'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <UserIcon className="w-5 h-5" />
                  Management
                </div>
              </button>
              <button
                onClick={() => setActiveTab('attendance')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'attendance'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <ChartBarIcon className="w-5 h-5" />
                  Attendance
                </div>
              </button>
              <button
                onClick={() => setActiveTab('admit-card')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'admit-card'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <DocumentTextIcon className="w-5 h-5" />
                  Admit Card
                </div>
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'settings'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <CogIcon className="w-5 h-5" />
                  Settings
                </div>
              </button>
            </nav>
          </div>
        </div>

        {/* Management Tab Content */}
        {activeTab === 'management' && (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
                <div className="flex items-center gap-2">
                  <UserIcon className="w-5 h-5 text-blue-600" />
                  <span className="text-sm font-medium text-gray-600">Total Staff</span>
                </div>
                <div className="text-2xl font-bold text-blue-900">{stats.totalStaff || 0}</div>
              </div>
              <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
                <div className="flex items-center gap-2">
                  <UserIcon className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-medium text-gray-600">Total Guests</span>
                </div>
                <div className="text-2xl font-bold text-green-900">{stats.totalGuests || 0}</div>
              </div>
              <div className="bg-white rounded-lg shadow p-4 border-l-4 border-yellow-500">
                <div className="flex items-center gap-2">
                  <CheckCircleIcon className="w-5 h-5 text-yellow-600" />
                  <span className="text-sm font-medium text-gray-600">Checked In</span>
                </div>
                <div className="text-2xl font-bold text-yellow-900">{stats.totalCheckedIn || 0}</div>
              </div>
              <div className="bg-white rounded-lg shadow p-4 border-l-4 border-purple-500">
                <div className="flex items-center gap-2">
                  <UserIcon className="w-5 h-5 text-purple-600" />
                  <span className="text-sm font-medium text-gray-600">Total Active</span>
                </div>
                <div className="text-2xl font-bold text-purple-900">{stats.totalActive || 0}</div>
              </div>
            </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name, profession, phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Types</option>
              <option value="staff">Staff</option>
              <option value="guest">Guest</option>
            </select>
            <select
              value={filterGender}
              onChange={(e) => setFilterGender(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Genders</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>

        {/* Staff/Guests List */}
        <div className="bg-white rounded-lg shadow">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <LoadingSpinner size="lg" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Photo</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gender</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Profession</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Charges</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {console.log('Rendering table with staffGuests:', staffGuests)}
                  {staffGuests && staffGuests.length > 0 ? staffGuests.map((staffGuest) => (
                    <tr key={staffGuest._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        {staffGuest.photo ? (
                          <img
                            src={staffGuest.photo}
                            alt={staffGuest.name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                            <UserIcon className="w-6 h-6 text-gray-400" />
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{staffGuest.name}</div>
                        {staffGuest.email && (
                          <div className="text-sm text-gray-500">{staffGuest.email}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          staffGuest.type === 'staff' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {staffGuest.type.charAt(0).toUpperCase() + staffGuest.type.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {staffGuest.gender}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {staffGuest.profession}
                        {staffGuest.department && (
                          <div className="text-xs text-gray-500">{staffGuest.department}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {staffGuest.phoneNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className="font-medium text-green-600">₹{staffGuest.calculatedCharges || 0}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {staffGuest.checkInTime && !staffGuest.checkOutTime ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <CheckCircleIcon className="w-3 h-3 mr-1" />
                            Checked In
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            <ClockIcon className="w-3 h-3 mr-1" />
                            Checked Out
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEdit(staffGuest)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            <PencilIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(staffGuest._id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                          {staffGuest.checkInTime && !staffGuest.checkOutTime ? (
                            <button
                              onClick={() => handleCheckInOut(staffGuest._id, 'checkout')}
                              className="text-orange-600 hover:text-orange-900"
                              title="Check Out"
                            >
                              <EyeSlashIcon className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleCheckInOut(staffGuest._id, 'checkin')}
                              className="text-green-600 hover:text-green-900"
                              title="Check In"
                            >
                              <EyeIcon className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="9" className="px-6 py-12 text-center text-gray-500">
                        <UserIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                        <p className="text-lg font-medium">No staff/guests found</p>
                        <p className="text-sm">Add your first staff member or guest to get started</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

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
                    Showing page <span className="font-medium">{currentPage}</span> of{' '}
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
          </>
        )}

        {/* Attendance Tab Content */}
        {activeTab === 'attendance' && (
          <>
            {/* Attendance Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
                <div className="flex items-center gap-2">
                  <CheckIcon className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-medium text-gray-600">Present</span>
                </div>
                <div className="text-2xl font-bold text-green-900">{attendanceStats.present || 0}</div>
              </div>
              <div className="bg-white rounded-lg shadow p-4 border-l-4 border-yellow-500">
                <div className="flex items-center gap-2">
                  <ClockIcon className="w-5 h-5 text-yellow-600" />
                  <span className="text-sm font-medium text-gray-600">Partial</span>
                </div>
                <div className="text-2xl font-bold text-yellow-900">{attendanceStats.partial || 0}</div>
              </div>
              <div className="bg-white rounded-lg shadow p-4 border-l-4 border-red-500">
                <div className="flex items-center gap-2">
                  <XMark className="w-5 h-5 text-red-600" />
                  <span className="text-sm font-medium text-gray-600">Absent</span>
                </div>
                <div className="text-2xl font-bold text-red-900">{attendanceStats.absent || 0}</div>
              </div>
              <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
                <div className="flex items-center gap-2">
                  <UserIcon className="w-5 h-5 text-blue-600" />
                  <span className="text-sm font-medium text-gray-600">Total</span>
                </div>
                <div className="text-2xl font-bold text-blue-900">{attendanceStats.total || 0}</div>
              </div>
            </div>

            {/* Attendance Filters */}
            <div className="bg-white rounded-lg shadow p-4 mb-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search by name, department..."
                      value={attendanceSearchTerm}
                      onChange={(e) => setAttendanceSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="date"
                    value={attendanceFilters.date}
                    onChange={(e) => handleAttendanceFilterChange('date', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <select
                    value={attendanceFilters.type}
                    onChange={(e) => handleAttendanceFilterChange('type', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">All Types</option>
                    <option value="staff">Staff</option>
                    <option value="guest">Guest</option>
                  </select>
                  <select
                    value={attendanceFilters.department}
                    onChange={(e) => handleAttendanceFilterChange('department', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">All Departments</option>
                    <option value="Security">Security</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Cleaning">Cleaning</option>
                    <option value="Kitchen">Kitchen</option>
                    <option value="Other">Other</option>
                  </select>
                  <select
                    value={attendanceFilters.status}
                    onChange={(e) => handleAttendanceFilterChange('status', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">All Status</option>
                    <option value="Present">Present</option>
                    <option value="Partial">Partial</option>
                    <option value="Absent">Absent</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Attendance List */}
            <div className="bg-white rounded-lg shadow">
              {attendanceLoading ? (
                <div className="flex justify-center items-center h-64">
                  <LoadingSpinner size="lg" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Staff/Guest</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <SunIcon className="w-4 h-4 mx-auto" />
                          Morning
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <MoonIcon className="w-4 h-4 mx-auto" />
                          Evening
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <StarIcon className="w-4 h-4 mx-auto" />
                          Night
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {attendanceData && attendanceData.length > 0 ? attendanceData.map((record) => {
                        const status = getAttendanceStatus(record.attendance);
                        return (
                          <tr key={record._id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-10 w-10">
                                  {record.photo ? (
                                    <img
                                      className="h-10 w-10 rounded-full object-cover"
                                      src={record.photo}
                                      alt={record.name}
                                    />
                                  ) : (
                                    <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                                      <UserIcon className="h-6 w-6 text-gray-400" />
                                    </div>
                                  )}
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-medium text-gray-900">{record.name}</div>
                                  <div className="text-sm text-gray-500">
                                    {record.type} • {record.department || 'No Department'}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              {record.attendance?.morning ? (
                                <CheckIcon className="w-5 h-5 text-green-600 mx-auto" />
                              ) : (
                                <XMark className="w-5 h-5 text-red-600 mx-auto" />
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              {record.attendance?.evening ? (
                                <CheckIcon className="w-5 h-5 text-green-600 mx-auto" />
                              ) : (
                                <XMark className="w-5 h-5 text-red-600 mx-auto" />
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              {record.attendance?.night ? (
                                <CheckIcon className="w-5 h-5 text-green-600 mx-auto" />
                              ) : (
                                <XMark className="w-5 h-5 text-red-600 mx-auto" />
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
                                {getStatusIcon(status)}
                                {status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {record.attendance?.notes || '-'}
                            </td>
                          </tr>
                        );
                      }) : (
                        <tr>
                          <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                            <ChartBarIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                            <p className="text-lg font-medium">No attendance records found</p>
                            <p className="text-sm">Select a date to view attendance records</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* Admit Card Tab Content */}
        {activeTab === 'admit-card' && (
          <>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">Generate Admit Card</h2>
                <p className="text-gray-600">Select a staff/guest to generate their admit card</p>
              </div>

              {loading ? (
                <div className="flex justify-center items-center h-64">
                  <LoadingSpinner size="lg" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Photo</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Purpose</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check-in Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Charges</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {staffGuests && staffGuests.length > 0 ? staffGuests.map((staffGuest) => (
                        <tr key={staffGuest._id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            {staffGuest.photo ? (
                              <img
                                src={staffGuest.photo}
                                alt={staffGuest.name}
                                className="w-10 h-10 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                                <UserIcon className="w-6 h-6 text-gray-400" />
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{staffGuest.name}</div>
                            <div className="text-sm text-gray-500">{staffGuest.profession}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              staffGuest.type === 'staff' 
                                ? 'bg-blue-100 text-blue-800' 
                                : 'bg-green-100 text-green-800'
                            }`}>
                              {staffGuest.type.charAt(0).toUpperCase() + staffGuest.type.slice(1)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {staffGuest.purpose || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {staffGuest.checkinDate ? new Date(staffGuest.checkinDate).toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <span className="font-medium text-green-600">₹{staffGuest.calculatedCharges || 0}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => generateAdmitCard(staffGuest._id)}
                              disabled={admitCardLoading}
                              className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                            >
                              <DocumentTextIcon className="w-4 h-4" />
                              Generate
                            </button>
                          </td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                            <DocumentTextIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                            <p className="text-lg font-medium">No staff/guests found</p>
                            <p className="text-sm">Add staff/guests to generate admit cards</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Admit Card Preview */}
              {admitCardData && (
                <div className="mt-8 p-6 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Admit Card Preview</h3>
                    <button
                      onClick={printAdmitCard}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      <PrinterIcon className="w-4 h-4" />
                      Print
                    </button>
                  </div>
                  <div className="bg-white p-6 rounded-lg border-2 border-dashed border-gray-300">
                    <div className="text-center border-b-2 border-gray-300 pb-4 mb-6">
                      <h1 className="text-2xl font-bold text-gray-900">HOSTEL ADMIT CARD</h1>
                      <h2 className="text-lg text-gray-700">{admitCardData.type.toUpperCase()} - {admitCardData.name}</h2>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <div className="mb-3">
                          <span className="font-semibold text-gray-700">Name:</span>
                          <span className="ml-2 text-gray-900">{admitCardData.name}</span>
                        </div>
                        <div className="mb-3">
                          <span className="font-semibold text-gray-700">Type:</span>
                          <span className="ml-2 text-gray-900">{admitCardData.type}</span>
                        </div>
                        <div className="mb-3">
                          <span className="font-semibold text-gray-700">Gender:</span>
                          <span className="ml-2 text-gray-900">{admitCardData.gender}</span>
                        </div>
                        <div className="mb-3">
                          <span className="font-semibold text-gray-700">Profession:</span>
                          <span className="ml-2 text-gray-900">{admitCardData.profession}</span>
                        </div>
                        <div className="mb-3">
                          <span className="font-semibold text-gray-700">Phone:</span>
                          <span className="ml-2 text-gray-900">{admitCardData.phoneNumber}</span>
                        </div>
                        <div className="mb-3">
                          <span className="font-semibold text-gray-700">Email:</span>
                          <span className="ml-2 text-gray-900">{admitCardData.email || 'N/A'}</span>
                        </div>
                        <div className="mb-3">
                          <span className="font-semibold text-gray-700">Department:</span>
                          <span className="ml-2 text-gray-900">{admitCardData.department || 'N/A'}</span>
                        </div>
                        <div className="mb-3">
                          <span className="font-semibold text-gray-700">Purpose:</span>
                          <span className="ml-2 text-gray-900">{admitCardData.purpose || 'N/A'}</span>
                        </div>
                      </div>
                      <div>
                        <div className="mb-3">
                          <span className="font-semibold text-gray-700">Check-in Date:</span>
                          <span className="ml-2 text-gray-900">
                            {admitCardData.checkinDate ? new Date(admitCardData.checkinDate).toLocaleDateString() : 'N/A'}
                          </span>
                        </div>
                        <div className="mb-3">
                          <span className="font-semibold text-gray-700">Check-out Date:</span>
                          <span className="ml-2 text-gray-900">
                            {admitCardData.checkoutDate ? new Date(admitCardData.checkoutDate).toLocaleDateString() : 'N/A'}
                          </span>
                        </div>
                        <div className="mb-3">
                          <span className="font-semibold text-gray-700">Day Count:</span>
                          <span className="ml-2 text-gray-900">{admitCardData.dayCount} days</span>
                        </div>
                        <div className="mb-3">
                          <span className="font-semibold text-gray-700">Status:</span>
                          <span className="ml-2 text-gray-900">{admitCardData.isCheckedIn ? 'Checked In' : 'Checked Out'}</span>
                        </div>
                        <div className="mb-3">
                          <span className="font-semibold text-gray-700">Stay Duration:</span>
                          <span className="ml-2 text-gray-900">{admitCardData.stayDuration || 'N/A'}</span>
                        </div>
                        <div className="mb-3 p-3 bg-green-50 rounded-lg">
                          <span className="font-semibold text-gray-700">Calculated Charges:</span>
                          <span className="ml-2 text-lg font-bold text-green-600">₹{admitCardData.calculatedCharges}</span>
                        </div>
                        <div className="text-center">
                          <img 
                            src={admitCardData.photo || '/default-avatar.png'} 
                            alt="Photo" 
                            className="w-24 h-24 mx-auto rounded-lg object-cover border-2 border-gray-300"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="mt-6 text-center text-sm text-gray-500">
                      Generated on: {new Date(admitCardData.generatedAt).toLocaleString()}<br/>
                      Generated by: {admitCardData.generatedBy}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Settings Tab Content */}
        {activeTab === 'settings' && (
          <>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-900">Daily Rate Settings</h2>
                <p className="text-gray-600 mt-1">Configure daily charges for staff members</p>
              </div>

              <div className="max-w-md">
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Staff Daily Rate (₹)
                  </label>
                  <div className="flex items-center gap-3">
                    <CurrencyDollarIcon className="w-5 h-5 text-gray-400" />
                    <input
                      type="number"
                      value={dailyRateSettings.staffDailyRate}
                      onChange={(e) => setDailyRateSettings(prev => ({
                        ...prev,
                        staffDailyRate: parseFloat(e.target.value) || 0
                      }))}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter daily rate"
                    />
                    <button
                      onClick={() => updateDailyRateSettings(dailyRateSettings.staffDailyRate)}
                      disabled={settingsLoading}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {settingsLoading ? 'Updating...' : 'Update'}
                    </button>
                  </div>
                </div>

                {dailyRateSettings.lastUpdated && (
                  <div className="text-sm text-gray-500">
                    Last updated: {new Date(dailyRateSettings.lastUpdated).toLocaleString()}
                    {dailyRateSettings.updatedBy && ` by ${dailyRateSettings.updatedBy}`}
                  </div>
                )}

                <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-yellow-800">Important Note</h3>
                      <div className="mt-2 text-sm text-yellow-700">
                        <p>Updating the daily rate will automatically recalculate charges for all active staff members. This action cannot be undone.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Add/Edit Form Modal */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
              >
                <div className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-gray-900">
                      {editingStaffGuest ? 'Edit Staff/Guest' : 'Add New Staff/Guest'}
                    </h2>
                    <button
                      onClick={resetForm}
                      className="text-gray-400 hover:text-gray-500"
                    >
                      <XMarkIcon className="w-6 h-6" />
                    </button>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Name *
                        </label>
                        <input
                          type="text"
                          name="name"
                          value={formData.name}
                          onChange={handleInputChange}
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Type *
                        </label>
                        <select
                          name="type"
                          value={formData.type}
                          onChange={handleInputChange}
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="staff">Staff</option>
                          <option value="guest">Guest</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Gender *
                        </label>
                        <select
                          name="gender"
                          value={formData.gender}
                          onChange={handleInputChange}
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Profession *
                        </label>
                        <input
                          type="text"
                          name="profession"
                          value={formData.profession}
                          onChange={handleInputChange}
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Phone Number *
                        </label>
                        <input
                          type="tel"
                          name="phoneNumber"
                          value={formData.phoneNumber}
                          onChange={handleInputChange}
                          required
                          pattern="[0-9]{10}"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Email
                        </label>
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>

                      {formData.type === 'staff' && (
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Department
                          </label>
                          <input
                            type="text"
                            name="department"
                            value={formData.department}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      )}

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Purpose
                        </label>
                        <input
                          type="text"
                          name="purpose"
                          value={formData.purpose}
                          onChange={handleInputChange}
                          placeholder="Enter purpose of visit/stay"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Check-in Date
                        </label>
                        <input
                          type="date"
                          name="checkinDate"
                          value={formData.checkinDate}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Check-out Date
                        </label>
                        <input
                          type="date"
                          name="checkoutDate"
                          value={formData.checkoutDate}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Photo
                        </label>
                        <input
                          type="file"
                          name="photo"
                          accept="image/*"
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                      <button
                        type="button"
                        onClick={resetForm}
                        className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        {editingStaffGuest ? 'Update' : 'Add'} Staff/Guest
                      </button>
                    </div>
                  </form>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};

export default StaffGuestsManagement;
