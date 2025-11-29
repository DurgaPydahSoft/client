import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import {
  DevicePhoneMobileIcon,
  XMarkIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline';

const PWAInstallPrompt = () => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    // Check if app is already installed
    if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setShowPrompt(true);
    };

    // Listen for appinstalled event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowPrompt(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstall = () => {
    if (window.installPWA) {
      window.installPWA();
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // Store in localStorage to not show again for a while
    localStorage.setItem('pwa-prompt-dismissed', Date.now().toString());
  };

  // Don't show if already installed, recently dismissed, or on specific pages
  const excludedPaths = ['/student/preregister', '/student/preregister/success'];
  const shouldHide = isInstalled || !showPrompt || excludedPaths.some(path => location.pathname.startsWith(path));
  
  if (shouldHide) {
    return null;
  }

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className="fixed top-4 left-4 right-4 md:w-1/3 md:mx-auto z-50 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden"
        >
          {/* Mobile: Compact bottom sheet style */}
          <div className="sm:hidden">
            <div className="p-3 bg-gradient-to-r from-blue-600 to-blue-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DevicePhoneMobileIcon className="w-5 h-5 text-white" />
                  <h3 className="text-sm font-semibold text-white">
                    Install App
                  </h3>
                </div>
                <button
                  onClick={handleDismiss}
                  className="p-1 text-white/80 hover:text-white transition-colors"
                  aria-label="Dismiss"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-3">
              <p className="text-xs text-gray-600 mb-3">
                Add to home screen for quick access
              </p>
              <button
                onClick={handleInstall}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors"
              >
                <ArrowDownTrayIcon className="w-5 h-5" />
                <span>Install Now</span>
              </button>
            </div>
          </div>

          {/* Desktop: Original horizontal layout */}
          <div className="hidden sm:block p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                  <DevicePhoneMobileIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">
                    Install Pydah Hostel Digital
                  </h3>
                  <p className="text-xs text-gray-600">
                    Add to home screen for quick access
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleInstall}
                  className="flex items-center space-x-1 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-md hover:bg-blue-700 transition-colors"
                >
                  <ArrowDownTrayIcon className="w-4 h-4" />
                  <span>Install</span>
                </button>
                <button
                  onClick={handleDismiss}
                  className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PWAInstallPrompt; 