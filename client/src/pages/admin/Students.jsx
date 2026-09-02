import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../utils/axios';
import toast from 'react-hot-toast';
import { TableCellsIcon, PencilSquareIcon, TrashIcon, MagnifyingGlassIcon, ChevronLeftIcon, ChevronRightIcon, ChevronDownIcon, ChevronUpIcon, PrinterIcon, DocumentArrowDownIcon, XMarkIcon, XCircleIcon, PhotoIcon, UserIcon, UserGroupIcon, AcademicCapIcon, PhoneIcon, ExclamationTriangleIcon, CameraIcon, VideoCameraIcon, LockClosedIcon, CheckCircleIcon, XCircleIcon as XCircleIconSolid, ArrowsRightLeftIcon, Squares2X2Icon, CalendarDaysIcon } from '@heroicons/react/24/outline';
import LoadingSpinner from '../../components/LoadingSpinner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useAuth } from '../../context/AuthContext';
import { hasFullAccess, canPerformAction, hasPermission } from '../../utils/permissionUtils';
import { downloadAdmitCard } from '../../utils/admitCardGenerator';
import PrintableLiveStudents from '../../components/PrintableLiveStudents';
import PrintableStudentDates from '../../components/PrintableStudentDates';
import RoomChangesPanel from '../../components/RoomChangesPanel';
import CategoryChangesPanel from '../../components/CategoryChangesPanel';
import * as XLSX from 'xlsx';
import { dedupeStudentsByIdentity } from '../../utils/studentListDedupe';


// Dynamic course and branch data will be fetched from backend

const TABS = [
  { label: 'Hostel Requests', value: 'list', icon: <TableCellsIcon className="w-5 h-5" /> },
  { label: 'Room Changes', value: 'room-changes', icon: <ArrowsRightLeftIcon className="w-5 h-5" /> },
  { label: 'Category Changes', value: 'category-changes', icon: <Squares2X2Icon className="w-5 h-5" /> },
  { label: 'Dates', value: 'dates', icon: <CalendarDaysIcon className="w-5 h-5" /> },
];

const FILTER_LABELS = {
  course: 'Course',
  branch: 'Branch',
  hostel: 'Hostel',
  category: 'Category',
  roomNumber: 'Room',
  academicYear: 'Academic Year',
  hostelStatus: 'Status'
};

const REQUEST_STATUS_LABELS = {
  active: 'Active',
  expired: 'Expired',
  cancelled: 'Cancelled',
  // Legacy chip values (pre Phase 5)
  Active: 'Active',
  Inactive: 'Expired'
};

const formatFilterChipValue = (key, value) => {
  if (key === 'hostelStatus') {
    return REQUEST_STATUS_LABELS[value] || toDisplayText(value);
  }
  return toDisplayText(value);
};

const shouldShowFilterChip = (key, value) => {
  if (!value || key === 'search') return false;
  // Default list view is active requests — don't show as a removable chip
  if (key === 'hostelStatus' && (value === 'active' || value === 'Active')) return false;
  if (key === 'academicYear' && value === getDefaultAcademicYear()) return false;
  return true;
};

const getDefaultAcademicYear = () => {
  const year = new Date().getFullYear();
  return `${year}-${year + 1}`;
};

const initialForm = {
  name: '',
  rollNumber: '',
  admissionNumber: '', // Add admission number field
  gender: '',
  course: '',
  year: '',
  branch: '',
  category: '',
  mealType: '',
  parentPermissionForOuting: true,
  roomNumber: '',
  bedNumber: '',
  lockerNumber: '',
  studentPhone: '',
  parentPhone: '',
  motherName: '',
  motherPhone: '',
  localGuardianName: '',
  localGuardianPhone: '',
  batch: '',
  academicYear: getDefaultAcademicYear(),
  email: '',
  hostelId: '', // Add hostelId field
  concession: 0 // Add concession field
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

// Helper to normalize text values for safe comparisons
const normalizeText = (value) => (value || '').toString().trim().toUpperCase();

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
  const course = courses.find(
    c => c._id === courseId || normalizeText(c.name) === normalizeText(courseId)
  );
  const duration = course ? course.duration : 4; // Default to 4 years

  // Generate batches starting from 2022 for next 10 years
  for (let i = 0; i < 10; i++) {
    const startYear = startFromYear + i;
    const endYear = startYear + duration;
    batches.push(`${startYear}-${endYear}`);
  }

  return batches;
};

// Batch = admission start year (matches SQL / backend batchUtils)
const normalizeBatchToYear = (batch) => {
  if (!batch) return '';
  const trimmed = String(batch).trim();
  if (/^\d{4}$/.test(trimmed)) return trimmed;
  if (/^\d{4}-\d{4}$/.test(trimmed)) return trimmed.split('-')[0];
  return trimmed;
};

const getBatchYearOptions = (currentBatch) => {
  const startYear = 2022;
  const years = [];
  for (let i = 0; i < 10; i++) {
    years.push(String(startYear + i));
  }
  const normalized = normalizeBatchToYear(currentBatch);
  if (normalized && !years.includes(normalized)) {
    return [normalized, ...years];
  }
  return years;
};

const readOnlyInputClass =
  'w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-gray-100 text-gray-700 cursor-not-allowed';
const readOnlySelectClass =
  'w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-gray-100 text-gray-700 cursor-not-allowed';

const generateAcademicYears = () => {
  const currentYear = new Date().getFullYear();
  const years = [];

  for (let i = -3; i <= 3; i++) {
    const year = currentYear + i;
    years.push(`${year}-${year + 1}`);
  }

  return years;
};

const toDisplayText = (value, fallback = '') => {
  if (value == null || value === '') return fallback;
  if (typeof value === 'object') {
    if (value.name != null) return toDisplayText(value.name, fallback);
    return fallback;
  }
  return String(value);
};

const getCategoryDisplay = (category) => {
  if (!category) return '';
  const text = getCategoryValue(category);
  if (text === 'A+') return 'A+ (AC)';
  if (text === 'B+') return 'B+ (AC)';
  return text;
};

/** Raw category name for forms/API (never the display label with "(AC)"). */
const getCategoryValue = (category) => {
  if (!category) return '';
  if (typeof category === 'object') {
    return getCategoryValue(category.name || category);
  }
  return toDisplayText(category).replace(/\s*\(AC\)\s*$/i, '').trim();
};


const formatDisplayDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

const isStudentExpired = (student) => {
  if (student?.hostelRequestStatus === 'expired') return true;
  if (student?.hostelRequestStatus === 'cancelled') return true;
  return student?.applicationStatus === 'Expired' || student?.applicationStatus === 'Withdrawn';
};

const canDeactivateStudent = (student) =>
  student &&
  !student.isHistoricalView &&
  (student.hostelRequestStatus
    ? student.hostelRequestStatus === 'active'
    : ['Active', 'Extended'].includes(student.applicationStatus));

const getHostelStatusDisplay = (student) => {
  if (student?.hostelRequestStatus === 'active') {
    return {
      label: 'Active',
      badgeClass: 'bg-green-100 text-green-800',
      expiryText: null,
      nocDateText: null
    };
  }

  if (student?.hostelRequestStatus === 'cancelled') {
    return {
      label: 'Cancelled',
      badgeClass: 'bg-gray-100 text-gray-800',
      expiryText: formatDisplayDate(student.cancelledAt || student.allocatedTo),
      nocDateText: student.nocDate ? formatDisplayDate(student.nocDate) : null
    };
  }

  if (student?.hostelRequestStatus === 'expired' || isStudentExpired(student)) {
    // Prefer leftDate / HostelRequest expiry — not stale occupancy-history allocatedTo
    const expiryDate =
      student.leftDate ||
      student.actualExpiredAt ||
      student.allocatedTo ||
      student.applicationExpiryDate;
    return {
      label: 'Expired',
      badgeClass: 'bg-red-100 text-red-800',
      expiryText: formatDisplayDate(expiryDate),
      nocDateText: student.nocDate ? formatDisplayDate(student.nocDate) : null
    };
  }

  if (['Active', 'Extended'].includes(student?.applicationStatus) && !isStudentExpired(student)) {
    return {
      label: student.applicationStatus === 'Extended' ? 'Extended' : 'Active',
      badgeClass: 'bg-green-100 text-green-800',
      expiryText: null,
      nocDateText: null
    };
  }

  return {
    label: student?.applicationStatus || '—',
    badgeClass: 'bg-gray-100 text-gray-800',
    expiryText: null,
    nocDateText: null
  };
};

const shouldShowGraduationStatus = (status) =>
  status && status !== 'Enrolled';

