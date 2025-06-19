import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../utils/axios';

const OutpassQRDetails = () => {
  const { id } = useParams();
  const [outpass, setOutpass] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [scannedAt, setScannedAt] = useState(null);

  useEffect(() => {
    const fetchOutpass = async () => {
      try {
        const response = await api.get(`/api/outpass/${id}`);
        if (response.data.success) {
          setOutpass(response.data.data);
        } else {
          setError('Outpass not found');
        }
      } catch (err) {
        if (err.response && err.response.status === 403 && err.response.data.message) {
          setError(err.response.data.message);
          setScannedAt(err.response.data.scannedAt);
        } else {
          setError('Outpass not found');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchOutpass();
  }, [id]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-yellow-100 p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center border-t-8 border-red-500">
          <h1 className="text-2xl font-extrabold text-red-700 mb-4">Gatepass Invalid</h1>
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
  if (!outpass) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-100 p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center border-t-8 border-green-500">
        <h1 className="text-3xl font-extrabold text-green-700 mb-4">Outpass Approved</h1>
        <div className="mb-6">
          <span className="block text-lg font-semibold text-gray-700 mb-1">Name:</span>
          <span className="block text-xl text-gray-900 mb-2">{outpass.student?.name}</span>
          <span className="block text-lg font-semibold text-gray-700 mb-1">Roll No:</span>
          <span className="block text-xl text-gray-900 mb-2">{outpass.student?.rollNumber}</span>
          <span className="block text-lg font-semibold text-gray-700 mb-1">Start Date:</span>
          <span className="block text-xl text-gray-900 mb-2">{new Date(outpass.startDate).toLocaleString()}</span>
          <span className="block text-lg font-semibold text-gray-700 mb-1">End Date:</span>
          <span className="block text-xl text-gray-900 mb-2">{new Date(outpass.endDate).toLocaleString()}</span>
          <span className="block text-lg font-semibold text-gray-700 mb-1">Duration:</span>
          <span className="block text-xl text-gray-900 mb-2">{outpass.numberOfDays} day{outpass.numberOfDays > 1 ? 's' : ''}</span>
          <span className="block text-lg font-semibold text-gray-700 mb-1">Reason:</span>
          <span className="block text-xl text-gray-900 mb-2">{outpass.reason}</span>
        </div>
        <div className="mt-6">
          <span className="inline-block bg-green-100 text-green-800 text-lg font-bold px-6 py-2 rounded-full shadow">APPROVED</span>
        </div>
      </div>
    </div>
  );
};

export default OutpassQRDetails; 