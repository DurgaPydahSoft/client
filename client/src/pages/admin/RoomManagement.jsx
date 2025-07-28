import React, { useState, useEffect } from 'react';
import api from '../../utils/axios';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  UserGroupIcon,
  BuildingOfficeIcon,
  XMarkIcon,
  FunnelIcon,
  UserIcon,
  AcademicCapIcon,
  PhoneIcon,
  TableCellsIcon,
  Squares2X2Icon,
  LockClosedIcon
} from '@heroicons/react/24/outline';
import LoadingSpinner from '../../components/LoadingSpinner';
import SEO from '../../components/SEO';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { hasFullAccess, canPerformAction } from '../../utils/permissionUtils';

const RoomManagement = () => {
  console.log('🏠 RoomManagement component loaded');
  
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin';
  const canAddRoom = isSuperAdmin || canPerformAction(user, 'room_management', 'create');
  const canEditRoom = isSuperAdmin || canPerformAction(user, 'room_management', 'edit');
  const canDeleteRoom = isSuperAdmin || canPerformAction(user, 'room_management', 'delete');
  const canManageBills = isSuperAdmin || canPerformAction(user, 'room_management', 'edit');
  
  console.log('🔐 Room Management Permissions:', {
    user: user?.username,
    role: user?.role,
    isSuperAdmin,
    canAddRoom,
    canEditRoom,
    canDeleteRoom,
    canManageBills,
    permissions: user?.permissions,
    accessLevels: user?.permissionAccessLevels
  });
  
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [roomStudents, setRoomStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [filters, setFilters] = useState({
    gender: '',
    category: ''
  });
  const [formData, setFormData] = useState({
    gender: '',
    category: '',
    roomNumber: '',
    bedCount: 1
  });
  const [showBillModal, setShowBillModal] = useState(false);
  const [billForm, setBillForm] = useState({ month: '', startUnits: '', endUnits: '', rate: '' });
  const [billHistory, setBillHistory] = useState([]);
  const [billLoading, setBillLoading] = useState(false);
  const [showEditBillModal, setShowEditBillModal] = useState(false);
  const [editBillForm, setEditBillForm] = useState({ month: '', startUnits: '', endUnits: '', rate: '' });
  const [showBillPreviewModal, setShowBillPreviewModal] = useState(false);
  const [billPreview, setBillPreview] = useState(null);
  const [showEditBillPreviewModal, setShowEditBillPreviewModal] = useState(false);
  const [editBillPreview, setEditBillPreview] = useState(null);
  const [realTimePreview, setRealTimePreview] = useState(null);
  const [editRealTimePreview, setEditRealTimePreview] = useState(null);
  const [roomStats, setRoomStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const fetchRooms = async () => {
    try {
      console.log('🏠 Fetching rooms with filters:', filters);
      const params = {
        ...filters
      };
      const response = await api.get('/api/admin/rooms', { params });
      console.log('🏠 Rooms response:', response.data);
      if (response.data.success) {
        const fetchedRooms = response.data.data.rooms || [];
        setRooms(fetchedRooms);



      } else {
        throw new Error('Failed to fetch rooms');
      }
    } catch (error) {
      console.error('🏠 Error fetching rooms:', error);
      console.error('🏠 Error details:', error.response?.data);
      toast.error('Failed to fetch rooms');
    } finally {
      setLoading(false);
    }
  };

  const fetchRoomStats = async () => {
    try {
      console.log('📊 Fetching room stats');
      const response = await api.get('/api/admin/rooms/stats');
      console.log('📊 Room stats response:', response.data);
      if (response.data.success) {
        setRoomStats(response.data.data);
      } else {
        throw new Error('Failed to fetch room stats');
      }
    } catch (error) {
      console.error('📊 Error fetching room stats:', error);
      toast.error('Failed to fetch room statistics');
    } finally {
      setStatsLoading(false);
    }
  };



  useEffect(() => {
    fetchRooms();
    fetchRoomStats();
  }, [filters]);

  useEffect(() => {
    if (showBillModal) {
      calculateRealTimePreview();
    }
  }, [billForm, showBillModal]);

  // Initialize edit real-time preview when edit modal opens
  useEffect(() => {
    if (showEditBillModal && editBillForm.month) {
      calculateEditRealTimePreview();
    } else {
      setEditRealTimePreview(null);
    }
  }, [showEditBillModal, editBillForm]);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'bedCount' ? Number(value) : value
    }));
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddRoom = async (e) => {
    e.preventDefault();
    
    if (!canAddRoom) {
      toast.error('You do not have permission to add rooms');
      return;
    }
    
    try {
      await api.post('/api/admin/rooms', formData);
      toast.success('Room added successfully');
      setShowAddModal(false);
      setFormData({ gender: '', category: '', roomNumber: '', bedCount: 1 });
      fetchRooms();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add room');
    }
  };

  const handleEditRoom = async (e) => {
    e.preventDefault();
    
    if (!canEditRoom) {
      toast.error('You do not have permission to edit rooms');
      return;
    }
    
    try {
      await api.put(`/api/admin/rooms/${selectedRoom._id}`, formData);
      toast.success('Room updated successfully');
      setShowEditModal(false);
      setSelectedRoom(null);
      setFormData({ gender: '', category: '', roomNumber: '', bedCount: 1 });
      fetchRooms();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update room');
    }
  };

  const handleDeleteRoom = async (roomId) => {
    if (!canDeleteRoom) {
      toast.error('You do not have permission to delete rooms');
      return;
    }
    
    if (!window.confirm('Are you sure you want to delete this room?')) return;
    
    try {
      await api.delete(`/api/admin/rooms/${roomId}`);
      toast.success('Room deleted successfully');
      fetchRooms();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete room');
    }
  };

  const openEditModal = (room) => {
    setSelectedRoom(room);
    setFormData({
      gender: room.gender,
      category: room.category,
      roomNumber: room.roomNumber,
      bedCount: room.bedCount || 1
    });
    setShowEditModal(true);
  };

  const getCategoryOptions = (gender) => {
    return gender === 'Male' 
      ? ['A+', 'A', 'B+', 'B']
      : ['A+', 'A', 'B', 'C'];
  };

  // Filter rooms based on selected filters
  const filteredRooms = rooms.filter(room => {
    if (filters.gender && room.gender !== filters.gender) return false;
    if (filters.category && room.category !== filters.category) return false;
    return true;
  });

  // Group rooms by gender and category
  const groupedRooms = filteredRooms.reduce((acc, room) => {
    const key = `${room.gender}-${room.category}`;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(room);
    return acc;
  }, {});

  const handleRoomClick = async (room) => {
    setSelectedRoom(room);
    setLoadingStudents(true);
    try {
      const response = await api.get(`/api/admin/rooms/${room._id}/students`);
      if (response.data.success) {
        setRoomStudents(response.data.data.students);
      } else {
        throw new Error('Failed to fetch students');
      }
    } catch (error) {
      console.error('Error fetching students:', error);
      toast.error('Failed to fetch student details');
    } finally {
      setLoadingStudents(false);
      setShowStudentModal(true);
    }
  };

  const openBillModal = async (room) => {
    try {
      setSelectedRoom(room);
      setShowBillModal(true);
      setBillLoading(true);

      // Fetch default rate
      let defaultRate = '';
      try {
        const rateRes = await api.get('/api/rooms/electricity-default-rate', {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        });
        if (rateRes.data.success) {
          defaultRate = rateRes.data.rate;
        }
      } catch (err) {
        // fallback: leave as empty
      }
      setBillForm(prev => ({ ...prev, rate: defaultRate }));

      const billsResponse = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/admin/rooms/${room._id}/electricity-bill`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (billsResponse.data.success) {
        setBillHistory(billsResponse.data.data);
      }
    } catch (error) {
      console.error('Error fetching bill history:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch bill history');
    } finally {
      setBillLoading(false);
    }
  };

  const handleBillFormChange = (e) => {
    const { name, value } = e.target;

    setBillForm(prev => {
      const updatedForm = { ...prev, [name]: value };
      
      // If month is changed, try to auto-fill start units
      if (name === 'month' && value) {
        const lastMonthBill = billHistory
          .slice()
          .sort((a, b) => new Date(b.month) - new Date(a.month))
          .find(bill => {
            const billDate = new Date(bill.month + '-01');
            const selectedDate = new Date(value + '-01');
            return billDate < selectedDate;
          });

        if (lastMonthBill) {
          updatedForm.startUnits = lastMonthBill.endUnits;
        }
      }
      return updatedForm;
    });

    // Calculate real-time preview
    calculateRealTimePreview();
  };

  const calculateRealTimePreview = () => {
    const { month, startUnits, endUnits, rate } = billForm;
    
    if (month && startUnits && endUnits) {
      const start = Number(startUnits);
      const end = Number(endUnits);
      const billRate = rate ? Number(rate) : 5;
      
      if (end >= start) {
        const consumption = end - start;
        const total = consumption * billRate;
        
        setRealTimePreview({
          consumption,
          rate: billRate,
          total,
          isValid: true
        });
      } else {
        setRealTimePreview({
          consumption: 0,
          rate: billRate,
          total: 0,
          isValid: false
        });
      }
    } else {
      setRealTimePreview(null);
    }
  };

  const calculateBillPreview = () => {
    const { month, startUnits, endUnits, rate } = billForm;
    
    if (!month || !startUnits || !endUnits) {
      return null;
    }

    const start = Number(startUnits);
    const end = Number(endUnits);
    const billRate = rate ? Number(rate) : 5; // Default rate if not provided
    
    if (end < start) {
      return null;
    }

    const consumption = end - start;
    const total = consumption * billRate;

    return {
      month,
      startUnits: start,
      endUnits: end,
      consumption,
      rate: billRate,
      total,
      isUpdate: billHistory.some(bill => bill.month === month)
    };
  };

  const handleBillPreview = (e) => {
    e.preventDefault();
    const preview = calculateBillPreview();
    
    if (!preview) {
      toast.error('Please fill all required fields correctly');
      return;
    }
    
    setBillPreview(preview);
    setShowBillPreviewModal(true);
  };

  const handleBillConfirm = async () => {
    if (!canManageBills) {
      toast.error('You do not have permission to manage electricity bills');
      return;
    }
    
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/admin/rooms/${selectedRoom._id}/electricity-bill`,
        {
          month: billPreview.month,
          startUnits: billPreview.startUnits,
          endUnits: billPreview.endUnits,
          rate: billPreview.rate
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (response.data.success) {
        // Refresh bill history
        const billsResponse = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/admin/rooms/${selectedRoom._id}/electricity-bill`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`
            }
          }
        );
        setBillHistory(billsResponse.data.data);
        
        // Reset form
        setBillForm({
          month: '',
          startUnits: '',
          endUnits: '',
          rate: ''
        });
        
        setShowBillPreviewModal(false);
        setBillPreview(null);
        toast.success(`Bill ${billPreview.isUpdate ? 'updated' : 'added'} successfully`);
      }
    } catch (error) {
      console.error('Error saving bill:', error);
      toast.error(error.response?.data?.message || 'Failed to save bill');
    }
  };

  const calculateEditRealTimePreview = () => {
    const { month, startUnits, endUnits, rate } = editBillForm;
    
    if (month && startUnits && endUnits) {
      const start = Number(startUnits);
      const end = Number(endUnits);
      const billRate = rate ? Number(rate) : 5;
      
      if (end >= start) {
        const consumption = end - start;
        const total = consumption * billRate;
        
        setEditRealTimePreview({
          consumption,
          rate: billRate,
          total,
          isValid: true
        });
      } else {
        setEditRealTimePreview({
          consumption: 0,
          rate: billRate,
          total: 0,
          isValid: false
        });
      }
    } else {
      setEditRealTimePreview(null);
    }
  };

  const calculateEditBillPreview = () => {
    const { month, startUnits, endUnits, rate } = editBillForm;
    
    if (!month || !startUnits || !endUnits) {
      return null;
    }

    const start = Number(startUnits);
    const end = Number(endUnits);
    const billRate = rate ? Number(rate) : 5; // Default rate if not provided
    
    if (end < start) {
      return null;
    }

    const consumption = end - start;
    const total = consumption * billRate;

    return {
      month,
      startUnits: start,
      endUnits: end,
      consumption,
      rate: billRate,
      total
    };
  };

  const handleEditBillPreview = (e) => {
    e.preventDefault();
    const preview = calculateEditBillPreview();
    
    if (!preview) {
      toast.error('Please fill all required fields correctly');
      return;
    }
    
    setEditBillPreview(preview);
    setShowEditBillPreviewModal(true);
  };

  const handleEditBillConfirm = async () => {
    if (!canManageBills) {
      toast.error('You do not have permission to manage electricity bills');
      return;
    }
    
    try {
      const payload = {
        month: editBillPreview.month,
        startUnits: editBillPreview.startUnits,
        endUnits: editBillPreview.endUnits,
        rate: editBillPreview.rate
      };
      
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/admin/rooms/${selectedRoom._id}/electricity-bill`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      
      if (response.data.success) {
        // Refresh bill history
        const billsResponse = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/admin/rooms/${selectedRoom._id}/electricity-bill`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`
            }
          }
        );
        setBillHistory(billsResponse.data.data);
        setShowEditBillPreviewModal(false);
        setShowEditBillModal(false);
        setEditBillPreview(null);
        toast.success('Bill updated successfully');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update bill');
    }
  };

  const handleEditBillFormChange = (e) => {
    const { name, value } = e.target;
    setEditBillForm(prev => ({
      ...prev,
      [name]: value
    }));
  };



  if (loading) return <LoadingSpinner />;

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8 mt-12 sm:mt-0">
      <SEO title="Room Management" />
      
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-900 to-blue-700 bg-clip-text text-transparent">Room Management</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">Manage hostel rooms and their assignments</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          disabled={!canAddRoom}
          className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg transition-colors text-xs sm:text-sm ${
            canAddRoom 
              ? 'bg-blue-600 text-white hover:bg-blue-700' 
              : 'bg-gray-400 text-gray-200 cursor-not-allowed'
          }`}
          title={!canAddRoom ? 'You need full access to add rooms' : 'Add new room'}
        >
          {!canAddRoom ? <LockClosedIcon className="w-4 h-4 sm:w-5 sm:h-5" /> : <PlusIcon className="w-4 h-4 sm:w-5 sm:h-5" />}
          Add Room
        </button>
      </div>



      {/* Room Statistics */}
      {!statsLoading && roomStats && (
        <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-3 sm:p-4 lg:p-6 mb-4 sm:mb-6">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Room Statistics</h2>
          
          {/* Overall Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-4 mb-4 sm:mb-6">
            <div className="bg-blue-50 p-2 sm:p-4 rounded-lg">
              <div className="text-lg sm:text-2xl font-bold text-blue-600">{roomStats.overall.totalRooms}</div>
              <div className="text-xs sm:text-sm text-gray-600">Total Rooms</div>
            </div>
            <div className="bg-green-50 p-2 sm:p-4 rounded-lg">
              <div className="text-lg sm:text-2xl font-bold text-green-600">{roomStats.overall.activeRooms}</div>
              <div className="text-xs sm:text-sm text-gray-600">Active Rooms</div>
            </div>
            <div className="bg-purple-50 p-2 sm:p-4 rounded-lg">
              <div className="text-lg sm:text-2xl font-bold text-purple-600">{roomStats.overall.totalBeds}</div>
              <div className="text-xs sm:text-sm text-gray-600">Total Beds</div>
            </div>
            <div className="bg-orange-50 p-2 sm:p-4 rounded-lg">
              <div className="text-lg sm:text-2xl font-bold text-orange-600">{roomStats.overall.filledBeds}</div>
              <div className="text-xs sm:text-sm text-gray-600">Filled Beds</div>
            </div>
            <div className="bg-gray-50 p-2 sm:p-4 rounded-lg col-span-2 sm:col-span-1">
              <div className="text-lg sm:text-2xl font-bold text-gray-600">{roomStats.overall.availableBeds}</div>
              <div className="text-xs sm:text-sm text-gray-600">Available Beds</div>
            </div>
          </div>

          {/* Bed Occupancy Rate */}
          <div className="mb-4 sm:mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs sm:text-sm font-medium text-gray-700">Bed Occupancy Rate</span>
              <span className="text-xs sm:text-sm font-semibold text-gray-900">
                {roomStats.overall.totalBeds > 0 
                  ? Math.round((roomStats.overall.filledBeds / roomStats.overall.totalBeds) * 100)
                  : 0}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ 
                  width: `${roomStats.overall.totalBeds > 0 
                    ? (roomStats.overall.filledBeds / roomStats.overall.totalBeds) * 100 
                    : 0}%` 
                }}
              ></div>
            </div>
          </div>

          {/* Stats by Gender */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {roomStats.byGender.map((genderStat) => (
              <div key={genderStat.gender} className="border border-gray-200 rounded-lg p-3 sm:p-4">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2 sm:mb-3">{genderStat.gender} Students</h3>
                
                {/* Gender Summary */}
                <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-3 sm:mb-4">
                  <div className="text-center">
                    <div className="text-lg sm:text-xl font-bold text-blue-600">{genderStat.totalBeds}</div>
                    <div className="text-xs text-gray-600">Total Beds</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg sm:text-xl font-bold text-green-600">{genderStat.filledBeds}</div>
                    <div className="text-xs text-gray-600">Filled</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg sm:text-xl font-bold text-gray-600">{genderStat.availableBeds}</div>
                    <div className="text-xs text-gray-600">Available</div>
                  </div>
                </div>

                {/* Category Breakdown */}
                <div className="space-y-1.5 sm:space-y-2">
                  {genderStat.categories.map((category) => (
                    <div key={category.category} className="flex justify-between items-center text-xs sm:text-sm">
                      <span className="font-medium text-gray-700">Category {category.category}</span>
                      <span className="text-gray-600">
                        {category.filledBeds}/{category.totalBeds} beds
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-3 sm:p-4 mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <div className="flex-1">
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
              Gender
            </label>
            <select
              name="gender"
              value={filters.gender}
              onChange={handleFilterChange}
              className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs sm:text-sm"
            >
              <option value="">All Genders</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              name="category"
              value={filters.category}
              onChange={handleFilterChange}
              disabled={!filters.gender}
              className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 text-xs sm:text-sm"
            >
              <option value="">All Categories</option>
              {filters.gender === 'Male' ? (
                <>
                  <option value="A+">A+</option>
                  <option value="A">A</option>
                  <option value="B+">B+</option>
                  <option value="B">B</option>
                </>
              ) : filters.gender === 'Female' ? (
                <>
                  <option value="A+">A+</option>
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                </>
              ) : (
                <>
                  <option value="A+">A+</option>
                  <option value="A">A</option>
                  <option value="B+">B+</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                </>
              )}
            </select>
          </div>
        </div>
      </div>

      {/* Room Management Table */}
        <div className="space-y-6 sm:space-y-8">
          {Object.entries(groupedRooms).map(([key, rooms]) => {
            const [gender, category] = key.split('-');
            return (
              <div key={key} className="space-y-3 sm:space-y-4">
                <h2 className="text-base sm:text-lg font-semibold text-gray-900">
                  {gender} - Category {category}
                </h2>
              <div className="bg-white rounded-lg sm:rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Room Number
                        </th>
                        <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Bed Count
                        </th>
                        <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Students
                        </th>
                        <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                  {rooms.map((room) => (
                        <motion.tr
                      key={room._id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                          className="hover:bg-gray-50 transition-colors"
                    >
                          <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                        <div
                              className="cursor-pointer"
                          onClick={() => handleRoomClick(room)}
                        >
                              <div className="text-xs sm:text-sm font-semibold text-gray-900">
                            Room {room.roomNumber}
                              </div>
                            </div>
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                            <div className="flex items-center gap-1.5 sm:gap-2">
                              <BuildingOfficeIcon className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400" />
                              <span className={`text-xs sm:text-sm px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full ${
                                room.isActive 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {room.isActive ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                            <span className="bg-blue-100 text-blue-800 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-xs font-medium">
                              {room.bedCount} Beds
                            </span>
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                            <div className="flex items-center gap-1.5 sm:gap-2">
                              <UserGroupIcon className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400" />
                              <span className="text-xs sm:text-sm text-gray-900">
                            {room.studentCount || 0} Students
                              </span>
                        </div>
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                            <div className="flex items-center gap-1 sm:gap-2">
                          {canEditRoom ? (
                            <button
                              className="p-1.5 sm:p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              onClick={(e) => { e.stopPropagation(); openEditModal(room); }}
                              title="Edit Room"
                            >
                              <PencilIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                            </button>
                          ) : (
                            <button
                              className="p-1.5 sm:p-2 text-gray-400 cursor-not-allowed"
                              disabled
                              title="You need full access to edit rooms"
                            >
                              <LockClosedIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                            </button>
                          )}
                          {canDeleteRoom ? (
                            <button
                              className="p-1.5 sm:p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              onClick={(e) => { e.stopPropagation(); handleDeleteRoom(room._id); }}
                              title="Delete Room"
                            >
                              <TrashIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                            </button>
                          ) : (
                            <button
                              className="p-1.5 sm:p-2 text-gray-400 cursor-not-allowed"
                              disabled
                              title="You need full access to delete rooms"
                            >
                              <LockClosedIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                            </button>
                          )}
                        </div>
                          </td>
                        </motion.tr>
                  ))}
                    </tbody>
                  </table>
                </div>
              </div>
        </div>
                    );
                  })}
          </div>

      {/* Add Room Modal */}
      <AnimatePresence>
        {showAddModal && (
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
              className="bg-white rounded-lg sm:rounded-xl p-4 sm:p-6 w-full max-w-md"
            >
              <div className="flex justify-between items-center mb-3 sm:mb-4">
                <h2 className="text-lg sm:text-xl font-semibold">Add New Room</h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <XMarkIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              </div>
              <form onSubmit={handleAddRoom} className="space-y-3 sm:space-y-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    Gender
                  </label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleFormChange}
                    required
                    className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs sm:text-sm"
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleFormChange}
                    required
                    className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs sm:text-sm"
                  >
                    <option value="">Select Category</option>
                    {getCategoryOptions(formData.gender).map(category => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    Room Number
                  </label>
                  <input
                    type="text"
                    name="roomNumber"
                    value={formData.roomNumber}
                    onChange={handleFormChange}
                    required
                    className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs sm:text-sm"
                    placeholder="Enter room number"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    Bed Count
                  </label>
                  <input
                    type="number"
                    name="bedCount"
                    min={1}
                    value={formData.bedCount}
                    onChange={handleFormChange}
                    required
                    className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs sm:text-sm"
                    placeholder="Enter bed count"
                  />
                </div>
                <div className="flex justify-end gap-2 sm:gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-3 sm:px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors text-xs sm:text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs sm:text-sm"
                  >
                    Add Room
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Room Modal */}
      <AnimatePresence>
        {showEditModal && (
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
              className="bg-white rounded-lg sm:rounded-xl p-4 sm:p-6 w-full max-w-md"
            >
              <div className="flex justify-between items-center mb-3 sm:mb-4">
                <h2 className="text-lg sm:text-xl font-semibold">Edit Room</h2>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <XMarkIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              </div>
              <form onSubmit={handleEditRoom} className="space-y-3 sm:space-y-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    Gender
                  </label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleFormChange}
                    required
                    className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs sm:text-sm"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleFormChange}
                    required
                    className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs sm:text-sm"
                  >
                    {getCategoryOptions(formData.gender).map(category => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    Room Number
                  </label>
                  <input
                    type="text"
                    name="roomNumber"
                    value={formData.roomNumber}
                    onChange={handleFormChange}
                    required
                    className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    Bed Count
                  </label>
                  <input
                    type="number"
                    name="bedCount"
                    min={1}
                    value={formData.bedCount}
                    onChange={handleFormChange}
                    required
                    className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs sm:text-sm"
                    placeholder="Enter bed count"
                  />
                </div>
                <div className="flex justify-end gap-2 sm:gap-3">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="px-3 sm:px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors text-xs sm:text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs sm:text-sm"
                  >
                    Update Room
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Student Details Modal */}
      <AnimatePresence>
        {showStudentModal && selectedRoom && (
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
              className="bg-white rounded-lg sm:rounded-xl p-4 sm:p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-3 sm:mb-4">
                <div>
                  <h2 className="text-lg sm:text-xl font-semibold">
                    Room {selectedRoom.roomNumber} Details
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-500">
                    {selectedRoom.gender} - Category {selectedRoom.category}
                  </p>
                </div>
                <button
                  onClick={() => setShowStudentModal(false)}
                  className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <XMarkIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              </div>

              {loadingStudents ? (
                <div className="flex justify-center items-center h-32">
                  <LoadingSpinner size="md" />
                </div>
              ) : !roomStudents || roomStudents.length === 0 ? (
                <div className="text-center py-6 sm:py-8">
                  <UserGroupIcon className="w-8 h-8 sm:w-12 sm:h-12 text-gray-400 mx-auto mb-2 sm:mb-3" />
                  <p className="text-xs sm:text-sm text-gray-500">No students assigned to this room</p>
                </div>
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  {roomStudents.map((student) => (
                    <div
                      key={student._id}
                      className="bg-gray-50 rounded-lg p-3 sm:p-4 flex items-start gap-3 sm:gap-4"
                    >
                      <div className="bg-blue-100 p-1.5 sm:p-2 rounded-lg">
                        <UserIcon className="w-4 h-4 sm:w-6 sm:h-6 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900 text-sm sm:text-base">{student.name}</h3>
                        <div className="mt-1.5 sm:mt-2 space-y-1 text-xs sm:text-sm text-gray-600">
                          <div className="flex items-center gap-1.5 sm:gap-2">
                            <AcademicCapIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                            <span>Roll No: {student.rollNumber}</span>
                          </div>
                          <div className="flex items-center gap-1.5 sm:gap-2">
                            <PhoneIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                            <span>Phone: {student.studentPhone}</span>
                          </div>
                          <div className="flex items-center gap-1.5 sm:gap-2">
                            <span className="text-xs bg-blue-100 text-blue-800 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded">
                              {(student.course?.name || student.course || 'N/A')} - {(student.branch?.name || student.branch || 'N/A')}
                            </span>
                            {/* <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                              Year {student.year}
                            </span> */}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Electricity Bill Modal */}
      <AnimatePresence>
        {showBillModal && selectedRoom && (
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
              className="bg-white rounded-xl p-6 w-full max-w-lg"
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Electricity Bill - Room {selectedRoom.roomNumber}</h2>
                <button
                  onClick={() => setShowBillModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleBillPreview} className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Month (YYYY-MM)</label>
                  <input type="month" name="month" value={billForm.month} onChange={handleBillFormChange} required className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </div>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Units</label>
                    <input type="number" name="startUnits" value={billForm.startUnits} onChange={handleBillFormChange} required className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Units</label>
                    <input type="number" name="endUnits" value={billForm.endUnits} onChange={handleBillFormChange} required className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Rate/Unit</label>
                    <input type="number" name="rate" value={billForm.rate} onChange={handleBillFormChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg" step="0.01" />
                  </div>
                </div>
                
                {/* Real-time Preview */}
                {realTimePreview && (
                  <div className={`p-3 rounded-lg border ${realTimePreview.isValid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">Consumption:</span>
                      <span className={`font-semibold ${realTimePreview.isValid ? 'text-green-600' : 'text-red-600'}`}>
                        {realTimePreview.consumption} units
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">Rate:</span>
                      <span className="font-semibold">₹{realTimePreview.rate}/unit</span>
                    </div>
                    <div className="flex justify-between items-center text-sm border-t border-gray-200 pt-1 mt-1">
                      <span className="text-gray-600">Estimated Total:</span>
                      <span className={`font-bold ${realTimePreview.isValid ? 'text-green-600' : 'text-red-600'}`}>
                        ₹{realTimePreview.total}
                      </span>
                    </div>
                    {!realTimePreview.isValid && (
                      <div className="text-red-600 text-xs mt-1">
                        ⚠️ End units must be greater than or equal to start units
                      </div>
                    )}
                  </div>
                )}
                
                <div className="flex justify-end gap-3">
                  <button 
                    type="submit" 
                    disabled={!realTimePreview || !realTimePreview.isValid}
                    className={`px-4 py-2 text-white rounded-lg transition-colors ${
                      realTimePreview && realTimePreview.isValid 
                        ? 'bg-blue-600 hover:bg-blue-700' 
                        : 'bg-gray-400 cursor-not-allowed'
                    }`}
                  >
                    Preview Bill
                  </button>
                </div>
              </form>
              <h3 className="text-lg font-semibold mb-2">Bill History</h3>
              {billLoading ? (
                <div className="text-center py-4">Loading...</div>
              ) : !billHistory || billHistory.length === 0 ? (
                <div className="text-center py-4 text-gray-500">No bills found.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm border">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="px-2 py-1 border">Month</th>
                        <th className="px-2 py-1 border">Start</th>
                        <th className="px-2 py-1 border">End</th>
                        <th className="px-2 py-1 border">Consumption</th>
                        <th className="px-2 py-1 border">Rate</th>
                        <th className="px-2 py-1 border">Total</th>
                        <th className="px-2 py-1 border">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {billHistory.map((bill, idx) => (
                        <tr key={idx}>
                          <td className="px-2 py-1 border">{bill.month}</td>
                          <td className="px-2 py-1 border">{bill.startUnits}</td>
                          <td className="px-2 py-1 border">{bill.endUnits}</td>
                          <td className="px-2 py-1 border">{bill.consumption !== undefined ? bill.consumption : bill.endUnits - bill.startUnits}</td>
                          <td className="px-2 py-1 border">{bill.rate}</td>
                          <td className="px-2 py-1 border">{bill.total}</td>
                          <td className="px-2 py-1 border">
                            <button
                              className="px-2 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 text-xs"
                              onClick={() => {
                                setEditBillForm({
                                  month: bill.month,
                                  startUnits: bill.startUnits,
                                  endUnits: bill.endUnits,
                                  rate: bill.rate
                                });
                                setShowEditBillModal(true);
                              }}
                            >
                              Edit
                            </button>
                          </td>
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

      {/* Edit Bill Modal */}
      <AnimatePresence>
        {showEditBillModal && (
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
              className="bg-white rounded-xl p-6 w-full max-w-md"
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Edit Bill</h2>
                <button
                  onClick={() => setShowEditBillModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleEditBillPreview} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Month (YYYY-MM)</label>
                  <input type="month" name="month" value={editBillForm.month} disabled className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100" />
                </div>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Units</label>
                    <input type="number" name="startUnits" value={editBillForm.startUnits} onChange={handleEditBillFormChange} required className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Units</label>
                    <input type="number" name="endUnits" value={editBillForm.endUnits} onChange={handleEditBillFormChange} required className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Rate/Unit</label>
                    <input type="number" name="rate" value={editBillForm.rate} onChange={handleEditBillFormChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg" step="0.01" />
                  </div>
                </div>
                
                {/* Real-time Preview for Edit */}
                {editRealTimePreview && (
                  <div className={`p-3 rounded-lg border ${editRealTimePreview.isValid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">Consumption:</span>
                      <span className={`font-semibold ${editRealTimePreview.isValid ? 'text-green-600' : 'text-red-600'}`}>
                        {editRealTimePreview.consumption} units
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">Rate:</span>
                      <span className="font-semibold">₹{editRealTimePreview.rate}/unit</span>
                    </div>
                    <div className="flex justify-between items-center text-sm border-t border-gray-200 pt-1 mt-1">
                      <span className="text-gray-600">Estimated Total:</span>
                      <span className={`font-bold ${editRealTimePreview.isValid ? 'text-green-600' : 'text-red-600'}`}>
                        ₹{editRealTimePreview.total}
                      </span>
                    </div>
                    {!editRealTimePreview.isValid && (
                      <div className="text-red-600 text-xs mt-1">
                        ⚠️ End units must be greater than or equal to start units
                      </div>
                    )}
                  </div>
                )}
                
                <div className="flex justify-end gap-3">
                  <button type="button" onClick={() => setShowEditBillModal(false)} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">Cancel</button>
                  <button 
                    type="submit" 
                    disabled={!editRealTimePreview || !editRealTimePreview.isValid}
                    className={`px-4 py-2 text-white rounded-lg transition-colors ${
                      editRealTimePreview && editRealTimePreview.isValid 
                        ? 'bg-blue-600 hover:bg-blue-700' 
                        : 'bg-gray-400 cursor-not-allowed'
                    }`}
                  >
                    Preview Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bill Preview Modal */}
      <AnimatePresence>
        {showBillPreviewModal && billPreview && (
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
              className="bg-white rounded-xl p-6 w-full max-w-md"
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Bill Preview</h2>
                <button
                  onClick={() => {
                    setShowBillPreviewModal(false);
                    setBillPreview(null);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <div className="text-center mb-3">
                  <h3 className="text-lg font-semibold text-blue-900">
                    {billPreview.isUpdate ? 'Update' : 'New'} Electricity Bill
                  </h3>
                  <p className="text-sm text-blue-700">Room {selectedRoom.roomNumber} - {billPreview.month}</p>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Start Units:</span>
                    <span className="font-semibold">{billPreview.startUnits}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">End Units:</span>
                    <span className="font-semibold">{billPreview.endUnits}</span>
                  </div>
                  <div className="flex justify-between items-center border-t border-blue-200 pt-2">
                    <span className="text-gray-600">Consumption:</span>
                    <span className="font-semibold text-blue-600">{billPreview.consumption} units</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Rate per Unit:</span>
                    <span className="font-semibold">₹{billPreview.rate}</span>
                  </div>
                  <div className="flex justify-between items-center border-t border-blue-200 pt-2">
                    <span className="text-lg font-semibold text-gray-800">Total Amount:</span>
                    <span className="text-lg font-bold text-green-600">₹{billPreview.total}</span>
                  </div>
                </div>
                
                {billPreview.isUpdate && (
                  <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                    ⚠️ This will update the existing bill for {billPreview.month}
                  </div>
                )}
              </div>
              
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowBillPreviewModal(false);
                    setBillPreview(null);
                  }}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleBillConfirm}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  {billPreview.isUpdate ? 'Update Bill' : 'Save Bill'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Bill Preview Modal */}
      <AnimatePresence>
        {showEditBillPreviewModal && editBillPreview && (
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
              className="bg-white rounded-xl p-6 w-full max-w-md"
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Update Bill Preview</h2>
                <button
                  onClick={() => {
                    setShowEditBillPreviewModal(false);
                    setEditBillPreview(null);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <div className="text-center mb-3">
                  <h3 className="text-lg font-semibold text-yellow-900">
                    Update Electricity Bill
                  </h3>
                  <p className="text-sm text-yellow-700">Room {selectedRoom.roomNumber} - {editBillPreview.month}</p>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Start Units:</span>
                    <span className="font-semibold">{editBillPreview.startUnits}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">End Units:</span>
                    <span className="font-semibold">{editBillPreview.endUnits}</span>
                  </div>
                  <div className="flex justify-between items-center border-t border-yellow-200 pt-2">
                    <span className="text-gray-600">Consumption:</span>
                    <span className="font-semibold text-blue-600">{editBillPreview.consumption} units</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Rate per Unit:</span>
                    <span className="font-semibold">₹{editBillPreview.rate}</span>
                  </div>
                  <div className="flex justify-between items-center border-t border-yellow-200 pt-2">
                    <span className="text-lg font-semibold text-gray-800">Total Amount:</span>
                    <span className="text-lg font-bold text-green-600">₹{editBillPreview.total}</span>
                  </div>
                </div>
                
                <div className="mt-3 p-2 bg-orange-50 border border-orange-200 rounded text-sm text-orange-800">
                  ⚠️ This will update the existing bill for {editBillPreview.month}
                </div>
              </div>
              
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditBillPreviewModal(false);
                    setEditBillPreview(null);
                  }}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleEditBillConfirm}
                  className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
                >
                  Update Bill
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default RoomManagement; 