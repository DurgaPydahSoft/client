import React from 'react';
import { isIOSDevice, logIOSInfo } from '../utils/iosUtils';
import IOSDebugPanel from './IOSDebugPanel';

class IOSErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log iOS-specific error information
    if (isIOSDevice) {
      console.error('🦁 iOS Error Boundary caught an error:', error);
      console.error('🦁 iOS Error Info:', errorInfo);
      logIOSInfo();
      
      // Log additional iOS context
      console.error('🦁 iOS Context:', {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        vendor: navigator.vendor,
        language: navigator.language,
        cookieEnabled: navigator.cookieEnabled,
        onLine: navigator.onLine,
        url: window.location.href,
        timestamp: new Date().toISOString()
      });
    }

    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      // iOS-specific error UI
      if (isIOSDevice) {
        return (
          <>
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
              <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                
                <h1 className="text-xl font-bold text-gray-900 mb-2">iOS Compatibility Issue</h1>
                <p className="text-gray-600 mb-4">
                  We encountered an issue with your iOS device. This might be due to browser compatibility or network connectivity.
                </p>
                
                <div className="space-y-3">
                  <button
                    onClick={() => window.location.reload()}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Refresh Page
                  </button>
                  
                  <button
                    onClick={() => window.location.href = '/login'}
                    className="w-full bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Go to Login
                  </button>
                  
                  <div className="text-xs text-gray-500 mt-4">
                    <p>If the problem persists, try:</p>
                    <ul className="list-disc list-inside mt-1 space-y-1">
                      <li>Using Safari instead of Chrome</li>
                      <li>Clearing browser cache</li>
                      <li>Checking your internet connection</li>
                      <li>Updating your iOS version</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Debug Panel */}
            <IOSDebugPanel 
              error={this.state.error} 
              errorInfo={this.state.errorInfo} 
              isVisible={true} 
            />
          </>
        );
      }

      // Default error UI for non-iOS devices
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            
            <h1 className="text-xl font-bold text-gray-900 mb-2">Something went wrong</h1>
            <p className="text-gray-600 mb-4">
              We encountered an unexpected error. Please try refreshing the page.
            </p>
            
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
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

export default IOSErrorBoundary; 