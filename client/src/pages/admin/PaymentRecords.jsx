import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/axios';
import toast from 'react-hot-toast';
import LoadingSpinner from '../../components/LoadingSpinner';
import ReceiptGenerator from '../../components/ReceiptGenerator';
import {
  CurrencyDollarIcon,
  CalendarIcon,
  CreditCardIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';

const PaymentRecords = () => {
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    hasNext: false,
    hasPrev: false
  });
  
  const [filters, setFilters] = useState({
    search: '',
    paymentType: '',
    paymentMethod: '',
    status: '',
    fromDate: '',
    toDate: '',
    academicYear: ''
  });
  
  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(50);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [showReceipt, setShowReceipt] = useState(false);

  useEffect(() => {
    fetchPayments();
  }, [currentPage, filters]);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams({
        page: currentPage,
        limit: limit
      });

      if (filters.paymentType) params.append('paymentType', filters.paymentType);
      if (filters.search) params.append('search', filters.search);

      const response = await api.get(`/api/payments/all?${params}`);
      
      if (response.data.success) {
        let filteredPayments = response.data.data.payments || [];
        
        // Apply client-side filters
        if (filters.paymentMethod) {
          filteredPayments = filteredPayments.filter(p => 
            p.paymentMethod?.toLowerCase() === filters.paymentMethod.toLowerCase()
          );
        }
        
        if (filters.status) {
          filteredPayments = filteredPayments.filter(p => 
            p.status?.toLowerCase() === filters.status.toLowerCase()
          );
        }
        
        if (filters.fromDate) {
          const fromDate = new Date(filters.fromDate);
          filteredPayments = filteredPayments.filter(p => {
            const paymentDate = new Date(p.paymentDate);
            return paymentDate >= fromDate;
          });
        }
        
        if (filters.toDate) {
          const toDate = new Date(filters.toDate);
          toDate.setHours(23, 59, 59, 999); // End of day
          filteredPayments = filteredPayments.filter(p => {
            const paymentDate = new Date(p.paymentDate);
            return paymentDate <= toDate;
          });
        }
        
        if (filters.academicYear) {
          filteredPayments = filteredPayments.filter(p => 
            p.academicYear === filters.academicYear
          );
        }
        
        if (filters.search) {
          const searchLower = filters.search.toLowerCase();
          filteredPayments = filteredPayments.filter(p => 
            p.studentName?.toLowerCase().includes(searchLower) ||
            p.studentRollNumber?.toLowerCase().includes(searchLower) ||
            p.receiptNumber?.toLowerCase().includes(searchLower) ||
            p.transactionId?.toLowerCase().includes(searchLower)
          );
        }
        
        setPayments(filteredPayments);
        setPagination(response.data.data.pagination || {
          currentPage: 1,
          totalPages: 1,
          totalCount: filteredPayments.length,
          hasNext: false,
          hasPrev: false
        });
      } else {
        toast.error('Failed to fetch payment records');
      }
    } catch (error) {
      console.error('Error fetching payments:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch payment records');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1); // Reset to first page on filter change
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      paymentType: '',
      paymentMethod: '',
      status: '',
      fromDate: '',
      toDate: '',
      academicYear: ''
    });
    setCurrentPage(1);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    
    try {
      let date;
      
      // If it's already a Date object
      if (dateString instanceof Date) {
        date = dateString;
      } else if (typeof dateString === 'string') {
        // If it's an ISO string with time (YYYY-MM-DDTHH:mm:ss.sssZ), extract just the date part
        // This prevents timezone conversion issues
        if (dateString.includes('T')) {
          const dateOnly = dateString.split('T')[0];
          const [year, month, day] = dateOnly.split('-').map(Number);
          date = new Date(year, month - 1, day);
        } else {
          // For other string formats, parse normally
          date = new Date(dateString);
        }
      } else {
        date = new Date(dateString);
      }
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return 'Invalid Date';
      }
      
      // Extract date components to avoid timezone issues
      const year = date.getFullYear();
      const month = date.getMonth();
      const day = date.getDate();
      
      // Create a local date with these components (no timezone conversion)
      const displayDate = new Date(year, month, day);
      
      return displayDate.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      console.error('Error formatting date:', dateString, error);
      return 'Invalid Date';
    }
  };

  const formatCurrency = (amount) => {
    if (!amount) return '₹0';
    return `₹${Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
        return <XCircleIcon className="w-5 h-5 text-gray-600" />;
      default:
        return <ClockIcon className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'success':
        return 'text-green-700 bg-green-50 border-green-200';
      case 'pending':
        return 'text-yellow-700 bg-yellow-50 border-yellow-200';
      case 'failed':
        return 'text-red-700 bg-red-50 border-red-200';
      case 'cancelled':
        return 'text-gray-700 bg-gray-50 border-gray-200';
      default:
        return 'text-gray-700 bg-gray-50 border-gray-200';
    }
  };

  const handleViewReceipt = (payment) => {
    setSelectedPayment(payment);
    setShowReceipt(true);
  };

  // Calculate statistics
  const stats = useMemo(() => {
    const totalAmount = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const successCount = payments.filter(p => p.status === 'success').length;
    const hostelFeeCount = payments.filter(p => p.paymentType === 'hostel_fee').length;
    const electricityCount = payments.filter(p => p.paymentType === 'electricity').length;
    const additionalFeeCount = payments.filter(p => p.paymentType === 'additional_fee').length;
    
    return {
      totalAmount,
      totalCount: payments.length,
      successCount,
      hostelFeeCount,
      electricityCount,
      additionalFeeCount
    };
  }, [payments]);

  // Get unique academic years from payments
  const academicYears = useMemo(() => {
    const years = new Set();
    payments.forEach(p => {
      if (p.academicYear) years.add(p.academicYear);
    });
    return Array.from(years).sort().reverse();
  }, [payments]);

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            Payment Records
          </h1>
          <p className="text-gray-600">
            View and manage all payment transactions and collections
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Amount</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalAmount)}</p>
              </div>
              <CurrencyDollarIcon className="w-10 h-10 text-green-600" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Payments</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalCount}</p>
              </div>
              <DocumentTextIcon className="w-10 h-10 text-blue-600" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Successful</p>
                <p className="text-2xl font-bold text-green-600">{stats.successCount}</p>
              </div>
              <CheckCircleIcon className="w-10 h-10 text-green-600" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Hostel Fee</p>
                <p className="text-2xl font-bold text-gray-900">{stats.hostelFeeCount}</p>
              </div>
              <CreditCardIcon className="w-10 h-10 text-purple-600" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-6 mb-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <FunnelIcon className="w-5 h-5 mr-2" />
              Filters
            </h2>
            <button
              onClick={clearFilters}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Clear All
            </button>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search
              </label>
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Student name, roll no, receipt..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Payment Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Type
              </label>
              <select
                value={filters.paymentType}
                onChange={(e) => handleFilterChange('paymentType', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Types</option>
                <option value="hostel_fee">Hostel Fee</option>
                <option value="electricity">Electricity</option>
                <option value="additional_fee">Additional Fee</option>
              </select>
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Method
              </label>
              <select
                value={filters.paymentMethod}
                onChange={(e) => handleFilterChange('paymentMethod', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Methods</option>
                <option value="Cash">Cash</option>
                <option value="Online">Online</option>
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Status</option>
                <option value="success">Success</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            {/* From Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                From Date
              </label>
              <input
                type="date"
                value={filters.fromDate}
                onChange={(e) => handleFilterChange('fromDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* To Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                To Date
              </label>
              <input
                type="date"
                value={filters.toDate}
                onChange={(e) => handleFilterChange('toDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Academic Year */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Academic Year
              </label>
              <select
                value={filters.academicYear}
                onChange={(e) => handleFilterChange('academicYear', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Years</option>
                {academicYears.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Payments Table */}
        <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <LoadingSpinner />
            </div>
          ) : payments.length === 0 ? (
            <div className="text-center py-12">
              <DocumentTextIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 text-lg">No payment records found</p>
              <p className="text-gray-500 text-sm mt-2">Try adjusting your filters</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Student
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Method
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Receipt
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {payments.map((payment) => (
                      <tr key={payment._id} className="hover:bg-gray-50">
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(payment.paymentDate)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {payment.studentName || 'N/A'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {payment.studentRollNumber || 'N/A'}
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              payment.paymentType === 'electricity'
                                ? 'bg-yellow-100 text-yellow-800'
                                : payment.paymentType === 'additional_fee'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {payment.paymentType === 'electricity' 
                                ? '⚡ Electricity' 
                                : payment.paymentType === 'additional_fee'
                                ? '💰 Additional Fee'
                                : '🏠 Hostel Fee'}
                            </span>
                          </div>
                          <div className="text-sm text-gray-900 mt-1">
                            {payment.paymentType === 'hostel_fee' ? (
                              <>
                                {payment.term && (
                                  <span className="text-gray-700">
                                    {payment.term.replace('term', 'Term ')}
                                  </span>
                                )}
                                {payment.academicYear && (
                                  <div className="text-xs text-gray-500">{payment.academicYear}</div>
                                )}
                              </>
                            ) : payment.paymentType === 'electricity' ? (
                              <>
                                {payment.billMonth && (
                                  <div className="text-xs text-gray-500">Bill: {payment.billMonth}</div>
                                )}
                              </>
                            ) : payment.paymentType === 'additional_fee' ? (
                              <>
                                {payment.additionalFeeType ? (
                                  <div className="text-xs text-gray-700 font-medium">
                                    {payment.additionalFeeType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                  </div>
                                ) : (
                                  <div className="text-xs text-gray-500">Additional Fee</div>
                                )}
                                {payment.academicYear && (
                                  <div className="text-xs text-gray-500">{payment.academicYear}</div>
                                )}
                              </>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {formatCurrency(payment.amount)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                          {payment.paymentMethod || 'N/A'}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(payment.status)}`}>
                            {getStatusIcon(payment.status)}
                            <span className="ml-1 capitalize">{payment.status || 'Unknown'}</span>
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                          {payment.receiptNumber || 'N/A'}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm">
                          {payment.status === 'success' && (
                            <button
                              onClick={() => handleViewReceipt(payment)}
                              className="text-blue-600 hover:text-blue-700 font-medium flex items-center"
                            >
                              <DocumentTextIcon className="w-4 h-4 mr-1" />
                              Receipt
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                  <div className="flex-1 flex justify-between sm:hidden">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={!pagination.hasPrev || loading}
                      className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(pagination.totalPages, prev + 1))}
                      disabled={!pagination.hasNext || loading}
                      className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                  <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-gray-700">
                        Showing page <span className="font-medium">{pagination.currentPage}</span> of{' '}
                        <span className="font-medium">{pagination.totalPages}</span>
                      </p>
                    </div>
                    <div>
                      <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                        <button
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          disabled={!pagination.hasPrev || loading}
                          className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                        >
                          Previous
                        </button>
                        <button
                          onClick={() => setCurrentPage(prev => Math.min(pagination.totalPages, prev + 1))}
                          disabled={!pagination.hasNext || loading}
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
        </div>

        {/* Receipt Modal */}
        {showReceipt && selectedPayment && (
          <ReceiptGenerator
            payment={selectedPayment}
            onClose={() => {
              setShowReceipt(false);
              setSelectedPayment(null);
            }}
          />
        )}
      </div>
    </div>
  );
};

export default PaymentRecords;

