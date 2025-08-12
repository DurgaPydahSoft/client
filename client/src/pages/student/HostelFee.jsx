import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/axios';
import toast from 'react-hot-toast';
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
  CogIcon
} from '@heroicons/react/24/outline';
import LoadingSpinner from '../../components/LoadingSpinner';

const HostelFee = () => {
  const { user } = useAuth();
  const [feeData, setFeeData] = useState(null);
  const [feeStructure, setFeeStructure] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    fetchFeeData();
  }, [refreshKey]);

  const fetchFeeData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch fee reminder data and fee structure in parallel
      const [feeResponse, structureResponse] = await Promise.all([
        api.get(`/api/fee-reminders/student/${user._id}`),
        api.get(`/api/fee-structures?academicYear=${user.academicYear || '2024-2025'}`)
      ]);
      
      if (feeResponse.data.success) {
        setFeeData(feeResponse.data.data);
        
        // Find fee structure for student's category
        if (structureResponse.data.success && structureResponse.data.data) {
          const studentStructure = structureResponse.data.data.find(
            structure => structure.category === user.category
          );
          setFeeStructure(studentStructure);
          
          if (!studentStructure) {
            console.warn(`No fee structure found for category: ${user.category} and academic year: ${user.academicYear}`);
          }
        }
      } else {
        setError('Failed to fetch fee data');
      }
    } catch (err) {
      console.error('Error fetching fee data:', err);
      setError(err.response?.data?.message || 'Failed to fetch fee data');
    } finally {
      setLoading(false);
    }
  };

  // Calculate fee amounts dynamically
  const calculateFeeAmounts = () => {
    if (!feeStructure || !feeData?.feeReminder) return { totalFee: 0, paidAmount: 0, pendingAmount: 0 };
    
    const { totalFee, term1Fee, term2Fee, term3Fee } = feeStructure;
    const { feeStatus } = feeData.feeReminder;
    
    const paidAmount = [
      feeStatus.term1 === 'Paid' ? (term1Fee || Math.round(totalFee * 0.4)) : 0,
      feeStatus.term2 === 'Paid' ? (term2Fee || Math.round(totalFee * 0.3)) : 0,
      feeStatus.term3 === 'Paid' ? (term3Fee || Math.round(totalFee * 0.3)) : 0
    ].reduce((sum, amount) => sum + amount, 0);
    
    const pendingAmount = [
      feeStatus.term1 === 'Unpaid' ? (term1Fee || Math.round(totalFee * 0.4)) : 0,
      feeStatus.term2 === 'Unpaid' ? (term2Fee || Math.round(totalFee * 0.3)) : 0,
      feeStatus.term3 === 'Unpaid' ? (term3Fee || Math.round(totalFee * 0.3)) : 0
    ].reduce((sum, amount) => sum + amount, 0);
    
    return { totalFee, paidAmount, pendingAmount };
  };

  // Get term fee amount
  const getTermFee = (term) => {
    if (!feeStructure) return 0;
    
    switch (term) {
      case 'term1':
        return feeStructure.term1Fee || Math.round(feeStructure.totalFee * 0.4);
      case 'term2':
        return feeStructure.term2Fee || Math.round(feeStructure.totalFee * 0.3);
      case 'term3':
        return feeStructure.term3Fee || Math.round(feeStructure.totalFee * 0.3);
      default:
        return 0;
    }
  };

  // Get term status with amount
  const getTermStatus = (term) => {
    if (!feeData?.feeReminder) return { status: 'Unknown', amount: 0 };
    
    const status = feeData.feeReminder.feeStatus[term];
    const amount = getTermFee(term);
    
    return { status, amount };
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

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 sm:p-6 max-w-4xl mx-auto mt-16 sm:mt-0">
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
  const { totalFee, paidAmount, pendingAmount } = calculateFeeAmounts();
  const paymentProgress = calculatePaymentProgress();

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto mt-16 sm:mt-0">
      {/* Header with Refresh Button */}
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            Hostel Fee Management
          </h1>
          <p className="text-gray-600">
            Track your hostel fee payments and reminders for {feeReminder.academicYear}
          </p>
          <div className="mt-2 flex items-center gap-4 text-sm text-gray-500">
            <span>Room: {user.roomNumber || 'Not Assigned'}</span>
            <span>Category: {user.category || 'Unknown'}</span>
            <span>Academic Year: {user.academicYear || 'Unknown'}</span>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <CogIcon className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Fee Structure Information */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl shadow-sm border border-indigo-200 p-6 mb-6">
        <div className="flex items-center mb-4">
          <InformationCircleIcon className="w-6 h-6 text-indigo-600 mr-2" />
          <h2 className="text-lg font-semibold text-gray-900">Fee Structure Details</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg p-4 border border-indigo-100">
            <div className="text-sm font-medium text-gray-600 mb-1">Room Category</div>
            <div className="text-lg font-bold text-indigo-600">{feeStructure.category}</div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-indigo-100">
            <div className="text-sm font-medium text-gray-600 mb-1">Academic Year</div>
            <div className="text-lg font-bold text-indigo-600">{feeStructure.academicYear}</div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-indigo-100">
            <div className="text-sm font-medium text-gray-600 mb-1">Total Annual Fee</div>
            <div className="text-lg font-bold text-indigo-600">₹{feeStructure.totalFee.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* Fee Total Statistics */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl shadow-sm border border-blue-200 p-6 mb-6">
        <div className="flex items-center mb-4">
          <CurrencyDollarIcon className="w-6 h-6 text-blue-600 mr-2" />
          <h2 className="text-lg font-semibold text-gray-900">Your Hostel Fee Summary</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Total Fee Amount */}
          <div className="bg-white rounded-lg p-4 border border-blue-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Total Fee</span>
              <CurrencyDollarIcon className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">₹{totalFee.toLocaleString()}</p>
            <p className="text-xs text-gray-500">Per Academic Year</p>
          </div>

          {/* Paid Amount */}
          <div className="bg-white rounded-lg p-4 border border-green-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Paid Amount</span>
              <CheckCircleIcon className="w-4 h-4 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-green-600">₹{paidAmount.toLocaleString()}</p>
            <p className="text-xs text-gray-500">Completed Payments</p>
          </div>

          {/* Pending Amount */}
          <div className="bg-white rounded-lg p-4 border border-orange-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Pending Amount</span>
              <ExclamationTriangleIcon className="w-4 h-4 text-orange-600" />
            </div>
            <p className="text-2xl font-bold text-orange-600">₹{pendingAmount.toLocaleString()}</p>
            <p className="text-xs text-gray-500">Outstanding Balance</p>
          </div>

          {/* Payment Progress */}
          <div className="bg-white rounded-lg p-4 border border-purple-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Payment Progress</span>
              <ChartBarIcon className="w-4 h-4 text-purple-600" />
            </div>
            <p className="text-2xl font-bold text-purple-600">{paymentProgress}%</p>
            <p className="text-xs text-gray-500">Completion Rate</p>
          </div>
        </div>

        {/* Payment Breakdown */}
        <div className="mt-6 bg-white rounded-lg p-4 border border-blue-100">
          <h3 className="font-medium text-gray-900 mb-3">Payment Breakdown by Term</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {['term1', 'term2', 'term3'].map((term, index) => {
              const { status, amount } = getTermStatus(term);
              const termNumber = index + 1;
              const percentage = termNumber === 1 ? 40 : 30;
              
              return (
                <div key={term} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Term {termNumber}</p>
                    <p className="text-xs text-gray-500">₹{amount.toLocaleString()} ({percentage}%)</p>
                  </div>
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                    status === 'Paid' 
                      ? 'text-green-600 bg-green-100' 
                      : 'text-red-600 bg-red-100'
                  }`}>
                    {status === 'Paid' ? 'Paid' : 'Unpaid'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Overall Status Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Payment Status</h2>
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
            allTermsPaid 
              ? 'text-green-600 bg-green-50 border border-green-200' 
              : 'text-orange-600 bg-orange-50 border border-orange-200'
          }`}>
            {allTermsPaid ? 'All Terms Paid' : 'Payment Pending'}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {['term1', 'term2', 'term3'].map((term, index) => {
            const { status, amount } = getTermStatus(term);
            const termNumber = index + 1;
            
            return (
              <div key={term} className={`p-4 rounded-lg border ${getStatusColor(status)}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">Term {termNumber}</span>
                  {getStatusIcon(status)}
                </div>
                <p className="text-sm capitalize mb-1">{status}</p>
                <p className="text-lg font-semibold text-gray-900">₹{amount.toLocaleString()}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Active Reminders */}
      {visibleReminders.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center mb-4">
            <BellIcon className="w-5 h-5 text-orange-600 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">Active Reminders</h2>
          </div>
          
          <div className="space-y-4">
            {visibleReminders.map((reminder) => (
              <div 
                key={reminder.number}
                className={`p-4 rounded-lg border ${
                  getReminderStatus(reminder) === 'active' 
                    ? 'border-orange-200 bg-orange-50' 
                    : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <span className="font-medium text-gray-900">
                        Reminder #{reminder.number}
                      </span>
                      <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                        getReminderStatus(reminder) === 'active'
                          ? 'text-orange-600 bg-orange-100'
                          : 'text-gray-500 bg-gray-100'
                      }`}>
                        {getReminderStatus(reminder) === 'active' ? 'Active' : 'Expired'}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-gray-600">
                      <div className="flex items-center">
                        <CalendarIcon className="w-4 h-4 mr-2" />
                        <span>Issued: {formatDate(reminder.issuedAt)}</span>
                      </div>
                      <div className="flex items-center">
                        <ClockIcon className="w-4 h-4 mr-2" />
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

      {/* Registration Information */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Registration Information</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Registration Date:</span>
            <p className="font-medium">{formatDate(feeReminder.registrationDate)}</p>
          </div>
          <div>
            <span className="text-gray-500">Academic Year:</span>
            <p className="font-medium">{feeReminder.academicYear}</p>
          </div>
          <div>
            <span className="text-gray-500">First Reminder Due:</span>
            <p className="font-medium">{formatDate(feeReminder.firstReminderDate)}</p>
          </div>
          <div>
            <span className="text-gray-500">Second Reminder Due:</span>
            <p className="font-medium">{formatDate(feeReminder.secondReminderDate)}</p>
          </div>
          <div>
            <span className="text-gray-500">Third Reminder Due:</span>
            <p className="font-medium">{formatDate(feeReminder.thirdReminderDate)}</p>
          </div>
          <div>
            <span className="text-gray-500">Last Updated:</span>
            <p className="font-medium">
              {feeReminder.lastUpdatedAt ? formatDate(feeReminder.lastUpdatedAt) : 'Not updated yet'}
            </p>
          </div>
        </div>
      </div>

      {/* Information Note */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <DocumentTextIcon className="w-5 h-5 text-blue-600 mr-2 mt-0.5" />
          <div>
            <h3 className="font-medium text-blue-900 mb-1">Important Information</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Your fees are calculated based on your room category ({user.category})</li>
              <li>• Reminders are automatically generated based on your registration date</li>
              <li>• Each reminder is visible for 3 days from the date it's issued</li>
              <li>• Once a term is marked as paid, its reminders will no longer appear</li>
              <li>• Contact the hostel office for any payment-related queries</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HostelFee; 