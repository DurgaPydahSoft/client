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
  Squares2X2Icon
} from '@heroicons/react/24/outline';
import LoadingSpinner from '../../components/LoadingSpinner';
import SEO from '../../components/SEO';
import axios from 'axios';

const RoomManagement = () => {
  console.log('🏠 RoomManagement component loaded');
  
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
  const [viewMode, setViewMode] = useState('card'); // 'card' or 'table'
  const [bulkBillData, setBulkBillData] = useState([]);
  const [bulkMonth, setBulkMonth] = useState('');
  const [bulkRate, setBulkRate] = useState('');
  const [isSavingBulk, setIsSavingBulk] = useState(false);

  const fetchRooms = async () => {
    try {
      console.log('🏠 Fetching rooms with filters:', filters);
      const params = {
        ...filters,
        includeLastBill: true // Always fetch last bill for bulk mode
      };
      const response = await api.get('/api/admin/rooms', { params });
      console.log('🏠 Rooms response:', response.data);
      if (response.data.success) {
        const fetchedRooms = response.data.data.rooms || [];
        setRooms(fetchedRooms);

        // Initialize bulk billing data
        const bulkData = fetchedRooms.map(room => ({
          roomId: room._id,
          roomNumber: room.roomNumber,
          gender: room.gender,
          category: room.category,
          startUnits: room.lastBill?.endUnits || '',
          endUnits: '',
          rate: '',
          isEdited: false
        }));
        setBulkBillData(bulkData);

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

  const handleBulkBillChange = (roomId, field, value) => {
    setBulkBillData(prevData =>
      prevData.map(bill => {
        if (bill.roomId === roomId) {
          return { ...bill, [field]: value, isEdited: true };
        }
        return bill;
      })
    );
  };

  useEffect(() => {
    fetchRooms();
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

      const response = await api.get(
        `/api/admin/rooms/${room._id}/electricity-bills`
      );

      if (response.data.success) {
        setBillHistory(response.data.data);
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
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/admin/rooms/${selectedRoom._id}/electricity-bills`,
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
          `/api/admin/rooms/${selectedRoom._id}/electricity-bills`,
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
    try {
      const payload = {
        month: editBillPreview.month,
        startUnits: editBillPreview.startUnits,
        endUnits: editBillPreview.endUnits,
        rate: editBillPreview.rate
      };
      
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/rooms/${selectedRoom._id}/electricity-bill`,
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
          `/api/admin/rooms/${selectedRoom._id}/electricity-bills`,
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

  const handleSaveBulkBills = async () => {
    if (!bulkMonth) {
      toast.error('Please select a billing month.');
      return;
    }

    const billsToSave = bulkBillData.filter(bill => bill.isEdited && bill.endUnits && (Number(bill.endUnits) >= Number(bill.startUnits)));

    if (billsToSave.length === 0) {
      toast.error('No valid bills to save. Please enter end units for at least one room.');
      return;
    }

    setIsSavingBulk(true);
    try {
      const payload = {
        month: bulkMonth,
        bills: billsToSave.map(b => ({
          roomId: b.roomId,
          startUnits: Number(b.startUnits),
          endUnits: Number(b.endUnits),
          rate: b.rate !== '' ? Number(b.rate) : undefined,
        }))
      };

      await api.post('/api/admin/rooms/bulk-electricity-bills', payload);
      toast.success(`${billsToSave.length} bills saved successfully!`);
      
      // Refetch rooms to update last bill info
      fetchRooms();

    } catch (error) {
      console.error('Error saving bulk bills:', error);
      toast.error(error.response?.data?.message || 'Failed to save bulk bills.');
    } finally {
      setIsSavingBulk(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <SEO title="Room Management" />
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-900 to-blue-700 bg-clip-text text-transparent">Room Management</h1>
          <p className="text-sm text-gray-500 mt-1">Manage hostel rooms and their assignments</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <PlusIcon className="w-5 h-5" />
          Add Room
        </button>
      </div>

      {/* View Mode Toggle */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2 p-1 bg-gray-200 rounded-lg">
          <button
            onClick={() => setViewMode('card')}
            className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${
              viewMode === 'card' ? 'bg-white text-blue-600 shadow' : 'text-gray-600'
            }`}
          >
            <Squares2X2Icon className="w-5 h-5 inline-block mr-1" />
            Card View
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${
              viewMode === 'table' ? 'bg-white text-blue-600 shadow' : 'text-gray-600'
            }`}
          >
            <TableCellsIcon className="w-5 h-5 inline-block mr-1" />
            Bulk Billing
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Gender
            </label>
            <select
              name="gender"
              value={filters.gender}
              onChange={handleFilterChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Genders</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              name="category"
              value={filters.category}
              onChange={handleFilterChange}
              disabled={!filters.gender}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
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

      {viewMode === 'card' ? (
        // Card View (Existing layout)
        <div className="space-y-8">
          {Object.entries(groupedRooms).map(([key, rooms]) => {
            const [gender, category] = key.split('-');
            return (
              <div key={key} className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  {gender} - Category {category}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {rooms.map((room) => (
                    <motion.div
                      key={room._id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white rounded-xl shadow-sm p-4 border border-gray-100 hover:shadow-md transition-shadow"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div
                          className="flex-1 cursor-pointer"
                          onClick={() => handleRoomClick(room)}
                        >
                          <h3 className="text-lg font-semibold text-gray-900">
                            Room {room.roomNumber}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {room.studentCount || 0} Students
                          </p>
                        </div>
                        <div className="flex flex-col gap-2 items-end">
                          <button
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            onClick={(e) => { e.stopPropagation(); openEditModal(room); }}
                          >
                            <PencilIcon className="w-5 h-5" />
                          </button>
                          <button
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            onClick={(e) => { e.stopPropagation(); handleDeleteRoom(room._id); }}
                          >
                            <TrashIcon className="w-5 h-5" />
                          </button>
                          <button
                            className="w-full sm:w-auto mt-2 sm:mt-0 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm font-semibold"
                            onClick={(e) => { e.stopPropagation(); openBillModal(room); }}
                          >
                            Electricity Bill
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <BuildingOfficeIcon className="w-5 h-5" />
                        <span>{room.isActive ? 'Active' : 'Inactive'}</span>
                        <span className="ml-2 bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs">Beds: {room.bedCount}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        // Table View for Bulk Billing
        <div className="bg-white rounded-xl shadow-sm p-4">
          <h2 className="text-xl font-bold mb-4">Bulk Electricity Billing</h2>
          
          {/* Global Controls */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Billing Month</label>
              <input 
                type="month" 
                value={bulkMonth}
                onChange={(e) => setBulkMonth(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Default Rate/Unit</label>
              <input 
                type="number" 
                placeholder="e.g., 5"
                value={bulkRate}
                onChange={(e) => setBulkRate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleSaveBulkBills}
                disabled={isSavingBulk}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400"
              >
                {isSavingBulk ? 'Saving...' : 'Save All Bills'}
              </button>
            </div>
          </div>

          {/* Billing Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Room</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start Units</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">End Units</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rate</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Consumption</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {bulkBillData
                  .filter(bill => {
                    if (filters.gender && bill.gender !== filters.gender) return false;
                    if (filters.category && bill.category !== filters.category) return false;
                    return true;
                  })
                  .map(bill => {
                    const room = rooms.find(r => r._id === bill.roomId);
                    const existingBill = bulkMonth ? room?.electricityBills.find(b => b.month === bulkMonth) : null;
                    const isAlreadyBilled = !!existingBill;

                    let startUnits, endUnits, rate, consumption, total, isValid;

                    if (isAlreadyBilled) {
                      startUnits = existingBill.startUnits;
                      endUnits = existingBill.endUnits;
                      rate = existingBill.rate;
                      consumption = existingBill.consumption;
                      total = existingBill.total;
                      isValid = true;
                    } else {
                      startUnits = Number(bill.startUnits) || 0;
                      endUnits = Number(bill.endUnits) || 0;
                      rate = Number(bill.rate) || Number(bulkRate) || 5;
                      
                      isValid = endUnits >= startUnits;

                      if (isValid) {
                        consumption = endUnits - startUnits;
                        total = consumption * rate;
                      } else {
                        consumption = 0;
                        total = 0;
                      }
                    }

                    return (
                      <tr key={bill.roomId} className={`${isAlreadyBilled ? 'bg-green-100' : (bill.isEdited ? 'bg-blue-50' : '')}`}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {bill.roomNumber}
                          <div className="flex items-center mt-1">
                            <span className="text-xs text-gray-500">{bill.gender.charAt(0)}/{bill.category}</span>
                            {isAlreadyBilled && (
                              <span className="ml-2 px-2 py-0.5 text-xs text-white bg-green-600 rounded-full">Billed</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <input
                            type="number"
                            value={isAlreadyBilled ? startUnits : bill.startUnits}
                            onChange={(e) => handleBulkBillChange(bill.roomId, 'startUnits', e.target.value)}
                            disabled={isAlreadyBilled}
                            className="w-24 p-1 border border-gray-300 rounded disabled:bg-gray-200"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <input
                            type="number"
                            placeholder="New reading"
                            value={isAlreadyBilled ? endUnits : bill.endUnits}
                            onChange={(e) => handleBulkBillChange(bill.roomId, 'endUnits', e.target.value)}
                            disabled={isAlreadyBilled}
                            className={`w-24 p-1 border rounded ${!isValid && !isAlreadyBilled ? 'border-red-500' : 'border-gray-300'} disabled:bg-gray-200`}
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <input
                            type="number"
                            placeholder={bulkRate || 'Default'}
                            value={isAlreadyBilled ? rate : bill.rate}
                            onChange={(e) => handleBulkBillChange(bill.roomId, 'rate', e.target.value)}
                            disabled={isAlreadyBilled}
                            className="w-20 p-1 border border-gray-300 rounded disabled:bg-gray-200"
                          />
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${!isValid && !isAlreadyBilled ? 'text-red-500' : 'text-gray-900'}`}>
                          {isValid ? consumption : 'Invalid'}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-semibold ${!isValid && !isAlreadyBilled ? 'text-red-500' : 'text-green-600'}`}>
                          ₹{isValid ? total.toFixed(2) : '0.00'}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Room Modal */}
      <AnimatePresence>
        {showAddModal && (
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
                <h2 className="text-xl font-semibold">Add New Room</h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleAddRoom} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Gender
                  </label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleFormChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleFormChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Room Number
                  </label>
                  <input
                    type="text"
                    name="roomNumber"
                    value={formData.roomNumber}
                    onChange={handleFormChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter room number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bed Count
                  </label>
                  <input
                    type="number"
                    name="bedCount"
                    min={1}
                    value={formData.bedCount}
                    onChange={handleFormChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter bed count"
                  />
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
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
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-xl p-6 w-full max-w-md"
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Edit Room</h2>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleEditRoom} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Gender
                  </label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleFormChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleFormChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {getCategoryOptions(formData.gender).map(category => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Room Number
                  </label>
                  <input
                    type="text"
                    name="roomNumber"
                    value={formData.roomNumber}
                    onChange={handleFormChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bed Count
                  </label>
                  <input
                    type="number"
                    name="bedCount"
                    min={1}
                    value={formData.bedCount}
                    onChange={handleFormChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter bed count"
                  />
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
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
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="text-xl font-semibold">
                    Room {selectedRoom.roomNumber} Details
                  </h2>
                  <p className="text-sm text-gray-500">
                    {selectedRoom.gender} - Category {selectedRoom.category}
                  </p>
                </div>
                <button
                  onClick={() => setShowStudentModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>

              {loadingStudents ? (
                <div className="flex justify-center items-center h-32">
                  <LoadingSpinner size="md" />
                </div>
              ) : !roomStudents || roomStudents.length === 0 ? (
                <div className="text-center py-8">
                  <UserGroupIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500">No students assigned to this room</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {roomStudents.map((student) => (
                    <div
                      key={student._id}
                      className="bg-gray-50 rounded-lg p-4 flex items-start gap-4"
                    >
                      <div className="bg-blue-100 p-2 rounded-lg">
                        <UserIcon className="w-6 h-6 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{student.name}</h3>
                        <div className="mt-2 space-y-1 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <AcademicCapIcon className="w-4 h-4" />
                            <span>Roll No: {student.rollNumber}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <PhoneIcon className="w-4 h-4" />
                            <span>Phone: {student.studentPhone}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                              {student.course} - {student.branch}
                            </span>
                            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                              Year {student.year}
                            </span>
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