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
  ChartBarIcon
} from '@heroicons/react/24/outline';
import LoadingSpinner from '../../components/LoadingSpinner';

const HostelFee = () => {
  const { user } = useAuth();
  const [feeData, setFeeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchFeeData();
  }, []);

  const fetchFeeData = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/fee-reminders/student/${user._id}`);
      
      if (response.data.success) {
        setFeeData(response.data.data);
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
          <button 
            onClick={fetchFeeData}
            className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
          >
            Try again
          </button>
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
        </div>
      </div>
    );
  }

  const { feeReminder, visibleReminders, allTermsPaid } = feeData;

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto mt-16 sm:mt-0">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
          Hostel Fee Management
        </h1>
        <p className="text-gray-600">
          Track your hostel fee payments and reminders for {feeReminder.academicYear}
        </p>
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
            <p className="text-2xl font-bold text-gray-900">₹45,000</p>
            <p className="text-xs text-gray-500">Per Academic Year</p>
          </div>

          {/* Paid Amount */}
          <div className="bg-white rounded-lg p-4 border border-green-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Paid Amount</span>
              <CheckCircleIcon className="w-4 h-4 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-green-600">
              ₹{feeReminder.feeStatus.term1 === 'Paid' ? 15000 : 0 + 
                 feeReminder.feeStatus.term2 === 'Paid' ? 15000 : 0 + 
                 feeReminder.feeStatus.term3 === 'Paid' ? 15000 : 0}
            </p>
            <p className="text-xs text-gray-500">Completed Payments</p>
          </div>

          {/* Pending Amount */}
          <div className="bg-white rounded-lg p-4 border border-orange-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Pending Amount</span>
              <ExclamationTriangleIcon className="w-4 h-4 text-orange-600" />
            </div>
            <p className="text-2xl font-bold text-orange-600">
              ₹{feeReminder.feeStatus.term1 === 'Unpaid' ? 15000 : 0 + 
                 feeReminder.feeStatus.term2 === 'Unpaid' ? 15000 : 0 + 
                 feeReminder.feeStatus.term3 === 'Unpaid' ? 15000 : 0}
            </p>
            <p className="text-xs text-gray-500">Outstanding Balance</p>
          </div>

          {/* Payment Progress */}
          <div className="bg-white rounded-lg p-4 border border-purple-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Payment Progress</span>
              <ChartBarIcon className="w-4 h-4 text-purple-600" />
            </div>
            <p className="text-2xl font-bold text-purple-600">
              {Math.round(([feeReminder.feeStatus.term1, feeReminder.feeStatus.term2, feeReminder.feeStatus.term3]
                .filter(status => status === 'Paid').length / 3) * 100)}%
            </p>
            <p className="text-xs text-gray-500">Completion Rate</p>
          </div>
        </div>

        {/* Payment Breakdown */}
        <div className="mt-6 bg-white rounded-lg p-4 border border-blue-100">
          <h3 className="font-medium text-gray-900 mb-3">Payment Breakdown</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-900">Term 1</p>
                <p className="text-xs text-gray-500">₹15,000</p>
              </div>
              <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                feeReminder.feeStatus.term1 === 'Paid' 
                  ? 'text-green-600 bg-green-100' 
                  : 'text-red-600 bg-red-100'
              }`}>
                {feeReminder.feeStatus.term1 === 'Paid' ? 'Paid' : 'Unpaid'}
              </div>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-900">Term 2</p>
                <p className="text-xs text-gray-500">₹15,000</p>
              </div>
              <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                feeReminder.feeStatus.term2 === 'Paid' 
                  ? 'text-green-600 bg-green-100' 
                  : 'text-red-600 bg-red-100'
              }`}>
                {feeReminder.feeStatus.term2 === 'Paid' ? 'Paid' : 'Unpaid'}
              </div>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-900">Term 3</p>
                <p className="text-xs text-gray-500">₹15,000</p>
              </div>
              <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                feeReminder.feeStatus.term3 === 'Paid' 
                  ? 'text-green-600 bg-green-100' 
                  : 'text-red-600 bg-red-100'
              }`}>
                {feeReminder.feeStatus.term3 === 'Paid' ? 'Paid' : 'Unpaid'}
              </div>
            </div>
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
          {/* Term 1 */}
          <div className={`p-4 rounded-lg border ${getStatusColor(feeReminder.feeStatus.term1)}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">Term 1</span>
              {getStatusIcon(feeReminder.feeStatus.term1)}
            </div>
            <p className="text-sm capitalize">{feeReminder.feeStatus.term1}</p>
          </div>

          {/* Term 2 */}
          <div className={`p-4 rounded-lg border ${getStatusColor(feeReminder.feeStatus.term2)}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">Term 2</span>
              {getStatusIcon(feeReminder.feeStatus.term2)}
            </div>
            <p className="text-sm capitalize">{feeReminder.feeStatus.term2}</p>
          </div>

          {/* Term 3 */}
          <div className={`p-4 rounded-lg border ${getStatusColor(feeReminder.feeStatus.term3)}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">Term 3</span>
              {getStatusIcon(feeReminder.feeStatus.term3)}
            </div>
            <p className="text-sm capitalize">{feeReminder.feeStatus.term3}</p>
          </div>
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