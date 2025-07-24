import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../utils/axios';
import toast from 'react-hot-toast';
import {
  UserPlusIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
  UserIcon,
  KeyIcon,
  CheckIcon,
  ShieldCheckIcon,
  HomeIcon,
  BuildingOfficeIcon,
  AcademicCapIcon
} from '@heroicons/react/24/outline';
import LoadingSpinner from '../../components/LoadingSpinner';
import SEO from '../../components/SEO';
import CourseManagement from './CourseManagement';

const PERMISSIONS = [
  { id: 'room_management', label: 'Room Management' },
  { id: 'student_management', label: 'Student Management' },
  { id: 'complaint_management', label: 'Complaint Management' },
  { id: 'leave_management', label: 'Leave Management' },
  { id: 'announcement_management', label: 'Announcement Management' },
  { id: 'poll_management', label: 'Poll Management' },
  { id: 'member_management', label: 'Member Management' },
  { id: 'menu_management', label: 'Menu Management' },
  { id: 'course_management', label: 'Course Management' },
  { id: 'attendance_management', label: 'Attendance Management' },
  { id: 'found_lost_management', label: 'Found & Lost Management' },
  { id: 'fee_management', label: 'Fee Management' }
];

const ToggleSwitch = ({ label, checked, onChange }) => (
  <label className="flex items-center gap-3 cursor-pointer select-none">
    <span className="text-gray-800 font-medium">{label}</span>
    <span className="relative inline-block w-12 h-6 align-middle">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="sr-only peer"
      />
      <span
        className={`block w-12 h-6 rounded-full transition-colors duration-300
          ${checked ? 'bg-blue-600' : 'bg-gray-300'}
        `}
      ></span>
      <span
        className={`absolute left-0 top-0 w-6 h-6 bg-white border border-gray-300 rounded-full shadow transform transition-transform duration-300
          ${checked ? 'translate-x-6 border-blue-600' : ''}
        `}
      ></span>
    </span>
  </label>
);

