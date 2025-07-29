import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

const LeaveQRDetails = () => {
  const { id } = useParams();
  const [leave, setLeave] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [scannedAt, setScannedAt] = useState(null);
  const [visitInfo, setVisitInfo] = useState(null);
  const [isIncoming, setIsIncoming] = useState(false);

  useEffect(() => {
    const fetchLeave = async () => {
      try {
        console.log('🔍 Recording visit for leave ID:', id);
        console.log('🔍 VITE_API_URL:', import.meta.env.VITE_API_URL);
        console.log('🔍 VITE_QR_BASE_URL:', import.meta.env.VITE_QR_BASE_URL);
        
        // Use fallback URL if environment variable is not set
        const apiUrl = import.meta.env.VITE_API_URL || 'http://192.168.3.148:5000';
        
        // Check if this is an incoming QR by looking at the URL
        const isIncomingQR = window.location.pathname.includes('/incoming-qr/');
        setIsIncoming(isIncomingQR);
        
        const endpoint = isIncomingQR ? `/api/leave/incoming-qr/${id}` : `/api/leave/qr/${id}`;
        const fullUrl = `${apiUrl}${endpoint}`;
        
        console.log('🔍 API URL:', fullUrl);
        console.log('🔍 Is Incoming QR:', isIncomingQR);
        
        // Make POST request to record visit
        const response = await axios.post(fullUrl, {
          scannedBy: 'Security Guard',
          location: 'Main Gate'
        }, {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 10000 // 10 second timeout
        });
        
        console.log('🔍 Response received:', response.data);
        
        if (response.data.success) {
          // Fetch the updated leave details
          const leaveResponse = await axios.get(`${apiUrl}/api/leave/${id}`, {
            headers: {
              'Content-Type': 'application/json'
            }
          });
          
          if (leaveResponse.data.success) {
            setLeave(leaveResponse.data.data);
            // Show success message for visit recording
            console.log('✅ Visit recorded successfully:', {
              outgoingVisitCount: response.data.outgoingVisitCount,
              incomingVisitCount: response.data.incomingVisitCount,
              maxVisits: response.data.maxVisits
            });
          }
        } else {
          setError(response.data.message || 'Failed to record visit');
        }
      } catch (err) {
        console.error('❌ Error recording visit:', err);
        console.error('❌ Error response:', err.response?.data);
        console.error('❌ Error status:', err.response?.status);
        console.error('❌ Error message:', err.message);
        
        if (err.response && err.response.status === 403 && err.response.data.message) {
          setError(err.response.data.message);
          setScannedAt(err.response.data.scannedAt);
          setVisitInfo(err.response.data);
        
          // Handle duplicate scan - show current visit info instead of error
          setError(err.response.data.message);
          setScannedAt(err.response.data.scannedAt);
          setVisitInfo(err.response.data);
          
          // Also fetch current leave details to show full information
          try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://192.168.3.148:5000';
            const leaveResponse = await axios.get(`${apiUrl}/api/leave/${id}`, {
              headers: {
                'Content-Type': 'application/json'
              }
            });
            
            if (leaveResponse.data.success) {
              setLeave(leaveResponse.data.data);
            }
          } catch (fetchErr) {
            console.error('❌ Error fetching leave details:', fetchErr);
          }
        } else if (err.code === 'ECONNABORTED') {
          setError('Request timeout - please try again');
        } else if (err.code === 'ERR_NETWORK') {
          setError('Network error - please check your connection');
        } else {
          setError('Leave not found');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchLeave();
  }, [id]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-yellow-100 p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center border-t-8 border-red-500">
          <h1 className="text-2xl font-extrabold text-red-700 mb-4">
            {error.includes('recently') ? `${isIncoming ? 'Incoming' : 'Outgoing'} Visit Already Recorded` : 'Leave Invalid'}
          </h1>
          <div className="mb-6">
            <span className="block text-lg font-semibold text-gray-700 mb-1">{error}</span>
            {scannedAt && (
              <span className="block text-base text-gray-600 mt-2">Scanned At: {new Date(scannedAt).toLocaleString()}</span>
            )}
            {visitInfo && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600">
                  <div>Outgoing Visits: {visitInfo.outgoingVisitCount || 0}/{visitInfo.maxVisits || 2}</div>
                  {visitInfo.incomingQrGenerated && (
                    <div>Incoming Visits: {visitInfo.incomingVisitCount || 0}/1</div>
                  )}
                  {visitInfo.visitLocked && (
                    <div className="text-red-600 font-semibold">Visit Limit Reached</div>
                  )}
                </div>
              </div>
            )}
          </div>
          {/* Show leave details if available even for duplicate scans */}
          {leave && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="text-lg font-semibold text-blue-700 mb-2">{leave.applicationType} Information</h3>
              <div className="text-sm text-gray-700">
                <div><strong>Name:</strong> {leave.student?.name}</div>
                <div><strong>Roll No:</strong> {leave.student?.rollNumber}</div>
                {leave.applicationType === 'Leave' ? (
                  <>
                    <div><strong>Duration:</strong> {leave.numberOfDays} day{leave.numberOfDays > 1 ? 's' : ''}</div>
                    <div><strong>Start Date:</strong> {new Date(leave.startDate).toLocaleDateString()}</div>
                    <div><strong>End Date:</strong> {new Date(leave.endDate).toLocaleDateString()}</div>
                  </>
                ) : (
                  <>
                    <div><strong>Date:</strong> {new Date(leave.permissionDate).toLocaleDateString()}</div>
                    <div><strong>Time:</strong> {leave.outTime} - {leave.inTime}</div>
                  </>
                )}
                <div><strong>Reason:</strong> {leave.reason}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
  if (!leave) return null;

  // Helper function to format display information
  const formatDisplayInfo = (leave) => {
    if (leave.applicationType === 'Leave') {
      return {
        title: 'Leave Approved',
        startDate: new Date(leave.startDate).toLocaleString(),
        endDate: new Date(leave.endDate).toLocaleString(),
        duration: `${leave.numberOfDays} day${leave.numberOfDays > 1 ? 's' : ''}`,
        gatePass: leave.gatePassDateTime ? new Date(leave.gatePassDateTime).toLocaleString() : 'N/A'
      };
    } else if (leave.applicationType === 'Permission') {
      return {
        title: 'Permission Approved',
        date: new Date(leave.permissionDate).toLocaleDateString(),
        time: `${leave.outTime} - ${leave.inTime}`,
        duration: '1 day',
        gatePass: 'N/A'
      };
    }
    return {};
  };

  const displayInfo = formatDisplayInfo(leave);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-100 p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center border-t-8 border-green-500">
        <h1 className="text-3xl font-extrabold text-green-700 mb-4">
          {isIncoming ? 'Incoming Visit Recorded' : 'Outgoing Visit Recorded'}
        </h1>
        <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
          <div className="text-green-700 font-semibold">
            ✅ {isIncoming ? 'Incoming' : 'Outgoing'} Visit Recorded Successfully
          </div>
        </div>
        <div className="mb-6">
          <span className="block text-lg font-semibold text-gray-700 mb-1">Name:</span>
          <span className="block text-xl text-gray-900 mb-2">{leave.student?.name}</span>
          <span className="block text-lg font-semibold text-gray-700 mb-1">Roll No:</span>
          <span className="block text-xl text-gray-900 mb-2">{leave.student?.rollNumber}</span>
          
          {leave.applicationType === 'Leave' ? (
            <>
              <span className="block text-lg font-semibold text-gray-700 mb-1">Start Date:</span>
              <span className="block text-xl text-gray-900 mb-2">{displayInfo.startDate}</span>
              <span className="block text-lg font-semibold text-gray-700 mb-1">End Date:</span>
              <span className="block text-xl text-gray-900 mb-2">{displayInfo.endDate}</span>
              <span className="block text-lg font-semibold text-gray-700 mb-1">Gate Pass:</span>
              <span className="block text-xl text-gray-900 mb-2">{displayInfo.gatePass}</span>
            </>
          ) : (
            <>
              <span className="block text-lg font-semibold text-gray-700 mb-1">Date:</span>
              <span className="block text-xl text-gray-900 mb-2">{displayInfo.date}</span>
              <span className="block text-lg font-semibold text-gray-700 mb-1">Time:</span>
              <span className="block text-xl text-gray-900 mb-2">{displayInfo.time}</span>
            </>
          )}
          
          <span className="block text-lg font-semibold text-gray-700 mb-1">Duration:</span>
          <span className="block text-xl text-gray-900 mb-2">{displayInfo.duration}</span>
          <span className="block text-lg font-semibold text-gray-700 mb-1">Reason:</span>
          <span className="block text-xl text-gray-900 mb-2">{leave.reason}</span>
          <span className="block text-lg font-semibold text-gray-700 mb-1">Outgoing Visits:</span>
          <span className="block text-xl text-gray-900 mb-2">
            {leave.outgoingVisitCount || 0}/{leave.maxVisits || 2}
          </span>
          {leave.incomingQrGenerated && (
            <>
              <span className="block text-lg font-semibold text-gray-700 mb-1">Incoming Visits:</span>
              <span className="block text-xl text-gray-900 mb-2">
                {leave.incomingVisitCount || 0}/1
              </span>
            </>
          )}
          {leave.visits && leave.visits.length > 0 && (
            <div className="mt-4">
              <span className="block text-lg font-semibold text-gray-700 mb-2">Visit History:</span>
              {leave.visits.map((visit, index) => (
                <div key={index} className="text-sm text-gray-600 mb-1">
                  {visit.visitType === 'incoming' ? 'Incoming' : 'Outgoing'} Visit {index + 1}: {new Date(visit.scannedAt).toLocaleString()} 
                  {visit.location && ` at ${visit.location}`}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="mt-6">
          <span className="inline-block bg-green-100 text-green-800 text-lg font-bold px-6 py-2 rounded-full shadow">
            {isIncoming ? 'RE-ENTRY APPROVED' : 'EXIT APPROVED'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default LeaveQRDetails; 