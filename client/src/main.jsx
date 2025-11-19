import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './index.css';
import { logIOSInfo, isIOSDevice } from './utils/iosUtils';
import { CoursesBranchesProvider } from './context/CoursesBranchesContext';

// Log iOS detection info on app start
logIOSInfo();

// Global error handler for iOS debugging
if (isIOSDevice) {
  window.addEventListener('error', (event) => {
    console.error('🦁 Global error caught:', event.error);
    console.error('🦁 Error details:', {
      message: event.error?.message,
      stack: event.error?.stack,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      timestamp: new Date().toISOString()
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    console.error('🦁 Unhandled promise rejection:', event.reason);
    console.error('🦁 Promise rejection details:', {
      reason: event.reason,
      timestamp: new Date().toISOString()
    });
  });
}

// Check Notification API availability and log it
if (typeof Notification === 'undefined') {
  console.warn('🦁 Notification API is not available in this browser');
  // Create a mock Notification object to prevent errors
  window.Notification = {
    permission: 'denied',
    requestPermission: async () => 'denied'
  };
} else {
  console.log('🦁 Notification API is available:', {
    permission: Notification.permission,
    supported: typeof Notification.requestPermission === 'function'
  });
}

// Create React Query client with optimized defaults
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      retry: 1,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <CoursesBranchesProvider>
          <App />
          <Toaster position="top-right" />
        </CoursesBranchesProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
); 