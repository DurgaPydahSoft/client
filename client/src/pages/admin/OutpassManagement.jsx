import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import api from '../../utils/axios';
import toast from 'react-hot-toast';
import {
  CalendarIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationCircleIcon,
  UserIcon,
  AcademicCapIcon,
  PhoneIcon
} from '@heroicons/react/24/outline';
import SEO from '../../components/SEO';

const OutpassManagement = () => {
  const [outpasses, setOutpasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [selectedOutpass, setSelectedOutpass] = useState(null);
  const [otp, setOtp] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    page: 1
  });

  useEffect(() => {
    fetchOutpasses();
  }, [filters]);

  const fetchOutpasses = async () => {
    try {
      console.log('Fetching outpasses with filters:', filters);
      const response = await api.get('/api/admin/outpass/all', { params: filters });
      console.log('Outpass response:', response.data);
      if (response.data.success) {
        setOutpasses(response.data.data.outpasses);
        console.log('Set outpasses:', response.data.data.outpasses);
      }
    } catch (error) {
      console.error('Error fetching outpasses:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        headers: error.response?.headers
      });
      toast.error('Failed to fetch outpass requests');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    try {
      const response = await api.post('/api/admin/outpass/verify-otp', {
        outpassId: selectedOutpass._id,
        otp
      });
      if (response.data.success) {
        toast.success('Outpass request approved');
        setShowOTPModal(false);
        setOtp('');
        fetchOutpasses();
      }
    } catch (error) {
      console.error('Error verifying OTP:', error);
      toast.error(error.response?.data?.message || 'Failed to verify OTP');
    }
  };

  const handleReject = async () => {
    try {
      const response = await api.post('/api/admin/outpass/reject', {
        outpassId: selectedOutpass._id,
        rejectionReason
      });
      if (response.data.success) {
        toast.success('Outpass request rejected');
        setShowRejectModal(false);
        setRejectionReason('');
        fetchOutpasses();
      }
    } catch (error) {
      console.error('Error rejecting outpass:', error);
      toast.error('Failed to reject outpass request');
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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <SEO 
          title="Outpass Management"
          description="Manage student outpass requests and permissions"
          keywords="outpass management, student permissions, hostel leave"
        />

        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Outpass Management</h1>
          <div className="flex gap-3">
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Status</option>
              <option value="Pending">Pending</option>
              <option value="Pending OTP Verification">Pending OTP</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
        </div>

        {/* Outpass List */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          ) : outpasses.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p>No outpass requests found</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {outpasses.map((outpass) => (
                <motion.div
                  key={outpass._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-6 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(outpass.status)}`}>
                          {getStatusIcon(outpass.status)}
                          <span className="ml-1">{outpass.status}</span>
                        </span>
                        <span className="text-sm text-gray-500">
                          {new Date(outpass.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      {/* Student Details */}
                      <div className="flex items-center gap-4 mb-3">
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <UserIcon className="w-4 h-4" />
                          <span>{outpass.student?.name || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <AcademicCapIcon className="w-4 h-4" />
                          <span>{outpass.student?.rollNumber || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <PhoneIcon className="w-4 h-4" />
                          <span>{outpass.parentPhone || 'N/A'}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                        <div className="flex items-center gap-1">
                          <CalendarIcon className="w-4 h-4" />
                          <span>{new Date(outpass.dateOfOutpass).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <ClockIcon className="w-4 h-4" />
                          <span>{new Date(outpass.dateOfOutpass).toLocaleTimeString()}</span>
                        </div>
                      </div>

                      <p className="text-gray-700 mb-2">{outpass.reason}</p>

                      {outpass.rejectionReason && (
                        <p className="text-sm text-red-600">
                          Rejection Reason: {outpass.rejectionReason}
                        </p>
                      )}

                      {/* Action Buttons */}
                      {outpass.status === 'Pending OTP Verification' && (
                        <div className="flex gap-3 mt-4">
                          <button
                            onClick={() => {
                              setSelectedOutpass(outpass);
                              setShowOTPModal(true);
                            }}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                          >
                            Verify OTP
                          </button>
                          <button
                            onClick={() => {
                              setSelectedOutpass(outpass);
                              setShowRejectModal(true);
                            }}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* OTP Verification Modal */}
      {showOTPModal && selectedOutpass && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl p-6 w-full max-w-md"
          >
            <h2 className="text-xl font-semibold mb-4">Verify OTP</h2>
            <p className="text-sm text-gray-600 mb-4">
              Enter the OTP sent to the parent's phone number: {selectedOutpass.parentPhone}
            </p>
            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="Enter OTP"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-4"
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowOTPModal(false);
                  setOtp('');
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleVerifyOTP}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Verify & Approve
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedOutpass && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl p-6 w-full max-w-md"
          >
            <h2 className="text-xl font-semibold mb-4">Reject Outpass Request</h2>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Enter reason for rejection"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-4"
              rows="4"
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectionReason('');
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Reject Request
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default OutpassManagement; 