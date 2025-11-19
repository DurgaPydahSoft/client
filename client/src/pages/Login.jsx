import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';
import {
  UserIcon,
  ShieldCheckIcon,
  AcademicCapIcon,
  LockClosedIcon,
  ArrowRightOnRectangleIcon,
  HomeIcon,
  EyeIcon,
  EyeSlashIcon
} from '@heroicons/react/24/outline';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';


const Login = () => {
  const [role, setRole] = useState('student');
  const [form, setForm] = useState({ rollNumber: '', password: '', username: '', adminPassword: '' });
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [showStudentPassword, setShowStudentPassword] = useState(false);
  const { login, user, token } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (token && user) {
      if (user.role === 'warden') {
        navigate('/warden/dashboard', { replace: true });
      } else if (user.role === 'principal') {
        navigate('/principal/dashboard', { replace: true });
      } else if (['super_admin', 'sub_admin', 'admin', 'custom'].includes(user.role)) {
        navigate('/admin/dashboard', { replace: true });
      } else if (user.role === 'student') {
        navigate('/student', { replace: true });
      }
    }
  }, [token, user, navigate]);

  useEffect(() => {
    const handlePopState = (e) => {
      if (window.location.pathname === '/login') {
        e.preventDefault();
        window.history.pushState(null, '', '/login');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    toast('Please wait at least 30-40 seconds because sometimes the server faces huge loads', {
      icon: '⏳',
      duration: 4000,
      style: {
        background: '#1e40af',
        color: '#ffffff',
        fontSize: '14px',
        padding: '12px 16px',
        borderRadius: '8px'
      }
    });
    try {
      if (role === 'admin') {
        const result = await login('admin', {
          username: form.username,
          password: form.adminPassword
        });
        if (result.success) {
          toast.success('Login successful');
          if (result.user.role === 'warden') {
            navigate('/warden/dashboard', { replace: true });
          } else if (result.user.role === 'principal') {
            navigate('/principal/dashboard', { replace: true });
          } else {
            navigate('/admin/dashboard', { replace: true });
          }
        }
      } else {
        const result = await login('student', {
          rollNumber: form.rollNumber,
          password: form.password
        });
        if (result?.requiresPasswordChange) {
          toast('Please change your password to continue', { icon: '🔐' });
          navigate('/student/reset-password', { replace: true });
        } else {
          navigate('/student', { replace: true });
        }
      }
    } catch (err) {
      let errorMessage = err.response?.data?.message || 'Login failed';
      if (err.message.includes('CORS') || err.message.includes('preflight')) {
        errorMessage = 'Browser security policy is blocking the request. Please try refreshing the page.';
      } else if (err.message.includes('Network Error') || err.code === 'ERR_NETWORK') {
        errorMessage = 'Connection issue. Please check your internet connection and try again.';
      } else if (err.message.includes('timeout')) {
        errorMessage = 'Request timed out. Please try again or check your internet connection.';
      }
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-200 p-4">
      <div className="flex flex-col md:flex-row w-full max-w-6xl bg-white rounded-2xl shadow-xl overflow-hidden">

        {/* Left Side - Always visible, stacks on mobile */}
        <div className="w-full md:w-1/2 bg-blue-600 p-8 flex flex-col justify-center text-white space-y-6">

          <HomeIcon className="w-6 h-6 text-white" cursor={"pointer"} onClick={() => navigate('/')} />

          <div className="flex items-center justify-center mb-6">
            {/* <AcademicCapIcon className="w-12 h-12" /> */}



            <DotLottieReact
              src="https://lottie.host/a6a4bdb7-e34c-4cae-9785-a8c16b636ffb/urMeNmhCCd.lottie"
              loop
              autoplay
            />

          </div>


          {/* Hidden on mobile */}
          <h2 className="text-2xl font-bold text-center sm:hidden md:block">Hostel Connectify</h2>

          <div className="bg-blue-500/40 p-4 rounded-lg text-center text-sm hidden md:block">
            Log in to manage your hostel activities and connect with fellow students.
          </div>
        </div>

        {/* Right Side */}
        <div className="w-full md:w-1/2 p-8 relative bg-gray-50 flex items-center justify-center">
          <div className="w-full max-w-md">

            {/* Home Button */}
            {/* <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/')}
              className="absolute top-4 left-4 z-10 p-2 rounded-lg bg-white/10 backdrop-blur-sm hover:bg-white/20 transition-colors duration-200"
            >
              <HomeIcon className="w-6 h-6 text-white" />
            </motion.button> */}

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="text-center mb-6 hidden lg:block">
                <h1 className="text-2xl font-bold text-gray-800 mb-2">
                  {role === 'admin' ? 'Admin Login' : 'Student Login'}
                </h1>
                <p className="text-gray-500 text-sm">Sign in to your account to continue</p>
              </div>


              {/* Toggle between Student/Admin */}
              <div className="flex justify-center mb-6">
                <div className="relative bg-gray-200 rounded-full p-1 w-64">
                  <motion.div
                    className="absolute top-1 left-1 w-1/2 h-8 bg-white rounded-full shadow-md"
                    animate={{ x: role === 'admin' ? '100%' : '0%' }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                  <div className="relative flex">
                    <button
                      className={`flex-1 flex items-center justify-center py-2 px-4 rounded-full text-sm font-medium transition-colors duration-200 ${role === 'student' ? 'text-blue-600' : 'text-gray-500'}`}
                      onClick={() => setRole('student')}
                    >
                      <AcademicCapIcon className="w-5 h-5 mr-2" />
                      Student
                    </button>
                    <button
                      className={`flex-1 flex items-center justify-center py-2 px-4 rounded-full text-sm font-medium transition-colors duration-200 ${role === 'admin' ? 'text-blue-600' : 'text-gray-500'}`}
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
                      <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <UserIcon className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                          name="username"
                          placeholder="Enter admin username"
                          value={form.username}
                          onChange={handleChange}
                          required
                          autoComplete="username"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <LockClosedIcon className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          className="w-full pl-10 pr-12 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                          type={showAdminPassword ? "text" : "password"}
                          name="adminPassword"
                          placeholder="Enter admin password"
                          value={form.adminPassword}
                          onChange={handleChange}
                          required
                          autoComplete="current-password"
                        />
                        <button
                          type="button"
                          className="absolute inset-y-0 right-0 pr-3 flex items-center"
                          onClick={() => setShowAdminPassword(!showAdminPassword)}
                        >
                          {showAdminPassword ? (
                            <EyeSlashIcon className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors duration-200" />
                          ) : (
                            <EyeIcon className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors duration-200" />
                          )}
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Roll Number</label>
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
                          autoComplete="username"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <LockClosedIcon className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          className="w-full pl-10 pr-12 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                          type={showStudentPassword ? "text" : "password"}
                          name="password"
                          placeholder="Enter your password"
                          value={form.password}
                          onChange={handleChange}
                          required
                          autoComplete="current-password"
                        />
                        <button
                          type="button"
                          className="absolute inset-y-0 right-0 pr-3 flex items-center"
                          onClick={() => setShowStudentPassword(!showStudentPassword)}
                        >
                          {showStudentPassword ? (
                            <EyeSlashIcon className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors duration-200" />
                          ) : (
                            <EyeIcon className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors duration-200" />
                          )}
                        </button>
                      </div>
                    </div>
                  </>
                )}

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow hover:shadow-md"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Signing In...</span>
                    </div>
                  ) : (
                    <>
                      <ArrowRightOnRectangleIcon className="w-5 h-5" />
                      Sign In
                    </>
                  )}
                </motion.button>
              </form>
            </motion.div>

          </div>
        </div>

      </div>
    </div>
  );
};

export default Login;
