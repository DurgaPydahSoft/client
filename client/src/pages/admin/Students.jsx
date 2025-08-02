import React, { useState, useEffect, useCallback } from 'react';
import api from '../../utils/axios';
import toast from 'react-hot-toast';
import { UserPlusIcon, TableCellsIcon, ArrowUpTrayIcon, PencilSquareIcon, TrashIcon, MagnifyingGlassIcon, ChevronLeftIcon, ChevronRightIcon, DocumentDuplicateIcon, PrinterIcon, DocumentArrowDownIcon, XMarkIcon, XCircleIcon, PhotoIcon, UserIcon, UserGroupIcon, AcademicCapIcon, PhoneIcon, ExclamationTriangleIcon, CameraIcon, VideoCameraIcon, LockClosedIcon } from '@heroicons/react/24/outline';
import LoadingSpinner from '../../components/LoadingSpinner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useAuth } from '../../context/AuthContext';
import { hasFullAccess, canPerformAction } from '../../utils/permissionUtils';

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
  bedNumber: '',
  lockerNumber: '',
  studentPhone: '',
  parentPhone: '',
  batch: '',
  academicYear: '',
  email: '',
  hostelId: '' // Add hostelId field
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

// Helper to normalize course names for frontend matching (same as backend)
const normalizeCourseName = (courseName) => {
  if (!courseName) return courseName;
  
  const courseUpper = courseName.toUpperCase();
  
  // Map common variations to database names
  if (courseUpper === 'BTECH' || courseUpper === 'B.TECH' || courseUpper === 'B TECH') {
    return 'B.Tech';
  }
  if (courseUpper === 'DIPLOMA') {
    return 'Diploma';
  }
  if (courseUpper === 'PHARMACY') {
    return 'Pharmacy';
  }
  if (courseUpper === 'DEGREE') {
    return 'Degree';
  }
  
  return courseName; // Return original if no mapping found
};

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
  const currentYear = new Date().getFullYear();
  const years = [];
  
  for (let i = -3; i <= 3; i++) {
    const year = currentYear + i;
    years.push(`${year}-${year + 1}`);
  }
  
  return years;
};

