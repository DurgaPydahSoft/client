import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { motion } from 'framer-motion';
import api from '../../utils/axios';
import toast from 'react-hot-toast';
import LoadingSpinner from '../../components/LoadingSpinner';
import { 
  LockClosedIcon, 
  EyeIcon, 
  EyeSlashIcon,
  XMarkIcon,
  KeyIcon,
  PhotoIcon,
  CameraIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';

const Profile = () => {
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [year, setYear] = useState(user?.year || '');
  const [saving, setSaving] = useState(false);
  
  // Password reset states
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Photo upload states
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [studentPhoto, setStudentPhoto] = useState(null);
  const [guardianPhoto1, setGuardianPhoto1] = useState(null);
  const [guardianPhoto2, setGuardianPhoto2] = useState(null);
  const [studentPhotoPreview, setStudentPhotoPreview] = useState(null);
  const [guardianPhoto1Preview, setGuardianPhoto1Preview] = useState(null);
  const [guardianPhoto2Preview, setGuardianPhoto2Preview] = useState(null);

  useEffect(() => {
    if (user) {
      setLoading(false);
    }
  }, [user]);

  const handleYearChange = async () => {
    if (!year || year === user?.year) return;
    
    setSaving(true);
    try {
      const res = await api.put(`/api/student/profile`, { year });
      if (res.data.success) {
        toast.success('Year updated successfully');
        setEditing(false);
        // Update the user context with new year
        user.year = year;
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update year');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    
    // Validation
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    
    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters long');
      return;
    }
    
    if (currentPassword === newPassword) {
      toast.error('New password must be different from current password');
      return;
    }

    setPasswordLoading(true);
    try {
      const res = await api.post('/api/auth/student/reset-password', { 
        currentPassword, 
        newPassword 
      });

      if (res.data.success) {
        const { token: newToken, student } = res.data.data;
        
        // Update localStorage and AuthContext
        localStorage.setItem('token', newToken);
        const updatedUser = {
          ...user,
          ...student,
          isPasswordChanged: true
        };
        updateUser(updatedUser);

        // Show success message
        toast.success('Password updated successfully!');
        
        // Reset form and close modal
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setShowPasswordModal(false);
      } else {
        throw new Error(res.data.message || 'Failed to update password');
      }
    } catch (err) {
      console.error('Password reset error:', err);
      toast.error(err.response?.data?.message || 'Failed to update password');
    } finally {
      setPasswordLoading(false);
    }
  };

  const resetPasswordForm = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
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

  const handlePhotoUpload = async (e) => {
    e.preventDefault();
    
    if (!studentPhoto && !guardianPhoto1 && !guardianPhoto2) {
      toast.error('Please select at least one photo to upload');
      return;
    }

    setPhotoLoading(true);
    try {
      const formData = new FormData();
      if (studentPhoto) {
        formData.append('studentPhoto', studentPhoto);
      }
      if (guardianPhoto1) {
        formData.append('guardianPhoto1', guardianPhoto1);
      }
      if (guardianPhoto2) {
        formData.append('guardianPhoto2', guardianPhoto2);
      }

      const res = await api.put('/api/students/profile/photos', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (res.data.success) {
        toast.success('Profile photos updated successfully!');
        
        // Update user context with new photo URLs
        const updatedUser = {
          ...user,
          studentPhoto: res.data.data.studentPhoto || user.studentPhoto,
          guardianPhoto1: res.data.data.guardianPhoto1 || user.guardianPhoto1,
          guardianPhoto2: res.data.data.guardianPhoto2 || user.guardianPhoto2
        };
        updateUser(updatedUser);
        
        // Reset form and close modal
        resetPhotoForm();
        setShowPhotoModal(false);
      } else {
        throw new Error(res.data.message || 'Failed to update photos');
      }
    } catch (err) {
      console.error('Photo upload error:', err);
      toast.error(err.response?.data?.message || 'Failed to update photos');
    } finally {
      setPhotoLoading(false);
    }
  };

  // Helper functions to safely get course and branch names
  const getCourseName = (course) => {
    if (!course) return 'N/A';
    if (typeof course === 'object' && course.name) return course.name;
    if (typeof course === 'string' && course.length === 24) return 'N/A'; // likely ObjectId
    if (typeof course === 'string') return course;
    return 'N/A';
  };
  const getBranchName = (branch) => {
    if (!branch) return 'N/A';
    if (typeof branch === 'object' && branch.name) return branch.name;
    if (typeof branch === 'string' && branch.length === 24) return 'N/A'; // likely ObjectId
    if (typeof branch === 'string') return branch;
    return 'N/A';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8"
    >
      {/* Hero Header Section */}
      <div className="relative mb-6 sm:mb-8">
        <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 rounded-2xl p-6 sm:p-8 text-white shadow-xl overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full -mr-16 -mt-16"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white rounded-full -ml-12 -mb-12"></div>
          </div>
          
          <div className="relative flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
            {/* Profile Photo */}
            <div className="relative">
            {user?.studentPhoto ? (
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border-4 border-white/30 shadow-2xl ring-4 ring-white/20">
                <img
                  src={user.studentPhoto}
                  alt={user?.name}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-white/20 to-white/10 flex items-center justify-center text-white text-3xl sm:text-4xl font-bold shadow-2xl ring-4 ring-white/20 backdrop-blur-sm">
                {user?.name?.charAt(0).toUpperCase()}
              </div>
            )}
            <button
              onClick={() => {
                resetPhotoForm();
                setShowPhotoModal(true);
              }}
                className="absolute -bottom-2 -right-2 p-2 bg-white text-blue-600 rounded-full hover:bg-blue-50 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-110"
            >
                <CameraIcon className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
            
            {/* Profile Info */}
            <div className="flex-1 text-center sm:text-left">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 text-white">
                {user?.name}
              </h1>
              <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 text-blue-100">
                <span className="px-3 py-1 bg-white/20 rounded-full text-sm font-medium backdrop-blur-sm">
                  {user?.rollNumber}
                </span>
                <span className="px-3 py-1 bg-white/20 rounded-full text-sm font-medium backdrop-blur-sm">
                  {getCourseName(user?.course)}
                </span>
                <span className="px-3 py-1 bg-white/20 rounded-full text-sm font-medium backdrop-blur-sm">
                  Year {user?.year || 'N/A'}
                </span>
              </div>
            </div>
          </div>
          </div>
        </div>

        {/* Main Content Container */}
        <div className="max-w-6xl mx-auto">
        {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {/* Personal Information Card */}
          <div className="bg-white rounded-2xl shadow-lg p-5 sm:p-6 border border-gray-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Personal Information</h3>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                <span className="text-sm font-medium text-gray-600">Name</span>
                <span className="text-sm font-semibold text-gray-900">{user?.name}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                <span className="text-sm font-medium text-gray-600">Roll Number</span>
                <span className="text-sm font-semibold text-gray-900">{user?.rollNumber}</span>
            </div>
              <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                <span className="text-sm font-medium text-gray-600">Hostel ID</span>
                <span className="text-sm font-semibold text-gray-900">{user?.hostelId || 'Not assigned'}</span>
            </div>
              <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                <span className="text-sm font-medium text-gray-600">Gender</span>
                <span className="text-sm font-semibold text-gray-900">{user?.gender || 'Not specified'}</span>
            </div>
            </div>
          </div>

          {/* Academic Information Card */}
          <div className="bg-white rounded-2xl shadow-lg p-5 sm:p-6 border border-gray-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 5.477 5.754 5 7.5 5s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.523 18.246 19 16.5 19c-1.746 0-3.332-.477-4.5-1.253" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Academic Details</h3>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-100">
                <span className="text-sm font-medium text-gray-600">Course</span>
                <span className="text-sm font-semibold text-gray-900">{getCourseName(user?.course)}</span>
            </div>
              <div className="flex items-center justify-between p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-100">
                <span className="text-sm font-medium text-gray-600">Branch</span>
                <span className="text-sm font-semibold text-gray-900">{getBranchName(user?.branch)}</span>
            </div>
              <div className="flex items-center justify-between p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-100">
                <span className="text-sm font-medium text-gray-600">Year</span>
                <span className="text-sm font-semibold text-gray-900">Year {user?.year || 'Not specified'}</span>
                </div>
              <div className="flex items-center justify-between p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-100">
                <span className="text-sm font-medium text-gray-600">Category</span>
                <span className="text-sm font-semibold text-gray-900">
                  {user?.category === 'A+' ? 'A+ (AC)' : user?.category === 'B+' ? 'B+ (AC)' : user?.category || 'Not specified'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Contact & Additional Information */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {/* Contact Information Card */}
          <div className="bg-white rounded-2xl shadow-lg p-5 sm:p-6 border border-gray-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-purple-100 rounded-lg">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Contact Information</h3>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-100">
                <span className="text-sm font-medium text-gray-600">Student Phone</span>
                <span className="text-sm font-semibold text-gray-900 break-all">{user?.studentPhone || 'Not provided'}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-100">
                <span className="text-sm font-medium text-gray-600">Parent Phone</span>
                <span className="text-sm font-semibold text-gray-900 break-all">{user?.parentPhone || 'Not provided'}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-100">
                <span className="text-sm font-medium text-gray-600">Room Number</span>
                <span className="text-sm font-semibold text-gray-900">Room {user?.roomNumber || 'Not assigned'}</span>
              </div>
            </div>
          </div>

          {/* Additional Details Card */}
          <div className="bg-white rounded-2xl shadow-lg p-5 sm:p-6 border border-gray-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-orange-100 rounded-lg">
                <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
          </div>
              <h3 className="text-lg font-semibold text-gray-900">Additional Details</h3>
        </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl border border-orange-100">
                <span className="text-sm font-medium text-gray-600">Batch</span>
                <span className="text-sm font-semibold text-gray-900">{user?.batch || 'Not specified'}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl border border-orange-100">
                <span className="text-sm font-medium text-gray-600">Academic Year</span>
                <span className="text-sm font-semibold text-gray-900">{user?.academicYear || 'Not specified'}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl border border-orange-100">
                <span className="text-sm font-medium text-gray-600">Status</span>
                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                  Active
                </span>
              </div>
          </div>
          </div>
        </div>

        {/* Photo Gallery Section */}
        <div className="mt-8 sm:mt-10 pt-6 sm:pt-8 border-t border-gray-200">
          <div className="text-center mb-6 sm:mb-8">
            <div className="flex items-center justify-center gap-3 mb-3">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <PhotoIcon className="w-5 h-5 text-indigo-600" />
              </div>
              <h3 className="text-xl sm:text-2xl font-semibold text-gray-900">Photo Gallery</h3>
            </div>
            <p className="text-sm text-gray-600">Guardian photos and additional images</p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            {/* Guardian Photo 1 */}
            <div className="bg-white rounded-2xl shadow-lg p-5 sm:p-6 border border-gray-100 hover:shadow-xl transition-all duration-300">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <h4 className="text-lg font-semibold text-gray-900">Guardian Photo 1</h4>
              </div>
              
              {user?.guardianPhoto1 ? (
                <div className="relative aspect-square overflow-hidden rounded-xl border-2 border-blue-100 shadow-lg group">
                  <img
                    src={user.guardianPhoto1}
                    alt="Guardian 1"
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </div>
              ) : (
                <div className="aspect-square bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border-2 border-dashed border-blue-200 flex flex-col items-center justify-center text-blue-400 hover:border-blue-300 transition-colors duration-300">
                  <PhotoIcon className="w-12 h-12 mb-2" />
                  <p className="text-sm font-medium">No Photo</p>
                </div>
              )}
            </div>

            {/* Guardian Photo 2 */}
            <div className="bg-white rounded-2xl shadow-lg p-5 sm:p-6 border border-gray-100 hover:shadow-xl transition-all duration-300">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-green-100 rounded-lg">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <h4 className="text-lg font-semibold text-gray-900">Guardian Photo 2</h4>
              </div>
              
              {user?.guardianPhoto2 ? (
                <div className="relative aspect-square overflow-hidden rounded-xl border-2 border-green-100 shadow-lg group">
                  <img
                    src={user.guardianPhoto2}
                    alt="Guardian 2"
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </div>
              ) : (
                <div className="aspect-square bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border-2 border-dashed border-green-200 flex flex-col items-center justify-center text-green-400 hover:border-green-300 transition-colors duration-300">
                  <PhotoIcon className="w-12 h-12 mb-2" />
                  <p className="text-sm font-medium">No Photo</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Change Password Section - Moved to bottom */}
        <div className="mt-8 sm:mt-10 pt-6 sm:pt-8 border-t border-gray-200">
          <div className="text-center">
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">Account Security</h3>
            <p className="text-sm text-gray-600 mb-4 sm:mb-6">Keep your account secure by regularly updating your password</p>
            <button
              onClick={() => {
                resetPasswordForm();
                setShowPasswordModal(true);
              }}
              className="flex items-center justify-center gap-2 px-6 sm:px-8 py-3 sm:py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 text-sm sm:text-base font-medium mx-auto"
            >
              <KeyIcon className="w-4 h-4 sm:w-5 sm:h-5" />
              Change Password
            </button>
          </div>
        </div>
      </div>

      {/* Password Reset Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <KeyIcon className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900">Change Password</h3>
                  <p className="text-xs sm:text-sm text-gray-500">Update your account password</p>
                </div>
              </div>
              <button
                onClick={() => {
                  resetPasswordForm();
                  setShowPasswordModal(false);
                }}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <XMarkIcon className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6">
              <form onSubmit={handlePasswordReset} className="space-y-4">
                {/* Current Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Current Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <LockClosedIcon className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                    </div>
                    <input
                      type={showCurrentPassword ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      required
                      className="w-full pl-10 pr-10 py-2 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder="Enter current password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    >
                      {showCurrentPassword ? (
                        <EyeSlashIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                      ) : (
                        <EyeIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    New Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <LockClosedIcon className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                    </div>
                    <input
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      minLength={6}
                      className="w-full pl-10 pr-10 py-2 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder="Enter new password (min 6 characters)"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    >
                      {showNewPassword ? (
                        <EyeSlashIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                      ) : (
                        <EyeIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Confirm New Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <LockClosedIcon className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                    </div>
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={6}
                      className="w-full pl-10 pr-10 py-2 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder="Confirm new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPassword ? (
                        <EyeSlashIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                      ) : (
                        <EyeIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Password Requirements */}
                <div className="bg-blue-50 p-3 rounded-lg">
                  <h4 className="text-xs sm:text-sm font-medium text-blue-800 mb-2">Password Requirements:</h4>
                  <ul className="text-xs text-blue-700 space-y-1">
                    <li>• Minimum 6 characters long</li>
                    <li>• Must be different from current password</li>
                    <li>• Both new password fields must match</li>
                  </ul>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      resetPasswordForm();
                      setShowPasswordModal(false);
                    }}
                    className="flex-1 px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={passwordLoading || !currentPassword || !newPassword || !confirmPassword}
                    className={`flex-1 px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base text-white rounded-lg font-medium transition-colors ${
                      passwordLoading || !currentPassword || !newPassword || !confirmPassword
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    {passwordLoading ? (
                      <div className="flex items-center justify-center gap-2">
                        <LoadingSpinner size="sm" className="border-white" />
                        <span>Updating...</span>
                      </div>
                    ) : (
                      'Update Password'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}

      {/* Photo Upload Modal */}
      {showPhotoModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <CameraIcon className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900">Update Profile Photo</h3>
                  <p className="text-xs sm:text-sm text-gray-500">Upload your student photo</p>
                </div>
              </div>
              <button
                onClick={() => {
                  resetPhotoForm();
                  setShowPhotoModal(false);
                }}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <XMarkIcon className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6">
              <form onSubmit={async (e) => {
                e.preventDefault();
                if (!studentPhoto) {
                  toast.error('Please select a photo to upload');
                  return;
                }
                setPhotoLoading(true);
                try {
                  const formData = new FormData();
                  formData.append('studentPhoto', studentPhoto);
                  const res = await api.put('/api/students/profile/photos', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                  });
                  if (res.data.success) {
                    toast.success('Profile photo updated successfully!');
                    const updatedUser = {
                      ...user,
                      studentPhoto: res.data.data.studentPhoto || user.studentPhoto,
                    };
                    updateUser(updatedUser);
                    resetPhotoForm();
                    setShowPhotoModal(false);
                  } else {
                    throw new Error(res.data.message || 'Failed to update photo');
                  }
                } catch (err) {
                  toast.error(err.response?.data?.message || 'Failed to update photo');
                } finally {
                  setPhotoLoading(false);
                }
              }} className="space-y-6">
                {/* Student Photo */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Student Photo</label>
                  <div className="flex items-center justify-center w-full">
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
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
                            <PhotoIcon className="w-8 h-8 mb-2 text-gray-400" />
                            <p className="text-sm text-gray-500">Click to upload student photo</p>
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
                </div>
                {/* Photo Requirements */}
                <div className="bg-blue-50 p-3 rounded-lg">
                  <h4 className="text-xs sm:text-sm font-medium text-blue-800 mb-2">Photo Requirements:</h4>
                  <ul className="text-xs text-blue-700 space-y-1">
                    <li>• Maximum file size: 5MB</li>
                    <li>• Supported formats: JPG, PNG, GIF</li>
                  </ul>
                </div>
                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      resetPhotoForm();
                      setShowPhotoModal(false);
                    }}
                    className="flex-1 px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={photoLoading || !studentPhoto}
                    className={`flex-1 px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base text-white rounded-lg font-medium transition-colors ${
                      photoLoading || !studentPhoto
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    {photoLoading ? (
                      <div className="flex items-center justify-center gap-2">
                        <LoadingSpinner size="sm" className="border-white" />
                        <span>Uploading...</span>
                      </div>
                    ) : (
                      'Upload Photo'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
};

export default Profile; 