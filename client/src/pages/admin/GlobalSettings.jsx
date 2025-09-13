import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  CogIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  BuildingOfficeIcon,
  GlobeAltIcon,
  DocumentTextIcon,
  ComputerDesktopIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import LoadingSpinner from '../../components/LoadingSpinner';
import SEO from '../../components/SEO';
import api from '../../utils/axios';
import toast from 'react-hot-toast';
import { useGlobalSettings } from '../../context/GlobalSettingsContext';

const GlobalSettings = () => {
  const { refetch: refetchGlobalSettings } = useGlobalSettings();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('institution');
  const [settings, setSettings] = useState(null);
  const [editingSection, setEditingSection] = useState(null);
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);

  // Fetch settings on component mount
  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/global-settings');
      if (response.data.success) {
        setSettings(response.data.data);
        console.log('Settings loaded:', response.data.data);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Failed to fetch settings');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (section) => {
    setEditingSection(section);
    setFormData(settings[section] || {});
  };

  const handleCancel = () => {
    setEditingSection(null);
    setFormData({});
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await api.put('/api/global-settings', {
        section: editingSection,
        data: formData
      });

      if (response.data.success) {
        // Update the settings state with the new data
        setSettings(prev => ({
          ...prev,
          [editingSection]: response.data.data.updatedSection,
          lastUpdated: response.data.data.lastUpdated
        }));
        setEditingSection(null);
        setFormData({});

        // Refetch global settings to update the context
        refetchGlobalSettings();

        toast.success(response.data.data.message || `${editingSection} settings updated successfully`);
      }
    } catch (error) {
      console.error('Error updating settings:', error);
      toast.error('Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleNestedInputChange = (parent, field, value) => {
    setFormData(prev => ({
      ...prev,
      [parent]: {
        ...prev[parent],
        [field]: value
      }
    }));
  };

  return (
    <>
      <SEO
        title="Global Settings"
        description="Configure global system settings and preferences for the hostel management system."
        keywords="Global Settings, System Configuration, Admin Settings, System Preferences"
      />

      <div className="p-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-blue-900">Global Settings</h1>
            <div className="mt-2 mb-4">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                Currently this page is in developing stage
              </span>
            </div>
            <p className="text-gray-600 mt-1">
              Configure global system settings and preferences
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex flex-col md:flex-row md:space-x-8 md:overflow-x-auto">
              <button
                onClick={() => setActiveTab('institution')}
                className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap self-start md:self-auto ${activeTab === 'institution'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                <div className="flex items-center gap-2">
                  <BuildingOfficeIcon className="w-5 h-5" />
                  Institution
                </div>
              </button>
              <button
                onClick={() => setActiveTab('urls')}
                className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap self-start md:self-auto ${activeTab === 'urls'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                <div className="flex items-center gap-2">
                  <GlobeAltIcon className="w-5 h-5" />
                  URLs & Domains
                </div>
              </button>
              <button
                onClick={() => setActiveTab('seo')}
                className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap self-start md:self-auto ${activeTab === 'seo'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                <div className="flex items-center gap-2">
                  <DocumentTextIcon className="w-5 h-5" />
                  SEO & Meta
                </div>
              </button>
              <button
                onClick={() => setActiveTab('system')}
                className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap self-start md:self-auto ${activeTab === 'system'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                <div className="flex items-center gap-2">
                  <ComputerDesktopIcon className="w-5 h-5" />
                  System
                </div>
              </button>
            </nav>
          </div>
        </div>


        {/* Content */}
        <div className="bg-white rounded-lg shadow">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <LoadingSpinner size="lg" />
            </div>
          ) : settings ? (
            <div className="p-6">
              {/* Institution Settings Tab Content */}
              {activeTab === 'institution' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-gray-900">Institution Details</h3>
                    {editingSection !== 'institution' && (
                      <button
                        onClick={() => handleEdit('institution')}
                        className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <PencilIcon className="w-4 h-4 mr-2" />
                        Edit
                      </button>
                    )}
                  </div>

                  {editingSection === 'institution' ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Institution Name
                          </label>
                          <input
                            type="text"
                            value={formData.name || ''}
                            onChange={(e) => handleInputChange('name', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Institution Type
                          </label>
                          <select
                            value={formData.type || ''}
                            onChange={(e) => handleInputChange('type', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="College">College</option>
                            <option value="University">University</option>
                            <option value="Institute">Institute</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Full Institution Name
                        </label>
                        <input
                          type="text"
                          value={formData.fullName || ''}
                          onChange={(e) => handleInputChange('fullName', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div className="border-t pt-4">
                        <h4 className="text-md font-medium text-gray-900 mb-3">Address</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Street Address
                            </label>
                            <input
                              type="text"
                              value={formData.address?.street || ''}
                              onChange={(e) => handleNestedInputChange('address', 'street', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              City
                            </label>
                            <input
                              type="text"
                              value={formData.address?.city || ''}
                              onChange={(e) => handleNestedInputChange('address', 'city', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              State
                            </label>
                            <input
                              type="text"
                              value={formData.address?.state || ''}
                              onChange={(e) => handleNestedInputChange('address', 'state', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              PIN Code
                            </label>
                            <input
                              type="text"
                              value={formData.address?.pincode || ''}
                              onChange={(e) => handleNestedInputChange('address', 'pincode', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="border-t pt-4">
                        <h4 className="text-md font-medium text-gray-900 mb-3">Contact Information</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Phone
                            </label>
                            <input
                              type="text"
                              value={formData.contact?.phone || ''}
                              onChange={(e) => handleNestedInputChange('contact', 'phone', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Email
                            </label>
                            <input
                              type="email"
                              value={formData.contact?.email || ''}
                              onChange={(e) => handleNestedInputChange('contact', 'email', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-end space-x-3 pt-4 border-t">
                        <button
                          onClick={handleCancel}
                          className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSave}
                          disabled={saving}
                          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                        >
                          {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-500">Institution Name</label>
                          <p className="mt-1 text-sm text-gray-900">{settings.institution?.name || 'Not set'}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500">Type</label>
                          <p className="mt-1 text-sm text-gray-900">{settings.institution?.type || 'Not set'}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-500">Full Name</label>
                          <p className="mt-1 text-sm text-gray-900">{settings.institution?.fullName || 'Not set'}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500">Address</label>
                          <p className="mt-1 text-sm text-gray-900">
                            {settings.institution?.address ?
                              `${settings.institution.address.street}, ${settings.institution.address.city}, ${settings.institution.address.state} - ${settings.institution.address.pincode}` :
                              'Not set'
                            }
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-500">Phone</label>
                          <p className="mt-1 text-sm text-gray-900">{settings.institution?.contact?.phone || 'Not set'}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500">Email</label>
                          <p className="mt-1 text-sm text-gray-900">{settings.institution?.contact?.email || 'Not set'}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* URLs & Domains Settings */}
              {activeTab === 'urls' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-gray-900">URLs & Domains</h3>
                    {editingSection !== 'urls' && (
                      <button
                        onClick={() => handleEdit('urls')}
                        className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <PencilIcon className="w-4 h-4 mr-2" />
                        Edit
                      </button>
                    )}
                  </div>

                  {editingSection === 'urls' ? (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Main Website URL
                        </label>
                        <input
                          type="url"
                          value={formData.mainWebsite || ''}
                          onChange={(e) => handleInputChange('mainWebsite', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="https://yourinstitution.edu"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          API Base URL
                        </label>
                        <input
                          type="url"
                          value={formData.apiBaseUrl || ''}
                          onChange={(e) => handleInputChange('apiBaseUrl', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="https://hms.yourinstitution.edu"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Canonical URL
                        </label>
                        <input
                          type="url"
                          value={formData.canonicalUrl || ''}
                          onChange={(e) => handleInputChange('canonicalUrl', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="https://hms.yourinstitution.edu"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Logo URL
                        </label>
                        <input
                          type="url"
                          value={formData.logoUrl || ''}
                          onChange={(e) => handleInputChange('logoUrl', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="https://hms.yourinstitution.edu/logo.png"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Open Graph Image URL
                        </label>
                        <input
                          type="url"
                          value={formData.ogImageUrl || ''}
                          onChange={(e) => handleInputChange('ogImageUrl', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="https://hms.yourinstitution.edu/og-image.jpg"
                        />
                      </div>

                      <div className="flex justify-end space-x-3 pt-4 border-t">
                        <button
                          onClick={handleCancel}
                          className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSave}
                          disabled={saving}
                          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                        >
                          {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-500">Main Website</label>
                        <p className="mt-1 text-sm text-gray-900">{settings.urls?.mainWebsite || 'Not set'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-500">API Base URL</label>
                        <p className="mt-1 text-sm text-gray-900">{settings.urls?.apiBaseUrl || 'Not set'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-500">Canonical URL</label>
                        <p className="mt-1 text-sm text-gray-900">{settings.urls?.canonicalUrl || 'Not set'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-500">Logo URL</label>
                        <p className="mt-1 text-sm text-gray-900">{settings.urls?.logoUrl || 'Not set'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-500">Open Graph Image</label>
                        <p className="mt-1 text-sm text-gray-900">{settings.urls?.ogImageUrl || 'Not set'}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Other tabs content will be added here */}
              {!['institution', 'urls'].includes(activeTab) && (
                <div className="text-center py-12">
                  <CogIcon className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Coming Soon</h3>
                  <p className="text-gray-500 mb-6">
                    Additional settings tabs will be implemented soon.
                  </p>
                </div>
              )}

              {/* PydahSoft Branding Info (Read-only) */}
              <div className="mt-8 pt-6 border-t border-gray-200">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <InformationCircleIcon className="w-5 h-5 text-blue-400 mr-3 mt-0.5" />
                    <div className="text-sm text-blue-700">
                      <p className="font-medium mb-1">PydahSoft Branding</p>
                      <p className="mb-2">
                        PydahSoft branding elements are preserved and cannot be modified through this interface.
                        This includes the company name, product tagline, and logo references.
                      </p>
                      <div className="text-xs text-blue-600">
                        <p><strong>Company:</strong> {settings?.pydahsoft?.companyName}</p>
                        <p><strong>Product:</strong> {settings?.pydahsoft?.productName}</p>
                        <p><strong>Website:</strong> {settings?.pydahsoft?.website}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6">
              <div className="text-center py-12">
                <CogIcon className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Loading Settings</h3>
                <p className="text-gray-500">Please wait while we load your global settings...</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default GlobalSettings;
