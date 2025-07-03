import { Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy, useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import ProtectedSection from './components/ProtectedSection';
import React from 'react';
import Profile from './pages/student/Profile';
import { HelmetProvider } from 'react-helmet-async';
import RouteLoading from './components/RouteLoading';
import LeaveQRDetails from './pages/student/LeaveQRDetails';
import SecurityDashboard from './pages/security/SecurityDashboard';
import PushNotificationInitializer from './components/PushNotificationInitializer';
import MenuManagement from './pages/admin/MenuManagement';
import Home from './pages/Home.jsx';
import HomeAlt from './pages/HomeAlt.jsx';
import MyAttendance from './pages/student/MyAttendance';

// Lazy load components
const Login = lazy(() => import('./pages/Login'));
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));
const StudentDashboard = lazy(() => import('./pages/student/Dashboard'));
const WardenDashboard = lazy(() => import('./pages/warden/WardenDashboard'));
const NotFound = lazy(() => import('./pages/NotFound'));

// Admin components
const Students = lazy(() => import('./pages/admin/Students'));
const Complaints = lazy(() => import('./pages/admin/Complaints'));
const Announcements = lazy(() => import('./pages/admin/Announcements'));
const Notifications = lazy(() => import('./pages/admin/Notifications'));
const DashboardHome = lazy(() => import('./pages/admin/DashboardHome'));
const PollManagement = lazy(() => import('./pages/admin/PollManagement'));
const RoomManagement = lazy(() => import('./pages/admin/RoomManagement'));
const LeaveManagement = lazy(() => import('./pages/admin/LeaveManagement'));
const MemberManagement = lazy(() => import('./pages/admin/MemberManagement'));
const AdminManagement = lazy(() => import('./pages/admin/AdminManagement'));
const Attendance = lazy(() => import('./pages/admin/Attendance'));

// Student components
const RaiseComplaint = lazy(() => import('./pages/student/RaiseComplaint'));
const MyComplaints = lazy(() => import('./pages/student/MyComplaints'));
const Leave = lazy(() => import('./pages/student/Leave'));
const StudentAnnouncements = lazy(() => import('./pages/student/Announcements'));
const StudentNotifications = lazy(() => import('./pages/student/Notifications'));
const Polls = lazy(() => import('./pages/student/Polls'));
const ResetPassword = lazy(() => import('./pages/student/ResetPassword'));

// Warden components
const WardenHome = lazy(() => import('./pages/warden/WardenHome'));
const WardenTakeAttendance = lazy(() => import('./pages/warden/TakeAttendance'));
const WardenViewAttendance = lazy(() => import('./pages/warden/ViewAttendance'));
const BulkOuting = lazy(() => import('./pages/warden/BulkOuting'));
const WardenNotifications = lazy(() => import('./pages/warden/Notifications'));

// Principal components
const PrincipalDashboard = lazy(() => import('./pages/principal/Dashboard'));
const PrincipalHome = lazy(() => import('./pages/principal/PrincipalHome'));
const PrincipalAttendance = lazy(() => import('./pages/principal/PrincipalAttendance'));

// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Something went wrong</h1>
            <p className="text-gray-600 mb-4">Please refresh the page or try again later.</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function App() {
  return (
    <HelmetProvider>
    <ErrorBoundary>
      <AuthProvider>
        <PushNotificationInitializer />
          <Suspense fallback={<RouteLoading />}>
          <Routes>
            {/* Home page */}
            <Route path="/" element={<Home />} />
            <Route path="/home-alt" element={<HomeAlt />} />
            
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="leave/qr/:id" element={<LeaveQRDetails />} />
            <Route path="security-dashboard" element={<SecurityDashboard />} />
            
            {/* Protected admin routes */}
            <Route
                path="/admin"
              element={<Navigate to="/admin/dashboard" replace />}
            />
            <Route
                path="/admin/dashboard/*"
              element={
                <ProtectedRoute requireAuth={true} role="admin">
                  <AdminDashboard />
                </ProtectedRoute>
              }
            >
              <Route index element={<DashboardHome />} />
              <Route path="rooms" element={
                <ProtectedSection permission="room_management" sectionName="Room Management">
                  <RoomManagement />
                </ProtectedSection>
              } />
              <Route path="students" element={
                <ProtectedSection permission="student_management" sectionName="Student Management">
                  <Students />
                </ProtectedSection>
              } />
              <Route path="complaints" element={
                <ProtectedSection permission="complaint_management" sectionName="Complaints">
                  <Complaints />
                </ProtectedSection>
              } />
              <Route path="complaints/details/:id" element={
                <ProtectedSection permission="complaint_management" sectionName="Complaints">
                  <Complaints />
                </ProtectedSection>
              } />
              <Route path="announcements" element={
                <ProtectedSection permission="announcement_management" sectionName="Announcements">
                  <Announcements />
                </ProtectedSection>
              } />
              <Route path="notifications" element={<Notifications />} />
              <Route path="members" element={<MemberManagement />} />
              <Route path="polls" element={
                <ProtectedSection permission="poll_management" sectionName="Polls">
                  <PollManagement />
                </ProtectedSection>
              } />
              <Route path="leave" element={
                <ProtectedSection permission="leave_management" sectionName="Leave Management">
                  <LeaveManagement />
                </ProtectedSection>
              } />
              <Route path="admin-management" element={
                <ProtectedSection permission="super_admin" sectionName="Admin Management">
                  <AdminManagement />
                </ProtectedSection>
              } />
              <Route path="menu" element={<MenuManagement />} />
              <Route path="attendance" element={
                <ProtectedSection permission="attendance_management" sectionName="Attendance Management">
                  <Attendance />
                </ProtectedSection>
              } />
            </Route>

            {/* Protected warden routes */}
            <Route
                path="/warden"
              element={<Navigate to="/warden/dashboard" replace />}
            />
            <Route
                path="/warden/dashboard/*"
              element={
                <ProtectedRoute requireAuth={true} role="warden">
                  <WardenDashboard />
                </ProtectedRoute>
              }
            >
              <Route index element={<WardenHome />} />
              <Route path="take-attendance" element={<WardenTakeAttendance />} />
              <Route path="view-attendance" element={<WardenViewAttendance />} />
              <Route path="bulk-outing" element={<BulkOuting />} />
              <Route path="notifications" element={<WardenNotifications />} />
            </Route>

            {/* Protected principal routes */}
            <Route
                path="/principal"
              element={<Navigate to="/principal/dashboard" replace />}
            />
            <Route
                path="/principal/dashboard/*"
              element={
                <ProtectedRoute requireAuth={true} role="principal">
                  <PrincipalDashboard />
                </ProtectedRoute>
              }
            >
              <Route index element={<PrincipalHome />} />
              <Route path="attendance" element={<PrincipalAttendance />} />
            </Route>
            
            {/* Student reset password route */}
            <Route
              path="/student/reset-password"
              element={
                <ProtectedRoute requireAuth={true} requirePasswordChange={true}>
                  <ResetPassword />
                </ProtectedRoute>
              }
            />
            
            {/* Protected student routes */}
            <Route
                path="/student/*"
              element={
                <ProtectedRoute requireAuth={true} requirePasswordChange={false}>
                  <StudentDashboard />
                </ProtectedRoute>
              }
            >
              <Route index element={<div>Welcome, Student! Select a feature from the sidebar.</div>} />
              <Route path="raise" element={<RaiseComplaint />} />
              <Route path="my-complaints" element={<MyComplaints />} />
              <Route path="leave" element={<Leave />} />
              <Route path="announcements" element={<StudentAnnouncements />} />
              <Route path="notifications" element={<StudentNotifications />} />
              <Route path="polls" element={<Polls />} />
              <Route path="profile" element={<Profile />} />
              <Route path="attendance" element={<MyAttendance />} />
            </Route>
            
            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </ErrorBoundary>
    </HelmetProvider>
  );
}

export default App;