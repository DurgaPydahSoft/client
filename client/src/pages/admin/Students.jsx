import React, { useState, useEffect, useCallback } from 'react';
import api from '../../utils/axios';
import toast from 'react-hot-toast';
import { UserPlusIcon, TableCellsIcon, ArrowUpTrayIcon, PencilSquareIcon, TrashIcon, MagnifyingGlassIcon, ChevronLeftIcon, ChevronRightIcon, DocumentDuplicateIcon, PrinterIcon, DocumentArrowDownIcon, XMarkIcon, XCircleIcon, PhotoIcon } from '@heroicons/react/24/outline';
import LoadingSpinner from '../../components/LoadingSpinner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Dynamic course and branch data will be fetched from backend

// Room mappings based on gender and category
const ROOM_MAPPINGS = {
  Male: {
    'A+': ['302', '309', '310', '311', '312'],
    'A': ['303', '304', '305', '306', '308', '320', '324', '325'],
    'B+': ['321'],
    'B': ['314', '315', '316', '317', '322', '323']
  },
  Female: {
    'A+': ['209', '211', '212', '213', '214', '215'],
    'A': ['103', '115', '201', '202', '203', '204', '205', '206', '207', '208', '216', '217'],
    'B': ['101', '102', '104', '105', '106', '108', '109', '111', '112', '114'],
    'C': ['117']
  }
};

const CATEGORIES = ['A+', 'A', 'B+', 'B'];

const ROOM_NUMBERS = Array.from({ length: 11 }, (_, i) => (i + 30).toString());

const TABS = [
  { label: 'All Students', value: 'list', icon: <TableCellsIcon className="w-5 h-5" /> },
  { label: 'Bulk Upload', value: 'bulkUpload', icon: <ArrowUpTrayIcon className="w-5 h-5" /> },
  { label: 'Add Student', value: 'add', icon: <UserPlusIcon className="w-5 h-5" /> },
];

const initialForm = {
  name: '',
  rollNumber: '',
  gender: '',
  course: '',
  year: '',
  branch: '',
  category: '',
  roomNumber: '',
  studentPhone: '',
  parentPhone: '',
  batch: '',
  academicYear: '',
  email: ''
};

// Add BATCHES constant after other constants
const BATCHES = [
  '2022-2026',
  '2023-2027',
  '2024-2028',
  '2025-2029',
  '2026-2030',
  '2027-2031',
  '2028-2032',
  '2029-2033',
  '2030-2034'
];

// Add function to generate batches based on course duration
const generateBatches = (courseId, courses) => {
  const startFromYear = 2022; // Fixed start year
  const batches = [];
  
  // Determine course duration from dynamic course data
  const course = courses.find(c => c._id === courseId);
  const duration = course ? course.duration : 4; // Default to 4 years

  // Generate batches starting from 2022 for next 10 years
  for (let i = 0; i < 10; i++) {
    const startYear = startFromYear + i;
    const endYear = startYear + duration;
    batches.push(`${startYear}-${endYear}`);
  }

  return batches;
};

const generateAcademicYears = () => {
  const startYear = 2022;
  const years = [];
  for (let i = 0; i < 10; i++) {
    const academicStart = startYear + i;
    const academicEnd = academicStart + 1;
    years.push(`${academicStart}-${academicEnd}`);
  }
  return years;
};

