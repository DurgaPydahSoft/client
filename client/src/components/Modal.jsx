import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-2 sm:p-4 text-center">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />

        <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl mx-2 sm:mx-4">
          <div className="bg-white px-3 pb-3 pt-4 sm:px-4 sm:pb-4 sm:pt-5 md:px-6 md:pb-6 md:pt-6">
            <div className="flex items-start justify-between">
              <h3 className="text-base sm:text-lg font-semibold leading-6 text-gray-900">
                {title}
              </h3>
              <button
                type="button"
                className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none p-1"
                onClick={onClose}
              >
                <span className="sr-only">Close</span>
                <XMarkIcon className="h-5 w-5 sm:h-6 sm:w-6" />
              </button>
            </div>
            <div className="mt-2 sm:mt-3">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Modal; 