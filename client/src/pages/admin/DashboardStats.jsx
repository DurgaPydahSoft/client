import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/axios';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import LoadingSpinner from '../../components/LoadingSpinner';
import NotificationBell from '../../components/NotificationBell';
import {
  ChartBarIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  UserGroupIcon,
  BellIcon
} from '@heroicons/react/24/outline';

const DashboardStats = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalComplaints: 0,
    pendingComplaints: 0,
    resolvedComplaints: 0,
    activeMembers: 0,
    activeAnnouncements: 0,
    averageResolutionTime: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await api.get('/api/admin/stats');
      setStats(response.data.data);
    } catch (err) {
      console.error('Error fetching stats:', err);
      toast.error('Failed to fetch dashboard statistics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Complaints',
      value: stats.totalComplaints,
      icon: ChartBarIcon,
      color: 'bg-blue-500',
      textColor: 'text-blue-500'
    },
    {
      title: 'Pending Complaints',
      value: stats.pendingComplaints,
      icon: ClockIcon,
      color: 'bg-yellow-500',
      textColor: 'text-yellow-500'
    },
    {
      title: 'Resolved Complaints',
      value: stats.resolvedComplaints,
      icon: CheckCircleIcon,
      color: 'bg-green-500',
      textColor: 'text-green-500'
    },
    {
      title: 'Active Members',
      value: stats.activeMembers,
      icon: UserGroupIcon,
      color: 'bg-purple-500',
      textColor: 'text-purple-500'
    },
    {
      title: 'Active Announcements',
      value: stats.activeAnnouncements,
      icon: BellIcon,
      color: 'bg-indigo-500',
      textColor: 'text-indigo-500'
    },
    {
      title: 'Avg. Resolution Time',
      value: `${stats.averageResolutionTime} days`,
      icon: ExclamationCircleIcon,
      color: 'bg-red-500',
      textColor: 'text-red-500'
    }
  ];

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-xl shadow-lg p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-3xl font-bold text-blue-900 mb-2">
              Welcome back, {user?.name}
            </h2>
            <p className="text-gray-600">
              Here's an overview of your hostel management system
            </p>
          </div>
          <div>
            <NotificationBell />
          </div>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow duration-300"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                <p className="text-2xl font-semibold text-gray-900 mt-1">
                  {stat.value}
                </p>
              </div>
              <div className={`p-3 rounded-full ${stat.color} bg-opacity-10`}>
                <stat.icon className={`h-6 w-6 ${stat.textColor}`} />
              </div>
            </div>
            
            {/* Progress bar for complaints */}
            {stat.title.includes('Complaints') && (
              <div className="mt-4">
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${
                      stat.title === 'Total Complaints'
                        ? 'bg-blue-500'
                        : stat.title === 'Pending Complaints'
                        ? 'bg-yellow-500'
                        : 'bg-green-500'
                    }`}
                    style={{
                      width: `${(stat.value / stats.totalComplaints) * 100}%`
                    }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {stat.title === 'Total Complaints'
                    ? 'All time complaints'
                    : stat.title === 'Pending Complaints'
                    ? 'Awaiting resolution'
                    : 'Successfully resolved'}
                </p>
              </div>
            )}
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
};

export default DashboardStats; 