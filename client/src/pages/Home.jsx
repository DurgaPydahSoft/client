import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useAnimation } from 'framer-motion';
import Silk from './Silk';
import { useInView } from 'react-intersection-observer';
import { useAuth } from '../context/AuthContext';
import { useGlobalSettings } from '../context/GlobalSettingsContext';
import {
  ChatBubbleLeftRightIcon,
  BellIcon,
  ShieldCheckIcon,
  UserGroupIcon,
  ClockIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  CodeBracketIcon,
  CommandLineIcon,
  RocketLaunchIcon,
  AcademicCapIcon,
  ExclamationCircleIcon,
  ChartBarIcon,
  DocumentTextIcon,
  InboxIcon
} from '@heroicons/react/24/outline';

const features = [
  {
    icon: (
      <svg className="w-10 h-10 text-cyan-500 stroke-current" fill="none" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m-3-7a9 9 0 110 18 9 9 0 010-18z" />
      </svg>
    ),
    title: 'Complaint Management',
    desc: 'Streamline complaint tracking with our intuitive digital platform.'
  },
  {
    icon: (
      <svg className="w-10 h-10 text-cyan-500 stroke-current" fill="none" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V4a2 2 0 10-4 0v1.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    ),
    title: 'Smart Notifications',
    desc: 'Real-time updates and important announcements at your fingertips.'
  },
  {
    icon: (
      <svg className="w-10 h-10 text-cyan-500 stroke-current" fill="none" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    title: 'Secure Dashboard',
    desc: 'Powerful analytics and comprehensive student management tools.'
  },
];

const steps = [
  {
    icon: (
      <svg className="w-8 h-8 text-blue-700 stroke-current" fill="none" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
      </svg>
    ),
    title: 'Secure Access',
    desc: 'Log in securely with student or admin credentials.'
  },
  {
    icon: (
      <svg className="w-8 h-8 text-blue-700 stroke-current" fill="none" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
      </svg>
    ),
    title: 'Raise Complaints',
    desc: 'Submit and track complaints with easy-to-use interface.'
  },
  {
    icon: (
      <svg className="w-8 h-8 text-blue-700 stroke-current" fill="none" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: 'Quick Resolution',
    desc: 'Get real-time updates and track complaint resolution.'
  },
];

const stats = [
  {
    value: '98%',
    label: 'Resolution Rate',
    icon: (
      <svg className="w-8 h-8 text-cyan-500 stroke-current" fill="none" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
      </svg>
    )
  },
  {
    value: '<24h',
    label: 'Response Time',
    icon: (
      <svg className="w-8 h-8 text-cyan-500 stroke-current" fill="none" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  },
  {
    value: '10k+',
    label: 'Students Served',
    icon: (
      <svg className="w-8 h-8 text-cyan-500 stroke-current" fill="none" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    )
  }
];

const FeatureCard = ({ icon, title, desc, index }) => {
  const controls = useAnimation();
  const [ref, inView] = useInView({
    threshold: 0.1,
    triggerOnce: true
  });

  useEffect(() => {
    if (inView) {
      controls.start({
        opacity: 1,
        y: 0,
        transition: { duration: 0.5, delay: index * 0.1 }
      });
    }
  }, [controls, inView, index]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 50 }}
      animate={controls}
      className="group relative bg-white/50 backdrop-blur-lg rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 border border-white/20"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-deepsea-500/10 to-primary-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl"></div>
      <div className="relative z-10">
        <div className="mb-6 flex justify-center">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-deepsea-100 to-primary-100">
            {icon}
          </div>
        </div>
        <h3 className="font-display font-bold text-2xl text-deepsea-900 mb-4">{title}</h3>
        <p className="text-gray-600">{desc}</p>
      </div>
    </motion.div>
  );
};

const StepCard = ({ icon, title, desc, index, isLast }) => {
  const controls = useAnimation();
  const [ref, inView] = useInView({
    threshold: 0.1,
    triggerOnce: true
  });

  useEffect(() => {
    if (inView) {
      controls.start({
        opacity: 1,
        x: 0,
        transition: { duration: 0.5, delay: index * 0.2 }
      });
    }
  }, [controls, inView, index]);

  return (
    <div className="relative group">
      <motion.div
        ref={ref}
        initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
        animate={controls}
        className="flex flex-col items-center text-center max-w-xs"
      >
        <div className="mb-5 bg-cyan-50 rounded-full shadow-md p-4 border-2 border-cyan-200 group-hover:bg-cyan-100 transition-colors duration-300 group-hover:scale-110">
          {icon}
        </div>
        <h3 className="font-bold text-lg text-blue-900 mb-2">{title}</h3>
        <p className="text-gray-600 text-sm">{desc}</p>
      </motion.div>
      {!isLast && (
        <div className="hidden md:block absolute top-1/2 -right-16 w-16 h-0.5 bg-gradient-to-r from-cyan-300 to-blue-200 transform -translate-y-1/2" />
      )}
    </div>
  );
};

const StatCard = ({ value, label, icon, index }) => {
  const controls = useAnimation();
  const [ref, inView] = useInView({
    threshold: 0.1,
    triggerOnce: true
  });

  useEffect(() => {
    if (inView) {
      controls.start({
        opacity: 1,
        scale: 1,
        transition: { duration: 0.5, delay: index * 0.1 }
      });
    }
  }, [controls, inView, index]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={controls}
      className="relative flex flex-col items-center p-8 bg-white/50 backdrop-blur-lg rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-500"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-deepsea-500/5 to-cyan-500/5 rounded-3xl"></div>
      <div className="relative z-10 flex flex-col items-center">
        <div className="mb-4 p-3 rounded-2xl bg-gradient-to-br from-cyan-50 to-blue-50">
          {icon}
        </div>
        <div className="font-display font-bold text-4xl text-deepsea-900 mb-2">{value}</div>
        <div className="text-gray-600 text-center">{label}</div>
      </div>
    </motion.div>
  );
};

const DeveloperCard = () => {
  const { getPydahSoftInfo } = useGlobalSettings();
  const controls = useAnimation();
  const [ref, inView] = useInView({
    threshold: 0.1,
    triggerOnce: true
  });

  useEffect(() => {
    if (inView) {
      controls.start({
        opacity: 1,
        y: 0,
        transition: { duration: 0.5 }
      });
    }
  }, [controls, inView]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 50 }}
      animate={controls}
      className="bg-white/50 backdrop-blur-lg rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 border border-white/20"
    >
      <div className="flex flex-col items-center text-center">
        {/* PydahSoft Logo/Brand */}
        <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 p-1 mb-6">
          <div className="w-full h-full rounded-full bg-white p-1">
            <div className="w-full h-full rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center overflow-hidden">
              <img
                src="/PYDAHSOFT LOGO.ico"
                alt="PydahSoft Logo"
                className="w-full h-full rounded-full object-cover"
              />
            </div>
          </div>
        </div>

        {/* Company Name */}
        <div className="mb-4">
          <h3 className="font-display font-bold text-3xl text-deepsea-900 mb-2">{getPydahSoftInfo().companyName}</h3>
          <div className="w-16 h-1 bg-gradient-to-r from-blue-500 to-cyan-400 mx-auto rounded-full"></div>
        </div>

        {/* Product Description */}
        <p className="text-gray-600 mb-6 text-lg leading-relaxed">
          A {getPydahSoftInfo().companyName} Product - Transforming hostel management through innovative digital solutions and cutting-edge technology.
        </p>

        {/* Contact Information */}
        <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-2xl p-6 w-full max-w-sm">
          <h4 className="font-display font-bold text-lg text-deepsea-900 mb-3">For Queries Contact</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2">
              <UserGroupIcon className="w-5 h-5 text-blue-600" />
              <span className="text-gray-700 font-medium">Durga Prasad</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              <a href="tel:+919392604899" className="text-gray-700 font-medium hover:text-blue-600 transition-colors">
                +91 9392604899
              </a>
            </div>
          </div>
        </div>

        {/* Social/Contact Links */}
        <div className="flex gap-4 mt-6">
          <a href="tel:+919392604899" className="p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
          </a>
          <a href="#" className="p-3 bg-cyan-600 text-white rounded-full hover:bg-cyan-700 transition-colors">
            <CodeBracketIcon className="w-6 h-6" />
          </a>
          <a href="#" className="p-3 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors">
            <RocketLaunchIcon className="w-6 h-6" />
          </a>
        </div>
      </div>
    </motion.div>
  );
};

