import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/axios';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import LoadingSpinner from '../../components/LoadingSpinner';
import {
  CreditCardIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ArrowLeftIcon,
  ClockIcon,
  CurrencyDollarIcon,
  BoltIcon
} from '@heroicons/react/24/outline';
import SEO from '../../components/SEO';

const ElectricityPayment = () => {
  const { billId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [billData, setBillData] = useState(null);
  const [paymentData, setPaymentData] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState('idle'); // idle, processing, success, failed
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchBillData();
  }, [billId, user]);

  // Check payment status periodically when payment is pending
  useEffect(() => {
    let interval;
    if (paymentStatus === 'pending' && paymentData?.paymentId) {
      interval = setInterval(() => {
        checkPaymentStatus();
      }, 3000); // Check every 3 seconds for faster updates
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [paymentStatus, paymentData]);

  // Check payment status when component mounts if there's a pending payment
  useEffect(() => {
    if (billData?.paymentStatus === 'pending' && billData?.paymentId) {
      // Set up payment data for polling
      setPaymentData({ paymentId: billData.paymentId });
      setPaymentStatus('pending');
    }
  }, [billData]);

  const fetchBillData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get student's electricity bills
      const response = await api.get('/api/rooms/student/electricity-bills');
      
      if (response.data.success) {
        const bills = response.data.data;
        const bill = bills.find(b => b._id === billId);
        
        if (!bill) {
          setError('Bill not found');
          return;
        }

        setBillData(bill);

        // If bill has pending payment, fetch payment data
        if (bill.paymentStatus === 'pending' && bill.paymentId) {
          try {
            const paymentResponse = await api.get(`/api/payments/status/${bill.paymentId}`);
            if (paymentResponse.data.success) {
              setPaymentData({
                paymentId: bill.paymentId,
                ...paymentResponse.data.data
              });
              setPaymentStatus(paymentResponse.data.data.status);
            }
          } catch (paymentErr) {
            console.error('Error fetching payment data:', paymentErr);
            // Don't show error for payment data fetch, just log it
          }
        }
      } else {
        setError('Failed to fetch bill data');
      }
    } catch (err) {
      console.error('Error fetching bill data:', err);
      setError(err.response?.data?.message || 'Failed to fetch bill data');
    } finally {
      setLoading(false);
    }
  };

  const initiatePayment = async () => {
    try {
      setPaymentStatus('processing');
      setError(null);

      // Get room ID from user data
      const roomResponse = await api.get('/api/rooms/student/electricity-bills');
      if (!roomResponse.data.success) {
        throw new Error('Failed to get room information');
      }

      // Find the room that matches user's room number
      const room = await api.get('/api/rooms');
      const userRoom = room.data.data.rooms.find(r => 
        r.roomNumber === user.roomNumber && 
        r.gender === user.gender && 
        r.category === user.category
      );

      if (!userRoom) {
        throw new Error('Room information not found');
      }

      const response = await api.post('/api/payments/initiate', {
        billId: billId,
        roomId: userRoom._id
      });

      if (response.data.success) {
        setPaymentData(response.data.data);
        
        // Store order data for later use
        localStorage.setItem('currentOrder', JSON.stringify({
          orderId: response.data.data.orderId,
          amount: response.data.data.amount,
          paymentSessionId: response.data.data.paymentSessionId
        }));
        
        // Initialize Cashfree SDK and open checkout
        if (window.Cashfree && response.data.data.paymentSessionId) {
          const cashfree = window.Cashfree({
            mode: "production" // using production credentials
          });
          
          // Open Cashfree Checkout
          const checkoutOptions = {
            paymentSessionId: response.data.data.paymentSessionId,
            redirectTarget: "_self"
          };
          
          console.log('Opening Cashfree checkout with:', checkoutOptions);
          cashfree.checkout(checkoutOptions);
        } else if (response.data.data.paymentUrl) {
          // Fallback to direct URL redirect
          console.log('Fallback: Opening payment URL:', response.data.data.paymentUrl);
          window.open(response.data.data.paymentUrl, '_blank');
          setPaymentStatus('pending');
          toast.success('Payment page opened in new tab. Please complete the payment.');
        } else {
          setPaymentStatus('failed');
          setError('Payment URL not received');
        }
      } else {
        throw new Error(response.data.message || 'Failed to initiate payment');
      }
    } catch (err) {
      console.error('Error initiating payment:', err);
      setPaymentStatus('failed');
      setError(err.response?.data?.message || err.message || 'Failed to initiate payment');
      toast.error('Payment initiation failed');
    }
  };

  const checkPaymentStatus = async () => {
    if (!paymentData?.paymentId) return;

    try {
      console.log('🔄 Checking payment status for:', paymentData.paymentId);
      const response = await api.get(`/api/payments/status/${paymentData.paymentId}`);
      
      if (response.data.success) {
        const status = response.data.data.status;
        console.log('🔄 Payment status received:', status);
        setPaymentStatus(status);
        
        if (status === 'success') {
          toast.success('Payment completed successfully!');
          // Clear payment data and refresh bill data
          setPaymentData(null);
          await fetchBillData();
          // Show success modal
          setPaymentStatus('success');
        } else if (status === 'failed' || status === 'cancelled') {
          setError(response.data.data.failureReason || 'Payment failed');
          setPaymentData(null);
          await fetchBillData();
        }
      }
    } catch (err) {
      console.error('Error checking payment status:', err);
    }
  };

  const cancelPayment = async () => {
    // Get payment ID from either paymentData or billData
    const paymentId = paymentData?.paymentId || billData?.paymentId;
    
    if (!paymentId) {
      toast.error('Payment ID not found');
      return;
    }

    try {
      const response = await api.delete(`/api/payments/cancel/${paymentId}`);
      
      if (response.data.success) {
        setPaymentStatus('cancelled');
        setPaymentData(null);
        toast.success('Payment cancelled successfully');
        fetchBillData();
      }
    } catch (err) {
      console.error('Error cancelling payment:', err);
      toast.error('Failed to cancel payment');
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'paid':
        return <CheckCircleIcon className="w-6 h-6 text-green-600" />;
      case 'pending':
        return <ClockIcon className="w-6 h-6 text-yellow-600" />;
      case 'unpaid':
        return <XCircleIcon className="w-6 h-6 text-red-600" />;
      default:
        return <ExclamationTriangleIcon className="w-6 h-6 text-gray-600" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'pending':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'unpaid':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  if (error && !billData) {
    return (
      <div className="p-4 sm:p-6 max-w-4xl mx-auto mt-16 sm:mt-0">
        <div className="text-center py-12">
          <XCircleIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/student')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <SEO 
        title="Electricity Bill Payment"
        description="Pay your electricity bill securely using Cashfree payment gateway"
        keywords="Electricity Bill Payment, Cashfree, Secure Payment, Hostel Bills"
      />
      
      <div className="p-3 sm:p-6 max-w-4xl mx-auto mt-16 sm:mt-0">
        {/* Header */}
        <div className="mb-4 sm:mb-6">
          <button
            onClick={() => navigate('/student')}
            className="flex items-center text-blue-600 hover:text-blue-800 mb-3 sm:mb-4 text-sm sm:text-base"
          >
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Back to Dashboard
          </button>
          
          <div className="flex items-center gap-2 sm:gap-3 mb-2">
            <BoltIcon className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-600" />
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">
              Electricity Bill Payment
            </h1>
          </div>
          <p className="text-sm sm:text-base text-gray-600">
            Pay your electricity bill securely using Cashfree payment gateway
          </p>
        </div>

        {/* Mobile-first layout - single column by default, two columns only on very large screens */}
        <div className="flex flex-col 2xl:grid 2xl:grid-cols-2 gap-4 sm:gap-6">
          {/* Bill Details */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 w-full"
          >
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
              <CurrencyDollarIcon className="w-4 h-4 sm:w-5 sm:h-5" />
              Bill Details
            </h2>

            {billData && (
              <div className="space-y-3 sm:space-y-4">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-0">
                  <span className="text-sm sm:text-base text-gray-600">Room Number:</span>
                  <span className="font-medium text-sm sm:text-base">{user?.roomNumber}</span>
                </div>
                
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-0">
                  <span className="text-sm sm:text-base text-gray-600">Bill Month:</span>
                  <span className="font-medium text-sm sm:text-base">{billData.month}</span>
                </div>
                
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-0">
                  <span className="text-sm sm:text-base text-gray-600">Start Units:</span>
                  <span className="font-medium text-sm sm:text-base">{billData.startUnits}</span>
                </div>
                
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-0">
                  <span className="text-sm sm:text-base text-gray-600">End Units:</span>
                  <span className="font-medium text-sm sm:text-base">{billData.endUnits}</span>
                </div>
                
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-0">
                  <span className="text-sm sm:text-base text-gray-600">Consumption:</span>
                  <span className="font-medium text-sm sm:text-base">{billData.consumption || (billData.endUnits - billData.startUnits)} units</span>
                </div>
                
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-0">
                  <span className="text-sm sm:text-base text-gray-600">Rate per Unit:</span>
                  <span className="font-medium text-sm sm:text-base">₹{billData.rate}</span>
                </div>
                
                <div className="border-t pt-3 sm:pt-4">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-0">
                    <span className="text-base sm:text-lg font-semibold text-gray-900">Total Room Bill:</span>
                    <span className="font-medium text-sm sm:text-base">₹{billData.total}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-0">
                    <span className="text-sm sm:text-base text-blue-700 font-semibold">Your Share:</span>
                    <span className="font-bold text-blue-700 text-lg sm:text-xl">₹{billData.studentShare}</span>
                  </div>
                </div>

                {/* Payment Status */}
                <div className="mt-3 sm:mt-4 p-3 rounded-lg border">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
                    <span className="text-sm sm:text-base text-gray-600">Payment Status:</span>
                    <span className={`inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium ${getStatusColor(billData.paymentStatus)}`}>
                      {getStatusIcon(billData.paymentStatus)}
                      <span className="ml-1 capitalize">{billData.paymentStatus}</span>
                    </span>
                  </div>
                </div>
              </div>
            )}
          </motion.div>

          {/* Payment Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 w-full"
          >
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
              <CreditCardIcon className="w-4 h-4 sm:w-5 sm:h-5" />
              Payment
            </h2>

            {billData?.paymentStatus === 'paid' ? (
              <div className="text-center py-6 sm:py-8">
                <CheckCircleIcon className="w-12 h-12 sm:w-16 sm:h-16 text-green-500 mx-auto mb-3 sm:mb-4" />
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">Bill Already Paid</h3>
                <p className="text-sm sm:text-base text-gray-600 mb-3 sm:mb-4">
                  This electricity bill has already been paid successfully.
                </p>
                {billData.paidAt && (
                  <p className="text-xs sm:text-sm text-gray-500">
                    Paid on: {new Date(billData.paidAt).toLocaleDateString()}
                  </p>
                )}
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-0 sm:justify-center">
                  <button
                    onClick={fetchBillData}
                    className="px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm sm:text-base"
                  >
                    Refresh Status
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        const response = await api.post(`/api/payments/verify/${billData.paymentId}`);
                        if (response.data.success) {
                          toast.success('Payment verified successfully!');
                          await fetchBillData();
                        }
                      } catch (err) {
                        toast.error('Failed to verify payment');
                        console.error('Error verifying payment:', err);
                      }
                    }}
                    className="px-3 sm:px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm sm:text-base"
                  >
                    Verify Payment
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        console.log('🔍 Debug: Checking payment status for:', billData.paymentId);
                        const response = await api.get(`/api/payments/status/${billData.paymentId}`);
                        console.log('📊 Payment status response:', response.data);
                        toast.success('Check console for payment details');
                      } catch (err) {
                        console.error('❌ Error checking payment status:', err);
                        toast.error('Failed to check payment status');
                      }
                    }}
                    className="px-3 sm:px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm sm:text-base"
                  >
                    Debug Status
                  </button>
                </div>
              </div>
            ) : billData?.paymentStatus === 'pending' ? (
              <div className="text-center py-6 sm:py-8">
                <ClockIcon className="w-12 h-12 sm:w-16 sm:h-16 text-yellow-500 mx-auto mb-3 sm:mb-4" />
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">Payment in Progress</h3>
                <p className="text-sm sm:text-base text-gray-600 mb-3 sm:mb-4">
                  A payment is already in progress for this bill.
                </p>
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-0 sm:justify-center">
                  <button
                    onClick={checkPaymentStatus}
                    className="px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm sm:text-base sm:mr-2"
                  >
                    Check Status
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        const response = await api.post(`/api/payments/verify/${billData.paymentId}`);
                        if (response.data.success) {
                          toast.success('Payment verified successfully!');
                          await fetchBillData();
                        }
                      } catch (err) {
                        toast.error('Failed to verify payment');
                        console.error('Error verifying payment:', err);
                      }
                    }}
                    className="px-3 sm:px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm sm:text-base sm:mr-2"
                  >
                    Verify Payment
                  </button>
                  <button
                    onClick={fetchBillData}
                    className="px-3 sm:px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm sm:text-base sm:mr-2"
                  >
                    Refresh Bill
                  </button>
                  <button
                    onClick={cancelPayment}
                    className="px-3 sm:px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm sm:text-base"
                  >
                    Cancel Payment
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
                  <h3 className="font-medium text-blue-900 mb-2 text-sm sm:text-base">Secure Payment</h3>
                  <p className="text-xs sm:text-sm text-blue-700">
                    Your payment will be processed securely through Cashfree. 
                    You can pay using UPI, cards, net banking, or digital wallets.
                  </p>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4">
                    <p className="text-xs sm:text-sm text-red-700">{error}</p>
                  </div>
                )}

                <button
                  onClick={initiatePayment}
                  disabled={paymentStatus === 'processing'}
                  className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm sm:text-base"
                >
                  {paymentStatus === 'processing' ? (
                    <div className="flex items-center justify-center">
                      <LoadingSpinner size="sm" />
                      <span className="ml-2">Processing...</span>
                    </div>
                  ) : (
                    `Pay ₹${billData?.studentShare || 0}`
                  )}
                </button>

                <div className="text-center">
                  <p className="text-xs text-gray-500">
                    By proceeding, you agree to our payment terms and conditions
                  </p>
                </div>
              </div>
            )}
          </motion.div>
        </div>

        {/* Payment Status Modal */}
        <AnimatePresence>
          {paymentStatus === 'success' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-xl p-4 sm:p-6 max-w-md w-full mx-4"
              >
                <div className="text-center">
                  <CheckCircleIcon className="w-12 h-12 sm:w-16 sm:h-16 text-green-500 mx-auto mb-3 sm:mb-4" />
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">Payment Successful!</h3>
                  <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">
                    Your electricity bill payment has been completed successfully.
                  </p>
                  <button
                    onClick={async () => {
                      try {
                        // First, try to verify the payment with Cashfree
                        console.log('🔄 Verifying payment before redirecting...');
                        const response = await api.post(`/api/payments/verify/${billData.paymentId}`);
                        if (response.data.success) {
                          console.log('✅ Payment verified successfully');
                          toast.success('Payment verified and updated!');
                        }
                      } catch (err) {
                        console.log('⚠️ Payment verification failed, but continuing...', err);
                      }
                      
                      setPaymentStatus('idle');
                      // Refresh bill data one more time to ensure latest status
                      await fetchBillData();
                      navigate('/student');
                    }}
                    className="px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm sm:text-base"
                  >
                    Back to Dashboard
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};

export default ElectricityPayment; 