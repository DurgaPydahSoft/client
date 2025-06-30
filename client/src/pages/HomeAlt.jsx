import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChatBubbleLeftRightIcon,
  BellIcon,
  ShieldCheckIcon,
  UserGroupIcon,
  ClockIcon,
  CheckCircleIcon,
  AcademicCapIcon,
  InboxIcon,
  UserIcon,
  UsersIcon,
  ClipboardDocumentListIcon,
  BanknotesIcon,
  BuildingLibraryIcon,
  ShieldExclamationIcon
} from '@heroicons/react/24/outline';

const entityIcons = [
  { icon: <UserIcon className="w-8 h-8 text-blue-700" />, label: 'Students' },
  { icon: <UsersIcon className="w-8 h-8 text-blue-700" />, label: 'Parents' },
  { icon: <ShieldExclamationIcon className="w-8 h-8 text-blue-700" />, label: 'Security' },
  { icon: <BuildingLibraryIcon className="w-8 h-8 text-blue-700" />, label: 'University schools' },
  { icon: <ClipboardDocumentListIcon className="w-8 h-8 text-blue-700" />, label: 'Form & Ledgers' },
  { icon: <UserGroupIcon className="w-8 h-8 text-blue-700" />, label: 'Warden, staff' },
  { icon: <BanknotesIcon className="w-8 h-8 text-blue-700" />, label: 'Payments' },
  { icon: <InboxIcon className="w-8 h-8 text-blue-700" />, label: 'Vendors' },
];

const gridIcons = [
  <ChatBubbleLeftRightIcon className="w-10 h-10 text-blue-600" />,
  <BellIcon className="w-10 h-10 text-blue-600" />,
  <ShieldCheckIcon className="w-10 h-10 text-blue-600" />,
  <UserGroupIcon className="w-10 h-10 text-blue-600" />,
  <ClockIcon className="w-10 h-10 text-blue-600" />,
  <CheckCircleIcon className="w-10 h-10 text-blue-600" />,
  <AcademicCapIcon className="w-10 h-10 text-blue-600" />,
  <InboxIcon className="w-10 h-10 text-blue-600" />
];

