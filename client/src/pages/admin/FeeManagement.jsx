import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useGlobalSettings } from '../../context/GlobalSettingsContext';
import { useCoursesBranches } from '../../context/CoursesBranchesContext';
import { useDebounce } from '../../hooks/useDebounce';
import { useQuery } from '@tanstack/react-query';
import api from '../../utils/axios';
import toast from 'react-hot-toast';
import ReceiptGenerator from '../../components/ReceiptGenerator';
import { hasPermission } from '../../utils/permissionUtils';
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
  const { courses: coursesFromContext, branches: branchesFromContext } = useCoursesBranches();
  
  // Check if user has concession management permission
  const canManageConcessions = user?.role === 'super_admin' || hasPermission(user, 'concession_management');
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
  // Generate current academic year
  const getCurrentAcademicYear = () => {
    const currentYear = new Date().getFullYear();
    return `${currentYear}-${currentYear + 1}`;
  };

  const [filters, setFilters] = useState({
    search: '',
    hostel: '',
    academicYear: getCurrentAcademicYear(), // Default to current academic year
    category: '',
    course: '',
    year: ''
  });
  
  // Hostels state for filter dropdown
  const [hostels, setHostels] = useState([]);
  
  // Debounce search to reduce API calls
  const debouncedSearch = useDebounce(filters.search, 500);

  // Fee Structure Data (used for dues/payment calculations)
  const [feeStructures, setFeeStructures] = useState([]);
  const [courses, setCourses] = useState(coursesFromContext || []); // Use from context if available
  const branchList = useMemo(() => {
    if (branchesFromContext && branchesFromContext.length > 0) {
      return branchesFromContext;
    }
    return (courses || []).flatMap(c => c?.branches || []);
  }, [branchesFromContext, courses]);
  const [duesCourseYears, setDuesCourseYears] = useState([]); // Separate state for dues tab course years
  
  // Update courses when context updates
  useEffect(() => {
    if (coursesFromContext && coursesFromContext.length > 0) {
      setCourses(coursesFromContext);
    }
  }, [coursesFromContext]);
  const [activeTab, setActiveTab] = useState('dues'); // 'dues', 'payments', 'reminders', 'reminder-config', or 'concessions'

  // Payment Tracking State
  const [payments, setPayments] = useState([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentHistoryLoading, setPaymentHistoryLoading] = useState(false);
  const [selectedStudentForPayment, setSelectedStudentForPayment] = useState(null);
  const [paymentForm, setPaymentForm] = useState({
    paymentType: 'hostel_fee', // 'hostel_fee', 'electricity', or 'additional_fee'
    amount: '',
    paymentMethod: 'Cash',
    term: '',
    billId: '', // For electricity bills
    month: '', // For electricity bills
    notes: '',
    utrNumber: '', // UTR number for online payments
    additionalFeeType: '' // For additional fees
  });
  // Additional Fees Data (used in payments and balances)
  const [additionalFees, setAdditionalFees] = useState({});
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
  const [pendingElectricityBills, setPendingElectricityBills] = useState([]);
  const [pendingBillsLoading, setPendingBillsLoading] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    termBreakdown: true,
    additionalFees: false,
    electricityBills: false
  });
  const [studentAdditionalFees, setStudentAdditionalFees] = useState({}); // Configured additional fees for the student

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


  // Cache for term due dates to avoid repeated API calls
  // Note: Due dates are configured per course/academicYear/yearOfStudy (shared across all categories)
  // Fee structures are per course/academicYear/year/category (different fees per category)
  // This means all categories (A+, A, B+, B, C) share the same due dates but have different fee amounts
  const termDueDatesCache = useRef(new Map());
  const CACHE_TTL = 30 * 60 * 1000; // 30 minutes cache

  // Helper function to get course name (handles both string and object formats)
  // After SQL migration, course is stored as a string (course name)
  const normalizeCourseName = (value) => {
    if (!value) return '';
    const str = String(value).trim();
    // Handle sql_* identifiers by looking up matching sqlCourseId on loaded courses (if available)
    if (/^sql[_\s-]?/i.test(str)) {
      const sqlId = str.replace(/^sql[_\s-]?/i, '').trim();
      const sqlMatch = courses.find(c => String(c.sqlCourseId) === sqlId);
      if (sqlMatch?.name) return sqlMatch.name;
    }
    return str;
  };

  const getCourseName = (course) => {
    if (!course) return 'Unknown Course';
    if (typeof course === 'string') {
      const match = courses.find(
        c => String(c._id) === course || normalizeCourseName(c.name) === normalizeCourseName(course)
      );
      return match?.name || normalizeCourseName(course) || 'Unknown Course';
    }
    if (typeof course === 'object') {
      if (course.name) return course.name;
      if (course.code) return course.code;
      if (course._id) {
        const match = courses.find(c => String(c._id) === String(course._id));
        if (match?.name) return match.name;
        // Fallback for sql_* stored as _id
        if (course.sqlCourseId) {
          const sqlMatch = courses.find(c => String(c.sqlCourseId) === String(course.sqlCourseId));
          if (sqlMatch?.name) return sqlMatch.name;
        }
      }
    }
    return 'Unknown Course';
  };

  const getBranchName = (branch) => {
    if (!branch) return 'Unknown Branch';
    const normalizeBranchName = (value) => {
      if (!value) return '';
      return String(value).trim();
    };

    // Branch as string
    if (typeof branch === 'string') {
      // Try match by id or name or sqlBranchId
      const match = branchList.find(
        b =>
          String(b._id) === branch ||
          normalizeBranchName(b.name) === normalizeBranchName(branch) ||
          (b.sqlBranchId !== undefined && String(b.sqlBranchId) === branch.replace(/^sql[_\s-]?/i, '').trim())
      );
      return match?.name || normalizeBranchName(branch) || 'Unknown Branch';
    }

    if (typeof branch === 'object') {
      if (branch.name) return branch.name;
      if (branch.code) return branch.code;
      if (branch._id) {
        const match = branchList.find(b => String(b._id) === String(branch._id));
        if (match?.name) return match.name;
        // Fallback: try sqlBranchId if present
        if (branch.sqlBranchId) {
          const sqlMatch = branchList.find(b => String(b.sqlBranchId) === String(branch.sqlBranchId));
          if (sqlMatch?.name) return sqlMatch.name;
        }
      }
    }

    return 'Unknown Branch';
  };

  // Helper function to get student term due dates from backend with caching
  // Due dates are linked to fee structures via: course, academicYear, yearOfStudy
  // Fee structures are linked via: course, academicYear, year, category
  // Due dates are shared across all categories for the same course/year/academicYear
  const getStudentTermDueDates = useCallback(async (student) => {
    const courseName = getCourseName(student?.course);
    if (!courseName || courseName === 'Unknown Course' || !student?.academicYear || !student?.year) {
      console.warn('⚠️ Cannot fetch due dates: Missing student course, academicYear, or year');
      return null;
    }

    // Create cache key from course name, academicYear, and year (category not needed - due dates are shared)
    const cacheKey = `${courseName}-${student.academicYear}-${student.year}`;
    
    // Check cache first
    const cached = termDueDatesCache.current.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
      return cached.data;
    }

    try {
      // Fetch due dates from reminder config
      // Note: semesterStartDate is used as a fallback if semester dates aren't configured
      // Backend expects course name (string) after SQL migration
      const response = await api.get(`/api/reminder-config/calculate-term-due-dates/${encodeURIComponent(courseName)}/${student.academicYear}/${student.year}`, {
        params: { semesterStartDate: new Date().toISOString() }
      });
      
      if (response.data.success && response.data.data) {
        const dueDates = response.data.data; // Returns { term1: Date, term2: Date, term3: Date }
        
        // Validate that due dates are valid Date objects or strings
        if (dueDates.term1 && dueDates.term2 && dueDates.term3) {
          // Cache the result
          termDueDatesCache.current.set(cacheKey, {
            data: dueDates,
            timestamp: Date.now()
          });
          return dueDates;
        } else {
          console.warn('⚠️ Invalid due dates structure received:', dueDates);
        }
      }
    } catch (error) {
      // Due dates not configured for this course/academicYear/year combination
      // This is acceptable - the system will show all balances if no due dates are configured
      console.log(`ℹ️ No due dates configured for ${student.name} (${getCourseName(student.course)}, Year ${student.year}, ${student.academicYear})`);
      
      // Cache null result to avoid repeated failed calls
      termDueDatesCache.current.set(cacheKey, {
        data: null,
        timestamp: Date.now()
      });
    }
    return null; // No due dates configured
  }, []);

  // Helper function to filter balances based on due dates
  // This function links fee structures (which have balances) with due date configurations
  // Only shows dues for terms where the due date has passed (currentDate >= dueDate)
  // If no due dates are configured, shows all balances (all terms are considered due)
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
      // No due dates configured - show all balances as due
      // This happens when due date config doesn't exist for this course/academicYear/year
      return {
        term1Due: studentBalance.termBalances.term1.balance,
        term2Due: studentBalance.termBalances.term2.balance,
        term3Due: studentBalance.termBalances.term3.balance,
        totalDue: studentBalance.totalBalance
      };
    }

    // Parse due dates to ensure they're Date objects
    // Due dates come from backend as ISO strings or Date objects
    const parseDueDate = (dateValue) => {
      if (!dateValue) return null;
      if (dateValue instanceof Date) return dateValue;
      const parsed = new Date(dateValue);
      return isNaN(parsed.getTime()) ? null : parsed;
    };

    const term1DueDate = parseDueDate(termDueDates.term1);
    const term2DueDate = parseDueDate(termDueDates.term2);
    const term3DueDate = parseDueDate(termDueDates.term3);

    // Ensure currentDate is a Date object
    const currentDateObj = currentDate instanceof Date ? currentDate : new Date(currentDate);

    // Filter balances based on due dates
    // Only show dues for terms where the due date has passed
    const filteredBalance = {
      term1Due: (term1DueDate && currentDateObj >= term1DueDate) ? studentBalance.termBalances.term1.balance : 0,
      term2Due: (term2DueDate && currentDateObj >= term2DueDate) ? studentBalance.termBalances.term2.balance : 0,
      term3Due: (term3DueDate && currentDateObj >= term3DueDate) ? studentBalance.termBalances.term3.balance : 0,
      totalDue: 0
    };

    // Calculate total due
    filteredBalance.totalDue = filteredBalance.term1Due + filteredBalance.term2Due + filteredBalance.term3Due;

    return filteredBalance;
  };

  // Fetch fee structure for a specific student course, year, category and academic year
  // Fee structures are linked by: academicYear, course, branch (optional), year, hostelId (optional), categoryId (optional), category (legacy)
  // Note: Due dates are configured separately per course/academicYear/year (shared across categories)
  // This means all categories (A+, A, B+, B, C) have the same due dates but different fee amounts
  const getFeeStructureForStudent = (course, year, category, academicYear, studentHostel = null, studentHostelCategory = null, studentBranch = null) => {
    // Get course name from student (handles both string and object)
    const studentCourseName = getCourseName(course);
    
    // Normalize course names for comparison (trim and handle case)
    const normalizeCourseName = (name) => {
      if (!name) return '';
      return String(name).trim();
    };
    
    const normalizedStudentCourse = normalizeCourseName(studentCourseName);
    
    // Helper to extract ID from object or string
    const extractId = (id) => {
      if (!id) return null;
      if (typeof id === 'string') return id;
      if (typeof id === 'object' && id._id) return String(id._id);
      return String(id);
    };
    
    // Extract student hostel and category IDs
    const studentHostelId = extractId(studentHostel);
    const studentHostelCategoryId = extractId(studentHostelCategory);
    
    // Debug logging only if no structures loaded
    if (feeStructures.length === 0) {
      console.warn('⚠️ No fee structures loaded for academic year:', academicYear);
      return undefined;
    }
    
    // First, filter by academic year and course to reduce search space
    // Resolve fee structure's course (might be SQL ID) before comparison
    const candidateStructures = feeStructures.filter(s => {
      // Resolve fee structure's course name (might be SQL ID)
      const structCourseName = getCourseName(s.course);
      const normalizedStructCourse = normalizeCourseName(structCourseName);
      return normalizedStructCourse === normalizedStudentCourse && s.academicYear === academicYear;
    });
    
    if (candidateStructures.length === 0) {
      // Only log if we have structures but none match this course
      console.warn(`⚠️ No fee structures found for course "${normalizedStudentCourse}" in academic year "${academicYear}"`, {
        availableCourses: [...new Set(feeStructures.map(s => s.course))],
        availableYears: [...new Set(feeStructures.map(s => s.academicYear))],
        studentBranch: normalizedStudentBranch
      });
      return undefined;
    }
    
    // Get student branch name for matching
    const studentBranchName = studentBranch ? getBranchName(studentBranch) : null;
    const normalizeBranchName = (name) => {
      if (!name) return null;
      return String(name).trim();
    };
    const normalizedStudentBranch = normalizeBranchName(studentBranchName);
    
    // Now match by year, branch, hostel, categoryId, and category
    const structure = candidateStructures.find(structure => {
      // Match year - must be exact match
      const yearMatch = Number(structure.year) === Number(year);
      if (!yearMatch) {
        return false;
      }
      
      // Match branch - if fee structure has a branch, it must match student's branch
      // If fee structure has no branch (null/undefined), it applies to all branches
      let branchMatch = true; // Default: applies to all branches
      if (structure.branch) {
        const structureBranchName = normalizeBranchName(getBranchName(structure.branch));
        // If structure has branch, student must have matching branch
        if (normalizedStudentBranch) {
          branchMatch = structureBranchName === normalizedStudentBranch;
        } else {
          // Structure requires a branch, but student has no branch - no match
          branchMatch = false;
        }
      }
      // If structure has no branch, it applies to all branches (branchMatch = true)
      
      if (!branchMatch) return false;
      
      // Match hostelId - if fee structure has a hostelId, it must match student's hostel
      // If fee structure has no hostelId (null), it applies to all hostels
      let hostelMatch = true; // Default: applies to all hostels
      if (structure.hostelId) {
        const structureHostelId = extractId(structure.hostelId);
        // If structure has hostelId, student must have matching hostel
        if (studentHostelId) {
          hostelMatch = structureHostelId === studentHostelId;
        } else {
          // Structure requires a hostel, but student has no hostel - no match
          hostelMatch = false;
        }
      }
      // If structure has no hostelId, it applies to all hostels (hostelMatch = true)
      
      if (!hostelMatch) return false;
      
      // Match categoryId - if fee structure has a categoryId, it must match student's hostelCategory
      // If fee structure has no categoryId (null), it applies to all categories within the hostel
      let categoryIdMatch = true; // Default: applies to all categories
      if (structure.categoryId) {
        const structureCategoryId = extractId(structure.categoryId);
        // If structure has categoryId, student must have matching hostelCategory
        if (studentHostelCategoryId) {
          categoryIdMatch = structureCategoryId === studentHostelCategoryId;
        } else {
          // Structure requires a categoryId, but student has no hostelCategory - no match
          categoryIdMatch = false;
        }
      }
      // If structure has no categoryId, it applies to all categories (categoryIdMatch = true)
      
      if (!categoryIdMatch) return false;
      
      // Match category (legacy string field) - handle both legacy category (string) and new categoryId (object with name)
      // This ensures the category name matches the student's category string
      let categoryMatch = true; // Default: applies to all categories
      if (structure.categoryId) {
        // New format: categoryId is populated as object with name property
        // The categoryId's name should match the student's category string
        const categoryName = typeof structure.categoryId === 'object' && structure.categoryId?.name 
          ? structure.categoryId.name 
          : null;
        if (categoryName) {
          // If categoryId has a name, it must match the student's category string
          categoryMatch = categoryName === category;
        } else {
          // categoryId matched above, but no name available - assume match (shouldn't happen if populated correctly)
          categoryMatch = true;
        }
      } else if (structure.category) {
        // Legacy format: category is a string (e.g., "A+", "A", "B+", "B", "C")
        // Must match student's category string exactly
        categoryMatch = structure.category === category;
      }
      // If no categoryId and no category field, applies to all categories (categoryMatch = true)
      
      return categoryMatch;
    });

    // Only log warning if we had candidate structures but none matched
    if (!structure && candidateStructures.length > 0) {
      console.warn(`⚠️ No matching fee structure found for:`, {
        course: normalizedStudentCourse,
        year,
        category,
        academicYear,
        studentHostel: studentHostelId,
        studentHostelCategory: studentHostelCategoryId,
        studentBranch: normalizedStudentBranch,
        availableStructuresForCourse: candidateStructures.map(s => ({
          year: s.year,
          branch: getBranchName(s.branch),
          hostelId: extractId(s.hostelId),
          categoryId: extractId(s.categoryId),
          category: s.category,
          categoryIdName: s.categoryId?.name,
          amount: s.amount,
          totalFee: s.totalFee
        }))
      });
    } else if (structure) {
      console.log(`✅ Fee structure matched for student:`, {
        course: normalizedStudentCourse,
        year,
        category,
        academicYear,
        structureId: structure._id,
        amount: structure.amount,
        term1Fee: structure.term1Fee,
        term2Fee: structure.term2Fee,
        term3Fee: structure.term3Fee
      });
    }

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

  // OPTIMIZED: Use React Query for students table data to enable parallel fetching
  const fetchStudentsForTable = useCallback(async () => {
    const params = new URLSearchParams({
      page: currentPage,
      limit: 20
    });

    if (debouncedSearch && debouncedSearch.trim()) params.append('search', debouncedSearch.trim());
    if (filters.hostel && filters.hostel.trim()) {
      // Extract hostel ID if it's an object, otherwise use as-is
      const hostelId = typeof filters.hostel === 'object' ? filters.hostel._id : filters.hostel;
      params.append('hostel', hostelId);
    }
    if (filters.academicYear && filters.academicYear.trim()) params.append('academicYear', filters.academicYear.trim());
    if (filters.category && filters.category.trim()) params.append('category', filters.category.trim());
    // Convert course ID to course name for filtering (after SQL migration, students store course as string name)
    if (filters.course && filters.course.trim()) {
      const selectedCourse = courses.find(c => String(c._id) === String(filters.course) || c._id === filters.course || c.name === filters.course);
      if (selectedCourse) {
        params.append('course', selectedCourse.name); // Send course name, not ID
      } else {
        // If course not found in local state, try sending as-is (might be name already)
        params.append('course', filters.course.trim());
      }
    }
    if (filters.year && filters.year.trim()) params.append('year', parseInt(filters.year.trim()));

    const response = await api.get(`/api/admin/students?${params}`);
    
    if (response.data.success) {
      const studentsData = response.data.data.students || response.data.data || [];
      const totalCount = response.data.data.totalCount || response.data.data.total || studentsData.length;
      setTotalPages(response.data.data.totalPages || 1);
      return { students: studentsData, totalCount };
    }
    return { students: [], totalCount: 0 };
  }, [currentPage, debouncedSearch, filters.hostel, filters.academicYear, filters.category, filters.course, filters.year, courses]);

  // Use React Query for students table - enables parallel fetching with payments
  const { data: studentsTableData, isLoading: studentsTableLoading, refetch: refetchStudentsTable } = useQuery({
    queryKey: ['students-table', currentPage, debouncedSearch, filters.hostel, filters.academicYear, filters.category, filters.course, filters.year],
    queryFn: fetchStudentsForTable,
    staleTime: 30 * 1000, // 30 seconds
    cacheTime: 2 * 60 * 1000, // 2 minutes
    enabled: activeTab === 'dues', // Only fetch when dues tab is active
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  // Update students state when table data changes
  useEffect(() => {
    if (studentsTableData) {
      setStudents(studentsTableData.students);
      setStats(prev => ({ ...prev, totalStudents: studentsTableData.totalCount }));
    }
  }, [studentsTableData]);

  // OPTIMIZED: Set loading to false once initial data is loaded or queries finish
  // This allows the page to render even if some queries are still loading
  useEffect(() => {
    // For dues tab, wait for students table query to finish loading
    if (activeTab === 'dues') {
      // If query is not loading (finished or disabled), we can show the page
      // studentsTableData will be undefined if query is disabled or hasn't run yet
      // But if studentsTableLoading is false, it means the query has finished (success or error)
      if (!studentsTableLoading) {
        setLoading(false);
      }
    } else {
      // For other tabs, set loading to false immediately
      setLoading(false);
    }
  }, [activeTab, studentsTableLoading]);

  // Fallback: Set loading to false after 2 seconds to prevent infinite loading
  // This ensures the page always renders even if queries are slow
  useEffect(() => {
    const timeout = setTimeout(() => {
      setLoading(false);
    }, 2000);
    return () => clearTimeout(timeout);
  }, []);

  // Legacy fetchStudents function for manual refresh
  const fetchStudents = useCallback(async () => {
    try {
      setTableLoading(true);
      const params = new URLSearchParams({
        page: currentPage,
        limit: 20
      });

      if (debouncedSearch && debouncedSearch.trim()) params.append('search', debouncedSearch.trim());
      if (filters.hostel && filters.hostel.trim()) {
        // Extract hostel ID if it's an object, otherwise use as-is
        const hostelId = typeof filters.hostel === 'object' ? filters.hostel._id : filters.hostel;
        params.append('hostel', hostelId);
      }
      if (filters.academicYear && filters.academicYear.trim()) params.append('academicYear', filters.academicYear.trim());
      if (filters.category && filters.category.trim()) params.append('category', filters.category.trim());
      // Convert course ID to course name for filtering (after SQL migration, students store course as string name)
      if (filters.course && filters.course.trim()) {
        const selectedCourse = courses.find(c => String(c._id) === String(filters.course) || c._id === filters.course || c.name === filters.course);
        if (selectedCourse) {
          params.append('course', selectedCourse.name); // Send course name, not ID
        } else {
          // If course not found in local state, try sending as-is (might be name already)
          params.append('course', filters.course.trim());
        }
      }
      if (filters.year && filters.year.trim()) params.append('year', parseInt(filters.year.trim()));

      const response = await api.get(`/api/admin/students?${params}`);

      if (response.data.success) {
        const studentsData = response.data.data.students || response.data.data || [];
        const totalCount = response.data.data.totalCount || response.data.data.total || studentsData.length;
        setStudents(studentsData);
        setTotalPages(response.data.data.totalPages || 1);
        setStats(prev => ({ ...prev, totalStudents: totalCount }));
      } else {
        setError('Failed to fetch students');
      }
    } catch (err) {
      console.error('Error fetching students:', err);
      setError(err.response?.data?.message || 'Failed to fetch students');
    } finally {
      setTableLoading(false);
      setLoading(false);
    }
  }, [currentPage, debouncedSearch, filters.hostel, filters.academicYear, filters.category, filters.course, filters.year, courses]);

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
    // Convert course ID to course name for filtering (after SQL migration, students store course as string name)
    if (filters.course && filters.course.trim()) {
      const selectedCourse = courses.find(c => String(c._id) === String(filters.course) || c._id === filters.course || c.name === filters.course);
      if (selectedCourse) {
        params.append('course', selectedCourse.name); // Send course name, not ID
      } else {
        // If course not found in local state, try sending as-is (might be name already)
        params.append('course', filters.course.trim());
      }
    }
    if (filters.year && filters.year.trim()) params.append('year', parseInt(filters.year.trim()));

    const response = await api.get(`/api/admin/students?${params}`);
    
    if (response.data.success) {
      return response.data.data.students || response.data.data || [];
    }
    return [];
  }, [debouncedSearchForStats, filters.hostel, filters.academicYear, filters.category, filters.course, filters.year, courses]);

  // Use React Query to cache students for stats - OPTIMIZED: Fetch immediately when dues tab is active
  const { data: cachedStudentsForStats, isLoading: studentsStatsLoading, refetch: refetchStudentsForStats } = useQuery({
    queryKey: ['students-for-stats', debouncedSearchForStats, filters.hostel, filters.academicYear, filters.category, filters.course, filters.year],
    queryFn: fetchStudentsForStats,
    staleTime: 1 * 60 * 1000, // 1 minute - stats should be relatively fresh
    cacheTime: 5 * 60 * 1000, // 5 minutes cache
    enabled: activeTab === 'dues', // Only fetch when dues tab is active
    refetchOnMount: false, // Don't refetch if data exists
    refetchOnWindowFocus: false, // Don't refetch on window focus
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

  // REMOVED: fetchHostelFeePayments - This was causing errors because /api/payments/hostel-fee/stats doesn't exist
  // We're now using fetchAllPaymentsForStats which properly fetches all payments via /api/payments/all

  // Fetch all payments for statistics - OPTIMIZED: Single API call instead of N+1
  const fetchAllPaymentsForStats = useCallback(async () => {
    try {
      console.log('🔍 Frontend: Fetching all payments for statistics...');
      
      // Fetch all payments (hostel_fee, electricity, and additional_fee) using the correct endpoint
      const response = await api.get(`/api/payments/all?limit=10000`);
      
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
  
  // Use React Query to cache payments - OPTIMIZED: Fetch immediately on mount
  const { data: cachedPayments, refetch: refetchPayments, isLoading: paymentsLoading } = useQuery({
    queryKey: ['all-payments'],
    queryFn: fetchAllPaymentsForStats,
    staleTime: 2 * 60 * 1000, // 2 minutes
    cacheTime: 5 * 60 * 1000, // 5 minutes
    enabled: true, // Fetch immediately on mount for faster loading
    refetchOnMount: false, // Don't refetch if data exists
    refetchOnWindowFocus: false, // Don't refetch on window focus
  });
  
  // Update payments when cached data changes
  useEffect(() => {
    if (cachedPayments) {
      setPayments(cachedPayments);
    }
  }, [cachedPayments]);

  // Memoize calculateStudentBalance to avoid recalculating for same student
  const calculateStudentBalance = useCallback((student, paymentsOverride = null) => {
    const feeStructure = getFeeStructureForStudent(
      student.course, 
      student.year, 
      student.category, 
      student.academicYear,
      student.hostel, // Pass student's hostel ObjectId
      student.hostelCategory, // Pass student's hostelCategory ObjectId
      student.branch // Pass student's branch for matching
    );
    if (!feeStructure) return null;

    // Use override payments if provided, otherwise use state payments
    const paymentsToUse = paymentsOverride || payments;

    const studentPaymentHistory = paymentsToUse.filter(p => {
      // Handle both string and object IDs
      const paymentStudentId = typeof p.studentId === 'object' ? p.studentId._id || p.studentId : p.studentId;
      const studentId = typeof student._id === 'object' ? student._id._id || student._id : student._id;
      
      // Filter by studentId AND academicYear to ensure only payments from current academic year are included
      const paymentAcademicYear = p.academicYear || (typeof p.studentId === 'object' ? p.studentId?.academicYear : null);
      const studentAcademicYear = student.academicYear;
      
      return paymentStudentId === studentId && paymentAcademicYear === studentAcademicYear;
    });
    const totalPaid = studentPaymentHistory.reduce((sum, payment) => sum + payment.amount, 0);

    // OPTIMIZED: Reduced console logging for better performance (only log in development)
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 Balance calculation for student:', student.name);
    }

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

    // OPTIMIZED: Removed excessive logging

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

    // OPTIMIZED: Removed excessive logging for better performance

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
  // FIXED: Removed setPayments call to prevent infinite loop
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

        // OPTIMIZATION: Use cached payments from React Query
        // Use cachedPayments directly, don't update state to prevent infinite loops
        let paymentsToUse = cachedPayments || payments;
        if (!paymentsToUse || paymentsToUse.length === 0) {
          console.log('🔍 Payments not loaded yet, using empty array for now');
          paymentsToUse = [];
        }
        
        // REMOVED: setPayments call - this was causing infinite loop
        // Payments state is already updated by React Query useEffect
        
        // Update stats with all students data
        const totalStudents = allStudentsData.length;
        
        // Memoize fee structure lookups
        const studentsWithFees = allStudentsData.filter(student => {
          const feeStructure = getFeeStructureForStudent(
            student.course, 
            student.year, 
            student.category, 
            student.academicYear,
            student.hostel,
            student.hostelCategory,
            student.branch
          );
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
      const courseName = getCourseName(student.course);
      if (courseName && courseName !== 'Unknown Course' && student.academicYear && student.year) {
        const key = `${courseName}-${student.academicYear}-${student.year}`;
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
          const feeStructure = getFeeStructureForStudent(
            student.course, 
            student.year, 
            student.category, 
            student.academicYear,
            student.hostel,
            student.hostelCategory,
            student.branch
          );
          if (feeStructure) {
            const originalFee = feeStructure.totalFee;
            const calculatedFee = student.totalCalculatedFee || originalFee;

            totalFeeAmount += originalFee;
            totalCalculatedFeeAmount += calculatedFee;

            // OPTIMIZATION: Use loaded payments for balance calculation
            // Temporarily update payments state for this calculation
            const studentBalance = calculateStudentBalance(student, paymentsToUse);
              
            if (studentBalance) {
          // Get term due dates from cache (already fetched above)
          const courseName = getCourseName(student.course);
          const cacheKey = `${courseName}-${student.academicYear}-${student.year}`;
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
  }, [cachedPayments, payments, getStudentTermDueDates, calculateStudentBalance, getFeeStructureForStudent]);

  // FIXED: Prevent infinite loop by using ref to track calculation and removing duplicate effects
  const isCalculatingStats = useRef(false);
  const lastCalculationKey = useRef('');
  const statsCalculationTimeout = useRef(null);

  // Calculate stats when cached students data and payments are ready - OPTIMIZED: Prevent infinite loops
  useEffect(() => {
    // Clear any pending calculation
    if (statsCalculationTimeout.current) {
      clearTimeout(statsCalculationTimeout.current);
    }

    // Skip if already calculating or if not on dues tab
    if (activeTab !== 'dues' || !cachedStudentsForStats || isCalculatingStats.current) {
      return;
    }

    // Create a unique key for this calculation to prevent duplicate calculations
    const calculationKey = `${cachedStudentsForStats.length}-${cachedPayments?.length || 0}-${filters.hostel}-${filters.academicYear}-${filters.category}-${filters.course}-${filters.year}`;
    
    // Skip if we just calculated with the same data
    if (lastCalculationKey.current === calculationKey) {
      return;
    }

    // Debounce the calculation to prevent rapid recalculations
    statsCalculationTimeout.current = setTimeout(() => {
      // Double-check we're still on dues tab and have data
      if (activeTab !== 'dues' || !cachedStudentsForStats || isCalculatingStats.current) {
        return;
      }

      // Mark as calculating and update key
      isCalculatingStats.current = true;
      lastCalculationKey.current = calculationKey;

      // Calculate stats with available data
      calculateStatsFromStudents(cachedStudentsForStats).finally(() => {
        // Reset calculating flag after calculation completes
        setTimeout(() => {
          isCalculatingStats.current = false;
        }, 500); // Longer delay to prevent rapid recalculations
      });
    }, 300); // 300ms debounce to prevent rapid recalculations

    // Cleanup function
    return () => {
      if (statsCalculationTimeout.current) {
        clearTimeout(statsCalculationTimeout.current);
      }
    };
  }, [cachedStudentsForStats, cachedPayments, activeTab, calculateStatsFromStudents, filters.hostel, filters.academicYear, filters.category, filters.course, filters.year]);





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
    setFilters({ search: '', hostel: '', academicYear: getCurrentAcademicYear(), category: '', course: '', year: '' });
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

  // Fetch hostels on component mount
  const fetchHostels = useCallback(async () => {
    try {
      const response = await api.get('/api/hostels');
      if (response.data.success) {
        setHostels(response.data.data || []);
      }
    } catch (err) {
      console.error('Error fetching hostels:', err);
      toast.error('Failed to load hostels');
    }
  }, []);

  useEffect(() => {
    fetchHostels();
  }, [fetchHostels]);

  // OPTIMIZED: Use React Query to cache fee structures
  // IMPORTANT: Fetch ALL fee structures for the academic year (without course/year filters)
  // This ensures we have all structures available for matching students, regardless of current filters
  const fetchFeeStructures = useCallback(async () => {
    // Build query parameters - academicYear is required by backend
    const queryParams = new URLSearchParams();
    
    // Use current academic year as default if not set
    // IMPORTANT: We fetch ALL fee structures for the academic year, not filtered by course/year
    // This allows proper matching of students to fee structures regardless of current filter selection
    const academicYear = filters.academicYear || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;
    queryParams.append('academicYear', academicYear);
    
    // NOTE: We intentionally do NOT filter by course or year here
    // This ensures all fee structures for the academic year are available for matching
    // The matching logic in getFeeStructureForStudent will handle filtering by course/year/category

    const queryString = queryParams.toString();
    const url = `/api/fee-structures${queryString ? `?${queryString}` : ''}`;
    
    console.log('🔍 Fetching fee structures from:', url);
    const response = await api.get(url);

    if (response.data.success && Array.isArray(response.data.data)) {
      const fetchedStructures = response.data.data;
      console.log('✅ Fee structures fetched:', fetchedStructures.length, 'structures for academic year:', academicYear);
      
      if (fetchedStructures.length > 0) {
        // Log summary of what was fetched
        const coursesByYear = {};
        fetchedStructures.forEach(s => {
          const key = `${s.course} - Year ${s.year}`;
          if (!coursesByYear[key]) {
            coursesByYear[key] = { 
              course: s.course, 
              year: s.year, 
              categories: new Set(),
              count: 0 
            };
          }
          coursesByYear[key].count++;
          if (s.category) coursesByYear[key].categories.add(s.category);
          if (s.categoryId?.name) coursesByYear[key].categories.add(s.categoryId.name);
        });
        
        console.log('📊 Fee structures summary:', Object.values(coursesByYear).map(s => ({
          course: s.course,
          year: s.year,
          categories: Array.from(s.categories),
          structures: s.count
        })));
      } else {
        console.warn('⚠️ No fee structures found for academic year:', academicYear);
      }
      return fetchedStructures;
    } else {
      console.warn('⚠️ Fee structures fetch failed or returned non-array:', response.data);
      return [];
    }
  }, [filters.academicYear, courses]);

  // Use React Query for fee structures
  // NOTE: Query key only includes academicYear, not course/year filters
  // This ensures we fetch all fee structures for the academic year for proper matching
  const { data: cachedFeeStructures, isLoading: feeStructuresQueryLoading, refetch: refetchFeeStructures } = useQuery({
    queryKey: ['fee-structures', filters.academicYear || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`],
    queryFn: fetchFeeStructures,
    staleTime: 3 * 60 * 1000, // 3 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    enabled: activeTab === 'dues', // Only fetch when showing dues (management moved)
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  // Update fee structures when cached data changes
  useEffect(() => {
    if (cachedFeeStructures) {
      setFeeStructures(cachedFeeStructures);
    }
  }, [cachedFeeStructures]);

  // Fetch additional fees when payment modal opens and payment type is additional_fee
  useEffect(() => {
    if (showPaymentModal && selectedStudentForPayment && 
        paymentForm.paymentType === 'additional_fee') {
      // Fetch additional fees for the student's academic year and category
      const fetchAdditionalFeesForPayment = async () => {
        if (selectedStudentForPayment.academicYear) {
          try {
            const response = await api.get(`/api/fee-structures/additional-fees/${selectedStudentForPayment.academicYear}`, {
              params: { category: selectedStudentForPayment.category }
            });
            if (response.data.success) {
              setAdditionalFees(response.data.data || {});
              // Set default additional fee type if not set and available
              if (!paymentForm.additionalFeeType) {
                const availableFees = Object.keys(response.data.data || {}).filter(feeType => {
                  const fee = response.data.data[feeType];
                  return fee.isActive && fee.categories && fee.categories.includes(selectedStudentForPayment.category);
                });
                if (availableFees.length > 0) {
                  setPaymentForm(prev => ({ ...prev, additionalFeeType: availableFees[0] }));
                }
              }
            }
          } catch (err) {
            console.error('Error fetching additional fees for payment:', err);
          }
        }
      };
      fetchAdditionalFeesForPayment();
    }
  }, [showPaymentModal, selectedStudentForPayment, paymentForm.paymentType]);

  // Payment Tracking Functions
  const openPaymentModal = async (student) => {
    setSelectedStudentForPayment(student);
    
    // Ensure fee structures are loaded for the student's academic year
    const studentAcademicYear = student.academicYear || filters.academicYear || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;
    
    // Check if fee structures are loaded for this academic year
    const structuresForYear = feeStructures.filter(s => s.academicYear === studentAcademicYear);
    
    if (!feeStructures || feeStructures.length === 0 || structuresForYear.length === 0) {
      console.log('Fee structures not loaded for academic year:', studentAcademicYear, '- fetching now...');
      try {
        // Fetch fee structures for the student's academic year
        const response = await api.get(`/api/fee-structures?academicYear=${studentAcademicYear}`);
        if (response.data.success && Array.isArray(response.data.data)) {
          const fetchedStructures = response.data.data;
          setFeeStructures(fetchedStructures);
          console.log('✅ Fee structures fetched for payment modal:', fetchedStructures.length);
          
          // If still no structures, show error
          if (fetchedStructures.length === 0) {
            toast.error(`No fee structures found for academic year ${studentAcademicYear}. Please create fee structures first.`);
            return;
          }
        } else {
          toast.error('Failed to load fee structures. Please try again.');
          return;
        }
      } catch (err) {
        console.error('Error fetching fee structures:', err);
        toast.error('Failed to load fee structures. Please try again.');
        return;
      }
    }
    
    // Get fee structure for student
    const feeStructure = getFeeStructureForStudent(
      student.course, 
      student.year, 
      student.category, 
      studentAcademicYear,
      student.hostel,
      student.hostelCategory,
      student.branch
    );

    if (!feeStructure) {
      // Provide detailed error message
      const errorDetails = {
        course: getCourseName(student.course),
        branch: getBranchName(student.branch),
        year: student.year,
        category: student.category,
        academicYear: studentAcademicYear,
        hostel: student.hostel ? (typeof student.hostel === 'object' ? student.hostel.name : student.hostel) : 'N/A',
        hostelCategory: student.hostelCategory ? (typeof student.hostelCategory === 'object' ? student.hostelCategory.name : student.hostelCategory) : 'N/A',
        availableStructures: feeStructures.length,
        availableCourses: [...new Set(feeStructures.map(s => getCourseName(s.course)))],
        availableYears: [...new Set(feeStructures.map(s => s.academicYear))]
      };
      
      console.error('No fee structure found for student:', errorDetails);
      toast.error(`No fee structure found for this student. Course: ${errorDetails.course}, Year: ${errorDetails.year}, Category: ${errorDetails.category}, Academic Year: ${errorDetails.academicYear}. Please create a fee structure first.`);
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
      notes: '',
      utrNumber: '',
      additionalFeeType: ''
    });

    // Fetch additional fees for the student's academic year and category
    if (student.academicYear) {
      try {
        const response = await api.get(`/api/fee-structures/additional-fees/${student.academicYear}`, {
          params: { category: student.category }
        });
        if (response.data.success) {
          setAdditionalFees(response.data.data || {});
          // Set default additional fee type if available
          const availableFees = Object.keys(response.data.data || {}).filter(feeType => {
            const fee = response.data.data[feeType];
            return fee.isActive && fee.categories && fee.categories.includes(student.category);
          });
          if (availableFees.length > 0) {
            setPaymentForm(prev => ({ ...prev, additionalFeeType: availableFees[0] }));
          }
        }
      } catch (err) {
        console.error('Error fetching additional fees:', err);
        setAdditionalFees({});
      }
    }

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
      notes: '',
      utrNumber: '',
      additionalFeeType: ''
    });
    setStudentElectricityBills([]);
    setAvailableMonths([]);
    setSelectedMonth('');
    setSelectedElectricityBill(null);
  };

  // Fetch all pending electricity bills for a student (for balance modal)
  const fetchPendingElectricityBills = async (student) => {
    try {
      setPendingBillsLoading(true);

      // OPTIMIZED: If student has room reference, use it directly instead of fetching all rooms
      let studentRoom = null;
      
      if (student.room && typeof student.room === 'object' && student.room._id) {
        // Student already has room populated - use it directly
        studentRoom = student.room;
      } else if (student.roomNumber && student.gender && student.category) {
        // Fallback: Find student's room by querying with specific filters (more efficient than fetching all)
        try {
          const roomsResponse = await api.get(`/api/rooms?roomNumber=${student.roomNumber}&gender=${student.gender}&category=${student.category}`);
          if (roomsResponse.data.success) {
            const rooms = roomsResponse.data.data.rooms || roomsResponse.data.data || [];
            studentRoom = rooms.find(room =>
              room.roomNumber === student.roomNumber &&
              room.gender === student.gender &&
              room.category === student.category
            );
          }
        } catch (err) {
          console.error('Error fetching student room:', err);
        }
      }

      if (!studentRoom || !studentRoom._id) {
        console.log('No room found for student:', student);
        setPendingElectricityBills([]);
        setPendingBillsLoading(false);
        return;
      }

      // OPTIMIZED: Fetch bills and student count in parallel
      const [billsResponse, studentsResponse] = await Promise.all([
        api.get(`/api/rooms/${studentRoom._id}/electricity-bill`),
        api.get(`/api/admin/rooms/${studentRoom._id}/students`).catch(() => ({ data: { success: false, data: { students: [] } } }))
      ]);

      if (!billsResponse.data.success) {
        throw new Error('Failed to fetch electricity bills');
      }

      const allBills = billsResponse.data.data || [];
      const studentsInRoom = studentsResponse.data.success 
        ? (studentsResponse.data.data.students || []).length 
        : 0;

      // Process all bills and get pending ones for this student
      const pendingBills = allBills
        .filter(bill => {
          // Check if bill has studentBills array (new format)
          if (bill.studentBills && bill.studentBills.length > 0) {
            const studentBill = bill.studentBills.find(sb => 
              (typeof sb.studentId === 'object' ? sb.studentId._id : sb.studentId) === student._id ||
              String(sb.studentId) === String(student._id)
            );
            return studentBill && studentBill.paymentStatus === 'unpaid';
          } else {
            // Old format - check if room bill is unpaid and student is in room
            if (bill.paymentStatus !== 'unpaid') return false;
            
            // Check if student has already paid for this bill
            // We'll need to check Payment records, but for now, include if bill is unpaid
            return true;
          }
        })
        .map(bill => {
          let studentBill = null;
          let studentAmount = 0;
          let paymentStatus = 'unpaid';

          if (bill.studentBills && bill.studentBills.length > 0) {
            // New format
            studentBill = bill.studentBills.find(sb => 
              (typeof sb.studentId === 'object' ? sb.studentId._id : sb.studentId) === student._id ||
              String(sb.studentId) === String(student._id)
            );
            if (studentBill) {
              studentAmount = studentBill.amount;
              paymentStatus = studentBill.paymentStatus;
            }
          } else {
            // Old format - calculate equal share
            studentAmount = studentsInRoom > 0 ? Math.round(bill.total / studentsInRoom) : 0;
            paymentStatus = bill.paymentStatus || 'unpaid';
          }

          return {
            _id: bill._id,
            month: bill.month,
            amount: studentAmount,
            totalBill: bill.total,
            consumption: bill.consumption || 0,
            rate: bill.rate || 0,
            roomId: studentRoom._id,
            roomNumber: studentRoom.roomNumber,
            paymentStatus: paymentStatus,
            startUnits: bill.startUnits || bill.meter1StartUnits || 0,
            endUnits: bill.endUnits || bill.meter1EndUnits || 0,
            isOldFormat: !bill.studentBills || bill.studentBills.length === 0
          };
        })
        .sort((a, b) => new Date(b.month) - new Date(a.month)); // Sort by month descending

      setPendingElectricityBills(pendingBills);
      console.log('🔍 Pending electricity bills for student:', pendingBills);

    } catch (error) {
      console.error('Error fetching pending electricity bills:', error);
      setPendingElectricityBills([]);
    } finally {
      setPendingBillsLoading(false);
    }
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

    if (paymentForm.paymentType === 'additional_fee') {
      if (!paymentForm.additionalFeeType) {
        errors.push('Please select an additional fee type');
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
      } else if (paymentForm.paymentType === 'additional_fee') {
        // Additional fee payment (caution deposit, diesel charges, etc.)
        paymentData = {
          studentId: selectedStudentForPayment._id,
          amount: parseFloat(paymentForm.amount),
          paymentMethod: paymentForm.paymentMethod,
          notes: paymentForm.notes,
          academicYear: selectedStudentForPayment.academicYear,
          utrNumber: paymentForm.utrNumber,
          additionalFeeType: paymentForm.additionalFeeType
        };
        endpoint = '/api/payments/additional-fee';
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

      // Refresh students and payments to update balance display
      refetchStudentsTable();
      refetchPayments();
      if (activeTab === 'dues') {
        refetchStudentsForStats();
      }

    } catch (error) {
      console.error('Error recording payment:', error);
      // Show actual error message from backend
      const errorMessage = error.response?.data?.message || error.message || 'Failed to record payment';
      toast.error(errorMessage);
      console.error('Full error details:', {
        message: errorMessage,
        response: error.response?.data,
        status: error.response?.status
      });
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
    setPendingElectricityBills([]); // Reset pending bills
    // Reset expanded sections
    setExpandedSections({
      termBreakdown: true,
      additionalFees: false,
      electricityBills: false
    });

    try {
      // Get student's fee structure (synchronous, fast)
      const feeStructure = getFeeStructureForStudent(
        student.course, 
        student.year, 
        student.category, 
        student.academicYear,
        student.hostel,
        student.hostelCategory,
        student.branch
      );

      if (!feeStructure) {
        toast.error('No fee structure found for this student');
        setBalanceLoading(false);
        return;
      }

      // OPTIMIZED: Make all API calls in parallel instead of sequentially
      const [paymentsResponse, additionalFeesResponse] = await Promise.all([
        // Fetch student's payments with academic year filter in query (backend filtering is faster)
        api.get(`/api/payments/all?studentId=${student._id}&academicYear=${student.academicYear || ''}&limit=1000`),
        // Fetch additional fees
        api.get(`/api/fee-structures/additional-fees/${student.academicYear}`).catch(err => {
          console.error('Error fetching additional fees:', err);
          return { data: { success: false, data: {} } };
        })
      ]);

      // Process payments response
      if (paymentsResponse.data.success) {
        const studentPaymentHistory = paymentsResponse.data.data.payments || [];
        setStudentPayments(studentPaymentHistory);

        // Update local payments array with fetched payments (non-blocking)
        setPayments(prev => {
          const existingPayments = prev.filter(p => {
            const paymentStudentId = typeof p.studentId === 'object' ? p.studentId._id || p.studentId : p.studentId;
            const studentId = typeof student._id === 'object' ? student._id._id || student._id : student._id;
            return paymentStudentId !== studentId;
          });
          return [...existingPayments, ...studentPaymentHistory];
        });
      } else {
        setStudentPayments([]);
      }

      // Process additional fees response
      if (additionalFeesResponse.data.success) {
        const allAdditionalFees = additionalFeesResponse.data.data || {};
        // Filter fees that apply to the student's category
        const applicableFees = {};
        Object.entries(allAdditionalFees).forEach(([feeType, feeData]) => {
          if (feeData.isActive && feeData.categories && feeData.categories.includes(student.category)) {
            applicableFees[feeType] = feeData;
          }
        });
        setStudentAdditionalFees(applicableFees);
      } else {
        setStudentAdditionalFees({});
      }

      // Fetch pending electricity bills in background (non-blocking, can load after modal opens)
      fetchPendingElectricityBills(student).catch(err => {
        console.error('Error fetching pending electricity bills:', err);
        setPendingElectricityBills([]);
      });

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

  // REMOVED: useEffect for fetchHostelFeePayments - This was causing errors
  // Payments are now fetched via React Query (fetchAllPaymentsForStats) which is more efficient

  // Check email service status on component mount
  useEffect(() => {
    checkEmailServiceStatus();
  }, []);

  // Debounce search input for reminders
  const debouncedReminderSearchValue = useDebounce(reminderFilters.search, 300);
  
  useEffect(() => {
    setDebouncedReminderSearch(debouncedReminderSearchValue);
  }, [debouncedReminderSearchValue]);

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
            const courseName = getCourseName(s.course);
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
            const courseName = getCourseName(s.course);
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
          refetchStudentsTable();
          refetchStudentsForStats();
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
          refetchStudentsTable();
          refetchStudentsForStats();
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
    if (activeTab === 'concessions' && canManageConcessions) {
      // Fetch both pending and approved to show counts immediately
      fetchConcessionApprovals();
      fetchApprovedConcessions();
    }
  }, [activeTab, user?.role]);

  // Re-apply filters when filter values change (data is already loaded)
  useEffect(() => {
    if (activeTab === 'concessions' && canManageConcessions) {
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
                        <span className="font-medium">{getCourseName(student.course)} - Year {student.year}</span>
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
                                  {getCourseName(student.course)}
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
        {/* Header with Tabs */}
        <div className="mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-blue-900 mb-1 sm:mb-2">
                Hostel Fee Management
              </h1>
              <p className="text-sm sm:text-base text-gray-600">
                Manage student fee payments and track payment status
              </p>
            </div>
            
            {/* Tab Navigation in Header */}
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
                {canManageConcessions && (
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
                value={filters.hostel}
                onChange={(e) => handleFilterChange('hostel', e.target.value)}
                className="px-2 sm:px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value="">All Hostels</option>
                {hostels.map(hostel => (
                  <option key={hostel._id} value={hostel._id}>{hostel.name}</option>
                ))}
              </select>

              <select
                value={filters.academicYear}
                onChange={(e) => handleFilterChange('academicYear', e.target.value)}
                className="px-2 sm:px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
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

              <div className="flex gap-2 col-span-2 sm:col-span-1">
                <button
                  onClick={clearFilters}
                  className="flex-1 sm:flex-none px-3 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center justify-center gap-1 text-sm"
                >
                  <FunnelIcon className="w-4 h-4" />
                  <span className="hidden sm:inline">Clear</span>
                </button>

                <button
                  onClick={() => {
                    refetchStudentsTable();
                    refetchPayments();
                    refetchStudentsForStats();
                  }}
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

            {(tableLoading || studentsTableLoading) ? (
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
                                {student.hostel.name && ` • ${student.hostel.name}`}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <div>
                              <div className="font-medium">
                                {getCourseName(student.course)}
                              </div>
                              <div className="text-xs text-gray-500">
                                {getBranchName(student.branch)}
                              </div>
                              <div className="text-xs text-gray-500">
                                Year {student.year || 'Unknown'}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {(() => {
                              if (student.category) {
                                const feeStructure = getFeeStructureForStudent(
                                  student.course, 
                                  student.year, 
                                  student.category, 
                                  student.academicYear,
                                  student.hostel,
                                  student.hostelCategory,
                                  student.branch
                                );
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
                                student.academicYear,
                                student.hostel,
                                student.hostelCategory,
                                student.branch
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
                                  <div className="text-gray-400">Course: {getCourseName(student.course)}</div>
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

                      {/* Course, Branch & Year */}
                      <div className="mb-3">
                        <div className="text-xs text-gray-500 mb-1">Course / Branch / Year</div>
                        <div className="text-sm font-medium text-gray-900">
                          {getCourseName(student.course)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {getBranchName(student.branch)}
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
                              const feeStructure = getFeeStructureForStudent(
                                student.course, 
                                student.year, 
                                student.category, 
                                student.academicYear,
                                student.hostel,
                                student.hostelCategory,
                                student.branch
                              );
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
                              student.academicYear,
                              student.hostel,
                              student.hostelCategory,
                              student.branch
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
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                payment.paymentType === 'electricity'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : payment.paymentType === 'additional_fee'
                                  ? 'bg-purple-100 text-purple-800'
                                  : 'bg-blue-100 text-blue-800'
                                }`}>
                                {payment.paymentType === 'electricity' 
                                  ? '⚡ Electricity' 
                                  : payment.paymentType === 'additional_fee'
                                  ? '💰 Additional Fee'
                                  : '🏠 Hostel Fee'}
                              </span>
                            </div>
                            <div className="text-sm font-medium text-gray-900 mt-1">
                              {payment.paymentType === 'electricity'
                                ? `Bill Month: ${payment.billMonth || 'N/A'}`
                                : payment.paymentType === 'additional_fee'
                                ? `Fee Type: ${payment.additionalFeeType ? payment.additionalFeeType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'N/A'}`
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
      {activeTab === 'concessions' && canManageConcessions && renderConcessionApprovals()}

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

      {/* Student Balance Modal */}
      {showBalanceModal && selectedStudentBalance && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-blue-900">
                Student Balance Details
              </h3>
              <button
                onClick={() => {
                  setShowBalanceModal(false);
                  setSelectedStudentBalance(null);
                  setPendingElectricityBills([]); // Reset pending bills
                  setStudentAdditionalFees({}); // Reset additional fees
                }}
                className="p-1 text-gray-400 hover:text-gray-600"
                aria-label="Close modal"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {balanceLoading ? (
              <div className="text-center py-8">
                <LoadingSpinner />
                <p className="mt-2 text-gray-500">Loading balance details...</p>
              </div>
            ) : (
              <>
                {/* Student Info and Balance Summary in Same Row */}
                {(() => {
                  const balance = calculateStudentBalance(selectedStudentBalance);
                  if (!balance) return null;

                  return (
                    <div className="mb-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Student Information */}
                      <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                        <h4 className="font-semibold text-blue-900 mb-3">Student Information</h4>
                        <div className="grid grid-cols-2 gap-4 text-sm text-blue-800">
                          <div>
                            <p className="text-gray-600 mb-1">Name</p>
                            <p className="font-medium">{selectedStudentBalance.name}</p>
                          </div>
                          <div>
                            <p className="text-gray-600 mb-1">Roll Number</p>
                            <p className="font-medium">{selectedStudentBalance.rollNumber}</p>
                          </div>
                          <div>
                            <p className="text-gray-600 mb-1">Category</p>
                            <p className="font-medium">{selectedStudentBalance.category}</p>
                          </div>
                          <div>
                            <p className="text-gray-600 mb-1">Academic Year</p>
                            <p className="font-medium">{selectedStudentBalance.academicYear}</p>
                          </div>
                        </div>
                      </div>

                      {/* Balance Summary */}
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-4 text-lg">Balance Summary</h4>

                      {/* Concession Information */}
                      {balance.hasConcession && balance.concessionAmount > 0 && (
                          <div className="mb-4 p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                            <h5 className="font-semibold text-green-900 mb-2 text-sm">Concession Applied</h5>
                            <div className="grid grid-cols-3 gap-2">
                              <div className="bg-white rounded-lg p-2 text-center border border-green-100">
                                <span className="text-xs text-gray-600 block mb-1">Original</span>
                                <div className="text-sm font-bold text-gray-900 line-through">₹{Number(balance.originalTotalFee || 0).toLocaleString()}</div>
                            </div>
                              <div className="bg-white rounded-lg p-2 text-center border border-green-100">
                                <span className="text-xs text-gray-600 block mb-1">Concession</span>
                                <div className="text-sm font-bold text-green-600">₹{Number(balance.concessionAmount || 0).toLocaleString()}</div>
                            </div>
                              <div className="bg-white rounded-lg p-2 text-center border border-green-100">
                                <span className="text-xs text-gray-600 block mb-1">Final</span>
                                <div className="text-sm font-bold text-blue-600">₹{Number(balance.calculatedTotalFee || 0).toLocaleString()}</div>
                            </div>
                          </div>
                        </div>
                      )}

                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-3 border border-blue-200 shadow-sm">
                            <div className="text-xs font-medium text-gray-600 mb-1">
                              {balance.hasConcession ? 'Final Fee' : 'Total Fee'}
                          </div>
                          <div className="text-lg font-bold text-gray-900">
                            {(() => {
                              const totalFee = balance.hasConcession 
                                ? (Number(balance.calculatedTotalFee) || 0) 
                                : (Number(balance.feeStructure?.totalFee) || 0);
                              return `₹${totalFee.toLocaleString()}`;
                            })()}
                          </div>
                          {balance.hasConcession && balance.originalTotalFee && (
                              <div className="text-xs text-gray-500 line-through mt-1">
                                ₹{Number(balance.originalTotalFee || 0).toLocaleString()}
                            </div>
                          )}
                        </div>
                          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-3 border border-green-200 shadow-sm">
                            <div className="text-xs font-medium text-gray-600 mb-1">Total Paid</div>
                          <div className="text-lg font-bold text-green-600">
                            ₹{Number(balance.totalPaid || 0).toLocaleString()}
                          </div>
                        </div>
                          <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-3 border border-red-200 shadow-sm">
                            <div className="text-xs font-medium text-gray-600 mb-1">Total Balance</div>
                          <div className={`text-lg font-bold ${Number(balance.totalBalance || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            ₹{Number(balance.totalBalance || 0).toLocaleString()}
                          </div>
                        </div>
                          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-3 border border-purple-200 shadow-sm">
                            <div className="text-xs font-medium text-gray-600 mb-1">Status</div>
                          <div className={`text-lg font-bold ${balance.isFullyPaid ? 'text-green-600' : 'text-orange-600'}`}>
                              {balance.isFullyPaid ? 'Fully Paid' : 'Pending'}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}


                {/* Term-wise Breakdown - Expandable */}
                {(() => {
                  const balance = calculateStudentBalance(selectedStudentBalance);
                  if (!balance) return null;

                  // Calculate term stats
                  const totalTermBalance = Object.values(balance.termBalances).reduce((sum, term) => sum + term.balance, 0);
                  const totalTermPaid = Object.values(balance.termBalances).reduce((sum, term) => sum + term.paid, 0);
                  const totalTermRequired = Object.values(balance.termBalances).reduce((sum, term) => sum + term.required, 0);
                  const paidTerms = Object.values(balance.termBalances).filter(term => term.balance === 0).length;

                  return (
                    <div className="mb-4 border border-gray-200 rounded-lg overflow-hidden">
                      {/* Header with Stats */}
                      <button
                        onClick={() => setExpandedSections(prev => ({ ...prev, termBreakdown: !prev.termBreakdown }))}
                        className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <h4 className="font-semibold text-gray-900 text-lg">Term-wise Breakdown</h4>
                          <div className="flex items-center gap-4 text-sm">
                            <div className="flex items-center gap-1">
                              <span className="text-gray-600">Total Balance:</span>
                              <span className={`font-bold ${totalTermBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                ₹{totalTermBalance.toLocaleString()}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-gray-600">Paid Terms:</span>
                              <span className="font-bold text-green-600">{paidTerms}/3</span>
                            </div>
                            {balance.totalLateFee > 0 && (
                              <div className="flex items-center gap-1">
                                <span className="text-orange-600">Late Fee:</span>
                                <span className="font-bold text-orange-600">₹{balance.totalLateFee.toLocaleString()}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        {expandedSections.termBreakdown ? (
                          <ChevronUpIcon className="w-5 h-5 text-gray-600" />
                        ) : (
                          <ChevronDownIcon className="w-5 h-5 text-gray-600" />
                        )}
                      </button>

                      {/* Expanded Content */}
                      {expandedSections.termBreakdown && (
                        <div className="p-4 bg-white">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        {Object.entries(balance.termBalances).map(([term, termData]) => {
                          const originalTermFee = balance.feeStructure[term === 'term1' ? 'term1Fee' : term === 'term2' ? 'term2Fee' : 'term3Fee'] ||
                            Math.round(balance.feeStructure.totalFee * (term === 'term1' ? 0.4 : 0.3));
                          const termLateFee = balance.lateFees?.[term] || 0;

                          return (
                                <div key={term} className="bg-gradient-to-br from-gray-50 to-white rounded-lg p-4 border border-gray-200 shadow-sm">
                                  <div className="text-base font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">
                                {term.replace('term', 'Term ')}
                              </div>
                                  <div className="space-y-3 text-sm">
                                    <div className="flex justify-between items-center">
                                      <span className="text-gray-600">Required:</span>
                                      <span className="font-semibold text-gray-900">₹{termData.required.toLocaleString()}</span>
                                </div>
                                    <div className="flex justify-between items-center">
                                      <span className="text-gray-600">Paid:</span>
                                      <span className="font-semibold text-green-600">₹{termData.paid.toLocaleString()}</span>
                                </div>
                                    <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                                      <span className="text-gray-600 font-medium">Balance:</span>
                                      <span className={`font-bold text-lg ${termData.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                    ₹{termData.balance.toLocaleString()}
                                  </span>
                                </div>
                                {termLateFee > 0 && (
                                      <div className="flex justify-between items-center pt-2 mt-2 border-t-2 border-orange-200 bg-orange-50 rounded p-2">
                                        <span className="text-orange-700 font-medium">Late Fee:</span>
                                        <span className="font-bold text-orange-700">₹{termLateFee.toLocaleString()}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                          </div>
                        {balance.totalLateFee > 0 && (
                            <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg p-4 border-2 border-orange-200">
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-base font-semibold text-orange-800">Total Late Fee:</span>
                                <span className="text-xl font-bold text-orange-700">₹{balance.totalLateFee.toLocaleString()}</span>
                            </div>
                              <p className="text-xs text-orange-600">Late fees are separate from fee balance and must be paid in addition to outstanding fees.</p>
                          </div>
                        )}
                      </div>
                      )}
                    </div>
                  );
                })()}

                {/* Additional Fees - Expandable */}
                {(() => {
                  // Get configured additional fees for the student
                  const configuredFees = studentAdditionalFees || {};
                  const configuredFeeTypes = Object.keys(configuredFees);
                  
                  // Calculate additional fees stats from payments
                  const additionalFeePayments = studentPayments.filter(p => p.paymentType === 'additional_fee' && p.status === 'success');
                  const totalAdditionalFeesPaid = additionalFeePayments.reduce((sum, p) => sum + p.amount, 0);
                  
                  // Calculate total due and paid for each configured fee
                  const feesWithStatus = configuredFeeTypes.map(feeType => {
                    const feeConfig = configuredFees[feeType];
                    const feePayments = additionalFeePayments.filter(p => p.additionalFeeType === feeType);
                    const totalPaid = feePayments.reduce((sum, p) => sum + p.amount, 0);
                    
                    // Get required amount - use categoryAmounts if available, otherwise use amount
                    let required = 0;
                    if (feeConfig.categoryAmounts && typeof feeConfig.categoryAmounts === 'object') {
                      // Use category-specific amount for the student's category
                      required = feeConfig.categoryAmounts[selectedStudentBalance.category] || 0;
                    } else {
                      // Fallback to single amount
                      required = feeConfig.amount || 0;
                    }
                    
                    const balance = Math.max(0, required - totalPaid);
                    const isPaid = balance === 0 && totalPaid > 0;
                    
                    return {
                      feeType,
                      feeConfig,
                      required,
                      totalPaid,
                      balance,
                      isPaid,
                      payments: feePayments
                    };
                  });
                  
                  // Calculate totals
                  const totalRequired = feesWithStatus.reduce((sum, f) => sum + f.required, 0);
                  const totalDue = feesWithStatus.reduce((sum, f) => sum + f.balance, 0);
                  const paidFees = feesWithStatus.filter(f => f.isPaid).length;
                  
                  // Also include fees that were paid but not configured (for backward compatibility)
                  const paidButNotConfigured = additionalFeePayments.filter(p => 
                    !configuredFeeTypes.includes(p.additionalFeeType)
                  );
                  
                  // Group unconfigured payments by type
                  const unconfiguredFeesByType = paidButNotConfigured.reduce((acc, payment) => {
                    const type = payment.additionalFeeType || 'Unknown';
                    if (!acc[type]) {
                      acc[type] = { total: 0, count: 0, payments: [] };
                    }
                    acc[type].total += payment.amount;
                    acc[type].count += 1;
                    acc[type].payments.push(payment);
                    return acc;
                  }, {});

                  return (
                    <div className="mb-4 border border-gray-200 rounded-lg overflow-hidden">
                      {/* Header with Stats */}
                      <button
                        onClick={() => setExpandedSections(prev => ({ ...prev, additionalFees: !prev.additionalFees }))}
                        className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <h4 className="font-semibold text-gray-900 text-lg flex items-center">
                            <span className="mr-2">💰</span>
                            Additional Fees
                          </h4>
                          <div className="flex items-center gap-4 text-sm">
                            {configuredFeeTypes.length > 0 ? (
                              <>
                                <div className="flex items-center gap-1">
                                  <span className="text-gray-600">Total Due:</span>
                                  <span className={`font-bold ${totalDue > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                    ₹{totalDue.toLocaleString()}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className="text-gray-600">Paid:</span>
                                  <span className="font-bold text-green-600">{paidFees}/{configuredFeeTypes.length}</span>
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="flex items-center gap-1">
                                  <span className="text-gray-600">Total Paid:</span>
                                  <span className="font-bold text-green-600">₹{totalAdditionalFeesPaid.toLocaleString()}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className="text-gray-600">Transactions:</span>
                                  <span className="font-bold text-gray-700">{additionalFeePayments.length}</span>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                        {expandedSections.additionalFees ? (
                          <ChevronUpIcon className="w-5 h-5 text-gray-600" />
                        ) : (
                          <ChevronDownIcon className="w-5 h-5 text-gray-600" />
                        )}
                      </button>

                      {/* Expanded Content */}
                      {expandedSections.additionalFees && (
                        <div className="p-4 bg-white">
                          {configuredFeeTypes.length === 0 && additionalFeePayments.length === 0 ? (
                            <div className="text-center py-6 text-gray-500">
                              <p className="text-sm">No additional fees configured or payments recorded</p>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              {/* Configured Fees */}
                              {feesWithStatus.length > 0 && (
                                <>
                                  {feesWithStatus.map(({ feeType, feeConfig, required, totalPaid, balance, isPaid, payments }) => (
                                    <div key={feeType} className={`rounded-lg p-4 border-2 ${
                                      isPaid 
                                        ? 'bg-green-50 border-green-200' 
                                        : balance > 0 
                                        ? 'bg-red-50 border-red-200' 
                                        : 'bg-gray-50 border-gray-200'
                                    }`}>
                                      <div className="flex items-center justify-between mb-3">
                                        <div className="flex-1">
                                          <h5 className="font-semibold text-gray-900 mb-1">
                                            {feeType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                          </h5>
                                          {feeConfig.description && (
                                            <p className="text-xs text-gray-600">{feeConfig.description}</p>
                                          )}
                                        </div>
                                        <div className="text-right ml-4">
                                          {isPaid ? (
                                            <div className="flex items-center gap-2">
                                              <CheckCircleIcon className="w-5 h-5 text-green-600" />
                                              <div>
                                                <div className="text-sm font-bold text-green-600">Paid</div>
                                                <div className="text-xs text-gray-500">₹{totalPaid.toLocaleString()}</div>
                                              </div>
                                            </div>
                                          ) : (
                                            <div>
                                              <div className="text-sm text-gray-600">Required: ₹{required.toLocaleString()}</div>
                                              {totalPaid > 0 && (
                                                <div className="text-sm text-green-600">Paid: ₹{totalPaid.toLocaleString()}</div>
                                              )}
                                              <div className={`text-lg font-bold ${balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                Balance: ₹{balance.toLocaleString()}
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                      
                                      {/* Payment History for this fee */}
                                      {payments.length > 0 && (
                                        <div className="mt-3 pt-3 border-t border-gray-200">
                                          <div className="text-xs font-medium text-gray-600 mb-2">Payment History:</div>
                                          <div className="space-y-1">
                                            {payments.map((payment) => (
                                              <div key={payment._id} className="flex items-center justify-between bg-white p-2 rounded border border-gray-100 text-xs">
                                                <div className="flex items-center gap-2">
                                                  <span className="text-gray-600">
                                                    {new Date(payment.paymentDate).toLocaleDateString()}
                                                  </span>
                                                  <span className="text-gray-500">{payment.paymentMethod}</span>
                                                  {payment.transactionId && (
                                                    <span className="text-gray-400 font-mono text-xs">{payment.transactionId}</span>
                                                  )}
                                                </div>
                                                <div className="font-semibold text-green-600">₹{payment.amount.toLocaleString()}</div>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </>
                              )}
                              
                              {/* Unconfigured Fees (for backward compatibility) */}
                              {Object.keys(unconfiguredFeesByType).length > 0 && (
                                <div className="mt-4 pt-4 border-t-2 border-gray-300">
                                  <h5 className="font-semibold text-gray-700 mb-3 text-sm">Other Fee Payments (Not Configured)</h5>
                                  <div className="space-y-3">
                                    {Object.entries(unconfiguredFeesByType).map(([feeType, data]) => (
                                      <div key={feeType} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                                        <div className="flex items-center justify-between mb-2">
                                          <h6 className="font-medium text-gray-900 text-sm">
                                            {feeType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                          </h6>
                                          <div className="text-right">
                                            <div className="text-sm font-bold text-green-600">₹{data.total.toLocaleString()}</div>
                                            <div className="text-xs text-gray-500">{data.count} payment{data.count !== 1 ? 's' : ''}</div>
                                          </div>
                                        </div>
                                        <div className="space-y-1">
                                          {data.payments.map((payment) => (
                                            <div key={payment._id} className="flex items-center justify-between bg-white p-1.5 rounded border border-gray-100 text-xs">
                                              <div className="flex items-center gap-2">
                                                <span className="text-gray-600">
                                                  {new Date(payment.paymentDate).toLocaleDateString()}
                                                </span>
                                                <span className="text-gray-500">{payment.paymentMethod}</span>
                                              </div>
                                              <div className="font-semibold text-green-600">₹{payment.amount.toLocaleString()}</div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Pending Electricity Bills - Expandable */}
                <div className="mb-4 border border-gray-200 rounded-lg overflow-hidden">
                  {/* Header with Stats */}
                  <button
                    onClick={() => setExpandedSections(prev => ({ ...prev, electricityBills: !prev.electricityBills }))}
                    className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-yellow-50 to-orange-50 hover:from-yellow-100 hover:to-orange-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <h4 className="font-semibold text-gray-900 text-lg flex items-center">
                    <svg className="w-5 h-5 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                        Electricity Bills
                  </h4>
                  {pendingBillsLoading ? (
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <LoadingSpinner size="sm" />
                          <span>Loading...</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-1">
                            <span className="text-gray-600">Pending Bills:</span>
                            <span className={`font-bold ${pendingElectricityBills.length > 0 ? 'text-red-600' : 'text-green-600'}`}>
                              {pendingElectricityBills.length}
                            </span>
                          </div>
                          {pendingElectricityBills.length > 0 && (
                            <div className="flex items-center gap-1">
                              <span className="text-gray-600">Total Pending:</span>
                              <span className="font-bold text-red-600">
                                ₹{pendingElectricityBills.reduce((sum, bill) => sum + bill.amount, 0).toLocaleString()}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    {expandedSections.electricityBills ? (
                      <ChevronUpIcon className="w-5 h-5 text-gray-600" />
                    ) : (
                      <ChevronDownIcon className="w-5 h-5 text-gray-600" />
                    )}
                  </button>

                  {/* Expanded Content */}
                  {expandedSections.electricityBills && (
                    <div className="p-4 bg-white">
                      {pendingBillsLoading ? (
                        <div className="text-center py-6">
                      <LoadingSpinner />
                      <p className="mt-2 text-sm text-gray-500">Loading electricity bills...</p>
                    </div>
                  ) : pendingElectricityBills.length === 0 ? (
                        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
                      <div className="flex items-center justify-center text-green-700">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-sm font-medium">All electricity bills are paid</span>
                      </div>
                    </div>
                  ) : (
                      <div className="space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {pendingElectricityBills.map((bill) => (
                              <div key={bill._id} className="bg-gray-50 p-4 rounded-lg border border-gray-200 hover:border-yellow-400 hover:shadow-md transition-all">
                                <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                      <span className="text-sm font-semibold text-gray-900">
                                    {(() => {
                                      const [year, month] = bill.month.split('-');
                                      const date = new Date(parseInt(year), parseInt(month) - 1, 1);
                                      return date.toLocaleDateString('en-US', { 
                                        month: 'long', 
                                        year: 'numeric' 
                                      });
                                    })()}
                                  </span>
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                                    Unpaid
                                  </span>
                                </div>
                                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                                  <div>
                                    <span className="text-gray-500">Room:</span>
                                        <span className="ml-1 font-medium">{bill.roomNumber}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Consumption:</span>
                                        <span className="ml-1 font-medium">{bill.consumption} units</span>
                                  </div>
                                      <div className="col-span-2">
                                    <span className="text-gray-500">Total Bill:</span>
                                        <span className="ml-1 font-medium">₹{bill.totalBill.toLocaleString()}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="ml-4 text-right">
                                    <div className="text-xl font-bold text-red-600">
                                  ₹{bill.amount.toLocaleString()}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">Student Share</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                          <div className="pt-3 border-t-2 border-gray-300">
                        <div className="flex justify-between items-center">
                              <span className="text-base font-semibold text-gray-700">Total Pending:</span>
                              <span className="text-xl font-bold text-red-600">
                            ₹{pendingElectricityBills.reduce((sum, bill) => sum + bill.amount, 0).toLocaleString()}
                          </span>
                        </div>
                      </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Payment History */}
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-900 mb-4 text-lg">Payment History</h4>
                  {studentPayments.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-gray-200">
                      <ReceiptRefundIcon className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm">No payments recorded yet</p>
                    </div>
                  ) : (
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {studentPayments.map((payment) => (
                          <div key={payment._id} className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                  payment.paymentType === 'electricity'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : payment.paymentType === 'additional_fee'
                                    ? 'bg-purple-100 text-purple-800'
                                    : 'bg-blue-100 text-blue-800'
                                }`}>
                                  {payment.paymentType === 'electricity' 
                                    ? '⚡ Electricity' 
                                    : payment.paymentType === 'additional_fee'
                                    ? '💰 Additional Fee'
                                    : '🏠 Hostel Fee'}
                                </span>
                                <span className="font-medium text-sm">
                                  {payment.paymentType === 'electricity'
                                    ? `Bill: ${payment.billMonth || 'N/A'}`
                                    : payment.paymentType === 'additional_fee'
                                    ? payment.additionalFeeType ? payment.additionalFeeType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Additional Fee'
                                    : payment.term?.replace('term', 'Term ') || 'N/A'}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {new Date(payment.paymentDate).toLocaleDateString()}
                                </span>
                              </div>
                              <div className="text-xs text-gray-600 flex items-center gap-2">
                                <span>{payment.paymentMethod}</span>
                                {payment.notes && <span>•</span>}
                                <span className="truncate">{payment.notes || ''}</span>
                              </div>
                              {payment.transactionId && (
                                <div className="text-xs text-gray-400 mt-1 font-mono">
                                  Txn: {payment.transactionId}
                            </div>
                              )}
                            </div>
                            <div className="text-right ml-4 flex-shrink-0">
                              <div className="font-semibold text-green-600 text-lg">₹{payment.amount.toLocaleString()}</div>
                              <div className={`text-xs mt-1 ${
                                payment.status === 'success' ? 'text-green-600' : 
                                payment.status === 'pending' ? 'text-yellow-600' : 
                                'text-red-600'
                              }`}>
                                {payment.status?.charAt(0).toUpperCase() + payment.status?.slice(1) || 'Success'}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => {
                      setShowBalanceModal(false);
                      setSelectedStudentBalance(null);
                      setPendingElectricityBills([]); // Reset pending bills
                      setStudentAdditionalFees({}); // Reset additional fees
                    }}
                    className="px-6 py-2.5 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 font-medium transition-colors"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      setShowBalanceModal(false);
                      openPaymentModal(selectedStudentBalance);
                    }}
                    className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors shadow-sm"
                  >
                    Record Payment
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
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
                const feeStructure = getFeeStructureForStudent(
                  selectedStudentForPayment.course, 
                  selectedStudentForPayment.year, 
                  selectedStudentForPayment.category, 
                  selectedStudentForPayment.academicYear,
                  selectedStudentForPayment.hostel, // Pass student's hostel ObjectId
                  selectedStudentForPayment.hostelCategory, // Pass student's hostelCategory ObjectId
                  selectedStudentForPayment.branch // Pass student's branch for matching
                );
                  const hasConcession = selectedStudentForPayment.concession && selectedStudentForPayment.concession > 0;
                
                // Always render the section, even if fee structure is not found
                if (feeStructure) {
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
                } else {
                  // Fallback when fee structure is not found - still show the section
                  const calculatedTotal = selectedStudentForPayment.totalCalculatedFee || 0;
                  const originalTotal = calculatedTotal + (selectedStudentForPayment.concession || 0);
                  
                  return (
                    <div className="p-3 bg-green-50 rounded-lg">
                      <h4 className="font-medium text-green-900 mb-3">Fee Information</h4>
                      <div className="text-sm text-green-800 space-y-2">
                        {calculatedTotal > 0 ? (
                          <>
                            {originalTotal > calculatedTotal && (
                              <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
                                <span className="font-medium min-w-[120px]">Original Total:</span>
                                <span className="font-semibold">₹{originalTotal.toLocaleString()}</span>
                              </div>
                            )}
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
                            {!hasConcession && calculatedTotal > 0 && (
                              <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
                                <span className="font-medium min-w-[120px]">Total Fee:</span>
                                <span className="font-semibold text-blue-700">₹{calculatedTotal.toLocaleString()}</span>
                              </div>
                            )}
                            {(selectedStudentForPayment.calculatedTerm1Fee || selectedStudentForPayment.calculatedTerm2Fee || selectedStudentForPayment.calculatedTerm3Fee) && (
                              <div className="mt-3 pt-3 border-t border-green-200">
                                <p className="font-medium mb-2">Term Breakdown:</p>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                                  {selectedStudentForPayment.calculatedTerm1Fee && (
                                    <div className="bg-white p-2 rounded border border-green-200">
                                      <span className="font-medium block text-gray-700">Term 1:</span>
                                      <span className="text-green-700 font-semibold">
                                        ₹{selectedStudentForPayment.calculatedTerm1Fee.toLocaleString()}
                                      </span>
                                    </div>
                                  )}
                                  {selectedStudentForPayment.calculatedTerm2Fee && (
                                    <div className="bg-white p-2 rounded border border-green-200">
                                      <span className="font-medium block text-gray-700">Term 2:</span>
                                      <span className="text-green-700 font-semibold">
                                        ₹{selectedStudentForPayment.calculatedTerm2Fee.toLocaleString()}
                                      </span>
                                    </div>
                                  )}
                                  {selectedStudentForPayment.calculatedTerm3Fee && (
                                    <div className="bg-white p-2 rounded border border-green-200">
                                      <span className="font-medium block text-gray-700">Term 3:</span>
                                      <span className="text-green-700 font-semibold">
                                        ₹{selectedStudentForPayment.calculatedTerm3Fee.toLocaleString()}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="text-amber-700 bg-amber-50 p-3 rounded border border-amber-200">
                            <p className="text-sm">
                              <span className="font-medium">⚠️ Fee structure not configured</span>
                              <br />
                              <span className="text-xs mt-1 block">
                                No fee structure found for {getCourseName(selectedStudentForPayment.course)} - Year {selectedStudentForPayment.year} ({selectedStudentForPayment.category}) in {selectedStudentForPayment.academicYear}
                              </span>
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }
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
                      <option value="additional_fee">Additional Fee</option>
                    </select>
                  </div>

                  {paymentForm.paymentType === 'additional_fee' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Fee Type <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={paymentForm.additionalFeeType}
                        onChange={(e) => {
                          const selectedFeeType = e.target.value;
                          setPaymentForm(prev => ({ ...prev, additionalFeeType: selectedFeeType }));
                          // Set amount to the configured fee amount if available
                          if (selectedFeeType && additionalFees[selectedFeeType]) {
                            const feeData = additionalFees[selectedFeeType];
                            if (feeData.amount > 0) {
                              setPaymentForm(prev => ({ ...prev, amount: feeData.amount.toString() }));
                            }
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        required
                      >
                        <option value="">Select Fee Type</option>
                        {Object.entries(additionalFees)
                          .filter(([feeType, feeData]) => {
                            // Filter by student's category and active status
                            if (!feeData.isActive) return false;
                            if (!selectedStudentForPayment) return true;
                            const studentCategory = selectedStudentForPayment.category;
                            return feeData.categories && feeData.categories.includes(studentCategory);
                          })
                          .map(([feeType, feeData]) => (
                            <option key={feeType} value={feeType}>
                              {feeType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} {feeData.amount > 0 ? `(₹${feeData.amount.toLocaleString()})` : ''}
                            </option>
                          ))}
                      </select>
                      {paymentForm.additionalFeeType && additionalFees[paymentForm.additionalFeeType] && (
                        <div className="mt-2">
                          <p className="text-xs text-gray-500">
                            Configured amount: ₹{additionalFees[paymentForm.additionalFeeType].amount.toLocaleString()}
                          </p>
                          {additionalFees[paymentForm.additionalFeeType].description && (
                            <p className="text-xs text-gray-400 mt-1">
                              {additionalFees[paymentForm.additionalFeeType].description}
                            </p>
                          )}
                        </div>
                      )}
                      {Object.keys(additionalFees).filter((feeType) => {
                        const feeData = additionalFees[feeType];
                        if (!feeData.isActive) return false;
                        if (!selectedStudentForPayment) return false;
                        const studentCategory = selectedStudentForPayment.category;
                        return feeData.categories && feeData.categories.includes(studentCategory);
                      }).length === 0 && (
                        <p className="text-xs text-red-500 mt-1">
                          No additional fees configured for {selectedStudentForPayment?.category} category in {selectedStudentForPayment?.academicYear}
                        </p>
                      )}
                    </div>
                  )}

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

      {/* Additional Fee Modal */}
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
};

export default FeeManagement; 
