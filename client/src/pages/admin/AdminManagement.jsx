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
  BuildingOfficeIcon
} from '@heroicons/react/24/outline';
import LoadingSpinner from '../../components/LoadingSpinner';
import SEO from '../../components/SEO';

const PERMISSIONS = [
  { id: 'room_management', label: 'Room Management' },
  { id: 'student_management', label: 'Student Management' },
  { id: 'complaint_management', label: 'Complaint Management' },
  { id: 'leave_management', label: 'Leave Management' },
  { id: 'announcement_management', label: 'Announcement Management' },
  { id: 'poll_management', label: 'Poll Management' },
  { id: 'member_management', label: 'Member Management' }
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
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    permissions: [],
    hostelType: ''
  });
  const [securitySettings, setSecuritySettings] = useState({
    viewProfilePictures: true,
    viewPhoneNumbers: true,
    viewGuardianImages: true
  });
  const [securitySettingsLoading, setSecuritySettingsLoading] = useState(true);
  const [securitySettingsError, setSecuritySettingsError] = useState('');

  useEffect(() => {
    fetchData();
    fetchSecuritySettings();
  }, []);

  const fetchData = async () => {
    try {
      const [subAdminsRes, wardensRes] = await Promise.all([
        api.get('/api/admin-management/sub-admins'),
        api.get('/api/admin-management/wardens')
      ]);
      
      if (subAdminsRes.data.success) {
        setSubAdmins(subAdminsRes.data.data);
      }
      if (wardensRes.data.success) {
        setWardens(wardensRes.data.data);
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
      setFormData(prev => ({
        ...prev,
        permissions: checked 
          ? [...prev.permissions, value]
          : prev.permissions.filter(p => p !== value)
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleAddAdmin = async (e) => {
    e.preventDefault();
    try {
      const endpoint = activeTab === 'sub-admins' ? '/api/admin-management/sub-admins' : '/api/admin-management/wardens';
      
      // For wardens, ensure hostelType is included
      const requestData = activeTab === 'wardens' 
        ? { ...formData, hostelType: formData.hostelType }
        : formData;
      
      const response = await api.post(endpoint, requestData);
      if (response.data.success) {
        toast.success(`${activeTab === 'sub-admins' ? 'Sub-admin' : 'Warden'} added successfully`);
        setShowAddModal(false);
        setFormData({ username: '', password: '', permissions: [], hostelType: '' });
        fetchData();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || `Failed to add ${activeTab === 'sub-admins' ? 'sub-admin' : 'warden'}`);
    }
  };

  const handleEditAdmin = async (e) => {
    e.preventDefault();
    try {
      console.log('🔧 Frontend: Sending update data:', formData);
      
      const endpoint = activeTab === 'sub-admins' 
        ? `/api/admin-management/sub-admins/${selectedAdmin._id}`
        : `/api/admin-management/wardens/${selectedAdmin._id}`;
      
      // Only send password if it's not empty
      const updateData = {
        username: formData.username,
        permissions: formData.permissions
      };
      
      if (formData.password.trim()) {
        updateData.password = formData.password;
      }
      
      // For wardens, include hostelType
      if (activeTab === 'wardens' && formData.hostelType) {
        updateData.hostelType = formData.hostelType;
      }
      
      console.log('🔧 Frontend: Final update data:', updateData);
      
      const response = await api.put(endpoint, updateData);
      if (response.data.success) {
        toast.success(`${activeTab === 'sub-admins' ? 'Sub-admin' : 'Warden'} updated successfully`);
        setShowEditModal(false);
        setSelectedAdmin(null);
        setFormData({ username: '', password: '', permissions: [], hostelType: '' });
        fetchData();
      }
    } catch (error) {
      console.error('🔧 Frontend: Error updating:', error);
      toast.error(error.response?.data?.message || `Failed to update ${activeTab === 'sub-admins' ? 'sub-admin' : 'warden'}`);
    }
  };

  const handleDeleteAdmin = async (adminId) => {
    const userType = activeTab === 'sub-admins' ? 'sub-admin' : 'warden';
    if (!window.confirm(`Are you sure you want to delete this ${userType}?`)) return;
    
    try {
      const endpoint = activeTab === 'sub-admins' 
        ? `/api/admin-management/sub-admins/${adminId}`
        : `/api/admin-management/wardens/${adminId}`;
      
      const response = await api.delete(endpoint);
      if (response.data.success) {
        toast.success(`${userType} deleted successfully`);
        fetchData();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || `Failed to delete ${userType}`);
    }
  };

  const openEditModal = (admin) => {
    setSelectedAdmin(admin);
    setFormData({
      username: admin.username,
      password: '',
      permissions: admin.permissions,
      hostelType: admin.hostelType || ''
    });
    setShowEditModal(true);
  };

  const resetForm = () => {
    setShowAddModal(false);
    setShowEditModal(false);
    setSelectedAdmin(null);
    setFormData({ username: '', password: '', permissions: [], hostelType: '' });
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

  if (loading) return <LoadingSpinner />;

  const currentData = activeTab === 'sub-admins' ? subAdmins : wardens;
  const isWardenTab = activeTab === 'wardens';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <SEO title="Admin Management" />
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-900 to-blue-700 bg-clip-text text-transparent">Admin Management</h1>
          <p className="text-sm text-gray-500 mt-1">Manage sub-admin and warden accounts</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <UserPlusIcon className="w-5 h-5" />
          Add {isWardenTab ? 'Warden' : 'Sub-Admin'}
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
      </div>

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
            <p className="text-gray-500">No {isWardenTab ? 'wardens' : 'sub-admins'} found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {currentData.map((admin) => (
              <div key={admin._id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {isWardenTab ? (
                        <HomeIcon className="w-5 h-5 text-green-600" />
                      ) : (
                        <ShieldCheckIcon className="w-5 h-5 text-blue-600" />
                      )}
                      <h3 className="font-medium text-gray-900">{admin.username}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${admin.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {admin.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    {!isWardenTab && (
                      <div className="flex flex-wrap gap-2">
                        {admin.permissions.map(permission => (
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

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {(showAddModal || showEditModal) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-xl p-6 w-full max-w-md"
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">
                  {showAddModal ? `Add New ${isWardenTab ? 'Warden' : 'Sub-Admin'}` : `Edit ${isWardenTab ? 'Warden' : 'Sub-Admin'}`}
                </h2>
                <button
                  onClick={resetForm}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>
              
              <form onSubmit={showAddModal ? handleAddAdmin : handleEditAdmin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Username
                  </label>
                  <div className="relative">
                    <UserIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      name="username"
                      value={formData.username}
                      onChange={handleFormChange}
                      required
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter username"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password {showEditModal && '(Leave blank to keep current)'}
                  </label>
                  <div className="relative">
                    <KeyIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleFormChange}
                      required={!showEditModal}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder={showEditModal ? 'Enter new password' : 'Enter password'}
                    />
                  </div>
                </div>

                {!isWardenTab && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Permissions
                    </label>
                    <div className="space-y-2">
                      {PERMISSIONS.map(permission => (
                        <label key={permission.id} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            value={permission.id}
                            checked={formData.permissions.includes(permission.id)}
                            onChange={handleFormChange}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">{permission.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {isWardenTab && (
                  <div className="p-3 bg-green-50 rounded-lg">
                    <p className="text-sm text-green-700">
                      <strong>Warden Permissions:</strong> Wardens have access to student oversight, 
                      complaint management, leave approval, room monitoring, announcements, 
                      discipline management, and attendance tracking.
                    </p>
                  </div>
                )}

                {isWardenTab && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Hostel Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="hostelType"
                      value={formData.hostelType}
                      onChange={handleFormChange}
                      required={isWardenTab}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select Hostel Type</option>
                      <option value="boys">Boys Hostel</option>
                      <option value="girls">Girls Hostel</option>
                    </select>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    <CheckIcon className="w-5 h-5" />
                    {showAddModal ? `Add ${isWardenTab ? 'Warden' : 'Sub-Admin'}` : `Update ${isWardenTab ? 'Warden' : 'Sub-Admin'}`}
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