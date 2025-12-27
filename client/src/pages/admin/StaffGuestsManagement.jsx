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
  CurrencyDollarIcon,
  DocumentArrowDownIcon
} from '@heroicons/react/24/outline';
import LoadingSpinner from '../../components/LoadingSpinner';
import SEO from '../../components/SEO';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const StaffGuestsManagement = () => {
  const [activeTab, setActiveTab] = useState('management');
  const [staffGuests, setStaffGuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingStaffGuest, setEditingStaffGuest] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedStaffGuest, setSelectedStaffGuest] = useState(null);
  const [showRenewalModal, setShowRenewalModal] = useState(false);
  const [renewalForm, setRenewalForm] = useState({
    selectedMonth: '',
    roomNumber: '',
    bedNumber: ''
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterGender, setFilterGender] = useState('all');
  const [stats, setStats] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  // Get current month in YYYY-MM format
  const getCurrentMonth = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  };

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
    stayType: 'daily',
    selectedMonth: getCurrentMonth(),
    hostelId: '',
    categoryId: '',
    roomId: '',
    roomNumber: '', // Legacy support
    bedNumber: '',
    dailyRate: '',
    chargeType: 'per_day',
    monthlyFixedAmount: '',
    photo: null,
    existingPhoto: null
  });
  const [hostels, setHostels] = useState([]);
  const [categories, setCategories] = useState([]);
  const [roomsWithAvailability, setRoomsWithAvailability] = useState([]);
  const [loadingHostels, setLoadingHostels] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingRooms, setLoadingRooms] = useState(false);

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
    monthlyFixedAmount: 3000,
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

  const fetchHostels = async () => {
    setLoadingHostels(true);
    try {
      const response = await api.get('/api/hostels');
      if (response.data.success) {
        setHostels(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching hostels:', error);
      toast.error('Failed to fetch hostels');
    } finally {
      setLoadingHostels(false);
    }
  };

  const fetchCategories = async (hostelId) => {
    if (!hostelId) {
      setCategories([]);
      return;
    }
    setLoadingCategories(true);
    try {
      const response = await api.get(`/api/hostels/${hostelId}/categories`);
      if (response.data.success) {
        setCategories(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error('Failed to fetch categories');
    } finally {
      setLoadingCategories(false);
    }
  };

  const fetchRoomsForStaff = React.useCallback(async () => {
    if (!formData.categoryId || !formData.hostelId) {
      setRoomsWithAvailability([]);
      return;
    }

    setLoadingRooms(true);
    try {
      // Fetch rooms based on hostel and category
      const response = await api.get('/api/admin/rooms/bed-availability', {
        params: {
          hostel: formData.hostelId,
          category: formData.categoryId
        }
      });
      if (response.data.success) {
        setRoomsWithAvailability(response.data.data.rooms || []);
      }
    } catch (error) {
      console.error('Error fetching rooms:', error);
      toast.error('Failed to fetch room availability');
    } finally {
      setLoadingRooms(false);
    }
  }, [formData.hostelId, formData.categoryId]);

  // Fetch hostels when form opens
  useEffect(() => {
    if (showForm) {
      fetchHostels();
    }
  }, [showForm]);

  // Fetch categories when hostel changes
  useEffect(() => {
    if (formData.hostelId && showForm) {
      fetchCategories(formData.hostelId);
    } else {
      setCategories([]);
      setRoomsWithAvailability([]);
    }
    // Reset category and room when hostel changes
    if (showForm) {
      setFormData(prev => ({ ...prev, categoryId: '', roomId: '', roomNumber: '' }));
    }
  }, [formData.hostelId, showForm]);

  // Fetch rooms when category changes
  useEffect(() => {
    if (['staff', 'warden'].includes(formData.type) && formData.categoryId && showForm) {
      fetchRoomsForStaff();
    } else {
      setRoomsWithAvailability([]);
    }
    // Reset room when category changes
    if (showForm && formData.categoryId) {
      setFormData(prev => ({ ...prev, roomId: '', roomNumber: '' }));
    }
  }, [formData.type, formData.categoryId, formData.hostelId, showForm, fetchRoomsForStaff]);


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

    // When charge type changes, reset the related fields
    if (name === 'chargeType') {
      setFormData(prev => ({
        ...prev,
        [name]: value,
        // Reset monthlyFixedAmount when switching to per_day
        monthlyFixedAmount: value === 'per_day' ? '' : prev.monthlyFixedAmount,
        // Reset dailyRate when switching to monthly_fixed (optional, but cleaner)
        dailyRate: value === 'monthly_fixed' ? '' : prev.dailyRate
      }));
    } else if (name === 'stayType' && value === 'monthly') {
      // When switching to monthly, set current month if not already set
      setFormData(prev => ({
        ...prev,
        [name]: value,
        selectedMonth: prev.selectedMonth || getCurrentMonth()
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: files ? files[0] : value
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Create a copy and inject defaults for Warden
      const dataToProcess = { ...formData };
      if (dataToProcess.type === 'warden') {
        dataToProcess.profession = 'Warden';
      }

      console.log('Form data being submitted:', dataToProcess);
      const formDataToSend = new FormData();
      Object.keys(dataToProcess).forEach(key => {
        if (key === 'existingPhoto') {
          // Skip existingPhoto as it's just for display
          return;
        }
        if (dataToProcess[key] !== null && dataToProcess[key] !== '') {
          formDataToSend.append(key, dataToProcess[key]);
        }
      });

      // Debug: Log the FormData contents
      console.log('FormData entries:');
      for (let [key, value] of formDataToSend.entries()) {
        console.log(key, value);
      }
      console.log('FormData entries:', Array.from(formDataToSend.entries()));

      if (editingStaffGuest) {
        console.log('Updating staff/guest with ID:', editingStaffGuest._id);
        const response = await api.put(`/api/admin/staff-guests/${editingStaffGuest._id}`, formDataToSend, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        console.log('Update response:', response.data);
        toast.success('Staff/Guest updated successfully');
      } else {
        console.log('Creating new staff/guest');
        const response = await api.post('/api/admin/staff-guests', formDataToSend, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        console.log('Create response:', response.data);
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
        stayType: 'daily',
        selectedMonth: getCurrentMonth(),
        hostelId: '',
        categoryId: '',
        roomId: '',
        roomNumber: '',
        bedNumber: '',
        dailyRate: '',
        chargeType: 'per_day',
        monthlyFixedAmount: '',
        photo: null,
        existingPhoto: null
      });
      fetchStaffGuests();
      fetchStats();
    } catch (error) {
      console.error('Error saving staff/guest:', error);
      toast.error(error.response?.data?.message || 'Failed to save staff/guest');
    }
  };

  const handleEdit = async (staffGuest) => {
    setEditingStaffGuest(staffGuest);

    // Populate form with existing data
    const initialFormData = {
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
      stayType: staffGuest.stayType || 'daily',
      selectedMonth: staffGuest.selectedMonth || '',
      hostelId: staffGuest.hostelId ? staffGuest.hostelId.toString() : '',
      categoryId: staffGuest.categoryId ? staffGuest.categoryId.toString() : '',
      roomId: staffGuest.roomId ? staffGuest.roomId.toString() : '',
      roomNumber: staffGuest.roomNumber || '',
      bedNumber: staffGuest.bedNumber || '',
      dailyRate: staffGuest.dailyRate || '',
      chargeType: staffGuest.chargeType || 'per_day',
      monthlyFixedAmount: staffGuest.monthlyFixedAmount || '',
      photo: null, // New photo file (if selected)
      existingPhoto: staffGuest.photo // Keep existing photo URL
    };

    setFormData(initialFormData);
    setShowForm(true);

    // Fetch hostels and populate categories/rooms if hostelId exists
    if (initialFormData.hostelId) {
      await fetchHostels();
      await fetchCategories(initialFormData.hostelId);
      if (initialFormData.categoryId) {
        await fetchRoomsForStaff();
      }
    }
  };

  const handleDelete = async (id, onSuccess) => {
    if (window.confirm('Are you sure you want to delete this staff/guest?')) {
      try {
        await api.delete(`/api/admin/staff-guests/${id}`);
        toast.success('Staff/Guest deleted successfully');
        fetchStaffGuests();
        fetchStats();
        if (onSuccess) onSuccess();
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
      stayType: 'daily',
      selectedMonth: getCurrentMonth(),
      hostelId: '',
      categoryId: '',
      roomId: '',
      roomNumber: '',
      bedNumber: '',
      dailyRate: '',
      chargeType: 'per_day',
      monthlyFixedAmount: '',
      photo: null,
      existingPhoto: null
    });
    setEditingStaffGuest(null);
    setShowForm(false);
    setRoomsWithAvailability([]);
    setCategories([]);
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

  // Helper function to check if validity has expired (for monthly basis staff)
  const checkValidityExpired = (staffGuest) => {
    // Check if staff is inactive (expired)
    if (staffGuest.type === 'staff' && !staffGuest.isActive) {
      return true;
    }

    if (staffGuest.type !== 'staff' || staffGuest.stayType !== 'monthly' || !staffGuest.selectedMonth) {
      return false;
    }

    const [year, month] = staffGuest.selectedMonth.split('-').map(Number);
    const lastDayOfMonth = new Date(year, month, 0); // Last day of selected month
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return today > lastDayOfMonth;
  };

  // Handle renewal
  const handleRenewal = async () => {
    if (!renewalForm.selectedMonth) {
      toast.error('Please select a month for renewal');
      return;
    }

    try {
      const response = await api.post(`/api/admin/staff-guests/${selectedStaffGuest._id}/renew`, {
        selectedMonth: renewalForm.selectedMonth,
        roomNumber: renewalForm.roomNumber || null,
        bedNumber: renewalForm.bedNumber || null
      });

      if (response.data.success) {
        toast.success('Staff member renewed successfully');
        setShowRenewalModal(false);
        setShowDetailModal(false);
        setRenewalForm({ selectedMonth: '', roomNumber: '', bedNumber: '' });
        fetchStaffGuests();
        fetchStats();

        // Generate admit card for the renewed period
        if (response.data.data) {
          generateStaffAdmitCardPDF(response.data.data);
        }
      }
    } catch (error) {
      console.error('Error renewing staff:', error);
      toast.error(error.response?.data?.message || 'Failed to renew staff member');
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

  const updateDailyRateSettings = async () => {
    try {
      setSettingsLoading(true);
      const response = await api.put('/api/admin/staff-guests/settings/daily-rates', {
        staffDailyRate: dailyRateSettings.staffDailyRate,
        monthlyFixedAmount: dailyRateSettings.monthlyFixedAmount
      });
      if (response.data.success) {
        setDailyRateSettings(response.data.data);
        toast.success('Settings updated successfully');
        // Refresh staff/guests to show updated charges
        fetchStaffGuests();
      }
    } catch (error) {
      console.error('Error updating settings:', error);
      toast.error(error.response?.data?.message || 'Failed to update settings');
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
        // Generate PDF immediately
        await generateStaffAdmitCardPDF(response.data.data);
        toast.success('Admit card generated and downloaded successfully');
      }
    } catch (error) {
      console.error('Error generating admit card:', error);
      toast.error('Failed to generate admit card');
    } finally {
      setAdmitCardLoading(false);
    }
  };

  // Helper function to format date as dd/mm/yyyy
  const formatDateDDMMYYYY = (date) => {
    if (!date) return 'N/A';
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Generate PDF for staff/guest admit card with two copies
  const generateStaffAdmitCardPDF = async (staffGuest) => {
    try {
      console.log('Generating PDF for staff/guest:', staffGuest);

      // Pre-load photo if it's a URL and convert to base64
      let photoData = staffGuest.photo;
      if (photoData && (photoData.startsWith('http') || photoData.startsWith('https'))) {
        try {
          console.log('Loading photo from URL:', photoData);
          const response = await fetch(photoData);
          if (response.ok) {
            const blob = await response.blob();
            const reader = new FileReader();
            photoData = await new Promise((resolve, reject) => {
              reader.onloadend = () => {
                const base64String = reader.result;
                if (base64String) {
                  console.log('Photo converted to base64 successfully');
                  resolve(base64String);
                } else {
                  reject(new Error('Failed to convert image to base64'));
                }
              };
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            });
          } else {
            console.warn('Failed to fetch photo, status:', response.status);
            photoData = null;
          }
        } catch (error) {
          console.error('Error loading photo from URL:', error);
          photoData = null;
        }
      }

      // Create a copy of staffGuest with the processed photo
      const staffGuestWithPhoto = {
        ...staffGuest,
        photo: photoData
      };

      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;
      const halfPageHeight = pageHeight / 2;
      const margin = 10;
      const contentWidth = pageWidth - (margin * 2);

      const generateOneCopy = async (startY, copyLabel) => {
        if (!staffGuestWithPhoto || typeof staffGuestWithPhoto !== 'object') {
          console.error('❌ Invalid staffGuest object:', staffGuestWithPhoto);
          throw new Error('Invalid staffGuest object provided to generateOneCopy');
        }

        // For guests, charges are always 0
        const isGuest = staffGuestWithPhoto.type === 'guest';
        const dailyRate = isGuest ? 0 : (staffGuestWithPhoto.dailyRate || dailyRateSettings.staffDailyRate || 100);

        // Calculate day count - for monthly staff, calculate days in the selected month
        let dayCount = 0;
        if (!isGuest) {
          if (staffGuestWithPhoto.stayType === 'monthly' && staffGuestWithPhoto.selectedMonth) {
            const [year, month] = staffGuestWithPhoto.selectedMonth.split('-').map(Number);
            dayCount = new Date(year, month, 0).getDate(); // Days in the selected month
          } else if (staffGuestWithPhoto.checkinDate) {
            // For daily basis, calculate days between checkin and checkout
            const startDate = new Date(staffGuestWithPhoto.checkinDate);
            const endDate = staffGuestWithPhoto.checkoutDate ? new Date(staffGuestWithPhoto.checkoutDate) : new Date();
            startDate.setHours(0, 0, 0, 0);
            endDate.setHours(0, 0, 0, 0);
            const timeDiff = endDate.getTime() - startDate.getTime();
            dayCount = Math.max(0, Math.ceil(timeDiff / (1000 * 3600 * 24)));
          }
        }

        const totalCharges = isGuest ? 0 : (dailyRate * dayCount);
        const actualCharges = isGuest ? 0 : (staffGuestWithPhoto.calculatedCharges || totalCharges);
        const staffGender = staffGuestWithPhoto.gender?.toLowerCase();
        const hostelName = staffGender === 'female' ? 'Girls Hostel' : 'Boys Hostel';

        const wardenNumbers = {
          male: '+91-9493994233',
          female: '+91-8333068321',
          default: '+91-9493994233'
        };
        const securityNumber = '+91-8317612655';
        const adminNumber = '+91-9490484418';
        const wardenPhone = wardenNumbers[staffGender] || wardenNumbers.default;

        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.5);
        doc.rect(margin, startY, contentWidth, halfPageHeight - (margin * 2));

        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text(copyLabel, margin + 5, startY + 5);

        let yPos = startY + 8;
        try {
          doc.addImage('/PYDAH_LOGO_PHOTO.jpg', 'JPEG', margin + 4, yPos, 22, 12);
        } catch (error) {
          console.error('Error adding logo image:', error);
          doc.setFillColor(240, 240, 240);
          doc.rect(margin + 4, yPos, 22, 12);
          doc.setFontSize(6);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(0, 0, 0);
          doc.text('PYDAH', margin + 15, yPos + 6, { align: 'center' });
          doc.text('GROUP', margin + 15, yPos + 9, { align: 'center' });
        }

        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('Pydah Group Of Institutions', pageWidth / 2, yPos + 8, { align: 'center' });

        doc.setFontSize(8);
        doc.text('HOSTEL ADMIT CARD', pageWidth - margin - 5, yPos + 4, { align: 'right' });
        doc.setFontSize(6);
        doc.text(`${staffGuestWithPhoto.type.toUpperCase()} - ${new Date().getFullYear()}`, pageWidth - margin - 5, yPos + 8, { align: 'right' });

        yPos = startY + 24;
        doc.setDrawColor(100, 100, 100);
        doc.setLineWidth(0.3);
        doc.line(margin + 5, yPos, pageWidth - margin - 5, yPos);

        yPos += 6;
        const centerX = pageWidth / 2;
        const photoWidth = 30;
        const photoHeight = 35;
        const qrCodeX = margin + 15;
        const qrCodeY = yPos + 2;
        const qrCodeSize = 30;

        doc.setFontSize(6);
        doc.setFont('helvetica', 'bold');
        doc.text('Visit our website', qrCodeX + qrCodeSize / 2, qrCodeY - 3, { align: 'center' });

        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.3);
        doc.rect(qrCodeX, qrCodeY, qrCodeSize, qrCodeSize);

        try {
          doc.addImage('/qrcode_hms.pydahsoft.in.png', 'PNG', qrCodeX, qrCodeY, qrCodeSize, qrCodeSize);
        } catch (error) {
          console.error('Error adding QR code image:', error);
          doc.setFontSize(4);
          doc.setFont('helvetica', 'bold');
          doc.text('QR CODE', qrCodeX + qrCodeSize / 2, qrCodeY + qrCodeSize / 2 - 2, { align: 'center' });
          doc.text('PLACEHOLDER', qrCodeX + qrCodeSize / 2, qrCodeY + qrCodeSize / 2 + 2, { align: 'center' });
        }

        doc.setFontSize(6);
        doc.setFont('helvetica', 'normal');
        doc.text('www.hms.pydahsoft.in', qrCodeX + qrCodeSize / 2, qrCodeY + qrCodeSize + 4, { align: 'center' });

        const emergencyY = qrCodeY + qrCodeSize + 18;
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text('EMERGENCY CONTACTS:', qrCodeX, emergencyY);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.text(`1. Warden (${staffGender === 'female' ? 'Girls' : 'Boys'}): ${wardenPhone}`, qrCodeX, emergencyY + 5);
        doc.text(`2. Admin: ${adminNumber}`, qrCodeX, emergencyY + 10);
        doc.text(`3. Security: ${securityNumber}`, qrCodeX, emergencyY + 15);

        // Fix: Ensure Charges Summary uses consistent font styling
        const chargesSummaryX = centerX + 20;
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text('CHARGES SUMMARY:', chargesSummaryX, emergencyY);

        if (isGuest) {
          // For guests, show no charges
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7);
          doc.text(`No charges for guests`, chargesSummaryX, emergencyY + 5);
          doc.setFont('helvetica', 'bold');
          doc.text(`Total Payable: Rs.0`, chargesSummaryX, emergencyY + 10);
        } else {
          doc.setFont('helvetica', 'normal'); // Set to normal for list items
          doc.setFontSize(7);
          doc.text(`Daily Rate: Rs.${dailyRate} per day`, chargesSummaryX, emergencyY + 5);

          // Show stay type and duration
          if (staffGuestWithPhoto.stayType === 'monthly' && staffGuestWithPhoto.selectedMonth) {
            const monthName = new Date(staffGuestWithPhoto.selectedMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
            doc.text(`Stay Type: Monthly Basis`, chargesSummaryX, emergencyY + 10);
            doc.text(`Valid Month: ${monthName}`, chargesSummaryX, emergencyY + 15);
            doc.text(`Days in Month: ${dayCount} days`, chargesSummaryX, emergencyY + 20);

            // Show validity expiration warning if expired
            if (staffGuestWithPhoto.isValidityExpired) {
              doc.setFont('helvetica', 'bold');
              doc.setTextColor(255, 0, 0);
              doc.text(`⚠️ VALIDITY EXPIRED`, chargesSummaryX, emergencyY + 25);
              doc.setTextColor(0, 0, 0);
              doc.setFont('helvetica', 'normal');
            }
          } else {
            doc.text(`Stay Duration: ${dayCount} days`, chargesSummaryX, emergencyY + 10);
          }

          // Base Amount position - adjust based on monthly vs daily and expiration
          let baseAmountY;
          if (staffGuestWithPhoto.stayType === 'monthly' && staffGuestWithPhoto.selectedMonth) {
            baseAmountY = emergencyY + (staffGuestWithPhoto.isValidityExpired ? 30 : 25);
          } else {
            baseAmountY = emergencyY + 15;
          }
          doc.text(`Base Amount: Rs.${totalCharges}`, chargesSummaryX, baseAmountY);

          // Total Payable position - always 5mm below Base Amount
          const totalPayableY = baseAmountY + 5;

          if (actualCharges !== totalCharges) {
            doc.text(`- Adjustment: Rs.${totalCharges - actualCharges}`, chargesSummaryX, totalPayableY);
            doc.setFont('helvetica', 'bold');
            doc.text(`- Total Payable: Rs.${actualCharges}`, chargesSummaryX, totalPayableY + 5);
          } else {
            doc.setFont('helvetica', 'bold');
            doc.text(`- Total Payable: Rs.${actualCharges}`, chargesSummaryX, totalPayableY);
          }
        }

        // Reset to normal font for subsequent text
        doc.setFont('helvetica', 'normal');

        // Photo section
        const photoX = centerX + 35;
        const photoY = yPos + 4;
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text('PHOTO', photoX + photoWidth / 2, photoY - 4, { align: 'center' });
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.4);
        doc.rect(photoX, photoY, photoWidth, photoHeight);

        if (staffGuestWithPhoto.photo) {
          try {
            if (staffGuestWithPhoto.photo.startsWith('data:image')) {
              // Handle base64 data URLs (preferred method - already converted from URL if needed)
              doc.addImage(staffGuestWithPhoto.photo, 'JPEG', photoX, photoY, photoWidth, photoHeight);
            } else {
              // Handle other image formats or invalid URLs
              console.warn('Photo format not recognized:', staffGuestWithPhoto.photo);
              doc.setFontSize(4);
              doc.text('Photo', photoX + photoWidth / 2, photoY + photoHeight / 2, { align: 'center' });
            }
          } catch (error) {
            console.error('Error adding image to PDF:', error);
            doc.setFontSize(4);
            doc.text('Photo', photoX + photoWidth / 2, photoY + photoHeight / 2, { align: 'center' });
          }
        } else {
          // No photo available
          doc.setFontSize(4);
          doc.text('Photo', photoX + photoWidth / 2, photoY + photoHeight / 2, { align: 'center' });
        }

        // Staff details
        const detailsX = qrCodeX + qrCodeSize + 15;
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text('STAFF/GUEST DETAILS', detailsX, yPos);
        yPos += 4;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);

        const staffDetails = [
          ['Name:', String(staffGuestWithPhoto.name || '')],
          ['Type:', String(staffGuestWithPhoto.type || '')],
          ['Gender:', String(staffGuestWithPhoto.gender || '')],
          ['Profession:', String(staffGuestWithPhoto.profession || '')],
          ['Phone:', String(staffGuestWithPhoto.phoneNumber || '')],
          ['Email:', String(staffGuestWithPhoto.email || 'N/A')],
          ['Department:', String(staffGuestWithPhoto.department || 'N/A')],
          ['Purpose:', String(staffGuestWithPhoto.purpose || 'N/A')],
          ['Hostel:', String(hostelName)],
          ...(staffGuestWithPhoto.roomNumber ? [['Room:', String(staffGuestWithPhoto.roomNumber)]] : []),
          ...(staffGuestWithPhoto.bedNumber ? [['Bed:', String(staffGuestWithPhoto.bedNumber)]] : []),
          ...(staffGuestWithPhoto.stayType === 'monthly' && staffGuestWithPhoto.selectedMonth ? [
            ['Stay Type:', 'Monthly Basis'],
            ['Valid Month:', String(new Date(staffGuestWithPhoto.selectedMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' }))]
          ] : [
            ['Check-in:', formatDateDDMMYYYY(staffGuestWithPhoto.checkinDate)],
            ['Check-out:', formatDateDDMMYYYY(staffGuestWithPhoto.checkoutDate)]
          ]),
          ['Status:', String(staffGuestWithPhoto.isCheckedIn ? 'Checked In' : 'Checked Out')]
        ];

        staffDetails.forEach(([label, value]) => {
          doc.setFont('helvetica', 'bold');
          doc.text(label, detailsX, yPos);
          doc.setFont('helvetica', 'normal');
          doc.text(value || '', detailsX + 25, yPos);
          yPos += 3.5;
        });

        // Important Notes section removed as per user request
      };

      await generateOneCopy(margin, 'STAFF/GUEST COPY');

      doc.setDrawColor(100, 100, 100);
      doc.setLineWidth(0.3);
      doc.line(margin + 5, halfPageHeight, pageWidth - margin - 5, halfPageHeight);

      await generateOneCopy(halfPageHeight + 2, 'WARDEN COPY');

      const fileName = `AdmitCard_${staffGuestWithPhoto.name || 'Staff'}_${staffGuestWithPhoto.type || 'Unknown'}.pdf`;
      console.log('Saving PDF as:', fileName);
      doc.save(fileName);

      console.log('PDF generated successfully');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF. Please try again.');
    }
  };




  const printAdmitCard = () => {
    if (!admitCardData) return;
    generateStaffAdmitCardPDF(admitCardData);
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
            {/* <div className="mt-2 mb-4">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                Currently this page is in developing stage
              </span>
            </div> */}
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
            <nav className="flex flex-wrap -mb-px space-x-0 sm:space-x-8">

              {/* Management Button */}
              <button
                onClick={() => setActiveTab('management')}
                className={`w-1/2 sm:w-auto py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'management'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                <div className="flex items-center gap-1 sm:gap-2 justify-center">
                  <UserIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="text-xs sm:text-sm">Management</span>
                </div>
              </button>

              {/* Attendance Button */}
              <button
                onClick={() => setActiveTab('attendance')}
                className={`w-1/2 sm:w-auto py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'attendance'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                <div className="flex items-center gap-1 sm:gap-2 justify-center">
                  <ChartBarIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="text-xs sm:text-sm">Attendance</span>
                </div>
              </button>

              {/* Admit Card Button */}
              <button
                onClick={() => setActiveTab('admit-card')}
                className={`w-1/2 sm:w-auto py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'admit-card'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                <div className="flex items-center gap-1 sm:gap-2 justify-center">
                  <DocumentTextIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="text-xs sm:text-sm">Admit Card</span>
                </div>
              </button>

              {/* Settings Button */}
              <button
                onClick={() => setActiveTab('settings')}
                className={`w-1/2 sm:w-auto py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'settings'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                <div className="flex items-center gap-1 sm:gap-2 justify-center">
                  <CogIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="text-xs sm:text-sm">Settings</span>
                </div>
              </button>

            </nav>
          </div>
        </div>


        {/* Management Tab Content */}
        {activeTab === 'management' && (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
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
              <div className="bg-white rounded-lg shadow p-4 border-l-4 border-indigo-500">
                <div className="flex items-center gap-2">
                  <UserIcon className="w-5 h-5 text-indigo-600" />
                  <span className="text-sm font-medium text-gray-600">Total Students</span>
                </div>
                <div className="text-2xl font-bold text-indigo-900">{stats.totalStudents || 0}</div>
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
                  <option value="student">Student</option>
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
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Room</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stay Type</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Charges</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {console.log('Rendering table with staffGuests:', staffGuests)}
                      {staffGuests && staffGuests.length > 0 ? staffGuests.map((staffGuest) => (
                        <tr
                          key={staffGuest._id}
                          className="hover:bg-gray-50 cursor-pointer transition-colors"
                          onClick={() => {
                            setSelectedStaffGuest(staffGuest);
                            setShowDetailModal(true);
                          }}
                        >
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
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${staffGuest.type === 'staff'
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
                            {staffGuest.roomNumber ? (
                              <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                Room {staffGuest.roomNumber}
                                {staffGuest.bedNumber && ` - Bed ${staffGuest.bedNumber}`}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {staffGuest.type === 'staff' && staffGuest.stayType ? (
                              (() => {
                                const isExpired = checkValidityExpired(staffGuest);
                                return (
                                  <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${staffGuest.stayType === 'monthly'
                                    ? (isExpired ? 'bg-red-100 text-red-800' : 'bg-purple-100 text-purple-800')
                                    : 'bg-blue-100 text-blue-800'
                                    }`}>
                                    {staffGuest.stayType === 'monthly' ? (
                                      <>
                                        Monthly
                                        {staffGuest.selectedMonth && ` (${new Date(staffGuest.selectedMonth + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })})`}
                                        {isExpired && ' ⚠️'}
                                      </>
                                    ) : 'Daily'}
                                  </span>
                                );
                              })()
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <span className="font-medium text-green-600">
                              ₹{typeof staffGuest.calculatedCharges === 'number'
                                ? staffGuest.calculatedCharges.toLocaleString('en-IN')
                                : (staffGuest.calculatedCharges || 0)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {(() => {
                              const isExpired = checkValidityExpired(staffGuest);
                              if (isExpired) {
                                return (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                    <XMarkIcon className="w-3 h-3 mr-1" />
                                    Expired
                                  </span>
                                );
                              }
                              return staffGuest.checkInTime && !staffGuest.checkOutTime ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  <CheckCircleIcon className="w-3 h-3 mr-1" />
                                  Checked In
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                  <ClockIcon className="w-3 h-3 mr-1" />
                                  Checked Out
                                </span>
                              );
                            })()}
                          </td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan="10" className="px-6 py-12 text-center text-gray-500">
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
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${staffGuest.type === 'staff'
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
                            <span className="font-medium text-green-600">
                              ₹{typeof staffGuest.calculatedCharges === 'number'
                                ? staffGuest.calculatedCharges.toLocaleString('en-IN')
                                : (staffGuest.calculatedCharges || 0)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => generateAdmitCard(staffGuest._id)}
                              disabled={admitCardLoading}
                              className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                            >
                              <DocumentArrowDownIcon className="w-4 h-4" />
                              {admitCardLoading ? 'Generating...' : 'Generate PDF'}
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
                      onClick={() => generateStaffAdmitCardPDF(admitCardData)}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      <DocumentArrowDownIcon className="w-4 h-4" />
                      Download PDF
                    </button>
                  </div>
                  <div className="bg-white p-6 rounded-lg border-2 border-dashed border-gray-300">
                    {/* Header Section */}
                    <div className="flex items-center justify-between border-b-2 border-gray-300 pb-4 mb-6">
                      <div className="flex items-center space-x-4">
                        <div className="w-16 h-10 bg-gray-200 rounded flex items-center justify-center">
                          <span className="text-xs font-bold text-gray-600">PYDAH</span>
                        </div>
                        <div>
                          <h1 className="text-xl font-bold text-gray-900">Pydah Group Of Institutions</h1>
                          <p className="text-sm text-gray-600">HOSTEL ADMIT CARD</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-700">{admitCardData.type.toUpperCase()} - {new Date().getFullYear()}</p>
                      </div>
                    </div>

                    {/* Main Content Grid */}
                    <div className="grid grid-cols-3 gap-6 mb-6">
                      {/* QR Code Section */}
                      <div className="text-center">
                        <div className="w-20 h-20 bg-gray-200 rounded mx-auto mb-2 flex items-center justify-center">
                          <span className="text-xs text-gray-500">QR CODE</span>
                        </div>
                        <p className="text-xs text-gray-600">www.hms.pydahsoft.in</p>

                        {/* Emergency Contacts */}
                        <div className="mt-4 text-left">
                          <h4 className="text-sm font-bold text-gray-800 mb-2">EMERGENCY CONTACTS:</h4>
                          <div className="text-xs text-gray-700 space-y-1">
                            <p>1. Warden ({admitCardData.gender === 'Female' ? 'Girls' : 'Boys'}): +91-{admitCardData.gender === 'Female' ? '8333068321' : '9493994233'}</p>
                            <p>2. Admin: +91-9490484418</p>
                            <p>3. Security: +91-8317612655</p>
                          </div>
                        </div>
                      </div>

                      {/* Staff Details Section */}
                      <div>
                        <h4 className="text-sm font-bold text-gray-800 mb-3">STAFF/GUEST DETAILS</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex">
                            <span className="font-semibold text-gray-700 w-20">Name:</span>
                            <span className="text-gray-900">{admitCardData.name}</span>
                          </div>
                          <div className="flex">
                            <span className="font-semibold text-gray-700 w-20">Type:</span>
                            <span className="text-gray-900">{admitCardData.type}</span>
                          </div>
                          <div className="flex">
                            <span className="font-semibold text-gray-700 w-20">Gender:</span>
                            <span className="text-gray-900">{admitCardData.gender}</span>
                          </div>
                          <div className="flex">
                            <span className="font-semibold text-gray-700 w-20">Profession:</span>
                            <span className="text-gray-900">{admitCardData.profession}</span>
                          </div>
                          <div className="flex">
                            <span className="font-semibold text-gray-700 w-20">Phone:</span>
                            <span className="text-gray-900">{admitCardData.phoneNumber}</span>
                          </div>
                          <div className="flex">
                            <span className="font-semibold text-gray-700 w-20">Email:</span>
                            <span className="text-gray-900">{admitCardData.email || 'N/A'}</span>
                          </div>
                          <div className="flex">
                            <span className="font-semibold text-gray-700 w-20">Department:</span>
                            <span className="text-gray-900">{admitCardData.department || 'N/A'}</span>
                          </div>
                          <div className="flex">
                            <span className="font-semibold text-gray-700 w-20">Purpose:</span>
                            <span className="text-gray-900">{admitCardData.purpose || 'N/A'}</span>
                          </div>
                          <div className="flex">
                            <span className="font-semibold text-gray-700 w-20">Hostel:</span>
                            <span className="text-gray-900">{admitCardData.gender === 'Female' ? 'Girls Hostel' : 'Boys Hostel'}</span>
                          </div>
                          <div className="flex">
                            <span className="font-semibold text-gray-700 w-20">Check-in:</span>
                            <span className="text-gray-900">{formatDateDDMMYYYY(admitCardData.checkinDate)}</span>
                          </div>
                          <div className="flex">
                            <span className="font-semibold text-gray-700 w-20">Check-out:</span>
                            <span className="text-gray-900">{formatDateDDMMYYYY(admitCardData.checkoutDate)}</span>
                          </div>
                          <div className="flex">
                            <span className="font-semibold text-gray-700 w-20">Status:</span>
                            <span className="text-gray-900">{admitCardData.isCheckedIn ? 'Checked In' : 'Checked Out'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Photo and Charges Section */}
                      <div>
                        <div className="text-center mb-4">
                          <h4 className="text-sm font-bold text-gray-800 mb-2">PHOTO</h4>
                          <div className="w-24 h-28 border-2 border-gray-300 mx-auto bg-gray-100 flex items-center justify-center">
                            {admitCardData.photo ? (
                              <img
                                src={admitCardData.photo}
                                alt="Photo"
                                className="w-20 h-24 object-cover"
                              />
                            ) : (
                              <span className="text-gray-400 text-xs">Photo</span>
                            )}
                          </div>
                        </div>

                        {/* Charges Summary */}
                        <div className="mt-4">
                          <h4 className="text-sm font-bold text-gray-800 mb-2">CHARGES SUMMARY:</h4>
                          {admitCardData.type === 'guest' ? (
                            <div className="text-xs text-gray-700 space-y-1">
                              <p>• No charges for guests</p>
                              <p className="font-bold">• Total Payable: ₹0</p>
                            </div>
                          ) : (
                            <div className="text-xs text-gray-700 space-y-1">
                              <p>• Daily Rate: ₹{admitCardData.dailyRate || dailyRateSettings.staffDailyRate || 100} per day</p>
                              <p>• Stay Duration: {admitCardData.dayCount || 0} days</p>
                              <p>• Base Amount: ₹{(admitCardData.dailyRate || dailyRateSettings.staffDailyRate || 100) * (admitCardData.dayCount || 0)}</p>
                              <p className="font-bold">• Total Payable: ₹{typeof admitCardData.calculatedCharges === 'number'
                                ? admitCardData.calculatedCharges.toLocaleString('en-IN')
                                : (admitCardData.calculatedCharges || 0)}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Important Notes */}
                    <div className="border-t border-gray-300 pt-4">
                      <h4 className="text-sm font-bold text-gray-800 mb-2">IMPORTANT NOTES:</h4>
                      <div className="text-xs text-gray-700 space-y-1">
                        <p>1. Present this card at hostel entrance for verification</p>
                        <p>2. Keep this card safe during your stay</p>
                        <p>3. Report any issues to hostel administration</p>
                      </div>
                    </div>

                    <div className="mt-4 text-center text-xs text-gray-500">
                      Generated on: {new Date(admitCardData.generatedAt).toLocaleString()}<br />
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
            <div className="bg-white rounded-lg shadow p-6 w-full max-w-4xl mx-auto">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-900">Charge Settings</h2>
                <p className="text-gray-600 mt-1">Configure default charges for staff members</p>
              </div>

              <div className="max-w-md mx-auto sm:max-w-full space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Staff Daily Rate (₹)
                  </label>
                  <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
                    <CurrencyDollarIcon className="w-5 h-5 text-gray-400" />
                    <input
                      type="number"
                      value={dailyRateSettings.staffDailyRate}
                      onChange={(e) => setDailyRateSettings(prev => ({
                        ...prev,
                        staffDailyRate: parseFloat(e.target.value) || 0
                      }))}
                      className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter daily rate"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Default daily rate for per-day basis staff</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Monthly Fixed Amount (₹)
                  </label>
                  <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
                    <CurrencyDollarIcon className="w-5 h-5 text-gray-400" />
                    <input
                      type="number"
                      value={dailyRateSettings.monthlyFixedAmount}
                      onChange={(e) => setDailyRateSettings(prev => ({
                        ...prev,
                        monthlyFixedAmount: parseFloat(e.target.value) || 0
                      }))}
                      className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter monthly fixed amount"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Default monthly fixed amount for monthly basis staff (when monthly fixed charge type is selected)</p>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <button
                    onClick={updateDailyRateSettings}
                    disabled={settingsLoading}
                    className="w-full sm:w-auto px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
                  >
                    {settingsLoading ? 'Updating...' : 'Update Settings'}
                  </button>
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
                className="bg-white rounded-lg shadow-xl w-full max-w-2xl lg:max-w-5xl xl:max-w-6xl max-h-[90vh] overflow-y-auto"
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
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                          <option value="student">Student</option>
                          <option value="warden">Warden</option>
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

                      {formData.type !== 'warden' && (<div>
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
                      </div>)}

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

                      {formData.type !== 'warden' && (<div>
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
                      </div>)}

                      {['staff', 'student'].includes(formData.type) && (
                        <div>
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

                      {formData.type !== 'warden' && (<div>
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
                      </div>)}

                      {/* Stay Type Selection - Only for Staff */}
                      {formData.type === 'staff' && (
                        <div className="md:col-span-2 lg:col-span-3">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Stay Basis *
                          </label>
                          <div className="flex gap-4">
                            <label className="flex items-center">
                              <input
                                type="radio"
                                name="stayType"
                                value="daily"
                                checked={formData.stayType === 'daily'}
                                onChange={handleInputChange}
                                className="mr-2"
                              />
                              <span>Daily Basis</span>
                            </label>
                            <label className="flex items-center">
                              <input
                                type="radio"
                                name="stayType"
                                value="monthly"
                                checked={formData.stayType === 'monthly'}
                                onChange={handleInputChange}
                                className="mr-2"
                              />
                              <span>Monthly Basis</span>
                            </label>
                          </div>
                        </div>
                      )}

                      {/* Date Fields - For Daily Basis Staff or Non-Staff (excluding Warden) */}
                      {(formData.type !== 'staff' && formData.type !== 'warden') || (formData.type === 'staff' && formData.stayType === 'daily') ? (
                        <>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Check-in Date {formData.type === 'staff' && formData.stayType === 'daily' ? '*' : ''}
                            </label>
                            <input
                              type="date"
                              name="checkinDate"
                              value={formData.checkinDate}
                              onChange={handleInputChange}
                              required={formData.type === 'staff' && formData.stayType === 'daily'}
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
                        </>
                      ) : null}

                      {/* Month Selection - For Monthly Basis Staff */}
                      {formData.type === 'staff' && formData.stayType === 'monthly' && (
                        <div className="md:col-span-2 lg:col-span-3">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Select Month * (YYYY-MM)
                          </label>
                          <input
                            type="month"
                            name="selectedMonth"
                            value={formData.selectedMonth}
                            onChange={handleInputChange}
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Select the month for which the staff member will stay
                          </p>
                        </div>
                      )}

                      {/* Room Allocation - For Staff and Warden - New Hierarchy */}
                      {['staff', 'warden'].includes(formData.type) && (
                        <>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Hostel *
                            </label>
                            <select
                              name="hostelId"
                              value={formData.hostelId}
                              onChange={handleInputChange}
                              disabled={loadingHostels}
                              required
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                            >
                              <option value="">Select Hostel</option>
                              {loadingHostels ? (
                                <option value="" disabled>Loading hostels...</option>
                              ) : (
                                hostels.filter(h => h.isActive).map(hostel => (
                                  <option key={hostel._id} value={hostel._id}>
                                    {hostel.name}
                                  </option>
                                ))
                              )}
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Category *
                            </label>
                            <select
                              name="categoryId"
                              value={formData.categoryId}
                              onChange={handleInputChange}
                              disabled={!formData.hostelId || loadingCategories}
                              required
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                            >
                              <option value="">Select Category</option>
                              {loadingCategories ? (
                                <option value="" disabled>Loading categories...</option>
                              ) : (
                                categories.filter(c => c.isActive).map(category => (
                                  <option key={category._id} value={category._id}>
                                    {category.name}
                                  </option>
                                ))
                              )}
                            </select>
                            {!formData.hostelId && (
                              <p className="text-xs text-gray-500 mt-1">Please select a hostel first</p>
                            )}
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Room *
                            </label>
                            <select
                              name="roomId"
                              value={formData.roomId}
                              onChange={(e) => {
                                const selectedRoom = roomsWithAvailability.find(r => r._id === e.target.value);
                                setFormData(prev => ({
                                  ...prev,
                                  roomId: e.target.value,
                                  roomNumber: selectedRoom ? selectedRoom.roomNumber : ''
                                }));
                              }}
                              disabled={!formData.categoryId || loadingRooms}
                              required
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                            >
                              <option value="">Select Room</option>
                              {loadingRooms ? (
                                <option value="" disabled>Loading rooms...</option>
                              ) : (
                                roomsWithAvailability.map(room => (
                                  <option key={room._id} value={room._id}>
                                    Room {room.roomNumber} ({room.totalOccupancy || 0}/{room.bedCount} beds) - {room.availableBeds || 0} available
                                  </option>
                                ))
                              )}
                            </select>
                            {!formData.categoryId && (
                              <p className="text-xs text-gray-500 mt-1">Please select a category first</p>
                            )}
                            {formData.roomId && (
                              <p className="text-xs text-green-600 mt-1">
                                Selected: {roomsWithAvailability.find(r => r._id === formData.roomId)?.roomNumber || 'Room'}
                              </p>
                            )}
                          </div>

                          {formData.type === 'staff' && (<div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Bed Number (Optional)
                            </label>
                            <input
                              type="text"
                              name="bedNumber"
                              value={formData.bedNumber}
                              onChange={handleInputChange}
                              placeholder="e.g., 1, 2, 3..."
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              Specify bed number within the room (optional)
                            </p>
                          </div>)}
                        </>
                      )}

                      {/* Charge Type and Charges Display - For Staff and Students */}
                      {['staff', 'student'].includes(formData.type) && (
                        <div className="md:col-span-2 lg:col-span-3">
                          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
                            <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                              <CurrencyDollarIcon className="w-4 h-4 mr-2 text-blue-600" />
                              Charges Information
                            </h4>

                            {/* Charge Type Selection - Only for Monthly Staff */}
                            {formData.type === 'staff' && formData.stayType === 'monthly' && (
                              <div className="mb-4 bg-white rounded-lg p-4 border border-blue-100">
                                <label className="block text-sm font-medium text-gray-700 mb-3">
                                  Charge Type *
                                </label>
                                <div className="flex gap-4">
                                  <label className="flex items-center">
                                    <input
                                      type="radio"
                                      name="chargeType"
                                      value="per_day"
                                      checked={formData.chargeType === 'per_day'}
                                      onChange={handleInputChange}
                                      className="mr-2"
                                    />
                                    <span className="text-sm text-gray-700">Per Day Rate</span>
                                  </label>
                                  <label className="flex items-center">
                                    <input
                                      type="radio"
                                      name="chargeType"
                                      value="monthly_fixed"
                                      checked={formData.chargeType === 'monthly_fixed'}
                                      onChange={handleInputChange}
                                      className="mr-2"
                                    />
                                    <span className="text-sm text-gray-700">Monthly Fixed Amount</span>
                                  </label>
                                </div>
                              </div>
                            )}

                            <div className={`grid grid-cols-1 gap-4 ${formData.type === 'staff' && formData.stayType === 'monthly' && formData.chargeType === 'monthly_fixed' ? 'lg:grid-cols-2' : 'lg:grid-cols-3'}`}>
                              {/* Per Day Rate or Monthly Fixed Amount Input */}
                              <div className="bg-white rounded-lg p-4 border border-blue-100">
                                <div className="text-sm font-medium text-gray-600 mb-3">
                                  {formData.type === 'staff' && formData.stayType === 'monthly' && formData.chargeType === 'monthly_fixed'
                                    ? 'Monthly Fixed Amount'
                                    : 'Individual Daily Rate'}
                                </div>
                                <div className="space-y-2">
                                  {formData.type === 'staff' && formData.stayType === 'monthly' && formData.chargeType === 'monthly_fixed' ? (
                                    <>
                                      <div className="relative">
                                        <CurrencyDollarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                          type="number"
                                          name="monthlyFixedAmount"
                                          value={formData.monthlyFixedAmount}
                                          onChange={handleInputChange}
                                          placeholder={dailyRateSettings.monthlyFixedAmount || 3000}
                                          className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                          min="0"
                                          step="0.01"
                                        />
                                      </div>
                                      <div className="text-xs text-gray-500">
                                        Leave empty to use default: ₹{dailyRateSettings.monthlyFixedAmount || 3000}
                                      </div>
                                    </>
                                  ) : (
                                    <>
                                      <div className="relative">
                                        <CurrencyDollarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                          type="number"
                                          name="dailyRate"
                                          value={formData.dailyRate}
                                          onChange={handleInputChange}
                                          placeholder={dailyRateSettings.staffDailyRate || 100}
                                          className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                          min="0"
                                          step="0.01"
                                        />
                                      </div>
                                      <div className="text-xs text-gray-500">
                                        Leave empty to use default: ₹{dailyRateSettings.staffDailyRate || 100}
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>

                              {/* Calculated Charges */}
                              <div className="bg-white rounded-lg p-4 border border-green-100">
                                <div className="text-sm font-medium text-gray-600 mb-3">Calculated Charges</div>
                                <div className="space-y-2">
                                  <div className="text-lg font-bold text-green-700">
                                    ₹{(() => {
                                      if (formData.type === 'staff' && formData.stayType === 'monthly' && formData.selectedMonth) {
                                        // Monthly fixed amount
                                        if (formData.chargeType === 'monthly_fixed') {
                                          const amount = formData.monthlyFixedAmount
                                            ? parseFloat(formData.monthlyFixedAmount)
                                            : (dailyRateSettings.monthlyFixedAmount || 3000);
                                          return amount.toLocaleString();
                                        }
                                        // Per day calculation
                                        const [year, month] = formData.selectedMonth.split('-').map(Number);
                                        const daysInMonth = new Date(year, month, 0).getDate();
                                        const rateToUse = formData.dailyRate ? parseFloat(formData.dailyRate) : (dailyRateSettings.staffDailyRate || 100);
                                        return (daysInMonth * rateToUse).toLocaleString();
                                      } else if (formData.checkinDate) {
                                        // Calculate for daily basis
                                        const startDate = new Date(formData.checkinDate);
                                        const endDate = formData.checkoutDate ? new Date(formData.checkoutDate) : new Date();
                                        const timeDiff = endDate.getTime() - startDate.getTime();
                                        const dayCount = Math.max(0, Math.ceil(timeDiff / (1000 * 3600 * 24)));
                                        const rateToUse = formData.dailyRate ? parseFloat(formData.dailyRate) : (dailyRateSettings.staffDailyRate || 100);
                                        return (dayCount * rateToUse).toLocaleString();
                                      }
                                      return '0';
                                    })()}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {(() => {
                                      if (formData.type === 'staff' && formData.stayType === 'monthly' && formData.selectedMonth) {
                                        if (formData.chargeType === 'monthly_fixed') {
                                          const amount = formData.monthlyFixedAmount
                                            ? parseFloat(formData.monthlyFixedAmount)
                                            : (dailyRateSettings.monthlyFixedAmount || 3000);
                                          return `Fixed amount: ₹${amount.toLocaleString()}`;
                                        }
                                        const [year, month] = formData.selectedMonth.split('-').map(Number);
                                        const daysInMonth = new Date(year, month, 0).getDate();
                                        const rateToUse = formData.dailyRate ? parseFloat(formData.dailyRate) : (dailyRateSettings.staffDailyRate || 100);
                                        return `${daysInMonth} days × ₹${rateToUse}`;
                                      } else if (formData.checkinDate) {
                                        const startDate = new Date(formData.checkinDate);
                                        const endDate = formData.checkoutDate ? new Date(formData.checkoutDate) : new Date();
                                        const timeDiff = endDate.getTime() - startDate.getTime();
                                        const dayCount = Math.max(0, Math.ceil(timeDiff / (1000 * 3600 * 24)));
                                        const rateToUse = formData.dailyRate ? parseFloat(formData.dailyRate) : (dailyRateSettings.staffDailyRate || 100);
                                        return `${dayCount} days × ₹${rateToUse}`;
                                      }
                                      return formData.type === 'staff' && formData.stayType === 'monthly'
                                        ? 'Select month to calculate'
                                        : 'Enter check-in date to calculate';
                                    })()}
                                  </div>
                                </div>
                              </div>

                              {/* Default Rate - Only show for per_day charge type */}
                              {!(formData.type === 'staff' && formData.stayType === 'monthly' && formData.chargeType === 'monthly_fixed') && (
                                <div className="bg-white rounded-lg p-4 border border-purple-100">
                                  <div className="text-sm font-medium text-gray-600 mb-3">Default Rate</div>
                                  <div className="space-y-2">
                                    <div className="text-lg font-bold text-purple-700">₹{dailyRateSettings.staffDailyRate || 100}</div>
                                    <div className="text-xs text-gray-500">From settings</div>
                                  </div>
                                </div>
                              )}
                            </div>
                            <div className="mt-3 text-xs text-gray-600">
                              {formData.type === 'staff' && formData.stayType === 'monthly' ? (
                                <>
                                  {formData.chargeType === 'monthly_fixed' ? (
                                    <p>• Monthly fixed amount will be charged regardless of days in the month</p>
                                  ) : (
                                    <>
                                      <p>• Set individual daily rate or leave empty to use default from settings</p>
                                      <p>• Charges are calculated for the entire selected month (days × rate)</p>
                                    </>
                                  )}
                                </>
                              ) : (
                                <>
                                  <p>• Set individual daily rate or leave empty to use default from settings</p>
                                  <p>• Charges are calculated based on the number of days between check-in and check-out dates</p>
                                  <p>• If no check-out date is provided, charges are calculated until today</p>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Guest Information - No Charges */}
                      {formData.type === 'guest' && (
                        <div className="md:col-span-2 lg:col-span-3">
                          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
                            <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                              <UserIcon className="w-4 h-4 mr-2 text-green-600" />
                              Guest Information
                            </h4>
                            <div className="bg-white rounded-lg p-3 border border-green-100">
                              <div className="text-sm font-medium text-gray-600 mb-1">Charges</div>
                              <div className="text-lg font-bold text-green-700">₹0</div>
                              <div className="text-xs text-gray-500">No charges for guests</div>
                            </div>
                            <div className="mt-3 text-xs text-gray-600">
                              <p>• Guests are not charged for their stay</p>
                              <p>• Only staff members are subject to daily charges</p>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="md:col-span-2 lg:col-span-3">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Photo
                        </label>

                        {/* Current Photo Preview */}
                        {formData.existingPhoto && (
                          <div className="mb-3">
                            <p className="text-sm text-gray-600 mb-2">Current Photo:</p>
                            <img
                              src={formData.existingPhoto}
                              alt="Current photo"
                              className="w-20 h-24 object-cover rounded border border-gray-300"
                            />
                          </div>
                        )}

                        {/* New Photo Preview */}
                        {formData.photo && (
                          <div className="mb-3">
                            <p className="text-sm text-gray-600 mb-2">New Photo Preview:</p>
                            <img
                              src={URL.createObjectURL(formData.photo)}
                              alt="New photo preview"
                              className="w-20 h-24 object-cover rounded border border-gray-300"
                            />
                          </div>
                        )}

                        <input
                          type="file"
                          name="photo"
                          accept="image/*"
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          {editingStaffGuest ? 'Select a new photo to replace the current one' : 'Select a photo for this staff/guest'}
                        </p>
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

        {/* Detail Modal */}
        <AnimatePresence>
          {showDetailModal && selectedStaffGuest && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
              onClick={() => setShowDetailModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6">
                  {/* Header */}
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-4">
                      {selectedStaffGuest.photo ? (
                        <img
                          src={selectedStaffGuest.photo}
                          alt={selectedStaffGuest.name}
                          className="w-20 h-20 rounded-full object-cover border-4 border-gray-200"
                        />
                      ) : (
                        <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center border-4 border-gray-200">
                          <UserIcon className="w-10 h-10 text-gray-400" />
                        </div>
                      )}
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900">{selectedStaffGuest.name}</h2>
                        <p className="text-sm text-gray-500">
                          {selectedStaffGuest.type.charAt(0).toUpperCase() + selectedStaffGuest.type.slice(1)}
                          {selectedStaffGuest.department && ` • ${selectedStaffGuest.department}`}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowDetailModal(false)}
                      className="text-gray-400 hover:text-gray-500"
                    >
                      <XMarkIcon className="w-6 h-6" />
                    </button>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    {/* Personal Information */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <UserIcon className="w-5 h-5 mr-2 text-blue-600" />
                        Personal Information
                      </h3>
                      <div className="space-y-3">
                        <div>
                          <span className="text-sm font-medium text-gray-600">Profession:</span>
                          <p className="text-sm text-gray-900">{selectedStaffGuest.profession}</p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-600">Gender:</span>
                          <p className="text-sm text-gray-900">{selectedStaffGuest.gender}</p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-600">Phone:</span>
                          <p className="text-sm text-gray-900 flex items-center gap-2">
                            <PhoneIcon className="w-4 h-4" />
                            {selectedStaffGuest.phoneNumber}
                          </p>
                        </div>
                        {selectedStaffGuest.email && (
                          <div>
                            <span className="text-sm font-medium text-gray-600">Email:</span>
                            <p className="text-sm text-gray-900 flex items-center gap-2">
                              <EnvelopeIcon className="w-4 h-4" />
                              {selectedStaffGuest.email}
                            </p>
                          </div>
                        )}
                        {selectedStaffGuest.purpose && (
                          <div>
                            <span className="text-sm font-medium text-gray-600">Purpose:</span>
                            <p className="text-sm text-gray-900">{selectedStaffGuest.purpose}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Stay Information */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <CalendarIcon className="w-5 h-5 mr-2 text-green-600" />
                        Stay Information
                      </h3>
                      <div className="space-y-3">
                        {selectedStaffGuest.type === 'staff' && selectedStaffGuest.stayType && (
                          <div>
                            <span className="text-sm font-medium text-gray-600">Stay Type:</span>
                            <p className="text-sm">
                              <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${selectedStaffGuest.stayType === 'monthly'
                                ? (checkValidityExpired(selectedStaffGuest) ? 'bg-red-100 text-red-800' : 'bg-purple-100 text-purple-800')
                                : 'bg-blue-100 text-blue-800'
                                }`}>
                                {selectedStaffGuest.stayType === 'monthly' ? (
                                  <>
                                    Monthly
                                    {selectedStaffGuest.selectedMonth && ` (${new Date(selectedStaffGuest.selectedMonth + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })})`}
                                    {checkValidityExpired(selectedStaffGuest) && ' ⚠️ Expired'}
                                  </>
                                ) : 'Daily'}
                              </span>
                            </p>
                          </div>
                        )}
                        {selectedStaffGuest.checkinDate && (
                          <div>
                            <span className="text-sm font-medium text-gray-600">Check-in Date:</span>
                            <p className="text-sm text-gray-900">
                              {new Date(selectedStaffGuest.checkinDate).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </p>
                          </div>
                        )}
                        {selectedStaffGuest.checkoutDate && (
                          <div>
                            <span className="text-sm font-medium text-gray-600">Check-out Date:</span>
                            <p className="text-sm text-gray-900">
                              {new Date(selectedStaffGuest.checkoutDate).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </p>
                          </div>
                        )}
                        {selectedStaffGuest.roomNumber && (
                          <div>
                            <span className="text-sm font-medium text-gray-600">Room Allocation:</span>
                            <p className="text-sm text-gray-900 flex items-center gap-2">
                              <BuildingOfficeIcon className="w-4 h-4" />
                              Room {selectedStaffGuest.roomNumber}
                              {selectedStaffGuest.bedNumber && ` - Bed ${selectedStaffGuest.bedNumber}`}
                            </p>
                          </div>
                        )}
                        <div>
                          <span className="text-sm font-medium text-gray-600">Status:</span>
                          <p className="text-sm">
                            {(() => {
                              const isExpired = checkValidityExpired(selectedStaffGuest);
                              if (isExpired) {
                                return (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                    <XMarkIcon className="w-3 h-3 mr-1" />
                                    Expired
                                  </span>
                                );
                              }
                              return selectedStaffGuest.checkInTime && !selectedStaffGuest.checkOutTime ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  <CheckCircleIcon className="w-3 h-3 mr-1" />
                                  Checked In
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                  <ClockIcon className="w-3 h-3 mr-1" />
                                  Checked Out
                                </span>
                              );
                            })()}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Charges Information */}
                    {selectedStaffGuest.type !== 'guest' && (
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                          <CurrencyDollarIcon className="w-5 h-5 mr-2 text-yellow-600" />
                          Charges Information
                        </h3>
                        <div className="space-y-3">
                          <div>
                            <span className="text-sm font-medium text-gray-600">Daily Rate:</span>
                            <p className="text-sm text-gray-900">
                              ₹{selectedStaffGuest.dailyRate || dailyRateSettings.staffDailyRate} per day
                            </p>
                          </div>
                          <div>
                            <span className="text-sm font-medium text-gray-600">Total Charges:</span>
                            <p className="text-lg font-bold text-green-600">
                              ₹{typeof selectedStaffGuest.calculatedCharges === 'number'
                                ? selectedStaffGuest.calculatedCharges.toLocaleString('en-IN')
                                : (selectedStaffGuest.calculatedCharges || 0)}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-200">
                    {/* Show Renewal button for expired monthly staff */}
                    {selectedStaffGuest.type === 'staff' &&
                      selectedStaffGuest.stayType === 'monthly' &&
                      checkValidityExpired(selectedStaffGuest) && (
                        <button
                          onClick={() => {
                            // Set default month to next month
                            const nextMonth = new Date();
                            nextMonth.setMonth(nextMonth.getMonth() + 1);
                            const monthString = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}`;
                            setRenewalForm({
                              selectedMonth: monthString,
                              roomNumber: selectedStaffGuest.roomNumber || '',
                              bedNumber: selectedStaffGuest.bedNumber || ''
                            });
                            setShowRenewalModal(true);
                          }}
                          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                        >
                          <StarIcon className="w-4 h-4" />
                          Renew
                        </button>
                      )}
                    <button
                      onClick={() => {
                        handleEdit(selectedStaffGuest);
                        setShowDetailModal(false);
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <PencilIcon className="w-4 h-4" />
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        generateStaffAdmitCardPDF(selectedStaffGuest);
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      <DocumentArrowDownIcon className="w-4 h-4" />
                      Generate Admit Card
                    </button>
                    {selectedStaffGuest.checkInTime && !selectedStaffGuest.checkOutTime ? (
                      <button
                        onClick={() => {
                          handleCheckInOut(selectedStaffGuest._id, 'checkout');
                          setShowDetailModal(false);
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                      >
                        <EyeSlashIcon className="w-4 h-4" />
                        Check Out
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          handleCheckInOut(selectedStaffGuest._id, 'checkin');
                          setShowDetailModal(false);
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        <EyeIcon className="w-4 h-4" />
                        Check In
                      </button>
                    )}
                    <button
                      onClick={() => {
                        handleDelete(selectedStaffGuest._id, () => {
                          setShowDetailModal(false);
                        });
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      <TrashIcon className="w-4 h-4" />
                      Delete
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Renewal Modal */}
        <AnimatePresence>
          {showRenewalModal && selectedStaffGuest && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
              onClick={() => setShowRenewalModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-lg shadow-xl w-full max-w-md"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-gray-900">Renew Monthly Staff</h2>
                    <button
                      onClick={() => setShowRenewalModal(false)}
                      className="text-gray-400 hover:text-gray-500"
                    >
                      <XMarkIcon className="w-6 h-6" />
                    </button>
                  </div>

                  <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>{selectedStaffGuest.name}</strong> - Renewing for a new month
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Select Month (YYYY-MM) *
                      </label>
                      <input
                        type="month"
                        value={renewalForm.selectedMonth}
                        onChange={(e) => setRenewalForm({ ...renewalForm, selectedMonth: e.target.value })}
                        min={new Date().toISOString().slice(0, 7)}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Select the month for which you want to renew the staff member
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Room Number (Optional)
                      </label>
                      <input
                        type="text"
                        value={renewalForm.roomNumber}
                        onChange={(e) => setRenewalForm({ ...renewalForm, roomNumber: e.target.value })}
                        placeholder="Enter room number"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Leave empty to keep current room or enter a new room number
                      </p>
                    </div>

                    {renewalForm.roomNumber && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Bed Number (Optional)
                        </label>
                        <input
                          type="text"
                          value={renewalForm.bedNumber}
                          onChange={(e) => setRenewalForm({ ...renewalForm, bedNumber: e.target.value })}
                          placeholder="Enter bed number"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end gap-3 mt-6">
                    <button
                      onClick={() => {
                        setShowRenewalModal(false);
                        setRenewalForm({ selectedMonth: '', roomNumber: '', bedNumber: '' });
                      }}
                      className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleRenewal}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                      Renew & Generate Admit Card
                    </button>
                  </div>
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
