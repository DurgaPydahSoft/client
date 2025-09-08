import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../utils/axios';
import toast from 'react-hot-toast';
import {
  AcademicCapIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  CalendarIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import LoadingSpinner from '../../components/LoadingSpinner';
import SEO from '../../components/SEO';

const CourseManagement = () => {
  const [activeTab, setActiveTab] = useState('courses');
  const [courses, setCourses] = useState([]);
  const [branches, setBranches] = useState([]);
  const [academicCalendars, setAcademicCalendars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [editingBranch, setEditingBranch] = useState(null);
  const [editingCalendar, setEditingCalendar] = useState(null);
  const [courseForm, setCourseForm] = useState({
    name: '',
    code: '',
    description: '',
    duration: '',
    durationUnit: 'years'
  });
  const [branchForm, setBranchForm] = useState({
    name: '',
    code: '',
    courseId: '',
    description: ''
  });
  const [calendarForm, setCalendarForm] = useState({
    courseId: '',
    academicYear: '',
    yearOfStudy: '',
    semester: '',
    startDate: '',
    endDate: ''
  });
  const [academicYears, setAcademicYears] = useState([]);
  
  // Academic Calendar Filters
  const [calendarFilters, setCalendarFilters] = useState({
    courseId: '',
    academicYear: '',
    yearOfStudy: '',
    semester: ''
  });

  useEffect(() => {
    fetchData();
    generateAcademicYears();
  }, []);

  const generateAcademicYears = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    
    // Generate 2 years before and 2 years after current year
    for (let i = currentYear - 2; i <= currentYear + 2; i++) {
      years.push(`${i}-${i + 1}`);
    }
    
    setAcademicYears(years);
  };

  const getCurrentAcademicYear = () => {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth(); // 0-11 (January = 0)
    
    // If current month is before July, it's still the previous academic year
    if (currentMonth < 6) { // June = 5, so before July
      return `${currentYear - 1}-${currentYear}`;
    } else {
      return `${currentYear}-${currentYear + 1}`;
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch courses and branches first (required)
      const [coursesRes, branchesRes] = await Promise.all([
        api.get('/api/course-management/courses/all'),
        api.get('/api/course-management/branches')
      ]);

      if (coursesRes.data.success) {
        setCourses(coursesRes.data.data);
      }
      if (branchesRes.data.success) {
        setBranches(branchesRes.data.data);
      }

      // Try to fetch academic calendars (optional - might not be available yet)
      try {
        const calendarsRes = await api.get('/api/course-management/academic-calendars');
        if (calendarsRes.data.success) {
          setAcademicCalendars(calendarsRes.data.data);
        }
      } catch (calendarError) {
        console.warn('Academic calendar API not available yet:', calendarError.message);
        // Don't show error toast for academic calendar, just set empty array
        setAcademicCalendars([]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleCourseSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCourse) {
        const response = await api.put(`/api/course-management/courses/${editingCourse._id}`, courseForm);
        if (response.data.success) {
          toast.success('Course updated successfully');
          setShowCourseModal(false);
          resetCourseForm();
          fetchData();
        }
      } else {
        const response = await api.post('/api/course-management/courses', courseForm);
        if (response.data.success) {
          toast.success('Course created successfully');
          setShowCourseModal(false);
          resetCourseForm();
          fetchData();
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save course');
    }
  };

  const handleBranchSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingBranch) {
        const response = await api.put(`/api/course-management/branches/${editingBranch._id}`, branchForm);
        if (response.data.success) {
          toast.success('Branch updated successfully');
          setShowBranchModal(false);
          resetBranchForm();
          fetchData();
        }
      } else {
        const response = await api.post('/api/course-management/branches', branchForm);
        if (response.data.success) {
          toast.success('Branch created successfully');
          setShowBranchModal(false);
          resetBranchForm();
          fetchData();
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save branch');
    }
  };

  const handleCalendarSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCalendar) {
        const response = await api.put(`/api/course-management/academic-calendars/${editingCalendar._id}`, calendarForm);
        if (response.data.success) {
          toast.success('Academic calendar updated successfully');
          setShowCalendarModal(false);
          resetCalendarForm();
          fetchData();
        }
      } else {
        const response = await api.post('/api/course-management/academic-calendars', calendarForm);
        if (response.data.success) {
          toast.success('Academic calendar created successfully');
          setShowCalendarModal(false);
          resetCalendarForm();
          fetchData();
        }
      }
    } catch (error) {
      if (error.response?.status === 404) {
        toast.error('Academic calendar feature is not available yet. Please restart the server.');
      } else {
        toast.error(error.response?.data?.message || 'Failed to save academic calendar');
      }
    }
  };

  const handleDeleteCourse = async (courseId) => {
    const course = courses.find(c => c._id === courseId);
    const branchCount = branches.filter(b => b.course._id === courseId && b.isActive).length;

    const confirmMessage = branchCount > 0
      ? `This will deactivate "${course?.name}" and all ${branchCount} associated branches. Are you sure?`
      : `Are you sure you want to deactivate "${course?.name}"?`;

    if (!window.confirm(confirmMessage)) return;

    try {
      const response = await api.delete(`/api/course-management/courses/${courseId}`);
      if (response.data.success) {
        toast.success(response.data.message || 'Course deactivated successfully');
        fetchData();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to deactivate course');
    }
  };

  const handleDeleteBranch = async (branchId) => {
    const branch = branches.find(b => b._id === branchId);

    if (!window.confirm(`Are you sure you want to deactivate "${branch?.name}" branch?`)) return;

    try {
      const response = await api.delete(`/api/course-management/branches/${branchId}`);
      if (response.data.success) {
        toast.success(response.data.message || 'Branch deactivated successfully');
        fetchData();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to deactivate branch');
    }
  };

  const handleDeleteCalendar = async (calendarId) => {
    const calendar = academicCalendars.find(c => c._id === calendarId);

    if (!window.confirm(`Are you sure you want to permanently delete "${calendar?.semester} ${calendar?.academicYear}" for Year ${calendar?.yearOfStudy} of ${calendar?.course?.name}?\n\nThis action cannot be undone.`)) return;

    try {
      const response = await api.delete(`/api/course-management/academic-calendars/${calendarId}`);
      if (response.data.success) {
        toast.success(response.data.message || 'Academic calendar deleted successfully');
        fetchData();
      }
    } catch (error) {
      if (error.response?.status === 404) {
        toast.error('Academic calendar feature is not available yet. Please restart the server.');
      } else {
        toast.error(error.response?.data?.message || 'Failed to delete academic calendar');
      }
    }
  };

  const openCourseModal = (course = null) => {
    if (course) {
      setEditingCourse(course);
      setCourseForm({
        name: course.name,
        code: course.code,
        description: course.description || '',
        duration: course.duration,
        durationUnit: course.durationUnit
      });
    } else {
      setEditingCourse(null);
      resetCourseForm();
    }
    setShowCourseModal(true);
  };

  const openBranchModal = (branch = null) => {
    if (branch) {
      setEditingBranch(branch);
      setBranchForm({
        name: branch.name,
        code: branch.code,
        courseId: branch.course._id,
        description: branch.description || ''
      });
    } else {
      setEditingBranch(null);
      resetBranchForm();
    }
    setShowBranchModal(true);
  };

  const openCalendarModal = (calendar = null) => {
    if (calendar) {
      setEditingCalendar(calendar);
      setCalendarForm({
        courseId: calendar.course._id,
        academicYear: calendar.academicYear,
        yearOfStudy: calendar.yearOfStudy,
        semester: calendar.semester,
        startDate: calendar.startDate ? new Date(calendar.startDate).toISOString().split('T')[0] : '',
        endDate: calendar.endDate ? new Date(calendar.endDate).toISOString().split('T')[0] : ''
      });
    } else {
      setEditingCalendar(null);
      // Set current academic year as default for new entries
      const currentAcademicYear = getCurrentAcademicYear();
      setCalendarForm({
        courseId: '',
        academicYear: currentAcademicYear,
        yearOfStudy: '',
        semester: '',
        startDate: '',
        endDate: ''
      });
    }
    setShowCalendarModal(true);
  };

  const resetCourseForm = () => {
    setCourseForm({
      name: '',
      code: '',
      description: '',
      duration: '',
      durationUnit: 'years'
    });
  };

  const resetBranchForm = () => {
    setBranchForm({
      name: '',
      code: '',
      courseId: '',
      description: ''
    });
  };

  const resetCalendarForm = () => {
    const currentAcademicYear = getCurrentAcademicYear();
    setCalendarForm({
      courseId: '',
      academicYear: currentAcademicYear,
      yearOfStudy: '',
      semester: '',
      startDate: '',
      endDate: ''
    });
  };

  const getBranchesForCourse = (courseId) => {
    return branches.filter(branch => branch.course._id === courseId);
  };

  const getAvailableYearsForCourse = (courseId) => {
    const course = courses.find(c => c._id === courseId);
    if (!course) return [];
    
    const duration = course.duration || 4; // Default to 4 years if not specified
    return Array.from({ length: duration }, (_, i) => i + 1);
  };

  // Handle filter changes
  const handleFilterChange = (filterType, value) => {
    setCalendarFilters(prev => {
      const newFilters = {
        ...prev,
        [filterType]: value
      };
      
      // Reset Year of Study when Course changes
      if (filterType === 'courseId') {
        newFilters.yearOfStudy = '';
      }
      
      return newFilters;
    });
  };

  // Clear all filters
  const clearFilters = () => {
    setCalendarFilters({
      courseId: '',
      academicYear: '',
      yearOfStudy: '',
      semester: ''
    });
  };

  // Filter academic calendars based on selected filters
  const filteredAcademicCalendars = academicCalendars.filter(calendar => {
    if (calendarFilters.courseId && calendar.course._id !== calendarFilters.courseId) return false;
    if (calendarFilters.academicYear && calendar.academicYear !== calendarFilters.academicYear) return false;
    if (calendarFilters.yearOfStudy && calendar.yearOfStudy.toString() !== calendarFilters.yearOfStudy) return false;
    if (calendarFilters.semester && calendar.semester !== calendarFilters.semester) return false;
    return true;
  });

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <>
      <SEO title="Course Management" description="Manage courses and branches dynamically" />

      <div className="min-h-screen bg-gray-50 p-3 sm:p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6 sm:mb-8">
            <h1 className="text-xl sm:text-3xl font-bold text-blue-900 mb-1 sm:mb-2">
              Course & Branch Management
            </h1>
            <p className="text-xs sm:text-base text-gray-600">
              Manage academic courses and their branches dynamically
            </p>
          </div>

          {/* Tab Navigation */}
          <div className="mb-4 sm:mb-6">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex flex-wrap gap-2 sm:gap-0 space-x-0 sm:space-x-8 overflow-x-auto">
                {[
                  { id: 'courses', label: 'Courses', icon: AcademicCapIcon },
                  { id: 'branches', label: 'Branches', icon: AcademicCapIcon },
                  { id: 'academic-calendar', label: 'Academic Calendar', icon: CalendarIcon }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-2 px-2 sm:px-1 border-b-2 font-medium text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2 whitespace-nowrap ${activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                  >
                    <tab.icon className="h-4 w-4 sm:h-5 sm:w-5" />
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Content */}
          <AnimatePresence mode="wait">
            {activeTab === 'courses' && (
              <motion.div
                key="courses"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-4 sm:space-y-6"
              >
                {/* Courses Header */}
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-0">
                  <div>
                    <h2 className="text-base sm:text-xl font-semibold text-blue-900">Courses</h2>
                    <p className="text-xs sm:text-gray-600">Manage academic courses and their configurations</p>
                  </div>
                  <button
                    onClick={() => openCourseModal()}
                    className="bg-blue-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-1.5 sm:gap-2 text-xs sm:text-base"
                  >
                    <PlusIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                    Add Course
                  </button>
                </div>

                {/* Courses Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
                  {courses.map((course) => (
                    <div
                      key={course._id}
                      className={`bg-white rounded-lg shadow-sm border p-3 sm:p-6 ${!course.isActive ? 'opacity-60' : ''
                        }`}
                    >
                      <div className="flex justify-between items-start mb-3 sm:mb-4">
                        <div>
                          <h3 className="text-base sm:text-lg font-semibold text-blue-900">{course.name}</h3>
                          <p className="text-xs sm:text-sm text-gray-500">Code: {course.code}</p>
                        </div>
                        <div className="flex gap-1.5 sm:gap-2">
                          <button
                            onClick={() => openCourseModal(course)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <PencilIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                          </button>
                          <button
                            onClick={() => handleDeleteCourse(course._id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <TrashIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1.5 sm:space-y-2">
                        {course.description && (
                          <p className="text-xs sm:text-sm text-gray-600">{course.description}</p>
                        )}
                        <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-500">
                          <span>Duration: {course.duration} {course.durationUnit}</span>
                          <span className={`px-2 py-1 rounded-full text-xs ${course.isActive
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                            }`}>
                            {course.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <div className="text-xs text-gray-400">
                          Created by: {course.createdBy?.username || 'System'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === 'branches' && (
              <motion.div
                key="branches"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-4 sm:space-y-6"
              >
                {/* Branches Header */}
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-0">
                  <div>
                    <h2 className="text-base sm:text-xl font-semibold text-blue-900">Branches</h2>
                    <p className="text-xs sm:text-gray-600">Manage branches for each course</p>
                  </div>
                  <button
                    onClick={() => openBranchModal()}
                    className="bg-blue-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-1.5 sm:gap-2 text-xs sm:text-base"
                  >
                    <PlusIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                    Add Branch
                  </button>
                </div>

                {/* Branches by Course */}
                {courses.filter(course => course.isActive).map((course) => (
                  <div key={course._id} className="bg-white rounded-lg shadow-sm border p-3 sm:p-6 mb-3 sm:mb-4">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1.5 sm:gap-0 mb-2 sm:mb-4">
                      <h3 className="text-base sm:text-lg font-semibold text-blue-900">{course.name}</h3>
                      <span className="text-xs sm:text-sm text-gray-500">
                        {getBranchesForCourse(course._id).length} branches
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4">
                      {getBranchesForCourse(course._id).map((branch) => (
                        <div
                          key={branch._id}
                          className={`border rounded-lg p-2 sm:p-4 ${!branch.isActive ? 'opacity-60' : ''
                            }`}
                        >
                          <div className="flex justify-between items-start mb-1.5 sm:mb-2">
                            <div>
                              <h4 className="font-medium text-blue-900 text-sm sm:text-base">{branch.name}</h4>
                              <p className="text-xs sm:text-sm text-gray-500">Code: {branch.code}</p>
                            </div>
                            <div className="flex gap-1">
                              <button
                                onClick={() => openBranchModal(branch)}
                                className="text-blue-600 hover:text-blue-800"
                              >
                                <PencilIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteBranch(branch._id)}
                                className="text-red-600 hover:text-red-800"
                              >
                                <TrashIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                              </button>
                            </div>
                          </div>

                          {branch.description && (
                            <p className="text-xs sm:text-sm text-gray-600 mb-1.5 sm:mb-2">{branch.description}</p>
                          )}
                          <span className={`inline-block px-2 py-1 rounded-full text-xs ${branch.isActive
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                            }`}>
                            {branch.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </motion.div>
            )}

            {activeTab === 'academic-calendar' && (
              <motion.div
                key="academic-calendar"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-4 sm:space-y-6"
              >
                {/* Academic Calendar Header */}
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-0">
                  <div>
                    <h2 className="text-base sm:text-xl font-semibold text-blue-900">Academic Calendar</h2>
                    <p className="text-xs sm:text-gray-600">Manage semester dates for each course</p>
                  </div>
                  <button
                    onClick={() => openCalendarModal()}
                    className="bg-blue-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-1.5 sm:gap-2 text-xs sm:text-base"
                  >
                    <PlusIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                    Add Semester
                  </button>
                </div>

                {/* Academic Calendar Filters */}
                <div className="bg-white rounded-lg shadow-sm p-4">
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                    {/* Course Filter */}
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-gray-700 mb-1">Course</label>
                      <select
                        value={calendarFilters.courseId}
                        onChange={(e) => handleFilterChange('courseId', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">All Courses</option>
                        {courses.map((course) => (
                          <option key={course._id} value={course._id}>
                            {course.name} ({course.code})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Academic Year Filter */}
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-gray-700 mb-1">Academic Year</label>
                      <select
                        value={calendarFilters.academicYear}
                        onChange={(e) => handleFilterChange('academicYear', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">All Years</option>
                        {academicYears.map((year) => (
                          <option key={year} value={year}>
                            {year}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Year of Study Filter */}
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-gray-700 mb-1">Year of Study</label>
                      <select
                        value={calendarFilters.yearOfStudy}
                        onChange={(e) => handleFilterChange('yearOfStudy', e.target.value)}
                        disabled={!calendarFilters.courseId}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                      >
                        <option value="">
                          {calendarFilters.courseId ? 'All Years' : 'Select Course First'}
                        </option>
                        {calendarFilters.courseId && getAvailableYearsForCourse(calendarFilters.courseId).map((year) => (
                          <option key={year} value={year.toString()}>
                            Year {year}
                          </option>
                        ))}
                      </select>
                      {calendarFilters.courseId && (
                        <p className="mt-1 text-xs text-gray-500">
                          Available years: {getAvailableYearsForCourse(calendarFilters.courseId).join(', ')}
                        </p>
                      )}
                    </div>

                    {/* Semester Filter */}
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-gray-700 mb-1">Semester</label>
                      <select
                        value={calendarFilters.semester}
                        onChange={(e) => handleFilterChange('semester', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">All Semesters</option>
                        <option value="Semester 1">Semester 1</option>
                        <option value="Semester 2">Semester 2</option>
                      </select>
                    </div>

                    {/* Clear Filters Button */}
                    <div className="flex items-end">
                      <button
                        onClick={clearFilters}
                        className="px-3 py-2 text-xs font-medium text-gray-600 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  {/* Results Count */}
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-xs text-gray-600">
                      Showing {filteredAcademicCalendars.length} of {academicCalendars.length} entries
                    </p>
                  </div>
                </div>

                {/* Academic Calendar Table */}
                <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                  {filteredAcademicCalendars.length === 0 ? (
                    <div className="p-6 sm:p-8 text-center">
                      <CalendarIcon className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 text-gray-400" />
                      <p className="text-xs sm:text-sm">
                        {academicCalendars.length === 0 
                          ? 'No academic calendar entries found' 
                          : 'No entries match the current filters'
                        }
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Course
                            </th>
                            <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Academic Year
                            </th>
                            <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Year of Study
                            </th>
                            <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Semester
                            </th>
                            <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Start Date
                            </th>
                            <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              End Date
                            </th>
                            <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {filteredAcademicCalendars.map((calendar) => (
                            <tr key={calendar._id} className="hover:bg-gray-50">
                              <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                                <div className="text-xs sm:text-sm font-medium text-gray-900">
                                  {calendar.course?.name}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {calendar.course?.code}
                                </div>
                              </td>
                              <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                                {calendar.academicYear}
                              </td>
                              <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                  Year {calendar.yearOfStudy}
                                </span>
                              </td>
                              <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                  calendar.semester === 'Semester 1' 
                                    ? 'bg-blue-100 text-blue-800' 
                                    : 'bg-green-100 text-green-800'
                                }`}>
                                  {calendar.semester}
                                </span>
                              </td>
                              <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                                {new Date(calendar.startDate).toLocaleDateString()}
                              </td>
                              <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                                {new Date(calendar.endDate).toLocaleDateString()}
                              </td>
                              <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm font-medium">
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => openCalendarModal(calendar)}
                                    className="text-blue-600 hover:text-blue-900"
                                  >
                                    <PencilIcon className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteCalendar(calendar._id)}
                                    className="text-red-600 hover:text-red-900"
                                  >
                                    <TrashIcon className="h-4 w-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Course Modal */}
      <AnimatePresence>
        {showCourseModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-lg shadow-xl max-w-xs sm:max-w-md w-full p-3 sm:p-6"
            >
              <div className="flex justify-between items-center mb-4 sm:mb-6">
                <h3 className="text-base sm:text-lg font-semibold text-blue-900">
                  {editingCourse ? 'Edit Course' : 'Add New Course'}
                </h3>
                <button
                  onClick={() => setShowCourseModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-5 w-5 sm:h-6 sm:w-6" />
                </button>
              </div>

              <form onSubmit={handleCourseSubmit} className="space-y-3 sm:space-y-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    Course Name *
                  </label>
                  <input
                    type="text"
                    value={courseForm.name}
                    onChange={(e) => setCourseForm({ ...courseForm, name: e.target.value })}
                    className="w-full px-2.5 sm:px-3 py-2 text-xs sm:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    Course Code *
                  </label>
                  <input
                    type="text"
                    value={courseForm.code}
                    onChange={(e) => setCourseForm({ ...courseForm, code: e.target.value.toUpperCase() })}
                    className="w-full px-2.5 sm:px-3 py-2 text-xs sm:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={courseForm.description}
                    onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })}
                    rows="3"
                    className="w-full px-2.5 sm:px-3 py-2 text-xs sm:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                      Duration *
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={courseForm.duration}
                      onChange={(e) => setCourseForm({ ...courseForm, duration: e.target.value })}
                      className="w-full px-2.5 sm:px-3 py-2 text-xs sm:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                      Duration Unit
                    </label>
                    <select
                      value={courseForm.durationUnit}
                      onChange={(e) => setCourseForm({ ...courseForm, durationUnit: e.target.value })}
                      className="w-full px-2.5 sm:px-3 py-2 text-xs sm:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="years">Years</option>
                      <option value="semesters">Semesters</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-3 sm:pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCourseModal(false)}
                    className="flex-1 px-2.5 sm:px-4 py-2 border border-gray-300 rounded-md text-xs sm:text-base text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-2.5 sm:px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-xs sm:text-base"
                  >
                    {editingCourse ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Branch Modal */}
      <AnimatePresence>
        {showBranchModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-lg shadow-xl max-w-xs sm:max-w-md w-full p-3 sm:p-6"
            >
              <div className="flex justify-between items-center mb-4 sm:mb-6">
                <h3 className="text-base sm:text-lg font-semibold text-blue-900">
                  {editingBranch ? 'Edit Branch' : 'Add New Branch'}
                </h3>
                <button
                  onClick={() => setShowBranchModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-5 w-5 sm:h-6 sm:w-6" />
                </button>
              </div>

              <form onSubmit={handleBranchSubmit} className="space-y-3 sm:space-y-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    Course *
                  </label>
                  <select
                    value={branchForm.courseId}
                    onChange={(e) => setBranchForm({ ...branchForm, courseId: e.target.value })}
                    className="w-full px-2.5 sm:px-3 py-2 text-xs sm:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select a course</option>
                    {courses.filter(course => course.isActive).map((course) => (
                      <option key={course._id} value={course._id}>
                        {course.name} ({course.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    Branch Name *
                  </label>
                  <input
                    type="text"
                    value={branchForm.name}
                    onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })}
                    className="w-full px-2.5 sm:px-3 py-2 text-xs sm:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    Branch Code *
                  </label>
                  <input
                    type="text"
                    value={branchForm.code}
                    onChange={(e) => setBranchForm({ ...branchForm, code: e.target.value.toUpperCase() })}
                    className="w-full px-2.5 sm:px-3 py-2 text-xs sm:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={branchForm.description}
                    onChange={(e) => setBranchForm({ ...branchForm, description: e.target.value })}
                    rows="3"
                    className="w-full px-2.5 sm:px-3 py-2 text-xs sm:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-3 sm:pt-4">
                  <button
                    type="button"
                    onClick={() => setShowBranchModal(false)}
                    className="flex-1 px-2.5 sm:px-4 py-2 border border-gray-300 rounded-md text-xs sm:text-base text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-2.5 sm:px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-xs sm:text-base"
                  >
                    {editingBranch ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Academic Calendar Modal */}
      <AnimatePresence>
        {showCalendarModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-lg shadow-xl max-w-xs sm:max-w-md w-full p-3 sm:p-6"
            >
              <div className="flex justify-between items-center mb-4 sm:mb-6">
                <h3 className="text-base sm:text-lg font-semibold text-blue-900">
                  {editingCalendar ? 'Edit Academic Calendar' : 'Add New Semester'}
                </h3>
                <button
                  onClick={() => setShowCalendarModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-5 w-5 sm:h-6 sm:w-6" />
                </button>
              </div>

              <form onSubmit={handleCalendarSubmit} className="space-y-3 sm:space-y-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    Course *
                  </label>
                  <select
                    value={calendarForm.courseId}
                    onChange={(e) => {
                      const selectedCourseId = e.target.value;
                      setCalendarForm({ 
                        ...calendarForm, 
                        courseId: selectedCourseId,
                        yearOfStudy: '' // Reset year of study when course changes
                      });
                    }}
                    className="w-full px-2.5 sm:px-3 py-2 text-xs sm:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select a course</option>
                    {courses.filter(course => course.isActive).map((course) => (
                      <option key={course._id} value={course._id}>
                        {course.name} ({course.code}) - {course.duration} {course.durationUnit}
                      </option>
                    ))}
                  </select>
                </div>

                 <div>
                   <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                     Academic Year *
                   </label>
                   <select
                     value={calendarForm.academicYear}
                     onChange={(e) => setCalendarForm({ ...calendarForm, academicYear: e.target.value })}
                     className="w-full px-2.5 sm:px-3 py-2 text-xs sm:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                     required
                   >
                     <option value="">Select academic year</option>
                     {academicYears.map((year) => (
                       <option key={year} value={year}>
                         {year}
                       </option>
                     ))}
                   </select>
                 </div>

                 <div>
                   <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                     Year of Study *
                   </label>
                   <select
                     value={calendarForm.yearOfStudy}
                     onChange={(e) => setCalendarForm({ ...calendarForm, yearOfStudy: e.target.value })}
                     className="w-full px-2.5 sm:px-3 py-2 text-xs sm:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                     required
                     disabled={!calendarForm.courseId}
                   >
                     <option value="">
                       {calendarForm.courseId ? 'Select year of study' : 'Select a course first'}
                     </option>
                     {calendarForm.courseId && getAvailableYearsForCourse(calendarForm.courseId).map((year) => (
                       <option key={year} value={year}>
                         Year {year}
                       </option>
                     ))}
                   </select>
                   {calendarForm.courseId && (
                     <div className="text-xs text-gray-500 mt-1">
                       <p>Available years: {getAvailableYearsForCourse(calendarForm.courseId).join(', ')}</p>
                       {(() => {
                         const course = courses.find(c => c._id === calendarForm.courseId);
                         return course && (
                           <p className="mt-1 font-medium text-blue-600">
                             {course.name} - {course.duration} {course.durationUnit} course
                           </p>
                         );
                       })()}
                     </div>
                   )}
                 </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    Semester *
                  </label>
                  <select
                    value={calendarForm.semester}
                    onChange={(e) => setCalendarForm({ ...calendarForm, semester: e.target.value })}
                    className="w-full px-2.5 sm:px-3 py-2 text-xs sm:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select semester</option>
                    <option value="Semester 1">Semester 1</option>
                    <option value="Semester 2">Semester 2</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                      Start Date *
                    </label>
                    <input
                      type="date"
                      value={calendarForm.startDate}
                      onChange={(e) => setCalendarForm({ ...calendarForm, startDate: e.target.value })}
                      className="w-full px-2.5 sm:px-3 py-2 text-xs sm:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                      End Date *
                    </label>
                    <input
                      type="date"
                      value={calendarForm.endDate}
                      onChange={(e) => setCalendarForm({ ...calendarForm, endDate: e.target.value })}
                      className="w-full px-2.5 sm:px-3 py-2 text-xs sm:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-3 sm:pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCalendarModal(false)}
                    className="flex-1 px-2.5 sm:px-4 py-2 border border-gray-300 rounded-md text-xs sm:text-base text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-2.5 sm:px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-xs sm:text-base"
                  >
                    {editingCalendar ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default CourseManagement; 