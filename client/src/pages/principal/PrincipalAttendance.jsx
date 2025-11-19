import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  UserGroupIcon,
  EyeIcon,
  AcademicCapIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../../context/AuthContext';
import PrincipalTakeAttendance from './PrincipalTakeAttendance';
import PrincipalViewAttendance from './PrincipalViewAttendance';
import SEO from '../../components/SEO';

// Helper function to get course name consistently
const getCourseName = (course) => {
  if (!course) return 'Course Management';
  if (typeof course === 'object' && course.name) return course.name;
  if (typeof course === 'string') return course;
  return 'Course Management';
};

const PrincipalAttendance = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('view');

  const tabs = [
    {
      id: 'view',
      name: 'View Attendance',
      icon: EyeIcon,
      description: 'View and analyze attendance records for your course'
    },
    {
      id: 'take',
      name: 'Take Attendance',
      icon: UserGroupIcon,
      description: 'Mark attendance for your course students'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 mt-16 sm:mt-0">
      <SEO title="Attendance Management - Principal Dashboard" />
      
      <div className="mx-auto p-3 sm:p-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-purple-600 rounded-xl shadow-lg p-4 sm:p-6 mb-4 sm:mb-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div>
              <h1 className="text-lg sm:text-2xl font-bold text-white flex items-center gap-2">
                <UserGroupIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                Attendance Management
              </h1>
              <p className="text-white mt-1 text-xs sm:text-sm">
                Monitor and analyze student attendance records for your course
              </p>
            </div>
            <div className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-purple-50 rounded-lg">
              <AcademicCapIcon className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
              <span className="text-xs sm:text-sm font-medium text-purple-700">
                Course: {getCourseName(user?.course)}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Tab Navigation */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl shadow-lg p-1 mb-4 sm:mb-6"
        >
          <div className="flex space-x-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-2.5 sm:py-3 rounded-md text-xs sm:text-sm font-medium transition-all duration-300 touch-manipulation ${
                    isActive
                      ? tab.id === 'view' 
                        ? 'bg-purple-100 text-purple-700 shadow-md border-2 border-purple-300'
                        : 'bg-blue-100 text-blue-700 shadow-md border-2 border-blue-300'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 hover:shadow-sm'
                  }`}
                >
                  <Icon className={`w-3 h-3 sm:w-4 sm:h-4 ${
                    isActive 
                      ? tab.id === 'view' ? 'text-purple-600' : 'text-blue-600'
                      : ''
                  }`} />
                  <span className="hidden sm:inline">{tab.name}</span>
                  <span className="sm:hidden">{tab.id === 'view' ? 'View' : 'Take'}</span>
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
            className="bg-white rounded-xl shadow-lg overflow-hidden"
          >
            {activeTab === 'view' ? (
              <div>
                
                <div className="p-0">
                  <PrincipalViewAttendance />
                </div>
              </div>
            ) : activeTab === 'take' ? (
              <div>
                
                <div className="p-0">
                  <PrincipalTakeAttendance />
                </div>
              </div>
            ) : null}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default PrincipalAttendance; 