import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/axios';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import LoadingSpinner from '../../components/LoadingSpinner';

const AnnouncementManagement = () => {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    title: '',
    description: ''
  });
  const [submitting, setSubmitting] = useState(false);

  // Fetch announcements
  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const response = await api.get('/api/announcements/admin/all');
      if (response.data.success) {
        setAnnouncements(response.data.data);
      } else {
        throw new Error(response.data.message || 'Failed to fetch announcements');
      }
    } catch (err) {
      console.error('Error fetching announcements:', err);
      toast.error(err.response?.data?.message || 'Failed to fetch announcements');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    setSubmitting(true);
    try {
      const response = await api.post('/api/announcements', form);
      if (response.data.success) {
        toast.success('Announcement created successfully');
        setForm({ title: '', description: '' });
        fetchAnnouncements();
      } else {
        throw new Error(response.data.message || 'Failed to create announcement');
      }
    } catch (err) {
      console.error('Error creating announcement:', err);
      toast.error(err.response?.data?.message || 'Failed to create announcement');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleAnnouncement = async (id, currentStatus) => {
    try {
      const response = await api.patch(`/api/announcements/${id}`, {
        isActive: !currentStatus
      });
      if (response.data.success) {
        toast.success(`Announcement ${currentStatus ? 'deactivated' : 'activated'} successfully`);
        fetchAnnouncements();
      }
    } catch (err) {
      console.error('Error updating announcement:', err);
      toast.error('Failed to update announcement status');
    }
  };

  if (loading) {
    return <LoadingSpinner size="lg" />;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Create Announcement Form */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Create New Announcement</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Title
            </label>
            <input
              type="text"
              name="title"
              value={form.title}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter announcement title"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              rows="4"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter announcement details"
              required
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className={`px-6 py-2 rounded-lg text-white font-medium transition-all duration-200 ${submitting
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg'
                }`}
            >
              {submitting ? (
                <span className="flex items-center gap-2">
                  <LoadingSpinner size="sm" />
                  Creating...
                </span>
              ) : (
                'Create Announcement'
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Announcements List */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Manage Announcements</h2>
        <div className="space-y-4">
          {announcements.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No announcements found</p>
          ) : (
            announcements.map(announcement => (
              <div
                key={announcement._id}
                className={`p-4 rounded-lg border ${announcement.isActive
                    ? 'border-green-200 bg-green-50'
                    : 'border-gray-200 bg-gray-50'
                  }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-gray-800">{announcement.title}</h3>
                    <p className="text-gray-600 mt-1">{announcement.description}</p>
                    <p className="text-sm text-gray-500 mt-2">
                      Created: {new Date(announcement.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <button
                    onClick={() => toggleAnnouncement(announcement._id, announcement.isActive)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${announcement.isActive
                        ? 'bg-red-100 text-red-700 hover:bg-red-200'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                      }`}
                  >
                    {announcement.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default AnnouncementManagement; 