const Students = () => {
  console.log('👥 Students component loaded');
  
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin';
  const canEditStudent = isSuperAdmin || canPerformAction(user, 'student_management', 'edit');
  const canDeleteStudent = isSuperAdmin || canPerformAction(user, 'student_management', 'delete');
  const canAddStudent = isSuperAdmin || canPerformAction(user, 'student_management', 'create');
  
  console.log('🔐 Student Management Permissions:', {
    user: user?.username,
    role: user?.role,
    isSuperAdmin,
    canEditStudent,
    canDeleteStudent,
    canAddStudent,
    permissions: user?.permissions,
    accessLevels: user?.permissionAccessLevels
  });
  
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
  const [courseCounts, setCourseCounts] = useState({});
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
  
  // Temp students gender filter
  const [tempStudentsGenderFilter, setTempStudentsGenderFilter] = useState('all');

  // Photo upload states
  const [studentPhoto, setStudentPhoto] = useState(null);
  const [guardianPhoto1, setGuardianPhoto1] = useState(null);
  const [guardianPhoto2, setGuardianPhoto2] = useState(null);
  const [studentPhotoPreview, setStudentPhotoPreview] = useState(null);
  const [guardianPhoto1Preview, setGuardianPhoto1Preview] = useState(null);
  const [guardianPhoto2Preview, setGuardianPhoto2Preview] = useState(null);

  // Camera states
  const [showCamera, setShowCamera] = useState(false);
  const [cameraType, setCameraType] = useState(null); // 'student', 'guardian1', 'guardian2'
  const [stream, setStream] = useState(null);
  const [videoRef, setVideoRef] = useState(null);
  const [cameraReady, setCameraReady] = useState(false);

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

  // Student details modal states
  const [studentDetailsModal, setStudentDetailsModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);

  // Room availability states
  const [roomsWithAvailability, setRoomsWithAvailability] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [showRoomViewModal, setShowRoomViewModal] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [roomStudents, setRoomStudents] = useState([]);
  const [loadingRoomStudents, setLoadingRoomStudents] = useState(false);

  // Bed and locker availability states
  const [bedLockerAvailability, setBedLockerAvailability] = useState(null);
  const [loadingBedLocker, setLoadingBedLocker] = useState(false);

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

  // Cleanup camera stream on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  // Handle video element setup when camera is shown
  useEffect(() => {
    if (showCamera && stream && videoRef) {
      console.log('📸 Setting up video element');
      videoRef.srcObject = stream;
      videoRef.onloadedmetadata = () => {
        console.log('📸 Video metadata loaded in useEffect');
        videoRef.play();
        setCameraReady(true);
      };
      
      // Fallback: if video doesn't load within 3 seconds, try to set ready anyway
      const timeout = setTimeout(() => {
        if (!cameraReady && videoRef) {
          console.log('📸 Fallback: setting camera ready after timeout');
          setCameraReady(true);
        }
      }, 3000);
      
      return () => clearTimeout(timeout);
    }
  }, [showCamera, stream, videoRef, cameraReady]);

  const fetchTempStudentsSummary = async () => {
    setLoadingTempSummary(true);
    try {
      const res = await api.get('/api/admin/students/temp-summary');
      if (res.data.success) {
        console.log('Temp students data:', res.data.data);
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

  // Fetch total course counts
  const fetchCourseCounts = async () => {
    try {
      const params = new URLSearchParams();
      
      // Add filters only if they have values (excluding search and pagination)
      if (filters.course) params.append('course', filters.course);
      if (filters.branch) params.append('branch', filters.branch);
      if (filters.gender) params.append('gender', filters.gender);
      if (filters.category) params.append('category', filters.category);
      if (filters.roomNumber) params.append('roomNumber', filters.roomNumber);
      if (filters.batch) params.append('batch', filters.batch);
      if (filters.academicYear) params.append('academicYear', filters.academicYear);
      if (filters.hostelStatus) params.append('hostelStatus', filters.hostelStatus);

      const res = await api.get(`/api/admin/students/course-counts?${params}`);
      if (res.data.success) {
        setCourseCounts(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching course counts:', err);
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

  // Fetch rooms with bed availability
  const fetchRoomsWithAvailability = async (gender, category) => {
    if (!gender || !category) {
      setRoomsWithAvailability([]);
      return;
    }

    setLoadingRooms(true);
    try {
      const params = new URLSearchParams({
        gender: gender,
        category: category
      });
      
      const res = await api.get(`/api/admin/rooms/bed-availability?${params.toString()}`);
      if (res.data.success) {
        setRoomsWithAvailability(res.data.data.rooms || []);
      } else {
        console.error('Failed to fetch rooms with availability:', res.data.message);
        toast.error('Failed to fetch room availability');
      }
    } catch (err) {
      console.error('Error fetching rooms with availability:', err);
      toast.error('Error fetching room availability');
    } finally {
      setLoadingRooms(false);
    }
  };

  // Handle room view modal
  const handleRoomView = async (room) => {
    setSelectedRoom(room);
    setLoadingRoomStudents(true);
    try {
      const response = await api.get(`/api/admin/rooms/${room._id}/students`);
      if (response.data.success) {
        setRoomStudents(response.data.data.students);
      } else {
        throw new Error('Failed to fetch students');
      }
    } catch (error) {
      console.error('Error fetching room students:', error);
      toast.error('Failed to fetch student details');
    } finally {
      setLoadingRoomStudents(false);
      setShowRoomViewModal(true);
    }
  };

  // Fetch bed and locker availability for a room
  const fetchBedLockerAvailability = async (roomNumber) => {
    if (!roomNumber) {
      setBedLockerAvailability(null);
      return;
    }

    setLoadingBedLocker(true);
    try {
      const response = await api.get(`/api/admin/rooms/${roomNumber}/bed-locker-availability`);
      if (response.data.success) {
        setBedLockerAvailability(response.data.data);
      } else {
        throw new Error('Failed to fetch bed/locker availability');
      }
    } catch (error) {
      console.error('Error fetching bed/locker availability:', error);
      toast.error('Failed to fetch bed/locker availability');
      setBedLockerAvailability(null);
    } finally {
      setLoadingBedLocker(false);
    }
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
      fetchCourseCounts(); // Fetch course counts
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

  // Fetch rooms with availability when gender or category changes
  useEffect(() => {
    if (form.gender && form.category) {
      fetchRoomsWithAvailability(form.gender, form.category);
    } else {
      setRoomsWithAvailability([]);
    }
  }, [form.gender, form.category]);

  // Fetch bed/locker availability when room is selected
  useEffect(() => {
    if (form.roomNumber) {
      fetchBedLockerAvailability(form.roomNumber);
    } else {
      setBedLockerAvailability(null);
      // Clear bed and locker selections when room changes
      setForm(prev => ({
        ...prev,
        bedNumber: '',
        lockerNumber: ''
      }));
    }
  }, [form.roomNumber]);

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

  // Camera functions
  const startCamera = async (type) => {
    try {
      console.log('📸 Starting camera for type:', type);
      setCameraReady(false);
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });
      console.log('📸 Camera stream obtained:', mediaStream);
      setStream(mediaStream);
      setCameraType(type);
      setShowCamera(true);
      
      // Set video source after component mounts
      setTimeout(() => {
        if (videoRef) {
          console.log('📸 Setting video source');
          videoRef.srcObject = mediaStream;
          videoRef.onloadedmetadata = () => {
            console.log('📸 Video metadata loaded');
            videoRef.play();
            setCameraReady(true);
          };
        } else {
          console.log('📸 Video ref not available yet');
        }
      }, 100);
    } catch (error) {
      console.error('❌ Error accessing camera:', error);
      toast.error('Unable to access camera. Please check permissions.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setShowCamera(false);
    setCameraType(null);
    setVideoRef(null);
    setCameraReady(false);
  };

  const capturePhoto = () => {
    console.log('📸 Capturing photo...', { videoRef: !!videoRef, cameraType, videoWidth: videoRef?.videoWidth, videoHeight: videoRef?.videoHeight });
    
    if (!videoRef || !cameraType) {
      console.error('❌ Missing videoRef or cameraType');
      toast.error('Camera not ready. Please try again.');
      return;
    }

    if (!videoRef.videoWidth || !videoRef.videoHeight) {
      console.error('❌ Video dimensions not available');
      console.log('📸 Video element state:', {
        readyState: videoRef.readyState,
        networkState: videoRef.networkState,
        paused: videoRef.paused,
        ended: videoRef.ended
      });
      toast.error('Video not loaded. Please wait a moment and try again.');
      return;
    }

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    // Set canvas dimensions to match video
    canvas.width = videoRef.videoWidth;
    canvas.height = videoRef.videoHeight;
    
    console.log('📸 Canvas dimensions:', canvas.width, 'x', canvas.height);
    
    try {
      // Draw video frame to canvas
      context.drawImage(videoRef, 0, 0, canvas.width, canvas.height);
      
      // Convert canvas to blob
      canvas.toBlob((blob) => {
        if (blob) {
          console.log('📸 Photo captured successfully, blob size:', blob.size);
          const file = new File([blob], `camera_${cameraType}_${Date.now()}.jpg`, { type: 'image/jpeg' });
          
          // Create preview URL
          const previewUrl = URL.createObjectURL(blob);
          
          // Set photo based on camera type
          switch (cameraType) {
            case 'student':
              setStudentPhoto(file);
              setStudentPhotoPreview(previewUrl);
              console.log('📸 Student photo set:', file.name, 'Preview URL:', previewUrl);
              break;
            case 'guardian1':
              setGuardianPhoto1(file);
              setGuardianPhoto1Preview(previewUrl);
              console.log('📸 Guardian 1 photo set:', file.name, 'Preview URL:', previewUrl);
              break;
            case 'guardian2':
              setGuardianPhoto2(file);
              setGuardianPhoto2Preview(previewUrl);
              console.log('📸 Guardian 2 photo set:', file.name, 'Preview URL:', previewUrl);
              break;
            case 'edit_student':
              setPhotoEditStudentPhoto(file);
              setPhotoEditStudentPhotoPreview(previewUrl);
              console.log('📸 Edit student photo set:', file.name, 'Preview URL:', previewUrl);
              break;
            case 'edit_guardian1':
              setPhotoEditGuardianPhoto1(file);
              setPhotoEditGuardianPhoto1Preview(previewUrl);
              console.log('📸 Edit guardian 1 photo set:', file.name, 'Preview URL:', previewUrl);
              break;
            case 'edit_guardian2':
              setPhotoEditGuardianPhoto2(file);
              setPhotoEditGuardianPhoto2Preview(previewUrl);
              console.log('📸 Edit guardian 2 photo set:', file.name, 'Preview URL:', previewUrl);
              break;
            default:
              console.log('📸 Unknown camera type:', cameraType);
              break;
          }
          
          // Stop camera
          stopCamera();
          toast.success('Photo captured successfully!');
        } else {
          console.error('❌ Failed to create blob from canvas');
          toast.error('Failed to capture photo. Please try again.');
        }
      }, 'image/jpeg', 0.8);
    } catch (error) {
      console.error('❌ Error capturing photo:', error);
      toast.error('Error capturing photo. Please try again.');
    }
  };

  const handleAddStudent = async e => {
    e.preventDefault();
    
    // Check permission before proceeding
    if (!canAddStudent) {
      toast.error('You do not have permission to add students');
      return;
    }
    
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
      
      // Handle success message based on delivery results
      let successMessage = 'Student added successfully';
      
      // Check for email and SMS delivery results
      const { emailSent, emailError, smsSent, smsError } = res.data.data;
      
      if (emailSent && smsSent) {
        successMessage += '. Email and SMS credentials sent successfully';
      } else if (emailSent && !smsSent) {
        successMessage += '. Email sent successfully';
        if (smsError) {
          successMessage += ', SMS failed: ' + smsError;
        } else {
          successMessage += ', no phone number provided for SMS';
        }
      } else if (smsSent && !emailSent) {
        successMessage += '. SMS sent successfully';
        if (emailError) {
          successMessage += ', email failed: ' + emailError;
        } else {
          successMessage += ', no email provided';
        }
      } else {
        // Neither email nor SMS sent
        if (!emailSent && !smsSent) {
          successMessage += '. No credentials sent (no email or phone provided)';
        } else if (emailError && smsError) {
          successMessage += '. Both email and SMS failed';
        }
      }
      
      toast.success(successMessage);
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
    // Check permission before proceeding
    if (!canDeleteStudent) {
      toast.error('You do not have permission to delete students');
      return;
    }
    
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
    // Check permission before proceeding
    if (!canEditStudent) {
      toast.error('You do not have permission to edit students');
      return;
    }
    
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
      bedNumber: student.bedNumber || '',
      lockerNumber: student.lockerNumber || '',
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
    if (formData.studentPhone && !/^[0-9]{10}$/.test(formData.studentPhone)) {
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
    
    // Check permission before proceeding
    if (!canAddStudent) {
      toast.error('You do not have permission to add students');
      return;
    }
    
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
    // Check permission before proceeding
    if (!canAddStudent) {
      toast.error('You do not have permission to add students');
      return;
    }
    
    if (!editablePreviewData || editablePreviewData.length === 0) {
      toast.error('No students to upload.');
      return;
    }

    // Filter out rows with errors
    const validStudents = editablePreviewData.filter((_, index) => 
      !previewErrors[index] || Object.keys(previewErrors[index]).length === 0
    );
    
    const invalidCount = editablePreviewData.length - validStudents.length;
    
    if (validStudents.length === 0) {
      toast.error('No valid students to upload. Please fix the errors or remove invalid rows.');
      return;
    }

    // Show warning if some rows will be skipped
    if (invalidCount > 0) {
      const shouldProceed = window.confirm(
        `${invalidCount} row(s) have validation errors and will be skipped.\n\n` +
        `Only ${validStudents.length} valid student(s) will be uploaded.\n\n` +
        `Do you want to proceed with the upload?`
      );
      
      if (!shouldProceed) {
        return;
      }
    }
    setBulkProcessing(true);
    setBulkUploadResults(null);

    try {
      const res = await api.post('/api/admin/students/bulk-upload-commit', { students: validStudents });
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

  const handleUpdateStudentYears = async () => {
    try {
      console.log('🔄 Frontend: Starting student year update...');
      
      const response = await api.post('/api/admin/students/update-years');
      console.log('📡 Frontend: API response:', response.data);
      
      if (response.data.success) {
        toast.success(response.data.message);
        console.log('✅ Frontend: Update successful, refreshing student list...');
        // Refresh the student list to show updated years
        fetchStudents();
      } else {
        console.log('❌ Frontend: API returned success: false');
        toast.error(response.data.message || 'Failed to update student years');
      }
    } catch (error) {
      console.error('❌ Frontend: Error updating student years:', error);
      console.error('❌ Frontend: Error response:', error.response?.data);
      toast.error('Failed to update student years. Please try again.');
    }
  };

  const getCategoryOptions = (gender) => {
    // Case-insensitive gender handling
    if (!gender) return ['A+', 'A', 'B+', 'B', 'C'];
    
    const genderUpper = gender.toUpperCase();
    const isMale = ['MALE', 'M', 'BOY'].includes(genderUpper);
    const isFemale = ['FEMALE', 'F', 'GIRL'].includes(genderUpper);
    
    if (isMale) {
      return ['A+', 'A', 'B+', 'B'];
    } else if (isFemale) {
      return ['A+', 'A', 'B', 'C'];
    } else {
      // Default to all categories if gender is not recognized
      return ['A+', 'A', 'B+', 'B', 'C'];
    }
  };

  const validateStudentRow = (student) => {
    const errors = {};
    const { Name, RollNumber, Gender, Course, Branch, Year, Category, RoomNumber, StudentPhone, ParentPhone, Email, Batch, AcademicYear } = student;
  
    if (!Name) errors.Name = 'Name is required.';
    if (!RollNumber) errors.RollNumber = 'PIN number is required.';
  
    if (!Gender) errors.Gender = 'Gender is required.';
    else {
      // Case-insensitive gender validation
      const genderUpper = Gender.toUpperCase();
      if (!['MALE', 'FEMALE', 'M', 'F', 'BOY', 'GIRL'].includes(genderUpper)) {
        errors.Gender = 'Invalid gender. Must be Male/Female/M/F/Boy/Girl.';
      }
    }
  
    if (!Course) errors.Course = 'Course is required.';
    else {
      // Normalize course name for validation (same as backend)
      const normalizedCourse = normalizeCourseName(Course);
      const course = courses.find(c => c.name === normalizedCourse);
      if (!course) errors.Course = `Course "${Course}" (normalized to "${normalizedCourse}") not found.`;
    }
  
    if (!Branch) errors.Branch = 'Branch is required.';
    else if (Course) {
      // For bulk upload, we need to validate branch against the course
      const normalizedCourse = normalizeCourseName(Course);
      const course = courses.find(c => c.name === normalizedCourse);
      if (course) {
        // This validation will be done on the backend since we don't have branches loaded for all courses
        // For now, we'll just check if branch is not empty
      }
    }
  
    // Year is optional for bulk upload, but if provided must be valid
    if (Year) {
      const yearNum = parseInt(Year, 10);
      if (isNaN(yearNum) || yearNum < 1 || yearNum > 10) {
        errors.Year = 'Year must be a number between 1 and 10.';
      }
    }
  
    if (!Category) errors.Category = 'Category is required.';
    else {
      // Case-insensitive category validation
      const categoryUpper = Category.toUpperCase();
      const validCategories = ['A+', 'A', 'B+', 'B', 'C'];
      const validCategoryUpper = ['A+', 'A', 'B+', 'B', 'C'];
      
      if (!validCategoryUpper.includes(categoryUpper) && 
          !['A PLUS', 'A_PLUS', 'B PLUS', 'B_PLUS'].includes(categoryUpper)) {
        errors.Category = 'Invalid category. Must be A+, A, B+, B, or C.';
      } else if (Gender) {
        // Check gender-specific categories
        const genderUpper = Gender.toUpperCase();
        const isMale = ['MALE', 'M', 'BOY'].includes(genderUpper);
        const isFemale = ['FEMALE', 'F', 'GIRL'].includes(genderUpper);
        
        if (isMale && categoryUpper === 'C') {
          errors.Category = 'Category C is not valid for Male students.';
        } else if (isFemale && categoryUpper === 'B+') {
          errors.Category = 'Category B+ is not valid for Female students.';
        }
      }
    }
  
    if (!RoomNumber) errors.RoomNumber = 'Room number is required.';
    else if (Gender && Category) {
      // Case-insensitive gender and category handling for room validation
      const genderUpper = Gender.toUpperCase();
      const categoryUpper = Category.toUpperCase();
      
      // Normalize gender for room mapping
      let normalizedGender = 'Male'; // default
      if (['FEMALE', 'F', 'GIRL'].includes(genderUpper)) {
        normalizedGender = 'Female';
      }
      
      // Normalize category for room mapping
      let normalizedCategory = 'A'; // default
      if (categoryUpper === 'A+') normalizedCategory = 'A+';
      else if (categoryUpper === 'A') normalizedCategory = 'A';
      else if (categoryUpper === 'B+') normalizedCategory = 'B+';
      else if (categoryUpper === 'B') normalizedCategory = 'B';
      else if (categoryUpper === 'C') normalizedCategory = 'C';
      
      const validRooms = ROOM_MAPPINGS[normalizedGender]?.[normalizedCategory];
      if (validRooms && !validRooms.includes(String(RoomNumber))) {
      errors.RoomNumber = `Invalid room for ${Gender} - ${Category}.`;
    }
    }
  
    // Student phone is optional for bulk upload, but if provided must be valid
    if (StudentPhone && !/^[0-9]{10}$/.test(StudentPhone)) {
      errors.StudentPhone = 'Must be 10 digits.';
    }
  
    if (!ParentPhone) errors.ParentPhone = 'Parent phone is required.';
    else if (!/^[0-9]{10}$/.test(ParentPhone)) errors.ParentPhone = 'Must be 10 digits.';
  
    if (Email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(Email)) errors.Email = 'Invalid email format.';
  
    if (!Batch) errors.Batch = 'Batch is required.';
    else {
      // Handle both YYYY-YYYY and YYYY formats
      if (/^\d{4}$/.test(Batch)) {
        // Single year provided - validate it's a reasonable year
        const startYear = parseInt(Batch, 10);
        if (startYear < 2000 || startYear > 2100) {
          errors.Batch = 'Starting year must be between 2000-2100.';
        }
      } else if (!/^\d{4}-\d{4}$/.test(Batch)) {
        errors.Batch = 'Format must be YYYY-YYYY or just YYYY.';
    } else {
        // Full batch format provided - validate duration
      const [start, end] = Batch.split('-').map(Number);
      const duration = end - start;
        // Use case-insensitive course matching
        const course = courses.find(c => 
          c.name.toLowerCase() === Course.toLowerCase() || 
          c._id === Course ||
          c.name.toUpperCase() === Course.toUpperCase()
        );
      const expectedDuration = course ? course.duration : 4;
      if (duration !== expectedDuration) {
        errors.Batch = `Duration must be ${expectedDuration} years for ${Course}.`;
        }
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
        student.hostelId || 'N/A',
        student.rollNumber,
        student.generatedPassword
      ]);

      autoTable(doc, {
        startY: 45,
        head: [['Name', 'Hostel ID', 'Roll Number', 'Generated Password']],
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
    
    // Filter students based on gender filter
    const filteredStudents = tempStudentsSummary.filter(student => 
      tempStudentsGenderFilter === 'all' || student.gender === tempStudentsGenderFilter
    );
    
    // Add title
    doc.setFontSize(16);
    doc.text('Students Pending Password Reset', 14, 15);
    
    // Add filter info
    doc.setFontSize(10);
    const filterText = tempStudentsGenderFilter === 'all' 
      ? 'All Students' 
      : `${tempStudentsGenderFilter} Students Only`;
    doc.text(`Filter: ${filterText}`, 14, 22);
    
    // Add summary
    doc.setFontSize(12);
    doc.text(`Total Students Pending: ${filteredStudents.length}`, 14, 30);

    // Separate male and female students if showing all
    if (tempStudentsGenderFilter === 'all') {
      const maleStudents = filteredStudents.filter(student => student.gender === 'Male');
      const femaleStudents = filteredStudents.filter(student => student.gender === 'Female');
      
      let currentY = 40;
      
      // Male Students Section
      if (maleStudents.length > 0) {
        doc.setFontSize(14);
        doc.text('Male Students', 14, currentY);
        currentY += 8;
        
        const maleTableData = maleStudents.map(student => [
      student.name,
          student.hostelId || 'N/A',
      student.rollNumber,
      student.generatedPassword,
      student.studentPhone,
      new Date(student.createdAt).toLocaleDateString()
    ]);

    autoTable(doc, {
          startY: currentY,
          head: [['Name', 'Hostel ID', 'Roll Number', 'Generated Password', 'Phone', 'Added On']],
          body: maleTableData,
          theme: 'grid',
          headStyles: { fillColor: [41, 128, 185] },
          styles: { fontSize: 9 }
        });
        
        currentY = doc.lastAutoTable.finalY + 10;
      }
      
      // Female Students Section
      if (femaleStudents.length > 0) {
        doc.setFontSize(14);
        doc.text('Female Students', 14, currentY);
        currentY += 8;
        
        const femaleTableData = femaleStudents.map(student => [
          student.name,
          student.hostelId || 'N/A',
          student.rollNumber,
          student.generatedPassword,
          student.studentPhone,
          new Date(student.createdAt).toLocaleDateString()
        ]);

        autoTable(doc, {
          startY: currentY,
          head: [['Name', 'Hostel ID', 'Roll Number', 'Generated Password', 'Phone', 'Added On']],
          body: femaleTableData,
          theme: 'grid',
          headStyles: { fillColor: [155, 89, 182] },
          styles: { fontSize: 9 }
        });
      }
    } else {
      // Single gender table
      const tableData = filteredStudents.map(student => [
        student.name,
        student.hostelId || 'N/A',
        student.rollNumber,
        student.generatedPassword,
        student.studentPhone,
        new Date(student.createdAt).toLocaleDateString()
      ]);

      autoTable(doc, {
        startY: 40,
        head: [['Name', 'Hostel ID', 'Roll Number', 'Generated Password', 'Phone', 'Added On']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185] },
      styles: { fontSize: 10 }
    });
    }

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
      <h2 className="text-xl sm:text-2xl font-bold mb-6 text-blue-800">Add New Student</h2>
      <form onSubmit={handleAddStudent} className="space-y-8">
        
                 {/* Personal Information Section */}
         <div className="bg-blue-50 rounded-lg p-6">
           <div className="flex items-center mb-4">
             <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
               <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
               </svg>
             </div>
             <h3 className="text-lg font-semibold text-gray-900">Personal Information</h3>
           </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleFormChange}
                placeholder="Enter student's full name"
                required
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">PIN Number *</label>
              <input
                type="text"
                name="rollNumber"
                value={form.rollNumber}
                onChange={handleFormChange}
                placeholder="Enter PIN number"
                required
                pattern="[A-Z0-9]+"
                title="Uppercase letters and numbers only"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 uppercase"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Gender *</label>
              <select
                name="gender"
                value={form.gender}
                onChange={handleFormChange}
                required
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hostel ID</label>
              <input
                type="text"
                name="hostelId"
                value={form.hostelId}
                disabled
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-gray-100 text-gray-500"
                placeholder="Auto-generated"
              />
              <p className="text-xs text-gray-500 mt-1">Auto-generated based on gender</p>
            </div>
          </div>
        </div>

        {/* Academic Information Section */}
        <div className="bg-blue-50 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Academic Information</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Course *</label>
              <select
                name="course"
                value={form.course}
                onChange={handleFormChange}
                required
                disabled={loadingCourses}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Year *</label>
              <select
                name="year"
                value={form.year}
                onChange={handleFormChange}
                required
                disabled={!form.course}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Branch *</label>
              <select
                name="branch"
                value={form.branch}
                onChange={handleFormChange}
                required
                disabled={!form.course || loadingBranches}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Batch *</label>
              <select
                name="batch"
                value={form.batch}
                onChange={handleFormChange}
                required
                disabled={!form.course}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select Batch</option>
                {form.course && generateBatches(form.course, courses).map(batch => (
                  <option key={batch} value={batch}>{batch}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Academic Year *</label>
              <select
                name="academicYear"
                value={form.academicYear}
                onChange={handleFormChange}
                required
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select Academic Year</option>
                {generateAcademicYears().map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

                 {/* Hostel Information Section */}
         <div className="bg-blue-50 rounded-lg p-6">
           <div className="flex items-center mb-4">
             <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
               <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
               </svg>
             </div>
             <h3 className="text-lg font-semibold text-gray-900">Hostel Information</h3>
           </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
              <select
                name="category"
                value={form.category}
                onChange={handleFormChange}
                required
                                   disabled={!form.gender}
                   className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Room Number *</label>
              <div className="flex gap-2">
                <select
                  name="roomNumber"
                  value={form.roomNumber}
                  onChange={handleFormChange}
                  required
                                     disabled={!form.gender || !form.category || loadingRooms}
                   className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select Room</option>
                  {loadingRooms ? (
                    <option value="" disabled>Loading rooms...</option>
                  ) : (
                    roomsWithAvailability.map(room => (
                      <option key={room._id} value={room.roomNumber}>
                        Room {room.roomNumber} ({room.studentCount}/{room.bedCount})
                      </option>
                    ))
                  )}
                </select>
                {form.roomNumber && (
                  <button
                    type="button"
                    onClick={() => {
                      const selectedRoom = roomsWithAvailability.find(r => r.roomNumber === form.roomNumber);
                      if (selectedRoom) {
                        handleRoomView(selectedRoom);
                      }
                                         }}
                     className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                   >
                     View
                   </button>
                )}
              </div>
            </div>
          </div>
          
          {/* Bed and Locker Assignment - Only show when room is selected */}
          {form.roomNumber && (
                         <div className="mt-4 pt-4 border-t border-blue-200">
               <h4 className="text-sm font-medium text-gray-700 mb-3">Bed & Locker Assignment (Optional)</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bed Number</label>
                                     <select
                     name="bedNumber"
                     value={form.bedNumber}
                     onChange={handleFormChange}
                     disabled={loadingBedLocker}
                     className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select Bed (Optional)</option>
                    {loadingBedLocker ? (
                      <option value="" disabled>Loading beds...</option>
                    ) : bedLockerAvailability?.availableBeds?.map(bed => (
                      <option key={bed.value} value={bed.value}>
                        {bed.label}
                      </option>
                    ))}
                  </select>
                  {bedLockerAvailability && (
                    <p className="text-xs text-gray-500 mt-1">
                      {bedLockerAvailability.availableBeds?.length || 0} of {bedLockerAvailability.room?.bedCount || 0} beds available
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Locker Number</label>
                                     <select
                     name="lockerNumber"
                     value={form.lockerNumber}
                     onChange={handleFormChange}
                     disabled={loadingBedLocker}
                     className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select Locker (Optional)</option>
                    {loadingBedLocker ? (
                      <option value="" disabled>Loading lockers...</option>
                    ) : bedLockerAvailability?.availableLockers?.map(locker => (
                      <option key={locker.value} value={locker.value}>
                        {locker.label}
                      </option>
                    ))}
                  </select>
                  {bedLockerAvailability && (
                    <p className="text-xs text-gray-500 mt-1">
                      {bedLockerAvailability.availableLockers?.length || 0} of {bedLockerAvailability.room?.bedCount || 0} lockers available
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

                 {/* Contact Information Section */}
         <div className="bg-blue-50 rounded-lg p-6">
           <div className="flex items-center mb-4">
             <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
               <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
               </svg>
             </div>
             <h3 className="text-lg font-semibold text-gray-900">Contact Information</h3>
           </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Student Phone</label>
              <input
                type="tel"
                name="studentPhone"
                value={form.studentPhone}
                onChange={handleFormChange}
                pattern="[0-9]{10}"
                title="10 digit phone number"
                                 className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                 placeholder="Enter phone number (optional)"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Parent Phone *</label>
              <input
                type="tel"
                name="parentPhone"
                value={form.parentPhone}
                onChange={handleFormChange}
                required
                pattern="[0-9]{10}"
                title="10 digit phone number"
                                 className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                 placeholder="Enter parent's phone number"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleFormChange}
                                 className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                 placeholder="Enter email address (optional)"
              />
              <p className="text-xs text-gray-500 mt-1">Credentials will be sent to this email if provided</p>
            </div>
          </div>
        </div>
        
                 {/* Photo Upload Section */}
         <div className="bg-blue-50 rounded-lg p-6">
           <div className="flex items-center mb-4">
             <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
               <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
               </svg>
             </div>
             <h3 className="text-lg font-semibold text-gray-900">Profile Photos (Optional)</h3>
           </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {/* Student Photo */}
                         <div className="bg-white rounded-lg p-4 border border-blue-200">
               <label className="block text-sm font-medium text-gray-700 mb-3">Student Photo</label>
               <div className="space-y-3">
                 <div className="flex items-center justify-center w-full">
                   <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-blue-300 border-dashed rounded-lg cursor-pointer bg-blue-50 hover:bg-blue-100 transition-colors">
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
                          <PhotoIcon className="w-8 h-8 mb-2 text-blue-400" />
                          <p className="text-sm text-blue-600">Click to upload</p>
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
                                   <button
                     type="button"
                     onClick={() => startCamera('student')}
                     className="w-full px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center space-x-2 transition-colors"
                   >
                     <CameraIcon className="w-4 h-4" />
                     <span>Take Photo</span>
                   </button>
              </div>
            </div>

            {/* Guardian Photo 1 */}
                         <div className="bg-white rounded-lg p-4 border border-blue-200">
               <label className="block text-sm font-medium text-gray-700 mb-3">Parents Photo</label>
               <div className="space-y-3">
                 <div className="flex items-center justify-center w-full">
                   <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-blue-300 border-dashed rounded-lg cursor-pointer bg-blue-50 hover:bg-blue-100 transition-colors">
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
                          <PhotoIcon className="w-8 h-8 mb-2 text-blue-400" />
                          <p className="text-sm text-blue-600">Click to upload</p>
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
                                   <button
                     type="button"
                     onClick={() => startCamera('guardian1')}
                     className="w-full px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center space-x-2 transition-colors"
                   >
                     <CameraIcon className="w-4 h-4" />
                     <span>Take Photo</span>
                   </button>
              </div>
            </div>

            {/* Guardian Photo 2 */}
                         <div className="bg-white rounded-lg p-4 border border-blue-200">
               <label className="block text-sm font-medium text-gray-700 mb-3">Local Guardian Photo</label>
               <div className="space-y-3">
                 <div className="flex items-center justify-center w-full">
                   <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-blue-300 border-dashed rounded-lg cursor-pointer bg-blue-50 hover:bg-blue-100 transition-colors">
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
                          <PhotoIcon className="w-8 h-8 mb-2 text-blue-400" />
                          <p className="text-sm text-blue-600">Click to upload</p>
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
                                   <button
                     type="button"
                     onClick={() => startCamera('guardian2')}
                     className="w-full px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center space-x-2 transition-colors"
                   >
                     <CameraIcon className="w-4 h-4" />
                     <span>Take Photo</span>
                   </button>
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-4 text-center">Maximum file size: 5MB. Supported formats: JPG, PNG, GIF</p>
        </div>
        
        {/* Submit Button */}
        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={adding}
            className={`px-6 py-3 rounded-lg text-white font-medium transition-all duration-200 text-sm ${
              adding 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg transform hover:scale-105'
            }`}
          >
            {adding ? (
              <div className="flex items-center space-x-2">
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Adding Student...</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span>Add Student</span>
              </div>
            )}
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

    // Keep the functionality for later use but don't display
    const countsByCourse = courseCounts;
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
                          <th scope="col" className="px-3 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hostel ID</th>
                          <th scope="col" className="px-3 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Roll Number</th>
                          <th scope="col" className="hidden sm:table-cell px-3 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Course</th>
                          <th scope="col" className="hidden md:table-cell px-3 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Room</th>
                          <th scope="col" className="hidden lg:table-cell px-3 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          <th scope="col" className="px-3 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {students.map(student => (
                          <tr key={student._id} className="hover:bg-gray-50 cursor-pointer" onClick={() => openStudentDetailsModal(student)}>
                            <td className="px-3 py-4 whitespace-nowrap">
                              {student.studentPhoto ? (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openPhotoEditModal(student);
                                  }}
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
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openPhotoEditModal(student);
                                  }}
                                  className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center text-white text-xs font-bold hover:from-blue-700 hover:to-blue-900 hover:shadow-md transition-all duration-200 cursor-pointer"
                                  title="Click to add photos"
                                >
                                  {student.name?.charAt(0).toUpperCase()}
                                </button>
                              )}
                            </td>
                            <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">{student.name}</td>
                            <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500 font-medium">{student.hostelId || 'N/A'}</td>
                            <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">{student.rollNumber}</td>
                            <td className="hidden sm:table-cell px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                              {student.course?.name || getCourseName(student.course)}
                            </td>
                            <td className="hidden md:table-cell px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                              <div className="flex flex-col">
                                <span>Room {student.roomNumber}</span>
                                {student.bedNumber && (
                                  <span className="text-xs text-blue-600">Bed: {student.bedNumber}</span>
                                )}
                                {student.lockerNumber && (
                                  <span className="text-xs text-green-600">Locker: {student.lockerNumber}</span>
                                )}
                              </div>
                            </td>
                            <td className="hidden lg:table-cell px-3 py-4 whitespace-nowrap text-sm">
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
                                {canEditStudent ? (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openEditModal(student);
                                    }}
                                    className="p-1.5 text-blue-600 hover:text-blue-800 rounded-lg hover:bg-blue-50 transition-colors"
                                    title="Edit student"
                                  >
                                    <PencilSquareIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                                  </button>
                                ) : (
                                  <button
                                    disabled
                                    className="p-1.5 text-gray-400 cursor-not-allowed rounded-lg"
                                    title="Edit access restricted"
                                  >
                                    <LockClosedIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                                  </button>
                                )}
                                {canDeleteStudent ? (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDelete(student._id);
                                    }}
                                    disabled={deletingId === student._id}
                                    className="p-1.5 text-red-600 hover:text-red-800 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                                    title="Delete student"
                                  >
                                    <TrashIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                                  </button>
                                ) : (
                                  <button
                                    disabled
                                    className="p-1.5 text-gray-400 cursor-not-allowed rounded-lg"
                                    title="Delete access restricted"
                                  >
                                    <LockClosedIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                                  </button>
                                )}
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

  // Student Details Modal
  const renderStudentDetailsModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-6xl w-full max-h-[95vh] overflow-hidden">
        {selectedStudent && (
          <>
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-800">Student Details</h3>
              <button
                onClick={() => setStudentDetailsModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-lg"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(95vh-140px)]">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Photo and Basic Info */}
                <div className="lg:col-span-1">
                  {/* Student Photo */}
                  <div className="flex justify-center mb-6">
                    {selectedStudent.studentPhoto ? (
                      <img
                        src={selectedStudent.studentPhoto}
                        alt={selectedStudent.name}
                        className="w-40 h-40 rounded-full object-cover border-4 border-gray-200 shadow-lg"
                      />
                    ) : (
                      <div className="w-40 h-40 rounded-full bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center text-white text-4xl font-bold shadow-lg">
                        {selectedStudent.name?.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* Basic Information */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-lg font-semibold text-gray-800 mb-4">Basic Information</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Name:</span>
                        <span className="font-medium text-gray-900">{selectedStudent.name}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Roll Number:</span>
                        <span className="font-medium text-gray-900">{selectedStudent.rollNumber}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Hostel ID:</span>
                        <span className="font-medium text-gray-900">{selectedStudent.hostelId || 'Not assigned'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Gender:</span>
                        <span className="font-medium text-gray-900">{selectedStudent.gender}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Columns - Academic, Contact, and Hostel Info */}
                <div className="lg:col-span-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Academic Information */}
                    <div className="bg-blue-50 rounded-lg p-4">
                      <h4 className="text-lg font-semibold text-blue-800 mb-4 flex items-center">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                        Academic Information
                      </h4>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-blue-700">Course:</span>
                          <span className="font-medium text-blue-900">{selectedStudent.course?.name || getCourseName(selectedStudent.course)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-blue-700">Branch:</span>
                          <span className="font-medium text-blue-900">{selectedStudent.branch?.name || getBranchName(selectedStudent.branch)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-blue-700">Year:</span>
                          <span className="font-medium text-blue-900">Year {selectedStudent.year}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-blue-700">Category:</span>
                          <span className="font-medium text-blue-900">{selectedStudent.category === 'A+' ? 'A+ (AC)' : selectedStudent.category === 'B+' ? 'B+ (AC)' : selectedStudent.category}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-blue-700">Batch:</span>
                          <span className="font-medium text-blue-900">{selectedStudent.batch}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-blue-700">Academic Year:</span>
                          <span className="font-medium text-blue-900">{selectedStudent.academicYear}</span>
                        </div>
                      </div>
                    </div>

                    {/* Contact Information */}
                    <div className="bg-green-50 rounded-lg p-4">
                      <h4 className="text-lg font-semibold text-green-800 mb-4 flex items-center">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        Contact Information
                      </h4>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-green-700">Student Phone:</span>
                          <span className="font-medium text-green-900">{selectedStudent.studentPhone}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-green-700">Parent Phone:</span>
                          <span className="font-medium text-green-900">{selectedStudent.parentPhone}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-green-700">Email:</span>
                          <span className="font-medium text-green-900 break-all">{selectedStudent.email}</span>
                        </div>
                      </div>
                    </div>

                    {/* Hostel Information */}
                    <div className="bg-purple-50 rounded-lg p-4">
                      <h4 className="text-lg font-semibold text-purple-800 mb-4 flex items-center">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        Hostel Information
                      </h4>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-purple-700">Room Number:</span>
                          <span className="font-medium text-purple-900">Room {selectedStudent.roomNumber}</span>
                        </div>
                        {selectedStudent.bedNumber && (
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-purple-700">Bed Number:</span>
                            <span className="font-medium text-blue-600">{selectedStudent.bedNumber}</span>
                          </div>
                        )}
                        {selectedStudent.lockerNumber && (
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-purple-700">Locker Number:</span>
                            <span className="font-medium text-green-600">{selectedStudent.lockerNumber}</span>
                          </div>
                        )}
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-purple-700">Hostel Status:</span>
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            selectedStudent.hostelStatus === 'Active' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {selectedStudent.hostelStatus}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-purple-700">Graduation Status:</span>
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            selectedStudent.graduationStatus === 'Graduated' 
                              ? 'bg-blue-100 text-blue-800' 
                              : selectedStudent.graduationStatus === 'Dropped'
                              ? 'bg-gray-100 text-gray-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {selectedStudent.graduationStatus}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => {
                  setStudentDetailsModal(false);
                  openEditModal(selectedStudent);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit Student
              </button>
              <button
                onClick={() => {
                  setStudentDetailsModal(false);
                  openPhotoEditModal(selectedStudent);
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Edit Photos
              </button>
              <button
                onClick={() => {
                  setStudentDetailsModal(false);
                  openPasswordResetModal(selectedStudent);
                }}
                className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors flex items-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
                Reset Password
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );

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
              <label className="block text-xs sm:text-sm font-medium text-gray-700">Hostel ID</label>
              <input
                type="text"
                name="hostelId"
                value={editForm.hostelId}
                disabled
                className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-sm border border-gray-300 rounded-lg bg-gray-100 text-gray-500"
                placeholder="Auto-generated"
              />
              <p className="text-xs text-gray-500">Cannot be modified</p>
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
              <label className="block text-xs sm:text-sm font-medium text-gray-700">Bed Number (Optional)</label>
              <input
                type="text"
                name="bedNumber"
                value={editForm.bedNumber || ''}
                onChange={handleEditFormChange}
                className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., 320 Bed 1"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs sm:text-sm font-medium text-gray-700">Locker Number (Optional)</label>
              <input
                type="text"
                name="lockerNumber"
                value={editForm.lockerNumber || ''}
                onChange={handleEditFormChange}
                className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., 320 Locker 1"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs sm:text-sm font-medium text-gray-700">Student Phone</label>
              <input
                type="tel"
                name="studentPhone"
                value={editForm.studentPhone}
                onChange={handleEditFormChange}
                pattern="[0-9]{10}"
                className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter phone number (optional)"
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
              <label className="block text-xs sm:text-sm font-medium text-gray-700">Email (Optional)</label>
              <input
                type="email"
                name="email"
                value={editForm.email}
                onChange={handleEditFormChange}
                className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter email address (optional)"
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

            {/* Update Student Years Button */}
            <button
              onClick={handleUpdateStudentYears}
              className="w-full py-2 px-4 rounded-lg text-white font-medium transition-all duration-200 bg-orange-600 hover:bg-orange-700"
            >
              Update Student Years
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
                <li>• Email (Optional - Valid email address for credential delivery)</li>
                <li>• Batch (Format based on course duration):
                  <ul className="ml-4 mt-1 space-y-1">
                    <li>- B.Tech/Pharmacy: YYYY-YYYY (4 years, e.g., 2020-2024)</li>
                    <li>- Diploma/Degree: YYYY-YYYY (3 years, e.g., 2020-2023)</li>
                  </ul>
                </li>
                <li>• AcademicYear (e.g., 2023-2024)</li>
                <li>• <strong>Hostel ID will be automatically generated</strong> based on gender (BH for Male, GH for Female)</li>
                <li>• <strong>Password will be automatically generated</strong> and sent to email if provided</li>
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

          {/* Validation Summary */}
          {(() => {
            const validCount = editablePreviewData.filter((_, index) => 
              !previewErrors[index] || Object.keys(previewErrors[index]).length === 0
            ).length;
            const invalidCount = editablePreviewData.length - validCount;
            
            return (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-md font-medium text-gray-800">Validation Summary</h4>
                  <div className="text-sm text-gray-600">
                Click on any cell to edit • Changes are saved automatically
              </div>
            </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-green-50 p-3 rounded-lg">
                    <div className="text-sm font-medium text-green-800">Valid Students</div>
                    <div className="text-2xl font-bold text-green-600">{validCount}</div>
                  </div>
                  <div className="bg-red-50 p-3 rounded-lg">
                    <div className="text-sm font-medium text-red-800">Invalid Rows</div>
                    <div className="text-2xl font-bold text-red-600">{invalidCount}</div>
                  </div>
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <div className="text-sm font-medium text-blue-800">Total Rows</div>
                    <div className="text-2xl font-bold text-blue-600">{editablePreviewData.length}</div>
                  </div>
                </div>
                {invalidCount > 0 && (
                  <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center">
                      <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600 mr-2" />
                      <div className="text-sm text-yellow-800">
                        <strong>Note:</strong> {invalidCount} row(s) have validation errors and will be skipped during upload. 
                        Only valid students will be added to the system.
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Editable Students Table */}
          <div className="mb-6">
            {editablePreviewData.length > 0 ? (
              <div className="overflow-x-auto border rounded-lg">
                <table className="min-w-[1500px] divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                      <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Row</th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Name</th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Hostel ID</th>
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
                              value={student.HostelId || ''}
                              disabled
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded bg-gray-100 text-gray-500"
                              placeholder="Auto-generated"
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
                              value={normalizeCourseName(student.Course) || ''}
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
                                const normalizedCourse = normalizeCourseName(student.Course);
                                const course = courses.find(c => c.name === normalizedCourse);
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
                            {Object.entries(item.errors).map(([field, error], i) => (
                              <li key={i}>
                                <span className="font-medium">{field}:</span> {error}
                              </li>
                            ))}
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
              disabled={bulkProcessing || editablePreviewData.length === 0}
              className={`px-4 py-2 text-white rounded-lg transition-colors ${
                (bulkProcessing || editablePreviewData.length === 0)
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {bulkProcessing ? 'Uploading...' : `Confirm and Add ${editablePreviewData.filter((_, index) => !previewErrors[index] || Object.keys(previewErrors[index]).length === 0).length} Valid Students`}
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
      
      {/* Gender Filter */}
      {tempStudentsSummary.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Filter by Gender:</label>
            <select
              value={tempStudentsGenderFilter}
              onChange={(e) => setTempStudentsGenderFilter(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Students</option>
              <option value="Male">Male Students</option>
              <option value="Female">Female Students</option>
            </select>
          </div>
          <div className="text-sm text-gray-600">
            Showing {tempStudentsSummary.filter(student => 
              tempStudentsGenderFilter === 'all' || student.gender === tempStudentsGenderFilter
            ).length} of {tempStudentsSummary.length} students
          </div>
        </div>
      )}
      
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
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hostel ID</th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Roll Number</th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Generated Password</th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Added On</th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {tempStudentsSummary
                .filter(student => tempStudentsGenderFilter === 'all' || student.gender === tempStudentsGenderFilter)
                .map(student => (
                <tr key={student._id}>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">{student.name}</td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-medium">{student.hostelId || 'N/A'}</td>
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
                        <p className="text-gray-500">{student.rollNumber} - {student.course?.name || getCourseName(student.course) || 'N/A'} • {getBranchName(student.branch)}</p>
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
                <div className="space-y-2">
                  <div className="flex items-center justify-center w-full">
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-blue-300 border-dashed rounded-lg cursor-pointer bg-blue-50 hover:bg-blue-100">
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
                  <button
                    type="button"
                    onClick={() => startCamera('edit_student')}
                    className="w-full px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center space-x-2"
                  >
                    <CameraIcon className="w-4 h-4" />
                    <span>Take Photo</span>
                  </button>
                </div>
              </div>

              {/* Guardian Photo 1 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Parents</label>
                <div className="space-y-2">
                  <div className="flex items-center justify-center w-full">
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-blue-300 border-dashed rounded-lg cursor-pointer bg-blue-50 hover:bg-blue-100">
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
                  <button
                    type="button"
                    onClick={() => startCamera('edit_guardian1')}
                    className="w-full px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center space-x-2"
                  >
                    <CameraIcon className="w-4 h-4" />
                    <span>Take Photo</span>
                  </button>
                </div>
              </div>

              {/* Guardian Photo 2 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Local Guardian</label>
                <div className="space-y-2">
                  <div className="flex items-center justify-center w-full">
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-blue-300 border-dashed rounded-lg cursor-pointer bg-blue-50 hover:bg-blue-100">
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
                  <button
                    type="button"
                    onClick={() => startCamera('edit_guardian2')}
                    className="w-full px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center space-x-2"
                  >
                    <CameraIcon className="w-4 h-4" />
                    <span>Take Photo</span>
                  </button>
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

  const openStudentDetailsModal = (student) => {
    setSelectedStudent(student);
    setStudentDetailsModal(true);
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

  // Camera Modal Component
  const renderCameraModal = () => (
    showCamera && (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl p-6 w-full max-w-2xl mx-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-gray-800">
              Take Photo - {
                cameraType === 'student' ? 'Student' : 
                cameraType === 'guardian1' ? 'Guardian 1' : 
                cameraType === 'guardian2' ? 'Guardian 2' :
                cameraType === 'edit_student' ? 'Student (Edit)' :
                cameraType === 'edit_guardian1' ? 'Guardian 1 (Edit)' :
                cameraType === 'edit_guardian2' ? 'Guardian 2 (Edit)' : 'Photo'
              }
            </h3>
            <button
              onClick={stopCamera}
              className="text-gray-500 hover:text-gray-700 p-1"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
          
          <div className="relative">
            {!cameraReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900 rounded-lg z-10">
                <div className="text-center text-white">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                  <p>Loading camera...</p>
                </div>
              </div>
            )}
            
            <video
              ref={(el) => setVideoRef(el)}
              autoPlay
              playsInline
              muted
              className="w-full h-96 bg-gray-900 rounded-lg"
              style={{ transform: 'scaleX(-1)' }} // Mirror the video
              onLoadedMetadata={() => {
                if (videoRef && stream) {
                  videoRef.play();
                  setCameraReady(true);
                }
              }}
            />
            
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="border-2 border-white border-dashed rounded-lg p-4 opacity-50">
                <div className="w-32 h-40 border-2 border-white rounded-lg"></div>
              </div>
            </div>
          </div>
          
          <div className="flex justify-center space-x-4 mt-4">
            <button
              onClick={capturePhoto}
              disabled={!cameraReady}
              className={`px-6 py-3 rounded-lg flex items-center space-x-2 ${
                cameraReady 
                  ? 'bg-blue-600 text-white hover:bg-blue-700' 
                  : 'bg-gray-400 text-gray-200 cursor-not-allowed'
              }`}
            >
              <CameraIcon className="w-5 h-5" />
              <span>{cameraReady ? 'Capture Photo' : 'Loading...'}</span>
            </button>
            <button
              onClick={stopCamera}
              className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              Cancel
            </button>
          </div>
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
          <div className="flex flex-wrap gap-1 sm:gap-2 justify-center">
            {TABS.map(t => {
              // Check if tab should be shown based on permissions
              if (t.value === 'add' && !canAddStudent) {
                return null; // Hide Add Student tab if no permission
              }
              if (t.value === 'bulkUpload' && !canAddStudent) {
                return null; // Hide Bulk Upload tab if no permission
              }
              
              return (
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
            );
            })}
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
      {studentDetailsModal && renderStudentDetailsModal()}
      <BatchRenewalModal
        isOpen={renewalModalOpen}
        onClose={() => setRenewalModalOpen(false)}
        onRenew={handleRenewBatches}
      />
      {passwordResetModal && renderPasswordResetModal()}
      {renderCameraModal()}
      
      {/* Room View Modal */}
      {showRoomViewModal && selectedRoom && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                Room {selectedRoom.roomNumber} Details
              </h2>
              <button
                onClick={() => setShowRoomViewModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            {/* Room Information */}
            <div className="mb-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Room Information</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Room Number:</span>
                    <span className="font-medium">{selectedRoom.roomNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Gender:</span>
                    <span className="font-medium">{selectedRoom.gender}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Category:</span>
                    <span className="font-medium">{selectedRoom.category}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Beds:</span>
                    <span className="font-medium">{selectedRoom.bedCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Occupied Beds:</span>
                    <span className="font-medium">{selectedRoom.studentCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Available Beds:</span>
                    <span className="font-medium text-green-600">{selectedRoom.availableBeds}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Occupancy Rate:</span>
                    <span className="font-medium">{selectedRoom.occupancyRate}%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Course-wise Student Count */}
            {roomStudents && roomStudents.length > 0 && (
              <div className="mb-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                    <AcademicCapIcon className="w-5 h-5 mr-2" />
                    Course-wise Student Count
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {(() => {
                      // Calculate course-wise counts (only by course, not branch)
                      const courseCounts = roomStudents.reduce((acc, student) => {
                        const courseName = student.course?.name || getCourseName(student.course) || 'Unknown Course';
                        
                        if (!acc[courseName]) {
                          acc[courseName] = {
                            count: 0,
                            courseName
                          };
                        }
                        
                        acc[courseName].count++;
                        return acc;
                      }, {});

                      // Color palette for different courses
                      const colors = [
                        'bg-blue-500 text-white',
                        'bg-green-500 text-white', 
                        'bg-purple-500 text-white',
                        'bg-orange-500 text-white',
                        'bg-red-500 text-white',
                        'bg-indigo-500 text-white',
                        'bg-pink-500 text-white',
                        'bg-teal-500 text-white'
                      ];

                      return Object.entries(courseCounts).map(([courseName, data], index) => (
                        <div 
                          key={courseName} 
                          className={`${colors[index % colors.length]} px-3 sm:px-4 py-3 rounded-lg flex items-center gap-2 sm:gap-3`}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-xs sm:text-sm truncate">{data.courseName}</div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="text-lg sm:text-xl lg:text-2xl font-bold">{data.count}</div>
                            <div className="text-xs opacity-90">students</div>
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              </div>
            )}

            {/* Students List */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Students in Room</h3>
              {loadingRoomStudents ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner size="sm" />
                </div>
              ) : !roomStudents || roomStudents.length === 0 ? (
                <div className="text-center py-8">
                  <UserGroupIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500">No students assigned to this room</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {roomStudents.map((student) => (
                    <div
                      key={student._id}
                      className="bg-gray-50 rounded-lg p-4 flex items-start gap-4"
                    >
                      <div className="bg-blue-100 p-2 rounded-lg">
                        <UserIcon className="w-6 h-6 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{student.name}</h3>
                        <div className="mt-2 space-y-1 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <AcademicCapIcon className="w-4 h-4" />
                            <span>Roll No: {student.rollNumber}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <PhoneIcon className="w-4 h-4" />
                            <span>Phone: {student.studentPhone}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                              {(student.course?.name || getCourseName(student.course) || 'N/A')} - {(student.branch?.name || getBranchName(student.branch) || 'N/A')}
                            </span>
                            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                              Year {student.year}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Students;