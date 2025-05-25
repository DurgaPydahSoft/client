import React, { useEffect, useState } from 'react';
import api from '../../utils/axios';
import toast from 'react-hot-toast';
import { UserGroupIcon, PlusIcon, TrashIcon, XCircleIcon, ClockIcon, UserIcon, IdentificationIcon, PhoneIcon, EnvelopeIcon } from '@heroicons/react/24/outline';
import LoadingSpinner from '../../components/LoadingSpinner';

const Members = () => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({ 
    name: '', 
    email: '', 
    phone: '', 
    category: '',
    subCategory: ''
  });
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/api/admin/members');
      if (res.data.success) {
        setMembers(res.data.data.members);
      } else {
        throw new Error(res.data.message || 'Failed to fetch members');
      }
    } catch (err) {
      console.error('Error fetching members:', err);
      setError(err.response?.data?.message || 'Failed to fetch members');
      toast.error(err.response?.data?.message || 'Failed to fetch members');
    } finally {
      setLoading(false);
    }
  };

  const handleFormChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleAdd = async e => {
    e.preventDefault();
    setAdding(true);
    try {
      const response = await api.post('/api/admin/members', form);
      if (response.data.success) {
        toast.success('Member added successfully');
        setForm({ name: '', email: '', phone: '', category: '', subCategory: '' });
        fetchMembers();
      } else {
        throw new Error(response.data.message || 'Failed to add member');
      }
    } catch (err) {
      console.error('Error adding member:', err);
      toast.error(err.response?.data?.message || 'Failed to add member');
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async id => {
    if (!window.confirm('Delete this member?')) return;
    setDeletingId(id);
    try {
      const response = await api.delete(`/api/admin/members/${id}`);
      if (response.data.success) {
        toast.success('Member deleted successfully');
        fetchMembers();
      } else {
        throw new Error(response.data.message || 'Failed to delete member');
      }
    } catch (err) {
      console.error('Error deleting member:', err);
      toast.error(err.response?.data?.message || 'Failed to delete member');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 mt-16 sm:mt-0">
      {/* Header Section */}
      <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-blue-900">Members</h2>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">Manage and track all members</p>
          </div>
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="text-xs sm:text-sm text-gray-600 bg-gray-50 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg">
              Total: <span className="font-semibold text-gray-900">{members.length}</span> members
            </div>
          </div>
        </div>
      </div>

      {/* Add Member Form */}
      <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 mb-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center gap-2">
          <PlusIcon className="w-5 h-5" />
          Add New Member
        </h3>
        <form className="space-y-4" onSubmit={handleAdd}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                <UserIcon className="w-4 h-4 text-gray-500" />
                Name
              </label>
              <input 
                className="w-full px-4 py-2.5 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200" 
                name="name" 
                placeholder="Enter member name" 
                value={form.name} 
                onChange={handleFormChange} 
                required 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                <EnvelopeIcon className="w-4 h-4 text-gray-500" />
                Email
              </label>
              <input 
                className="w-full px-4 py-2.5 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200" 
                name="email" 
                type="email"
                placeholder="Enter member email" 
                value={form.email} 
                onChange={handleFormChange} 
                required 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                <PhoneIcon className="w-4 h-4 text-gray-500" />
                Phone
              </label>
              <input 
                className="w-full px-4 py-2.5 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200" 
                name="phone" 
                placeholder="Enter member phone" 
                value={form.phone} 
                onChange={handleFormChange} 
                required 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                <IdentificationIcon className="w-4 h-4 text-gray-500" />
                Category
              </label>
              <select 
                className="w-full px-4 py-2.5 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200" 
                name="category" 
                value={form.category} 
                onChange={handleFormChange} 
                required
              >
                <option value="">Select category</option>
                <option value="Canteen">Canteen</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Academic">Academic</option>
                <option value="Hostel">Hostel</option>
                <option value="Other">Other</option>
              </select>
            </div>
            {form.category === 'Maintenance' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                  <IdentificationIcon className="w-4 h-4 text-gray-500" />
                  Sub Category
                </label>
                <select 
                  className="w-full px-4 py-2.5 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200" 
                  name="subCategory" 
                  value={form.subCategory} 
                  onChange={handleFormChange} 
                  required
                >
                  <option value="">Select sub category</option>
                  <option value="Electrical">Electrical</option>
                  <option value="Plumbing">Plumbing</option>
                  <option value="Carpentry">Carpentry</option>
                  <option value="Cleaning">Cleaning</option>
                </select>
              </div>
            )}
          </div>
          <button 
            className={`w-full sm:w-auto py-2.5 px-6 rounded-lg text-white font-medium transition-all duration-200 flex items-center justify-center gap-2
              ${adding 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700 shadow hover:shadow-md'
              }`} 
            type="submit" 
            disabled={adding}
          >
            {adding ? (
              <>
                <LoadingSpinner size="sm" className="border-white" />
                <span>Adding...</span>
              </>
            ) : (
              <>
                <PlusIcon className="w-5 h-5" />
                <span>Add Member</span>
              </>
            )}
          </button>
        </form>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg flex items-center gap-2">
          <XCircleIcon className="w-5 h-5" />
          {error}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {members.length === 0 ? (
            <div className="col-span-full bg-gray-50 p-8 rounded-lg border border-gray-200 text-center">
              <UserGroupIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">No members added yet.</p>
            </div>
          ) : (
            members.map(member => (
              <div 
                key={member._id} 
                className="bg-white rounded-xl shadow-sm p-4 sm:p-5 transition-all duration-200 hover:shadow"
              >
                <div className="flex flex-col h-full">
                  <div className="flex-1">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="flex-shrink-0 h-12 w-12 bg-blue-50 rounded-full flex items-center justify-center">
                        <UserIcon className="w-6 h-6 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-base sm:text-lg text-gray-800 truncate">{member.name}</h3>
                        <p className="text-sm text-gray-500 truncate">{member.email}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <PhoneIcon className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">{member.phone}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <IdentificationIcon className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">
                          {member.category}
                          {member.subCategory ? ` - ${member.subCategory}` : ''}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <ClockIcon className="w-4 h-4 flex-shrink-0" />
                        <time className="truncate">Added {new Date(member.createdAt).toLocaleDateString()}</time>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-gray-100">
                    <button
                      className="w-full sm:w-auto p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
                      onClick={() => handleDelete(member._id)}
                      disabled={deletingId === member._id}
                    >
                      {deletingId === member._id ? (
                        <div className="w-5 h-5 border-t-2 border-red-600 rounded-full animate-spin" />
                      ) : (
                        <>
                          <TrashIcon className="w-5 h-5" />
                          <span className="text-sm font-medium">Delete</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default Members; 