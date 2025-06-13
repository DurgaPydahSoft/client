import { Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy, useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoadingSpinner from './components/LoadingSpinner';
import React from 'react';
import MemberManagement from './pages/admin/MemberManagement';
import { subscribeToPushNotifications, checkNotificationSupport, registerServiceWorker, requestNotificationPermission } from './utils/pushNotifications';
import Profile from './pages/student/Profile';
import { HelmetProvider } from 'react-helmet-async';
import { connectSocket, disconnectSocket } from './utils/socket';
import RouteLoading from './components/RouteLoading';
import OutpassQRDetails from './pages/student/OutpassQRDetails';

// Lazy load components
const Login = lazy(() => import('./pages/Login'));
const StudentRegister = lazy(() => import('./pages/StudentRegister'));
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));
const StudentDashboard = lazy(() => import('./pages/student/Dashboard'));
const NotFound = lazy(() => import('./pages/NotFound'));
const Home = lazy(() => import('./pages/Home'));

// Admin components
const Students = lazy(() => import('./pages/admin/Students'));
const Complaints = lazy(() => import('./pages/admin/Complaints'));
const Announcements = lazy(() => import('./pages/admin/Announcements'));
const Notifications = lazy(() => import('./pages/admin/Notifications'));
const DashboardHome = lazy(() => import('./pages/admin/DashboardHome'));
const PollManagement = lazy(() => import('./pages/admin/PollManagement'));
const RoomManagement = lazy(() => import('./pages/admin/RoomManagement'));
const OutpassManagement = lazy(() => import('./pages/admin/OutpassManagement'));

// Student components
const RaiseComplaint = lazy(() => import('./pages/student/RaiseComplaint'));
const MyComplaints = lazy(() => import('./pages/student/MyComplaints'));
const StudentAnnouncements = lazy(() => import('./pages/student/Announcements'));
const StudentNotifications = lazy(() => import('./pages/student/Notifications'));
const ResetPassword = lazy(() => import('./pages/student/ResetPassword'));
const Polls = lazy(() => import('./pages/student/Polls'));

// Loading component
const Loading = () => (
  <div className="flex items-center justify-center min-h-screen">
    <LoadingSpinner size="lg" />
  </div>
);

// Error boundary component
const ErrorBoundary = ({ children }) => {
  const [hasError, setHasError] = React.useState(false);

  React.useEffect(() => {
    const handleError = (error) => {
      console.error('Error caught by boundary:', error);
      setHasError(true);
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  if (hasError) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-bold text-red-600 mb-2">Something went wrong</h2>
          <button 
            className="btn-primary"
            onClick={() => window.location.reload()}
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  return children;
};

// Create a separate component for push notification initialization
const PushNotificationInitializer = () => {
  const { isAuthenticated, user } = useAuth();
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    console.log('PushNotificationInitializer - Auth State:', {
      isAuthenticated,
      user: user ? 'User data present' : 'No user data',
      initialized
    });

    const initializeNotifications = async () => {
      if (!isAuthenticated || !user || initialized) {
        console.log('PushNotificationInitializer - Waiting for auth:', {
          isAuthenticated,
          hasUser: !!user,
          initialized
        });
        return;
      }

      console.log('PushNotificationInitializer - Starting initialization for user:', user.name);
      
      // Connect socket first
      connectSocket();

        try {
        const registration = await registerServiceWorker();
        if (registration) {
          const hasPermission = await requestNotificationPermission();
          if (hasPermission) {
            await subscribeToPushNotifications(registration);
          }
          }
        } catch (error) {
        console.error('PushNotificationInitializer - Error:', error);
      } finally {
        setInitialized(true);
      }
    };

    initializeNotifications();

    // Cleanup function
    return () => {
      disconnectSocket();
    };
  }, [isAuthenticated, user, initialized]);

  return null;
};

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
            
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<StudentRegister />} />
            <Route path="outpass/qr/:id" element={<OutpassQRDetails />} />
            
            {/* Protected admin routes */}
            <Route
                path="/admin/*"
              element={
                <ProtectedRoute requireAuth={true} role="admin">
                  <AdminDashboard />
                </ProtectedRoute>
              }
            >
              <Route index element={<DashboardHome />} />
              <Route path="students" element={<Students />} />
              <Route path="complaints" element={<Complaints />} />
              <Route path="complaints/details/:id" element={<Complaints />} />
              <Route path="announcements" element={<Announcements />} />
              <Route path="notifications" element={<Notifications />} />
              <Route path="members" element={<MemberManagement />} />
              <Route path="polls" element={<PollManagement />} />
              <Route path="rooms" element={<RoomManagement />} />
              <Route path="outpass" element={<OutpassManagement />} /> 
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
              <Route path="announcements" element={<StudentAnnouncements />} />
              <Route path="notifications" element={<StudentNotifications />} />
              <Route path="polls" element={<Polls />} />
                <Route path="profile" element={<Profile />} />
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