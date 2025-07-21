import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/axios';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import LoadingSpinner from '../../components/LoadingSpinner';
import { PhotoIcon, XCircleIcon } from '@heroicons/react/24/outline';

const CATEGORIES = [
  { value: 'Canteen', label: 'Canteen' },
  { value: 'Internet', label: 'Internet' },
  { value: 'Maintenance', label: 'Maintenance' },
  { value: 'Others', label: 'Others' }
];

const MAINTENANCE_SUBCATEGORIES = [
  { value: 'Housekeeping', label: 'Housekeeping' },
  { value: 'Plumbing', label: 'Plumbing' },
  { value: 'Electricity', label: 'Electricity' }
];

const RaiseComplaint = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    category: '',
    subCategory: '',
    description: ''
  });
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [aiProcessing, setAiProcessing] = useState(false);

  const validateForm = () => {
    const newErrors = {};
    
    if (!form.category) {
      newErrors.category = 'Please select a category';
    }
    
    if (form.category === 'Maintenance' && !form.subCategory) {
      newErrors.subCategory = 'Please select a maintenance type';
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
      formData.append('category', form.category);
      formData.append('subCategory', form.subCategory);
      formData.append('description', form.description);
      if (image) {
        formData.append('image', image);
      }

      const response = await api.post('/api/complaints', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      if (response.data.success) {
        if (response.data.data.aiProcessing) {
          // Show AI processing state
          setAiProcessing(true);
          toast.success('Complaint submitted! AI is finding the best person to help you...');
          
          // Poll for AI completion
          pollAIProcessing(response.data.data._id);
        } else {
        toast.success('Complaint submitted successfully');
        setForm({ category: '', subCategory: '', description: '' });
        setImage(null);
        setImagePreview(null);
        
        // Dispatch event to notify other components
        window.dispatchEvent(new Event('complaint-submitted'));
        
        // Wait a bit before redirecting to ensure the complaint is saved
        setTimeout(() => {
          navigate('/student/my-complaints');
        }, 1000);
        }
      }
    } catch (err) {
      console.error('Error submitting complaint:', err);
      if (err.response?.status === 401) {
        toast.error('Your session has expired. Please log in again.');
        // The axios interceptor will handle the redirect
      } else {
        const errorMessage = err.response?.data?.message || 'Failed to submit complaint. Please try again.';
        toast.error(errorMessage);
        // Set server validation errors if any
        if (err.response?.data?.errors) {
          setErrors(err.response.data.errors);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const pollAIProcessing = async (complaintId) => {
    const interval = setInterval(async () => {
      try {
        const response = await api.get(`/api/complaints/${complaintId}`);
        if (response.data.data.aiProcessed) {
          clearInterval(interval);
          setAiProcessing(false);
          toast.success('Complaint assigned! Check your complaints for updates.');
          navigate('/student/my-complaints');
        }
      } catch (error) {
        clearInterval(interval);
        setAiProcessing(false);
        toast.error('AI processing failed. Admin will handle manually.');
        navigate('/student/my-complaints');
      }
    }, 2000); // Poll every 2 seconds
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-6 mt-12 sm:mt-0">
      <div className="flex items-center gap-4 mb-8">
        <div className="p-3 bg-gradient-to-r from-blue-600 to-blue-800 rounded-2xl shadow-lg shadow-blue-100">
          <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-900 to-blue-700 bg-clip-text text-transparent">
            Raise a Complaint
          </h2>
          <p className="text-gray-600 text-sm mt-1">Submit your complaints and concerns</p>
        </div>
      </div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden"
      >
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Category Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type of Issue
              </label>
              <select
                name="category"
                value={form.category}
                onChange={e => setForm({ ...form, category: e.target.value, subCategory: '' })}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${
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
                <p className="mt-1 text-sm text-red-600">{errors.category}</p>
              )}
            </div>

            {/* Sub-category Selection (only for Maintenance) */}
            {form.category === 'Maintenance' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Maintenance Type
                </label>
                <select
                  name="subCategory"
                  value={form.subCategory}
                  onChange={e => setForm({ ...form, subCategory: e.target.value })}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${
                    errors.subCategory ? 'border-red-500' : 'border-gray-300'
                  }`}
                  required
                >
                  <option value="">Select maintenance type</option>
                  {MAINTENANCE_SUBCATEGORIES.map(sub => (
                    <option key={sub.value} value={sub.value}>
                      {sub.label}
                    </option>
                  ))}
                </select>
                {errors.subCategory && (
                  <p className="mt-1 text-sm text-red-600">{errors.subCategory}</p>
                )}
              </div>
            )}

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
                <span className="text-gray-500 text-xs ml-2">
                  ({form.description.length}/1000 characters)
                </span>
              </label>
              <textarea
                name="description"
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                rows="4"
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${
                  errors.description ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Please describe your issue in detail (minimum 10 characters)..."
                required
                maxLength={1000}
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600">{errors.description}</p>
              )}
            </div>

            {/* Image Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Image (Optional)
              </label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg">
                <div className="space-y-1 text-center">
                  {imagePreview ? (
                    <div className="relative">
                      <img src={imagePreview} alt="Preview" className="mx-auto h-32 w-auto object-cover rounded-lg" />
                      <button
                        type="button"
                        onClick={() => {
                          setImage(null);
                          setImagePreview(null);
                        }}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <XCircleIcon className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <PhotoIcon className="mx-auto h-12 w-12 text-gray-400" />
                      <div className="flex text-sm text-gray-600">
                        <label
                          htmlFor="image-upload"
                          className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
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
                        <p className="pl-1">or drag and drop</p>
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
                className={`px-6 py-2 rounded-lg text-white font-medium transition-all duration-200 ${
                  loading 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg'
                }`}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <LoadingSpinner size="sm" />
                    Submitting...
                  </span>
                ) : (
                  'Submit Complaint'
                )}
              </button>
            </div>
          </form>
        </div>
        
        <div className="bg-gray-50 px-8 py-4 border-t border-gray-200">
          <div className="flex items-center text-sm text-gray-600">
            <svg className="w-4 h-4 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Your complaints will be addressed within 24-48 hours
          </div>
        </div>
      </motion.div>

      {/* AI Processing Overlay */}
      {aiProcessing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 text-center max-w-md mx-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h3 className="text-lg font-semibold mb-2">AI Processing Your Request</h3>
            <p className="text-gray-600">
              Please wait, we are processing your request and finding the best person to resolve your issue...
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default RaiseComplaint;