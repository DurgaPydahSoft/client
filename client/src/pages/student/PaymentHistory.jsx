import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/axios';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import LoadingSpinner from '../../components/LoadingSpinner';
import ReceiptGenerator from '../../components/ReceiptGenerator';
import {
  CreditCardIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CurrencyDollarIcon,
  CalendarIcon,
  DocumentTextIcon,
  ArrowDownTrayIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from '@heroicons/react/24/outline';
import SEO from '../../components/SEO';

const PaymentHistory = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState([]);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    pages: 0
  });
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedPayments, setExpandedPayments] = useState(new Set());

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchPaymentHistory();
  }, [user, currentPage]);

  const fetchPaymentHistory = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.get(`/api/payments/history?page=${currentPage}&limit=10`);
      
      if (response.data.success) {
        setPayments(response.data.data.payments);
        setPagination(response.data.data.pagination);
      } else {
        setError('Failed to fetch payment history');
      }
    } catch (err) {
      console.error('Error fetching payment history:', err);
      setError(err.response?.data?.message || 'Failed to fetch payment history');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success':
        return <CheckCircleIcon className="w-5 h-5 text-green-600" />;
      case 'pending':
        return <ClockIcon className="w-5 h-5 text-yellow-600" />;
      case 'failed':
        return <XCircleIcon className="w-5 h-5 text-red-600" />;
      case 'cancelled':
        return <ExclamationTriangleIcon className="w-5 h-5 text-gray-600" />;
      default:
        return <ExclamationTriangleIcon className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'success':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'pending':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'failed':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'cancelled':
        return 'text-gray-600 bg-gray-50 border-gray-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const downloadReceipt = (payment) => {
    const success = ReceiptGenerator.generateReceipt(payment, user);
    if (success) {
      toast.success('Receipt downloaded successfully!');
    } else {
      toast.error('Failed to generate receipt');
    }
  };

  const togglePaymentExpansion = (paymentId) => {
    setExpandedPayments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(paymentId)) {
        newSet.delete(paymentId);
      } else {
        newSet.add(paymentId);
      }
      return newSet;
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <>
      <SEO 
        title="Payment History"
        description="View your electricity bill payment history and transaction details"
        keywords="Payment History, Electricity Bills, Transaction History, Payment Records"
      />
      
      <div className="p-2 sm:p-6 max-w-6xl mx-auto mt-16 sm:mt-0">
        {/* Header */}
        <div className="mb-3 sm:mb-6">
          <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
            <DocumentTextIcon className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
            <h1 className="text-lg sm:text-3xl font-bold text-blue-900">
              Payment History
            </h1>
          </div>
          <p className="text-xs sm:text-base text-gray-600">
            View your payment history for both hostel fees and electricity bills
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 mb-3 sm:mb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 p-2 sm:p-4"
          >
            <div className="flex items-center">
              <div className="p-1 sm:p-2 bg-green-100 rounded-lg">
                <CheckCircleIcon className="w-4 h-4 sm:w-6 sm:h-6 text-green-600" />
              </div>
              <div className="ml-2 sm:ml-3">
                <p className="text-xs sm:text-sm font-medium text-gray-600">Successful</p>
                <p className="text-sm sm:text-lg font-semibold text-gray-900">
                  {payments.filter(p => p.status === 'success').length}
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 p-2 sm:p-4"
          >
            <div className="flex items-center">
              <div className="p-1 sm:p-2 bg-yellow-100 rounded-lg">
                <ClockIcon className="w-4 h-4 sm:w-6 sm:h-6 text-yellow-600" />
              </div>
              <div className="ml-2 sm:ml-3">
                <p className="text-xs sm:text-sm font-medium text-gray-600">Pending</p>
                <p className="text-sm sm:text-lg font-semibold text-gray-900">
                  {payments.filter(p => p.status === 'pending').length}
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 p-2 sm:p-4"
          >
            <div className="flex items-center">
              <div className="p-1 sm:p-2 bg-red-100 rounded-lg">
                <XCircleIcon className="w-4 h-4 sm:w-6 sm:h-6 text-red-600" />
              </div>
              <div className="ml-2 sm:ml-3">
                <p className="text-xs sm:text-sm font-medium text-gray-600">Failed</p>
                <p className="text-sm sm:text-lg font-semibold text-gray-900">
                  {payments.filter(p => p.status === 'failed').length}
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 p-2 sm:p-4"
          >
            <div className="flex items-center">
              <div className="p-1 sm:p-2 bg-blue-100 rounded-lg">
                <CurrencyDollarIcon className="w-4 h-4 sm:w-6 sm:h-6 text-blue-600" />
              </div>
              <div className="ml-2 sm:ml-3">
                <p className="text-xs sm:text-sm font-medium text-gray-600">Total Paid</p>
                <p className="text-sm sm:text-lg font-semibold text-gray-900">
                  {formatCurrency(payments.filter(p => p.status === 'success').reduce((sum, p) => sum + p.amount, 0))}
                </p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Payment History Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 overflow-hidden"
        >
          <div className="px-3 sm:px-6 py-2 sm:py-4 border-b border-gray-200">
            <h2 className="text-sm sm:text-lg font-semibold text-gray-900">Payment Transactions</h2>
          </div>

          {error ? (
            <div className="p-3 sm:p-6 text-center">
              <XCircleIcon className="w-8 h-8 sm:w-12 sm:h-12 text-red-500 mx-auto mb-2 sm:mb-3" />
              <p className="text-xs sm:text-base text-gray-600">{error}</p>
              <button
                onClick={fetchPaymentHistory}
                className="mt-2 sm:mt-3 px-3 sm:px-4 py-1 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs sm:text-sm"
              >
                Try Again
              </button>
            </div>
          ) : payments.length === 0 ? (
            <div className="p-3 sm:p-6 text-center">
              <DocumentTextIcon className="w-8 h-8 sm:w-12 sm:h-12 text-gray-400 mx-auto mb-2 sm:mb-3" />
              <p className="text-xs sm:text-base text-gray-600">No payment history found</p>
              <p className="text-xs sm:text-sm text-gray-500">Your payment transactions will appear here</p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Payment Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Details
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {payments.map((payment, index) => (
                      <motion.tr
                        key={payment._id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="hover:bg-gray-50"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {payment.paymentType === 'electricity' ? (
                              <CurrencyDollarIcon className="w-4 h-4 text-blue-400 mr-2" />
                            ) : (
                              <DocumentTextIcon className="w-4 h-4 text-green-400 mr-2" />
                            )}
                            <span className="text-sm font-medium text-gray-900">
                              {payment.paymentType === 'electricity' ? 'Electricity Bill' : 'Hostel Fee'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {payment.paymentType === 'electricity' ? (
                              <>
                                <div className="font-medium">{payment.billMonth}</div>
                                <div className="text-gray-500">
                                  {payment.consumption || (payment.billDetails?.consumption || 0)} units
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="font-medium">
                                  Term {payment.term || 'N/A'}
                                </div>
                                <div className="text-gray-500">
                                  Academic Year: {payment.academicYear || 'N/A'}
                                </div>
                              </>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {formatCurrency(payment.amount)}
                          </div>
                          <div className="text-sm text-gray-500">
                            {payment.paymentMethod || 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(payment.status)}`}>
                            {getStatusIcon(payment.status)}
                            <span className="ml-1 capitalize">{payment.status}</span>
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {payment.paymentDate ? formatDate(payment.paymentDate) : formatDate(payment.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {payment.status === 'success' && (
                            <button
                              onClick={() => downloadReceipt(payment)}
                              className="flex items-center text-blue-600 hover:text-blue-900 transition-colors"
                            >
                              <ArrowDownTrayIcon className="w-4 h-4 mr-1" />
                              Download Receipt
                            </button>
                          )}
                          {payment.status === 'pending' && (
                            <button
                              onClick={() => {
                                // Check payment status
                                toast.info('Checking payment status...');
                              }}
                              className="text-yellow-600 hover:text-yellow-900"
                            >
                              Check Status
                            </button>
                          )}
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden space-y-3">
                {payments.map((payment, index) => {
                  const isExpanded = expandedPayments.has(payment._id);
                  return (
                    <motion.div
                      key={payment._id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="bg-white border border-gray-200 rounded-lg shadow-sm"
                    >
                      {/* Main Card Content */}
                      <div 
                        className="p-3 cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={() => togglePaymentExpansion(payment._id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center flex-1">
                            {payment.paymentType === 'electricity' ? (
                              <CurrencyDollarIcon className="w-5 h-5 text-blue-400 mr-3" />
                            ) : (
                              <DocumentTextIcon className="w-5 h-5 text-green-400 mr-3" />
                            )}
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <h3 className="text-sm font-medium text-gray-900">
                                  {payment.paymentType === 'electricity' ? 'Electricity Bill' : 'Hostel Fee'}
                                </h3>
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(payment.status)}`}>
                                  {getStatusIcon(payment.status)}
                                  <span className="ml-1 capitalize">{payment.status}</span>
                                </span>
                              </div>
                              <div className="mt-1 flex items-center justify-between">
                                <p className="text-sm font-semibold text-gray-900">
                                  {formatCurrency(payment.amount)}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {payment.paymentDate ? formatDate(payment.paymentDate) : formatDate(payment.createdAt)}
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="ml-2">
                            {isExpanded ? (
                              <ChevronUpIcon className="w-5 h-5 text-gray-400" />
                            ) : (
                              <ChevronDownIcon className="w-5 h-5 text-gray-400" />
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Expanded Details */}
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="border-t border-gray-200 p-3 bg-gray-50"
                        >
                          <div className="space-y-3">
                            {/* Payment Details */}
                            <div>
                              <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                                Payment Details
                              </h4>
                              <div className="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                  <span className="text-gray-500">Type:</span>
                                  <p className="font-medium text-gray-900">
                                    {payment.paymentType === 'electricity' ? 'Electricity Bill' : 'Hostel Fee'}
                                  </p>
                                </div>
                                <div>
                                  <span className="text-gray-500">Method:</span>
                                  <p className="font-medium text-gray-900">
                                    {payment.paymentMethod || 'N/A'}
                                  </p>
                                </div>
                                {payment.paymentType === 'electricity' ? (
                                  <>
                                    <div>
                                      <span className="text-gray-500">Bill Month:</span>
                                      <p className="font-medium text-gray-900">{payment.billMonth}</p>
                                    </div>
                                    <div>
                                      <span className="text-gray-500">Units:</span>
                                      <p className="font-medium text-gray-900">
                                        {payment.consumption || (payment.billDetails?.consumption || 0)} units
                                      </p>
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <div>
                                      <span className="text-gray-500">Term:</span>
                                      <p className="font-medium text-gray-900">Term {payment.term || 'N/A'}</p>
                                    </div>
                                    <div>
                                      <span className="text-gray-500">Academic Year:</span>
                                      <p className="font-medium text-gray-900">{payment.academicYear || 'N/A'}</p>
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="pt-2 border-t border-gray-200">
                              <div className="flex gap-2">
                                {payment.status === 'success' && (
                                  <button
                                    onClick={() => downloadReceipt(payment)}
                                    className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                                  >
                                    <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
                                    Download Receipt
                                  </button>
                                )}
                                {payment.status === 'pending' && (
                                  <button
                                    onClick={() => {
                                      // Check payment status
                                      toast.info('Checking payment status...');
                                    }}
                                    className="flex items-center px-3 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm"
                                  >
                                    <ClockIcon className="w-4 h-4 mr-2" />
                                    Check Status
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </motion.div>
                  );
                })}
              </div>

              {/* Pagination */}
              {pagination.pages > 1 && (
                <div className="bg-white px-2 sm:px-4 py-2 sm:py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                  <div className="flex-1 flex justify-between sm:hidden">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-3 sm:px-4 py-1 sm:py-2 border border-gray-300 text-xs sm:text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, pagination.pages))}
                      disabled={currentPage === pagination.pages}
                      className="ml-2 sm:ml-3 relative inline-flex items-center px-3 sm:px-4 py-1 sm:py-2 border border-gray-300 text-xs sm:text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                  <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs sm:text-sm text-gray-700">
                        Showing page <span className="font-medium">{currentPage}</span> of{' '}
                        <span className="font-medium">{pagination.pages}</span>
                      </p>
                    </div>
                    <div>
                      <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                        <button
                          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                          disabled={currentPage === 1}
                          className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-xs sm:text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                        >
                          Previous
                        </button>
                        <button
                          onClick={() => setCurrentPage(prev => Math.min(prev + 1, pagination.pages))}
                          disabled={currentPage === pagination.pages}
                          className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-xs sm:text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                        >
                          Next
                        </button>
                      </nav>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </motion.div>
      </div>
    </>
  );
};

export default PaymentHistory; 