const Students = () => {

  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isSuperAdmin = user?.role === 'super_admin';
  const canEditRoomCategory = isSuperAdmin;
  const canEditStudent = isSuperAdmin || canPerformAction(user, 'student_management', 'edit');
  const canDeleteStudent = isSuperAdmin || canPerformAction(user, 'student_management', 'delete');
  const canAddStudent = isSuperAdmin || canPerformAction(user, 'student_management', 'create');
  const canManageConcessions = isSuperAdmin || hasPermission(user, 'concession_management');


  const [tab, setTab] = useState('list');
  const [form, setForm] = useState(initialForm);

  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [error, setError] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [editModal, setEditModal] = useState(false);
  const [editForm, setEditForm] = useState(initialForm);
  const [editId, setEditId] = useState(null);
  const [editing, setEditing] = useState(false);
  const [originalEditForm, setOriginalEditForm] = useState(null); // Store original form data
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    course: '',
    branch: '',
    hostel: '',
    category: '',
    roomNumber: '',
    academicYear: getDefaultAcademicYear(),
    hostelStatus: 'active' // Default: active hostel requests for the year
  });
  const [filterCategories, setFilterCategories] = useState([]);
  const [filterRooms, setFilterRooms] = useState([]);
  const [loadingFilterRooms, setLoadingFilterRooms] = useState(false);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalStudents, setTotalStudents] = useState(0);
  const [printStudents, setPrintStudents] = useState([]);
  const [printDatesStudents, setPrintDatesStudents] = useState([]);
  const [courseCounts, setCourseCounts] = useState({});

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

  // Fee structure and calculation states
  const [feeStructure, setFeeStructure] = useState(null);
  const [loadingFeeStructure, setLoadingFeeStructure] = useState(false);
  const [calculatedFees, setCalculatedFees] = useState({
    term1: 0,
    term2: 0,
    term3: 0,
    total: 0
  });
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
  // Edit modal hostel display
  const [editHostelName, setEditHostelName] = useState('');

  // Student details modal states
  const [studentDetailsModal, setStudentDetailsModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showStatusUpdateModal, setShowStatusUpdateModal] = useState(false);
  const [statusUpdateReason, setStatusUpdateReason] = useState('');
  const [statusUpdateLoading, setStatusUpdateLoading] = useState(false);

  // Admit card download state
  const [downloadingAdmitCard, setDownloadingAdmitCard] = useState(false);

  // Concession request modal states
  const [concessionRequestModal, setConcessionRequestModal] = useState(false);
  const [concessionRequestForm, setConcessionRequestForm] = useState({
    amount: '',
    notes: ''
  });
  const [concessionRequestLoading, setConcessionRequestLoading] = useState(false);
  const [concessionFeeStructure, setConcessionFeeStructure] = useState(null);
  const [concessionCalculatedFees, setConcessionCalculatedFees] = useState({
    term1: 0,
    term2: 0,
    term3: 0,
    total: 0
  });
  const [loadingConcessionFeeStructure, setLoadingConcessionFeeStructure] = useState(false);

  // Room availability states
  const [roomsWithAvailability, setRoomsWithAvailability] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [showRoomViewModal, setShowRoomViewModal] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [roomStudents, setRoomStudents] = useState([]);
  const [roomStaff, setRoomStaff] = useState([]);
  const [loadingRoomStudents, setLoadingRoomStudents] = useState(false);

  // Edit form room availability states
  const [editRoomsWithAvailability, setEditRoomsWithAvailability] = useState([]);
  const [loadingEditRooms, setLoadingEditRooms] = useState(false);

  // Bed and locker availability states
  const [bedLockerAvailability, setBedLockerAvailability] = useState(null);
  const [loadingBedLocker, setLoadingBedLocker] = useState(false);

  // Dynamic course and branch data
  const [courses, setCourses] = useState([]);
  const [branches, setBranches] = useState([]);
  const [allBranches, setAllBranches] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [loadingBranches, setLoadingBranches] = useState(false);

  // Hostel and category data for room availability
  const [hostels, setHostels] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loadingHostels, setLoadingHostels] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);

  // SQL database integration states
  const [fetchingFromSQL, setFetchingFromSQL] = useState(false);
  const [sqlFetchError, setSqlFetchError] = useState(null);
  const [sqlDataFetched, setSqlDataFetched] = useState(false);

  // Derived dropdown options
  const courseOptions = useMemo(() => {
    const names = courses.map(c => c.name).filter(Boolean);
    return Array.from(new Set(names)).sort();
  }, [courses]);

  const branchOptions = useMemo(() => {
    const targetCourse = filters.course;
    const filtered = targetCourse
      ? allBranches.filter(branch => normalizeText(branch.course?.name || branch.courseName || branch.course) === normalizeText(targetCourse))
      : allBranches;
    const names = filtered.map(b => b.name).filter(Boolean);
    return Array.from(new Set(names)).sort();
  }, [allBranches, filters.course]);


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
      videoRef.srcObject = stream;
      videoRef.onloadedmetadata = () => {
        videoRef.play();
        setCameraReady(true);
      };

      // Fallback: if video doesn't load within 3 seconds, try to set ready anyway
      const timeout = setTimeout(() => {
        if (!cameraReady && videoRef) {
          setCameraReady(true);
        }
      }, 3000);

      return () => clearTimeout(timeout);
    }
  }, [showCamera, stream, videoRef, cameraReady]);


  // Fetch total course counts
  const fetchCourseCounts = async () => {
    try {
      const params = new URLSearchParams();

      // Add filters only if they have values (excluding search and pagination)
      if (filters.course) params.append('course', filters.course);
      if (filters.branch) params.append('branch', filters.branch);
      if (filters.hostel) params.append('hostel', filters.hostel);
      if (filters.category) params.append('category', filters.category);
      if (filters.roomNumber) params.append('roomNumber', filters.roomNumber);
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


  // Fetch courses from backend
  const fetchCourses = async () => {
    setLoadingCourses(true);
    try {
      const res = await api.get('/api/course-management/courses');
      if (res.data.success) {
        setCourses(res.data.data);
      } else {
        console.error('âŒ Failed to fetch courses:', res.data.message);
        toast.error('Failed to fetch courses');
      }
    } catch (err) {
      console.error('âŒ Error fetching courses:', err);
      console.error('âŒ Error response:', err.response?.data);
      toast.error(err.response?.data?.message || 'Error fetching courses');
    } finally {
      setLoadingCourses(false);
    }
  };

  // Fetch branches (all from SQL) and optionally filter by course name
  const fetchBranches = async (courseIdOrName = '') => {
    setLoadingBranches(true);
    try {
      // Fetch all branches from SQL-backed endpoint
      const res = await api.get('/api/course-management/branches');
      if (res.data.success) {
        const all = res.data.data || [];
        setAllBranches(all);

        const courseName = getCourseName(courseIdOrName) || courseIdOrName;
        const filtered = courseName
          ? all.filter(branch => normalizeText(branch.course?.name || branch.courseName || branch.course) === normalizeText(courseName))
          : all;

        setBranches(filtered);
      } else {
        console.error('âŒ Failed to fetch branches:', res.data.message);
        toast.error('Failed to fetch branches');
      }
    } catch (err) {
      console.error('âŒ Error fetching branches:', err);
      console.error('âŒ Error response:', err.response?.data);
      console.error('âŒ Error status:', err.response?.status);
      toast.error(err.response?.data?.message || 'Error fetching branches');
    } finally {
      setLoadingBranches(false);
    }
  };

  // Fetch hostels
  const fetchHostels = async () => {
    setLoadingHostels(true);
    try {
      const res = await api.get('/api/hostels');
      if (res.data.success) {
        setHostels(res.data.data || []);
      } else {
        console.error('Failed to fetch hostels:', res.data.message);
        toast.error('Failed to fetch hostels');
      }
    } catch (err) {
      console.error('Error fetching hostels:', err);
      toast.error('Error fetching hostels');
    } finally {
      setLoadingHostels(false);
    }
  };

  const fetchFilterCategories = async (hostelId) => {
    if (!hostelId) {
      setFilterCategories([]);
      return [];
    }
    try {
      const res = await api.get(`/api/hostels/${hostelId}/categories`);
      if (res.data.success) {
        const data = res.data.data || [];
        setFilterCategories(data);
        return data;
      }
      setFilterCategories([]);
      return [];
    } catch (err) {
      console.error('Error fetching filter categories:', err);
      setFilterCategories([]);
      return [];
    }
  };

  const fetchFilterRooms = async (hostelId, categoryName, categoryList = filterCategories) => {
    if (!hostelId) {
      setFilterRooms([]);
      return;
    }
    setLoadingFilterRooms(true);
    try {
      const params = { hostel: hostelId };
      if (categoryName) {
        const matchedCategory = categoryList.find(
          (c) => normalizeText(c.name) === normalizeText(categoryName)
        );
        if (matchedCategory?._id) {
          params.category = matchedCategory._id;
        }
      }
      const res = await api.get('/api/admin/rooms', { params });
      if (res.data.success) {
        const rooms = res.data.data?.rooms || [];
        const uniqueRooms = [...new Map(rooms.map((room) => [room.roomNumber, room])).values()]
          .sort((a, b) =>
            String(a.roomNumber).localeCompare(String(b.roomNumber), undefined, { numeric: true })
          );
        setFilterRooms(uniqueRooms);
      } else {
        setFilterRooms([]);
      }
    } catch (err) {
      console.error('Error fetching filter rooms:', err);
      setFilterRooms([]);
    } finally {
      setLoadingFilterRooms(false);
    }
  };

  // Fetch categories for a hostel
  const fetchCategories = async (hostelId) => {
    if (!hostelId) {
      setCategories([]);
      return [];
    }

    setLoadingCategories(true);
    try {
      const res = await api.get(`/api/hostels/${hostelId}/categories`);
      if (res.data.success) {
        const data = res.data.data || [];
        setCategories(data);
        return data;
      } else {
        console.error('Failed to fetch categories:', res.data.message);
        toast.error('Failed to fetch categories');
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
      toast.error('Error fetching categories');
    } finally {
      setLoadingCategories(false);
    }
    return [];
  };

  // Get hostel ID from gender (Male -> Boys Hostel, Female -> Girls Hostel)
  const getHostelIdFromGender = (gender) => {
    if (!gender) return null;
    const hostelName = gender === 'Male' ? 'Boys Hostel' : 'Girls Hostel';
    const hostel = hostels.find(h => h.name === hostelName);
    return hostel?._id || null;
  };

  // Get hostel name by ObjectId or fallback to provided value
  const getHostelName = (hostelIdOrName) => {
    if (!hostelIdOrName) return 'Not assigned';
    if (typeof hostelIdOrName === 'object') {
      return toDisplayText(hostelIdOrName, 'Not assigned');
    }
    const hostel = hostels.find(
      (h) => h._id === hostelIdOrName || normalizeText(h.name) === normalizeText(hostelIdOrName)
    );
    return hostel ? hostel.name : toDisplayText(hostelIdOrName, 'Not assigned');
  };

  // Get course duration for batch generation
  const getCourseDuration = (courseId) => {
    const course = courses.find(
      c => c._id === courseId || normalizeText(c.name) === normalizeText(courseId)
    );
    return course ? course.duration : 4; // Default to 4 years
  };

  // Get course name by ID
  const getCourseName = (courseId) => {
    if (!courseId) return '';
    if (typeof courseId === 'object') return toDisplayText(courseId);
    const course = courses.find(
      c => c._id === courseId || normalizeText(c.name) === normalizeText(courseId)
    );
    return course ? course.name : toDisplayText(courseId);
  };

  const getBranchDisplay = (branchValue) => {
    if (!branchValue) return 'N/A';
    if (branchValue?.name) return toDisplayText(branchValue.name);
    const branch = (branches.length ? branches : allBranches).find(
      (b) => b._id === branchValue || normalizeText(b.name) === normalizeText(branchValue)
    );
    if (branch) return branch.name;
    return toDisplayText(branchValue, 'N/A');
  };

  // Get course display with graceful fallback for raw SQL values (e.g., "sql 4")
  const getCourseDisplay = (courseValue) => {
    if (!courseValue) return 'N/A';
    if (courseValue?.name) return toDisplayText(courseValue.name, 'N/A');
    const match = courses.find(
      c => c._id === courseValue || normalizeText(c.name) === normalizeText(courseValue)
    );
    if (match) return match.name;
    const normalized = normalizeCourseName(courseValue);
    if (normalized) return normalized;
    return toDisplayText(courseValue, 'N/A');
  };

  // Get branch name by ID
  const getBranchName = (branchId) => {
    if (!branchId) return '';
    const branch = (branches.length ? branches : allBranches).find(
      b => b._id === branchId || normalizeText(b.name) === normalizeText(branchId)
    );
    return branch ? branch.name : (typeof branchId === 'string' ? branchId : '');
  };

  // Fetch rooms with bed availability (using hostel and category)
  const fetchRoomsWithAvailability = async (hostelIdOrGender, categoryIdOrName, academicYear) => {
    if (!hostelIdOrGender || !categoryIdOrName) {
      setRoomsWithAvailability([]);
      return;
    }

    // Normalize hostel: accept either hostel ObjectId or gender and map to hostel
    let finalHostelId = hostelIdOrGender;
    if (!/^[0-9a-fA-F]{24}$/.test(finalHostelId)) {
      const mappedHostel = getHostelIdFromGender(hostelIdOrGender);
      if (mappedHostel) {
        finalHostelId = mappedHostel;
      } else {
        console.error('Hostel not found for value:', hostelIdOrGender);
        toast.error('Please ensure hostels are loaded');
        setRoomsWithAvailability([]);
        return;
      }
    }

    // Ensure categories are loaded for this hostel
    const categoryList = categories.length ? categories : await fetchCategories(finalHostelId) || [];

    // Normalize category: accept ObjectId or name (including display labels like "A+ (AC)")
    let finalCategoryId = categoryIdOrName;
    if (!/^[0-9a-fA-F]{24}$/.test(finalCategoryId)) {
      const normalizedInput = getCategoryValue(categoryIdOrName);
      const categoryObj = categoryList.find(c =>
        getCategoryValue(c.name) === normalizedInput || c._id === categoryIdOrName
      );
      if (categoryObj) {
        finalCategoryId = categoryObj._id;
      } else {
        console.error('Category not found:', categoryIdOrName, 'Available categories:', categories.map(c => c.name));
        toast.error(`Category "${categoryIdOrName}" not found for this hostel. Please select a valid category.`);
        setRoomsWithAvailability([]);
        return;
      }
    }

    setLoadingRooms(true);
    try {
      const params = new URLSearchParams({
        hostel: finalHostelId,
        category: finalCategoryId,
        academicYear: academicYear || getDefaultAcademicYear()
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

  // Fetch rooms with bed availability for edit form (using hostel and category)
  const fetchEditRoomsWithAvailability = async (hostelIdOrGender, categoryIdOrName, academicYear) => {
    if (!hostelIdOrGender || !categoryIdOrName) {
      setEditRoomsWithAvailability([]);
      return;
    }

    // Normalize hostel: accept hostel ObjectId or gender and map to hostel
    let finalHostelId = hostelIdOrGender;
    if (!/^[0-9a-fA-F]{24}$/.test(finalHostelId)) {
      const mappedHostel = getHostelIdFromGender(hostelIdOrGender);
      if (mappedHostel) {
        finalHostelId = mappedHostel;
      } else {
        console.error('Hostel not found for value:', hostelIdOrGender);
        toast.error('Please ensure hostels are loaded');
        setEditRoomsWithAvailability([]);
        return;
      }
    }

    // Ensure categories are loaded for this hostel
    const categoryList = categories.length ? categories : await fetchCategories(finalHostelId) || [];

    // Normalize category: accept ObjectId or name (including display labels like "A+ (AC)")
    let finalCategoryId = categoryIdOrName;
    if (!/^[0-9a-fA-F]{24}$/.test(finalCategoryId)) {
      const normalizedInput = getCategoryValue(categoryIdOrName);
      const categoryObj = categoryList.find(c =>
        getCategoryValue(c.name) === normalizedInput || c._id === categoryIdOrName
      );
      if (categoryObj) {
        finalCategoryId = categoryObj._id;
      } else {
        console.error('Category not found:', categoryIdOrName, 'Available categories:', categories.map(c => c.name));
        toast.error(`Category "${categoryIdOrName}" not found for this hostel. Please select a valid category.`);
        setEditRoomsWithAvailability([]);
        return;
      }
    }

    setLoadingEditRooms(true);
    try {
      const params = new URLSearchParams({
        hostel: finalHostelId,
        category: finalCategoryId,
        academicYear: academicYear || getDefaultAcademicYear()
      });

      const res = await api.get(`/api/admin/rooms/bed-availability?${params.toString()}`);
      if (res.data.success) {
        setEditRoomsWithAvailability(res.data.data.rooms || []);
      } else {
        console.error('Failed to fetch rooms with availability for edit:', res.data.message);
        toast.error('Failed to fetch room availability');
      }
    } catch (err) {
      console.error('Error fetching rooms with availability for edit:', err);
      toast.error('Error fetching room availability');
    } finally {
      setLoadingEditRooms(false);
    }
  };

  // Handle room view modal
  const handleRoomView = async (room) => {
    setSelectedRoom(room);
    setLoadingRoomStudents(true);
    try {
      const response = await api.get(`/api/admin/rooms/${room._id}/students`);
      if (response.data.success) {
        setRoomStudents(response.data.data.students || []);
        setRoomStaff(response.data.data.staff || []);
      } else {
        throw new Error('Failed to fetch room occupants');
      }
    } catch (error) {
      console.error('Error fetching room occupants:', error);
      toast.error('Failed to fetch room details');
    } finally {
      setLoadingRoomStudents(false);
      setShowRoomViewModal(true);
    }
  };

  // Fetch bed and locker availability for a room
  const fetchBedLockerAvailability = async (roomNumber, academicYear, target = 'create') => {
    if (!roomNumber) {
      setBedLockerAvailability(null);
      return;
    }

    setLoadingBedLocker(true);
    try {
      const params = new URLSearchParams({
        academicYear: academicYear || getDefaultAcademicYear()
      });
      const response = await api.get(`/api/admin/rooms/${roomNumber}/bed-locker-availability?${params.toString()}`);
      if (response.data.success) {
        const data = response.data.data;
        setBedLockerAvailability(data);

        // Auto-select first available bed and corresponding locker
        autoSelectBedAndLocker(data, target);
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


  // Auto-select first available bed and corresponding locker
  const autoSelectBedAndLocker = (availabilityData, target = 'create') => {

    if (!availabilityData || !availabilityData.availableBeds || !availabilityData.availableLockers) {
      return;
    }


    // Find first available bed
    const firstAvailableBed = availabilityData.availableBeds[0];
    if (!firstAvailableBed) {
      return;
    }


    // Extract bed number from bed value (e.g., "320 Bed 1" -> "1")
    const bedNumber = firstAvailableBed.value.match(/Bed (\d+)$/)?.[1];
    if (!bedNumber) {
      return;
    }


    // Find corresponding locker (same number)
    const correspondingLocker = availabilityData.availableLockers.find(locker =>
      locker.value.includes(`Locker ${bedNumber}`)
    );


    // Update create or edit form with auto-selected values
    const applySelection = (prev) => ({
      ...prev,
      bedNumber: firstAvailableBed.value,
      lockerNumber: correspondingLocker ? correspondingLocker.value : ''
    });
    if (target === 'edit') {
      setEditForm(applySelection);
    } else {
      setForm(applySelection);
    }

  };

  // Fetch fee structure when course, branch, year, category and academic year are selected
  const fetchFeeStructure = async (course, branch, year, category, academicYear) => {
    if (!course || !branch || !year || !category || !academicYear) {
      setFeeStructure(null);
      setCalculatedFees({ term1: 0, term2: 0, term3: 0, total: 0 });
      return;
    }

    try {
      setLoadingFeeStructure(true);
      const response = await api.get(`/api/fee-structures/admit-card/${encodeURIComponent(academicYear)}/${encodeURIComponent(course)}/${encodeURIComponent(branch)}/${year}/${encodeURIComponent(category)}`);

      if (response.data.success) {
        const feeData = response.data.data;
        if (feeData.found === false && !feeData.isRevisedFee) {
          setFeeStructure(null);
          setCalculatedFees({ term1: 0, term2: 0, term3: 0, total: 0 });
          return;
        }
        setFeeStructure(feeData);

        // Calculate initial fees without concession
        const term1 = feeData.term1Fee || 0;
        const term2 = feeData.term2Fee || 0;
        const term3 = feeData.term3Fee || 0;
        const total = term1 + term2 + term3;

        setCalculatedFees({
          term1,
          term2,
          term3,
          total
        });
      } else {
        setFeeStructure(null);
        setCalculatedFees({ term1: 0, term2: 0, term3: 0, total: 0 });
      }
    } catch (error) {
      console.error('Error fetching fee structure:', error);
      setFeeStructure(null);
      setCalculatedFees({ term1: 0, term2: 0, term3: 0, total: 0 });
    } finally {
      setLoadingFeeStructure(false);
    }
  };

  // Calculate fees when concession changes (applied to Term 1 only, excess to Term 2)
  const calculateFeesWithConcession = (concessionAmount) => {
    if (!feeStructure) return;

    const concession = Number(concessionAmount) || 0;
    const totalOriginalFee = feeStructure.totalFee;

    // Apply concession to Term 1 first
    let term1 = Math.max(0, feeStructure.term1Fee - concession);

    // If concession exceeds Term 1 fee, apply excess to Term 2
    let remainingConcession = Math.max(0, concession - feeStructure.term1Fee);
    let term2 = Math.max(0, feeStructure.term2Fee - remainingConcession);

    // If concession still exceeds Term 1 + Term 2, apply to Term 3
    remainingConcession = Math.max(0, remainingConcession - feeStructure.term2Fee);
    let term3 = Math.max(0, feeStructure.term3Fee - remainingConcession);

    const total = term1 + term2 + term3;

    setCalculatedFees({ term1, term2, term3, total });
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
      if (filters.hostel) params.append('hostel', filters.hostel);
      if (filters.category) params.append('category', filters.category);
      if (filters.roomNumber) params.append('roomNumber', filters.roomNumber);
      if (filters.academicYear) params.append('academicYear', filters.academicYear);
      if (filters.hostelStatus) params.append('hostelStatus', filters.hostelStatus);

      console.log('Filter params:', Object.fromEntries(params)); // Debug log

      const res = await api.get(`/api/admin/students?${params}`);
      if (res.data.success) {
        const rawStudents = res.data.data.students || [];
        setStudents(dedupeStudentsByIdentity(rawStudents));
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
  }, [currentPage, filters.search, filters.course, filters.branch, filters.hostel, filters.category, filters.roomNumber, filters.academicYear, filters.hostelStatus, debouncedSearchTerm]);


  const isInitialFetch = React.useRef(true);

  // Fetch students:
  // - On initial mount show full loading spinner
  // - On filter / page / search changes show table loading overlay
  useEffect(() => {
    if (tab === 'list' || tab === 'dates') {
      const isFirst = isInitialFetch.current;
      if (isFirst) {
        isInitialFetch.current = false;
      }
      fetchStudents(isFirst);
      fetchCourseCounts();
    }
  }, [tab, currentPage, filters.course, filters.branch, filters.hostel, filters.category, filters.roomNumber, filters.academicYear, filters.hostelStatus, debouncedSearchTerm]);

  // Check email service status and fetch courses on component mount
  useEffect(() => {
    fetchCourses();
    fetchBranches();
    fetchHostels(); // Fetch hostels on mount
  }, []);

  // Check for prefilled data from preregistration and URL parameters
  useEffect(() => {
    // Check URL parameter for tab
    const tabParam = searchParams.get('tab');
    if (tabParam === 'add') {
      navigate('/admin/dashboard/students/register-from-sql', { replace: true });
      return;
    }
    if (tabParam && tabParam === 'list') {
      setTab(tabParam);
    }
    if (tabParam === 'bulkUpload') {
      setTab('list');
    }

    // Pre-registration approval: register via SQL page (add student removed from this page)
    const prefilledData = sessionStorage.getItem('preregistrationData');
    if (prefilledData) {
      navigate('/admin/dashboard/students/register-from-sql', { replace: true });
    }
  }, [searchParams, navigate]);

  // Debug: Log when branches change
  useEffect(() => {
    console.log('ðŸ”„ Branches state updated:', branches.length, 'branches');
    if (branches.length > 0) {
      console.log('ðŸ“‹ Available branches:', branches.map(b => `${b.name} (${b.code})`));
    }
  }, [branches]);

  // Update form when branches are loaded (for preregistration prefilling)
  useEffect(() => {
    if (branches.length > 0 && form.branch && form.course) {
      console.log('ðŸ” Checking branch mapping:');
      console.log('  - Current branch ID:', form.branch);
      console.log('  - Available branches:', branches.map(b => ({ id: b._id, name: b.name })));

      // Check if the current branch is in the loaded branches
      const branchExists = branches.find(b => b._id === form.branch);
      if (!branchExists) {
        console.log('âš ï¸ Branch not found in loaded branches, clearing branch selection');
        setForm(prev => ({ ...prev, branch: '' }));
      } else {
        console.log('âœ… Branch found in loaded branches:', branchExists.name);
      }
    }
  }, [branches, form.branch, form.course]);

  // Fetch categories when gender changes (maps to hostel)
  useEffect(() => {
    if (form.gender && hostels.length > 0) {
      const hostelId = getHostelIdFromGender(form.gender);
      if (hostelId) {
        fetchCategories(hostelId);
      } else {
        setCategories([]);
      }
    } else {
      setCategories([]);
    }
  }, [form.gender, hostels]);

  // Fetch rooms with availability when gender, category, or categories change
  useEffect(() => {
    if (form.gender && form.category && categories.length > 0) {
      fetchRoomsWithAvailability(form.gender, form.category, form.academicYear);
    } else {
      setRoomsWithAvailability([]);
    }
  }, [form.gender, form.category, categories, form.academicYear]);

  // Fetch categories for edit form when gender changes (maps to hostel)
  useEffect(() => {
    if (editForm.gender && hostels.length > 0) {
      const hostelId = getHostelIdFromGender(editForm.gender);
      if (hostelId) {
        fetchCategories(hostelId);
      } else {
        setCategories([]);
      }
    }
  }, [editForm.gender, hostels]);

  // Fetch rooms with availability for edit form when gender, category, or categories change
  useEffect(() => {
    if (editForm.gender && editForm.category && categories.length > 0) {
      fetchEditRoomsWithAvailability(editForm.gender, editForm.category, editForm.academicYear);
    } else {
      setEditRoomsWithAvailability([]);
    }
  }, [editForm.gender, editForm.category, categories, editForm.academicYear]);

  // Fetch bed/locker availability when room is selected
  useEffect(() => {
    if (form.roomNumber) {
      fetchBedLockerAvailability(form.roomNumber, form.academicYear);
    } else {
      setBedLockerAvailability(null);
      // Clear bed and locker selections when room changes
      setForm(prev => ({
        ...prev,
        bedNumber: '',
        lockerNumber: ''
      }));
    }
  }, [form.roomNumber, form.academicYear]);

  // Fetch fee structure when course, year, category or academic year changes
  useEffect(() => {
    if (form.course && form.year && form.category && form.academicYear) {
      fetchFeeStructure(form.course, form.branch, form.year, form.category, form.academicYear);
    } else {
      setFeeStructure(null);
      setCalculatedFees({ term1: 0, term2: 0, term3: 0, total: 0 });
    }
  }, [form.course, form.year, form.category, form.academicYear]);

  const handleFormChange = e => {
    const { name, value, type, checked } = e.target;
    const fieldValue = type === 'checkbox' ? checked : value;
    console.log('ðŸ”„ Form field changed:', name, '=', fieldValue, 'type:', type);

    setForm(prev => {
      const newForm = { ...prev, [name]: fieldValue };

      // Reset dependent fields when parent field changes
      if (name === 'course') {
        console.log('ðŸ“š Course changed to:', value);
        newForm.branch = '';
        newForm.batch = ''; // Reset batch when course changes
        // Fetch branches for the selected course
        fetchBranches(value);
      }
      if (name === 'gender') {
        newForm.category = '';
        newForm.roomNumber = '';
        newForm.bedNumber = '';
        newForm.lockerNumber = '';
      }
      if (name === 'category') {
        newForm.roomNumber = '';
        newForm.bedNumber = '';
        newForm.lockerNumber = '';
      }
      if (name === 'roomNumber') {
        // Reset bed and locker when room changes
        newForm.bedNumber = '';
        newForm.lockerNumber = '';
        // Fetch bed/locker availability and auto-select
        if (value) {
          fetchBedLockerAvailability(value, newForm.academicYear);
        } else {
          setBedLockerAvailability(null);
        }
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
      console.log('ðŸ“¸ Starting camera for type:', type);
      setCameraReady(false);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      console.log('ðŸ“¸ Camera stream obtained:', mediaStream);
      setStream(mediaStream);
      setCameraType(type);
      setShowCamera(true);

      // Set video source after component mounts
      setTimeout(() => {
        if (videoRef) {
          console.log('ðŸ“¸ Setting video source');
          videoRef.srcObject = mediaStream;
          videoRef.onloadedmetadata = () => {
            console.log('ðŸ“¸ Video metadata loaded');
            videoRef.play();
            setCameraReady(true);
          };
        } else {
          console.log('ðŸ“¸ Video ref not available yet');
        }
      }, 100);
    } catch (error) {
      console.error('âŒ Error accessing camera:', error);
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
    console.log('ðŸ“¸ Capturing photo...', { videoRef: !!videoRef, cameraType, videoWidth: videoRef?.videoWidth, videoHeight: videoRef?.videoHeight });

    if (!videoRef || !cameraType) {
      console.error('âŒ Missing videoRef or cameraType');
      toast.error('Camera not ready. Please try again.');
      return;
    }

    if (!videoRef.videoWidth || !videoRef.videoHeight) {
      console.error('âŒ Video dimensions not available');
      console.log('ðŸ“¸ Video element state:', {
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

    console.log('ðŸ“¸ Canvas dimensions:', canvas.width, 'x', canvas.height);

    try {
      // Draw video frame to canvas
      context.drawImage(videoRef, 0, 0, canvas.width, canvas.height);

      // Convert canvas to blob
      canvas.toBlob((blob) => {
        if (blob) {
          console.log('ðŸ“¸ Photo captured successfully, blob size:', blob.size);
          const file = new File([blob], `camera_${cameraType}_${Date.now()}.jpg`, { type: 'image/jpeg' });

          // Create preview URL
          const previewUrl = URL.createObjectURL(blob);

          // Set photo based on camera type
          switch (cameraType) {
            case 'student':
              setStudentPhoto(file);
              setStudentPhotoPreview(previewUrl);
              console.log('ðŸ“¸ Student photo set:', file.name, 'Preview URL:', previewUrl);
              break;
            case 'guardian1':
              setGuardianPhoto1(file);
              setGuardianPhoto1Preview(previewUrl);
              console.log('ðŸ“¸ Guardian 1 photo set:', file.name, 'Preview URL:', previewUrl);
              break;
            case 'guardian2':
              setGuardianPhoto2(file);
              setGuardianPhoto2Preview(previewUrl);
              console.log('ðŸ“¸ Guardian 2 photo set:', file.name, 'Preview URL:', previewUrl);
              break;
            case 'edit_student':
              setPhotoEditStudentPhoto(file);
              setPhotoEditStudentPhotoPreview(previewUrl);
              console.log('ðŸ“¸ Edit student photo set:', file.name, 'Preview URL:', previewUrl);
              break;
            case 'edit_guardian1':
              setPhotoEditGuardianPhoto1(file);
              setPhotoEditGuardianPhoto1Preview(previewUrl);
              console.log('ðŸ“¸ Edit guardian 1 photo set:', file.name, 'Preview URL:', previewUrl);
              break;
            case 'edit_guardian2':
              setPhotoEditGuardianPhoto2(file);
              setPhotoEditGuardianPhoto2Preview(previewUrl);
              console.log('ðŸ“¸ Edit guardian 2 photo set:', file.name, 'Preview URL:', previewUrl);
              break;
            default:
              console.log('ðŸ“¸ Unknown camera type:', cameraType);
              break;
          }

          // Stop camera
          stopCamera();
          toast.success('Photo captured successfully!');
        } else {
          console.error('âŒ Failed to create blob from canvas');
          toast.error('Failed to capture photo. Please try again.');
        }
      }, 'image/jpeg', 0.8);
    } catch (error) {
      console.error('âŒ Error capturing photo:', error);
      toast.error('Error capturing photo. Please try again.');
    }
  };


  const canRemoveStudentEnrollment = (student) => {
    const viewYear = filters.academicYear;
    const currentYear = student.currentAcademicYear || student.academicYear;
    if (!viewYear || !currentYear) return false;
    return viewYear === currentYear;
  };

  const handleCancelRegistration = async (id, studentRecord) => {
    // Check permission before proceeding
    if (!canDeleteStudent) {
      toast.error('You do not have permission to cancel student registration');
      return;
    }

    const currentYear = studentRecord?.currentAcademicYear || studentRecord?.academicYear;
    const academicYear = filters.academicYear || currentYear;

    const confirmMessage =
      `Cancel registration for ${studentRecord?.name || 'this student'} (${studentRecord?.rollNumber || ''})?\n\n` +
      'The registration status will be set to Cancelled. Student records and attendance history will remain preserved in the database.';

    if (!window.confirm(confirmMessage)) return;

    setDeletingId(id);
    try {
      const res = await api.delete(`/api/admin/students/${id}`, {
        params: { academicYear: currentYear || academicYear }
      });
      const msg = res.data?.message || 'Student registration cancelled successfully';
      toast.success(msg);
      await fetchStudents();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel student registration');
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

    // Ensure hostels are loaded before opening modal
    if (hostels.length === 0) {
      console.log('Hostels not loaded yet, fetching hostels first...');
      fetchHostels().then(() => {
        // Re-open modal after hostels are loaded
        setTimeout(() => openEditModal(student), 100);
      });
      return;
    }

    // Resolve course name to course ID
    // After schema change: course is stored as string (course name), not ObjectId
    const studentCourseName = student.course?.name || student.course || '';
    const matchedCourse = courses.find(
      c => normalizeText(c.name) === normalizeText(studentCourseName) || c._id === studentCourseName
    );
    const courseId = matchedCourse?._id || student.course?._id || student.course || '';

    // Resolve branch name to branch ID
    // After schema change: branch is stored as string (branch name), not ObjectId
    // Note: We need to fetch branches first to find the match
    const studentBranchName = student.branch?.name || student.branch || '';

    const resolvedHostelId =
      student.hostel?._id ||
      (typeof student.hostel === 'string' ? student.hostel : '') ||
      student.hostelId ||
      '';

    const resolvedHostelSequenceId =
      student.hostelSequenceId ||
      (student.hostelId && !/^[0-9a-fA-F]{24}$/.test(student.hostelId) ? student.hostelId : '');

    const initialEditForm = {
      name: student.name,
      rollNumber: student.rollNumber,
      admissionNumber: student.admissionNumber || '',
      hostelId: resolvedHostelId,
      hostelSequenceId: resolvedHostelSequenceId,
      course: courseId, // Use resolved course ID
      year: student.year,
      branch: '', // Will be set after branches are fetched
      gender: student.gender,
      category: getCategoryValue(student.category) || getCategoryValue(student.hostelCategory) || '',
      mealType: student.mealType || 'non-veg',
      parentPermissionForOuting: student.parentPermissionForOuting !== undefined ? student.parentPermissionForOuting : true,
      roomNumber: student.roomNumber,
      bedNumber: student.bedNumber || '',
      lockerNumber: student.lockerNumber || '',
      studentPhone: student.studentPhone,
      parentPhone: student.parentPhone,
      email: student.email,
      batch: normalizeBatchToYear(student.batch || ''),
      // Request year being edited (outer filter) vs student's live/current year
      academicYear: filters.academicYear || student.academicYear,
      currentAcademicYear: student.currentAcademicYear || student.academicYear,
      hostelStatus: student.hostelStatus || 'Active',
      admitDate: student.admitDate ? new Date(student.admitDate).toISOString().split('T')[0] : '',
      joiningDate: student.joiningDate ? new Date(student.joiningDate).toISOString().split('T')[0] : '',
      // Prefill from this AY request's leftDate; else this request's expired date
      leftDate: (() => {
        const source = student.leftDate || student.actualExpiredAt || student.allocatedTo || null;
        return source ? new Date(source).toISOString().split('T')[0] : '';
      })()
    };
    // Display hostel name in edit modal
    setEditHostelName(getHostelName(student.hostel?._id || student.hostel));

    setEditId(student._id);
    setEditForm(initialEditForm);
    setOriginalEditForm(initialEditForm); // Store original for comparison

    // Fetch branches for the selected course, then resolve branch ID
    if (courseId) {
      console.log('Fetching branches for course ID:', courseId);
      fetchBranches(courseId).then(() => {
        // After branches are fetched, resolve branch name to ID
        const matchedBranch = (branches.length ? branches : allBranches).find(
          b => normalizeText(b.name) === normalizeText(studentBranchName) || b._id === studentBranchName
        );
        const branchId = matchedBranch?._id || student.branch?._id || student.branch || '';

        if (branchId) {
          setEditForm(prev => ({ ...prev, branch: branchId }));
          setOriginalEditForm(prev => ({ ...prev, branch: branchId }));
        }
      });
    } else if (studentBranchName) {
      // If no course but branch exists, try to find branch in all branches
      fetchBranches().then(() => {
        const matchedBranch = allBranches.find(
          b => normalizeText(b.name) === normalizeText(studentBranchName) || b._id === studentBranchName
        );
        const branchId = matchedBranch?._id || student.branch?._id || student.branch || '';

        if (branchId) {
          setEditForm(prev => ({ ...prev, branch: branchId }));
          setOriginalEditForm(prev => ({ ...prev, branch: branchId }));
        }
      });
    }

    // Fetch rooms for the edit form if gender and category are available
    if (student.gender && getCategoryValue(student.category)) {
      const categoryName = getCategoryValue(student.category);
      console.log('Fetching rooms for edit form:', student.gender, categoryName);
      fetchEditRoomsWithAvailability(student.gender, categoryName, student.academicYear);
    }

    setEditModal(true);
  };


  const handleEditFormChange = e => {
    const { name, value, type, checked } = e.target;
    const fieldValue = type === 'checkbox' ? checked : value;
    setEditForm(prev => {
      const newForm = { ...prev, [name]: fieldValue };

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
        newForm.bedNumber = '';
        newForm.lockerNumber = '';
      }
      if (name === 'category') {
        newForm.roomNumber = '';
        newForm.bedNumber = '';
        newForm.lockerNumber = '';
      }
      if (name === 'roomNumber') {
        // Reset bed and locker when room changes
        newForm.bedNumber = '';
        newForm.lockerNumber = '';
        // Fetch bed/locker availability and auto-select for edit form
        if (value) {
          fetchBedLockerAvailability(value, newForm.academicYear, 'edit');
        } else {
          setBedLockerAvailability(null);
        }
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

  const getEditCourseLabel = () => {
    const course = courses.find(
      c => c._id === editForm.course || normalizeText(c.name) === normalizeText(editForm.course)
    );
    return course ? `${course.name} (${course.code})` : (editForm.course || 'N/A');
  };

  const getEditBranchLabel = () => {
    const branch = branches.find(
      b => b._id === editForm.branch || normalizeText(b.name) === normalizeText(editForm.branch)
    );
    return branch ? `${branch.name} (${branch.code})` : (editForm.branch || 'N/A');
  };

  // Validate editable hostel fields only
  const validateEditForm = (formData) => {
    const errors = [];

    if (!formData.category) {
      errors.push('Category is required');
    }
    if (!formData.roomNumber) {
      errors.push('Room number is required');
    }
    if (!formData.academicYear) {
      errors.push('Academic year is required');
    }

    // Validate room number against fetched rooms
    // Since rooms are fetched dynamically from backend, validate against editRoomsWithAvailability
    // Only validate if rooms are loaded and room number is provided
    // Normalize room numbers to strings for comparison to handle type mismatches
    if (formData.roomNumber && editRoomsWithAvailability.length > 0) {
      const validRoomNumbers = editRoomsWithAvailability.map(room => String(room.roomNumber || ''));
      const formRoomNumber = String(formData.roomNumber || '');
      const originalRoomNumber = originalEditForm ? String(originalEditForm.roomNumber || '') : '';

      // Only validate if the room number doesn't match any valid room AND it's different from the original
      // This allows existing room assignments to remain unchanged even if not in current filtered list
      if (formRoomNumber && !validRoomNumbers.includes(formRoomNumber)) {
        // If the room number hasn't changed from original, allow it (student might just be updating other fields)
        if (formRoomNumber !== originalRoomNumber) {
          errors.push('Invalid room number for the selected gender and category');
        }
        // If it's the same as original, skip validation (allows existing assignments)
      }
    }
    // If rooms are not loaded yet, skip validation (dropdown will handle it)

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

      // Validate form data
      const validationErrors = validateEditForm(editForm);
      if (validationErrors.length > 0) {
        throw new Error(validationErrors.join('. '));
      }

      // Only submit hostel-related fields (personal/academic/contact are SQL-sourced)
      const editingCurrentYear =
        !editForm.currentAcademicYear ||
        String(editForm.academicYear) === String(editForm.currentAcademicYear);

      const submitData = {
        hostel: editForm.hostelId,
        ...(canEditRoomCategory
          ? {
              category: editForm.category,
              roomNumber: editForm.roomNumber,
              bedNumber: editForm.bedNumber,
              lockerNumber: editForm.lockerNumber
            }
          : {}),
        mealType: editForm.mealType,
        parentPermissionForOuting: editForm.parentPermissionForOuting,
        academicYear: editForm.academicYear,
        // Do not send hostelStatus for historical AY edits — it would cancel the live year request
        ...(editingCurrentYear ? { hostelStatus: editForm.hostelStatus } : {}),
        admitDate: editForm.admitDate,
        joiningDate: editForm.joiningDate,
        leftDate: editForm.leftDate || null
      };

      console.log('Submitting data:', submitData);
      console.log('ðŸ”§ parentPermissionForOuting value:', submitData.parentPermissionForOuting, 'type:', typeof submitData.parentPermissionForOuting);

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
        fetchBranches(value);
      }
      if (name === 'hostel') {
        newFilters.category = '';
        newFilters.roomNumber = '';
        setFilterRooms([]);
        fetchFilterCategories(value);
      }
      if (name === 'category') {
        newFilters.roomNumber = '';
      }
      if (name === 'academicYear') {
        const defaultYear = getDefaultAcademicYear();
        if (value && value !== defaultYear) {
          // Past year: show all requests (active + expired + cancelled)
          newFilters.hostelStatus = '';
        } else if (value === defaultYear) {
          newFilters.hostelStatus = 'active';
        }
      }

      return newFilters;
    });
    setCurrentPage(1);
  };

  useEffect(() => {
    if (tab !== 'list' || !filters.hostel) return;
    fetchFilterRooms(filters.hostel, filters.category);
  }, [tab, filters.hostel, filters.category, filterCategories]);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };


  const handleUpdateStudentYears = async () => {
    try {
      console.log('ðŸ”„ Frontend: Starting student year update...');

      const response = await api.post('/api/admin/students/update-years');
      console.log('ðŸ“¡ Frontend: API response:', response.data);

      if (response.data.success) {
        toast.success(response.data.message);
        console.log('âœ… Frontend: Update successful, refreshing student list...');
        // Refresh the student list to show updated years
        fetchStudents();
      } else {
        console.log('âŒ Frontend: API returned success: false');
        toast.error(response.data.message || 'Failed to update student years');
      }
    } catch (error) {
      console.error('âŒ Frontend: Error updating student years:', error);
      console.error('âŒ Frontend: Error response:', error.response?.data);
      toast.error('Failed to update student years. Please try again.');
    }
  };

  // Categories are dynamic per hostel (fetched into `categories` when gender/hostel changes)
  const getCategoryOptions = () => categories.map(c => c.name);


  // Function to handle printing live student list grouped by Hostel -> Category -> Room Number
  const handlePrintLiveStudentsReport = async () => {
    const loadingToast = toast.loading('Preparing printable report...');
    try {
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.course) params.append('course', filters.course);
      if (filters.branch) params.append('branch', filters.branch);
      if (filters.hostel) params.append('hostel', filters.hostel);
      if (filters.category) params.append('category', filters.category);
      if (filters.roomNumber) params.append('roomNumber', filters.roomNumber);
      if (filters.academicYear) params.append('academicYear', filters.academicYear);
      // If in Live mode, force active status. If in AY-Wise, do not filter by status to print all.
      if (isLiveMode) {
        params.append('hostelStatus', 'active');
      }
      params.append('page', '1');
      params.append('limit', '1000000'); // get all matching students

      const res = await api.get(`/api/admin/students?${params}`);
      if (!res.data.success) {
        throw new Error(res.data.message || 'Failed to fetch students');
      }

      const allActiveStudents = res.data.data.students || [];
      if (allActiveStudents.length === 0) {
        toast.error('No students found matching the current filters', { id: loadingToast });
        return;
      }

      // Call new backend print service API to generate and return the formatted HTML
      console.log('Requesting Live Occupancy HTML from Print API...');
      const printResponse = await api.post('/api/print', {
        template: 'live-occupancy-report',
        data: {
          students: allActiveStudents,
          filters: { academicYear: filters.academicYear },
          isLiveMode
        }
      });

      const iframe = document.getElementById('print-iframe');
      if (!iframe) {
        toast.error('Failed to locate print frame', { id: loadingToast });
        return;
      }

      const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
      iframeDoc.open();
      iframeDoc.write(printResponse.data);
      iframeDoc.close();

      toast.dismiss(loadingToast);

      // Trigger print dialog on the iframe contentWindow
      setTimeout(() => {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      }, 150);

      return; // Intercept local execution and return early

      // Update local state to trigger render of PrintableLiveStudents component
      setPrintStudents(allActiveStudents);

      // Wait for state update and React render
      setTimeout(() => {
        const printElement = document.getElementById('printable-area');
        const iframeEl = document.getElementById('print-iframe');
        if (!printElement || !iframeEl) {
          toast.error('Failed to locate printable elements', { id: loadingToast });
          return;
        }

        const iframeDoc = iframeEl.contentDocument || iframeEl.contentWindow.document;
        
        // Write the HTML with styles into the iframe
        iframeDoc.open();
        iframeDoc.write(`
          <html>
            <head>
              <title>Live Students Report</title>
              <style>
                body {
                  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                  color: #1e293b;
                  margin: 1.5cm;
                  padding: 0;
                  background-color: #ffffff;
                }
                .page-break {
                  page-break-after: always;
                  break-after: page;
                }
                .header-container {
                  text-align: center;
                  margin-bottom: 25px;
                  border-bottom: 2px solid #1e3a8a;
                  padding-bottom: 12px;
                }
                h1 {
                  font-size: 24px;
                  color: #1e3a8a;
                  margin: 0 0 5px 0;
                  text-transform: uppercase;
                  letter-spacing: 0.5px;
                }
                .report-subtitle {
                  font-size: 13px;
                  color: #475569;
                  margin: 5px 0;
                  font-weight: 500;
                }
                .report-date {
                  font-size: 11px;
                  color: #64748b;
                  margin: 0;
                }
                /* Abstract Summary Styles */
                .abstract-section {
                  margin-top: 15px;
                }
                .abstract-title {
                  font-size: 16px;
                  font-weight: 700;
                  color: #1e3a8a;
                  margin: 20px 0 10px 0;
                  text-transform: uppercase;
                  border-bottom: 1px solid #cbd5e1;
                  padding-bottom: 4px;
                }
                .summary-row {
                  display: flex;
                  justify-content: space-around;
                  align-items: center;
                  border: 1px solid #cbd5e1;
                  border-radius: 6px;
                  padding: 12px 10px;
                  background-color: #f8fafc;
                  margin-bottom: 25px;
                  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
                }
                .summary-item {
                  font-size: 13px;
                  color: #334155;
                  font-weight: 500;
                }
                .summary-item strong {
                  color: #1d4ed8;
                  font-size: 16px;
                  margin-left: 5px;
                }
                .summary-table {
                  width: 100%;
                  border-collapse: collapse;
                  margin-bottom: 25px;
                }
                .summary-table th, .summary-table td {
                  border: 1px solid #cbd5e1;
                  padding: 8px 10px;
                  font-size: 12px;
                  text-align: left;
                }
                .summary-table th {
                  background-color: #eff6ff;
                  color: #1d4ed8;
                  font-weight: 600;
                }
                /* Detail Lists Styles */
                .hostel-section {
                  margin-bottom: 30px;
                }
                .hostel-title {
                  font-size: 18px;
                  font-weight: bold;
                  color: #1e3a8a;
                  border-bottom: 1.5px solid #1e3a8a;
                  padding-bottom: 4px;
                  margin-bottom: 15px;
                }
                .category-section {
                  margin-bottom: 20px;
                }
                .category-title {
                  font-size: 13px;
                  font-weight: bold;
                  color: #334155;
                  background-color: #f1f5f9;
                  padding: 5px 10px;
                  border-radius: 4px;
                  margin-bottom: 10px;
                }
                .room-section {
                  margin-bottom: 15px;
                  page-break-inside: avoid;
                }
                .room-title {
                  font-size: 12px;
                  font-weight: 600;
                  color: #334155;
                  margin-bottom: 5px;
                }
                .detail-table {
                  width: 100%;
                  border-collapse: collapse;
                  margin-bottom: 8px;
                }
                .detail-table th, .detail-table td {
                  border: 1px solid #cbd5e1;
                  padding: 5px 8px;
                  font-size: 11px;
                  text-align: left;
                }
                .detail-table th {
                  background-color: #f8fafc;
                  color: #475569;
                  font-weight: 600;
                }
                .detail-table tr:nth-child(even) {
                  background-color: #f8fafc;
                }
              </style>
            </head>
            <body>
              ${printElement.innerHTML}
            </body>
          </html>
        `);
        iframeDoc.close();

        toast.dismiss(loadingToast);

        // Trigger print dialog on the iframe contentWindow
        setTimeout(() => {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
        }, 150);
      }, 300);

    } catch (err) {
      console.error('Error printing live list:', err);
      toast.error(err.message || 'Error printing live list', { id: loadingToast });
    }
  };

  const handlePrintStudentDatesReport = async () => {
    const loadingToast = toast.loading('Preparing printable report...');
    try {
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.course) params.append('course', filters.course);
      if (filters.branch) params.append('branch', filters.branch);
      if (filters.hostel) params.append('hostel', filters.hostel);
      if (filters.category) params.append('category', filters.category);
      if (filters.roomNumber) params.append('roomNumber', filters.roomNumber);
      if (filters.academicYear) params.append('academicYear', filters.academicYear);
      if (filters.hostelStatus) params.append('hostelStatus', filters.hostelStatus);
      params.append('page', '1');
      params.append('limit', '1000000'); // get all matching students

      const res = await api.get(`/api/admin/students?${params}`);
      if (!res.data.success) {
        throw new Error(res.data.message || 'Failed to fetch students');
      }

      const allActiveStudents = res.data.data.students || [];
      if (allActiveStudents.length === 0) {
        toast.error('No students found matching the current filters', { id: loadingToast });
        return;
      }

      setPrintDatesStudents(allActiveStudents);

      // Wait for state update and React render
      setTimeout(() => {
        const printElement = document.getElementById('printable-area-dates');
        const iframeEl = document.getElementById('print-iframe');
        if (!printElement || !iframeEl) {
          toast.error('Failed to locate printable elements', { id: loadingToast });
          return;
        }

        const iframeDoc = iframeEl.contentDocument || iframeEl.contentWindow.document;
        
        // Write the HTML into the iframe
        iframeDoc.open();
        iframeDoc.write(`
          <html>
            <head>
              <title>Student Admission & Stay Dates Report</title>
              <style>
                @page {
                  margin: 1cm;
                }
                body {
                  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                  color: #000000;
                  margin: 0;
                  padding: 0;
                  width: 100%;
                }
                .printable-dates-container {
                  width: 100%;
                }
                .report-header {
                  margin-bottom: 12px;
                  border-bottom: 2px solid #000000;
                  padding-bottom: 6px;
                }
                .report-header h1 {
                  font-size: 18px;
                  font-weight: bold;
                  color: #000000;
                  margin: 0 0 5px 0;
                  text-align: center;
                }
                .dates-table {
                  width: 100%;
                  border-collapse: collapse;
                  font-size: 9.5px;
                }
                .dates-table th, .dates-table td {
                  border: 1px solid #000000;
                  padding: 4px 6px;
                  font-size: 9.5px;
                  text-align: left;
                  color: #000000;
                }
                .dates-table th {
                  background-color: #f3f4f6;
                  color: #000000;
                  font-weight: bold;
                }
              </style>
            </head>
            <body>
              ${printElement.innerHTML}
            </body>
          </html>
        `);
        iframeDoc.close();

        toast.dismiss(loadingToast);

        // Trigger print dialog on the iframe contentWindow
        setTimeout(() => {
          iframeEl.contentWindow.focus();
          iframeEl.contentWindow.print();
        }, 150);
      }, 300);

    } catch (err) {
      console.error('Error printing dates list:', err);
      toast.error(err.message || 'Error printing dates list', { id: loadingToast });
    }
  };

  // Function to handle downloading live student list as Excel grouped/styled
  const handleDownloadExcelReport = async () => {
    const loadingToast = toast.loading('Preparing Excel report...');
    try {
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.course) params.append('course', filters.course);
      if (filters.branch) params.append('branch', filters.branch);
      if (filters.hostel) params.append('hostel', filters.hostel);
      if (filters.category) params.append('category', filters.category);
      if (filters.roomNumber) params.append('roomNumber', filters.roomNumber);
      if (filters.academicYear) params.append('academicYear', filters.academicYear);
      // If in Live mode, force active status. If in AY-Wise, do not filter by status to print all.
      if (isLiveMode) {
        params.append('hostelStatus', 'active');
      }
      params.append('page', '1');
      params.append('limit', '1000000'); // get all matching students

      const res = await api.get(`/api/admin/students?${params}`);
      if (!res.data.success) {
        throw new Error(res.data.message || 'Failed to fetch students');
      }

      const students = res.data.data.students || [];
      if (students.length === 0) {
        toast.error('No students found matching the current filters', { id: loadingToast });
        return;
      }

      // Grouping data (Hostel -> Category -> Room Number)
      const grouped = {};
      const hostelSummaries = {};
      let grandTotal = 0;

      students.forEach(student => {
        const hostelName = student.hostel?.name || 'Unassigned Hostel';
        const categoryName = student.hostelCategory?.name || student.category || 'Unassigned Category';
        const roomNo = student.roomNumber || 'Unassigned Room';

        if (!grouped[hostelName]) grouped[hostelName] = {};
        if (!grouped[hostelName][categoryName]) grouped[hostelName][categoryName] = {};
        if (!grouped[hostelName][categoryName][roomNo]) grouped[hostelName][categoryName][roomNo] = [];
        grouped[hostelName][categoryName][roomNo].push(student);

        if (!hostelSummaries[hostelName]) {
          hostelSummaries[hostelName] = { total: 0, categories: {} };
        }
        hostelSummaries[hostelName].total++;
        grandTotal++;

        if (!hostelSummaries[hostelName].categories[categoryName]) {
          hostelSummaries[hostelName].categories[categoryName] = 0;
        }
        hostelSummaries[hostelName].categories[categoryName]++;
      });

      const workbook = XLSX.utils.book_new();

      // --- SHEET 1: Summary ---
      const summaryRows = [];
      summaryRows.push(['Hostel Summary & Abstract']);
      summaryRows.push([]);
      summaryRows.push(['Hostel Name', isLiveMode ? 'Active Residents Count' : 'Registered Students Count']);
      
      Object.keys(hostelSummaries).sort().forEach(hostelName => {
        summaryRows.push([hostelName, hostelSummaries[hostelName].total]);
      });
      summaryRows.push(['Grand Total', grandTotal]);
      summaryRows.push([]);
      summaryRows.push([]);
      summaryRows.push(['Detailed Category Breakdown']);
      summaryRows.push(['Hostel', 'Category', isLiveMode ? 'Residents Count' : 'Students Count']);

      Object.keys(grouped).sort().forEach(hostelName => {
        const categories = hostelSummaries[hostelName].categories;
        Object.keys(categories).sort().forEach(catName => {
          summaryRows.push([hostelName, catName, categories[catName]]);
        });
      });

      const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
      
      // Auto-fit summary sheet cols
      const summaryCols = [{ width: 25 }, { width: 25 }, { width: 20 }];
      summarySheet['!cols'] = summaryCols;

      // --- SHEET 2: Detailed Room-Wise ---
      const detailedRows = [];
      detailedRows.push(['Detailed Room-Wise Student List']);
      detailedRows.push([]);
      detailedRows.push([
        'S.No',
        'Roll Number',
        'Name',
        'Hostel',
        'Category',
        'Room Number',
        'Course',
        'Branch',
        'Gender',
        'Phone',
        'Academic Year',
        'Next AY Details'
      ]);

      let serialNo = 1;
      const sortedHostels = Object.keys(grouped).sort();
      sortedHostels.forEach(hostelName => {
        const categories = grouped[hostelName];
        const sortedCats = Object.keys(categories).sort();
        sortedCats.forEach(catName => {
          const rooms = categories[catName];
          const sortedRooms = Object.keys(rooms).sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
          sortedRooms.forEach(roomNo => {
            const roomStudents = rooms[roomNo];
            roomStudents.forEach(student => {
              detailedRows.push([
                serialNo++,
                student.rollNumber || 'N/A',
                student.name || 'Unknown',
                hostelName,
                catName,
                roomNo,
                student.course || 'N/A',
                student.branch || 'N/A',
                student.gender || 'N/A',
                student.studentPhone || 'N/A',
                student.academicYear || 'N/A',
                (student.isHistoricalView && student.currentAcademicYear) ? `Now in ${student.currentAcademicYear}` : '—'
              ]);
            });
          });
        });
      });

      const detailedSheet = XLSX.utils.aoa_to_sheet(detailedRows);
      const detailedCols = [
        { width: 8 },   // S.No
        { width: 15 },  // Roll Number
        { width: 25 },  // Name
        { width: 20 },  // Hostel
        { width: 15 },  // Category
        { width: 12 },  // Room Number
        { width: 12 },  // Course
        { width: 15 },  // Branch
        { width: 10 },  // Gender
        { width: 15 },  // Phone
        { width: 15 },  // Academic Year
        { width: 20 }   // Next AY Details
      ];
      detailedSheet['!cols'] = detailedCols;

      // Professional styling definitions
      const titleStyle = {
        font: { bold: true, size: 14, color: { rgb: "1F4E79" } }
      };

      const headerStyle = {
        font: { bold: true, size: 11, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "1F4E79" } },
        alignment: { horizontal: "center", vertical: "center" },
        border: {
          top: { style: "thin", color: { rgb: "D9D9D9" } },
          bottom: { style: "thin", color: { rgb: "D9D9D9" } },
          left: { style: "thin", color: { rgb: "D9D9D9" } },
          right: { style: "thin", color: { rgb: "D9D9D9" } }
        }
      };

      const dataStyle = {
        font: { size: 10 },
        alignment: { horizontal: "left", vertical: "center" },
        border: {
          top: { style: "thin", color: { rgb: "E0E0E0" } },
          bottom: { style: "thin", color: { rgb: "E0E0E0" } },
          left: { style: "thin", color: { rgb: "E0E0E0" } },
          right: { style: "thin", color: { rgb: "E0E0E0" } }
        }
      };

      const centerDataStyle = {
        ...dataStyle,
        alignment: { horizontal: "center", vertical: "center" }
      };

      const totalStyle = {
        font: { bold: true, size: 11 },
        fill: { fgColor: { rgb: "F2F2F2" } },
        border: {
          top: { style: "thin", color: { rgb: "D9D9D9" } },
          bottom: { style: "double", color: { rgb: "000000" } },
          left: { style: "thin", color: { rgb: "D9D9D9" } },
          right: { style: "thin", color: { rgb: "D9D9D9" } }
        }
      };

      // Apply styles to Summary Sheet
      const numHostels = Object.keys(hostelSummaries).length;
      const summaryRange = XLSX.utils.decode_range(summarySheet['!ref'] || 'A1:C20');
      for (let r = summaryRange.s.r; r <= summaryRange.e.r; r++) {
        for (let c = summaryRange.s.c; c <= summaryRange.e.c; c++) {
          const cellRef = XLSX.utils.encode_cell({ r, c });
          const cell = summarySheet[cellRef];
          if (!cell) continue;

          if (r === 0 || r === (6 + numHostels)) {
            cell.s = titleStyle;
          } else if (r === 2 || r === (7 + numHostels)) {
            cell.s = headerStyle;
          } else if (r === (3 + numHostels)) {
            cell.s = totalStyle;
          } else if (r > 2) {
            cell.s = (c > 0) ? centerDataStyle : dataStyle;
          }
        }
      }

      // Apply styles to Detailed Sheet
      const detailedRange = XLSX.utils.decode_range(detailedSheet['!ref'] || 'A1:L50');
      for (let r = detailedRange.s.r; r <= detailedRange.e.r; r++) {
        for (let c = detailedRange.s.c; c <= detailedRange.e.c; c++) {
          const cellRef = XLSX.utils.encode_cell({ r, c });
          const cell = detailedSheet[cellRef];
          if (!cell) continue;

          if (r === 0) {
            cell.s = titleStyle;
          } else if (r === 2) {
            cell.s = headerStyle;
          } else if (r > 2) {
            const shouldCenter = [0, 1, 5, 8, 9, 10, 11].includes(c);
            cell.s = shouldCenter ? centerDataStyle : dataStyle;
          }
        }
      }

      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Abstract & Summary');
      XLSX.utils.book_append_sheet(workbook, detailedSheet, 'Detailed List');

      // Generate filename
      const timestamp = new Date().toISOString().slice(0, 10);
      const resolvedYear = filters.academicYear || 'All_Years';
      const filename = `${isLiveMode ? 'Live_Hostel_Occupancy' : `Hostel_Occupancy_${resolvedYear}`}_${timestamp}.xlsx`;

      XLSX.writeFile(workbook, filename);
      toast.success('Excel report downloaded successfully!', { id: loadingToast });
    } catch (err) {
      console.error('Error generating Excel:', err);
      toast.error(err.message || 'Error generating Excel report', { id: loadingToast });
    }
  };




  // Edit Modal
  const renderEditModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-xl p-4 sm:p-6 w-full max-w-5xl mx-auto max-h-[95vh] overflow-y-auto">

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3 sm:gap-2">
          <div>
            <h3 className="text-lg sm:text-xl font-bold text-gray-800">Edit Student</h3>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">Update hostel information (personal &amp; academic details are read-only)</p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => openPasswordResetModal({ _id: editId, name: editForm.name, rollNumber: editForm.rollNumber })}
              className="flex items-center gap-2 px-2 sm:px-3 py-2 text-xs sm:text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
            >
              <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
              <span className="hidden sm:inline">Reset Password</span>
              <span className="sm:hidden">Reset</span>
            </button>
            <button onClick={() => setEditModal(false)} className="text-gray-500 hover:text-gray-700 p-2">
              <XMarkIcon className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>
        </div>

        <form onSubmit={handleEditSubmit} className="space-y-6">

          {/* Personal & Academic Info â€” read-only (SQL source) */}
          <div className="p-4 border rounded-lg space-y-4 bg-gray-50/50">
            <h4 className="text-sm sm:text-base font-semibold text-gray-700 border-b pb-1">Personal &amp; Academic Info</h4>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700">Name</label>
                  <input type="text" value={editForm.name || ''} readOnly className={readOnlyInputClass} />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700">Roll Number</label>
                  <input type="text" value={editForm.rollNumber || ''} readOnly className={readOnlyInputClass} />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700">Admission Number</label>
                  <input type="text" value={editForm.admissionNumber || ''} readOnly className={readOnlyInputClass} />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700">Gender</label>
                  <input type="text" value={editForm.gender || ''} readOnly className={readOnlyInputClass} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700">Course</label>
                  <input type="text" value={getEditCourseLabel()} readOnly className={readOnlyInputClass} />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700">Branch</label>
                  <input type="text" value={getEditBranchLabel()} readOnly className={readOnlyInputClass} />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700">Year</label>
                  <input type="text" value={editForm.year ?? ''} readOnly className={readOnlyInputClass} />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700">Batch</label>
                  <input type="text" value={editForm.batch || ''} readOnly className={readOnlyInputClass} />
                </div>
              </div>
            </div>
          </div>

          {/* Hostel Info â€” editable */}
          <div className="p-4 border rounded-lg space-y-4 border-blue-100 bg-blue-50/30">
            <h4 className="text-sm sm:text-base font-semibold text-gray-700 border-b pb-1">Hostel Info</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700">Academic Year</label>
                <select
                  name="academicYear"
                  value={editForm.academicYear}
                  onChange={handleEditFormChange}
                  required
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                >
                  <option value="">Select Academic Year</option>
                  {generateAcademicYears().map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700">Admit Date</label>
                <input
                  type="date"
                  name="admitDate"
                  value={editForm.admitDate || ''}
                  onChange={handleEditFormChange}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700">Joining Date</label>
                <input
                  type="date"
                  name="joiningDate"
                  value={editForm.joiningDate || ''}
                  onChange={handleEditFormChange}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                />
                <p className="text-[11px] text-gray-500 mt-0.5">Attendance opens starting from this date</p>
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700">Left Date</label>
                <input
                  type="date"
                  name="leftDate"
                  value={editForm.leftDate || ''}
                  onChange={handleEditFormChange}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                />
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Prefills from expired date when empty. Saving a due left date expires the hostel request.
                </p>
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700">Hostel ID</label>
                <input
                  type="text"
                  value={editForm.hostelSequenceId || 'Not assigned'}
                  readOnly
                  className={readOnlyInputClass}
                  placeholder="Auto-generated"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700">Hostel</label>
                <input
                  type="text"
                  value={editHostelName || 'Not assigned'}
                  disabled
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-gray-100 text-gray-500"
                  placeholder="Hostel name"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700">Category</label>
                {canEditRoomCategory ? (
                  <select
                    name="category"
                    value={editForm.category}
                    onChange={handleEditFormChange}
                    required
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select Category</option>
                    {editForm.gender && getCategoryOptions(editForm.gender).map(category => (
                      <option key={category} value={category}>{getCategoryDisplay(category)}</option>
                    ))}
                  </select>
                ) : (
                  <>
                    <input
                      type="text"
                      value={getCategoryDisplay(editForm.category) || '—'}
                      readOnly
                      className={readOnlyInputClass}
                    />
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Use the Category Changes tab to request a category update.
                    </p>
                  </>
                )}
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700">Room Number</label>
                {canEditRoomCategory ? (
                  <div className="flex gap-2">
                    <select
                      name="roomNumber"
                      value={editForm.roomNumber}
                      onChange={handleEditFormChange}
                      required
                      disabled={!editForm.gender || !editForm.category || loadingEditRooms}
                      className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select Room</option>
                      {loadingEditRooms ? (
                        <option value="" disabled>Loading rooms...</option>
                      ) : (
                        editRoomsWithAvailability.map(room => (
                          <option key={room._id} value={room.roomNumber}>
                            Room {room.roomNumber} ({room.studentCount}/{room.bedCount})
                          </option>
                        ))
                      )}
                    </select>
                    {editForm.roomNumber && (
                      <button
                        type="button"
                        onClick={() => {
                          const selectedRoom = editRoomsWithAvailability.find(r => r.roomNumber === editForm.roomNumber);
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
                ) : (
                  <>
                    <input
                      type="text"
                      value={editForm.roomNumber || '—'}
                      readOnly
                      className={readOnlyInputClass}
                    />
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Use the Room Changes tab to request a room update.
                    </p>
                  </>
                )}
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700">Bed Number (Optional)</label>
                <input
                  type="text"
                  name="bedNumber"
                  value={editForm.bedNumber || ''}
                  onChange={handleEditFormChange}
                  readOnly={!canEditRoomCategory}
                  className={
                    canEditRoomCategory
                      ? 'w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                      : readOnlyInputClass
                  }
                  placeholder="e.g., 320 Bed 1"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700">Locker Number (Optional)</label>
                <input
                  type="text"
                  name="lockerNumber"
                  value={editForm.lockerNumber || ''}
                  onChange={handleEditFormChange}
                  readOnly={!canEditRoomCategory}
                  className={
                    canEditRoomCategory
                      ? 'w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                      : readOnlyInputClass
                  }
                  placeholder="e.g., 320 Locker 1"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700">Meal Type</label>
                <select
                  name="mealType"
                  value={editForm.mealType}
                  onChange={handleEditFormChange}
                  required
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select Meal Type</option>
                  <option value="non-veg">Non-Veg</option>
                  <option value="veg">Veg</option>
                </select>
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700">Hostel Status</label>
                {(() => {
                  const editingCurrentYear =
                    !editForm.currentAcademicYear ||
                    String(editForm.academicYear) === String(editForm.currentAcademicYear);
                  return (
                    <>
                      <select
                        name="hostelStatus"
                        value={editForm.hostelStatus || 'Active'}
                        onChange={handleEditFormChange}
                        required={editingCurrentYear}
                        disabled={!editingCurrentYear}
                        className={`w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                          !editingCurrentYear ? 'bg-gray-100 text-gray-500' : ''
                        }`}
                      >
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                      </select>
                      {!editingCurrentYear && (
                        <p className="text-[11px] text-gray-500 mt-0.5">
                          Historical year — status here is display-only. Deactivate only from the current year ({editForm.currentAcademicYear}).
                        </p>
                      )}
                    </>
                  );
                })()}
              </div>
              <div className="col-span-full">
                <label className="block text-xs sm:text-sm font-medium text-gray-700">Parent Permission for Outing</label>
                <div className="flex items-center space-x-2 mt-1">
                  <input
                    type="checkbox"
                    name="parentPermissionForOuting"
                    checked={editForm.parentPermissionForOuting}
                    onChange={handleEditFormChange}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                  />
                  <span className="text-xs sm:text-sm text-gray-700">Enable parent permission</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">When disabled, permission requests go directly to principal</p>
              </div>
            </div>
          </div>

          {/* Contact Info â€” read-only */}
          <div className="p-4 border rounded-lg space-y-4 bg-gray-50/50">
            <h4 className="text-sm sm:text-base font-semibold text-gray-700 border-b pb-1">Contact Info</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700">Student Phone</label>
                <input type="tel" value={editForm.studentPhone || ''} readOnly className={readOnlyInputClass} />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700">Parent Phone</label>
                <input type="tel" value={editForm.parentPhone || ''} readOnly className={readOnlyInputClass} />
              </div>
              <div className="col-span-full">
                <label className="block text-xs sm:text-sm font-medium text-gray-700">Email</label>
                <input type="email" value={editForm.email || ''} readOnly className={readOnlyInputClass} />
              </div>
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 pt-2 sm:pt-4">
            <button
              type="button"
              onClick={() => setEditModal(false)}
              className="w-full sm:w-auto px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={editing}
              className={`w-full sm:w-auto px-4 py-2 text-sm rounded-lg text-white font-medium transition-colors ${editing
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
                }`}
            >
              {editing ? 'Saving...' : 'Save Hostel Changes'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );




  // Photo Edit Modal
  const renderPhotoEditModal = () => (
    photoEditModal && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
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
              {/* Student Photo (from SDMS) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Student Photo (SDMS)</label>
                <div className="flex items-center justify-center w-full h-32 border-2 border-gray-200 rounded-lg bg-gray-50">
                  {photoEditStudentPhotoPreview ? (
                    <img src={photoEditStudentPhotoPreview} alt="Student" className="h-28 w-auto object-cover rounded-lg" />
                  ) : (
                    <p className="text-sm text-gray-400 text-center px-2">No photo in SDMS</p>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-2">Managed in SDMS; not editable here.</p>
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
                className={`w-full sm:w-auto px-3 sm:px-4 py-1.5 sm:py-2 text-sm rounded-lg text-white font-medium transition-colors ${photoEditLoading
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

      // Add guardian photos if selected
      if (photoEditGuardianPhoto1) {
        formData.append('guardianPhoto1', photoEditGuardianPhoto1);
      }
      if (photoEditGuardianPhoto2) {
        formData.append('guardianPhoto2', photoEditGuardianPhoto2);
      }

      // Only proceed if at least one photo is selected
      if (!photoEditGuardianPhoto1 && !photoEditGuardianPhoto2) {
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
    setShowStatusUpdateModal(false);
    setStatusUpdateReason('');
  };

  const handleDeactivateStudent = async () => {
    if (!selectedStudent?._id) return;

    const reason = statusUpdateReason.trim();
    if (!reason) {
      toast.error('Please enter a reason for deactivation');
      return;
    }

    try {
      setStatusUpdateLoading(true);
      const response = await api.post(
        `/api/admin/students/${selectedStudent._id}/deactivate-application`,
        { reason }
      );

      if (response.data.success) {
        toast.success(response.data.message || 'Student marked as inactive');
        const updatedStudent = {
          ...selectedStudent,
          hostelStatus: 'Inactive',
          applicationStatus: 'Expired',
          bedNumber: undefined,
          lockerNumber: undefined,
          actualExpiredAt: response.data.data?.actualExpiredAt || new Date().toISOString()
        };
        setSelectedStudent(updatedStudent);
        setShowStatusUpdateModal(false);
        setStatusUpdateReason('');
        fetchStudents();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update student status');
    } finally {
      setStatusUpdateLoading(false);
    }
  };

  // Open concession request modal
  const openConcessionRequestModal = (student) => {
    if (!canManageConcessions) {
      toast.error('You do not have permission to manage concessions');
      return;
    }
    setSelectedStudent(student);
    setConcessionRequestForm({
      amount: student.concession?.toString() || '',
      notes: ''
    });
    setConcessionRequestModal(true);
    // Fetch fee structure for preview
    if (student.academicYear && student.course && student.branch && student.year && student.category) {
      const courseId = student.course?._id || student.course;
      fetchConcessionFeeStructure(
        student.academicYear,
        courseId,
        student.branch,
        student.year,
        getCategoryValue(student.category)
      );
    }
  };

  // Fetch fee structure for concession preview
  const fetchConcessionFeeStructure = async (academicYear, courseId, branchName, year, category) => {
    if (!academicYear || !courseId || !branchName || !year || !category) {
      setConcessionFeeStructure(null);
      setConcessionCalculatedFees({ term1: 0, term2: 0, term3: 0, total: 0 });
      return;
    }

    try {
      setLoadingConcessionFeeStructure(true);
      const response = await api.get(`/api/fee-structures/admit-card/${academicYear}/${courseId}/${encodeURIComponent(branchName)}/${year}/${category}`);

      if (response.data.success) {
        const feeData = response.data.data;
        setConcessionFeeStructure(feeData);

        // Calculate initial fees without concession
        const term1 = feeData.term1Fee || 0;
        const term2 = feeData.term2Fee || 0;
        const term3 = feeData.term3Fee || 0;
        const total = term1 + term2 + term3;

        setConcessionCalculatedFees({
          term1,
          term2,
          term3,
          total
        });
      } else {
        setConcessionFeeStructure(null);
        setConcessionCalculatedFees({ term1: 0, term2: 0, term3: 0, total: 0 });
      }
    } catch (error) {
      console.error('Error fetching fee structure for concession:', error);
      setConcessionFeeStructure(null);
      setConcessionCalculatedFees({ term1: 0, term2: 0, term3: 0, total: 0 });
    } finally {
      setLoadingConcessionFeeStructure(false);
    }
  };

  // Calculate fees with concession for preview
  const calculateConcessionFees = (concessionAmount) => {
    if (!concessionFeeStructure) return;

    const concession = Number(concessionAmount) || 0;

    // Apply concession to Term 1 first
    let term1 = Math.max(0, concessionFeeStructure.term1Fee - concession);

    // If concession exceeds Term 1 fee, apply excess to Term 2
    let remainingConcession = Math.max(0, concession - concessionFeeStructure.term1Fee);
    let term2 = Math.max(0, concessionFeeStructure.term2Fee - remainingConcession);

    // If concession still exceeds Term 1 + Term 2, apply to Term 3
    remainingConcession = Math.max(0, remainingConcession - concessionFeeStructure.term2Fee);
    let term3 = Math.max(0, concessionFeeStructure.term3Fee - remainingConcession);

    const total = term1 + term2 + term3;

    setConcessionCalculatedFees({ term1, term2, term3, total });
  };

  // Handle concession request submission
  const handleConcessionRequest = async (e) => {
    e.preventDefault();

    if (!canManageConcessions) {
      toast.error('You do not have permission to manage concessions');
      return;
    }

    if (!selectedStudent) {
      toast.error('No student selected');
      return;
    }

    const concessionAmount = Number(concessionRequestForm.amount) || 0;

    if (concessionAmount < 0) {
      toast.error('Concession amount cannot be negative');
      return;
    }

    setConcessionRequestLoading(true);
    try {
      // Call update student API with concession field
      await api.put(`/api/admin/students/${selectedStudent._id}`, {
        concession: concessionAmount
      });

      toast.success(concessionAmount > 0
        ? 'Concession request submitted successfully. It will be reviewed by super admin.'
        : 'Concession removed successfully.'
      );

      setConcessionRequestModal(false);
      setConcessionRequestForm({ amount: '', notes: '' });

      // Refresh student list and close details modal to refresh data
      fetchStudents();
      setStudentDetailsModal(false);
      setSelectedStudent(null);
    } catch (err) {
      console.error('Error requesting concession:', err);
      toast.error(err.response?.data?.message || 'Failed to request concession');
    } finally {
      setConcessionRequestLoading(false);
    }
  };

  // Download admit card function
  const handleDownloadAdmitCard = async (student) => {
    if (!student.studentPhoto) {
      toast.error('Student photo is required to generate admit card');
      return;
    }

    if (student.concession > 0 && !student.concessionApproved) {
      toast.error('Cannot generate admit card. Concession is pending approval.');
      return;
    }

    setDownloadingAdmitCard(true);
    try {
      await downloadAdmitCard(student);
      toast.success('Admit card downloaded successfully');
    } catch (error) {
      console.error('Error downloading admit card:', error);
      toast.error(error.response?.data?.message || 'Failed to download admit card');
    } finally {
      setDownloadingAdmitCard(false);
    }
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
                <li>â€¢ Minimum 6 characters long</li>
                <li>â€¢ Both password fields must match</li>
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
                className={`flex-1 px-4 py-2 text-sm rounded-lg text-white font-medium transition-colors ${passwordResetLoading
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


  // Concession Request Modal Component
  const renderConcessionRequestModal = () => (
    concessionRequestModal && selectedStudent && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex justify-between items-center p-4 sm:p-6 border-b border-gray-200">
            <h3 className="text-lg sm:text-xl font-bold text-gray-800">
              {selectedStudent.concession > 0 ? 'Update Concession' : 'Request Concession'}
            </h3>
            <button
              onClick={() => {
                setConcessionRequestModal(false);
                setConcessionRequestForm({ amount: '', notes: '' });
                setConcessionFeeStructure(null);
                setConcessionCalculatedFees({ term1: 0, term2: 0, term3: 0, total: 0 });
              }}
              className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-lg"
            >
              <XMarkIcon className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>

          {/* Content */}
          <form onSubmit={handleConcessionRequest} className="p-4 sm:p-6">
            {/* Student Info */}
            <div className="bg-blue-50 rounded-lg p-4 mb-4">
              <div className="flex items-center space-x-3">
                {selectedStudent.studentPhoto && (
                  <img
                    src={selectedStudent.studentPhoto}
                    alt={selectedStudent.name}
                    className="w-12 h-12 rounded-full object-cover border-2 border-blue-200"
                  />
                )}
                <div>
                  <p className="font-semibold text-gray-900">{selectedStudent.name}</p>
                  <p className="text-sm text-gray-600">{selectedStudent.rollNumber}</p>
                </div>
              </div>
            </div>

            {/* Concession Amount Input */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Concession Amount (â‚¹) *
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={concessionRequestForm.amount}
                onChange={(e) => {
                  const value = e.target.value;
                  setConcessionRequestForm(prev => ({ ...prev, amount: value }));
                  calculateConcessionFees(value);
                }}
                required
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                placeholder="Enter concession amount"
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter 0 to remove existing concession
              </p>
            </div>

            {/* Notes (Optional) */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes (Optional)
              </label>
              <textarea
                value={concessionRequestForm.notes}
                onChange={(e) => setConcessionRequestForm(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                placeholder="Add any notes or remarks about this concession request..."
              />
            </div>

            {/* Fee Preview */}
            {loadingConcessionFeeStructure ? (
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-center">
                  <LoadingSpinner size="sm" />
                  <span className="ml-2 text-sm text-gray-600">Loading fee structure...</span>
                </div>
              </div>
            ) : concessionFeeStructure && concessionRequestForm.amount ? (
              <div className="bg-orange-50 rounded-lg p-4 mb-4 border border-orange-200">
                <h4 className="text-sm font-semibold text-orange-800 mb-3">Fee Preview</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Original Total Fee:</span>
                    <span className="font-medium text-gray-900">
                      â‚¹{concessionFeeStructure.totalFee.toLocaleString()}
                    </span>
                  </div>
                  {Number(concessionRequestForm.amount) > 0 && (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Concession Amount:</span>
                        <span className="font-medium text-orange-600">
                          - â‚¹{Number(concessionRequestForm.amount).toLocaleString()}
                        </span>
                      </div>
                      <div className="border-t border-orange-200 pt-2 mt-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">After Concession:</span>
                          <span className="font-semibold text-orange-800">
                            â‚¹{concessionCalculatedFees.total.toLocaleString()}
                          </span>
                        </div>
                        <div className="mt-2 text-xs text-gray-500">
                          <div>Term 1: â‚¹{concessionCalculatedFees.term1.toLocaleString()}</div>
                          <div>Term 2: â‚¹{concessionCalculatedFees.term2.toLocaleString()}</div>
                          <div>Term 3: â‚¹{concessionCalculatedFees.term3.toLocaleString()}</div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ) : concessionRequestForm.amount && Number(concessionRequestForm.amount) > 0 ? (
              <div className="bg-yellow-50 rounded-lg p-4 mb-4 border border-yellow-200">
                <p className="text-sm text-yellow-800">
                  âš ï¸ Fee structure not available. Fee calculation preview unavailable.
                </p>
              </div>
            ) : null}

            {/* Info Message */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <div className="flex items-start">
                <ExclamationTriangleIcon className="h-5 w-5 text-blue-600 mt-0.5 mr-2 flex-shrink-0" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">Important:</p>
                  <p className="text-xs">
                    This concession request will be submitted for approval. Once approved by super admin,
                    the fees will be recalculated automatically. You can track the approval status in the
                    Fee Management â†’ Concessions tab.
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => {
                  setConcessionRequestModal(false);
                  setConcessionRequestForm({ amount: '', notes: '' });
                  setConcessionFeeStructure(null);
                  setConcessionCalculatedFees({ term1: 0, term2: 0, term3: 0, total: 0 });
                }}
                className="w-full sm:w-auto px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                disabled={concessionRequestLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={concessionRequestLoading}
                className={`w-full sm:w-auto px-4 py-2 text-sm rounded-lg text-white font-medium transition-colors ${concessionRequestLoading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-orange-600 hover:bg-orange-700'
                  }`}
              >
                {concessionRequestLoading ? (
                  <span className="flex items-center justify-center">
                    <LoadingSpinner size="sm" className="border-white mr-2" />
                    Submitting...
                  </span>
                ) : (
                  'Submit Request'
                )}
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
              className={`px-6 py-3 rounded-lg flex items-center space-x-2 ${cameraReady
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

    return (
      <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800">
              {isLiveMode
                ? `Live Students ( ${totalStudents} )`
                : filters.hostelStatus === 'Active'
                  ? `Active Students ( ${totalStudents} )`
                  : filters.hostelStatus === 'Inactive'
                    ? `Expired Students ( ${totalStudents} )`
                    : `All Students ( ${totalStudents} )`}
            </h2>
            <div className="flex items-center gap-2 mt-2 sm:mt-0">
              <span className="text-sm text-gray-600">
                Showing {students.length} of {totalStudents} {isLiveMode ? 'live' : filters.hostelStatus === 'Inactive' ? 'expired' : filters.hostelStatus === 'Active' ? 'active' : ''} students
                {Object.entries(filters).some(([key, value]) => value && key !== 'search' && !(isLiveMode && key === 'hostelStatus')) && ' (filtered)'}
              </span>
            </div>
          </div>

          {/* Filters — compact single row */}
          <div className="flex flex-nowrap items-center gap-2 overflow-x-auto pb-1">
            <div className="relative min-w-[150px] flex-[1.4] shrink-0">
              <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-3.5 w-3.5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search..."
                name="search"
                value={filters.search}
                onChange={handleFilterChange}
                className="w-full pl-7 pr-2 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <select
              name="course"
              value={filters.course}
              onChange={handleFilterChange}
              disabled={loadingCourses}
              className="min-w-[100px] flex-1 shrink-0 px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">{loadingCourses ? 'Courses...' : 'Course'}</option>
              {courseOptions.map(courseName => (
                <option key={courseName} value={courseName}>
                  {courseName}
                </option>
              ))}
            </select>
            <select
              name="branch"
              value={filters.branch}
              onChange={handleFilterChange}
              disabled={!filters.course || loadingBranches}
              className="min-w-[100px] flex-1 shrink-0 px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">{loadingBranches ? 'Branches...' : 'Branch'}</option>
              {branchOptions.map(branchName => (
                <option key={branchName} value={branchName}>
                  {branchName}
                </option>
              ))}
            </select>
            <select
              name="hostel"
              value={filters.hostel}
              onChange={handleFilterChange}
              disabled={loadingHostels}
              className="min-w-[100px] flex-1 shrink-0 px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">{loadingHostels ? 'Hostels...' : 'Hostel'}</option>
              {hostels.map((hostel) => (
                <option key={hostel._id} value={hostel._id}>
                  {hostel.name}
                </option>
              ))}
            </select>
            <select
              name="category"
              value={filters.category}
              onChange={handleFilterChange}
              disabled={!filters.hostel}
              className="min-w-[95px] flex-1 shrink-0 px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Category</option>
              {filterCategories.map((category) => (
                <option key={category._id} value={category.name}>
                  {category.name === 'A+' ? 'A+ (AC)' : category.name === 'B+' ? 'B+ (AC)' : category.name}
                </option>
              ))}
            </select>
            <select
              name="roomNumber"
              value={filters.roomNumber}
              onChange={handleFilterChange}
              disabled={!filters.hostel || loadingFilterRooms}
              className="min-w-[90px] flex-1 shrink-0 px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">
                {!filters.hostel
                  ? 'Room'
                  : loadingFilterRooms
                    ? 'Rooms...'
                    : 'Room'}
              </option>
              {filterRooms.map((room) => (
                <option key={room._id || room.roomNumber} value={room.roomNumber}>
                  {room.roomNumber}
                </option>
              ))}
            </select>
            <select
              name="hostelStatus"
              disabled={isLiveMode}
              value={isLiveMode ? 'Active' : filters.hostelStatus}
              onChange={handleFilterChange}
              className="min-w-[95px] flex-1 shrink-0 px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
            >
              <option value="">Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Expired</option>
            </select>
            <button
              type="button"
              onClick={() => {
                setFilters({
                  search: '',
                  course: '',
                  branch: '',
                  hostel: '',
                  category: '',
                  roomNumber: '',
                  academicYear: isLiveMode ? '' : getDefaultAcademicYear(),
                  hostelStatus: 'Active'
                });
                setFilterCategories([]);
                setFilterRooms([]);
                setCurrentPage(1);
              }}
              className="shrink-0 px-2.5 py-1.5 text-xs bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors font-medium whitespace-nowrap"
            >
              Clear
            </button>
          </div>

          {/* Active filter chips */}
          <div className="mt-2">
            <div className="flex flex-wrap gap-1.5">
                {Object.entries(filters).map(([key, value]) => {
                  if (!shouldShowFilterChip(key, value)) return null;
                  const label = FILTER_LABELS[key] || key;
                  const chipValue = key === 'hostel'
                    ? toDisplayText(hostels.find((h) => h._id === value), value)
                    : formatFilterChipValue(key, value);
                  return (
                    <span
                      key={key}
                      className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full inline-flex items-center gap-1"
                    >
                      <span>{label}: {chipValue}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setFilters((prev) => ({
                            ...prev,
                            [key]:
                              key === 'hostelStatus'
                                ? 'Active'
                                : key === 'academicYear'
                                  ? getDefaultAcademicYear()
                                  : ''
                          }));
                          if (key === 'hostel') {
                            setFilterCategories([]);
                            setFilterRooms([]);
                          }
                          setCurrentPage(1);
                        }}
                        className="p-0.5 rounded-full text-blue-600 hover:text-blue-800 hover:bg-blue-200/60"
                        aria-label={`Remove ${label} filter`}
                      >
                        <XMarkIcon className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  );
                })}
            </div>
          </div>
        </div>

        {/* Table - Made responsive with min-height so spinner is always visible during loading */}
        <div className="relative min-h-[350px]">
          {(tableLoading || loading) && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-xs flex justify-center items-center z-20 rounded-xl">
              <LoadingSpinner size="lg" />
            </div>
          )}
          {error && !students.length && !tableLoading && !loading && (
            <div className="text-center text-red-600 py-16 font-medium">{error}</div>
          )}
          {!error && !tableLoading && !loading && students.length === 0 && (
            <div className="text-center text-gray-500 py-16 font-medium">No students found matching your criteria.</div>
          )}
          {students.length > 0 && (
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
                            <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500 font-medium">{student.hostelSequenceId || student.hostelId || 'N/A'}</td>
                            <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">{student.rollNumber}</td>
                            <td className="hidden sm:table-cell px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                              {getCourseDisplay(student.course)} - Year {student.year}
                            </td>
                            <td className="hidden md:table-cell px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                              <div className="flex flex-col">
                                <span>Room {student.roomNumber || '—'}</span>
                                {student.category && (
                                  <span className="text-xs text-purple-600">Cat: {getCategoryDisplay(student.category)}</span>
                                )}
                                {student.bedNumber && (
                                  <span className="text-xs text-blue-600">Bed: {student.bedNumber}</span>
                                )}
                                {student.lockerNumber && (
                                  <span className="text-xs text-green-600">Locker: {student.lockerNumber}</span>
                                )}
                                {student.isHistoricalView && student.currentAcademicYear && (
                                  <span className="text-xs text-amber-600">
                                    Now in {student.currentAcademicYear}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="hidden lg:table-cell px-3 py-4 whitespace-nowrap text-sm">
                              <div className="flex flex-col gap-1">
                                {(() => {
                                  const statusDisplay = getHostelStatusDisplay(student);
                                  return (
                                    <>
                                      <span
                                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusDisplay.badgeClass}`}
                                      >
                                        {statusDisplay.label}
                                      </span>
                                      {statusDisplay.nocDateText ? (
                                        <span className="text-xs text-gray-500">
                                          NOC Vacating Date: {statusDisplay.nocDateText}
                                        </span>
                                      ) : statusDisplay.expiryText ? (
                                        <span className="text-xs text-gray-500">
                                          Expired on {statusDisplay.expiryText}
                                        </span>
                                      ) : null}
                                    </>
                                  );
                                })()}
                                {shouldShowGraduationStatus(student.graduationStatus) && (
                                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${student.graduationStatus === 'Graduated'
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
                                {canDeleteStudent && student.applicationStatus !== 'Withdrawn' && student.hostelRequestStatus !== 'cancelled' ? (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleCancelRegistration(student._id, student);
                                    }}
                                    disabled={deletingId === student._id}
                                    className="px-2 py-1 text-xs font-semibold text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50"
                                    title="Cancel student registration"
                                  >
                                    <XCircleIcon className="w-4 h-4" />
                                    <span>Cancel</span>
                                  </button>
                                ) : (student.applicationStatus === 'Withdrawn' || student.hostelRequestStatus === 'cancelled') ? (
                                  <span className="text-xs text-amber-700 font-medium px-2 py-1 bg-amber-50 rounded border border-amber-200">
                                    Cancelled
                                  </span>
                                ) : (
                                  <button
                                    disabled
                                    className="p-1.5 text-gray-400 cursor-not-allowed rounded-lg"
                                    title="Cancel access restricted"
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl lg:max-w-6xl max-h-[95vh] flex flex-col mx-2 sm:mx-0 relative">
        {selectedStudent && (
          <>
            {/* Header */}
            <div className="flex justify-between items-center p-4 sm:p-6 border-b border-gray-200 flex-shrink-0">
              <h3 className="text-lg sm:text-xl font-bold text-gray-800">Student Details</h3>
              <button
                onClick={() => setStudentDetailsModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-lg"
              >
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1">
              {/* Top Section: Photo + Basic Info */}
              <div className="flex flex-col xl:flex-row gap-4 sm:gap-6 mb-6">
                {/* Photo Section */}
                <div className="flex-shrink-0 flex justify-center items-center">
                  {selectedStudent.studentPhoto ? (
                    <img
                      src={selectedStudent.studentPhoto}
                      alt={selectedStudent.name}
                      className="w-32 h-32 sm:w-40 sm:h-40 rounded-full object-cover border-4 border-gray-200 shadow-lg"
                    />
                  ) : (
                    <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center text-white text-2xl sm:text-4xl font-bold shadow-lg">
                      {selectedStudent.name?.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Basic Info Card */}
                <div className="flex-1 bg-gray-50 rounded-lg p-4">
                  <h4 className="text-base sm:text-lg font-semibold text-gray-800 mb-3">Basic Information</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Name */}
                    <div className="flex items-center space-x-2">
                      <span className="text-xs sm:text-sm text-gray-600 w-24">Name:</span>
                      <span className="font-medium text-gray-900 text-sm sm:text-base">{selectedStudent.name}</span>
                    </div>
                    {/* Roll Number */}
                    <div className="flex items-center space-x-2">
                      <span className="text-xs sm:text-sm text-gray-600 w-24">Roll Number:</span>
                      <span className="font-medium text-gray-900 text-sm sm:text-base">{selectedStudent.rollNumber}</span>
                    </div>
                    {/* Admission Number */}
                    <div className="flex items-center space-x-2">
                      <span className="text-xs sm:text-sm text-gray-600 w-24">Admission No:</span>
                      <span className="font-medium text-gray-900 text-sm sm:text-base">{selectedStudent.admissionNumber || 'N/A'}</span>
                    </div>
                    {/* Hostel ID (sequence) */}
                    <div className="flex items-center space-x-2">
                      <span className="text-xs sm:text-sm text-gray-600 w-24">Hostel ID:</span>
                      <span className="font-medium text-gray-900 text-sm sm:text-base">{selectedStudent.hostelSequenceId || (selectedStudent.hostelId && !/^[0-9a-fA-F]{24}$/.test(selectedStudent.hostelId) ? selectedStudent.hostelId : 'Not assigned')}</span>
                    </div>
                    {/* Hostel Name */}
                    <div className="flex items-center space-x-2">
                      <span className="text-xs sm:text-sm text-gray-600 w-24">Hostel:</span>
                      <span className="font-medium text-gray-900 text-sm sm:text-base">{getHostelName(selectedStudent.hostel?._id || selectedStudent.hostel)}</span>
                    </div>
                    {/* Gender */}
                    <div className="flex items-center space-x-2">
                      <span className="text-xs sm:text-sm text-gray-600 w-24">Gender:</span>
                      <span className="font-medium text-gray-900 text-sm sm:text-base">{selectedStudent.gender}</span>
                    </div>
                    {/* Student Phone */}
                    <div className="flex items-center space-x-2">
                      <span className="text-xs sm:text-sm text-gray-600 w-24">Student Phone:</span>
                      <span className="font-medium text-gray-900 break-all text-sm sm:text-base">{selectedStudent.studentPhone || 'N/A'}</span>
                    </div>
                    {/* Parent Phone */}
                    <div className="flex items-center space-x-2">
                      <span className="text-xs sm:text-sm text-gray-600 w-24">Parent Phone:</span>
                      <span className="font-medium text-gray-900 text-sm sm:text-base">{selectedStudent.parentPhone || 'N/A'}</span>
                    </div>
                    {/* Email */}
                    <div className="flex items-center space-x-2 sm:col-span-2">
                      <span className="text-xs sm:text-sm text-gray-600 w-24">Email:</span>
                      <span className="font-medium text-gray-900 break-all text-sm sm:text-base">{selectedStudent.email || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Section: Other Info Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {/* Fee & Concession Information */}
                <div className="bg-orange-50 rounded-lg p-4">
                  <h4 className="text-base sm:text-lg font-semibold text-orange-800 mb-3 flex items-center">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Fee & Concession
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs sm:text-sm text-orange-700">Concession:</span>
                      <span className="font-medium text-orange-900 text-sm sm:text-base">
                        ₹{(selectedStudent.concession || 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs sm:text-sm text-orange-700">Status:</span>
                      {selectedStudent.concession > 0 ? (
                        selectedStudent.concessionApproved ? (
                          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            Approved
                          </span>
                        ) : (
                          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                            Pending Approval
                          </span>
                        )
                      ) : (
                        <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                          No Concession
                        </span>
                      )}
                    </div>
                    {selectedStudent.totalCalculatedFee > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs sm:text-sm text-orange-700">Total Fee (After Concession):</span>
                        <span className="font-medium text-orange-900 text-sm sm:text-base">
                          ₹{selectedStudent.totalCalculatedFee.toLocaleString()}
                        </span>
                      </div>
                    )}
                    {canManageConcessions && (
                      <button
                        onClick={() => {
                          setStudentDetailsModal(false);
                          openConcessionRequestModal(selectedStudent);
                        }}
                        className="w-full mt-2 px-3 py-2 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center justify-center"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        {selectedStudent.concession > 0 ? 'Update Concession' : 'Request Concession'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Academic Information */}
                <div className="bg-blue-50 rounded-lg p-4">
                  <h4 className="text-base sm:text-lg font-semibold text-blue-800 mb-3 flex items-center">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    Academic Info
                  </h4>
                  <div className="space-y-3">
                    {[
                      { label: 'Course', value: getCourseDisplay(selectedStudent.course) },
                      { label: 'Branch', value: getBranchDisplay(selectedStudent.branch) },
                      { label: 'Year', value: `Year ${selectedStudent.year ?? '—'}` },
                      { label: 'Category', value: getCategoryDisplay(selectedStudent.category) },
                      { label: 'Batch', value: toDisplayText(selectedStudent.batch, '—') },
                      {
                        label: 'Academic Year',
                        value: toDisplayText(filters.academicYear || selectedStudent.academicYear, '—')
                      },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center justify-between">
                        <span className="text-xs sm:text-sm text-blue-700">{item.label}:</span>
                        <span className="font-medium text-blue-900 text-sm sm:text-base">{toDisplayText(item.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Hostel Information */}
                <div className="bg-purple-50 rounded-lg p-4">
                  <h4 className="text-base sm:text-lg font-semibold text-purple-800 mb-3 flex items-center">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    Hostel Information
                  </h4>
                  <div className="space-y-3">
                    {(() => {
                      const stayYear = filters.academicYear || selectedStudent.academicYear;
                      const formatStayDate = (value) =>
                        value ? new Date(value).toLocaleDateString() : '—';
                      return (
                        <>
                          <div className="pb-1 mb-1 border-b border-purple-100">
                            <p className="text-xs font-medium text-purple-600">
                              Stay dates for {stayYear || 'selected year'} hostel request
                            </p>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs sm:text-sm text-purple-700">Admit Date:</span>
                            <span className="font-medium text-purple-900 text-sm sm:text-base">
                              {formatStayDate(selectedStudent.admitDate)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs sm:text-sm text-purple-700">Joining Date:</span>
                            <span className="font-medium text-purple-900 text-sm sm:text-base">
                              {formatStayDate(selectedStudent.joiningDate)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs sm:text-sm text-purple-700">Left Date:</span>
                            <span className="font-medium text-purple-900 text-sm sm:text-base">
                              {formatStayDate(selectedStudent.leftDate)}
                            </span>
                          </div>
                        </>
                      );
                    })()}
                    <div className="flex items-center justify-between">
                      <span className="text-xs sm:text-sm text-purple-700">Room Number:</span>
                      <span className="font-medium text-purple-900 text-sm sm:text-base">Room {selectedStudent.roomNumber}</span>
                    </div>
                    {selectedStudent.bedNumber && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs sm:text-sm text-purple-700">Bed Number:</span>
                        <span className="font-medium text-blue-600 text-sm sm:text-base">{selectedStudent.bedNumber}</span>
                      </div>
                    )}
                    {selectedStudent.lockerNumber && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs sm:text-sm text-purple-700">Locker Number:</span>
                        <span className="font-medium text-green-600 text-sm sm:text-base">{selectedStudent.lockerNumber}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-xs sm:text-sm text-purple-700">Meal Type:</span>
                      <span className={`font-medium text-sm sm:text-base ${selectedStudent.mealType === 'veg' ? 'text-green-600' : 'text-orange-600'}`}>
                        {selectedStudent.mealType === 'veg' ? 'Veg' : 'Non-Veg'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs sm:text-sm text-purple-700">Parent Permission:</span>
                      <span className={`font-medium text-sm sm:text-base ${selectedStudent.parentPermissionForOuting ? 'text-green-600' : 'text-red-600'}`}>
                        {selectedStudent.parentPermissionForOuting ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs sm:text-sm text-purple-700">Hostel Status:</span>
                      {(() => {
                        const statusDisplay = getHostelStatusDisplay(selectedStudent);
                        return (
                          <div className="flex flex-col items-end gap-0.5">
                            <span
                              className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${statusDisplay.badgeClass}`}
                            >
                              {statusDisplay.label}
                            </span>
                            {statusDisplay.nocDateText ? (
                              <span className="text-xs text-gray-500">
                                NOC Vacating Date: {statusDisplay.nocDateText}
                              </span>
                            ) : statusDisplay.expiryText ? (
                              <span className="text-xs text-gray-500">
                                Expired on {statusDisplay.expiryText}
                              </span>
                            ) : null}
                          </div>
                        );
                      })()}
                    </div>
                    {shouldShowGraduationStatus(selectedStudent.graduationStatus) && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs sm:text-sm text-purple-700">Graduation Status:</span>
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${selectedStudent.graduationStatus === 'Graduated'
                        ? 'bg-blue-100 text-blue-800'
                        : selectedStudent.graduationStatus === 'Dropped'
                          ? 'bg-gray-100 text-gray-800'
                          : 'bg-yellow-100 text-yellow-800'
                        }`}>
                        {selectedStudent.graduationStatus}
                      </span>
                    </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 p-4 sm:p-6 border-t border-gray-200 bg-gray-50 flex-shrink-0">
              <button
                onClick={() => handleDownloadAdmitCard(selectedStudent)}
                disabled={downloadingAdmitCard || !selectedStudent.studentPhoto || (selectedStudent.concession > 0 && !selectedStudent.concessionApproved)}
                className="w-full sm:w-auto px-3 sm:px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
                title={!selectedStudent.studentPhoto ? 'Student photo required' : selectedStudent.concession > 0 && !selectedStudent.concessionApproved ? 'Concession pending approval' : 'Download Admit Card'}
              >
                <DocumentArrowDownIcon className="w-4 h-4 mr-2" />
                {downloadingAdmitCard ? 'Downloading...' : 'Admit Card'}
              </button>
              <button
                onClick={() => {
                  setStudentDetailsModal(false);
                  openEditModal(selectedStudent);
                }}
                className="w-full sm:w-auto px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center text-sm sm:text-base"
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
                className="w-full sm:w-auto px-3 sm:px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center text-sm sm:text-base"
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
                className="w-full sm:w-auto px-3 sm:px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors flex items-center justify-center text-sm sm:text-base"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
                Reset Password
              </button>
              {canDeactivateStudent(selectedStudent) && (
                <button
                  onClick={() => {
                    setStatusUpdateReason('');
                    setShowStatusUpdateModal(true);
                  }}
                  className="w-full sm:w-auto px-3 sm:px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center text-sm sm:text-base"
                >
                  <ExclamationTriangleIcon className="w-4 h-4 mr-2" />
                  Status Update
                </button>
              )}
            </div>
          </>
        )}

        {showStatusUpdateModal && selectedStudent && (
          <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center rounded-xl z-10 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-5 sm:p-6">
              <h4 className="text-lg font-bold text-gray-900 mb-2">Mark Student Inactive</h4>
              <p className="text-sm text-gray-600 mb-4">
                This will set <span className="font-medium">{selectedStudent.name}</span> ({selectedStudent.rollNumber}) as{' '}
                <span className="font-medium text-red-600">Inactive</span> and mark their application as{' '}
                <span className="font-medium text-red-600">Expired</span>. Bed and locker will be freed.
              </p>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for status update <span className="text-red-500">*</span>
              </label>
              <textarea
                value={statusUpdateReason}
                onChange={(e) => setStatusUpdateReason(e.target.value)}
                rows={4}
                placeholder="Enter reason for deactivating this student..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm"
                disabled={statusUpdateLoading}
              />
              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 mt-5">
                <button
                  type="button"
                  onClick={() => {
                    setShowStatusUpdateModal(false);
                    setStatusUpdateReason('');
                  }}
                  disabled={statusUpdateLoading}
                  className="w-full sm:w-auto px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeactivateStudent}
                  disabled={statusUpdateLoading || !statusUpdateReason.trim()}
                  className="w-full sm:w-auto px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {statusUpdateLoading ? 'Updating...' : 'Done'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderDatesTab = () => {
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

    const formatStayDate = (value) => {
      if (!value) return '';
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return '';
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    };

    return (
      <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800">
              Student Dates Overview ( {totalStudents} )
            </h2>
            <div className="flex items-center gap-3 mt-2 sm:mt-0">
              <span className="text-sm text-gray-600">
                Showing {students.length} of {totalStudents} students
                {Object.entries(filters).some(([key, value]) => value && key !== 'search') && ' (filtered)'}
              </span>
              <button
                onClick={handlePrintStudentDatesReport}
                className="inline-flex items-center space-x-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-all shadow-sm"
                title="Print filtered student dates list"
              >
                <PrinterIcon className="w-4 h-4" />
                <span>Print Report</span>
              </button>
            </div>
          </div>

          {/* Filters - shared filters layout */}
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
                {courseOptions.map(courseName => (
                  <option key={courseName} value={courseName}>
                    {courseName}
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
                {branchOptions.map(branchName => (
                  <option key={branchName} value={branchName}>
                    {branchName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <select
                name="hostel"
                value={filters.hostel}
                onChange={handleFilterChange}
                disabled={loadingHostels}
                className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">{loadingHostels ? 'Loading hostels...' : 'All Hostels'}</option>
                {hostels.map((hostel) => (
                  <option key={hostel._id} value={hostel._id}>
                    {hostel.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <select
                name="category"
                value={filters.category}
                onChange={handleFilterChange}
                disabled={!filters.hostel}
                className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Categories</option>
                {filterCategories.map((category) => (
                  <option key={category._id} value={category.name}>
                    {category.name === 'A+' ? 'A+ (AC)' : category.name === 'B+' ? 'B+ (AC)' : category.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <select
                name="roomNumber"
                value={filters.roomNumber}
                onChange={handleFilterChange}
                disabled={!filters.hostel || loadingFilterRooms}
                className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">
                  {!filters.hostel
                    ? 'Select hostel first'
                    : loadingFilterRooms
                      ? 'Loading rooms...'
                      : 'All Rooms'}
                </option>
                {filterRooms.map((room) => (
                  <option key={room._id || room.roomNumber} value={room.roomNumber}>
                    Room {room.roomNumber}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <select
                name="hostelStatus"
                value={filters.hostelStatus}
                onChange={handleFilterChange}
                className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              >
                <option value="">All Status</option>
                <option value="Active">Active Students</option>
                <option value="Inactive">Expired Students</option>
              </select>
            </div>
          </div>

          {/* Active Filters */}
          <div className="mt-4">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  setFilters({
                    search: '',
                    course: '',
                    branch: '',
                    hostel: '',
                    category: '',
                    roomNumber: '',
                    academicYear: getDefaultAcademicYear(),
                    hostelStatus: 'Active'
                  });
                  setFilterCategories([]);
                  setFilterRooms([]);
                  setCurrentPage(1);
                }}
                className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium font-semibold"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Table for Dates tab */}
        <div className="relative min-h-[350px]">
          {(tableLoading || loading) && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-xs flex justify-center items-center z-20 rounded-xl">
              <LoadingSpinner size="lg" />
            </div>
          )}
          {error && !students.length && !tableLoading && !loading && (
            <div className="text-center text-red-600 py-16 font-medium">{error}</div>
          )}
          {!error && !tableLoading && !loading && students.length === 0 && (
            <div className="text-center text-gray-500 py-16 font-medium">No students found matching your criteria.</div>
          )}
          {students.length > 0 && (
            <>
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <div className="inline-block min-w-full align-middle">
                  <div className="overflow-hidden shadow-sm ring-1 ring-black ring-opacity-5">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student Name</th>
                          <th scope="col" className="px-6 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Roll Number</th>
                          <th scope="col" className="px-6 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Admission Number</th>
                          <th scope="col" className="px-6 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Admit Date</th>
                          <th scope="col" className="px-6 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joining Date</th>
                          <th scope="col" className="px-6 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Left Date</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {students.map(student => (
                          <tr key={student._id} className="hover:bg-gray-50 cursor-pointer" onClick={() => openStudentDetailsModal(student)}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">{student.name}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.rollNumber || '—'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.admissionNumber || '—'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">{formatStayDate(student.admitDate)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 font-medium">{formatStayDate(student.joiningDate)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-red-500 font-medium">{formatStayDate(student.leftDate)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Pagination */}
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

  if (loading && (tab === 'list' || tab === 'dates') && !tableLoading) {
    return <div className="p-4 sm:p-6 max-w-[1400px] mx-auto mt-16 sm:mt-0"><LoadingSpinner size="lg" /></div>;
  }

  return (
    <div className="mx-auto mt-16 sm:mt-0">
      {/* Enhanced Tab Navigation */}
      <div className="mb-6 sm:mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-1 sm:p-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
            <div className="flex flex-wrap gap-1 sm:gap-2 justify-center sm:justify-start flex-1">
            {TABS.map(t => {
              if (t.superAdminOnly && !isSuperAdmin) {
                return null; // Hide super admin only tabs
              }

              return (
                <button
                  key={t.value}
                  className={`flex items-center justify-center space-x-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg transition-all duration-300 text-xs sm:text-sm font-medium relative overflow-hidden group ${tab === t.value
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
                  <div className={`relative z-10 flex items-center space-x-2 ${tab === t.value ? 'text-white' : 'text-gray-600 group-hover:text-blue-600'
                    }`}>
                    <div className={`transition-all duration-300 ${tab === t.value
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
            {(tab === 'list' || tab === 'dates') && (
              <div className="flex flex-wrap items-center gap-3 shrink-0 px-1 sm:px-2">
                {/* Live / AY-Wise Toggle */}
                {tab === 'list' && (
                  <div className="flex bg-gray-100 rounded-lg p-0.5 border border-gray-200 shadow-inner">
                    <button
                      type="button"
                      onClick={() => {
                        setIsLiveMode(false);
                        setFilters(prev => ({
                          ...prev,
                          academicYear: getDefaultAcademicYear(),
                          hostelStatus: 'active'
                        }));
                        setCurrentPage(1);
                      }}
                      className={`px-3 py-1 sm:py-1.5 text-xs font-semibold rounded-md transition-all duration-200 ${
                        !isLiveMode
                          ? 'bg-white text-blue-600 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      AY-Wise
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsLiveMode(true);
                        setFilters(prev => ({
                          ...prev,
                          academicYear: '',
                          hostelStatus: 'active'
                        }));
                        setCurrentPage(1);
                      }}
                      className={`px-3 py-1 sm:py-1.5 text-xs font-semibold rounded-md transition-all duration-200 ${
                        isLiveMode
                          ? 'bg-white text-blue-600 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Live
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <label htmlFor="students-academic-year" className="text-xs sm:text-sm text-gray-600 whitespace-nowrap">
                    Academic Year
                  </label>
                  <select
                    id="students-academic-year"
                    name="academicYear"
                    disabled={tab === 'list' && isLiveMode}
                    value={tab === 'list' && isLiveMode ? "" : filters.academicYear}
                    onChange={handleFilterChange}
                    className="min-w-[140px] px-3 py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                  >
                    <option value="">All Years</option>
                    {generateAcademicYears().map((year) => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {tab === 'list' && renderStudentList()}
      {tab === 'dates' && renderDatesTab()}
      {tab === 'room-changes' && <RoomChangesPanel mode="admin" />}
      {tab === 'category-changes' && <CategoryChangesPanel mode="admin" />}
      {editModal && renderEditModal()}
      {photoEditModal && renderPhotoEditModal()}
      {studentDetailsModal && renderStudentDetailsModal()}
      {passwordResetModal && renderPasswordResetModal()}
      {renderCameraModal()}
      {renderConcessionRequestModal()}

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
                    <span className="font-medium">{getCategoryDisplay(selectedRoom.category)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Beds:</span>
                    <span className="font-medium">{selectedRoom.bedCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Students:</span>
                    <span className="font-medium">{selectedRoom.studentCount || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Staff:</span>
                    <span className="font-medium">{selectedRoom.staffCount || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Occupied:</span>
                    <span className="font-medium">{selectedRoom.totalOccupancy || (selectedRoom.studentCount || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Available Beds:</span>
                    <span className="font-medium text-green-600">{selectedRoom.availableBeds || (selectedRoom.bedCount - (selectedRoom.studentCount || 0))}</span>
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

            {/* Staff Members List */}
            {roomStaff && roomStaff.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <UserIcon className="w-5 h-5 mr-2 text-purple-600" />
                  Staff Members in Room ({roomStaff.length})
                </h3>
                <div className="space-y-4">
                  {roomStaff.map((staff) => (
                    <div
                      key={staff._id}
                      className="bg-purple-50 border border-purple-200 rounded-lg p-4 flex items-start gap-4"
                    >
                      <div className="bg-purple-100 p-2 rounded-lg">
                        <UserIcon className="w-6 h-6 text-purple-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{staff.name}</h3>
                        <div className="mt-2 space-y-1 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Profession:</span>
                            <span>{staff.profession}</span>
                          </div>
                          {staff.department && (
                            <div className="flex items-center gap-2">
                              <span className="font-medium">Department:</span>
                              <span>{staff.department}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <PhoneIcon className="w-4 h-4" />
                            <span>Phone: {staff.phoneNumber}</span>
                          </div>
                          {staff.bedNumber && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                                Bed: {staff.bedNumber}
                              </span>
                            </div>
                          )}
                          {staff.stayType && (
                            <div className="flex items-center gap-2 mt-2">
                              <span className={`text-xs px-2 py-1 rounded ${staff.stayType === 'monthly'
                                ? 'bg-indigo-100 text-indigo-800'
                                : 'bg-blue-100 text-blue-800'
                                }`}>
                                {staff.stayType === 'monthly'
                                  ? `Monthly Basis${staff.selectedMonth ? ` (${new Date(staff.selectedMonth + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })})` : ''}`
                                  : 'Daily Basis'}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Students List */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <AcademicCapIcon className="w-5 h-5 mr-2 text-blue-600" />
                Students in Room ({roomStudents?.length || 0})
              </h3>
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
                              {getCourseDisplay(student.course)} - {getBranchDisplay(student.branch)}
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
      {/* Hidden container and iframe for silent printing */}
      <div id="printable-area" style={{ display: 'none' }}>
        <PrintableLiveStudents
          students={printStudents}
          isLiveMode={isLiveMode}
          academicYear={filters.academicYear}
        />
      </div>
      <div id="printable-area-dates" style={{ display: 'none' }}>
        <PrintableStudentDates
          students={printDatesStudents}
          filters={filters}
          hostels={hostels}
        />
      </div>
      <iframe
        id="print-iframe"
        style={{ display: 'none', width: 0, height: 0, border: 'none' }}
        title="Print Frame"
      />
    </div>
  );
};

export default Students;
