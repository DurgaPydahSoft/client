import React, { useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';

const StudentRegister = () => {
  const [step, setStep] = useState(1);
  const [rollNumber, setRollNumber] = useState('');
  const [studentInfo, setStudentInfo] = useState(null);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleVerify = async e => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post('/api/auth/student/verify', { rollNumber });
      setStudentInfo(res.data);
      setStep(2);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async e => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post('/api/auth/student/register', { rollNumber, password });
      toast.success('Registration successful! Please login.');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-50">
      <div className="w-full max-w-4xl p-8 flex flex-col items-center gap-8">
        {/* Header with Step Indicator */}
        <div className="w-full max-w-md text-center">
          <div className="mb-6">
            <svg className="w-16 h-16 mx-auto text-blue-600 animate-pulse" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-900 to-blue-600 bg-clip-text text-transparent mb-2">
            Student Registration
          </h2>
          <div className="flex items-center justify-center gap-4 mb-8">
            <div className={`flex items-center ${step === 1 ? 'text-blue-600' : 'text-gray-400'}`}>
              <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm border-2 transition-colors duration-300 ${
                step === 1 ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-gray-300'
              }`}>1</span>
              <span className="ml-2 font-medium">Verify</span>
            </div>
            <div className={`w-16 h-0.5 ${step === 2 ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
            <div className={`flex items-center ${step === 2 ? 'text-blue-600' : 'text-gray-400'}`}>
              <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm border-2 transition-colors duration-300 ${
                step === 2 ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-gray-300'
              }`}>2</span>
              <span className="ml-2 font-medium">Register</span>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 border border-blue-50">
          {step === 1 && (
            <form onSubmit={handleVerify} className="space-y-6">
              <div className="text-center mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Verify Your Identity</h3>
                <p className="text-sm text-gray-600 mt-1">Enter your roll number to begin registration</p>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                  </svg>
                </div>
                <input
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-colors"
                  placeholder="Enter Roll Number"
                  value={rollNumber}
                  onChange={e => setRollNumber(e.target.value)}
                  required
                />
              </div>
              <button 
                className={`w-full py-3 px-4 rounded-xl text-white font-medium transition-all duration-200 ${
                  loading 
                  ? 'bg-blue-400 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200 hover:shadow-blue-300'
                }`} 
                type="submit" 
                disabled={loading}
              >
                {loading ? (                  <div className="flex items-center justify-center gap-2">
                    <LoadingSpinner size="sm" className="border-white" />
                    <span>Verifying...</span>
                  </div>
                ) : (
                  'Verify Roll Number'
                )}
              </button>
            </form>
          )}

          {step === 2 && studentInfo && (
            <form onSubmit={handleRegister} className="space-y-6">
              <div className="text-center mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Confirm Your Details</h3>
                <p className="text-sm text-gray-600 mt-1">Review your information and set a password</p>
              </div>

              <div className="bg-blue-50 rounded-xl p-6 space-y-3">
                <div className="flex items-center gap-2 text-blue-900">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span className="font-medium">Name:</span>
                  <span className="text-blue-800">{studentInfo.name}</span>
                </div>
                <div className="flex items-center gap-2 text-blue-900">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  <span className="font-medium">Degree:</span>
                  <span className="text-blue-800">{studentInfo.degree}</span>
                </div>
                <div className="flex items-center gap-2 text-blue-900">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <span className="font-medium">Branch:</span>
                  <span className="text-blue-800">{studentInfo.branch}</span>
                </div>
                <div className="flex items-center gap-2 text-blue-900">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="font-medium">Year:</span>
                  <span className="text-blue-800">{studentInfo.year}</span>
                </div>
                <div className="flex items-center gap-2 text-blue-900">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  <span className="font-medium">Room:</span>
                  <span className="text-blue-800">{studentInfo.roomNumber}</span>
                </div>
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-colors"
                  type="password"
                  placeholder="Set Password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
              </div>

              <button 
                className={`w-full py-3 px-4 rounded-xl text-white font-medium transition-all duration-200 ${
                  loading 
                  ? 'bg-blue-400 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200 hover:shadow-blue-300'
                }`} 
                type="submit" 
                disabled={loading}
              >
                {loading ? (                  <div className="flex items-center justify-center gap-2">
                    <LoadingSpinner size="sm" className="border-white" />
                    <span>Registering...</span>
                  </div>
                ) : (
                  'Complete Registration'
                )}
              </button>
            </form>
          )}

          <div className="text-center mt-6">
            <a href="/login" className="text-blue-600 hover:text-blue-700 font-medium hover:underline transition-colors">
              Back to Login
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentRegister;