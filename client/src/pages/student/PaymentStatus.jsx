import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/axios';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import LoadingSpinner from '../../components/LoadingSpinner';
import {
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ArrowLeftIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  HomeIcon
} from '@heroicons/react/24/outline';
import SEO from '../../components/SEO';

const PaymentStatus = () => {
  const { paymentId } = useParams();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [paymentData, setPaymentData] = useState(null);
  const [status, setStatus] = useState('processing'); // processing, success, failed, cancelled
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    // Check for payment status in URL parameters (callback from Cashfree)
    const urlParams = new URLSearchParams(window.location.search);
    const orderId = urlParams.get('order_id');
    const status = urlParams.get('status');
    const paymentStatus = urlParams.get('payment_status');
    
    console.log('URL Parameters:', { orderId, status, paymentStatus });
    console.log('Current URL:', window.location.href);
    console.log('Payment ID from params:', paymentId);
    
    // If we have an order_id (Cashfree callback), handle it
    if (orderId) {
      console.log('Order ID found in URL:', orderId);
      
      // Get stored order data
      const storedOrder = localStorage.getItem('currentOrder');
      console.log('Stored order:', storedOrder);
      
      if (storedOrder) {
        const order = JSON.parse(storedOrder);
        
        if (order.orderId === orderId) {
          console.log('Order ID matches stored order');
          
          // Determine status from various possible parameters
          let finalStatus = 'pending';
          if (status === 'SUCCESS' || paymentStatus === 'SUCCESS') {
            finalStatus = 'success';
          } else if (status === 'FAILED' || paymentStatus === 'FAILED') {
            finalStatus = 'failed';
          }
          
          console.log('Final status:', finalStatus);
          
          // Update order data with status
          const updatedOrder = {
            ...order,
            status: finalStatus.toUpperCase()
          };
          
          setPaymentData(updatedOrder);
          setStatus(finalStatus);
          
          // Clear URL parameters
          window.history.replaceState({}, document.title, window.location.pathname);
          
          if (finalStatus === 'success') {
            toast.success('Payment completed successfully!');
            // Clear stored order data
            localStorage.removeItem('currentOrder');
            // Redirect to dashboard after a short delay
            setTimeout(() => {
              navigate('/student');
            }, 3000);
          } else if (finalStatus === 'failed') {
            toast.error('Payment failed');
            // Clear stored order data
            localStorage.removeItem('currentOrder');
          }
        } else {
          console.log('Order ID does not match stored order');
          setError('Invalid order ID');
          setStatus('failed');
        }
      } else {
        console.log('No stored order found');
        setError('Order not found');
        setStatus('failed');
      }
    } else if (paymentId && paymentId !== 'undefined') {
      // If we have a paymentId, check payment status from backend
      console.log('Checking payment status for paymentId:', paymentId);
      checkPaymentStatus();
    } else {
      // No callback parameters and no paymentId
      console.log('No order_id or paymentId found');
      setError('Invalid payment callback');
      setStatus('failed');
      setLoading(false);
    }
  }, [paymentId, user, navigate]);

  const checkPaymentStatus = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('Checking payment status for paymentId:', paymentId);

      const response = await api.get(`/api/payments/status/${paymentId}`);
      
      if (response.data.success) {
        const payment = response.data.data;
        console.log('Payment data received:', payment);
        
        setPaymentData(payment);
        setStatus(payment.status);
        
        if (payment.status === 'success') {
          toast.success('Payment completed successfully!');
          // Clear stored order data
          localStorage.removeItem('currentOrder');
          // Redirect to dashboard after a short delay
          setTimeout(() => {
            navigate('/student');
          }, 3000);
        } else if (payment.status === 'failed') {
          toast.error(payment.failureReason || 'Payment failed');
        } else if (payment.status === 'cancelled') {
          toast.error('Payment was cancelled');
        }
      } else {
        throw new Error(response.data.message || 'Failed to check payment status');
      }
    } catch (err) {
      console.error('Error checking payment status:', err);
      setError(err.response?.data?.message || err.message || 'Failed to check payment status');
      setStatus('failed');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success':
        return <CheckCircleIcon className="w-16 h-16 text-green-500" />;
      case 'pending':
        return <ClockIcon className="w-16 h-16 text-yellow-500" />;
      case 'failed':
        return <XCircleIcon className="w-16 h-16 text-red-500" />;
      case 'cancelled':
        return <ExclamationTriangleIcon className="w-16 h-16 text-gray-500" />;
      default:
        return <ExclamationTriangleIcon className="w-16 h-16 text-gray-500" />;
    }
  };

  const getStatusTitle = (status) => {
    switch (status) {
      case 'success':
        return 'Payment Successful!';
      case 'pending':
        return 'Payment Processing';
      case 'failed':
        return 'Payment Failed';
      case 'cancelled':
        return 'Payment Cancelled';
      default:
        return 'Payment Status Unknown';
    }
  };

  const getStatusDescription = (status) => {
    switch (status) {
      case 'success':
        return 'Your electricity bill payment has been completed successfully. You will receive a confirmation email shortly. Redirecting to dashboard...';
      case 'pending':
        return 'Your payment is being processed. Please wait while we confirm your transaction.';
      case 'failed':
        return 'Your payment could not be processed. Please try again or contact support if the issue persists.';
      case 'cancelled':
        return 'Your payment was cancelled. You can try again anytime.';
      default:
        return 'Unable to determine payment status. Please contact support.';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'pending':
        return 'bg-yellow-50 border-yellow-200';
      case 'failed':
        return 'bg-red-50 border-red-200';
      case 'cancelled':
        return 'bg-gray-50 border-gray-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
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
        title="Payment Status"
        description="Check your electricity bill payment status and transaction details"
        keywords="Payment Status, Transaction Status, Payment Confirmation, Electricity Bill Payment"
      />
      
      <div className="p-4 sm:p-6 max-w-2xl mx-auto mt-16 sm:mt-0">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/student')}
            className="flex items-center text-blue-600 hover:text-blue-800 mb-4"
          >
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Back to Dashboard
          </button>
        </div>

        {/* Payment Status Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`bg-white rounded-xl shadow-sm border ${getStatusColor(status)} p-8 text-center`}
        >
          {/* Status Icon */}
          <div className="mb-6">
            {getStatusIcon(status)}
          </div>

          {/* Status Title */}
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
            {getStatusTitle(status)}
          </h1>

          {/* Status Description */}
          <p className="text-gray-600 mb-8 max-w-md mx-auto">
            {getStatusDescription(status)}
          </p>

          {/* Payment Details */}
          {paymentData && (
            <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center justify-center gap-2">
                <DocumentTextIcon className="w-5 h-5" />
                Payment Details
              </h2>
              
              <div className="space-y-3 text-left">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Transaction ID:</span>
                  <span className="font-medium text-sm">{paymentData.cashfreeOrderId || paymentData.orderId || 'N/A'}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Bill Month:</span>
                  <span className="font-medium">{paymentData.billMonth || 'N/A'}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Room Number:</span>
                  <span className="font-medium">{paymentData.roomId?.roomNumber || 'N/A'}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Amount:</span>
                  <span className="font-medium text-lg text-blue-600">
                    {formatCurrency(paymentData.amount)}
                  </span>
                </div>
                
                {paymentData.paymentDate && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Payment Date:</span>
                    <span className="font-medium">{formatDate(paymentData.paymentDate)}</span>
                  </div>
                )}
                
                {paymentData.failureReason && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-700">
                      <strong>Reason:</strong> {paymentData.failureReason}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => navigate('/student')}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              <HomeIcon className="w-4 h-4" />
              Back to Dashboard
            </button>
            
            {status === 'success' && (
              <button
                onClick={() => {
                  // Generate receipt
                  toast.success('Payment receipt generated');
                }}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
              >
                <ReceiptIcon className="w-4 h-4" />
                Download Receipt
              </button>
            )}
            
            {(status === 'failed' || status === 'cancelled') && (
              <button
                onClick={() => navigate('/student')}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium"
              >
                <CurrencyDollarIcon className="w-4 h-4" />
                Try Again
              </button>
            )}
          </div>

          {/* Additional Information */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-gray-600">
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Need Help?</h3>
                <p>If you have any questions about your payment, please contact our support team.</p>
              </div>
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Payment Security</h3>
                <p>All payments are processed securely through Cashfree's encrypted payment gateway.</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Error Display */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4"
          >
            <div className="flex items-center">
              <XCircleIcon className="w-5 h-5 text-red-500 mr-2" />
              <p className="text-red-700">{error}</p>
            </div>
          </motion.div>
        )}
      </div>
    </>
  );
};

export default PaymentStatus; 