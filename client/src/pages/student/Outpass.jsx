import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import api from '../../utils/axios';
import toast from 'react-hot-toast';
import QRCode from 'react-qr-code';
import {
  CalendarIcon,
  DocumentTextIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';
import SEO from '../../components/SEO';
import { useAuth } from '../../context/AuthContext';

const Outpass = () => {
  const [outpasses, setOutpasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [qrModal, setQrModal] = useState({ open: false, outpass: null });
  const [formData, setFormData] = useState({
    startDate: '',
    endDate: '',
    reason: ''
  });
  const { user } = useAuth ? useAuth() : { user: null };

  useEffect(() => {
    fetchOutpasses();
  }, []);

  const fetchOutpasses = async () => {
    try {
      console.log('Fetching outpass requests...');
      const response = await api.get('/api/outpass/my-requests');
      console.log('Outpass response:', response.data);
      
      if (response.data.success) {
        setOutpasses(response.data.data);
      } else {
        throw new Error(response.data.message || 'Failed to fetch outpass requests');
      }
    } catch (error) {
      console.error('Error fetching outpasses:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        headers: error.response?.headers
      });
      
      if (error.response?.status === 401) {
        toast.error('Please login again to continue');
        // Redirect to login if needed
      } else {
        toast.error(error.response?.data?.message || 'Failed to fetch outpass requests');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      console.log('Submitting outpass request:', formData);
      const response = await api.post('/api/outpass/create', formData);
      console.log('Submit response:', response.data);
      
      if (response.data.success) {
        toast.success(response.data.data.message || 'Outpass request submitted successfully');
        setShowRequestModal(false);
        setFormData({ startDate: '', endDate: '', reason: '' });
        fetchOutpasses();
      } else {
        throw new Error(response.data.message || 'Failed to submit outpass request');
      }
    } catch (error) {
      console.error('Error submitting outpass:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        headers: error.response?.headers
      });
      
      if (error.response?.status === 401) {
        toast.error('Please login again to continue');
        // Redirect to login if needed
      } else {
        toast.error(error.response?.data?.message || 'Failed to submit outpass request');
      }
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Approved':
        return 'text-green-600 bg-green-50';
      case 'Rejected':
        return 'text-red-600 bg-red-50';
      case 'Pending':
      case 'Pending OTP Verification':
        return 'text-yellow-600 bg-yellow-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Approved':
        return <CheckCircleIcon className="w-5 h-5" />;
      case 'Rejected':
        return <XCircleIcon className="w-5 h-5" />;
      case 'Pending':
      case 'Pending OTP Verification':
        return <ExclamationCircleIcon className="w-5 h-5" />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 ">
      <div className="max-w-7xl mx-auto px-2 sm:px-6 py-4 sm:py-8">
        <SEO 
          title="Outpass Requests"
          description="Submit and track your hostel outpass requests"
          keywords="outpass request, hostel leave, student permissions"
        />

        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 sm:mb-6 gap-3 sm:gap-0 mt-4">
          <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-900 to-blue-700 bg-clip-text text-transparent">Outpass Requests</h1>
          <button
            onClick={() => setShowRequestModal(true)}
            className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-base sm:text-base"
          >
            New Request
          </button>
        </div>

        {/* Outpass List */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          ) : outpasses.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <DocumentTextIcon className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p>No outpass requests found</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {outpasses.map((outpass) => (
                <motion.div
                  key={outpass._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 sm:p-6 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(outpass.status)}`}>
                          {getStatusIcon(outpass.status)}
                          <span className="ml-1">{outpass.status}</span>
                        </span>
                        <span className="text-xs sm:text-sm text-gray-500">
                          {new Date(outpass.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-gray-600 mb-2">
                        <div className="flex items-center gap-1">
                          <CalendarIcon className="w-4 h-4" />
                          <span>From: {new Date(outpass.startDate).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <CalendarIcon className="w-4 h-4" />
                          <span>To: {new Date(outpass.endDate).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <ClockIcon className="w-4 h-4" />
                          <span>{outpass.numberOfDays} day{outpass.numberOfDays > 1 ? 's' : ''}</span>
                        </div>
                      </div>

                      <p className="text-gray-700 mb-2 text-sm sm:text-base break-words">{outpass.reason}</p>

                      {outpass.rejectionReason && (
                        <p className="text-xs sm:text-sm text-red-600">
                          Rejection Reason: {outpass.rejectionReason}
                        </p>
                      )}
                    </div>
                    {/* QR Code Button for Approved Outpass */}
                    {outpass.status === 'Approved' && (
                      <button
                        className={`w-full sm:w-auto mt-2 sm:mt-0 px-3 py-2 rounded transition-colors text-sm font-semibold ${outpass.qrLocked ? 'bg-gray-400 text-white cursor-not-allowed' : 'bg-green-600 text-white hover:bg-green-700'}`}
                        disabled={outpass.qrLocked}
                        onClick={async () => {
                          if (outpass.qrLocked) return;
                          try {
                            const res = await api.post(`/api/outpass/qr-view/${outpass._id}`);
                            if (res.data.success) {
                              setQrModal({ open: true, outpass });
                            }
                          } catch (err) {
                            if (err.response && err.response.data && err.response.data.qrLocked) {
                              toast.error('QR code view limit reached');
                              // Optionally update UI
                              outpass.qrLocked = true;
                              setOutpasses([...outpasses]);
                            } else {
                              toast.error('Unable to open QR code');
                            }
                          }
                        }}
                      >
                        {outpass.qrLocked ? 'QR Locked' : 'View QR Code'}
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* QR Code Modal */}
      {qrModal.open && qrModal.outpass && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl p-8 w-full max-w-md flex flex-col items-center"
          >
            <h2 className="text-xl font-bold mb-4 text-green-700">Outpass QR Code</h2>
            <QRCode
              value={`${import.meta.env.VITE_QR_BASE_URL || window.location.origin}/outpass/qr/${qrModal.outpass._id}`}
              size={200}
            />
            <button
              className="mt-8 px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-800 transition-colors"
              onClick={() => setQrModal({ open: false, outpass: null })}
            >
              Close
            </button>
          </motion.div>
        </div>
      )}

      {/* Request Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl p-6 w-full max-w-md"
          >
            <h2 className="text-xl font-semibold mb-4">New Outpass Request</h2>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date and Time
                </label>
                <input
                  type="datetime-local"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date and Time
                </label>
                <input
                  type="datetime-local"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason
                </label>
                <textarea
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  required
                  rows="4"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter your reason for outpass"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowRequestModal(false);
                    setFormData({ startDate: '', endDate: '', reason: '' });
                  }}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Submit Request
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Outpass; 