const AdminManagement = () => {
  const [activeTab, setActiveTab] = useState('sub-admins');
  const [subAdmins, setSubAdmins] = useState([]);
  const [wardens, setWardens] = useState([]);
  const [principals, setPrincipals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    permissions: [],
    hostelType: '',
    course: '',
    leaveManagementCourses: [] // New field for course selection
  });
  const [securitySettings, setSecuritySettings] = useState({
    viewProfilePictures: true,
    viewPhoneNumbers: true,
    viewGuardianImages: true
  });
  const [securitySettingsLoading, setSecuritySettingsLoading] = useState(true);
  const [securitySettingsError, setSecuritySettingsError] = useState('');
  const [courses, setCourses] = useState([]);

  useEffect(() => {
    fetchData();
    fetchSecuritySettings();
  }, []);

  const fetchData = async () => {
    try {
      const [subAdminsRes, wardensRes, principalsRes] = await Promise.all([
        api.get('/api/admin-management/sub-admins'),
        api.get('/api/admin-management/wardens'),
        api.get('/api/admin-management/principals')
      ]);
      
      console.log('🔍 Admin data responses:', {
        subAdmins: subAdminsRes.data,
        wardens: wardensRes.data,
        principals: principalsRes.data
      });
      
      if (subAdminsRes.data.success) {
        setSubAdmins(subAdminsRes.data.data || []);
      }
      if (wardensRes.data.success) {
        setWardens(wardensRes.data.data || []);
      }
      if (principalsRes.data.success) {
        setPrincipals(principalsRes.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const fetchSecuritySettings = async () => {
    setSecuritySettingsLoading(true);
    setSecuritySettingsError('');
    try {
      const res = await api.get('/api/security-settings');
      if (res.data.success) {
        setSecuritySettings(res.data.data);
      }
    } catch (err) {
      setSecuritySettingsError('Failed to load security settings');
    } finally {
      setSecuritySettingsLoading(false);
    }
  };

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (type === 'checkbox') {
      setFormData(prev => {
        const newPermissions = checked 
          ? [...prev.permissions, value]
          : prev.permissions.filter(p => p !== value);
        
        // If leave_management is being unchecked, clear course selections
        if (value === 'leave_management' && !checked) {
          return {
            ...prev,
            permissions: newPermissions,
            leaveManagementCourses: []
          };
        }
        
        return {
          ...prev,
          permissions: newPermissions
        };
      });
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  // Handle course selection for leave management
  const handleCourseSelection = (courseId, checked) => {
    setFormData(prev => ({
      ...prev,
      leaveManagementCourses: checked 
        ? [...prev.leaveManagementCourses, courseId]
        : prev.leaveManagementCourses.filter(id => id !== courseId)
    }));
  };

  const handleAddAdmin = async (e) => {
    e.preventDefault();
    try {
      let endpoint;
      let requestData;
      
      if (activeTab === 'sub-admins') {
        endpoint = '/api/admin-management/sub-admins';
        requestData = {
          ...formData,
          leaveManagementCourses: formData.leaveManagementCourses
        };
      } else if (activeTab === 'wardens') {
        endpoint = '/api/admin-management/wardens';
        requestData = { ...formData, hostelType: formData.hostelType };
      } else if (activeTab === 'principals') {
        endpoint = '/api/admin-management/principals';
        requestData = { ...formData, course: formData.course };
      }
      
      const response = await api.post(endpoint, requestData);
      if (response.data.success) {
        const userType = activeTab === 'sub-admins' ? 'Sub-admin' : 
                        activeTab === 'wardens' ? 'Warden' : 'Principal';
        toast.success(`${userType} added successfully`);
        setShowAddModal(false);
        setFormData({ username: '', password: '', permissions: [], hostelType: '', course: '', leaveManagementCourses: [] });
        fetchData();
      }
    } catch (error) {
      const userType = activeTab === 'sub-admins' ? 'sub-admin' : 
                      activeTab === 'wardens' ? 'warden' : 'principal';
      toast.error(error.response?.data?.message || `Failed to add ${userType}`);
    }
  };

  const handleEditAdmin = async (e) => {
    e.preventDefault();
    try {
      console.log('🔧 Frontend: Sending update data:', formData);
      
      let endpoint;
      let updateData = {
        username: formData.username,
        permissions: formData.permissions
      };
      
      if (formData.password.trim()) {
        updateData.password = formData.password;
      }
      
      if (activeTab === 'sub-admins') {
        endpoint = `/api/admin-management/sub-admins/${selectedAdmin._id}`;
        updateData.leaveManagementCourses = formData.leaveManagementCourses;
      } else if (activeTab === 'wardens') {
        endpoint = `/api/admin-management/wardens/${selectedAdmin._id}`;
        if (formData.hostelType) {
          updateData.hostelType = formData.hostelType;
        }
      } else if (activeTab === 'principals') {
        endpoint = `/api/admin-management/principals/${selectedAdmin._id}`;
        if (formData.course) {
          updateData.course = formData.course;
        }
      }
      
      console.log('🔧 Frontend: Final update data:', updateData);
      
      const response = await api.put(endpoint, updateData);
      if (response.data.success) {
        const userType = activeTab === 'sub-admins' ? 'Sub-admin' : 
                        activeTab === 'wardens' ? 'Warden' : 'Principal';
        toast.success(`${userType} updated successfully`);
        setShowEditModal(false);
        setSelectedAdmin(null);
        setFormData({ username: '', password: '', permissions: [], hostelType: '', course: '', leaveManagementCourses: [] });
        fetchData();
      }
    } catch (error) {
      console.error('🔧 Frontend: Error updating:', error);
      const userType = activeTab === 'sub-admins' ? 'sub-admin' : 
                      activeTab === 'wardens' ? 'warden' : 'principal';
      toast.error(error.response?.data?.message || `Failed to update ${userType}`);
    }
  };

  const handleDeleteAdmin = async (adminId) => {
    const userType = activeTab === 'sub-admins' ? 'sub-admin' : 
                    activeTab === 'wardens' ? 'warden' : 'principal';
    if (!window.confirm(`Are you sure you want to delete this ${userType}?`)) return;
    
    try {
      let endpoint;
      if (activeTab === 'sub-admins') {
        endpoint = `/api/admin-management/sub-admins/${adminId}`;
      } else if (activeTab === 'wardens') {
        endpoint = `/api/admin-management/wardens/${adminId}`;
      } else if (activeTab === 'principals') {
        endpoint = `/api/admin-management/principals/${adminId}`;
      }
      
      const response = await api.delete(endpoint);
      if (response.data.success) {
        const userType = activeTab === 'sub-admins' ? 'Sub-admin' : 
                        activeTab === 'wardens' ? 'Warden' : 'Principal';
        toast.success(`${userType} deleted successfully`);
        fetchData();
      }
    } catch (error) {
      const userType = activeTab === 'sub-admins' ? 'sub-admin' : 
                      activeTab === 'wardens' ? 'warden' : 'principal';
      toast.error(error.response?.data?.message || `Failed to delete ${userType}`);
    }
  };

  const openEditModal = (admin) => {
    setSelectedAdmin(admin);
    setFormData({
      username: admin.username,
      password: '',
      permissions: admin.permissions || [],
      hostelType: admin.hostelType || '',
      course: admin.course?._id || admin.course || '',
      leaveManagementCourses: admin.leaveManagementCourses || []
    });
    setShowEditModal(true);
  };

  const resetForm = () => {
    setShowAddModal(false);
    setShowEditModal(false);
    setSelectedAdmin(null);
    setFormData({ username: '', password: '', permissions: [], hostelType: '', course: '', leaveManagementCourses: [] });
  };

  const handleSecurityToggle = async (key) => {
    const updated = { ...securitySettings, [key]: !securitySettings[key] };
    setSecuritySettings(updated);
    try {
      await api.post('/api/security-settings', updated);
      toast.success('Security settings updated');
    } catch (err) {
      toast.error('Failed to update security settings');
      // Optionally revert UI
      fetchSecuritySettings();
    }
  };

  // Fetch courses when principal tab/modal is open or when sub-admin modal is open
  useEffect(() => {
    if ((activeTab === 'principals' || activeTab === 'sub-admins') && (showAddModal || showEditModal)) {
      console.log('🔍 Fetching courses for admin creation...');
      api.get('/api/course-management/courses')
        .then(res => {
          console.log('✅ Courses fetched successfully:', res.data);
          if (res.data.success) {
            setCourses(res.data.data);
            console.log('📚 Courses set in state:', res.data.data);
          } else {
            console.error('❌ API returned success: false');
            setCourses([]);
          }
        })
        .catch(error => {
          console.error('❌ Error fetching courses:', error);
          console.error('❌ Error response:', error.response?.data);
          setCourses([]);
        });
    }
  }, [activeTab, showAddModal, showEditModal]);

  if (loading) return <LoadingSpinner />;

  const currentData = activeTab === 'sub-admins' ? subAdmins : 
                     activeTab === 'wardens' ? wardens : principals;
  const isWardenTab = activeTab === 'wardens';
  const isPrincipalTab = activeTab === 'principals';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <SEO title="Admin Management" />
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-900 to-blue-700 bg-clip-text text-transparent">Admin Management</h1>
          <p className="text-sm text-gray-500 mt-1">Manage sub-admin, warden, and principal accounts</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <UserPlusIcon className="w-5 h-5" />
          Add {isWardenTab ? 'Warden' : isPrincipalTab ? 'Principal' : 'Sub-Admin'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-6">
        <button
          onClick={() => setActiveTab('sub-admins')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
            activeTab === 'sub-admins'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <ShieldCheckIcon className="w-4 h-4" />
          Sub-Admins
        </button>
        <button
          onClick={() => setActiveTab('wardens')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
            activeTab === 'wardens'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <HomeIcon className="w-4 h-4" />
          Wardens
        </button>
        <button
          onClick={() => setActiveTab('principals')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
            activeTab === 'principals'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <AcademicCapIcon className="w-4 h-4" />
          Principals
        </button>
        <button
          onClick={() => setActiveTab('courses')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
            activeTab === 'courses'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <AcademicCapIcon className="w-4 h-4" />
          Courses & Branches
        </button>
      </div>

      {/* Course Management Tab */}
      {activeTab === 'courses' && <CourseManagement />}

      {/* Admin Management Content */}
      {activeTab !== 'courses' && (
        <>
          {/* Security Settings Section */}
          <div className="bg-white rounded-xl shadow-sm p-6 mt-8 mb-8">
            <h2 className="text-lg font-bold text-blue-800 mb-4">Security Settings</h2>
            {securitySettingsLoading ? (
              <div className="text-gray-500">Loading...</div>
            ) : securitySettingsError ? (
              <div className="text-red-500">{securitySettingsError}</div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-6">
                <ToggleSwitch
                  label="View Profile Pictures"
                  checked={securitySettings.viewProfilePictures}
                  onChange={() => handleSecurityToggle('viewProfilePictures')}
                />
                <ToggleSwitch
                  label="View Phone Numbers"
                  checked={securitySettings.viewPhoneNumbers}
                  onChange={() => handleSecurityToggle('viewPhoneNumbers')}
                />
                <ToggleSwitch
                  label="View Guardian Images"
                  checked={securitySettings.viewGuardianImages}
                  onChange={() => handleSecurityToggle('viewGuardianImages')}
                />
              </div>
            )}
          </div>

          {/* Users List */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {currentData.length === 0 ? (
          <div className="p-8 text-center">
            <UserIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">No {isWardenTab ? 'wardens' : isPrincipalTab ? 'principals' : 'sub-admins'} found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {currentData.filter(admin => admin && admin._id).map((admin) => (
              <div key={admin._id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {isWardenTab ? (
                        <HomeIcon className="w-5 h-5 text-green-600" />
                      ) : isPrincipalTab ? (
                        <AcademicCapIcon className="w-5 h-5 text-purple-600" />
                      ) : (
                        <ShieldCheckIcon className="w-5 h-5 text-blue-600" />
                      )}
                      <h3 className="font-medium text-gray-900">{admin.username}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${admin.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {admin.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    {!isWardenTab && !isPrincipalTab && (
                      <div className="flex flex-wrap gap-2">
                        {admin.permissions && admin.permissions.map(permission => (
                          <span key={permission} className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs">
                            {PERMISSIONS.find(p => p.id === permission)?.label || permission}
                          </span>
                        ))}
                      </div>
                    )}
                    {isWardenTab && (
                      <div className="flex flex-wrap gap-2">
                        <span className="px-2 py-1 bg-green-50 text-green-700 rounded-full text-xs">
                          Warden Permissions
                        </span>
                        {admin.hostelType && (
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            admin.hostelType === 'boys' 
                              ? 'bg-blue-50 text-blue-700' 
                              : 'bg-pink-50 text-pink-700'
                          }`}>
                            {admin.hostelType === 'boys' ? 'Boys Hostel' : 'Girls Hostel'}
                          </span>
                        )}
                      </div>
                    )}
                    {isPrincipalTab && (
                      <div className="flex flex-wrap gap-2">
                        <span className="px-2 py-1 bg-purple-50 text-purple-700 rounded-full text-xs">
                          Principal Permissions
                        </span>
                        {admin.course && (
                          <span className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs">
                            {typeof admin.course === 'object' ? admin.course.name : admin.course}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEditModal(admin)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <PencilIcon className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDeleteAdmin(admin._id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
        </>
      )}

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {(showAddModal || showEditModal) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4"
          >
                      <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-xl p-3 sm:p-4 md:p-6 w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg xl:max-w-xl 2xl:max-w-2xl mx-2 sm:mx-4 max-h-[85vh] sm:max-h-[90vh] overflow-y-auto"
          >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
                  {showAddModal ? `Add New ${isWardenTab ? 'Warden' : isPrincipalTab ? 'Principal' : 'Sub-Admin'}` : `Edit ${isWardenTab ? 'Warden' : isPrincipalTab ? 'Principal' : 'Sub-Admin'}`}
                </h2>
                <button
                  onClick={resetForm}
                  className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <XMarkIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              </div>
              
              <form onSubmit={showAddModal ? handleAddAdmin : handleEditAdmin} className="space-y-3 sm:space-y-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    Username <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleFormChange}
                    required
                    className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter username"
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    Password {showEditModal && <span className="text-gray-500 text-xs sm:text-sm">(leave blank to keep current)</span>}
                    {showAddModal && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleFormChange}
                    required={showAddModal}
                    className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter password"
                  />
                </div>

                {!isWardenTab && !isPrincipalTab && (
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                      Permissions
                    </label>
                    <div className="space-y-1 sm:space-y-2 max-h-48 sm:max-h-64 overflow-y-auto">
                      {PERMISSIONS.map(permission => (
                        <div key={permission.id}>
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              value={permission.id}
                              checked={formData.permissions.includes(permission.id)}
                              onChange={handleFormChange}
                              className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <span className="text-xs sm:text-sm text-gray-700">{permission.label}</span>
                          </label>
                          
                          {/* Course selection for Leave Management */}
                          {permission.id === 'leave_management' && formData.permissions.includes('leave_management') && (
                            <div className="ml-4 sm:ml-6 mt-2 p-2 sm:p-3 bg-blue-50 rounded-lg">
                              <label className="block text-xs sm:text-sm font-medium text-blue-700 mb-2">
                                Select Courses for Leave Management Access
                              </label>
                              <div className="space-y-1 sm:space-y-2 max-h-24 sm:max-h-32 overflow-y-auto">
                                {courses.length > 0 ? (
                                  courses.map(course => (
                                    <label key={course._id} className="flex items-center gap-1 sm:gap-2">
                                      <input
                                        type="checkbox"
                                        checked={formData.leaveManagementCourses.includes(course._id)}
                                        onChange={(e) => handleCourseSelection(course._id, e.target.checked)}
                                        className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                      />
                                      <span className="text-xs text-blue-700 truncate">{course.name}</span>
                                    </label>
                                  ))
                                ) : (
                                  <p className="text-xs text-blue-600">Loading courses...</p>
                                )}
                              </div>
                              {formData.leaveManagementCourses.length === 0 && (
                                <p className="text-xs text-red-600 mt-1">Please select at least one course</p>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {isWardenTab && (
                  <div className="p-2 sm:p-3 bg-green-50 rounded-lg">
                    <p className="text-xs sm:text-sm text-green-700">
                      <strong>Warden Permissions:</strong> Wardens have access to student oversight, 
                      complaint management, leave approval, room monitoring, announcements, 
                      discipline management, and attendance tracking.
                    </p>
                  </div>
                )}

                {isPrincipalTab && (
                  <div className="p-2 sm:p-3 bg-purple-50 rounded-lg">
                    <p className="text-xs sm:text-sm text-purple-700">
                      <strong>Principal Permissions:</strong> Principals have access to attendance management, 
                      student oversight, and course-specific analytics.
                    </p>
                  </div>
                )}

                {isWardenTab && (
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                      Hostel Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="hostelType"
                      value={formData.hostelType}
                      onChange={handleFormChange}
                      required={isWardenTab}
                      className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select Hostel Type</option>
                      <option value="boys">Boys Hostel</option>
                      <option value="girls">Girls Hostel</option>
                    </select>
                  </div>
                )}

                {isPrincipalTab && (
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                      Course <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="course"
                      value={formData.course}
                      onChange={handleFormChange}
                      required={isPrincipalTab}
                      className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select Course ({courses.length} available)</option>
                      {courses.length > 0 ? (
                        courses.map(course => (
                          <option key={course._id} value={course._id}>
                            {course.name} ({course.code})
                          </option>
                        ))
                      ) : (
                        <option value="" disabled>Loading courses...</option>
                      )}
                    </select>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 pt-4">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-3 sm:px-4 py-2 text-sm sm:text-base text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3 sm:px-4 py-2 text-sm sm:text-base bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-1 sm:gap-2"
                  >
                    <CheckIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                    {showAddModal ? `Add ${isWardenTab ? 'Warden' : isPrincipalTab ? 'Principal' : 'Sub-Admin'}` : `Update ${isWardenTab ? 'Warden' : isPrincipalTab ? 'Principal' : 'Sub-Admin'}`}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminManagement; 