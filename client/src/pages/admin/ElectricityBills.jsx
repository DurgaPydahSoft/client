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
  LockClosedIcon,
  DocumentChartBarIcon,
  Cog6ToothIcon,
  PrinterIcon
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
  const [activeTab, setActiveTab] = useState('reports'); // 'reports', 'billing', or 'settings'
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportsData, setReportsData] = useState([]);
  // Set default month filter to previous month
  const getPreviousMonth = () => {
    const now = new Date();
    // Get current year and month (0-indexed, so December is 11)
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-11 (0 = January, 11 = December)
    
    // Calculate previous month
    let prevYear = currentYear;
    let prevMonth = currentMonth - 1;
    
    // Handle January (month 0) - go back to December of previous year
    if (prevMonth < 0) {
      prevMonth = 11; // December
      prevYear = currentYear - 1;
    }
    
    // Format as YYYY-MM (month is 1-indexed for display, so add 1)
    const monthStr = String(prevMonth + 1).padStart(2, '0');
    return `${prevYear}-${monthStr}`;
  };
  const [reportsMonthFilter, setReportsMonthFilter] = useState(getPreviousMonth());
  const [reportsPaymentFilter, setReportsPaymentFilter] = useState('');
  const [defaultRate, setDefaultRate] = useState('');
  const [loadingDefaultRate, setLoadingDefaultRate] = useState(false);
  const [savingDefaultRate, setSavingDefaultRate] = useState(false);
  const [showPrintReport, setShowPrintReport] = useState(false);

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
        const bulkData = fetchedRooms.map(room => {
          const isDualMeter = room.meterType === 'dual';
          const lastBill = room.lastBill;
          
          if (isDualMeter) {
            return {
              roomId: room._id,
              roomNumber: room.roomNumber,
              gender: room.gender,
              category: room.category,
              meterType: 'dual',
              meter1StartUnits: lastBill?.meter1EndUnits || '',
              meter1EndUnits: '',
              meter2StartUnits: lastBill?.meter2EndUnits || '',
              meter2EndUnits: '',
              rate: '',
              isEdited: false
            };
          } else {
            return {
              roomId: room._id,
              roomNumber: room.roomNumber,
              gender: room.gender,
              category: room.category,
              meterType: 'single',
              startUnits: lastBill?.endUnits || '',
              endUnits: '',
              rate: '',
              isEdited: false
            };
          }
        });
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
      const isDualMeter = room.meterType === 'dual';
      
      // Store original values for cancel functionality
      if (isDualMeter) {
        setEditModeData(prev => ({
          ...prev,
          [roomId]: {
            meter1StartUnits: existingBill.meter1StartUnits,
            meter1EndUnits: existingBill.meter1EndUnits,
            meter2StartUnits: existingBill.meter2StartUnits,
            meter2EndUnits: existingBill.meter2EndUnits,
            rate: existingBill.rate
          }
        }));
      } else {
        setEditModeData(prev => ({
          ...prev,
          [roomId]: {
            startUnits: existingBill.startUnits,
            endUnits: existingBill.endUnits,
            rate: existingBill.rate
          }
        }));
      }
      
      // Enable edit mode
      setEditingBills(prev => new Set([...prev, roomId]));
      
      // Update bulk bill data with existing bill values for editing
      setBulkBillData(prevData =>
        prevData.map(bill => {
          if (bill.roomId === roomId) {
            if (isDualMeter) {
              return {
                ...bill,
                meter1StartUnits: existingBill.meter1StartUnits,
                meter1EndUnits: existingBill.meter1EndUnits,
                meter2StartUnits: existingBill.meter2StartUnits,
                meter2EndUnits: existingBill.meter2EndUnits,
                rate: existingBill.rate,
                isEdited: false // Reset edited flag
              };
            } else {
              return {
                ...bill,
                startUnits: existingBill.startUnits,
                endUnits: existingBill.endUnits,
                rate: existingBill.rate,
                isEdited: false // Reset edited flag
              };
            }
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

    const room = rooms.find(r => r._id === roomId);
    const isDualMeter = room?.meterType === 'dual';
    const rate = billData.rate !== '' ? Number(billData.rate) : Number(bulkRate) || 5;

    let payload;

    if (isDualMeter) {
      const m1Start = Number(billData.meter1StartUnits) || 0;
      const m1End = Number(billData.meter1EndUnits) || 0;
      const m2Start = Number(billData.meter2StartUnits) || 0;
      const m2End = Number(billData.meter2EndUnits) || 0;

      if (m1End < m1Start) {
        toast.error('Meter 1 ending units must be greater than or equal to starting units');
        return;
      }

      if (m2End < m2Start) {
        toast.error('Meter 2 ending units must be greater than or equal to starting units');
        return;
      }

      payload = {
        month: bulkMonth,
        meter1StartUnits: m1Start,
        meter1EndUnits: m1End,
        meter2StartUnits: m2Start,
        meter2EndUnits: m2End,
        rate: rate
      };
    } else {
      const startUnits = Number(billData.startUnits) || 0;
      const endUnits = Number(billData.endUnits) || 0;

      if (endUnits < startUnits) {
        toast.error('End units must be greater than or equal to start units');
        return;
      }

      payload = {
        month: bulkMonth,
        startUnits: startUnits,
        endUnits: endUnits,
        rate: rate
      };
    }

    setSavingRoomId(roomId);
    try {

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

  // Fetch reports data
  const fetchReportsData = async () => {
    setReportsLoading(true);
    try {
      const params = {
        ...filters,
        includeLastBill: false // We want all bills, not just last one
      };
      const response = await api.get('/api/admin/rooms', { params });
      if (response.data.success) {
        const fetchedRooms = response.data.data.rooms || [];
        
        // Process rooms to extract all bills
        const processedData = fetchedRooms.map(room => {
          // Get all bills, optionally filtered by month and payment status
          let bills = room.electricityBills || [];
          if (reportsMonthFilter) {
            bills = bills.filter(bill => bill.month.startsWith(reportsMonthFilter));
          }
          if (reportsPaymentFilter) {
            bills = bills.filter(bill => {
              const status = bill.paymentStatus || 'unpaid';
              return status === reportsPaymentFilter;
            });
          }
          
          // Sort bills by month (newest first)
          bills = [...bills].sort((a, b) => b.month.localeCompare(a.month));
          
          return {
            roomNumber: room.roomNumber,
            gender: room.gender,
            category: room.category,
            meterType: room.meterType,
            bills: bills,
            totalBills: bills.length,
            totalConsumption: bills.reduce((sum, bill) => sum + (bill.consumption || 0), 0),
            totalAmount: bills.reduce((sum, bill) => sum + (bill.total || 0), 0)
          };
        });
        
        // Sort by room number
        processedData.sort((a, b) => a.roomNumber.localeCompare(b.roomNumber));
        
        setReportsData(processedData);
      } else {
        throw new Error('Failed to fetch reports data');
      }
    } catch (error) {
      console.error('⚡ Error fetching reports data:', error);
      toast.error('Failed to fetch reports data');
    } finally {
      setReportsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'reports') {
      fetchReportsData();
    }
  }, [activeTab, filters, reportsMonthFilter, reportsPaymentFilter]);

  // Fetch default rate
  const fetchDefaultRate = async () => {
    setLoadingDefaultRate(true);
    try {
      const response = await api.get('/api/admin/rooms/electricity-default-rate');
      if (response.data.success) {
        const rate = response.data.rate || '';
        setDefaultRate(rate.toString());
        setBulkRate(rate.toString()); // Also set bulkRate for backward compatibility
      }
    } catch (error) {
      console.error('Error fetching default rate:', error);
      toast.error('Failed to fetch default rate');
    } finally {
      setLoadingDefaultRate(false);
    }
  };

  // Save default rate
  const handleSaveDefaultRate = async () => {
    if (!defaultRate || isNaN(Number(defaultRate)) || Number(defaultRate) <= 0) {
      toast.error('Please enter a valid positive number for the rate');
      return;
    }

    setSavingDefaultRate(true);
    try {
      const response = await api.post('/api/admin/rooms/electricity-default-rate', {
        rate: Number(defaultRate)
      });
      if (response.data.success) {
        toast.success('Default electricity rate saved successfully!');
        setBulkRate(defaultRate); // Update bulkRate as well
      } else {
        throw new Error(response.data.message || 'Failed to save default rate');
      }
    } catch (error) {
      console.error('Error saving default rate:', error);
      toast.error(error.response?.data?.message || 'Failed to save default rate');
    } finally {
      setSavingDefaultRate(false);
    }
  };

  // Load default rate on mount
  useEffect(() => {
    fetchDefaultRate();
  }, []);

  // Handle print report - opens modal
  const handleGenerateReport = () => {
    setShowPrintReport(true);
  };

  // Handle actual print
  const handlePrint = () => {
    window.print();
  };

  // Format month for display
  const formatMonth = (monthStr) => {
    if (!monthStr) return 'All Months';
    const date = new Date(monthStr + '-01');
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  // Get filter summary text
  const getFilterSummary = () => {
    const parts = [];
    if (filters.gender) parts.push(filters.gender === 'Male' ? 'Boys Hostel' : 'Girls Hostel');
    if (filters.category) parts.push(`Category: ${filters.category}`);
    if (reportsMonthFilter) parts.push(`Month: ${formatMonth(reportsMonthFilter)}`);
    if (reportsPaymentFilter) parts.push(`Payment: ${reportsPaymentFilter.charAt(0).toUpperCase() + reportsPaymentFilter.slice(1)}`);
    return parts.length > 0 ? parts.join(' | ') : 'All Rooms';
  };

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

    const billsToSave = bulkBillData.filter(bill => {
      if (!bill.isEdited) return false;
      
      if (bill.meterType === 'dual') {
        // Dual meter validation
        const m1Start = Number(bill.meter1StartUnits) || 0;
        const m1End = Number(bill.meter1EndUnits) || 0;
        const m2Start = Number(bill.meter2StartUnits) || 0;
        const m2End = Number(bill.meter2EndUnits) || 0;
        return m1End >= m1Start && m2End >= m2Start && m1End > 0 && m2End > 0;
      } else {
        // Single meter validation
        const end = Number(bill.endUnits) || 0;
        const start = Number(bill.startUnits) || 0;
        return end >= start && end > 0;
      }
    });

    if (billsToSave.length === 0) {
      toast.error('No valid bills to save. Please enter end units for at least one room.');
      return;
    }

    setIsSavingBulk(true);
    try {
      const payload = {
        month: bulkMonth,
        bills: billsToSave.map(b => {
          const baseBill = {
            roomId: b.roomId,
            rate: b.rate !== '' ? Number(b.rate) : undefined,
          };
          
          if (b.meterType === 'dual') {
            return {
              ...baseBill,
              meter1StartUnits: Number(b.meter1StartUnits),
              meter1EndUnits: Number(b.meter1EndUnits),
              meter2StartUnits: Number(b.meter2StartUnits),
              meter2EndUnits: Number(b.meter2EndUnits),
            };
          } else {
            return {
              ...baseBill,
              startUnits: Number(b.startUnits),
              endUnits: Number(b.endUnits),
            };
          }
        })
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

    const room = rooms.find(r => r._id === roomId);
    const isDualMeter = room?.meterType === 'dual';

    setSavingRoomId(roomId);
    try {
      let payload;
      
      if (isDualMeter) {
        payload = {
          month: billData.month,
          meter1StartUnits: billData.meter1StartUnits,
          meter1EndUnits: billData.meter1EndUnits,
          meter2StartUnits: billData.meter2StartUnits,
          meter2EndUnits: billData.meter2EndUnits,
          rate: billData.rate
        };
      } else {
        payload = {
          month: billData.month,
          startUnits: billData.startUnits,
          endUnits: billData.endUnits,
          rate: billData.rate
        };
      }

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

  if (loading && activeTab === 'billing') return <LoadingSpinner />;

  return (
    <div className="mx-auto  mt-12 sm:mt-0">
      <SEO title="Electricity Bills" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 sm:mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-blue-900 to-blue-700 bg-clip-text text-transparent">Electricity Bills</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">Manage electricity billing for all rooms</p>
        </div>
        {/* Tabs in Header */}
        <div className="flex gap-2 border border-gray-200 rounded-lg bg-white shadow-sm overflow-hidden">
          <button
            onClick={() => setActiveTab('reports')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'reports'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center gap-2">
              <DocumentChartBarIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Reports</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('billing')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'billing'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center gap-2">
              <TableCellsIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Billing</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'settings'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center gap-2">
              <Cog6ToothIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Settings</span>
            </div>
          </button>
        </div>
      </div>

      {/* Bulk Billing Tab Content */}
      {activeTab === 'billing' && (
        <>

      {/* Filters and Controls - Single Line */}
      <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4 mb-3 sm:mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
              Hostel Type
            </label>
            <select
              name="gender"
              value={filters.gender}
              onChange={handleFilterChange}
              className="w-full px-3 py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Hostels</option>
              <option value="Male">Boys Hostel</option>
              <option value="Female">Girls Hostel</option>
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
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Billing Month</label>
            <input
              type="month"
              value={bulkMonth}
              onChange={(e) => setBulkMonth(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-1 flex items-end">
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
            const isDualMeter = room?.meterType === 'dual' || bill.meterType === 'dual';

            let startUnits, endUnits, rate, consumption, total, isValid;
            let meter1StartUnits, meter1EndUnits, meter2StartUnits, meter2EndUnits;
            let meter1Consumption, meter2Consumption;

            if (isAlreadyBilled && !editingBills.has(bill.roomId)) {
              // Show existing bill values when not editing
              if (isDualMeter && existingBill.meter1StartUnits !== undefined) {
                meter1StartUnits = existingBill.meter1StartUnits;
                meter1EndUnits = existingBill.meter1EndUnits;
                meter2StartUnits = existingBill.meter2StartUnits;
                meter2EndUnits = existingBill.meter2EndUnits;
                meter1Consumption = existingBill.meter1Consumption || 0;
                meter2Consumption = existingBill.meter2Consumption || 0;
                consumption = existingBill.consumption;
              } else {
                startUnits = existingBill.startUnits;
                endUnits = existingBill.endUnits;
                consumption = existingBill.consumption;
              }
              rate = existingBill.rate;
              total = existingBill.total;
              isValid = true;
            } else {
              // Use bulk bill data for new bills or when editing
              rate = Number(bill.rate) || Number(bulkRate) || 5;

              if (isDualMeter) {
                meter1StartUnits = Number(bill.meter1StartUnits) || 0;
                meter1EndUnits = Number(bill.meter1EndUnits) || 0;
                meter2StartUnits = Number(bill.meter2StartUnits) || 0;
                meter2EndUnits = Number(bill.meter2EndUnits) || 0;

                const m1Valid = meter1EndUnits >= meter1StartUnits;
                const m2Valid = meter2EndUnits >= meter2StartUnits;
                isValid = m1Valid && m2Valid;

                if (isValid) {
                  meter1Consumption = meter1EndUnits - meter1StartUnits;
                  meter2Consumption = meter2EndUnits - meter2StartUnits;
                  consumption = meter1Consumption + meter2Consumption;
                  total = consumption * rate;
                } else {
                  meter1Consumption = 0;
                  meter2Consumption = 0;
                  consumption = 0;
                  total = 0;
                }
              } else {
                startUnits = Number(bill.startUnits) || 0;
                endUnits = Number(bill.endUnits) || 0;

                isValid = endUnits >= startUnits;

                if (isValid) {
                  consumption = endUnits - startUnits;
                  total = consumption * rate;
                } else {
                  consumption = 0;
                  total = 0;
                }
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
                  {isDualMeter ? (
                    <>
                      {/* Dual Meter Mode */}
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 mb-2">
                        <p className="text-xs font-semibold text-blue-800">⚡ Dual Meter Mode</p>
                      </div>
                      
                      {/* Meter 1 */}
                      <div className="border-l-4 border-blue-500 pl-3 space-y-2">
                        <p className="text-xs font-semibold text-gray-700">Meter 1</p>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Start Units</label>
                          <input
                            type="number"
                            value={editingBills.has(bill.roomId) ? bill.meter1StartUnits : (isAlreadyBilled ? meter1StartUnits : bill.meter1StartUnits)}
                            onChange={(e) => handleBulkBillChange(bill.roomId, 'meter1StartUnits', e.target.value)}
                            disabled={isAlreadyBilled && !editingBills.has(bill.roomId)}
                            className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors ${
                              isAlreadyBilled && !editingBills.has(bill.roomId) 
                                ? 'bg-gray-100 text-gray-500 cursor-not-allowed' 
                                : 'border-gray-300'
                            }`}
                            placeholder="Enter start units"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">End Units</label>
                          <input
                            type="number"
                            placeholder="Enter new reading"
                            value={editingBills.has(bill.roomId) ? bill.meter1EndUnits : (isAlreadyBilled ? meter1EndUnits : bill.meter1EndUnits)}
                            onChange={(e) => handleBulkBillChange(bill.roomId, 'meter1EndUnits', e.target.value)}
                            disabled={isAlreadyBilled && !editingBills.has(bill.roomId)}
                            className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors ${
                              !isValid && !isAlreadyBilled ? 'border-red-500 bg-red-50' : 
                              isAlreadyBilled && !editingBills.has(bill.roomId) 
                                ? 'bg-gray-100 text-gray-500 cursor-not-allowed border-gray-300' 
                                : 'border-gray-300'
                            }`}
                          />
                        </div>
                      </div>

                      {/* Meter 2 */}
                      <div className="border-l-4 border-green-500 pl-3 space-y-2">
                        <p className="text-xs font-semibold text-gray-700">Meter 2</p>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Start Units</label>
                          <input
                            type="number"
                            value={editingBills.has(bill.roomId) ? bill.meter2StartUnits : (isAlreadyBilled ? meter2StartUnits : bill.meter2StartUnits)}
                            onChange={(e) => handleBulkBillChange(bill.roomId, 'meter2StartUnits', e.target.value)}
                            disabled={isAlreadyBilled && !editingBills.has(bill.roomId)}
                            className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors ${
                              isAlreadyBilled && !editingBills.has(bill.roomId) 
                                ? 'bg-gray-100 text-gray-500 cursor-not-allowed' 
                                : 'border-gray-300'
                            }`}
                            placeholder="Enter start units"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">End Units</label>
                          <input
                            type="number"
                            placeholder="Enter new reading"
                            value={editingBills.has(bill.roomId) ? bill.meter2EndUnits : (isAlreadyBilled ? meter2EndUnits : bill.meter2EndUnits)}
                            onChange={(e) => handleBulkBillChange(bill.roomId, 'meter2EndUnits', e.target.value)}
                            disabled={isAlreadyBilled && !editingBills.has(bill.roomId)}
                            className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors ${
                              !isValid && !isAlreadyBilled ? 'border-red-500 bg-red-50' : 
                              isAlreadyBilled && !editingBills.has(bill.roomId) 
                                ? 'bg-gray-100 text-gray-500 cursor-not-allowed border-gray-300' 
                                : 'border-gray-300'
                            }`}
                          />
                        </div>
                      </div>
                      
                      {!isValid && !isAlreadyBilled && (
                        <p className="text-xs text-red-600">End units must be greater than or equal to start units for both meters</p>
                      )}
                    </>
                  ) : (
                    <>
                      {/* Single Meter Mode */}
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
                    </>
                  )}

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
                          onClick={() => handleSaveSingleBill(bill.roomId, isDualMeter ? {
                            month: bulkMonth,
                            meter1StartUnits: Number(bill.meter1StartUnits) || 0,
                            meter1EndUnits: Number(bill.meter1EndUnits) || 0,
                            meter2StartUnits: Number(bill.meter2StartUnits) || 0,
                            meter2EndUnits: Number(bill.meter2EndUnits) || 0,
                            rate: bill.rate !== '' ? Number(bill.rate) : Number(bulkRate) || 5
                          } : {
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
        {/* Billing Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Room</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Meter Readings</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
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
                  const isDualMeter = room?.meterType === 'dual' || bill.meterType === 'dual';

                  let startUnits, endUnits, rate, consumption, total, isValid;
                  let meter1StartUnits, meter1EndUnits, meter2StartUnits, meter2EndUnits;
                  let meter1Consumption, meter2Consumption;

                  if (isAlreadyBilled && !editingBills.has(bill.roomId)) {
                    // Show existing bill values when not editing
                    if (isDualMeter && existingBill.meter1StartUnits !== undefined) {
                      meter1StartUnits = existingBill.meter1StartUnits;
                      meter1EndUnits = existingBill.meter1EndUnits;
                      meter2StartUnits = existingBill.meter2StartUnits;
                      meter2EndUnits = existingBill.meter2EndUnits;
                      meter1Consumption = existingBill.meter1Consumption || 0;
                      meter2Consumption = existingBill.meter2Consumption || 0;
                      consumption = existingBill.consumption;
                    } else {
                      startUnits = existingBill.startUnits;
                      endUnits = existingBill.endUnits;
                      consumption = existingBill.consumption;
                    }
                    rate = existingBill.rate;
                    total = existingBill.total;
                    isValid = true;
                  } else {
                    // Use bulk bill data for new bills or when editing
                    rate = Number(bill.rate) || Number(bulkRate) || 5;

                    if (isDualMeter) {
                      meter1StartUnits = Number(bill.meter1StartUnits) || 0;
                      meter1EndUnits = Number(bill.meter1EndUnits) || 0;
                      meter2StartUnits = Number(bill.meter2StartUnits) || 0;
                      meter2EndUnits = Number(bill.meter2EndUnits) || 0;

                      const m1Valid = meter1EndUnits >= meter1StartUnits;
                      const m2Valid = meter2EndUnits >= meter2StartUnits;
                      isValid = m1Valid && m2Valid;

                      if (isValid) {
                        meter1Consumption = meter1EndUnits - meter1StartUnits;
                        meter2Consumption = meter2EndUnits - meter2StartUnits;
                        consumption = meter1Consumption + meter2Consumption;
                        total = consumption * rate;
                      } else {
                        meter1Consumption = 0;
                        meter2Consumption = 0;
                        consumption = 0;
                        total = 0;
                      }
                    } else {
                      startUnits = Number(bill.startUnits) || 0;
                      endUnits = Number(bill.endUnits) || 0;

                      isValid = endUnits >= startUnits;

                      if (isValid) {
                        consumption = endUnits - startUnits;
                        total = consumption * rate;
                      } else {
                        consumption = 0;
                        total = 0;
                      }
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
                          {isDualMeter && (
                            <span className="ml-2 px-2 py-0.5 text-xs text-white bg-blue-600 rounded-full">Dual</span>
                          )}
                          {isAlreadyBilled && !editingBills.has(bill.roomId) && (
                            <span className="ml-2 px-2 py-0.5 text-xs text-white bg-green-600 rounded-full">Billed</span>
                          )}
                          {editingBills.has(bill.roomId) && (
                            <span className="ml-2 px-2 py-0.5 text-xs text-white bg-orange-600 rounded-full">Editing</span>
                          )}
                        </div>
                      </td>
                      {isDualMeter ? (
                        <>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <input
                              type="number"
                              value={editingBills.has(bill.roomId) ? bill.meter1StartUnits : (isAlreadyBilled ? meter1StartUnits : bill.meter1StartUnits)}
                              onChange={(e) => handleBulkBillChange(bill.roomId, 'meter1StartUnits', e.target.value)}
                              disabled={isAlreadyBilled && !editingBills.has(bill.roomId)}
                              className={`w-20 p-1 border rounded focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                                isAlreadyBilled && !editingBills.has(bill.roomId) 
                                  ? 'bg-gray-100 text-gray-500 cursor-not-allowed border-gray-300' 
                                  : 'border-gray-300'
                              }`}
                              placeholder="M1 Start"
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <input
                              type="number"
                              placeholder="M1 End"
                              value={editingBills.has(bill.roomId) ? bill.meter1EndUnits : (isAlreadyBilled ? meter1EndUnits : bill.meter1EndUnits)}
                              onChange={(e) => handleBulkBillChange(bill.roomId, 'meter1EndUnits', e.target.value)}
                              disabled={isAlreadyBilled && !editingBills.has(bill.roomId)}
                              className={`w-20 p-1 border rounded focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
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
                              value={editingBills.has(bill.roomId) ? bill.meter2StartUnits : (isAlreadyBilled ? meter2StartUnits : bill.meter2StartUnits)}
                              onChange={(e) => handleBulkBillChange(bill.roomId, 'meter2StartUnits', e.target.value)}
                              disabled={isAlreadyBilled && !editingBills.has(bill.roomId)}
                              className={`w-20 p-1 border rounded focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                                isAlreadyBilled && !editingBills.has(bill.roomId) 
                                  ? 'bg-gray-100 text-gray-500 cursor-not-allowed border-gray-300' 
                                  : 'border-gray-300'
                              }`}
                              placeholder="M2 Start"
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <input
                              type="number"
                              placeholder="M2 End"
                              value={editingBills.has(bill.roomId) ? bill.meter2EndUnits : (isAlreadyBilled ? meter2EndUnits : bill.meter2EndUnits)}
                              onChange={(e) => handleBulkBillChange(bill.roomId, 'meter2EndUnits', e.target.value)}
                              disabled={isAlreadyBilled && !editingBills.has(bill.roomId)}
                              className={`w-20 p-1 border rounded focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                                !isValid && !isAlreadyBilled ? 'border-red-500' : 
                                isAlreadyBilled && !editingBills.has(bill.roomId) 
                                  ? 'bg-gray-100 text-gray-500 cursor-not-allowed border-gray-300' 
                                  : 'border-gray-300'
                              }`}
                            />
                          </td>
                        </>
                      ) : (
                        <>
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
                              placeholder="Start"
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <input
                              type="number"
                              placeholder="End"
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
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">-</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">-</td>
                        </>
                      )}
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
                              onClick={() => handleSaveSingleBill(bill.roomId, isDualMeter ? {
                                month: bulkMonth,
                                meter1StartUnits: Number(bill.meter1StartUnits) || 0,
                                meter1EndUnits: Number(bill.meter1EndUnits) || 0,
                                meter2StartUnits: Number(bill.meter2StartUnits) || 0,
                                meter2EndUnits: Number(bill.meter2EndUnits) || 0,
                                rate: bill.rate !== '' ? Number(bill.rate) : Number(bulkRate) || 5
                              } : {
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
        </>
      )}

      {/* Reports Tab */}
      {activeTab === 'reports' && (
        <div className="space-y-3">
          {/* Compact Filters */}
          <div className="bg-white rounded-lg shadow-sm p-3">
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
              <select
                name="gender"
                value={filters.gender}
                onChange={handleFilterChange}
                className="px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Hostels</option>
                <option value="Male">Boys Hostel</option>
                <option value="Female">Girls Hostel</option>
              </select>
              <select
                name="category"
                value={filters.category}
                onChange={handleFilterChange}
                disabled={!filters.gender}
                className="px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
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
              <input
                type="month"
                value={reportsMonthFilter}
                onChange={(e) => setReportsMonthFilter(e.target.value)}
                placeholder="Filter by month"
                className="px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
              <select
                value={reportsPaymentFilter}
                onChange={(e) => setReportsPaymentFilter(e.target.value)}
                className="px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Payments</option>
                <option value="paid">Paid</option>
                <option value="unpaid">Unpaid</option>
                <option value="pending">Pending</option>
              </select>
              <div className="text-xs text-gray-600 flex items-center">
                <span className="font-medium">{reportsData.length}</span>
                <span className="ml-1">room(s)</span>
              </div>
              <button
                onClick={handleGenerateReport}
                disabled={reportsLoading || reportsData.length === 0}
                className="col-span-2 sm:col-span-1 flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                <PrinterIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Generate Report</span>
                <span className="sm:hidden">Report</span>
              </button>
            </div>
          </div>

          {/* Compact Reports Table */}
          {reportsLoading ? (
            <div className="flex justify-center items-center py-8">
              <LoadingSpinner />
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 uppercase sticky left-0 bg-gray-50 z-10">
                        Room / Category
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 uppercase">
                        Consumption
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 uppercase">
                        Total Amount
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 uppercase">
                        Recent Bills
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {reportsData.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="px-3 py-6 text-center text-xs text-gray-500">
                          No rooms found
                        </td>
                      </tr>
                    ) : (
                      reportsData.map((roomData) => (
                        <tr key={roomData.roomNumber} className="hover:bg-gray-50">
                          <td className="px-3 py-2 whitespace-nowrap sticky left-0 bg-white z-10">
                            <div className="flex items-center gap-1.5">
                              <BuildingOfficeIcon className="w-3.5 h-3.5 text-blue-600" />
                              <span className="text-xs font-medium text-gray-900">Room {roomData.roomNumber}</span>
                              <span className="px-1.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                                {roomData.category}
                              </span>
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5">{roomData.gender}</div>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            <span className="text-xs font-semibold text-gray-700">{roomData.totalConsumption.toLocaleString()}</span>
                            <span className="text-xs text-gray-500 ml-1">units</span>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            <span className="text-xs font-semibold text-green-600">
                              ₹{roomData.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-xs text-gray-700">
                            {roomData.bills.length === 0 ? (
                              <span className="text-gray-400">No bills</span>
                            ) : (
                              <div className="space-y-1 max-h-32 overflow-y-auto">
                                {roomData.bills.slice(0, 3).map((bill, idx) => (
                                  <div key={idx} className="flex items-center justify-between gap-2 py-0.5 border-b border-gray-100 last:border-0">
                                    <span className="text-xs text-gray-600">
                                      {new Date(bill.month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}
                                    </span>
                                    <span className="text-xs font-semibold text-green-600">
                                      ₹{Math.round(bill.total || 0).toLocaleString()}
                                    </span>
                                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                                      bill.paymentStatus === 'paid'
                                        ? 'bg-green-100 text-green-700'
                                        : bill.paymentStatus === 'pending'
                                        ? 'bg-yellow-100 text-yellow-700'
                                        : 'bg-red-100 text-red-700'
                                    }`}>
                                      {bill.paymentStatus === 'paid' ? '✓' : bill.paymentStatus === 'pending' ? '⏳' : '✗'}
                                    </span>
                                  </div>
                                ))}
                                {roomData.bills.length > 3 && (
                                  <div className="text-xs text-gray-500 pt-1">
                                    +{roomData.bills.length - 3} more
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Print Report Modal */}
      {showPrintReport && (
        <>
          {/* Print-only styles */}
          <style>{`
            @media print {
              @page {
                margin: 1cm;
              }
              * {
                -webkit-print-color-adjust: exact !important;
                color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              body * {
                visibility: hidden;
              }
              .print-report-container {
                display: block !important;
                visibility: visible !important;
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                margin: 0;
                padding: 20px;
                background: white;
              }
              .print-report-container * {
                visibility: visible !important;
              }
              .print-report {
                position: relative;
                width: 100%;
                margin: 0;
                padding: 0;
                background: white;
                color: black;
              }
              .no-print {
                display: none !important;
                visibility: hidden !important;
              }
              .print-overlay {
                display: none !important;
                visibility: hidden !important;
              }
              .print-content {
                display: none !important;
                visibility: hidden !important;
              }
              .print-report table {
                width: 100%;
                border-collapse: collapse;
                page-break-inside: auto;
                margin: 10px 0;
              }
              .print-report th,
              .print-report td {
                border: 1px solid #000;
                padding: 8px;
                text-align: left;
              }
              .print-report th {
                background-color: #f3f4f6 !important;
                font-weight: bold;
              }
              .print-report tr {
                page-break-inside: avoid;
                page-break-after: auto;
              }
              .print-report thead {
                display: table-header-group;
              }
              .print-report tfoot {
                display: table-footer-group;
              }
              .print-report tbody tr:nth-child(even) {
                background-color: #f9fafb !important;
              }
            }
            @media screen {
              .print-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.5);
                z-index: 50;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
              }
              .print-content {
                background: white;
                border-radius: 8px;
                max-width: 1200px;
                width: 100%;
                max-height: 90vh;
                overflow-y: auto;
                box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
              }
            }
          `}</style>

          {/* Screen view - Modal */}
          <div className="print-overlay no-print" onClick={() => setShowPrintReport(false)}>
            <div className="print-content" onClick={(e) => e.stopPropagation()}>
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-gray-900">Electricity Bills Report</h2>
                  <div className="flex gap-2">
                    <button
                      onClick={handlePrint}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                    >
                      <PrinterIcon className="w-5 h-5" />
                      Print
                    </button>
                    <button
                      onClick={() => setShowPrintReport(false)}
                      className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
                    >
                      <XMarkIcon className="w-5 h-5" />
                      Close
                    </button>
                  </div>
                </div>

                {/* Print Report Content - Screen Preview */}
                <div className="print-report">
                  {/* Header */}
                  <div className="mb-6 text-center border-b-2 border-gray-300 pb-4">
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Electricity Bills Report</h1>
                    <p className="text-sm text-gray-600 mb-1">Pydah Hostel Management System</p>
                    <p className="text-sm text-gray-600">Generated on: {new Date().toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}</p>
                    <p className="text-sm font-medium text-gray-700 mt-2">Filters: {getFilterSummary()}</p>
                  </div>

                  {/* Summary Statistics */}
                  <div className="mb-6 grid grid-cols-3 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <p className="text-xs text-gray-600 mb-1">Total Rooms</p>
                      <p className="text-2xl font-bold text-blue-700">{reportsData.length}</p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                      <p className="text-xs text-gray-600 mb-1">Total Consumption</p>
                      <p className="text-2xl font-bold text-green-700">
                        {reportsData.reduce((sum, room) => sum + room.totalConsumption, 0).toLocaleString()} units
                      </p>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                      <p className="text-xs text-gray-600 mb-1">Total Amount</p>
                      <p className="text-2xl font-bold text-purple-700">
                        ₹{reportsData.reduce((sum, room) => sum + room.totalAmount, 0).toLocaleString('en-IN', { 
                          minimumFractionDigits: 0, 
                          maximumFractionDigits: 0 
                        })}
                      </p>
                    </div>
                  </div>

                  {/* Report Table */}
                  <table className="min-w-full border-collapse border border-gray-300">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border border-gray-300 px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Room</th>
                        <th className="border border-gray-300 px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Category</th>
                        <th className="border border-gray-300 px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Gender</th>
                        <th className="border border-gray-300 px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Consumption (Units)</th>
                        <th className="border border-gray-300 px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Total Amount (₹)</th>
                        <th className="border border-gray-300 px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Bills Count</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportsData.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="border border-gray-300 px-4 py-6 text-center text-sm text-gray-500">
                            No data available
                          </td>
                        </tr>
                      ) : (
                        reportsData.map((roomData, index) => {
                          return (
                            <tr key={roomData.roomNumber} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                              <td className="border border-gray-300 px-4 py-3 text-sm font-medium text-gray-900">
                                {roomData.roomNumber}
                              </td>
                              <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">
                                {roomData.category}
                              </td>
                              <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">
                                {roomData.gender}
                              </td>
                              <td className="border border-gray-300 px-4 py-3 text-sm text-right text-gray-900">
                                {roomData.totalConsumption.toLocaleString()}
                              </td>
                              <td className="border border-gray-300 px-4 py-3 text-sm text-right font-semibold text-green-700">
                                ₹{roomData.totalAmount.toLocaleString('en-IN', { 
                                  minimumFractionDigits: 2, 
                                  maximumFractionDigits: 2 
                                })}
                              </td>
                              <td className="border border-gray-300 px-4 py-3 text-sm text-center text-gray-700">
                                {roomData.totalBills}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                    {reportsData.length > 0 && (
                      <tfoot>
                        <tr className="bg-gray-100 font-bold">
                          <td colSpan="3" className="border border-gray-300 px-4 py-3 text-sm text-gray-900">
                            TOTAL
                          </td>
                          <td className="border border-gray-300 px-4 py-3 text-sm text-right text-gray-900">
                            {reportsData.reduce((sum, room) => sum + room.totalConsumption, 0).toLocaleString()}
                          </td>
                          <td className="border border-gray-300 px-4 py-3 text-sm text-right text-green-700">
                            ₹{reportsData.reduce((sum, room) => sum + room.totalAmount, 0).toLocaleString('en-IN', { 
                              minimumFractionDigits: 2, 
                              maximumFractionDigits: 2 
                            })}
                          </td>
                          <td className="border border-gray-300 px-4 py-3 text-sm text-center text-gray-900">
                            {reportsData.reduce((sum, room) => sum + room.totalBills, 0)}
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>

                  {/* Footer */}
                  <div className="mt-6 pt-4 border-t border-gray-300 text-xs text-gray-500 text-center">
                    <p>This is a computer-generated report. No signature required.</p>
                    <p className="mt-1">Page 1 of 1</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Print-only container - Hidden on screen, visible when printing */}
          <div className="print-report-container" style={{ display: 'none' }}>
            <div className="print-report">
              {/* Header */}
              <div className="mb-6 text-center border-b-2 border-gray-300 pb-4">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Electricity Bills Report</h1>
                <p className="text-sm text-gray-600 mb-1">Pydah Hostel Management System</p>
                <p className="text-sm text-gray-600">Generated on: {new Date().toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}</p>
                <p className="text-sm font-medium text-gray-700 mt-2">Filters: {getFilterSummary()}</p>
              </div>

              {/* Summary Statistics */}
              <div className="mb-6 grid grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <p className="text-xs text-gray-600 mb-1">Total Rooms</p>
                  <p className="text-2xl font-bold text-blue-700">{reportsData.length}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <p className="text-xs text-gray-600 mb-1">Total Consumption</p>
                  <p className="text-2xl font-bold text-green-700">
                    {reportsData.reduce((sum, room) => sum + room.totalConsumption, 0).toLocaleString()} units
                  </p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                  <p className="text-xs text-gray-600 mb-1">Total Amount</p>
                  <p className="text-2xl font-bold text-purple-700">
                    ₹{reportsData.reduce((sum, room) => sum + room.totalAmount, 0).toLocaleString('en-IN', { 
                      minimumFractionDigits: 0, 
                      maximumFractionDigits: 0 
                    })}
                  </p>
                </div>
              </div>

              {/* Report Table */}
              <table className="min-w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Room</th>
                    <th className="border border-gray-300 px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Category</th>
                    <th className="border border-gray-300 px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Gender</th>
                    <th className="border border-gray-300 px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Consumption (Units)</th>
                    <th className="border border-gray-300 px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Total Amount (₹)</th>
                    <th className="border border-gray-300 px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Bills Count</th>
                  </tr>
                </thead>
                <tbody>
                  {reportsData.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="border border-gray-300 px-4 py-6 text-center text-sm text-gray-500">
                        No data available
                      </td>
                    </tr>
                  ) : (
                    reportsData.map((roomData, index) => {
                      return (
                        <tr key={roomData.roomNumber} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="border border-gray-300 px-4 py-3 text-sm font-medium text-gray-900">
                            {roomData.roomNumber}
                          </td>
                          <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">
                            {roomData.category}
                          </td>
                          <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">
                            {roomData.gender}
                          </td>
                          <td className="border border-gray-300 px-4 py-3 text-sm text-right text-gray-900">
                            {roomData.totalConsumption.toLocaleString()}
                          </td>
                          <td className="border border-gray-300 px-4 py-3 text-sm text-right font-semibold text-green-700">
                            ₹{roomData.totalAmount.toLocaleString('en-IN', { 
                              minimumFractionDigits: 2, 
                              maximumFractionDigits: 2 
                            })}
                          </td>
                          <td className="border border-gray-300 px-4 py-3 text-sm text-center text-gray-700">
                            {roomData.totalBills}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                {reportsData.length > 0 && (
                  <tfoot>
                    <tr className="bg-gray-100 font-bold">
                      <td colSpan="3" className="border border-gray-300 px-4 py-3 text-sm text-gray-900">
                        TOTAL
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-sm text-right text-gray-900">
                        {reportsData.reduce((sum, room) => sum + room.totalConsumption, 0).toLocaleString()}
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-sm text-right text-green-700">
                        ₹{reportsData.reduce((sum, room) => sum + room.totalAmount, 0).toLocaleString('en-IN', { 
                          minimumFractionDigits: 2, 
                          maximumFractionDigits: 2 
                        })}
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-sm text-center text-gray-900">
                        {reportsData.reduce((sum, room) => sum + room.totalBills, 0)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>

              {/* Footer */}
              <div className="mt-6 pt-4 border-t border-gray-300 text-xs text-gray-500 text-center">
                <p>This is a computer-generated report. No signature required.</p>
                <p className="mt-1">Page 1 of 1</p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="space-y-4 sm:space-y-6">
          <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">Electricity Rate Settings</h2>
            <p className="text-sm text-gray-600 mb-6">
              Set the default electricity rate per unit. This rate will be used for all new bills unless a specific rate is provided.
            </p>

            <div className="max-w-md space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Default Rate per Unit (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={defaultRate}
                  onChange={(e) => setDefaultRate(e.target.value)}
                  placeholder="e.g., 5.00"
                  disabled={loadingDefaultRate || savingDefaultRate}
                  className="w-full px-4 py-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleSaveDefaultRate}
                  disabled={loadingDefaultRate || savingDefaultRate || !defaultRate}
                  className={`px-6 py-3 text-sm font-medium rounded-lg transition-colors ${
                    loadingDefaultRate || savingDefaultRate || !defaultRate
                      ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {savingDefaultRate ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Saving...
                    </span>
                  ) : (
                    'Save Default Rate'
                  )}
                </button>
                <button
                  onClick={fetchDefaultRate}
                  disabled={loadingDefaultRate || savingDefaultRate}
                  className="px-6 py-3 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loadingDefaultRate ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin"></div>
                      Loading...
                    </span>
                  ) : (
                    'Refresh'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ElectricityBills; 