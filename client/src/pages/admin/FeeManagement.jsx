import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useGlobalSettings } from '../../context/GlobalSettingsContext';
import api from '../../utils/axios';
import toast from 'react-hot-toast';
import ReceiptGenerator from '../../components/ReceiptGenerator';
import {
  CurrencyDollarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ChartBarIcon,
  ClockIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowPathIcon,
  EyeIcon,
  Cog6ToothIcon,
  PlusIcon,
  TrashIcon,
  UserGroupIcon,
  AcademicCapIcon,
  ReceiptRefundIcon,
  CreditCardIcon,
  BanknotesIcon,
  DocumentTextIcon,
  BellIcon
} from '@heroicons/react/24/outline';
import LoadingSpinner from '../../components/LoadingSpinner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const FeeManagement = () => {
  const { user } = useAuth();
  const { settings } = useGlobalSettings();
  const [students, setStudents] = useState([]);
  const [stats, setStats] = useState({
    totalStudents: 0,
    studentsWithFees: 0,
    studentsWithoutFees: 0,
    totalFeeAmount: 0,
    averageFeeAmount: 0
  });
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    search: '',
    academicYear: '',
    category: '',
    gender: '',
    course: ''
  });

  // Fee Structure Management
  const [feeStructures, setFeeStructures] = useState([]);
  const [courses, setCourses] = useState([]);
  const [courseYears, setCourseYears] = useState([]);
  const [showFeeStructureModal, setShowFeeStructureModal] = useState(false);
  const [selectedFeeStructure, setSelectedFeeStructure] = useState(null);
  const [feeStructureForm, setFeeStructureForm] = useState({
    academicYear: '',
    course: '',
    year: '',
    category: '',
    totalFee: 0
  });
  const [feeStructureLoading, setFeeStructureLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('students'); // 'students', 'structure', 'payments', or 'reminders'
  const [feeStructureFilter, setFeeStructureFilter] = useState({
    academicYear: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
    course: '',
    year: ''
  });

  // Payment Tracking State
  const [payments, setPayments] = useState([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentHistoryLoading, setPaymentHistoryLoading] = useState(false);
  const [selectedStudentForPayment, setSelectedStudentForPayment] = useState(null);
  const [paymentForm, setPaymentForm] = useState({
    paymentType: 'hostel_fee', // 'hostel_fee' or 'electricity'
    amount: '',
    paymentMethod: 'Cash',
    term: '',
    billId: '', // For electricity bills
    month: '', // For electricity bills
    notes: '',
    utrNumber: '' // UTR number for online payments
  });
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [selectedStudentBalance, setSelectedStudentBalance] = useState(null);
  const [studentPayments, setStudentPayments] = useState([]);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [studentElectricityBills, setStudentElectricityBills] = useState([]);
  const [electricityBillsLoading, setElectricityBillsLoading] = useState(false);
  const [availableMonths, setAvailableMonths] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedElectricityBill, setSelectedElectricityBill] = useState(null);

  // Fee Reminders State
  const [feeReminders, setFeeReminders] = useState([]);
  const [reminderStats, setReminderStats] = useState({
    totalStudents: 0,
    paidStudents: 0,
    pendingStudents: 0,
    activeReminders: 0,
    paymentRate: 0
  });
  const [reminderLoading, setReminderLoading] = useState(false);
  const [reminderFilters, setReminderFilters] = useState({
    search: '',
    academicYear: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
    course: '',
    status: '',
    reminderType: ''
  });
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedReminders, setSelectedReminders] = useState([]);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [reminderModalType, setReminderModalType] = useState(''); // 'send', 'bulk'
  const [reminderMessage, setReminderMessage] = useState('');
  const [sendingReminders, setSendingReminders] = useState(false);
  const [reminderCurrentPage, setReminderCurrentPage] = useState(1);
  const [reminderTotalPages, setReminderTotalPages] = useState(1);
  const [emailServiceStatus, setEmailServiceStatus] = useState(null);
  const [reminderOptions, setReminderOptions] = useState({
    sendEmail: true,
    sendPushNotification: true
  });


  // Generate academic years dynamically (3 years before and after current year)
  const generateAcademicYears = () => {
    const currentYear = new Date().getFullYear();
    const years = [];

    for (let i = -3; i <= 3; i++) {
      const year = currentYear + i;
      years.push(`${year}-${year + 1}`);
    }

    return years;
  };

  // Get available categories based on gender (dynamic room mapping)
  const getAvailableCategories = (gender = null) => {
    // Base categories available
    const baseCategories = ['A+', 'A', 'B+', 'B', 'C'];

    // If gender is specified, filter based on available room categories
    if (gender) {
      if (gender === 'Male') {
        return ['A+', 'A', 'B+', 'B']; // Male categories
      } else if (gender === 'Female') {
        return ['A+', 'A', 'B', 'C']; // Female categories
      }
    }

    return baseCategories;
  };

  // Fetch fee structure for a specific student course, year, category and academic year
  const getFeeStructureForStudent = (course, year, category, academicYear) => {
    const structure = feeStructures.find(structure => {
      // Handle both cases: course as object (with _id) or course as string (course name)
      let courseMatch = false;
      if (typeof course === 'object' && course._id) {
        // Student course is an object with _id
        courseMatch = structure.course?._id === course._id || structure.course === course._id;
      } else if (typeof course === 'string') {
        // Student course is a string (course name or ID)
        courseMatch = structure.course?.name === course || structure.course === course;
      }
      
      const yearMatch = structure.year === year;
      const categoryMatch = structure.category === category;
      const academicYearMatch = structure.academicYear === academicYear;
      
      return courseMatch && yearMatch && categoryMatch && academicYearMatch;
    });

    return structure;
  };

  // Calculate term fees dynamically
  const calculateTermFees = (totalFee) => {
    return {
      term1Fee: Math.round(totalFee * 0.4), // 40%
      term2Fee: Math.round(totalFee * 0.3), // 30%
      term3Fee: Math.round(totalFee * 0.3)  // 30%
    };
  };

  // Debug authentication state
  useEffect(() => {
    console.log('🔍 FeeManagement: Current user:', user);
    console.log('🔍 FeeManagement: Token in localStorage:', localStorage.getItem('token') ? 'exists' : 'missing');
    console.log('🔍 FeeManagement: User role:', user?.role);

    // Test admin validation endpoint
    const testAdminAuth = async () => {
      try {
        console.log('🔍 FeeManagement: Testing admin validation...');
        const response = await api.get('/api/admin-management/validate');
        console.log('🔍 FeeManagement: Admin validation successful:', response.data);
      } catch (err) {
        console.error('🔍 FeeManagement: Admin validation failed:', err.response?.data || err.message);
      }
    };

    if (user?.role && (user.role === 'admin' || user.role === 'super_admin' || user.role === 'sub_admin' || user.role === 'warden' || user.role === 'principal')) {
      testAdminAuth();
    }
  }, [user]);

  useEffect(() => {
    fetchStudents();
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [currentPage, filters]);

  // Fetch courses on component mount
  useEffect(() => {
    fetchCourses();
  }, []);

  // Fetch course years when course changes
  useEffect(() => {
    if (feeStructureForm.course) {
      fetchCourseYears(feeStructureForm.course);
      // Only reset year and category when course changes if we're not editing an existing structure
      if (!selectedFeeStructure) {
        setFeeStructureForm(prev => ({ ...prev, year: '', category: '' }));
      }
    } else {
      setCourseYears([]);
    }
  }, [feeStructureForm.course, selectedFeeStructure]);

  // Reset category when year changes
  useEffect(() => {
    if (feeStructureForm.year && !selectedFeeStructure) {
      setFeeStructureForm(prev => ({ ...prev, category: '' }));
    }
  }, [feeStructureForm.year, selectedFeeStructure]);

  // Fetch course years when course filter changes
  useEffect(() => {
    if (feeStructureFilter.course) {
      fetchCourseYears(feeStructureFilter.course);
    } else {
      setCourseYears([]);
    }
  }, [feeStructureFilter.course]);

  // Fetch fee structures when filters change
  useEffect(() => {
    fetchFeeStructures();
  }, [feeStructureFilter]);

  // Calculate stats whenever students or fee structures change
  useEffect(() => {
    if (students.length > 0) {
      fetchStats();
    }
  }, [students, feeStructures]);

  // Fetch all students for accurate statistics when filters change
  useEffect(() => {
    if (activeTab === 'students') {
      fetchAllStudentsForStats();
    }
  }, [filters.academicYear, filters.category, filters.gender, activeTab]);

  const fetchStats = async () => {
    try {
      console.log('🔍 FeeManagement: Calculating stats from students data...');

      // Use the new function to get accurate stats
      await fetchAllStudentsForStats();
    } catch (err) {
      console.error('Error calculating stats:', err);
      setError('Failed to calculate stats');
    }
  };

  const fetchStudents = async () => {
    try {
      setTableLoading(true);
      const params = new URLSearchParams({
        page: currentPage,
        limit: 20
      });

      if (filters.search) params.append('search', filters.search);
      if (filters.academicYear) params.append('academicYear', filters.academicYear);
      if (filters.category) params.append('category', filters.category);
      if (filters.gender) params.append('gender', filters.gender);
      if (filters.course) params.append('course', filters.course);

      console.log('🔍 Frontend: Fetching students with params:', params.toString());
      console.log('🔍 Frontend: Auth header:', api.defaults.headers.common['Authorization'] ? 'present' : 'missing');

      const response = await api.get(`/api/admin/students?${params}`);

      console.log('🔍 Frontend: Response received:', response.data);

      if (response.data.success) {
        const studentsData = response.data.data.students || response.data.data || [];
        const totalCount = response.data.data.totalCount || response.data.data.total || studentsData.length;

        console.log('🔍 Frontend: Students received:', studentsData.length);
        console.log('🔍 Frontend: Total count from backend:', totalCount);
        console.log('🔍 Frontend: Sample student:', studentsData[0]);

        setStudents(studentsData);
        setTotalPages(response.data.data.totalPages || 1);

        // If we have total count from backend, use it for stats
        if (totalCount && totalCount !== studentsData.length) {
          console.log('🔍 Frontend: Backend reports different total count, fetching all students for stats...');
          setTimeout(() => fetchAllStudentsForStats(), 100);
        }
      } else {
        setError('Failed to fetch students');
      }
    } catch (err) {
      console.error('Error fetching students:', err);
      console.error('🔍 Frontend: Students error response:', err.response?.data);
      setError(err.response?.data?.message || 'Failed to fetch students');
    } finally {
      setTableLoading(false);
      setLoading(false);
    }
  };

  // Fetch hostel fee payments from backend
  const fetchHostelFeePayments = async () => {
    try {
      console.log('🔍 Fetching hostel fee payments from backend...');
      const response = await api.get('/api/payments/hostel-fee/stats');

      if (response.data.success) {
        // For now, we'll get all payments by fetching from each student
        // In a production system, you might want a bulk endpoint
        console.log('🔍 Hostel fee payment stats fetched:', response.data.data);
      }
    } catch (error) {
      console.error('Error fetching hostel fee payments:', error);
      // Don't show error to user as this is background fetch
    }
  };

  // Fetch all students for statistics (without pagination)
  const fetchAllStudentsForStats = async () => {
    try {
      console.log('🔍 Frontend: Fetching all students for statistics...');

      const params = new URLSearchParams({
        limit: 1000 // Fetch a large number to get all students
      });

      if (filters.academicYear) params.append('academicYear', filters.academicYear);
      if (filters.category) params.append('category', filters.category);
      if (filters.gender) params.append('gender', filters.gender);
      if (filters.course) params.append('course', filters.course);

      const response = await api.get(`/api/admin/students?${params}`);

      if (response.data.success) {
        const allStudentsData = response.data.data.students || response.data.data || [];
        console.log('🔍 Frontend: All students for stats:', allStudentsData.length);

        // Update stats with all students data
        const totalStudents = allStudentsData.length;
        
        const studentsWithFees = allStudentsData.filter(student => {
          const feeStructure = getFeeStructureForStudent(student.course, student.year, student.category, student.academicYear);
          return feeStructure !== undefined;
        }).length;
        const studentsWithoutFees = totalStudents - studentsWithFees;

        // Calculate total fee amount (including concession)
        let totalFeeAmount = 0;
        let totalCalculatedFeeAmount = 0;
        let totalConcessionAmount = 0;
        let studentsWithConcession = 0;

        allStudentsData.forEach(student => {
          const feeStructure = getFeeStructureForStudent(student.course, student.year, student.category, student.academicYear);
          if (feeStructure) {
            const originalFee = feeStructure.totalFee;
            const calculatedFee = student.totalCalculatedFee || originalFee;
            const concession = student.concession || 0;

            totalFeeAmount += originalFee;
            totalCalculatedFeeAmount += calculatedFee;
            totalConcessionAmount += concession;

            if (concession > 0) {
              studentsWithConcession++;
            }
          }
        });

        const averageFeeAmount = studentsWithFees > 0 ? Math.round(totalFeeAmount / studentsWithFees) : 0;

        setStats({
          totalStudents,
          studentsWithFees,
          studentsWithoutFees,
          totalFeeAmount,
          averageFeeAmount,
          totalCalculatedFeeAmount,
          totalConcessionAmount,
          studentsWithConcession
        });

        console.log('🔍 Frontend: Stats updated:', {
          totalStudents,
          studentsWithFees,
          studentsWithoutFees,
          totalFeeAmount,
          averageFeeAmount
        });
      }
    } catch (err) {
      console.error('Error fetching all students for stats:', err);
    }
  };





  const getStatusColor = (status) => {
    switch (status) {
      case 'Paid':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'Unpaid':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Paid':
        return <CheckCircleIcon className="w-4 h-4 text-green-600" />;
      case 'Unpaid':
        return <ExclamationTriangleIcon className="w-4 h-4 text-red-600" />;
      default:
        return <ClockIcon className="w-4 h-4 text-gray-600" />;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({ search: '', academicYear: '', category: '', gender: '', course: '' });
    setCurrentPage(1);
  };

  // Fee Structure Management Functions
  const fetchCourses = async () => {
    try {
      const response = await api.get('/api/fee-structures/courses');
      if (response.data.success) {
        setCourses(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching courses:', err);
    }
  };

  const fetchCourseYears = async (courseId) => {
    if (!courseId) {
      setCourseYears([]);
      return;
    }
    
    try {
      const response = await api.get(`/api/fee-structures/courses/${courseId}/years`);
      if (response.data.success) {
        setCourseYears(response.data.data.years);
      }
    } catch (err) {
      console.error('Error fetching course years:', err);
      setCourseYears([]);
    }
  };

  const fetchFeeStructures = async () => {
    try {
      console.log('🔍 Fetching fee structures...');
      setFeeStructureLoading(true);

      // Build query parameters
      const queryParams = new URLSearchParams();
      if (feeStructureFilter.academicYear) {
        queryParams.append('academicYear', feeStructureFilter.academicYear);
      }
      if (feeStructureFilter.course) {
        queryParams.append('course', feeStructureFilter.course);
      }
      if (feeStructureFilter.year) {
        queryParams.append('year', feeStructureFilter.year);
      }

      const queryString = queryParams.toString();
      const url = `/api/fee-structures${queryString ? `?${queryString}` : ''}`;
      
      console.log('🔍 Fetching fee structures from:', url);
      const response = await api.get(url);

      if (response.data.success && Array.isArray(response.data.data)) {
        console.log('🔍 Found fee structures:', response.data.data.length);
        setFeeStructures(response.data.data);
        setError(null);
      } else {
        console.log('🔍 No fee structures found');
        setFeeStructures([]);
        setError('No fee structures found');
      }

    } catch (err) {
      console.error('Error fetching fee structures:', err);
        setError(err.response?.data?.message || 'Failed to fetch fee structures');
    } finally {
      setFeeStructureLoading(false);
    }
  };

  const handleFeeStructureSubmit = async (e) => {
    e.preventDefault();

    // Validate form data
    if (!feeStructureForm.academicYear || !feeStructureForm.course || !feeStructureForm.year || !feeStructureForm.category || !feeStructureForm.totalFee) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (feeStructureForm.totalFee <= 0) {
      toast.error('Total fee must be greater than 0');
      return;
    }

    try {
      setFeeStructureLoading(true);

      // Calculate term fees on frontend for validation
      const termFees = calculateTermFees(feeStructureForm.totalFee);

      // Send complete fee data to backend
      const feeData = {
        academicYear: feeStructureForm.academicYear,
        course: feeStructureForm.course,
        year: parseInt(feeStructureForm.year),
        category: feeStructureForm.category,
        totalFee: feeStructureForm.totalFee,
        term1Fee: termFees.term1Fee,
        term2Fee: termFees.term2Fee,
        term3Fee: termFees.term3Fee
      };

      console.log('🔍 Frontend: Sending fee data to backend:', feeData);
      console.log('🔍 Frontend: Term fees calculated:', termFees);

      // Use the same endpoint for both creating and updating
      console.log('🔍 Frontend: Creating/updating fee structure');
      const response = await api.post('/api/fee-structures', feeData);

      console.log('🔍 Frontend: Response from backend:', response.data);

      if (response.data.success) {
        const courseName = courses.find(c => c._id === feeData.course)?.name || 'Unknown Course';
        const action = selectedFeeStructure ? 'updated' : 'saved';
        toast.success(`Fee structure for ${courseName} Year ${feeData.year} ${feeData.category} category (${feeData.academicYear}) ${action} successfully!`);
        setShowFeeStructureModal(false);
        setSelectedFeeStructure(null);
        setFeeStructureForm({
          academicYear: '',
          course: '',
          year: '',
          category: '',
          totalFee: 0
        });

        // Refresh both fee structures and students to update linking
        await Promise.all([
          fetchFeeStructures(),
          fetchStudents()
        ]);

        // Recalculate stats
        setTimeout(() => {
          fetchStats();
        }, 500);
      } else {
        console.error('🔍 Frontend: Backend returned error:', response.data);
        setError(response.data.message || 'Failed to save fee structure');
      }
    } catch (err) {
      console.error('Error saving fee structure:', err);
      setError(err.response?.data?.message || 'Failed to save fee structure');
    } finally {
      setFeeStructureLoading(false);
    }
  };

  // Get available years for a course (excluding years where ALL categories exist)
  const getAvailableYearsForCreation = (courseId, academicYear) => {
    if (!courseId || !academicYear) return [];

    // Get the course to know its duration
    const course = courses.find(c => c._id === courseId);
    if (!course) return [];

    // If editing, include the current year
    if (selectedFeeStructure && selectedFeeStructure.course?._id === courseId) {
      return Array.from({ length: course.duration }, (_, i) => i + 1);
    }

    // Get all possible categories
    const allCategories = getAvailableCategories();
    
    // Check each year to see if ALL categories already exist
    const availableYears = Array.from({ length: course.duration }, (_, i) => i + 1)
      .filter(year => {
        // Get existing categories for this year
        const existingCategories = feeStructures
          .filter(structure => 
            structure.academicYear === academicYear &&
            (structure.course?._id === courseId || structure.course === courseId) &&
            structure.year === year
          )
          .map(structure => structure.category);
        
        // Year is available if not ALL categories exist
        return existingCategories.length < allCategories.length;
      });

    return availableYears;
  };

  // Get available categories (excluding already created ones)
  const getAvailableCategoriesForCreation = () => {
    const allCategories = getAvailableCategories();
    const academicYear = feeStructureForm.academicYear || feeStructureFilter.academicYear || '2024-2025';
    const courseId = feeStructureForm.course;
    const year = feeStructureForm.year;

    if (!courseId || !year) {
      return allCategories;
    }

    // Get existing categories for the current academic year, course, and year
    const existingCategories = feeStructures
      .filter(structure => 
        structure.academicYear === academicYear &&
        (structure.course?._id === courseId || structure.course === courseId) &&
        structure.year === parseInt(year)
      )
      .map(structure => structure.category);

    // If editing, include the current category
    if (selectedFeeStructure) {
      return allCategories;
    }

    // Filter out existing categories
    const availableCategories = allCategories.filter(category => 
      !existingCategories.includes(category)
    );

    return availableCategories;
  };

  const openFeeStructureModal = (structure = null) => {
    if (structure) {
      console.log('🔍 Opening edit modal for structure:', structure);
      setSelectedFeeStructure(structure);
      
      const formData = {
        academicYear: structure.academicYear,
        course: structure.course?._id || structure.course,
        year: structure.year,
        category: structure.category,
        totalFee: (structure.totalFee || 0) || ((structure.term1Fee || 0) + (structure.term2Fee || 0) + (structure.term3Fee || 0))
      };
      
      console.log('🔍 Setting form data:', formData);
      setFeeStructureForm(formData);
    } else {
      setSelectedFeeStructure(null);
      setFeeStructureForm({
        academicYear: feeStructureFilter.academicYear || '2024-2025',
        course: '',
        year: '',
        category: '',
        totalFee: 0
      });
    }

    setShowFeeStructureModal(true);
  };

  const deleteFeeStructure = async (academicYear, course, year, category) => {
    const courseName = courses.find(c => c._id === course)?.name || 'Unknown Course';
    if (!window.confirm(`Are you sure you want to delete fee structure for ${courseName} Year ${year} ${category} category?`)) {
      return;
    }

    try {
      setFeeStructureLoading(true);
      const response = await api.delete(`/api/fee-structures/${academicYear}/${course}/${year}/${category}`);

      if (response.data.success) {
        toast.success('Fee structure deleted successfully');
        fetchFeeStructures();
      } else {
        setError('Failed to delete fee structure');
      }
    } catch (err) {
      console.error('Error deleting fee structure:', err);
      setError(err.response?.data?.message || 'Failed to delete fee structure');
    } finally {
      setFeeStructureLoading(false);
    }
  };



  const handleFeeStructureFilterChange = (key, value) => {
    setFeeStructureFilter(prev => ({ ...prev, [key]: value }));
  };

  // Payment Tracking Functions
  const openPaymentModal = (student) => {
    setSelectedStudentForPayment(student);
    const feeStructure = getFeeStructureForStudent(student.course, student.year, student.category, student.academicYear);

    if (!feeStructure) {
      toast.error('No fee structure found for this student');
      return;
    }

    // Initialize payment form
    setPaymentForm({
      paymentType: 'hostel_fee',
      amount: '',
      paymentMethod: 'Cash',
      term: '',
      billId: '',
      month: '',
      notes: ''
    });

    // Show modal immediately
    setShowPaymentModal(true);

    // Fetch available months in background (non-blocking)
    fetchAvailableMonths(student);
  };

  const handleClosePaymentModal = () => {
    setShowPaymentModal(false);
    setSelectedStudentForPayment(null);
    setPaymentForm({
      paymentType: 'hostel_fee',
      amount: '',
      paymentMethod: 'Cash',
      term: '',
      billId: '',
      month: '',
      notes: ''
    });
    setStudentElectricityBills([]);
    setAvailableMonths([]);
    setSelectedMonth('');
    setSelectedElectricityBill(null);
  };

  // Fetch available months for student's electricity bills
  const fetchAvailableMonths = async (student) => {
    try {
      setElectricityBillsLoading(true);

      // Find student's room
      const roomsResponse = await api.get('/api/rooms');
      if (!roomsResponse.data.success) {
        throw new Error('Failed to fetch rooms');
      }

      const rooms = roomsResponse.data.data.rooms || roomsResponse.data.data || [];
      const studentRoom = rooms.find(room =>
        room.roomNumber === student.roomNumber &&
        room.gender === student.gender &&
        room.category === student.category
      );

      if (!studentRoom) {
        console.log('No room found for student:', student);
        setAvailableMonths([]);
        return;
      }

      // Get room's electricity bills
      const billsResponse = await api.get(`/api/rooms/${studentRoom._id}/electricity-bill`);
      if (!billsResponse.data.success) {
        throw new Error('Failed to fetch electricity bills');
      }

      const allBills = billsResponse.data.data || [];

      // Get unique months with unpaid bills for this student
      const monthsWithUnpaidBills = allBills
        .filter(bill => {
          // Check if bill has studentBills array (new format)
          if (bill.studentBills && bill.studentBills.length > 0) {
            const studentBill = bill.studentBills.find(sb => sb.studentId === student._id);
            return studentBill && studentBill.paymentStatus === 'unpaid';
          } else {
            // Old format - check if room bill is unpaid and student is in room
            return bill.paymentStatus === 'unpaid';
          }
        })
        .map(bill => bill.month)
        .filter((month, index, array) => array.indexOf(month) === index) // Remove duplicates
        .sort((a, b) => new Date(a) - new Date(b)); // Sort by date

      setAvailableMonths(monthsWithUnpaidBills);
      console.log('🔍 Available months for student:', monthsWithUnpaidBills);

    } catch (error) {
      console.error('Error fetching available months:', error);
      toast.error('Failed to fetch available months');
      setAvailableMonths([]);
    } finally {
      setElectricityBillsLoading(false);
    }
  };

  // Fetch electricity bill for specific month
  const fetchElectricityBillForMonth = async (student, month) => {
    try {
      setElectricityBillsLoading(true);

      // Find student's room
      const roomsResponse = await api.get('/api/rooms');
      if (!roomsResponse.data.success) {
        throw new Error('Failed to fetch rooms');
      }

      const rooms = roomsResponse.data.data.rooms || roomsResponse.data.data || [];
      const studentRoom = rooms.find(room =>
        room.roomNumber === student.roomNumber &&
        room.gender === student.gender &&
        room.category === student.category
      );

      if (!studentRoom) {
        console.log('No room found for student:', student);
        setSelectedElectricityBill(null);
        return;
      }

      // Get room's electricity bills
      const billsResponse = await api.get(`/api/rooms/${studentRoom._id}/electricity-bill`);
      if (!billsResponse.data.success) {
        throw new Error('Failed to fetch electricity bills');
      }

      const allBills = billsResponse.data.data || [];

      // Find bill for specific month
      const billForMonth = allBills.find(bill => bill.month === month);

      if (!billForMonth) {
        console.log('No bill found for month:', month);
        setSelectedElectricityBill(null);
        return;
      }

      // Find student's share in the bill
      let studentBill = null;
      let studentAmount = 0;

      if (billForMonth.studentBills && billForMonth.studentBills.length > 0) {
        // New format - has studentBills array
        studentBill = billForMonth.studentBills.find(sb => sb.studentId === student._id);
        if (!studentBill || studentBill.paymentStatus === 'paid') {
          console.log('Student bill not found or already paid for month:', month);
          setSelectedElectricityBill(null);
          return;
        }
        studentAmount = studentBill.amount;
      } else {
        // Old format - calculate equal share
        if (billForMonth.paymentStatus === 'paid') {
          console.log('Room bill already paid for month:', month);
          setSelectedElectricityBill(null);
          return;
        }

        // Get current student count in room via API
        try {
          const studentsResponse = await api.get(`/api/admin/rooms/${studentRoom._id}/students`);
          if (studentsResponse.data.success) {
            const studentsInRoom = studentsResponse.data.data.students.length;
            if (studentsInRoom === 0) {
              console.log('No students found in room for month:', month);
              setSelectedElectricityBill(null);
              return;
            }
            studentAmount = Math.round(billForMonth.total / studentsInRoom);
          } else {
            console.log('Failed to get student count for room');
            setSelectedElectricityBill(null);
            return;
          }
        } catch (error) {
          console.error('Error getting student count:', error);
          setSelectedElectricityBill(null);
          return;
        }
      }

      const billDetails = {
        _id: billForMonth._id,
        month: billForMonth.month,
        amount: studentAmount,
        totalBill: billForMonth.total,
        consumption: billForMonth.consumption,
        rate: billForMonth.rate,
        roomId: studentRoom._id,
        startUnits: billForMonth.startUnits,
        endUnits: billForMonth.endUnits,
        isOldFormat: !billForMonth.studentBills || billForMonth.studentBills.length === 0
      };

      setSelectedElectricityBill(billDetails);
      console.log('🔍 Electricity bill for month:', billDetails);

    } catch (error) {
      console.error('Error fetching electricity bill for month:', error);
      toast.error('Failed to fetch electricity bill');
      setSelectedElectricityBill(null);
    } finally {
      setElectricityBillsLoading(false);
    }
  };

  // Comprehensive payment validation function
  const validatePayment = (student, paymentForm) => {
    const errors = [];

    // 1. Basic field validation
    if (!student) {
      errors.push('Student not selected');
    }

    if (!paymentForm.amount || paymentForm.amount <= 0) {
      errors.push('Payment amount must be greater than 0');
    }

    if (!paymentForm.paymentMethod) {
      errors.push('Please select a payment method');
    }

    if (!paymentForm.paymentType) {
      errors.push('Please select a payment type');
    }

    // UTR validation for online payments
    if (paymentForm.paymentMethod === 'Online' && !paymentForm.utrNumber) {
      errors.push('UTR number is required for online payments');
    }

    // 2. Student status validation
    if (student && student.hostelStatus !== 'Active') {
      errors.push('Student is not active in hostel');
    }

    // 3. Amount validation
    if (paymentForm.amount) {
      const amount = parseFloat(paymentForm.amount);

      // Check for valid number
      if (isNaN(amount)) {
        errors.push('Payment amount must be a valid number');
      }


      // Check decimal precision
      if (amount % 1 !== 0 && amount.toString().split('.')[1]?.length > 2) {
        errors.push('Payment amount cannot have more than 2 decimal places');
      }
    }

    // 4. Payment type specific validation
    if (paymentForm.paymentType === 'electricity') {
      if (!paymentForm.month) {
        errors.push('Please select a month');
      }
      if (!selectedElectricityBill) {
        errors.push('Please select a valid electricity bill');
      }
    }

    // 5. Duplicate payment prevention (check recent payments)
    if (student && paymentForm.amount) {
      const recentPayments = payments.filter(p =>
        p.studentId === student._id &&
        p.paymentType === paymentForm.paymentType &&
        new Date(p.createdAt) > new Date(Date.now() - 5 * 60 * 1000) // Last 5 minutes
      );

      if (recentPayments.length > 0) {
        errors.push('Duplicate payment detected. Please wait before making another payment.');
      }
    }

    return errors;
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();

    // Comprehensive validation
    const validationErrors = validatePayment(selectedStudentForPayment, paymentForm);
    if (validationErrors.length > 0) {
      validationErrors.forEach(error => toast.error(error));
      return;
    }

    try {
      setPaymentLoading(true);

      let paymentData;
      let endpoint;

      if (paymentForm.paymentType === 'hostel_fee') {
        // Hostel fee payment
        paymentData = {
          studentId: selectedStudentForPayment._id,
          amount: parseFloat(paymentForm.amount),
          paymentMethod: paymentForm.paymentMethod,
          notes: paymentForm.notes,
          academicYear: selectedStudentForPayment.academicYear,
          utrNumber: paymentForm.utrNumber
        };
        endpoint = '/api/payments/hostel-fee';
      } else {
        // Electricity bill payment
        if (!selectedElectricityBill) {
          toast.error('Selected electricity bill not found');
          return;
        }

        paymentData = {
          studentId: selectedStudentForPayment._id,
          billId: selectedElectricityBill._id,
          roomId: selectedElectricityBill.roomId,
          amount: parseFloat(paymentForm.amount),
          paymentMethod: paymentForm.paymentMethod,
          notes: paymentForm.notes,
          utrNumber: paymentForm.utrNumber
        };
        endpoint = '/api/payments/electricity';
      }

      // Send payment to backend
      console.log('🔍 Sending payment data to backend:', paymentData);
      const response = await api.post(endpoint, paymentData);

      console.log('🔍 Backend response:', response.data);

      if (response.data.success) {
        const responseData = response.data.data;

        // Handle different response formats
        if (paymentForm.paymentType === 'hostel_fee' && responseData.paymentRecords) {
          // Multiple payment records for hostel fee
          const newPayments = responseData.paymentRecords;

          // Add all payment records to local payments array
          setPayments(prev => {
            const updatedPayments = [...newPayments, ...prev];
            console.log('🔍 New hostel fee payments recorded:', newPayments);
            console.log('🔍 Updated payments array:', updatedPayments);
            return updatedPayments;
          });

          // Don't auto-download receipt - let user download from payment history

          // Show success message with details
          if (responseData.remainingAmount > 0) {
            toast.success(`Payment recorded successfully! ₹${responseData.remainingAmount} excess amount applied. You can download the receipt from Payment History.`);
          } else {
            toast.success('Payment recorded successfully! You can download the receipt from Payment History.');
          }
        } else {
          // Single payment record (electricity or old hostel fee format)
          const newPayment = responseData;

          // Add to local payments array
          setPayments(prev => {
            const updatedPayments = [newPayment, ...prev];
            console.log('🔍 New payment recorded:', newPayment);
            console.log('🔍 Updated payments array:', updatedPayments);
            return updatedPayments;
          });

          // Don't auto-download receipt - let user download from payment history

          toast.success('Payment recorded successfully! You can download the receipt from Payment History.');
        }
      } else {
        toast.error('Failed to record payment');
        return;
      }
      handleClosePaymentModal();

      // Refresh students to update balance display
      fetchStudents();

    } catch (error) {
      console.error('Error recording payment:', error);
      toast.error('Failed to record payment');
    } finally {
      setPaymentLoading(false);
    }
  };

  const generateReceipt = (payment) => {
    console.log('🔍 Generating receipt for payment:', payment);
    try {
      const success = ReceiptGenerator.generateReceipt(payment, selectedStudentForPayment, settings);
      if (success) {
        toast.success('Receipt downloaded successfully!');
      } else {
        toast.error('Failed to generate receipt');
      }
    } catch (error) {
      console.error('❌ Error generating receipt:', error);
      toast.error('Failed to generate receipt');
    }
  };

  // Fetch all payments (both hostel fee and electricity)
  const fetchAllPayments = async () => {
    setPaymentHistoryLoading(true);
    try {
      const response = await api.get('/api/payments/all');
      if (response.data.success) {
        setPayments(response.data.data.payments);
        console.log('📋 Fetched all payments:', response.data.data.payments.length);
      } else {
        toast.error('Failed to fetch payment history');
      }
    } catch (error) {
      console.error('Error fetching payment history:', error);
      toast.error('Failed to fetch payment history');
    } finally {
      setPaymentHistoryLoading(false);
    }
  };

  const openBalanceModal = async (student) => {
    setSelectedStudentBalance(student);
    setShowBalanceModal(true);
    setBalanceLoading(true);

    try {
      // Get student's fee structure
      const feeStructure = getFeeStructureForStudent(student.course, student.year, student.category, student.academicYear);

      if (!feeStructure) {
        toast.error('No fee structure found for this student');
        return;
      }

      // Fetch student's payments from backend
      const response = await api.get(`/api/payments/hostel-fee/${student._id}?academicYear=${student.academicYear}`);

      if (response.data.success) {
        const studentPaymentHistory = response.data.data.payments;
        setStudentPayments(studentPaymentHistory);

        // Update local payments array with fetched payments
        setPayments(prev => {
          const existingPayments = prev.filter(p => p.studentId !== student._id);
          return [...existingPayments, ...studentPaymentHistory];
        });
      } else {
        setStudentPayments([]);
      }

    } catch (error) {
      console.error('Error fetching student balance:', error);
      toast.error('Failed to fetch student balance');
      setStudentPayments([]);
    } finally {
      setBalanceLoading(false);
    }
  };

  // Calculate student's current balance with partial payment handling
  const calculateStudentBalance = (student) => {
    const feeStructure = getFeeStructureForStudent(student.course, student.year, student.category, student.academicYear);
    if (!feeStructure) return null;

    const studentPaymentHistory = payments.filter(p => p.studentId === student._id);
    const totalPaid = studentPaymentHistory.reduce((sum, payment) => sum + payment.amount, 0);

    // Debug logging
    console.log('🔍 Balance calculation for student:', student.name);
    console.log('🔍 Student payment history:', studentPaymentHistory);
    console.log('🔍 All payments:', payments);

    // Check if student has concession applied
    const hasConcession = student.concession && student.concession > 0;

    // Calculate term-wise balance using concession amounts if available
    // Note: Concession is applied to Term 1 only, excess to Term 2, then Term 3
    const termBalances = {
      term1: {
        required: hasConcession ?
          (student.calculatedTerm1Fee || Math.max(0, feeStructure.term1Fee - (student.concession || 0))) :
          (feeStructure.term1Fee || Math.round(feeStructure.totalFee * 0.4)),
        paid: studentPaymentHistory
          .filter(p => p.term === 'term1')
          .reduce((sum, p) => sum + p.amount, 0),
        balance: 0
      },
      term2: {
        required: hasConcession ?
          (student.calculatedTerm2Fee || (() => {
            const concession = student.concession || 0;
            const remainingConcession = Math.max(0, concession - feeStructure.term1Fee);
            return Math.max(0, feeStructure.term2Fee - remainingConcession);
          })()) :
          (feeStructure.term2Fee || Math.round(feeStructure.totalFee * 0.3)),
        paid: studentPaymentHistory
          .filter(p => p.term === 'term2')
          .reduce((sum, p) => sum + p.amount, 0),
        balance: 0
      },
      term3: {
        required: hasConcession ?
          (student.calculatedTerm3Fee || (() => {
            const concession = student.concession || 0;
            const remainingConcession = Math.max(0, concession - feeStructure.term1Fee - feeStructure.term2Fee);
            return Math.max(0, feeStructure.term3Fee - remainingConcession);
          })()) :
          (feeStructure.term3Fee || Math.round(feeStructure.totalFee * 0.3)),
        paid: studentPaymentHistory
          .filter(p => p.term === 'term3')
          .reduce((sum, p) => sum + p.amount, 0),
        balance: 0
      }
    };

    // Debug logging for term balances
    console.log('🔍 Term balances calculated:', termBalances);

    // Handle partial payments and excess amounts
    let remainingExcess = 0;

    // Process term1 first
    if (termBalances.term1.paid > termBalances.term1.required) {
      // Excess payment in term1
      remainingExcess = termBalances.term1.paid - termBalances.term1.required;
      termBalances.term1.balance = 0;
      termBalances.term1.paid = termBalances.term1.required; // Cap at required amount
    } else {
      termBalances.term1.balance = Math.max(0, termBalances.term1.required - termBalances.term1.paid);
    }

    // Process term2 with any excess from term1
    if (remainingExcess > 0) {
      const effectivePayment = termBalances.term2.paid + remainingExcess;
      if (effectivePayment > termBalances.term2.required) {
        // Still have excess after term2
        remainingExcess = effectivePayment - termBalances.term2.required;
        termBalances.term2.balance = 0;
        termBalances.term2.paid = termBalances.term2.required;
      } else {
        // Excess used up in term2
        termBalances.term2.balance = Math.max(0, termBalances.term2.required - effectivePayment);
        remainingExcess = 0;
      }
    } else {
      termBalances.term2.balance = Math.max(0, termBalances.term2.required - termBalances.term2.paid);
    }

    // Process term3 with any remaining excess
    if (remainingExcess > 0) {
      const effectivePayment = termBalances.term3.paid + remainingExcess;
      if (effectivePayment > termBalances.term3.required) {
        // Still have excess after term3
        remainingExcess = effectivePayment - termBalances.term3.required;
        termBalances.term3.balance = 0;
        termBalances.term3.paid = termBalances.term3.required;
      } else {
        // Excess used up in term3
        termBalances.term3.balance = Math.max(0, termBalances.term3.required - effectivePayment);
        remainingExcess = 0;
      }
    } else {
      termBalances.term3.balance = Math.max(0, termBalances.term3.required - termBalances.term3.paid);
    }

    const totalBalance = Object.values(termBalances).reduce((sum, term) => sum + term.balance, 0);
    const isFullyPaid = totalBalance === 0;

    // Calculate original vs calculated totals
    const originalTotalFee = feeStructure.totalFee;
    const calculatedTotalFee = student.totalCalculatedFee || originalTotalFee;
    const concessionAmount = student.concession || 0;

    return {
      feeStructure,
      totalPaid,
      totalBalance,
      isFullyPaid,
      termBalances,
      paymentHistory: studentPaymentHistory,
      originalTotalFee,
      calculatedTotalFee,
      concessionAmount,
      hasConcession,
      remainingExcess // Add this for debugging
    };
  };

  // Get available terms for payment (terms with remaining balance)
  const getAvailableTermsForPayment = (student) => {
    const balance = calculateStudentBalance(student);
    if (!balance) return [];

    const availableTerms = [];
    Object.entries(balance.termBalances).forEach(([term, termData]) => {
      // Only include terms that have a positive balance (not fully paid)
      if (termData.balance > 0) {
        availableTerms.push({
          value: term,
          label: `${term.replace('term', 'Term ')} (Balance: ₹${termData.balance})`,
          balance: termData.balance,
          required: termData.required,
          paid: termData.paid
        });
      }
    });

    // Debug logging
    console.log('🔍 Available terms for payment:', {
      student: student.name,
      availableTerms,
      termBalances: balance.termBalances
    });

    return availableTerms;
  };

  useEffect(() => {
    console.log('🔍 useEffect triggered - activeTab:', activeTab);
    if (activeTab === 'structure') {
      console.log('🔍 Structure tab active, fetching fee structures...');
      fetchFeeStructures();
    }
  }, [activeTab, feeStructureFilter.academicYear]);

  // Always fetch fee structures for student linking, regardless of active tab
  useEffect(() => {
    fetchFeeStructures();
  }, []);

  // Fetch hostel fee payments when component mounts
  useEffect(() => {
    fetchHostelFeePayments();
  }, []);

  // Check email service status on component mount
  useEffect(() => {
    checkEmailServiceStatus();
  }, []);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(reminderFilters.search);
    }, 300);

    return () => clearTimeout(timer);
  }, [reminderFilters.search]);

  // Refresh fee structures when filters change
  useEffect(() => {
    if (feeStructureFilter.academicYear || feeStructureFilter.category) {
      // Filters are applied client-side, no need to refetch
      console.log('🔍 Fee structure filters changed:', feeStructureFilter);
    }
  }, [feeStructureFilter]);

  // ==================== FEE REMINDERS FUNCTIONS ====================

  // Fetch fee reminders
  const fetchFeeReminders = async () => {
    try {
      setReminderLoading(true);
      console.log('🔔 Fetching fee reminders...');

      // Build query parameters
      const queryParams = new URLSearchParams();
      queryParams.append('page', reminderCurrentPage);
      queryParams.append('limit', '50');
      if (reminderFilters.academicYear) {
        queryParams.append('academicYear', reminderFilters.academicYear);
      }
      if (reminderFilters.course) {
        queryParams.append('course', reminderFilters.course);
      }
      if (reminderFilters.status) {
        queryParams.append('status', reminderFilters.status);
      }
      if (debouncedSearch) {
        queryParams.append('search', debouncedSearch);
      }

      const queryString = queryParams.toString();
      const url = `/api/fee-reminders/admin/all${queryString ? `?${queryString}` : ''}`;
      
      console.log('🔔 Fetching fee reminders from:', url);
      const response = await api.get(url);

      if (response.data.success) {
        console.log('🔔 Found fee reminders:', response.data.data.feeReminders?.length || 0);
        setFeeReminders(response.data.data.feeReminders || []);
        setReminderTotalPages(response.data.data.totalPages || 1);
        
        // Stats are now fetched separately via fetchReminderStats()
        // No need to set stats from combined response
        
        setError(null);
      } else {
        console.log('🔔 No fee reminders found');
        setFeeReminders([]);
        setError('No fee reminders found');
      }

    } catch (err) {
      console.error('Error fetching fee reminders:', err);
      setError(err.response?.data?.message || 'Failed to fetch fee reminders');
    } finally {
      setReminderLoading(false);
    }
  };

  // Fetch accurate fee reminder statistics (always for ALL academic years)
  const fetchReminderStats = async () => {
    try {
      console.log('📊 Fetching accurate fee reminder stats for ALL academic years...');

      // Always fetch stats for all academic years, not filtered by selected academic year
      const url = `/api/fee-reminders/admin/accurate-stats`;
      
      const response = await api.get(url);

      if (response.data.success) {
        console.log('📊 Accurate fee reminder stats :', response.data.data);
        console.log('📊 Setting reminderStats to:', response.data.data);
        setReminderStats(response.data.data);
      }

    } catch (err) {
      console.error('Error fetching accurate fee reminder stats:', err);
    }
  };

  // Check email service status
  const checkEmailServiceStatus = async () => {
    try {
      console.log('📧 Checking email service status...');
      const response = await api.get('/api/admin/email/status');
      console.log('📧 Email service status response:', response.data);
      
      if (response.data.success) {
        setEmailServiceStatus(response.data.data);
        console.log('📧 Email service status set:', response.data.data);
      }
    } catch (err) {
      console.error('📧 Error checking email service status:', err);
      setEmailServiceStatus({ configured: false, error: 'Unable to check status' });
    }
  };

  // Test email functionality
  const testEmail = async () => {
    if (!testEmailData.email) {
      toast.error('Please enter an email address');
      return;
    }

    try {
      setTestingEmail(true);
      console.log('📧 Testing email to:', testEmailData.email);

      const response = await api.post('/api/fee-reminders/test-email', {
        studentEmail: testEmailData.email,
        reminderNumber: testEmailData.reminderNumber
      });

      if (response.data.success) {
        toast.success(`Test email sent successfully to ${testEmailData.email}`);
        setShowEmailTestModal(false);
        setTestEmailData({ email: '', reminderNumber: 1 });
      } else {
        toast.error(response.data.message || 'Failed to send test email');
      }

    } catch (err) {
      console.error('Error testing email:', err);
      toast.error(err.response?.data?.message || 'Failed to send test email');
    } finally {
      setTestingEmail(false);
    }
  };

  // Cleanup orphaned fee reminders
  const cleanupOrphanedReminders = async () => {
    if (!window.confirm('This will permanently delete all fee reminders for students who have been deleted from the system. Are you sure you want to continue?')) {
      return;
    }

    try {
      setReminderLoading(true);
      console.log('🧹 Cleaning up orphaned fee reminders...');

      const response = await api.post('/api/fee-reminders/admin/cleanup-orphaned');

      if (response.data.success) {
        const deletedCount = response.data.data?.deletedCount || 0;
        toast.success(`Successfully cleaned up ${deletedCount} orphaned fee reminders`);
        // Refresh the reminders list
        await fetchFeeReminders();
        await fetchReminderStats();
      } else {
        toast.error(response.data.message || 'Failed to cleanup orphaned reminders');
      }
    } catch (err) {
      console.error('Error cleaning up orphaned reminders:', err);
      toast.error(err.response?.data?.message || 'Failed to cleanup orphaned reminders');
    } finally {
      setReminderLoading(false);
    }
  };

  // Send manual reminder to specific student
  const sendManualReminder = async (studentId, reminderType = 'manual') => {
    try {
      setSendingReminders(true);
      console.log('📤 Sending manual reminder to student:', studentId);
      console.log('📤 Notification options:', reminderOptions);

      const response = await api.post('/api/fee-reminders/admin/send-manual', {
        studentId,
        reminderType,
        message: reminderMessage || 'Please pay your pending hostel fees.',
        sendEmail: reminderOptions.sendEmail,
        sendPushNotification: reminderOptions.sendPushNotification
      });

      if (response.data.success) {
        const emailSent = response.data.data?.emailSent;
        const pushSent = response.data.data?.pushSent;
        
        let statusMessage = 'Reminder sent successfully';
        if (emailSent && pushSent) {
          statusMessage += ' (Email + Push Notification)';
        } else if (emailSent) {
          statusMessage += ' (Email only)';
        } else if (pushSent) {
          statusMessage += ' (Push Notification only)';
        }
        
        toast.success(statusMessage);
        fetchFeeReminders(); // Refresh the list
      } else {
        toast.error(response.data.message || 'Failed to send reminder');
      }

    } catch (err) {
      console.error('Error sending manual reminder:', err);
      toast.error(err.response?.data?.message || 'Failed to send reminder');
    } finally {
      setSendingReminders(false);
    }
  };

  // Send bulk reminders
  const sendBulkReminders = async () => {
    if (selectedReminders.length === 0) {
      toast.error('Please select students to send reminders');
      return;
    }

    try {
      setSendingReminders(true);
      console.log('📤 Sending bulk reminders to:', selectedReminders.length, 'students');
      console.log('📤 Notification options:', reminderOptions);

      const response = await api.post('/api/fee-reminders/admin/send-bulk', {
        studentIds: selectedReminders,
        message: reminderMessage || 'Please pay your pending hostel fees.',
        sendEmail: reminderOptions.sendEmail,
        sendPushNotification: reminderOptions.sendPushNotification
      });

      if (response.data.success) {
        const successCount = response.data.data?.successCount || selectedReminders.length;
        const errorCount = response.data.data?.errorCount || 0;
        
        let statusMessage = `Reminders sent to ${successCount} students`;
        if (reminderOptions.sendEmail && reminderOptions.sendPushNotification) {
          statusMessage += ' (Email + Push Notification)';
        } else if (reminderOptions.sendEmail) {
          statusMessage += ' (Email only)';
        } else if (reminderOptions.sendPushNotification) {
          statusMessage += ' (Push Notification only)';
        }
        
        if (errorCount > 0) {
          statusMessage += `, ${errorCount} failed`;
        }
        
        toast.success(statusMessage);
        setSelectedReminders([]);
        fetchFeeReminders(); // Refresh the list
      } else {
        toast.error(response.data.message || 'Failed to send bulk reminders');
      }

    } catch (err) {
      console.error('Error sending bulk reminders:', err);
      toast.error(err.response?.data?.message || 'Failed to send bulk reminders');
    } finally {
      setSendingReminders(false);
    }
  };

  // Handle reminder selection
  const handleReminderSelection = (reminderId, isSelected) => {
    if (isSelected) {
      setSelectedReminders(prev => [...prev, reminderId]);
    } else {
      setSelectedReminders(prev => prev.filter(id => id !== reminderId));
    }
  };

  // Handle select all reminders
  const handleSelectAllReminders = (isSelected) => {
    if (isSelected) {
      setSelectedReminders(getFilteredReminders.map(reminder => reminder._id));
    } else {
      setSelectedReminders([]);
    }
  };

  // Memoized filter reminders based on current filters
  const getFilteredReminders = useMemo(() => {
    let filtered = [...feeReminders];

    // Client-side search (since we're using debounced search for API calls)
    if (reminderFilters.search && !debouncedSearch) {
      const searchTerm = reminderFilters.search.toLowerCase();
      filtered = filtered.filter(reminder => 
        reminder.student?.name?.toLowerCase().includes(searchTerm) ||
        reminder.student?.rollNumber?.toLowerCase().includes(searchTerm)
      );
    }

    if (reminderFilters.course) {
      filtered = filtered.filter(reminder => 
        reminder.student?.course?._id === reminderFilters.course
      );
    }

    if (reminderFilters.status) {
      if (reminderFilters.status === 'paid') {
        filtered = filtered.filter(reminder => 
          reminder.feeStatus.term1 === 'Paid' && 
          reminder.feeStatus.term2 === 'Paid' && 
          reminder.feeStatus.term3 === 'Paid'
        );
      } else if (reminderFilters.status === 'pending') {
        filtered = filtered.filter(reminder => 
          reminder.feeStatus.term1 === 'Unpaid' || 
          reminder.feeStatus.term2 === 'Unpaid' || 
          reminder.feeStatus.term3 === 'Unpaid'
        );
      }
    }

    if (reminderFilters.reminderType) {
      if (reminderFilters.reminderType === 'active') {
        filtered = filtered.filter(reminder => reminder.currentReminder > 0);
      } else if (reminderFilters.reminderType === 'inactive') {
        filtered = filtered.filter(reminder => reminder.currentReminder === 0);
      }
    }

    return filtered;
  }, [feeReminders, reminderFilters, debouncedSearch]);

  // Create fee reminders for all students
  const createAllFeeReminders = async () => {
    try {
      setReminderLoading(true);
      console.log('🔔 Creating fee reminders for all students...');
      
      const response = await api.post('/api/fee-reminders/admin/create-all');
      
      if (response.data.success) {
        toast.success(response.data.message || 'Fee reminders created successfully');
        // Refresh the reminders list
        await fetchFeeReminders();
        await fetchReminderStats();
      } else {
        toast.error(response.data.message || 'Failed to create fee reminders');
      }
    } catch (err) {
      console.error('Error creating fee reminders:', err);
      toast.error(err.response?.data?.message || 'Failed to create fee reminders');
    } finally {
      setReminderLoading(false);
    }
  };

  // Sync fee status with actual payment data
  const syncFeeStatus = async () => {
    try {
      setReminderLoading(true);
      console.log('🔄 Syncing fee status with payment data...');
      
      const response = await api.post('/api/fee-reminders/admin/sync-fee-status');
      
      if (response.data.success) {
        toast.success(response.data.message || 'Fee status synced successfully');
        // Refresh the reminders list to show updated status
        await fetchFeeReminders();
        await fetchReminderStats();
      } else {
        toast.error(response.data.message || 'Failed to sync fee status');
      }
    } catch (err) {
      console.error('Error syncing fee status:', err);
      toast.error(err.response?.data?.message || 'Failed to sync fee status');
    } finally {
      setReminderLoading(false);
    }
  };

  // Initial load - fetch fee structures if structure tab is active
  useEffect(() => {
    console.log('🔍 Initial load useEffect - activeTab:', activeTab);
    if (activeTab === 'structure') {
      console.log('🔍 Initial load - fetching fee structures...');
      fetchFeeStructures();
    }
  }, []);

  // Fetch payments when payments tab is active
  useEffect(() => {
    if (activeTab === 'payments') {
      fetchAllPayments();
    }
  }, [activeTab]);

  // Fetch fee reminders when reminders tab is active
  useEffect(() => {
    if (activeTab === 'reminders') {
      fetchFeeReminders();
      fetchReminderStats(); // Fetch accurate stats separately
    }
  }, [activeTab]);

  // Fetch reminders when filters change (excluding search which is debounced)
  useEffect(() => {
    if (activeTab === 'reminders') {
      fetchFeeReminders();
      // Don't refetch stats when filters change - stats should show totals for all academic years
    }
  }, [reminderFilters.academicYear, reminderFilters.course, reminderFilters.status, reminderFilters.reminderType]);

  // Fetch reminders when debounced search changes
  useEffect(() => {
    if (activeTab === 'reminders') {
      fetchFeeReminders();
    }
  }, [debouncedSearch]);

  // Fetch reminders when page changes
  useEffect(() => {
    if (activeTab === 'reminders') {
      fetchFeeReminders();
    }
  }, [reminderCurrentPage]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-3 sm:p-4 lg:p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-blue-900 mb-1 sm:mb-2">
            Hostel Fee Management
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            Manage student fee payments and track payment status
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-4 sm:mb-6">
          <div className="border-b border-gray-200 overflow-x-auto">
            <nav className="-mb-px flex space-x-2 sm:space-x-4 lg:space-x-8 min-w-max">
              <button
                onClick={() => setActiveTab('students')}
                className={`py-2 px-2 sm:px-3 lg:px-4 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${activeTab === 'students'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                Students
              </button>
              <button
                onClick={() => setActiveTab('structure')}
                className={`py-2 px-2 sm:px-3 lg:px-4 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${activeTab === 'structure'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                Fee Structure
              </button>
              {/* <button
                onClick={() => setActiveTab('payments')}
                className={`py-2 px-2 sm:px-3 lg:px-4 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${
                  activeTab === 'payments'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Payments
              </button> */}
              <button
                onClick={() => setActiveTab('reminders')}
                className={`py-2 px-2 sm:px-3 lg:px-4 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${
                  activeTab === 'reminders'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Fee Reminders
              </button>
            </nav>
          </div>
        </div>

      {activeTab === 'students' && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <UserGroupIcon className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                </div>
                <div className="ml-2 sm:ml-3">
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Total Students</p>
                  <p className="text-base sm:text-lg font-semibold text-gray-900">{stats.totalStudents}</p>
                  <p className="text-xs text-gray-500 hidden sm:block">Displayed: {students.length} (Page {currentPage})</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <CurrencyDollarIcon className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
                </div>
                <div className="ml-2 sm:ml-3">
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Total Fee Amount</p>
                  <p className="text-base sm:text-lg font-semibold text-gray-900">₹{stats.totalFeeAmount.toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <ReceiptRefundIcon className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
                </div>
                <div className="ml-2 sm:ml-3">
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Students with Concession</p>
                  <p className="text-base sm:text-lg font-semibold text-gray-900">{stats.studentsWithConcession || 0}</p>
                  <p className="text-xs text-gray-500 hidden sm:block">
                    {stats.totalStudents > 0 ? Math.round(((stats.studentsWithConcession || 0) / stats.totalStudents) * 100) : 0}% of total
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4">
              <div className="flex items-center">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <CurrencyDollarIcon className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" />
                </div>
                <div className="ml-2 sm:ml-3">
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Total Concession</p>
                  <p className="text-base sm:text-lg font-semibold text-gray-900">₹{(stats.totalConcessionAmount || 0).toLocaleString()}</p>
                  <p className="text-xs text-gray-500 hidden sm:block">
                    {stats.totalFeeAmount > 0 ? Math.round(((stats.totalConcessionAmount || 0) / stats.totalFeeAmount) * 100) : 0}% of total fees
                  </p>
                </div>
              </div>
            </div>
          </div>


          {/* Fee Structure Summary - COMMENTED OUT */}
          {/* {activeTab === 'students' && feeStructures.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Fee Structure Summary</h3>

              <div className="mb-4 flex gap-2">
                <select
                  value={feeStructureFilter.academicYear}
                  onChange={(e) => handleFeeStructureFilterChange('academicYear', e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Academic Years</option>
                  {[...new Set(feeStructures.map(s => s.academicYear))].sort().map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>

                <select
                  value={feeStructureFilter.category || ''}
                  onChange={(e) => handleFeeStructureFilterChange('category', e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Categories</option>
                  {[...new Set(feeStructures.map(s => s.category))].sort().map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>

                <button
                  onClick={() => setFeeStructureFilter({ academicYear: '', category: '' })}
                  className="px-3 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Clear Filters
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {(() => {
                  let filteredStructures = feeStructures;

                  if (feeStructureFilter.academicYear) {
                    filteredStructures = filteredStructures.filter(s =>
                      s.academicYear === feeStructureFilter.academicYear
                    );
                  }

                  if (feeStructureFilter.category) {
                    filteredStructures = filteredStructures.filter(s =>
                      s.category === feeStructureFilter.category
                    );
                  }

                  return filteredStructures.map((structure, index) => (
                    <div key={`${structure.academicYear}-${structure.course?._id || structure.course}-${structure.year}-${structure.category}-${index}`} className="bg-gray-50 rounded-lg p-3">
                      <div className="text-sm font-medium text-gray-900">{structure.category}</div>
                      <div className="text-lg font-bold text-blue-600">₹{structure.totalFee.toLocaleString()}</div>
                      <div className="text-xs text-gray-500">{structure.academicYear}</div>
                    </div>
                  ));
                })()}
              </div>

              <div className="mt-3 text-sm text-gray-600">
                Showing {(() => {
                  let filteredCount = feeStructures.length;
                  if (feeStructureFilter.academicYear) {
                    filteredCount = feeStructures.filter(s => s.academicYear === feeStructureFilter.academicYear).length;
                  }
                  if (feeStructureFilter.category) {
                    filteredCount = feeStructures.filter(s => s.category === feeStructureFilter.category).length;
                  }
                  return filteredCount;
                })()} of {feeStructures.length} Fee Structures |
                Academic Years: {[...new Set(feeStructures.map(s => s.academicYear))].sort().join(', ')}
              </div>
            </div>
          )} */}





          {/* Filters */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4 mb-4 sm:mb-6">
            {/* Search Bar */}
            <div className="mb-4">
              <div className="relative">
                <MagnifyingGlassIcon className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by student name or roll number..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="w-full pl-9 sm:pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
              <select
                value={filters.academicYear}
                onChange={(e) => handleFilterChange('academicYear', e.target.value)}
                className="px-2 sm:px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value="">All Years</option>
                <option value="2023-2024">2023-2024</option>
                <option value="2024-2025">2024-2025</option>
                <option value="2025-2026">2025-2026</option>
              </select>

              <select
                value={filters.course}
                onChange={(e) => handleFilterChange('course', e.target.value)}
                className="px-2 sm:px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value="">All Courses</option>
                {courses.map(course => (
                  <option key={course._id} value={course._id}>{course.name}</option>
                ))}
              </select>

              <select
                value={filters.category}
                onChange={(e) => handleFilterChange('category', e.target.value)}
                className="px-2 sm:px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value="">All Categories</option>
                <option value="A+">A+</option>
                <option value="A">A</option>
                <option value="B+">B+</option>
                <option value="B">B</option>
                <option value="C">C</option>
              </select>

              <select
                value={filters.gender}
                onChange={(e) => handleFilterChange('gender', e.target.value)}
                className="px-2 sm:px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value="">All Genders</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>

              <div className="flex gap-2 col-span-2 sm:col-span-1">
                <button
                  onClick={clearFilters}
                  className="flex-1 sm:flex-none px-3 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center justify-center gap-1 text-sm"
                >
                  <FunnelIcon className="w-4 h-4" />
                  <span className="hidden sm:inline">Clear</span>
                </button>

                <button
                  onClick={fetchStudents}
                  className="flex-1 sm:flex-none px-3 py-2 text-blue-600 hover:text-blue-800 border border-blue-300 rounded-lg hover:bg-blue-50 flex items-center justify-center gap-1 text-sm"
                >
                  <ArrowPathIcon className="w-4 h-4" />
                  <span className="hidden sm:inline">Refresh</span>
                </button>
              </div>
            </div>
          </div>

          {/* Students Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 bg-gray-50">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                <h3 className="text-base sm:text-lg font-medium text-gray-900">Student Fee Management</h3>
                <div className="text-xs sm:text-sm text-gray-600">
                  Showing {students.length} of {stats.totalStudents} students
                  {totalPages > 1 && ` (Page ${currentPage} of ${totalPages})`}
                </div>
              </div>
            </div>

            {tableLoading ? (
              <div className="flex justify-center items-center py-8">
                <LoadingSpinner />
              </div>
            ) : students.length === 0 ? (
              <div className="text-center py-8 px-4">
                <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No students found</h3>
                <p className="mt-1 text-sm text-gray-500">Please adjust your filters or check back later.</p>
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Student
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Course & Year
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Category
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total Fee
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {students.map((student) => (
                        <tr
                          key={student._id}
                          className="hover:bg-gray-50 cursor-pointer transition-colors duration-200"
                          onClick={() => openBalanceModal(student)}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {student.name || 'No Name'}
                              </div>
                              <div className="text-sm text-gray-500">
                                {student.rollNumber || 'No Roll Number'}
                              </div>
                              <div className="text-xs text-gray-400">
                                {student.roomNumber && `Room: ${student.roomNumber}`}
                                {student.gender && ` • ${student.gender}`}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <div>
                              <div className="font-medium">
                                {student.course?.name || 'Unknown Course'}
                              </div>
                              <div className="text-xs text-gray-500">
                                Year {student.year || 'Unknown'}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {(() => {
                              if (student.category) {
                                const feeStructure = getFeeStructureForStudent(student.course, student.year, student.category, student.academicYear);
                                if (feeStructure) {
                                  const hasConcession = student.concession && student.concession > 0;
                                  return (
                                    <div>
                                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                        {student.category} ✓
                                      </span>
                                      <div className="text-xs text-gray-500 mt-1">
                                        {feeStructure.academicYear} - ₹{feeStructure.totalFee.toLocaleString()}
                                        {hasConcession && (
                                          <div className="text-xs text-blue-600 font-medium">
                                            Concession: ₹{student.concession.toLocaleString()}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                } else {
                                  return (
                                    <div>
                                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                        {student.category} ✗
                                      </span>
                                      <div className="text-xs text-gray-500 mt-1">
                                        Year: {student.academicYear || 'Unknown'}
                                      </div>
                                    </div>
                                  );
                                }
                              }
                              return (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                  Unknown
                                </span>
                              );
                            })()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {(() => {
                              const feeStructure = getFeeStructureForStudent(
                                student.course,
                                student.year,
                                student.category,
                                student.academicYear
                              );
                              if (feeStructure) {
                                const hasConcession = student.concession && student.concession > 0;
                                const originalTotal = feeStructure.totalFee;
                                const calculatedTotal = student.totalCalculatedFee || originalTotal;

                                return (
                                  <div>
                                    {hasConcession ? (
                                      <>
                                        <div className="font-medium text-green-600 line-through">₹{originalTotal.toLocaleString()}</div>
                                        <div className="font-medium text-blue-600">₹{calculatedTotal.toLocaleString()}</div>
                                        <div className="text-xs text-blue-600 font-medium">
                                          After Concession
                                        </div>
                                      </>
                                    ) : (
                                      <div className="font-medium text-green-600">₹{originalTotal.toLocaleString()}</div>
                                    )}
                                  </div>
                                );
                              }
                              return (
                                <div className="text-red-500 text-xs">
                                  <div className="font-medium">No fee structure</div>
                                  <div className="text-gray-400">Course: {student.course?.name || 'Unknown'}</div>
                                  <div className="text-gray-400">Year: {student.year || 'Unknown'}</div>
                                  <div className="text-gray-400">Category: {student.category || 'Unknown'}</div>
                                  <div className="text-gray-400">Academic Year: {student.academicYear || 'Unknown'}</div>
                                </div>
                              );
                            })()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openPaymentModal(student);
                              }}
                              className="text-green-600 hover:text-green-900 mr-3"
                              title="Record Payment"
                            >
                              <ReceiptRefundIcon className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openBalanceModal(student);
                              }}
                              className="text-purple-600 hover:text-purple-900"
                              title="View Balance"
                            >
                              <EyeIcon className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="lg:hidden space-y-3 p-4">
                  {students.map((student) => (
                    <div
                      key={student._id}
                      className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => openBalanceModal(student)}
                    >
                      {/* Student Header */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="text-sm font-medium text-gray-900">
                            {student.name || 'No Name'}
                          </h3>
                          <p className="text-xs text-gray-500">
                            {student.rollNumber || 'No Roll Number'}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {student.roomNumber && `Room: ${student.roomNumber}`}
                            {student.gender && ` • ${student.gender}`}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openPaymentModal(student);
                            }}
                            className="text-green-600 hover:text-green-900 p-1"
                            title="Record Payment"
                          >
                            <ReceiptRefundIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openBalanceModal(student);
                            }}
                            className="text-purple-600 hover:text-purple-900 p-1"
                            title="View Balance"
                          >
                            <EyeIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Course & Year */}
                      <div className="mb-3">
                        <div className="text-xs text-gray-500 mb-1">Course & Year</div>
                        <div className="text-sm font-medium text-gray-900">
                          {student.course?.name || 'Unknown Course'}
                        </div>
                        <div className="text-xs text-gray-500">
                          Year {student.year || 'Unknown'}
                        </div>
                      </div>

                      {/* Category & Fee */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <div className="text-xs text-gray-500 mb-1">Category</div>
                          {(() => {
                            if (student.category) {
                              const feeStructure = getFeeStructureForStudent(student.course, student.year, student.category, student.academicYear);
                              if (feeStructure) {
                                const hasConcession = student.concession && student.concession > 0;
                                return (
                                  <div>
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                      {student.category} ✓
                                    </span>
                                    {hasConcession && (
                                      <div className="text-xs text-blue-600 font-medium mt-1">
                                        Concession: ₹{student.concession.toLocaleString()}
                                      </div>
                                    )}
                                  </div>
                                );
                              } else {
                                return (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                    {student.category} ✗
                                  </span>
                                );
                              }
                            }
                            return (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                Unknown
                              </span>
                            );
                          })()}
                        </div>

                        <div>
                          <div className="text-xs text-gray-500 mb-1">Total Fee</div>
                          {(() => {
                            const feeStructure = getFeeStructureForStudent(
                              student.course,
                              student.year,
                              student.category,
                              student.academicYear
                            );
                            if (feeStructure) {
                              const hasConcession = student.concession && student.concession > 0;
                              const originalTotal = feeStructure.totalFee;
                              const calculatedTotal = student.totalCalculatedFee || originalTotal;

                              return (
                                <div>
                                  {hasConcession ? (
                                    <>
                                      <div className="text-sm font-medium text-green-600 line-through">₹{originalTotal.toLocaleString()}</div>
                                      <div className="text-sm font-medium text-blue-600">₹{calculatedTotal.toLocaleString()}</div>
                                      <div className="text-xs text-blue-600 font-medium">
                                        After Concession
                                      </div>
                                    </>
                                  ) : (
                                    <div className="text-sm font-medium text-green-600">₹{originalTotal.toLocaleString()}</div>
                                  )}
                                </div>
                              );
                            }
                            return (
                              <div className="text-red-500 text-xs">
                                <div className="font-medium">No fee structure</div>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="bg-white px-3 sm:px-4 lg:px-6 py-3 flex items-center justify-between border-t border-gray-200">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <span className="flex items-center text-sm text-gray-700">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Page <span className="font-medium">{currentPage}</span> of{' '}
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

      {activeTab === 'structure' && (
        <>
          {/* Fee Structure Management */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Fee Structure Management</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => openFeeStructureModal()}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={courses.length === 0}
                >
                  <PlusIcon className="w-4 h-4" />
                  Add Fee Structure
                </button>
              </div>
            </div>

            {/* Filters - Side by Side */}
            <div className="mb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Academic Year Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Filter by Academic Year
                  </label>
                  <select
                    value={feeStructureFilter.academicYear}
                    onChange={(e) => handleFeeStructureFilterChange('academicYear', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">All Academic Years</option>
                    {generateAcademicYears().map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>

                {/* Course Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Filter by Course
                  </label>
                  <select
                    value={feeStructureFilter.course || ''}
                    onChange={(e) => handleFeeStructureFilterChange('course', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">All Courses</option>
                    {courses.map(course => (
                      <option key={course._id} value={course._id}>{course.name}</option>
                    ))}
                  </select>
                </div>

                {/* Year Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Filter by Year
                  </label>
                  <select
                    value={feeStructureFilter.year || ''}
                    onChange={(e) => handleFeeStructureFilterChange('year', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={!feeStructureFilter.course}
                  >
                    <option value="">All Years</option>
                    {courseYears.map(year => (
                      <option key={year} value={year}>Year {year}</option>
                    ))}
                  </select>
                </div>

                {/* Category Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Filter by Category
                  </label>
                  <select
                    value={feeStructureFilter.category || ''}
                    onChange={(e) => handleFeeStructureFilterChange('category', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">All Categories</option>
                    {[...new Set(feeStructures.map(s => s.category))].sort().map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Filter Summary and Clear Button */}
            <div className="mb-4 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                {(() => {
                  let filteredCount = feeStructures.length;
                  if (feeStructureFilter.academicYear) {
                    filteredCount = feeStructures.filter(s => s.academicYear === feeStructureFilter.academicYear).length;
                  }
                  if (feeStructureFilter.course) {
                    filteredCount = feeStructures.filter(s => s.course?._id === feeStructureFilter.course).length;
                  }
                  if (feeStructureFilter.year) {
                    filteredCount = feeStructures.filter(s => s.year === parseInt(feeStructureFilter.year)).length;
                  }
                  if (feeStructureFilter.category) {
                    filteredCount = feeStructures.filter(s => s.category === feeStructureFilter.category).length;
                  }
                  return `Showing ${filteredCount} of ${feeStructures.length} fee structures`;
                })()}
              </div>
              <button
                onClick={() => setFeeStructureFilter({ academicYear: '', course: '', year: '', category: '' })}
                className="px-3 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
              >
                Clear Filters
              </button>
            </div>

            <div className="overflow-x-auto">
              {(() => {
                // Check if any structures match the current filters
                let filteredStructures = feeStructures;
                if (feeStructureFilter.academicYear) {
                  filteredStructures = filteredStructures.filter(s => s.academicYear === feeStructureFilter.academicYear);
                }
                if (feeStructureFilter.course) {
                  filteredStructures = filteredStructures.filter(s => s.course?._id === feeStructureFilter.course);
                }
                if (feeStructureFilter.year) {
                  filteredStructures = filteredStructures.filter(s => s.year === parseInt(feeStructureFilter.year));
                }

                if (filteredStructures.length === 0 && (feeStructureFilter.academicYear || feeStructureFilter.course || feeStructureFilter.year)) {
                  return (
                    <div className="text-center py-8">
                      <Cog6ToothIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-500">No fee structures found matching the current filters</p>
                      <p className="text-sm text-gray-400 mt-2">
                        Try adjusting your filters or create new fee structures.
                      </p>
                    </div>
                  );
                }

                return (
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Academic Year
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Course
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Year
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Category
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total Fee
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Term 1 (40%)
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Term 2 (30%)
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Term 3 (30%)
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredStructures.map((structure, index) => (
                        <tr key={`${structure.academicYear}-${structure.course?._id || structure.course}-${structure.year}-${structure.category}-${index}`} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {structure.academicYear}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {structure.course?.name || 'Unknown Course'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            Year {structure.year}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {structure.category}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            ₹{structure.totalFee.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ₹{structure.term1Fee || Math.round(structure.totalFee * 0.4).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ₹{structure.term2Fee || Math.round(structure.totalFee * 0.3).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ₹{structure.term3Fee || Math.round(structure.totalFee * 0.3).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex gap-2">
                              <button
                                onClick={() => openFeeStructureModal(structure)}
                                className="text-blue-600 hover:text-blue-900"
                              >
                                <EyeIcon className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => deleteFeeStructure(structure.academicYear, structure.course?._id || structure.course, structure.year, structure.category)}
                                className="text-red-600 hover:text-red-900"
                              >
                                <TrashIcon className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                );
              })()}
            </div>
          </div>
        </>
      )}




      {/* Payment Modal */}
      {showPaymentModal && selectedStudentForPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-lg sm:max-w-xl lg:max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Record Fee Payment
              </h3>
              <button
                onClick={handleClosePaymentModal}
                className="p-1 text-gray-400 hover:text-gray-600"
                aria-label="Close modal"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
              {/* Student Details */}
              <div className="p-3 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-3">Student Details</h4>
                <div className="text-sm text-blue-800 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
                    <span className="font-medium min-w-[100px]">Name:</span>
                    <span className="font-semibold">{selectedStudentForPayment.name}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
                    <span className="font-medium min-w-[100px]">Roll Number:</span>
                    <span className="font-semibold">{selectedStudentForPayment.rollNumber}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
                    <span className="font-medium min-w-[100px]">Category:</span>
                    <span className="font-semibold">{selectedStudentForPayment.category}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
                    <span className="font-medium min-w-[100px]">Room No:</span>
                    <span className="font-semibold">{selectedStudentForPayment.roomNumber}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
                    <span className="font-medium min-w-[100px]">Academic Year:</span>
                    <span className="font-semibold">{selectedStudentForPayment.academicYear}</span>
                  </div>
                </div>
              </div>

              {/* Fee Information with Concession */}
              {(() => {
                const feeStructure = getFeeStructureForStudent(selectedStudentForPayment.course, selectedStudentForPayment.year, selectedStudentForPayment.category, selectedStudentForPayment.academicYear);
                if (feeStructure) {
                  const hasConcession = selectedStudentForPayment.concession && selectedStudentForPayment.concession > 0;
                  const originalTotal = feeStructure.totalFee;
                  const calculatedTotal = selectedStudentForPayment.totalCalculatedFee || originalTotal;

                  return (
                    <div className="p-3 bg-green-50 rounded-lg">
                      <h4 className="font-medium text-green-900 mb-3">Fee Information</h4>
                      <div className="text-sm text-green-800 space-y-2">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
                          <span className="font-medium min-w-[120px]">Original Total:</span>
                          <span className="font-semibold">₹{originalTotal.toLocaleString()}</span>
                        </div>
                        {hasConcession && (
                          <>
                            <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
                              <span className="font-medium min-w-[120px]">Concession:</span>
                              <span className="font-semibold text-green-700">₹{selectedStudentForPayment.concession.toLocaleString()}</span>
                            </div>
                            <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
                              <span className="font-medium min-w-[120px]">Final Amount:</span>
                              <span className="font-semibold text-blue-700">₹{calculatedTotal.toLocaleString()}</span>
                            </div>
                          </>
                        )}
                        <div className="mt-3 pt-3 border-t border-green-200">
                          <p className="font-medium mb-2">Term Breakdown:</p>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                            <div className="bg-white p-2 rounded border border-green-200">
                              <span className="font-medium block text-gray-700">Term 1:</span>
                              <span className="text-green-700 font-semibold">
                                ₹{hasConcession ?
                                  (selectedStudentForPayment.calculatedTerm1Fee || Math.round(originalTotal * 0.4)).toLocaleString() :
                                  (feeStructure.term1Fee || Math.round(originalTotal * 0.4)).toLocaleString()
                                }
                              </span>
                            </div>
                            <div className="bg-white p-2 rounded border border-green-200">
                              <span className="font-medium block text-gray-700">Term 2:</span>
                              <span className="text-green-700 font-semibold">
                                ₹{hasConcession ?
                                  (selectedStudentForPayment.calculatedTerm2Fee || Math.round(originalTotal * 0.3)).toLocaleString() :
                                  (feeStructure.term2Fee || Math.round(originalTotal * 0.3)).toLocaleString()
                                }
                              </span>
                            </div>
                            <div className="bg-white p-2 rounded border border-green-200">
                              <span className="font-medium block text-gray-700">Term 3:</span>
                              <span className="text-green-700 font-semibold">
                                ₹{hasConcession ?
                                  (selectedStudentForPayment.calculatedTerm3Fee || Math.round(originalTotal * 0.3)).toLocaleString() :
                                  (feeStructure.term3Fee || Math.round(originalTotal * 0.3)).toLocaleString()
                                }
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}
            </div>

            <form onSubmit={handlePaymentSubmit}>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Payment Type
                    </label>
                    <select
                      value={paymentForm.paymentType}
                      onChange={(e) => setPaymentForm(prev => ({
                        ...prev,
                        paymentType: e.target.value,
                        term: '',
                        billId: '',
                        month: '',
                        amount: ''
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      required
                    >
                      <option value="hostel_fee">Hostel Fee</option>
                      <option value="electricity">Electricity Bill</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Payment Method
                    </label>
                    <select
                      value={paymentForm.paymentMethod}
                      onChange={(e) => setPaymentForm(prev => ({ ...prev, paymentMethod: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      required
                    >
                      <option value="Cash">Cash</option>
                      <option value="Online">Online</option>
                    </select>
                  </div>

                  {paymentForm.paymentMethod === 'Online' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        UTR Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={paymentForm.utrNumber}
                        onChange={(e) => setPaymentForm(prev => ({ ...prev, utrNumber: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        placeholder="Enter UTR/Transaction ID"
                        required
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Unique Transaction Reference number from your bank
                      </p>
                    </div>
                  )}

                  {paymentForm.paymentType === 'electricity' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Select Month
                      </label>
                      <select
                        value={paymentForm.month}
                        onChange={async (e) => {
                          const selectedMonth = e.target.value;
                          setPaymentForm(prev => ({
                            ...prev,
                            month: selectedMonth,
                            billId: '',
                            amount: ''
                          }));
                          setSelectedElectricityBill(null);

                          if (selectedMonth && selectedStudentForPayment) {
                            await fetchElectricityBillForMonth(selectedStudentForPayment, selectedMonth);
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        required
                      >
                        <option value="">Select Month</option>
                        {availableMonths.map(month => (
                          <option key={month} value={month}>
                            {new Date(month).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long'
                            })}
                          </option>
                        ))}
                        {availableMonths.length === 0 && !electricityBillsLoading && (
                          <option value="" disabled>No unpaid bills found</option>
                        )}
                      </select>
                      {electricityBillsLoading && (
                        <p className="text-xs text-gray-500 mt-1">Loading...</p>
                      )}
                      {!electricityBillsLoading && availableMonths.length === 0 && (
                        <p className="text-sm text-green-600 mt-1">✅ All electricity bills are paid</p>
                      )}
                    </div>
                  )}

                  {paymentForm.paymentType === 'electricity' && selectedElectricityBill && (
                    <div className="col-span-full">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h4 className="text-sm font-medium text-blue-900 mb-2">Bill Details</h4>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">Month:</span>
                            <span className="ml-2 font-medium">
                              {new Date(selectedElectricityBill.month).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long'
                              })}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600">Your Share:</span>
                            <span className="ml-2 font-medium text-green-600">₹{selectedElectricityBill.amount}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Total Bill:</span>
                            <span className="ml-2 font-medium">₹{selectedElectricityBill.totalBill}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Consumption:</span>
                            <span className="ml-2 font-medium">{selectedElectricityBill.consumption} units</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Amount (₹)
                    </label>
                    <input
                      type="number"
                      value={paymentForm.amount}
                      onChange={(e) => setPaymentForm(prev => ({ ...prev, amount: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      required
                      min="1"
                      step="0.01"
                      placeholder={paymentForm.paymentType === 'electricity' && selectedElectricityBill ?
                        `Enter amount (Bill: ₹${selectedElectricityBill.amount})` :
                        "Enter payment amount"
                      }
                    />
                    {paymentForm.paymentType === 'electricity' && selectedElectricityBill && (
                      <div className="mt-2">
                        <button
                          type="button"
                          onClick={() => setPaymentForm(prev => ({ ...prev, amount: selectedElectricityBill.amount.toString() }))}
                          className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200"
                        >
                          Pay Full Bill (₹{selectedElectricityBill.amount})
                        </button>
                      </div>
                    )}
                    {paymentForm.paymentType === 'hostel_fee' && selectedStudentForPayment && (() => {
                      const balance = calculateStudentBalance(selectedStudentForPayment);
                      const totalBalance = balance?.totalBalance || 0;
                      return totalBalance > 0 ? (
                        <div className="mt-2 space-y-1">
                          <p className="text-xs text-gray-600">Total Balance: ₹{totalBalance}</p>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setPaymentForm(prev => ({ ...prev, amount: totalBalance.toString() }))}
                              className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200"
                            >
                              Pay Full (₹{totalBalance})
                            </button>
                            <button
                              type="button"
                              onClick={() => setPaymentForm(prev => ({ ...prev, amount: Math.round(totalBalance / 2).toString() }))}
                              className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200"
                            >
                              Pay Half (₹{Math.round(totalBalance / 2)})
                            </button>
                          </div>
                        </div>
                      ) : null;
                    })()}
                  </div>
                </div>


                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes (Optional)
                  </label>
                  <textarea
                    value={paymentForm.notes}
                    onChange={(e) => setPaymentForm(prev => ({ ...prev, notes: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    rows="3"
                    placeholder="Any additional notes about this payment"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={handleClosePaymentModal}
                  className="w-full sm:w-auto px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={paymentLoading || (paymentForm.paymentType === 'electricity' && (!selectedElectricityBill || availableMonths.length === 0))}
                  className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
                >
                  {paymentLoading ? 'Recording...' : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Student Balance Modal */}
      {showBalanceModal && selectedStudentBalance && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-blue-900">
                Student Balance Details
              </h3>
              <button
                onClick={() => {
                  setShowBalanceModal(false);
                  setSelectedStudentBalance(null);
                }}
                className="p-1 text-gray-400 hover:text-gray-600"
                aria-label="Close modal"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-4 p-3 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Student Information</h4>
              <div className="grid grid-cols-2 gap-4 text-sm text-blue-800">
                <div>
                  <p><strong>Name:</strong> {selectedStudentBalance.name}</p>
                  <p><strong>Roll Number:</strong> {selectedStudentBalance.rollNumber}</p>
                </div>
                <div>
                  <p><strong>Category:</strong> {selectedStudentBalance.category}</p>
                  <p><strong>Academic Year:</strong> {selectedStudentBalance.academicYear}</p>
                </div>
              </div>
            </div>

            {balanceLoading ? (
              <div className="text-center py-8">
                <LoadingSpinner />
                <p className="mt-2 text-gray-500">Loading balance details...</p>
              </div>
            ) : (
              <>
                {/* Balance Summary */}
                {(() => {
                  const balance = calculateStudentBalance(selectedStudentBalance);
                  if (!balance) return null;

                  return (
                    <div className="mb-6">
                      <h4 className="font-medium text-gray-900 mb-3">Balance Summary</h4>

                      {/* Concession Information */}
                      {balance.hasConcession && (
                        <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <h5 className="font-medium text-blue-900 mb-2">Concession Applied</h5>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div className="text-center">
                              <span className="text-gray-600">Original Fee:</span>
                              <div className="font-bold text-gray-900 line-through">₹{balance.originalTotalFee.toLocaleString()}</div>
                            </div>
                            <div className="text-center">
                              <span className="text-gray-600">Concession:</span>
                              <div className="font-bold text-green-600">₹{balance.concessionAmount.toLocaleString()}</div>
                            </div>
                            <div className="text-center">
                              <span className="text-gray-600">Final Fee:</span>
                              <div className="font-bold text-blue-600">₹{balance.calculatedTotalFee.toLocaleString()}</div>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-white rounded-lg p-4 border border-gray-200">
                          <div className="text-sm font-medium text-gray-600">
                            {balance.hasConcession ? 'Final Fee (After Concession)' : 'Total Fee'}
                          </div>
                          <div className="text-lg font-bold text-gray-900">
                            ₹{balance.hasConcession ? balance.calculatedTotalFee.toLocaleString() : balance.feeStructure.totalFee.toLocaleString()}
                          </div>
                          {balance.hasConcession && (
                            <div className="text-xs text-gray-500 line-through">
                              Original: ₹{balance.originalTotalFee.toLocaleString()}
                            </div>
                          )}
                        </div>
                        <div className="bg-white rounded-lg p-4 border border-gray-200">
                          <div className="text-sm font-medium text-gray-600">Total Paid</div>
                          <div className="text-lg font-bold text-green-600">₹{balance.totalPaid.toLocaleString()}</div>
                        </div>
                        <div className="bg-white rounded-lg p-4 border border-gray-200">
                          <div className="text-sm font-medium text-gray-600">Total Balance</div>
                          <div className={`text-lg font-bold ${balance.totalBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            ₹{balance.totalBalance.toLocaleString()}
                          </div>
                        </div>
                        <div className="bg-white rounded-lg p-4 border border-gray-200">
                          <div className="text-sm font-medium text-gray-600">Status</div>
                          <div className={`text-lg font-bold ${balance.isFullyPaid ? 'text-green-600' : 'text-orange-600'}`}>
                            {balance.isFullyPaid ? 'Fully Paid' : 'Payment Pending'}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Payment Status Section */}
                {(() => {
                  const balance = calculateStudentBalance(selectedStudentBalance);
                  if (!balance) return null;

                  return (
                    <div className="mb-6">
                      {/* <h4 className="font-medium text-gray-900 mb-3">Payment Status Overview</h4>
                      <div className="bg-gradient-to-r from-orange-50 to-amber-50 p-4 rounded-lg border border-orange-200">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="text-center">
                            <div className="text-sm font-medium text-orange-700 mb-1">Payment Status</div>
                            <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                              balance.isFullyPaid ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                            }`}>
                              {balance.isFullyPaid ? '✓ Fully Paid' : '⚠ Payment Pending'}
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-sm font-medium text-orange-700 mb-1">Next Due</div>
                            <div className="text-sm font-medium text-gray-900">
                              {balance.totalBalance > 0 ? 'Immediate' : 'No Dues'}
                            </div>
                          </div>
                        </div>
                        <div className="mt-3 pt-3 border-t border-orange-200">
                          <div className="text-center text-sm text-orange-600">
                            {balance.totalBalance > 0 
                              ? `₹${balance.totalBalance.toLocaleString()} payment required`
                              : 'All payments completed successfully'
                            }
                          </div>
                        </div>
                      </div> */}
                    </div>
                  );
                })()}

                {/* Term-wise Breakdown */}
                {(() => {
                  const balance = calculateStudentBalance(selectedStudentBalance);
                  if (!balance) return null;

                  return (
                    <div className="mb-6">
                      <h4 className="font-medium text-gray-900 mb-3">Term-wise Breakdown</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {Object.entries(balance.termBalances).map(([term, termData]) => {
                          // Get original term fee for comparison
                          const originalTermFee = balance.feeStructure[term === 'term1' ? 'term1Fee' : term === 'term2' ? 'term2Fee' : 'term3Fee'] ||
                            Math.round(balance.feeStructure.totalFee * (term === 'term1' ? 0.4 : 0.3));

                          return (
                            <div key={term} className="bg-white rounded-lg p-4 border border-gray-200">
                              <div className="text-sm font-medium text-gray-600 mb-2">
                                {term.replace('term', 'Term ')}
                              </div>
                              <div className="space-y-2 text-sm">
                                
                                <div className="flex justify-between">
                                  <span>Required:</span>
                                  <span className="font-medium">₹{termData.required.toLocaleString()}</span>
                                </div>
                                
                                <div className="flex justify-between">
                                  <span>Balance:</span>
                                  <span className={`font-medium ${termData.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                    ₹{termData.balance.toLocaleString()}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {/* Payment History */}
                <div className="mb-6">
                  <h4 className="font-medium text-gray-900 mb-3">Payment History</h4>
                  {studentPayments.length === 0 ? (
                    <div className="text-center py-4 text-gray-500">
                      <ReceiptRefundIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p>No payments recorded yet</p>
                    </div>
                  ) : (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="space-y-3">
                        {studentPayments.map((payment) => (
                          <div key={payment._id} className="flex items-center justify-between bg-white p-3 rounded-lg border">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{payment.term?.replace('term', 'Term ')}</span>
                                <span className="text-sm text-gray-500">
                                  {new Date(payment.paymentDate).toLocaleDateString()}
                                </span>
                              </div>
                              <div className="text-sm text-gray-600">
                                {payment.paymentMethod} • {payment.notes || 'No notes'}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-medium text-green-600">₹{payment.amount.toLocaleString()}</div>
                              <div className="text-xs text-gray-500">{payment.transactionId}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      setShowBalanceModal(false);
                      setSelectedStudentBalance(null);
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      setShowBalanceModal(false);
                      openPaymentModal(selectedStudentBalance);
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Record Payment
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Fee Structure Modal */}
      {showFeeStructureModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                {selectedFeeStructure ? 'Edit Fee Structure' : 'Add Fee Structure'}
              </h3>
              <button
                onClick={() => setShowFeeStructureModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600"
                aria-label="Close modal"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleFeeStructureSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Academic Year
                  </label>
                  <select
                    value={feeStructureForm.academicYear}
                    onChange={(e) => setFeeStructureForm(prev => ({ ...prev, academicYear: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">Select Academic Year</option>
                    {generateAcademicYears().map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Course
                  </label>
                  <select
                    value={feeStructureForm.course}
                    onChange={(e) => setFeeStructureForm(prev => ({ ...prev, course: e.target.value, year: '' }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">Select Course</option>
                    {courses.map(course => (
                      <option key={course._id} value={course._id}>{course.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Year of Study
                  </label>
                  <select
                    value={feeStructureForm.year}
                    onChange={(e) => setFeeStructureForm(prev => ({ ...prev, year: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                    disabled={!feeStructureForm.course || getAvailableYearsForCreation(feeStructureForm.course, feeStructureForm.academicYear).length === 0}
                  >
                    <option value="">
                      {!feeStructureForm.course 
                        ? 'Select Course first'
                        : getAvailableYearsForCreation(feeStructureForm.course, feeStructureForm.academicYear).length === 0 
                          ? 'All years already have fee structures'
                          : 'Select Year'
                      }
                    </option>
                    {getAvailableYearsForCreation(feeStructureForm.course, feeStructureForm.academicYear).map(year => (
                      <option key={year} value={year}>Year {year}</option>
                    ))}
                  </select>
                  {getAvailableYearsForCreation(feeStructureForm.course, feeStructureForm.academicYear).length === 0 && feeStructureForm.course && (
                    <p className="text-sm text-gray-500 mt-1">
                      All years for this course already have fee structures for the selected academic year.
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    value={feeStructureForm.category}
                    onChange={(e) => setFeeStructureForm(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                    disabled={getAvailableCategoriesForCreation().length === 0}
                  >
                    <option value="">
                      {getAvailableCategoriesForCreation().length === 0
                        ? 'All categories already created for this combination'
                        : 'Select Category'
                      }
                    </option>
                    {getAvailableCategoriesForCreation().map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                  {getAvailableCategoriesForCreation().length === 0 && feeStructureForm.course && feeStructureForm.year && (
                    <p className="text-sm text-gray-500 mt-1">
                      All categories for this course and year already have fee structures for the selected academic year.
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Total Fee (₹)
                  </label>
                  <input
                    type="number"
                    value={feeStructureForm.totalFee}
                    onChange={(e) => setFeeStructureForm(prev => ({ ...prev, totalFee: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                    min="0"
                  />
                </div>

                {/* Term Fee Breakdown Preview */}
                {feeStructureForm.totalFee > 0 && (
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
                    <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                      <CurrencyDollarIcon className="w-4 h-4 mr-2 text-blue-600" />
                      Term Fee Breakdown (Auto-calculated)
                    </h4>
                    <div className="grid grid-cols-3 gap-3 text-sm">
                      <div className="text-center bg-white rounded-lg p-2 border border-blue-100">
                        <div className="font-medium text-blue-600">Term 1</div>
                        <div className="text-gray-600 font-semibold">₹{calculateTermFees(feeStructureForm.totalFee).term1Fee.toLocaleString()}</div>
                        <div className="text-xs text-gray-500">40%</div>
                      </div>
                      <div className="text-center bg-white rounded-lg p-2 border border-green-100">
                        <div className="font-medium text-green-600">Term 2</div>
                        <div className="text-gray-600 font-semibold">₹{calculateTermFees(feeStructureForm.totalFee).term2Fee.toLocaleString()}</div>
                        <div className="text-xs text-gray-500">30%</div>
                      </div>
                      <div className="text-center bg-white rounded-lg p-2 border border-purple-100">
                        <div className="font-medium text-purple-600">Term 3</div>
                        <div className="text-gray-600 font-semibold">₹{calculateTermFees(feeStructureForm.totalFee).term3Fee.toLocaleString()}</div>
                        <div className="text-xs text-gray-500">30%</div>
                      </div>
                    </div>
                    <div className="mt-3 text-center">
                      <div className="text-sm font-medium text-gray-700">
                        Total: ₹{feeStructureForm.totalFee.toLocaleString()}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowFeeStructureModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={feeStructureLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {feeStructureLoading ? 'Saving...' : (selectedFeeStructure ? 'Update' : 'Save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payments Tab Content */}
      {activeTab === 'payments' && (
        <>
          {/* Payment Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <ReceiptRefundIcon className="w-6 h-6 text-green-600" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Total Payments</p>
                  <p className="text-lg font-semibold text-gray-900">{payments.length}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <CurrencyDollarIcon className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Total Amount</p>
                  <p className="text-lg font-semibold text-gray-900">
                    ₹{payments.reduce((sum, p) => sum + p.amount, 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <BanknotesIcon className="w-6 h-6 text-purple-600" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Cash Payments</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {payments.filter(p => p.paymentMethod === 'Cash').length}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex items-center">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <CreditCardIcon className="w-6 h-6 text-orange-600" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Online Payments</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {payments.filter(p => p.paymentMethod === 'Online').length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Payment History Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">Payment History</h3>
                <div className="text-sm text-gray-600">
                  Showing {payments.length} payments
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              {paymentHistoryLoading ? (
                <div className="p-8 text-center text-gray-500">
                  <LoadingSpinner />
                  <p className="mt-2">Loading payment history...</p>
                </div>
              ) : payments.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <ReceiptRefundIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p>No payments recorded yet</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Start recording payments from the Students tab
                  </p>
                </div>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Student
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Payment Type & Details
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Method
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {payments.map((payment) => (
                      <tr key={payment._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {payment.studentName}
                            </div>
                            <div className="text-sm text-gray-500">
                              {payment.studentRollNumber}
                            </div>
                            <div className="text-xs text-blue-600">
                              {payment.category} - {payment.academicYear}
                            </div>
                            {payment.roomNumber && (
                              <div className="text-xs text-gray-500">
                                Room: {payment.roomNumber}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${payment.paymentType === 'electricity'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-blue-100 text-blue-800'
                                }`}>
                                {payment.paymentType === 'electricity' ? '⚡ Electricity' : '🏠 Hostel Fee'}
                              </span>
                            </div>
                            <div className="text-sm font-medium text-gray-900 mt-1">
                              {payment.paymentType === 'electricity'
                                ? `Bill Month: ${payment.billMonth || 'N/A'}`
                                : `Term: ${payment.term || 'N/A'}`
                              }
                            </div>
                            <div className="text-xs text-gray-500">
                              {payment.notes || 'No notes'}
                            </div>
                            {payment.paymentMethod === 'Online' && payment.utrNumber && (
                              <div className="text-xs text-blue-600 font-medium">
                                UTR: {payment.utrNumber}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                          ₹{payment.amount.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${payment.paymentMethod === 'Cash'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-blue-100 text-blue-800'
                            }`}>
                            {payment.paymentMethod}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(payment.paymentDate).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => generateReceipt(payment)}
                            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors duration-200"
                            title="Download Receipt"
                          >
                            <DocumentTextIcon className="w-4 h-4" />
                            <span>Download</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}

      {/* Fee Reminders Tab Content */}
      {activeTab === 'reminders' && (
        <>
          {/* Reminder Statistics */}
          {console.log('🔍 Current reminderStats in render:', reminderStats)}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <UserGroupIcon className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                </div>
                <div className="ml-2 sm:ml-3">
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Total Students </p>
                  <p className="text-base sm:text-lg font-semibold text-gray-900">{reminderStats.totalStudents || 0}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4">
              <div className="flex items-center">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <DocumentTextIcon className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600" />
                </div>
                <div className="ml-2 sm:ml-3">
                  <p className="text-xs sm:text-sm font-medium text-gray-600">With Fee Structure </p>
                  <p className="text-base sm:text-lg font-semibold text-gray-900">{reminderStats.studentsWithReminders || 0}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircleIcon className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
                </div>
                <div className="ml-2 sm:ml-3">
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Paid Students </p>
                  <p className="text-base sm:text-lg font-semibold text-gray-900">{reminderStats.paidStudents}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4">
              <div className="flex items-center">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <ExclamationTriangleIcon className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" />
                </div>
                <div className="ml-2 sm:ml-3">
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Pending Students </p>
                  <p className="text-base sm:text-lg font-semibold text-gray-900">{reminderStats.pendingStudents}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <BellIcon className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
                </div>
                <div className="ml-2 sm:ml-3">
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Active Reminders </p>
                  <p className="text-base sm:text-lg font-semibold text-gray-900">{reminderStats.activeReminders}</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Info about students without fee structures */}
          {reminderStats.studentsWithoutReminders > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <div className="flex items-start">
                <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <h3 className="text-sm font-medium text-yellow-800">
                    {reminderStats.studentsWithoutReminders} students without fee structures
                  </h3>
                  <p className="text-sm text-yellow-700 mt-1">
                    These students don't have fee reminder records because no fee structure is defined for their course/year/category combination. 
                    They are included in the pending count but won't receive fee reminders.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Reminder Management */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 mb-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 space-y-3 sm:space-y-0">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <h2 className="text-lg font-semibold text-gray-900">Fee Reminders Management</h2>
              </div>
              
              {/* Mobile-friendly button layout */}
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-2">
                {/* Primary actions - always visible */}
                <div className="flex gap-2">
                  <button
                    onClick={createAllFeeReminders}
                    disabled={reminderLoading}
                    className="flex-1 sm:flex-none bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
                  >
                    <PlusIcon className="w-4 h-4" />
                    <span className="hidden sm:inline">Create All</span>
                    <span className="sm:hidden">Create</span>
                  </button>
                  <button
                    onClick={syncFeeStatus}
                    disabled={reminderLoading}
                    className="flex-1 sm:flex-none bg-purple-600 text-white px-3 py-2 rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
                  >
                    <ArrowPathIcon className="w-4 h-4" />
                    <span className="hidden sm:inline">Sync Status</span>
                    <span className="sm:hidden">Sync</span>
                  </button>
                </div>
                
                {/* Secondary actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setReminderModalType('bulk');
                      setShowReminderModal(true);
                    }}
                    disabled={selectedReminders.length === 0}
                    className="flex-1 sm:flex-none bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
                  >
                    <BellIcon className="w-4 h-4" />
                    <span className="hidden sm:inline">Send Bulk ({selectedReminders.length})</span>
                    <span className="sm:hidden">Bulk ({selectedReminders.length})</span>
                  </button>
                  <button
                    onClick={() => {
                      fetchFeeReminders();
                      // Don't refresh stats - they should always show totals for all academic years
                    }}
                    className="flex-1 sm:flex-none bg-gray-600 text-white px-3 py-2 rounded-lg hover:bg-gray-700 flex items-center justify-center gap-2 text-sm"
                  >
                    <ArrowPathIcon className="w-4 h-4" />
                    <span className="hidden sm:inline">Refresh List</span>
                    <span className="sm:hidden">Refresh</span>
                  </button>
                  <button
                    onClick={() => {
                      fetchReminderStats();
                    }}
                    className="flex-1 sm:flex-none bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 text-sm"
                  >
                    <ChartBarIcon className="w-4 h-4" />
                    <span className="hidden sm:inline">Refresh Stats</span>
                    <span className="sm:hidden">Stats</span>
                  </button>
                  {/* <button
                    onClick={cleanupOrphanedReminders}
                    className="flex-1 sm:flex-none bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 flex items-center justify-center gap-2 text-sm"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    <span className="hidden sm:inline">Cleanup N/A</span>
                    <span className="sm:hidden">Cleanup</span>
                  </button> */}
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4 mb-6">
              <div className="sm:col-span-2 lg:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search by name or roll number..."
                    value={reminderFilters.search}
                    onChange={(e) => setReminderFilters(prev => ({ ...prev, search: e.target.value }))}
                    className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Academic Year</label>
                <select
                  value={reminderFilters.academicYear}
                  onChange={(e) => setReminderFilters(prev => ({ ...prev, academicYear: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  {generateAcademicYears().map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Course</label>
                <select
                  value={reminderFilters.course}
                  onChange={(e) => setReminderFilters(prev => ({ ...prev, course: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  <option value="">All Courses</option>
                  {courses.map(course => (
                    <option key={course._id} value={course._id}>{course.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={reminderFilters.status}
                  onChange={(e) => setReminderFilters(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  <option value="">All Status</option>
                  <option value="paid">Fully Paid</option>
                  <option value="pending">Pending Payment</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reminder Type</label>
                <select
                  value={reminderFilters.reminderType}
                  onChange={(e) => setReminderFilters(prev => ({ ...prev, reminderType: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  <option value="">All Types</option>
                  <option value="active">Active Reminders</option>
                  <option value="inactive">No Active Reminders</option>
                </select>
              </div>
            </div>

            {/* Reminders Table */}
            <div className="overflow-x-auto">
              {reminderLoading ? (
                <div className="flex justify-center items-center py-8">
                  <LoadingSpinner />
                </div>
              ) : getFilteredReminders.length === 0 ? (
                <div className="text-center py-8">
                  <BellIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No reminders found</h3>
                  <p className="mt-1 text-sm text-gray-500">No fee reminders match your current filters.</p>
                </div>
              ) : (
                <>
                  {/* Desktop Table View */}
                  <div className="hidden lg:block">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            <input
                              type="checkbox"
                              checked={selectedReminders.length === getFilteredReminders.length && getFilteredReminders.length > 0}
                              onChange={(e) => handleSelectAllReminders(e.target.checked)}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Course</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fee Status</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reminder Status</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {getFilteredReminders.map((reminder) => (
                          <tr key={reminder._id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <input
                                type="checkbox"
                                checked={selectedReminders.includes(reminder._id)}
                                onChange={(e) => handleReminderSelection(reminder._id, e.target.checked)}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                              />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {reminder.student?.name || 'N/A'}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {reminder.student?.rollNumber || 'N/A'}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {reminder.student?.course?.name || 'N/A'}
                              </div>
                              <div className="text-sm text-gray-500">
                                Year {reminder.student?.year || 'N/A'}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex space-x-2">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  reminder.feeStatus.term1 === 'Paid' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                }`}>
                                  Term 1
                                </span>
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  reminder.feeStatus.term2 === 'Paid' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                }`}>
                                  Term 2
                                </span>
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  reminder.feeStatus.term3 === 'Paid' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                }`}>
                                  Term 3
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                reminder.currentReminder > 0 ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
                              }`}>
                                {reminder.currentReminder > 0 ? `Reminder ${reminder.currentReminder}` : 'No Active Reminder'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <button
                                onClick={() => {
                                  setReminderModalType('send');
                                  setSelectedReminders([reminder.student._id]);
                                  setShowReminderModal(true);
                                }}
                                className="text-blue-600 hover:text-blue-900 mr-3"
                              >
                                Send Reminder
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Card View */}
                  <div className="lg:hidden space-y-4">
                    {/* Select All for Mobile */}
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedReminders.length === getFilteredReminders.length && getFilteredReminders.length > 0}
                          onChange={(e) => handleSelectAllReminders(e.target.checked)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-3"
                        />
                        <span className="text-sm font-medium text-gray-700">Select All</span>
                      </div>
                      <span className="text-sm text-gray-500">{selectedReminders.length} selected</span>
                    </div>

                    {/* Mobile Cards */}
                    {getFilteredReminders.map((reminder) => (
                      <div key={reminder._id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              checked={selectedReminders.includes(reminder._id)}
                              onChange={(e) => handleReminderSelection(reminder._id, e.target.checked)}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-3"
                            />
                            <div>
                              <h3 className="text-sm font-medium text-gray-900">
                                {reminder.student?.name || 'N/A'}
                              </h3>
                              <p className="text-xs text-gray-500">
                                {reminder.student?.rollNumber || 'N/A'}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              setReminderModalType('send');
                              setSelectedReminders([reminder.student._id]);
                              setShowReminderModal(true);
                            }}
                            className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                          >
                            Send
                          </button>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500">Course:</span>
                            <span className="text-xs font-medium text-gray-900">
                              {reminder.student?.course?.name || 'N/A'} - Year {reminder.student?.year || 'N/A'}
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500">Reminder Status:</span>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              reminder.currentReminder > 0 ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {reminder.currentReminder > 0 ? `Reminder ${reminder.currentReminder}` : 'No Active'}
                            </span>
                          </div>

                          <div>
                            <span className="text-xs text-gray-500 block mb-1">Fee Status:</span>
                            <div className="flex flex-wrap gap-1">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                reminder.feeStatus.term1 === 'Paid' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}>
                                T1
                              </span>
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                reminder.feeStatus.term2 === 'Paid' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}>
                                T2
                              </span>
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                reminder.feeStatus.term3 === 'Paid' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}>
                                T3
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Pagination for Fee Reminders */}
            {reminderTotalPages > 1 && (
              <div className="bg-white px-3 sm:px-6 py-3 flex items-center justify-between border-t border-gray-200">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => setReminderCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={reminderCurrentPage === 1}
                    className="relative inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <span className="flex items-center text-sm text-gray-700">
                    Page {reminderCurrentPage} of {reminderTotalPages}
                  </span>
                  <button
                    onClick={() => setReminderCurrentPage(prev => Math.min(prev + 1, reminderTotalPages))}
                    disabled={reminderCurrentPage === reminderTotalPages}
                    className="relative inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Page <span className="font-medium">{reminderCurrentPage}</span> of{' '}
                      <span className="font-medium">{reminderTotalPages}</span>
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                      <button
                        onClick={() => setReminderCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={reminderCurrentPage === 1}
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => setReminderCurrentPage(prev => Math.min(prev + 1, reminderTotalPages))}
                        disabled={reminderCurrentPage === reminderTotalPages}
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

      {/* Reminder Modal */}
      {showReminderModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative w-full max-w-md sm:max-w-lg mx-auto bg-white rounded-lg shadow-xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900">
                {reminderModalType === 'bulk' ? 'Send Bulk Reminders' : 'Send Manual Reminder'}
              </h3>
              <button
                onClick={() => {
                  setShowReminderModal(false);
                  setReminderMessage('');
                  setSelectedReminders([]);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6">
              {/* Selected Students Info */}
              {reminderModalType === 'bulk' && selectedReminders.length > 0 && (
                <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <span className="font-medium">{selectedReminders.length}</span> student{selectedReminders.length > 1 ? 's' : ''} selected
                  </p>
                </div>
              )}

              {/* Single Student Info for Manual Reminder */}
              {reminderModalType === 'send' && selectedReminders.length > 0 && (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        Sending reminder to:
                      </p>
                      <p className="text-sm text-gray-600">
                        {(() => {
                          const student = students.find(s => s._id === selectedReminders[0]);
                          return student ? `${student.name} (${student.rollNumber})` : 'Loading...';
                        })()}
                      </p>
                      {(() => {
                        const student = students.find(s => s._id === selectedReminders[0]);
                        return student?.email ? (
                          <p className="text-xs text-green-600 mt-1">
                            📧 {student.email}
                          </p>
                        ) : (
                          <p className="text-xs text-red-500 mt-1">
                            ⚠️ No email address available
                          </p>
                        );
                      })()}
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-500">
                        {(() => {
                          const student = students.find(s => s._id === selectedReminders[0]);
                          if (!student?.email) return 'Email disabled';
                          if (!emailServiceStatus?.configured) return 'Email service inactive';
                          return 'Email available';
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Custom Message */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Custom Message (Optional)
                </label>
                <textarea
                  value={reminderMessage}
                  onChange={(e) => setReminderMessage(e.target.value)}
                  placeholder="Enter custom reminder message..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-sm"
                  rows={4}
                />
                <p className="mt-1 text-xs text-gray-500">
                  Leave empty to use default reminder message
                </p>
              </div>

              {/* Notification Options */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Send Via
                </label>
                <div className="space-y-3">
                  {/* Email Option */}
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="sendEmail"
                      checked={reminderOptions.sendEmail}
                      onChange={(e) => setReminderOptions(prev => ({
                        ...prev,
                        sendEmail: e.target.checked
                      }))}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="sendEmail" className="ml-2 text-sm text-gray-700 flex items-center">
                      {/* <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg> */}
                      Email Notification
                      {!emailServiceStatus?.configured && (
                        <span className="ml-2 text-xs text-red-500">(Service Inactive)</span>
                      )}
                    </label>
                  </div>

                  {/* Push Notification Option */}
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="sendPushNotification"
                      checked={reminderOptions.sendPushNotification}
                      onChange={(e) => setReminderOptions(prev => ({
                        ...prev,
                        sendPushNotification: e.target.checked
                      }))}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="sendPushNotification" className="ml-2 text-sm text-gray-700 flex items-center">
                      {/* <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM4.828 7l2.586 2.586a2 2 0 002.828 0L12.828 7H4.828zM4 19h10v-2H4v2z" />
                      </svg> */}
                      Push Notification
                    </label>
                  </div>
                </div>
                
                {/* Validation Message */}
                {!reminderOptions.sendEmail && !reminderOptions.sendPushNotification && (
                  <p className="mt-2 text-xs text-red-500">
                    Please select at least one notification method
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
                <button
                  onClick={() => {
                    setShowReminderModal(false);
                    setReminderMessage('');
                    setSelectedReminders([]);
                  }}
                  className="w-full sm:w-auto px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    // Validate that at least one notification method is selected
                    if (!reminderOptions.sendEmail && !reminderOptions.sendPushNotification) {
                      toast.error('Please select at least one notification method');
                      return;
                    }

                    if (reminderModalType === 'bulk') {
                      sendBulkReminders();
                    } else {
                      sendManualReminder(selectedReminders[0]);
                    }
                    setShowReminderModal(false);
                    setReminderMessage('');
                    setSelectedReminders([]);
                    // Reset options to default
                    setReminderOptions({
                      sendEmail: true,
                      sendPushNotification: true
                    });
                  }}
                  disabled={sendingReminders || (!reminderOptions.sendEmail && !reminderOptions.sendPushNotification)}
                  className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2"
                >
                  {sendingReminders ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Sending...
                    </>
                  ) : (
                    <>
                      <BellIcon className="w-4 h-4" />
                      Send Reminder{reminderModalType === 'bulk' ? 's' : ''}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}      
    </div>
    </div>
  );
};

export default FeeManagement; 