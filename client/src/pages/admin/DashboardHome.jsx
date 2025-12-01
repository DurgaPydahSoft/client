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
import { useAuth } from '../../context/AuthContext';
import { hasPermission } from '../../utils/permissionUtils';

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
      className={`bg-white rounded-lg sm:rounded-xl shadow-md hover:shadow-lg transition-all duration-300 p-2.5 sm:p-3 lg:p-2.5 xl:p-2 border-l-4 ${color} ${onClick ? 'cursor-pointer active:scale-95' : ''}`}
    >
      <div className="flex items-center justify-between mb-1 sm:mb-1.5 lg:mb-0.5">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className={`p-1.5 sm:p-1.5 lg:p-1 rounded-lg flex-shrink-0 ${color.replace('border-', 'bg-').replace('-500', '-100')}`}>
            <Icon className={`w-4 h-4 sm:w-5 sm:h-5 lg:w-4 lg:h-4 ${color.replace('border-', 'text-')}`} />
      </div>
          <div className="text-base sm:text-lg lg:text-lg xl:text-xl font-bold text-gray-900 leading-tight truncate">{formatValue(value)}</div>
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-xs font-medium flex-shrink-0 ml-2 ${
            trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-500'
          }`}>
            {trend === 'up' ? <ArrowUpIcon className="w-3 h-3" /> : trend === 'down' ? <ArrowDownIcon className="w-3 h-3" /> : null}
            {trendValue && `${trendValue}%`}
        </div>
        )}
      </div>
      <div className="text-xs sm:text-xs lg:text-xs xl:text-sm text-gray-600 font-medium leading-tight truncate">{label}</div>
      {extra && <div className="mt-0.5 sm:mt-0.5 lg:mt-0 text-xs text-gray-400 leading-tight truncate">{extra}</div>}
    </motion.div>
  );
};

// Module Section Component
const ModuleSection = ({ title, icon: Icon, iconColor, children, className = '' }) => {
  return (
    <div className={`bg-white rounded-lg sm:rounded-xl shadow-lg p-4 sm:p-6 ${className}`}>
      <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4 pb-3 sm:pb-4 border-b border-gray-200">
        <div className={`p-1.5 sm:p-2 rounded-lg ${iconColor}`}>
          <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
      </div>
        <h2 className="text-lg sm:text-xl font-bold text-gray-900">{title}</h2>
        </div>
      {children}
    </div>
  );
};

const DashboardHome = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('week');
  
  // Permission checks for each module
  const canViewStudents = useMemo(() => hasPermission(user, 'student_management') || user?.role === 'warden', [user]);
  const canViewAttendance = useMemo(() => hasPermission(user, 'attendance_management') || user?.role === 'warden', [user]);
  const canViewFinancial = useMemo(() => hasPermission(user, 'fee_management'), [user]);
  const canViewComplaints = useMemo(() => hasPermission(user, 'maintenance_ticket_management') || user?.role === 'warden', [user]);
  const canViewLeaves = useMemo(() => hasPermission(user, 'leave_management') || user?.role === 'warden', [user]);
  const canViewMenu = useMemo(() => hasPermission(user, 'menu_management'), [user]);
  const canViewRooms = useMemo(() => hasPermission(user, 'room_management') || user?.role === 'warden', [user]);
  const canViewAnnouncements = useMemo(() => hasPermission(user, 'announcement_management') || user?.role === 'warden', [user]);
  const canViewPolls = useMemo(() => hasPermission(user, 'poll_management') || user?.role === 'warden', [user]);
  const canViewCommunication = useMemo(() => canViewAnnouncements || canViewPolls, [canViewAnnouncements, canViewPolls]);
  
  // Check if user has any permissions to view dashboard content
  const hasAnyPermission = useMemo(() => {
    return canViewStudents || canViewAttendance || canViewFinancial || canViewComplaints || 
           canViewLeaves || canViewMenu || canViewRooms || canViewCommunication || 
           user?.role === 'super_admin';
  }, [canViewStudents, canViewAttendance, canViewFinancial, canViewComplaints, 
      canViewLeaves, canViewMenu, canViewRooms, canViewCommunication, user]);
  
  // Count visible stat cards for dynamic grid
  const visibleStatCards = useMemo(() => {
    let count = 0;
    if (canViewStudents) count++;
    if (canViewAttendance) count++;
    if (canViewFinancial) count++;
    if (canViewComplaints) count++;
    return count;
  }, [canViewStudents, canViewAttendance, canViewFinancial, canViewComplaints]);
  
  // Count visible modules in left column
  const visibleLeftModules = useMemo(() => {
    let count = 0;
    if (canViewStudents) count++;
    if (canViewAttendance) count++;
    if (canViewFinancial) count++;
    if (canViewComplaints) count++;
    if (canViewLeaves) count++;
    return count;
  }, [canViewStudents, canViewAttendance, canViewFinancial, canViewComplaints, canViewLeaves]);
  
  // Count visible modules in right column
  const visibleRightModules = useMemo(() => {
    let count = 0;
    if (canViewMenu) count++;
    if (canViewRooms) count++;
    if (canViewCommunication) count++;
    if (canViewStudents || canViewAttendance || canViewAnnouncements || canViewPolls) count++; // Quick Actions
    return count;
  }, [canViewMenu, canViewRooms, canViewCommunication, canViewStudents, canViewAttendance, canViewAnnouncements, canViewPolls]);
  
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
        partiallyPresent: 0,
        morningPresent: 0,
        eveningPresent: 0,
        nightPresent: 0
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
    },
    menu: {
      todaysMenu: null,
      hasMenu: false
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
          pollsRes,
          todaysMenuRes
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
            api.get('/api/admin/rooms/stats'),
            api.get('/api/announcements/admin/all'),
            api.get('/api/polls/admin/all'),
            api.get('/api/cafeteria/menu/today')
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
                partiallyPresent: attendanceData.partiallyPresent || 0,
                morningPresent: attendanceData.morningPresent || 0,
                eveningPresent: attendanceData.eveningPresent || 0,
                nightPresent: attendanceData.nightPresent || 0
              }
            }
          }));
        }

        // Process Attendance Date Data for session-specific stats
        if (attendanceDateRes.status === 'fulfilled' && attendanceDateRes.value.data.success) {
          const dateData = attendanceDateRes.value.data.data.statistics || {};
          const totalStudents = dateData.totalStudents || 0;
          
          // Get current time in IST to determine active session
          const getCurrentISTTime = () => {
            const now = new Date();
            return new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
          };
          
          // Calculate percentage and present count based on the most recent/active session
          const getCurrentSessionStats = () => {
            const istTime = getCurrentISTTime();
            const hour = istTime.getHours() + (istTime.getMinutes() / 60);
            let sessionPresent = 0;
            let sessionName = '';
            
            // Session time windows (IST) - matching TakeAttendance.jsx
            // Morning: 7:30 AM - 9:30 AM (7.5 - 9.5)
            // Evening: 5:00 PM - 7:00 PM (17 - 19)
            // Night: 8:00 PM - 10:00 PM (20 - 22)
            
            if (hour >= 7.5 && hour < 9.5) {
              // Morning session active
              sessionPresent = dateData.morningPresent || 0;
              sessionName = 'morning';
            } else if (hour >= 17 && hour < 19) {
              // Evening session active
              sessionPresent = dateData.eveningPresent || 0;
              sessionName = 'evening';
            } else if (hour >= 20 && hour < 22) {
              // Night session active
              sessionPresent = dateData.nightPresent || 0;
              sessionName = 'night';
      } else {
              // No active session - use the most recent completed session
              // If before morning, show previous night; if after night, show night
              if (hour < 7.5) {
                sessionPresent = dateData.nightPresent || 0;
                sessionName = 'night';
              } else if (hour >= 9.5 && hour < 17) {
                sessionPresent = dateData.morningPresent || 0;
                sessionName = 'morning';
              } else if (hour >= 19 && hour < 20) {
                sessionPresent = dateData.eveningPresent || 0;
                sessionName = 'evening';
              } else {
                // After 10 PM, show night session
                sessionPresent = dateData.nightPresent || 0;
                sessionName = 'night';
              }
            }
            
            // If no data for determined session, use the highest session attendance
            if (sessionPresent === 0) {
              const sessions = [
                dateData.morningPresent || 0,
                dateData.eveningPresent || 0,
                dateData.nightPresent || 0
              ];
              sessionPresent = Math.max(...sessions);
            }
            
            const percentage = totalStudents > 0 ? Math.round((sessionPresent / totalStudents) * 100) : 0;
            
            return { sessionPresent, percentage, sessionName };
          };
          
          const sessionStats = getCurrentSessionStats();
          
          setStats(prev => ({
            ...prev,
            attendance: {
              ...prev.attendance,
              today: {
                ...prev.attendance.today,
                total: totalStudents || prev.attendance.today.total,
                present: sessionStats.sessionPresent || prev.attendance.today.present,
                percentage: sessionStats.percentage || prev.attendance.today.percentage,
                morningPresent: dateData.morningPresent || prev.attendance.today.morningPresent || 0,
                eveningPresent: dateData.eveningPresent || prev.attendance.today.eveningPresent || 0,
                nightPresent: dateData.nightPresent || prev.attendance.today.nightPresent || 0
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
          const overallStats = roomsData.overall || {};
          
          setStats(prev => ({
            ...prev,
            rooms: {
              total: overallStats.totalRooms || 0,
              occupied: overallStats.filledBeds || 0,
              available: overallStats.availableBeds || 0,
              occupancyRate: overallStats.totalBeds > 0 
                ? Math.round((overallStats.filledBeds / overallStats.totalBeds) * 100) 
                : 0,
              byGender: roomsData.byGender || []
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

        // Process Today's Menu Data
        if (todaysMenuRes.status === 'fulfilled' && todaysMenuRes.value.data.success) {
          const menuData = todaysMenuRes.value.data.data;
          setStats(prev => ({
            ...prev,
            menu: {
              todaysMenu: menuData,
              hasMenu: !!menuData && !!menuData.meals
            }
          }));
        } else {
          // 404 is expected when no menu exists for today
          setStats(prev => ({
            ...prev,
            menu: {
              todaysMenu: null,
              hasMenu: false
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

  // Show message if user has no permissions
  if (!hasAnyPermission && !loading) {
    return (
      <>
        <SEO 
          title="Admin Dashboard"
          description="Admin dashboard for hostel management system"
          keywords="Admin Dashboard, Hostel Management"
        />
        <div className="mx-auto mt-12 sm:mt-0 w-full flex items-center justify-center min-h-[60vh]">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center max-w-md">
            <ExclamationCircleIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No Access</h2>
            <p className="text-gray-600">
              You don't have permission to view any dashboard modules. Please contact your administrator.
            </p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <SEO 
        title="Admin Dashboard"
        description="Comprehensive admin dashboard for hostel management system with real-time statistics and insights."
        keywords="Admin Dashboard, Hostel Management, Statistics, Analytics"
      />
      <div className=" mx-auto mt-12 sm:mt-0 w-full space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
        <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-blue-900">Dashboard Overview</h1>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">Welcome back! Here's your system overview.</p>
        </div>
          <div className="flex gap-2 bg-white p-1.5 sm:p-2 rounded-lg shadow-sm w-full sm:w-auto">
            <button
              onClick={() => setTimeframe('week')}
              className={`flex-1 sm:flex-none px-3 sm:px-4 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-all ${
                timeframe === 'week' 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setTimeframe('month')}
              className={`flex-1 sm:flex-none px-3 sm:px-4 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-all ${
                timeframe === 'month' 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Month
            </button>
          </div>
        </div>

        {/* Key Metrics Overview - Dynamic grid based on visible cards */}
        {visibleStatCards > 0 && (
          <div 
            className="grid gap-2.5 sm:gap-3 lg:gap-4"
            style={{
              gridTemplateColumns: `repeat(${Math.min(visibleStatCards, 4)}, minmax(0, 1fr))`
            }}
          >
            {canViewStudents && (
              <StatCard
                icon={UserGroupIcon}
                label="Total Students"
                value={stats.students.total}
                color="border-blue-500 text-blue-600"
                extra={`${stats.students.active} active`}
                onClick={() => navigate('/admin/dashboard/students')}
                animateDelay={0.05}
              />
            )}
            {canViewAttendance && (
              <StatCard
                icon={CheckCircleIcon}
                label="Today's Attendance"
                value={`${stats.attendance.today.percentage}%`}
                color="border-green-500 text-green-600"
                extra={`${stats.attendance.today.present} present`}
                onClick={() => navigate('/admin/dashboard/attendance')}
                animateDelay={0.1}
              />
            )}
            {canViewFinancial && (
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
            )}
            {canViewComplaints && (
              <StatCard
                icon={ExclamationCircleIcon}
                label="Active Complaints"
                value={stats.complaints.active}
                color="border-orange-500 text-orange-600"
                extra={`${stats.complaints.resolvedThisWeek} resolved this week`}
                onClick={() => navigate('/admin/dashboard/complaints')}
                animateDelay={0.2}
              />
            )}
          </div>
        )}

        {/* Main Content Grid */}
        {(visibleLeftModules > 0 || visibleRightModules > 0) && (
          <div className={`grid grid-cols-1 gap-4 sm:gap-6 ${
            visibleLeftModules > 0 && visibleRightModules > 0 
              ? 'lg:grid-cols-3' 
              : 'lg:grid-cols-1'
          }`}>
            {/* Left Column - 2/3 width if both columns have content, full width if only left */}
            {visibleLeftModules > 0 && (
              <div className={`space-y-4 sm:space-y-6 ${
                visibleLeftModules > 0 && visibleRightModules > 0 
                  ? 'lg:col-span-2' 
                  : ''
              }`}>
                {/* Students & Attendance */}
                {(canViewStudents || canViewAttendance) && (
                  <div 
                    className="grid gap-4 sm:gap-6"
                    style={{
                      gridTemplateColumns: canViewStudents && canViewAttendance
                        ? 'repeat(2, 1fr)'
                        : '1fr'
                    }}
                  >
              {canViewStudents && (
                <ModuleSection
                  title="Student Management"
                  icon={AcademicCapIcon}
                  iconColor="bg-blue-500"
                >
                <div className="space-y-3 sm:space-y-4">
                  <div className="grid grid-cols-2 gap-2 sm:gap-4">
                    <div className="bg-blue-50 rounded-lg p-3 sm:p-4">
                      <div className="text-xl sm:text-2xl font-bold text-blue-900">{stats.students.active}</div>
                      <div className="text-xs sm:text-sm text-blue-600">Active Students</div>
        </div>
                    <div className="bg-green-50 rounded-lg p-3 sm:p-4">
                      <div className="text-xl sm:text-2xl font-bold text-green-900">{stats.students.newThisWeek}</div>
                      <div className="text-xs sm:text-sm text-green-600">New This Week</div>
      </div>
      </div>
                  {stats.students.byCourse.length > 0 && (
                <div>
                      <div className="text-xs sm:text-sm font-medium text-gray-700 mb-2">By Course</div>
                      <div className="space-y-1.5 sm:space-y-2">
                        {stats.students.byCourse.slice(0, 3).map((course, idx) => (
                          <div key={idx} className="flex justify-between items-center">
                            <span className="text-xs sm:text-sm text-gray-600 truncate pr-2">{course.name}</span>
                            <span className="text-xs sm:text-sm font-semibold text-gray-900">{course.count}</span>
        </div>
                        ))}
              </div>
            </div>
                  )}
                  <button
                    onClick={() => navigate('/admin/dashboard/students')}
                    className="w-full py-2 text-xs sm:text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors active:bg-blue-100"
                  >
                    View All Students →
                  </button>
                </div>
              </ModuleSection>
              )}

                    {canViewAttendance && (
                <ModuleSection
                  title="Attendance"
                  icon={CalendarIcon}
                  iconColor="bg-green-500"
                >
                <div className="space-y-3 sm:space-y-4">
                  <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-3 sm:p-4 text-white">
                    <div className="text-2xl sm:text-3xl font-bold mb-1">{stats.attendance.today.percentage}%</div>
                    <div className="text-xs sm:text-sm opacity-90">Today's Attendance Rate</div>
                </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="text-center">
                      <div className="text-base sm:text-lg font-bold text-gray-900">{stats.attendance.today.fullyPresent}</div>
                      <div className="text-xs text-gray-500">Fully Present</div>
                </div>
                    <div className="text-center">
                      <div className="text-base sm:text-lg font-bold text-gray-900">{stats.attendance.today.partiallyPresent}</div>
                      <div className="text-xs text-gray-500">Partial</div>
              </div>
                    <div className="text-center">
                      <div className="text-base sm:text-lg font-bold text-gray-900">{stats.attendance.today.absent}</div>
                      <div className="text-xs text-gray-500">Absent</div>
                    </div>
                  </div>
                  <div className="border-t border-gray-200 pt-2 sm:pt-3">
                    <div className="text-xs sm:text-sm font-medium text-gray-700 mb-2">Recent Session Presentees</div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="text-center bg-blue-50 rounded-lg p-2">
                        <div className="text-sm sm:text-base font-bold text-blue-900">🌅 {stats.attendance.today.morningPresent}</div>
                        <div className="text-xs text-gray-600">Morning</div>
                      </div>
                      <div className="text-center bg-orange-50 rounded-lg p-2">
                        <div className="text-sm sm:text-base font-bold text-orange-900">🌆 {stats.attendance.today.eveningPresent}</div>
                        <div className="text-xs text-gray-600">Evening</div>
                      </div>
                      <div className="text-center bg-purple-50 rounded-lg p-2">
                        <div className="text-sm sm:text-base font-bold text-purple-900">🌙 {stats.attendance.today.nightPresent}</div>
                        <div className="text-xs text-gray-600">Night</div>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate('/admin/dashboard/attendance')}
                    className="w-full py-2 text-xs sm:text-sm font-medium text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors active:bg-green-100"
                  >
                    View Attendance →
                  </button>
                </div>
              </ModuleSection>
                    )}
                  </div>
                )}

                {/* Financial Overview */}
                {canViewFinancial && (
              <ModuleSection
                title="Financial Overview"
                icon={CurrencyDollarIcon}
                iconColor="bg-purple-500"
              >
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
                <div className="bg-purple-50 rounded-lg p-3 sm:p-4">
                  <div className="text-lg sm:text-xl font-bold text-purple-900">₹{(stats.financial.thisMonth / 1000).toFixed(0)}K</div>
                  <div className="text-xs text-purple-600">This Month</div>
                </div>
                <div className="bg-orange-50 rounded-lg p-3 sm:p-4">
                  <div className="text-lg sm:text-xl font-bold text-orange-900">₹{(stats.financial.pendingPayments / 1000).toFixed(0)}K</div>
                  <div className="text-xs text-orange-600">Pending</div>
                </div>
                <div className="bg-blue-50 rounded-lg p-3 sm:p-4">
                  <div className="text-lg sm:text-xl font-bold text-blue-900">₹{(stats.financial.electricityPayments / 1000).toFixed(0)}K</div>
                  <div className="text-xs text-blue-600">Electricity</div>
              </div>
                <div className="bg-green-50 rounded-lg p-3 sm:p-4">
                  <div className="text-lg sm:text-xl font-bold text-green-900">₹{(stats.financial.hostelFeeCollection / 1000).toFixed(0)}K</div>
                  <div className="text-xs text-green-600">Hostel Fees</div>
            </div>
          </div>
              <button
                onClick={() => navigate('/admin/dashboard/fee-management')}
                className="w-full mt-3 sm:mt-4 py-2 text-xs sm:text-sm font-medium text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-colors active:bg-purple-100"
              >
                View Financial Details →
              </button>
            </ModuleSection>
                )}

                {/* Complaints & Leaves */}
                {(canViewComplaints || canViewLeaves) && (
                  <div 
                    className="grid gap-4 sm:gap-6"
                    style={{
                      gridTemplateColumns: canViewComplaints && canViewLeaves
                        ? 'repeat(2, 1fr)'
                        : '1fr'
                    }}
                  >
              {canViewComplaints && (
                <ModuleSection
                  title="Complaint Management"
                  icon={ExclamationCircleIcon}
                  iconColor="bg-orange-500"
                >
                <div className="space-y-3 sm:space-y-4">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="text-center">
                      <div className="text-lg sm:text-xl font-bold text-orange-900">{stats.complaints.active}</div>
                      <div className="text-xs text-gray-500">Active</div>
                </div>
                    <div className="text-center">
                      <div className="text-lg sm:text-xl font-bold text-green-900">{stats.complaints.resolved}</div>
                      <div className="text-xs text-gray-500">Resolved</div>
                </div>
                    <div className="text-center">
                      <div className="text-lg sm:text-xl font-bold text-blue-900">{stats.complaints.inProgress}</div>
                      <div className="text-xs text-gray-500">In Progress</div>
              </div>
            </div>
                  {stats.complaints.avgResolutionTime > 0 && (
                    <div className="bg-gray-50 rounded-lg p-2.5 sm:p-3">
                      <div className="text-xs sm:text-sm text-gray-600">Avg. Resolution Time</div>
                      <div className="text-base sm:text-lg font-bold text-gray-900">{stats.complaints.avgResolutionTime} days</div>
          </div>
                  )}
                  <button
                    onClick={() => navigate('/admin/dashboard/complaints')}
                    className="w-full py-2 text-xs sm:text-sm font-medium text-orange-600 hover:text-orange-700 hover:bg-orange-50 rounded-lg transition-colors active:bg-orange-100"
                  >
                    Manage Complaints →
                  </button>
              </div>
              </ModuleSection>
              )}

              {canViewLeaves && (
                <ModuleSection
                  title="Leave Management"
                  icon={CalendarIcon}
                  iconColor="bg-indigo-500"
                >
                <div className="space-y-3 sm:space-y-4">
                  <div className="bg-indigo-50 rounded-lg p-3 sm:p-4">
                    <div className="text-xl sm:text-2xl font-bold text-indigo-900 mb-1">{stats.leaves.pending}</div>
                    <div className="text-xs sm:text-sm text-indigo-600">Pending Approvals</div>
              </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-center">
                      <div className="text-base sm:text-lg font-bold text-green-900">{stats.leaves.approvedToday}</div>
                      <div className="text-xs text-gray-500">Approved Today</div>
                      </div>
                    <div className="text-center">
                      <div className="text-base sm:text-lg font-bold text-red-900">{stats.leaves.rejectedToday}</div>
                      <div className="text-xs text-gray-500">Rejected Today</div>
                      </div>
                    </div>
                <button
                    onClick={() => navigate('/admin/dashboard/leave')}
                    className="w-full py-2 text-xs sm:text-sm font-medium text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors active:bg-indigo-100"
                >
                    Manage Leaves →
                  </button>
              </div>
              </ModuleSection>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Right Column - 1/3 width if both columns have content, full width if only right */}
            {visibleRightModules > 0 && (
              <div className={`space-y-4 sm:space-y-6 ${
                visibleLeftModules > 0 && visibleRightModules > 0 
                  ? 'lg:col-span-1' 
                  : ''
              }`}>
            {/* Today's Menu */}
            {canViewMenu && (
              <ModuleSection
                title="Today's Menu"
                icon={ChartBarIcon}
                iconColor="bg-orange-500"
              >
              <div className="space-y-3 sm:space-y-4">
                {stats.menu.hasMenu && stats.menu.todaysMenu ? (
                  <div className="grid grid-cols-2 gap-2">
                    {['breakfast', 'lunch', 'snacks', 'dinner'].map(meal => {
                      const mealItems = stats.menu.todaysMenu.meals?.[meal] || [];
                      const mealEmojis = {
                        breakfast: '🥞',
                        lunch: '🍛',
                        snacks: '🍿',
                        dinner: '🍽️'
                      };
                      return (
                        <div
                          key={meal}
                          className="bg-gray-50 rounded-lg p-2 sm:p-3 border border-gray-200"
                        >
                          <div className="flex items-center gap-1 mb-1.5">
                            <span className="text-sm sm:text-base">{mealEmojis[meal]}</span>
                            <span className="text-xs sm:text-sm font-medium text-gray-900 capitalize truncate">
                              {meal}
                    </span>
                          </div>
                          <div className="text-xs text-gray-600">
                            {mealItems.length > 0 ? (
                              <div className="space-y-0.5">
                                {mealItems.slice(0, 2).map((item, idx) => (
                                  <div key={idx} className="truncate">
                                    • {typeof item === 'string' ? item : (item.name || item)}
                  </div>
                ))}
                                {mealItems.length > 2 && (
                                  <div className="text-gray-400 text-xs">
                                    +{mealItems.length - 2} more
                                  </div>
                                )}
              </div>
                            ) : (
                              <span className="text-gray-400 italic">No items</span>
                            )}
            </div>
                </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <div className="text-gray-400 text-2xl mb-2">🍽️</div>
                    <div className="text-xs sm:text-sm text-gray-500 mb-2">No menu set for today</div>
                <button
                      onClick={() => navigate('/admin/dashboard/cafeteria/menu')}
                      className="px-3 py-1.5 bg-orange-600 text-white rounded text-xs hover:bg-orange-700 transition-colors"
                >
                      Create Menu
                </button>
              </div>
                )}
                <button
                  onClick={() => navigate('/admin/dashboard/cafeteria/menu')}
                  className="w-full py-2 text-xs sm:text-sm font-medium text-orange-600 hover:text-orange-700 hover:bg-orange-50 rounded-lg transition-colors active:bg-orange-100"
                >
                  Manage Menu →
                </button>
                    </div>
            </ModuleSection>
            )}

            {/* Rooms Overview */}
            {canViewRooms && (
              <ModuleSection
                title="Room Management"
                icon={BuildingOfficeIcon}
                iconColor="bg-cyan-500"
              >
              <div className="space-y-3 sm:space-y-4">
                <div className="bg-gradient-to-r from-cyan-500 to-cyan-600 rounded-lg p-3 sm:p-4 text-white">
                  <div className="text-2xl sm:text-3xl font-bold mb-1">{stats.rooms.occupancyRate}%</div>
                  <div className="text-xs sm:text-sm opacity-90">Bed Occupancy Rate</div>
                  </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-center">
                    <div className="text-base sm:text-lg font-bold text-gray-900">{stats.rooms.occupied}</div>
                    <div className="text-xs text-gray-500">Filled Beds</div>
              </div>
                  <div className="text-center">
                    <div className="text-base sm:text-lg font-bold text-gray-900">{stats.rooms.available}</div>
                    <div className="text-xs text-gray-500">Available Beds</div>
            </div>
                </div>
                <button
                  onClick={() => navigate('/admin/dashboard/rooms/management')}
                  className="w-full py-2 text-xs sm:text-sm font-medium text-cyan-600 hover:text-cyan-700 hover:bg-cyan-50 rounded-lg transition-colors active:bg-cyan-100"
                >
                  View Rooms →
                </button>
              </div>
            </ModuleSection>
            )}

            {/* Communication */}
            {canViewCommunication && (
              <ModuleSection
                title="Communication"
                icon={MegaphoneIcon}
                iconColor="bg-pink-500"
              >
              <div className="space-y-3 sm:space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-pink-50 rounded-lg p-2.5 sm:p-3 text-center">
                    <div className="text-lg sm:text-xl font-bold text-pink-900">{stats.communication.activeAnnouncements}</div>
                    <div className="text-xs text-pink-600">Announcements</div>
                </div>
                  <div className="bg-purple-50 rounded-lg p-2.5 sm:p-3 text-center">
                    <div className="text-lg sm:text-xl font-bold text-purple-900">{stats.communication.activePolls}</div>
                    <div className="text-xs text-purple-600">Active Polls</div>
                </div>
                </div>
                {stats.communication.recentAnnouncements.length > 0 && (
                  <div>
                    <div className="text-xs sm:text-sm font-medium text-gray-700 mb-2">Recent Announcements</div>
                    <div className="space-y-1.5 sm:space-y-2">
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
                  className="w-full py-2 text-xs sm:text-sm font-medium text-pink-600 hover:text-pink-700 hover:bg-pink-50 rounded-lg transition-colors active:bg-pink-100"
                >
                  View All →
                </button>
              </div>
            </ModuleSection>
            )}

            {/* Quick Actions */}
            {(canViewStudents || canViewAttendance || canViewAnnouncements || canViewPolls) && (
              <div className="bg-white rounded-lg sm:rounded-xl shadow-lg p-4 sm:p-6">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4">Quick Actions</h2>
                <div className="space-y-1.5 sm:space-y-2">
                  {canViewStudents && (
                    <button
                      onClick={() => navigate('/admin/dashboard/students')}
                      className="w-full text-left px-3 sm:px-4 py-2 text-xs sm:text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors active:bg-gray-100"
                    >
                      Add New Student
                    </button>
                  )}
                  {canViewAttendance && (
                    <button
                      onClick={() => navigate('/admin/dashboard/attendance')}
                      className="w-full text-left px-3 sm:px-4 py-2 text-xs sm:text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors active:bg-gray-100"
                    >
                      Mark Attendance
                    </button>
                  )}
                  {canViewAnnouncements && (
                    <button
                      onClick={() => navigate('/admin/dashboard/announcements')}
                      className="w-full text-left px-3 sm:px-4 py-2 text-xs sm:text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors active:bg-gray-100"
                    >
                      Create Announcement
                    </button>
                  )}
                  {canViewPolls && (
                    <button
                      onClick={() => navigate('/admin/dashboard/polls')}
                      className="w-full text-left px-3 sm:px-4 py-2 text-xs sm:text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors active:bg-gray-100"
                    >
                      Create Poll
                    </button>
                  )}
                </div>
              </div>
            )}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default DashboardHome;
