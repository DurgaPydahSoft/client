import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/axios';
import toast from 'react-hot-toast';
import { ArrowLeftIcon, MagnifyingGlassIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import LoadingSpinner from '../../components/LoadingSpinner';
import { useAuth } from '../../context/AuthContext';
import { canPerformAction } from '../../utils/permissionUtils';

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
  academicYear: '',
  email: '',
  concession: 0,
  hostel: '',
  hostelCategory: '',
  college: null
};

const readOnlyInputClass =
  'w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-700 cursor-not-allowed';
const readOnlySelectClass =
  'w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-700 cursor-not-allowed';

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
  const [adding, setAdding] = useState(false);
  // Password modal
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState(null);

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
        gender: data.gender || prev.gender,
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
      const params = new URLSearchParams({ hostel: hostelId, category: finalCategoryId });
      if (academicYear) params.set('academicYear', academicYear);
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
      const params = new URLSearchParams();
      if (academicYear) params.set('academicYear', academicYear);
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
  const fetchFeeStructure = async (courseIdOrName, branchIdOrName, year, categoryName, academicYear) => {
    const courseName = getCourseNameById(courseIdOrName);
    const branchName = getBranchNameById(branchIdOrName);
    if (!courseName || !branchName || !year || !categoryName || !academicYear) {
      setFeeStructure(null);
      return;
    }
    setLoadingFeeStructure(true);
    try {
      const res = await api.get(`/api/fee-structures/admit-card/${academicYear}/${encodeURIComponent(courseName)}/${encodeURIComponent(branchName)}/${year}/${encodeURIComponent(categoryName)}`);
      if (res.data.success) {
        setFeeStructure(res.data.data);
        const term1 = res.data.data.term1Fee || 0;
        const term2 = res.data.data.term2Fee || 0;
        const term3 = res.data.data.term3Fee || 0;
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
          gender: sqlData.gender || '',
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
          updatedForm.academicYear
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

    setAdding(true);
    try {
      const formData = new FormData();
      Object.keys(form).forEach(key => {
        if (key === 'college' && form[key] && typeof form[key] === 'object') {
          formData.append(key, JSON.stringify(form[key]));
        } else if (form[key] !== null && form[key] !== undefined) {
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
        const { generatedPassword: genPass, isRenewal, message } = res.data.data || {};
        if (isRenewal) {
          toast.success(message || 'Returning student renewed. Existing login password kept.');
        } else {
          if (genPass) {
            setGeneratedPassword(genPass);
            setShowPasswordModal(true);
          }
          toast.success('Student registered successfully');
        }
        // Reset form
        setForm(initialForm);
        setIdentifier('');
        setSqlDataFetched(false);
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
      fetchFeeStructure(form.course, form.branch, form.year, form.category, form.academicYear);
    } else {
      setFeeStructure(null);
    }
  }, [form.course, form.branch, form.year, form.category, form.academicYear]);

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
    <div className="p-4 sm:p-6 lg:p-8">
      {showPasswordModal && (
        <PasswordModal
          password={generatedPassword}
          onClose={() => {
            setShowPasswordModal(false);
            setGeneratedPassword(null);
          }}
        />
      )}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Student Registration from SQL Database</h1>
        <p className="text-gray-600 mt-2">Fetch student details from central database and complete registration</p>
      </div>

      <div className="bg-white rounded-xl shadow-md p-6">
        {/* SQL Fetch Section */}
        <div className="bg-blue-50 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Step 1: Fetch Student Data from SQL Database</h2>

          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search by
              </label>
              <div className="flex gap-2 mb-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="pin"
                    checked={identifierType === 'pin'}
                    onChange={(e) => setIdentifierType(e.target.value)}
                    className="mr-2"
                  />
                  PIN Number
                </label>
                <label className="flex items-center ml-4">
                  <input
                    type="radio"
                    value="admission"
                    checked={identifierType === 'admission'}
                    onChange={(e) => setIdentifierType(e.target.value)}
                    className="mr-2"
                  />
                  Admission Number
                </label>
              </div>
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={fetchingFromSQL}
              />
            </div>
            <button
              onClick={fetchStudentFromSQL}
              disabled={fetchingFromSQL || !identifier.trim()}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {fetchingFromSQL ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Fetching...
                </>
              ) : (
                <>
                  <MagnifyingGlassIcon className="w-5 h-5" />
                  Fetch Details
                </>
              )}
            </button>
          </div>

          {sqlFetchError && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <XCircleIcon className="w-5 h-5 text-red-600 mr-2" />
                <p className="text-red-800">{sqlFetchError}</p>
              </div>
            </div>
          )}

          {sqlDataFetched && (
            <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center">
                <CheckCircleIcon className="w-5 h-5 text-green-600 mr-2" />
                <p className="text-green-800">Student data fetched successfully. Please complete the form below.</p>
              </div>
            </div>
          )}
        </div>

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal Information — from SQL, read-only */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Personal Information</h3>
            <p className="text-xs text-gray-500 mb-4">Fetched from SQL — not editable</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">PIN Number *</label>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Admission Number *</label>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Gender *</label>
                <select
                  name="gender"
                  value={form.gender}
                  disabled
                  required
                  className={readOnlySelectClass}
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>
            </div>
          </div>

          {/* Academic Information — from SQL, read-only */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Academic Information</h3>
            <p className="text-xs text-gray-500 mb-4">Fetched from SQL — not editable</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">College *</label>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Course *</label>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Year *</label>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Branch *</label>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Batch *</label>
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
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Hostel Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Academic Year *</label>
                <select
                  name="academicYear"
                  value={form.academicYear}
                  onChange={handleFormChange}
                  required
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Concession (₹)</label>
                <input
                  type="number"
                  name="concession"
                  min="0"
                  step="1"
                  value={form.concession}
                  onChange={handleFormChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter concession amount"
                />
                <p className="text-xs text-gray-500 mt-1">Optional: fixed amount to deduct from fee</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hostel *</label>
                <select
                  name="hostel"
                  value={form.hostel}
                  onChange={handleFormChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  disabled={loadingHostels}
                >
                  <option value="">{loadingHostels ? 'Loading...' : 'Select Hostel'}</option>
                  {hostels.map(h => (
                    <option key={h._id} value={h._id}>{h.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hostel Category *</label>
                <select
                  name="hostelCategory"
                  value={form.hostelCategory}
                  onChange={handleFormChange}
                  required
                  disabled={!form.hostel || loadingHostelCategories}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">{loadingHostelCategories ? 'Loading...' : 'Select Category'}</option>
                  {hostelCategories.map(cat => (
                    <option key={cat._id} value={cat._id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Room Number *</label>
                <select
                  name="roomNumber"
                  value={form.roomNumber}
                  onChange={handleFormChange}
                  required
                  disabled={!form.hostel || !form.hostelCategory || loadingRooms}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Meal Type *</label>
                <select
                  name="mealType"
                  value={form.mealType}
                  onChange={handleFormChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Meal Type</option>
                  <option value="veg">Veg</option>
                  <option value="non-veg">Non-Veg</option>
                </select>
              </div>
              <div className="md:col-span-2 lg:col-span-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">Parent Permission for Outing</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    name="parentPermissionForOuting"
                    checked={form.parentPermissionForOuting}
                    onChange={handleFormChange}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                  />
                  <span className="text-sm text-gray-700">Enable parent permission (OTP to parent)</span>
                </div>
              </div>
              {form.roomNumber && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bed Number</label>
                    <select
                      name="bedNumber"
                      value={form.bedNumber}
                      onChange={handleFormChange}
                      disabled={loadingBedLocker}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Bed</option>
                      {bedLockerAvailability?.availableBeds?.map(bed => (
                        <option key={bed.value} value={bed.value}>{bed.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Locker Number</label>
                    <select
                      name="lockerNumber"
                      value={form.lockerNumber}
                      onChange={handleFormChange}
                      disabled={loadingBedLocker}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
          {feeStructure && (
            <div className="bg-green-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Fee Structure</h3>
              <div className="grid grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">₹{feeStructure.term1Fee?.toLocaleString() || 0}</div>
                  <div className="text-sm text-gray-600">Term 1</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">₹{feeStructure.term2Fee?.toLocaleString() || 0}</div>
                  <div className="text-sm text-gray-600">Term 2</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">₹{feeStructure.term3Fee?.toLocaleString() || 0}</div>
                  <div className="text-sm text-gray-600">Term 3</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">₹{feeStructure.totalFee?.toLocaleString() || 0}</div>
                  <div className="text-sm text-gray-600">Total</div>
                </div>
              </div>
            </div>
          )}

          {/* Contact Information */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Contact Information</h3>
            <p className="text-xs text-gray-500 mb-4">Phone numbers from SQL — not editable</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Student Phone</label>
                <input
                  type="tel"
                  name="studentPhone"
                  value={form.studentPhone}
                  readOnly
                  className={readOnlyInputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Parent Phone *</label>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Mother Name</label>
                <input
                  type="text"
                  name="motherName"
                  value={form.motherName}
                  onChange={handleFormChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mother Phone</label>
                <input
                  type="tel"
                  name="motherPhone"
                  value={form.motherPhone}
                  readOnly
                  className={readOnlyInputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleFormChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Local Guardian Name</label>
                <input
                  type="text"
                  name="localGuardianName"
                  value={form.localGuardianName}
                  onChange={handleFormChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Local Guardian Phone</label>
                <input
                  type="tel"
                  name="localGuardianPhone"
                  value={form.localGuardianPhone}
                  onChange={handleFormChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter local guardian phone"
                />
              </div>
            </div>
          </div>

          {/* Photos */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Photos</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Student Photo (from SDMS) *</label>
                <p className="text-xs text-gray-500 mb-2">Loaded automatically when you fetch student data from SQL.</p>
                {studentPhotoPreview ? (
                  <img src={studentPhotoPreview} alt="Student" className="w-32 h-32 object-cover rounded border border-gray-200" />
                ) : (
                  <div className="w-32 h-32 rounded border border-dashed border-gray-300 flex items-center justify-center text-xs text-gray-400 text-center px-2">
                    Fetch student from SQL to load photo
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Guardian Photo 1</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handlePhotoChange(e, 'guardian1')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
                {guardianPhoto1Preview && (
                  <img src={guardianPhoto1Preview} alt="Guardian 1" className="mt-2 w-32 h-32 object-cover rounded" />
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Guardian Photo 2</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handlePhotoChange(e, 'guardian2')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
                {guardianPhoto2Preview && (
                  <img src={guardianPhoto2Preview} alt="Guardian 2" className="mt-2 w-32 h-32 object-cover rounded" />
                )}
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={() => navigate('/admin/students')}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={adding || !sqlDataFetched || Boolean(academicYearError)}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
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

// Password modal (simple inline component)
const PasswordModal = ({ password, onClose }) => {
  if (!password) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
        <h3 className="text-lg font-bold text-gray-900">Credentials Generated</h3>
        <p className="text-sm text-gray-700">Share this password with the student. They should change it after first login.</p>
        <div className="bg-gray-100 border border-gray-200 rounded-lg p-4 flex items-center justify-between">
          <span className="text-xl font-semibold text-gray-900">{password}</span>
          <button
            onClick={() => navigator.clipboard.writeText(password)}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Copy
          </button>
        </div>
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

