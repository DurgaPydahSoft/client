import React, { useState, useEffect } from 'react';
import { isIOSDevice, logIOSInfo, getErrorLog, clearErrorLog } from '../utils/iosUtils';

const IOSDebugPanel = ({ error, errorInfo, isVisible = false }) => {
  const [debugInfo, setDebugInfo] = useState({});
  const [isExpanded, setIsExpanded] = useState(false);
  const [errorLog, setErrorLog] = useState([]);
  const [showErrorLog, setShowErrorLog] = useState(false);

  useEffect(() => {
    // Collect comprehensive debug information
    const collectDebugInfo = () => {
      const info = {
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        vendor: navigator.vendor,
        language: navigator.language,
        cookieEnabled: navigator.cookieEnabled,
        onLine: navigator.onLine,
        url: window.location.href,
        referrer: document.referrer,
        screen: {
          width: window.screen.width,
          height: window.screen.height,
          availWidth: window.screen.availWidth,
          availHeight: window.screen.availHeight,
          colorDepth: window.screen.colorDepth,
          pixelDepth: window.screen.pixelDepth
        },
        window: {
          innerWidth: window.innerWidth,
          innerHeight: window.innerHeight,
          outerWidth: window.outerWidth,
          outerHeight: window.outerHeight
        },
        localStorage: {
          available: typeof localStorage !== 'undefined',
          test: (() => {
            try {
              localStorage.setItem('__debug_test__', 'test');
              localStorage.removeItem('__debug_test__');
              return 'working';
            } catch (e) {
              return `failed: ${e.message}`;
            }
          })()
        },
        sessionStorage: {
          available: typeof sessionStorage !== 'undefined',
          test: (() => {
            try {
              sessionStorage.setItem('__debug_test__', 'test');
              sessionStorage.removeItem('__debug_test__');
              return 'working';
            } catch (e) {
              return `failed: ${e.message}`;
            }
          })()
        },
        features: {
          serviceWorker: 'serviceWorker' in navigator,
          pushManager: 'PushManager' in window,
          notification: 'Notification' in window,
          fetch: 'fetch' in window,
          promise: 'Promise' in window,
          webSocket: 'WebSocket' in window
        },
        performance: {
          memory: performance.memory ? {
            usedJSHeapSize: performance.memory.usedJSHeapSize,
            totalJSHeapSize: performance.memory.totalJSHeapSize,
            jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
          } : 'not available',
          timing: performance.timing ? {
            navigationStart: performance.timing.navigationStart,
            loadEventEnd: performance.timing.loadEventEnd,
            domContentLoadedEventEnd: performance.timing.domContentLoadedEventEnd
          } : 'not available'
        },
        network: {
          connection: navigator.connection ? {
            effectiveType: navigator.connection.effectiveType,
            downlink: navigator.connection.downlink,
            rtt: navigator.connection.rtt
          } : 'not available'
        }
      };

      setDebugInfo(info);
    };

    collectDebugInfo();
    
    // Load error log
    const errors = getErrorLog();
    setErrorLog(errors);
  }, []);

  // Show debug panel if there's an error, or if explicitly visible, or if iOS device and debug mode is enabled
  const shouldShow = isVisible || error || (isIOSDevice && localStorage.getItem('ios_debug_mode') === 'true');
  
  if (!shouldShow) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md">
      <div className="bg-red-600 text-white rounded-lg shadow-lg overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 bg-red-700 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span className="font-semibold">iOS Debug Panel</span>
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-white hover:text-gray-200"
          >
            {isExpanded ? '−' : '+'}
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="px-4 py-3 bg-red-50 border-b border-red-200">
            <h3 className="font-semibold text-red-800 mb-2">Error Details:</h3>
            <div className="text-sm text-red-700 space-y-1">
              <div><strong>Message:</strong> {error.message}</div>
              <div><strong>Stack:</strong></div>
              <pre className="text-xs bg-red-100 p-2 rounded overflow-x-auto">
                {error.stack}
              </pre>
            </div>
          </div>
        )}

        {/* Debug Info */}
        {isExpanded && (
          <div className="px-4 py-3 bg-white text-gray-800 max-h-96 overflow-y-auto">
            <h3 className="font-semibold mb-3">System Information:</h3>
            
            {/* Basic Info */}
            <div className="space-y-2 text-sm">
              <div><strong>Device:</strong> {debugInfo.platform}</div>
              <div><strong>Browser:</strong> {debugInfo.userAgent}</div>
              <div><strong>Online:</strong> {debugInfo.onLine ? 'Yes' : 'No'}</div>
              <div><strong>URL:</strong> {debugInfo.url}</div>
            </div>

            {/* Storage Tests */}
            <div className="mt-4">
              <h4 className="font-semibold mb-2">Storage Tests:</h4>
              <div className="space-y-1 text-sm">
                <div><strong>localStorage:</strong> {debugInfo.localStorage?.test}</div>
                <div><strong>sessionStorage:</strong> {debugInfo.sessionStorage?.test}</div>
              </div>
            </div>

            {/* Feature Detection */}
            <div className="mt-4">
              <h4 className="font-semibold mb-2">Feature Detection:</h4>
              <div className="grid grid-cols-2 gap-1 text-sm">
                {Object.entries(debugInfo.features || {}).map(([feature, available]) => (
                  <div key={feature} className={available ? 'text-green-600' : 'text-red-600'}>
                    <strong>{feature}:</strong> {available ? '✓' : '✗'}
                  </div>
                ))}
              </div>
            </div>

            {/* Screen Info */}
            <div className="mt-4">
              <h4 className="font-semibold mb-2">Screen Info:</h4>
              <div className="space-y-1 text-sm">
                <div><strong>Size:</strong> {debugInfo.screen?.width} × {debugInfo.screen?.height}</div>
                <div><strong>Available:</strong> {debugInfo.screen?.availWidth} × {debugInfo.screen?.availHeight}</div>
                <div><strong>Color Depth:</strong> {debugInfo.screen?.colorDepth}</div>
              </div>
            </div>

            {/* Window Info */}
            <div className="mt-4">
              <h4 className="font-semibold mb-2">Window Info:</h4>
              <div className="space-y-1 text-sm">
                <div><strong>Inner:</strong> {debugInfo.window?.innerWidth} × {debugInfo.window?.innerHeight}</div>
                <div><strong>Outer:</strong> {debugInfo.window?.outerWidth} × {debugInfo.window?.outerHeight}</div>
              </div>
            </div>

            {/* Network Info */}
            {debugInfo.network?.connection !== 'not available' && (
              <div className="mt-4">
                <h4 className="font-semibold mb-2">Network Info:</h4>
                <div className="space-y-1 text-sm">
                  <div><strong>Type:</strong> {debugInfo.network.connection.effectiveType}</div>
                  <div><strong>Downlink:</strong> {debugInfo.network.connection.downlink} Mbps</div>
                  <div><strong>RTT:</strong> {debugInfo.network.connection.rtt} ms</div>
                </div>
              </div>
            )}

            {/* Performance Info */}
            {debugInfo.performance?.memory !== 'not available' && (
              <div className="mt-4">
                <h4 className="font-semibold mb-2">Memory Usage:</h4>
                <div className="space-y-1 text-sm">
                  <div><strong>Used:</strong> {Math.round(debugInfo.performance.memory.usedJSHeapSize / 1024 / 1024)} MB</div>
                  <div><strong>Total:</strong> {Math.round(debugInfo.performance.memory.totalJSHeapSize / 1024 / 1024)} MB</div>
                  <div><strong>Limit:</strong> {Math.round(debugInfo.performance.memory.jsHeapSizeLimit / 1024 / 1024)} MB</div>
                </div>
              </div>
            )}

            {/* Raw Debug Info */}
            <div className="mt-4">
              <h4 className="font-semibold mb-2">Raw Debug Info:</h4>
              <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                {JSON.stringify(debugInfo, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="px-4 py-2 bg-gray-50 flex space-x-2 flex-wrap">
          <button
            onClick={() => window.location.reload()}
            className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
          >
            Refresh
          </button>
          <button
            onClick={() => {
              navigator.clipboard.writeText(JSON.stringify(debugInfo, null, 2));
              alert('Debug info copied to clipboard!');
            }}
            className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
          >
            Copy Info
          </button>
          <button
            onClick={() => logIOSInfo()}
            className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
          >
            Log to Console
          </button>
          <button
            onClick={() => setShowErrorLog(!showErrorLog)}
            className="px-3 py-1 bg-orange-600 text-white text-sm rounded hover:bg-orange-700"
          >
            {showErrorLog ? 'Hide' : 'Show'} Errors ({errorLog.length})
          </button>
          <button
            onClick={() => {
              clearErrorLog();
              setErrorLog([]);
              alert('Error log cleared!');
            }}
            className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
          >
            Clear Errors
          </button>
          <button
            onClick={() => {
              const debugMode = localStorage.getItem('ios_debug_mode') === 'true';
              localStorage.setItem('ios_debug_mode', !debugMode);
              window.location.reload();
            }}
            className="px-3 py-1 bg-purple-600 text-white text-sm rounded hover:bg-purple-700"
          >
            {localStorage.getItem('ios_debug_mode') === 'true' ? 'Disable' : 'Enable'} Debug
          </button>
        </div>

        {/* Error Log */}
        {showErrorLog && errorLog.length > 0 && (
          <div className="px-4 py-3 bg-yellow-50 border-t border-yellow-200">
            <h3 className="font-semibold text-yellow-800 mb-2">Recent API Errors ({errorLog.length}):</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {errorLog.map((err, index) => (
                <div key={index} className="text-xs bg-yellow-100 p-2 rounded">
                  <div><strong>Time:</strong> {new Date(err.timestamp).toLocaleTimeString()}</div>
                  <div><strong>URL:</strong> {err.url}</div>
                  <div><strong>Status:</strong> {err.status}</div>
                  <div><strong>Message:</strong> {err.message}</div>
                  <div><strong>iOS:</strong> {err.isIOS ? 'Yes' : 'No'}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default IOSDebugPanel; 