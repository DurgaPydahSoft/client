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
  hostelCategory: ''
};

const StudentRegistrationSQL = () => {
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
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [loadingBranches, setLoadingBranches] = useState(false);
  // Deduplicate branches by _id or name
  const branchOptions = useMemo(() => {
    const seen = new Set();
    return branches.filter(b => {
      const key = b?._id || b?.name;
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

  // Fetch courses & hostels on mount
  useEffect(() => {
    fetchCourses();
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

  // Fetch rooms with availability
  const fetchRoomsWithAvailability = async (hostelId, categoryIdOrName) => {
    if (!hostelId || !categoryIdOrName) {
      setRoomsWithAvailability([]);
      return;
    }
    setLoadingRooms(true);
    try {
      // Resolve category id if name provided
      let finalCategoryId = categoryIdOrName;
      if (!/^[0-9a-fA-F]{24}$/.test(finalCategoryId)) {
        const list = hostelCategories.length ? hostelCategories : await fetchHostelCategories(hostelId);
        const match = list.find(c => c._id === categoryIdOrName || (c.name || '').toLowerCase() === (categoryIdOrName || '').toLowerCase());
        if (match) finalCategoryId = match._id;
      }
      const params = new URLSearchParams({ hostel: hostelId, category: finalCategoryId });
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

  // Fetch bed/locker availability
  const fetchBedLockerAvailability = async (roomNumber) => {
    if (!roomNumber) return;
    setLoadingBedLocker(true);
    try {
      const res = await api.get(`/api/admin/rooms/${roomNumber}/bed-locker-availability`);
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
  const fetchFeeStructure = async (course, branch, year, category, academicYear) => {
    if (!course || !branch || !year || !category || !academicYear) {
      setFeeStructure(null);
      return;
    }
    setLoadingFeeStructure(true);
    try {
      const res = await api.get(`/api/fee-structures/admit-card/${academicYear}/${course}/${encodeURIComponent(branch)}/${year}/${category}`);
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
        
        // Map SQL data to form
        const mappedForm = {
          name: sqlData.name || '',
          rollNumber: sqlData.rollNumber || identifier,
          admissionNumber: sqlData.admissionNumber || identifier,
          gender: sqlData.gender || '',
          course: sqlData.courseId || '',
          branch: sqlData.branchId || '',
          year: sqlData.year || 1,
          batch: sqlData.batch || '',
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
          academicYear: form.academicYear,
          concession: form.concession,
          hostel: form.hostel,
          hostelCategory: form.hostelCategory
        };

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
        if (newForm.hostel && fieldValue) {
          fetchRoomsWithAvailability(newForm.hostel, fieldValue);
        }
      }
      if (name === 'roomNumber') {
        newForm.bedNumber = '';
        newForm.lockerNumber = '';
        if (value) {
          fetchBedLockerAvailability(value);
        }
      }

      return newForm;
    });

    // Fetch fee structure when relevant fields change
    if (name === 'course' || name === 'year' || name === 'category' || name === 'academicYear') {
      const updatedForm = { ...form, [name]: fieldValue };
      if (updatedForm.course && updatedForm.year && updatedForm.category && updatedForm.academicYear) {
        fetchFeeStructure(updatedForm.course, updatedForm.branch, updatedForm.year, updatedForm.category, updatedForm.academicYear);
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

  // Generate batches
  const generateBatches = (courseId) => {
    const course = courses.find(c => c._id === courseId);
    const duration = course ? course.duration : 4;
    const startYear = 2022;
    const batches = [];
    for (let i = 0; i < 10; i++) {
      const start = startYear + i;
      const end = start + duration;
      batches.push(`${start}-${end}`);
    }
    return batches;
  };

  // Get course duration
  const getCourseDuration = (courseId) => {
    const course = courses.find(c => c._id === courseId);
    return course ? course.duration : 4;
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

    if (!studentPhoto && !studentPhotoPreview) {
      toast.error('Student photo is required');
      return;
    }

    setAdding(true);
    try {
      const formData = new FormData();
      Object.keys(form).forEach(key => {
        formData.append(key, form[key]);
      });

      if (studentPhoto) {
        formData.append('studentPhoto', studentPhoto);
      } else if (studentPhotoPreview) {
        formData.append('studentPhotoUrl', studentPhotoPreview);
      }
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
          toast.success('Student registered successfully');
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

  // Fetch rooms when hostel/category changes
  useEffect(() => {
    if (form.hostel && form.hostelCategory) {
      fetchRoomsWithAvailability(form.hostel, form.hostelCategory);
    } else {
      setRoomsWithAvailability([]);
    }
  }, [form.hostel, form.hostelCategory]);

  // Fetch fee structure when relevant fields change
  useEffect(() => {
    if (form.course && form.year && form.category && form.academicYear) {
      fetchFeeStructure(form.course, form.branch, form.year, form.category, form.academicYear);
    }
  }, [form.course, form.year, form.category, form.academicYear]);

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
      <div className="mb-6">
        <button
          onClick={() => navigate('/admin/students')}
          className="flex items-center text-blue-600 hover:text-blue-800 mb-4"
        >
          <ArrowLeftIcon className="w-5 h-5 mr-2" />
          Back to Students
        </button>
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
          {/* Personal Information */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleFormChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">PIN Number *</label>
                <input
                  type="text"
                  name="rollNumber"
                  value={form.rollNumber}
                  onChange={handleFormChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 uppercase"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Gender *</label>
                <select
                  name="gender"
                  value={form.gender}
                  onChange={handleFormChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>
            </div>
          </div>

          {/* Academic Information */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Academic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Course *</label>
                <select
                  name="course"
                  value={form.course}
                  onChange={handleFormChange}
                  required
                  disabled={loadingCourses}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                  onChange={handleFormChange}
                  required
                  disabled={!form.course}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                  onChange={handleFormChange}
                  required
                  disabled={!form.course || loadingBranches}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                  onChange={handleFormChange}
                  required
                  disabled={!form.course}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Batch</option>
                  {form.course && generateBatches(form.course).map(batch => (
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Academic Year</option>
                  {generateAcademicYears().map(year => (
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
                    <option key={room._id} value={room.roomNumber}>
                      Room {room.roomNumber} ({room.studentCount}/{room.bedCount})
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

          {/* Contact Information */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Student Phone</label>
                <input
                  type="tel"
                  name="studentPhone"
                  value={form.studentPhone}
                  onChange={handleFormChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mother Phone</label>
                <input
                  type="tel"
                  name="motherPhone"
                  value={form.motherPhone}
                  onChange={handleFormChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
            </div>
          </div>

          {/* Photo Upload */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Photos</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Student Photo *</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handlePhotoChange(e, 'student')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
                {studentPhotoPreview && (
                  <img src={studentPhotoPreview} alt="Student" className="mt-2 w-32 h-32 object-cover rounded" />
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

          {/* Fee Structure Display */}
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
              disabled={adding || !sqlDataFetched}
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

