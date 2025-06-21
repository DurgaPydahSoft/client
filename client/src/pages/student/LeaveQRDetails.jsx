import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../utils/axios';

const LeaveQRDetails = () => {
  const { id } = useParams();
  const [leave, setLeave] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [scannedAt, setScannedAt] = useState(null);

  useEffect(() => {
    const fetchLeave = async () => {
      try {
        const response = await api.get(`/api/leave/${id}`);
        if (response.data.success) {
          setLeave(response.data.data);
        } else {
          setError('Leave not found');
        }
      } catch (err) {
        if (err.response && err.response.status === 403 && err.response.data.message) {
          setError(err.response.data.message);
          setScannedAt(err.response.data.scannedAt);
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
          <h1 className="text-2xl font-extrabold text-red-700 mb-4">Leave Invalid</h1>
          <div className="mb-6">
            <span className="block text-lg font-semibold text-gray-700 mb-1">{error}</span>
            {scannedAt && (
              <span className="block text-base text-gray-600 mt-2">Scanned At: {new Date(scannedAt).toLocaleString()}</span>
            )}
          </div>
        </div>
      </div>
    );
  }
  if (!leave) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-100 p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center border-t-8 border-green-500">
        <h1 className="text-3xl font-extrabold text-green-700 mb-4">Leave Approved</h1>
        <div className="mb-6">
          <span className="block text-lg font-semibold text-gray-700 mb-1">Name:</span>
          <span className="block text-xl text-gray-900 mb-2">{leave.student?.name}</span>
          <span className="block text-lg font-semibold text-gray-700 mb-1">Roll No:</span>
          <span className="block text-xl text-gray-900 mb-2">{leave.student?.rollNumber}</span>
          <span className="block text-lg font-semibold text-gray-700 mb-1">Start Date:</span>
          <span className="block text-xl text-gray-900 mb-2">{new Date(leave.startDate).toLocaleString()}</span>
          <span className="block text-lg font-semibold text-gray-700 mb-1">End Date:</span>
          <span className="block text-xl text-gray-900 mb-2">{new Date(leave.endDate).toLocaleString()}</span>
          <span className="block text-lg font-semibold text-gray-700 mb-1">Duration:</span>
          <span className="block text-xl text-gray-900 mb-2">{leave.numberOfDays} day{leave.numberOfDays > 1 ? 's' : ''}</span>
          <span className="block text-lg font-semibold text-gray-700 mb-1">Reason:</span>
          <span className="block text-xl text-gray-900 mb-2">{leave.reason}</span>
        </div>
        <div className="mt-6">
          <span className="inline-block bg-green-100 text-green-800 text-lg font-bold px-6 py-2 rounded-full shadow">APPROVED</span>
        </div>
      </div>
    </div>
  );
};

export default LeaveQRDetails; 