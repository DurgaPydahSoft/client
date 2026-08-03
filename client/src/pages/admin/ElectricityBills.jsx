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
    hostel: '',
    category: ''
  });
  const [hostels, setHostels] = useState([]);
  const [categories, setCategories] = useState([]);
  const [bulkBillData, setBulkBillData] = useState([]);
  const [bulkMonth, setBulkMonth] = useState('');
  const [bulkRate, setBulkRate] = useState('');
  const [isSavingBulk, setIsSavingBulk] = useState(false);
  const [isClearingMonth, setIsClearingMonth] = useState(false);
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
  const [feeHeads, setFeeHeads] = useState([]);
  const [loadingFeeHeads, setLoadingFeeHeads] = useState(false);
  const [selectedFeeHeadId, setSelectedFeeHeadId] = useState('');
  const [savedFeeHead, setSavedFeeHead] = useState({ id: null, code: null, name: null });
  const [savingSettings, setSavingSettings] = useState(false);
  const [generatorBill, setGeneratorBill] = useState({
    month: '',
    dieselLitres: '',
    perLitreAmount: '',
    savedAmount: 0,
    updatedAt: null
  });
  const [loadingGeneratorBill, setLoadingGeneratorBill] = useState(false);
  const [savingGeneratorBill, setSavingGeneratorBill] = useState(false);
  const [syncingRoomId, setSyncingRoomId] = useState(null);
  const [syncingAll, setSyncingAll] = useState(false);
  const [syncResultModal, setSyncResultModal] = useState({
    open: false,
    mode: 'single', // 'single' | 'all'
    roomNumber: '',
    month: '',
    data: null,
    rooms: [] // for Sync All: [{ roomId, roomNumber, ok, error, data }]
  });
  const [occupantsModal, setOccupantsModal] = useState({
    open: false,
    roomId: null,
    roomNumber: '',
    loading: false,
    students: [],
    error: null,
    minAttendanceDays: 0,
    eligibleCount: 0,
    totalLive: 0,
    previewTotalAmount: null
  });

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
        setHostels(res.data.data || []);
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

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value,
      ...(name === 'hostel' ? { category: '' } : {})
    }));

    if (name === 'hostel') {
      fetchCategoriesByHostel(value);
    }
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

  /** Sync Fees DB demands for an already-raised bill (recalculate shares + update/create/remove) */
  const handleSyncBillDemands = async (roomId) => {
    if (!canManageBills) {
      toast.error('You do not have permission to sync electricity demands');
      return;
    }
    if (!bulkMonth) {
      toast.error('Please select a billing month.');
      return;
    }
    if (!savedFeeHead.id) {
      toast.error('Select and save an electricity fee head in Settings first.');
      return;
    }

    const roomNumber = rooms.find((r) => r._id === roomId)?.roomNumber || '';
    setSyncingRoomId(roomId);
    try {
      const response = await api.post(
        `/api/admin/rooms/${roomId}/electricity-bill/sync-demands`,
        { month: bulkMonth }
      );
      if (response.data.success) {
        setSyncResultModal({
          open: true,
          mode: 'single',
          roomNumber,
          month: bulkMonth,
          data: response.data.data || {},
          rooms: []
        });
        await fetchRooms();
      } else {
        throw new Error(response.data.message || 'Sync failed');
      }
    } catch (error) {
      console.error('Error syncing bill demands:', error);
      toast.error(error.response?.data?.message || 'Failed to sync fee demands');
    } finally {
      setSyncingRoomId(null);
    }
  };

  /** Sync all already-billed rooms for the selected month (respects hostel/category filters). */
  const handleSyncAllBillDemands = async () => {
    if (!canManageBills) {
      toast.error('You do not have permission to sync electricity demands');
      return;
    }
    if (!bulkMonth) {
      toast.error('Please select a billing month.');
      return;
    }
    if (!savedFeeHead.id) {
      toast.error('Select and save an electricity fee head in Settings first.');
      return;
    }

    const billedRooms = bulkBillData.filter((bill) => {
      if (filters.hostel && bill.hostel !== filters.hostel) return false;
      if (filters.category && bill.category !== filters.category) return false;
      const room = rooms.find((r) => r._id === bill.roomId);
      return !!(bulkMonth && room?.electricityBills?.find((b) => b.month === bulkMonth));
    });

    if (billedRooms.length === 0) {
      toast.error('No raised bills found for this month in the current filter.');
      return;
    }

    if (
      !window.confirm(
        `Sync fee demands for ${billedRooms.length} billed room(s) in ${bulkMonth}? Eligible shares will be recalculated room-wise.`
      )
    ) {
      return;
    }

    setSyncingAll(true);
    const roomResults = [];
    try {
      for (const bill of billedRooms) {
        try {
          const response = await api.post(
            `/api/admin/rooms/${bill.roomId}/electricity-bill/sync-demands`,
            { month: bulkMonth }
          );
          if (response.data.success) {
            roomResults.push({
              roomId: bill.roomId,
              roomNumber: bill.roomNumber,
              ok: true,
              data: response.data.data || {}
            });
          } else {
            roomResults.push({
              roomId: bill.roomId,
              roomNumber: bill.roomNumber,
              ok: false,
              error: response.data.message || 'Sync failed',
              data: null
            });
          }
        } catch (err) {
          roomResults.push({
            roomId: bill.roomId,
            roomNumber: bill.roomNumber,
            ok: false,
            error: err.response?.data?.message || err.message || 'Sync failed',
            data: null
          });
        }
      }

      setSyncResultModal({
        open: true,
        mode: 'all',
        roomNumber: '',
        month: bulkMonth,
        data: null,
        rooms: roomResults
      });
      await fetchRooms();
    } finally {
      setSyncingAll(false);
    }
  };

  const closeSyncResultModal = () => {
    setSyncResultModal({
      open: false,
      mode: 'single',
      roomNumber: '',
      month: '',
      data: null,
      rooms: []
    });
  };

  /** Show live students + share preview when Preview Shares / room is clicked */
  const handleOpenRoomOccupants = async (roomId, computedTotal = null) => {
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
      minAttendanceDays: 0,
      eligibleCount: 0,
      totalLive: 0,
      previewTotalAmount: computedTotal
    });
    try {
      const response = await api.get(`/api/admin/rooms/${roomId}/electricity-occupants`, {
        params: { month: bulkMonth }
      });
      if (response.data.success) {
        const data = response.data.data || {};
        setOccupantsModal((prev) => ({
          ...prev,
          loading: false,
          students: data.students || [],
          minAttendanceDays: data.minAttendanceDays ?? 0,
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
      minAttendanceDays: 0,
      eligibleCount: 0,
      totalLive: 0,
      previewTotalAmount: null
    });
  };

  useEffect(() => {
  fetchHostels();
}, []);

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

  // Fetch electricity settings (rate + fee head)
  const fetchDefaultRate = async () => {
    setLoadingDefaultRate(true);
    try {
      const response = await api.get('/api/admin/rooms/electricity-settings');
      if (response.data.success) {
        const data = response.data.data || {};
        const rate = data.defaultRate ?? response.data.rate ?? '';
        setDefaultRate(rate.toString());
        setBulkRate(rate.toString());
        setSavedFeeHead({
          id: data.feeHeadId || null,
          code: data.feeHeadCode || null,
          name: data.feeHeadName || null
        });
        setSelectedFeeHeadId(data.feeHeadId || '');
      }
    } catch (error) {
      console.error('Error fetching electricity settings:', error);
      // Fallback to legacy endpoint
      try {
        const legacy = await api.get('/api/admin/rooms/electricity-default-rate');
        if (legacy.data.success) {
          const rate = legacy.data.rate || '';
          setDefaultRate(rate.toString());
          setBulkRate(rate.toString());
          if (legacy.data.feeHeadId) {
            setSavedFeeHead({
              id: legacy.data.feeHeadId,
              code: legacy.data.feeHeadCode || null,
              name: legacy.data.feeHeadName || null
            });
            setSelectedFeeHeadId(legacy.data.feeHeadId);
          }
        }
      } catch (legacyErr) {
        toast.error('Failed to fetch electricity settings');
      }
    } finally {
      setLoadingDefaultRate(false);
    }
  };

  const fetchFeeHeads = async () => {
    setLoadingFeeHeads(true);
    try {
      const response = await api.get('/api/admin/rooms/fee-heads');
      if (response.data.success) {
        setFeeHeads(response.data.feeHeads || []);
      } else {
        toast.error(response.data.message || 'Failed to load fee heads');
      }
    } catch (error) {
      console.error('Error fetching fee heads:', error);
      toast.error(error.response?.data?.message || 'Failed to load fee heads from Fees DB');
    } finally {
      setLoadingFeeHeads(false);
    }
  };

  const fetchGeneratorBill = async (month, hostelId) => {
    if (!month || !hostelId) {
      setGeneratorBill({ month: '', dieselLitres: '', perLitreAmount: '', savedAmount: 0, updatedAt: null });
      return;
    }
    setLoadingGeneratorBill(true);
    try {
      const response = await api.get('/api/admin/rooms/generator-bill', {
        params: { month, hostel: hostelId }
      });
      if (response.data.success) {
        const data = response.data.data || {};
        setGeneratorBill({
          month,
          dieselLitres: data.dieselLitres != null ? String(data.dieselLitres) : '',
          perLitreAmount: data.perLitreAmount != null ? String(data.perLitreAmount) : '',
          savedAmount: Number(data.amount) || 0,
          updatedAt: data.updatedAt || null
        });
      } else {
        throw new Error(response.data.message || 'Failed to fetch generator bill');
      }
    } catch (error) {
      console.error('Error fetching generator bill:', error);
      setGeneratorBill({ month, dieselLitres: '', perLitreAmount: '', savedAmount: 0, updatedAt: null });
      toast.error(error.response?.data?.message || 'Failed to fetch generator bill');
    } finally {
      setLoadingGeneratorBill(false);
    }
  };

  const handleSaveGeneratorBill = async () => {
    if (!bulkMonth) {
      toast.error('Select a billing month first.');
      return;
    }
    if (!filters.hostel) {
      toast.error('Select a hostel first.');
      return;
    }
    const litres = Number(generatorBill.dieselLitres);
    const rate = Number(generatorBill.perLitreAmount);
    if (Number.isNaN(litres) || litres < 0) {
      toast.error('Diesel litres must be 0 or more.');
      return;
    }
    if (Number.isNaN(rate) || rate < 0) {
      toast.error('Per litre amount must be 0 or more.');
      return;
    }

    setSavingGeneratorBill(true);
    try {
      const response = await api.post('/api/admin/rooms/generator-bill', {
        month: bulkMonth,
        hostel: filters.hostel,
        dieselLitres: litres,
        perLitreAmount: rate
      });
      if (response.data.success) {
        const data = response.data.data || {};
        setGeneratorBill({
          month: bulkMonth,
          dieselLitres: String(Number(data.dieselLitres) || 0),
          perLitreAmount: String(Number(data.perLitreAmount) || 0),
          savedAmount: Number(data.amount) || 0,
          updatedAt: data.updatedAt || null
        });
        const synced = data.syncQueued
          ? ' · room bills updating in background'
          : data.syncedBills != null
            ? ` · ${data.syncedBills} room bill(s) updated`
            : '';
        toast.success(`Generator bill saved (total ₹${Number(data.amount || 0).toFixed(2)})${synced}`);
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

  // Save default rate
  const handleSaveDefaultRate = async () => {
    if (!defaultRate || isNaN(Number(defaultRate)) || Number(defaultRate) <= 0) {
      toast.error('Please enter a valid positive number for the rate');
      return;
    }

    setSavingDefaultRate(true);
    try {
      const response = await api.post('/api/admin/rooms/electricity-settings', {
        defaultRate: Number(defaultRate)
      });
      if (response.data.success) {
        toast.success('Default electricity rate saved successfully!');
        setBulkRate(defaultRate);
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

  const handleSaveFeeHead = async () => {
    if (!selectedFeeHeadId) {
      toast.error('Please select a fee head');
      return;
    }
    const head = feeHeads.find((h) => h._id === selectedFeeHeadId);
    setSavingSettings(true);
    try {
      const response = await api.post('/api/admin/rooms/electricity-settings', {
        feeHeadId: selectedFeeHeadId,
        feeHeadCode: head?.code || '',
        feeHeadName: head?.name || ''
      });
      if (response.data.success) {
        const data = response.data.data || {};
        setSavedFeeHead({
          id: data.feeHeadId,
          code: data.feeHeadCode,
          name: data.feeHeadName
        });
        toast.success('Electricity fee head saved. New bills will create demands under this head.');
      } else {
        throw new Error(response.data.message || 'Failed to save fee head');
      }
    } catch (error) {
      console.error('Error saving fee head:', error);
      toast.error(error.response?.data?.message || 'Failed to save fee head');
    } finally {
      setSavingSettings(false);
    }
  };

  // Load default rate on mount
  useEffect(() => {
    fetchDefaultRate();
  }, []);

  useEffect(() => {
    if (activeTab === 'settings') {
      fetchFeeHeads();
    }
  }, [activeTab]);

  useEffect(() => {
    fetchGeneratorBill(bulkMonth, filters.hostel);
  }, [bulkMonth, filters.hostel]);

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
    if (filters.hostel) parts.push(`Hostel: ${getHostelLabel(hostels.find(h => getId(h._id || h) === filters.hostel) || filters.hostel)}`);
    if (filters.category) parts.push(`Category: ${getCategoryLabel(categories.find(c => getId(c._id || c) === filters.category) || filters.category)}`);
    if (reportsMonthFilter) parts.push(`Month: ${formatMonth(reportsMonthFilter)}`);
    if (reportsPaymentFilter) parts.push(`Payment: ${reportsPaymentFilter.charAt(0).toUpperCase() + reportsPaymentFilter.slice(1)}`);
    return parts.length > 0 ? parts.join(' | ') : 'All Rooms';
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

      const res = await axios.post(`${import.meta.env.VITE_API_URL.replace(/\/$/, '')}/api/admin/rooms/${roomId}/electricity-bill`, payload, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      const occ = res.data?.occupancy;
      const eligibleNote =
        occ?.eligibleCount != null
          ? ` ${occ.eligibleCount}/${occ.occupantCount ?? '?'} eligible · elec ₹${Number(occ.sharePerStudent || 0).toFixed(2)} + gen ₹${Number(occ.generatorAmount || 0).toFixed(2)}`
          : '';
      toast.success(`Bill saved for Room ${rooms.find(r => r._id === roomId)?.roomNumber}!${eligibleNote}`);

      // Refetch rooms to update last bill info
      fetchRooms();

    } catch (error) {
      console.error('Error saving single bill:', error);
      toast.error(error.response?.data?.message || 'Failed to save bill.');
    } finally {
      setSavingRoomId(null);
    }
  };

  const handleClearMonthBills = async () => {
    if (!canManageBills) {
      toast.error('You do not have permission to manage electricity bills');
      return;
    }
    if (!bulkMonth) {
      toast.error('Please select a billing month first.');
      return;
    }
    const monthLabel = new Date(bulkMonth + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    const hasFilters = !!(filters.hostel || filters.category);
    const scopeText = hasFilters
      ? 'rooms matching current filters (Hostel/Category)'
      : 'all rooms';
    if (!window.confirm(`Delete all electricity bills for ${monthLabel}? This removes bill records for ${scopeText} and reverses each student's electricity fee demand for that month. This cannot be undone.`)) {
      return;
    }
    setIsClearingMonth(true);
    try {
      // Send month + current filter IDs so backend clears only matching rooms
      const payload = { month: bulkMonth };
      if (filters.hostel) payload.hostel = filters.hostel;   // hostel _id
      if (filters.category) payload.category = filters.category; // category _id
      const res = await api.post('/api/admin/rooms/clear-electricity-bills-for-month', payload);
      if (res.data?.success) {
        const d = res.data;
        const demandNote =
          d.demandsReversed != null || d.demandsDeleted != null
            ? ` Demands: ${d.demandsReversed || 0} reduced, ${d.demandsDeleted || 0} removed.`
            : '';
        toast.success(
          (d.message || `Removed bills for ${bulkMonth}. ${d.modifiedCount ?? 0} rooms updated.`) +
            demandNote
        );
        fetchRooms();
      } else {
        toast.error(res.data?.message || 'Failed to remove bills.');
      }
    } catch (error) {
      console.error('Error clearing month bills:', error);
      toast.error(error.response?.data?.message || 'Failed to remove bills for this month.');
    } finally {
      setIsClearingMonth(false);
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

      {/* Filters and Controls */}
      <div className="bg-white rounded-lg shadow-sm p-2.5 sm:p-3 mb-3 sm:mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 mb-2 sm:mb-3">
          <div>
            <label className="block text-[11px] sm:text-xs font-medium text-gray-700 mb-0.5">
              Hostel
            </label>
            <select
              name="hostel"
              value={filters.hostel}
              onChange={handleFilterChange}
              className="w-full px-2.5 py-1.5 text-[11px] sm:text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Hostels</option>
              {hostels.map(h => (
                <option key={h._id || h.id || h.name} value={getId(h._id || h)}>
                  {getHostelLabel(h)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] sm:text-xs font-medium text-gray-700 mb-0.5">
              Category
            </label>
            <select
              name="category"
              value={filters.category}
              onChange={handleFilterChange}
              disabled={!filters.hostel}
              className="w-full px-2.5 py-1.5 text-[11px] sm:text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
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
          <div>
            <label className="block text-[11px] sm:text-xs font-medium text-gray-700 mb-0.5">Billing Month</label>
            <input
              type="month"
              value={bulkMonth}
              onChange={(e) => setBulkMonth(e.target.value)}
              className="w-full px-2.5 py-1.5 text-[11px] sm:text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleSaveBulkBills}
            disabled={isSavingBulk || !canManageBills || syncingAll}
            className={`px-3 py-1.5 text-[11px] sm:text-xs rounded-md transition-colors whitespace-nowrap ${canManageBills && !isSavingBulk && !syncingAll
              ? 'bg-green-600 text-white hover:bg-green-700'
              : 'bg-gray-400 text-gray-200 cursor-not-allowed'
              }`}
            title={!canManageBills ? 'You need full access to manage electricity bills' : 'Save all edited bills'}
          >
            {!canManageBills ? <LockClosedIcon className="w-4 h-4" /> : (isSavingBulk ? 'Saving...' : 'Save All Bills')}
          </button>
          <button
            type="button"
            onClick={handleSyncAllBillDemands}
            disabled={syncingAll || !!syncingRoomId || !canManageBills || !bulkMonth || !savedFeeHead.id}
            className={`px-3 py-1.5 text-[11px] sm:text-xs rounded-md transition-colors whitespace-nowrap ${
              canManageBills && bulkMonth && savedFeeHead.id && !syncingAll && !syncingRoomId
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
            title={
              !bulkMonth
                ? 'Select a billing month first'
                : !savedFeeHead.id
                  ? 'Save an electricity fee head in Settings first'
                  : !canManageBills
                    ? 'You need full access'
                    : 'Sync fee demands for all billed rooms this month'
            }
          >
            {syncingAll ? 'Syncing All…' : 'Sync All'}
          </button>
          <button
            type="button"
            onClick={handleClearMonthBills}
            disabled={isClearingMonth || !canManageBills || !bulkMonth || syncingAll}
            className={`px-3 py-1.5 text-[11px] sm:text-xs rounded-md transition-colors whitespace-nowrap ${canManageBills && bulkMonth && !isClearingMonth && !syncingAll
              ? 'bg-red-600 text-white hover:bg-red-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            title={!bulkMonth ? 'Select a month first' : !canManageBills ? 'You need full access' : `Delete bills for selected month${filters.hostel || filters.category ? ' (filtered rooms only)' : ''}`}
          >
            {isClearingMonth ? 'Removing...' : 'Remove Month'}
          </button>
        </div>
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-2.5 sm:p-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-wide text-amber-800">
                Generator Bill (Hostel)
              </p>
              <p className="text-[11px] sm:text-xs text-amber-700">
                Diesel litres × ₹/litre = hostel total, shared by attendance (same rules as electricity).
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-2 sm:w-auto sm:min-w-[420px]">
              <input
                type="number"
                min="0"
                step="0.01"
                value={generatorBill.dieselLitres}
                onChange={(e) =>
                  setGeneratorBill((prev) => ({ ...prev, dieselLitres: e.target.value, month: bulkMonth }))
                }
                disabled={!bulkMonth || !filters.hostel || loadingGeneratorBill || savingGeneratorBill}
                placeholder="Diesel litres"
                className="w-full rounded-md border border-amber-300 bg-white px-2.5 py-1.5 text-[11px] sm:text-xs focus:border-amber-500 focus:ring-2 focus:ring-amber-500 disabled:bg-gray-100"
              />
              <input
                type="number"
                min="0"
                step="0.01"
                value={generatorBill.perLitreAmount}
                onChange={(e) =>
                  setGeneratorBill((prev) => ({ ...prev, perLitreAmount: e.target.value, month: bulkMonth }))
                }
                disabled={!bulkMonth || !filters.hostel || loadingGeneratorBill || savingGeneratorBill}
                placeholder="₹ per litre"
                className="w-full rounded-md border border-amber-300 bg-white px-2.5 py-1.5 text-[11px] sm:text-xs focus:border-amber-500 focus:ring-2 focus:ring-amber-500 disabled:bg-gray-100"
              />
              <button
                type="button"
                onClick={handleSaveGeneratorBill}
                disabled={!bulkMonth || !filters.hostel || loadingGeneratorBill || savingGeneratorBill}
                className={`rounded-md px-3 py-1.5 text-[11px] sm:text-xs font-medium whitespace-nowrap ${
                  bulkMonth && filters.hostel && !loadingGeneratorBill && !savingGeneratorBill
                    ? 'bg-amber-600 text-white hover:bg-amber-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {savingGeneratorBill ? 'Saving...' : 'Save Generator'}
              </button>
            </div>
          </div>
          <p className="mt-2 text-[11px] sm:text-xs text-amber-800">
            {loadingGeneratorBill
              ? 'Loading saved amount...'
              : !filters.hostel
                ? 'Select a hostel to manage that hostel\'s generator bill.'
                : bulkMonth
                ? `Saved total for ${bulkMonth}: ₹${Number(generatorBill.savedAmount || 0).toFixed(2)} (split across hostel eligible students)`
                : 'Select a billing month to manage the generator bill.'}
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
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="sm:hidden space-y-4">
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
                      <h3 className="font-semibold text-gray-900 text-base">
                        <button
                          type="button"
                          onClick={() => handleOpenRoomOccupants(bill.roomId)}
                          className="text-left hover:text-blue-700 hover:underline"
                          title="View live active students"
                        >
                          <div className="flex items-center gap-2">
                            <span>Room {bill.roomNumber}</span>
                            {isAlreadyBilled && !editingBills.has(bill.roomId) && (
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
                      <div className="flex items-center gap-3">
                        <label className="block text-xs font-medium text-gray-700 whitespace-nowrap">
                          Start
                        </label>
                        <input
                          type="number"
                          value={editingBills.has(bill.roomId) ? bill.startUnits : (isAlreadyBilled ? startUnits : bill.startUnits)}
                          onChange={(e) => handleBulkBillChange(bill.roomId, 'startUnits', e.target.value)}
                          disabled={isAlreadyBilled && !editingBills.has(bill.roomId)}
                          className={`flex-1 px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors ${
                            isAlreadyBilled && !editingBills.has(bill.roomId) 
                              ? 'bg-gray-100 text-gray-500 cursor-not-allowed' 
                              : 'border-gray-300'
                          }`}
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
                          value={editingBills.has(bill.roomId) ? bill.endUnits : (isAlreadyBilled ? endUnits : bill.endUnits)}
                          onChange={(e) => handleBulkBillChange(bill.roomId, 'endUnits', e.target.value)}
                          disabled={isAlreadyBilled && !editingBills.has(bill.roomId)}
                          className={`flex-1 px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors ${
                            !isValid && !isAlreadyBilled ? 'border-red-500 bg-red-50' : 
                            isAlreadyBilled && !editingBills.has(bill.roomId) 
                              ? 'bg-gray-100 text-gray-500 cursor-not-allowed border-gray-300' 
                              : 'border-gray-300'
                          }`}
                        />
                      </div>
                      {!isValid && !isAlreadyBilled && (
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
                        {isValid && (
                          <button
                            type="button"
                            onClick={() => handleOpenRoomOccupants(bill.roomId, total)}
                            className="mt-1 text-[10px] text-blue-600 hover:text-blue-800 hover:underline font-medium"
                            title="Preview student bill shares"
                          >
                            Preview Shares
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons for Mobile */}
                    <div className="flex gap-2">
                      {isAlreadyBilled && !editingBills.has(bill.roomId) ? (
                        <>
                          <button
                            onClick={() => handleEditBill(bill.roomId)}
                            disabled={!canManageBills}
                            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all duration-200 ${canManageBills
                              ? 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 shadow-sm'
                              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                              }`}
                          >
                            Edit Bill
                          </button>
                          <button
                            onClick={() => handleSyncBillDemands(bill.roomId)}
                            disabled={!canManageBills || syncingRoomId === bill.roomId || !savedFeeHead.id}
                            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                              canManageBills && syncingRoomId !== bill.roomId && savedFeeHead.id
                                ? 'bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800 shadow-sm'
                                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            }`}
                            title={
                              !savedFeeHead.id
                                ? 'Save a fee head in Settings first'
                                : 'Create missing fee demands in Fees DB'
                            }
                          >
                            {syncingRoomId === bill.roomId ? 'Syncing…' : 'Sync Demands'}
                          </button>
                        </>
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
      <div className="hidden sm:block bg-white rounded-lg shadow-sm p-3 text-xs">
        {/* Billing Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-xs">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">Room</th>
                <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">Meter Readings</th>
                <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider"></th>
                <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider"></th>
                <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider"></th>
                <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">Rate</th>
                <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">Consumption</th>
                <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">Total</th>
                <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">Actions</th>
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
                        <button
                          type="button"
                          onClick={() => handleOpenRoomOccupants(bill.roomId)}
                          className="text-left font-medium text-gray-900 hover:text-blue-700 hover:underline"
                          title="View live active students"
                        >
                          Room {bill.roomNumber}
                          {getRoomHostelCategoryText(bill) ? (
                            <span className="ml-1.5 text-xs font-normal text-gray-500">
                              · {getRoomHostelCategoryText(bill)}
                            </span>
                          ) : null}
                        </button>
                        <div className="flex items-center gap-2 mt-1">
                          {isDualMeter && (
                            <span className="px-2 py-0.5 text-xs text-white bg-blue-600 rounded-full">Dual</span>
                          )}
                          {isAlreadyBilled && !editingBills.has(bill.roomId) && (
                            <span className="px-2 py-0.5 text-xs text-white bg-green-600 rounded-full">Billed</span>
                          )}
                          {editingBills.has(bill.roomId) && (
                            <span className="px-2 py-0.5 text-xs text-white bg-orange-600 rounded-full">Editing</span>
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
                        {isValid && (
                          <button
                            type="button"
                            onClick={() => handleOpenRoomOccupants(bill.roomId, total)}
                            className="block text-[10px] text-blue-600 hover:text-blue-800 hover:underline font-medium mt-0.5"
                            title="Preview student bill shares"
                          >
                            Preview Shares
                          </button>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex gap-1">
                          {isAlreadyBilled && !editingBills.has(bill.roomId) ? (
                            <>
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
                              <button
                                onClick={() => handleSyncBillDemands(bill.roomId)}
                                disabled={!canManageBills || syncingRoomId === bill.roomId || !savedFeeHead.id}
                                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                                  canManageBills && syncingRoomId !== bill.roomId && savedFeeHead.id
                                    ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                }`}
                                title={
                                  !savedFeeHead.id
                                    ? 'Save a fee head in Settings first'
                                    : 'Create missing fee demands in Fees DB'
                                }
                              >
                                {syncingRoomId === bill.roomId ? 'Syncing…' : 'Sync'}
                              </button>
                            </>
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

      {/* Live occupants modal (billing tab room click) */}
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
                  Past joiners: full month. Mid-month joiners: joining day → month end (calendar days).
                  Occupants: {occupantsModal.eligibleCount ?? 0}/{occupantsModal.totalLive ?? 0}
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
                <>
                  {(() => {
                    const year = parseInt(bulkMonth.slice(0, 4));
                    const month = parseInt(bulkMonth.slice(5, 7)) - 1;
                    const monthStart = new Date(year, month, 1);
                    const monthEnd = new Date(year, month + 1, 0, 23, 59, 59, 999);
                    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();

                    // Split mode matches backend: mid-month joiner among all month-overlapping occupants
                    const hasNewJoiningInModal = occupantsModal.students.some((s) => {
                      if (!s.joinedDate) return false;
                      const joined = new Date(s.joinedDate);
                      return joined >= monthStart && joined <= monthEnd;
                    });

                    const eligibleStudents = occupantsModal.students.filter((s) => s.eligibleForDemand);

                    const eligiblePastJoiners = eligibleStudents.filter(
                      (s) => s.joinedDate && new Date(s.joinedDate) < monthStart
                    );
                    const eligibleNewJoiners = eligibleStudents.filter((s) => {
                      if (!s.joinedDate) return false;
                      const joined = new Date(s.joinedDate);
                      return joined >= monthStart && joined <= monthEnd;
                    });

                    const getStayBillingDays = (joinedDate) => {
                      if (!joinedDate) return totalDaysInMonth;
                      const joined = new Date(joinedDate);
                      if (Number.isNaN(joined.getTime()) || joined < monthStart) return totalDaysInMonth;
                      if (joined > monthEnd) return 0;
                      const joinDayStart = new Date(joined.getFullYear(), joined.getMonth(), joined.getDate());
                      const monthEndDay = new Date(year, month, totalDaysInMonth);
                      const days =
                        Math.floor((monthEndDay.getTime() - joinDayStart.getTime()) / (24 * 60 * 60 * 1000)) + 1;
                      return Math.max(0, Math.min(days, totalDaysInMonth));
                    };

                    const totalBillingDays = eligibleStudents.reduce(
                      (sum, s) => sum + getStayBillingDays(s.joinedDate),
                      0
                    );

                    return (
                      <>
                        {occupantsModal.previewTotalAmount !== null && (
                          <div className="mb-4">
                            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs">
                              <p className="font-semibold text-gray-700 mb-1">
                                Previewing Room Total Bill: ₹{occupantsModal.previewTotalAmount.toFixed(2)}
                              </p>
                              {hasNewJoiningInModal ? (
                                <p className="text-blue-700">
                                  ℹ️ <strong>Mixed-Joiner Split Active:</strong> Room has mid-month new joiners.
                                  <br />
                                  · Past joiners: <strong>{eligiblePastJoiners.length}</strong> (pay for all{' '}
                                  <strong>{totalDaysInMonth} days</strong>)
                                  <br />
                                  · New joiners this month: <strong>{eligibleNewJoiners.length}</strong>{' '}
                                  (joining day → month end)
                                  <br />
                                  Total Billing Days: <span className="font-semibold">{totalBillingDays}</span>
                                </p>
                              ) : (
                                <p className="text-gray-600">
                                  ℹ️ <strong>Standard Equal Split Active:</strong> No mid-month new joiners. Split is divided equally among occupants.
                                  <br />
                                  Total Occupants: <span className="font-semibold">{eligibleStudents.length}</span>
                                </p>
                              )}
                            </div>
                          </div>
                        )}

                        {eligibleStudents.length === 0 ? (
                          <p className="py-6 text-center text-sm text-gray-500">
                            No students to bill for this room in the selected month.
                          </p>
                        ) : (
                          <ul className="divide-y divide-gray-100">
                            {eligibleStudents.map((s) => {
                              const billingDays = getStayBillingDays(s.joinedDate);
                              let calculatedShare = 0;
                              if (occupantsModal.previewTotalAmount !== null) {
                                if (hasNewJoiningInModal) {
                                  if (totalBillingDays > 0) {
                                    const costPerDay = occupantsModal.previewTotalAmount / totalBillingDays;
                                    calculatedShare = Math.round(billingDays * costPerDay);
                                  } else {
                                    calculatedShare = Math.round(
                                      occupantsModal.previewTotalAmount / eligibleStudents.length
                                    );
                                  }
                                } else {
                                  calculatedShare = Math.round(
                                    occupantsModal.previewTotalAmount / eligibleStudents.length
                                  );
                                }
                              }

                              return (
                                <li key={s._id || s.hostelRequestId || s.admissionNumber} className="py-2.5">
                                  <div className="flex items-start justify-between gap-3">
                                    <div>
                                      <p className="text-sm font-medium text-gray-900">{s.name || '—'}</p>
                                      <p className="text-xs text-gray-500">
                                        {s.rollNumber || 'No roll'}
                                        {s.admissionNumber ? ` · Adm ${s.admissionNumber}` : ''}
                                      </p>
                                      <p className="mt-0.5 text-xs text-gray-500">
                                        Billing days:{' '}
                                        <span className="font-medium text-gray-800">{billingDays}</span>
                                      </p>
                                      {s.joinedDate && (() => {
                                        const joined = new Date(s.joinedDate);
                                        const isPast = joined < monthStart;
                                        return (
                                          <p className="text-[10px] text-gray-400 mt-0.5">
                                            Joined Room: {joined.toLocaleDateString('en-IN')}
                                            {isPast ? (
                                              <span className="ml-1 text-purple-600 font-medium">
                                                (full {totalDaysInMonth} days)
                                              </span>
                                            ) : (
                                              <span className="ml-1 text-blue-600 font-medium">
                                                ({billingDays} days: join → month end)
                                              </span>
                                            )}
                                          </p>
                                        );
                                      })()}
                                    </div>
                                    <div className="text-right space-y-1">
                                      <div className="flex flex-col sm:flex-row items-end sm:items-center justify-end gap-1">
                                        <span className="inline-block rounded-full px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800">
                                          Eligible
                                        </span>
                                        {s.hostelRequestStatus === 'expired' && (
                                          <span className="inline-block rounded-full px-2 py-0.5 text-xs font-medium bg-red-100 text-red-800">
                                            Inactive
                                          </span>
                                        )}
                                      </div>
                                      {s.academicYear && (
                                        <p className="mt-1 text-xs text-gray-400">{s.academicYear}</p>
                                      )}
                                      {occupantsModal.previewTotalAmount !== null && (
                                        <p className="mt-1.5 text-sm font-bold text-green-700">
                                          Share: ₹{calculatedShare}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </>
                    );
                  })()}
                </>
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

      {/* Sync demands result modal */}
      {syncResultModal.open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={closeSyncResultModal}
        >
          <div
            className={`w-full rounded-lg bg-white shadow-xl ${
              syncResultModal.mode === 'all' ? 'max-w-3xl' : 'max-w-2xl'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {(() => {
              const fmt = (n) =>
                n == null || Number.isNaN(Number(n))
                  ? '—'
                  : `₹${Number(n).toLocaleString('en-IN', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}`;
              const statusClass = (status) => {
                switch (status) {
                  case 'created':
                    return 'bg-green-100 text-green-800';
                  case 'updated':
                    return 'bg-blue-100 text-blue-800';
                  case 'removed':
                    return 'bg-amber-100 text-amber-800';
                  case 'failed':
                  case 'skipped':
                    return 'bg-red-100 text-red-800';
                  default:
                    return 'bg-gray-100 text-gray-700';
                }
              };

              const renderRoomBlock = (roomNumber, d, key) => {
                const bill = d?.bill || {};
                const eligible = d?.eligibleStudents || [];
                const ineligible = d?.ineligibleStudents || [];
                return (
                  <div key={key} className="rounded-lg border border-gray-200 overflow-hidden">
                    <div className="bg-gray-50 px-3 py-2 border-b border-gray-200 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">Room {roomNumber}</p>
                        <p className="text-[11px] text-gray-500">
                          Total {fmt(bill.total)} · Electricity {fmt(bill.sharePerStudent ?? d?.sharePerStudent)} · Generator {fmt(bill.generatorAmount ?? d?.generatorAmount ?? 0)} · Final {fmt(bill.totalPerStudent ?? ((bill.sharePerStudent ?? d?.sharePerStudent ?? 0) + (bill.generatorAmount ?? d?.generatorAmount ?? 0)))} ·{' '}
                          {d?.eligibleCount ?? eligible.length}/{d?.occupantCount ?? '—'} eligible
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-1.5 text-[10px]">
                        {d?.created ? (
                          <span className="rounded-full bg-green-100 px-2 py-0.5 text-green-800">
                            {d.created} created
                          </span>
                        ) : null}
                        {d?.updated ? (
                          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-blue-800">
                            {d.updated} updated
                          </span>
                        ) : null}
                        {d?.removed ? (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-800">
                            {d.removed} removed
                          </span>
                        ) : null}
                        {d?.failed ? (
                          <span className="rounded-full bg-red-100 px-2 py-0.5 text-red-800">
                            {d.failed} failed
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <div className="px-3 py-2 space-y-3">
                      <div>
                        <p className="text-xs font-semibold text-gray-700 mb-1">
                          Eligible ({eligible.length})
                        </p>
                        {eligible.length === 0 ? (
                          <p className="text-xs text-gray-500 py-1">
                            No students billed for this room.
                          </p>
                        ) : (
                          <ul className="divide-y divide-gray-100 rounded border border-gray-100">
                            {eligible.map((s) => (
                              <li
                                key={s.studentId || s.rollNumber || s.admissionNumber}
                                className="flex items-start justify-between gap-3 px-2.5 py-2"
                              >
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-gray-900 truncate">
                                    {s.name || '—'}
                                  </p>
                                  <p className="text-[11px] text-gray-500">
                                    {s.rollNumber || 'No roll'}
                                    {s.admissionNumber ? ` · Adm ${s.admissionNumber}` : ''}
                                    {s.attendanceDays != null ? ` · ${s.attendanceDays} days` : ''}
                                  </p>
                                </div>
                                <div className="text-right shrink-0">
                                  <p className="text-sm font-semibold text-gray-900">{fmt(s.share)}</p>
                                  <p className="text-[10px] text-gray-500">
                                    Elec {fmt(s.electricityShare)} + Gen {fmt(s.generatorShare || 0)}
                                  </p>
                                  <span
                                    className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${statusClass(
                                      s.demandStatus
                                    )}`}
                                  >
                                    {s.demandStatus || 'synced'}
                                  </span>
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                      {ineligible.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-gray-700 mb-1">
                            Not eligible ({ineligible.length})
                          </p>
                          <ul className="divide-y divide-amber-50 rounded border border-amber-100 bg-amber-50/40">
                            {ineligible.map((s) => (
                              <li
                                key={s.studentId || s.rollNumber || s.admissionNumber}
                                className="flex items-center justify-between gap-3 px-2.5 py-1.5"
                              >
                                <div>
                                  <p className="text-sm text-gray-900">{s.name || '—'}</p>
                                  <p className="text-[11px] text-gray-500">
                                    {s.rollNumber || 'No roll'}
                                  </p>
                                </div>
                                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800">
                                  Not billed
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                );
              };

              if (syncResultModal.mode === 'all') {
                const roomRows = syncResultModal.rooms || [];
                const okRooms = roomRows.filter((r) => r.ok);
                const failRooms = roomRows.filter((r) => !r.ok);
                const totalEligible = okRooms.reduce(
                  (sum, r) => sum + (r.data?.eligibleCount || 0),
                  0
                );
                const totalCreated = okRooms.reduce((sum, r) => sum + (r.data?.created || 0), 0);
                const totalUpdated = okRooms.reduce((sum, r) => sum + (r.data?.updated || 0), 0);
                const totalRemoved = okRooms.reduce((sum, r) => sum + (r.data?.removed || 0), 0);
                const grandBillTotal = okRooms.reduce(
                  (sum, r) => sum + (Number(r.data?.bill?.total) || 0),
                  0
                );
                const grandGeneratorTotal = okRooms.reduce(
                  (sum, r) =>
                    sum +
                    (Number(r.data?.generatorAmount ?? r.data?.bill?.generatorAmount) || 0) *
                      (Number(r.data?.eligibleCount) || 0),
                  0
                );

                return (
                  <>
                    <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
                      <div>
                        <h3 className="text-base font-semibold text-gray-900">
                          Sync All complete
                        </h3>
                        <p className="text-xs text-gray-500">
                          Month {syncResultModal.month} · {okRooms.length} room(s) synced
                          {failRooms.length ? ` · ${failRooms.length} failed` : ''}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={closeSyncResultModal}
                        className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                      >
                        <XMarkIcon className="h-5 w-5" />
                      </button>
                    </div>

                    <div className="max-h-[70vh] overflow-y-auto px-4 py-3 space-y-4">
                      <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
                          Overall summary
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                          <div>
                            <p className="text-[11px] text-gray-500">Rooms</p>
                            <p className="text-sm font-semibold text-gray-900">{okRooms.length}</p>
                          </div>
                          <div>
                            <p className="text-[11px] text-gray-500">Bill totals</p>
                            <p className="text-sm font-semibold text-gray-900">{fmt(grandBillTotal)}</p>
                          </div>
                          <div>
                            <p className="text-[11px] text-gray-500">Generator add-on</p>
                            <p className="text-sm font-semibold text-gray-900">{fmt(grandGeneratorTotal)}</p>
                          </div>
                          <div>
                            <p className="text-[11px] text-gray-500">Eligible students</p>
                            <p className="text-sm font-semibold text-gray-900">{totalEligible}</p>
                          </div>
                          <div>
                            <p className="text-[11px] text-gray-500">Demands</p>
                            <p className="text-sm font-semibold text-gray-900">
                              {totalCreated} new · {totalUpdated} upd · {totalRemoved} rem
                            </p>
                          </div>
                        </div>
                      </div>

                      {failRooms.length > 0 && (
                        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2">
                          <p className="text-xs font-semibold text-red-800 mb-1">Failed rooms</p>
                          <ul className="text-xs text-red-700 space-y-0.5">
                            {failRooms.map((r) => (
                              <li key={r.roomId}>
                                Room {r.roomNumber}: {r.error || 'Failed'}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div className="space-y-3">
                        <h4 className="text-sm font-semibold text-gray-900">
                          Room-wise eligible students
                        </h4>
                        {okRooms.length === 0 ? (
                          <p className="text-sm text-gray-500">No rooms synced successfully.</p>
                        ) : (
                          okRooms.map((r) =>
                            renderRoomBlock(r.roomNumber, r.data, r.roomId)
                          )
                        )}
                      </div>
                    </div>

                    <div className="border-t border-gray-200 px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={closeSyncResultModal}
                        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                      >
                        Done
                      </button>
                    </div>
                  </>
                );
              }

              const d = syncResultModal.data || {};
              const bill = d.bill || {};

              return (
                <>
                  <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
                    <div>
                      <h3 className="text-base font-semibold text-gray-900">
                        Sync complete — Room {syncResultModal.roomNumber || bill.roomNumber}
                      </h3>
                      <p className="text-xs text-gray-500">
                        Month {syncResultModal.month || bill.month}
                        {d.feeHeadName ? ` · Fee head: ${d.feeHeadName}` : ''}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={closeSyncResultModal}
                      className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="max-h-[70vh] overflow-y-auto px-4 py-3 space-y-4">
                    {renderRoomBlock(
                      syncResultModal.roomNumber || bill.roomNumber,
                      d,
                      'single'
                    )}
                  </div>

                  <div className="border-t border-gray-200 px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={closeSyncResultModal}
                      className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                    >
                      Done
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Reports Tab */}
      {activeTab === 'reports' && (
        <div className="space-y-3">
          {/* Compact Filters */}
          <div className="bg-white rounded-lg shadow-sm p-3">
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
              <select
                name="hostel"
                value={filters.hostel}
                onChange={handleFilterChange}
                className="px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Hostels</option>
                {hostels.map(h => (
                  <option key={h._id || h.id || h.name} value={getId(h._id || h)}>
                    {getHostelLabel(h)}
                  </option>
                ))}
              </select>
              <select
                name="category"
                value={filters.category}
                onChange={handleFilterChange}
                disabled={!filters.hostel}
                className="px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
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
                                {getCategoryLabel(roomData.category) || '-'}
                              </span>
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5">
                              {getHostelLabel(roomData.hostel || roomData.gender) || '-'}
                            </div>
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
                                {getCategoryLabel(roomData.category) || '-'}
                              </td>
                              <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">
                                {getHostelLabel(roomData.hostel || roomData.gender) || '-'}
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

          <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">Fee Head for Demands</h2>
            <p className="text-sm text-gray-600 mb-4">
              Select the fee head from Fee Management. When an electricity bill is saved for a room,
              each occupant (active hostel request for that month) gets an equal share and a demand
              is created/updated under this fee head in Fees DB.
            </p>

            {savedFeeHead.id && (
              <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
                Currently mapped:{' '}
                <span className="font-semibold">
                  {savedFeeHead.code ? `${savedFeeHead.code} — ` : ''}
                  {savedFeeHead.name || savedFeeHead.id}
                </span>
              </div>
            )}

            <div className="max-w-lg space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fee Head
                </label>
                <select
                  value={selectedFeeHeadId}
                  onChange={(e) => setSelectedFeeHeadId(e.target.value)}
                  disabled={loadingFeeHeads || savingSettings}
                  className="w-full px-4 py-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                >
                  <option value="">
                    {loadingFeeHeads ? 'Loading fee heads…' : 'Select a fee head'}
                  </option>
                  {feeHeads.map((head) => (
                    <option key={head._id} value={head._id}>
                      {(head.code ? `${head.code} — ` : '') + (head.name || head._id)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleSaveFeeHead}
                  disabled={!selectedFeeHeadId || savingSettings || loadingFeeHeads}
                  className={`px-6 py-3 text-sm font-medium rounded-lg transition-colors ${
                    !selectedFeeHeadId || savingSettings || loadingFeeHeads
                      ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {savingSettings ? 'Saving…' : 'Save Fee Head'}
                </button>
                <button
                  onClick={fetchFeeHeads}
                  disabled={loadingFeeHeads || savingSettings}
                  className="px-6 py-3 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  {loadingFeeHeads ? 'Loading…' : 'Refresh Fee Heads'}
                </button>
              </div>
            </div>
          </div>

          {/* How Electricity Bills Are Calculated */}
          <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
              <span>⚡</span> How Electricity Bills Are Calculated
            </h2>
            <p className="text-sm text-gray-500 mb-6">
              Month-by-month flow used when saving room bills and generator diesel. Use{' '}
              <strong>Preview Shares</strong> on a room total to see the electricity split before saving.
            </p>

            <div className="space-y-5">

              {/* Step 1 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold">1</div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">Room meter → electricity total</p>
                  <p className="text-sm text-gray-600 mt-1">
                    Start and end readings give consumption (End − Start). Room electricity total =
                    Consumption × Rate. Dual-meter rooms sum both meters into one room total.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold">2</div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">Find occupants for that month</p>
                  <p className="text-sm text-gray-600 mt-1">
                    Anyone whose hostel stay in that room <strong>overlaps the billing month</strong>
                    (still active, or left mid-month) is included. Shares are based on stay dates,
                    not attendance cutoffs.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold">3</div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">Partial-month occupancy rule</p>
                  <p className="text-sm text-gray-600 mt-1">
                    If a room has any student who <strong>joins mid-month</strong> or <strong>leaves during the month (NOC / hostel exit)</strong>,
                    the bill is split by <strong>occupied days</strong>, not by equal room share.
                    <br />
                    <strong>Existing student</strong> → full calendar month<br />
                    <strong>Mid-month joiner</strong> → joining date → month end (inclusive)<br />
                    <strong>Mid-month leaver / NOC</strong> → month start → left date (inclusive)<br />
                    <strong>Joined and left in same month</strong> → joining date → left date (inclusive)
                  </p>
                </div>
              </div>

              {/* Step 4 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-sm font-bold">4</div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">Split the room electricity total</p>
                  <p className="text-sm text-gray-600 mt-1">
                    If <strong>every student stayed for the full month</strong>, the room is divided equally.
                    If <strong>any student joins or leaves during the month</strong>, the room uses proportional day-based billing.
                  </p>
                  <div className="mt-3 grid sm:grid-cols-2 gap-3">
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                      <p className="text-xs font-semibold text-gray-700 mb-1">Equal split</p>
                      <p className="text-xs text-gray-600">
                        No mid-month occupancy changes in the room. Everyone pays the same.<br />
                        <code className="bg-gray-200 px-1 rounded">Share = Room Total ÷ Occupant Count</code>
                      </p>
                    </div>
                    <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                      <p className="text-xs font-semibold text-blue-800 mb-1">Partial-month split</p>
                      <p className="text-xs text-blue-700">
                        At least one student joins or leaves mid-month.<br />
                        Each student pays for their occupied days only.<br />
                        <code className="bg-blue-100 px-1 rounded">Share = (My Days ÷ Total Billing Days) × Room Total</code>
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 5 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center text-sm font-bold">5</div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">Generator (hostel diesel pool)</p>
                  <p className="text-sm text-gray-600 mt-1">
                    Diesel litres × ₹ per litre = <strong>hostel generator total</strong> for the month.
                    That total is split across <strong>all students in the hostel</strong> for that month
                    using the <strong>same stay-day logic</strong> (hostel-wide, not per room).
                  </p>
                </div>
              </div>

              {/* Step 6 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center text-sm font-bold">6</div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">Final amount → fee demand</p>
                  <p className="text-sm text-gray-600 mt-1">
                    <code className="bg-gray-100 px-1 rounded">Final = Electricity share + Generator share</code>
                    <br />
                    Posted to Fees under the configured fee head above. Editing a bill later updates the demand.
                  </p>
                </div>
              </div>

              {/* Example */}
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                <p className="text-xs font-bold text-amber-800 mb-3">Examples — partial-month occupancy split</p>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 text-xs text-amber-700 leading-relaxed">
                  <div className="rounded-lg border border-amber-200 bg-white/70 p-3">
                    <p className="font-semibold text-amber-800 mb-1">Example 1 — Existing student + mid-month joiner</p>
                    <p>
                      Room 306 · July 2026 (31 days) · Room electricity total <strong>₹1,332</strong><br />
                      • Student A: existing student → <strong>31 days</strong><br />
                      • Student B: joined 15 Jul → <strong>17 days</strong> (15–31)<br /><br />
                      Total billing days = 31 + 17 = <strong>48</strong><br />
                      Cost per day = ₹1,332 ÷ 48 = <strong>₹27.75</strong><br />
                      A = 31 × ₹27.75 = <strong>₹860</strong> · B = 17 × ₹27.75 = <strong>₹472</strong>
                    </p>
                  </div>

                  <div className="rounded-lg border border-amber-200 bg-white/70 p-3">
                    <p className="font-semibold text-amber-800 mb-1">Example 2 — Existing student + NOC student</p>
                    <p>
                      Student B left on <strong>20 Jul</strong>.<br />
                      • Student A: stayed entire month → <strong>31 days</strong><br />
                      • Student B: left on 20 Jul → <strong>20 days</strong> (1–20)<br /><br />
                      Total billing days = 31 + 20 = <strong>51</strong><br />
                      Cost per day = ₹1,332 ÷ 51 = <strong>₹26.12</strong><br />
                      A = 31 × ₹26.12 = <strong>₹809.72</strong> · B = 20 × ₹26.12 = <strong>₹522.28</strong>
                    </p>
                  </div>

                  <div className="rounded-lg border border-amber-200 bg-white/70 p-3">
                    <p className="font-semibold text-amber-800 mb-1">Example 3 — Joiner and NOC student in same room</p>
                    <p>
                      • Student A: existing student → <strong>31 days</strong><br />
                      • Student B: joined 15 Jul → <strong>17 days</strong><br />
                      • Student C: left 10 Jul → <strong>10 days</strong><br /><br />
                      Total billing days = 31 + 17 + 10 = <strong>58</strong><br />
                      Cost per day = ₹1,332 ÷ 58 = <strong>₹22.97</strong><br />
                      A = 31 × ₹22.97 = <strong>₹712.07</strong> · B = 17 × ₹22.97 = <strong>₹390.49</strong> · C = 10 × ₹22.97 = <strong>₹229.70</strong>
                    </p>
                  </div>

                  <div className="rounded-lg border border-amber-200 bg-white/70 p-3">
                    <p className="font-semibold text-amber-800 mb-1">Example 4 — Student joined and left in same month</p>
                    <p>
                      Student A stayed full month: 1–31 Jul → <strong>31 days</strong><br />
                      Student B joined 10 Jul and got NOC on 22 Jul → <strong>13 days</strong> (10–22)<br /><br />
                      If the room electricity total is <strong>₹1,000</strong>:<br />
                      Total billing days = 31 + 13 = <strong>44</strong><br />
                      Cost per day = ₹1,000 ÷ 44 = <strong>₹22.73</strong><br />
                      A = 31 × ₹22.73 = <strong>₹704.63</strong> · B = 13 × ₹22.73 = <strong>₹295.49</strong>
                    </p>
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>
      )}
    </div>
  );
};

export default ElectricityBills; 