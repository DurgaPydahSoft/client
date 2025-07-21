import React, { useState, useEffect } from 'react';
import api from '../../utils/axios';
import toast from 'react-hot-toast';
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon, 
  XMarkIcon,
  UserGroupIcon,
  UserIcon,
  PhoneIcon,
  TagIcon,
  XCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import LoadingSpinner from '../../components/LoadingSpinner';

const CATEGORIES = ['Canteen', 'Internet', 'Housekeeping', 'Plumbing', 'Electricity', 'Others'];

const MemberManagement = () => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    category: ''
  });

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/api/members');
      if (res.data.success) {
        setMembers(res.data.data.members);
        // Set first category as selected by default if none selected
        if (!selectedCategory && res.data.data.members.length > 0) {
          setSelectedCategory(res.data.data.members[0].category);
        }
      } else {
        throw new Error(res.data.message || 'Failed to fetch members');
      }
    } catch (err) {
      console.error('Error fetching members:', err);
      setError('Failed to fetch members');
      toast.error('Failed to fetch members');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    
    // Validate phone number before submission
    if (formData.phone.length !== 10) {
      toast.error('Phone number must be exactly 10 digits');
      return;
    }

    try {
      const res = await api.post('/api/members', formData);
      if (res.data.success) {
        toast.success(res.data.message);
        setShowAddModal(false);
        setFormData({ name: '', phone: '', category: '' });
        fetchMembers();
      } else {
        throw new Error(res.data.message || 'Failed to add member');
      }
    } catch (err) {
      console.error('Error adding member:', err);
      const errorMessage = err.response?.data?.message || 'Failed to add member';
      toast.error(errorMessage);
    }
  };

  const handleEditMember = async (e) => {
    e.preventDefault();
    if (!selectedMember?.id) return;

    // Validate phone number before submission
    if (formData.phone.length !== 10) {
      toast.error('Phone number must be exactly 10 digits');
      return;
    }

    try {
      const res = await api.put(`/api/members/${selectedMember.id}`, formData);
      if (res.data.success) {
        toast.success('Member updated successfully');
        setShowEditModal(false);
        setSelectedMember(null);
        setFormData({ name: '', phone: '', category: '' });
        fetchMembers();
      } else {
        throw new Error(res.data.message || 'Failed to update member');
      }
    } catch (err) {
      console.error('Error updating member:', err);
      const errorMessage = err.response?.data?.message || 'Failed to update member';
      toast.error(errorMessage);
    }
  };

  const handleDeleteMember = async (memberId) => {
    if (!memberId) {
      toast.error('Invalid member ID');
      return;
    }
    if (!window.confirm('Are you sure you want to delete this member?')) return;

    try {
      const res = await api.delete(`/api/members/${memberId}`);
      if (res.data.success) {
        toast.success('Member deleted successfully');
        fetchMembers();
      } else {
        throw new Error(res.data.message || 'Failed to delete member');
      }
    } catch (err) {
      console.error('Error deleting member:', err);
      toast.error(err.response?.data?.message || 'Failed to delete member');
    }
  };

  const openEditModal = (member) => {
    setSelectedMember(member);
    setFormData({
      name: member.name,
      phone: member.phone,
      category: member.category
    });
    setShowEditModal(true);
  };

  const openAddModal = () => {
    setFormData({
      name: '',
      phone: '',
      category: selectedCategory || CATEGORIES[0]
    });
    setShowAddModal(true);
  };

  const closeModals = () => {
    setShowAddModal(false);
    setShowEditModal(false);
    setSelectedMember(null);
    setFormData({ name: '', phone: '', category: '' });
  };

  // Filter members by selected category
  const filteredMembers = members.filter(member => 
    !selectedCategory || member.category === selectedCategory
  );

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 mt-16 sm:mt-0">
      {/* Header Section */}
      <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-blue-900">Member Management</h2>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">Manage hostel staff members and their categories</p>
          </div>
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="text-xs sm:text-sm text-gray-600 bg-gray-50 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg">
              Total: <span className="font-semibold text-gray-900">{members.length}</span> members
            </div>
            <button
              onClick={openAddModal}
              className="flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 shadow-sm hover:shadow text-sm sm:text-base"
            >
              <PlusIcon className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Add New Member</span>
              <span className="sm:hidden">Add</span>
            </button>
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 mb-4 sm:mb-6">
        <div className="flex flex-wrap gap-2 overflow-x-auto pb-2 -mx-1 px-1">
          <button
            onClick={() => setSelectedCategory('')}
            className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors duration-200 flex items-center gap-2 ${
              !selectedCategory
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <UserGroupIcon className="w-4 h-4" />
            All Categories
          </button>
          {CATEGORIES.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors duration-200 flex items-center gap-2 ${
                selectedCategory === category
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <TagIcon className="w-4 h-4" />
              {category}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg flex items-center gap-2">
          <XCircleIcon className="w-5 h-5" />
          {error}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Name</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Phone</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Category</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredMembers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-gray-500">
                      <div className="flex flex-col items-center gap-2">
                        <UserGroupIcon className="w-12 h-12 text-gray-400" />
                        <p>No members found</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredMembers.map((member, index) => (
                  <tr key={member.id || member.phone || index} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-shrink-0 h-8 w-8 bg-blue-50 rounded-full flex items-center justify-center">
                          <UserIcon className="w-4 h-4 text-blue-600" />
                        </div>
                        <span className="text-sm text-gray-900">{member.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 text-sm text-gray-900">
                        <PhoneIcon className="w-4 h-4 text-gray-500" />
                        {member.phone}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <TagIcon className="w-4 h-4 text-gray-500" />
                        <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                          {member.category}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEditModal(member)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-200"
                          title="Edit member"
                        >
                          <PencilIcon className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteMember(member.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
                          title="Delete member"
                        >
                          <TrashIcon className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl p-4 sm:p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <PlusIcon className="w-5 h-5" />
                Add New Member
              </h3>
              <button
                onClick={closeModals}
                className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors duration-200"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleAddMember} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                  <UserIcon className="w-4 h-4 text-gray-500" />
                  Name
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                  <PhoneIcon className="w-4 h-4 text-gray-500" />
                  Phone Number
                </label>
                <input
                  type="tel"
                  required
                  pattern="[0-9]{10}"
                  title="Please enter exactly 10 digits"
                  maxLength={10}
                  minLength={10}
                  className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.phone}
                  onChange={e => {
                    const value = e.target.value.replace(/[^0-9]/g, '');
                    if (value.length <= 10) {
                      setFormData({ ...formData, phone: value });
                    }
                  }}
                  onBlur={e => {
                    if (e.target.value.length !== 10) {
                      toast.error('Phone number must be exactly 10 digits');
                    }
                  }}
                />
                <p className="mt-1 text-xs text-gray-500">Enter a 10-digit phone number</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                  <TagIcon className="w-4 h-4 text-gray-500" />
                  Category
                </label>
                <select
                  required
                  className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.category}
                  onChange={e => setFormData({ ...formData, category: e.target.value })}
                >
                  {CATEGORIES.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 shadow-sm hover:shadow flex items-center justify-center gap-2"
              >
                <PlusIcon className="w-5 h-5" />
                Add Member
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Member Modal */}
      {showEditModal && selectedMember && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl p-4 sm:p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <PencilIcon className="w-5 h-5" />
                Edit Member
              </h3>
              <button
                onClick={closeModals}
                className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors duration-200"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleEditMember} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                  <UserIcon className="w-4 h-4 text-gray-500" />
                  Name
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                  <PhoneIcon className="w-4 h-4 text-gray-500" />
                  Phone Number
                </label>
                <input
                  type="tel"
                  required
                  pattern="[0-9]{10}"
                  title="Please enter exactly 10 digits"
                  maxLength={10}
                  minLength={10}
                  className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.phone}
                  onChange={e => {
                    const value = e.target.value.replace(/[^0-9]/g, '');
                    if (value.length <= 10) {
                      setFormData({ ...formData, phone: value });
                    }
                  }}
                  onBlur={e => {
                    if (e.target.value.length !== 10) {
                      toast.error('Phone number must be exactly 10 digits');
                    }
                  }}
                />
                <p className="mt-1 text-xs text-gray-500">Enter a 10-digit phone number</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                  <TagIcon className="w-4 h-4 text-gray-500" />
                  Category
                </label>
                <select
                  required
                  className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.category}
                  onChange={e => setFormData({ ...formData, category: e.target.value })}
                >
                  {CATEGORIES.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 shadow-sm hover:shadow flex items-center justify-center gap-2"
              >
                <PencilIcon className="w-5 h-5" />
                Update Member
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MemberManagement; 