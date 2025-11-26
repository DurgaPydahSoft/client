import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend
} from 'chart.js';
import {
  PlusCircleIcon,
  XCircleIcon,
  CalendarIcon,
  ChatBubbleLeftRightIcon,
  ListBulletIcon,
  ChartPieIcon,
  ClockIcon,
  CheckCircleIcon,
  XMarkIcon,
  UserGroupIcon,
  ClockIcon as ClockSolidIcon,
  PlusIcon,
  MinusIcon,
  QuestionMarkCircleIcon,
  CalendarDaysIcon,
  ClockIcon as ClockOutlineIcon,
  EyeSlashIcon,
  LockClosedIcon
} from '@heroicons/react/24/outline';
import api from '../../utils/axios';
import { toast } from 'react-hot-toast';
import LoadingSpinner from '../../components/LoadingSpinner';
import Modal from '../../components/Modal';
import { useAuth } from '../../context/AuthContext';

// Register ChartJS components
ChartJS.register(ArcElement, Tooltip, Legend);

const PollManagement = () => {
  const { user } = useAuth();
  const [polls, setPolls] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [selectedPoll, setSelectedPoll] = useState(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    question: '',
    options: ['', ''],
    endTime: '',
    scheduledTime: ''
  });
  const [errors, setErrors] = useState({});
  const [processing, setProcessing] = useState(false);
  
  const isSuperAdmin = user?.role === 'super_admin';

  useEffect(() => {
    fetchPolls();
  }, []);

  const fetchPolls = async () => {
    try {
      const res = await api.get('/api/polls/admin/all');
      if (res.data.success) {
        setPolls(res.data.data);
      }
    } catch (err) {
      toast.error('Failed to fetch polls');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePoll = async (e) => {
    e.preventDefault();
    setErrors({});
    
    // Validate form
    const newErrors = {};
    if (!formData.question.trim()) newErrors.question = 'Question is required';
    if (formData.options.some(opt => !opt.trim())) newErrors.options = 'All options must be filled';
    if (!formData.endTime) newErrors.endTime = 'End time is required';
    
    // Validate scheduled time if provided
    if (formData.scheduledTime) {
      const scheduledTime = new Date(formData.scheduledTime);
      const endTime = new Date(formData.endTime);
      const now = new Date();
      
      if (scheduledTime <= now) {
        newErrors.scheduledTime = 'Scheduled time must be in the future';
      }
      if (scheduledTime >= endTime) {
        newErrors.scheduledTime = 'Scheduled time must be before end time';
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setProcessing(true);
    try {
      const res = await api.post('/api/polls', formData);
      if (res.data.success) {
        toast.success('Poll created successfully!');
        setShowCreateModal(false);
        setFormData({
          question: '',
          options: ['', ''],
          endTime: '',
          scheduledTime: ''
        });
        fetchPolls();
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to create poll';
      toast.error(errorMsg);
      if (err.response?.data?.errors) {
        setErrors(err.response.data.errors);
      }
    } finally {
      setProcessing(false);
    }
  };

  const handleEndPoll = async (pollId) => {
    try {
      const res = await api.post(`/api/polls/${pollId}/end`);
      if (res.data.success) {
        toast.success('Poll ended successfully');
        fetchPolls();
      } else {
        toast.error(res.data.message || 'Failed to end poll');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to end poll');
    }
  };

  const handleDeletePoll = async (pollId) => {
    try {
      await api.delete(`/api/polls/${pollId}`);
      toast.success('Poll deleted successfully');
      fetchPolls();
    } catch (err) {
      toast.error('Failed to delete poll');
    }
  };

  const addOption = () => {
    setFormData(prev => ({
      ...prev,
      options: [...prev.options, '']
    }));
  };

  const removeOption = (index) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index)
    }));
  };

  const updateOption = (index, value) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options.map((opt, i) => i === index ? value : opt)
    }));
  };

  const getChartData = (poll) => {
    const totalVotes = poll.options.reduce((sum, opt) => sum + opt.votes, 0);
    return {
      labels: poll.options.map(opt => opt.text),
      datasets: [{
        data: poll.options.map(opt => opt.votes),
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',  // blue-500
          'rgba(16, 185, 129, 0.8)',  // green-500
          'rgba(245, 158, 11, 0.8)',  // yellow-500
          'rgba(239, 68, 68, 0.8)',   // red-500
          'rgba(139, 92, 246, 0.8)',  // purple-500
          'rgba(14, 165, 233, 0.8)',  // sky-500
        ],
        borderColor: [
          'rgba(59, 130, 246, 1)',
          'rgba(16, 185, 129, 1)',
          'rgba(245, 158, 11, 1)',
          'rgba(239, 68, 68, 1)',
          'rgba(139, 92, 246, 1)',
          'rgba(14, 165, 233, 1)',
        ],
        borderWidth: 1,
      }]
    };
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="mx-auto px-4 sm:px-6 py-4 sm:py-6 mt-16 sm:mt-0">
      {/* Header Section */}
      <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-blue-900">Poll Management</h2>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">Create and manage polls for hostel residents</p>
          </div>
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="text-xs sm:text-sm text-gray-600 bg-gray-50 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg">
              Total: <span className="font-semibold text-gray-900">{polls.length}</span> polls
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowCreateModal(!showCreateModal)}
              className="flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 shadow-sm hover:shadow text-sm sm:text-base"
            >
              {showCreateModal ? (
                <>
                  <XMarkIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="hidden sm:inline">Cancel</span>
                  <span className="sm:hidden">Close</span>
                </>
              ) : (
                <>
                  <PlusCircleIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="hidden sm:inline">Create New Poll</span>
                  <span className="sm:hidden">New Poll</span>
                </>
              )}
            </motion.button>
          </div>
        </div>
      </div>

      {/* Create Poll Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Poll"
      >
        <form onSubmit={handleCreatePoll} className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <QuestionMarkCircleIcon className="w-5 h-5 text-blue-600" />
                Question
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <input
                  type="text"
                  value={formData.question}
                  onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                  className={`block w-full rounded-md border-2 border-blue-500 pl-10 pr-3 py-2.5 text-sm focus:border-blue-600 focus:ring-blue-500 ${
                    errors.question ? 'border-red-500' : ''
                  }`}
                  placeholder="Enter your poll question"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <ChatBubbleLeftRightIcon className="h-5 w-5 text-gray-400" />
                </div>
              </div>
              {errors.question && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <XCircleIcon className="w-4 h-4" />
                  {errors.question}
                </p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <ListBulletIcon className="w-5 h-5 text-blue-600" />
                Options
              </label>
              <div className="mt-2 space-y-3">
                {formData.options.map((option, index) => (
                  <div key={index} className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={option}
                        onChange={(e) => {
                          const newOptions = [...formData.options];
                          newOptions[index] = e.target.value;
                          setFormData({ ...formData, options: newOptions });
                        }}
                        className={`block w-full rounded-md border-2 border-blue-500 pl-10 pr-3 py-2.5 text-sm focus:border-blue-600 focus:ring-blue-500 ${
                          errors.options ? 'border-red-500' : ''
                        }`}
                        placeholder={`Option ${index + 1}`}
                      />
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-400 text-sm">{index + 1}.</span>
                      </div>
                    </div>
                    {formData.options.length > 2 && (
                      <button
                        type="button"
                        onClick={() => {
                          const newOptions = formData.options.filter((_, i) => i !== index);
                          setFormData({ ...formData, options: newOptions });
                        }}
                        className="inline-flex items-center p-2 border border-transparent rounded-md text-red-600 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                      >
                        <MinusIcon className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {errors.options && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <XCircleIcon className="w-4 h-4" />
                  {errors.options}
                </p>
              )}
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, options: [...formData.options, ''] })}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <PlusIcon className="h-5 w-5 mr-2" />
                  Add Option
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <ClockOutlineIcon className="w-5 h-5 text-blue-600" />
                  Scheduled Time (Optional)
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <input
                    type="datetime-local"
                    value={formData.scheduledTime}
                    onChange={(e) => setFormData({ ...formData, scheduledTime: e.target.value })}
                    className={`block w-full rounded-md border-2 border-blue-500 pl-10 pr-3 py-2.5 text-sm focus:border-blue-600 focus:ring-blue-500 ${
                      errors.scheduledTime ? 'border-red-500' : ''
                    }`}
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <CalendarDaysIcon className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
                {errors.scheduledTime && (
                  <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                    <XCircleIcon className="w-4 h-4" />
                    {errors.scheduledTime}
                  </p>
                )}
                <p className="mt-1 text-sm text-gray-500">Leave empty to create poll immediately</p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <CalendarDaysIcon className="w-5 h-5 text-blue-600" />
                  End Time
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <input
                    type="datetime-local"
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    className={`block w-full rounded-md border-2 border-blue-500 pl-10 pr-3 py-2.5 text-sm focus:border-blue-600 focus:ring-blue-500 ${
                      errors.endTime ? 'border-red-500' : ''
                    }`}
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <CalendarIcon className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
                {errors.endTime && (
                  <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                    <XCircleIcon className="w-4 h-4" />
                    {errors.endTime}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={processing}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {processing ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating...
                </>
              ) : (
                <>
                  <PlusCircleIcon className="h-5 w-5 mr-2" />
                  Create Poll
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {polls.length === 0 ? (
          <div className="col-span-full bg-gray-50 p-8 rounded-lg border border-gray-200 text-center">
            <ChartPieIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">No polls created yet.</p>
          </div>
        ) : (
          polls.map((poll) => (
            <motion.div
              key={poll._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl shadow-lg p-4 sm:p-6 border border-blue-100"
            >
              <div className="flex flex-col gap-3 mb-3">
                <h3 className="text-lg font-semibold text-blue-900 break-words">{poll.question}</h3>
                <div className="flex gap-2 w-full">
                  {/* Only show End/Delete buttons if user can manage this poll */}
                  {poll.canManage ? (
                    <>
                      {poll.status === 'active' && (
                        <button
                          onClick={() => handleEndPoll(poll._id)}
                          className="flex-1 sm:flex-none px-3 py-2 text-sm text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors duration-200 flex items-center gap-1.5"
                        >
                          <ClockIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                          <span className="hidden sm:inline">End Poll</span>
                          <span className="sm:hidden">End</span>
                        </button>
                      )}
                      <button
                        onClick={() => handleDeletePoll(poll._id)}
                        className="flex-1 sm:flex-none px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200 flex items-center gap-1.5"
                      >
                        <XCircleIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                        <span className="hidden sm:inline">Delete</span>
                        <span className="sm:hidden">Del</span>
                      </button>
                    </>
                  ) : (
                    <span className="text-xs text-gray-400 italic flex items-center gap-1">
                      <LockClosedIcon className="w-3 h-3" />
                      View only
                    </span>
                  )}
                </div>
              </div>

              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 ${
                  poll.status === 'active' 
                    ? 'bg-green-100 text-green-800'
                    : poll.status === 'scheduled'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {poll.status === 'active' ? (
                    <>
                      <CheckCircleIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                      Active
                    </>
                  ) : poll.status === 'scheduled' ? (
                    <>
                      <ClockSolidIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                      Scheduled
                    </>
                  ) : (
                    <>
                      <XCircleIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                      Ended
                    </>
                  )}
                </span>
                
                {poll.canViewResults && (
                  <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 flex items-center gap-1.5">
                    <ChartPieIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                    Results Visible
                  </span>
                )}
                
                {poll.status === 'scheduled' ? (
                  <span className="text-xs text-gray-500 flex items-center gap-1.5">
                    <CalendarIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                    Starts: {new Date(poll.scheduledTime).toLocaleString()}
                  </span>
                ) : (
                  <span className="text-xs text-gray-500 flex items-center gap-1.5">
                    <CalendarIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                    Ends: {new Date(poll.endTime).toLocaleString()}
                  </span>
                )}
              </div>
              
              {/* Poll Creator Info */}
              <div className="mb-3 text-xs text-gray-500 flex items-center gap-1.5">
                <UserGroupIcon className="w-3 h-3" />
                <span>Created by: <span className="font-medium text-gray-700">{poll.creatorName || poll.createdBy?.username || poll.createdBy?.name || 'Unknown'}</span></span>
              </div>

              {poll.status !== 'scheduled' && (
                <>
                  {poll.canViewResults ? (
                    <>
                      <div className="h-48">
                        <Pie data={getChartData(poll)} options={{
                          plugins: {
                            legend: {
                              position: 'bottom',
                              labels: {
                                padding: 15,
                                font: {
                                  size: 11
                                }
                              }
                            }
                          }
                        }} />
                      </div>

                      <div className="mt-3 space-y-2">
                        {poll.options.map((option, index) => (
                          <div key={index} className="flex justify-between items-center text-sm">
                            <span className="text-gray-700 truncate">{option.text}</span>
                            <span className="text-blue-600 font-medium ml-2 whitespace-nowrap flex items-center gap-1.5">
                              <UserGroupIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                              {option.votes} votes
                            </span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex flex-col items-center justify-center text-center py-4">
                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                          <LockClosedIcon className="w-6 h-6 text-gray-400" />
                        </div>
                        <p className="text-sm font-medium text-gray-700 mb-1">Results Hidden</p>
                        <p className="text-xs text-gray-500">Only the poll creator and Super Admin can view results</p>
                      </div>
                      <div className="mt-3 space-y-2">
                        {poll.options.map((option, index) => (
                          <div key={index} className="flex items-center gap-2 text-sm text-gray-600">
                            <span className="w-5 h-5 flex items-center justify-center bg-gray-100 text-gray-500 rounded-full text-xs font-medium">
                              {index + 1}
                            </span>
                            <span className="truncate">{option.text}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {poll.status === 'scheduled' && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2 text-blue-700">
                    <ClockSolidIcon className="w-5 h-5" />
                    <p className="text-sm font-medium">This poll will become active at the scheduled time</p>
                  </div>
                  <div className="mt-3 space-y-2">
                    {poll.options.map((option, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm text-gray-600">
                        <span className="w-5 h-5 flex items-center justify-center bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                          {index + 1}
                        </span>
                        <span>{option.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};

export default PollManagement; 