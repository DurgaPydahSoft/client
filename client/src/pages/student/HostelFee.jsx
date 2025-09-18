import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useGlobalSettings } from '../../context/GlobalSettingsContext';
import api from '../../utils/axios';
import toast from 'react-hot-toast';
import ReceiptGenerator from '../../components/ReceiptGenerator';
import { 
  CurrencyDollarIcon, 
  ExclamationTriangleIcon, 
  CheckCircleIcon, 
  ClockIcon,
  CalendarIcon,
  DocumentTextIcon,
  BellIcon,
  ChartBarIcon,
  InformationCircleIcon,
  CogIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline';
import LoadingSpinner from '../../components/LoadingSpinner';

const HostelFee = () => {
  const { user } = useAuth();
  const { settings } = useGlobalSettings();
  const [feeData, setFeeData] = useState(null);
  const [feeStructure, setFeeStructure] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [paymentHistory, setPaymentHistory] = useState([]);

  useEffect(() => {
    fetchFeeData();
  }, [refreshKey]);

  const fetchFeeData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch fee reminder data, fee structure, and payment history in parallel
      const [feeResponse, structureResponse, paymentResponse] = await Promise.all([
        api.get(`/api/fee-reminders/student/${user._id}`),
        api.get(`/api/fee-structures?academicYear=${user.academicYear || '2024-2025'}&course=${user.course}&year=${user.year}`),
        api.get(`/api/payments/hostel-fee/history/${user._id}`)
      ]);
      
      if (feeResponse.data.success) {
        setFeeData(feeResponse.data.data);
        
        // Find fee structure for student's course, year, and category
        if (structureResponse.data.success && structureResponse.data.data) {
          const studentStructure = structureResponse.data.data.find(
            structure => structure.category === user.category
          );
          setFeeStructure(studentStructure);
          
          if (!studentStructure) {
            console.warn(`No fee structure found for course: ${user.course}, year: ${user.year}, category: ${user.category} and academic year: ${user.academicYear}`);
          }
        }
      } else {
        setError('Failed to fetch fee data');
      }
      
      // Set payment history
      if (paymentResponse.data.success) {
        setPaymentHistory(paymentResponse.data.data || []);
      }
    } catch (err) {
      console.error('Error fetching fee data:', err);
      setError(err.response?.data?.message || 'Failed to fetch fee data');
    } finally {
      setLoading(false);
    }
  };

  // Calculate fee amounts dynamically with concession
  const calculateFeeAmounts = () => {
    if (!feeStructure || !feeData?.feeReminder) return { 
      totalFee: 0, 
      totalOriginalFee: 0,
      totalCalculatedFee: 0,
      concession: 0,
      paidAmount: 0, 
      pendingAmount: 0 
    };
    
    const { totalFee, term1Fee, term2Fee, term3Fee } = feeStructure;
    const { feeStatus } = feeData.feeReminder;
    
    // Get concession and calculated fees from user data
    const concession = user.concession || 0;
    const calculatedTerm1Fee = user.calculatedTerm1Fee || term1Fee || Math.round(totalFee * 0.4);
    const calculatedTerm2Fee = user.calculatedTerm2Fee || term2Fee || Math.round(totalFee * 0.3);
    const calculatedTerm3Fee = user.calculatedTerm3Fee || term3Fee || Math.round(totalFee * 0.3);
    
    const totalOriginalFee = totalFee;
    const totalCalculatedFee = calculatedTerm1Fee + calculatedTerm2Fee + calculatedTerm3Fee;
    
    // Calculate actual paid amounts from payment history with auto-deduction logic
    const termPayments = {
      term1: 0,
      term2: 0,
      term3: 0
    };
    
    // Sum up actual payments for each term from payment history
    paymentHistory.forEach(payment => {
      if (payment.paymentType === 'hostel_fee' && payment.status === 'success') {
        // Handle both string and number term formats
        const term = payment.term;
        if (term === 1 || term === 'term1') termPayments.term1 += payment.amount;
        else if (term === 2 || term === 'term2') termPayments.term2 += payment.amount;
        else if (term === 3 || term === 'term3') termPayments.term3 += payment.amount;
      }
    });
    
    // Apply auto-deduction logic (same as admin dashboard)
    let remainingExcess = 0;
    
    // Process term1 first
    if (termPayments.term1 > calculatedTerm1Fee) {
      remainingExcess = termPayments.term1 - calculatedTerm1Fee;
      termPayments.term1 = calculatedTerm1Fee; // Cap at required amount
    }
    
    // Process term2 with any excess from term1
    if (remainingExcess > 0) {
      const effectivePayment = termPayments.term2 + remainingExcess;
      if (effectivePayment > calculatedTerm2Fee) {
        remainingExcess = effectivePayment - calculatedTerm2Fee;
        termPayments.term2 = calculatedTerm2Fee;
      } else {
        termPayments.term2 = effectivePayment;
        remainingExcess = 0;
      }
    }
    
    // Process term3 with any remaining excess
    if (remainingExcess > 0) {
      const effectivePayment = termPayments.term3 + remainingExcess;
      if (effectivePayment > calculatedTerm3Fee) {
        remainingExcess = effectivePayment - calculatedTerm3Fee;
        termPayments.term3 = calculatedTerm3Fee;
      } else {
        termPayments.term3 = effectivePayment;
        remainingExcess = 0;
      }
    }
    
    const paidAmount = termPayments.term1 + termPayments.term2 + termPayments.term3;
    
    // Calculate pending amounts based on actual payments vs required fees
    const pendingAmount = Math.max(0, totalCalculatedFee - paidAmount);
    
    return { 
      totalFee, 
      totalOriginalFee,
      totalCalculatedFee,
      concession,
      paidAmount, 
      pendingAmount,
      termPayments,
      calculatedTerm1Fee,
      calculatedTerm2Fee,
      calculatedTerm3Fee
    };
  };

  // Get term fee amount with concession (applied to Term 1 only, excess to Term 2)
  const getTermFee = (term) => {
    if (!feeStructure) return 0;
    
    // Get calculated fees from user data, fallback to calculated concession logic
    const concession = user.concession || 0;
    
    switch (term) {
      case 'term1':
        return user.calculatedTerm1Fee || Math.max(0, feeStructure.term1Fee - concession);
      case 'term2':
        if (user.calculatedTerm2Fee) return user.calculatedTerm2Fee;
        const remainingConcession = Math.max(0, concession - feeStructure.term1Fee);
        return Math.max(0, feeStructure.term2Fee - remainingConcession);
      case 'term3':
        if (user.calculatedTerm3Fee) return user.calculatedTerm3Fee;
        const remainingConcession2 = Math.max(0, concession - feeStructure.term1Fee - feeStructure.term2Fee);
        return Math.max(0, feeStructure.term3Fee - remainingConcession2);
      default:
        return 0;
    }
  };

  // Get term status with amount based on actual payments
  const getTermStatus = (term) => {
    if (!feeData?.feeReminder) return { status: 'Unknown', amount: 0 };
    
    const feeAmounts = calculateFeeAmounts();
    const termNumber = term === 'term1' ? 1 : term === 'term2' ? 2 : 3;
    const requiredAmount = term === 'term1' ? feeAmounts.calculatedTerm1Fee : 
                          term === 'term2' ? feeAmounts.calculatedTerm2Fee : 
                          feeAmounts.calculatedTerm3Fee;
    
    const paidAmount = term === 'term1' ? feeAmounts.termPayments.term1 :
                      term === 'term2' ? feeAmounts.termPayments.term2 :
                      feeAmounts.termPayments.term3;
    
    let status;
    if (paidAmount >= requiredAmount) {
      status = 'Paid';
    } else if (paidAmount > 0) {
      status = 'Partially Paid';
    } else {
      status = 'Unpaid';
    }
    
    return { 
      status, 
      amount: requiredAmount,
      paidAmount: paidAmount,
      remainingAmount: Math.max(0, requiredAmount - paidAmount)
    };
  };

  // Calculate payment progress percentage
  const calculatePaymentProgress = () => {
    if (!feeStructure || !feeData?.feeReminder) return 0;
    
    const { feeStatus } = feeData.feeReminder;
    const paidTerms = [feeStatus.term1, feeStatus.term2, feeStatus.term3]
      .filter(status => status === 'Paid').length;
    
    return Math.round((paidTerms / 3) * 100);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Paid':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'Partially Paid':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'Unpaid':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Paid':
        return <CheckCircleIcon className="w-5 h-5 text-green-600" />;
      case 'Partially Paid':
        return <ClockIcon className="w-5 h-5 text-yellow-600" />;
      case 'Unpaid':
        return <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />;
      default:
        return <ClockIcon className="w-5 h-5 text-gray-600" />;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getReminderStatus = (reminder) => {
    const now = new Date();
    const issuedDate = new Date(reminder.issuedAt);
    const threeDaysLater = new Date(issuedDate);
    threeDaysLater.setDate(issuedDate.getDate() + 3);
    
    if (now > threeDaysLater) {
      return 'expired';
    }
    return 'active';
  };

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
    toast.success('Refreshing fee data...');
  };

  const downloadReceipt = (payment) => {
    const success = ReceiptGenerator.generateReceipt(payment, user, settings);
    if (success) {
      toast.success('Receipt downloaded successfully!');
    } else {
      toast.error('Failed to generate receipt');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-2 sm:p-6 max-w-4xl mx-auto mt-16 sm:mt-0">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="w-5 h-5 text-red-600 mr-2" />
            <span className="text-red-800">{error}</span>
          </div>
          <div className="mt-3 flex gap-2">
            <button 
              onClick={handleRefresh}
              className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
            >
              Try Again
            </button>
            <button 
              onClick={fetchFeeData}
              className="px-3 py-2 text-red-600 hover:text-red-800 border border-red-300 rounded-lg hover:bg-red-50 text-sm"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!feeData) {
    return (
      <div className="p-4 sm:p-6 max-w-4xl mx-auto mt-16 sm:mt-0">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center">
            <DocumentTextIcon className="w-5 h-5 text-blue-600 mr-2" />
            <span className="text-blue-800">No fee data available for this academic year.</span>
          </div>
          <button 
            onClick={handleRefresh}
            className="mt-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
          >
            Refresh
          </button>
        </div>
      </div>
    );
  }

  // Check if fee structure exists for student's category
  if (!feeStructure) {
    return (
      <div className="p-4 sm:p-6 max-w-4xl mx-auto mt-16 sm:mt-0">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start">
            <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600 mr-2 mt-0.5" />
            <div className="flex-1">
              <span className="text-yellow-800 font-medium">No Fee Structure Found</span>
              <p className="text-yellow-700 text-sm mt-1">
                No fee structure has been configured for your room category ({user.category || 'Unknown'}) 
                and academic year ({user.academicYear || 'Unknown'}).
              </p>
              <div className="mt-3 p-3 bg-yellow-100 rounded-lg">
                <p className="text-yellow-800 text-sm font-medium mb-2">What this means:</p>
                <ul className="text-yellow-700 text-sm space-y-1">
                  <li>• Your hostel fees have not been configured yet</li>
                  <li>• Contact the hostel administration to set up your fee structure</li>
                  <li>• This usually happens when you're newly assigned to a room</li>
                </ul>
              </div>
              <button 
                onClick={handleRefresh}
                className="mt-3 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 text-sm"
              >
                Check Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { feeReminder, visibleReminders, allTermsPaid } = feeData;
  const { totalFee, totalOriginalFee, totalCalculatedFee, concession, paidAmount, pendingAmount } = calculateFeeAmounts();
  const paymentProgress = calculatePaymentProgress();

  return (
    <div className="p-2 sm:p-4 lg:p-2 mx-auto mt-16 sm:mt-0">
      {/* Header */}
      <div className="mb-3 sm:mb-6">
        <h1 className="text-lg sm:text-2xl lg:text-3xl font-bold text-blue-900 mb-1 sm:mb-2">
          Hostel Fee Management
        </h1>
        <p className="text-xs sm:text-base text-gray-600">
          Track your hostel fee payments and reminders for {feeReminder.academicYear}
        </p>
        <div className="mt-1 sm:mt-2 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs text-gray-500">
          <span className="flex items-center">
            <span className="font-medium">Room:</span> {user.roomNumber || 'Not Assigned'}
          </span>
          <span className="flex items-center">
            <span className="font-medium">Category:</span> {user.category || 'Unknown'}
          </span>
          <span className="flex items-center">
            <span className="font-medium">Academic Year:</span> {user.academicYear || 'Unknown'}
          </span>
        </div>
      </div>

      {/* Fee Structure Information */}
      {/* <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl shadow-sm border border-indigo-200 p-4 sm:p-6 mb-4 sm:mb-6">
        <div className="flex items-center mb-3 sm:mb-4">
          <InformationCircleIcon className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600 mr-2" />
          <h2 className="text-base sm:text-lg font-semibold text-gray-900">Fee Structure Details</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          <div className="bg-white rounded-lg p-3 sm:p-4 border border-indigo-100">
            <div className="text-xs sm:text-sm font-medium text-gray-600 mb-1">Room Category</div>
            <div className="text-base sm:text-lg font-bold text-indigo-600">{feeStructure.category}</div>
          </div>
          <div className="bg-white rounded-lg p-3 sm:p-4 border border-indigo-100">
            <div className="text-xs sm:text-sm font-medium text-gray-600 mb-1">Academic Year</div>
            <div className="text-base sm:text-lg font-bold text-indigo-600">{feeStructure.academicYear}</div>
          </div>
          <div className="bg-white rounded-lg p-3 sm:p-4 border border-indigo-100 sm:col-span-2 lg:col-span-1">
            <div className="text-xs sm:text-sm font-medium text-gray-600 mb-1">Total Annual Fee</div>
            <div className="text-base sm:text-lg font-bold text-indigo-600">₹{feeStructure.totalFee.toLocaleString()}</div>
          </div>
        </div>
      </div> */}

      {/* Concession Information */}
      {concession > 0 && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg sm:rounded-xl shadow-sm border border-green-200 p-3 sm:p-6 mb-3 sm:mb-6">
          <div className="flex items-center mb-2 sm:mb-4">
            <CheckCircleIcon className="w-4 h-4 sm:w-6 sm:h-6 text-green-600 mr-2" />
            <h2 className="text-sm sm:text-lg font-semibold text-gray-900">Concession Applied</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4">
            <div className="bg-white rounded-lg p-2 sm:p-4 border border-green-100">
              <div className="text-xs font-medium text-gray-600 mb-1">Original Total Fee</div>
              <div className="text-sm sm:text-lg font-bold text-gray-900">₹{totalOriginalFee.toLocaleString()}</div>
            </div>
            <div className="bg-white rounded-lg p-2 sm:p-4 border border-green-100">
              <div className="text-xs font-medium text-gray-600 mb-1">Concession Amount</div>
              <div className="text-sm sm:text-lg font-bold text-green-600">-₹{concession.toLocaleString()}</div>
            </div>
            <div className="bg-white rounded-lg p-2 sm:p-4 border border-green-100 sm:col-span-2 lg:col-span-1">
              <div className="text-xs font-medium text-gray-600 mb-1">Final Total Fee</div>
              <div className="text-sm sm:text-lg font-bold text-green-700">₹{totalCalculatedFee.toLocaleString()}</div>
            </div>
          </div>
        </div>
      )}

      {/* Fee Total Statistics */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg sm:rounded-xl shadow-sm border border-blue-200 p-3 sm:p-6 mb-3 sm:mb-6">
        <div className="flex items-center mb-2 sm:mb-4">
          <CurrencyDollarIcon className="w-4 h-4 sm:w-6 sm:h-6 text-blue-600 mr-2" />
          <h2 className="text-sm sm:text-lg font-semibold text-gray-900">Your Hostel Fee Summary</h2>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4">
          {/* Total Fee Amount */}
          <div className="bg-white rounded-lg p-2 sm:p-4 border border-blue-100">
            <div className="flex items-center justify-between mb-1 sm:mb-2">
              <span className="text-xs font-medium text-gray-600">Total Fee</span>
              <CurrencyDollarIcon className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" />
            </div>
            <p className="text-sm sm:text-xl lg:text-2xl font-bold text-gray-900">₹{totalCalculatedFee.toLocaleString()}</p>
            <p className="text-xs text-gray-500">
              {concession > 0 ? `After ₹${concession.toLocaleString()} concession` : 'Per Academic Year'}
            </p>
          </div>

          {/* Paid Amount */}
          <div className="bg-white rounded-lg p-2 sm:p-4 border border-green-100">
            <div className="flex items-center justify-between mb-1 sm:mb-2">
              <span className="text-xs font-medium text-gray-600">Paid Amount</span>
              <CheckCircleIcon className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" />
            </div>
            <p className="text-sm sm:text-xl lg:text-2xl font-bold text-green-600">₹{paidAmount.toLocaleString()}</p>
            <p className="text-xs text-gray-500">Completed Payments</p>
          </div>

          {/* Pending Amount */}
          <div className="bg-white rounded-lg p-2 sm:p-4 border border-orange-100">
            <div className="flex items-center justify-between mb-1 sm:mb-2">
              <span className="text-xs font-medium text-gray-600">Pending Amount</span>
              <ExclamationTriangleIcon className="w-3 h-3 sm:w-4 sm:h-4 text-orange-600" />
            </div>
            <p className="text-sm sm:text-xl lg:text-2xl font-bold text-orange-600">₹{pendingAmount.toLocaleString()}</p>
            <p className="text-xs text-gray-500">Outstanding Balance</p>
          </div>
        </div>

        {/* Payment Breakdown */}
        <div className="mt-3 sm:mt-6 bg-white rounded-lg p-2 sm:p-4 border border-blue-100">
          <h3 className="text-sm sm:text-base font-medium text-gray-900 mb-2 sm:mb-3">Payment Breakdown by Term</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4">
            {['term1', 'term2', 'term3'].map((term, index) => {
              const { status, amount, paidAmount, remainingAmount } = getTermStatus(term);
              const termNumber = index + 1;
              const percentage = termNumber === 1 ? 40 : 30;
              
              // Get original term fee for comparison
              const originalTermFee = term === 'term1' 
                ? (feeStructure.term1Fee || Math.round(feeStructure.totalFee * 0.4))
                : (feeStructure.term2Fee || Math.round(feeStructure.totalFee * 0.3));
              
              return (
                <div key={term} className="flex flex-col sm:flex-row sm:items-center justify-between p-2 sm:p-3 bg-gray-50 rounded-lg gap-1 sm:gap-2">
                  <div className="flex-1">
                    <p className="text-xs sm:text-sm font-medium text-gray-900">Term {termNumber}</p>
                    <p className="text-xs text-gray-500">
                      Required: ₹{amount.toLocaleString()} ({percentage}%)
                    </p>
                    {paidAmount > 0 && (
                      <p className="text-xs text-green-600">
                        Paid: ₹{paidAmount.toLocaleString()}
                      </p>
                    )}
                    {remainingAmount > 0 && (
                      <p className="text-xs text-orange-600">
                        Remaining: ₹{remainingAmount.toLocaleString()}
                      </p>
                    )}
                    {concession > 0 && amount !== originalTermFee && (
                      <span className="block text-green-600 mt-1 text-xs">
                        Original: ₹{originalTermFee.toLocaleString()}
                        {termNumber === 1 && ' (Concession Applied)'}
                        {termNumber === 2 && concession > feeStructure.term1Fee && ' (Excess Concession)'}
                        {termNumber === 3 && concession > (feeStructure.term1Fee + feeStructure.term2Fee) && ' (Excess Concession)'}
                      </span>
                    )}
                  </div>
                  <div className={`px-2 py-1 rounded-full text-xs font-medium self-start sm:self-auto ${
                    status === 'Paid' 
                      ? 'text-green-600 bg-green-100' 
                      : status === 'Partially Paid'
                      ? 'text-yellow-600 bg-yellow-100'
                      : 'text-red-600 bg-red-100'
                  }`}>
                    {status}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Overall Status Card - Mobile Optimized */}
      <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 p-3 sm:p-6 mb-3 sm:mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2 sm:mb-4 gap-2">
          <h2 className="text-sm sm:text-lg font-semibold text-gray-900">Payment Status</h2>
          <div className={`px-2 py-1 rounded-full text-xs font-medium self-start sm:self-auto ${
            allTermsPaid 
              ? 'text-green-600 bg-green-50 border border-green-200' 
              : 'text-orange-600 bg-orange-50 border border-orange-200'
          }`}>
            {allTermsPaid ? 'All Terms Paid' : 'Payment Pending'}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4">
          {['term1', 'term2', 'term3'].map((term, index) => {
            const { status, amount, paidAmount, remainingAmount } = getTermStatus(term);
            const termNumber = index + 1;
            
            // Get original term fee for comparison
            const originalTermFee = term === 'term1' 
              ? (feeStructure.term1Fee || Math.round(feeStructure.totalFee * 0.4))
              : (feeStructure.term2Fee || Math.round(feeStructure.totalFee * 0.3));
            
            return (
              <div key={term} className={`p-2 sm:p-4 rounded-lg border ${getStatusColor(status)}`}>
                <div className="flex items-center justify-between mb-1 sm:mb-2">
                  <span className="text-xs sm:text-base font-medium">Term {termNumber}</span>
                  {getStatusIcon(status)}
                </div>
                <p className="text-xs capitalize mb-1">{status}</p>
                <p className="text-sm sm:text-lg font-semibold text-gray-900">₹{amount.toLocaleString()}</p>
                {paidAmount > 0 && (
                  <p className="text-xs text-green-600 mt-1">
                    Paid: ₹{paidAmount.toLocaleString()}
                  </p>
                )}
                {remainingAmount > 0 && (
                  <p className="text-xs text-orange-600 mt-1">
                    Remaining: ₹{remainingAmount.toLocaleString()}
                  </p>
                )}
                {concession > 0 && amount !== originalTermFee && (
                  <p className="text-xs text-gray-500 mt-1">
                    <span className="line-through">₹{originalTermFee.toLocaleString()}</span>
                    <span className="text-green-600 ml-1">
                      {termNumber === 1 && 'Concession Applied'}
                      {termNumber === 2 && concession > feeStructure.term1Fee && 'Excess Concession'}
                      {termNumber === 3 && concession > (feeStructure.term1Fee + feeStructure.term2Fee) && 'Excess Concession'}
                    </span>
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Active Reminders - Mobile Optimized */}
      {visibleReminders.length > 0 && (
        <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 p-3 sm:p-6 mb-3 sm:mb-6">
          <div className="flex items-center mb-2 sm:mb-4">
            <BellIcon className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600 mr-2" />
            <h2 className="text-sm sm:text-lg font-semibold text-gray-900">Active Reminders</h2>
          </div>
          
          <div className="space-y-2 sm:space-y-4">
            {visibleReminders.map((reminder) => (
              <div 
                key={reminder.number}
                className={`p-2 sm:p-4 rounded-lg border ${
                  getReminderStatus(reminder) === 'active' 
                    ? 'border-orange-200 bg-orange-50' 
                    : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-center mb-1 sm:mb-2 gap-2">
                      <span className="font-medium text-gray-900 text-xs sm:text-base">
                        Reminder #{reminder.number}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium self-start sm:self-auto ${
                        getReminderStatus(reminder) === 'active'
                          ? 'text-orange-600 bg-orange-100'
                          : 'text-gray-500 bg-gray-100'
                      }`}>
                        {getReminderStatus(reminder) === 'active' ? 'Active' : 'Expired'}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-1 sm:gap-4 text-xs text-gray-600">
                      <div className="flex items-center">
                        <CalendarIcon className="w-3 h-3 sm:w-4 sm:h-4 mr-2 flex-shrink-0" />
                        <span>Issued: {formatDate(reminder.issuedAt)}</span>
                      </div>
                      <div className="flex items-center">
                        <ClockIcon className="w-3 h-3 sm:w-4 sm:h-4 mr-2 flex-shrink-0" />
                        <span>Due: {formatDate(reminder.dueDate)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Registration Information - Mobile Optimized */}
      <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 p-3 sm:p-6">
        <h2 className="text-sm sm:text-lg font-semibold text-gray-900 mb-2 sm:mb-4">Registration Information</h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 text-xs">
          <div className="flex flex-col">
            <span className="text-gray-500 mb-1">Registration Date:</span>
            <p className="font-medium">{formatDate(feeReminder.registrationDate)}</p>
          </div>
          <div className="flex flex-col">
            <span className="text-gray-500 mb-1">Academic Year:</span>
            <p className="font-medium">{feeReminder.academicYear}</p>
          </div>
          <div className="flex flex-col">
            <span className="text-gray-500 mb-1">First Reminder Due:</span>
            <p className="font-medium">{formatDate(feeReminder.firstReminderDate)}</p>
          </div>
          <div className="flex flex-col">
            <span className="text-gray-500 mb-1">Second Reminder Due:</span>
            <p className="font-medium">{formatDate(feeReminder.secondReminderDate)}</p>
          </div>
          <div className="flex flex-col">
            <span className="text-gray-500 mb-1">Third Reminder Due:</span>
            <p className="font-medium">{formatDate(feeReminder.thirdReminderDate)}</p>
          </div>
          <div className="flex flex-col">
            <span className="text-gray-500 mb-1">Last Updated:</span>
            <p className="font-medium">
              {feeReminder.lastUpdatedAt ? formatDate(feeReminder.lastUpdatedAt) : 'Not updated yet'}
            </p>
          </div>
        </div>
      </div>

      {/* Information Note - Mobile Optimized */}
      <div className="mt-3 sm:mt-6 bg-blue-50 border border-blue-200 rounded-lg p-2 sm:p-4">
        <div className="flex items-start">
          <DocumentTextIcon className="w-3 h-3 sm:w-5 sm:h-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-medium text-blue-900 mb-1 sm:mb-2 text-xs sm:text-base">Important Information</h3>
            <ul className="text-xs text-blue-800 space-y-1">
              <li className="flex items-start">
                <span className="mr-1 mt-0.5">•</span>
                <span>Your fees are calculated based on your room category ({user.category})</span>
              </li>
              {concession > 0 && (
                <li className="flex items-start">
                  <span className="mr-1 mt-0.5">•</span>
                  <span>A concession of ₹{concession.toLocaleString()} has been applied to your total fee</span>
                </li>
              )}
              <li className="flex items-start">
                <span className="mr-1 mt-0.5">•</span>
                <span>Reminders are automatically generated based on your registration date</span>
              </li>
              <li className="flex items-start">
                <span className="mr-1 mt-0.5">•</span>
                <span>Each reminder is visible for 3 days from the date it's issued</span>
              </li>
              <li className="flex items-start">
                <span className="mr-1 mt-0.5">•</span>
                <span>Once a term is marked as paid, its reminders will no longer appear</span>
              </li>
              <li className="flex items-start">
                <span className="mr-1 mt-0.5">•</span>
                <span>Contact the hostel office for any payment-related queries</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Payment History Section */}
      {/* {paymentHistory.length > 0 && (
        <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <DocumentTextIcon className="w-5 h-5 mr-2 text-blue-600" />
              Payment History
            </h3>
          </div>
          <div className="p-4">
            <div className="space-y-3">
              {paymentHistory.slice(0, 5).map((payment) => (
                <div key={payment._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">
                          {payment.paymentType === 'electricity' ? 'Electricity Bill' : 'Hostel Fee'}
                          {payment.term && ` - Term ${payment.term}`}
                          {payment.billMonth && ` - ${payment.billMonth}`}
                        </p>
                        <p className="text-sm text-gray-500">
                          {new Date(payment.paymentDate || payment.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-green-600">
                          ₹{payment.amount.toLocaleString()}
                        </p>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          payment.status === 'success' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {payment.status === 'success' ? 'Paid' : 'Pending'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => downloadReceipt(payment)}
                    className="ml-3 p-2 text-gray-400 hover:text-blue-600 transition-colors"
                    title="Download Receipt"
                  >
                    <ArrowDownTrayIcon className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            {paymentHistory.length > 5 && (
              <div className="mt-3 text-center">
                <button
                  onClick={() => window.location.href = '/student/payment-history'}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  View All Payments ({paymentHistory.length})
                </button>
              </div>
            )}
          </div>
        </div>
      )} */}
    </div>
  );
};

export default HostelFee; 