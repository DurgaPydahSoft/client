import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  UserIcon,
  ShieldCheckIcon,
  AcademicCapIcon,
  LockClosedIcon,
  ArrowRightOnRectangleIcon,
  HomeIcon
} from '@heroicons/react/24/outline';

const Login = () => {
  const [role, setRole] = useState('student');
  const [form, setForm] = useState({ rollNumber: '', password: '', username: '', adminPassword: '' });
  const { login } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    try {
      if (role === 'admin') {
        await login('admin', { username: form.username, password: form.adminPassword });
        toast.success('Admin login successful');
        navigate('/admin');
      } else {
        console.log('Attempting student login...');
        const result = await login('student', { rollNumber: form.rollNumber, password: form.password });
        console.log('Student login result:', result);
        
        if (result?.requiresPasswordChange) {
          console.log('Password change required, redirecting to reset password page');
          toast('Please change your password to continue', { icon: '🔐' });
          navigate('/student/reset-password', { replace: true });
        } else {
          console.log('No password change required, redirecting to student dashboard');
          navigate('/student', { replace: true });
        }
      }
    } catch (err) {
      console.error('Login error:', err);
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-50 p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden relative">
          {/* Home Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/')}
            className="absolute top-4 left-4 z-10 p-2 rounded-lg bg-white/10 backdrop-blur-sm hover:bg-white/20 transition-colors duration-200"
          >
            <HomeIcon className="w-6 h-6 text-white" />
          </motion.button>

          {/* Header with gradient */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-8 text-center">
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2 }}
              className="w-16 h-16 mx-auto mb-4 bg-white/20 rounded-xl backdrop-blur-sm flex items-center justify-center"
            >
              {role === 'student' ? (
                <AcademicCapIcon className="w-8 h-8 text-white" />
              ) : (
                <ShieldCheckIcon className="w-8 h-8 text-white" />
              )}
            </motion.div>
            <h1 className="text-2xl font-bold text-white mb-2">Welcome Back</h1>
            <p className="text-blue-100 text-sm">
              {role === 'student' 
                ? 'Sign in to access your student dashboard'
                : 'Sign in to access the admin panel'
              }
            </p>
          </div>

          {/* Form */}
          <div className="p-8">
            {/* Slider Toggle Switch */}
            <div className="flex justify-center mb-8">
              <div className="relative bg-gray-100 rounded-full p-1 w-64">
        <motion.div 
                  className="absolute top-1 left-1 w-1/2 h-8 bg-white rounded-full shadow-md"
                  animate={{
                    x: role === 'admin' ? '100%' : '0%',
                  }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
                <div className="relative flex">
          <button
                    className={`flex-1 flex items-center justify-center py-2 px-4 rounded-full text-sm font-medium transition-colors duration-200 ${
                      role === 'student' ? 'text-blue-600' : 'text-gray-500'
            }`}
            onClick={() => setRole('student')}
          >
                    <AcademicCapIcon className="w-5 h-5 mr-2" />
            Student
          </button>
          <button
                    className={`flex-1 flex items-center justify-center py-2 px-4 rounded-full text-sm font-medium transition-colors duration-200 ${
                      role === 'admin' ? 'text-blue-600' : 'text-gray-500'
            }`}
            onClick={() => setRole('admin')}
          >
                    <ShieldCheckIcon className="w-5 h-5 mr-2" />
            Admin
          </button>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
          {role === 'admin' ? (
            <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Username
                    </label>
              <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <UserIcon className="h-5 w-5 text-gray-400" />
                      </div>
                <input
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                  name="username"
                  placeholder="Enter 'ADMIN' as username"
                  value={form.username}
                  onChange={handleChange}
                  required
                />
              </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Password
                    </label>
              <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <LockClosedIcon className="h-5 w-5 text-gray-400" />
                      </div>
                <input
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                  name="adminPassword"
                  type="password"
                  placeholder="Enter password (default: admin123)"
                  value={form.adminPassword}
                  onChange={handleChange}
                  required
                />
                    </div>
              </div>
            </>
          ) : (
            <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Roll Number
                    </label>
              <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <AcademicCapIcon className="h-5 w-5 text-gray-400" />
                      </div>
                <input
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                  name="rollNumber"
                        placeholder="Enter your roll number"
                  value={form.rollNumber}
                  onChange={handleChange}
                  required
                />
              </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Password
                    </label>
              <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <LockClosedIcon className="h-5 w-5 text-gray-400" />
                      </div>
                <input
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                  name="password"
                  type="password"
                        placeholder="Enter your password"
                  value={form.password}
                  onChange={handleChange}
                  required
                />
                    </div>
              </div>
            </>
          )}

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={loading}
                className={`w-full py-3 px-4 rounded-lg text-white font-medium transition-all duration-200 ${
                  loading
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900 shadow-lg hover:shadow-xl'
                }`}
          >
            {loading ? (
                  <div className="flex items-center justify-center">
                <LoadingSpinner size="sm" className="border-white" />
                    <span className="ml-2">Logging in...</span>
              </div>
            ) : (
                  <div className="flex items-center justify-center">
                    <ArrowRightOnRectangleIcon className="w-5 h-5 mr-2" />
                    <span>Sign In</span>
                  </div>
            )}
          </motion.button>
            </form>

        
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;