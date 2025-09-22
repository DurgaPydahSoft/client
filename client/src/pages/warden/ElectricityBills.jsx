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
  console.log('⚡ Warden ElectricityBills component loaded');
  
  const { user } = useAuth();
  const isWarden = user?.role === 'warden';
  const canManageBills = isWarden; // Wardens can manage bills for their hostel type
  
  console.log('🔐 Warden Electricity Bills Permissions:', {
    user: user?.username,
    role: user?.role,
    isWarden,
    canManageBills,
    hostelType: user?.hostelType,
    permissions: user?.permissions
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

  const fetchRooms = async () => {
    try {
      console.log('⚡ Fetching rooms with filters:', filters);
      const params = {
        ...filters,
        includeLastBill: true // Always fetch last bill for bulk mode
      };
      const response = await api.get('/api/admin/rooms/warden', { params });
      console.log('⚡ Rooms response:', response.data);
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
      toast.error('Only wardens can manage electricity bills');
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

      await axios.post(`${import.meta.env.VITE_API_URL.replace(/\/$/, '')}/api/admin/rooms/warden/bulk-electricity-bills`, payload, {
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
      toast.error('Only wardens can manage electricity bills');
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

      await axios.post(`${import.meta.env.VITE_API_URL.replace(/\/$/, '')}/api/admin/rooms/warden/${roomId}/electricity-bill`, payload, {
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

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8">
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <LoadingSpinner />
          <p className="text-sm text-gray-500 mt-4">Loading electricity bills...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8 mt-16 sm:mt-0">
      <SEO title="Electricity Bills - Warden Dashboard" />
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 mb-4  sm:mb-6">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-green-900 to-green-700 bg-clip-text text-transparent">Electricity Bills</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1 flex flex-wrap items-center gap-2">
            Manage electricity billing for your assigned rooms
            {user?.hostelType && (
              <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                {user.hostelType === 'boys' ? 'Boys Hostel' : 'Girls Hostel'}
              </span>
            )}
          </p>
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

      {/* Filters */}
      <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-3 sm:p-4 mb-4 sm:mb-6">
        {user?.hostelType && (
          <div className="mb-3 sm:mb-4 p-2 sm:p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs sm:text-sm text-blue-800">
              <strong>Note:</strong> You are viewing rooms for {user.hostelType === 'boys' ? 'Boys' : 'Girls'} Hostel only.
            </p>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
              Gender
            </label>
            <select
              name="gender"
              value={filters.gender}
              onChange={handleFilterChange}
              className="w-full px-2 sm:px-3 py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
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
              className="w-full px-2 sm:px-3 py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:bg-gray-100"
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

      {/* Bulk Billing Table */}
      <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-3 sm:p-4">
        <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4">Bulk Electricity Billing</h2>
        
        {/* Global Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6 p-3 sm:p-4 bg-gray-50 rounded-lg">
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Billing Month</label>
            <input 
              type="month" 
              value={bulkMonth}
              onChange={(e) => setBulkMonth(e.target.value)}
              className="w-full px-2 sm:px-3 py-2 text-xs sm:text-sm border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Default Rate/Unit</label>
            <input 
              type="number" 
              placeholder="e.g., 5"
              value={bulkRate}
              onChange={(e) => setBulkRate(e.target.value)}
              className="w-full px-2 sm:px-3 py-2 text-xs sm:text-sm border border-gray-300 rounded-lg"
            />
          </div>
          <div className="flex items-end sm:col-span-2 lg:col-span-1">
            <button
              onClick={handleSaveBulkBills}
              disabled={isSavingBulk || !canManageBills}
              className={`w-full px-3 sm:px-4 py-2 text-xs sm:text-sm rounded-lg transition-colors ${
                canManageBills && !isSavingBulk
                  ? 'bg-green-600 text-white hover:bg-green-700' 
                  : 'bg-gray-400 text-gray-200 cursor-not-allowed'
              }`}
              title={!canManageBills ? 'Only wardens can manage electricity bills' : 'Save all bills'}
            >
              {!canManageBills ? <LockClosedIcon className="w-4 h-4 sm:w-5 sm:h-5 mx-auto" /> : (isSavingBulk ? 'Saving...' : 'Save All Bills')}
            </button>
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Room</th>
                <th className="px-2 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start</th>
                <th className="px-2 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">End</th>
                <th className="px-2 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rate</th>
                <th className="px-2 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cons.</th>
                <th className="px-2 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
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
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-gray-900">
                        <div className="flex flex-col">
                          <span className="font-semibold">{bill.roomNumber}</span>
                          <div className="flex items-center gap-1 mt-1">
                            <span className="text-xs text-gray-500">{bill.gender.charAt(0)}/{bill.category}</span>
                            {isAlreadyBilled && (
                              <span className="px-1.5 py-0.5 text-xs text-white bg-green-600 rounded-full">Billed</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-2 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500">
                        <input
                          type="number"
                          value={isAlreadyBilled ? startUnits : bill.startUnits}
                          onChange={(e) => handleBulkBillChange(bill.roomId, 'startUnits', e.target.value)}
                          disabled={isAlreadyBilled}
                          className="w-16 sm:w-20 p-1 text-xs border border-gray-300 rounded disabled:bg-gray-200"
                        />
                      </td>
                      <td className="px-2 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500">
                        <input
                          type="number"
                          placeholder="New"
                          value={isAlreadyBilled ? endUnits : bill.endUnits}
                          onChange={(e) => handleBulkBillChange(bill.roomId, 'endUnits', e.target.value)}
                          disabled={isAlreadyBilled}
                          className={`w-16 sm:w-20 p-1 text-xs border rounded ${!isValid && !isAlreadyBilled ? 'border-red-500' : 'border-gray-300'} disabled:bg-gray-200`}
                        />
                      </td>
                      <td className="px-2 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500">
                        <input
                          type="number"
                          placeholder={bulkRate || 'Def'}
                          value={isAlreadyBilled ? rate : bill.rate}
                          onChange={(e) => handleBulkBillChange(bill.roomId, 'rate', e.target.value)}
                          disabled={isAlreadyBilled}
                          className="w-12 sm:w-16 p-1 text-xs border border-gray-300 rounded disabled:bg-gray-200"
                        />
                      </td>
                      <td className={`px-2 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm ${!isValid && !isAlreadyBilled ? 'text-red-500' : 'text-gray-900'}`}>
                        {isValid ? consumption : 'Invalid'}
                      </td>
                      <td className={`px-2 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-semibold ${!isValid && !isAlreadyBilled ? 'text-red-500' : 'text-green-600'}`}>
                        ₹{isValid ? total.toFixed(2) : '0.00'}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="sm:hidden space-y-3">
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
                <div 
                  key={bill.roomId} 
                  className={`bg-white rounded-lg border-2 p-3 shadow-sm transition-all duration-200 ${
                    isAlreadyBilled 
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
                    {isAlreadyBilled && (
                      <span className="px-2 py-1 text-xs text-white bg-green-600 rounded-full font-medium shadow-sm">
                        ✓ Billed
                      </span>
                    )}
                    {bill.isEdited && !isAlreadyBilled && (
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
                        value={isAlreadyBilled ? startUnits : bill.startUnits}
                        onChange={(e) => handleBulkBillChange(bill.roomId, 'startUnits', e.target.value)}
                        disabled={isAlreadyBilled}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg disabled:bg-gray-200 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                        placeholder="Enter start units"
                      />
                    </div>

                    {/* End Units */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">End Units</label>
                      <input
                        type="number"
                        placeholder="Enter new reading"
                        value={isAlreadyBilled ? endUnits : bill.endUnits}
                        onChange={(e) => handleBulkBillChange(bill.roomId, 'endUnits', e.target.value)}
                        disabled={isAlreadyBilled}
                        className={`w-full px-3 py-2 text-sm border rounded-lg disabled:bg-gray-200 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors ${
                          !isValid && !isAlreadyBilled ? 'border-red-500 bg-red-50' : 'border-gray-300'
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
                        value={isAlreadyBilled ? rate : bill.rate}
                        onChange={(e) => handleBulkBillChange(bill.roomId, 'rate', e.target.value)}
                        disabled={isAlreadyBilled}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg disabled:bg-gray-200 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
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
                      
                      {/* Individual Save Button for Mobile */}
                      <button
                        onClick={() => handleSaveSingleBill(bill.roomId, {
                          month: bulkMonth,
                          startUnits: Number(bill.startUnits) || 0,
                          endUnits: Number(bill.endUnits) || 0,
                          rate: bill.rate !== '' ? Number(bill.rate) : Number(bulkRate) || 5
                        })}
                        disabled={savingRoomId === bill.roomId || !canManageBills || isAlreadyBilled || !isValid || !bill.isEdited}
                        className={`w-full py-2 px-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                          canManageBills && savingRoomId !== bill.roomId && !isAlreadyBilled && isValid && bill.isEdited
                            ? 'bg-green-600 text-white hover:bg-green-700 active:bg-green-800 shadow-sm' 
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        {savingRoomId === bill.roomId ? (
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>Saving...</span>
                          </div>
                        ) : isAlreadyBilled ? '✓ Already Billed' : (isValid ? '💾 Save This Bill' : '❌ Invalid Data')}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          
          {/* Mobile-friendly empty state */}
          {bulkBillData.filter(bill => {
            if (filters.gender && bill.gender !== filters.gender) return false;
            if (filters.category && bill.category !== filters.category) return false;
            return true;
          }).length === 0 && (
            <div className="text-center py-8 sm:py-12">
              <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <BuildingOfficeIcon className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400" />
              </div>
              <h3 className="text-sm sm:text-base font-medium text-gray-900 mb-2">No rooms found</h3>
              <p className="text-xs sm:text-sm text-gray-500">
                {filters.gender || filters.category 
                  ? 'Try adjusting your filters to see more rooms.'
                  : 'No rooms are available for your hostel type.'
                }
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ElectricityBills; 