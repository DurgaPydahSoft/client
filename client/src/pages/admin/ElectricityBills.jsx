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
  console.log('⚡ ElectricityBills component loaded');
  
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

  const fetchRooms = async () => {
    try {
      console.log('⚡ Fetching rooms with filters:', filters);
      const params = {
        ...filters,
        includeLastBill: true // Always fetch last bill for bulk mode
      };
      const response = await api.get('/api/admin/rooms', { params });
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

      await axios.post(`${import.meta.env.VITE_API_URL}/api/admin/rooms/bulk-electricity-bills`, payload, {
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

  if (loading) return <LoadingSpinner />;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <SEO title="Electricity Bills" />
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-900 to-blue-700 bg-clip-text text-transparent">Electricity Bills</h1>
          <p className="text-sm text-gray-500 mt-1">Manage electricity billing for all rooms</p>
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

      {/* Bulk Billing Table */}
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
              disabled={isSavingBulk || !canManageBills}
              className={`w-full px-4 py-2 rounded-lg transition-colors ${
                canManageBills && !isSavingBulk
                  ? 'bg-green-600 text-white hover:bg-green-700' 
                  : 'bg-gray-400 text-gray-200 cursor-not-allowed'
              }`}
              title={!canManageBills ? 'You need full access to manage electricity bills' : 'Save all bills'}
            >
              {!canManageBills ? <LockClosedIcon className="w-5 h-5 mx-auto" /> : (isSavingBulk ? 'Saving...' : 'Save All Bills')}
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
    </div>
  );
};

export default ElectricityBills; 