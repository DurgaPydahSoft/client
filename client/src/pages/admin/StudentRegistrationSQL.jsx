import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/axios';
import toast from 'react-hot-toast';
import { ArrowLeftIcon, MagnifyingGlassIcon, CheckCircleIcon, XCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import LoadingSpinner from '../../components/LoadingSpinner';
import { useAuth } from '../../context/AuthContext';
import { canPerformAction } from '../../utils/permissionUtils';

const getDefaultAcademicYear = () => {
  const year = new Date().getFullYear();
  return `${year}-${year + 1}`;
};

const initialForm = {
  name: '',
  rollNumber: '',
  admissionNumber: '',
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
  concession: 0,
  hostel: '',
  hostelCategory: '',
  college: null,
  admitDate: new Date().toISOString().split('T')[0],
  joiningDate: new Date().toISOString().split('T')[0],
  leftDate: ''
};

const inputClass =
  'w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500';
const labelClass = 'block text-xs font-medium text-gray-600 mb-0.5';
const readOnlyInputClass =
  'w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md bg-gray-100 text-gray-700 cursor-not-allowed';
const readOnlySelectClass =
  'w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md bg-gray-100 text-gray-700 cursor-not-allowed';

const normalizeGenderFromSql = (value) => {
  if (!value) return '';
  const normalized = value.toString().trim().toUpperCase();
  if (['M', 'MALE', 'BOY'].includes(normalized)) return 'Male';
  if (['F', 'FEMALE', 'GIRL'].includes(normalized)) return 'Female';
  return '';
};

const StudentRegistrationSQL = () => {
  const normalizeText = (val) => (val || '').toString().trim().toUpperCase();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isSuperAdmin = user?.role === 'super_admin';
  const canAddStudent = isSuperAdmin || canPerformAction(user, 'student_management', 'create');

  const [form, setForm] = useState(initialForm);
  const [identifier, setIdentifier] = useState(''); // PIN or Admission Number
  const [identifierType, setIdentifierType] = useState('pin'); // 'pin' or 'admission'
  const [fetchingFromSQL, setFetchingFromSQL] = useState(false);
  const [sqlFetchError, setSqlFetchError] = useState(null);
  const [sqlDataFetched, setSqlDataFetched] = useState(false);
  const [existingRequestInfo, setExistingRequestInfo] = useState(null);
  const [adding, setAdding] = useState(false);

  // Photo states
  const [studentPhoto, setStudentPhoto] = useState(null);
  const [guardianPhoto1, setGuardianPhoto1] = useState(null);
  const [guardianPhoto2, setGuardianPhoto2] = useState(null);
  const [studentPhotoPreview, setStudentPhotoPreview] = useState(null);
  const [guardianPhoto1Preview, setGuardianPhoto1Preview] = useState(null);
  const [guardianPhoto2Preview, setGuardianPhoto2Preview] = useState(null);

  // Dynamic data
  const [courses, setCourses] = useState([]);
  const [branches, setBranches] = useState([]);
  const [colleges, setColleges] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [loadingColleges, setLoadingColleges] = useState(false);
  // Derived helpers
  const getCourseNameById = (id) => {
    if (!id) return '';
    const match = courses.find(c => c._id === id);
    return match?.name || id;
  };
  const getBranchNameById = (id) => {
    if (!id) return '';
    const match = branches.find(b => b._id === id);
    if (match) return match.name;
    // When branch options come from SQL, try name matching on branchOptions too
    const optMatch = branchOptions.find(b => b._id === id || normalizeText(b.name) === normalizeText(id));
    return optMatch?.name || id;
  };
  const getHostelCategoryNameById = (id) => {
    if (!id) return '';
    const match = hostelCategories.find(c => c._id === id);
    return match?.name || id;
  };

  // Deduplicate branches by name (case-insensitive)
  const branchOptions = useMemo(() => {
    const seen = new Set();
    return branches.filter(b => {
      const key = b?.name ? normalizeText(b.name) : (b?._id || '');
      if (!key) return false;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [branches]);

  // Room availability
  const [roomsWithAvailability, setRoomsWithAvailability] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [bedLockerAvailability, setBedLockerAvailability] = useState(null);
  const [loadingBedLocker, setLoadingBedLocker] = useState(false);

  // Hostel hierarchy
  const [hostels, setHostels] = useState([]);
  const [hostelCategories, setHostelCategories] = useState([]);
  const [loadingHostels, setLoadingHostels] = useState(false);
  const [loadingHostelCategories, setLoadingHostelCategories] = useState(false);

  // Fee structure
  const [feeStructure, setFeeStructure] = useState(null);
  const [loadingFeeStructure, setLoadingFeeStructure] = useState(false);
  const [calculatedFees, setCalculatedFees] = useState({
    term1: 0,
    term2: 0,
    term3: 0,
    total: 0
  });

  // Fetch courses, colleges & hostels on mount
  useEffect(() => {
    const raw = sessionStorage.getItem('preregistrationData');
    if (!raw) return;
    try {
      const data = JSON.parse(raw);
      sessionStorage.removeItem('preregistrationData');
      setForm(prev => ({
        ...prev,
        name: data.name || prev.name,
        rollNumber: data.rollNumber || prev.rollNumber,
        gender: normalizeGenderFromSql(data.gender) || prev.gender,
        course: data.course || prev.course,
        year: data.year || prev.year,
        branch: data.branch || prev.branch,
        batch: data.batch || prev.batch,
        academicYear: data.academicYear || prev.academicYear,
        studentPhone: data.studentPhone || prev.studentPhone,
        parentPhone: data.parentPhone || prev.parentPhone,
        motherName: data.motherName || prev.motherName,
        motherPhone: data.motherPhone || prev.motherPhone,
        localGuardianName: data.localGuardianName || prev.localGuardianName,
        localGuardianPhone: data.localGuardianPhone || prev.localGuardianPhone,
        email: data.email || prev.email,
        mealType: data.mealType || prev.mealType,
        concession: data.concession ?? prev.concession
      }));
      if (data.rollNumber) {
        setIdentifier(data.rollNumber);
        setIdentifierType('pin');
      }
      if (data.studentPhoto) setStudentPhotoPreview(data.studentPhoto);
      if (data.guardianPhoto1) setGuardianPhoto1Preview(data.guardianPhoto1);
      if (data.guardianPhoto2) setGuardianPhoto2Preview(data.guardianPhoto2);
      toast.success('Pre-registration data loaded. Fetch from SQL to validate and complete registration.');
    } catch (err) {
      console.error('Failed to parse preregistrationData:', err);
    }
  }, []);

  // Fetch courses, colleges & hostels on mount
  useEffect(() => {
    fetchCourses();
    fetchColleges();
    fetchHostels();
  }, []);

  // Fetch hostels
  const fetchHostels = async () => {
    setLoadingHostels(true);
    try {
      const res = await api.get('/api/hostels');
      if (res.data.success) {
        setHostels(res.data.data || []);
      }
    } catch (err) {
      console.error('Error fetching hostels:', err);
      toast.error('Error fetching hostels');
    } finally {
      setLoadingHostels(false);
    }
  };

  // Fetch categories for a hostel
  const fetchHostelCategories = async (hostelId) => {
    if (!hostelId) {
      setHostelCategories([]);
      return [];
    }
    setLoadingHostelCategories(true);
    try {
      const res = await api.get(`/api/hostels/${hostelId}/categories`);
      if (res.data.success) {
        const data = res.data.data || [];
        setHostelCategories(data);
        return data;
      }
    } catch (err) {
      console.error('Error fetching hostel categories:', err);
      toast.error('Error fetching hostel categories');
    } finally {
      setLoadingHostelCategories(false);
    }
    return [];
  };

  // Fetch courses
  const fetchCourses = async () => {
    setLoadingCourses(true);
    try {
      const res = await api.get('/api/course-management/courses');
      if (res.data.success) {
        setCourses(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching courses:', err);
      toast.error('Error fetching courses');
    } finally {
      setLoadingCourses(false);
    }
  };

  // Fetch colleges
  const fetchColleges = async () => {
    setLoadingColleges(true);
    try {
      const res = await api.get('/api/admin/sql/colleges');
      if (res.data.success) {
        setColleges(res.data.data || []);
      }
    } catch (err) {
      console.error('Error fetching colleges:', err);
    } finally {
      setLoadingColleges(false);
    }
  };

  // Fetch branches for course
  const fetchBranches = async (courseId) => {
    if (!courseId) {
      setBranches([]);
      return;
    }
    setLoadingBranches(true);
    try {
      const res = await api.get(`/api/course-management/branches/${courseId}`);
      if (res.data.success) {
        setBranches(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching branches:', err);
      toast.error('Error fetching branches');
    } finally {
      setLoadingBranches(false);
    }
  };

  // Fetch rooms with availability (filtered by academic year)
  const fetchRoomsWithAvailability = async (hostelId, categoryIdOrName, academicYear) => {
    if (!hostelId || !categoryIdOrName) {
      setRoomsWithAvailability([]);
      return;
    }
    setLoadingRooms(true);
    try {
      let finalCategoryId = categoryIdOrName;
      if (!/^[0-9a-fA-F]{24}$/.test(finalCategoryId)) {
        const list = hostelCategories.length ? hostelCategories : await fetchHostelCategories(hostelId);
        const match = list.find(c => c._id === categoryIdOrName || (c.name || '').toLowerCase() === (categoryIdOrName || '').toLowerCase());
        if (match) finalCategoryId = match._id;
      }
      const params = new URLSearchParams({
        hostel: hostelId,
        category: finalCategoryId,
        academicYear: academicYear || getDefaultAcademicYear()
      });
      const res = await api.get(`/api/admin/rooms/bed-availability?${params.toString()}`);
      if (res.data.success) {
        setRoomsWithAvailability(res.data.data.rooms || []);
      }
    } catch (err) {
      console.error('Error fetching rooms:', err);
      toast.error('Error fetching room availability');
    } finally {
      setLoadingRooms(false);
    }
  };

  // Fetch bed/locker availability for selected academic year
  const fetchBedLockerAvailability = async (roomNumber, academicYear, hostelId, categoryId) => {
    if (!roomNumber) return;
    setLoadingBedLocker(true);
    try {
      const params = new URLSearchParams({
        academicYear: academicYear || getDefaultAcademicYear()
      });
      if (hostelId) params.set('hostel', hostelId);
      if (categoryId) params.set('category', categoryId);
      const query = params.toString();
      const url = `/api/admin/rooms/${roomNumber}/bed-locker-availability${query ? `?${query}` : ''}`;
      const res = await api.get(url);
      if (res.data.success) {
        setBedLockerAvailability(res.data.data);
        // Auto-select first available bed and locker
        if (res.data.data.availableBeds?.length > 0) {
          setForm(prev => ({ ...prev, bedNumber: res.data.data.availableBeds[0].value }));
        }
        if (res.data.data.availableLockers?.length > 0) {
          setForm(prev => ({ ...prev, lockerNumber: res.data.data.availableLockers[0].value }));
        }
      }
    } catch (err) {
      console.error('Error fetching bed/locker availability:', err);
    } finally {
      setLoadingBedLocker(false);
    }
  };

  // Fetch fee structure
  const fetchFeeStructure = async (courseIdOrName, branchIdOrName, year, categoryName, academicYear, studentId = '') => {
    const courseName = getCourseNameById(courseIdOrName);
    const branchName = getBranchNameById(branchIdOrName);
    if (!courseName || !branchName || !year || !categoryName || !academicYear) {
      setFeeStructure(null);
      return;
    }
    setLoadingFeeStructure(true);
    try {
      const id = studentId || form.rollNumber || form.admissionNumber;
      const url = `/api/fee-structures/admit-card/${academicYear}/${encodeURIComponent(courseName)}/${encodeURIComponent(branchName)}/${year}/${encodeURIComponent(categoryName)}${id ? `?identifier=${encodeURIComponent(id)}` : ''}`;
      const res = await api.get(url);
      if (res.data.success) {
        const feeData = res.data.data;
        if (feeData.found === false && !feeData.isRevisedFee) {
          setFeeStructure(null);
          setCalculatedFees({ term1: 0, term2: 0, term3: 0, total: 0 });
          return;
        }
        setFeeStructure(feeData);
        const term1 = feeData.term1Fee || 0;
        const term2 = feeData.term2Fee || 0;
        const term3 = feeData.term3Fee || 0;
        setCalculatedFees({
          term1,
          term2,
          term3,
          total: term1 + term2 + term3
        });
      }
    } catch (err) {
      console.error('Error fetching fee structure:', err);
      setFeeStructure(null);
      setCalculatedFees({ term1: 0, term2: 0, term3: 0, total: 0 });
    } finally {
      setLoadingFeeStructure(false);
    }
  };

  // Fetch student from SQL database
  const fetchStudentFromSQL = async () => {
    if (!identifier.trim()) {
      toast.error('Please enter PIN Number or Admission Number');
      return;
    }

    setFetchingFromSQL(true);
    setSqlFetchError(null);
    setSqlDataFetched(false);
    setExistingRequestInfo(null);

    try {
      const res = await api.get(`/api/admin/students/fetch-from-sql/${identifier}`);

      if (res.data.success) {
        const sqlData = res.data.data;

        const batchYear = normalizeBatchToYear(sqlData.batch || '');
        const yearOfStudy = sqlData.year || 1;
        const resolvedAcademicYear = resolveAcademicYearFromBatchAndYear(batchYear, yearOfStudy);

        // Map SQL data to form
        const mappedForm = {
          name: sqlData.name || '',
          rollNumber: sqlData.rollNumber || identifier,
          admissionNumber: sqlData.admissionNumber || identifier,
          gender: normalizeGenderFromSql(sqlData.gender) || '',
          course: sqlData.courseId || '',
          branch: sqlData.branchId || '',
          year: yearOfStudy,
          batch: batchYear,
          studentPhone: sqlData.studentPhone || '',
          parentPhone: sqlData.parentPhone || '',
          motherPhone: sqlData.motherPhone || '',
          motherName: sqlData.fatherName || '', // Using fatherName as fallback
          email: sqlData.email || '',
          // Keep existing values for fields not in SQL
          category: form.category,
          mealType: form.mealType,
          parentPermissionForOuting: form.parentPermissionForOuting,
          roomNumber: form.roomNumber,
          bedNumber: form.bedNumber,
          lockerNumber: form.lockerNumber,
          localGuardianName: form.localGuardianName,
          localGuardianPhone: form.localGuardianPhone,
          academicYear: resolvedAcademicYear || form.academicYear,
          concession: form.concession,
          hostel: form.hostel,
          hostelCategory: form.hostelCategory,
          college: sqlData.college || null
        };

        // If SQL provided a college that we don't have in our list, add it to avoid blank selection
        if (sqlData.college && !colleges.find(c => c.id === sqlData.college.id)) {
          setColleges(prev => [...prev, sqlData.college]);
        }

        setForm(mappedForm);
        setSqlDataFetched(true);

        // Handle student photo from SQL
        if (sqlData.studentPhoto) {
          // If it's a data URL or base64, set as preview
          if (sqlData.studentPhoto.startsWith('data:image') || sqlData.studentPhoto.startsWith('http')) {
            setStudentPhotoPreview(sqlData.studentPhoto);
          } else {
            // Try to construct data URL if it's base64
            setStudentPhotoPreview(`data:image/jpeg;base64,${sqlData.studentPhoto}`);
          }
        }

        // Fetch branches if course is set
        if (mappedForm.course) {
          await fetchBranches(mappedForm.course);
        }

        // Check if student already has an existing request in HMS
        if (sqlData.hasExistingRequest) {
          setExistingRequestInfo(sqlData.existingRequest);
          toast.error('Request for this student already exist', { duration: 6000 });
        } else {
          setExistingRequestInfo(null);
        }

        // Show warnings if course/branch matching had issues
        if (sqlData.courseMatchError) {
          toast.error(sqlData.courseMatchError, { duration: 5000 });
        }

        toast.success('Student data fetched successfully from SQL database');
      } else {
        throw new Error(res.data.message || 'Failed to fetch student data');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch student from SQL database';
      setSqlFetchError(errorMessage);
      toast.error(errorMessage);
      setSqlDataFetched(false);
    } finally {
      setFetchingFromSQL(false);
    }
  };

  // Handle form changes
  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    const fieldValue = type === 'checkbox' ? checked : value;

    setForm(prev => {
      const newForm = { ...prev, [name]: fieldValue };

      // Reset dependent fields
      if (name === 'course') {
        newForm.branch = '';
        fetchBranches(value);
      }
      if (name === 'gender') {
        newForm.category = '';
      }
      if (name === 'academicYear') {
        newForm.roomNumber = '';
        newForm.bedNumber = '';
        newForm.lockerNumber = '';
        setBedLockerAvailability(null);
      }
      if (name === 'hostel') {
        newForm.hostelCategory = '';
        newForm.roomNumber = '';
        newForm.bedNumber = '';
        newForm.lockerNumber = '';
        fetchHostelCategories(fieldValue);
      }
      if (name === 'hostelCategory') {
        newForm.roomNumber = '';
        newForm.bedNumber = '';
        newForm.lockerNumber = '';
        // set category string from selected hostel category for fee calc
        newForm.category = getHostelCategoryNameById(fieldValue);
        if (newForm.hostel && fieldValue) {
          fetchRoomsWithAvailability(newForm.hostel, fieldValue, newForm.academicYear);
        }
      }
      if (name === 'roomNumber') {
        newForm.bedNumber = '';
        newForm.lockerNumber = '';
        if (value) {
          fetchBedLockerAvailability(value, newForm.academicYear, newForm.hostel, newForm.hostelCategory);
        }
      }

      return newForm;
    });

    // Fetch fee structure when relevant fields change
    if (['course', 'year', 'category', 'academicYear', 'branch', 'hostelCategory'].includes(name)) {
      const updatedForm = { ...form, [name]: fieldValue };
      if (updatedForm.course && updatedForm.year && updatedForm.category && updatedForm.academicYear && updatedForm.branch) {
        fetchFeeStructure(
          updatedForm.course,
          updatedForm.branch,
          updatedForm.year,
          updatedForm.category,
          updatedForm.academicYear,
          updatedForm.rollNumber || updatedForm.admissionNumber
        );
      }
    }
  };

  // Handle photo changes
  const handlePhotoChange = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Photo size should be less than 10MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      if (type === 'student') {
        setStudentPhoto(file);
        setStudentPhotoPreview(reader.result);
      } else if (type === 'guardian1') {
        setGuardianPhoto1(file);
        setGuardianPhoto1Preview(reader.result);
      } else if (type === 'guardian2') {
        setGuardianPhoto2(file);
        setGuardianPhoto2Preview(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Generate academic years
  const generateAcademicYears = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = -3; i <= 3; i++) {
      const year = currentYear + i;
      years.push(`${year}-${year + 1}`);
    }
    return years;
  };

  // Get course duration
  const getCourseDuration = (courseId) => {
    const course = courses.find(c => c._id === courseId);
    return course ? course.duration : 4;
  };

  // Batch = admission start year (matches SQL)
  const normalizeBatchToYear = (batch) => {
    if (!batch) return '';
    const trimmed = String(batch).trim();
    if (/^\d{4}$/.test(trimmed)) return trimmed;
    if (/^\d{4}-\d{4}$/.test(trimmed)) return trimmed.split('-')[0];
    return trimmed;
  };

  const resolveAcademicYearFromBatchAndYear = (batch, yearOfStudy) => {
    const batchStart = parseInt(normalizeBatchToYear(batch), 10);
    const year = Number(yearOfStudy);
    if (!batchStart || Number.isNaN(batchStart) || !Number.isFinite(year) || year < 1) return '';
    return `${batchStart + year - 1}-${batchStart + year}`;
  };

  const expectedAcademicYear = useMemo(
    () => resolveAcademicYearFromBatchAndYear(form.batch, form.year),
    [form.batch, form.year]
  );

  const academicYearOptions = useMemo(() => {
    const years = generateAcademicYears();
    if (expectedAcademicYear && !years.includes(expectedAcademicYear)) {
      return [expectedAcademicYear, ...years];
    }
    return years;
  }, [expectedAcademicYear]);

  const academicYearError = useMemo(() => {
    if (!sqlDataFetched || !expectedAcademicYear || !form.academicYear) return '';
    if (form.academicYear !== expectedAcademicYear) {
      return `For batch ${normalizeBatchToYear(form.batch)}, year ${form.year}, academic year must be ${expectedAcademicYear}.`;
    }
    return '';
  }, [sqlDataFetched, form.batch, form.year, form.academicYear, expectedAcademicYear]);

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

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!canAddStudent) {
      toast.error('You do not have permission to add students');
      return;
    }

    if (!sqlDataFetched) {
      toast.error('Please fetch student data from SQL database first');
      return;
    }

    if (!studentPhotoPreview) {
      toast.error('Student photo not found in SDMS. Please verify the student record in the central database.');
      return;
    }

    if (academicYearError) {
      toast.error(academicYearError);
      return;
    }

    if (!feeStructure) {
      toast.error(
        `No fee structure found for ${getCourseNameById(form.course) || 'selected course'}, ${getBranchNameById(form.branch) || 'selected branch'}, year ${form.year}, category ${form.category}, academic year ${form.academicYear}. Please add the fee structure in Fee Management before registering.`
      );
      return;
    }

    setAdding(true);
    try {
      const formData = new FormData();
      Object.keys(form).forEach(key => {
        if (key === 'college' && form[key] && typeof form[key] === 'object') {
          formData.append(key, JSON.stringify(form[key]));
        } else if (form[key] !== null && form[key] !== undefined && form[key] !== '') {
          formData.append(key, form[key]);
        }
      });

      if (guardianPhoto1) {
        formData.append('guardianPhoto1', guardianPhoto1);
      } else if (guardianPhoto1Preview) {
        formData.append('guardianPhoto1Url', guardianPhoto1Preview);
      }
      if (guardianPhoto2) {
        formData.append('guardianPhoto2', guardianPhoto2);
      } else if (guardianPhoto2Preview) {
        formData.append('guardianPhoto2Url', guardianPhoto2Preview);
      }

      const res = await api.post('/api/admin/students', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data.success) {
        const {
          isRenewal,
          message,
          hostelSequenceId
        } = res.data.data || {};
        const seqNote = hostelSequenceId ? ` Sequence: ${hostelSequenceId}` : '';
        if (isRenewal) {
          toast.success(
            (message || 'Student registered for the academic year.') + seqNote
          );
        } else {
          toast.success('Student registered successfully. Login uses student database credentials.' + seqNote);
        }
        // Reset form
        setForm(initialForm);
        setIdentifier('');
        setSqlDataFetched(false);
        setExistingRequestInfo(null);
        setStudentPhoto(null);
        setGuardianPhoto1(null);
        setGuardianPhoto2(null);
        setStudentPhotoPreview(null);
        setGuardianPhoto1Preview(null);
        setGuardianPhoto2Preview(null);
        // Stay on the same page; do not navigate away
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to register student');
    } finally {
      setAdding(false);
    }
  };

  // Fetch rooms when hostel, category, or academic year changes
  useEffect(() => {
    if (form.hostel && form.hostelCategory && form.academicYear) {
      fetchRoomsWithAvailability(form.hostel, form.hostelCategory, form.academicYear);
    } else {
      setRoomsWithAvailability([]);
    }
  }, [form.hostel, form.hostelCategory, form.academicYear]);

  // Fetch fee structure when relevant fields change (derived values)
  useEffect(() => {
    if (form.course && form.branch && form.year && form.category && form.academicYear) {
      fetchFeeStructure(
        form.course,
        form.branch,
        form.year,
        form.category,
        form.academicYear,
        form.rollNumber || form.admissionNumber
      );
    } else {
      setFeeStructure(null);
    }
  }, [form.course, form.branch, form.year, form.category, form.academicYear, form.rollNumber, form.admissionNumber]);

  if (!canAddStudent) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">You do not have permission to add students.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4">
      <div className="mb-3">
        <h1 className="text-xl font-bold text-gray-900">Student Registration from SQL Database</h1>
        <p className="text-sm text-gray-600">Fetch student details from central database and complete registration</p>
      </div>

      <div className="bg-white rounded-xl shadow-md p-4">
        {/* SQL Fetch Section */}
        <div className="bg-blue-50 rounded-lg p-3 mb-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex items-center gap-4 text-sm">
              <span className="font-semibold text-gray-900">Step 1: Fetch from SQL</span>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="pin"
                  checked={identifierType === 'pin'}
                  onChange={(e) => setIdentifierType(e.target.value)}
                  className="mr-1.5"
                />
                PIN
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="admission"
                  checked={identifierType === 'admission'}
                  onChange={(e) => setIdentifierType(e.target.value)}
                  className="mr-1.5"
                />
                Admission No.
              </label>
            </div>
            <div className="flex-1 min-w-[220px]">
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (!fetchingFromSQL && identifier.trim()) {
                      fetchStudentFromSQL();
                    }
                  }
                }}
                placeholder={identifierType === 'pin' ? 'Enter PIN Number' : 'Enter Admission Number'}
                className={inputClass}
                disabled={fetchingFromSQL}
              />
            </div>
            <button
              onClick={fetchStudentFromSQL}
              disabled={fetchingFromSQL || !identifier.trim()}
              className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {fetchingFromSQL ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Fetching...
                </>
              ) : (
                <>
                  <MagnifyingGlassIcon className="w-4 h-4" />
                  Fetch Details
                </>
              )}
            </button>
          </div>

          {sqlFetchError && (
            <div className="mt-2 bg-red-50 border border-red-200 rounded-md px-3 py-1.5 flex items-center">
              <XCircleIcon className="w-4 h-4 text-red-600 mr-2 shrink-0" />
              <p className="text-sm text-red-800">{sqlFetchError}</p>
            </div>
          )}

          {sqlDataFetched && (
            <div className="mt-2 bg-green-50 border border-green-200 rounded-md px-3 py-1.5 flex items-center">
              <CheckCircleIcon className="w-4 h-4 text-green-600 mr-2 shrink-0" />
              <p className="text-sm text-green-800">Student data fetched successfully. Complete the form below.</p>
            </div>
          )}

          {existingRequestInfo && (
            <div className="mt-2.5 bg-amber-50 border-l-4 border-amber-500 rounded-r-md p-3 shadow-sm flex items-start">
              <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 mr-2.5 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-amber-900">Request for this student already exist</p>
                <p className="text-xs text-amber-800 mt-0.5">
                  An active hostel request/registration already exists for this student (Academic Year: <strong>{existingRequestInfo.academicYear}</strong>, Status: <strong>{existingRequestInfo.status}</strong>{existingRequestInfo.roomNumber && existingRequestInfo.roomNumber !== 'N/A' ? `, Room: ${existingRequestInfo.roomNumber}` : ''}).
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Personal Information — from SQL, read-only */}
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-baseline gap-2 mb-2">
              <h3 className="text-sm font-semibold text-gray-900">Personal Information</h3>
              <span className="text-[11px] text-gray-500">Fetched from SQL — not editable</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-3 gap-y-2">
              <div>
                <label className={labelClass}>Full Name *</label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  readOnly
                  required
                  className={readOnlyInputClass}
                />
              </div>
              <div>
                <label className={labelClass}>PIN Number *</label>
                <input
                  type="text"
                  name="rollNumber"
                  value={form.rollNumber}
                  readOnly
                  required
                  className={`${readOnlyInputClass} uppercase`}
                />
              </div>
              <div>
                <label className={labelClass}>Admission Number *</label>
                <input
                  type="text"
                  name="admissionNumber"
                  value={form.admissionNumber}
                  readOnly
                  required
                  className={`${readOnlyInputClass} uppercase`}
                />
              </div>
              <div>
                <label className={labelClass}>
                  Gender{form.gender ? '' : ' (optional)'}
                </label>
                <select
                  name="gender"
                  value={form.gender}
                  onChange={handleFormChange}
                  disabled={sqlDataFetched && Boolean(form.gender)}
                  className={sqlDataFetched && form.gender ? readOnlySelectClass : inputClass}
                >
                  <option value="">Not specified</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>
            </div>
          </div>

          {/* Academic Information — from SQL, read-only */}
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-baseline gap-2 mb-2">
              <h3 className="text-sm font-semibold text-gray-900">Academic Information</h3>
              <span className="text-[11px] text-gray-500">Fetched from SQL — not editable</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-x-3 gap-y-2">
              <div>
                <label className={labelClass}>College *</label>
                <select
                  name="college"
                  value={form.college ? form.college.id : ''}
                  disabled
                  required
                  className={readOnlySelectClass}
                >
                  <option value="">{loadingColleges ? 'Loading...' : 'Select College'}</option>
                  {colleges.map(college => (
                    <option key={college.id} value={college.id}>{college.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Course *</label>
                <select
                  name="course"
                  value={form.course}
                  disabled
                  required
                  className={readOnlySelectClass}
                >
                  <option value="">{loadingCourses ? 'Loading...' : 'Select Course'}</option>
                  {courses.map(course => (
                    <option key={course._id} value={course._id}>{course.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Year *</label>
                <select
                  name="year"
                  value={form.year}
                  disabled
                  required
                  className={readOnlySelectClass}
                >
                  <option value="">Select Year</option>
                  {form.course && Array.from({ length: getCourseDuration(form.course) }, (_, i) => i + 1).map(year => (
                    <option key={year} value={year}>Year {year}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Branch *</label>
                <select
                  name="branch"
                  value={form.branch}
                  disabled
                  required
                  className={readOnlySelectClass}
                >
                  <option value="">{loadingBranches ? 'Loading...' : 'Select Branch'}</option>
                  {branchOptions.map(branch => (
                    <option key={branch._id} value={branch._id}>{branch.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Batch *</label>
                <select
                  name="batch"
                  value={form.batch}
                  disabled
                  required
                  className={readOnlySelectClass}
                >
                  <option value="">Select Batch Year</option>
                  {getBatchYearOptions(form.batch).map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Hostel Information */}
          <div className="bg-gray-50 rounded-lg p-3">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Hostel Information</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-3 gap-y-2">
              <div>
                <label className={labelClass}>Academic Year *</label>
                <select
                  name="academicYear"
                  value={form.academicYear}
                  onChange={handleFormChange}
                  required
                  className={`w-full px-2.5 py-1.5 text-sm border rounded-md focus:ring-2 focus:ring-blue-500 ${
                    academicYearError ? 'border-red-500 focus:ring-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select Academic Year</option>
                  {academicYearOptions.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
                {sqlDataFetched && expectedAcademicYear && !academicYearError && (
                  <p className="text-xs text-green-700 mt-1">
                    Expected for batch {normalizeBatchToYear(form.batch)}, year {form.year}: {expectedAcademicYear}
                  </p>
                )}
                {academicYearError && (
                  <p className="text-xs text-red-600 mt-1">{academicYearError}</p>
                )}
              </div>

              <div>
                <label className={labelClass}>Admit Date *</label>
                <input
                  type="date"
                  name="admitDate"
                  value={form.admitDate}
                  onChange={handleFormChange}
                  required
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Joining Date *</label>
                <input
                  type="date"
                  name="joiningDate"
                  value={form.joiningDate}
                  onChange={handleFormChange}
                  required
                  className={inputClass}
                />
                <p className="text-[11px] text-gray-500 mt-0.5">Attendance opens from joining date</p>
              </div>

              {/* Left Date field hidden for now */}
              <div className="hidden">
                <label className={labelClass}>Left Date</label>
                <input
                  type="date"
                  name="leftDate"
                  value={form.leftDate}
                  onChange={handleFormChange}
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Hostel *</label>
                <select
                  name="hostel"
                  value={form.hostel}
                  onChange={handleFormChange}
                  required
                  className={inputClass}
                  disabled={loadingHostels}
                >
                  <option value="">{loadingHostels ? 'Loading...' : 'Select Hostel'}</option>
                  {hostels.map(h => (
                    <option key={h._id} value={h._id}>{h.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Hostel Category *</label>
                <select
                  name="hostelCategory"
                  value={form.hostelCategory}
                  onChange={handleFormChange}
                  required
                  disabled={!form.hostel || loadingHostelCategories}
                  className={inputClass}
                >
                  <option value="">{loadingHostelCategories ? 'Loading...' : 'Select Category'}</option>
                  {hostelCategories.map(cat => (
                    <option key={cat._id} value={cat._id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Room Number *</label>
                <select
                  name="roomNumber"
                  value={form.roomNumber}
                  onChange={handleFormChange}
                  required
                  disabled={!form.hostel || !form.hostelCategory || loadingRooms}
                  className={inputClass}
                >
                  <option value="">{loadingRooms ? 'Loading rooms...' : 'Select Room'}</option>
                  {roomsWithAvailability.map(room => (
                    <option
                      key={room._id}
                      value={room.roomNumber}
                      disabled={room.availableBeds <= 0}
                    >
                      Room {room.roomNumber} ({room.studentCount}/{room.bedCount} students
                      {form.academicYear ? ` · ${form.academicYear}` : ''}
                      {room.availableBeds <= 0 ? ' · Full' : ''})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Meal Type *</label>
                <select
                  name="mealType"
                  value={form.mealType}
                  onChange={handleFormChange}
                  required
                  className={inputClass}
                >
                  <option value="">Select Meal Type</option>
                  <option value="veg">Veg</option>
                  <option value="non-veg">Non-Veg</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Parent Permission for Outing</label>
                <label className="flex items-center gap-2 py-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    name="parentPermissionForOuting"
                    checked={form.parentPermissionForOuting}
                    onChange={handleFormChange}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                  />
                  <span className="text-xs text-gray-700">Enable (OTP to parent)</span>
                </label>
              </div>
              {form.roomNumber && (
                <>
                  <div>
                    <label className={labelClass}>Bed Number</label>
                    <select
                      name="bedNumber"
                      value={form.bedNumber}
                      onChange={handleFormChange}
                      disabled={loadingBedLocker}
                      className={inputClass}
                    >
                      <option value="">Select Bed</option>
                      {bedLockerAvailability?.availableBeds?.map(bed => (
                        <option key={bed.value} value={bed.value}>{bed.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Locker Number</label>
                    <select
                      name="lockerNumber"
                      value={form.lockerNumber}
                      onChange={handleFormChange}
                      disabled={loadingBedLocker}
                      className={inputClass}
                    >
                      <option value="">Select Locker</option>
                      {bedLockerAvailability?.availableLockers?.map(locker => (
                        <option key={locker.value} value={locker.value}>{locker.label}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Fee Structure Display (moved just after hostel info for visibility) */}
          {feeStructure ? (
            <div className={`${feeStructure.isRevisedFee ? 'bg-amber-50 border border-amber-200' : 'bg-green-50'} rounded-lg px-3 py-2`}>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
                <h3 className="text-sm font-semibold text-gray-900">Fee Structure</h3>
                {feeStructure.isRevisedFee && (
                  <span className="bg-amber-100 text-amber-800 text-[11px] px-2 py-0.5 rounded-full font-bold border border-amber-300">
                    Revised Fee Applied
                  </span>
                )}
                <div className="flex items-center gap-6 ml-auto">
                  <div className="text-sm text-gray-600">Term 1: <span className="font-bold text-blue-600">₹{feeStructure.term1Fee?.toLocaleString() || 0}</span></div>
                  <div className="text-sm text-gray-600">Term 2: <span className="font-bold text-blue-600">₹{feeStructure.term2Fee?.toLocaleString() || 0}</span></div>
                  <div className="text-sm text-gray-600">Term 3: <span className="font-bold text-blue-600">₹{feeStructure.term3Fee?.toLocaleString() || 0}</span></div>
                  <div className="text-sm text-gray-600">Total: <span className={`${feeStructure.isRevisedFee ? 'text-amber-600' : 'text-green-600'} font-bold`}>₹{feeStructure.totalFee?.toLocaleString() || 0}</span></div>
                </div>
              </div>
              {feeStructure.isRevisedFee && (
                <p className="text-xs text-amber-800 mt-1">
                  A custom revised fee was found for this student and applied automatically.
                </p>
              )}
            </div>
          ) : form.course && form.branch && form.year && form.category && form.academicYear && !loadingFeeStructure ? (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <p className="text-red-800 text-sm font-medium">
                No fee structure found for category <strong>{form.category}</strong>, course <strong>{getCourseNameById(form.course)}</strong>, year <strong>{form.year}</strong>, academic year <strong>{form.academicYear}</strong>.
              </p>
              <p className="text-xs text-red-600 mt-0.5">Add the fee structure in Fee Management before registering this student.</p>
            </div>
          ) : null}

          {/* Contact Information */}
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-baseline gap-2 mb-2">
              <h3 className="text-sm font-semibold text-gray-900">Contact Information</h3>
              <span className="text-[11px] text-gray-500">Phone numbers from SQL — not editable</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-3 gap-y-2">
              <div>
                <label className={labelClass}>Student Phone</label>
                <input
                  type="tel"
                  name="studentPhone"
                  value={form.studentPhone}
                  readOnly
                  className={readOnlyInputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Parent Phone *</label>
                <input
                  type="tel"
                  name="parentPhone"
                  value={form.parentPhone}
                  readOnly
                  required
                  className={readOnlyInputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Mother Name</label>
                <input
                  type="text"
                  name="motherName"
                  value={form.motherName}
                  onChange={handleFormChange}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Mother Phone</label>
                <input
                  type="tel"
                  name="motherPhone"
                  value={form.motherPhone}
                  readOnly
                  className={readOnlyInputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Email</label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleFormChange}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Local Guardian Name</label>
                <input
                  type="text"
                  name="localGuardianName"
                  value={form.localGuardianName}
                  onChange={handleFormChange}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Local Guardian Phone</label>
                <input
                  type="tel"
                  name="localGuardianPhone"
                  value={form.localGuardianPhone}
                  onChange={handleFormChange}
                  className={inputClass}
                  placeholder="Enter local guardian phone"
                />
              </div>
            </div>
          </div>

          {/* Photos */}
          <div className="bg-gray-50 rounded-lg p-3">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Photos</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className={labelClass}>Student Photo (from SDMS) *</label>
                {studentPhotoPreview ? (
                  <img src={studentPhotoPreview} alt="Student" className="w-24 h-24 object-cover rounded border border-gray-200" />
                ) : (
                  <div className="w-24 h-24 rounded border border-dashed border-gray-300 flex items-center justify-center text-[11px] text-gray-400 text-center px-2">
                    Loads on SQL fetch
                  </div>
                )}
              </div>
              <div>
                <label className={labelClass}>Guardian Photo 1</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handlePhotoChange(e, 'guardian1')}
                  className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md"
                />
                {guardianPhoto1Preview && (
                  <img src={guardianPhoto1Preview} alt="Guardian 1" className="mt-2 w-24 h-24 object-cover rounded" />
                )}
              </div>
              <div>
                <label className={labelClass}>Guardian Photo 2</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handlePhotoChange(e, 'guardian2')}
                  className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md"
                />
                {guardianPhoto2Preview && (
                  <img src={guardianPhoto2Preview} alt="Guardian 2" className="mt-2 w-24 h-24 object-cover rounded" />
                )}
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate('/admin/students')}
              className="px-5 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={adding || !sqlDataFetched || Boolean(academicYearError)}
              className="px-5 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {adding ? 'Registering...' : 'Register Student'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StudentRegistrationSQL;

