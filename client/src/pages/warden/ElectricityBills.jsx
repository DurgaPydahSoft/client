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
    assignedHostelId: user?.assignedHostelId,
    permissions: user?.permissions
  });

  const getWardenHostelId = () => {
    if (!user) return undefined;
    return user.assignedHostelId?._id || user.assignedHostelId || undefined;
  };

  const getWardenHostelLabel = () => {
    if (user?.assignedHostel?.name) return user.assignedHostel.name;
    if (user?.assignedHostelId?.name) return user.assignedHostelId.name;
    if (user?.hostelType?.toLowerCase() === 'boys') return 'Boys Hostel';
    if (user?.hostelType?.toLowerCase() === 'girls') return 'Girls Hostel';
    return 'Assigned Hostel';
  };
  
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hostels, setHostels] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedHostel, setSelectedHostel] = useState(null);
  const [filters, setFilters] = useState({
    hostel: '',
    category: ''
  });
  const [bulkBillData, setBulkBillData] = useState([]);
  const [bulkMonth, setBulkMonth] = useState('');
  const [bulkRate, setBulkRate] = useState('');
  const [generatorBill, setGeneratorBill] = useState({ month: '', amount: '', savedAmount: 0, updatedAt: null });
  const [loadingGeneratorBill, setLoadingGeneratorBill] = useState(false);
  const [savingGeneratorBill, setSavingGeneratorBill] = useState(false);
  const [isSavingBulk, setIsSavingBulk] = useState(false);
  const [savingRoomId, setSavingRoomId] = useState(null);
  const [editingBills, setEditingBills] = useState(new Set());
  const [editModeData, setEditModeData] = useState({});
  const [occupantsModal, setOccupantsModal] = useState({
    open: false,
    roomId: null,
    roomNumber: '',
    loading: false,
    students: [],
    error: null,
    minAttendanceDays: 5,
    eligibleCount: 0,
    totalLive: 0
  });

  // Helper functions
  const getId = (objOrId) => (typeof objOrId === 'object' && objOrId?._id ? objOrId._id : objOrId);
  const getHostelLabel = (hostel) => {
    if (!hostel) return '';
    if (typeof hostel === 'string') return hostel;
    return hostel.name || hostel.hostelName || hostel._id || '';
  };
  const getHostelCode = (hostel) => {
    if (!hostel) return '';
    if (typeof hostel === 'string') {
      const found = hostels.find((h) => getId(h._id || h) === hostel || h.name === hostel);
      return found?.code || found?.name || hostel;
    }
    return hostel.code || hostel.name || hostel.hostelName || '';
  };
  const getCategoryLabel = (category) => {
    if (!category) return '';
    if (typeof category === 'string') return category;
    return category.name || category.categoryName || category._id || '';
  };
  const getRoomHostelCategoryText = (bill) => {
    const hostelCode =
      bill.hostelCode ||
      getHostelCode(hostels.find((h) => getId(h._id || h) === bill.hostel) || bill.hostel) ||
      '';
    const category =
      bill.categoryLabel ||
      getCategoryLabel(categories.find((c) => getId(c._id || c) === bill.category) || bill.category) ||
      '';
    if (hostelCode && category) return `${hostelCode} / ${category}`;
    return hostelCode || category || '';
  };

  const fetchHostels = async () => {
    try {
      const res = await api.get('/api/hostels');
      if (res.data.success) {
        const allHostels = res.data.data || [];
        const assignedId = getWardenHostelId()?.toString();

        let matchingHostel = null;
        if (assignedId) {
          matchingHostel = allHostels.find(h => getId(h._id || h)?.toString() === assignedId);
        }
        if (!matchingHostel && user?.hostelType) {
          const hostelName = user.hostelType === 'boys' ? 'Boys Hostel' : 'Girls Hostel';
          matchingHostel = allHostels.find(h => 
            h.name === hostelName || 
            h.name?.toLowerCase().includes(user.hostelType.toLowerCase())
          );
        }
          
        if (matchingHostel) {
          setHostels([matchingHostel]);
          setSelectedHostel(matchingHostel);
          const hostelId = getId(matchingHostel._id || matchingHostel);
          setFilters(prev => ({ ...prev, hostel: hostelId }));
          fetchCategoriesByHostel(hostelId);
        } else if (assignedId || user?.hostelType) {
          setHostels([]);
        } else {
          setHostels(allHostels);
        }
      }
    } catch (error) {
      console.error('🏠 Error fetching hostels:', error);
      toast.error('Failed to fetch hostels');
    }
  };

  const fetchCategoriesByHostel = async (hostelId) => {
    if (!hostelId) {
      setCategories([]);
      return;
    }
    try {
      const res = await api.get(`/api/hostels/${hostelId}/categories`);
      if (res.data.success) {
        setCategories(res.data.data || []);
      }
    } catch (error) {
      console.error('🏠 Error fetching categories:', error);
      toast.error('Failed to fetch categories');
    }
  };

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
        const bulkData = fetchedRooms.map(room => {
          const isDualMeter = room.meterType === 'dual';
          const lastBill = room.lastBill;
          const hostelId = getId(room.hostel);
          const categoryId = getId(room.category);
          const hostelLabel = getHostelLabel(room.hostel);
          const hostelCode = getHostelCode(room.hostel);
          const categoryLabel = getCategoryLabel(room.category);
          
          if (isDualMeter) {
            return {
              roomId: room._id,
              roomNumber: room.roomNumber,
              hostel: hostelId,
              hostelLabel,
              hostelCode,
              category: categoryId,
              categoryLabel,
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
              hostel: hostelId,
              hostelLabel,
              hostelCode,
              category: categoryId,
              categoryLabel,
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

  const handleEditBill = (roomId) => {
    const room = rooms.find((r) => r._id === roomId);
    const existingBill = bulkMonth ? room?.electricityBills.find((b) => b.month === bulkMonth) : null;
    if (!existingBill) return;

    const isDualMeter = room?.meterType === 'dual';
    setEditModeData((prev) => ({
      ...prev,
      [roomId]: isDualMeter
        ? {
            meter1StartUnits: existingBill.meter1StartUnits,
            meter1EndUnits: existingBill.meter1EndUnits,
            meter2StartUnits: existingBill.meter2StartUnits,
            meter2EndUnits: existingBill.meter2EndUnits,
            rate: existingBill.rate
          }
        : {
            startUnits: existingBill.startUnits,
            endUnits: existingBill.endUnits,
            rate: existingBill.rate
          }
    }));

    setEditingBills((prev) => new Set([...prev, roomId]));
    setBulkBillData((prevData) =>
      prevData.map((bill) => {
        if (bill.roomId !== roomId) return bill;
        return isDualMeter
          ? {
              ...bill,
              meter1StartUnits: existingBill.meter1StartUnits,
              meter1EndUnits: existingBill.meter1EndUnits,
              meter2StartUnits: existingBill.meter2StartUnits,
              meter2EndUnits: existingBill.meter2EndUnits,
              rate: existingBill.rate,
              isEdited: false
            }
          : {
              ...bill,
              startUnits: existingBill.startUnits,
              endUnits: existingBill.endUnits,
              rate: existingBill.rate,
              isEdited: false
            };
      })
    );
  };

  const handleCancelEdit = (roomId) => {
    const originalData = editModeData[roomId];
    if (originalData) {
      setBulkBillData((prevData) =>
        prevData.map((bill) => {
          if (bill.roomId !== roomId) return bill;
          return {
            ...bill,
            ...originalData,
            isEdited: false
          };
        })
      );
    }

    setEditingBills((prev) => {
      const next = new Set(prev);
      next.delete(roomId);
      return next;
    });
    setEditModeData((prev) => {
      const next = { ...prev };
      delete next[roomId];
      return next;
    });
  };

  const fetchGeneratorBill = async (month) => {
    if (!month) {
      setGeneratorBill({ month: '', amount: '', savedAmount: 0, updatedAt: null });
      return;
    }
    setLoadingGeneratorBill(true);
    try {
      const response = await api.get('/api/admin/rooms/warden/generator-bill', {
        params: { month }
      });
      if (response.data.success) {
        const data = response.data.data || {};
        const amount = Number(data.amount) || 0;
        setGeneratorBill({
          month,
          amount: String(amount),
          savedAmount: amount,
          updatedAt: data.updatedAt || null
        });
      } else {
        throw new Error(response.data.message || 'Failed to fetch generator bill');
      }
    } catch (error) {
      console.error('Error fetching generator bill:', error);
      setGeneratorBill({ month, amount: '', savedAmount: 0, updatedAt: null });
    } finally {
      setLoadingGeneratorBill(false);
    }
  };

  const handleSaveGeneratorBill = async () => {
    if (!bulkMonth) {
      toast.error('Please select a billing month.');
      return;
    }
    const parsedAmount = Number(generatorBill.amount);
    if (Number.isNaN(parsedAmount) || parsedAmount < 0) {
      toast.error('Generator amount must be 0 or more.');
      return;
    }

    setSavingGeneratorBill(true);
    try {
      const response = await api.post('/api/admin/rooms/warden/generator-bill', {
        month: bulkMonth,
        amount: parsedAmount
      });
      if (response.data.success) {
        const data = response.data.data || {};
        const amount = Number(data.amount) || 0;
        setGeneratorBill({
          month: bulkMonth,
          amount: String(amount),
          savedAmount: amount,
          updatedAt: data.updatedAt || null
        });
        toast.success('Generator bill saved successfully!');
      } else {
        throw new Error(response.data.message || 'Failed to save generator bill');
      }
    } catch (error) {
      console.error('Error saving generator bill:', error);
      toast.error(error.response?.data?.message || 'Failed to save generator bill');
    } finally {
      setSavingGeneratorBill(false);
    }
  };

  useEffect(() => {
    fetchHostels();
  }, []);

  useEffect(() => {
    if (filters.hostel) {
      fetchCategoriesByHostel(filters.hostel);
    }
  }, [filters.hostel]);

  useEffect(() => {
    if (filters.hostel) {
      fetchRooms();
    }
  }, [filters]);

  useEffect(() => {
    fetchGeneratorBill(bulkMonth);
  }, [bulkMonth]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => {
      const newFilters = { ...prev, [name]: value };
      // Reset category when hostel changes
      if (name === 'hostel') {
        newFilters.category = '';
        setCategories([]);
      }
      return newFilters;
    });
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

    const room = rooms.find(r => r._id === roomId);
    const isDualMeter = room?.meterType === 'dual';
    const existingBill = bulkMonth ? room?.electricityBills.find((b) => b.month === bulkMonth) : null;
    const wasAlreadyBilled = !!existingBill;

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

      const res = await axios.post(`${import.meta.env.VITE_API_URL.replace(/\/$/, '')}/api/admin/rooms/warden/${roomId}/electricity-bill`, payload, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      const occ = res.data?.occupancy;
      if (wasAlreadyBilled) {
        await api.post(`/api/admin/rooms/warden/${roomId}/electricity-bill/sync-demands`, {
          month: bulkMonth
        });
      }
      const eligibleNote =
        occ?.eligibleCount != null
          ? ` ${occ.eligibleCount}/${occ.occupantCount ?? '?'} eligible · elec ₹${Number(occ.sharePerStudent || 0).toFixed(2)} + gen ₹${Number(occ.generatorAmount || 0).toFixed(2)}`
          : '';
      toast.success(
        `Bill ${wasAlreadyBilled ? 'updated' : 'saved'} for Room ${rooms.find(r => r._id === roomId)?.roomNumber}!${eligibleNote}${wasAlreadyBilled ? ' Sync updated.' : ''}`
      );

      if (wasAlreadyBilled) {
        setEditingBills((prev) => {
          const next = new Set(prev);
          next.delete(roomId);
          return next;
        });
        setEditModeData((prev) => {
          const next = { ...prev };
          delete next[roomId];
          return next;
        });
      }
      
      // Refetch rooms to update last bill info
      fetchRooms();

    } catch (error) {
      console.error('Error saving single bill:', error);
      toast.error(error.response?.data?.message || 'Failed to save bill.');
    } finally {
      setSavingRoomId(null);
    }
  };

  /** Show live active students + attendance eligibility when a room is clicked */
  const handleOpenRoomOccupants = async (roomId) => {
    const room = rooms.find((r) => r._id === roomId);
    if (!bulkMonth) {
      toast.error('Select a billing month first to check attendance eligibility.');
      return;
    }
    setOccupantsModal({
      open: true,
      roomId,
      roomNumber: room?.roomNumber || '',
      loading: true,
      students: [],
      error: null,
      minAttendanceDays: 5,
      eligibleCount: 0,
      totalLive: 0
    });
    try {
      const response = await api.get(
        `/api/admin/rooms/warden/${roomId}/electricity-occupants`,
        { params: { month: bulkMonth } }
      );
      if (response.data.success) {
        const data = response.data.data || {};
        setOccupantsModal((prev) => ({
          ...prev,
          loading: false,
          students: data.students || [],
          minAttendanceDays: data.minAttendanceDays ?? 5,
          eligibleCount: data.eligibleCount ?? 0,
          totalLive: data.totalLive ?? (data.students || []).length
        }));
      } else {
        throw new Error(response.data.message || 'Failed to load students');
      }
    } catch (error) {
      console.error('Error loading room occupants:', error);
      setOccupantsModal((prev) => ({
        ...prev,
        loading: false,
        error: error.response?.data?.message || 'Failed to load live students'
      }));
    }
  };

  const closeOccupantsModal = () => {
    setOccupantsModal({
      open: false,
      roomId: null,
      roomNumber: '',
      loading: false,
      students: [],
      error: null,
      minAttendanceDays: 5,
      eligibleCount: 0,
      totalLive: 0
    });
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
    <div className="mt-12 sm:mt-0">
      <SEO title="Electricity Bills - Warden Dashboard" />
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 mb-4  sm:mb-6">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-green-900 to-green-700 bg-clip-text text-transparent flex flex-wrap items-center gap-2">
            <span>Electricity Bills</span>
            {getWardenHostelLabel() && (
              <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium not-italic">
                {getWardenHostelLabel()}
              </span>
            )}
          </h1>
          <p className="hidden sm:flex text-xs sm:text-sm text-gray-500 mt-1 flex-wrap items-center gap-2">
            Manage electricity billing for your assigned rooms
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
                if (filters.hostel && bill.hostel !== filters.hostel) return false;
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
        {(user?.assignedHostelId || user?.hostelType) && (
          <div className="hidden sm:block mb-3 sm:mb-4 p-2 sm:p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs sm:text-sm text-blue-800">
              <strong>Note:</strong> You are viewing rooms for {getWardenHostelLabel()} only.
            </p>
          </div>
        )}
        <div className="grid grid-cols-2 gap-2 sm:gap-4">
          <div>
            <label className="hidden sm:block text-xs sm:text-sm font-medium text-gray-700 mb-1">
              Hostel
            </label>
            <select
              name="hostel"
              value={filters.hostel}
              onChange={handleFilterChange}
              disabled={hostels.length <= 1}
              className="w-full px-2 sm:px-3 py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:bg-gray-100"
            >
              {hostels.length === 0 ? (
                <option value="">No Hostel Assigned</option>
              ) : hostels.length === 1 ? (
                <option value={getId(hostels[0]._id || hostels[0])}>
                  {getHostelLabel(hostels[0])}
                </option>
              ) : (
                <>
                  <option value="">All Hostels</option>
                  {hostels.map(h => (
                    <option key={h._id || h.id || h.name} value={getId(h._id || h)}>
                      {getHostelLabel(h)}
                    </option>
                  ))}
                </>
              )}
            </select>
          </div>
          <div>
            <label className="hidden sm:block text-xs sm:text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              name="category"
              value={filters.category}
              onChange={handleFilterChange}
              disabled={!filters.hostel}
              className="w-full px-2 sm:px-3 py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:bg-gray-100"
            >
              <option value="">All Categories</option>
              {categories
                .filter(c => getId(c.hostel?._id || c.hostel) === filters.hostel)
                .map(c => (
                  <option key={c._id} value={getId(c._id || c)}>
                    {getCategoryLabel(c)}
                  </option>
                ))}
            </select>
          </div>
        </div>
      </div>

      {/* Bulk Billing Table */}
      <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-3 sm:p-4">
        <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4">Bulk Electricity Billing</h2>
        
        {/* Global Controls - Sticky */}
        <div className="sticky top-0 z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6 p-3 sm:p-4 bg-gray-50 rounded-lg shadow-sm border border-gray-200">
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
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">Generator Bill</p>
              <p className="mt-1 text-xs text-amber-700">
                Flat add-on per eligible student for the selected billing month.
              </p>
            </div>
            <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 sm:min-w-[320px]">
              <input
                type="number"
                min="0"
                step="0.01"
                value={generatorBill.amount}
                onChange={(e) =>
                  setGeneratorBill((prev) => ({ ...prev, amount: e.target.value, month: bulkMonth }))
                }
                disabled={!bulkMonth || loadingGeneratorBill || savingGeneratorBill}
                placeholder={bulkMonth ? 'Enter generator amount' : 'Select month first'}
                className="w-full rounded-lg border border-amber-300 bg-white px-3 py-2 text-xs sm:text-sm focus:border-amber-500 focus:ring-2 focus:ring-amber-500 disabled:bg-gray-100"
              />
              <button
                type="button"
                onClick={handleSaveGeneratorBill}
                disabled={!bulkMonth || loadingGeneratorBill || savingGeneratorBill}
                className={`rounded-lg px-3 py-2 text-xs sm:text-sm font-medium whitespace-nowrap ${
                  bulkMonth && !loadingGeneratorBill && !savingGeneratorBill
                    ? 'bg-amber-600 text-white hover:bg-amber-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {savingGeneratorBill ? 'Saving...' : 'Save Generator'}
              </button>
            </div>
          </div>
          <p className="mt-2 text-xs text-amber-700">
            {loadingGeneratorBill
              ? 'Loading generator add-on...'
              : bulkMonth
                ? `Saved for ${bulkMonth}: ₹${Number(generatorBill.savedAmount || 0).toFixed(2)} per eligible student`
                : 'Select a billing month to manage the generator bill.'}
          </p>
        </div>

        {/* Desktop Table View */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Room</th>
                <th className="px-2 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Meter Readings</th>
                <th className="px-2 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
                <th className="px-2 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
                <th className="px-2 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
                <th className="px-2 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rate</th>
                <th className="px-2 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cons.</th>
                <th className="px-2 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                <th className="px-2 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {bulkBillData
                .filter(bill => {
                  if (filters.hostel && bill.hostel !== filters.hostel) return false;
                  if (filters.category && bill.category !== filters.category) return false;
                  return true;
                })
                .map(bill => {
                  const room = rooms.find(r => r._id === bill.roomId);
                  const existingBill = bulkMonth ? room?.electricityBills.find(b => b.month === bulkMonth) : null;
                  const isAlreadyBilled = !!existingBill;
                  const isEditingSavedBill = editingBills.has(bill.roomId);
                  const isLockedSavedBill = isAlreadyBilled && !isEditingSavedBill;
                  const isDualMeter = room?.meterType === 'dual' || bill.meterType === 'dual';

                  let startUnits, endUnits, rate, consumption, total, isValid;
                  let meter1StartUnits, meter1EndUnits, meter2StartUnits, meter2EndUnits;
                  let meter1Consumption, meter2Consumption;

                  if (isAlreadyBilled) {
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
                    <tr key={bill.roomId} className={`${isLockedSavedBill ? 'bg-green-100' : (bill.isEdited || isEditingSavedBill ? 'bg-blue-50' : '')}`}>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-gray-900">
                        <div className="flex flex-col">
                          <button
                            type="button"
                            onClick={() => handleOpenRoomOccupants(bill.roomId)}
                            className="text-left font-semibold text-gray-900 hover:text-green-700 hover:underline"
                            title="View live students & eligibility"
                          >
                            Room {bill.roomNumber}
                            {getRoomHostelCategoryText(bill) ? (
                              <span className="ml-1.5 text-xs font-normal text-gray-500">
                                · {getRoomHostelCategoryText(bill)}
                              </span>
                            ) : null}
                          </button>
                          <div className="flex items-center gap-1 mt-1">
                            {isDualMeter && (
                              <span className="px-1.5 py-0.5 text-xs text-white bg-blue-600 rounded-full">Dual</span>
                            )}
                            {isAlreadyBilled && (
                              <span className="px-1.5 py-0.5 text-xs text-white bg-green-600 rounded-full">Billed</span>
                            )}
                            {isEditingSavedBill && (
                              <span className="px-1.5 py-0.5 text-xs text-white bg-amber-600 rounded-full">Editing</span>
                            )}
                          </div>
                        </div>
                      </td>
                      {isDualMeter ? (
                        <>
                          <td className="px-2 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500">
                            <input
                              type="number"
                              value={isLockedSavedBill ? meter1StartUnits : bill.meter1StartUnits}
                              onChange={(e) => handleBulkBillChange(bill.roomId, 'meter1StartUnits', e.target.value)}
                              disabled={isLockedSavedBill}
                              className="w-16 sm:w-20 p-1 text-xs border border-gray-300 rounded disabled:bg-gray-200"
                              placeholder="M1 Start"
                            />
                          </td>
                          <td className="px-2 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500">
                            <input
                              type="number"
                              placeholder="M1 End"
                              value={isLockedSavedBill ? meter1EndUnits : bill.meter1EndUnits}
                              onChange={(e) => handleBulkBillChange(bill.roomId, 'meter1EndUnits', e.target.value)}
                              disabled={isLockedSavedBill}
                              className={`w-16 sm:w-20 p-1 text-xs border rounded ${!isValid && !isLockedSavedBill ? 'border-red-500' : 'border-gray-300'} disabled:bg-gray-200`}
                            />
                          </td>
                          <td className="px-2 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500">
                            <input
                              type="number"
                              value={isLockedSavedBill ? meter2StartUnits : bill.meter2StartUnits}
                              onChange={(e) => handleBulkBillChange(bill.roomId, 'meter2StartUnits', e.target.value)}
                              disabled={isLockedSavedBill}
                              className="w-16 sm:w-20 p-1 text-xs border border-gray-300 rounded disabled:bg-gray-200"
                              placeholder="M2 Start"
                            />
                          </td>
                          <td className="px-2 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500">
                            <input
                              type="number"
                              placeholder="M2 End"
                              value={isLockedSavedBill ? meter2EndUnits : bill.meter2EndUnits}
                              onChange={(e) => handleBulkBillChange(bill.roomId, 'meter2EndUnits', e.target.value)}
                              disabled={isLockedSavedBill}
                              className={`w-16 sm:w-20 p-1 text-xs border rounded ${!isValid && !isLockedSavedBill ? 'border-red-500' : 'border-gray-300'} disabled:bg-gray-200`}
                            />
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-2 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500">
                            <input
                              type="number"
                              value={isLockedSavedBill ? startUnits : bill.startUnits}
                              onChange={(e) => handleBulkBillChange(bill.roomId, 'startUnits', e.target.value)}
                              disabled={isLockedSavedBill}
                              className="w-16 sm:w-20 p-1 text-xs border border-gray-300 rounded disabled:bg-gray-200"
                              placeholder="Start"
                            />
                          </td>
                          <td className="px-2 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500">
                            <input
                              type="number"
                              placeholder="End"
                              value={isLockedSavedBill ? endUnits : bill.endUnits}
                              onChange={(e) => handleBulkBillChange(bill.roomId, 'endUnits', e.target.value)}
                              disabled={isLockedSavedBill}
                              className={`w-16 sm:w-20 p-1 text-xs border rounded ${!isValid && !isLockedSavedBill ? 'border-red-500' : 'border-gray-300'} disabled:bg-gray-200`}
                            />
                          </td>
                          <td className="px-2 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-400">-</td>
                          <td className="px-2 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-400">-</td>
                        </>
                      )}
                      <td className="px-2 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500">
                        <input
                          type="number"
                          placeholder={bulkRate || 'Def'}
                          value={isLockedSavedBill ? rate : bill.rate}
                          onChange={(e) => handleBulkBillChange(bill.roomId, 'rate', e.target.value)}
                          disabled={isLockedSavedBill}
                          className="w-12 sm:w-16 p-1 text-xs border border-gray-300 rounded disabled:bg-gray-200"
                        />
                      </td>
                      <td className={`px-2 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm ${!isValid && !isLockedSavedBill ? 'text-red-500' : 'text-gray-900'}`}>
                        {isValid ? consumption : 'Invalid'}
                      </td>
                      <td className={`px-2 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-semibold ${!isValid && !isLockedSavedBill ? 'text-red-500' : 'text-green-600'}`}>
                        ₹{isValid ? total.toFixed(2) : '0.00'}
                      </td>
                      <td className="px-2 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm">
                        {isAlreadyBilled && !isEditingSavedBill ? (
                          <button
                            type="button"
                            onClick={() => handleEditBill(bill.roomId)}
                            className="rounded-md bg-amber-500 px-2.5 py-1 text-white hover:bg-amber-600"
                          >
                            Edit
                          </button>
                        ) : (
                          <div className="flex items-center gap-2">
                            {isEditingSavedBill ? (
                              <>
                                <button
                                  type="button"
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
                                  disabled={savingRoomId === bill.roomId || !isValid || !bill.isEdited}
                                  className={`rounded-md px-2.5 py-1 text-white ${
                                    savingRoomId === bill.roomId || !isValid || !bill.isEdited
                                      ? 'bg-gray-300 cursor-not-allowed'
                                      : 'bg-green-600 hover:bg-green-700'
                                  }`}
                                >
                                  {savingRoomId === bill.roomId ? 'Saving...' : 'Save'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleCancelEdit(bill.roomId)}
                                  className="rounded-md bg-gray-200 px-2.5 py-1 text-gray-700 hover:bg-gray-300"
                                >
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </div>
                        )}
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
              if (filters.category && bill.category !== filters.category) return false;
              return true;
            })
            .map(bill => {
              const room = rooms.find(r => r._id === bill.roomId);
              const existingBill = bulkMonth ? room?.electricityBills.find(b => b.month === bulkMonth) : null;
              const isAlreadyBilled = !!existingBill;
              const isEditingSavedBill = editingBills.has(bill.roomId);
              const isLockedSavedBill = isAlreadyBilled && !isEditingSavedBill;
              const isDualMeter = room?.meterType === 'dual' || bill.meterType === 'dual';

              let startUnits, endUnits, rate, consumption, total, isValid;
              let meter1StartUnits, meter1EndUnits, meter2StartUnits, meter2EndUnits;
              let meter1Consumption, meter2Consumption;

              if (isAlreadyBilled) {
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
                  className={`bg-white rounded-lg border-2 p-3 shadow-sm transition-all duration-200 ${
                    isLockedSavedBill 
                      ? 'border-green-300 bg-green-50 shadow-green-100' 
                      : bill.isEdited || isEditingSavedBill
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
                        <h3 className="font-semibold text-gray-900 text-base">
                          <button
                            type="button"
                            onClick={() => handleOpenRoomOccupants(bill.roomId)}
                            className="text-left hover:text-green-700 hover:underline"
                            title="View live students & eligibility"
                          >
                            <div className="flex items-center gap-2">
                              <span>Room {bill.roomNumber}</span>
                              {isAlreadyBilled && (
                                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-600 text-white text-[10px] font-bold">
                                  ✓
                                </span>
                              )}
                            </div>
                            {getRoomHostelCategoryText(bill) ? (
                              <div className="text-xs text-gray-500 mt-0.5">
                                {getRoomHostelCategoryText(bill)}
                              </div>
                            ) : null}
                          </button>
                        </h3>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {bill.isEdited && !isLockedSavedBill && (
                        <span className="px-2 py-1 text-xs text-white bg-blue-600 rounded-full font-medium shadow-sm">
                          ✏️ Edited
                        </span>
                      )}
                      {isAlreadyBilled && !isEditingSavedBill && (
                        <button
                          type="button"
                          onClick={() => handleEditBill(bill.roomId)}
                          className="rounded-full bg-amber-500 px-2.5 py-1 text-[11px] font-medium text-white shadow-sm"
                        >
                          Edit
                        </button>
                      )}
                      {isEditingSavedBill && (
                        <button
                          type="button"
                          onClick={() => handleCancelEdit(bill.roomId)}
                          className="rounded-full bg-gray-200 px-2.5 py-1 text-[11px] font-medium text-gray-700 shadow-sm"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
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
                          <div className="grid grid-cols-[52px_minmax(0,1fr)] items-center gap-3">
                            <label className="block text-xs font-medium text-gray-700 whitespace-nowrap">
                              Start
                            </label>
                            <input
                              type="number"
                              value={isLockedSavedBill ? meter1StartUnits : bill.meter1StartUnits}
                              onChange={(e) => handleBulkBillChange(bill.roomId, 'meter1StartUnits', e.target.value)}
                              disabled={isLockedSavedBill}
                              className="min-w-0 w-full px-3 py-2 text-sm border border-gray-300 rounded-lg disabled:bg-gray-200 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                              placeholder="Enter start units"
                            />
                          </div>
                          <div className="grid grid-cols-[52px_minmax(0,1fr)] items-center gap-3">
                            <label className="block text-xs font-medium text-gray-700 whitespace-nowrap">
                              End
                            </label>
                            <input
                              type="number"
                              placeholder="Enter new reading"
                              value={isLockedSavedBill ? meter1EndUnits : bill.meter1EndUnits}
                              onChange={(e) => handleBulkBillChange(bill.roomId, 'meter1EndUnits', e.target.value)}
                              disabled={isLockedSavedBill}
                              className={`min-w-0 w-full px-3 py-2 text-sm border rounded-lg disabled:bg-gray-200 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors ${
                                !isValid && !isLockedSavedBill ? 'border-red-500 bg-red-50' : 'border-gray-300'
                              }`}
                            />
                          </div>
                        </div>

                        {/* Meter 2 */}
                        <div className="border-l-4 border-green-500 pl-3 space-y-2">
                          <p className="text-xs font-semibold text-gray-700">Meter 2</p>
                          <div className="grid grid-cols-[52px_minmax(0,1fr)] items-center gap-3">
                            <label className="block text-xs font-medium text-gray-700 whitespace-nowrap">
                              Start
                            </label>
                            <input
                              type="number"
                              value={isLockedSavedBill ? meter2StartUnits : bill.meter2StartUnits}
                              onChange={(e) => handleBulkBillChange(bill.roomId, 'meter2StartUnits', e.target.value)}
                              disabled={isLockedSavedBill}
                              className="min-w-0 w-full px-3 py-2 text-sm border border-gray-300 rounded-lg disabled:bg-gray-200 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                              placeholder="Enter start units"
                            />
                          </div>
                          <div className="grid grid-cols-[52px_minmax(0,1fr)] items-center gap-3">
                            <label className="block text-xs font-medium text-gray-700 whitespace-nowrap">
                              End
                            </label>
                            <input
                              type="number"
                              placeholder="Enter new reading"
                              value={isLockedSavedBill ? meter2EndUnits : bill.meter2EndUnits}
                              onChange={(e) => handleBulkBillChange(bill.roomId, 'meter2EndUnits', e.target.value)}
                              disabled={isLockedSavedBill}
                              className={`min-w-0 w-full px-3 py-2 text-sm border rounded-lg disabled:bg-gray-200 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors ${
                                !isValid && !isLockedSavedBill ? 'border-red-500 bg-red-50' : 'border-gray-300'
                              }`}
                            />
                          </div>
                        </div>
                        
                        {!isValid && !isLockedSavedBill && (
                          <p className="text-xs text-red-600">End units must be greater than or equal to start units for both meters</p>
                        )}
                      </>
                    ) : (
                      <>
                        {/* Single Meter Mode */}
                        <div className="flex items-center gap-3">
                          <label className="block text-xs font-medium text-gray-700 whitespace-nowrap">
                            Start
                          </label>
                          <input
                            type="number"
                            value={isLockedSavedBill ? startUnits : bill.startUnits}
                            onChange={(e) => handleBulkBillChange(bill.roomId, 'startUnits', e.target.value)}
                            disabled={isLockedSavedBill}
                            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg disabled:bg-gray-200 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                            placeholder="Enter start units"
                          />
                        </div>

                        <div className="flex items-center gap-3">
                          <label className="block text-xs font-medium text-gray-700 whitespace-nowrap">
                            End
                          </label>
                          <input
                            type="number"
                            placeholder="Enter new reading"
                            value={isLockedSavedBill ? endUnits : bill.endUnits}
                            onChange={(e) => handleBulkBillChange(bill.roomId, 'endUnits', e.target.value)}
                            disabled={isLockedSavedBill}
                            className={`flex-1 px-3 py-2 text-sm border rounded-lg disabled:bg-gray-200 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors ${
                              !isValid && !isLockedSavedBill ? 'border-red-500 bg-red-50' : 'border-gray-300'
                            }`}
                          />
                        </div>
                        {!isValid && !isLockedSavedBill && (
                          <p className="text-xs text-red-600 mt-1">
                            End units must be greater than start units
                          </p>
                        )}
                      </>
                    )}

                    {/* Rate */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Rate per Unit</label>
                      <input
                        type="number"
                        placeholder={bulkRate || 'Default rate'}
                        value={isLockedSavedBill ? rate : bill.rate}
                        onChange={(e) => handleBulkBillChange(bill.roomId, 'rate', e.target.value)}
                        disabled={isLockedSavedBill}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg disabled:bg-gray-200 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                      />
                    </div>

                    {/* Summary */}
                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div className="text-center">
                          <p className="text-xs text-gray-600 mb-1">Consumption</p>
                          <p className={`text-sm font-semibold ${!isValid && !isLockedSavedBill ? 'text-red-500' : 'text-gray-900'}`}>
                            {isValid ? consumption : 'Invalid'}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-gray-600 mb-1">Total Amount</p>
                          <p className={`text-sm font-semibold ${!isValid && !isLockedSavedBill ? 'text-red-500' : 'text-green-600'}`}>
                            ₹{isValid ? total.toFixed(2) : '0.00'}
                          </p>
                        </div>
                      </div>
                      
                      {/* Individual Save Button for Mobile */}
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
                        disabled={savingRoomId === bill.roomId || !canManageBills || isLockedSavedBill || !isValid || !bill.isEdited}
                        className={`w-full py-2 px-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                          canManageBills && savingRoomId !== bill.roomId && !isLockedSavedBill && isValid && bill.isEdited
                            ? 'bg-green-600 text-white hover:bg-green-700 active:bg-green-800 shadow-sm' 
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        {savingRoomId === bill.roomId ? (
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>Saving...</span>
                          </div>
                        ) : isLockedSavedBill ? '✓ Saved' : (isAlreadyBilled ? (isValid ? '💾 Save Changes + Sync' : '❌ Invalid Data') : (isValid ? '💾 Save This Bill' : '❌ Invalid Data'))}
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

      {/* Live occupants + eligibility modal */}
      {occupantsModal.open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={closeOccupantsModal}
        >
          <div
            className="w-full max-w-lg rounded-lg bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
              <div>
                <h3 className="text-base font-semibold text-gray-900">
                  Room {occupantsModal.roomNumber} — Live students
                </h3>
                <p className="text-xs text-gray-500">
                  Demand only if present/partial days in {bulkMonth || 'month'} &gt;{' '}
                  {occupantsModal.minAttendanceDays ?? 5}. Eligible:{' '}
                  {occupantsModal.eligibleCount ?? 0}/{occupantsModal.totalLive ?? 0}
                </p>
              </div>
              <button
                type="button"
                onClick={closeOccupantsModal}
                className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto px-4 py-3">
              {occupantsModal.loading ? (
                <p className="py-6 text-center text-sm text-gray-500">Loading…</p>
              ) : occupantsModal.error ? (
                <p className="py-6 text-center text-sm text-red-600">{occupantsModal.error}</p>
              ) : occupantsModal.students.length === 0 ? (
                <p className="py-6 text-center text-sm text-gray-500">
                  No live active students in this room.
                </p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {occupantsModal.students.map((s) => (
                    <li key={s._id || s.hostelRequestId || s.admissionNumber} className="py-2.5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{s.name || '—'}</p>
                          <p className="text-xs text-gray-500">
                            {s.rollNumber || 'No roll'}
                            {s.admissionNumber ? ` · Adm ${s.admissionNumber}` : ''}
                          </p>
                          <p className="mt-0.5 text-xs text-gray-500">
                            Attendance days (present/partial):{' '}
                            <span className="font-medium text-gray-800">
                              {s.attendanceDays ?? 0}
                            </span>
                          </p>
                        </div>
                        <div className="text-right">
                          <span
                            className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                              s.eligibleForDemand
                                ? 'bg-green-100 text-green-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {s.eligibleForDemand ? 'Eligible' : 'Not eligible'}
                          </span>
                          {s.academicYear && (
                            <p className="mt-1 text-xs text-gray-400">{s.academicYear}</p>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="border-t border-gray-200 px-4 py-3 text-right">
              <button
                type="button"
                onClick={closeOccupantsModal}
                className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ElectricityBills; 