import React, { useState, useEffect } from 'react';
import api from '../utils/axios';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import LoadingSpinner from './LoadingSpinner';
import { 
  CogIcon, 
  CheckCircleIcon, 
  XCircleIcon,
  ChartBarIcon,
  UserGroupIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

const AIConfigPanel = ({ onClose }) => {
  const [aiConfig, setAiConfig] = useState({
    isEnabled: false,
    categories: {
      Canteen: { aiEnabled: false, autoAssign: false },
      Internet: { aiEnabled: false, autoAssign: false },
      Maintenance: { aiEnabled: false, autoAssign: false },
      Others: { aiEnabled: false, autoAssign: false }
    },
    memberEfficiencyThreshold: 70,
    autoStatusUpdate: true,
    maxWorkload: 5
  });
  
  const [aiStats, setAiStats] = useState({
    totalProcessed: 0,
    averageProcessingTime: 0,
    successRate: 0,
    totalComplaints: 0
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchAIConfig();
    fetchAIStats();
  }, []);

  const fetchAIConfig = async () => {
    try {
      const response = await api.get('/api/complaints/admin/ai/config');
      if (response.data.success) {
        setAiConfig(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching AI config:', error);
      toast.error('Failed to load AI configuration');
    } finally {
      setLoading(false);
    }
  };

  const fetchAIStats = async () => {
    try {
      const response = await api.get('/api/complaints/admin/ai/stats');
      if (response.data.success) {
        setAiStats(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching AI stats:', error);
    }
  };

  const toggleAI = () => {
    setAiConfig(prev => ({
      ...prev,
      isEnabled: !prev.isEnabled
    }));
  };

  const toggleAICategory = (category) => {
    setAiConfig(prev => ({
      ...prev,
      categories: {
        ...prev.categories,
        [category]: {
          ...prev.categories[category],
          aiEnabled: !prev.categories[category].aiEnabled
        }
      }
    }));
  };

  const toggleAutoAssign = (category) => {
    setAiConfig(prev => ({
      ...prev,
      categories: {
        ...prev.categories,
        [category]: {
          ...prev.categories[category],
          autoAssign: !prev.categories[category].autoAssign
        }
      }
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await api.put('/api/complaints/admin/ai/config', aiConfig);
      if (response.data.success) {
        toast.success('AI configuration saved successfully');
        await fetchAIStats(); // Refresh stats
      }
    } catch (error) {
      console.error('Error saving AI config:', error);
      toast.error('Failed to save AI configuration');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-8">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white rounded-xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <CogIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">AI-Powered Complaint Routing</h2>
              <p className="text-sm text-gray-600">Configure smart complaint assignment</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <XCircleIcon className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* AI Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <ChartBarIcon className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">Total Processed</span>
              </div>
              <p className="text-2xl font-bold text-blue-700 mt-1">{aiStats.totalProcessed}</p>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircleIcon className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium text-green-900">Success Rate</span>
              </div>
              <p className="text-2xl font-bold text-green-700 mt-1">{aiStats.successRate}%</p>
            </div>
            
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <ClockIcon className="w-5 h-5 text-purple-600" />
                <span className="text-sm font-medium text-purple-900">Avg. Time</span>
              </div>
              <p className="text-2xl font-bold text-purple-700 mt-1">{aiStats.averageProcessingTime}ms</p>
            </div>
            
            <div className="bg-orange-50 p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <UserGroupIcon className="w-5 h-5 text-orange-600" />
                <span className="text-sm font-medium text-orange-900">Total Complaints</span>
              </div>
              <p className="text-2xl font-bold text-orange-700 mt-1">{aiStats.totalComplaints}</p>
            </div>
          </div>

          {/* Global AI Toggle */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Enable AI Routing</h3>
                <p className="text-sm text-gray-600">Turn on AI-powered complaint assignment</p>
              </div>
              <div className="flex items-center gap-3">
                {/* Status Indicator */}
                <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border">
                  <div className={`w-2 h-2 rounded-full ${aiConfig.isEnabled ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                  <span className="text-sm font-medium text-gray-700">
                    {aiConfig.isEnabled ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                </div>
                
                {/* Toggle Switch */}
                <button
                  onClick={toggleAI}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    aiConfig.isEnabled ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      aiConfig.isEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Category Configuration */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Category Settings</h3>
            
            {Object.entries(aiConfig.categories).map(([category, config]) => (
              <div key={category} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <h4 className="font-medium text-gray-900">{category}</h4>
                    {/* Status Indicator */}
                    <div className="flex items-center gap-2 bg-gray-50 px-2 py-1 rounded-lg">
                      <div className={`w-2 h-2 rounded-full ${config.aiEnabled ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                      <span className="text-xs font-medium text-gray-600">
                        {config.aiEnabled ? 'AI ON' : 'AI OFF'}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleAICategory(category)}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                      config.aiEnabled 
                        ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {config.aiEnabled ? 'AI Enabled' : 'Manual'}
                  </button>
                </div>
                
                {config.aiEnabled && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Auto-assign members</span>
                      <button
                        onClick={() => toggleAutoAssign(category)}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                          config.autoAssign ? 'bg-blue-600' : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                            config.autoAssign ? 'translate-x-5' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Advanced Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Advanced Settings</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Member Efficiency Threshold
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={aiConfig.memberEfficiencyThreshold}
                  onChange={(e) => setAiConfig(prev => ({
                    ...prev,
                    memberEfficiencyThreshold: parseInt(e.target.value)
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">Minimum efficiency score for member selection</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Workload per Member
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={aiConfig.maxWorkload}
                  onChange={(e) => setAiConfig(prev => ({
                    ...prev,
                    maxWorkload: parseInt(e.target.value)
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">Maximum complaints a member can handle</p>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-gray-700">Auto Status Update</span>
                <p className="text-xs text-gray-500">Automatically update complaint status after AI assignment</p>
              </div>
              <button
                onClick={() => setAiConfig(prev => ({ ...prev, autoStatusUpdate: !prev.autoStatusUpdate }))}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  aiConfig.autoStatusUpdate ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                    aiConfig.autoStatusUpdate ? 'translate-x-5' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default AIConfigPanel; 