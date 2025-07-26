import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App';
import './index.css';
import { logIOSInfo, isIOSDevice } from './utils/iosUtils';

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

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster position="top-right" />
    </BrowserRouter>
  </React.StrictMode>
); 