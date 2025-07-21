import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/axios';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import LoadingSpinner from '../../components/LoadingSpinner';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import {
  CreditCardIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CurrencyDollarIcon,
  CalendarIcon,
  DocumentTextIcon,
  ArrowDownTrayIcon
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
    try {
      // Create PDF document
      const doc = new jsPDF();
      
      // Set page margins and dimensions
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;
      const margin = 20;
      const contentWidth = pageWidth - (2 * margin);
      
      // Add header with better styling
      doc.setFontSize(24);
      doc.setTextColor(30, 64, 175); // Blue-900
      doc.setFont(undefined, 'bold');
      doc.text('ELECTRICITY BILL PAYMENT RECEIPT', pageWidth / 2, 35, { align: 'center' });
      
      // Add decorative line
      doc.setDrawColor(30, 64, 175);
      doc.setLineWidth(0.5);
      doc.line(margin, 45, pageWidth - margin, 45);
      
      // Create single column layout
      const leftColumn = margin;
      const lineHeight = 7;
      let currentY = 60;
      
      // Student Details Section
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.setFont(undefined, 'bold');
      doc.text('STUDENT DETAILS', leftColumn, currentY);
      currentY += 10;
      
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(75, 85, 99);
      
      const studentName = String(user?.name || user?.fullName || 'N/A');
      const studentRollNo = String(user?.rollNo || user?.studentId || user?.rollNumber || 'N/A');
      const roomNumber = String(payment.roomId?.roomNumber || user?.roomNumber || 'N/A');
      
      doc.text(`Name: ${studentName}`, leftColumn, currentY);
      currentY += lineHeight;
      doc.text(`Roll Number: ${studentRollNo}`, leftColumn, currentY);
      currentY += lineHeight;
      doc.text(`Room Number: ${roomNumber}`, leftColumn, currentY);
      currentY += lineHeight + 5;
      
      // Payment Details Section
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.setFont(undefined, 'bold');
      doc.text('PAYMENT DETAILS', leftColumn, currentY);
      currentY += 10;
      
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(75, 85, 99);
      
      const paymentDate = payment.paymentDate ? formatDate(payment.paymentDate) : formatDate(payment.createdAt);
      
      doc.text(`Transaction ID: ${String(payment.cashfreeOrderId || 'N/A')}`, leftColumn, currentY);
      currentY += lineHeight;
      doc.text(`Payment Date: ${String(paymentDate)}`, leftColumn, currentY);
      currentY += lineHeight;
      doc.text(`Status: ${String(payment.status.toUpperCase())}`, leftColumn, currentY);
      currentY += lineHeight + 10;
      
      // Bill Details Section
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.setFont(undefined, 'bold');
      doc.text('BILL DETAILS', leftColumn, currentY);
      currentY += 10;
      
      // Create a table-like structure for bill details
      const billData = [
        ['Bill Month', String(payment.billMonth || 'N/A')],
        ['Start Units', String(payment.billDetails?.startUnits || 'N/A')],
        ['End Units', String(payment.billDetails?.endUnits || 'N/A')],
        ['Consumption', `${String(payment.consumption || payment.billDetails?.consumption || 0)} units`],
        ['Rate per Unit', `₹${String(payment.billDetails?.rate || 'N/A')}`]
      ];
      
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(75, 85, 99);
      
      billData.forEach(([label, value], index) => {
        const yPos = currentY + (index * lineHeight);
        doc.text(`${label}:`, leftColumn, yPos);
        doc.text(String(value), leftColumn + 60, yPos);
      });
      
      // Total Amount Section (Highlighted)
      currentY += (billData.length * lineHeight) + 10;
      doc.setDrawColor(30, 64, 175);
      doc.setLineWidth(0.3);
      doc.line(leftColumn, currentY - 5, pageWidth - margin, currentY - 5);
      
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.setFont(undefined, 'bold');
      doc.text('TOTAL AMOUNT:', leftColumn, currentY);
      doc.text(String(formatCurrency(payment.amount)), leftColumn + 60, currentY);
      
      // Payment Method
      currentY += 15;
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(75, 85, 99);
      doc.text('Payment Method: Cashfree Payment Gateway', leftColumn, currentY);
      
      // Footer
      currentY = pageHeight - 30;
      doc.setDrawColor(209, 213, 219);
      doc.setLineWidth(0.2);
      doc.line(margin, currentY, pageWidth - margin, currentY);
      
      currentY += 10;
      doc.setFontSize(8);
      doc.setTextColor(107, 114, 128);
      doc.text('This is a computer generated receipt and does not require a signature.', pageWidth / 2, currentY, { align: 'center' });
      currentY += 5;
      doc.text(`Generated on: ${new Date().toLocaleString()}`, pageWidth / 2, currentY, { align: 'center' });
      
      // Add border around the entire receipt
      doc.setDrawColor(209, 213, 219);
      doc.setLineWidth(0.5);
      doc.rect(margin - 5, margin - 5, pageWidth - (2 * margin) + 10, pageHeight - (2 * margin) + 10);
      
      // Save the PDF with descriptive name
      const fileName = `electricity_bill_receipt_${payment.billMonth}.pdf`;
      doc.save(fileName);
      
      toast.success('Receipt downloaded successfully!');
    } catch (error) {
      console.error('Error downloading receipt:', error);
      toast.error('Failed to download receipt');
    }
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
      
      <div className="p-4 sm:p-6 max-w-6xl mx-auto mt-16 sm:mt-0">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <DocumentTextIcon className="w-8 h-8 text-blue-600" />
            <h1 className="text-2xl sm:text-3xl font-bold text-blue-900">
              Payment History
            </h1>
          </div>
          <p className="text-gray-600">
            View your electricity bill payment history and transaction details
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-4"
          >
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircleIcon className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Successful</p>
                <p className="text-lg font-semibold text-gray-900">
                  {payments.filter(p => p.status === 'success').length}
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-4"
          >
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <ClockIcon className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-lg font-semibold text-gray-900">
                  {payments.filter(p => p.status === 'pending').length}
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-4"
          >
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <XCircleIcon className="w-6 h-6 text-red-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Failed</p>
                <p className="text-lg font-semibold text-gray-900">
                  {payments.filter(p => p.status === 'failed').length}
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-4"
          >
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <CurrencyDollarIcon className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Total Paid</p>
                <p className="text-lg font-semibold text-gray-900">
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
          className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Payment Transactions</h2>
          </div>

          {error ? (
            <div className="p-6 text-center">
              <XCircleIcon className="w-12 h-12 text-red-500 mx-auto mb-3" />
              <p className="text-gray-600">{error}</p>
              <button
                onClick={fetchPaymentHistory}
                className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Try Again
              </button>
            </div>
          ) : payments.length === 0 ? (
            <div className="p-6 text-center">
                              <DocumentTextIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">No payment history found</p>
              <p className="text-sm text-gray-500">Your payment transactions will appear here</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Bill Month
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
                            <CalendarIcon className="w-4 h-4 text-gray-400 mr-2" />
                            <span className="text-sm text-gray-900">{payment.billMonth}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {formatCurrency(payment.amount)}
                          </div>
                          <div className="text-sm text-gray-500">
                            {payment.consumption || (payment.billDetails?.consumption || 0)} units
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

              {/* Pagination */}
              {pagination.pages > 1 && (
                <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                  <div className="flex-1 flex justify-between sm:hidden">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, pagination.pages))}
                      disabled={currentPage === pagination.pages}
                      className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                  <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-gray-700">
                        Showing page <span className="font-medium">{currentPage}</span> of{' '}
                        <span className="font-medium">{pagination.pages}</span>
                      </p>
                    </div>
                    <div>
                      <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                        <button
                          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                          disabled={currentPage === 1}
                          className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                        >
                          Previous
                        </button>
                        <button
                          onClick={() => setCurrentPage(prev => Math.min(prev + 1, pagination.pages))}
                          disabled={currentPage === pagination.pages}
                          className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
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