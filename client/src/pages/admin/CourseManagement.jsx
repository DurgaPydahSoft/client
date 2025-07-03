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
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import LoadingSpinner from '../../components/LoadingSpinner';
import SEO from '../../components/SEO';

const CourseManagement = () => {
  const [activeTab, setActiveTab] = useState('courses');
  const [courses, setCourses] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [editingBranch, setEditingBranch] = useState(null);
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

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
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

  const getBranchesForCourse = (courseId) => {
    return branches.filter(branch => branch.course._id === courseId);
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <>
      <SEO title="Course Management" description="Manage courses and branches dynamically" />
      
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Course & Branch Management
            </h1>
            <p className="text-gray-600">
              Manage academic courses and their branches dynamically
            </p>
          </div>

          {/* Tab Navigation */}
          <div className="mb-6">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                {[
                  { id: 'courses', label: 'Courses', icon: AcademicCapIcon },
                  { id: 'branches', label: 'Branches', icon: AcademicCapIcon }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <tab.icon className="h-5 w-5" />
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
                className="space-y-6"
              >
                {/* Courses Header */}
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Courses</h2>
                    <p className="text-gray-600">Manage academic courses and their configurations</p>
                  </div>
                  <button
                    onClick={() => openCourseModal()}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
                  >
                    <PlusIcon className="h-5 w-5" />
                    Add Course
                  </button>
                </div>

                {/* Courses Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {courses.map((course) => (
                    <div
                      key={course._id}
                      className={`bg-white rounded-lg shadow-sm border p-6 ${
                        !course.isActive ? 'opacity-60' : ''
                      }`}
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{course.name}</h3>
                          <p className="text-sm text-gray-500">Code: {course.code}</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => openCourseModal(course)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <PencilIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDeleteCourse(course._id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        {course.description && (
                          <p className="text-sm text-gray-600">{course.description}</p>
                        )}
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span>Duration: {course.duration} {course.durationUnit}</span>
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            course.isActive 
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
                className="space-y-6"
              >
                {/* Branches Header */}
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Branches</h2>
                    <p className="text-gray-600">Manage branches for each course</p>
                  </div>
                  <button
                    onClick={() => openBranchModal()}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
                  >
                    <PlusIcon className="h-5 w-5" />
                    Add Branch
                  </button>
                </div>

                {/* Branches by Course */}
                {courses.filter(course => course.isActive).map((course) => (
                  <div key={course._id} className="bg-white rounded-lg shadow-sm border p-6">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">{course.name}</h3>
                      <span className="text-sm text-gray-500">
                        {getBranchesForCourse(course._id).length} branches
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {getBranchesForCourse(course._id).map((branch) => (
                        <div
                          key={branch._id}
                          className={`border rounded-lg p-4 ${
                            !branch.isActive ? 'opacity-60' : ''
                          }`}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h4 className="font-medium text-gray-900">{branch.name}</h4>
                              <p className="text-sm text-gray-500">Code: {branch.code}</p>
                            </div>
                            <div className="flex gap-1">
                              <button
                                onClick={() => openBranchModal(branch)}
                                className="text-blue-600 hover:text-blue-800"
                              >
                                <PencilIcon className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteBranch(branch._id)}
                                className="text-red-600 hover:text-red-800"
                              >
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                          
                          {branch.description && (
                            <p className="text-sm text-gray-600 mb-2">{branch.description}</p>
                          )}
                          
                          <span className={`inline-block px-2 py-1 rounded-full text-xs ${
                            branch.isActive 
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
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  {editingCourse ? 'Edit Course' : 'Add New Course'}
                </h3>
                <button
                  onClick={() => setShowCourseModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleCourseSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Course Name *
                  </label>
                  <input
                    type="text"
                    value={courseForm.name}
                    onChange={(e) => setCourseForm({ ...courseForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Course Code *
                  </label>
                  <input
                    type="text"
                    value={courseForm.code}
                    onChange={(e) => setCourseForm({ ...courseForm, code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={courseForm.description}
                    onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })}
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Duration *
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={courseForm.duration}
                      onChange={(e) => setCourseForm({ ...courseForm, duration: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Duration Unit
                    </label>
                    <select
                      value={courseForm.durationUnit}
                      onChange={(e) => setCourseForm({ ...courseForm, durationUnit: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="years">Years</option>
                      <option value="semesters">Semesters</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCourseModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
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
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  {editingBranch ? 'Edit Branch' : 'Add New Branch'}
                </h3>
                <button
                  onClick={() => setShowBranchModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleBranchSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Course *
                  </label>
                  <select
                    value={branchForm.courseId}
                    onChange={(e) => setBranchForm({ ...branchForm, courseId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Branch Name *
                  </label>
                  <input
                    type="text"
                    value={branchForm.name}
                    onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Branch Code *
                  </label>
                  <input
                    type="text"
                    value={branchForm.code}
                    onChange={(e) => setBranchForm({ ...branchForm, code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={branchForm.description}
                    onChange={(e) => setBranchForm({ ...branchForm, description: e.target.value })}
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowBranchModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    {editingBranch ? 'Update' : 'Create'}
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