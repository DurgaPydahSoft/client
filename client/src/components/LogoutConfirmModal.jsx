import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRightOnRectangleIcon,
  XMarkIcon,
  ArrowTopRightOnSquareIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';

const LogoutConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  isSSO = false,
  loading = false,
  crmUrl = 'https://crm.pydah.edu.in'
}) => {
  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !loading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, loading]);

  // Prevent background scroll when modal is active
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
          onClick={loading ? undefined : onClose}
        />

        {/* Modal Dialog */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: 'spring', duration: 0.25, bounce: 0.1 }}
          className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-10"
          role="dialog"
          aria-modal="true"
          aria-labelledby="logout-modal-title"
        >
          {/* Close button */}
          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-300 disabled:opacity-50"
            aria-label="Close"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>

          <div className="p-6">
            {/* Header Icon & Title */}
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center flex-shrink-0 ring-4 ring-red-50/60">
                <ArrowRightOnRectangleIcon className="w-6 h-6" />
              </div>
              <div>
                <h3 id="logout-modal-title" className="text-lg font-semibold text-slate-900 leading-snug">
                  Confirm Logout
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  Are you sure you want to log out of your session?
                </p>
              </div>
            </div>

            {/* SSO-specific notice */}
            {isSSO && (
              <div className="mt-4 p-3.5 bg-blue-50/80 border border-blue-200/70 rounded-xl text-left">
                <div className="flex items-center gap-2 text-blue-800 font-medium text-xs sm:text-sm">
                  <ShieldCheckIcon className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  <span>SSO Active Session</span>
                </div>
                <p className="mt-1 text-xs text-blue-700 leading-relaxed">
                  You logged in via Single Sign-On. Logging out will end your session and redirect you back to the CRM portal:
                </p>
                <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-blue-200 rounded-lg text-xs font-medium text-blue-900 max-w-full truncate">
                  <span className="truncate">{crmUrl}</span>
                  <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                type="button"
                disabled={loading}
                onClick={onClose}
                className="w-32 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 active:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-300 disabled:opacity-50 text-center"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={onConfirm}
                className="min-w-[130px] px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-sm font-medium shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Logging out...</span>
                  </>
                ) : (
                  <>
                    <ArrowRightOnRectangleIcon className="w-4 h-4" />
                    <span>{isSSO ? 'Logout & Go to CRM' : 'Logout'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default LogoutConfirmModal;
