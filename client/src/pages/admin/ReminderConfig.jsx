import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useGlobalSettings } from '../../context/GlobalSettingsContext';
import {
  BellIcon,
  Cog6ToothIcon,
  ClockIcon,
  EnvelopeIcon,
  DevicePhoneMobileIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import LoadingSpinner from '../../components/LoadingSpinner';
import toast from 'react-hot-toast';
import api from '../../utils/axios';

const ReminderConfig = () => {
  const { user } = useAuth();
  const { settings } = useGlobalSettings();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('pre'); // 'pre', 'post', 'auto', 'terms'
  const [config, setConfig] = useState({
    preReminders: {
      email: {
        enabled: true,
        daysBeforeDue: [7, 3, 1],
        template: 'pre_reminder_email'
      },
      push: {
        enabled: true,
        daysBeforeDue: [5, 2, 1],
        template: 'pre_reminder_push'
      },
      sms: {
        enabled: false,
        daysBeforeDue: [3, 1],
        template: 'pre_reminder_sms'
      }
    },
    postReminders: {
      email: {
        enabled: true,
        daysAfterDue: [1, 3, 7, 14],
        template: 'post_reminder_email'
      },
      push: {
        enabled: true,
        daysAfterDue: [1, 2, 5, 10],
        template: 'post_reminder_push'
      },
      sms: {
        enabled: false,
        daysAfterDue: [1, 3, 7],
        template: 'post_reminder_sms'
      }
    },
    autoReminders: {
      enabled: true,
      frequency: 'weekly',
      maxPreReminders: 3,
      maxPostReminders: 4
    }
  });

  // Term due date configuration state
  const [termConfigs, setTermConfigs] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedAcademicYear, setSelectedAcademicYear] = useState('');
  const [selectedYearOfStudy, setSelectedYearOfStudy] = useState('');
  const [courses, setCourses] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [showTermConfigForm, setShowTermConfigForm] = useState(false);
  const [editingConfig, setEditingConfig] = useState(null);
  const [selectedCourseDetails, setSelectedCourseDetails] = useState(null);

  useEffect(() => {
    fetchReminderConfig();
    fetchTermConfigs();
    fetchCourses();
    fetchAcademicYears();
  }, []);

  const fetchReminderConfig = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/reminder-config');
      
      if (response.data.success) {
        setConfig(response.data.data);
        } else {
        setError(response.data.message || 'Failed to load reminder configuration');
      }
    } catch (err) {
      console.error('Error fetching reminder config:', err);
      setError('Failed to load reminder configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleConfigChange = (section, subsection, key, value) => {
    setConfig(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [subsection]: {
          ...prev[section][subsection],
          [key]: value
        }
      }
    }));
  };

  const handleAutoConfigChange = (key, value) => {
    setConfig(prev => ({
      ...prev,
      autoReminders: {
        ...prev.autoReminders,
        [key]: value
      }
    }));
  };

  const handleSaveConfig = async () => {
    try {
      setLoading(true);
      const response = await api.put('/api/reminder-config', config);
      
      if (response.data.success) {
        toast.success('Reminder configuration saved successfully!');
          setError(null);
        } else {
        setError(response.data.message || 'Failed to save reminder configuration');
        toast.error(response.data.message || 'Failed to save reminder configuration');
      }
    } catch (err) {
      console.error('Error saving reminder config:', err);
      setError('Failed to save reminder configuration');
      toast.error(err.response?.data?.message || 'Failed to save reminder configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleTestReminder = async (section, type) => {
    try {
      setLoading(true);
      const response = await api.post(`/api/reminder-config/test/${section}/${type}`, {
          testEmail: 'admin@example.com',
          testMessage: `This is a test ${section} ${type} reminder`
      });
      
      if (response.data.success) {
        toast.success(`Test ${type} reminder sent successfully!`);
          setError(null);
        } else {
        setError(response.data.message || `Failed to test ${section} ${type} reminder`);
        toast.error(response.data.message || `Failed to test ${section} ${type} reminder`);
      }
    } catch (err) {
      console.error(`Error testing ${section} ${type} reminder:`, err);
      setError(`Failed to test ${section} ${type} reminder`);
      toast.error(err.response?.data?.message || `Failed to test ${section} ${type} reminder`);
    } finally {
      setLoading(false);
    }
  };

  // Term due date configuration functions
  const fetchTermConfigs = async () => {
    try {
      const response = await api.get('/api/reminder-config/term-due-dates');
      if (response.data.success) {
        setTermConfigs(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching term configs:', error);
    }
  };

  const fetchCourses = async () => {
    try {
      const response = await api.get('/api/course-management/courses');
      if (response.data.success) {
        setCourses(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
    }
  };

  const fetchAcademicYears = async () => {
    try {
      const response = await api.get('/api/fee-structure/academic-years');
      if (response.data.success) {
        setAcademicYears(response.data.data || []);
      } else {
        // Fallback: generate academic years for the next 5 years
        const currentYear = new Date().getFullYear();
        const years = [];
        for (let i = 0; i < 5; i++) {
          const year = currentYear + i;
          years.push(`${year}-${year + 1}`);
        }
        setAcademicYears(years);
      }
    } catch (error) {
      console.error('Error fetching academic years:', error);
      // Fallback: generate academic years
      const currentYear = new Date().getFullYear();
      const years = [];
      for (let i = 0; i < 5; i++) {
        const year = currentYear + i;
        years.push(`${year}-${year + 1}`);
      }
      setAcademicYears(years);
    }
  };

  const handleSaveTermConfig = async (formData) => {
    try {
      setLoading(true);
      const response = await api.put('/api/reminder-config/term-due-dates', formData);

      if (response.data.success) {
        toast.success('Term configuration saved successfully!');
        setError(null);
        fetchTermConfigs();
        setShowTermConfigForm(false);
        setEditingConfig(null);
      } else {
        setError(response.data.message || 'Failed to save configuration');
        toast.error(response.data.message || 'Failed to save configuration');
      }
    } catch (error) {
      console.error('Error saving term config:', error);
      setError('Failed to save configuration');
      toast.error(error.response?.data?.message || 'Failed to save configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleEditConfig = (config) => {
    setEditingConfig(config);
    setSelectedCourse(config.course._id);
    setSelectedAcademicYear(config.academicYear);
    setSelectedYearOfStudy(config.yearOfStudy);
    
    // Set course details for year options
    const course = courses.find(c => c._id === config.course._id);
    setSelectedCourseDetails(course);
    
    setShowTermConfigForm(true);
  };

  const handleCourseChange = (courseId) => {
    setSelectedCourse(courseId);
    setSelectedYearOfStudy('');
    
    // Find course details
    const course = courses.find(c => c._id === courseId);
    setSelectedCourseDetails(course);
  };

  const getYearOptions = () => {
    if (!selectedCourseDetails) return [];
    
    const years = [];
    for (let i = 1; i <= selectedCourseDetails.duration; i++) {
      years.push(i);
    }
    return years;
  };

  const handleDeleteConfig = async (config) => {
    if (!window.confirm(`Are you sure you want to delete the configuration for ${config.course?.name} - ${config.academicYear} - Year ${config.yearOfStudy}?`)) {
      return;
    }

    try {
      setLoading(true);
      const response = await api.delete(`/api/reminder-config/term-due-dates/${config.course._id}/${config.academicYear}/${config.yearOfStudy}`);

      if (response.data.success) {
        toast.success('Configuration deleted successfully!');
        setError(null);
        fetchTermConfigs();
      } else {
        setError(response.data.message || 'Failed to delete configuration');
        toast.error(response.data.message || 'Failed to delete configuration');
      }
    } catch (error) {
      console.error('Error deleting config:', error);
      setError('Failed to delete configuration');
      toast.error(error.response?.data?.message || 'Failed to delete configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleRecalculateDates = async () => {
    if (!window.confirm('This will recalculate reminder dates for all students based on current configurations. Continue?')) {
      return;
    }

    try {
      setLoading(true);
      const response = await api.post('/api/reminder-config/recalculate-dates');

      if (response.data.success) {
        toast.success('Reminder dates recalculated successfully!');
        setError(null);
      } else {
        setError(response.data.message || 'Failed to recalculate dates');
        toast.error(response.data.message || 'Failed to recalculate dates');
      }
    } catch (error) {
      console.error('Error recalculating dates:', error);
      setError('Failed to recalculate dates');
      toast.error(error.response?.data?.message || 'Failed to recalculate dates');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !config.preReminders) {
    return <LoadingSpinner />;
  }

  // Reusable Reminder Channel Component
  const ReminderChannel = ({ section, type, icon: Icon, label, daysKey, availableDays, testLabel }) => {
    const channelConfig = config[section][type];
    const isPre = section === 'preReminders';
    const days = channelConfig[daysKey] || [];

    const handleDayChange = (index, value) => {
      // Allow empty string for editing
      if (value === '') {
        const newDays = [...days];
        newDays[index] = '';
        handleConfigChange(section, type, daysKey, newDays);
        return;
      }
      
      const numValue = parseInt(value);
      if (isNaN(numValue) || numValue < 1 || numValue > 365) {
        return; // Invalid input, ignore
      }
      
      const newDays = [...days];
      newDays[index] = numValue;
      // Remove duplicates and sort (filter out empty strings)
      const validDays = newDays.filter(d => d !== '' && !isNaN(d));
      const uniqueDays = [...new Set(validDays)].sort((a, b) => a - b);
      handleConfigChange(section, type, daysKey, uniqueDays);
    };

    const handleAddDay = () => {
      // Add empty string to allow user to type the value
      const newDays = [...days, ''];
      handleConfigChange(section, type, daysKey, newDays);
    };

    const handleRemoveDay = (index) => {
      const newDays = days.filter((_, i) => i !== index);
      // Filter out empty strings and sort
      const validDays = newDays.filter(d => d !== '' && !isNaN(d));
      handleConfigChange(section, type, daysKey, validDays);
    };

    const handleDayBlur = (index) => {
      const day = days[index];
      // If empty or invalid, remove it
      if (day === '' || isNaN(day) || day < 1 || day > 365) {
        handleRemoveDay(index);
      }
    };

  return (
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${channelConfig.enabled ? 'bg-blue-100' : 'bg-gray-100'}`}>
              <Icon className={`w-5 h-5 ${channelConfig.enabled ? 'text-blue-600' : 'text-gray-400'}`} />
            </div>
          <div>
              <h4 className="text-sm font-semibold text-gray-900">{label}</h4>
              <p className="text-xs text-gray-500">{isPre ? 'Before due date' : 'After due date'}</p>
          </div>
        </div>
          <div className="flex items-center gap-2">
              <button
              onClick={() => handleTestReminder(section === 'preReminders' ? 'pre' : 'post', type)}
              className="px-2.5 py-1.5 text-xs bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors duration-200 font-medium"
              >
              Test
              </button>
            <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                checked={channelConfig.enabled}
                onChange={(e) => handleConfigChange(section, type, 'enabled', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
            </div>
          </div>

        {channelConfig.enabled && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-medium text-gray-700">
                {isPre ? 'Days before due date' : 'Days after due date'}
              </label>
              <button
                onClick={handleAddDay}
                type="button"
                className="px-2 py-1 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 font-medium flex items-center gap-1"
              >
                <span>+</span>
                <span>Add Day</span>
              </button>
            </div>
            {days.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {days.map((day, index) => (
                  <div key={index} className="flex items-center gap-1.5 bg-white border border-gray-300 rounded-lg px-2 py-1.5">
                    <input
                      type="number"
                      min="1"
                      max="365"
                      value={day === '' ? '' : day}
                      placeholder="Enter days"
                      onChange={(e) => handleDayChange(index, e.target.value)}
                      onBlur={() => handleDayBlur(index)}
                      className="w-20 px-2 py-1 text-xs border-0 focus:ring-2 focus:ring-blue-500 rounded text-gray-900 font-medium placeholder:text-gray-400"
                    />
                    <span className="text-xs text-gray-500">days</span>
                    <button
                      onClick={() => handleRemoveDay(index)}
                      type="button"
                      className="ml-1 p-0.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors duration-200"
                      title="Remove"
                    >
                      <XMarkIcon className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-xs text-gray-500 bg-white border border-gray-200 rounded-lg">
                No days configured. Click "Add Day" to add reminder days.
              </div>
            )}
            </div>
        )}
          </div>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Cog6ToothIcon className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
              Reminder Configurations
            </h2>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">
              Configure automated reminder settings for fee payments
            </p>
        </div>
              <button
            onClick={handleSaveConfig}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center justify-center gap-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
            <CheckCircleIcon className="w-4 h-4" />
            Save Configuration
              </button>
            </div>
              </div>
              
      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex overflow-x-auto -mb-px" aria-label="Tabs">
            {[
              { id: 'pre', label: 'Pre Reminders', icon: ClockIcon, activeClass: 'border-green-600 text-green-600' },
              { id: 'post', label: 'Post Reminders', icon: ExclamationTriangleIcon, activeClass: 'border-red-600 text-red-600' },
              { id: 'auto', label: 'Auto Settings', icon: Cog6ToothIcon, activeClass: 'border-blue-600 text-blue-600' },
              { id: 'terms', label: 'Term Dates', icon: ClockIcon, activeClass: 'border-purple-600 text-purple-600' }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
              <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-2 px-4 sm:px-6 py-3 sm:py-4 text-sm font-medium border-b-2 transition-colors duration-200 whitespace-nowrap
                    ${activeTab === tab.id
                      ? tab.activeClass
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
              </button>
              );
            })}
          </nav>
            </div>
            
        {/* Tab Content */}
        <div className="p-4 sm:p-6">
          {/* Pre Reminders Tab */}
          {activeTab === 'pre' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <ClockIcon className="w-5 h-5 text-green-600" />
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">Pre Reminders</h3>
                <span className="text-xs sm:text-sm text-gray-500">(Before due date)</span>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <ReminderChannel
                  section="preReminders"
                  type="email"
                  icon={EnvelopeIcon}
                  label="Email"
                  daysKey="daysBeforeDue"
                  availableDays={[1, 2, 3, 5, 7, 14, 30]}
                />
                <ReminderChannel
                  section="preReminders"
                  type="push"
                  icon={DevicePhoneMobileIcon}
                  label="Push Notification"
                  daysKey="daysBeforeDue"
                  availableDays={[1, 2, 3, 5, 7]}
                />
                <ReminderChannel
                  section="preReminders"
                  type="sms"
                  icon={BellIcon}
                  label="SMS"
                  daysKey="daysBeforeDue"
                  availableDays={[1, 2, 3, 5]}
                />
                </div>
              </div>
          )}

          {/* Post Reminders Tab */}
          {activeTab === 'post' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">Post Reminders</h3>
                <span className="text-xs sm:text-sm text-gray-500">(After due date)</span>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <ReminderChannel
                  section="postReminders"
                  type="email"
                  icon={EnvelopeIcon}
                  label="Email"
                  daysKey="daysAfterDue"
                  availableDays={[1, 2, 3, 5, 7, 14, 21, 30]}
                />
                <ReminderChannel
                  section="postReminders"
                  type="push"
                  icon={DevicePhoneMobileIcon}
                  label="Push Notification"
                  daysKey="daysAfterDue"
                  availableDays={[1, 2, 3, 5, 7, 10, 14]}
                />
                <ReminderChannel
                  section="postReminders"
                  type="sms"
                  icon={BellIcon}
                  label="SMS"
                  daysKey="daysAfterDue"
                  availableDays={[1, 2, 3, 5, 7, 14]}
                />
                </div>
              </div>
          )}

          {/* Auto Reminders Tab */}
          {activeTab === 'auto' && (
            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-4">
                <Cog6ToothIcon className="w-5 h-5 text-blue-600" />
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">Auto Reminder Settings</h3>
        </div>
        
              <div className="bg-gray-50 rounded-lg p-4 sm:p-6 border border-gray-200 space-y-4">
          <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-semibold text-gray-900">Enable Auto Reminders</label>
                    <p className="text-xs text-gray-500 mt-0.5">Automatically send reminders based on schedule</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={config.autoReminders.enabled}
              onChange={(e) => handleAutoConfigChange('enabled', e.target.checked)}
                      className="sr-only peer"
            />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
          </div>
          
                {config.autoReminders.enabled && (
                  <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reminder Frequency
            </label>
            <select
              value={config.autoReminders.frequency}
              onChange={(e) => handleAutoConfigChange('frequency', e.target.value)}
                        className="block w-full sm:w-auto min-w-[200px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                          Max Pre Reminders per Student
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={config.autoReminders.maxPreReminders}
                onChange={(e) => handleAutoConfigChange('maxPreReminders', parseInt(e.target.value))}
                          className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                          Max Post Reminders per Student
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={config.autoReminders.maxPostReminders}
                onChange={(e) => handleAutoConfigChange('maxPostReminders', parseInt(e.target.value))}
                          className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>
          </div>
                  </>
                )}
        </div>
      </div>
          )}

          {/* Term Due Date Configuration Tab */}
          {activeTab === 'terms' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div>
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <ClockIcon className="w-5 h-5 text-purple-600" />
              Term Due Date Configuration
            </h3>
                  <p className="text-xs sm:text-sm text-gray-600 mt-1">
                    Configure term due dates per course, academic year, and year of study
            </p>
          </div>
                <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={handleRecalculateDates}
                    disabled={loading}
                    className="px-3 sm:px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200 flex items-center justify-center gap-2 text-sm font-medium disabled:opacity-50"
            >
              <ClockIcon className="w-4 h-4" />
                    Recalculate
            </button>
            <button
              onClick={async () => {
                if (!window.confirm('This will process late fees for all students who have crossed their due dates. Continue?')) {
                  return;
                }
                try {
                  setLoading(true);
                  const response = await api.post('/api/reminder-config/process-late-fees');
                  if (response.data.success) {
                    toast.success(`Late fee processing completed! Processed ${response.data.data.processedCount} students, Applied ${response.data.data.lateFeeAppliedCount} late fees.`);
                    setError(null);
                  } else {
                    setError(response.data.message || 'Failed to process late fees');
                    toast.error(response.data.message || 'Failed to process late fees');
                  }
                } catch (error) {
                  console.error('Error processing late fees:', error);
                  setError('Failed to process late fees');
                  toast.error(error.response?.data?.message || 'Failed to process late fees');
                } finally {
                  setLoading(false);
                }
              }}
                    disabled={loading}
                    className="px-3 sm:px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors duration-200 flex items-center justify-center gap-2 text-sm font-medium disabled:opacity-50"
            >
              <ExclamationTriangleIcon className="w-4 h-4" />
                    Process Late Fees
            </button>
            <button
              onClick={() => setShowTermConfigForm(true)}
                    className="px-3 sm:px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors duration-200 flex items-center justify-center gap-2 text-sm font-medium"
            >
              <Cog6ToothIcon className="w-4 h-4" />
                    Add Config
            </button>
          </div>
        </div>

        {/* Existing Configurations */}
        {termConfigs.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {termConfigs.map((config, index) => (
                    <div key={index} className="bg-gray-50 border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow duration-200">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-gray-900 text-sm mb-1 truncate">
                            {config.course?.name || 'Unknown Course'}
                    </h4>
                          <p className="text-xs text-gray-600">
                            {config.academicYear} • Year {config.yearOfStudy}
                          </p>
                      </div>
                        <div className="flex gap-1 ml-2">
                    <button
                      onClick={() => handleEditConfig(config)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors duration-200"
                            title="Edit"
                    >
                            <Cog6ToothIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteConfig(config)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors duration-200"
                            title="Delete"
                    >
                            <XMarkIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                      <div className="space-y-2">
                        {['term1', 'term2', 'term3'].map((term, idx) => (
                          <div key={term} className="space-y-1 pb-2 border-b border-gray-200 last:border-0 last:pb-0">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-gray-600 font-medium">Term {idx + 1}:</span>
                              <span className="text-gray-900 font-semibold">{config.termDueDates[term].daysFromSemesterStart} days</span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-blue-600 font-medium">From:</span>
                              <span className="text-blue-700 font-semibold text-[10px]">
                                {config.termDueDates[term].referenceSemester || 'Sem 1'}
                              </span>
                            </div>
                            {config.termDueDates[term].lateFee > 0 && (
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-orange-600 font-medium">Late Fee:</span>
                                <span className="text-orange-700 font-semibold">₹{config.termDueDates[term].lateFee}</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
              </div>
            ))}
          </div>
        ) : (
                <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
            <ClockIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-sm text-gray-500 font-medium">No term configurations found</p>
                  <p className="text-xs text-gray-400 mt-1">Click "Add Config" to create one</p>
          </div>
        )}
            </div>
          )}
        </div>
      </div>

      {/* Term Configuration Form Modal */}
      {showTermConfigForm && (
        <TermConfigForm
          courses={courses}
          academicYears={academicYears}
          selectedCourse={selectedCourse}
          selectedAcademicYear={selectedAcademicYear}
          selectedYearOfStudy={selectedYearOfStudy}
          editingConfig={editingConfig}
          onSave={handleSaveTermConfig}
          onCancel={() => {
            setShowTermConfigForm(false);
            setEditingConfig(null);
            setSelectedCourse('');
            setSelectedAcademicYear('');
            setSelectedYearOfStudy('');
            setSelectedCourseDetails(null);
          }}
          onCourseChange={handleCourseChange}
          getYearOptions={getYearOptions}
        />
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2">
          <ExclamationTriangleIcon className="w-5 h-5 text-red-600 flex-shrink-0" />
          <span className="text-sm text-red-700">{error}</span>
        </div>
      )}
    </div>
  );
};

// Term Configuration Form Component
const TermConfigForm = ({ 
  courses, 
  academicYears, 
  selectedCourse, 
  selectedAcademicYear, 
  selectedYearOfStudy, 
  editingConfig, 
  onSave, 
  onCancel,
  onCourseChange,
  getYearOptions
}) => {
  const [formData, setFormData] = useState({
    courseId: selectedCourse || '',
    academicYear: selectedAcademicYear || '',
    yearOfStudy: selectedYearOfStudy || '',
    termDueDates: {
      term1: { daysFromSemesterStart: 5, referenceSemester: 'Semester 1', description: 'Term 1 Due Date', lateFee: 0 },
      term2: { daysFromSemesterStart: 90, referenceSemester: 'Semester 1', description: 'Term 2 Due Date', lateFee: 0 },
      term3: { daysFromSemesterStart: 210, referenceSemester: 'Semester 2', description: 'Term 3 Due Date', lateFee: 0 }
    },
    reminderDays: {
      term1: { preReminders: [7, 3, 1], postReminders: [1, 3, 7] },
      term2: { preReminders: [7, 3, 1], postReminders: [1, 3, 7] },
      term3: { preReminders: [7, 3, 1], postReminders: [1, 3, 7] }
    }
  });

  useEffect(() => {
    if (editingConfig) {
      // Ensure lateFee and referenceSemester are included when editing
      const termDueDates = {
        term1: {
          ...editingConfig.termDueDates.term1,
          referenceSemester: editingConfig.termDueDates.term1.referenceSemester || 'Semester 1',
          lateFee: editingConfig.termDueDates.term1.lateFee || 0
        },
        term2: {
          ...editingConfig.termDueDates.term2,
          referenceSemester: editingConfig.termDueDates.term2.referenceSemester || 'Semester 1',
          lateFee: editingConfig.termDueDates.term2.lateFee || 0
        },
        term3: {
          ...editingConfig.termDueDates.term3,
          referenceSemester: editingConfig.termDueDates.term3.referenceSemester || 'Semester 1',
          lateFee: editingConfig.termDueDates.term3.lateFee || 0
        }
      };
      
      // Include reminderDays from existing config or use defaults
      const reminderDays = editingConfig.reminderDays || {
        term1: { preReminders: [7, 3, 1], postReminders: [1, 3, 7] },
        term2: { preReminders: [7, 3, 1], postReminders: [1, 3, 7] },
        term3: { preReminders: [7, 3, 1], postReminders: [1, 3, 7] }
      };
      
      setFormData({
        courseId: editingConfig.course._id,
        academicYear: editingConfig.academicYear,
        yearOfStudy: editingConfig.yearOfStudy,
        termDueDates: termDueDates,
        reminderDays: reminderDays
      });
    }
  }, [editingConfig]);

  const handleInputChange = (path, value) => {
    setFormData(prev => {
      const newData = { ...prev };
      const keys = path.split('.');
      let current = newData;
      
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = value;
      return newData;
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onCancel}>
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 sm:p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900">
              {editingConfig ? 'Edit' : 'Add'} Term Due Date Configuration
            </h3>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Course
                </label>
                <select
                  value={formData.courseId}
                  onChange={(e) => {
                    handleInputChange('courseId', e.target.value);
                    onCourseChange(e.target.value);
                  }}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm"
                  required
                >
                  <option value="">Select Course</option>
                  {courses.map(course => (
                    <option key={course._id} value={course._id}>
                      {course.name} ({course.duration} years)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Academic Year
                </label>
                <select
                  value={formData.academicYear}
                  onChange={(e) => handleInputChange('academicYear', e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm"
                  required
                >
                  <option value="">Select Academic Year</option>
                  {academicYears.map(year => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Year of Study
                </label>
                <select
                  value={formData.yearOfStudy}
                  onChange={(e) => handleInputChange('yearOfStudy', parseInt(e.target.value))}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm"
                  required
                  disabled={!formData.courseId}
                >
                  <option value="">Select Year</option>
                  {getYearOptions().map(year => (
                    <option key={year} value={year}>
                      Year {year}
                    </option>
                  ))}
                </select>
                {!formData.courseId && (
                  <p className="text-xs text-gray-500 mt-1">Please select a course first</p>
                )}
              </div>
            </div>

            {/* Term Due Dates */}
            <div>
              <h4 className="text-base font-semibold text-gray-900 mb-4">Term Due Dates Configuration</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {['term1', 'term2', 'term3'].map(term => (
                  <div key={term} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <h5 className="font-medium text-gray-900 mb-3 text-sm capitalize">{term.replace('term', 'Term ')}</h5>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">
                          Reference Semester
                        </label>
                        <select
                          value={formData.termDueDates[term].referenceSemester || 'Semester 1'}
                          onChange={(e) => handleInputChange(`termDueDates.${term}.referenceSemester`, e.target.value)}
                          className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm"
                        >
                          <option value="Semester 1">Semester 1</option>
                          <option value="Semester 2">Semester 2</option>
                        </select>
                        <p className="text-xs text-gray-500 mt-1">Which semester start date to use as reference</p>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">
                          Days from Semester Start
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="365"
                          value={formData.termDueDates[term].daysFromSemesterStart}
                          onChange={(e) => handleInputChange(`termDueDates.${term}.daysFromSemesterStart`, parseInt(e.target.value))}
                          className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">
                          Description
                        </label>
                        <input
                          type="text"
                          value={formData.termDueDates[term].description}
                          onChange={(e) => handleInputChange(`termDueDates.${term}.description`, e.target.value)}
                          className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">
                          Late Fee (₹)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={formData.termDueDates[term].lateFee || 0}
                          onChange={(e) => handleInputChange(`termDueDates.${term}.lateFee`, parseFloat(e.target.value) || 0)}
                          className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm"
                          placeholder="0"
                        />
                        <p className="text-xs text-gray-500 mt-1">Fixed amount charged once after due date passes</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors duration-200 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center gap-2 text-sm font-medium"
              >
                <CheckCircleIcon className="w-4 h-4" />
                {editingConfig ? 'Update' : 'Save'} Configuration
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ReminderConfig;