const HomeAlt = () => {
  const navigate = useNavigate();
  const [rotation, setRotation] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [circleSize, setCircleSize] = useState(420);
  const containerRef = useRef();
  const requestRef = useRef();

  // Responsive circle size
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const min = 260;
        const max = 420;
        const size = Math.max(
          min,
          Math.min(
            max,
            Math.min(containerRef.current.offsetWidth, window.innerHeight * 0.5)
          )
        );
        setCircleSize(size);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Only animate rotation when hovered
  useEffect(() => {
    if (!hovered) return;
    let lastTime = performance.now();
    const animate = (time) => {
      const delta = time - lastTime;
      lastTime = time;
      setRotation((prev) => (prev + delta * 0.03) % 360);
      requestRef.current = requestAnimationFrame(animate);
    };
    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current);
  }, [hovered]);

  // Highlight animation (always runs)
  useEffect(() => {
    let start = performance.now();
    let raf;
    const animateHighlight = (now) => {
      setHighlight(((now - start) / 1200) % 1);
      raf = requestAnimationFrame(animateHighlight);
    };
    raf = requestAnimationFrame(animateHighlight);
    return () => cancelAnimationFrame(raf);
  }, []);

  const center = circleSize / 2;
  const radius = center - 30;

  return (
    <div className="w-full min-h-screen bg-gradient-to-b from-blue-500 via-blue-800 to-blue-600 flex flex-col">
      {/* Hero Section */}
      <section className="flex flex-col md:flex-row items-center justify-center min-h-[80vh] px-2 sm:px-4 py-8 sm:py-16 relative">
        {/* Left: Text */}
        <div className="flex-1 max-w-xl text-left z-10 mb-10 md:mb-0">
          <h1 className="font-display text-4xl sm:text-5xl md:text-7xl font-bold mb-6 text-white leading-[1.1]">
            HOSTEL<br />
            CONNECTIFY
          </h1>
          <p className="text-lg sm:text-xl md:text-2xl mb-8 sm:mb-10 font-light text-blue-100 max-w-2xl leading-relaxed">
            Transforming hostel communication with a modern, transparent, and efficient digital platform.
          </p>
          <button
            className="group relative px-6 sm:px-8 py-3 sm:py-4 bg-white text-blue-900 font-semibold rounded-2xl hover:bg-blue-100 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 active:scale-95 overflow-hidden text-base sm:text-lg"
            onClick={() => navigate('/login')}
          >
            <span className="relative z-10 flex items-center gap-2">
              Get Started
              <svg className="w-5 h-5 ml-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
            </span>
          </button>
        </div>
        {/* Right: Rotating Circular Entities with SVG lines */}
        <div
          ref={containerRef}
          className="flex-1 flex items-center justify-center relative w-full"
          style={{ minHeight: circleSize, minWidth: circleSize, maxWidth: '100vw' }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
            style={{ width: circleSize, height: circleSize }}
          >
            {/* SVG for lines and highlights */}
            <svg width={circleSize} height={circleSize} className="absolute left-0 top-0 pointer-events-none z-0">
              {entityIcons.map((item, idx) => {
                const baseAngle = (idx / entityIcons.length) * 2 * Math.PI;
                const angle = baseAngle + (rotation * Math.PI / 180);
                const x = center + Math.cos(angle) * radius;
                const y = center + Math.sin(angle) * radius;
                const t = (highlight + idx / entityIcons.length) % 1;
                const hx = center + Math.cos(angle) * radius * t;
                const hy = center + Math.sin(angle) * radius * t;
                return (
                  <g key={item.label}>
                    <line
                      x1={center}
                      y1={center}
                      x2={x}
                      y2={y}
                      stroke="#60a5fa"
                      strokeWidth={circleSize > 350 ? 2.5 : 1.5}
                      strokeLinecap="round"
                      opacity="0.7"
                    />
                    <circle
                      cx={hx}
                      cy={hy}
                      r={circleSize > 350 ? 7 : 4}
                      fill="url(#glow)"
                      opacity={0.7 + 0.3 * Math.sin(t * Math.PI)}
                    />
                  </g>
                );
              })}
              <defs>
                <radialGradient id="glow" r="60%" cx="50%" cy="50%">
                  <stop offset="0%" stopColor="#fff" stopOpacity="1" />
                  <stop offset="60%" stopColor="#3b82f6" stopOpacity="0.7" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                </radialGradient>
              </defs>
            </svg>
            {/* Rotating icons */}
            {entityIcons.map((item, idx) => {
              const baseAngle = (idx / entityIcons.length) * 2 * Math.PI;
              const angle = baseAngle + (rotation * Math.PI / 180);
              const x = Math.cos(angle) * radius;
              const y = Math.sin(angle) * radius;
              return (
                <div
                  key={item.label}
                  className="absolute flex flex-col items-center transition-transform"
                  style={{
                    left: `calc(50% + ${x}px - 28px)`,
                    top: `calc(50% + ${y}px - 28px)`
                  }}
                >
                  <div className="bg-white shadow-lg rounded-full p-2 sm:p-3 mb-1 sm:mb-2 flex items-center justify-center">
                    {item.icon}
                  </div>
                  <span className="text-[10px] sm:text-xs text-white font-medium text-center drop-shadow-lg whitespace-nowrap">
                    {item.label}
                  </span>
                </div>
              );
            })}
            {/* Center label (replace with logo placeholder) */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
              <div className="bg-white rounded-full shadow-lg flex items-center justify-center" style={{ width: 64, height: 64 }}>
                {/* Replace with your logo image below if available */}
                <span className="text-blue-700 font-bold text-lg select-none">LOGO</span>
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* You can add the rest of the sections from Home.jsx here for consistency */}
    </div>
  );
};

export default HomeAlt; 