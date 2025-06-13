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
  PhoneIcon
} from '@heroicons/react/24/outline';
import LoadingSpinner from '../../components/LoadingSpinner';
import SEO from '../../components/SEO';
import axios from 'axios';

const RoomManagement = () => {
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

  const fetchRooms = async () => {
    try {
      const response = await api.get('/api/admin/rooms', {
        params: filters
      });
      if (response.data.success) {
        setRooms(response.data.data.rooms || []);
      } else {
        throw new Error('Failed to fetch rooms');
      }
    } catch (error) {
      console.error('Error fetching rooms:', error);
      toast.error('Failed to fetch rooms');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, [filters]);

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
    setBillForm(prev => ({
      ...prev,
      [name]: value
    }));

    // If month is changed, try to auto-fill start units
    if (name === 'month' && value) {
      // Find the last month's bill
      const lastMonthBill = billHistory.find(bill => {
        const billDate = new Date(bill.month + '-01');
        const selectedDate = new Date(value + '-01');
        return billDate < selectedDate;
      });

      if (lastMonthBill) {
        setBillForm(prev => ({
          ...prev,
          startUnits: lastMonthBill.endUnits
        }));
      }
    }
  };

  const handleBillSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/admin/rooms/${selectedRoom._id}/electricity-bills`,
        billForm,
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
        
        toast.success('Bill added successfully');
      }
    } catch (error) {
      console.error('Error adding bill:', error);
      toast.error(error.response?.data?.message || 'Failed to add bill');
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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

      {/* Room Groups */}
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
              <form onSubmit={handleBillSubmit} className="space-y-4 mb-6">
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
                <div className="flex justify-end gap-3">
                  <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">Save Bill</button>
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
    </div>
  );
};

export default RoomManagement; 