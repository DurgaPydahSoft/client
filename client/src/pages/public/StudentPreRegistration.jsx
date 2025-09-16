import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import api from '../../utils/axios';

// Icons
const UserIcon = () => (
  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const AcademicIcon = () => (
  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
  </svg>
);

const ContactIcon = () => (
  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
  </svg>
);

const CameraIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const StudentPreRegistration = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Form state
  const [form, setForm] = useState({
    name: '',
    rollNumber: '',
    gender: '',
    course: '',
    year: '',
    branch: '',
    batch: '',
    academicYear: '',
    studentPhone: '',
    parentPhone: '',
    motherName: '',
    motherPhone: '',
    localGuardianName: '',
    localGuardianPhone: '',
    email: '',
    mealType: 'non-veg'
  });

  // Loading states
  const [loading, setLoading] = useState(false);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [loadingBranches, setLoadingBranches] = useState(false);

  // Data states
  const [courses, setCourses] = useState([]);
  const [branches, setBranches] = useState([]);

  // Photo states
  const [studentPhoto, setStudentPhoto] = useState(null);
  const [studentPhotoPreview, setStudentPhotoPreview] = useState(null);
  const [guardianPhoto1, setGuardianPhoto1] = useState(null);
  const [guardianPhoto1Preview, setGuardianPhoto1Preview] = useState(null);
  const [guardianPhoto2, setGuardianPhoto2] = useState(null);
  const [guardianPhoto2Preview, setGuardianPhoto2Preview] = useState(null);

  // Camera states
  const [showCamera, setShowCamera] = useState(false);
  const [cameraType, setCameraType] = useState(null);
  const [stream, setStream] = useState(null);
  const [cameraReady, setCameraReady] = useState(false);
  const videoRef = React.useRef(null);

  // Get course and batch from URL params
  const courseId = searchParams.get('course');
  const batchParam = searchParams.get('batch');

  useEffect(() => {
    fetchCourses();
    if (courseId) {
      setForm(prev => ({ ...prev, course: courseId }));
      fetchBranches(courseId);
    }
    if (batchParam) {
      setForm(prev => ({ ...prev, batch: batchParam }));
    }
  }, [courseId, batchParam]);

  // Debug: Log when branches change
  useEffect(() => {
    console.log('🔄 Branches state updated:', branches.length, 'branches');
    if (branches.length > 0) {
      console.log('📋 Available branches:', branches.map(b => `${b.name} (${b.code})`));
    }
  }, [branches]);

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

  const getCourseDuration = (courseId) => {
    const course = courses.find(c => c._id === courseId);
    return course?.duration || 4;
  };

  const generateBatches = (courseId, courses) => {
    const course = courses.find(c => c._id === courseId);
    if (!course) return [];

    const currentYear = new Date().getFullYear();
    const batches = [];

    for (let i = 0; i < 5; i++) {
      const startYear = currentYear - i;
      const endYear = startYear + course.duration;
      batches.push(`${startYear}-${endYear}`);
    }

    return batches;
  };

  const generateAcademicYears = () => {
    const currentYear = new Date().getFullYear();
    const years = [];

    for (let i = 0; i < 3; i++) {
      const startYear = currentYear - i;
      const endYear = startYear + 1;
      years.push(`${startYear}-${endYear}`);
    }

    return years;
  };

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    const fieldValue = type === 'checkbox' ? checked : value;

    setForm(prev => {
      const newForm = { ...prev, [name]: fieldValue };

      // Reset dependent fields when parent field changes
      if (name === 'course') {
        newForm.branch = '';
        newForm.batch = '';
        fetchBranches(value);
      }
      if (name === 'gender') {
        // Reset any gender-dependent fields if needed
      }

      return newForm;
    });
  };

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
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const resetPhotoForm = () => {
    setStudentPhoto(null);
    setStudentPhotoPreview(null);
    setGuardianPhoto1(null);
    setGuardianPhoto1Preview(null);
    setGuardianPhoto2(null);
    setGuardianPhoto2Preview(null);
  };

  const startCamera = async (type) => {
    try {
      setCameraReady(false);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      setStream(mediaStream);
      setCameraType(type);
      setShowCamera(true);

      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.onloadedmetadata = () => {
            setCameraReady(true);
          };
        }
      }, 100);
    } catch (err) {
      toast.error('Camera access denied or not available');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setShowCamera(false);
    setCameraReady(false);
    setCameraType(null);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !cameraType) {
      toast.error('Camera not ready. Please try again.');
      return;
    }

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    context.drawImage(videoRef.current, 0, 0);

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], 'camera-photo.jpg', { type: 'image/jpeg' });
        const reader = new FileReader();
        reader.onloadend = () => {
          switch (cameraType) {
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
          }
        };
        reader.readAsDataURL(file);
        stopCamera();
        toast.success('Photo captured successfully!');
      }
    }, 'image/jpeg', 0.8);
  };

  const validateForm = () => {
    if (!form.name?.trim()) {
      toast.error('Name is required');
      return false;
    }
    if (!form.rollNumber?.trim()) {
      toast.error('Roll number is required');
      return false;
    }
    if (!form.gender) {
      toast.error('Gender is required');
      return false;
    }
    if (!form.course) {
      toast.error('Course is required');
      return false;
    }
    if (!form.branch) {
      toast.error('Branch is required');
      return false;
    }
    if (!form.year) {
      toast.error('Year is required');
      return false;
    }
    if (!form.batch) {
      toast.error('Batch is required');
      return false;
    }
    if (!form.academicYear) {
      toast.error('Academic year is required');
      return false;
    }
    if (!form.studentPhone || !/^[0-9]{10}$/.test(form.studentPhone)) {
      toast.error('Valid student phone number is required');
      return false;
    }
    if (!form.parentPhone || !/^[0-9]{10}$/.test(form.parentPhone)) {
      toast.error('Valid parent phone number is required');
      return false;
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      toast.error('Valid email address is required');
      return false;
    }
    if (!studentPhoto) {
      toast.error('Student photo is required');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    try {
      const formData = new FormData();

      // Add form fields
      Object.keys(form).forEach(key => {
        formData.append(key, form[key]);
      });

      // Add photos
      if (studentPhoto) {
        formData.append('studentPhoto', studentPhoto);
      }
      if (guardianPhoto1) {
        formData.append('guardianPhoto1', guardianPhoto1);
      }
      if (guardianPhoto2) {
        formData.append('guardianPhoto2', guardianPhoto2);
      }

      const res = await api.post('/api/student/preregister', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      toast.success('Pre-registration submitted successfully! Your request is pending admin approval.');
      navigate('/student/preregister/success', {
        state: {
          rollNumber: form.rollNumber,
          name: form.name
        }
      });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit pre-registration');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-4 sm:py-6 lg:py-8">
      <div className="max-w-4xl mx-auto px-3 sm:px-4 lg:px-8">
        {/* Header */}
        <div className="text-center mb-4 sm:mb-6 lg:mb-8">
          <img
            src="/PYDAH_LOGO_PHOTO.jpg"
            alt="Pydah Logo"
            className="mx-auto mb-4 h-20 sm:h-24 object-contain"
          />
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-blue-900 mb-1 sm:mb-2">
            Student Pre-Registration
          </h1>
          <p className="text-sm sm:text-base text-gray-600 px-2">
            Fill in your details to pre-register for hostel accommodation
          </p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-lg sm:rounded-xl shadow-md p-4 sm:p-6 lg:p-8">
          <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">

            {/* Personal Information Section */}
            <div className="bg-blue-50 rounded-lg p-4 sm:p-6">
              <div className="flex items-center mb-3 sm:mb-4">
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-blue-100 rounded-full flex items-center justify-center mr-2 sm:mr-3">
                  <UserIcon />
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">Personal Information</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleFormChange}
                    placeholder="Enter your full name"
                    required
                    className="w-full px-3 py-2.5 sm:py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Roll Number *</label>
                  <input
                    type="text"
                    name="rollNumber"
                    value={form.rollNumber}
                    onChange={handleFormChange}
                    placeholder="Enter your roll number"
                    required
                    pattern="[A-Z0-9]+"
                    title="Uppercase letters and numbers only"
                    className="w-full px-3 py-2.5 sm:py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Gender *</label>
                  <select
                    name="gender"
                    value={form.gender}
                    onChange={handleFormChange}
                    required
                    className="w-full px-3 py-2.5 sm:py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleFormChange}
                    placeholder="Enter your email (optional)"
                    className="w-full px-3 py-2.5 sm:py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Academic Information Section */}
            <div className="bg-blue-50 rounded-lg p-4 sm:p-6">
              <div className="flex items-center mb-3 sm:mb-4">
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-blue-100 rounded-full flex items-center justify-center mr-2 sm:mr-3">
                  <AcademicIcon />
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">Academic Information</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Course *</label>
                  <select
                    name="course"
                    value={form.course}
                    onChange={handleFormChange}
                    required
                    disabled={loadingCourses}
                    className="w-full px-3 py-2.5 sm:py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Year *</label>
                  <select
                    name="year"
                    value={form.year}
                    onChange={handleFormChange}
                    required
                    disabled={!form.course}
                    className="w-full px-3 py-2.5 sm:py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Branch *</label>
                  <select
                    name="branch"
                    value={form.branch}
                    onChange={handleFormChange}
                    required
                    disabled={!form.course || loadingBranches}
                    className="w-full px-3 py-2.5 sm:py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Batch *</label>
                  <select
                    name="batch"
                    value={form.batch}
                    onChange={handleFormChange}
                    required
                    disabled={!form.course}
                    className="w-full px-3 py-2.5 sm:py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select Batch</option>
                    {form.course && generateBatches(form.course, courses).map(batch => (
                      <option key={batch} value={batch}>{batch}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Academic Year *</label>
                  <select
                    name="academicYear"
                    value={form.academicYear}
                    onChange={handleFormChange}
                    required
                    className="w-full px-3 py-2.5 sm:py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select Academic Year</option>
                    {generateAcademicYears().map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Meal Type</label>
                  <select
                    name="mealType"
                    value={form.mealType}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2.5 sm:py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="non-veg">Non-Veg</option>
                    <option value="veg">Veg</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Contact Information Section */}
            <div className="bg-blue-50 rounded-lg p-4 sm:p-6">
              <div className="flex items-center mb-3 sm:mb-4">
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-blue-100 rounded-full flex items-center justify-center mr-2 sm:mr-3">
                  <ContactIcon />
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">Contact Information</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Student Phone *</label>
                  <input
                    type="tel"
                    name="studentPhone"
                    value={form.studentPhone}
                    onChange={handleFormChange}
                    placeholder="Enter your phone number"
                    required
                    pattern="[0-9]{10}"
                    title="10-digit phone number"
                    className="w-full px-3 py-2.5 sm:py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Parent Phone *</label>
                  <input
                    type="tel"
                    name="parentPhone"
                    value={form.parentPhone}
                    onChange={handleFormChange}
                    placeholder="Enter parent's phone number"
                    required
                    pattern="[0-9]{10}"
                    title="10-digit phone number"
                    className="w-full px-3 py-2.5 sm:py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Mother Name</label>
                  <input
                    type="text"
                    name="motherName"
                    value={form.motherName}
                    onChange={handleFormChange}
                    placeholder="Enter mother's name (optional)"
                    className="w-full px-3 py-2.5 sm:py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Mother Phone</label>
                  <input
                    type="tel"
                    name="motherPhone"
                    value={form.motherPhone}
                    onChange={handleFormChange}
                    placeholder="Enter mother's phone (optional)"
                    pattern="[0-9]{10}"
                    title="10-digit phone number"
                    className="w-full px-3 py-2.5 sm:py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Local Guardian Name</label>
                  <input
                    type="text"
                    name="localGuardianName"
                    value={form.localGuardianName}
                    onChange={handleFormChange}
                    placeholder="Enter local guardian's name (optional)"
                    className="w-full px-3 py-2.5 sm:py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Local Guardian Phone</label>
                  <input
                    type="tel"
                    name="localGuardianPhone"
                    value={form.localGuardianPhone}
                    onChange={handleFormChange}
                    placeholder="Enter local guardian's phone (optional)"
                    pattern="[0-9]{10}"
                    title="10-digit phone number"
                    className="w-full px-3 py-2.5 sm:py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Photo Upload Section */}
            <div className="bg-blue-50 rounded-lg p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Photo Upload</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">

                {/* Student Photo */}
                <div className="bg-white rounded-lg p-3 sm:p-4 border border-blue-200">
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2 sm:mb-3">Your Photo *</label>
                  <div className="space-y-2 sm:space-y-3">
                    <div className="flex items-center justify-center w-full">
                      <label className="flex flex-col items-center justify-center w-full h-24 sm:h-32 border-2 border-blue-300 border-dashed rounded-lg cursor-pointer bg-blue-50 hover:bg-blue-100 transition-colors">
                        <div className="flex flex-col items-center justify-center pt-3 pb-4 sm:pt-5 sm:pb-6">
                          {studentPhotoPreview ? (
                            <div className="relative">
                              <img src={studentPhotoPreview} alt="Preview" className="mx-auto h-16 sm:h-20 w-auto object-cover rounded-lg" />
                              <button
                                type="button"
                                onClick={() => {
                                  setStudentPhoto(null);
                                  setStudentPhotoPreview(null);
                                }}
                                className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 bg-red-500 text-white rounded-full w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center text-xs hover:bg-red-600"
                              >
                                ×
                              </button>
                            </div>
                          ) : (
                            <>
                              <svg className="w-6 h-6 sm:w-8 sm:h-8 mb-2 sm:mb-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              <p className="mb-1 sm:mb-2 text-xs sm:text-sm text-gray-500">Click to upload photo</p>
                            </>
                          )}
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handlePhotoChange(e, 'student')}
                          className="hidden"
                        />
                      </label>
                    </div>
                    <button
                      type="button"
                      onClick={() => startCamera('student')}
                      className="w-full px-2 sm:px-3 py-2 text-xs sm:text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center space-x-1 sm:space-x-2 transition-colors"
                    >
                      <CameraIcon />
                      <span>Take Photo</span>
                    </button>
                  </div>
                </div>

                {/* Guardian Photo 1 */}
                <div className="bg-white rounded-lg p-3 sm:p-4 border border-blue-200">
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2 sm:mb-3">Parents Photo</label>
                  <div className="space-y-2 sm:space-y-3">
                    <div className="flex items-center justify-center w-full">
                      <label className="flex flex-col items-center justify-center w-full h-24 sm:h-32 border-2 border-blue-300 border-dashed rounded-lg cursor-pointer bg-blue-50 hover:bg-blue-100 transition-colors">
                        <div className="flex flex-col items-center justify-center pt-3 pb-4 sm:pt-5 sm:pb-6">
                          {guardianPhoto1Preview ? (
                            <div className="relative">
                              <img src={guardianPhoto1Preview} alt="Preview" className="mx-auto h-16 sm:h-20 w-auto object-cover rounded-lg" />
                              <button
                                type="button"
                                onClick={() => {
                                  setGuardianPhoto1(null);
                                  setGuardianPhoto1Preview(null);
                                }}
                                className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 bg-red-500 text-white rounded-full w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center text-xs hover:bg-red-600"
                              >
                                ×
                              </button>
                            </div>
                          ) : (
                            <>
                              <svg className="w-6 h-6 sm:w-8 sm:h-8 mb-2 sm:mb-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              <p className="mb-1 sm:mb-2 text-xs sm:text-sm text-gray-500">Click to upload photo</p>
                            </>
                          )}
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handlePhotoChange(e, 'guardian1')}
                          className="hidden"
                        />
                      </label>
                    </div>
                    <button
                      type="button"
                      onClick={() => startCamera('guardian1')}
                      className="w-full px-2 sm:px-3 py-2 text-xs sm:text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center space-x-1 sm:space-x-2 transition-colors"
                    >
                      <CameraIcon />
                      <span>Take Photo</span>
                    </button>
                  </div>
                </div>

                {/* Guardian Photo 2 */}
                <div className="bg-white rounded-lg p-3 sm:p-4 border border-blue-200">
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2 sm:mb-3">Local Guardian Photo</label>
                  <div className="space-y-2 sm:space-y-3">
                    <div className="flex items-center justify-center w-full">
                      <label className="flex flex-col items-center justify-center w-full h-24 sm:h-32 border-2 border-blue-300 border-dashed rounded-lg cursor-pointer bg-blue-50 hover:bg-blue-100 transition-colors">
                        <div className="flex flex-col items-center justify-center pt-3 pb-4 sm:pt-5 sm:pb-6">
                          {guardianPhoto2Preview ? (
                            <div className="relative">
                              <img src={guardianPhoto2Preview} alt="Preview" className="mx-auto h-16 sm:h-20 w-auto object-cover rounded-lg" />
                              <button
                                type="button"
                                onClick={() => {
                                  setGuardianPhoto2(null);
                                  setGuardianPhoto2Preview(null);
                                }}
                                className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 bg-red-500 text-white rounded-full w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center text-xs hover:bg-red-600"
                              >
                                ×
                              </button>
                            </div>
                          ) : (
                            <>
                              <svg className="w-6 h-6 sm:w-8 sm:h-8 mb-2 sm:mb-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              <p className="mb-1 sm:mb-2 text-xs sm:text-sm text-gray-500">Click to upload photo</p>
                            </>
                          )}
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handlePhotoChange(e, 'guardian2')}
                          className="hidden"
                        />
                      </label>
                    </div>
                    <button
                      type="button"
                      onClick={() => startCamera('guardian2')}
                      className="w-full px-2 sm:px-3 py-2 text-xs sm:text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center space-x-1 sm:space-x-2 transition-colors"
                    >
                      <CameraIcon />
                      <span>Take Photo</span>
                    </button>
                  </div>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-4 text-center">Maximum file size: 5MB. Supported formats: JPG, PNG, GIF</p>
            </div>

            {/* Submit Button */}
            <div className="flex justify-center pt-3 sm:pt-4">
              <button
                type="submit"
                disabled={loading}
                className={`px-6 sm:px-8 py-3 sm:py-3 rounded-lg text-white font-medium transition-all duration-200 text-sm sm:text-sm w-full sm:w-auto ${loading
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg transform hover:scale-105'
                  }`}
              >
                {loading ? 'Submitting...' : 'Submit Pre-Registration'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Camera Modal */}
      {showCamera && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-3 sm:mb-4">
              <h3 className="text-base sm:text-lg font-semibold">Take Photo</h3>
              <button
                onClick={stopCamera}
                className="text-gray-500 hover:text-gray-700 p-1"
              >
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="relative">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-48 sm:h-64 bg-gray-900 rounded-lg"
              />
              {cameraReady && (
                <div className="absolute bottom-3 sm:bottom-4 left-1/2 transform -translate-x-1/2">
                  <button
                    onClick={capturePhoto}
                    className="bg-blue-600 text-white px-4 sm:px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm sm:text-base"
                  >
                    Capture Photo
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentPreRegistration;
