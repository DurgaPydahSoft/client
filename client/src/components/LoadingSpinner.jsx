import React from 'react';
import { motion } from 'framer-motion';

const LoadingSpinner = ({ size = 'md', className = '' }) => {
  const containerSizes = {
    sm: 'w-10 h-10',
    md: 'w-20 h-20',
    lg: 'w-32 h-32',
  };

  const dotSizes = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2.5 h-2.5',
    lg: 'w-4 h-4',
  };

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div className={`relative ${containerSizes[size]} flex items-center justify-center`}>
        {/* Core Nucleus */}
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className={`${dotSizes[size]} bg-blue-600 rounded-full blur-[1px] shadow-[0_0_15px_rgba(37,99,235,0.6)]`}
        />

        {/* Orbiting Dots */}
        {[0, 120, 240].map((offset, i) => (
          <motion.div
            key={i}
            className="absolute inset-0"
            animate={{ rotate: 360 }}
            transition={{ duration: 3 + i * 0.5, repeat: Infinity, ease: "linear" }}
            style={{ rotate: offset }}
          >
            <motion.div
              className={`absolute top-0 left-1/2 -translate-x-1/2 ${dotSizes[size]} bg-blue-${500 - i * 100} rounded-full`}
              animate={{ scale: [0.8, 1.2, 0.8], opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: i * 0.4 }}
              style={{
                boxShadow: `0 0 12px rgba(59, 130, 246, 0.5)`,
              }}
            />
          </motion.div>
        ))}

        {/* Cosmic Dust / Slow Ring */}
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 border border-blue-500/10 rounded-full"
        />
      </div>

      {size !== 'sm' && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="mt-4 text-blue-600/60 font-medium text-[10px] tracking-[0.3em] uppercase"
        >
          Processing
        </motion.p>
      )}
    </div>
  );
};

export default LoadingSpinner;