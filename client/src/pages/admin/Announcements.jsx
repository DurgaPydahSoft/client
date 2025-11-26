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
  const [expandedAnnouncementIds, setExpandedAnnouncementIds] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false); // For mobile collapsible form

  const toggleAnnouncementExpand = (id) => {
    setExpandedAnnouncementIds(prev =>
      prev.includes(id) ? prev.filter(expId => expId !== id) : [...prev, id]
    );
  };

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
    <div className="mx-auto px-4 sm:px-6 py-4 sm:py-6 mt-16 sm:mt-0">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-xl shadow-sm p-4 sm:p-6 mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white">Announcements</h2>
            <p className="text-xs sm:text-sm text-gray-100 mt-1">Manage and track all announcements</p>
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
          <div className="bg-white rounded-xl shadow-sm mb-6 lg:mb-0 overflow-hidden">
            {/* Mobile Toggle Header */}
            <div 
              className="lg:hidden p-4 flex items-center justify-between cursor-pointer bg-blue-600 hover:bg-blue-700 transition-colors"
              onClick={() => setShowCreateForm(!showCreateForm)}
            >
              <div className="flex items-center gap-3 ">
                <div className="p-2 bg-white rounded-lg">
                  <PencilSquareIcon className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="text-base font-semibold text-gray-100">Create New Announcement</h3>
              </div>
              <button className={`p-1.5 rounded-lg transition-all duration-200 ${showCreateForm ? 'bg-blue-100 text-blue-600' : 'text-gray-400'}`}>
                {showCreateForm ? (
                  <ChevronUpIcon className="w-5 h-5" />
                ) : (
                  <ChevronDownIcon className="w-5 h-5" />
                )}
              </button>
            </div>

            {/* Desktop Header - Always Visible */}
            <div className="hidden lg:flex items-center gap-3 p-4 sm:p-6 pb-0 bg-blue-600">
              <div className="p-2 bg-blue-50 rounded-lg">
                <PencilSquareIcon className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-white">Create New Announcement</h3>
            </div>

            {/* Form - Collapsible on Mobile, Always Visible on Desktop */}
            <div className={`${showCreateForm ? 'block' : 'hidden'} lg:block p-4 sm:p-6 pt-4`}>
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
              {/* Announcements List */}
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="p-4 border-b bg-blue-600 border-gray-100">
                  <h3 className="font-semibold text-gray-100 flex items-center gap-2">
                    <MegaphoneIcon className="w-5 h-5 text-gray-100" />
                    All Announcements
                    <span className="text-sm font-normal text-gray-100">({announcements.length})</span>
                  </h3>
                </div>
                
                {announcements.length === 0 ? (
                  <div className="p-8 text-center">
                    <MegaphoneIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-100">No announcements posted yet.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
                    {announcements.map(a => {
                        const isExpanded = expandedAnnouncementIds.includes(a._id);
                        return (
                          <div
                            key={a._id}
                            className="transition-all duration-200"
                          >
                            {/* Announcement Header - Always Visible */}
                            <div
                              className={`p-4 hover:bg-blue-50 cursor-pointer transition-colors ${
                                isExpanded ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                              }`}
                              onClick={() => toggleAnnouncementExpand(a._id)}
                            >
                              <div className="flex items-start gap-3">
                                <div className="w-2 h-2 rounded-full mt-2 flex-shrink-0 bg-blue-500"></div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h4 className={`font-medium text-gray-900 ${isExpanded ? '' : 'truncate'}`}>{a.title}</h4>
                                    {a.imageUrl && (
                                      <PhotoIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 text-xs text-gray-500">
                                    <ClockIcon className="w-3.5 h-3.5" />
                                    <span>{new Date(a.createdAt).toLocaleDateString('en-IN', {
                                      day: '2-digit',
                                      month: 'short',
                                      year: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}</span>
                                  </div>
                                </div>
                                <button
                                  className={`p-1.5 rounded-lg transition-all duration-200 ${
                                    isExpanded 
                                      ? 'bg-blue-100 text-blue-600' 
                                      : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
                                  }`}
                                >
                                  {isExpanded ? (
                                    <ChevronUpIcon className="w-5 h-5" />
                                  ) : (
                                    <ChevronDownIcon className="w-5 h-5" />
                                  )}
                                </button>
                              </div>
                            </div>

                            {/* Expanded Details */}
                            {isExpanded && (
                              <div className="px-4 pb-4 bg-blue-50 border-l-4 border-blue-500">
                                <div className="pl-5">
                                  {/* Image */}
                                  {a.imageUrl && (
                                    <div className="relative w-full max-w-md pt-[40%] mb-4 overflow-hidden rounded-lg">
                                      <img
                                        src={a.imageUrl}
                                        alt={a.title}
                                        className="absolute inset-0 w-full h-full object-cover"
                                      />
                                    </div>
                                  )}

                                  {/* Description */}
                                  <div className="mb-4">
                                    <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Description</h5>
                                    <p className="text-sm text-gray-700 whitespace-pre-wrap bg-white p-3 rounded-lg border border-gray-200">
                                      {a.description}
                                    </p>
                                  </div>

                                  {/* Actions */}
                                  <div className="flex items-center gap-3 pt-3 border-t border-blue-200">
                                    <button
                                      className="px-3 py-1.5 text-red-600 hover:bg-red-100 rounded-lg transition-colors duration-200 flex items-center gap-2 text-sm font-medium"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDelete(a._id);
                                      }}
                                      disabled={deletingId === a._id}
                                    >
                                      {deletingId === a._id ? (
                                        <div className="w-4 h-4 border-t-2 border-red-600 rounded-full animate-spin" />
                                      ) : (
                                        <>
                                          <TrashIcon className="w-4 h-4" />
                                          Delete
                                        </>
                                      )}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Announcements;
