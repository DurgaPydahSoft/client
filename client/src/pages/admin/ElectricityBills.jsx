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

const ElectricityBills = () => {

  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin';
  const canManageBills = isSuperAdmin || canPerformAction(user, 'room_management', 'edit');

  console.log('🔐 Electricity Bills Permissions:', {
    user: user?.username,
    role: user?.role,
    isSuperAdmin,
    canManageBills,
    permissions: user?.permissions,
    accessLevels: user?.permissionAccessLevels
  });

  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    gender: '',
    category: ''
  });
  const [bulkBillData, setBulkBillData] = useState([]);
  const [bulkMonth, setBulkMonth] = useState('');
  const [bulkRate, setBulkRate] = useState('');
  const [isSavingBulk, setIsSavingBulk] = useState(false);
  const [savingRoomId, setSavingRoomId] = useState(null);
  const [editingBills, setEditingBills] = useState(new Set()); // Track which bills are being edited
  const [editModeData, setEditModeData] = useState({}); // Store original values for edit mode

  const fetchRooms = async () => {
    try {
      const params = {
        ...filters,
        includeLastBill: true // Always fetch last bill for bulk mode
      };
      const response = await api.get('/api/admin/rooms', { params });
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
      console.error('⚡ Error fetching rooms:', error);
      console.error('⚡ Error details:', error.response?.data);
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

  // Handle edit mode for saved bills
  const handleEditBill = (roomId) => {
    const room = rooms.find(r => r._id === roomId);
    const existingBill = bulkMonth ? room?.electricityBills.find(b => b.month === bulkMonth) : null;
    
    if (existingBill) {
      // Store original values for cancel functionality
      setEditModeData(prev => ({
        ...prev,
        [roomId]: {
          startUnits: existingBill.startUnits,
          endUnits: existingBill.endUnits,
          rate: existingBill.rate
        }
      }));
      
      // Enable edit mode
      setEditingBills(prev => new Set([...prev, roomId]));
      
      // Update bulk bill data with existing bill values for editing
      setBulkBillData(prevData =>
        prevData.map(bill => {
          if (bill.roomId === roomId) {
            return {
              ...bill,
              startUnits: existingBill.startUnits,
              endUnits: existingBill.endUnits,
              rate: existingBill.rate,
              isEdited: false // Reset edited flag
            };
          }
          return bill;
        })
      );
    }
  };

  // Handle cancel edit
  const handleCancelEdit = (roomId) => {
    // Restore original values
    const originalData = editModeData[roomId];
    if (originalData) {
      setBulkBillData(prevData =>
        prevData.map(bill => {
          if (bill.roomId === roomId) {
            return {
              ...bill,
              startUnits: originalData.startUnits,
              endUnits: originalData.endUnits,
              rate: originalData.rate,
              isEdited: false
            };
          }
          return bill;
        })
      );
    }
    
    // Remove from editing set
    setEditingBills(prev => {
      const newSet = new Set(prev);
      newSet.delete(roomId);
      return newSet;
    });
    
    // Clean up edit mode data
    setEditModeData(prev => {
      const newData = { ...prev };
      delete newData[roomId];
      return newData;
    });
  };

  // Handle save edited bill
  const handleSaveEditedBill = async (roomId) => {
    if (!canManageBills) {
      toast.error('You do not have permission to manage electricity bills');
      return;
    }

    if (!bulkMonth) {
      toast.error('Please select a billing month.');
      return;
    }

    const billData = bulkBillData.find(bill => bill.roomId === roomId);
    if (!billData) {
      toast.error('Bill data not found');
      return;
    }

    const startUnits = Number(billData.startUnits) || 0;
    const endUnits = Number(billData.endUnits) || 0;
    const rate = billData.rate !== '' ? Number(billData.rate) : Number(bulkRate) || 5;

    if (endUnits < startUnits) {
      toast.error('End units must be greater than or equal to start units');
      return;
    }

    setSavingRoomId(roomId);
    try {
      const payload = {
        month: bulkMonth,
        startUnits: startUnits,
        endUnits: endUnits,
        rate: rate
      };

      await axios.post(`${import.meta.env.VITE_API_URL.replace(/\/$/, '')}/api/admin/rooms/${roomId}/electricity-bill`, payload, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });

      toast.success(`Bill updated for Room ${rooms.find(r => r._id === roomId)?.roomNumber}!`);

      // Exit edit mode
      setEditingBills(prev => {
        const newSet = new Set(prev);
        newSet.delete(roomId);
        return newSet;
      });

      // Clean up edit mode data
      setEditModeData(prev => {
        const newData = { ...prev };
        delete newData[roomId];
        return newData;
      });

      // Refetch rooms to update last bill info
      fetchRooms();

    } catch (error) {
      console.error('Error updating bill:', error);
      toast.error(error.response?.data?.message || 'Failed to update bill.');
    } finally {
      setSavingRoomId(null);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, [filters]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSaveBulkBills = async () => {
    if (!canManageBills) {
      toast.error('You do not have permission to manage electricity bills');
      return;
    }

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

      await axios.post(`${import.meta.env.VITE_API_URL.replace(/\/$/, '')}/api/admin/rooms/bulk-electricity-bills`, payload, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
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

  const handleSaveSingleBill = async (roomId, billData) => {
    if (!canManageBills) {
      toast.error('You do not have permission to manage electricity bills');
      return;
    }

    if (!bulkMonth) {
      toast.error('Please select a billing month.');
      return;
    }

    setSavingRoomId(roomId);
    try {
      const payload = {
        month: billData.month,
        startUnits: billData.startUnits,
        endUnits: billData.endUnits,
        rate: billData.rate
      };

      await axios.post(`${import.meta.env.VITE_API_URL.replace(/\/$/, '')}/api/admin/rooms/${roomId}/electricity-bill`, payload, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });

      toast.success(`Bill saved for Room ${rooms.find(r => r._id === roomId)?.roomNumber}!`);

      // Refetch rooms to update last bill info
      fetchRooms();

    } catch (error) {
      console.error('Error saving single bill:', error);
      toast.error(error.response?.data?.message || 'Failed to save bill.');
    } finally {
      setSavingRoomId(null);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8 mt-12 sm:mt-0">
      <SEO title="Electricity Bills" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 sm:mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-blue-900 to-blue-700 bg-clip-text text-transparent">Electricity Bills</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">Manage electricity billing for all rooms</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4 mb-3 sm:mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
              Gender
            </label>
            <select
              name="gender"
              value={filters.gender}
              onChange={handleFilterChange}
              className="w-full px-3 py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Genders</option>
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
              value={filters.category}
              onChange={handleFilterChange}
              disabled={!filters.gender}
              className="w-full px-3 py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
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

      {/* Mobile Summary */}
      <div className="sm:hidden bg-white rounded-lg shadow-sm p-3 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs text-gray-600">Total Rooms</p>
            <p className="text-lg font-semibold text-gray-900">{rooms.length}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Filtered</p>
            <p className="text-lg font-semibold text-green-600">
              {bulkBillData.filter(bill => {
                if (filters.gender && bill.gender !== filters.gender) return false;
                if (filters.category && bill.category !== filters.category) return false;
                return true;
              }).length}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Edited</p>
            <p className="text-lg font-semibold text-blue-600">
              {bulkBillData.filter(bill => bill.isEdited).length}
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2">
          <button
            onClick={() => setBulkMonth(new Date().toISOString().slice(0, 7))}
            className="flex-1 py-2 px-3 bg-blue-100 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-200 transition-colors"
          >
            📅 This Month
          </button>
          <button
            onClick={() => setBulkRate('5')}
            className="flex-1 py-2 px-3 bg-green-100 text-green-700 rounded-lg text-xs font-medium hover:bg-green-200 transition-colors"
          >
            💰 Set Rate ₹5
          </button>
        </div>
      </div>

      {/* Bulk Billing Controls */}
      <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4 mb-4 sm:mb-6">
        <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4">Bulk Electricity Billing</h2>

        {/* Global Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 p-3 sm:p-4 bg-gray-50 rounded-lg">
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Billing Month</label>
            <input
              type="month"
              value={bulkMonth}
              onChange={(e) => setBulkMonth(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Default Rate/Unit</label>
            <input
              type="number"
              placeholder="e.g., 5"
              value={bulkRate}
              onChange={(e) => setBulkRate(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm border border-gray-300 rounded-lg"
            />
          </div>
          <div className="flex items-end sm:col-span-2 lg:col-span-1">
            <button
              onClick={handleSaveBulkBills}
              disabled={isSavingBulk || !canManageBills}
              className={`w-full px-4 py-2 text-xs sm:text-sm rounded-lg transition-colors ${canManageBills && !isSavingBulk
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-gray-400 text-gray-200 cursor-not-allowed'
                }`}
              title={!canManageBills ? 'You need full access to manage electricity bills' : 'Save all bills'}
            >
              {!canManageBills ? <LockClosedIcon className="w-5 h-5 mx-auto" /> : (isSavingBulk ? 'Saving...' : 'Save All Bills')}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="sm:hidden space-y-4">
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

            if (isAlreadyBilled && !editingBills.has(bill.roomId)) {
              // Show existing bill values when not editing
              startUnits = existingBill.startUnits;
              endUnits = existingBill.endUnits;
              rate = existingBill.rate;
              consumption = existingBill.consumption;
              total = existingBill.total;
              isValid = true;
            } else {
              // Use bulk bill data for new bills or when editing
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
              <div
                key={bill.roomId}
                className={`bg-white rounded-lg border-2 p-3 shadow-sm transition-all duration-200 ${isAlreadyBilled
                  ? 'border-green-300 bg-green-50 shadow-green-100'
                  : bill.isEdited
                    ? 'border-blue-300 bg-blue-50 shadow-blue-100'
                    : 'border-gray-200 hover:border-gray-300'
                  }`}
              >
                {/* Card Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center shadow-sm">
                      <BuildingOfficeIcon className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 text-base">Room {bill.roomNumber}</h3>
                      <p className="text-xs text-gray-500">{bill.gender.charAt(0)}/{bill.category}</p>
                    </div>
                  </div>
                  {isAlreadyBilled && !editingBills.has(bill.roomId) && (
                    <span className="px-2 py-1 text-xs text-white bg-green-600 rounded-full font-medium shadow-sm">
                      ✓ Billed
                    </span>
                  )}
                  {editingBills.has(bill.roomId) && (
                    <span className="px-2 py-1 text-xs text-white bg-orange-600 rounded-full font-medium shadow-sm">
                      ✏️ Editing
                    </span>
                  )}
                  {bill.isEdited && !isAlreadyBilled && !editingBills.has(bill.roomId) && (
                    <span className="px-2 py-1 text-xs text-white bg-blue-600 rounded-full font-medium shadow-sm">
                      ✏️ Edited
                    </span>
                  )}
                </div>

                {/* Card Content */}
                <div className="space-y-3">
                  {/* Start Units */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Start Units</label>
                    <input
                      type="number"
                      value={editingBills.has(bill.roomId) ? bill.startUnits : (isAlreadyBilled ? startUnits : bill.startUnits)}
                      onChange={(e) => handleBulkBillChange(bill.roomId, 'startUnits', e.target.value)}
                      disabled={isAlreadyBilled && !editingBills.has(bill.roomId)}
                      className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors ${
                        isAlreadyBilled && !editingBills.has(bill.roomId) 
                          ? 'bg-gray-100 text-gray-500 cursor-not-allowed' 
                          : 'border-gray-300'
                      }`}
                      placeholder="Enter start units"
                    />
                  </div>

                  {/* End Units */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">End Units</label>
                    <input
                      type="number"
                      placeholder="Enter new reading"
                      value={editingBills.has(bill.roomId) ? bill.endUnits : (isAlreadyBilled ? endUnits : bill.endUnits)}
                      onChange={(e) => handleBulkBillChange(bill.roomId, 'endUnits', e.target.value)}
                      disabled={isAlreadyBilled && !editingBills.has(bill.roomId)}
                      className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors ${
                        !isValid && !isAlreadyBilled ? 'border-red-500 bg-red-50' : 
                        isAlreadyBilled && !editingBills.has(bill.roomId) 
                          ? 'bg-gray-100 text-gray-500 cursor-not-allowed border-gray-300' 
                          : 'border-gray-300'
                      }`}
                    />
                    {!isValid && !isAlreadyBilled && (
                      <p className="text-xs text-red-600 mt-1">End units must be greater than start units</p>
                    )}
                  </div>

                  {/* Rate */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Rate per Unit</label>
                    <input
                      type="number"
                      placeholder={bulkRate || 'Default rate'}
                      value={editingBills.has(bill.roomId) ? bill.rate : (isAlreadyBilled ? rate : bill.rate)}
                      onChange={(e) => handleBulkBillChange(bill.roomId, 'rate', e.target.value)}
                      disabled={isAlreadyBilled && !editingBills.has(bill.roomId)}
                      className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors ${
                        isAlreadyBilled && !editingBills.has(bill.roomId) 
                          ? 'bg-gray-100 text-gray-500 cursor-not-allowed' 
                          : 'border-gray-300'
                      }`}
                    />
                  </div>

                  {/* Summary */}
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className="text-center">
                        <p className="text-xs text-gray-600 mb-1">Consumption</p>
                        <p className={`text-sm font-semibold ${!isValid && !isAlreadyBilled ? 'text-red-500' : 'text-gray-900'}`}>
                          {isValid ? consumption : 'Invalid'}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-600 mb-1">Total Amount</p>
                        <p className={`text-sm font-semibold ${!isValid && !isAlreadyBilled ? 'text-red-500' : 'text-green-600'}`}>
                          ₹{isValid ? total.toFixed(2) : '0.00'}
                        </p>
                      </div>
                    </div>

                    {/* Action Buttons for Mobile */}
                    <div className="flex gap-2">
                      {isAlreadyBilled && !editingBills.has(bill.roomId) ? (
                        // Edit button for saved bills
                        <button
                          onClick={() => handleEditBill(bill.roomId)}
                          disabled={!canManageBills}
                          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all duration-200 ${canManageBills
                            ? 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 shadow-sm'
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            }`}
                        >
                          ✏️ Edit Bill
                        </button>
                      ) : editingBills.has(bill.roomId) ? (
                        // Save and Cancel buttons when editing
                        <>
                          <button
                            onClick={() => handleSaveEditedBill(bill.roomId)}
                            disabled={savingRoomId === bill.roomId || !canManageBills || !isValid}
                            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all duration-200 ${canManageBills && savingRoomId !== bill.roomId && isValid
                              ? 'bg-green-600 text-white hover:bg-green-700 active:bg-green-800 shadow-sm'
                              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                              }`}
                          >
                            {savingRoomId === bill.roomId ? (
                              <div className="flex items-center justify-center gap-2">
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                <span>Saving...</span>
                              </div>
                            ) : (isValid ? '💾 Save Changes' : '❌ Invalid Data')}
                          </button>
                          <button
                            onClick={() => handleCancelEdit(bill.roomId)}
                            disabled={savingRoomId === bill.roomId}
                            className="flex-1 py-2 px-3 rounded-lg text-sm font-medium bg-gray-600 text-white hover:bg-gray-700 active:bg-gray-800 shadow-sm transition-all duration-200 disabled:opacity-50"
                          >
                            ❌ Cancel
                          </button>
                        </>
                      ) : (
                        // Save button for new bills
                        <button
                          onClick={() => handleSaveSingleBill(bill.roomId, {
                            month: bulkMonth,
                            startUnits: Number(bill.startUnits) || 0,
                            endUnits: Number(bill.endUnits) || 0,
                            rate: bill.rate !== '' ? Number(bill.rate) : Number(bulkRate) || 5
                          })}
                          disabled={savingRoomId === bill.roomId || !canManageBills || !isValid}
                          className={`w-full py-2 px-3 rounded-lg text-sm font-medium transition-all duration-200 ${canManageBills && savingRoomId !== bill.roomId && isValid
                            ? 'bg-green-600 text-white hover:bg-green-700 active:bg-green-800 shadow-sm'
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            }`}
                        >
                          {savingRoomId === bill.roomId ? (
                            <div className="flex items-center justify-center gap-2">
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              <span>Saving...</span>
                            </div>
                          ) : (isValid ? '💾 Save This Bill' : '❌ Invalid Data')}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
      </div>

      {/* Desktop Table View */}
      <div className="hidden sm:block bg-white rounded-lg shadow-sm p-4">
        <h2 className="text-xl font-bold mb-4">Bulk Electricity Billing</h2>

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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
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

                  if (isAlreadyBilled && !editingBills.has(bill.roomId)) {
                    // Show existing bill values when not editing
                    startUnits = existingBill.startUnits;
                    endUnits = existingBill.endUnits;
                    rate = existingBill.rate;
                    consumption = existingBill.consumption;
                    total = existingBill.total;
                    isValid = true;
                  } else {
                    // Use bulk bill data for new bills or when editing
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
                    <tr key={bill.roomId} className={`${
                      isAlreadyBilled && !editingBills.has(bill.roomId) ? 'bg-green-100' : 
                      editingBills.has(bill.roomId) ? 'bg-orange-50' :
                      bill.isEdited ? 'bg-blue-50' : ''
                    }`}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {bill.roomNumber}
                        <div className="flex items-center mt-1">
                          <span className="text-xs text-gray-500">{bill.gender.charAt(0)}/{bill.category}</span>
                          {isAlreadyBilled && !editingBills.has(bill.roomId) && (
                            <span className="ml-2 px-2 py-0.5 text-xs text-white bg-green-600 rounded-full">Billed</span>
                          )}
                          {editingBills.has(bill.roomId) && (
                            <span className="ml-2 px-2 py-0.5 text-xs text-white bg-orange-600 rounded-full">Editing</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <input
                          type="number"
                          value={editingBills.has(bill.roomId) ? bill.startUnits : (isAlreadyBilled ? startUnits : bill.startUnits)}
                          onChange={(e) => handleBulkBillChange(bill.roomId, 'startUnits', e.target.value)}
                          disabled={isAlreadyBilled && !editingBills.has(bill.roomId)}
                          className={`w-24 p-1 border rounded focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                            isAlreadyBilled && !editingBills.has(bill.roomId) 
                              ? 'bg-gray-100 text-gray-500 cursor-not-allowed border-gray-300' 
                              : 'border-gray-300'
                          }`}
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <input
                          type="number"
                          placeholder="New reading"
                          value={editingBills.has(bill.roomId) ? bill.endUnits : (isAlreadyBilled ? endUnits : bill.endUnits)}
                          onChange={(e) => handleBulkBillChange(bill.roomId, 'endUnits', e.target.value)}
                          disabled={isAlreadyBilled && !editingBills.has(bill.roomId)}
                          className={`w-24 p-1 border rounded focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                            !isValid && !isAlreadyBilled ? 'border-red-500' : 
                            isAlreadyBilled && !editingBills.has(bill.roomId) 
                              ? 'bg-gray-100 text-gray-500 cursor-not-allowed border-gray-300' 
                              : 'border-gray-300'
                          }`}
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <input
                          type="number"
                          placeholder={bulkRate || 'Default'}
                          value={editingBills.has(bill.roomId) ? bill.rate : (isAlreadyBilled ? rate : bill.rate)}
                          onChange={(e) => handleBulkBillChange(bill.roomId, 'rate', e.target.value)}
                          disabled={isAlreadyBilled && !editingBills.has(bill.roomId)}
                          className={`w-20 p-1 border rounded focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                            isAlreadyBilled && !editingBills.has(bill.roomId) 
                              ? 'bg-gray-100 text-gray-500 cursor-not-allowed border-gray-300' 
                              : 'border-gray-300'
                          }`}
                        />
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${!isValid && !isAlreadyBilled ? 'text-red-500' : 'text-gray-900'}`}>
                        {isValid ? consumption : 'Invalid'}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-semibold ${!isValid && !isAlreadyBilled ? 'text-red-500' : 'text-green-600'}`}>
                        ₹{isValid ? total.toFixed(2) : '0.00'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex gap-1">
                          {isAlreadyBilled && !editingBills.has(bill.roomId) ? (
                            // Edit button for saved bills
                            <button
                              onClick={() => handleEditBill(bill.roomId)}
                              disabled={!canManageBills}
                              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${canManageBills
                                ? 'bg-blue-600 text-white hover:bg-blue-700'
                                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                }`}
                            >
                              Edit
                            </button>
                          ) : editingBills.has(bill.roomId) ? (
                            // Save and Cancel buttons when editing
                            <>
                              <button
                                onClick={() => handleSaveEditedBill(bill.roomId)}
                                disabled={savingRoomId === bill.roomId || !canManageBills || !isValid}
                                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${canManageBills && savingRoomId !== bill.roomId && isValid
                                  ? 'bg-green-600 text-white hover:bg-green-700'
                                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                  }`}
                              >
                                {savingRoomId === bill.roomId ? 'Saving...' : 'Save'}
                              </button>
                              <button
                                onClick={() => handleCancelEdit(bill.roomId)}
                                disabled={savingRoomId === bill.roomId}
                                className="px-3 py-1 rounded text-xs font-medium bg-gray-600 text-white hover:bg-gray-700 transition-colors disabled:opacity-50"
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            // Save button for new bills
                            <button
                              onClick={() => handleSaveSingleBill(bill.roomId, {
                                month: bulkMonth,
                                startUnits: Number(bill.startUnits) || 0,
                                endUnits: Number(bill.endUnits) || 0,
                                rate: bill.rate !== '' ? Number(bill.rate) : Number(bulkRate) || 5
                              })}
                              disabled={savingRoomId === bill.roomId || !canManageBills || !isValid}
                              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${canManageBills && savingRoomId !== bill.roomId && isValid
                                ? 'bg-green-600 text-white hover:bg-green-700'
                                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                }`}
                            >
                              {savingRoomId === bill.roomId ? 'Saving...' : 'Save'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ElectricityBills; 