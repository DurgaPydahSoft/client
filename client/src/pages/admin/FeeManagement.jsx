import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useGlobalSettings } from '../../context/GlobalSettingsContext';
import { useCoursesBranches } from '../../context/CoursesBranchesContext';
import { useDebounce } from '../../hooks/useDebounce';
import { useQuery } from '@tanstack/react-query';
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
  BellIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import LoadingSpinner from '../../components/LoadingSpinner';
import ReminderConfig from './ReminderConfig';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const FeeManagement = () => {
  const { user } = useAuth();
  const { settings } = useGlobalSettings();
  const { courses: coursesFromContext } = useCoursesBranches();
  const [students, setStudents] = useState([]);
  const [allStudents, setAllStudents] = useState([]); // Store all students for KPI calculations
  const [stats, setStats] = useState({
    totalStudents: 0,
    studentsWithFees: 0,
    studentsWithoutFees: 0,
    totalFeeAmount: 0,
    averageFeeAmount: 0,
    totalDue: 0,
    term1Due: 0,
    term2Due: 0,
    term3Due: 0,
    totalConcessionAmount: 0,
    studentsWithConcession: 0,
    totalCalculatedFeeAmount: 0
  });
  const [statsLoading, setStatsLoading] = useState(false);
  const [studentFilteredBalances, setStudentFilteredBalances] = useState({}); // Store date-filtered balances for each student
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
    course: '',
    year: ''
  });
  
  // Debounce search to reduce API calls
  const debouncedSearch = useDebounce(filters.search, 500);

  // Fee Structure Management
  const [feeStructures, setFeeStructures] = useState([]);
  const [courses, setCourses] = useState(coursesFromContext || []); // Use from context if available
  const [courseYears, setCourseYears] = useState([]);
  const [duesCourseYears, setDuesCourseYears] = useState([]); // Separate state for dues tab course years
  
  // Update courses when context updates
  useEffect(() => {
    if (coursesFromContext && coursesFromContext.length > 0) {
      setCourses(coursesFromContext);
    }
  }, [coursesFromContext]);
  const [showFeeStructureModal, setShowFeeStructureModal] = useState(false);
  const [selectedFeeStructure, setSelectedFeeStructure] = useState(null);
  const [feeStructureForm, setFeeStructureForm] = useState({
    academicYear: '',
    course: '',
    year: '',
    category: '',
    totalFee: 0
  });
  const [bulkFeeForm, setBulkFeeForm] = useState({
    academicYear: '',
    course: '',
    year: '',
    categories: {
      'A+': { totalFee: 0, exists: false },
      'A': { totalFee: 0, exists: false },
      'B+': { totalFee: 0, exists: false },
      'B': { totalFee: 0, exists: false },
    }
  });
  const [feeStructureLoading, setFeeStructureLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('dues'); // 'dues', 'structure', 'payments', 'reminders', or 'reminder-config'
  const [feeStructureFilter, setFeeStructureFilter] = useState({
    academicYear: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
    course: '',
    year: ''
  });
  const [selectedYearsToApply, setSelectedYearsToApply] = useState([]); // Years selected to apply the same fee values
  const [isEditMode, setIsEditMode] = useState(false); // Track if we're in edit mode

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
  const [debouncedReminderSearch, setDebouncedReminderSearch] = useState('');
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
    sendPushNotification: true,
    sendSMS: true
  });

  // Concession approvals state
  const [concessionApprovals, setConcessionApprovals] = useState([]);
  const [approvedConcessions, setApprovedConcessions] = useState([]);
  const [loadingConcessionApprovals, setLoadingConcessionApprovals] = useState(false);
  const [loadingApprovedConcessions, setLoadingApprovedConcessions] = useState(false);
  const [concessionViewMode, setConcessionViewMode] = useState('pending'); // 'pending' or 'approved'
  const [concessionApprovalFilters, setConcessionApprovalFilters] = useState({
    search: '',
    course: ''
  });
  const [concessionApprovalPage, setConcessionApprovalPage] = useState(1);
  const [concessionApprovalPagination, setConcessionApprovalPagination] = useState({
    current: 1,
    total: 1,
    totalStudents: 0
  });
  const [rejectModal, setRejectModal] = useState({ open: false, student: null, newAmount: '' });
  const [approveModal, setApproveModal] = useState({ open: false, student: null, newAmount: '', notes: '' });
  const [expandedRows, setExpandedRows] = useState(new Set()); // Track expanded rows for approved concessions


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
    const baseCategories = ['A+', 'A', 'B+', 'B'];

    // If gender is specified, filter based on available room categories
    if (gender) {
      if (gender === 'Male') {
        return ['A+', 'A', 'B+', 'B']; // Male categories
      } else if (gender === 'Female') {
        return ['A+', 'A', 'B']; // Female categories
      }
    }

    return baseCategories;
  };

  // Cache for term due dates to avoid repeated API calls
  const termDueDatesCache = useRef(new Map());
  const CACHE_TTL = 30 * 60 * 1000; // 30 minutes cache

  // Helper function to get student term due dates from backend with caching
  const getStudentTermDueDates = useCallback(async (student) => {
    if (!student?.course?._id || !student?.academicYear || !student?.year) {
      return null;
    }

    // Create cache key from course, academicYear, and year
    const cacheKey = `${student.course._id}-${student.academicYear}-${student.year}`;
    
    // Check cache first
    const cached = termDueDatesCache.current.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
      return cached.data;
    }

    try {
      const response = await api.get(`/api/reminder-config/calculate-term-due-dates/${student.course._id}/${student.academicYear}/${student.year}`, {
        params: { semesterStartDate: new Date().toISOString() }
      });
      
      if (response.data.success) {
        const dueDates = response.data.data; // Returns { term1: Date, term2: Date, term3: Date }
        // Cache the result
        termDueDatesCache.current.set(cacheKey, {
          data: dueDates,
          timestamp: Date.now()
        });
        return dueDates;
      }
    } catch (error) {
      console.log('No due dates configured for student:', student.name, error.message);
      // Cache null result to avoid repeated failed calls
      termDueDatesCache.current.set(cacheKey, {
        data: null,
        timestamp: Date.now()
      });
    }
    return null; // No due dates configured
  }, []);

  // Helper function to filter balances based on due dates
  const getDateFilteredBalance = (studentBalance, termDueDates, currentDate) => {
    if (!studentBalance) {
      // No balance data, return zeros
      return {
        term1Due: 0,
        term2Due: 0,
        term3Due: 0,
        totalDue: 0
      };
    }

    if (!termDueDates) {
      // No due dates configured, show all balances
      return {
        term1Due: studentBalance.termBalances.term1.balance,
        term2Due: studentBalance.termBalances.term2.balance,
        term3Due: studentBalance.termBalances.term3.balance,
        totalDue: studentBalance.totalBalance
      };
    }

    // Filter balances based on due dates
    const filteredBalance = {
      term1Due: currentDate >= new Date(termDueDates.term1) ? studentBalance.termBalances.term1.balance : 0,
      term2Due: currentDate >= new Date(termDueDates.term2) ? studentBalance.termBalances.term2.balance : 0,
      term3Due: currentDate >= new Date(termDueDates.term3) ? studentBalance.termBalances.term3.balance : 0,
      totalDue: 0
    };

    // Debug logging for date filtering
    console.log('🔍 Date filtering for student:', studentBalance);
    console.log('🔍 Current date:', currentDate);
    console.log('🔍 Term due dates:', termDueDates);
    console.log('🔍 Term balances before filtering:', {
      term1: studentBalance.termBalances.term1.balance,
      term2: studentBalance.termBalances.term2.balance,
      term3: studentBalance.termBalances.term3.balance
    });
    console.log('🔍 Filtered balances:', filteredBalance);

    // Calculate total due
    filteredBalance.totalDue = filteredBalance.term1Due + filteredBalance.term2Due + filteredBalance.term3Due;

    return filteredBalance;
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
  }, [currentPage, debouncedSearch, filters.academicYear, filters.category, filters.gender, filters.course, filters.year]);

  // Fetch course years function - defined before useEffects that use it
  const fetchCourseYears = useCallback(async (courseId) => {
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
  }, []);

  // Fetch course years when course changes
  useEffect(() => {
    if (feeStructureForm.course) {
      fetchCourseYears(feeStructureForm.course);
      // Only reset year and category when course changes if we're not editing an existing structure
      if (!selectedFeeStructure && !isEditMode) {
        setFeeStructureForm(prev => ({ ...prev, year: '', category: '' }));
      }
    } else {
      setCourseYears([]);
    }
  }, [feeStructureForm.course, selectedFeeStructure, isEditMode, fetchCourseYears]);

  // Reset category when year changes (but not when editing)
  useEffect(() => {
    if (feeStructureForm.year && !selectedFeeStructure && !isEditMode) {
      setFeeStructureForm(prev => ({ ...prev, category: '' }));
    }
  }, [feeStructureForm.year, selectedFeeStructure, isEditMode]);

  // Fetch course years when course filter changes
  useEffect(() => {
    if (feeStructureFilter.course) {
      fetchCourseYears(feeStructureFilter.course);
    } else {
      setCourseYears([]);
    }
  }, [feeStructureFilter.course, fetchCourseYears]);

  // Fetch course years for dues tab when course filter changes
  useEffect(() => {
    if (filters.course) {
      // Find the selected course to get its duration
      const selectedCourse = courses.find(c => 
        String(c._id) === String(filters.course) || 
        c._id === filters.course
      );
      
      if (selectedCourse && selectedCourse.duration) {
        // Generate years based on course duration (1 to duration)
        const years = Array.from({ length: selectedCourse.duration }, (_, i) => i + 1);
        setDuesCourseYears(years);
      } else if (courses.length === 0) {
        // If courses not loaded yet, fetch course details first
        api.get(`/api/fee-structures/courses`)
          .then(response => {
            if (response.data.success) {
              const allCourses = response.data.data || [];
              const course = allCourses.find(c => 
                String(c._id) === String(filters.course) || 
                c._id === filters.course
              );
              if (course && course.duration) {
                const years = Array.from({ length: course.duration }, (_, i) => i + 1);
                setDuesCourseYears(years);
              } else {
                // Fallback: try to fetch years from API
                return api.get(`/api/fee-structures/courses/${filters.course}/years`);
              }
            }
          })
          .then(response => {
            if (response && response.data && response.data.success) {
              setDuesCourseYears(response.data.data.years);
            }
          })
          .catch(err => {
            console.error('Error fetching course years:', err);
            setDuesCourseYears([]);
          });
      } else {
        // Course not found in local state, try API
        api.get(`/api/fee-structures/courses/${filters.course}/years`)
          .then(response => {
            if (response.data.success) {
              setDuesCourseYears(response.data.data.years);
            } else {
              setDuesCourseYears([]);
            }
          })
          .catch(err => {
            console.error('Error fetching dues course years:', err);
            setDuesCourseYears([]);
          });
      }
      // Reset year when course changes
      setFilters(prev => ({ ...prev, year: '' }));
    } else {
      setDuesCourseYears([]);
      setFilters(prev => ({ ...prev, year: '' }));
    }
  }, [filters.course, courses]);

  // Fee structures are now fetched via React Query, no need for separate useEffect

  // Stats are now calculated automatically when cachedStudentsForStats changes
  // No need for separate useEffect here

  // Use debounced search for stats (reuse the same debounced value)
  const debouncedSearchForStats = debouncedSearch;

  // OPTIMIZED: Use React Query to cache students data based on filters
  const fetchStudentsForStats = useCallback(async () => {
    const params = new URLSearchParams({
      limit: 1000 // Fetch a large number to get all students
    });

    // Apply all filters including search to match the displayed data
    if (debouncedSearchForStats && debouncedSearchForStats.trim()) params.append('search', debouncedSearchForStats.trim());
    if (filters.academicYear && filters.academicYear.trim()) params.append('academicYear', filters.academicYear.trim());
    if (filters.category && filters.category.trim()) params.append('category', filters.category.trim());
    if (filters.gender && filters.gender.trim()) params.append('gender', filters.gender.trim());
    if (filters.course && filters.course.trim()) params.append('course', filters.course.trim());
    if (filters.year && filters.year.trim()) params.append('year', parseInt(filters.year.trim()));

    const response = await api.get(`/api/admin/students?${params}`);
    
    if (response.data.success) {
      return response.data.data.students || response.data.data || [];
    }
    return [];
  }, [debouncedSearchForStats, filters.academicYear, filters.category, filters.gender, filters.course, filters.year]);

  // Use React Query to cache students for stats
  const { data: cachedStudentsForStats, isLoading: studentsStatsLoading, refetch: refetchStudentsForStats } = useQuery({
    queryKey: ['students-for-stats', debouncedSearchForStats, filters.academicYear, filters.category, filters.gender, filters.course, filters.year],
    queryFn: fetchStudentsForStats,
    staleTime: 1 * 60 * 1000, // 1 minute - stats should be relatively fresh
    cacheTime: 5 * 60 * 1000, // 5 minutes cache
    enabled: activeTab === 'dues', // Only fetch when dues tab is active
  });

  // Fetch all students for accurate statistics when filters change
  useEffect(() => {
    if (activeTab === 'dues' && cachedStudentsForStats) {
      // Update allStudents when cached data is available
      setAllStudents(cachedStudentsForStats);
    }
  }, [cachedStudentsForStats, activeTab]);

  const fetchStats = async () => {
    try {
      console.log('🔍 FeeManagement: Recalculating stats...');
      // Trigger refetch of students for stats
      if (activeTab === 'dues') {
        await refetchStudentsForStats();
      }
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

      if (debouncedSearch && debouncedSearch.trim()) params.append('search', debouncedSearch.trim());
      if (filters.academicYear && filters.academicYear.trim()) params.append('academicYear', filters.academicYear.trim());
      if (filters.category && filters.category.trim()) params.append('category', filters.category.trim());
      if (filters.gender && filters.gender.trim()) params.append('gender', filters.gender.trim());
      if (filters.course && filters.course.trim()) params.append('course', filters.course.trim());
      if (filters.year && filters.year.trim()) params.append('year', parseInt(filters.year.trim()));

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

        // Stats will be updated automatically when cachedStudentsForStats changes
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

  // Fetch all payments for statistics - OPTIMIZED: Single API call instead of N+1
  const fetchAllPaymentsForStats = useCallback(async () => {
    try {
      console.log('🔍 Frontend: Fetching all payments for statistics...');
      
      // Fetch all hostel fee payments using the correct endpoint
      const response = await api.get(`/api/payments/all?paymentType=hostel_fee&limit=10000`);
      
      if (response.data.success) {
        const allPayments = response.data.data.payments || [];
        console.log('🔍 Frontend: All payments fetched:', allPayments.length);
        
        // Update the global payments state
        setPayments(allPayments);
        
        return allPayments;
      }
    } catch (error) {
      console.error('Error fetching all payments:', error);
      console.error('Error details:', error.response?.data);
    }
    return [];
  }, []);
  
  // Use React Query to cache payments
  const { data: cachedPayments, refetch: refetchPayments } = useQuery({
    queryKey: ['all-payments', 'hostel_fee'],
    queryFn: fetchAllPaymentsForStats,
    staleTime: 2 * 60 * 1000, // 2 minutes
    cacheTime: 5 * 60 * 1000, // 5 minutes
    enabled: activeTab === 'dues', // Only fetch when dues tab is active
  });
  
  // Update payments when cached data changes
  useEffect(() => {
    if (cachedPayments) {
      setPayments(cachedPayments);
    }
  }, [cachedPayments]);

  // Memoize calculateStudentBalance to avoid recalculating for same student
  const calculateStudentBalance = useCallback((student) => {
    const feeStructure = getFeeStructureForStudent(student.course, student.year, student.category, student.academicYear);
    if (!feeStructure) return null;

    const studentPaymentHistory = payments.filter(p => {
      // Handle both string and object IDs
      const paymentStudentId = typeof p.studentId === 'object' ? p.studentId._id || p.studentId : p.studentId;
      const studentId = typeof student._id === 'object' ? student._id._id || student._id : student._id;
      return paymentStudentId === studentId;
    });
    const totalPaid = studentPaymentHistory.reduce((sum, payment) => sum + payment.amount, 0);

    // Debug logging
    console.log('🔍 Balance calculation for student:', student.name);
    console.log('🔍 Fee structure:', {
      totalFee: feeStructure.totalFee,
      term1Fee: feeStructure.term1Fee,
      term2Fee: feeStructure.term2Fee,
      term3Fee: feeStructure.term3Fee
    });
    console.log('🔍 Student calculated fees:', {
      calculatedTerm1Fee: student.calculatedTerm1Fee,
      calculatedTerm2Fee: student.calculatedTerm2Fee,
      calculatedTerm3Fee: student.calculatedTerm3Fee,
      totalCalculatedFee: student.totalCalculatedFee,
      concession: student.concession
    });
    console.log('🔍 Student payment history:', studentPaymentHistory);
    console.log('🔍 Total paid:', totalPaid);
    console.log('🔍 All payments in state:', payments.length);
    console.log('🔍 Student ID:', student._id, 'Type:', typeof student._id);
    console.log('🔍 Sample payment studentId:', payments[0]?.studentId, 'Type:', typeof payments[0]?.studentId);

    // Check if student has concession applied
    const hasConcession = student.concession && student.concession > 0;

    // Calculate term-wise balance using student's calculated fees (which already account for concessions)
    const termBalances = {
      term1: {
        required: student.calculatedTerm1Fee || feeStructure.term1Fee || Math.round(feeStructure.totalFee * 0.4),
        paid: studentPaymentHistory
          .filter(p => p.term === 'term1')
          .reduce((sum, p) => sum + p.amount, 0),
        balance: 0
      },
      term2: {
        required: student.calculatedTerm2Fee || feeStructure.term2Fee || Math.round(feeStructure.totalFee * 0.3),
        paid: studentPaymentHistory
          .filter(p => p.term === 'term2')
          .reduce((sum, p) => sum + p.amount, 0),
        balance: 0
      },
      term3: {
        required: student.calculatedTerm3Fee || feeStructure.term3Fee || Math.round(feeStructure.totalFee * 0.3),
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

    // Debug logging for final balances
    console.log('🔍 Final term balances for', student.name, ':', {
      term1: { required: termBalances.term1.required, paid: termBalances.term1.paid, balance: termBalances.term1.balance },
      term2: { required: termBalances.term2.required, paid: termBalances.term2.paid, balance: termBalances.term2.balance },
      term3: { required: termBalances.term3.required, paid: termBalances.term3.paid, balance: termBalances.term3.balance },
      totalBalance
    });

    // Calculate original vs calculated totals
    const originalTotalFee = feeStructure.totalFee;
    const calculatedTotalFee = student.totalCalculatedFee || originalTotalFee;
    const concessionAmount = student.concession || 0;

    // Get late fees from student data (separate from balance, not included in totalBalance)
    const lateFees = {
      term1: student.term1LateFee || 0,
      term2: student.term2LateFee || 0,
      term3: student.term3LateFee || 0
    };
    const totalLateFee = lateFees.term1 + lateFees.term2 + lateFees.term3;

    return {
      feeStructure,
      totalPaid,
      totalBalance, // This does NOT include late fees (as per requirement)
      isFullyPaid,
      termBalances,
      paymentHistory: studentPaymentHistory,
      originalTotalFee,
      calculatedTotalFee,
      concessionAmount,
      hasConcession,
      remainingExcess, // Add this for debugging
      lateFees, // Late fees per term
      totalLateFee // Total late fee (for display purposes only, not in balance)
    };
  }, [payments, feeStructures]);

  // OPTIMIZED: Calculate stats from cached students data - no API calls needed
  const calculateStatsFromStudents = useCallback(async (allStudentsData) => {
    setStatsLoading(true);
    try {
      if (!allStudentsData || allStudentsData.length === 0) {
        setStats({
          totalStudents: 0,
          studentsWithFees: 0,
          studentsWithoutFees: 0,
          totalFeeAmount: 0,
          averageFeeAmount: 0,
          totalCalculatedFeeAmount: 0,
          totalConcessionAmount: 0,
          studentsWithConcession: 0,
          totalDue: 0,
          term1Due: 0,
          term2Due: 0,
          term3Due: 0
        });
        return;
      }

      console.log('🔍 Frontend: Calculating stats from', allStudentsData.length, 'students...');

        // OPTIMIZATION: Use cached payments instead of fetching individually
        // Payments should already be loaded via React Query
        if (payments.length === 0) {
          // If payments not loaded yet, fetch them once
          await refetchPayments();
        }

        // Update stats with all students data
        const totalStudents = allStudentsData.length;
        
        // Memoize fee structure lookups
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

        // First, calculate concession stats for ALL students (not just those with fee structures)
        for (const student of allStudentsData) {
          const concession = Number(student.concession) || 0;
          if (concession > 0) {
            totalConcessionAmount += concession;
            studentsWithConcession++;
          }
        }

    // Calculate dues - OPTIMIZED: Batch term due dates calls
        let totalDue = 0;
        let term1Due = 0;
        let term2Due = 0;
        let term3Due = 0;

        // Process students with date-based filtering for dues calculation
        const currentDate = new Date();
        const filteredBalances = {};
    
    // OPTIMIZATION: Group students by course/year/academicYear to batch term due dates calls
    const studentsByKey = new Map();
    for (const student of allStudentsData) {
      if (student.course?._id && student.academicYear && student.year) {
        const key = `${student.course._id}-${student.academicYear}-${student.year}`;
        if (!studentsByKey.has(key)) {
          studentsByKey.set(key, []);
        }
        studentsByKey.get(key).push(student);
      }
    }

    // Fetch term due dates for unique course/year/academicYear combinations (cached)
    const termDueDatesPromises = Array.from(studentsByKey.keys()).map(async (key) => {
      const students = studentsByKey.get(key);
      if (students && students.length > 0) {
        const dueDates = await getStudentTermDueDates(students[0]);
        return { key, dueDates };
      }
      return { key, dueDates: null };
    });

    const termDueDatesMap = new Map();
    const termDueDatesResults = await Promise.all(termDueDatesPromises);
    termDueDatesResults.forEach(({ key, dueDates }) => {
      termDueDatesMap.set(key, dueDates);
    });
        
        // Batch process students - use existing payments from state
        for (const student of allStudentsData) {
          const feeStructure = getFeeStructureForStudent(student.course, student.year, student.category, student.academicYear);
          if (feeStructure) {
            const originalFee = feeStructure.totalFee;
            const calculatedFee = student.totalCalculatedFee || originalFee;

            totalFeeAmount += originalFee;
            totalCalculatedFeeAmount += calculatedFee;

            // OPTIMIZATION: Use payments from state instead of individual API calls
            // Payments are already loaded via React Query
            const studentBalance = calculateStudentBalance(student);
              
            if (studentBalance) {
          // Get term due dates from cache (already fetched above)
          const cacheKey = `${student.course._id}-${student.academicYear}-${student.year}`;
          const termDueDates = termDueDatesMap.get(cacheKey) || null;
              
              // Apply date-based filtering
              const filteredBalance = getDateFilteredBalance(studentBalance, termDueDates, currentDate);
              
              // Store filtered balance for this student
              filteredBalances[student._id] = filteredBalance;
              
              // Add filtered amounts to totals
              totalDue += filteredBalance.totalDue;
              term1Due += filteredBalance.term1Due;
              term2Due += filteredBalance.term2Due;
              term3Due += filteredBalance.term3Due;
            }
          }
        }

        // Update the filtered balances state
        setStudentFilteredBalances(filteredBalances);

        const averageFeeAmount = studentsWithFees > 0 ? Math.round(totalFeeAmount / studentsWithFees) : 0;

        setStats({
          totalStudents,
          studentsWithFees,
          studentsWithoutFees,
          totalFeeAmount,
          averageFeeAmount,
          totalCalculatedFeeAmount,
          totalConcessionAmount,
          studentsWithConcession,
          totalDue,
          term1Due,
          term2Due,
          term3Due
        });

        console.log('🔍 Frontend: Stats updated:', {
          totalStudents,
          studentsWithFees,
          studentsWithoutFees,
          totalFeeAmount,
          averageFeeAmount
        });
    } catch (err) {
      console.error('Error calculating stats:', err);
    } finally {
      setStatsLoading(false);
    }
  }, [payments, refetchPayments, getStudentTermDueDates, calculateStudentBalance]);

  // Calculate stats when cached students data changes
  useEffect(() => {
    if (activeTab === 'dues' && cachedStudentsForStats && cachedStudentsForStats.length >= 0) {
      calculateStatsFromStudents(cachedStudentsForStats);
    }
  }, [cachedStudentsForStats, activeTab, calculateStatsFromStudents, feeStructures, payments]);





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
    setFilters({ search: '', academicYear: '', category: '', gender: '', course: '', year: '' });
    setCurrentPage(1);
  };

  // Fee Structure Management Functions
  // OPTIMIZED: Use courses from context, only fetch if not available
  const fetchCourses = useCallback(async () => {
    // If courses already available from context, skip API call
    if (coursesFromContext && coursesFromContext.length > 0) {
      setCourses(coursesFromContext);
      return;
    }
    
    try {
      const response = await api.get('/api/fee-structures/courses');
      if (response.data.success) {
        setCourses(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching courses:', err);
    }
  }, [coursesFromContext]);

  // Fetch courses on component mount (only if not in context)
  useEffect(() => {
    if (!coursesFromContext || coursesFromContext.length === 0) {
      fetchCourses();
    }
  }, [fetchCourses, coursesFromContext]);

  // OPTIMIZED: Use React Query to cache fee structures
  const fetchFeeStructures = useCallback(async () => {
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
    
    const response = await api.get(url);

    if (response.data.success && Array.isArray(response.data.data)) {
      return response.data.data;
    } else {
      return [];
    }
  }, [feeStructureFilter.academicYear, feeStructureFilter.course, feeStructureFilter.year]);

  // Use React Query for fee structures
  const { data: cachedFeeStructures, isLoading: feeStructuresQueryLoading } = useQuery({
    queryKey: ['fee-structures', feeStructureFilter.academicYear, feeStructureFilter.course, feeStructureFilter.year],
    queryFn: fetchFeeStructures,
    staleTime: 3 * 60 * 1000, // 3 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    enabled: activeTab === 'structure' || activeTab === 'dues', // Only fetch when needed
  });

  // Update fee structures when cached data changes
  useEffect(() => {
    if (cachedFeeStructures) {
      setFeeStructures(cachedFeeStructures);
      setFeeStructureLoading(false);
    }
  }, [cachedFeeStructures]);

  // Update loading state
  useEffect(() => {
    setFeeStructureLoading(feeStructuresQueryLoading);
  }, [feeStructuresQueryLoading]);

  const handleFeeStructureSubmit = async (e) => {
    e.preventDefault();

    // Check if this is bulk creation
    if (bulkFeeForm.course && bulkFeeForm.year) {
      return await handleBulkFeeStructureSubmit();
    }

    // Validate form data for single creation
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

      // Get the course to know its duration
      const course = courses.find(c => c._id === feeStructureForm.course);
      if (!course) {
        toast.error('Course not found');
        return;
      }

      // Determine which years to save (current year + selected years)
      const currentYear = parseInt(feeStructureForm.year);
      const yearsToSave = [currentYear, ...selectedYearsToApply].filter((year, index, self) => self.indexOf(year) === index); // Remove duplicates

      console.log('🔍 Frontend: Years to save:', yearsToSave);

      // Save fee structure for each selected year
      const savePromises = yearsToSave.map(async (year) => {
        const feeData = {
          academicYear: feeStructureForm.academicYear,
          course: feeStructureForm.course,
          year: year,
          category: feeStructureForm.category,
          totalFee: feeStructureForm.totalFee,
          term1Fee: termFees.term1Fee,
          term2Fee: termFees.term2Fee,
          term3Fee: termFees.term3Fee
        };

        console.log(`🔍 Frontend: Saving fee structure for Year ${year}:`, feeData);
        return api.post('/api/fee-structures', feeData);
      });

      // Wait for all saves to complete
      const responses = await Promise.allSettled(savePromises);
      
      // Check results
      const successful = responses.filter(r => r.status === 'fulfilled' && r.value.data.success).length;
      const failed = responses.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.data.success)).length;

      if (successful > 0) {
        const courseName = course.name || 'Unknown Course';
        const action = selectedFeeStructure ? 'updated' : 'saved';
        if (yearsToSave.length === 1) {
          toast.success(`Fee structure for ${courseName} Year ${currentYear} ${feeStructureForm.category} category (${feeStructureForm.academicYear}) ${action} successfully!`);
        } else {
          toast.success(`Fee structure ${action} successfully for ${successful} year(s)!${failed > 0 ? ` ${failed} failed.` : ''}`);
        }
        
        setShowFeeStructureModal(false);
        setSelectedFeeStructure(null);
        setIsEditMode(false);
        setSelectedYearsToApply([]);
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

        // Recalculate stats - will trigger automatically via React Query cache invalidation
        if (activeTab === 'dues') {
          refetchStudentsForStats();
        }
      } else {
        console.error('🔍 Frontend: All saves failed');
        setError('Failed to save fee structure(s)');
        toast.error('Failed to save fee structure(s). Please try again.');
      }
    } catch (err) {
      console.error('Error saving fee structure:', err);
      setError(err.response?.data?.message || 'Failed to save fee structure');
      toast.error(err.response?.data?.message || 'Failed to save fee structure');
    } finally {
      setFeeStructureLoading(false);
    }
  };

  const handleBulkFeeStructureSubmit = async () => {
    // Validate all categories have fees
    const categories = Object.entries(bulkFeeForm.categories).map(([category, data]) => ({
      category,
      totalFee: data.totalFee
    }));

    const missingCategories = categories.filter(cat => !cat.totalFee || cat.totalFee <= 0);
    if (missingCategories.length > 0) {
      toast.error(`Please provide fees for all categories: ${missingCategories.map(c => c.category).join(', ')}`);
      return;
    }

    try {
      setFeeStructureLoading(true);

      const bulkData = {
        academicYear: bulkFeeForm.academicYear,
        course: bulkFeeForm.course,
        year: parseInt(bulkFeeForm.year),
        categories: categories
      };

      console.log('🔍 Frontend: Sending bulk fee data to backend:', bulkData);

      const response = await api.post('/api/fee-structures', bulkData);

      console.log('🔍 Frontend: Bulk response from backend:', response.data);

      if (response.data.success) {
        const courseName = courses.find(c => c._id === bulkData.course)?.name || 'Unknown Course';
        toast.success(`Successfully created/updated ${response.data.data.length} fee structures for ${courseName} Year ${bulkData.year}!`);
        
        setShowFeeStructureModal(false);
        setSelectedFeeStructure(null);
        setIsEditMode(false);
        
        // Reset forms
        setFeeStructureForm({
          academicYear: '',
          course: '',
          year: '',
          category: '',
          totalFee: 0
        });
        setBulkFeeForm({
          academicYear: '',
          course: '',
          year: '',
          categories: {
            'A+': { totalFee: 0, exists: false },
            'A': { totalFee: 0, exists: false },
            'B+': { totalFee: 0, exists: false },
            'B': { totalFee: 0, exists: false },
          }
        });

        // Refresh data
        await Promise.all([
          fetchFeeStructures(),
          fetchStudents()
        ]);

        // Recalculate stats - will trigger automatically via React Query cache invalidation
        if (activeTab === 'dues') {
          refetchStudentsForStats();
        }
      } else {
        console.error('🔍 Frontend: Backend returned error:', response.data);
        setError(response.data.message || 'Failed to save fee structures');
      }
    } catch (err) {
      console.error('Error saving bulk fee structures:', err);
      setError(err.response?.data?.message || 'Failed to save fee structures');
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

    // If no course selected, return all categories
    if (!courseId) {
      return allCategories;
    }

    // If editing, include all categories (including current one)
    if (selectedFeeStructure || isEditMode) {
      return allCategories;
    }

    // For add mode: Always show all categories regardless of year selection
    // This prevents categories from disappearing when year is selected
    // Backend will handle duplicate check if user tries to create existing structure
    // Better UX - user can always see all available categories
    return allCategories;
  };

  const openFeeStructureModal = (structure = null) => {
    if (structure) {
      console.log('🔍 Opening edit modal for structure:', structure);
      setSelectedFeeStructure(structure);
      setIsEditMode(false); // Not in edit mode yet, showing details view
      
      // Extract course ID properly - handle both populated and non-populated references
      const courseId = structure.course?._id || structure.course || '';
      // Convert year to string to match dropdown format
      const yearValue = structure.year ? String(structure.year) : '';
      
      const formData = {
        academicYear: structure.academicYear || '',
        course: String(courseId || ''),
        year: yearValue,
        category: structure.category || '',
        totalFee: (structure.totalFee || 0) || ((structure.term1Fee || 0) + (structure.term2Fee || 0) + (structure.term3Fee || 0))
      };
      
      console.log('🔍 Setting form data:', formData);
      console.log('🔍 Course ID extracted:', courseId, 'Type:', typeof courseId);
      console.log('🔍 Year value:', yearValue, 'Type:', typeof yearValue);
      setFeeStructureForm(formData);
      
      // Reset bulk form to ensure single edit mode is shown
      setBulkFeeForm({
        academicYear: '',
        course: '',
        year: '',
        categories: {
          'A+': { totalFee: 0, exists: false },
          'A': { totalFee: 0, exists: false },
          'B+': { totalFee: 0, exists: false },
          'B': { totalFee: 0, exists: false },
        }
      });
      
      // Reset selected years when opening edit modal
      setSelectedYearsToApply([]);
    } else {
      setSelectedFeeStructure(null);
      setIsEditMode(false); // Not in edit mode, adding new
      setFeeStructureForm({
        academicYear: feeStructureFilter.academicYear || '2024-2025',
        course: '',
        year: '',
        category: '',
        totalFee: 0
      });
      
      // Reset bulk form
      setBulkFeeForm({
        academicYear: feeStructureFilter.academicYear || '2024-2025',
        course: '',
        year: '',
        categories: {
          'A+': { totalFee: 0, exists: false },
          'A': { totalFee: 0, exists: false },
          'B+': { totalFee: 0, exists: false },
          'B': { totalFee: 0, exists: false },
        }
      });
      
      // Reset selected years
      setSelectedYearsToApply([]);
    }

    setShowFeeStructureModal(true);
  };

  // Check existing fee structures for bulk creation
  const checkExistingFeeStructures = (academicYear, course, year) => {
    if (!academicYear || !course || !year) return;

    const existingStructures = feeStructures.filter(structure => 
      structure.academicYear === academicYear &&
      structure.course?._id === course &&
      structure.year === parseInt(year)
    );

    const updatedCategories = { ...bulkFeeForm.categories };
    
    // Reset all categories
    Object.keys(updatedCategories).forEach(category => {
      updatedCategories[category] = { totalFee: 0, exists: false };
    });

    // Populate existing data
    existingStructures.forEach(structure => {
      if (updatedCategories[structure.category]) {
        updatedCategories[structure.category] = {
          totalFee: structure.totalFee,
          exists: true
        };
      }
    });

    setBulkFeeForm(prev => ({
      ...prev,
      academicYear,
      course,
      year,
      categories: updatedCategories
    }));
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

  // Memoize real-time KPI stats calculation (moved here after calculateStudentBalance is defined)
  const calculateRealTimeStats = useMemo(() => {
    let totalDue = 0;
    let term1Due = 0;
    let term2Due = 0;
    let term3Due = 0;
    
    // Use allStudents instead of students (which is paginated)
    allStudents.forEach(student => {
      const studentBalance = calculateStudentBalance(student);
      if (studentBalance) {
        totalDue += studentBalance.totalBalance;
        term1Due += studentBalance.termBalances.term1.balance;
        term2Due += studentBalance.termBalances.term2.balance;
        term3Due += studentBalance.termBalances.term3.balance;
      }
    });
    
    return { totalDue, term1Due, term2Due, term3Due };
  }, [allStudents, calculateStudentBalance]);

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

  // Fee structures are fetched via React Query based on activeTab

  // Fetch hostel fee payments when component mounts
  useEffect(() => {
    fetchHostelFeePayments();
  }, []);

  // Check email service status on component mount
  useEffect(() => {
    checkEmailServiceStatus();
  }, []);

  // Debounce search input for reminders
  const debouncedReminderSearchValue = useDebounce(reminderFilters.search, 300);
  
  useEffect(() => {
    setDebouncedReminderSearch(debouncedReminderSearchValue);
  }, [debouncedReminderSearchValue]);

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
      if (debouncedReminderSearch) {
        queryParams.append('search', debouncedReminderSearch);
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
        sendPushNotification: reminderOptions.sendPushNotification,
        sendSMS: reminderOptions.sendSMS
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
        sendPushNotification: reminderOptions.sendPushNotification,
        sendSMS: reminderOptions.sendSMS
      });

      if (response.data.success) {
        const successCount = response.data.data?.successCount || selectedReminders.length;
        const errorCount = response.data.data?.errorCount || 0;
        
        let statusMessage = `Reminders sent to ${successCount} students`;
        const methods = [];
        if (reminderOptions.sendEmail) methods.push('Email');
        if (reminderOptions.sendPushNotification) methods.push('Push Notification');
        if (reminderOptions.sendSMS) methods.push('SMS');
        
        if (methods.length > 0) {
          statusMessage += ` (${methods.join(' + ')})`;
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
    if (reminderFilters.search && !debouncedReminderSearch) {
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
  }, [feeReminders, reminderFilters, debouncedReminderSearch]);

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

  // Fee structures are fetched via React Query

  // ==================== CONCESSION APPROVALS FUNCTIONS ====================

  // Fetch concession approvals (pending)
  const fetchConcessionApprovals = async () => {
    setLoadingConcessionApprovals(true);
    try {
      const response = await api.get('/api/admin/students/concession-approvals');
      console.log('🔍 Concession Approvals Response:', response.data);
      
      if (response.data.success) {
        let students = response.data.data?.students || response.data.data || [];
        
        console.log('🔍 Students fetched:', students.length);
        
        // Apply filters on frontend
        if (concessionApprovalFilters.search && concessionApprovalFilters.search.trim()) {
          const searchTerm = concessionApprovalFilters.search.trim().toLowerCase();
          students = students.filter(s => 
            s.name?.toLowerCase().includes(searchTerm) ||
            s.rollNumber?.toLowerCase().includes(searchTerm) ||
            s.hostelId?.toLowerCase().includes(searchTerm)
          );
        }
        
        if (concessionApprovalFilters.course && concessionApprovalFilters.course.trim()) {
          students = students.filter(s => {
            const courseName = typeof s.course === 'string' ? s.course : s.course?.name || '';
            return courseName.toLowerCase().includes(concessionApprovalFilters.course.trim().toLowerCase());
          });
        }
        
        console.log('🔍 Students after filtering:', students.length);
        setConcessionApprovals(students);
        setConcessionApprovalPagination({
          current: 1,
          total: 1,
          totalStudents: students.length
        });
      } else {
        console.error('❌ API returned success: false', response.data);
        setConcessionApprovals([]);
      }
    } catch (error) {
      console.error('Error fetching concession approvals:', error);
      console.error('Error response:', error.response?.data);
      toast.error(error.response?.data?.message || 'Failed to fetch concession approvals');
      setConcessionApprovals([]);
    } finally {
      setLoadingConcessionApprovals(false);
    }
  };

  // Fetch approved concessions
  const fetchApprovedConcessions = async () => {
    setLoadingApprovedConcessions(true);
    try {
      const response = await api.get('/api/admin/students/approved-concessions');
      console.log('🔍 Approved Concessions Response:', response.data);
      
      if (response.data.success) {
        let students = response.data.data?.students || response.data.data || [];
        
        console.log('🔍 Approved students fetched:', students.length);
        
        // Apply filters on frontend
        if (concessionApprovalFilters.search && concessionApprovalFilters.search.trim()) {
          const searchTerm = concessionApprovalFilters.search.trim().toLowerCase();
          students = students.filter(s => 
            s.name?.toLowerCase().includes(searchTerm) ||
            s.rollNumber?.toLowerCase().includes(searchTerm) ||
            s.hostelId?.toLowerCase().includes(searchTerm)
          );
        }
        
        if (concessionApprovalFilters.course && concessionApprovalFilters.course.trim()) {
          students = students.filter(s => {
            const courseName = typeof s.course === 'string' ? s.course : s.course?.name || '';
            return courseName.toLowerCase().includes(concessionApprovalFilters.course.trim().toLowerCase());
          });
        }
        
        console.log('🔍 Approved students after filtering:', students.length);
        setApprovedConcessions(students);
      } else {
        console.error('❌ API returned success: false', response.data);
        setApprovedConcessions([]);
      }
    } catch (error) {
      console.error('Error fetching approved concessions:', error);
      console.error('Error response:', error.response?.data);
      toast.error(error.response?.data?.message || 'Failed to fetch approved concessions');
      setApprovedConcessions([]);
    } finally {
      setLoadingApprovedConcessions(false);
    }
  };

  // Approve concession
  const handleApproveConcession = async (studentId, newAmount = null, notes = '') => {
    try {
      const response = await api.post(`/api/admin/students/${studentId}/approve-concession`, {
        newConcessionAmount: newAmount !== null ? Number(newAmount) : undefined,
        notes: notes || undefined
      });
      if (response.data.success) {
        toast.success(response.data.message || 'Concession approved successfully');
        setApproveModal({ open: false, student: null, newAmount: '', notes: '' });
        fetchConcessionApprovals();
        // Refresh students list if on dues tab
        if (activeTab === 'dues') {
          fetchStudents();
        }
      }
    } catch (error) {
      console.error('Error approving concession:', error);
      toast.error(error.response?.data?.message || 'Failed to approve concession');
    }
  };

  // Reject concession
  const handleRejectConcession = async (studentId, newAmount = null) => {
    try {
      const response = await api.post(`/api/admin/students/${studentId}/reject-concession`, {
        newConcessionAmount: newAmount !== null ? Number(newAmount) : undefined
      });
      if (response.data.success) {
        toast.success(response.data.message);
        setRejectModal({ open: false, student: null, newAmount: '' });
        fetchConcessionApprovals();
        // Refresh students list if on dues tab
        if (activeTab === 'dues') {
          fetchStudents();
        }
      }
    } catch (error) {
      console.error('Error rejecting concession:', error);
      toast.error(error.response?.data?.message || 'Failed to reject concession');
    }
  };

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

  // Fetch concession approvals when concessions tab is active
  useEffect(() => {
    if (activeTab === 'concessions' && user?.role === 'super_admin') {
      // Fetch both pending and approved to show counts immediately
      fetchConcessionApprovals();
      fetchApprovedConcessions();
    }
  }, [activeTab, user?.role]);

  // Re-apply filters when filter values change (data is already loaded)
  useEffect(() => {
    if (activeTab === 'concessions' && user?.role === 'super_admin') {
      if (concessionViewMode === 'pending') {
        fetchConcessionApprovals();
      } else {
        fetchApprovedConcessions();
      }
    }
  }, [concessionApprovalFilters.search, concessionApprovalFilters.course]);

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
  }, [debouncedReminderSearch]);

  // Fetch reminders when page changes
  useEffect(() => {
    if (activeTab === 'reminders') {
      fetchFeeReminders();
    }
  }, [reminderCurrentPage]);

  // Concession Approvals Tab Content
  const renderConcessionApprovals = () => {
    return (
      <div className="space-y-4">
        {/* Concession Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <ReceiptRefundIcon className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
              </div>
              <div className="ml-2 sm:ml-3">
                <p className="text-xs sm:text-sm font-medium text-gray-600">Total Concession</p>
                <p className="text-base sm:text-lg font-semibold text-gray-900">₹{(stats.totalConcessionAmount || 0).toLocaleString()}</p>
                <p className="text-xs text-gray-500 hidden sm:block">Total concession amount</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4">
            <div className="flex items-center">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <UserGroupIcon className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600" />
              </div>
              <div className="ml-2 sm:ml-3">
                <p className="text-xs sm:text-sm font-medium text-gray-600">Students with Concession</p>
                <p className="text-base sm:text-lg font-semibold text-gray-900">{stats.studentsWithConcession || 0}</p>
                <p className="text-xs text-gray-500 hidden sm:block">Students having concession</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4">
            <div className="flex items-center">
              <div className="p-2 bg-teal-100 rounded-lg">
                <ChartBarIcon className="w-5 h-5 sm:w-6 sm:h-6 text-teal-600" />
              </div>
              <div className="ml-2 sm:ml-3">
                <p className="text-xs sm:text-sm font-medium text-gray-600">Avg Concession</p>
                <p className="text-base sm:text-lg font-semibold text-gray-900">
                  ₹{stats.studentsWithConcession > 0 
                    ? Math.round((stats.totalConcessionAmount || 0) / stats.studentsWithConcession).toLocaleString() 
                    : '0'}
                </p>
                <p className="text-xs text-gray-500 hidden sm:block">Per student average</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs for Pending/Approved */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-1">
          <div className="flex space-x-1">
            <button
              onClick={() => {
                setConcessionViewMode('pending');
                fetchConcessionApprovals();
              }}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                concessionViewMode === 'pending'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Pending Approvals ({concessionApprovals.length})
            </button>
            <button
              onClick={() => {
                setConcessionViewMode('approved');
                fetchApprovedConcessions();
              }}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                concessionViewMode === 'approved'
                  ? 'bg-green-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Approved Concessions ({approvedConcessions.length})
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <input
                type="text"
                placeholder="Name, Roll No, Hostel ID..."
                value={concessionApprovalFilters.search}
                onChange={(e) => {
                  setConcessionApprovalFilters(prev => ({ ...prev, search: e.target.value }));
                }}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Course</label>
              <select
                value={concessionApprovalFilters.course}
                onChange={(e) => {
                  setConcessionApprovalFilters(prev => ({ ...prev, course: e.target.value }));
                }}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Courses</option>
                {courses.map(course => (
                  <option key={course._id} value={course.name}>{course.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Students List - Card View */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          {concessionViewMode === 'pending' ? (
            // Pending Approvals View
            loadingConcessionApprovals ? (
              <div className="flex justify-center items-center py-12">
                <LoadingSpinner />
              </div>
            ) : concessionApprovals.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircleIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">No pending concession approvals</p>
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    Pending Approvals ({concessionApprovals.length})
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {concessionApprovals.map((student) => (
                  <div key={student._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="text-base font-semibold text-gray-900">{student.name}</h4>
                        <p className="text-sm text-gray-500">{student.rollNumber}</p>
                      </div>
                      <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                        Pending
                      </span>
                    </div>
                    
                    <div className="space-y-2 text-sm mb-4">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Course:</span>
                        <span className="font-medium">{typeof student.course === 'string' ? student.course : student.course?.name || 'N/A'} - Year {student.year}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Original Fee:</span>
                        <span className="font-medium">₹{student.originalTotalFee?.toLocaleString() || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Concession:</span>
                        <span className="font-semibold text-yellow-600">₹{student.concession?.toLocaleString() || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">After Concession:</span>
                        <span className="font-medium">₹{student.afterConcessionFee?.toLocaleString() || 'N/A'}</span>
                      </div>
                      {student.concessionRequestedBy && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Requested By:</span>
                          <span className="text-xs text-gray-500">
                            {student.concessionRequestedBy?.name || student.concessionRequestedBy?.username || 'N/A'}
                          </span>
                        </div>
                      )}
                      {student.concessionRequestedAt && (
                        <div className="text-xs text-gray-400">
                          {new Date(student.concessionRequestedAt).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex space-x-2 pt-3 border-t border-gray-200">
                      <button
                        onClick={() => setApproveModal({ open: true, student, newAmount: student.concession?.toString() || '', notes: '' })}
                        className="flex-1 bg-green-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-green-700 flex items-center justify-center space-x-1"
                      >
                        <CheckCircleIcon className="w-4 h-4" />
                        <span>Approve</span>
                      </button>
                      <button
                        onClick={() => setRejectModal({ open: true, student, newAmount: '' })}
                        className="flex-1 bg-red-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-red-700 flex items-center justify-center space-x-1"
                      >
                        <XCircleIcon className="w-4 h-4" />
                        <span>Reject</span>
                      </button>
                    </div>
                    
                    {/* Approval History */}
                    {student.concessionHistory && student.concessionHistory.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-gray-200">
                        <h5 className="text-xs font-semibold text-gray-700 mb-2">History</h5>
                        <div className="space-y-2 max-h-32 overflow-y-auto">
                          {student.concessionHistory.slice().reverse().map((history, idx) => (
                            <div key={idx} className="text-xs bg-gray-50 p-2 rounded">
                              <div className="flex justify-between items-start">
                                <span className={`font-medium ${
                                  history.action === 'approved' ? 'text-green-600' :
                                  history.action === 'rejected' ? 'text-red-600' :
                                  history.action === 'updated' ? 'text-blue-600' : 'text-gray-600'
                                }`}>
                                  {history.action.charAt(0).toUpperCase() + history.action.slice(1)}
                                </span>
                                <span className="text-gray-500">
                                  {new Date(history.performedAt).toLocaleDateString()}
                                </span>
                              </div>
                              {history.previousAmount !== null && history.previousAmount !== history.amount && (
                                <div className="text-gray-600 mt-1">
                                  ₹{history.previousAmount?.toLocaleString()} → ₹{history.amount?.toLocaleString()}
                                </div>
                              )}
                              {history.performedBy && (
                                <div className="text-gray-500 mt-1">
                                  By: {history.performedBy?.name || history.performedBy?.username || 'N/A'}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  ))}
                </div>
              </>
            )
          ) : (
            // Approved Concessions View
            loadingApprovedConcessions ? (
              <div className="flex justify-center items-center py-12">
                <LoadingSpinner />
              </div>
            ) : approvedConcessions.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircleIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">No approved concessions found</p>
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    Approved Concessions ({approvedConcessions.length})
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-8"></th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Course & Year</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Original Fee</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Concession</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">After Concession</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {approvedConcessions.map((student) => {
                        const isExpanded = expandedRows.has(student._id);
                        return (
                          <React.Fragment key={student._id}>
                            <tr 
                              className="hover:bg-gray-50 cursor-pointer transition-colors"
                              onClick={() => {
                                const newExpanded = new Set(expandedRows);
                                if (isExpanded) {
                                  newExpanded.delete(student._id);
                                } else {
                                  newExpanded.add(student._id);
                                }
                                setExpandedRows(newExpanded);
                              }}
                            >
                              <td className="px-4 py-4 whitespace-nowrap">
                                {isExpanded ? (
                                  <ChevronUpIcon className="w-5 h-5 text-gray-400" />
                                ) : (
                                  <ChevronDownIcon className="w-5 h-5 text-gray-400" />
                                )}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap">
                                <div>
                                  <div className="text-sm font-medium text-gray-900">{student.name}</div>
                                  <div className="text-sm text-gray-500">{student.rollNumber}</div>
                                </div>
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                  {typeof student.course === 'string' ? student.course : student.course?.name || 'N/A'}
                                </div>
                                <div className="text-sm text-gray-500">Year {student.year}</div>
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">₹{student.originalTotalFee?.toLocaleString() || 'N/A'}</div>
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap">
                                <div className="text-sm font-semibold text-green-600">₹{student.concession?.toLocaleString() || 0}</div>
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">₹{student.afterConcessionFee?.toLocaleString() || student.totalCalculatedFee?.toLocaleString() || 'N/A'}</div>
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap">
                                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                  Approved
                                </span>
                              </td>
                            </tr>
                            {isExpanded && (
                              <tr>
                                <td colSpan="7" className="px-4 py-4 bg-gray-50">
                                  <div className="space-y-4">
                                    {/* Additional Details */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                      <div>
                                        <span className="font-medium text-gray-700">Hostel ID:</span>
                                        <span className="ml-2 text-gray-900">{student.hostelId || 'N/A'}</span>
                                      </div>
                                      <div>
                                        <span className="font-medium text-gray-700">Category:</span>
                                        <span className="ml-2 text-gray-900">{student.category || 'N/A'}</span>
                                      </div>
                                      <div>
                                        <span className="font-medium text-gray-700">Room Number:</span>
                                        <span className="ml-2 text-gray-900">{student.roomNumber || 'N/A'}</span>
                                      </div>
                                      <div>
                                        <span className="font-medium text-gray-700">Academic Year:</span>
                                        <span className="ml-2 text-gray-900">{student.academicYear || 'N/A'}</span>
                                      </div>
                                      {student.concessionRequestedBy && (
                                        <div>
                                          <span className="font-medium text-gray-700">Requested By:</span>
                                          <span className="ml-2 text-gray-900">
                                            {student.concessionRequestedBy?.name || student.concessionRequestedBy?.username || 'N/A'}
                                          </span>
                                        </div>
                                      )}
                                      {student.concessionRequestedAt && (
                                        <div>
                                          <span className="font-medium text-gray-700">Requested On:</span>
                                          <span className="ml-2 text-gray-900">
                                            {new Date(student.concessionRequestedAt).toLocaleDateString()}
                                          </span>
                                        </div>
                                      )}
                                      {student.concessionApprovedBy && (
                                        <div>
                                          <span className="font-medium text-gray-700">Approved By:</span>
                                          <span className="ml-2 text-gray-900">
                                            {student.concessionApprovedBy?.name || student.concessionApprovedBy?.username || 'N/A'}
                                          </span>
                                        </div>
                                      )}
                                      {student.concessionApprovedAt && (
                                        <div>
                                          <span className="font-medium text-gray-700">Approved On:</span>
                                          <span className="ml-2 text-gray-900">
                                            {new Date(student.concessionApprovedAt).toLocaleDateString()}
                                          </span>
                                        </div>
                                      )}
                                    </div>

                                    {/* Fee Breakdown */}
                                    <div className="border-t border-gray-200 pt-4">
                                      <h4 className="text-sm font-semibold text-gray-700 mb-2">Fee Breakdown</h4>
                                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                        <div>
                                          <span className="text-gray-600">Term 1:</span>
                                          <span className="ml-2 font-medium text-gray-900">
                                            ₹{student.calculatedTerm1Fee?.toLocaleString() || student.originalTotalFee ? Math.round((student.originalTotalFee * 0.4)).toLocaleString() : 'N/A'}
                                          </span>
                                        </div>
                                        <div>
                                          <span className="text-gray-600">Term 2:</span>
                                          <span className="ml-2 font-medium text-gray-900">
                                            ₹{student.calculatedTerm2Fee?.toLocaleString() || student.originalTotalFee ? Math.round((student.originalTotalFee * 0.3)).toLocaleString() : 'N/A'}
                                          </span>
                                        </div>
                                        <div>
                                          <span className="text-gray-600">Term 3:</span>
                                          <span className="ml-2 font-medium text-gray-900">
                                            ₹{student.calculatedTerm3Fee?.toLocaleString() || student.originalTotalFee ? Math.round((student.originalTotalFee * 0.3)).toLocaleString() : 'N/A'}
                                          </span>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Approval History */}
                                    {student.concessionHistory && student.concessionHistory.length > 0 && (
                                      <div className="border-t border-gray-200 pt-4">
                                        <h4 className="text-sm font-semibold text-gray-700 mb-3">Approval History</h4>
                                        <div className="space-y-2 max-h-64 overflow-y-auto">
                                          {student.concessionHistory.slice().reverse().map((history, idx) => (
                                            <div key={idx} className="bg-gray-50 p-3 rounded-lg text-xs">
                                              <div className="flex justify-between items-start mb-2">
                                                <span className={`font-semibold ${
                                                  history.action === 'approved' ? 'text-green-600' :
                                                  history.action === 'rejected' ? 'text-red-600' :
                                                  history.action === 'updated' ? 'text-blue-600' : 'text-gray-600'
                                                }`}>
                                                  {history.action.charAt(0).toUpperCase() + history.action.slice(1)}
                                                </span>
                                                <span className="text-gray-500">
                                                  {new Date(history.performedAt).toLocaleDateString()}
                                                </span>
                                              </div>
                                              {history.previousAmount !== null && history.previousAmount !== history.amount && (
                                                <div className="text-gray-700 mb-1">
                                                  <span className="font-medium">Amount Change:</span> ₹{history.previousAmount?.toLocaleString()} → ₹{history.amount?.toLocaleString()}
                                                </div>
                                              )}
                                              {history.performedBy && (
                                                <div className="text-gray-600 mb-1">
                                                  <span className="font-medium">By:</span> {history.performedBy?.name || history.performedBy?.username || 'N/A'}
                                                </div>
                                              )}
                                              {history.notes && (
                                                <div className="text-gray-600 italic mt-1">
                                                  <span className="font-medium">Note:</span> {history.notes}
                                                </div>
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen ">
      <div className=" mx-auto">
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
                onClick={() => setActiveTab('dues')}
                className={`py-2 px-2 sm:px-3 lg:px-4 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${activeTab === 'dues'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                Dues
              </button>
              {user?.role === 'super_admin' && (
                <button
                  onClick={() => setActiveTab('concessions')}
                  className={`py-2 px-2 sm:px-3 lg:px-4 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${
                    activeTab === 'concessions'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <CheckCircleIcon className="w-4 h-4 mr-1 inline" />
                  Concessions
                </button>
              )}
              <button
                onClick={() => setActiveTab('structure')}
                className={`py-2 px-2 sm:px-3 lg:px-4 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${activeTab === 'structure'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                Fee Structure
              </button>
             
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
              <button
                onClick={() => setActiveTab('reminder-config')}
                className={`py-2 px-2 sm:px-3 lg:px-4 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${
                  activeTab === 'reminder-config'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {/* <Cog6ToothIcon className="w-4 h-4 mr-1" /> */}
                Reminder Config
              </button>
              
            </nav>
          </div>
        </div>

      {activeTab === 'dues' && (
        <>
          {/* Dues Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <UserGroupIcon className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                </div>
                <div className="ml-2 sm:ml-3">
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Total Students</p>
                  {statsLoading ? (
                    <div className="h-5 w-12 bg-gray-200 animate-pulse rounded mt-1"></div>
                  ) : (
                  <p className="text-base sm:text-lg font-semibold text-gray-900">{stats.totalStudents}</p>
                  )}
                  <p className="text-xs text-gray-500 hidden sm:block">Displayed: {students.length} (Page {currentPage})</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4">
              <div className="flex items-center">
                <div className="p-2 bg-red-100 rounded-lg">
                  <CurrencyDollarIcon className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" />
                </div>
                <div className="ml-2 sm:ml-3">
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Total Due</p>
                  {statsLoading ? (
                    <div className="h-5 w-16 bg-gray-200 animate-pulse rounded mt-1"></div>
                  ) : (
                  <p className="text-base sm:text-lg font-semibold text-gray-900">₹{calculateRealTimeStats.totalDue.toLocaleString()}</p>
                  )}
                  <p className="text-xs text-gray-500 hidden sm:block">Overall outstanding</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4">
              <div className="flex items-center">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <ExclamationTriangleIcon className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" />
                </div>
                <div className="ml-2 sm:ml-3">
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Term 1 Due</p>
                  {statsLoading ? (
                    <div className="h-5 w-16 bg-gray-200 animate-pulse rounded mt-1"></div>
                  ) : (
                  <p className="text-base sm:text-lg font-semibold text-gray-900">₹{calculateRealTimeStats.term1Due.toLocaleString()}</p>
                  )}
                  <p className="text-xs text-gray-500 hidden sm:block">First term pending</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <ClockIcon className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600" />
                </div>
                <div className="ml-2 sm:ml-3">
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Term 2 Due</p>
                  {statsLoading ? (
                    <div className="h-5 w-16 bg-gray-200 animate-pulse rounded mt-1"></div>
                  ) : (
                  <p className="text-base sm:text-lg font-semibold text-gray-900">₹{calculateRealTimeStats.term2Due.toLocaleString()}</p>
                  )}
                  <p className="text-xs text-gray-500 hidden sm:block">Second term pending</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <CurrencyDollarIcon className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
                </div>
                  <div className="ml-2 sm:ml-3">
                    <p className="text-xs sm:text-sm font-medium text-gray-600">Term 3 Due</p>
                    {statsLoading ? (
                      <div className="h-5 w-16 bg-gray-200 animate-pulse rounded mt-1"></div>
                    ) : (
                    <p className="text-base sm:text-lg font-semibold text-gray-900">₹{calculateRealTimeStats.term3Due.toLocaleString()}</p>
                    )}
                    <p className="text-xs text-gray-500 hidden sm:block">Third term pending</p>
                  </div>
              </div>
            </div>
          </div>

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
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
              <select
                value={filters.academicYear}
                onChange={(e) => handleFilterChange('academicYear', e.target.value)}
                className="px-2 sm:px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value="">All Academic Years</option>
                {generateAcademicYears().map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
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
                value={filters.year}
                onChange={(e) => handleFilterChange('year', e.target.value)}
                className="px-2 sm:px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                disabled={!filters.course}
              >
                <option value="">
                  {!filters.course ? 'Select Course first' : 'All Years'}
                </option>
                {duesCourseYears.map(year => (
                  <option key={year} value={year}>Year {year}</option>
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

          {/* Dues Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 bg-gray-50">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                <h3 className="text-base sm:text-lg font-medium text-gray-900">Student Dues Management</h3>
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
                          Term 1 Balance
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Term 2 Balance
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Term 3 Balance
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total Balance
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {students.map((student) => {
                        // Memoize balance calculation for each student to avoid multiple calls
                        const studentBalance = calculateStudentBalance(student);
                        
                        return (
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
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {studentBalance ? (
                              <div className={`font-medium ${studentBalance.termBalances.term1.balance === 0 ? 'text-green-600' : 'text-red-600'}`}>
                                ₹{(studentBalance.termBalances.term1.balance || 0).toLocaleString()}
                              </div>
                            ) : (
                              <div className="text-gray-400">-</div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {studentBalance ? (
                              <div className={`font-medium ${studentBalance.termBalances.term2.balance === 0 ? 'text-green-600' : 'text-red-600'}`}>
                                ₹{(studentBalance.termBalances.term2.balance || 0).toLocaleString()}
                              </div>
                            ) : (
                              <div className="text-gray-400">-</div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {studentBalance ? (
                              <div className={`font-medium ${studentBalance.termBalances.term3.balance === 0 ? 'text-green-600' : 'text-red-600'}`}>
                                ₹{(studentBalance.termBalances.term3.balance || 0).toLocaleString()}
                              </div>
                            ) : (
                              <div className="text-gray-400">-</div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {studentBalance ? (
                              <div className={`font-bold ${studentBalance.totalBalance === 0 ? 'text-green-600' : 'text-red-600'}`}>
                                ₹{(studentBalance.totalBalance || 0).toLocaleString()}
                              </div>
                            ) : (
                              <div className="text-gray-400">-</div>
                            )}
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
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="lg:hidden space-y-3 p-4">
                  {students.map((student) => {
                    // Memoize balance calculation for each student
                    const studentBalance = calculateStudentBalance(student);
                    
                    return (
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

                      {/* Term Balances */}
                      <div className="mb-3">
                        <div className="text-xs text-gray-500 mb-2">Term Dues</div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="flex justify-between">
                            <span>Term 1:</span>
                            <span className={`font-medium ${studentBalance?.termBalances.term1.balance === 0 ? 'text-green-600' : 'text-red-600'}`}>
                              ₹{(studentBalance?.termBalances.term1.balance || 0).toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Term 2:</span>
                            <span className={`font-medium ${studentBalance?.termBalances.term2.balance === 0 ? 'text-green-600' : 'text-red-600'}`}>
                              ₹{(studentBalance?.termBalances.term2.balance || 0).toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Term 3:</span>
                            <span className={`font-medium ${studentBalance?.termBalances.term3.balance === 0 ? 'text-green-600' : 'text-red-600'}`}>
                              ₹{(studentBalance?.termBalances.term3.balance || 0).toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between font-bold">
                            <span>Total:</span>
                            <span className={`font-bold ${studentBalance?.totalBalance === 0 ? 'text-green-600' : 'text-red-600'}`}>
                              ₹{(studentBalance?.totalBalance || 0).toLocaleString()}
                            </span>
                          </div>
                          {studentBalance?.totalLateFee > 0 && (
                            <div className="flex justify-between col-span-2 pt-2 border-t border-gray-200">
                              <span className="text-orange-600 font-medium text-xs">Late Fee:</span>
                              <span className="text-orange-600 font-bold text-xs">₹{(studentBalance?.totalLateFee || 0).toLocaleString()}</span>
                            </div>
                          )}
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
                    );
                  })}
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
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-6 mb-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-3">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900">Fee Structure Management</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => openFeeStructureModal()}
                  className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
                  disabled={courses.length === 0}
                >
                  <PlusIcon className="w-4 h-4" />
                  <span className="hidden sm:inline">Add Fee Structure</span>
                  <span className="sm:hidden">Add</span>
                </button>
              </div>
            </div>

            {/* Filters - Mobile Optimized */}
            <div className="mb-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
                {/* Academic Year Filter */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                    Academic Year
                  </label>
                  <select
                    value={feeStructureFilter.academicYear}
                    onChange={(e) => handleFeeStructureFilterChange('academicYear', e.target.value)}
                    className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  >
                    <option value="">All Academic Years</option>
                    {generateAcademicYears().map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>

                {/* Course Filter */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                    Course
                  </label>
                  <select
                    value={feeStructureFilter.course || ''}
                    onChange={(e) => handleFeeStructureFilterChange('course', e.target.value)}
                    className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  >
                    <option value="">All Courses</option>
                    {courses.map(course => (
                      <option key={course._id} value={course._id}>{course.name}</option>
                    ))}
                  </select>
                </div>

                {/* Year Filter */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                    Year
                  </label>
                  <select
                    value={feeStructureFilter.year || ''}
                    onChange={(e) => handleFeeStructureFilterChange('year', e.target.value)}
                    className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
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
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                    Category
                  </label>
                  <select
                    value={feeStructureFilter.category || ''}
                    onChange={(e) => handleFeeStructureFilterChange('category', e.target.value)}
                    className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
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
            <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="text-xs sm:text-sm text-gray-600">
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
                className="px-3 py-1.5 sm:py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 text-xs sm:text-sm"
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

                // Group structures by academic year, course, and year
                const groupedStructures = filteredStructures.reduce((acc, structure) => {
                  const key = `${structure.academicYear}-${structure.course?._id || structure.course}-${structure.year}`;
                  if (!acc[key]) {
                    acc[key] = {
                      academicYear: structure.academicYear,
                      course: structure.course,
                      year: structure.year,
                      categories: {}
                    };
                  }
                  acc[key].categories[structure.category] = structure;
                  return acc;
                }, {});

                const categories = ['A+', 'A', 'B+', 'B'];

                return (
                  <>
                    {/* Desktop Table View */}
                    <div className="hidden lg:block">
                      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gradient-to-r from-blue-50 to-indigo-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200">
                                Academic Year
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200">
                                Course
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200">
                                Year
                              </th>
                              {categories.map(category => (
                                <th key={category} className="px-3 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200 last:border-r-0">
                                  <div className="flex flex-col items-center">
                                    <span className="text-lg font-bold text-gray-800">{category}</span>
                                    <span className="text-xs text-gray-500 font-normal">Category</span>
                                  </div>
                                </th>
                              ))}
                              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {Object.values(groupedStructures).map((group, groupIndex) => (
                              <tr key={`${group.academicYear}-${group.course?._id || group.course}-${group.year}-${groupIndex}`} className="hover:bg-gray-50 transition-colors duration-150">
                                <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900 border-r border-gray-200">
                                  <div className="flex items-center">
                                    <AcademicCapIcon className="w-4 h-4 text-blue-500 mr-2" />
                                    {group.academicYear}
                                  </div>
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900 border-r border-gray-200">
                                  <div className="flex items-center">
                                    <UserGroupIcon className="w-4 h-4 text-green-500 mr-2" />
                                    {group.course?.name || 'Unknown Course'}
                                  </div>
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900 border-r border-gray-200">
                                  <div className="flex items-center justify-center">
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                      Year {group.year}
                                    </span>
                                  </div>
                                </td>
                                {categories.map(category => {
                                  const structure = group.categories[category];
                                  return (
                                    <td key={category} className="px-3 py-4 text-center border-r border-gray-200 last:border-r-0">
                                      {structure ? (
                                        <div 
                                          className="cursor-pointer group"
                                          onClick={() => openFeeStructureModal(structure)}
                                        >
                                          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-3 border border-green-200 hover:border-green-300 transition-all duration-200 hover:shadow-md relative group">
                                            <div className="text-lg font-bold text-green-700 group-hover:text-green-800">
                                              ₹{structure.totalFee.toLocaleString()}
                                            </div>
                                            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                              <span className="text-white text-sm font-medium">Click to view details</span>
                                            </div>
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="text-gray-400 text-sm py-2">
                                          <div className="w-16 h-16 mx-auto bg-gray-100 rounded-lg flex items-center justify-center">
                                            <span className="text-xs text-gray-400">N/A</span>
                                          </div>
                                        </div>
                                      )}
                                    </td>
                                  );
                                })}
                                <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-center">
                                  <div className="flex justify-center gap-2">
                                    <button
                                      onClick={() => {
                                        // Delete all structures in this group
                                        if (window.confirm(`Are you sure you want to delete all fee structures for ${group.course?.name} Year ${group.year}?`)) {
                                          Object.values(group.categories).forEach(structure => {
                                            deleteFeeStructure(structure.academicYear, structure.course?._id || structure.course, structure.year, structure.category);
                                          });
                                        }
                                      }}
                                      className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50 transition-colors duration-200"
                                      title="Delete All"
                                    >
                                      <TrashIcon className="w-4 h-4" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Mobile Card View */}
                    <div className="lg:hidden space-y-4">
                      {Object.values(groupedStructures).map((group, groupIndex) => (
                        <div 
                          key={`${group.academicYear}-${group.course?._id || group.course}-${group.year}-${groupIndex}`}
                          className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm"
                        >
                          {/* Header Section */}
                          <div className="mb-4 pb-4 border-b border-gray-200">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <div className="flex items-center mb-1">
                                  <AcademicCapIcon className="w-4 h-4 text-blue-500 mr-2" />
                                  <span className="text-sm font-semibold text-gray-900">{group.academicYear}</span>
                                </div>
                                <div className="flex items-center mb-1">
                                  <UserGroupIcon className="w-4 h-4 text-green-500 mr-2" />
                                  <span className="text-sm font-medium text-gray-700">{group.course?.name || 'Unknown Course'}</span>
                                </div>
                                <div className="mt-2">
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    Year {group.year}
                                  </span>
                                </div>
                              </div>
                              <button
                                onClick={() => {
                                  if (window.confirm(`Are you sure you want to delete all fee structures for ${group.course?.name} Year ${group.year}?`)) {
                                    Object.values(group.categories).forEach(structure => {
                                      deleteFeeStructure(structure.academicYear, structure.course?._id || structure.course, structure.year, structure.category);
                                    });
                                  }
                                }}
                                className="text-red-600 hover:text-red-900 p-2 rounded hover:bg-red-50 transition-colors duration-200"
                                title="Delete All"
                              >
                                <TrashIcon className="w-5 h-5" />
                              </button>
                            </div>
                          </div>

                          {/* Categories - Single Column on Mobile */}
                          <div className="space-y-2">
                            {categories.map(category => {
                              const structure = group.categories[category];
                              return (
                                <div 
                                  key={category}
                                  className={`border rounded-lg p-3 transition-all duration-200 ${
                                    structure 
                                      ? 'border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 cursor-pointer hover:shadow-md hover:border-green-300' 
                                      : 'border-gray-200 bg-gray-50'
                                  }`}
                                  onClick={() => structure && openFeeStructureModal(structure)}
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <div className="text-sm font-semibold text-gray-700">
                                        Category {category}
                                      </div>
                                    </div>
                                    {structure ? (
                                      <div className="flex items-center gap-2">
                                        <div className="text-base sm:text-lg font-bold text-green-700">
                                          ₹{structure.totalFee.toLocaleString()}
                                        </div>
                                        <div className="text-xs text-gray-500 hidden sm:block">
                                          Tap to view
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="text-gray-400 text-sm">
                                        <span className="text-xs">N/A</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
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
                      // Note: This will be updated to async when payment modal is opened
                      const balance = null; // Will be calculated when modal opens
                      const totalBalance = 0; // Will be updated when modal opens
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
                          
                          // Get late fee for this term
                          const termLateFee = balance.lateFees?.[term] || 0;

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
                                  <span>Paid:</span>
                                  <span className="font-medium text-green-600">₹{termData.paid.toLocaleString()}</span>
                                </div>
                                
                                <div className="flex justify-between">
                                  <span>Balance:</span>
                                  <span className={`font-medium ${termData.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                    ₹{termData.balance.toLocaleString()}
                                  </span>
                                </div>
                                
                                {termLateFee > 0 && (
                                  <div className="flex justify-between pt-2 border-t border-gray-200">
                                    <span className="text-orange-600 font-medium">Late Fee:</span>
                                    <span className="font-medium text-orange-600">₹{termLateFee.toLocaleString()}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                        
                        {/* Total Late Fee Summary */}
                        {balance.totalLateFee > 0 && (
                          <div className="col-span-full mt-4 bg-orange-50 rounded-lg p-4 border border-orange-200">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium text-orange-800">Total Late Fee:</span>
                              <span className="text-lg font-bold text-orange-700">₹{balance.totalLateFee.toLocaleString()}</span>
                            </div>
                            <p className="text-xs text-orange-600 mt-1">Late fees are separate from fee balance and must be paid in addition to outstanding fees.</p>
                          </div>
                        )}
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
          <div className={`bg-white rounded-lg p-6 w-full ${selectedFeeStructure ? 'max-w-4xl max-h-[90vh] overflow-y-auto' : 'max-w-4xl max-h-[90vh] overflow-y-auto'}`}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                {selectedFeeStructure ? 'Fee Structure Details' : (isEditMode ? 'Edit Fee Structure' : 'Add Fee Structure')}
              </h3>
              <button
                onClick={() => {
                  setShowFeeStructureModal(false);
                  setIsEditMode(false);
                }}
                className="p-1 text-gray-400 hover:text-gray-600"
                aria-label="Close modal"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {selectedFeeStructure ? (
              // Detailed View Mode
              <div className="space-y-6">
                {/* Basic Information */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <AcademicCapIcon className="w-5 h-5 text-blue-600 mr-2" />
                    Basic Information
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white rounded-lg p-4 border border-blue-100">
                      <div className="text-sm font-medium text-gray-500 mb-1">Academic Year</div>
                      <div className="text-lg font-semibold text-gray-900">{selectedFeeStructure.academicYear}</div>
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-blue-100">
                      <div className="text-sm font-medium text-gray-500 mb-1">Course</div>
                      <div className="text-lg font-semibold text-gray-900">{selectedFeeStructure.course?.name || 'Unknown Course'}</div>
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-blue-100">
                      <div className="text-sm font-medium text-gray-500 mb-1">Year of Study</div>
                      <div className="text-lg font-semibold text-gray-900">Year {selectedFeeStructure.year}</div>
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-blue-100">
                      <div className="text-sm font-medium text-gray-500 mb-1">Category</div>
                      <div className="text-lg font-semibold text-gray-900">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                          {selectedFeeStructure.category}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Fee Breakdown */}
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-6 border border-green-200">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <CurrencyDollarIcon className="w-5 h-5 text-green-600 mr-2" />
                    Fee Breakdown
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white rounded-lg p-4 border border-green-100 text-center">
                      <div className="text-sm font-medium text-gray-500 mb-2">Total Fee</div>
                      <div className="text-2xl font-bold text-green-700">₹{selectedFeeStructure.totalFee.toLocaleString()}</div>
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-green-100 text-center">
                      <div className="text-sm font-medium text-gray-500 mb-2">Term 1 (40%)</div>
                      <div className="text-xl font-bold text-blue-700">₹{(selectedFeeStructure.term1Fee || Math.round(selectedFeeStructure.totalFee * 0.4)).toLocaleString()}</div>
                      <div className="text-xs text-gray-500 mt-1">Due: Start of Academic Year</div>
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-green-100 text-center">
                      <div className="text-sm font-medium text-gray-500 mb-2">Term 2 (30%)</div>
                      <div className="text-xl font-bold text-orange-700">₹{(selectedFeeStructure.term2Fee || Math.round(selectedFeeStructure.totalFee * 0.3)).toLocaleString()}</div>
                      <div className="text-xs text-gray-500 mt-1">Due: Mid Academic Year</div>
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-green-100 text-center">
                      <div className="text-sm font-medium text-gray-500 mb-2">Term 3 (30%)</div>
                      <div className="text-xl font-bold text-purple-700">₹{(selectedFeeStructure.term3Fee || Math.round(selectedFeeStructure.totalFee * 0.3)).toLocaleString()}</div>
                      <div className="text-xs text-gray-500 mt-1">Due: End of Academic Year</div>
                    </div>
                  </div>
                </div>
                {/* Actions */}
                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => setShowFeeStructureModal(false)}
                    className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors duration-200"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      // Switch to edit mode
                      // Extract course ID properly - handle both populated and non-populated references
                      const courseId = selectedFeeStructure.course?._id || selectedFeeStructure.course || '';
                      // Convert year to string to match dropdown format
                      const yearValue = selectedFeeStructure.year ? String(selectedFeeStructure.year) : '';
                      const totalFeeValue = selectedFeeStructure.totalFee || 0;
                      
                      // Verify course exists in courses array
                      const courseExists = courses.find(c => c._id === courseId || String(c._id) === String(courseId));
                      if (!courseExists && courseId) {
                        console.warn('⚠️ Course not found in courses array:', courseId);
                      }
                      
                      console.log('🔍 Setting edit form:', {
                        academicYear: selectedFeeStructure.academicYear,
                        course: courseId,
                        year: yearValue,
                        category: selectedFeeStructure.category,
                        totalFee: totalFeeValue,
                        courseExists: !!courseExists
                      });
                      
                      setFeeStructureForm({
                        academicYear: selectedFeeStructure.academicYear || '',
                        course: String(courseId || ''),
                        year: yearValue,
                        category: selectedFeeStructure.category || '',
                        totalFee: totalFeeValue
                      });
                      // Reset bulk form to ensure single edit mode is detected
                      setBulkFeeForm({
                        academicYear: '',
                        course: '',
                        year: '',
                        categories: {
                          'A+': { totalFee: 0, exists: false },
                          'A': { totalFee: 0, exists: false },
                          'B+': { totalFee: 0, exists: false },
                          'B': { totalFee: 0, exists: false },
                        }
                      });
                      // Reset selected years when switching to edit mode
                      setSelectedYearsToApply([]);
                      // Set edit mode flag
                      setIsEditMode(true);
                      // Set selectedFeeStructure to null to switch to form view
                      // The category dropdown will use isEditMode to show all categories
                      setSelectedFeeStructure(null);
                    }}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
                  >
                    Edit Structure
                  </button>
                  <button
                    onClick={() => deleteFeeStructure(selectedFeeStructure.academicYear, selectedFeeStructure.course?._id || selectedFeeStructure.course, selectedFeeStructure.year, selectedFeeStructure.category)}
                    className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200"
                  >
                    Delete Structure
                  </button>
                </div>
              </div>
            ) : (
              // Add/Edit Fee Structure Mode
              <form onSubmit={handleFeeStructureSubmit}>
                <div className="space-y-4">
                  {/* Check if we're in single mode (edit mode OR add mode with course/year OR bulk form is empty) or bulk mode (bulkFeeForm has course and year) */}
                  {(!bulkFeeForm.course || bulkFeeForm.course === '') ? (
                    // Single Fee Structure Add/Edit Mode
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Academic Year
                          </label>
                          <select
                            value={feeStructureForm.academicYear}
                            onChange={(e) => {
                              setFeeStructureForm(prev => ({ ...prev, academicYear: e.target.value }));
                            }}
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
                            value={String(feeStructureForm.course || '')}
                            onChange={(e) => {
                              setFeeStructureForm(prev => ({ ...prev, course: e.target.value, year: '' }));
                              setSelectedYearsToApply([]);
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            required
                          >
                            <option value="">Select Course</option>
                            {courses.map(course => (
                              <option key={course._id} value={String(course._id)}>{course.name}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Year of Study
                          </label>
                          <select
                            value={feeStructureForm.year}
                            onChange={(e) => {
                              setFeeStructureForm(prev => ({ ...prev, year: e.target.value }));
                              setSelectedYearsToApply([]);
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            required
                            disabled={!feeStructureForm.course}
                          >
                            <option value="">
                              {!feeStructureForm.course 
                                ? 'Select Course first'
                                : 'Select Year'
                              }
                            </option>
                            {(() => {
                              // Normalize course ID comparison (handle both ObjectId and string)
                              const selectedCourse = courses.find(c => 
                                String(c._id) === String(feeStructureForm.course) || 
                                c._id === feeStructureForm.course
                              );
                              return selectedCourse && Array.from({ length: selectedCourse.duration }, (_, i) => i + 1).map(year => (
                                <option key={year} value={String(year)}>Year {year}</option>
                              ));
                            })()}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Category
                          </label>
                          <select
                            value={feeStructureForm.category}
                            onChange={(e) => {
                              setFeeStructureForm(prev => ({ ...prev, category: e.target.value }));
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            required
                          >
                            <option value="">Select Category</option>
                            {(() => {
                              // When editing, show all categories (including current one)
                              // When creating new, filter out existing categories
                              const categories = isEditMode || selectedFeeStructure 
                                ? getAvailableCategories() 
                                : getAvailableCategoriesForCreation();
                              return categories.map(category => (
                                <option key={category} value={category}>{category}</option>
                              ));
                            })()}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Total Fee (₹)
                          </label>
                          <input
                            type="number"
                            value={feeStructureForm.totalFee || ''}
                            onChange={(e) => {
                              setFeeStructureForm(prev => ({ ...prev, totalFee: parseFloat(e.target.value) || 0 }));
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Enter total fee"
                            min="0"
                            required
                          />
                          {feeStructureForm.totalFee > 0 && (
                            <div className="mt-2 text-xs text-gray-500">
                              <div className="flex justify-between">
                                <span>T1: ₹{Math.round(feeStructureForm.totalFee * 0.4).toLocaleString()}</span>
                                <span>T2: ₹{Math.round(feeStructureForm.totalFee * 0.3).toLocaleString()}</span>
                              </div>
                              <div className="text-center mt-1">
                                T3: ₹{Math.round(feeStructureForm.totalFee * 0.3).toLocaleString()}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Apply to Other Years Section - Show when course/year are selected (works for both add and edit) */}
                      {(() => {
                        // Normalize course ID comparison
                        const selectedCourse = courses.find(c => 
                          String(c._id) === String(feeStructureForm.course) || 
                          c._id === feeStructureForm.course
                        );
                        return feeStructureForm.course && feeStructureForm.year && selectedCourse && (
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
                          <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                            <AcademicCapIcon className="w-4 h-4 text-blue-600 mr-2" />
                            Apply Same Values to Other Years
                          </h4>
                          <p className="text-xs text-gray-600 mb-3">
                            Select additional years to apply the same fee structure values. The current year (Year {feeStructureForm.year}) will always be saved.
                          </p>
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                            {Array.from({ length: selectedCourse.duration }, (_, i) => i + 1)
                              .filter(year => {
                                const currentYear = parseInt(feeStructureForm.year) || 0;
                                return year !== currentYear;
                              })
                              .map(year => (
                                <label key={year} className="flex items-center space-x-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={selectedYearsToApply.includes(year)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedYearsToApply(prev => [...prev, year]);
                                      } else {
                                        setSelectedYearsToApply(prev => prev.filter(y => y !== year));
                                      }
                                    }}
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                  />
                                  <span className="text-sm text-gray-700">Year {year}</span>
                                </label>
                              ))
                            }
                          </div>
                          {selectedYearsToApply.length > 0 && (
                            <div className="mt-3 p-2 bg-blue-100 rounded text-xs text-blue-800">
                              Will apply to: Year {feeStructureForm.year} (current) {selectedYearsToApply.length > 0 && `+ ${selectedYearsToApply.length} other year(s)`}
                            </div>
                          )}
                        </div>
                      );
                      })()}
                    </>
                  ) : (
                    // Bulk Creation Mode
                    <>
                      {/* First row - Academic Year, Course, Year of Study */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Academic Year
                          </label>
                          <select
                            value={bulkFeeForm.academicYear}
                            onChange={(e) => {
                              setBulkFeeForm(prev => ({ ...prev, academicYear: e.target.value }));
                            }}
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
                        value={bulkFeeForm.course}
                        onChange={(e) => {
                          setBulkFeeForm(prev => ({ ...prev, course: e.target.value, year: '' }));
                        }}
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
                        value={bulkFeeForm.year}
                        onChange={(e) => {
                          setBulkFeeForm(prev => ({ ...prev, year: e.target.value }));
                          // Check for existing fee structures when year is selected
                          if (e.target.value && bulkFeeForm.course && bulkFeeForm.academicYear) {
                            checkExistingFeeStructures(bulkFeeForm.academicYear, bulkFeeForm.course, e.target.value);
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                        disabled={!bulkFeeForm.course}
                      >
                        <option value="">
                          {!bulkFeeForm.course 
                            ? 'Select Course first'
                            : 'Select Year'
                          }
                        </option>
                        {bulkFeeForm.course && courses.find(c => c._id === bulkFeeForm.course) && 
                          Array.from({ length: courses.find(c => c._id === bulkFeeForm.course).duration }, (_, i) => i + 1).map(year => (
                            <option key={year} value={year}>Year {year}</option>
                          ))
                        }
                      </select>
                    </div>
                  </div>

                  {/* Bulk Creation Form - Show when course and year are selected */}
                  {bulkFeeForm.course && bulkFeeForm.year ? (
                    <div className="space-y-4">
                      <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
                        <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                          <UserGroupIcon className="w-5 h-5 text-green-600 mr-2" />
                          Set Fees for All Categories
                        </h4>
                        <p className="text-sm text-gray-600 mb-4">
                          Set individual total fees for each category. Term fees will be automatically calculated (40%, 30%, 30%).
                        </p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {Object.entries(bulkFeeForm.categories).map(([category, data]) => (
                            <div key={category} className="bg-white rounded-lg p-4 border border-green-100">
                              <div className="flex items-center justify-between mb-2">
                                <label className="text-sm font-medium text-gray-700">
                                  Category {category}
                                </label>
                                {data.exists && (
                                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                    Existing
                                  </span>
                                )}
                              </div>
                              <input
                                type="number"
                                value={data.totalFee || ''}
                                onChange={(e) => {
                                  const value = parseInt(e.target.value) || 0;
                                  setBulkFeeForm(prev => ({
                                    ...prev,
                                    categories: {
                                      ...prev.categories,
                                      [category]: { ...data, totalFee: value }
                                    }
                                  }));
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                placeholder="Enter total fee"
                                min="0"
                                required
                              />
                              {data.totalFee > 0 && (
                                <div className="mt-2 text-xs text-gray-500">
                                  <div className="flex justify-between">
                                    <span>T1: ₹{Math.round(data.totalFee * 0.4).toLocaleString()}</span>
                                    <span>T2: ₹{Math.round(data.totalFee * 0.3).toLocaleString()}</span>
                                  </div>
                                  <div className="text-center mt-1">
                                    T3: ₹{Math.round(data.totalFee * 0.3).toLocaleString()}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <UserGroupIcon className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                      <p>Please select Course and Year to set fees for all categories</p>
                    </div>
                  )}
                    </>
                  )}
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowFeeStructureModal(false);
                      setIsEditMode(false);
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={feeStructureLoading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {feeStructureLoading ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </form>
            )}
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

      {/* Reminder Config Tab Content */}
      {activeTab === 'reminder-config' && (
        <ReminderConfig />
      )}

      {/* Concessions Tab Content */}
      {activeTab === 'concessions' && user?.role === 'super_admin' && renderConcessionApprovals()}

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
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        Sending reminder to:
                      </p>
                      <p className="text-sm text-gray-600">
                        {(() => {
                          const student = students.find(s => s._id === selectedReminders[0]);
                          return student ? `${student.name} (${student.rollNumber})` : 'Loading...';
                        })()}
                      </p>
                      {/* Email Info */}
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
                      {/* Phone Info */}
                      {(() => {
                        const student = students.find(s => s._id === selectedReminders[0]);
                        return student?.studentPhone ? (
                          <p className="text-xs text-green-600 mt-1">
                            📱 {student.studentPhone}
                          </p>
                        ) : (
                          <p className="text-xs text-red-500 mt-1">
                            ⚠️ No phone number available
                          </p>
                        );
                      })()}
                    </div>
                    <div className="text-right space-y-1">
                      <div className="text-xs text-gray-500">
                        {(() => {
                          const student = students.find(s => s._id === selectedReminders[0]);
                          if (!student?.email) return '❌ Email unavailable';
                          if (!emailServiceStatus?.configured) return '⚠️ Email service inactive';
                          return '✅ Email available';
                        })()}
                      </div>
                      <div className="text-xs text-gray-500">
                        {(() => {
                          const student = students.find(s => s._id === selectedReminders[0]);
                          if (!student?.studentPhone) return '❌ SMS unavailable';
                          return '✅ SMS available';
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

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="sendSMS"
                      checked={reminderOptions.sendSMS}
                      onChange={(e) => setReminderOptions(prev => ({
                        ...prev,
                        sendSMS: e.target.checked
                      }))}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="sendSMS" className="ml-2 text-sm text-gray-700 flex items-center">
                      <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      SMS Notification
                    </label>
                  </div>
                </div>
                
                {/* Validation Message */}
                {!reminderOptions.sendEmail && !reminderOptions.sendPushNotification && !reminderOptions.sendSMS && (
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
                    if (!reminderOptions.sendEmail && !reminderOptions.sendPushNotification && !reminderOptions.sendSMS) {
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
                      sendPushNotification: true,
                      sendSMS: true
                    });
                  }}
                  disabled={sendingReminders || (!reminderOptions.sendEmail && !reminderOptions.sendPushNotification && !reminderOptions.sendSMS)}
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

      {/* Concession Approve Modal */}
      {approveModal.open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Approve Concession</h3>
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                Student: <strong>{approveModal.student?.name}</strong>
              </p>
              <p className="text-sm text-gray-600 mb-4">
                Requested Concession: <strong>₹{approveModal.student?.concession?.toLocaleString()}</strong>
              </p>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Concession Amount (₹) - Change amount or leave as requested
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={approveModal.newAmount}
                onChange={(e) => {
                  const value = e.target.value;
                  setApproveModal(prev => ({ ...prev, newAmount: value }));
                }}
                placeholder={`Current: ₹${approveModal.student?.concession?.toLocaleString() || 0}`}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-2"
              />
              {approveModal.newAmount && Number(approveModal.newAmount) !== approveModal.student?.concession && (
                <div className="mb-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
                  <span className="text-gray-600">Current: </span>
                  <span className="font-medium">₹{approveModal.student?.concession?.toLocaleString() || 0}</span>
                  <span className="text-gray-600"> → New: </span>
                  <span className="font-medium text-blue-600">₹{Number(approveModal.newAmount).toLocaleString()}</span>
                </div>
              )}
              <label className="block text-sm font-medium text-gray-700 mb-2 mt-3">
                Notes (Optional)
              </label>
              <textarea
                value={approveModal.notes}
                onChange={(e) => setApproveModal(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Add any notes..."
                rows={3}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Leave empty to approve as requested (₹{approveModal.student?.concession?.toLocaleString() || 0}), or enter a different amount to change it
              </p>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setApproveModal({ open: false, student: null, newAmount: '', notes: '' })}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  // If empty or same as current, approve with null (use current amount)
                  // Otherwise, use the new amount
                  let newAmount = null;
                  
                  if (approveModal.newAmount && approveModal.newAmount.trim() !== '') {
                    const parsedAmount = Number(approveModal.newAmount);
                    
                    if (isNaN(parsedAmount) || parsedAmount < 0) {
                      toast.error('Please enter a valid concession amount (must be 0 or greater)');
                      return;
                    }
                    
                    // Only set newAmount if it's different from current
                    if (parsedAmount !== approveModal.student?.concession) {
                      newAmount = parsedAmount;
                    }
                  }
                  
                  handleApproveConcession(approveModal.student._id, newAmount, approveModal.notes);
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-md text-sm hover:bg-green-700"
              >
                {approveModal.newAmount && Number(approveModal.newAmount) !== approveModal.student?.concession
                  ? 'Approve with New Amount'
                  : 'Approve as Requested'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Concession Reject Modal */}
      {rejectModal.open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Reject Concession</h3>
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                Student: <strong>{rejectModal.student?.name}</strong>
              </p>
              <p className="text-sm text-gray-600 mb-4">
                Current Concession: <strong>₹{rejectModal.student?.concession?.toLocaleString()}</strong>
              </p>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Concession Amount (₹) - Leave empty or set to 0 to remove completely
              </label>
              <input
                type="number"
                value={rejectModal.newAmount}
                onChange={(e) => setRejectModal(prev => ({ ...prev, newAmount: e.target.value }))}
                placeholder="Enter new amount or leave empty"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Leave empty or set to 0 to completely remove the concession
              </p>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setRejectModal({ open: false, student: null, newAmount: '' })}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const newAmount = rejectModal.newAmount === '' ? null : Number(rejectModal.newAmount);
                  handleRejectConcession(rejectModal.student._id, newAmount);
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-md text-sm hover:bg-red-700"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}      
    </div>
    </div>
  );
    return (
      <div className="space-y-4">
        {/* Tabs for Pending/Approved */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-1">
          <div className="flex space-x-1">
            <button
              onClick={() => {
                setConcessionViewMode('pending');
                fetchConcessionApprovals();
              }}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                concessionViewMode === 'pending'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Pending Approvals ({concessionApprovals.length})
            </button>
            <button
              onClick={() => {
                setConcessionViewMode('approved');
                fetchApprovedConcessions();
              }}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                concessionViewMode === 'approved'
                  ? 'bg-green-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Approved Concessions ({approvedConcessions.length})
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <input
                type="text"
                placeholder="Name, Roll No, Hostel ID..."
                value={concessionApprovalFilters.search}
                onChange={(e) => {
                  setConcessionApprovalFilters(prev => ({ ...prev, search: e.target.value }));
                }}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Course</label>
              <select
                value={concessionApprovalFilters.course}
                onChange={(e) => {
                  setConcessionApprovalFilters(prev => ({ ...prev, course: e.target.value }));
                }}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Courses</option>
                {courses.map(course => (
                  <option key={course._id} value={course.name}>{course.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Students List - Card View */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          {concessionViewMode === 'pending' ? (
            // Pending Approvals View
            loadingConcessionApprovals ? (
              <div className="flex justify-center items-center py-12">
                <LoadingSpinner />
              </div>
            ) : concessionApprovals.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircleIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">No pending concession approvals</p>
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    Pending Approvals ({concessionApprovals.length})
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {concessionApprovals.map((student) => (
                  <div key={student._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="text-base font-semibold text-gray-900">{student.name}</h4>
                        <p className="text-sm text-gray-500">{student.rollNumber}</p>
                      </div>
                      <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                        Pending
                      </span>
                    </div>
                    
                    <div className="space-y-2 text-sm mb-4">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Course:</span>
                        <span className="font-medium">{typeof student.course === 'string' ? student.course : student.course?.name || 'N/A'} - Year {student.year}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Original Fee:</span>
                        <span className="font-medium">₹{student.originalTotalFee?.toLocaleString() || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Concession:</span>
                        <span className="font-semibold text-yellow-600">₹{student.concession?.toLocaleString() || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">After Concession:</span>
                        <span className="font-medium">₹{student.afterConcessionFee?.toLocaleString() || 'N/A'}</span>
                      </div>
                      {student.concessionRequestedBy && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Requested By:</span>
                          <span className="text-xs text-gray-500">
                            {student.concessionRequestedBy?.name || student.concessionRequestedBy?.username || 'N/A'}
                          </span>
                        </div>
                      )}
                      {student.concessionRequestedAt && (
                        <div className="text-xs text-gray-400">
                          {new Date(student.concessionRequestedAt).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex space-x-2 pt-3 border-t border-gray-200">
                      <button
                        onClick={() => setApproveModal({ open: true, student, newAmount: student.concession?.toString() || '', notes: '' })}
                        className="flex-1 bg-green-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-green-700 flex items-center justify-center space-x-1"
                      >
                        <CheckCircleIcon className="w-4 h-4" />
                        <span>Approve</span>
                      </button>
                      <button
                        onClick={() => setRejectModal({ open: true, student, newAmount: '' })}
                        className="flex-1 bg-red-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-red-700 flex items-center justify-center space-x-1"
                      >
                        <XCircleIcon className="w-4 h-4" />
                        <span>Reject</span>
                      </button>
                    </div>
                    
                    {/* Approval History */}
                    {student.concessionHistory && student.concessionHistory.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-gray-200">
                        <h5 className="text-xs font-semibold text-gray-700 mb-2">History</h5>
                        <div className="space-y-2 max-h-32 overflow-y-auto">
                          {student.concessionHistory.slice().reverse().map((history, idx) => (
                            <div key={idx} className="text-xs bg-gray-50 p-2 rounded">
                              <div className="flex justify-between items-start">
                                <span className={`font-medium ${
                                  history.action === 'approved' ? 'text-green-600' :
                                  history.action === 'rejected' ? 'text-red-600' :
                                  history.action === 'updated' ? 'text-blue-600' : 'text-gray-600'
                                }`}>
                                  {history.action.charAt(0).toUpperCase() + history.action.slice(1)}
                                </span>
                                <span className="text-gray-500">
                                  {new Date(history.performedAt).toLocaleDateString()}
                                </span>
                              </div>
                              {history.previousAmount !== null && history.previousAmount !== history.amount && (
                                <div className="text-gray-600 mt-1">
                                  ₹{history.previousAmount?.toLocaleString()} → ₹{history.amount?.toLocaleString()}
                                </div>
                              )}
                              {history.performedBy && (
                                <div className="text-gray-500 mt-1">
                                  By: {history.performedBy?.name || history.performedBy?.username || 'N/A'}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  ))}
                </div>
              </>
            )
          ) : (
            // Approved Concessions View
            loadingApprovedConcessions ? (
              <div className="flex justify-center items-center py-12">
                <LoadingSpinner />
              </div>
            ) : approvedConcessions.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircleIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">No approved concessions found</p>
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    Approved Concessions ({approvedConcessions.length})
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-8"></th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Course & Year</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Original Fee</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Concession</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">After Concession</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {approvedConcessions.map((student) => {
                        const isExpanded = expandedRows.has(student._id);
                        return (
                          <React.Fragment key={student._id}>
                            <tr 
                              className="hover:bg-gray-50 cursor-pointer transition-colors"
                              onClick={() => {
                                const newExpanded = new Set(expandedRows);
                                if (isExpanded) {
                                  newExpanded.delete(student._id);
                                } else {
                                  newExpanded.add(student._id);
                                }
                                setExpandedRows(newExpanded);
                              }}
                            >
                              <td className="px-4 py-4 whitespace-nowrap">
                                {isExpanded ? (
                                  <ChevronUpIcon className="w-5 h-5 text-gray-400" />
                                ) : (
                                  <ChevronDownIcon className="w-5 h-5 text-gray-400" />
                                )}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap">
                                <div>
                                  <div className="text-sm font-medium text-gray-900">{student.name}</div>
                                  <div className="text-sm text-gray-500">{student.rollNumber}</div>
                                </div>
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                  {typeof student.course === 'string' ? student.course : student.course?.name || 'N/A'}
                                </div>
                                <div className="text-sm text-gray-500">Year {student.year}</div>
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">₹{student.originalTotalFee?.toLocaleString() || 'N/A'}</div>
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap">
                                <div className="text-sm font-semibold text-green-600">₹{student.concession?.toLocaleString() || 0}</div>
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">₹{student.afterConcessionFee?.toLocaleString() || student.totalCalculatedFee?.toLocaleString() || 'N/A'}</div>
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap">
                                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                  Approved
                                </span>
                              </td>
                            </tr>
                            {isExpanded && (
                              <tr>
                                <td colSpan="7" className="px-4 py-4 bg-gray-50">
                                  <div className="space-y-4">
                                    {/* Additional Details */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                      <div>
                                        <span className="font-medium text-gray-700">Hostel ID:</span>
                                        <span className="ml-2 text-gray-900">{student.hostelId || 'N/A'}</span>
                                      </div>
                                      <div>
                                        <span className="font-medium text-gray-700">Category:</span>
                                        <span className="ml-2 text-gray-900">{student.category || 'N/A'}</span>
                                      </div>
                                      <div>
                                        <span className="font-medium text-gray-700">Room Number:</span>
                                        <span className="ml-2 text-gray-900">{student.roomNumber || 'N/A'}</span>
                                      </div>
                                      <div>
                                        <span className="font-medium text-gray-700">Academic Year:</span>
                                        <span className="ml-2 text-gray-900">{student.academicYear || 'N/A'}</span>
                                      </div>
                                      {student.concessionRequestedBy && (
                                        <div>
                                          <span className="font-medium text-gray-700">Requested By:</span>
                                          <span className="ml-2 text-gray-900">
                                            {student.concessionRequestedBy?.name || student.concessionRequestedBy?.username || 'N/A'}
                                          </span>
                                        </div>
                                      )}
                                      {student.concessionRequestedAt && (
                                        <div>
                                          <span className="font-medium text-gray-700">Requested On:</span>
                                          <span className="ml-2 text-gray-900">
                                            {new Date(student.concessionRequestedAt).toLocaleDateString()}
                                          </span>
                                        </div>
                                      )}
                                      {student.concessionApprovedBy && (
                                        <div>
                                          <span className="font-medium text-gray-700">Approved By:</span>
                                          <span className="ml-2 text-gray-900">
                                            {student.concessionApprovedBy?.name || student.concessionApprovedBy?.username || 'N/A'}
                                          </span>
                                        </div>
                                      )}
                                      {student.concessionApprovedAt && (
                                        <div>
                                          <span className="font-medium text-gray-700">Approved On:</span>
                                          <span className="ml-2 text-gray-900">
                                            {new Date(student.concessionApprovedAt).toLocaleDateString()}
                                          </span>
                                        </div>
                                      )}
                                    </div>

                                    {/* Fee Breakdown */}
                                    <div className="border-t border-gray-200 pt-4">
                                      <h4 className="text-sm font-semibold text-gray-700 mb-2">Fee Breakdown</h4>
                                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                        <div>
                                          <span className="text-gray-600">Term 1:</span>
                                          <span className="ml-2 font-medium text-gray-900">
                                            ₹{student.calculatedTerm1Fee?.toLocaleString() || student.originalTotalFee ? Math.round((student.originalTotalFee * 0.4)).toLocaleString() : 'N/A'}
                                          </span>
                                        </div>
                                        <div>
                                          <span className="text-gray-600">Term 2:</span>
                                          <span className="ml-2 font-medium text-gray-900">
                                            ₹{student.calculatedTerm2Fee?.toLocaleString() || student.originalTotalFee ? Math.round((student.originalTotalFee * 0.3)).toLocaleString() : 'N/A'}
                                          </span>
                                        </div>
                                        <div>
                                          <span className="text-gray-600">Term 3:</span>
                                          <span className="ml-2 font-medium text-gray-900">
                                            ₹{student.calculatedTerm3Fee?.toLocaleString() || student.originalTotalFee ? Math.round((student.originalTotalFee * 0.3)).toLocaleString() : 'N/A'}
                                          </span>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Approval History */}
                                    {student.concessionHistory && student.concessionHistory.length > 0 && (
                                      <div className="border-t border-gray-200 pt-4">
                                        <h4 className="text-sm font-semibold text-gray-700 mb-3">Approval History</h4>
                                        <div className="space-y-2 max-h-64 overflow-y-auto">
                                          {student.concessionHistory.slice().reverse().map((history, idx) => (
                                            <div key={idx} className="bg-gray-50 p-3 rounded-lg text-xs">
                                              <div className="flex justify-between items-start mb-2">
                                                <span className={`font-semibold ${
                                                  history.action === 'approved' ? 'text-green-600' :
                                                  history.action === 'rejected' ? 'text-red-600' :
                                                  history.action === 'updated' ? 'text-blue-600' : 'text-gray-600'
                                                }`}>
                                                  {history.action.charAt(0).toUpperCase() + history.action.slice(1)}
                                                </span>
                                                <span className="text-gray-500">
                                                  {new Date(history.performedAt).toLocaleDateString()}
                                                </span>
                                              </div>
                                              {history.previousAmount !== null && history.previousAmount !== history.amount && (
                                                <div className="text-gray-700 mb-1">
                                                  <span className="font-medium">Amount Change:</span> ₹{history.previousAmount?.toLocaleString()} → ₹{history.amount?.toLocaleString()}
                                                </div>
                                              )}
                                              {history.performedBy && (
                                                <div className="text-gray-600 mb-1">
                                                  <span className="font-medium">By:</span> {history.performedBy?.name || history.performedBy?.username || 'N/A'}
                                                </div>
                                              )}
                                              {history.notes && (
                                                <div className="text-gray-600 italic mt-1">
                                                  <span className="font-medium">Note:</span> {history.notes}
                                                </div>
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )
          )}
        </div>
      </div>
    );
  };

export default FeeManagement; 
