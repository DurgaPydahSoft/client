import React, { useEffect, useState, useMemo, useCallback } from 'react';
import api from '../../utils/axios';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, LineChart, Line, AreaChart, Area } from 'recharts';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  CheckCircleIcon, 
  ClockIcon, 
  ArrowTrendingUpIcon, 
  ExclamationTriangleIcon, 
  ArrowPathIcon, 
  UserGroupIcon, 
  UserIcon, 
  MegaphoneIcon, 
  ChartBarIcon, 
  ChartPieIcon, 
  BoltIcon, 
  EyeIcon, 
  ExclamationCircleIcon, 
  XMarkIcon,
  CurrencyDollarIcon,
  HomeIcon,
  CalendarIcon,
  AcademicCapIcon,
  BuildingOfficeIcon,
  BellIcon,
  ArrowUpIcon,
  ArrowDownIcon
} from '@heroicons/react/24/outline';
import LoadingSpinner from '../../components/LoadingSpinner';
import { toast } from 'react-hot-toast';
import SEO from '../../components/SEO';

// Enhanced StatCard component with trend indicators
const StatCard = ({ icon: Icon, label, value, color, extra, trend, trendValue, onClick, animateDelay = 0 }) => {
  const [isAnimating, setIsAnimating] = React.useState(true);

  React.useEffect(() => {
    return () => {
      setIsAnimating(false);
    };
  }, []);

  const formatValue = (val) => {
    if (typeof val === 'number') {
      if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
      if (val >= 1000) return `${(val / 1000).toFixed(1)}K`;
      return val.toString();
    }
    return val;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={isAnimating ? { opacity: 1, y: 0 } : { opacity: 1, y: 0 }}
      transition={{ delay: animateDelay, duration: 0.4 }}
      onClick={onClick}
      className={`bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 p-4 border-l-4 ${color} ${onClick ? 'cursor-pointer' : ''}`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className={`p-2 rounded-lg ${color.replace('border-', 'bg-').replace('-500', '-100')}`}>
          <Icon className={`w-6 h-6 ${color.replace('border-', 'text-')}`} />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-xs font-medium ${
            trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-500'
          }`}>
            {trend === 'up' ? <ArrowUpIcon className="w-4 h-4" /> : trend === 'down' ? <ArrowDownIcon className="w-4 h-4" /> : null}
            {trendValue && `${trendValue}%`}
          </div>
        )}
      </div>
      <div className="text-2xl font-bold text-gray-900 mb-1">{formatValue(value)}</div>
      <div className="text-sm text-gray-600 font-medium">{label}</div>
      {extra && <div className="mt-1 text-xs text-gray-400">{extra}</div>}
    </motion.div>
  );
};

// Module Section Component
const ModuleSection = ({ title, icon: Icon, iconColor, children, className = '' }) => {
  return (
    <div className={`bg-white rounded-xl shadow-lg p-6 ${className}`}>
      <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-200">
        <div className={`p-2 rounded-lg ${iconColor}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">{title}</h2>
      </div>
      {children}
    </div>
  );
};

const DashboardHome = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('week');
  
  // State for all modules
  const [stats, setStats] = useState({
    students: {
      total: 0,
      active: 0,
      inactive: 0,
      newThisWeek: 0,
      byCourse: []
    },
    attendance: {
      today: {
        total: 0,
        present: 0,
        absent: 0,
        percentage: 0,
        fullyPresent: 0,
        partiallyPresent: 0
      },
      trend: []
    },
    financial: {
      totalCollection: 0,
      pendingPayments: 0,
      electricityPayments: 0,
      hostelFeeCollection: 0,
      thisMonth: 0,
      lastMonth: 0
    },
    complaints: {
      total: 0,
      active: 0,
      resolved: 0,
      inProgress: 0,
      resolvedThisWeek: 0,
      avgResolutionTime: 0
    },
    leaves: {
      pending: 0,
      approvedToday: 0,
      rejectedToday: 0,
      thisWeek: []
    },
    rooms: {
      total: 0,
      occupied: 0,
      available: 0,
      occupancyRate: 0,
      byGender: []
    },
    communication: {
      activeAnnouncements: 0,
      activePolls: 0,
      recentAnnouncements: [],
      recentPolls: []
    }
  });

  // Safari detection
  const isSafari = useMemo(() => /^((?!chrome|android).)*safari/i.test(navigator.userAgent), []);

  // Fetch all dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const timeoutDuration = isSafari ? 45000 : 30000;
        const today = new Date().toISOString().split('T')[0];
        
        // Fetch all data in parallel
        const [
          studentsRes,
          studentsCountRes,
          attendanceStatsRes,
          attendanceDateRes,
          paymentStatsRes,
          hostelFeeStatsRes,
          complaintsRes,
          leavesRes,
          roomsStatsRes,
          announcementsRes,
          pollsRes
        ] = await Promise.allSettled(
          [
            api.get('/api/admin/students?limit=1000'),
            api.get('/api/admin/students/count'),
            api.get(`/api/attendance/stats?date=${today}`),
            api.get(`/api/attendance/date?date=${today}`),
            api.get('/api/payments/stats'),
            api.get('/api/payments/hostel-fee/stats'),
            api.get('/api/complaints/admin/all'),
            api.get('/api/leave/all'),
            api.get('/api/rooms/stats'),
            api.get('/api/announcements/admin/all'),
            api.get('/api/polls/admin/all')
          ].map(call => 
            Promise.race([
              call,
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Request timeout')), timeoutDuration)
              )
            ])
          )
        );

        // Process Students Data
        if (studentsRes.status === 'fulfilled' && studentsRes.value.data.success) {
          const students = studentsRes.value.data.data.students || [];
          const activeStudents = students.filter(s => s.hostelStatus === 'Active');
          const oneWeekAgo = new Date();
          oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
          const newThisWeek = students.filter(s => new Date(s.createdAt) >= oneWeekAgo).length;
          
          // Group by course
          const byCourse = students.reduce((acc, student) => {
            const course = student.course?.name || student.course || 'Unknown';
            acc[course] = (acc[course] || 0) + 1;
            return acc;
          }, {});
          
          setStats(prev => ({
            ...prev,
            students: {
              total: students.length,
              active: activeStudents.length,
              inactive: students.length - activeStudents.length,
              newThisWeek,
              byCourse: Object.entries(byCourse).map(([name, count]) => ({ name, count }))
            }
          }));
        }

        if (studentsCountRes.status === 'fulfilled' && studentsCountRes.value.data.success) {
          const count = studentsCountRes.value.data.data.count || 0;
          setStats(prev => ({
            ...prev,
            students: {
              ...prev.students,
              total: count
            }
          }));
        }

        // Process Attendance Data
        if (attendanceStatsRes.status === 'fulfilled' && attendanceStatsRes.value.data.success) {
          const attendanceData = attendanceStatsRes.value.data.data.statistics || {};
          setStats(prev => ({
            ...prev,
            attendance: {
              ...prev.attendance,
              today: {
                total: attendanceData.totalStudents || 0,
                present: attendanceData.fullyPresent || 0,
                absent: attendanceData.absent || 0,
                percentage: attendanceData.percentages?.fullyPresentPercentage || 0,
                fullyPresent: attendanceData.fullyPresent || 0,
                partiallyPresent: attendanceData.partiallyPresent || 0
              }
            }
          }));
        }

        // Process Financial Data - Electricity Payments
        let electricityPayments = 0;
        let thisMonthTotal = 0;
        let lastMonthTotal = 0;
        
        if (paymentStatsRes.status === 'fulfilled' && paymentStatsRes.value.data.success) {
          const paymentData = paymentStatsRes.value.data.data || {};
          const currentMonthStats = paymentData.currentMonth?.stats || [];
          const previousMonthStats = paymentData.previousMonth?.stats || [];
          
          // Calculate totals from payment stats (electricity payments)
          electricityPayments = currentMonthStats
            .filter(s => s._id === 'success')
            .reduce((sum, s) => sum + (s.totalAmount || 0), 0);
          
          thisMonthTotal = electricityPayments;
          lastMonthTotal = previousMonthStats
            .filter(s => s._id === 'success')
            .reduce((sum, s) => sum + (s.totalAmount || 0), 0);
        }

        // Process Financial Data - Hostel Fee Payments
        let hostelFeeCollection = 0;
        if (hostelFeeStatsRes.status === 'fulfilled' && hostelFeeStatsRes.value.data.success) {
          const hostelFeeData = hostelFeeStatsRes.value.data.data || {};
          hostelFeeCollection = hostelFeeData.currentMonthTotal || 0;
          thisMonthTotal += hostelFeeCollection;
        }

        setStats(prev => ({
          ...prev,
          financial: {
            totalCollection: thisMonthTotal,
            pendingPayments: 0, // Would need separate calculation
            electricityPayments,
            hostelFeeCollection,
            thisMonth: thisMonthTotal,
            lastMonth: lastMonthTotal
          }
        }));

        // Process Complaints Data
        if (complaintsRes.status === 'fulfilled' && complaintsRes.value.data.success) {
          const complaints = complaintsRes.value.data.data.complaints || [];
          const active = complaints.filter(c => c.currentStatus !== 'Resolved' && c.currentStatus !== 'Closed');
          const resolved = complaints.filter(c => c.currentStatus === 'Resolved');
          const inProgress = complaints.filter(c => c.currentStatus === 'In Progress');
          
          const oneWeekAgo = new Date();
          oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
          const resolvedThisWeek = resolved.filter(c => new Date(c.resolvedAt || c.updatedAt) >= oneWeekAgo).length;
          
          // Calculate average resolution time
          const resolvedWithTime = resolved.filter(c => c.resolvedAt && c.createdAt);
          const avgResolutionTime = resolvedWithTime.length > 0
            ? resolvedWithTime.reduce((sum, c) => {
                const days = Math.floor((new Date(c.resolvedAt) - new Date(c.createdAt)) / (1000 * 60 * 60 * 24));
                return sum + days;
              }, 0) / resolvedWithTime.length
            : 0;
          
          setStats(prev => ({
            ...prev,
            complaints: {
              total: complaints.length,
              active: active.length,
              resolved: resolved.length,
              inProgress: inProgress.length,
              resolvedThisWeek,
              avgResolutionTime: Math.round(avgResolutionTime * 10) / 10
            }
          }));
        }

        // Process Leaves Data
        if (leavesRes.status === 'fulfilled' && leavesRes.value.data.success) {
          const leaves = leavesRes.value.data.data.leaves || [];
          const pending = leaves.filter(l => l.status === 'Pending' || l.status === 'Pending OTP Verification' || l.status === 'Warden Verified');
          
          const today = new Date().toISOString().split('T')[0];
          const approvedToday = leaves.filter(l => 
            l.status === 'Approved' && 
            new Date(l.updatedAt || l.createdAt).toISOString().split('T')[0] === today
          ).length;
          
          const rejectedToday = leaves.filter(l => 
            l.status === 'Rejected' && 
            new Date(l.updatedAt || l.createdAt).toISOString().split('T')[0] === today
          ).length;
          
          setStats(prev => ({
            ...prev,
            leaves: {
              pending: pending.length,
              approvedToday,
              rejectedToday,
              thisWeek: []
            }
          }));
        }

        // Process Rooms Data
        if (roomsStatsRes.status === 'fulfilled' && roomsStatsRes.value.data.success) {
          const roomsData = roomsStatsRes.value.data.data || {};
          const overallStats = roomsData.overallStats || {};
          
          setStats(prev => ({
            ...prev,
            rooms: {
              total: overallStats.totalRooms || 0,
              occupied: overallStats.filledBeds || 0,
              available: overallStats.availableBeds || 0,
              occupancyRate: overallStats.totalBeds > 0 
                ? Math.round((overallStats.filledBeds / overallStats.totalBeds) * 100) 
                : 0,
              byGender: roomsData.stats || []
            }
          }));
        }

        // Process Communication Data
        if (announcementsRes.status === 'fulfilled' && announcementsRes.value.data.success) {
          const announcements = announcementsRes.value.data.data || [];
          const activeAnnouncements = announcements.filter(a => a.status === 'active' || !a.status).length;
          
          setStats(prev => ({
            ...prev,
            communication: {
              ...prev.communication,
              activeAnnouncements,
              recentAnnouncements: announcements.slice(0, 3)
            }
          }));
        }

        if (pollsRes.status === 'fulfilled' && pollsRes.value.data.success) {
          const polls = pollsRes.value.data.data || [];
          const activePolls = polls.filter(p => p.status === 'active').length;
          
          setStats(prev => ({
            ...prev,
            communication: {
              ...prev.communication,
              activePolls,
              recentPolls: polls.slice(0, 2)
            }
          }));
        }

      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [isSafari]);

  // Calculate trends
  const financialTrend = useMemo(() => {
    if (stats.financial.lastMonth === 0) return null;
    const change = ((stats.financial.thisMonth - stats.financial.lastMonth) / stats.financial.lastMonth) * 100;
    return {
      direction: change >= 0 ? 'up' : 'down',
      value: Math.abs(Math.round(change))
    };
  }, [stats.financial.thisMonth, stats.financial.lastMonth]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <>
      <SEO 
        title="Admin Dashboard"
        description="Comprehensive admin dashboard for hostel management system with real-time statistics and insights."
        keywords="Admin Dashboard, Hostel Management, Statistics, Analytics"
      />
      <div className="p-2 sm:p-3 md:p-4 mt-12 sm:mt-0 w-full space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-blue-900">Dashboard Overview</h1>
            <p className="text-gray-600 mt-1">Welcome back! Here's your system overview.</p>
          </div>
          <div className="flex gap-2 bg-white p-2 rounded-lg shadow-sm">
            <button
              onClick={() => setTimeframe('week')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                timeframe === 'week' 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setTimeframe('month')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                timeframe === 'month' 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Month
            </button>
          </div>
        </div>

        {/* Key Metrics Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={UserGroupIcon}
            label="Total Students"
            value={stats.students.total}
            color="border-blue-500 text-blue-600"
            extra={`${stats.students.active} active`}
            onClick={() => navigate('/admin/dashboard/students')}
            animateDelay={0.05}
          />
          <StatCard
            icon={CheckCircleIcon}
            label="Today's Attendance"
            value={`${stats.attendance.today.percentage}%`}
            color="border-green-500 text-green-600"
            extra={`${stats.attendance.today.present} present`}
            onClick={() => navigate('/admin/dashboard/attendance')}
            animateDelay={0.1}
          />
          <StatCard
            icon={CurrencyDollarIcon}
            label="Fee Collection (This Month)"
            value={`₹${(stats.financial.thisMonth / 1000).toFixed(0)}K`}
            color="border-purple-500 text-purple-600"
            trend={financialTrend?.direction}
            trendValue={financialTrend?.value}
            extra={`₹${(stats.financial.pendingPayments / 1000).toFixed(0)}K pending`}
            onClick={() => navigate('/admin/dashboard/fee-management')}
            animateDelay={0.15}
          />
          <StatCard
            icon={ExclamationCircleIcon}
            label="Active Complaints"
            value={stats.complaints.active}
            color="border-orange-500 text-orange-600"
            extra={`${stats.complaints.resolvedThisWeek} resolved this week`}
            onClick={() => navigate('/admin/dashboard/complaints')}
            animateDelay={0.2}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - 2/3 width */}
          <div className="lg:col-span-2 space-y-6">
            {/* Students & Attendance */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ModuleSection
                title="Student Management"
                icon={AcademicCapIcon}
                iconColor="bg-blue-500"
              >
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-50 rounded-lg p-4">
                      <div className="text-2xl font-bold text-blue-900">{stats.students.active}</div>
                      <div className="text-sm text-blue-600">Active Students</div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4">
                      <div className="text-2xl font-bold text-green-900">{stats.students.newThisWeek}</div>
                      <div className="text-sm text-green-600">New This Week</div>
                    </div>
                  </div>
                  {stats.students.byCourse.length > 0 && (
                    <div>
                      <div className="text-sm font-medium text-gray-700 mb-2">By Course</div>
                      <div className="space-y-2">
                        {stats.students.byCourse.slice(0, 3).map((course, idx) => (
                          <div key={idx} className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">{course.name}</span>
                            <span className="text-sm font-semibold text-gray-900">{course.count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <button
                    onClick={() => navigate('/admin/dashboard/students')}
                    className="w-full py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    View All Students →
                  </button>
                </div>
              </ModuleSection>

              <ModuleSection
                title="Attendance"
                icon={CalendarIcon}
                iconColor="bg-green-500"
              >
                <div className="space-y-4">
                  <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-4 text-white">
                    <div className="text-3xl font-bold mb-1">{stats.attendance.today.percentage}%</div>
                    <div className="text-sm opacity-90">Today's Attendance Rate</div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="text-center">
                      <div className="text-lg font-bold text-gray-900">{stats.attendance.today.fullyPresent}</div>
                      <div className="text-xs text-gray-500">Fully Present</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-gray-900">{stats.attendance.today.partiallyPresent}</div>
                      <div className="text-xs text-gray-500">Partial</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-gray-900">{stats.attendance.today.absent}</div>
                      <div className="text-xs text-gray-500">Absent</div>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate('/admin/dashboard/attendance')}
                    className="w-full py-2 text-sm font-medium text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors"
                  >
                    View Attendance →
                  </button>
                </div>
              </ModuleSection>
            </div>

            {/* Financial Overview */}
            <ModuleSection
              title="Financial Overview"
              icon={CurrencyDollarIcon}
              iconColor="bg-purple-500"
            >
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="text-xl font-bold text-purple-900">₹{(stats.financial.thisMonth / 1000).toFixed(0)}K</div>
                  <div className="text-xs text-purple-600">This Month</div>
                </div>
                <div className="bg-orange-50 rounded-lg p-4">
                  <div className="text-xl font-bold text-orange-900">₹{(stats.financial.pendingPayments / 1000).toFixed(0)}K</div>
                  <div className="text-xs text-orange-600">Pending</div>
                </div>
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="text-xl font-bold text-blue-900">₹{(stats.financial.electricityPayments / 1000).toFixed(0)}K</div>
                  <div className="text-xs text-blue-600">Electricity</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="text-xl font-bold text-green-900">₹{(stats.financial.hostelFeeCollection / 1000).toFixed(0)}K</div>
                  <div className="text-xs text-green-600">Hostel Fees</div>
                </div>
              </div>
              <button
                onClick={() => navigate('/admin/dashboard/fee-management')}
                className="w-full mt-4 py-2 text-sm font-medium text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-colors"
              >
                View Financial Details →
              </button>
            </ModuleSection>

            {/* Complaints & Leaves */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ModuleSection
                title="Complaint Management"
                icon={ExclamationCircleIcon}
                iconColor="bg-orange-500"
              >
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="text-center">
                      <div className="text-xl font-bold text-orange-900">{stats.complaints.active}</div>
                      <div className="text-xs text-gray-500">Active</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold text-green-900">{stats.complaints.resolved}</div>
                      <div className="text-xs text-gray-500">Resolved</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold text-blue-900">{stats.complaints.inProgress}</div>
                      <div className="text-xs text-gray-500">In Progress</div>
                    </div>
                  </div>
                  {stats.complaints.avgResolutionTime > 0 && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="text-sm text-gray-600">Avg. Resolution Time</div>
                      <div className="text-lg font-bold text-gray-900">{stats.complaints.avgResolutionTime} days</div>
                    </div>
                  )}
                  <button
                    onClick={() => navigate('/admin/dashboard/complaints')}
                    className="w-full py-2 text-sm font-medium text-orange-600 hover:text-orange-700 hover:bg-orange-50 rounded-lg transition-colors"
                  >
                    Manage Complaints →
                  </button>
                </div>
              </ModuleSection>

              <ModuleSection
                title="Leave Management"
                icon={CalendarIcon}
                iconColor="bg-indigo-500"
              >
                <div className="space-y-4">
                  <div className="bg-indigo-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-indigo-900 mb-1">{stats.leaves.pending}</div>
                    <div className="text-sm text-indigo-600">Pending Approvals</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-center">
                      <div className="text-lg font-bold text-green-900">{stats.leaves.approvedToday}</div>
                      <div className="text-xs text-gray-500">Approved Today</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-red-900">{stats.leaves.rejectedToday}</div>
                      <div className="text-xs text-gray-500">Rejected Today</div>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate('/admin/dashboard/leave')}
                    className="w-full py-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors"
                  >
                    Manage Leaves →
                  </button>
                </div>
              </ModuleSection>
            </div>
          </div>

          {/* Right Column - 1/3 width */}
          <div className="space-y-6">
            {/* Rooms Overview */}
            <ModuleSection
              title="Room Management"
              icon={BuildingOfficeIcon}
              iconColor="bg-cyan-500"
            >
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-cyan-500 to-cyan-600 rounded-lg p-4 text-white">
                  <div className="text-3xl font-bold mb-1">{stats.rooms.occupancyRate}%</div>
                  <div className="text-sm opacity-90">Occupancy Rate</div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-center">
                    <div className="text-lg font-bold text-gray-900">{stats.rooms.occupied}</div>
                    <div className="text-xs text-gray-500">Occupied</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-gray-900">{stats.rooms.available}</div>
                    <div className="text-xs text-gray-500">Available</div>
                  </div>
                </div>
                <button
                  onClick={() => navigate('/admin/dashboard/rooms/management')}
                  className="w-full py-2 text-sm font-medium text-cyan-600 hover:text-cyan-700 hover:bg-cyan-50 rounded-lg transition-colors"
                >
                  View Rooms →
                </button>
              </div>
            </ModuleSection>

            {/* Communication */}
            <ModuleSection
              title="Communication"
              icon={MegaphoneIcon}
              iconColor="bg-pink-500"
            >
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-pink-50 rounded-lg p-3 text-center">
                    <div className="text-xl font-bold text-pink-900">{stats.communication.activeAnnouncements}</div>
                    <div className="text-xs text-pink-600">Announcements</div>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-3 text-center">
                    <div className="text-xl font-bold text-purple-900">{stats.communication.activePolls}</div>
                    <div className="text-xs text-purple-600">Active Polls</div>
                  </div>
                </div>
                {stats.communication.recentAnnouncements.length > 0 && (
                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-2">Recent Announcements</div>
                    <div className="space-y-2">
                      {stats.communication.recentAnnouncements.map((announcement, idx) => (
                        <div key={idx} className="text-xs text-gray-600 truncate">
                          {announcement.title}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <button
                  onClick={() => navigate('/admin/dashboard/announcements')}
                  className="w-full py-2 text-sm font-medium text-pink-600 hover:text-pink-700 hover:bg-pink-50 rounded-lg transition-colors"
                >
                  View All →
                </button>
              </div>
            </ModuleSection>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
              <div className="space-y-2">
                <button
                  onClick={() => navigate('/admin/dashboard/students')}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  Add New Student
                </button>
                <button
                  onClick={() => navigate('/admin/dashboard/attendance')}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  Mark Attendance
                </button>
                <button
                  onClick={() => navigate('/admin/dashboard/announcements')}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  Create Announcement
                </button>
                <button
                  onClick={() => navigate('/admin/dashboard/polls')}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  Create Poll
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default DashboardHome;
