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
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import LoadingSpinner from '../../components/LoadingSpinner';

const ReminderConfig = () => {
  const { user } = useAuth();
  const { settings } = useGlobalSettings();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
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
      const response = await fetch('/api/reminder-config', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setConfig(data.data);
        } else {
          setError(data.message || 'Failed to load reminder configuration');
        }
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to load reminder configuration');
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
      const response = await fetch('/api/reminder-config', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(config)
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setError(null);
          // Show success message (you can add a toast notification here)
        } else {
          setError(data.message || 'Failed to save reminder configuration');
        }
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to save reminder configuration');
      }
    } catch (err) {
      console.error('Error saving reminder config:', err);
      setError('Failed to save reminder configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleTestReminder = async (section, type) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/reminder-config/test/${section}/${type}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          testEmail: 'admin@example.com',
          testMessage: `This is a test ${section} ${type} reminder`
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setError(null);
          // Show success message (you can add a toast notification here)
        } else {
          setError(data.message || `Failed to test ${section} ${type} reminder`);
        }
      } else {
        const errorData = await response.json();
        setError(errorData.message || `Failed to test ${section} ${type} reminder`);
      }
    } catch (err) {
      console.error(`Error testing ${section} ${type} reminder:`, err);
      setError(`Failed to test ${section} ${type} reminder`);
    } finally {
      setLoading(false);
    }
  };

  // Term due date configuration functions
  const fetchTermConfigs = async () => {
    try {
      const response = await fetch('/api/reminder-config/term-due-dates', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setTermConfigs(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching term configs:', error);
    }
  };

  const fetchCourses = async () => {
    try {
      const response = await fetch('/api/course-management/courses', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setCourses(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
    }
  };

  const fetchAcademicYears = async () => {
    try {
      const response = await fetch('/api/fee-structure/academic-years', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAcademicYears(data.data || []);
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
      const response = await fetch('/api/reminder-config/term-due-dates', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setError(null);
        fetchTermConfigs();
        setShowTermConfigForm(false);
        setEditingConfig(null);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to save configuration');
      }
    } catch (error) {
      console.error('Error saving term config:', error);
      setError('Failed to save configuration');
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
    setSelectedYearOfStudy(''); // Reset year selection
    
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
      const response = await fetch(`/api/reminder-config/term-due-dates/${config.course._id}/${config.academicYear}/${config.yearOfStudy}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setError(null);
        fetchTermConfigs();
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to delete configuration');
      }
    } catch (error) {
      console.error('Error deleting config:', error);
      setError('Failed to delete configuration');
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
      const response = await fetch('/api/reminder-config/recalculate-dates', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setError(null);
        // Show success message (you can add a toast notification here)
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to recalculate dates');
      }
    } catch (error) {
      console.error('Error recalculating dates:', error);
      setError('Failed to recalculate dates');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Cog6ToothIcon className="w-6 h-6 text-blue-600" />
              Reminder Configurations
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Configure automated reminder settings for fee payments
            </p>
          </div>
          <button
            onClick={handleSaveConfig}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center gap-2"
          >
            <CheckCircleIcon className="w-4 h-4" />
            Save Configuration
          </button>
        </div>
      </div>

      {/* Pre Reminders Configuration */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <ClockIcon className="w-6 h-6 text-green-600" />
          <h3 className="text-lg font-semibold text-gray-900">Pre Reminders</h3>
          <span className="text-sm text-gray-500">(Before due date)</span>
        </div>
        
        <div className="space-y-6">
          {/* Email Pre Reminders */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-4">
              <EnvelopeIcon className="w-5 h-5 text-blue-600" />
              <h4 className="text-md font-semibold text-gray-900">Email Pre Reminders</h4>
              <button
                onClick={() => handleTestReminder('pre', 'email')}
                className="ml-auto px-3 py-1 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors duration-200"
              >
                Test Email
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">Enable Email Pre Reminders</label>
                <input
                  type="checkbox"
                  checked={config.preReminders.email.enabled}
                  onChange={(e) => handleConfigChange('preReminders', 'email', 'enabled', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Send reminders (days before due date)
                </label>
                <div className="flex gap-2 flex-wrap">
                  {[1, 2, 3, 5, 7, 14, 30].map(day => (
                    <label key={day} className="flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={config.preReminders.email.daysBeforeDue.includes(day)}
                        onChange={(e) => {
                          const newDays = e.target.checked
                            ? [...config.preReminders.email.daysBeforeDue, day].sort((a, b) => a - b)
                            : config.preReminders.email.daysBeforeDue.filter(d => d !== day);
                          handleConfigChange('preReminders', 'email', 'daysBeforeDue', newDays);
                        }}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="text-sm text-gray-700">{day} day{day > 1 ? 's' : ''}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Push Pre Reminders */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-4">
              <DevicePhoneMobileIcon className="w-5 h-5 text-blue-600" />
              <h4 className="text-md font-semibold text-gray-900">Push Pre Reminders</h4>
              <button
                onClick={() => handleTestReminder('pre', 'push')}
                className="ml-auto px-3 py-1 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors duration-200"
              >
                Test Push
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">Enable Push Pre Reminders</label>
                <input
                  type="checkbox"
                  checked={config.preReminders.push.enabled}
                  onChange={(e) => handleConfigChange('preReminders', 'push', 'enabled', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Send notifications (days before due date)
                </label>
                <div className="flex gap-2 flex-wrap">
                  {[1, 2, 3, 5, 7].map(day => (
                    <label key={day} className="flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={config.preReminders.push.daysBeforeDue.includes(day)}
                        onChange={(e) => {
                          const newDays = e.target.checked
                            ? [...config.preReminders.push.daysBeforeDue, day].sort((a, b) => a - b)
                            : config.preReminders.push.daysBeforeDue.filter(d => d !== day);
                          handleConfigChange('preReminders', 'push', 'daysBeforeDue', newDays);
                        }}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="text-sm text-gray-700">{day} day{day > 1 ? 's' : ''}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* SMS Pre Reminders */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-4">
              <BellIcon className="w-5 h-5 text-blue-600" />
              <h4 className="text-md font-semibold text-gray-900">SMS Pre Reminders</h4>
              <button
                onClick={() => handleTestReminder('pre', 'sms')}
                className="ml-auto px-3 py-1 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors duration-200"
              >
                Test SMS
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">Enable SMS Pre Reminders</label>
                <input
                  type="checkbox"
                  checked={config.preReminders.sms.enabled}
                  onChange={(e) => handleConfigChange('preReminders', 'sms', 'enabled', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Send SMS (days before due date)
                </label>
                <div className="flex gap-2 flex-wrap">
                  {[1, 2, 3, 5].map(day => (
                    <label key={day} className="flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={config.preReminders.sms.daysBeforeDue.includes(day)}
                        onChange={(e) => {
                          const newDays = e.target.checked
                            ? [...config.preReminders.sms.daysBeforeDue, day].sort((a, b) => a - b)
                            : config.preReminders.sms.daysBeforeDue.filter(d => d !== day);
                          handleConfigChange('preReminders', 'sms', 'daysBeforeDue', newDays);
                        }}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="text-sm text-gray-700">{day} day{day > 1 ? 's' : ''}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Post Reminders Configuration */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <ExclamationTriangleIcon className="w-6 h-6 text-red-600" />
          <h3 className="text-lg font-semibold text-gray-900">Post Reminders</h3>
          <span className="text-sm text-gray-500">(After due date)</span>
        </div>
        
        <div className="space-y-6">
          {/* Email Post Reminders */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-4">
              <EnvelopeIcon className="w-5 h-5 text-blue-600" />
              <h4 className="text-md font-semibold text-gray-900">Email Post Reminders</h4>
              <button
                onClick={() => handleTestReminder('post', 'email')}
                className="ml-auto px-3 py-1 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors duration-200"
              >
                Test Email
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">Enable Email Post Reminders</label>
                <input
                  type="checkbox"
                  checked={config.postReminders.email.enabled}
                  onChange={(e) => handleConfigChange('postReminders', 'email', 'enabled', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Send reminders (days after due date)
                </label>
                <div className="flex gap-2 flex-wrap">
                  {[1, 2, 3, 5, 7, 14, 21, 30].map(day => (
                    <label key={day} className="flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={config.postReminders.email.daysAfterDue.includes(day)}
                        onChange={(e) => {
                          const newDays = e.target.checked
                            ? [...config.postReminders.email.daysAfterDue, day].sort((a, b) => a - b)
                            : config.postReminders.email.daysAfterDue.filter(d => d !== day);
                          handleConfigChange('postReminders', 'email', 'daysAfterDue', newDays);
                        }}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="text-sm text-gray-700">{day} day{day > 1 ? 's' : ''}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Push Post Reminders */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-4">
              <DevicePhoneMobileIcon className="w-5 h-5 text-blue-600" />
              <h4 className="text-md font-semibold text-gray-900">Push Post Reminders</h4>
              <button
                onClick={() => handleTestReminder('post', 'push')}
                className="ml-auto px-3 py-1 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors duration-200"
              >
                Test Push
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">Enable Push Post Reminders</label>
                <input
                  type="checkbox"
                  checked={config.postReminders.push.enabled}
                  onChange={(e) => handleConfigChange('postReminders', 'push', 'enabled', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Send notifications (days after due date)
                </label>
                <div className="flex gap-2 flex-wrap">
                  {[1, 2, 3, 5, 7, 10, 14].map(day => (
                    <label key={day} className="flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={config.postReminders.push.daysAfterDue.includes(day)}
                        onChange={(e) => {
                          const newDays = e.target.checked
                            ? [...config.postReminders.push.daysAfterDue, day].sort((a, b) => a - b)
                            : config.postReminders.push.daysAfterDue.filter(d => d !== day);
                          handleConfigChange('postReminders', 'push', 'daysAfterDue', newDays);
                        }}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="text-sm text-gray-700">{day} day{day > 1 ? 's' : ''}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* SMS Post Reminders */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-4">
              <BellIcon className="w-5 h-5 text-blue-600" />
              <h4 className="text-md font-semibold text-gray-900">SMS Post Reminders</h4>
              <button
                onClick={() => handleTestReminder('post', 'sms')}
                className="ml-auto px-3 py-1 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors duration-200"
              >
                Test SMS
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">Enable SMS Post Reminders</label>
                <input
                  type="checkbox"
                  checked={config.postReminders.sms.enabled}
                  onChange={(e) => handleConfigChange('postReminders', 'sms', 'enabled', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Send SMS (days after due date)
                </label>
                <div className="flex gap-2 flex-wrap">
                  {[1, 2, 3, 5, 7, 14].map(day => (
                    <label key={day} className="flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={config.postReminders.sms.daysAfterDue.includes(day)}
                        onChange={(e) => {
                          const newDays = e.target.checked
                            ? [...config.postReminders.sms.daysAfterDue, day].sort((a, b) => a - b)
                            : config.postReminders.sms.daysAfterDue.filter(d => d !== day);
                          handleConfigChange('postReminders', 'sms', 'daysAfterDue', newDays);
                        }}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="text-sm text-gray-700">{day} day{day > 1 ? 's' : ''}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Auto Reminders Configuration */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <ClockIcon className="w-6 h-6 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Auto Reminders</h3>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">Enable Auto Reminders</label>
            <input
              type="checkbox"
              checked={config.autoReminders.enabled}
              onChange={(e) => handleAutoConfigChange('enabled', e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reminder Frequency
            </label>
            <select
              value={config.autoReminders.frequency}
              onChange={(e) => handleAutoConfigChange('frequency', e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Maximum Pre Reminders per Student
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={config.autoReminders.maxPreReminders}
                onChange={(e) => handleAutoConfigChange('maxPreReminders', parseInt(e.target.value))}
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Maximum Post Reminders per Student
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={config.autoReminders.maxPostReminders}
                onChange={(e) => handleAutoConfigChange('maxPostReminders', parseInt(e.target.value))}
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Term Due Date Configuration */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <ClockIcon className="w-6 h-6 text-purple-600" />
              Term Due Date Configuration
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Configure term due dates and reminder schedules per course, academic year, and year of study
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleRecalculateDates}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200 flex items-center gap-2"
            >
              <ClockIcon className="w-4 h-4" />
              Recalculate Dates
            </button>
            <button
              onClick={() => setShowTermConfigForm(true)}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors duration-200 flex items-center gap-2"
            >
              <Cog6ToothIcon className="w-4 h-4" />
              Add Configuration
            </button>
          </div>
        </div>

        {/* Existing Configurations */}
        {termConfigs.length > 0 ? (
          <div className="space-y-4">
            {termConfigs.map((config, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-gray-900">
                      {config.course?.name || 'Unknown Course'} - {config.academicYear} - Year {config.yearOfStudy}
                    </h4>
                    <div className="grid grid-cols-3 gap-4 mt-2 text-sm">
                      <div>
                        <span className="text-gray-600">Term 1:</span>
                        <span className="ml-2 font-medium">{config.termDueDates.term1.daysFromSemesterStart} days</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Term 2:</span>
                        <span className="ml-2 font-medium">{config.termDueDates.term2.daysFromSemesterStart} days</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Term 3:</span>
                        <span className="ml-2 font-medium">{config.termDueDates.term3.daysFromSemesterStart} days</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditConfig(config)}
                      className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors duration-200"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteConfig(config)}
                      className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors duration-200"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <ClockIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No term due date configurations found</p>
            <p className="text-sm">Click "Add Configuration" to create one</p>
          </div>
        )}
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
          <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />
          <span className="text-red-700">{error}</span>
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
      term1: { daysFromSemesterStart: 5, description: 'Term 1 Due Date' },
      term2: { daysFromSemesterStart: 90, description: 'Term 2 Due Date' },
      term3: { daysFromSemesterStart: 210, description: 'Term 3 Due Date' }
    },
    reminderDays: {
      term1: { preReminders: [7, 3, 1], postReminders: [1, 3, 7] },
      term2: { preReminders: [7, 3, 1], postReminders: [1, 3, 7] },
      term3: { preReminders: [7, 3, 1], postReminders: [1, 3, 7] }
    }
  });

  useEffect(() => {
    if (editingConfig) {
      setFormData({
        courseId: editingConfig.course._id,
        academicYear: editingConfig.academicYear,
        yearOfStudy: editingConfig.yearOfStudy,
        termDueDates: editingConfig.termDueDates,
        reminderDays: editingConfig.reminderDays
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-900">
              {editingConfig ? 'Edit' : 'Add'} Term Due Date Configuration
            </h3>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600"
            >
              <ExclamationTriangleIcon className="w-6 h-6" />
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
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
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
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
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
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
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
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Term Due Dates (Days from Semester-1 Start)</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {['term1', 'term2', 'term3'].map(term => (
                  <div key={term} className="border border-gray-200 rounded-lg p-4">
                    <h5 className="font-medium text-gray-900 mb-3 capitalize">{term.replace('term', 'Term ')}</h5>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Days from Semester Start
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="365"
                        value={formData.termDueDates[term].daysFromSemesterStart}
                        onChange={(e) => handleInputChange(`termDueDates.${term}.daysFromSemesterStart`, parseInt(e.target.value))}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>
                    <div className="mt-3">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Description
                      </label>
                      <input
                        type="text"
                        value={formData.termDueDates[term].description}
                        onChange={(e) => handleInputChange(`termDueDates.${term}.description`, e.target.value)}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Reminder Days */}
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Reminder Days Configuration</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {['term1', 'term2', 'term3'].map(term => (
                  <div key={term} className="border border-gray-200 rounded-lg p-4">
                    <h5 className="font-medium text-gray-900 mb-3 capitalize">{term.replace('term', 'Term ')}</h5>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Pre Reminders (days before due)
                        </label>
                        <div className="flex gap-2 flex-wrap">
                          {[1, 2, 3, 5, 7, 14, 30].map(day => (
                            <label key={day} className="flex items-center gap-1">
                              <input
                                type="checkbox"
                                checked={formData.reminderDays[term].preReminders.includes(day)}
                                onChange={(e) => {
                                  const newDays = e.target.checked
                                    ? [...formData.reminderDays[term].preReminders, day].sort((a, b) => a - b)
                                    : formData.reminderDays[term].preReminders.filter(d => d !== day);
                                  handleInputChange(`reminderDays.${term}.preReminders`, newDays);
                                }}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                              />
                              <span className="text-sm text-gray-700">{day}d</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Post Reminders (days after due)
                        </label>
                        <div className="flex gap-2 flex-wrap">
                          {[1, 2, 3, 5, 7, 14, 21, 30].map(day => (
                            <label key={day} className="flex items-center gap-1">
                              <input
                                type="checkbox"
                                checked={formData.reminderDays[term].postReminders.includes(day)}
                                onChange={(e) => {
                                  const newDays = e.target.checked
                                    ? [...formData.reminderDays[term].postReminders, day].sort((a, b) => a - b)
                                    : formData.reminderDays[term].postReminders.filter(d => d !== day);
                                  handleInputChange(`reminderDays.${term}.postReminders`, newDays);
                                }}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                              />
                              <span className="text-sm text-gray-700">{day}d</span>
                            </label>
                          ))}
                        </div>
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
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center gap-2"
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
