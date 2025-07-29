import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  UserGroupIcon,
  EyeIcon,
  CheckIcon
} from '@heroicons/react/24/outline';
import TakeAttendance from './TakeAttendance';
import ViewAttendance from './ViewAttendance';
import SEO from '../../components/SEO';

const Attendance = () => {
  const [activeTab, setActiveTab] = useState('take');

  const tabs = [
    {
      id: 'take',
      name: 'Mark Attendance',
      icon: CheckIcon,
      description: 'Mark daily attendance for students'
    },
    {
      id: 'view',
      name: 'View Attendance',
      icon: EyeIcon,
      description: 'View and analyze attendance records'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <SEO title="Attendance Management - Admin Dashboard" />
      
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg shadow-sm p-4 sm:p-6 mb-4 sm:mb-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-blue-900 flex items-center gap-2">
                <UserGroupIcon className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                Attendance Management
              </h1>
              <p className="text-gray-600 mt-1 text-sm sm:text-base">
                Manage student attendance records and daily attendance marking
              </p>
            </div>
          </div>
        </motion.div>

        {/* Tab Navigation */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-lg shadow-sm p-1 mb-4 sm:mb-6"
        >
          <div className="flex space-x-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 sm:py-3 rounded-md text-xs sm:text-sm font-medium transition-all duration-300 ${
                    isActive
                      ? tab.id === 'take' 
                        ? 'bg-emerald-100 text-emerald-700 shadow-md border-2 border-emerald-300'
                        : 'bg-orange-100 text-orange-700 shadow-md border-2 border-orange-300'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 hover:shadow-sm'
                  }`}
                >
                  <Icon className={`w-3 h-3 sm:w-4 sm:h-4 ${
                    isActive 
                      ? tab.id === 'take' ? 'text-emerald-600' : 'text-orange-600'
                      : ''
                  }`} />
                  <span className="hidden sm:inline">{tab.name}</span>
                  <span className="sm:hidden">
                    {tab.id === 'take' ? 'Take' : 'View'}
                  </span>
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="bg-white rounded-lg shadow-sm overflow-hidden"
          >
            {activeTab === 'take' ? (
              <div>
                
                <div className="p-0">
                  <TakeAttendance />
                </div>
              </div>
            ) : (
              <div>
                
                <div className="p-0">
                  <ViewAttendance />
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Attendance; 