const Home = () => {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const { getInstitutionName, getInstitutionFullName, getPydahSoftInfo } = useGlobalSettings();
  const controls = useAnimation();
  const [ref, inView] = useInView({
    threshold: 0.1,
    triggerOnce: true
  });

  useEffect(() => {
    if (inView) {
      controls.start({
        opacity: 1,
        y: 0,
        transition: { duration: 0.8 }
      });
    }
  }, [controls, inView]);

  // Redirect logged-in users away from home page
  useEffect(() => {
    if (token && user) {
      // User is already logged in, redirect to appropriate dashboard
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

  return (
    <div className="w-full overflow-hidden">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center text-white pb-24 pt-20 px-4">
  {/* Silk Background for hero only */}
  <div className="absolute inset-0 -z-10">
    <Silk
      speed={8}
      scale={1}
      color="#7B7481"
      noiseIntensity={1.5}
      rotation={0}
    />
    <div className="absolute inset-0 bg-deepsea-900/80"></div>
  </div>

       
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center z-10 relative px-4">
          <div className="text-left">
            <motion.div
              initial={{ opacity: 0, y: -50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="mb-8"
            >
              <h1 className="font-display text-5xl md:text-6xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-200 to-cyan-200 leading-[1.15]">
                {getInstitutionName().toUpperCase()}
                <br />
                <span>Hostel Connectify</span>
              </h1>
              <p className="text-xl md:text-2xl mb-10 font-light text-cyan-100 max-w-2xl mx-auto leading-relaxed">
                Transforming {getInstitutionName().toLowerCase()} communication with a modern, transparent, and efficient digital platform.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="flex justify-center md:justify-start"
            >
              <div className="flex flex-col md:flex-row justify-center md:justify-start gap-4">
                <button
                  className="group relative px-8 py-4 bg-white text-deepsea-900 font-semibold rounded-2xl hover:bg-cyan-100 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 active:scale-95 overflow-hidden"
                  onClick={() => navigate('/login')}
                >
                  <span className="relative z-10 flex items-center gap-2">
                    Get Started
                    <ArrowRightIcon className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-200 to-blue-200 opacity-0 group-hover:opacity-50 transition-opacity duration-300 rounded-2xl"></div>
                </button>

                <button
                  className="group relative px-8 py-4 bg-transparent border-2 border-white/30 text-white font-medium rounded-2xl hover:border-white hover:bg-white/10 transition-all duration-300 shadow-sm hover:shadow-md transform hover:-translate-y-0.5 active:scale-95 overflow-hidden"
                  onClick={() => navigate('/student/preregister/')}
                >
                  <span className="relative z-10 flex items-center gap-2">
                    Register Now
                    <ArrowRightIcon className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </span>
                </button>
              </div>
            </motion.div>
          </div>

          {/* Hero SVG */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="hidden md:block relative"
          >
            <div className="relative w-full aspect-square">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/20 to-blue-500/20 rounded-full animate-pulse"></div>
              {/* Wrap bubbles and grid in a single parent */}
              <div className="absolute inset-0 pointer-events-none">
                {[...Array(8)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute rounded-full bg-white/30 blur-lg"
                    style={{
                      top: `${10 + Math.random() * 70}%`,
                      left: `${10 + Math.random() * 70}%`,
                      width: `${30 + Math.random() * 40}px`,
                      height: `${30 + Math.random() * 40}px`,
                      zIndex: 1
                    }}
                    animate={{
                      y: [0, Math.random() * 30 - 15, 0],
                      opacity: [0.5, 0.8, 0.5]
                    }}
                    transition={{
                      duration: 8 + Math.random() * 4,
                      repeat: Infinity,
                      repeatType: "reverse",
                      ease: "easeInOut"
                    }}
                  />
                ))}
              </div>
              <div className="relative z-10 w-full h-full flex items-center justify-center">
                <div className="w-3/4 h-3/4 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 rounded-3xl backdrop-blur-lg border border-white/20 p-8">
                  <div className="grid grid-cols-4 gap-4 h-full">
                    <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm flex flex-col justify-center items-center h-full">
                      <ChatBubbleLeftRightIcon className="w-16 h-16 text-white flex-1" />
                      <div className="h-2 bg-white/20 rounded w-3/4 mt-4" />
                    </div>
                    <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm flex flex-col justify-center items-center h-full">
                      <BellIcon className="w-16 h-16 text-white flex-1" />
                      <div className="h-2 bg-white/20 rounded w-2/3 mt-4" />
                    </div>
                    <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm flex flex-col justify-center items-center h-full">
                      <ShieldCheckIcon className="w-16 h-16 text-white flex-1" />
                      <div className="h-2 bg-white/20 rounded w-1/2 mt-4" />
                    </div>
                    <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm flex flex-col justify-center items-center h-full">
                      <UserGroupIcon className="w-16 h-16 text-white flex-1" />
                      <div className="h-2 bg-white/20 rounded w-3/4 mt-4" />
                    </div>
                    <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm flex flex-col justify-center items-center h-full">
                      <ClockIcon className="w-16 h-16 text-white flex-1" />
                      <div className="h-2 bg-white/20 rounded w-2/3 mt-4" />
                    </div>
                    <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm flex flex-col justify-center items-center h-full">
                      <CheckCircleIcon className="w-16 h-16 text-white flex-1" />
                      <div className="h-2 bg-white/20 rounded w-1/2 mt-4" />
                    </div>
                    <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm flex flex-col justify-center items-center h-full">
                      <AcademicCapIcon className="w-16 h-16 text-white flex-1" />
                      <div className="h-2 bg-white/20 rounded w-2/3 mt-4" />
                    </div>
                    <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm flex flex-col justify-center items-center h-full">
                      <InboxIcon className="w-16 h-16 text-white flex-1" />
                      <div className="h-2 bg-white/20 rounded w-3/4 mt-4" />
                    </div>
                  </div>
                </div>
              </div>
              <div className="absolute -top-4 -right-4 w-24 h-24 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full opacity-50 blur-xl"></div>
              <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-full opacity-40 blur-xl"></div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="w-full bg-gradient-to-b from-blue-50 via-cyan-50 to-white py-32 px-4">
        
        <div className="max-w-6xl mx-auto">
          <motion.div
            ref={ref}
            initial={{ opacity: 0, y: 50 }}
            animate={controls}
            className="text-center mb-20"
          >
            <h2 className="font-display text-4xl md:text-5xl font-bold text-deepsea-900 mb-6">
              Platform Capabilities
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Experience the future of hostel management with our cutting-edge features
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {features.map((f, idx) => (
              <FeatureCard key={idx} index={idx} {...f} />
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="w-full bg-gradient-to-b from-cyan-50 via-blue-50 to-white py-32 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-20"
          >
            <h2 className="font-display text-4xl md:text-5xl font-bold text-deepsea-900 mb-6">
              How It Works
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Experience our streamlined process for efficient complaint resolution
            </p>
          </motion.div>

          <div className="flex flex-col md:flex-row justify-between items-center gap-12 md:gap-6">
            {steps.map((step, idx) => (
              <StepCard key={idx} {...step} index={idx} isLast={idx === steps.length - 1} />
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="w-full bg-gradient-to-b from-blue-100 via-cyan-100 to-white py-32 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-20"
          >
            <h2 className="font-display text-4xl md:text-5xl font-bold text-deepsea-900 mb-6">
              Making an Impact
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Our platform is trusted by thousands of students across multiple institutions
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {stats.map((stat, idx) => (
              <StatCard key={idx} {...stat} index={idx} />
            ))}
          </div>
        </div>
      </section>

      {/* Developer Section */}
      <section className="w-full bg-gradient-to-b from-cyan-100 via-blue-50 to-white py-32 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-20"
          >
            <h2 className="font-display text-4xl md:text-5xl font-bold text-deepsea-900 mb-6">
              Powered by PydahSoft
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Innovative digital solutions crafted with cutting-edge technology
            </p>
          </motion.div>

          <div className="max-w-md mx-auto">
            <DeveloperCard />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative w-full bg-gradient-to-br from-deepsea-900 via-deepsea-800 to-primary-700 py-32 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-[url('/images/pattern-grid.svg')] opacity-5"></div>
        <div className="max-w-4xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <h2 className="font-display text-4xl md:text-5xl font-bold text-white mb-6">
              Ready to Get Started?
            </h2>
            <p className="text-xl text-cyan-100 max-w-2xl mx-auto mb-12">
              Join thousands of students who have already transformed their hostel experience
            </p>
            <button
              onClick={() => navigate('/login')}
              className="group relative px-8 py-4 bg-white text-deepsea-900 font-semibold rounded-2xl hover:bg-cyan-100 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 active:scale-95"
            >
              <span className="relative z-10 flex items-center gap-2">
                Get Started Now
                <ArrowRightIcon className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-200 to-blue-200 opacity-0 group-hover:opacity-50 transition-opacity duration-300 rounded-2xl"></div>
            </button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full bg-white py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 md:gap-8">
            <div className="col-span-1 md:col-span-2">
              <h3 className="font-display text-2xl font-bold text-deepsea-900 mb-4">
                Pydah HOSTEL
                <br />
                Digital
              </h3>
              <p className="text-gray-600 max-w-sm">
                Transforming hostel management through digital innovation and efficient communication.
              </p>
            </div>
            <div>
              <h4 className="font-display font-bold text-lg text-deepsea-900 mb-4">Quick Links</h4>
              <ul className="space-y-2">
                <li>
                  <button onClick={() => navigate('/login')} className="text-gray-600 hover:text-primary-600">
                    Get Started
                  </button>
                </li>
                <li>
                  <button onClick={() => navigate('/about')} className="text-gray-600 hover:text-primary-600">
                    About Us
                  </button>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-display font-bold text-lg text-deepsea-900 mb-4">Support</h4>
              <ul className="space-y-2">
                <li>
                  <a href="#" className="text-gray-600 hover:text-primary-600">Help Center</a>
                </li>
                <li>
                  <a href="#" className="text-gray-600 hover:text-primary-600">FAQs</a>
                </li>
                <li>
                  <a href="#" className="text-gray-600 hover:text-primary-600">Contact Us</a>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-gray-200">
            <p className="text-center text-gray-600">
              © {new Date().getFullYear()} {getInstitutionName()} Digital. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;