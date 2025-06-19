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
  ShieldCheckIcon
} from '@heroicons/react/24/outline';
import LoadingSpinner from '../../components/LoadingSpinner';
import SEO from '../../components/SEO';

const PERMISSIONS = [
  { id: 'room_management', label: 'Room Management' },
  { id: 'student_management', label: 'Student Management' },
  { id: 'complaint_management', label: 'Complaint Management' },
  { id: 'outpass_management', label: 'Outpass Management' },
  { id: 'announcement_management', label: 'Announcement Management' },
  { id: 'poll_management', label: 'Poll Management' }
];

const AdminManagement = () => {
  const [subAdmins, setSubAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    permissions: []
  });

  useEffect(() => {
    fetchSubAdmins();
  }, []);

  const fetchSubAdmins = async () => {
    try {
      const response = await api.get('/api/admin-management/sub-admins');
      if (response.data.success) {
        setSubAdmins(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching sub-admins:', error);
      toast.error('Failed to fetch sub-admins');
    } finally {
      setLoading(false);
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
      const response = await api.post('/api/admin-management/sub-admins', formData);
      if (response.data.success) {
        toast.success('Sub-admin added successfully');
        setShowAddModal(false);
        setFormData({ username: '', password: '', permissions: [] });
        fetchSubAdmins();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add sub-admin');
    }
  };

  const handleEditAdmin = async (e) => {
    e.preventDefault();
    try {
      const response = await api.put(`/api/admin-management/sub-admins/${selectedAdmin._id}`, formData);
      if (response.data.success) {
        toast.success('Sub-admin updated successfully');
        setShowEditModal(false);
        setSelectedAdmin(null);
        setFormData({ username: '', password: '', permissions: [] });
        fetchSubAdmins();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update sub-admin');
    }
  };

  const handleDeleteAdmin = async (adminId) => {
    if (!window.confirm('Are you sure you want to delete this sub-admin?')) return;
    
    try {
      const response = await api.delete(`/api/admin-management/sub-admins/${adminId}`);
      if (response.data.success) {
        toast.success('Sub-admin deleted successfully');
        fetchSubAdmins();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete sub-admin');
    }
  };

  const openEditModal = (admin) => {
    setSelectedAdmin(admin);
    setFormData({
      username: admin.username,
      password: '',
      permissions: admin.permissions
    });
    setShowEditModal(true);
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <SEO title="Admin Management" />
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-900 to-blue-700 bg-clip-text text-transparent">Admin Management</h1>
          <p className="text-sm text-gray-500 mt-1">Manage sub-admin accounts and their permissions</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <UserPlusIcon className="w-5 h-5" />
          Add Sub-Admin
        </button>
      </div>

      {/* Sub-Admins List */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {subAdmins.length === 0 ? (
          <div className="p-8 text-center">
            <UserIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">No sub-admins found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {subAdmins.map((admin) => (
              <div key={admin._id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <ShieldCheckIcon className="w-5 h-5 text-blue-600" />
                      <h3 className="font-medium text-gray-900">{admin.username}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${admin.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {admin.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {admin.permissions.map(permission => (
                        <span key={permission} className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs">
                          {PERMISSIONS.find(p => p.id === permission)?.label || permission}
                        </span>
                      ))}
                    </div>
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
                  {showAddModal ? 'Add New Sub-Admin' : 'Edit Sub-Admin'}
                </h2>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setShowEditModal(false);
                    setSelectedAdmin(null);
                    setFormData({ username: '', password: '', permissions: [] });
                  }}
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

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false);
                      setShowEditModal(false);
                      setSelectedAdmin(null);
                      setFormData({ username: '', password: '', permissions: [] });
                    }}
                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    <CheckIcon className="w-5 h-5" />
                    {showAddModal ? 'Add Sub-Admin' : 'Update Sub-Admin'}
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