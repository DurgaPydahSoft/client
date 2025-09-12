import React, { useEffect, useState } from 'react';
import api from '../../utils/axios';
import toast from 'react-hot-toast';
import {
  MegaphoneIcon,
  PlusIcon,
  TrashIcon,
  XCircleIcon,
  ClockIcon,
  PhotoIcon,
  DocumentTextIcon,
  PencilSquareIcon,
  ArrowUpTrayIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from '@heroicons/react/24/outline';
import LoadingSpinner from '../../components/LoadingSpinner';

const Announcements = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({ title: '', description: '' });
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [expandedIds, setExpandedIds] = useState([]);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/api/announcements/admin/all');
      if (res.data.success) {
        setAnnouncements(res.data.data);
      } else {
        throw new Error(res.data.message || 'Failed to fetch announcements');
      }
    } catch (err) {
      console.error('Error fetching announcements:', err);
      setError(err.response?.data?.message || 'Failed to fetch announcements');
      toast.error(err.response?.data?.message || 'Failed to fetch announcements');
    } finally {
      setLoading(false);
    }
  };

  const handleFormChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
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

  const handleAdd = async e => {
    e.preventDefault();
    setAdding(true);
    try {
      const formData = new FormData();
      formData.append('title', form.title);
      formData.append('description', form.description);
      if (image) {
        formData.append('image', image);
      }

      const response = await api.post('/api/announcements', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        toast.success('Announcement posted successfully');
        setForm({ title: '', description: '' });
        setImage(null);
        setImagePreview(null);
        fetchAnnouncements();
      } else {
        throw new Error(response.data.message || 'Failed to post announcement');
      }
    } catch (err) {
      console.error('Error posting announcement:', err);
      toast.error(err.response?.data?.message || 'Failed to post announcement');
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async id => {
    if (!window.confirm('Are you sure you want to delete this announcement? This action cannot be undone.')) return;

    setDeletingId(id);
    try {
      const response = await api.delete(`/api/announcements/${id}`);
      if (response.data.success) {
        toast.success('Announcement deleted successfully');
        setAnnouncements(prevAnnouncements =>
          prevAnnouncements.filter(announcement => announcement._id !== id)
        );
      } else {
        throw new Error(response.data.message || 'Failed to delete announcement');
      }
    } catch (err) {
      console.error('Error deleting announcement:', err);
      toast.error(err.response?.data?.message || 'Failed to delete announcement');
    } finally {
      setDeletingId(null);
    }
  };

  const toggleExpand = id => {
    setExpandedIds(prev =>
      prev.includes(id) ? prev.filter(expId => expId !== id) : [...prev, id]
    );
  };

  return (
    <div className="max-w-[1920px] mx-auto px-4 sm:px-6 py-4 sm:py-6 mt-16 sm:mt-0">
      {/* Header Section */}
      <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-blue-900">Announcements</h2>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">Manage and track all announcements</p>
          </div>
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="text-xs sm:text-sm text-gray-600 bg-gray-50 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg">
              Total: <span className="font-semibold text-gray-900">{announcements.length}</span> announcements
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="lg:grid lg:grid-cols-2 lg:gap-6">
        {/* Left Column - Create Announcement Form */}
        <div className="lg:sticky lg:top-6 lg:self-start">
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 mb-6 lg:mb-0">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-blue-50 rounded-lg">
                <PencilSquareIcon className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-blue-900">Create New Announcement</h3>
            </div>
            <form className="space-y-4" onSubmit={handleAdd}>
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                  <DocumentTextIcon className="w-4 h-4 text-gray-500" />
                  Title
                </label>
                <input
                  className="w-full px-4 py-2.5 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                  name="title"
                  placeholder="Enter announcement title"
                  value={form.title}
                  onChange={handleFormChange}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  className="w-full px-4 py-2.5 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                  name="description"
                  placeholder="Enter announcement details"
                  value={form.description}
                  onChange={handleFormChange}
                  required
                  rows={4}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Image (Optional)</label>
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
                    <span>Posting...</span>
                  </>
                ) : (
                  <>
                    <PlusIcon className="w-5 h-5" />
                    <span>Post Announcement</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Right Column - Announcements List */}
        <div className="lg:max-h-[calc(100vh-12rem)] lg:overflow-y-auto lg:pr-2">
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
            <div className="space-y-4">
              {announcements.filter(a => a.isActive !== false).length === 0 ? (
                <div className="bg-gray-50 p-8 rounded-lg border border-gray-200 text-center">
                  <MegaphoneIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">No announcements posted yet.</p>
                </div>
              ) : (
                announcements
                  .filter(a => a.isActive !== false)
                  .map(a => {
                    const isExpanded = expandedIds.includes(a._id);
                    return (
                      <div
                        key={a._id}
                        className="bg-white rounded-xl shadow-sm p-4 sm:p-5 transition-all duration-200 hover:shadow-lg h-full flex flex-col"
                      >
                        <div className="flex flex-col h-full">
                          {a.imageUrl && (
                            <div className="relative w-full pt-[56.25%] mb-4 overflow-hidden rounded-lg">
                              <img
                                src={a.imageUrl}
                                alt={a.title}
                                className="absolute inset-0 w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                              />
                            </div>
                          )}
                          <div className="flex-1 flex flex-col">
                            <div className="flex flex-wrap items-start gap-2 mb-2">
                              <h3 className="font-bold text-base sm:text-lg text-gray-800 break-words flex-1">{a.title}</h3>
                            </div>
                            <p className={`text-sm sm:text-base text-gray-600 mb-3 whitespace-pre-wrap break-words ${!isExpanded ? 'line-clamp-3' : ''}`}>
                              {a.description}
                            </p>
                            <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-500 mt-auto">
                              <ClockIcon className="w-4 h-4 flex-shrink-0" />
                              <time className="break-words">{new Date(a.createdAt).toLocaleString()}</time>
                            </div>
                          </div>
                          <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center gap-2">
                            <button
                              className="w-full sm:w-auto p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
                              onClick={() => handleDelete(a._id)}
                              disabled={deletingId === a._id}
                            >
                              {deletingId === a._id ? (
                                <div className="w-5 h-5 border-t-2 border-red-600 rounded-full animate-spin" />
                              ) : (
                                <>
                                  <TrashIcon className="w-5 h-5" />
                                  <span className="text-sm font-medium whitespace-nowrap">Delete</span>
                                </>
                              )}
                            </button>
                            <button
                              className="w-full sm:w-auto p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-200 flex items-center justify-center gap-1 sm:gap-1.5 text-sm whitespace-nowrap"
                              onClick={() => toggleExpand(a._id)}
                            >
                              {isExpanded ? (
                                <>
                                  <DocumentTextIcon className="w-5 h-5" />
                                  <span className="font-medium">Read Less</span>
                                </>
                              ) : (
                                <>
                                  <DocumentTextIcon className="w-5 h-5" />
                                  <span className="font-medium">Read More</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Announcements;
