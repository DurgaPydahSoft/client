import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/axios';
import toast from 'react-hot-toast';
import { 
  CurrencyDollarIcon, 
  ExclamationTriangleIcon, 
  CheckCircleIcon, 
  ClockIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowPathIcon,
  EyeIcon,
  PencilIcon,
  Cog6ToothIcon,
  PlusIcon,
  TrashIcon,
  UserGroupIcon,
  AcademicCapIcon,
  ReceiptRefundIcon,
  CreditCardIcon,
  BanknotesIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import LoadingSpinner from '../../components/LoadingSpinner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const FeeManagement = () => {
  const { user } = useAuth();
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
    gender: ''
  });
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateForm, setUpdateForm] = useState({
    term1: '',
    term2: '',
    term3: ''
  });
  const [updating, setUpdating] = useState(false);

  // Fee Structure Management
  const [feeStructures, setFeeStructures] = useState([]);
  const [showFeeStructureModal, setShowFeeStructureModal] = useState(false);
  const [selectedFeeStructure, setSelectedFeeStructure] = useState(null);
  const [feeStructureForm, setFeeStructureForm] = useState({
    academicYear: '',
    category: '',
    totalFee: 0
  });
  const [feeStructureLoading, setFeeStructureLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('students'); // 'students' or 'structure'
  const [feeStructureFilter, setFeeStructureFilter] = useState({
    academicYear: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`
  });

  // Payment Tracking State
  const [payments, setPayments] = useState([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedStudentForPayment, setSelectedStudentForPayment] = useState(null);
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    paymentMethod: 'Cash',
    term: '',
    notes: ''
  });
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [selectedStudentBalance, setSelectedStudentBalance] = useState(null);
  const [studentPayments, setStudentPayments] = useState([]);
  const [balanceLoading, setBalanceLoading] = useState(false);


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

  // Fetch fee structure for a specific student category and academic year
  const getFeeStructureForStudent = (category, academicYear) => {
    const structure = feeStructures.find(structure => 
      structure.category === category && 
      structure.academicYear === academicYear
    );
    
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

      const response = await api.get(`/api/admin/students?${params}`);
      
      if (response.data.success) {
        const allStudentsData = response.data.data.students || response.data.data || [];
        console.log('🔍 Frontend: All students for stats:', allStudentsData.length);
        
        // Update stats with all students data
        const totalStudents = allStudentsData.length;
        const studentsWithFees = allStudentsData.filter(student => {
          const feeStructure = getFeeStructureForStudent(student.category, student.academicYear);
          return feeStructure !== undefined;
        }).length;
        const studentsWithoutFees = totalStudents - studentsWithFees;
        
        // Calculate total fee amount (including concession)
        let totalFeeAmount = 0;
        let totalCalculatedFeeAmount = 0;
        let totalConcessionAmount = 0;
        let studentsWithConcession = 0;
        
        allStudentsData.forEach(student => {
          const feeStructure = getFeeStructureForStudent(student.category, student.academicYear);
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
        const averageCalculatedFeeAmount = studentsWithFees > 0 ? Math.round(totalCalculatedFeeAmount / studentsWithFees) : 0;
        
        setStats({
          totalStudents,
          studentsWithFees,
          studentsWithoutFees,
          totalFeeAmount,
          averageFeeAmount,
          totalCalculatedFeeAmount,
          totalConcessionAmount,
          studentsWithConcession,
          averageCalculatedFeeAmount
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

  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    if (!selectedStudent) return;

    try {
      setUpdating(true);
      // Here you would update the student's fee status
      // For now, we'll just show a success message
        toast.success('Fee payment status updated successfully');
        setShowUpdateModal(false);
      setSelectedStudent(null);
        setUpdateForm({ term1: '', term2: '', term3: '' });
      fetchStudents();
        fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update fee status');
    } finally {
      setUpdating(false);
    }
  };

  const openUpdateModal = (student) => {
    setSelectedStudent(student);
    // Initialize form with current fee status if available
    setUpdateForm({
      term1: 'Unpaid',
      term2: 'Unpaid',
      term3: 'Unpaid'
    });
    setShowUpdateModal(true);
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
    setFilters({ search: '', academicYear: '', category: '', gender: '' });
    setCurrentPage(1);
  };

  // Fee Structure Management Functions
  const fetchFeeStructures = async () => {
    try {
      console.log('🔍 Fetching ALL fee structures for proper student linking...');
      setFeeStructureLoading(true);
      
      // Since the backend requires academic year, we'll fetch for all available academic years
      // and combine them to get ALL fee structures
      const academicYears = generateAcademicYears();
      console.log('🔍 Fetching fee structures for academic years:', academicYears);
      
      const allStructures = [];
      
      // Fetch fee structures for each academic year
      for (const year of academicYears) {
        try {
          console.log(`🔍 Fetching fee structures for year: ${year}`);
          const response = await api.get(`/api/fee-structures?academicYear=${year}`);
          
          if (response.data.success && Array.isArray(response.data.data)) {
            allStructures.push(...response.data.data);
            console.log(`🔍 Found ${response.data.data.length} structures for ${year}`);
          } else if (response.data && Array.isArray(response.data)) {
            allStructures.push(...response.data);
            console.log(`🔍 Found ${response.data.length} structures for ${year} (direct array)`);
          }
        } catch (yearError) {
          console.log(`🔍 No fee structures found for year ${year} or error occurred:`, yearError.response?.data?.message || yearError.message);
          // Continue with other years even if one fails
        }
      }
      
      console.log('🔍 Total fee structures collected:', allStructures.length);
      console.log('🔍 Academic years available:', [...new Set(allStructures.map(s => s.academicYear))]);
      
      if (allStructures.length > 0) {
        setFeeStructures(allStructures);
        setError(null); // Clear any previous errors
        } else {
          setFeeStructures([]);
        setError('No fee structures found for any academic year');
        }
      
    } catch (err) {
      console.error('Error fetching fee structures:', err);
      console.error('🔍 Fee structures error response:', err.response?.data);
      console.error('🔍 Error status:', err.response?.status);
      console.error('🔍 Error message:', err.message);
      
      // Handle specific error cases
      if (err.response?.status === 400) {
        console.error('🔍 400 Bad Request - checking if this is a parameter issue...');
        setError('Bad Request: API endpoint requires academic year parameter');
      } else if (err.response?.status === 401) {
        console.error('🔍 401 Unauthorized - authentication issue...');
        setError('Authentication required: Please log in again');
      } else if (err.response?.status === 404) {
        console.error('🔍 404 Not Found - endpoint might not exist...');
        setError('API endpoint not found: Please check backend configuration');
      } else {
      setError(err.response?.data?.message || 'Failed to fetch fee structures');
      }
    } finally {
      setFeeStructureLoading(false);
    }
  };

  const handleFeeStructureSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form data
    if (!feeStructureForm.academicYear || !feeStructureForm.category || !feeStructureForm.totalFee) {
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
        category: feeStructureForm.category,
        totalFee: feeStructureForm.totalFee,
        term1Fee: termFees.term1Fee,
        term2Fee: termFees.term2Fee,
        term3Fee: termFees.term3Fee
      };
      
      console.log('🔍 Frontend: Sending fee data to backend:', feeData);
      console.log('🔍 Frontend: Term fees calculated:', termFees);
      
      const response = await api.post('/api/fee-structures', feeData);
      
      console.log('🔍 Frontend: Response from backend:', response.data);
      
      if (response.data.success) {
        toast.success(`Fee structure for ${feeData.category} category (${feeData.academicYear}) saved successfully!`);
        setShowFeeStructureModal(false);
        setFeeStructureForm({
          academicYear: '',
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

  // Get available categories (excluding already created ones)
  const getAvailableCategoriesForCreation = () => {
    const allCategories = getAvailableCategories();
    const academicYear = feeStructureFilter.academicYear || '2024-2025';
    
    // Get existing categories for the current academic year
    const existingCategories = feeStructures
      .filter(structure => structure.academicYear === academicYear)
      .map(structure => structure.category);
    
    // If editing, include the current category
    if (selectedFeeStructure) {
      return allCategories;
    }
    
    // If creating new, exclude existing categories for the same academic year
    const availableCategories = allCategories.filter(category => !existingCategories.includes(category));
    
    console.log('🔍 Available categories for creation:', {
      academicYear,
      allCategories,
      existingCategories,
      availableCategories
    });
    
    return availableCategories;
  };

  const openFeeStructureModal = (structure = null) => {
    if (structure) {
      setSelectedFeeStructure(structure);
      setFeeStructureForm({
        academicYear: structure.academicYear,
        category: structure.category,
        totalFee: (structure.totalFee || 0) || ((structure.term1Fee || 0) + (structure.term2Fee || 0) + (structure.term3Fee || 0))
      });
    } else {
      setSelectedFeeStructure(null);
      setFeeStructureForm({
        academicYear: feeStructureFilter.academicYear || '2024-2025',
        category: '',
        totalFee: 0
      });
    }
    
    setShowFeeStructureModal(true);
  };

  const deleteFeeStructure = async (academicYear, category) => {
    if (!window.confirm(`Are you sure you want to delete fee structure for ${category} category?`)) {
      return;
    }

    try {
      setFeeStructureLoading(true);
      const response = await api.delete(`/api/fee-structures/${academicYear}/${category}`);
      
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
    const feeStructure = getFeeStructureForStudent(student.category, student.academicYear);
    
    if (!feeStructure) {
      toast.error('No fee structure found for this student');
      return;
    }

    // Initialize payment form with student's fee structure
    setPaymentForm({
      amount: '',
      paymentMethod: 'Cash',
      term: '',
      notes: ''
    });
    setShowPaymentModal(true);
  };

  const handleClosePaymentModal = () => {
    setShowPaymentModal(false);
    setSelectedStudentForPayment(null);
    setPaymentForm({
      amount: '',
      paymentMethod: 'Cash',
      term: '',
      notes: ''
    });
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
    
    if (!paymentForm.term) {
      errors.push('Please select a term');
    }
    
    if (!paymentForm.paymentMethod) {
      errors.push('Please select a payment method');
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
      
      // Check minimum payment
      if (amount < 100) {
        errors.push('Minimum payment amount is ₹100');
      }
      
      // Check decimal precision
      if (amount % 1 !== 0 && amount.toString().split('.')[1]?.length > 2) {
        errors.push('Payment amount cannot have more than 2 decimal places');
      }
    }
    
    // 4. Term balance validation
    if (student && paymentForm.term && paymentForm.amount) {
      const balance = calculateStudentBalance(student);
      if (balance) {
        const termBalance = balance.termBalances[paymentForm.term];
        
        if (!termBalance) {
          errors.push(`Invalid term: ${paymentForm.term}`);
        } else if (termBalance.balance <= 0) {
          errors.push(`Term ${paymentForm.term.replace('term', 'Term ')} is already fully paid`);
        } else if (parseFloat(paymentForm.amount) > termBalance.balance) {
          errors.push(`Payment amount (₹${paymentForm.amount}) exceeds term balance (₹${termBalance.balance})`);
        }
      }
    }
    
    // 5. Duplicate payment prevention (check recent payments)
    if (student && paymentForm.term && paymentForm.amount) {
      const recentPayments = payments.filter(p => 
        p.studentId === student._id && 
        p.term === paymentForm.term &&
        new Date(p.createdAt) > new Date(Date.now() - 5 * 60 * 1000) // Last 5 minutes
      );
      
      if (recentPayments.length > 0) {
        errors.push('Duplicate payment detected. Please wait before making another payment for the same term.');
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
      
      const paymentData = {
        studentId: selectedStudentForPayment._id,
        amount: parseFloat(paymentForm.amount),
        paymentMethod: paymentForm.paymentMethod,
        term: paymentForm.term,
        notes: paymentForm.notes,
        academicYear: selectedStudentForPayment.academicYear
      };

            // Send payment to backend
      console.log('🔍 Sending payment data to backend:', paymentData);
      const response = await api.post('/api/payments/hostel-fee', paymentData);
      
      console.log('🔍 Backend response:', response.data);
      
      if (response.data.success) {
        const newPayment = response.data.data;
        
        // Add to local payments array
        setPayments(prev => {
          const updatedPayments = [newPayment, ...prev];
          // Debug logging
          console.log('🔍 New payment recorded:', newPayment);
          console.log('🔍 Updated payments array:', updatedPayments);
          return updatedPayments;
        });
      
      // Generate receipt
      generateReceipt(newPayment);
      
      toast.success('Payment recorded successfully!');
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
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.text('HOSTEL FEE RECEIPT', 105, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text('PYDAH SOFT HOSTEL MANAGEMENT SYSTEM', 105, 30, { align: 'center' });
    
    // Receipt details
    doc.setFontSize(14);
    doc.text('Receipt Details', 20, 50);
    
    doc.setFontSize(10);
    doc.text(`Receipt No: ${payment.receiptNumber}`, 20, 65);
    doc.text(`Transaction ID: ${payment.transactionId}`, 20, 75);
    doc.text(`Date: ${new Date(payment.paymentDate).toLocaleDateString()}`, 20, 85);
    
    // Student details
    doc.setFontSize(14);
    doc.text('Student Details', 20, 105);
    
    doc.setFontSize(10);
    doc.text(`Name: ${payment.studentName || selectedStudentForPayment?.name}`, 20, 120);
    doc.text(`Roll Number: ${payment.studentRollNumber || selectedStudentForPayment?.rollNumber}`, 20, 130);
    doc.text(`Academic Year: ${payment.academicYear || selectedStudentForPayment?.academicYear}`, 20, 140);
    doc.text(`Category: ${payment.category || selectedStudentForPayment?.category}`, 20, 150);
    
    // Payment details
    doc.setFontSize(14);
    doc.text('Payment Details', 20, 170);
    
    doc.setFontSize(10);
    doc.text(`Amount: ₹${payment.amount.toLocaleString()}`, 20, 185);
    doc.text(`Term: ${payment.term}`, 20, 195);
    doc.text(`Payment Method: ${payment.paymentMethod}`, 20, 205);
    doc.text(`Collected By: ${payment.collectedByName}`, 20, 215);
    
    if (payment.notes) {
      doc.text(`Notes: ${payment.notes}`, 20, 225);
    }
    
    // Footer
    doc.setFontSize(8);
    doc.text('This is a computer generated receipt', 105, 270, { align: 'center' });
    
    // Save the PDF
    doc.save(`receipt_${payment.receiptNumber}.pdf`);
  };

  const openBalanceModal = async (student) => {
    setSelectedStudentBalance(student);
    setShowBalanceModal(true);
    setBalanceLoading(true);
    
    try {
      // Get student's fee structure
      const feeStructure = getFeeStructureForStudent(student.category, student.academicYear);
      
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
    const feeStructure = getFeeStructureForStudent(student.category, student.academicYear);
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
  
  // Refresh fee structures when filters change
  useEffect(() => {
    if (feeStructureFilter.academicYear || feeStructureFilter.category) {
      // Filters are applied client-side, no need to refetch
      console.log('🔍 Fee structure filters changed:', feeStructureFilter);
    }
  }, [feeStructureFilter]);

  // Initial load - fetch fee structures if structure tab is active
  useEffect(() => {
    console.log('🔍 Initial load useEffect - activeTab:', activeTab);
    if (activeTab === 'structure') {
      console.log('🔍 Initial load - fetching fee structures...');
      fetchFeeStructures();
    }
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto mt-16 sm:mt-0">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-blue-900 mb-2">
          Hostel Fee Management
        </h1>
        <p className="text-gray-600">
          Manage student fee payments and track payment status
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('students')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'students'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Students
            </button>
            <button
              onClick={() => setActiveTab('structure')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'structure'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Fee Structure
            </button>
            {/* <button
              onClick={() => setActiveTab('payments')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'payments'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Payments
            </button> */}
          </nav>
        </div>
      </div>

      {activeTab === 'students' && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
                <UserGroupIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Total Students</p>
              <p className="text-lg font-semibold text-gray-900">{stats.totalStudents}</p>
                <p className="text-xs text-gray-500">Displayed: {students.length} (Page {currentPage})</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
               <AcademicCapIcon className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-3">
               <p className="text-sm font-medium text-gray-600">Students with Fees</p>
               <p className="text-lg font-semibold text-gray-900">{stats.studentsWithFees}</p>
               <p className="text-xs text-gray-500">
                 {stats.totalStudents > 0 ? Math.round((stats.studentsWithFees / stats.totalStudents) * 100) : 0}% linked
               </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <ExclamationTriangleIcon className="w-6 h-6 text-red-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Students without Fees</p>
              <p className="text-lg font-semibold text-gray-900">{stats.studentsWithoutFees}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <CurrencyDollarIcon className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Total Fee Amount</p>
              <p className="text-lg font-semibold text-gray-900">₹{stats.totalFeeAmount.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <CurrencyDollarIcon className="w-6 h-6 text-orange-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Average Fee Amount</p>
              <p className="text-lg font-semibold text-gray-900">₹{stats.averageFeeAmount.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Concession Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <ReceiptRefundIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Students with Concession</p>
              <p className="text-lg font-semibold text-blue-600">{stats.studentsWithConcession || 0}</p>
              <p className="text-xs text-gray-500">
                {stats.totalStudents > 0 ? Math.round(((stats.studentsWithConcession || 0) / stats.totalStudents) * 100) : 0}% of total
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CurrencyDollarIcon className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Total Concession Amount</p>
              <p className="text-lg font-semibold text-green-600">₹{(stats.totalConcessionAmount || 0).toLocaleString()}</p>
              <p className="text-xs text-gray-500">
                {stats.totalFeeAmount > 0 ? Math.round(((stats.totalConcessionAmount || 0) / stats.totalFeeAmount) * 100) : 0}% of total fees
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <CurrencyDollarIcon className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Total After Concession</p>
              <p className="text-lg font-semibold text-purple-600">₹{(stats.totalCalculatedFeeAmount || 0).toLocaleString()}</p>
              <p className="text-xs text-gray-500">
                Final amount to be collected
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <CurrencyDollarIcon className="w-6 h-6 text-indigo-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Average After Concession</p>
              <p className="text-lg font-semibold text-indigo-600">₹{(stats.averageCalculatedFeeAmount || 0).toLocaleString()}</p>
              <p className="text-xs text-gray-500">
                Per student average
              </p>
            </div>
          </div>
        </div>
      </div>

              {/* Fee Structure Summary */}
        {activeTab === 'students' && feeStructures.length > 0 && (
                      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Fee Structure Summary</h3>
              
              {/* Filter Controls */}
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
              
              {/* Filtered Fee Structures */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {(() => {
                  let filteredStructures = feeStructures;
                  
                  // Apply academic year filter
                  if (feeStructureFilter.academicYear) {
                    filteredStructures = filteredStructures.filter(s => 
                      s.academicYear === feeStructureFilter.academicYear
                    );
                  }
                  
                  // Apply category filter
                  if (feeStructureFilter.category) {
                    filteredStructures = filteredStructures.filter(s => 
                      s.category === feeStructureFilter.category
                    );
                  }
                  
                  return filteredStructures.map((structure) => (
                    <div key={`${structure.academicYear}-${structure.category}`} className="bg-gray-50 rounded-lg p-3">
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
        )}

      



      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by student name or roll number..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <select
              value={filters.academicYear}
              onChange={(e) => handleFilterChange('academicYear', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Academic Years</option>
              <option value="2023-2024">2023-2024</option>
              <option value="2024-2025">2024-2025</option>
              <option value="2025-2026">2025-2026</option>
            </select>
            
            <select
              value={filters.category}
              onChange={(e) => handleFilterChange('category', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Genders</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
            
            <button
              onClick={clearFilters}
              className="px-3 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <FunnelIcon className="w-4 h-4" />
            </button>
            
            <button
              onClick={fetchStudents}
              className="px-3 py-2 text-blue-600 hover:text-blue-800 border border-blue-300 rounded-lg hover:bg-blue-50"
            >
              <ArrowPathIcon className="w-4 h-4" />
            </button>
            
            {/* Removed "Create Fee Reminders" button as it's no longer relevant */}
          </div>
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">Student Fee Management</h3>
            <div className="text-sm text-gray-600">
              Showing {students.length} of {stats.totalStudents} students
              {totalPages > 1 && ` (Page ${currentPage} of ${totalPages})`}
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Student
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Fee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {tableLoading ? (
                <tr>
                  <td colSpan="4" className="px-6 py-4 text-center">
                    <LoadingSpinner />
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-6 py-4 text-center text-gray-500">
                    <div className="space-y-2">
                      <p>No students found</p>
                      <p className="text-sm">Please adjust your filters or check back later.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                students.map((student) => (
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
                       {(() => {
                         if (student.category) {
                           const feeStructure = getFeeStructureForStudent(student.category, student.academicYear);
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
                             <div className="text-gray-400">Category: {student.category || 'Unknown'}</div>
                             <div className="text-gray-400">Year: {student.academicYear || 'Unknown'}</div>
                           </div>
                         );
                       })()}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openUpdateModal(student);
                        }}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
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
                ))
              )}
            </tbody>
          </table>
        </div>

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
                  disabled={getAvailableCategoriesForCreation().length === 0}
                >
                  <PlusIcon className="w-4 h-4" />
                  Add Fee Structure
                </button>
              </div>
            </div>
            
            {/* Academic Year Filter */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Academic Year
              </label>
              <select
                value={feeStructureFilter.academicYear}
                onChange={(e) => handleFeeStructureFilterChange('academicYear', e.target.value)}
                className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Academic Years</option>
                {generateAcademicYears().map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
            
            {/* Category Filter */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Category
              </label>
              <select
                value={feeStructureFilter.category || ''}
                onChange={(e) => handleFeeStructureFilterChange('category', e.target.value)}
                className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Categories</option>
                {[...new Set(feeStructures.map(s => s.category))].sort().map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
            
            {/* Filter Summary and Clear Button */}
            <div className="mb-4 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                {(() => {
                  let filteredCount = feeStructures.length;
                  if (feeStructureFilter.academicYear) {
                    filteredCount = feeStructures.filter(s => s.academicYear === feeStructureFilter.academicYear).length;
                  }
                  if (feeStructureFilter.category) {
                    filteredCount = feeStructures.filter(s => s.category === feeStructureFilter.category).length;
                  }
                  return `Showing ${filteredCount} of ${feeStructures.length} fee structures`;
                })()}
              </div>
              <button
                onClick={() => setFeeStructureFilter({ academicYear: '', category: '' })}
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
                if (feeStructureFilter.category) {
                  filteredStructures = filteredStructures.filter(s => s.category === feeStructureFilter.category);
                }
                
                if (filteredStructures.length === 0 && (feeStructureFilter.academicYear || feeStructureFilter.category)) {
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
                      {filteredStructures.map((structure) => (
                        <tr key={`${structure.academicYear}-${structure.category}`} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {structure.academicYear}
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
                                <PencilIcon className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => deleteFeeStructure(structure.academicYear, structure.category)}
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



      {/* Update Modal */}
      {showUpdateModal && selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
              Update Fee Payment Status
            </h3>
              <button
                onClick={() => setShowUpdateModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600"
                aria-label="Close modal"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Student: {selectedStudent.name} ({selectedStudent.rollNumber})
            </p>
            
            <form onSubmit={handleUpdateStatus}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Term 1 Status
                  </label>
                  <select
                    value={updateForm.term1}
                    onChange={(e) => setUpdateForm(prev => ({ ...prev, term1: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="Unpaid">Unpaid</option>
                    <option value="Paid">Paid</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Term 2 Status
                  </label>
                  <select
                    value={updateForm.term2}
                    onChange={(e) => setUpdateForm(prev => ({ ...prev, term2: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="Unpaid">Unpaid</option>
                    <option value="Paid">Paid</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Term 3 Status
                  </label>
                  <select
                    value={updateForm.term3}
                    onChange={(e) => setUpdateForm(prev => ({ ...prev, term3: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="Unpaid">Unpaid</option>
                    <option value="Paid">Paid</option>
                  </select>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowUpdateModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {updating ? 'Updating...' : 'Update Status'}
                </button>
              </div>
            </form>
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
                    <span className="font-medium min-w-[100px]">Academic Year:</span>
                    <span className="font-semibold">{selectedStudentForPayment.academicYear}</span>
                  </div>
                </div>
              </div>

              {/* Fee Information with Concession */}
              {(() => {
                const feeStructure = getFeeStructureForStudent(selectedStudentForPayment.category, selectedStudentForPayment.academicYear);
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
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Term to Pay
                  </label>
                  <select
                    value={paymentForm.term}
                    onChange={(e) => setPaymentForm(prev => ({ ...prev, term: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    required
                  >
                    <option value="">Select Term</option>
                    {selectedStudentForPayment && getAvailableTermsForPayment(selectedStudentForPayment).map(term => (
                      <option key={term.value} value={term.value}>
                        {term.label}
                      </option>
                    ))}
                    {selectedStudentForPayment && getAvailableTermsForPayment(selectedStudentForPayment).length === 0 && (
                      <option value="" disabled>No terms available for payment</option>
                    )}
                  </select>
                  {selectedStudentForPayment && getAvailableTermsForPayment(selectedStudentForPayment).length === 0 && (
                    <p className="text-sm text-green-600 mt-1">✅ All terms are fully paid</p>
                  )}
                </div>
                
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
                      min="100"
                      step="0.01"
                      placeholder="Enter payment amount"
                    />
                  {paymentForm.term && selectedStudentForPayment && (() => {
                    const balance = calculateStudentBalance(selectedStudentForPayment);
                    const termBalance = balance?.termBalances[paymentForm.term];
                    return termBalance && termBalance.balance > 0 ? (
                      <div className="mt-2 space-y-1">
                        <p className="text-xs text-gray-600">Term Balance: ₹{termBalance.balance}</p>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setPaymentForm(prev => ({ ...prev, amount: termBalance.balance.toString() }))}
                            className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200"
                          >
                            Pay Full (₹{termBalance.balance})
                          </button>
                          <button
                            type="button"
                            onClick={() => setPaymentForm(prev => ({ ...prev, amount: Math.round(termBalance.balance / 2).toString() }))}
                            className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200"
                          >
                            Pay Half (₹{Math.round(termBalance.balance / 2)})
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
                  disabled={paymentLoading || getAvailableTermsForPayment(selectedStudentForPayment).length === 0}
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
                                {/* {balance.hasConcession && (
                                  <div className="flex justify-between">
                                    <span>Original:</span>
                                    <span className="font-medium text-gray-500 line-through">₹{originalTermFee.toLocaleString()}</span>
                                  </div>
                                )} */}
                              <div className="flex justify-between">
                                <span>Required:</span>
                                <span className="font-medium">₹{termData.required.toLocaleString()}</span>
                              </div>
                              {/* <div className="flex justify-between">
                                <span>Paid:</span>
                                <span className="font-medium text-green-600">₹{termData.paid.toLocaleString()}</span>
                              </div> */}
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
                        ? 'All categories already created for this academic year' 
                        : 'Select Category'
                      }
                    </option>
                    {getAvailableCategoriesForCreation().map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                  {getAvailableCategoriesForCreation().length === 0 && (
                    <p className="text-sm text-gray-500 mt-1">
                      All fee structure categories have been created for the selected academic year.
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
              {payments.length === 0 ? (
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
                        Payment Details
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
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {payment.term}
                            </div>
                            <div className="text-xs text-gray-500">
                              {payment.notes || 'No notes'}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                          ₹{payment.amount.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            payment.paymentMethod === 'Cash' 
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
                            className="text-blue-600 hover:text-blue-900 mr-3"
                            title="Download Receipt"
                          >
                            <DocumentTextIcon className="w-4 h-4" />
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
    </div>
  );
};

export default FeeManagement; 