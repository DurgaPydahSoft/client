import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import api from '../../utils/axios';
import toast from 'react-hot-toast';
import {
  ShieldCheckIcon,
  EyeIcon,
  EyeSlashIcon,
  PhoneIcon,
  UserIcon,
  CameraIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import SEO from '../../components/SEO';

const SecuritySettings = () => {
  const [settings, setSettings] = useState({
    viewProfilePictures: true,
    viewPhoneNumbers: true,
    viewGuardianImages: true
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/security-settings');
      if (response.data.success) {
        setSettings(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching security settings:', error);
      toast.error('Failed to fetch security settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSettingChange = async (setting, value) => {
    try {
      setSaving(true);
      const updatedSettings = { ...settings, [setting]: value };
      const response = await api.put('/api/security-settings', updatedSettings);
      if (response.data.success) {
        setSettings(updatedSettings);
        toast.success('Security setting updated successfully');
      }
    } catch (error) {
      console.error('Error updating security settings:', error);
      toast.error('Failed to update security setting');
    } finally {
      setSaving(false);
    }
  };

  const SettingCard = ({ title, description, icon: Icon, setting, value, onChange }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Icon className="w-6 h-6 text-blue-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>
            <p className="text-sm text-gray-600 mb-4">{description}</p>
          </div>
        </div>
        <div className="flex items-center">
          <button
            onClick={() => onChange(setting, !value)}
            disabled={saving}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${value ? 'bg-blue-600' : 'bg-gray-200'
              } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${value ? 'translate-x-6' : 'translate-x-1'
                }`}
            />
          </button>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2">
        {value ? (
          <>
            <CheckIcon className="w-4 h-4 text-green-500" />
            <span className="text-sm text-green-600 font-medium">Enabled</span>
          </>
        ) : (
          <>
            <XMarkIcon className="w-4 h-4 text-red-500" />
            <span className="text-sm text-red-600 font-medium">Disabled</span>
          </>
        )}
      </div>
    </motion.div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading security settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <SEO
          title="Security Settings"
          description="Manage security dashboard privacy settings and access controls"
          keywords="security settings, privacy controls, dashboard access"
        />

        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <ShieldCheckIcon className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Security Settings</h1>
              <p className="text-gray-600">Configure privacy settings for the security dashboard</p>
            </div>
          </div>
        </div>

        {/* Settings Grid */}
        <div className="grid gap-6 mb-8">
          <SettingCard
            title="Profile Pictures"
            description="Allow security guards to view student profile pictures in the security dashboard"
            icon={UserIcon}
            setting="viewProfilePictures"
            value={settings.viewProfilePictures}
            onChange={handleSettingChange}
          />

          <SettingCard
            title="Phone Numbers"
            description="Allow security guards to view student and parent phone numbers"
            icon={PhoneIcon}
            setting="viewPhoneNumbers"
            value={settings.viewPhoneNumbers}
            onChange={handleSettingChange}
          />

          <SettingCard
            title="Guardian Images"
            description="Allow security guards to view guardian photos for verification"
            icon={CameraIcon}
            setting="viewGuardianImages"
            value={settings.viewGuardianImages}
            onChange={handleSettingChange}
          />
        </div>



        {/* Information Card */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-8">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <ShieldCheckIcon className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-blue-900 mb-2">About Security Settings</h3>
              <p className="text-blue-800 mb-3">
                These settings control what information security guards can see in the security dashboard.
                Disabling certain features helps protect student privacy while still allowing necessary
                verification functions.
              </p>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• <strong>Profile Pictures:</strong> Helps guards identify students visually</li>
                <li>• <strong>Phone Numbers:</strong> Allows guards to contact students or parents if needed</li>
                <li>• <strong>Guardian Images:</strong> Enables verification against guardian photos</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecuritySettings; 