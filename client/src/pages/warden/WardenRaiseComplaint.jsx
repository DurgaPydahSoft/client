import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/axios';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import LoadingSpinner from '../../components/LoadingSpinner';
import SEO from '../../components/SEO';
import { PhotoIcon, XCircleIcon, UserIcon, BuildingOfficeIcon } from '@heroicons/react/24/outline';

const CATEGORIES = [
  { value: 'Canteen', label: 'Canteen' },
  { value: 'Internet', label: 'Internet' },
  { value: 'Maintenance', label: 'Maintenance' },
  { value: 'Common Facilities', label: 'Common Facilities' },
  { value: 'Others', label: 'Others' }
];

const MAINTENANCE_SUBCATEGORIES = [
  { value: 'Housekeeping', label: 'Housekeeping' },
  { value: 'Plumbing', label: 'Plumbing' },
  { value: 'Electricity', label: 'Electricity' }
];

const COMMON_FACILITIES_SUBCATEGORIES = [
  { value: 'Laundry', label: 'Laundry' },
  { value: 'Recreation', label: 'Recreation' },
  { value: 'Study Room', label: 'Study Room' },
  { value: 'Dining Hall', label: 'Dining Hall' },
  { value: 'Security', label: 'Security' }
];

const WardenRaiseComplaint = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    complaintType: 'student', // 'student' or 'facility'
    studentId: '',
    category: '',
    subCategory: '',
    description: '',
    priority: 'medium'
  });
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [aiProcessing, setAiProcessing] = useState(false);
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    setLoadingStudents(true);
    try {
      const response = await api.get('/api/admin/students?limit=1000');
      if (response.data.success) {
        setStudents(response.data.data.students || []);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
      toast.error('Failed to load students');
    } finally {
      setLoadingStudents(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (form.complaintType === 'student' && !form.studentId) {
      newErrors.studentId = 'Please select a student';
    }
    
    if (!form.category) {
      newErrors.category = 'Please select a category';
    }
    
    if ((form.category === 'Maintenance' || form.category === 'Common Facilities') && !form.subCategory) {
      newErrors.subCategory = 'Please select a sub-category';
    }
    
    if (!form.description.trim()) {
      newErrors.description = 'Please provide a description';
    } else if (form.description.trim().length < 10) {
      newErrors.description = 'Description must be at least 10 characters long';
    } else if (form.description.trim().length > 1000) {
      newErrors.description = 'Description cannot exceed 1000 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleImageChange = e => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size should be less than 5MB');
        return;
      }
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!user) {
      toast.error('Please log in to submit a complaint');
      navigate('/login');
      return;
    }

    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('complaintType', form.complaintType);
      if (form.complaintType === 'student') {
        formData.append('studentId', form.studentId);
      }
      formData.append('category', form.category);
      formData.append('subCategory', form.subCategory);
      formData.append('description', form.description);
      formData.append('priority', form.priority);
      formData.append('raisedBy', 'warden');
      if (image) {
        formData.append('image', image);
      }

      const response = await api.post('/api/complaints/warden', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        toast.success('Complaint submitted successfully!');
        
        // Start AI processing
        setAiProcessing(true);
        await pollAIProcessing(response.data.data._id);
        
        // Reset form
        setForm({
          complaintType: 'student',
          studentId: '',
          category: '',
          subCategory: '',
          description: '',
          priority: 'medium'
        });
        setImage(null);
        setImagePreview(null);
        setErrors({});
        
        // Navigate to view complaints
        navigate('/warden/dashboard/complaints/view');
      } else {
        toast.error(response.data.message || 'Failed to submit complaint');
      }
    } catch (error) {
      console.error('Error submitting complaint:', error);
      toast.error(error.response?.data?.message || 'Failed to submit complaint');
    } finally {
      setLoading(false);
    }
  };

  const pollAIProcessing = async (complaintId) => {
    try {
      const response = await api.get(`/api/complaints/${complaintId}/ai-status`);
      if (response.data.success && response.data.data.status === 'completed') {
        setAiProcessing(false);
        toast.success('AI processing completed!');
      } else {
        // Continue polling
        setTimeout(() => pollAIProcessing(complaintId), 2000);
      }
    } catch (error) {
      console.error('Error polling AI status:', error);
      setAiProcessing(false);
    }
  };

  const getSubCategories = () => {
    if (form.category === 'Maintenance') {
      return MAINTENANCE_SUBCATEGORIES;
    } else if (form.category === 'Common Facilities') {
      return COMMON_FACILITIES_SUBCATEGORIES;
    }
    return [];
  };

  if (loadingStudents) {
    return <LoadingSpinner />;
  }

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-8 mt-12 sm:mt-0">
      <SEO title="Raise Complaint - Warden" />
      
      {/* Header */}
      <div className="mb-4 sm:mb-6 lg:mb-8">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-green-900 to-green-700 bg-clip-text text-transparent">
          Raise Complaint
        </h1>
        <p className="text-gray-600 mt-1 sm:mt-2 text-xs sm:text-sm lg:text-base">
          Report issues on behalf of students or common facility problems
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-green-800 px-3 sm:px-4 lg:px-8 py-3 sm:py-4 lg:py-6">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <BuildingOfficeIcon className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-white" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg lg:text-xl font-semibold text-white">Warden Complaint Form</h2>
              <p className="text-green-100 text-xs sm:text-sm">
                Submit complaints for students or report common facility issues
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="p-3 sm:p-4 lg:p-8">
          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4 lg:space-y-6">
            {/* Complaint Type Selection */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                Complaint Type
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 lg:gap-4">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, complaintType: 'student', studentId: '' })}
                  className={`p-2 sm:p-3 lg:p-4 rounded-lg border-2 transition-all duration-200 ${
                    form.complaintType === 'student'
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <div className="flex items-center gap-1.5 sm:gap-2 lg:gap-3">
                    <UserIcon className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5" />
                    <div className="text-left">
                      <div className="font-medium text-xs sm:text-sm lg:text-base">Student Complaint</div>
                      <div className="text-xs text-gray-500">On behalf of a student</div>
                    </div>
                  </div>
                </button>
                
                <button
                  type="button"
                  onClick={() => setForm({ ...form, complaintType: 'facility', studentId: '' })}
                  className={`p-2 sm:p-3 lg:p-4 rounded-lg border-2 transition-all duration-200 ${
                    form.complaintType === 'facility'
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <div className="flex items-center gap-1.5 sm:gap-2 lg:gap-3">
                    <BuildingOfficeIcon className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5" />
                    <div className="text-left">
                      <div className="font-medium text-xs sm:text-sm lg:text-base">Facility Issue</div>
                      <div className="text-xs text-gray-500">Common facility problem</div>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Student Selection (only for student complaints) */}
            {form.complaintType === 'student' && (
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                  Select Student
                </label>
                <select
                  value={form.studentId}
                  onChange={e => setForm({ ...form, studentId: e.target.value })}
                  className={`w-full px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 text-xs sm:text-sm ${
                    errors.studentId ? 'border-red-500' : 'border-gray-300'
                  }`}
                  required
                >
                  <option value="">Select a student</option>
                  {students.map(student => (
                    <option key={student._id} value={student._id}>
                      {student.name} - {student.rollNumber} ({student.roomNumber || 'No Room'})
                    </option>
                  ))}
                </select>
                {errors.studentId && (
                  <p className="mt-1 text-xs sm:text-sm text-red-600">{errors.studentId}</p>
                )}
              </div>
            )}

            {/* Priority Selection */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                Priority Level
              </label>
              <select
                value={form.priority}
                onChange={e => setForm({ ...form, priority: e.target.value })}
                className="w-full px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 text-xs sm:text-sm"
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            {/* Category Selection */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                Category
              </label>
              <select
                value={form.category}
                onChange={e => {
                  setForm({ ...form, category: e.target.value, subCategory: '' });
                }}
                className={`w-full px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 text-xs sm:text-sm ${
                  errors.category ? 'border-red-500' : 'border-gray-300'
                }`}
                required
              >
                <option value="">Select a category</option>
                {CATEGORIES.map(category => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
              {errors.category && (
                <p className="mt-1 text-xs sm:text-sm text-red-600">{errors.category}</p>
              )}
            </div>

            {/* Sub-category Selection */}
            {getSubCategories().length > 0 && (
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                  {form.category === 'Maintenance' ? 'Maintenance Type' : 'Facility Type'}
                </label>
                <select
                  value={form.subCategory}
                  onChange={e => setForm({ ...form, subCategory: e.target.value })}
                  className={`w-full px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 text-xs sm:text-sm ${
                    errors.subCategory ? 'border-red-500' : 'border-gray-300'
                  }`}
                  required
                >
                  <option value="">Select {form.category === 'Maintenance' ? 'maintenance type' : 'facility type'}</option>
                  {getSubCategories().map(sub => (
                    <option key={sub.value} value={sub.value}>
                      {sub.label}
                    </option>
                  ))}
                </select>
                {errors.subCategory && (
                  <p className="mt-1 text-xs sm:text-sm text-red-600">{errors.subCategory}</p>
                )}
              </div>
            )}

            {/* Description */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                Description
                <span className="text-gray-500 text-xs ml-1 sm:ml-2">
                  ({form.description.length}/1000 characters)
                </span>
              </label>
              <textarea
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                rows="3"
                className={`w-full px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 text-xs sm:text-sm ${
                  errors.description ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Please describe the issue in detail (minimum 10 characters)..."
                required
                maxLength={1000}
              />
              {errors.description && (
                <p className="mt-1 text-xs sm:text-sm text-red-600">{errors.description}</p>
              )}
            </div>

            {/* Image Upload */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                Image (Optional)
              </label>
              <div className="mt-1 flex justify-center px-3 sm:px-4 lg:px-6 pt-3 sm:pt-4 lg:pt-5 pb-4 sm:pb-5 lg:pb-6 border-2 border-gray-300 border-dashed rounded-lg">
                <div className="space-y-1 text-center">
                  {imagePreview ? (
                    <div className="relative">
                      <img src={imagePreview} alt="Preview" className="mx-auto h-24 sm:h-28 lg:h-32 w-auto object-cover rounded-lg" />
                      <button
                        type="button"
                        onClick={() => {
                          setImage(null);
                          setImagePreview(null);
                        }}
                        className="absolute -top-1 sm:-top-2 -right-1 sm:-right-2 bg-red-500 text-white rounded-full p-0.5 sm:p-1 hover:bg-red-600"
                      >
                        <XCircleIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <PhotoIcon className="mx-auto h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 text-gray-400" />
                      <div className="flex flex-col sm:flex-row text-xs sm:text-sm text-gray-600">
                        <label
                          htmlFor="image-upload"
                          className="relative cursor-pointer bg-white rounded-md font-medium text-green-600 hover:text-green-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-green-500"
                        >
                          <span>Upload an image</span>
                          <input
                            id="image-upload"
                            name="image"
                            type="file"
                            accept="image/*"
                            className="sr-only"
                            onChange={handleImageChange}
                          />
                        </label>
                        <p className="sm:pl-1">or drag and drop</p>
                      </div>
                      <p className="text-xs text-gray-500">PNG, JPG, GIF up to 5MB</p>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className={`px-3 sm:px-4 lg:px-6 py-1.5 sm:py-2 lg:py-3 rounded-lg text-white font-medium transition-all duration-200 text-xs sm:text-sm lg:text-base ${
                  loading 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-green-600 hover:bg-green-700 shadow-md hover:shadow-lg'
                }`}
              >
                {loading ? (
                  <span className="flex items-center gap-1 sm:gap-2">
                    <LoadingSpinner size="sm" />
                    <span className="hidden sm:inline">Submitting...</span>
                    <span className="sm:hidden">Submitting</span>
                  </span>
                ) : (
                  <>
                    <span className="hidden sm:inline">Submit Complaint</span>
                    <span className="sm:hidden">Submit</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
        
        <div className="bg-gray-50 px-4 sm:px-8 py-3 sm:py-4 border-t border-gray-200">
          <div className="flex items-center text-xs sm:text-sm text-gray-600">
            <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0 1 18 0z" />
            </svg>
            Complaints will be addressed within 24-48 hours
          </div>
        </div>
      </motion.div>

      {/* AI Processing Overlay */}
      {aiProcessing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-4 sm:p-8 text-center max-w-md mx-4">
            <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
            <h3 className="text-base sm:text-lg font-semibold mb-2">AI Processing Your Request</h3>
            <p className="text-gray-600 text-sm sm:text-base">
              Please wait, we are processing your request and finding the best person to resolve your issue...
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default WardenRaiseComplaint; 