const Students = () => {
  const [tab, setTab] = useState('list');
  const [form, setForm] = useState(initialForm);
  const [adding, setAdding] = useState(false);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [error, setError] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [editModal, setEditModal] = useState(false);
  const [editForm, setEditForm] = useState(initialForm);
  const [editId, setEditId] = useState(null);
  const [editing, setEditing] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    course: '',
    branch: '',
    gender: '',
    category: '',
    roomNumber: '',
    batch: '',
    academicYear: '',
    hostelStatus: 'Active' // Default to show only active students
  });
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalStudents, setTotalStudents] = useState(0);
  const [generatedPassword, setGeneratedPassword] = useState(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  // State for bulk upload
  const [bulkFile, setBulkFile] = useState(null);
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [bulkUploadResults, setBulkUploadResults] = useState(null);
  const [bulkPreview, setBulkPreview] = useState(null);
  const [showBulkPreview, setShowBulkPreview] = useState(false);
  const [editablePreviewData, setEditablePreviewData] = useState([]);
  const [previewErrors, setPreviewErrors] = useState([]);
  const [editingRow, setEditingRow] = useState(null);
  const [tempStudentsSummary, setTempStudentsSummary] = useState([]);
  const [loadingTempSummary, setLoadingTempSummary] = useState(false);
  const [renewalModalOpen, setRenewalModalOpen] = useState(false);

  // Email service status
  const [emailServiceStatus, setEmailServiceStatus] = useState(null);
  const [loadingEmailStatus, setLoadingEmailStatus] = useState(false);

  // Photo upload states
  const [studentPhoto, setStudentPhoto] = useState(null);
  const [guardianPhoto1, setGuardianPhoto1] = useState(null);
  const [guardianPhoto2, setGuardianPhoto2] = useState(null);
  const [studentPhotoPreview, setStudentPhotoPreview] = useState(null);
  const [guardianPhoto1Preview, setGuardianPhoto1Preview] = useState(null);
  const [guardianPhoto2Preview, setGuardianPhoto2Preview] = useState(null);

  // Photo edit modal states (separate from edit modal)
  const [photoEditModal, setPhotoEditModal] = useState(false);
  const [photoEditId, setPhotoEditId] = useState(null);
  const [photoEditStudent, setPhotoEditStudent] = useState(null);
  const [photoEditStudentPhoto, setPhotoEditStudentPhoto] = useState(null);
  const [photoEditGuardianPhoto1, setPhotoEditGuardianPhoto1] = useState(null);
  const [photoEditGuardianPhoto2, setPhotoEditGuardianPhoto2] = useState(null);
  const [photoEditStudentPhotoPreview, setPhotoEditStudentPhotoPreview] = useState(null);
  const [photoEditGuardianPhoto1Preview, setPhotoEditGuardianPhoto1Preview] = useState(null);
  const [photoEditGuardianPhoto2Preview, setPhotoEditGuardianPhoto2Preview] = useState(null);
  const [photoEditLoading, setPhotoEditLoading] = useState(false);

  // Missing edit photo state variables
  const [editStudentPhoto, setEditStudentPhoto] = useState(null);
  const [editGuardianPhoto1, setEditGuardianPhoto1] = useState(null);
  const [editGuardianPhoto2, setEditGuardianPhoto2] = useState(null);
  const [editStudentPhotoPreview, setEditStudentPhotoPreview] = useState(null);
  const [editGuardianPhoto1Preview, setEditGuardianPhoto1Preview] = useState(null);
  const [editGuardianPhoto2Preview, setEditGuardianPhoto2Preview] = useState(null);

  // Password reset modal states
  const [passwordResetModal, setPasswordResetModal] = useState(false);
  const [passwordResetId, setPasswordResetId] = useState(null);
  const [passwordResetStudent, setPasswordResetStudent] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordResetLoading, setPasswordResetLoading] = useState(false);

  // Dynamic course and branch data
  const [courses, setCourses] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [loadingBranches, setLoadingBranches] = useState(false);

  // Debounce search term
  useEffect(() => {
    const timerId = setTimeout(() => {
      setDebouncedSearchTerm(filters.search);
    }, 500); // 500ms delay

    return () => {
      clearTimeout(timerId);
    };
  }, [filters.search]);

  const fetchTempStudentsSummary = async () => {
    setLoadingTempSummary(true);
    try {
      const res = await api.get('/api/admin/students/temp-summary');
      if (res.data.success) {
        setTempStudentsSummary(res.data.data);
      } else {
        toast.error('Failed to fetch temporary students summary.');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error fetching temporary students summary.');
    } finally {
      setLoadingTempSummary(false);
    }
  };

  const checkEmailServiceStatus = async () => {
    setLoadingEmailStatus(true);
    try {
      const res = await api.get('/api/admin/email/status');
      if (res.data.success) {
        setEmailServiceStatus(res.data.data);
      } else {
        setEmailServiceStatus({ configured: false, error: 'Failed to check email service status' });
      }
    } catch (err) {
      setEmailServiceStatus({ configured: false, error: err.response?.data?.message || 'Error checking email service status' });
    } finally {
      setLoadingEmailStatus(false);
    }
  };

  // Fetch courses from backend
  const fetchCourses = async () => {
    console.log('🔍 Fetching courses...');
    setLoadingCourses(true);
    try {
      const res = await api.get('/api/course-management/courses');
      console.log('📡 Course API response:', res.data);
      if (res.data.success) {
        setCourses(res.data.data);
        console.log('✅ Courses loaded:', res.data.data.length);
      } else {
        console.error('❌ Failed to fetch courses:', res.data.message);
        toast.error('Failed to fetch courses');
      }
    } catch (err) {
      console.error('❌ Error fetching courses:', err);
      console.error('❌ Error response:', err.response?.data);
      toast.error(err.response?.data?.message || 'Error fetching courses');
    } finally {
      setLoadingCourses(false);
    }
  };

  // Fetch branches for a specific course
  const fetchBranches = async (courseId) => {
    if (!courseId) {
      console.log('🔍 No course ID provided, clearing branches');
      setBranches([]);
      return;
    }
    
    console.log('🔍 Fetching branches for course ID:', courseId);
    console.log('🔍 Available courses:', courses.map(c => ({ id: c._id, name: c.name })));
    
    setLoadingBranches(true);
    try {
      const res = await api.get(`/api/course-management/branches/${courseId}`);
      console.log('📡 Branch API response:', res.data);
      if (res.data.success) {
        setBranches(res.data.data);
        console.log('✅ Branches loaded:', res.data.data.length);
      } else {
        console.error('❌ Failed to fetch branches:', res.data.message);
        toast.error('Failed to fetch branches');
      }
    } catch (err) {
      console.error('❌ Error fetching branches:', err);
      console.error('❌ Error response:', err.response?.data);
      console.error('❌ Error status:', err.response?.status);
      toast.error(err.response?.data?.message || 'Error fetching branches');
    } finally {
      setLoadingBranches(false);
    }
  };

  // Get course duration for batch generation
  const getCourseDuration = (courseId) => {
    const course = courses.find(c => c._id === courseId);
    return course ? course.duration : 4; // Default to 4 years
  };

  // Get course name by ID
  const getCourseName = (courseId) => {
    const course = courses.find(c => c._id === courseId);
    return course ? course.name : '';
  };

  // Get branch name by ID
  const getBranchName = (branchId) => {
    const branch = branches.find(b => b._id === branchId);
    return branch ? branch.name : '';
  };

  const fetchStudents = useCallback(async (initialLoad = false) => {
    if (initialLoad) {
      setLoading(true);
    } else {
      setTableLoading(true);
    }
    setError(null);
    try {
      const params = new URLSearchParams({
        page: currentPage,
        limit: 10
      });

      // Add filters only if they have values
      if (filters.search) params.append('search', filters.search);
      if (filters.course) params.append('course', filters.course);
      if (filters.branch) params.append('branch', filters.branch);
      if (filters.gender) params.append('gender', filters.gender);
      if (filters.category) params.append('category', filters.category);
      if (filters.roomNumber) params.append('roomNumber', filters.roomNumber);
      if (filters.batch) params.append('batch', filters.batch);
      if (filters.academicYear) params.append('academicYear', filters.academicYear);
      if (filters.hostelStatus) params.append('hostelStatus', filters.hostelStatus);

      console.log('Filter params:', Object.fromEntries(params)); // Debug log

      const res = await api.get(`/api/admin/students?${params}`);
      if (res.data.success) {
        setStudents(res.data.data.students || []);
        setTotalPages(res.data.data.totalPages || 1);
        setTotalStudents(res.data.data.totalStudents || 0);
      } else {
        throw new Error(res.data.message || 'Failed to fetch students');
      }
    } catch (err) {
      setError('Failed to fetch students');
      toast.error(err.response?.data?.message || 'Failed to fetch students');
      setStudents([]);
      setTotalPages(1);
      setTotalStudents(0);
    } finally {
      if (initialLoad) {
        setLoading(false);
      } else {
        setTableLoading(false);
      }
    }
  }, [currentPage, filters.search, filters.course, filters.branch, filters.gender, filters.category, filters.roomNumber, filters.batch, filters.academicYear, filters.hostelStatus, debouncedSearchTerm]);

  // Fetch students when tab, currentPage, or filters change
  useEffect(() => {
    if (tab === 'list') {
      fetchStudents(true); // Pass true for initialLoad to use setLoading
    } else if (tab === 'bulkUpload') {
      fetchTempStudentsSummary();
    }
  }, [tab, currentPage, filters.course, filters.branch, filters.gender, filters.category, filters.roomNumber, filters.batch, filters.academicYear, filters.hostelStatus, debouncedSearchTerm]);

  // Check email service status and fetch courses on component mount
  useEffect(() => {
    checkEmailServiceStatus();
    fetchCourses();
  }, []);

  // Debug: Log when branches change
  useEffect(() => {
    console.log('🔄 Branches state updated:', branches.length, 'branches');
    if (branches.length > 0) {
      console.log('📋 Available branches:', branches.map(b => `${b.name} (${b.code})`));
    }
  }, [branches]);

  const handleFormChange = e => {
    const { name, value } = e.target;
    console.log('🔄 Form field changed:', name, '=', value);
    
    setForm(prev => {
      const newForm = { ...prev, [name]: value };
      
      // Reset dependent fields when parent field changes
      if (name === 'course') {
        console.log('📚 Course changed to:', value);
        newForm.branch = '';
        newForm.batch = ''; // Reset batch when course changes
        // Fetch branches for the selected course
        fetchBranches(value);
      }
      if (name === 'gender') {
        newForm.category = '';
        newForm.roomNumber = '';
      }
      if (name === 'category') {
        newForm.roomNumber = '';
      }
      
      return newForm;
    });
  };

  // Photo handling functions
  const handlePhotoChange = (e, type) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size should be less than 5MB');
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        switch (type) {
          case 'student':
            setStudentPhoto(file);
            setStudentPhotoPreview(reader.result);
            break;
          case 'guardian1':
            setGuardianPhoto1(file);
            setGuardianPhoto1Preview(reader.result);
            break;
          case 'guardian2':
            setGuardianPhoto2(file);
            setGuardianPhoto2Preview(reader.result);
            break;
          default:
            break;
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const resetPhotoForm = () => {
    setStudentPhoto(null);
    setGuardianPhoto1(null);
    setGuardianPhoto2(null);
    setStudentPhotoPreview(null);
    setGuardianPhoto1Preview(null);
    setGuardianPhoto2Preview(null);
  };

  const handleAddStudent = async e => {
    e.preventDefault();
    setAdding(true);
    try {
      const formData = new FormData();
      
      // Add form fields
      Object.keys(form).forEach(key => {
        formData.append(key, form[key]);
      });
      
      // Add photos if selected
      if (studentPhoto) {
        formData.append('studentPhoto', studentPhoto);
      }
      if (guardianPhoto1) {
        formData.append('guardianPhoto1', guardianPhoto1);
      }
      if (guardianPhoto2) {
        formData.append('guardianPhoto2', guardianPhoto2);
      }

      const res = await api.post('/api/admin/students', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      toast.success('Student added successfully');
      setForm(initialForm);
      resetPhotoForm();
      setGeneratedPassword(res.data.data.generatedPassword);
      setShowPasswordModal(true);
      if (tab === 'list') fetchStudents(); // Refresh list if current tab is 'list'
      fetchTempStudentsSummary(); // Refresh pending students list
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add student');
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async id => {
    if (!window.confirm('Are you sure you want to delete this student?')) return;
    setDeletingId(id);
    try {
      await api.delete(`/api/admin/students/${id}`);
      toast.success('Student deleted successfully');
      await fetchStudents(); // Refresh list
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete student');
    } finally {
      setDeletingId(null);
    }
  };

  const openEditModal = (student) => {
    console.log('Opening edit modal for student:', student);
    console.log('Available courses:', courses);
    console.log('Student course data:', student.course);
    
    // Ensure courses are loaded before opening modal
    if (courses.length === 0) {
      console.log('Courses not loaded yet, fetching courses first...');
      fetchCourses().then(() => {
        // Re-open modal after courses are loaded
        setTimeout(() => openEditModal(student), 100);
      });
      return;
    }
    
    setEditId(student._id);
    setEditForm({
      name: student.name,
      rollNumber: student.rollNumber,
      course: student.course?._id || student.course, // Handle both populated and unpopulated data
      year: student.year,
      branch: student.branch?._id || student.branch, // Handle both populated and unpopulated data
      gender: student.gender,
      category: student.category,
      roomNumber: student.roomNumber,
      studentPhone: student.studentPhone,
      parentPhone: student.parentPhone,
      email: student.email,
      batch: student.batch,
      academicYear: student.academicYear,
      hostelStatus: student.hostelStatus || 'Active'
    });
    
    // Fetch branches for the selected course
    const courseId = student.course?._id || student.course;
    if (courseId) {
      console.log('Fetching branches for course ID:', courseId);
      fetchBranches(courseId);
    }
    
    setEditModal(true);
  };

  const handleEditFormChange = e => {
    const { name, value } = e.target;
    setEditForm(prev => {
      const newForm = { ...prev, [name]: value };
      
      // Reset dependent fields when parent field changes
      if (name === 'course') {
        newForm.branch = '';
        newForm.batch = ''; // Reset batch when course changes
        // Fetch branches for the selected course
        fetchBranches(value);
      }
      if (name === 'gender') {
        newForm.category = '';
        newForm.roomNumber = '';
      }
      if (name === 'category') {
        newForm.roomNumber = '';
      }
      
      return newForm;
    });
  };

  // Edit photo handling functions
  const handleEditPhotoChange = (e, type) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size should be less than 5MB');
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        switch (type) {
          case 'student':
            setEditStudentPhoto(file);
            setEditStudentPhotoPreview(reader.result);
            break;
          case 'guardian1':
            setEditGuardianPhoto1(file);
            setEditGuardianPhoto1Preview(reader.result);
            break;
          case 'guardian2':
            setEditGuardianPhoto2(file);
            setEditGuardianPhoto2Preview(reader.result);
            break;
          default:
            break;
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const resetEditPhotoForm = () => {
    setEditStudentPhoto(null);
    setEditGuardianPhoto1(null);
    setEditGuardianPhoto2(null);
    setEditStudentPhotoPreview(null);
    setEditGuardianPhoto1Preview(null);
    setEditGuardianPhoto2Preview(null);
  };

  // Helper function to suggest correct batch format
  const suggestBatchFormat = (courseId, currentBatch) => {
    const course = courses.find(c => c._id === courseId);
    if (!course || !currentBatch) return null;
    
    const [startYear, endYear] = currentBatch.split('-').map(Number);
    const actualDuration = endYear - startYear;
    
    if (actualDuration !== course.duration) {
      const correctEndYear = startYear + course.duration;
      return `${startYear}-${correctEndYear}`;
    }
    return null;
  };

  // Helper function to validate edit form data
  const validateEditForm = (formData) => {
    const errors = [];

    // Validate required fields
    if (!formData.name?.trim()) {
      errors.push('Name is required');
    }
    if (!formData.rollNumber?.trim()) {
      errors.push('Roll number is required');
    }
    if (!formData.course) {
      errors.push('Course is required');
    }
    if (!formData.branch) {
      errors.push('Branch is required');
    }
    if (!formData.gender) {
      errors.push('Gender is required');
    }
    if (!formData.category) {
      errors.push('Category is required');
    }
    if (!formData.roomNumber) {
      errors.push('Room number is required');
    }

    // Validate phone numbers
    if (!/^[0-9]{10}$/.test(formData.studentPhone)) {
      errors.push('Student phone number must be 10 digits');
    }
    if (!/^[0-9]{10}$/.test(formData.parentPhone)) {
      errors.push('Parent phone number must be 10 digits');
    }

    // Validate email
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.push('Invalid email address format');
    }

    // Validate room number
    const validRooms = ROOM_MAPPINGS[formData.gender]?.[formData.category] || [];
    if (!validRooms.includes(formData.roomNumber)) {
      errors.push('Invalid room number for the selected gender and category');
    }

          // Enhanced batch validation with better error handling
      if (formData.batch) {
        // Check if batch format is valid
        if (!/^\d{4}-\d{4}$/.test(formData.batch)) {
          errors.push('Invalid batch format. Must be YYYY-YYYY (e.g., 2020-2024)');
        } else {
          const [startYear, endYear] = formData.batch.split('-').map(Number);
          
          // Basic validation
          if (startYear >= endYear) {
            errors.push('Batch start year must be before end year');
          }
          
          if (startYear < 2020 || startYear > 2030) {
            errors.push('Batch start year must be between 2020 and 2030');
          }

          const duration = endYear - startYear;
          const course = courses.find(c => c._id === formData.course);
          
          // Only validate duration if we have course data
          // For existing students, be more lenient with batch validation to avoid breaking existing data
          if (course && course.duration) {
            const expectedDuration = course.duration;
            if (duration !== expectedDuration) {
              // Show warning but don't block the update for existing students
              console.warn(`Batch duration mismatch for ${course.name}. Expected ${expectedDuration} years but got ${duration} years.`);
              // Don't add to errors array - just warn and continue
            }
          } else {
            // If course not found or duration not available, allow common durations (3-4 years)
            if (duration < 3 || duration > 4) {
              errors.push(`Invalid batch duration. Must be between 3-4 years, but got ${duration} years.`);
            }
          }
        }
      }

    return errors;
  };

  const handleEditSubmit = async e => {
    e.preventDefault();
    setEditing(true);
    
    try {
      console.log('Submitting edit form:', editForm);
      console.log('Available courses:', courses);
      
      // Find the current course to understand the expected duration
      const currentCourse = courses.find(c => c._id === editForm.course);
      console.log('Current course:', currentCourse);
      console.log('Current batch:', editForm.batch);
      
      if (currentCourse && editForm.batch) {
        const [startYear, endYear] = editForm.batch.split('-').map(Number);
        const actualDuration = endYear - startYear;
        console.log(`Course: ${currentCourse.name}, Expected duration: ${currentCourse.duration}, Actual duration: ${actualDuration}`);
        
        // If there's a duration mismatch, show a warning but don't block
        if (actualDuration !== currentCourse.duration) {
          console.warn(`Duration mismatch: Expected ${currentCourse.duration} years, got ${actualDuration} years`);
          toast.warning(`Batch duration (${actualDuration} years) doesn't match course duration (${currentCourse.duration} years). Proceeding anyway.`);
        }
      }
      
      // Validate form data
      const validationErrors = validateEditForm(editForm);
      if (validationErrors.length > 0) {
        throw new Error(validationErrors.join('. '));
      }

      // Create a clean form data object for submission
      const submitData = {
        name: editForm.name,
        rollNumber: editForm.rollNumber,
        course: editForm.course,
        year: editForm.year,
        branch: editForm.branch,
        gender: editForm.gender,
        category: editForm.category,
        roomNumber: editForm.roomNumber,
        studentPhone: editForm.studentPhone,
        parentPhone: editForm.parentPhone,
        email: editForm.email,
        batch: editForm.batch,
        academicYear: editForm.academicYear,
        hostelStatus: editForm.hostelStatus
      };

      // Temporary workaround: If the backend is expecting 3 years but we have a 4-year course,
      // we might need to adjust the batch format. Let's log this for debugging.
      if (currentCourse && editForm.batch) {
        const [startYear, endYear] = editForm.batch.split('-').map(Number);
        const actualDuration = endYear - startYear;
        
        if (actualDuration === 4 && currentCourse.duration === 4) {
          console.log('✅ Batch format matches course duration (4 years)');
        } else if (actualDuration === 3 && currentCourse.duration === 3) {
          console.log('✅ Batch format matches course duration (3 years)');
        } else {
          console.warn(`⚠️ Duration mismatch: Course expects ${currentCourse.duration} years, batch has ${actualDuration} years`);
        }
      }

      console.log('Submitting data:', submitData);

      // Update student without photos (photos are managed separately)
      await api.put(`/api/admin/students/${editId}`, submitData);
      toast.success('Student updated successfully');
      setEditModal(false);
      setEditId(null);
      fetchStudents(); // Refresh list
    } catch (err) {
      console.error('Edit student error:', err);
      console.error('Edit form data:', editForm);
      console.error('Available courses:', courses);
      
      // Enhanced error handling
      if (err.response?.status === 400) {
        const errorMessage = err.response?.data?.message || err.message;
        console.error('Backend error message:', errorMessage);
        
        if (errorMessage.includes('batch') || errorMessage.includes('duration')) {
          // Show more specific error message with suggestion
          const currentCourse = courses.find(c => c._id === editForm.course);
          const suggestedBatch = suggestBatchFormat(editForm.course, editForm.batch);
          
          if (currentCourse) {
            let errorMsg = `Batch validation failed. Course "${currentCourse.name}" requires ${currentCourse.duration} years.`;
            if (suggestedBatch) {
              errorMsg += ` Try using: ${suggestedBatch}`;
            }
            toast.error(errorMsg);
          } else {
            toast.error('Batch validation error. Please check the batch format and course duration.');
          }
        } else {
          toast.error(errorMessage);
        }
      } else {
        toast.error(err.response?.data?.message || err.message || 'Failed to update student');
      }
    } finally {
      setEditing(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => {
      const newFilters = { ...prev, [name]: value };
      
      // Reset dependent fields when parent field changes
      if (name === 'course') {
        newFilters.branch = '';
        // Fetch branches for the selected course
        fetchBranches(value);
      }
      if (name === 'gender') {
        newFilters.category = '';
        newFilters.roomNumber = '';
      }
      if (name === 'category') {
        newFilters.roomNumber = '';
      }
      
      return newFilters;
    });
    setCurrentPage(1); // Reset to first page on filter change
  };

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  // Bulk Upload Handlers
  const handleFileChange = (e) => {
    setBulkFile(e.target.files[0]);
    setBulkUploadResults(null); // Clear previous results
  };

  const handleBulkUpload = async (e) => {
    e.preventDefault();
    if (!bulkFile) {
      toast.error('Please select an Excel file to upload.');
      return;
    }
    setBulkProcessing(true);
    setBulkPreview(null);
    setBulkUploadResults(null);
    const formData = new FormData();
    formData.append('file', bulkFile);

    try {
      const res = await api.post('/api/admin/students/bulk-upload-preview', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      if (res.data.success) {
        const validStudents = res.data.data.validStudents || [];
        setBulkPreview(res.data.data);
        setEditablePreviewData(validStudents);
        setPreviewErrors(validStudents.map(validateStudentRow));
        setShowBulkPreview(true);
        toast.success('Preview loaded. Please review and edit the data.');
      } else {
        toast.error(res.data.message || 'Failed to generate preview.');
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'An error occurred during preview generation.';
      toast.error(errorMsg);
      console.error("Bulk preview error:", err.response?.data || err);
    } finally {
      setBulkProcessing(false);
    }
  };

  const handleConfirmBulkUpload = async () => {
    const hasErrors = previewErrors.some(errors => Object.keys(errors).length > 0);
    if (hasErrors) {
      toast.error('Please fix all validation errors before confirming.');
      return;
    }

    if (!editablePreviewData || editablePreviewData.length === 0) {
      toast.error('No valid students to upload.');
      return;
    }
    setBulkProcessing(true);
    setBulkUploadResults(null);

    try {
      const res = await api.post('/api/admin/students/bulk-upload-commit', { students: editablePreviewData });
      if (res.data.success) {
        const { successCount, failureCount, emailResults } = res.data.data;
        
        // Enhanced success message with email status
        let successMessage = `Bulk upload completed successfully! ${successCount} students added.`;
        
        if (emailResults) {
          const { sent, failed, errors } = emailResults;
          if (sent > 0 && failed === 0) {
            successMessage += ` All ${sent} email notifications sent successfully.`;
          } else if (sent > 0 && failed > 0) {
            successMessage += ` ${sent} emails sent, ${failed} failed. Check details below.`;
          } else if (sent === 0 && failed > 0) {
            successMessage += ` All ${failed} email notifications failed, but students were added successfully.`;
          }
        }
        
        if (failureCount > 0) {
          successMessage += ` ${failureCount} students failed to add.`;
        }
        
        toast.success(successMessage);
        setBulkUploadResults(res.data.data);
        setShowBulkPreview(false);
        setBulkPreview(null);
        setEditablePreviewData([]);
        setPreviewErrors([]);
        setEditingRow(null);
        fetchTempStudentsSummary();
        if (tab === 'list') {
          fetchStudents(true);
        }
        
        // Show warning if email failures occurred
        if (emailResults && emailResults.failed > 0) {
          toast.error(
            `${emailResults.failed} email(s) failed to send. Students can still login with their generated passwords.`,
            { duration: 6000 }
          );
        }
        
      } else {
        toast.error(res.data.message || 'Commit failed.');
      }
    } catch (err) {
      console.error('Bulk upload error:', err);
      
      // Enhanced error handling
      if (err.response?.status === 500) {
        toast.error('Server error occurred. Please try again or contact support.');
      } else if (err.response?.status === 413) {
        toast.error('File too large. Please reduce the number of students or split into smaller batches.');
      } else if (err.response?.status === 429) {
        toast.error('Too many requests. Please wait a moment and try again.');
      } else if (err.response?.data?.message) {
        toast.error(err.response.data.message);
      } else if (err.message === 'Network Error') {
        toast.error('Network connection failed. Please check your internet connection and try again.');
      } else {
        toast.error('An unexpected error occurred during bulk upload. Please try again.');
      }
    } finally {
      setBulkProcessing(false);
    }
  };

  const handleCancelPreview = () => {
    setShowBulkPreview(false);
    setBulkPreview(null);
    setEditablePreviewData([]);
    setPreviewErrors([]);
    setEditingRow(null);
    setBulkFile(null);
    if (document.getElementById('bulk-file-input')) {
      document.getElementById('bulk-file-input').value = null;
    }
  };

  const getCategoryOptions = (gender) => {
    return gender === 'Male' 
      ? ['A+', 'A', 'B+', 'B']
      : ['A+', 'A', 'B', 'C'];
  };

  const validateStudentRow = (student) => {
    const errors = {};
    const { Name, RollNumber, Gender, Course, Branch, Year, Category, RoomNumber, StudentPhone, ParentPhone, Email, Batch, AcademicYear } = student;
  
    if (!Name) errors.Name = 'Name is required.';
    if (!RollNumber) errors.RollNumber = 'Roll number is required.';
  
    if (!Gender) errors.Gender = 'Gender is required.';
    else if (!['Male', 'Female'].includes(Gender)) errors.Gender = 'Invalid gender.';
  
    if (!Course) errors.Course = 'Course is required.';
    else {
      // For bulk upload, Course might be a name string, so we need to find the course by name
      const course = courses.find(c => c.name === Course || c._id === Course);
      if (!course) errors.Course = 'Invalid course selected.';
    }
  
    if (!Branch) errors.Branch = 'Branch is required.';
    else if (Course) {
      // For bulk upload, we need to validate branch against the course
      const course = courses.find(c => c.name === Course || c._id === Course);
      if (course) {
        // This validation will be done on the backend since we don't have branches loaded for all courses
        // For now, we'll just check if branch is not empty
      }
    }
  
    if (!Year) errors.Year = 'Year is required.';
  
    if (!Category) errors.Category = 'Category is required.';
    else if (Gender && !(getCategoryOptions(Gender).includes(Category))) {
      errors.Category = `Invalid category for ${Gender}.`;
    }
  
    if (!RoomNumber) errors.RoomNumber = 'Room number is required.';
    else if (Gender && Category && ROOM_MAPPINGS[Gender]?.[Category] && !ROOM_MAPPINGS[Gender][Category].includes(String(RoomNumber))) {
      errors.RoomNumber = `Invalid room for ${Gender} - ${Category}.`;
    }
  
    if (!StudentPhone) errors.StudentPhone = 'Student phone is required.';
    else if (!/^[0-9]{10}$/.test(StudentPhone)) errors.StudentPhone = 'Must be 10 digits.';
  
    if (!ParentPhone) errors.ParentPhone = 'Parent phone is required.';
    else if (!/^[0-9]{10}$/.test(ParentPhone)) errors.ParentPhone = 'Must be 10 digits.';
  
    if (!Email) errors.Email = 'Email is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(Email)) errors.Email = 'Invalid email format.';
  
    if (!Batch) errors.Batch = 'Batch is required.';
    else if (!/^\d{4}-\d{4}$/.test(Batch)) {
      errors.Batch = 'Format must be YYYY-YYYY.';
    } else {
      const [start, end] = Batch.split('-').map(Number);
      const duration = end - start;
      const course = courses.find(c => c.name === Course || c._id === Course);
      const expectedDuration = course ? course.duration : 4;
      if (duration !== expectedDuration) {
        errors.Batch = `Duration must be ${expectedDuration} years for ${Course}.`;
      }
    }
  
    if (!AcademicYear) errors.AcademicYear = 'Academic year is required.';
    else if (!/^\d{4}-\d{4}$/.test(AcademicYear)) {
      errors.AcademicYear = 'Format must be YYYY-YYYY.';
    } else {
      const [start, end] = AcademicYear.split('-').map(Number);
      if (end !== start + 1) {
        errors.AcademicYear = 'Years must be consecutive.';
      }
    }
  
    return errors;
  };

  const handleClearTempStudents = async () => {
    if (!window.confirm('Are you sure you want to clear all temporary student records? This will remove all pending password reset students.')) {
      return;
    }
    
    try {
      const res = await api.delete('/api/admin/students/temp-clear');
      if (res.data.success) {
        toast.success(res.data.message);
        fetchTempStudentsSummary(); // Refresh the temp students list
      } else {
        toast.error(res.data.message || 'Failed to clear temporary students.');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'An error occurred while clearing temporary students.');
    }
  };

  const handleStartEdit = (index) => {
    setEditingRow(index);
  };

  const handleCancelEdit = () => {
    setEditingRow(null);
  };

  const handleSaveEdit = (index) => {
    setEditingRow(null);
    toast.success('Changes saved to preview.');
  };

  const handleEditField = (index, field, value) => {
    const updatedData = [...editablePreviewData];
    const newStudent = { ...updatedData[index], [field]: value };
    updatedData[index] = newStudent;
    setEditablePreviewData(updatedData);

    const newErrors = [...previewErrors];
    newErrors[index] = validateStudentRow(newStudent);
    setPreviewErrors(newErrors);
  };

  const handleRemoveStudent = (index) => {
    const updatedData = editablePreviewData.filter((_, i) => i !== index);
    const updatedErrors = previewErrors.filter((_, i) => i !== index);
    setEditablePreviewData(updatedData);
    setPreviewErrors(updatedErrors);
    toast.success('Student removed from preview.');
  };

  // Function to generate PDF
  const generatePDF = () => {
    if (!bulkUploadResults) return;

    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(16);
    doc.text('Bulk Upload Results', 14, 15);
    
    // Add summary
    doc.setFontSize(12);
    doc.text(`Successfully Added: ${bulkUploadResults.successCount}`, 14, 25);
    doc.text(`Failed: ${bulkUploadResults.failureCount}`, 14, 30);

    // Add successful students table
    if (bulkUploadResults.addedStudents && bulkUploadResults.addedStudents.length > 0) {
      doc.setFontSize(14);
      doc.text('Successfully Added Students', 14, 40);

      const tableData = bulkUploadResults.addedStudents.map(student => [
        student.name,
        student.rollNumber,
        student.generatedPassword
      ]);

      autoTable(doc, {
        startY: 45,
        head: [['Name', 'Roll Number', 'Generated Password']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185] },
        styles: { fontSize: 10 }
      });
    }

    // Add errors table if any
    if (bulkUploadResults.errors && bulkUploadResults.errors.length > 0) {
      const lastY = doc.lastAutoTable.finalY || 45;
      doc.setFontSize(14);
      doc.text('Failed Entries', 14, lastY + 10);

      const errorData = bulkUploadResults.errors.map(error => [
        error.row,
        error.error,
        error.details ? JSON.stringify(error.details) : ''
      ]);

      autoTable(doc, {
        startY: lastY + 15,
        head: [['Row', 'Error', 'Details']],
        body: errorData,
        theme: 'grid',
        headStyles: { fillColor: [231, 76, 60] },
        styles: { fontSize: 8 }
      });
    }

    return doc;
  };

  // Function to handle PDF download
  const handleDownloadPDF = () => {
    const doc = generatePDF();
    if (doc) {
      doc.save('bulk-upload-results.pdf');
    }
  };

  // Function to handle printing
  const handlePrint = () => {
    const doc = generatePDF();
    if (doc) {
      doc.autoPrint();
      window.open(doc.output('bloburl'), '_blank');
    }
  };

  // Function to generate PDF for pending students
  const generatePendingStudentsPDF = () => {
    if (!tempStudentsSummary || tempStudentsSummary.length === 0) return;

    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(16);
    doc.text('Students Pending Password Reset', 14, 15);
    
    // Add summary
    doc.setFontSize(12);
    doc.text(`Total Students Pending: ${tempStudentsSummary.length}`, 14, 25);

    // Add students table
    const tableData = tempStudentsSummary.map(student => [
      student.name,
      student.rollNumber,
      student.generatedPassword,
      student.studentPhone,
      new Date(student.createdAt).toLocaleDateString()
    ]);

    autoTable(doc, {
      startY: 35,
      head: [['Name', 'Roll Number', 'Generated Password', 'Phone', 'Added On']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185] },
      styles: { fontSize: 10 }
    });

    return doc;
  };

  // Function to handle PDF download for pending students
  const handleDownloadPendingPDF = () => {
    const doc = generatePendingStudentsPDF();
    if (doc) {
      doc.save('pending-password-reset-students.pdf');
    }
  };

  // Function to handle printing for pending students
  const handlePrintPending = () => {
    const doc = generatePendingStudentsPDF();
    if (doc) {
      doc.autoPrint();
      window.open(doc.output('bloburl'), '_blank');
    }
  };

  const renderAddStudentForm = () => (
    <div className="max-w-6xl mx-auto bg-white rounded-xl shadow-md p-4 sm:p-6">
      <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-blue-800">Add New Student</h2>
      <form onSubmit={handleAddStudent} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleFormChange}
              required
              className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Roll Number</label>
            <input
              type="text"
              name="rollNumber"
              value={form.rollNumber}
              onChange={handleFormChange}
              required
              pattern="[A-Z0-9]+"
              title="Uppercase letters and numbers only"
              className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 uppercase"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
            <select
              name="gender"
              value={form.gender}
              onChange={handleFormChange}
              required
              className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select Gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Course</label>
            <select
              name="course"
              value={form.course}
              onChange={handleFormChange}
              required
              disabled={loadingCourses}
              className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">{loadingCourses ? 'Loading courses...' : 'Select Course'}</option>
              {courses.map(course => (
                <option key={course._id} value={course._id}>
                  {course.name} ({course.code})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
            <select
              name="year"
              value={form.year}
              onChange={handleFormChange}
              required
              disabled={!form.course}
              className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select Year</option>
              {form.course && Array.from(
                { length: getCourseDuration(form.course) },
                (_, i) => i + 1
              ).map(year => (
                <option key={year} value={year}>Year {year}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
            <select
              name="branch"
              value={form.branch}
              onChange={handleFormChange}
              required
              disabled={!form.course || loadingBranches}
              className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">{loadingBranches ? 'Loading branches...' : 'Select Branch'}</option>
              {(() => {
                console.log('🎯 Rendering branch dropdown with', branches.length, 'branches');
                return branches.map(branch => (
                  <option key={branch._id} value={branch._id}>
                    {branch.name} ({branch.code})
                  </option>
                ));
              })()}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              name="category"
              value={form.category}
              onChange={handleFormChange}
              required
              disabled={!form.gender}
              className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select Category</option>
              {form.gender && (form.gender === 'Male' 
                ? ['A+', 'A', 'B+', 'B'].map(category => (
                    <option key={category} value={category}>
                      {category === 'A+' ? 'A+ (AC)' : category === 'B+' ? 'B+ (AC)' : category}
                    </option>
                  ))
                : ['A+', 'A', 'B', 'C'].map(category => (
                    <option key={category} value={category}>
                      {category === 'A+' ? 'A+ (AC)' : category}
                    </option>
                  ))
              )}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Room Number</label>
            <select
              name="roomNumber"
              value={form.roomNumber}
              onChange={handleFormChange}
              required
              disabled={!form.gender || !form.category}
              className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select Room</option>
              {form.gender && form.category && ROOM_MAPPINGS[form.gender][form.category].map(room => (
                <option key={room} value={room}>Room {room}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Student Phone</label>
            <input
              type="tel"
              name="studentPhone"
              value={form.studentPhone}
              onChange={handleFormChange}
              required
              pattern="[0-9]{10}"
              title="10 digit phone number"
              className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Parent Phone</label>
            <input
              type="tel"
              name="parentPhone"
              value={form.parentPhone}
              onChange={handleFormChange}
              required
              pattern="[0-9]{10}"
              title="10 digit phone number"
              className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleFormChange}
              required
              className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Batch</label>
              <select
                name="batch"
                value={form.batch}
                onChange={handleFormChange}
                required
                disabled={!form.course}
                className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select Batch</option>
                {form.course && generateBatches(form.course, courses).map(batch => (
                  <option key={batch} value={batch}>{batch}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Academic Year</label>
              <select
                name="academicYear"
                value={form.academicYear}
                onChange={handleFormChange}
                required
                className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select Academic Year</option>
                {generateAcademicYears().map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
        
        {/* Photo Upload Section */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Profile Photos (Optional)</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Student Photo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Student Photo</label>
              <div className="flex items-center justify-center w-full">
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    {studentPhotoPreview ? (
                      <div className="relative">
                        <img src={studentPhotoPreview} alt="Preview" className="mx-auto h-20 w-auto object-cover rounded-lg" />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            setStudentPhoto(null);
                            setStudentPhotoPreview(null);
                          }}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                        >
                          <XCircleIcon className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <PhotoIcon className="w-8 h-8 mb-2 text-gray-400" />
                        <p className="text-sm text-gray-500">Click to upload</p>
                      </>
                    )}
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => handlePhotoChange(e, 'student')}
                  />
                </label>
              </div>
            </div>

            {/* Guardian Photo 1 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Guardian Photo 1</label>
              <div className="flex items-center justify-center w-full">
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    {guardianPhoto1Preview ? (
                      <div className="relative">
                        <img src={guardianPhoto1Preview} alt="Preview" className="mx-auto h-20 w-auto object-cover rounded-lg" />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            setGuardianPhoto1(null);
                            setGuardianPhoto1Preview(null);
                          }}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                        >
                          <XCircleIcon className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <PhotoIcon className="w-8 h-8 mb-2 text-gray-400" />
                        <p className="text-sm text-gray-500">Click to upload</p>
                      </>
                    )}
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => handlePhotoChange(e, 'guardian1')}
                  />
                </label>
              </div>
            </div>

            {/* Guardian Photo 2 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Guardian Photo 2</label>
              <div className="flex items-center justify-center w-full">
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    {guardianPhoto2Preview ? (
                      <div className="relative">
                        <img src={guardianPhoto2Preview} alt="Preview" className="mx-auto h-20 w-auto object-cover rounded-lg" />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            setGuardianPhoto2(null);
                            setGuardianPhoto2Preview(null);
                          }}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                        >
                          <XCircleIcon className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <PhotoIcon className="w-8 h-8 mb-2 text-gray-400" />
                        <p className="text-sm text-gray-500">Click to upload</p>
                      </>
                    )}
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => handlePhotoChange(e, 'guardian2')}
                  />
                </label>
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">Maximum file size: 5MB. Supported formats: JPG, PNG, GIF</p>
        </div>
        
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={adding}
            className={`px-4 sm:px-6 py-2 rounded-lg text-white font-medium transition-all duration-200 text-sm sm:text-base ${
              adding 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg'
            }`}
          >
            {adding ? 'Adding...' : 'Add Student'}
          </button>
        </div>
      </form>
    </div>
  );

  const renderStudentList = () => {
    if (loading) {
      return (
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner />
        </div>
      );
    }

    if (error && !tableLoading) {
      return <div className="text-center text-red-600 py-4">{error}</div>;
    }

    const countsByCourse = students.reduce((acc, student) => {
      const courseName = student.course?.name || getCourseName(student.course);
      acc[courseName] = (acc[courseName] || 0) + 1;
      return acc;
    }, {});

    const countsByBatch = students.reduce((acc, student) => {
      acc[student.batch] = (acc[student.batch] || 0) + 1;
      return acc;
    }, {});

    return (
      <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800">All Students</h2>
            <div className="flex items-center gap-2 mt-2 sm:mt-0">
              <button
                onClick={() => setRenewalModalOpen(true)}
                className="px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Renew Batches
              </button>
              <span className="text-sm text-gray-600">
                Showing {students.length} of {totalStudents} students
                {Object.entries(filters).some(([key, value]) => value && key !== 'search') && ' (filtered)'}
              </span>
            </div>
          </div>

          {/* Count Display - Made responsive */}
          <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Students by Course</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {Object.entries(countsByCourse).map(([course, count]) => (
                  <div key={course} className="flex justify-between items-center bg-white p-2 rounded">
                    <span className="text-sm text-gray-600 truncate">{course}</span>
                    <span className="text-sm font-medium text-gray-900 ml-2">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Students by Batch</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {Object.entries(countsByBatch).map(([batch, count]) => (
                  <div key={batch} className="flex justify-between items-center bg-white p-2 rounded">
                    <span className="text-sm text-gray-600 truncate">{batch}</span>
                    <span className="text-sm font-medium text-gray-900 ml-2">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Filters - Made responsive */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            <div className="sm:col-span-2">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MagnifyingGlassIcon className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search by name or roll..."
                  name="search"
                  value={filters.search}
                  onChange={handleFilterChange}
                  className="w-full pl-9 sm:pl-10 pr-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div>
              <select
                name="course"
                value={filters.course}
                onChange={handleFilterChange}
                disabled={loadingCourses}
                className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">{loadingCourses ? 'Loading courses...' : 'All Courses'}</option>
                {courses.map(course => (
                  <option key={course._id} value={course._id}>
                    {course.name} ({course.code})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <select
                name="branch"
                value={filters.branch}
                onChange={handleFilterChange}
                disabled={!filters.course || loadingBranches}
                className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">{loadingBranches ? 'Loading branches...' : 'All Branches'}</option>
                {branches.map(branch => (
                  <option key={branch._id} value={branch._id}>
                    {branch.name} ({branch.code})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <select
                name="gender"
                value={filters.gender}
                onChange={handleFilterChange}
                className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Genders</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
            <div>
              <select
                name="category"
                value={filters.category}
                onChange={handleFilterChange}
                disabled={!filters.gender}
                className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Categories</option>
                {filters.gender && (filters.gender === 'Male' 
                  ? ['A+', 'A', 'B+', 'B'].map(category => (
                      <option key={category} value={category}>
                        {category === 'A+' ? 'A+ (AC)' : category === 'B+' ? 'B+ (AC)' : category}
                      </option>
                    ))
                  : ['A+', 'A', 'B', 'C'].map(category => (
                      <option key={category} value={category}>
                        {category === 'A+' ? 'A+ (AC)' : category}
                      </option>
                    ))
                )}
              </select>
            </div>
            <div>
              <select
                name="roomNumber"
                value={filters.roomNumber}
                onChange={handleFilterChange}
                disabled={!filters.gender || !filters.category}
                className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Rooms</option>
                {filters.gender && filters.category && ROOM_MAPPINGS[filters.gender][filters.category].map(room => (
                  <option key={room} value={room}>Room {room}</option>
                ))}
              </select>
            </div>
            <div>
              <select
                name="batch"
                value={filters.batch}
                onChange={handleFilterChange}
                className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Batches</option>
                {filters.course && generateBatches(filters.course, courses).map(batch => (
                  <option key={batch} value={batch}>{batch}</option>
                ))}
                {!filters.course && BATCHES.map(batch => (
                  <option key={batch} value={batch}>{batch}</option>
                ))}
              </select>
            </div>
            <div>
              <select
                name="academicYear"
                value={filters.academicYear}
                onChange={handleFilterChange}
                className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Academic Years</option>
                {generateAcademicYears().map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
            <div>
              <select
                name="hostelStatus"
                value={filters.hostelStatus}
                onChange={handleFilterChange}
                className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Status</option>
                <option value="Active">Active Students</option>
                <option value="Inactive">Inactive Students</option>
              </select>
            </div>
          </div>

          {/* Active Filters - Made responsive */}
          <div className="mt-4">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  setFilters({
                    search: '',
                    course: '',
                    branch: '',
                    gender: '',
                    category: '',
                    roomNumber: '',
                    batch: '',
                    academicYear: '',
                    hostelStatus: 'Active'
                  });
                  setCurrentPage(1);
                }}
                className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Clear Filters
              </button>
              <div className="flex flex-wrap gap-2">
                {Object.entries(filters).map(([key, value]) => {
                  if (value && key !== 'search') {
                    return (
                      <span
                        key={key}
                        className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-full flex items-center gap-1"
                      >
                        {key}: {value}
                        <button
                          onClick={() => {
                            setFilters(prev => ({ ...prev, [key]: '' }));
                            setCurrentPage(1);
                          }}
                          className="ml-1 text-blue-500 hover:text-blue-700"
                        >
                          ×
                        </button>
                      </span>
                    );
                  }
                  return null;
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Table - Made responsive */}
        <div className="relative">
          {tableLoading && (
            <div className="absolute inset-0 bg-white bg-opacity-75 flex justify-center items-center z-10 rounded-b-xl">
              <LoadingSpinner />
            </div>
          )}
          {error && !students.length && !tableLoading && (
            <div className="text-center text-red-600 py-10">{error}</div>
          )}
          {!error && !tableLoading && students.length === 0 && (
            <div className="text-center text-gray-500 py-10">No students found matching your criteria.</div>
          )}
          {(!tableLoading || students.length > 0) && students.length > 0 && (
            <>
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <div className="inline-block min-w-full align-middle">
                  <div className="overflow-hidden shadow-sm ring-1 ring-black ring-opacity-5">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-3 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Photo</th>
                          <th scope="col" className="px-3 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                          <th scope="col" className="px-3 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Roll Number</th>
                          <th scope="col" className="hidden sm:table-cell px-3 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gender</th>
                          <th scope="col" className="hidden md:table-cell px-3 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Course</th>
                          <th scope="col" className="hidden lg:table-cell px-3 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Year</th>
                          <th scope="col" className="hidden lg:table-cell px-3 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Branch</th>
                          <th scope="col" className="hidden md:table-cell px-3 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                          <th scope="col" className="hidden sm:table-cell px-3 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Room</th>
                          <th scope="col" className="hidden xl:table-cell px-3 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                          <th scope="col" className="hidden lg:table-cell px-3 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Batch</th>
                          <th scope="col" className="hidden md:table-cell px-3 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          <th scope="col" className="px-3 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {students.map(student => (
                          <tr key={student._id} className="hover:bg-gray-50">
                            <td className="px-3 py-4 whitespace-nowrap">
                              {student.studentPhoto ? (
                                <button
                                  onClick={() => openPhotoEditModal(student)}
                                  className="w-8 h-8 rounded-full overflow-hidden border border-gray-200 hover:border-blue-400 hover:shadow-md transition-all duration-200 cursor-pointer"
                                  title="Click to edit photos"
                                >
                                  <img
                                    src={student.studentPhoto}
                                    alt={student.name}
                                    className="w-full h-full object-cover"
                                  />
                                </button>
                              ) : (
                                <button
                                  onClick={() => openPhotoEditModal(student)}
                                  className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center text-white text-xs font-bold hover:from-blue-700 hover:to-blue-900 hover:shadow-md transition-all duration-200 cursor-pointer"
                                  title="Click to add photos"
                                >
                                  {student.name?.charAt(0).toUpperCase()}
                                </button>
                              )}
                            </td>
                            <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">{student.name}</td>
                            <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">{student.rollNumber}</td>
                            <td className="hidden sm:table-cell px-3 py-4 whitespace-nowrap text-sm text-gray-500">{student.gender}</td>
                            <td className="hidden md:table-cell px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                              {student.course?.name || getCourseName(student.course)}
                            </td>
                            <td className="hidden lg:table-cell px-3 py-4 whitespace-nowrap text-sm text-gray-500">Year {student.year}</td>
                            <td className="hidden lg:table-cell px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                              {student.branch?.name || getBranchName(student.branch)}
                            </td>
                            <td className="hidden md:table-cell px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                              {student.category === 'A+' ? 'A+ (AC)' : student.category === 'B+' ? 'B+ (AC)' : student.category}
                            </td>
                            <td className="hidden sm:table-cell px-3 py-4 whitespace-nowrap text-sm text-gray-500">Room {student.roomNumber}</td>
                            <td className="hidden xl:table-cell px-3 py-4 whitespace-nowrap text-sm text-gray-500">{student.studentPhone}</td>
                            <td className="hidden lg:table-cell px-3 py-4 whitespace-nowrap text-sm text-gray-500">{student.batch}</td>
                            <td className="hidden md:table-cell px-3 py-4 whitespace-nowrap text-sm">
                              <div className="flex flex-col gap-1">
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                  student.hostelStatus === 'Active' 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-red-100 text-red-800'
                                }`}>
                                  {student.hostelStatus}
                                </span>
                                {student.graduationStatus && (
                                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                    student.graduationStatus === 'Graduated' 
                                      ? 'bg-blue-100 text-blue-800' 
                                      : student.graduationStatus === 'Dropped'
                                      ? 'bg-gray-100 text-gray-800'
                                      : 'bg-yellow-100 text-yellow-800'
                                  }`}>
                                    {student.graduationStatus}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-4 whitespace-nowrap text-sm">
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => openEditModal(student)}
                                  className="p-1.5 text-blue-600 hover:text-blue-800 rounded-lg hover:bg-blue-50 transition-colors"
                                >
                                  <PencilSquareIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                                </button>
                                <button
                                  onClick={() => handleDelete(student._id)}
                                  disabled={deletingId === student._id}
                                  className="p-1.5 text-red-600 hover:text-red-800 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                                >
                                  <TrashIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
              
              {/* Pagination - Made responsive */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center space-x-2 mt-6">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1 || tableLoading}
                    className="p-1.5 sm:p-2 rounded-lg border border-gray-300 disabled:opacity-50 hover:bg-gray-50 transition-colors"
                  >
                    <ChevronLeftIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                  <span className="text-sm text-gray-600">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages || tableLoading}
                    className="p-1.5 sm:p-2 rounded-lg border border-gray-300 disabled:opacity-50 hover:bg-gray-50 transition-colors"
                  >
                    <ChevronRightIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  };

  // Password Modal
  const renderPasswordModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
        <h3 className="text-xl font-bold text-gray-800 mb-4">Student Added Successfully</h3>
        
        {/* Email Status
        {generatedPassword && (
          <div className={`mb-4 p-3 rounded-lg ${
            generatedPassword.emailSent 
              ? 'bg-green-50 border border-green-200' 
              : 'bg-yellow-50 border border-yellow-200'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              {generatedPassword.emailSent ? (
                <>
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span className="text-green-800 font-medium">Email Sent Successfully</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <span className="text-yellow-800 font-medium">Email Not Sent</span>
                </>
              )}
            </div>
            {generatedPassword.emailError && (
              <p className="text-sm text-yellow-700">Error: {generatedPassword.emailError}</p>
            )}
            <p className="text-sm text-gray-600">
              {generatedPassword.emailSent 
                ? 'The student has been notified via email with their login credentials.'
                : 'The student was added successfully, but the email notification failed. You can manually share the password below.'
              }
            </p>
          </div>
        )} */}
        
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-yellow-800 font-medium">Generated Password:</p>
            <button
              onClick={() => {
                navigator.clipboard.writeText(generatedPassword);
                toast.success('Password copied to clipboard!');
              }}
              className="flex items-center gap-1 px-3 py-1 text-sm bg-yellow-100 hover:bg-yellow-200 text-yellow-800 rounded-md transition-colors duration-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
              </svg>
              Copy
            </button>
          </div>
          <p className="text-2xl font-mono bg-yellow-100 p-2 rounded text-center select-all">{generatedPassword}</p>
          <p className="text-sm text-yellow-700 mt-2">
            Please save this password securely. It will be needed for the student's first login.
          </p>
        </div>
        <div className="flex justify-end">
          <button
            onClick={() => {
              setShowPasswordModal(false);
              setGeneratedPassword(null);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );

  // Edit Modal
  const renderEditModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-4 sm:p-6 w-full max-w-sm sm:max-w-4xl mx-auto max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-xl font-bold text-gray-800">Edit Student</h3>
            <p className="text-sm text-gray-600 mt-1">Update student information</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => openPasswordResetModal({ _id: editId, name: editForm.name, rollNumber: editForm.rollNumber })}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
              Reset Password
            </button>
            <button
              onClick={() => {
                setEditModal(false);
              }}
              className="text-gray-500 hover:text-gray-700 p-2"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
        </div>

        <form onSubmit={handleEditSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="block text-xs sm:text-sm font-medium text-gray-700">Name</label>
              <input
                type="text"
                name="name"
                value={editForm.name}
                onChange={handleEditFormChange}
                required
                className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs sm:text-sm font-medium text-gray-700">Roll Number</label>
              <input
                type="text"
                name="rollNumber"
                value={editForm.rollNumber}
                onChange={handleEditFormChange}
                required
                className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs sm:text-sm font-medium text-gray-700">Course</label>
              <select
                name="course"
                value={editForm.course}
                onChange={handleEditFormChange}
                required
                disabled={loadingCourses}
                className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">{loadingCourses ? 'Loading courses...' : 'Select Course'}</option>
                {courses.map(course => (
                  <option key={course._id} value={course._id}>
                    {course.name} ({course.code})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="block text-xs sm:text-sm font-medium text-gray-700">Year</label>
              <input
                type="number"
                name="year"
                value={editForm.year}
                onChange={handleEditFormChange}
                required
                min={1}
                max={4}
                className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs sm:text-sm font-medium text-gray-700">Branch</label>
              <select
                name="branch"
                value={editForm.branch}
                onChange={handleEditFormChange}
                required
                disabled={!editForm.course || loadingBranches}
                className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">{loadingBranches ? 'Loading branches...' : 'Select Branch'}</option>
                {branches.map(branch => (
                  <option key={branch._id} value={branch._id}>
                    {branch.name} ({branch.code})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="block text-xs sm:text-sm font-medium text-gray-700">Gender</label>
              <select
                name="gender"
                value={editForm.gender}
                onChange={handleEditFormChange}
                required
                className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="block text-xs sm:text-sm font-medium text-gray-700">Category</label>
              <select
                name="category"
                value={editForm.category}
                onChange={handleEditFormChange}
                required
                className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select Category</option>
                {editForm.gender && getCategoryOptions(editForm.gender).map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="block text-xs sm:text-sm font-medium text-gray-700">Room Number</label>
              <select
                name="roomNumber"
                value={editForm.roomNumber}
                onChange={handleEditFormChange}
                required
                disabled={!editForm.category}
                className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select Room</option>
                {editForm.category && ROOM_MAPPINGS[editForm.gender]?.[editForm.category]?.map(room => (
                  <option key={room} value={room}>{room}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="block text-xs sm:text-sm font-medium text-gray-700">Student Phone</label>
              <input
                type="tel"
                name="studentPhone"
                value={editForm.studentPhone}
                onChange={handleEditFormChange}
                required
                pattern="[0-9]{10}"
                className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs sm:text-sm font-medium text-gray-700">Parent Phone</label>
              <input
                type="tel"
                name="parentPhone"
                value={editForm.parentPhone}
                onChange={handleEditFormChange}
                required
                pattern="[0-9]{10}"
                className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs sm:text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                name="email"
                value={editForm.email}
                onChange={handleEditFormChange}
                required
                className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs sm:text-sm font-medium text-gray-700">Batch</label>
              <select
                name="batch"
                value={editForm.batch}
                onChange={handleEditFormChange}
                required
                disabled={!editForm.course}
                className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select Batch</option>
                {editForm.course && generateBatches(editForm.course, courses).map(batch => (
                  <option key={batch} value={batch}>{batch}</option>
                ))}
              </select>
              {editForm.course && (() => {
                const course = courses.find(c => c._id === editForm.course);
                return course ? (
                  <p className="text-xs text-gray-500 mt-1">
                    Format: YYYY-YYYY (e.g., 2020-{2020 + course.duration}) for {course.name} ({course.duration} years)
                  </p>
                ) : null;
              })()}
            </div>
            <div className="space-y-1">
              <label className="block text-xs sm:text-sm font-medium text-gray-700">Academic Year</label>
              <select
                name="academicYear"
                value={editForm.academicYear}
                onChange={handleEditFormChange}
                required
                className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select Academic Year</option>
                {generateAcademicYears().map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="block text-xs sm:text-sm font-medium text-gray-700">Hostel Status</label>
              <select
                name="hostelStatus"
                value={editForm.hostelStatus || 'Active'}
                onChange={handleEditFormChange}
                required
                className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 pt-2 sm:pt-4">
            <button
              type="button"
              onClick={() => {
                setEditModal(false);
              }}
              className="w-full sm:w-auto px-3 sm:px-4 py-1.5 sm:py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={editing}
              className={`w-full sm:w-auto px-3 sm:px-4 py-1.5 sm:py-2 text-sm rounded-lg text-white font-medium transition-colors ${
                editing 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {editing ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  // Update the bulk upload section
  const renderBulkUploadSection = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-blue-50">
            <ArrowUpTrayIcon className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Bulk Upload Students</h2>
            <p className="text-sm text-gray-500">Upload multiple students using an Excel file</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - File Upload */}
          <div className="space-y-4">
            <div className="flex items-center justify-center w-full">
              <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <ArrowUpTrayIcon className="w-8 h-8 mb-4 text-gray-500" />
                  <p className="mb-2 text-sm text-gray-500">
                    <span className="font-semibold">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-gray-500">Excel file (.xlsx, .xls)</p>
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept=".xlsx,.xls"
                  onChange={handleFileChange}
                />
              </label>
            </div>

            {bulkFile && (
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <DocumentArrowDownIcon className="w-5 h-5 text-gray-500" />
                  <span className="text-sm text-gray-700">{bulkFile.name}</span>
                </div>
                <button
                  onClick={() => setBulkFile(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
            )}

            <button
              onClick={handleBulkUpload}
              disabled={!bulkFile || bulkProcessing}
              className={`w-full py-2 px-4 rounded-lg text-white font-medium transition-all duration-200 ${
                !bulkFile || bulkProcessing
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {bulkProcessing ? (
                <div className="flex items-center justify-center gap-2">
                  <LoadingSpinner size="sm" className="border-white" />
                  <span>Uploading...</span>
                </div>
              ) : (
                'Upload Students'
              )}
            </button>
          </div>

          {/* Right Column - Instructions */}
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-medium text-blue-800">Required Excel Columns:</h3>
                <a
                  href="/Updated_Student_Data.xlsx"
                  download
                  className="flex items-center px-3 py-1.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <DocumentArrowDownIcon className="w-4 h-4 mr-1.5" />
                  Download Sample
                </a>
              </div>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Name (Student's full name)</li>
                <li>• RollNumber (Unique roll number)</li>
                <li>• Gender (Male/Female)</li>
                <li>• Course (B.Tech/Diploma/Pharmacy/Degree)</li>
                <li>• Branch (Based on course)</li>
                <li>• Year (1-4 for B.Tech/Pharmacy, 1-3 for others)</li>
                <li>• Category (A+/A/B+/B for Male, A+/A/B/C for Female)</li>
                <li>• RoomNumber (Based on gender and category)</li>
                <li>• StudentPhone (10-digit mobile number)</li>
                <li>• ParentPhone (10-digit mobile number)</li>
                <li>• Email (Valid email address)</li>
                <li>• Batch (Format based on course duration):
                  <ul className="ml-4 mt-1 space-y-1">
                    <li>- B.Tech/Pharmacy: YYYY-YYYY (4 years, e.g., 2020-2024)</li>
                    <li>- Diploma/Degree: YYYY-YYYY (3 years, e.g., 2020-2023)</li>
                  </ul>
                </li>
                <li>• AcademicYear (e.g., 2023-2024)</li>
              </ul>
            </div>

            <div className="bg-yellow-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-yellow-800 mb-2">Batch Validation Rules:</h3>
              <ul className="text-sm text-yellow-700 space-y-1">
                <li>• B.Tech/Pharmacy batches must be 4 years (e.g., 2020-2024)</li>
                <li>• Diploma/Degree batches must be 3 years (e.g., 2020-2023)</li>
                <li>• Batch end year must match course duration</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Preview Section */}
      {showBulkPreview && bulkPreview && (
        <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload Preview - Editable</h3>
          
          {/* Debug Information */}
          {bulkPreview.debug && (
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <h4 className="text-md font-medium text-blue-800 mb-2">Debug Information</h4>
              <p className="text-sm text-blue-700">Total Rows: {bulkPreview.debug.totalRows}</p>
              <p className="text-sm text-blue-700">Available Columns: {bulkPreview.debug.firstRowColumns.join(', ')}</p>
              <details className="mt-2">
                <summary className="text-sm text-blue-700 cursor-pointer">First Row Data</summary>
                <pre className="text-xs text-blue-600 mt-1 bg-blue-100 p-2 rounded overflow-auto">
                  {JSON.stringify(bulkPreview.debug.firstRowData, null, 2)}
                </pre>
              </details>
            </div>
          )}

          {/* Editable Students Table */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-md font-medium text-green-700">Students to Upload ({editablePreviewData.length})</h4>
              <div className="text-sm text-gray-500">
                Click on any cell to edit • Changes are saved automatically
              </div>
            </div>
            
            {editablePreviewData.length > 0 ? (
              <div className="overflow-x-auto border rounded-lg">
                <table className="min-w-[1500px] divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                      <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Row</th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Name</th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Roll Number</th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Gender</th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Course</th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Branch</th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Year</th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Category</th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Room</th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Student Phone</th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Parent Phone</th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Email</th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Batch</th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Academic Year</th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {editablePreviewData.map((student, index) => {
                      const errors = previewErrors[index] || {};
                      return (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-2 py-2 whitespace-nowrap text-sm text-gray-700 font-medium align-top">
                            {index + 2}
                          </td>
                          <td className="px-2 py-2 whitespace-nowrap text-sm align-top">
                            <input
                              type="text"
                              value={student.Name || ''}
                              onChange={(e) => handleEditField(index, 'Name', e.target.value)}
                              title={errors.Name}
                              className={`w-full px-2 py-1 text-sm border rounded focus:ring-1 focus:ring-blue-500 ${errors.Name ? 'border-red-500' : 'border-gray-300'}`}
                            />
                          </td>
                          <td className="px-2 py-2 whitespace-nowrap text-sm align-top">
                            <input
                              type="text"
                              value={student.RollNumber || ''}
                              onChange={(e) => handleEditField(index, 'RollNumber', e.target.value)}
                              title={errors.RollNumber}
                              className={`w-full px-2 py-1 text-sm border rounded focus:ring-1 focus:ring-blue-500 ${errors.RollNumber ? 'border-red-500' : 'border-gray-300'}`}
                            />
                          </td>
                          <td className="px-2 py-2 whitespace-nowrap text-sm align-top">
                            <select
                              value={student.Gender || ''}
                              onChange={(e) => handleEditField(index, 'Gender', e.target.value)}
                              title={errors.Gender}
                              className={`w-full px-2 py-1 text-sm border rounded focus:ring-1 focus:ring-blue-500 ${errors.Gender ? 'border-red-500' : 'border-gray-300'}`}
                            >
                              <option value="">Select</option>
                              <option value="Male">Male</option>
                              <option value="Female">Female</option>
                            </select>
                          </td>
                          <td className="px-2 py-2 whitespace-nowrap text-sm align-top">
                            <select
                              value={student.Course || ''}
                              onChange={(e) => handleEditField(index, 'Course', e.target.value)}
                              title={errors.Course}
                              className={`w-full px-2 py-1 text-sm border rounded focus:ring-1 focus:ring-blue-500 ${errors.Course ? 'border-red-500' : 'border-gray-300'}`}
                            >
                              <option value="">Select</option>
                              {courses.map(course => (
                                <option key={course._id} value={course.name}>
                                  {course.name} ({course.code})
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-2 py-2 whitespace-nowrap text-sm align-top">
                            <input
                              type="text"
                              value={student.Branch || ''}
                              onChange={(e) => handleEditField(index, 'Branch', e.target.value)}
                              title={errors.Branch}
                              className={`w-full px-2 py-1 text-sm border rounded focus:ring-1 focus:ring-blue-500 ${errors.Branch ? 'border-red-500' : 'border-gray-300'}`}
                              placeholder="Enter branch name"
                            />
                          </td>
                          <td className="px-2 py-2 whitespace-nowrap text-sm align-top">
                            <select
                              value={student.Year || ''}
                              onChange={(e) => handleEditField(index, 'Year', e.target.value)}
                              title={errors.Year}
                              className={`w-full px-2 py-1 text-sm border rounded focus:ring-1 focus:ring-blue-500 ${errors.Year ? 'border-red-500' : 'border-gray-300'}`}
                            >
                              <option value="">Select</option>
                              {student.Course && (() => {
                                const course = courses.find(c => c.name === student.Course);
                                const duration = course ? course.duration : 4;
                                return Array.from({ length: duration }, (_, i) => i + 1).map(year => (
                                  <option key={year} value={year}>Year {year}</option>
                                ));
                              })()}
                            </select>
                          </td>
                          <td className="px-2 py-2 whitespace-nowrap text-sm align-top">
                            <select
                              value={student.Category || ''}
                              onChange={(e) => handleEditField(index, 'Category', e.target.value)}
                              title={errors.Category}
                              className={`w-full px-2 py-1 text-sm border rounded focus:ring-1 focus:ring-blue-500 ${errors.Category ? 'border-red-500' : 'border-gray-300'}`}
                            >
                              <option value="">Select</option>
                              {student.Gender && getCategoryOptions(student.Gender).map(category => (
                                <option key={category} value={category}>{category}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-2 py-2 whitespace-nowrap text-sm align-top">
                            <select
                              value={student.RoomNumber || ''}
                              onChange={(e) => handleEditField(index, 'RoomNumber', e.target.value)}
                              title={errors.RoomNumber}
                              className={`w-full px-2 py-1 text-sm border rounded focus:ring-1 focus:ring-blue-500 ${errors.RoomNumber ? 'border-red-500' : 'border-gray-300'}`}
                            >
                              <option value="">Select</option>
                              {student.Gender && student.Category && ROOM_MAPPINGS[student.Gender]?.[student.Category]?.map(room => (
                                <option key={room} value={room}>Room {room}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-2 py-2 whitespace-nowrap text-sm align-top">
                            <input
                              type="tel"
                              value={student.StudentPhone || ''}
                              onChange={(e) => handleEditField(index, 'StudentPhone', e.target.value)}
                              title={errors.StudentPhone}
                              className={`w-full px-2 py-1 text-sm border rounded focus:ring-1 focus:ring-blue-500 ${errors.StudentPhone ? 'border-red-500' : 'border-gray-300'}`}
                              placeholder="10 digits"
                            />
                          </td>
                          <td className="px-2 py-2 whitespace-nowrap text-sm align-top">
                            <input
                              type="tel"
                              value={student.ParentPhone || ''}
                              onChange={(e) => handleEditField(index, 'ParentPhone', e.target.value)}
                              title={errors.ParentPhone}
                              className={`w-full px-2 py-1 text-sm border rounded focus:ring-1 focus:ring-blue-500 ${errors.ParentPhone ? 'border-red-500' : 'border-gray-300'}`}
                              placeholder="10 digits"
                            />
                          </td>
                          <td className="px-2 py-2 whitespace-nowrap text-sm align-top">
                            <input
                              type="text"
                              value={student.Email || ''}
                              onChange={(e) => handleEditField(index, 'Email', e.target.value)}
                              title={errors.Email}
                              className={`w-full px-2 py-1 text-sm border rounded focus:ring-1 focus:ring-blue-500 ${errors.Email ? 'border-red-500' : 'border-gray-300'}`}
                              placeholder="example@example.com"
                            />
                          </td>
                          <td className="px-2 py-2 whitespace-nowrap text-sm align-top">
                            <input
                              type="text"
                              value={student.Batch || ''}
                              onChange={(e) => handleEditField(index, 'Batch', e.target.value)}
                              title={errors.Batch}
                              className={`w-full px-2 py-1 text-sm border rounded focus:ring-1 focus:ring-blue-500 ${errors.Batch ? 'border-red-500' : 'border-gray-300'}`}
                              placeholder="YYYY-YYYY"
                            />
                          </td>
                          <td className="px-2 py-2 whitespace-nowrap text-sm align-top">
                            <input
                              type="text"
                              value={student.AcademicYear || ''}
                              onChange={(e) => handleEditField(index, 'AcademicYear', e.target.value)}
                              title={errors.AcademicYear}
                              className={`w-full px-2 py-1 text-sm border rounded focus:ring-1 focus:ring-blue-500 ${errors.AcademicYear ? 'border-red-500' : 'border-gray-300'}`}
                              placeholder="YYYY-YYYY"
                            />
                          </td>
                          <td className="px-2 py-2 whitespace-nowrap text-sm align-top">
                            <button
                              onClick={() => handleRemoveStudent(index)}
                              className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50"
                              title="Remove student"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : <p className="text-sm text-gray-500">No valid students found in the file.</p>}
          </div>

          {/* Invalid Students */}
          {bulkPreview.invalidStudents && bulkPreview.invalidStudents.length > 0 && (
            <div className="mb-6">
              <h4 className="text-md font-medium text-red-700 mb-2">Invalid Students ({bulkPreview.invalidStudents.length})</h4>
              <div className="max-h-80 overflow-y-auto border rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-red-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-red-800 uppercase">Row</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-red-800 uppercase">Name</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-red-800 uppercase">Roll Number</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-red-800 uppercase">Errors</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {bulkPreview.invalidStudents.map((item, index) => (
                      <tr key={index}>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">{item.row}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">{item.data.Name}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">{item.data.RollNumber}</td>
                        <td className="px-4 py-2 text-sm text-red-600">
                          <ul className="list-disc list-inside">
                            {item.errors.map((err, i) => <li key={i}>{err}</li>)}
                          </ul>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 mt-4">
            <button
              onClick={handleCancelPreview}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmBulkUpload}
              disabled={bulkProcessing || editablePreviewData.length === 0 || previewErrors.some(e => Object.keys(e).length > 0)}
              className={`px-4 py-2 text-white rounded-lg transition-colors ${
                (bulkProcessing || editablePreviewData.length === 0 || previewErrors.some(e => Object.keys(e).length > 0))
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {bulkProcessing ? 'Uploading...' : `Confirm and Add ${editablePreviewData.length} Students`}
            </button>
          </div>
        </div>
      )}

      {/* Results Section */}
      {bulkUploadResults && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Upload Results</h3>
            <div className="flex gap-2">
              <button
                onClick={handlePrint}
                className="flex items-center px-3 py-1.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <PrinterIcon className="w-4 h-4 mr-1.5" />
                Print
              </button>
              <button
                onClick={handleDownloadPDF}
                className="flex items-center px-3 py-1.5 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <DocumentArrowDownIcon className="w-4 h-4 mr-1.5" />
                Download PDF
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-green-800 mb-2">Successfully Added</h4>
              <p className="text-2xl font-bold text-green-600">{bulkUploadResults.successCount}</p>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-red-800 mb-2">Failed</h4>
              <p className="text-2xl font-bold text-red-600">{bulkUploadResults.failureCount}</p>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-blue-800 mb-2">Emails Sent</h4>
              <p className="text-2xl font-bold text-blue-600">{bulkUploadResults.emailResults?.sent || 0}</p>
              {bulkUploadResults.emailResults?.failed > 0 && (
                <p className="text-sm text-blue-600">({bulkUploadResults.emailResults.failed} failed)</p>
              )}
            </div>
          </div>

          {/* Email Results Summary */}
          {bulkUploadResults.emailResults && (
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-medium text-gray-800 mb-2">Email Notification Summary</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Successfully sent: <span className="font-medium text-green-600">{bulkUploadResults.emailResults.sent}</span></p>
                  <p className="text-sm text-gray-600">Failed to send: <span className="font-medium text-red-600">{bulkUploadResults.emailResults.failed}</span></p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total students: <span className="font-medium">{bulkUploadResults.successCount}</span></p>
                  <p className="text-sm text-gray-600">Email success rate: <span className="font-medium">{bulkUploadResults.successCount > 0 ? Math.round((bulkUploadResults.emailResults.sent / bulkUploadResults.successCount) * 100) : 0}%</span></p>
                </div>
              </div>
            </div>
          )}

          {/* Email Errors */}
          {bulkUploadResults.emailResults?.errors && bulkUploadResults.emailResults.errors.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-red-700 mb-2">Email Errors ({bulkUploadResults.emailResults.errors.length})</h4>
              <div className="max-h-40 overflow-y-auto">
                {bulkUploadResults.emailResults.errors.map((error, index) => (
                  <div key={index} className="bg-red-50 p-3 rounded-lg mb-2">
                    <p className="text-sm text-red-700">
                      <span className="font-medium">{error.student} ({error.rollNumber}):</span> {error.error}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {bulkUploadResults.errors && bulkUploadResults.errors.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Upload Errors:</h4>
              <div className="max-h-60 overflow-y-auto">
                {bulkUploadResults.errors.map((error, index) => (
                  <div key={index} className="bg-red-50 p-3 rounded-lg mb-2">
                    <p className="text-sm text-red-700">
                      <span className="font-medium">Row {error.row}:</span> {error.error}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  // Update the renderTempStudentsSummaryTable function
  const renderTempStudentsSummaryTable = () => (
    <div className="mt-8 bg-white rounded-xl shadow-md p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-blue-800">Students Pending First Password Reset</h2>
          <p className="text-sm text-gray-600 mt-1">
            {tempStudentsSummary.length > 0 
             ? `${tempStudentsSummary.length} student(s) yet to reset their initial password.`
             : "All bulk-uploaded students have reset their passwords or no students are pending."}
          </p>
        </div>
        {tempStudentsSummary.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3 sm:mt-0">
            <button
              onClick={handleClearTempStudents}
              className="flex items-center px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-sm"
            >
              <TrashIcon className="w-5 h-5 mr-2" />
              Clear Temp Students
            </button>
            <button
              onClick={handlePrintPending}
              className="flex items-center px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
              <PrinterIcon className="w-5 h-5 mr-2" />
              Print List
            </button>
            <button
              onClick={handleDownloadPendingPDF}
              className="flex items-center px-4 py-2 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm"
            >
              <DocumentArrowDownIcon className="w-5 h-5 mr-2" />
              Download PDF
            </button>
          </div>
        )}
      </div>
      
      {loadingTempSummary ? (
        <div className="flex justify-center items-center h-40"><LoadingSpinner /></div>
      ) : tempStudentsSummary.length === 0 ? (
        <p className="text-center text-gray-500 py-4">No students are currently pending password reset.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Roll Number</th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Generated Password</th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Added On</th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {tempStudentsSummary.map(student => (
                <tr key={student._id}>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">{student.name}</td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.rollNumber}</td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex items-center justify-between">
                      <code className="px-2 py-1 bg-gray-100 rounded text-gray-800">{student.generatedPassword}</code>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(student.generatedPassword);
                          toast.success('Password copied!');
                        }}
                        className="ml-2 p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Copy password"
                      >
                        <DocumentDuplicateIcon className="w-5 h-5"/>
                      </button>
                    </div>
                  </td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.studentPhone}</td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(student.createdAt).toLocaleDateString()}</td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                      Pending Reset
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  // Batch Renewal Modal Component
  const BatchRenewalModal = ({ isOpen, onClose, onRenew }) => {
    const academicYears = generateAcademicYears();
    const [fromAcademicYear, setFromAcademicYear] = useState('');
    const [toAcademicYear, setToAcademicYear] = useState('');
    const [studentsToRenew, setStudentsToRenew] = useState([]);
    const [selectedStudents, setSelectedStudents] = useState(new Set());
    const [loadingStudents, setLoadingStudents] = useState(false);
    const [isRenewing, setIsRenewing] = useState(false);

    useEffect(() => {
      if (fromAcademicYear) {
        const fetchStudentsForRenewal = async () => {
          setLoadingStudents(true);
          try {
            const res = await api.get('/api/admin/students', {
              params: { academicYear: fromAcademicYear, limit: 1000 } // Fetch all for this year
            });
            if (res.data.success) {
              const activeStudents = res.data.data.students.filter(s => s.hostelStatus === 'Active');
              setStudentsToRenew(activeStudents);
              // Initially select all students
              setSelectedStudents(new Set(activeStudents.map(s => s._id)));
            } else {
              toast.error('Failed to fetch students for renewal.');
            }
          } catch (err) {
            toast.error(err.response?.data?.message || 'Error fetching students.');
          } finally {
            setLoadingStudents(false);
          }
        };
        fetchStudentsForRenewal();
      } else {
        setStudentsToRenew([]);
        setSelectedStudents(new Set());
      }
    }, [fromAcademicYear]);

    const handleSelectAll = (e) => {
      if (e.target.checked) {
        setSelectedStudents(new Set(studentsToRenew.map(s => s._id)));
      } else {
        setSelectedStudents(new Set());
      }
    };

    const handleSelectStudent = (studentId) => {
      const newSelection = new Set(selectedStudents);
      if (newSelection.has(studentId)) {
        newSelection.delete(studentId);
      } else {
        newSelection.add(studentId);
      }
      setSelectedStudents(newSelection);
    };

    const handleRenew = async () => {
      if (!fromAcademicYear || !toAcademicYear) {
        toast.error('Please select both "From" and "To" academic years.');
        return;
      }
      if (selectedStudents.size === 0) {
        if (!confirm('You have not selected any students to renew. This will mark all students from this year as inactive. Do you want to proceed?')) {
          return;
        }
      }
      setIsRenewing(true);
      try {
        await onRenew(fromAcademicYear, toAcademicYear, Array.from(selectedStudents));
        onClose();
      } finally {
        setIsRenewing(false);
      }
    };

    return (
      isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4 flex flex-col max-h-[90vh]">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Renew Student Batches</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">From Academic Year</label>
                <select
                  value={fromAcademicYear}
                  onChange={(e) => setFromAcademicYear(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">Select Year to Renew From</option>
                  {academicYears.map(year => <option key={year} value={year}>{year}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">To New Academic Year</label>
                <select
                  value={toAcademicYear}
                  onChange={(e) => setToAcademicYear(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">Select New Academic Year</option>
                  {academicYears.filter(y => y > fromAcademicYear).map(year => <option key={year} value={year}>{year}</option>)}
                </select>
              </div>
            </div>

            <div className="flex-grow overflow-y-auto border rounded-lg p-2 bg-gray-50">
              {loadingStudents ? (
                <div className="flex justify-center items-center h-full"><LoadingSpinner /></div>
              ) : studentsToRenew.length > 0 ? (
                <div className="space-y-2">
                   <div className="flex items-center p-2 border-b">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      checked={selectedStudents.size === studentsToRenew.length}
                      onChange={handleSelectAll}
                    />
                    <label className="ml-3 block text-sm font-medium text-gray-900">
                      Select All ({selectedStudents.size} / {studentsToRenew.length})
                    </label>
                  </div>
                  {studentsToRenew.map(student => (
                    <div key={student._id} className="flex items-center p-2 rounded-md hover:bg-gray-100">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        checked={selectedStudents.has(student._id)}
                        onChange={() => handleSelectStudent(student._id)}
                      />
                      <div className="ml-3 text-sm">
                        <label className="font-medium text-gray-900">{student.name}</label>
                        <p className="text-gray-500">{student.rollNumber} - {student.branch}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-10">
                  {fromAcademicYear ? 'No active students found for this year.' : 'Select an academic year to see students.'}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={onClose} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">Cancel</button>
              <button
                onClick={handleRenew}
                disabled={isRenewing || loadingStudents || !fromAcademicYear || !toAcademicYear}
                className={`px-4 py-2 text-white rounded-lg transition-colors ${
                  (isRenewing || loadingStudents || !fromAcademicYear || !toAcademicYear)
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {isRenewing ? 'Renewing...' : 'Renew Batches'}
              </button>
            </div>
          </div>
        </div>
      )
    );
  };

  // Function to handle the renewal API call
  const handleRenewBatches = async (fromAcademicYear, toAcademicYear, studentIds) => {
    try {
      const res = await api.post('/api/admin/students/renew-batch', { fromAcademicYear, toAcademicYear, studentIds });
      if (res.data.success) {
        const { renewedCount, graduatedCount, deactivatedCount, graduationDetails } = res.data.data;
        
        let message = `Batch renewal completed: ${renewedCount} renewed, ${graduatedCount} graduated, ${deactivatedCount} deactivated.`;
        if (graduationDetails && graduationDetails.length > 0) {
          message += ` Graduated students: ${graduationDetails.map(g => g.name).join(', ')}`;
        }
        
        toast.success(message);
        console.log('Renewal Results:', res.data.data);
        
        // Optionally refresh data
        if (tab === 'list') {
          fetchStudents(true);
        }
      } else {
        toast.error(res.data.message || 'Renewal failed.');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'An error occurred during batch renewal.');
    }
  };

  // Photo Edit Modal
  const renderPhotoEditModal = () => (
    photoEditModal && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-xl font-bold text-gray-800">Edit Photos</h3>
              <p className="text-sm text-gray-600 mt-1">
                {photoEditStudent?.name} ({photoEditStudent?.rollNumber})
              </p>
            </div>
            <button
              onClick={() => {
                setPhotoEditModal(false);
                resetPhotoEditForm();
              }}
              className="text-gray-500 hover:text-gray-700 p-1"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
          
          <form onSubmit={handlePhotoEditSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Student Photo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Student Photo</label>
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      {photoEditStudentPhotoPreview ? (
                        <div className="relative">
                          <img src={photoEditStudentPhotoPreview} alt="Preview" className="mx-auto h-20 w-auto object-cover rounded-lg" />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              setPhotoEditStudentPhoto(null);
                              setPhotoEditStudentPhotoPreview(null);
                            }}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                          >
                            <XCircleIcon className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <PhotoIcon className="w-8 h-8 mb-2 text-gray-400" />
                          <p className="text-sm text-gray-500">Click to upload</p>
                        </>
                      )}
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={(e) => handlePhotoEditChange(e, 'student')}
                    />
                  </label>
                </div>
              </div>

              {/* Guardian Photo 1 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Guardian Photo 1</label>
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      {photoEditGuardianPhoto1Preview ? (
                        <div className="relative">
                          <img src={photoEditGuardianPhoto1Preview} alt="Preview" className="mx-auto h-20 w-auto object-cover rounded-lg" />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              setPhotoEditGuardianPhoto1(null);
                              setPhotoEditGuardianPhoto1Preview(null);
                            }}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                          >
                            <XCircleIcon className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <PhotoIcon className="w-8 h-8 mb-2 text-gray-400" />
                          <p className="text-sm text-gray-500">Click to upload</p>
                        </>
                      )}
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={(e) => handlePhotoEditChange(e, 'guardian1')}
                    />
                  </label>
                </div>
              </div>

              {/* Guardian Photo 2 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Guardian Photo 2</label>
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      {photoEditGuardianPhoto2Preview ? (
                        <div className="relative">
                          <img src={photoEditGuardianPhoto2Preview} alt="Preview" className="mx-auto h-20 w-auto object-cover rounded-lg" />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              setPhotoEditGuardianPhoto2(null);
                              setPhotoEditGuardianPhoto2Preview(null);
                            }}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                          >
                            <XCircleIcon className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <PhotoIcon className="w-8 h-8 mb-2 text-gray-400" />
                          <p className="text-sm text-gray-500">Click to upload</p>
                        </>
                      )}
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={(e) => handlePhotoEditChange(e, 'guardian2')}
                    />
                  </label>
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">Maximum file size: 5MB. Supported formats: JPG, PNG, GIF</p>
            <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 pt-2 sm:pt-4">
              <button
                type="button"
                onClick={() => {
                  setPhotoEditModal(false);
                  resetPhotoEditForm();
                }}
                className="w-full sm:w-auto px-3 sm:px-4 py-1.5 sm:py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={photoEditLoading}
                className={`w-full sm:w-auto px-3 sm:px-4 py-1.5 sm:py-2 text-sm rounded-lg text-white font-medium transition-colors ${
                  photoEditLoading
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {photoEditLoading ? 'Updating...' : 'Update Photos'}
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  );

  // Photo edit modal functions
  const openPhotoEditModal = (student) => {
    setPhotoEditId(student._id);
    setPhotoEditStudent(student);
    
    // Set existing photo previews
    setPhotoEditStudentPhotoPreview(student.studentPhoto || null);
    setPhotoEditGuardianPhoto1Preview(student.guardianPhoto1 || null);
    setPhotoEditGuardianPhoto2Preview(student.guardianPhoto2 || null);
    
    // Reset new photo uploads
    setPhotoEditStudentPhoto(null);
    setPhotoEditGuardianPhoto1(null);
    setPhotoEditGuardianPhoto2(null);
    
    setPhotoEditModal(true);
  };

  const handlePhotoEditChange = (e, type) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size should be less than 5MB');
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        switch (type) {
          case 'student':
            setPhotoEditStudentPhoto(file);
            setPhotoEditStudentPhotoPreview(reader.result);
            break;
          case 'guardian1':
            setPhotoEditGuardianPhoto1(file);
            setPhotoEditGuardianPhoto1Preview(reader.result);
            break;
          case 'guardian2':
            setPhotoEditGuardianPhoto2(file);
            setPhotoEditGuardianPhoto2Preview(reader.result);
            break;
          default:
            break;
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const resetPhotoEditForm = () => {
    setPhotoEditStudentPhoto(null);
    setPhotoEditGuardianPhoto1(null);
    setPhotoEditGuardianPhoto2(null);
    setPhotoEditStudentPhotoPreview(null);
    setPhotoEditGuardianPhoto1Preview(null);
    setPhotoEditGuardianPhoto2Preview(null);
  };

  const handlePhotoEditSubmit = async (e) => {
    e.preventDefault();
    setPhotoEditLoading(true);
    try {
      // Create FormData for multipart upload
      const formData = new FormData();
      
      // Add photos if selected
      if (photoEditStudentPhoto) {
        formData.append('studentPhoto', photoEditStudentPhoto);
      }
      if (photoEditGuardianPhoto1) {
        formData.append('guardianPhoto1', photoEditGuardianPhoto1);
      }
      if (photoEditGuardianPhoto2) {
        formData.append('guardianPhoto2', photoEditGuardianPhoto2);
      }

      // Only proceed if at least one photo is selected
      if (!photoEditStudentPhoto && !photoEditGuardianPhoto1 && !photoEditGuardianPhoto2) {
        toast.error('Please select at least one photo to update');
        return;
      }

      const config = {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      };
      
      await api.put(`/api/admin/students/${photoEditId}`, formData, config);
      toast.success('Photos updated successfully');
      setPhotoEditModal(false);
      setPhotoEditId(null);
      setPhotoEditStudent(null);
      resetPhotoEditForm();
      fetchStudents(); // Refresh list
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to update photos');
    } finally {
      setPhotoEditLoading(false);
    }
  };

  // Password reset functions
  const openPasswordResetModal = (student) => {
    setPasswordResetId(student._id);
    setPasswordResetStudent(student);
    setNewPassword('');
    setConfirmPassword('');
    setPasswordResetModal(true);
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    
    // Validation
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    setPasswordResetLoading(true);
    try {
      const res = await api.post(`/api/admin/students/${passwordResetId}/reset-password`, { 
        newPassword 
      });

      if (res.data.success) {
        const { emailSent, emailError } = res.data.data;
        
        if (emailSent) {
          toast.success('Password reset successfully and email notification sent!');
        } else {
          toast.success('Password reset successfully, but email notification failed.');
          if (emailError) {
            toast.error(`Email error: ${emailError}`);
          }
        }
        
        setPasswordResetModal(false);
        setPasswordResetId(null);
        setPasswordResetStudent(null);
        setNewPassword('');
        setConfirmPassword('');
        fetchTempStudentsSummary(); // Refresh temp students list
      } else {
        throw new Error(res.data.message || 'Failed to reset password');
      }
    } catch (err) {
      console.error('Password reset error:', err);
      toast.error(err.response?.data?.message || 'Failed to reset password');
    } finally {
      setPasswordResetLoading(false);
    }
  };

  // Password Reset Modal
  const renderPasswordResetModal = () => (
    passwordResetModal && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-xl font-bold text-gray-800">Reset Student Password</h3>
              <p className="text-sm text-gray-600 mt-1">
                {passwordResetStudent?.name} ({passwordResetStudent?.rollNumber})
              </p>
            </div>
            <button
              onClick={() => {
                setPasswordResetModal(false);
                setNewPassword('');
                setConfirmPassword('');
              }}
              className="text-gray-500 hover:text-gray-700 p-1"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
          
          <form onSubmit={handlePasswordReset} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter new password (min 6 characters)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirm New Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Confirm new password"
              />
            </div>

            <div className="bg-blue-50 p-3 rounded-lg">
              <h4 className="text-sm font-medium text-blue-800 mb-2">Password Requirements:</h4>
              <ul className="text-xs text-blue-700 space-y-1">
                <li>• Minimum 6 characters long</li>
                <li>• Both password fields must match</li>
              </ul>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => {
                  setPasswordResetModal(false);
                  setNewPassword('');
                  setConfirmPassword('');
                }}
                className="flex-1 px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={passwordResetLoading}
                className={`flex-1 px-4 py-2 text-sm rounded-lg text-white font-medium transition-colors ${
                  passwordResetLoading
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-orange-600 hover:bg-orange-700'
                }`}
              >
                {passwordResetLoading ? 'Resetting...' : 'Reset Password'}
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  );

  if (loading && tab === 'list' && !tableLoading) { 
    return <div className="p-4 sm:p-6 max-w-[1400px] mx-auto mt-16 sm:mt-0"><LoadingSpinner size="lg" /></div>;
  }

  return (
    <div className="p-2 sm:p-4 md:p-6 max-w-[1400px] mx-auto mt-16 sm:mt-0">
      {/* Enhanced Tab Navigation */}
      <div className="mb-6 sm:mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-1 sm:p-2">
          <div className="flex flex-wrap gap-1 sm:gap-2">
            {TABS.map(t => (
              <button
                key={t.value}
                className={`flex items-center justify-center space-x-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg transition-all duration-300 text-xs sm:text-sm font-medium relative overflow-hidden group ${
                  tab === t.value 
                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg transform scale-105' 
                    : 'bg-transparent text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                }`}
                onClick={() => setTab(t.value)}
              >
                {/* Active indicator */}
                {tab === t.value && (
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg shadow-lg"></div>
                )}
                
                {/* Content */}
                <div className={`relative z-10 flex items-center space-x-2 ${
                  tab === t.value ? 'text-white' : 'text-gray-600 group-hover:text-blue-600'
                }`}>
                  <div className={`transition-all duration-300 ${
                    tab === t.value 
                      ? 'text-white transform scale-110' 
                      : 'text-gray-500 group-hover:text-blue-500 group-hover:scale-110'
                  }`}>
                    {t.icon}
                  </div>
                  <span className="font-medium">{t.label}</span>
                </div>
                
                {/* Hover effect */}
                {tab !== t.value && (
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {tab === 'add' && renderAddStudentForm()}
      {tab === 'bulkUpload' && (
        <>
          {renderBulkUploadSection()}
          {renderTempStudentsSummaryTable()}
        </>
      )}
      {tab === 'list' && renderStudentList()}
      {showPasswordModal && renderPasswordModal()}
      {editModal && renderEditModal()}
      {photoEditModal && renderPhotoEditModal()}
      <BatchRenewalModal
        isOpen={renewalModalOpen}
        onClose={() => setRenewalModalOpen(false)}
        onRenew={handleRenewBatches}
      />
      {passwordResetModal && renderPasswordResetModal()}
    </div>
  );
};

export default Students;